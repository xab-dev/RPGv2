// Boot du jeu (§3.1). Orchestrateur seul autorisé à toucher le DOM au
// premier niveau — tous les autres modules ne le font qu'à l'intérieur de
// fonctions. demarrerJeu() reste exportée et importable depuis Node (aucun
// appel n'est déclenché tant que window n'existe pas).

import { SCHEMAS } from './schemas.js';
import { validerCatalogues, construireRegistre } from './registry.js';
import { chargerCataloguesDepuisReseau, chargerLocalesDepuisReseau } from './io_navigateur.js';
import { creerI18n, verifierJeuxDeCles } from './i18n.js';
import { creerSourceClavier } from './input/keyboard.js';
import { creerSourceManette } from './input/gamepad.js';
import { creerCoucheInput } from './input/input.js';
import { chargerScene, resoudreDeplacement } from './scene.js';
import { calculerCamera } from './camera.js';
import { genererDecor } from './decor.js';
import { creerBoucle, dessinerScene } from './render.js';
import { creerStoreIndexedDB } from './storage_indexeddb.js';
import { charger as chargerSave, sauvegarder, importerSauvegarde as importerSauvegardeDansStore } from './save.js';
import { creerRegistreFlags } from './flags.js';
import { initialiserMenu } from './ui/menu.js';

// Provisoires, non validés en jeu par Xav — seuils uniques, commentés ici.
const VITESSE_HERO_PX_S = 120;
const RAYON_HERO_PX = 10;
const INTERVALLE_AUTOSAVE_MS = 30000;

function afficherErreurBoot(erreurs) {
  document.body.innerHTML = `
    <div id="erreur-boot" style="font-family:monospace;white-space:pre-wrap;padding:2rem;color:#f66;background:#111;height:100%;box-sizing:border-box;">
      <h1>Erreur au démarrage</h1>
      <pre>${erreurs.join('\n')}</pre>
    </div>
  `;
}

export async function demarrerJeu() {
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
    chargerLocalesDepuisReseau('locales'),
    chargerCataloguesDepuisReseau('data', noms),
  ]);

  const erreursCles = verifierJeuxDeCles(dictionnaires);
  const erreursValidation = erreursChargement.length ? [] : validerCatalogues(donnees);
  const toutesErreurs = [...erreursChargement, ...erreursValidation, ...erreursCles];

  if (toutesErreurs.length > 0) {
    afficherErreurBoot(toutesErreurs);
    return;
  }

  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');
  creerRegistreFlags(registre); // exercé en Phase 0 par les tests ; aucun gameplay ne le consomme encore.

  const store = creerStoreIndexedDB();
  const { payload: save } = await chargerSave(store);
  i18n.definirLangue(save.settings.lang);

  const scene = chargerScene(registre, save.hero.scene);
  const decor = genererDecor(scene);

  const hero = {
    x: save.hero.x || scene.spawn.x * scene.tileSize,
    y: save.hero.y || scene.spawn.y * scene.tileSize,
    rayon: RAYON_HERO_PX,
  };

  const canvas = document.getElementById('jeu');
  const ctx = canvas.getContext('2d');

  const input = creerCoucheInput({
    sourceClavier: creerSourceClavier(window),
    sourceManette: creerSourceManette(navigator),
  });

  const menu = initialiserMenu({
    document,
    i18n,
    exporterSauvegarde() {
      const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'rpg_v2_save.json';
      lien.click();
      URL.revokeObjectURL(url);
    },
    async importerSauvegarde(fichier) {
      const texte = await fichier.text();
      await importerSauvegardeDansStore(store, JSON.parse(texte));
      window.location.reload();
    },
  });

  let etatModifie = false;
  let dernierAutosave = performance.now();

  function autosaveSiNecessaire(tMs) {
    if (etatModifie && tMs - dernierAutosave > INTERVALLE_AUTOSAVE_MS) {
      sauvegarder(store, save);
      dernierAutosave = tMs;
      etatModifie = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sauvegarder(store, save);
  });

  function maj(deltaMs) {
    const etat = input.maj();
    if (etat.menu.pressed) {
      if (menu.estOuvert()) menu.fermer();
      else menu.ouvrir();
    }

    const deltaS = deltaMs / 1000;
    const dx = etat.move.x * VITESSE_HERO_PX_S * deltaS;
    const dy = etat.move.y * VITESSE_HERO_PX_S * deltaS;
    if (dx !== 0 || dy !== 0) {
      const resultat = resoudreDeplacement(
        scene,
        { x: hero.x - hero.rayon, y: hero.y - hero.rayon, largeur: hero.rayon * 2, hauteur: hero.rayon * 2 },
        dx,
        dy
      );
      hero.x = resultat.x + hero.rayon;
      hero.y = resultat.y + hero.rayon;
      save.hero.x = hero.x;
      save.hero.y = hero.y;
      etatModifie = true;
    }

    autosaveSiNecessaire(performance.now());
  }

  function dessiner() {
    const camera = calculerCamera({
      cibleX: hero.x,
      cibleY: hero.y,
      largeurScene: scene.width * scene.tileSize,
      hauteurScene: scene.height * scene.tileSize,
      largeurVue: canvas.width,
      hauteurVue: canvas.height,
    });
    dessinerScene(ctx, { scene, decor, camera, hero });
  }

  creerBoucle({ maj, dessiner }).demarrer();
}

if (typeof window !== 'undefined') {
  demarrerJeu();
}

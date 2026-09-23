// `D-169` — polish des dialogues (Xav, 23/09) : quand le follet choisi parle,
// la bulle montre son PORTRAIT à la place de son nom ; le narrateur reste
// « ... ». Les flèches ▸ et ▼ ont une lueur qui respire à partir de Moyen, et
// Haut ajoute les étincelles du follet autour du portrait. Bas : rien ne bouge.
//
// Ce qui se vérifie : le portrait est un id de compagnon, présent seulement
// quand le follet choisi parle, et il traverse la conversation jusqu'à la
// ligne courante ; le partage des effets entre les presets (le contrat de la
// demande, lu dans les catalogues, aucun nombre épinglé) ; le dessin remplace
// le nom par le portrait, ne pose aucun dégradé radial sans lueur, et rend le
// contexte comme il l'a trouvé. L'image elle-même se juge en jeu (Xav).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, resoudreNoeud } from '../src/dialogue.js';
import { valeurLevier } from '../src/qualite.js';
import { ornementActif } from '../src/ornements.js';
import { dessinerDialogue } from '../src/ui/dialogue_box.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// --- 1. Le portrait : le follet choisi, et lui seul -------------------------
{
  const faim = registre.obtenir('dialogues', 'dlg_premiere_faim');
  assert.equal(resoudreNoeud(faim, faim.entree, registre, i18n, 'comp_follet_terre').portrait, 'comp_follet_terre');
  // Pas encore de follet : le nom s'affiche, comme avant.
  assert.equal(resoudreNoeud(faim, faim.entree, registre, i18n, null).portrait, null);
  // Le narrateur de la Grotte n'a pas de portrait : il reste « ... ».
  const choix = registre.obtenir('dialogues', 'dlg_grotte_choix_follet');
  const narrateur = resoudreNoeud(choix, choix.entree, registre, i18n, 'comp_follet_feu');
  assert.equal(narrateur.portrait, null);
  assert.equal(narrateur.locuteur, '...');
  // Partout dans le catalogue : portrait ⇔ le follet parle et il est choisi.
  for (const d of donnees.dialogues) {
    for (const [id, n] of Object.entries(d.noeuds)) {
      const r = resoudreNoeud(d, id, registre, i18n, 'comp_follet_eau');
      assert.equal(r.portrait, n.locuteur === 'follet' ? 'comp_follet_eau' : null, `${d.id}.${id}`);
    }
  }
  console.log('OK portrait = le follet choisi qui parle ; le narrateur reste « ... »');
}

// --- 2. Il traverse la conversation jusqu'à la ligne courante ---------------
{
  const faim = registre.obtenir('dialogues', 'dlg_premiere_faim');
  const dialogue = creerDialogue();
  dialogue.demarrerConversation(faim, {
    resoudre: (n) => resoudreNoeud(faim, n, registre, i18n, 'comp_follet_feu'),
    poids: null,
  });
  assert.equal(dialogue.ligneCourante().portrait, 'comp_follet_feu');
  // Des répliques fabriquées sur place : aucun portrait, le nom s'affiche.
  dialogue.ouvrir([{ locuteur: 'X', texte: 'y' }]);
  assert.equal(dialogue.ligneCourante().portrait, null);
  console.log('OK le portrait arrive jusqu’à la ligne que la bulle dessine');
}

// --- 3. Bas : rien · Moyen : la lueur · Haut : la lueur et les étincelles ---
{
  const config = registre.obtenir('graphismes', 'graphismes_presets');
  const lueur = registre.obtenir('effets', 'effet_lueur_dialogue');
  const etincelles = registre.obtenir('effets', 'effet_etincelles_dialogue');
  const a = (effet, preset) => ornementActif(effet, valeurLevier(config, preset, 'ornements')) !== null;
  assert.deepEqual([a(lueur, 'bas'), a(etincelles, 'bas')], [false, false], 'Bas : rien qui bouge');
  assert.deepEqual([a(lueur, 'moyen'), a(etincelles, 'moyen')], [true, false], 'Moyen : la lueur seule');
  assert.deepEqual([a(lueur, 'haut'), a(etincelles, 'haut')], [true, true], 'Haut : la lueur et les étincelles');
  assert.equal(lueur.role, 'cosmetique');
  assert.equal(etincelles.role, 'cosmetique');
  console.log('OK Bas sans effet, Moyen la lueur, Haut les étincelles en plus');
}

// --- 4. Le dessin -----------------------------------------------------------
{
  // Faux contexte : toute méthode est acceptée et comptée, les dégradés
  // répondent à `addColorStop`, `measureText` mesure 6 unités par caractère.
  function fauxContexte() {
    const appels = {};
    const ecrits = [];
    let pile = 0;
    const etat = {};
    const ctx = new Proxy(etat, {
      get(cible, nom) {
        if (nom in cible) return cible[nom];
        if (nom === 'save') return () => { pile += 1; };
        if (nom === 'restore') return () => { pile -= 1; };
        if (nom === 'fillText') return (t) => { ecrits.push(t); };
        if (nom === 'measureText') return (t) => ({ width: t.length * 6 });
        return (...args) => {
          appels[nom] = (appels[nom] || 0) + 1;
          if (String(nom).startsWith('create')) return { addColorStop() {} };
          return args;
        };
      },
      set(cible, nom, valeur) { cible[nom] = valeur; return true; },
    });
    return { ctx, appels, ecrits, pile: () => pile };
  }
  const compagnon = registre.obtenir('companions', 'comp_follet_feu');
  const portrait = { visuel: registre.obtenir('visuels', compagnon.render.visuel), teinte: compagnon.render.couleur };
  const lueur = registre.obtenir('effets', 'effet_lueur_dialogue');
  const etincelles = registre.obtenir('effets', 'effet_etincelles_dialogue');
  const visuelEtincelle = registre.obtenir('visuels', etincelles.visuel);
  const ligneOptions = { locuteur: 'Follet', texte: 'Tu cherches ?', arme: true, options: ['a', 'b'], selection: 1 };
  const ligneSuite = { locuteur: 'Follet', texte: 'Voilà.', arme: true, options: null };

  // Haut, le follet parle : aucun nom écrit, les étincelles et la lueur posées.
  for (const ligne of [ligneOptions, ligneSuite]) {
    const f = fauxContexte();
    dessinerDialogue(f.ctx, ligne, { portrait, lueur, etincelles, visuelEtincelle, tMs: 700 });
    assert.ok(!f.ecrits.includes('Follet'), 'le portrait remplace le nom');
    assert.ok(f.appels.arc >= 1, 'le médaillon du portrait est tracé');
    assert.ok(f.appels.createRadialGradient >= 1, 'la lueur est posée sous la flèche');
    assert.equal(f.pile(), 0, 'le dessin rend le contexte comme il l’a trouvé');
  }
  // Bas, le narrateur : le nom est écrit, aucun dégradé radial.
  const f = fauxContexte();
  dessinerDialogue(f.ctx, { ...ligneSuite, locuteur: '...' }, { portrait: null, lueur: null, etincelles: null, visuelEtincelle, tMs: 700 });
  assert.equal(f.ecrits[0], '...', 'sans portrait, le nom du locuteur en premier');
  assert.equal(f.appels.createRadialGradient || 0, 0, 'Bas : aucune lueur');
  assert.equal(f.pile(), 0);
  // Un appelant d'avant (sans habillage) dessine toujours.
  dessinerDialogue(fauxContexte().ctx, ligneSuite);
  console.log('OK le dessin : portrait au lieu du nom, lueur seulement quand l’effet existe, contexte rendu intact');
}

// Ce que partagent les scénarios de `tools/capture_chrome.mjs` — OUTIL DE DEV.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveNeuve } from '../../src/save.js';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';

export const ORIGINE = process.env.RPG_URL || 'http://localhost:8080';
const TILE = 32;

// Une partie déjà lancée, héros DANS la Maison (pour que la carte contextuelle
// Construction existe), follet choisi, quelques objets en poche et au coffre.
export function saveDansLaMaison({ compagnon = 'comp_follet_eau' } = {}) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.x = (85 + 0.5) * TILE;
  save.hero.y = (52 + 0.5) * TILE;
  save.hero.companion = compagnon;
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_maison_decouverte: true,
  };
  save.inventaire.items = { item_branche: 6, item_caillou: 4, item_fruit: 3, item_bois: 5, item_pierre: 2 };
  save.coffre.items = { item_bois: 12, item_fruit: 1 };
  return save;
}

// Écrit la sauvegarde dans l'IndexedDB du profil (NEUF, jetable) de ce Chrome
// sans fenêtre, puis ouvre le jeu. L'écriture se fait depuis une page de la
// même origine qui NE charge PAS le jeu : depuis le jeu lui-même, sa propre
// sauvegarde automatique (`visibilitychange`) pourrait repasser par-dessus.
export async function ouvrirLeJeu(chrome, { largeur, hauteur, save = null, requete = '' }) {
  await chrome.taille(largeur, hauteur);
  if (save) {
    await chrome.ouvrir(`${ORIGINE}/tools/cadre_viewport.html?src=about:blank`);
    await chrome.evaluer(`new Promise((resoudre, rejeter) => {
      const ouverture = indexedDB.open('rpg_v2', 1);
      ouverture.onupgradeneeded = () => ouverture.result.createObjectStore('sauvegardes');
      ouverture.onerror = () => rejeter(ouverture.error);
      ouverture.onsuccess = () => {
        const tx = ouverture.result.transaction('sauvegardes', 'readwrite');
        tx.objectStore('sauvegardes').put(${JSON.stringify(save)}, 'save_current');
        tx.oncomplete = () => { ouverture.result.close(); resoudre(true); };
        tx.onerror = () => rejeter(tx.error);
      };
    })`);
  }
  await chrome.ouvrir(`${ORIGINE}/index.html${requete}`);
  await chrome.attendre(1200); // catalogues, sauvegarde, première frame
}

// Le centre d'un élément, en px CSS — pour un clic RÉEL dessus.
export async function centre(chrome, selecteur) {
  const c = await chrome.evaluer(`(() => {
    const el = document.querySelector(${JSON.stringify(selecteur)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!c) throw new Error(`introuvable : ${selecteur}`);
  return c;
}
export async function cliquer(chrome, selecteur) {
  const c = await centre(chrome, selecteur);
  await chrome.clic(c.x, c.y);
}

// Ce qui déborde, mesuré : Node ne sait pas dire « ça tient dans l'écran », un
// vrai moteur de mise en page, si. Rend une ligne par écran visible.
export async function mesurerEcrans(chrome) {
  return chrome.evaluer(`[...document.querySelectorAll('.ecran-ui')].filter((e) => !e.hidden).map((e) => {
    const corps = e.querySelector('.ecran-ui-corps');
    const r = e.getBoundingClientRect();
    return {
      id: e.id || e.className,
      boite: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      corpsDeborde: corps ? corps.scrollHeight - corps.clientHeight : null,
      fenetre: [innerWidth, innerHeight],
    };
  })`);
}

// Un point juste à l'ouest de l'empreinte d'un interactif de la Maison, à portée
// d'INTERACT — calculé depuis les vrais catalogues (jamais une position recopiée :
// elle mentirait au premier déplacement d'une station dans les données).
export async function positionPresDe(idInteractif, idScene = 'scene_maison_exterieur') {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  const scene = chargerScene(construireRegistre(donnees), idScene);
  const e = scene.empreintesSolides.find((x) => x.id === idInteractif);
  if (!e) throw new Error(`interactif introuvable : ${idInteractif}`);
  return { x: e.x - 20, y: e.y + e.h / 2 };
}

// `D-176`/`D-177` : le HUD TACTILE vu sous Chrome — l'engrenage du bouton
// MENU, le bouton INTERACT qui montre sa cible, et avec eux tous les boutons
// du doigt. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/menu_tactile.mjs
//   POSTES=levier,coffre node tools/capture_chrome.mjs tools/scenarios/menu_tactile.mjs
// Le premier scénario qui passe la couche d'input en tactile : un vrai
// `TouchEvent` envoyé au canvas, hors joystick et hors boutons, comme le
// premier doigt d'un joueur. Les postes sont posés à côté de vraies cibles
// (positions lues dans les catalogues, jamais recopiées). Ce que ça prouve :
// « ça s'affiche ainsi sous Chrome ». Le verdict reste une validation de Xav,
// au doigt.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';
import { empreinteAbsoluePuzzle } from '../../src/structures.js';

const S = process.env.SORTIE || 'docs/captures/scenarios/menu-tactile-2026-09-23';
const TUILE = 32;
const PLEIN_JOUR = 200000;
const PROFILS = [['tel', { largeur: 780, hauteur: 360, dpr: 3 }], ['petit', { largeur: 703, hauteur: 280 }]];

async function catalogues() {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  return construireRegistre(donnees);
}

export default async function (chrome) {
  const registre = await catalogues();
  // Juste SOUS l'empreinte réelle de l'interactif (celle que mesure le jeu
  // pour la portée), à 12 px de son bord bas : dedans, pas à côté.
  const sousEmpreinte = (id) => {
    const puzzle = registre.obtenir('puzzles', id);
    const r = empreinteAbsoluePuzzle(puzzle, registre.obtenir('visuels', puzzle.render.visuel), { ...puzzle.position, rotation: puzzle.rotation || 0 }, TUILE);
    return [(r.x + r.w / 2) / TUILE, (r.y + r.h + 12) / TUILE];
  };
  // Un arbre récoltable de la Maison : le premier de la grille, côté sud
  // (on se tient sous lui, comme devant un interactif).
  const maison = chargerScene(registre, 'scene_maison_exterieur');
  let arbre = null;
  for (let y = 0; y < maison.height && !arbre; y++) {
    for (let x = 0; x < maison.width && !arbre; x++) {
      const t = maison.tuileA(x, y);
      if (t && t.ressource && !(maison.tuileA(x, y + 1) || {}).solid) arbre = [x + 0.5, y + 1.35];
    }
  }
  const POSTES = {
    rien: { scene: 'scene_maison_exterieur', case: [100.5, 55.5] },
    levier: { scene: 'scene_grotte_salle_1', case: sousEmpreinte('puzzle_levier_salle1') },
    table: { scene: 'scene_maison_exterieur', case: sousEmpreinte('station_table') },
    coffre: { scene: 'scene_maison_exterieur', case: sousEmpreinte('station_coffre') },
    puits: { scene: 'scene_maison_exterieur', case: sousEmpreinte('station_puits') },
    arbre: { scene: 'scene_maison_exterieur', case: arbre },
  };
  const choix = process.env.POSTES ? process.env.POSTES.split(',') : Object.keys(POSTES);
  const profils = process.env.PROFIL ? PROFILS.filter(([n]) => n === process.env.PROFIL) : PROFILS;
  for (const [profil, ecran] of profils) {
    for (const nom of choix) {
      const p = POSTES[nom];
      const save = saveDansLaMaison();
      save.hero.scene = p.scene;
      save.hero.x = p.case[0] * TUILE;
      save.hero.y = p.case[1] * TUILE;
      save.monde.heure = PLEIN_JOUR;
      await ouvrirLeJeu(chrome, { ...ecran, save });
      // Un contact au milieu de l'écran (hors joystick, hors boutons) : la
      // couche d'input bascule en tactile, comme au premier doigt d'un joueur.
      await chrome.evaluer(`(() => {
        const c = document.querySelector('canvas');
        const r = c.getBoundingClientRect();
        const t = new Touch({ identifier: 1, target: c, clientX: r.left + r.width * 0.55, clientY: r.top + r.height * 0.5 });
        c.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
        c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true, cancelable: true }));
        return true;
      })()`);
      await chrome.attendre(500);
      await chrome.capture(`${S}/${profil}_${nom}.png`);
      console.log(profil, nom, p.case.map((v) => v.toFixed(1)).join(','), chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
    }
  }
}

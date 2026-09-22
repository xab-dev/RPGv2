// `Q-40`/`Q-41` (23/09, décision de Xav) — toucher le follet = « cible
// suivante ». Le cycle lui-même (plus proche du héros d'abord, reprise au plus
// proche quand la cible est hors de portée, donc « rappel ») est éprouvé par
// test_d54_cible_suivante ; ici, seulement ce qui est neuf :
//   1. la couche tactile émet le verbe d'une zone annoncée, et d'elle seule ;
//   2. le doigt du joystick n'en déclenche jamais ;
//   3. l'orchestrateur annonce la zone SUR le follet tel qu'il est dessiné
//      (même caméra), et n'en annonce aucune sous UI.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerSourceTactile } from '../src/input/touch.js';
import { JOYSTICK } from '../src/ui/hud_layout.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { calculerCamera } from '../src/camera.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';

function creerFausseCible() {
  const gestionnaires = { touchstart: [], touchmove: [], touchend: [], touchcancel: [] };
  return {
    addEventListener(type, fn) { gestionnaires[type].push(fn); },
    emettre(type, touches) { for (const fn of gestionnaires[type]) fn({ touches, changedTouches: touches }); },
  };
}
const toucher = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });

// Une zone loin de la bande du joystick et de tous les boutons.
const ZONE = { cx: 260, cy: 120, rayon: 20, verbe: 'target_next' };

// --- 1. Un doigt dans la zone émet le verbe ; à côté, rien ----------------
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible, { zonesMonde: () => [ZONE] });
  cible.emettre('touchstart', [toucher(1, ZONE.cx + 5, ZONE.cy - 5)]);
  assert.equal(tactile.instantane().target_next, true, 'un doigt sur le follet = cible suivante');
  cible.emettre('touchend', []);
  assert.equal(tactile.instantane().target_next, false, 'relâché : plus rien');
  cible.emettre('touchstart', [toucher(2, ZONE.cx + ZONE.rayon + 5, ZONE.cy)]);
  assert.equal(tactile.instantane().target_next, false, 'à côté de la zone : rien');
  console.log('OK un doigt sur la zone du follet émet target_next, et seulement là');
}

// --- 1 bis. Sans zone annoncée (banc, test), aucun verbe fantôme -----------
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, ZONE.cx, ZONE.cy)]);
  assert.ok(!tactile.instantane().target_next);
  console.log('OK aucune zone par défaut');
}

// --- 2. Le doigt du joystick ne change jamais de cible ---------------------
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible, { zonesMonde: () => [ZONE] });
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, ZONE.cx, ZONE.cy)]);
  const etat = tactile.instantane();
  assert.notDeepEqual(etat.move, { x: 0, y: 0 }, 'le doigt pilote bien le joystick');
  assert.equal(etat.target_next, false, 'un pouce qui passe sur le follet en marchant ne change pas de cible');
  console.log('OK le doigt du joystick ne déclenche pas la zone du follet');
}

// --- 3. L'orchestrateur annonce la zone sur le follet, et rien sous UI -----
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const neutre = Object.fromEntries(
  ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu', 'target_next']
    .map((v) => [v, { pressed: false, held: false }]),
);
neutre.move = { x: 0, y: 0 };

function orchestrateur(menuOuvert) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  let zones = null;
  const orch = creerOrchestrateurGrotte({
    registre, i18n: creerI18n(dictionnaires, 'fr'), save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: { estOuvert: () => menuOuvert, traiterInput: () => {}, ouvrir: () => {} },
    input: { maj: () => neutre }, ctxLogique: null, ctxVisible: null, canvasLogique: null,
    onZonesMonde: (z) => { zones = z; },
  });
  return { orch, lire: () => zones };
}

{
  const { orch, lire } = orchestrateur(false);
  orch.maj(16);
  const follet = orch.obtenirFollet();
  assert.ok(follet, 'le follet existe dans la Région Maison');
  const hero = orch.obtenirHero();
  const scene = orch.obtenirScene();
  const camera = calculerCamera({
    cibleX: hero.x, cibleY: hero.y,
    largeurScene: scene.width * scene.tileSize, hauteurScene: scene.height * scene.tileSize,
    largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
  });
  const zones = lire();
  assert.equal(zones.length, 1);
  assert.equal(zones[0].verbe, 'target_next');
  // La zone est annoncée AVANT le déplacement de la frame : elle suit le
  // follet à une frame près. On compare donc à la position écran, à la
  // distance qu'un follet parcourt en une frame près — bien moins que le rayon.
  const ecart = Math.hypot(zones[0].cx - (follet.x - camera.x), zones[0].cy - (follet.y - camera.y));
  assert.ok(ecart < zones[0].rayon / 2, `la zone est sur le follet à l'écran (écart ${ecart.toFixed(1)} px)`);
  console.log('OK l’orchestrateur annonce la zone sur le follet, en coordonnées d’écran');
}

{
  const { orch, lire } = orchestrateur(true);
  orch.maj(16);
  assert.deepEqual(lire(), [], 'sous UI, aucune zone');
  console.log('OK aucune zone tant qu’une UI capte les verbes');
}

// `D-229` (`Q-51`) — le héros regarde quelque part : vers où il marche, et
// vers celui qu'il vise quand une compétence part.
//
// Contrats :
// 1. `orientation.js` : l'axe dominant du geste ; un geste nul garde la
//    direction ; une diagonale ne fait pas sauter le visage d'un côté à
//    l'autre ; un tir tourne le héros vers sa cible, et la marche ne le
//    retourne qu'une fois le regard écoulé.
// 2. Données : le héros déclare ses poses — de dos, le visage disparaît en
//    entier ; de profil, il se décale du côté regardé. La pose de face n'est
//    pas déclarée : c'est le dessin validé en jeu.
// 3. Dessin : sans orientation, ou de face, `dessinerVisuel` émet exactement
//    les mêmes ordres qu'avant ; de dos, les primitives du visage manquent.
// 4. Démarrage : une direction inconnue, une pièce que rien ne porte, une
//    pose mal formée sont refusées.
// 5. Orchestrateur : marcher tourne le héros ; tirer l'Onde le tourne vers la
//    cible, même en marchant dans l'autre sens.
// Les seuils sont lus dans le module, jamais épinglés.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ORIENTATIONS, ORIENTATION_INITIALE, RAPPORT_BASCULE_DIAGONALE, DUREE_REGARD_TIR_MS,
  directionDe, orienterDepuisMouvement, creerOrientation, avancerOrientation, poseDePiece,
} from '../src/orientation.js';
import { dessinerVisuel } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire, VISUEL_HEROS_ID } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { CAMP_HEROS } from '../src/projectiles.js';

// --- 1. Le module pur ----------------------------------------------------------------
{
  assert.equal(directionDe(0, 0), null);
  assert.equal(directionDe(1, 0), 'est');
  assert.equal(directionDe(-1, 0.2), 'ouest');
  assert.equal(directionDe(0.1, -1), 'nord');
  assert.equal(directionDe(0, 1), 'sud');
  assert.equal(directionDe(1, 1), 'est', 'à égalité, le profil (un tir en diagonale se voit mieux de côté)');
  assert.ok(ORIENTATIONS.includes(ORIENTATION_INITIALE));

  assert.equal(orienterDepuisMouvement('nord', 0, 0), 'nord', 'un geste nul garde la direction');
  assert.equal(orienterDepuisMouvement('sud', 1, 0), 'est');
  // Une diagonale juste au-delà de 45° ne bascule pas…
  const presque = (RAPPORT_BASCULE_DIAGONALE + 1) / 2;
  assert.equal(orienterDepuisMouvement('est', 1, presque), 'est', 'la diagonale hésite : on garde');
  assert.equal(orienterDepuisMouvement('sud', presque, 1), 'sud');
  // … au-delà de la marge, si.
  assert.equal(orienterDepuisMouvement('est', 1, RAPPORT_BASCULE_DIAGONALE * 1.1), 'sud');
  // La marge ne vaut que pour une composante du geste : partir à l'opposé bascule.
  assert.equal(orienterDepuisMouvement('est', -1, 0.9), 'ouest');

  let o = creerOrientation();
  assert.deepEqual(o, { direction: ORIENTATION_INITIALE, regardMs: 0 });
  o = avancerOrientation(o, { deltaMs: 16, vers: { dx: -30, dy: 5 } });
  assert.equal(o.direction, 'ouest', 'le tir tourne vers la cible');
  o = avancerOrientation(o, { deltaMs: DUREE_REGARD_TIR_MS / 2, dx: 1, dy: 0 });
  assert.equal(o.direction, 'ouest', 'pendant le regard, la marche ne retourne pas le héros');
  o = avancerOrientation(o, { deltaMs: DUREE_REGARD_TIR_MS, dx: 1, dy: 0 });
  assert.equal(o.direction, 'est', 'le regard écoulé, la marche reprend la main');
  const vide = avancerOrientation(o, { deltaMs: 16, vers: { dx: 0, dy: 0 } });
  assert.equal(vide.direction, 'est', 'une cible sur le héros ne change rien');
  console.log('OK orientation.js : axe dominant, diagonale sans sautillement, regard du tir');
}

// --- 2. Les données ---------------------------------------------------------------
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);
const VISAGE = HEROS.primitives.filter((p) => p.piece === 'visage');
{
  assert.ok(VISAGE.length > 0, 'le héros a un visage qui peut bouger');
  assert.equal(HEROS.orientations.sud, undefined, 'la pose de face est le dessin validé : rien à déclarer');
  assert.equal(poseDePiece(HEROS, 'nord', 'visage'), null, 'de dos, le visage disparaît');
  // De profil : le centre du visage (dessiné autour de son dx) part du côté regardé.
  const centre = VISAGE.reduce((s, p) => s + p.dx, 0) / VISAGE.length;
  const centreDe = (direction) => {
    const pose = poseDePiece(HEROS, direction, 'visage');
    assert.ok(pose && typeof pose === 'object', `${direction} : une pose de profil`);
    return (pose.dx ?? 0) + centre * (pose.echelle_x ?? 1);
  };
  assert.ok(centreDe('est') > centre, 'regardant à l\'est, le visage glisse vers l\'est');
  assert.ok(centreDe('ouest') < centre, 'regardant à l\'ouest, vers l\'ouest');
  console.log('OK données : de dos sans visage, de profil décalé du côté regardé');
}

// --- 3. Le dessin -------------------------------------------------------------------
function ordres(options) {
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) { return (...args) => appels.push([String(prop), ...args]); },
    set(_, prop, valeur) { appels.push([`=${String(prop)}`, valeur]); return true; },
  });
  dessinerVisuel(ctx, HEROS, 10, 20, options);
  return appels;
}
{
  const reference = ordres({ teinte: '#ff0000' });
  assert.deepEqual(ordres({ teinte: '#ff0000', orientation: 'sud' }), reference, 'de face : exactement le dessin d\'avant');
  const remplissages = (a) => a.filter((x) => x[0] === 'fill').length;
  assert.equal(remplissages(ordres({ teinte: '#ff0000', orientation: 'nord' })), remplissages(reference) - VISAGE.length,
    'de dos : toutes les primitives du visage, et elles seules, manquent');
  assert.equal(remplissages(ordres({ teinte: '#ff0000', orientation: 'est' })), remplissages(reference), 'de profil : rien ne manque');
  console.log('OK dessin : la face inchangée, le dos sans visage, le profil complet');
}

// --- 4. Le démarrage --------------------------------------------------------------
{
  const erreursAvec = (modif) => {
    const copie = structuredClone(donnees);
    modif(copie.visuels.find((v) => v.id === VISUEL_HEROS_ID));
    return validerCatalogues(copie);
  };
  assert.ok(erreursAvec((v) => { v.orientations.nordest = { visage: null }; }).some((e) => e.includes('direction inconnue')));
  assert.ok(erreursAvec((v) => { v.orientations.nord = { chapeau: null }; }).some((e) => e.includes('aucune primitive ne porte')));
  assert.ok(erreursAvec((v) => { v.orientations.est.visage = { dx: 'loin' }; }).some((e) => e.includes('orientations > est > visage')));
  assert.ok(erreursAvec((v) => { v.orientations.est.visage = { echelle_x: 0 }; }).some((e) => e.includes('orientations > est > visage')));
  assert.ok(erreursAvec((v) => { v.primitives[0].piece = ''; }).some((e) => e.includes('piece doit être un nom')));
  console.log('OK démarrage : direction, pièce et pose mal déclarées refusées');
}

// --- 5. L'orchestrateur -------------------------------------------------------------
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const neutre = { pressed: false, held: false };
const appui = { pressed: true, held: true };
function etat(verbes = {}) {
  const e = {
    move: { x: 0, y: 0 }, attack: neutre, skill_1: neutre, skill_2: neutre, skill_3: neutre,
    consume: neutre, interact: neutre, menu: neutre, target_next: neutre,
  };
  for (const v of Object.keys(verbes)) {
    if (v === 'move') e.move = verbes.move;
    else e[v] = verbes[v] ? appui : neutre;
  }
  return e;
}
// Ce que le palier G éprouve déjà (la salle aux cracheurs, l'Onde) : lu dans
// les données, aucun id du palier ici.
const COFFRE = donnees.puzzles.find((p) => p.type === 'coffre_parchemin');
const COMPETENCE = donnees.skills.find((c) => c.id === COFFRE.competence);
const VERBE = donnees.action_slots.find((a) => a.id === COMPETENCE.emplacement).verb;
const SALLE_1 = donnees.scenes.find((s) => s.descente && s.nettoyage && (s.spawns || []).length > 1);
{
  const save = saveNeuve();
  save.hero.competences = { [COMPETENCE.emplacement]: COMPETENCE.id };
  save.hero.scene = SALLE_1.id;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 30;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, [COMPETENCE.flag]: true };
  save.hero.x = (SALLE_1.spawn.x + 0.5) * SALLE_1.tile_size;
  save.hero.y = (SALLE_1.spawn.y + 0.5) * SALLE_1.tile_size;
  let prochain = etat();
  const menu = {
    estOuvert: () => false, indicesAffiches: () => false, rafraichirIndices() {}, rafraichirStats() {},
    traiterInput() {}, ouvrir() {}, fermer() {},
  };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'manette' },
    lireContactsTactiles: () => [],
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };

  frame();
  assert.equal(orch.obtenirOrientationHeros(), ORIENTATION_INITIALE, 'une partie chargée : de face');
  frame(etat({ move: { x: 0, y: -1 } }));
  assert.equal(orch.obtenirOrientationHeros(), 'nord', 'marcher vers le nord : de dos');
  frame();
  assert.equal(orch.obtenirOrientationHeros(), 'nord', 'arrêté, il garde sa direction');

  // Charger l'Onde collé à l'ouest d'un cracheur (comme le palier G), puis
  // tirer en poussant le stick vers l'ouest : il se retourne vers sa cible.
  const hero = orch.obtenirHero();
  const vivants = () => orch.obtenirMonstres().filter((m) => !m.mort);
  for (let i = 0; i < 2000 && !(orch.obtenirJaugesSlots()[VERBE] || {}).prete; i += 1) {
    const cible = vivants()[0];
    hero.x = cible.x - 10;
    hero.y = cible.y;
    hero.pv = hero.pvMax;
    frame();
  }
  assert.equal(orch.obtenirJaugesSlots()[VERBE].prete, true, 'l\'Onde est chargée');
  frame(etat({ [VERBE]: true, move: { x: -1, y: 0 } }));
  assert.equal(orch.obtenirProjectiles().filter((p) => p.camp === CAMP_HEROS).length, 1, 'le tir est parti');
  assert.equal(orch.obtenirOrientationHeros(), 'est', 'il regarde celui qu\'il vise, pas où il marche');
  hero.pv = hero.pvMax;
  frame(etat({ move: { x: -1, y: 0 } }));
  assert.equal(orch.obtenirOrientationHeros(), 'est', 'le regard tient la frame suivante');
  for (let t = 0; t <= DUREE_REGARD_TIR_MS; t += 16) { hero.pv = hero.pvMax; frame(etat({ move: { x: -1, y: 0 } })); }
  assert.equal(orch.obtenirOrientationHeros(), 'ouest', 'puis la marche reprend la main');
  console.log('OK orchestrateur : la marche tourne le héros, le tir le tourne vers sa cible');
}

console.log('OK test_d229_orientation_heros');

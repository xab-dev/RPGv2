// Contrat specs/04_stations-proportions-collision.md §7 : héros bloqué par
// une station solide sur les 4 côtés (glisse le long) ; INTERACT fonctionne
// depuis chaque côté à portée ; levier sans empreinte inchangé (comportement
// identique à avant cette fiche) ; héros sauvegardé dans une empreinte
// repoussé au chargement ; interactif solide sans rendu refusé au boot ;
// chemin critique porte ouest -> porte est -> jardin toujours praticable
// (couvert par tests/test_phase2_chemin_critique_2026-09-16.js, étendu le
// 2026-09-17 pour l'approche du puits désormais solide — pas dupliqué ici).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { empreinteParDefaut, resoudreEmpreinteInteractif, ECHELLE_INTERACTIF_DEFAUT } from '../src/structures.js';
import { chargerScene, resoudreDeplacement, trouverPositionLibrePlusProche } from '../src/scene.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// --- Partie A : structures.js pur ------------------------------------------

{
  const visuelCarre = { primitives: [{ forme: 'rect', dx: 0, dy: -5, w: 10, h: 10, couleur: '#fff' }] };
  const rect = empreinteParDefaut(visuelCarre, 2);
  // Local bbox : x [-5,5], y [-10,0] -> à l'échelle 2 : x [-10,10], y [-20,0].
  assert.deepEqual(rect, { x: -10, y: -20, w: 20, h: 20 });
  console.log('OK empreinteParDefaut : boîte englobante mise à l\'échelle');
}

{
  const visuel = { primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] };
  const levier = { solide: false };
  assert.deepEqual(resoudreEmpreinteInteractif(levier, visuel), { x: 0, y: 0, w: 0, h: 0 },
    'un interactif non solide sans empreinte explicite obtient un rectangle nul');
  const stationExplicite = { solide: true, empreinte: { x: 1, y: 2, w: 3, h: 4 } };
  assert.deepEqual(resoudreEmpreinteInteractif(stationExplicite, visuel), { x: 1, y: 2, w: 3, h: 4 },
    'une empreinte explicite prime toujours sur le calcul par défaut');
  const stationDefaut = { solide: true };
  const attendu = empreinteParDefaut(visuel, ECHELLE_INTERACTIF_DEFAUT);
  assert.deepEqual(resoudreEmpreinteInteractif(stationDefaut, visuel), attendu,
    'solide sans échelle déclarée utilise ECHELLE_INTERACTIF_DEFAUT (1, inchangé)');
  console.log('OK resoudreEmpreinteInteractif : nul / explicite / défaut');
}

// --- Partie B : schemas.js — validation des nouveaux champs ---------------

{
  const noms = Object.keys(SCHEMAS);
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms);
  assert.deepEqual(validerCatalogues(donnees), [], 'préalable : le vrai catalogue doit être valide');

  const sansRendu = {
    ...donnees,
    puzzles: donnees.puzzles.map((p) => (p.id === 'station_table' ? { ...p, render: undefined } : p)),
  };
  const erreursSansRendu = validerCatalogues(sansRendu);
  assert.ok(erreursSansRendu.some((e) => e.includes('solide: true exige un render.visuel')),
    'solide:true sans render.visuel doit être refusé au boot');

  const echelleInvalide = {
    ...donnees,
    puzzles: donnees.puzzles.map((p) => (p.id === 'station_table' ? { ...p, echelle: -1 } : p)),
  };
  assert.ok(validerCatalogues(echelleInvalide).some((e) => e.includes('echelle')),
    'echelle négative doit être refusée');

  const empreinteInvalide = {
    ...donnees,
    puzzles: donnees.puzzles.map((p) => (p.id === 'station_table' ? { ...p, empreinte: { x: 0, y: 0, w: -5, h: 4 } } : p)),
  };
  assert.ok(validerCatalogues(empreinteInvalide).some((e) => e.includes('empreinte')),
    'empreinte avec w négatif doit être refusée');

  console.log('OK schemas.js : solide sans rendu / echelle invalide / empreinte invalide refusés');
}

// --- Partie C : scene.js — collision + repositionnement -------------------

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
const registre = construireRegistre(donnees);
const scene = chargerScene(registre, 'scene_maison_exterieur');

assert.equal(scene.empreintesSolides.length, 4, 'les 4 stations doivent produire une empreinte solide');
const table = scene.empreintesSolides.find((e) => e.id === 'station_table');
assert.ok(table, 'station_table doit avoir une empreinte');

{
  // Bloqué sur les 4 côtés, glisse le long (même fonction de collision que
  // les tuiles, resoudreDeplacement — aucune 2ᵉ passe).
  const RAYON = 10;
  const cx = table.x + table.w / 2;
  const cy = table.y + table.h / 2;

  // Depuis l'ouest, en poussant plein est : le héros doit s'arrêter AVANT le
  // bord ouest de l'empreinte (jamais la traverser).
  let hitbox = { x: table.x - 40 - RAYON, y: cy - RAYON, largeur: RAYON * 2, hauteur: RAYON * 2 };
  for (let i = 0; i < 50; i++) {
    hitbox = resoudreDeplacement(scene, hitbox, 5, 0, () => false);
  }
  assert.ok(hitbox.x + hitbox.largeur <= table.x + 0.01, 'le héros ne doit jamais pénétrer l\'empreinte par l\'ouest');
  // Résolution discrète (pas de 5px par frame ici) : l'arrêt tombe au plus
  // près du bord dans la limite d'un pas, jamais loin devant lui.
  assert.ok(hitbox.x + hitbox.largeur > table.x - 6, 'le héros doit pouvoir approcher tout près du bord ouest');

  // Glissement : une poussée diagonale (est + sud) contre le coin nord-ouest
  // de la table doit continuer à avancer sur l'axe libre (sud), pas se figer.
  let hitboxDiag = { x: table.x - 30 - RAYON, y: table.y - 30 - RAYON, largeur: RAYON * 2, hauteur: RAYON * 2 };
  const yDepart = hitboxDiag.y;
  for (let i = 0; i < 20; i++) {
    hitboxDiag = resoudreDeplacement(scene, hitboxDiag, 4, 4, () => false);
  }
  assert.ok(hitboxDiag.y > yDepart, 'le héros doit continuer de glisser sur l\'axe libre plutôt que se figer');

  console.log('OK collision : bloqué sur l\'empreinte solide, glisse le long (une seule fonction de collision)');
}

{
  // Héros à l'intérieur d'une empreinte au chargement -> repoussé vers la
  // case libre la plus proche, jamais bloqué.
  const cx = table.x + table.w / 2;
  const cy = table.y + table.h / 2;
  assert.ok(scene.estSolideAuPoint(cx, cy), 'préalable : le centre de la table doit être solide');
  const libre = trouverPositionLibrePlusProche(scene, cx, cy, () => false);
  assert.ok(!scene.estSolideAuPoint(libre.x, libre.y), 'la position de repli doit être libre');
  assert.ok(libre.x !== cx || libre.y !== cy, 'la position doit avoir changé');
  console.log('OK trouverPositionLibrePlusProche : repousse hors d\'une empreinte solide');
}

{
  // Levier sans empreinte : comportement de collision inchangé (jamais
  // solide, cf. §3 "leviers : 1, inchangés").
  const scèneGrotte = chargerScene(registre, 'scene_grotte_salle_1');
  assert.equal(scèneGrotte.empreintesSolides.length, 0, 'un levier sans `solide` ne doit produire aucune empreinte');
  console.log('OK levier sans empreinte : aucune régression de collision');
}

// --- Partie D : intégration orchestrateur — INTERACT depuis les 4 côtés,
// repositionnement au chargement d'une sauvegarde antérieure -------------

function etat({ moveX = 0, moveY = 0, interact = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: false, held: false },
  };
}
function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}
function avancerVers(orchestrateur, frames, cible, { seuil = 4, maxFrames = 600, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    const hero = orchestrateur.obtenirHero();
    const dx = cible.x - hero.x;
    const dy = cible.y - hero.y;
    const distance = Math.hypot(dx, dy);
    if (distance < seuil) return true;
    frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
    orchestrateur.maj(deltaMs);
  }
  return false;
}

function nouvelOrchestrateur(positionInitiale) {
  const i18n = creerI18n(dictionnaires, 'fr');
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.x = positionInitiale.x;
  save.hero.y = positionInitiale.y;
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true, flag_grotte_monstre_tue: true, flag_levier_salle1: true };
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  // station_table est désormais une station "craft" (Palier A,
  // specs/04_maison-interieur.md §3.1) : INTERACT appelle menu.ouvrirCraft()
  // plutôt que d'ouvrir un dialogue — la fausse implémentation enregistre
  // l'appel pour que le test ci-dessous puisse le vérifier.
  let craftOuvert = false;
  const menu = {
    estOuvert: () => false,
    traiterInput: () => {},
    ouvrir: () => {},
    ouvrirCraft: () => { craftOuvert = true; },
    ouvrirCoffre: () => {},
  };
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });
  return { orchestrateur, frames, save, craftOuvert: () => craftOuvert };
}

{
  // INTERACT depuis chaque côté à portée (bord de l'empreinte, pas le
  // centre) : approche depuis l'ouest, l'est, le nord et le sud.
  const marge = 20; // < DISTANCE_INTERACT_PX (28), à l'extérieur de l'empreinte
  const cx = table.x + table.w / 2;
  const cy = table.y + table.h / 2;
  const points = {
    ouest: { x: table.x - marge, y: cy },
    est: { x: table.x + table.w + marge, y: cy },
    nord: { x: cx, y: table.y - marge },
    sud: { x: cx, y: table.y + table.h + marge },
  };
  for (const [cote, point] of Object.entries(points)) {
    const { orchestrateur, frames, craftOuvert } = nouvelOrchestrateur(point);
    frames.push(etat({ interact: true }));
    orchestrateur.maj(16);
    assert.ok(craftOuvert(), `INTERACT depuis le côté ${cote} doit ouvrir le menu Craft de la station`);
  }
  console.log('OK INTERACT fonctionne depuis chaque côté de l\'empreinte, à portée');
}

{
  // Sauvegarde antérieure avec le héros DANS l'empreinte (station agrandie
  // depuis) -> repoussé au chargement, jamais bloqué.
  const cx = table.x + table.w / 2;
  const cy = table.y + table.h / 2;
  const { orchestrateur } = nouvelOrchestrateur({ x: cx, y: cy });
  const hero = orchestrateur.obtenirHero();
  assert.ok(!(hero.x === cx && hero.y === cy), 'le héros doit avoir été déplacé hors du centre de la table');
  const scèneCourante = orchestrateur.obtenirScene();
  assert.ok(!scèneCourante.estSolideAuPoint(hero.x, hero.y), 'la position finale du héros doit être libre');
  console.log('OK héros sauvegardé dans une empreinte solide -> repoussé au chargement');
}

console.log('OK test_stations_collision');

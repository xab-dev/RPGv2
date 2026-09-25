// `D-247` (`Q-167`, Xav) — une compétence se vise au curseur : la souris au
// clavier, le stick droit à la manette.
//
// Contrats :
// 1. `curseur.js#viseeDuCurseur` : le curseur ne vise que tenu par le
//    périphérique qui joue ; au doigt, jamais.
// 2. `competences.js#pointVise` : un point visé donne la direction, et le tir
//    va au bout de sa portée ; personne ne vise, ou le curseur est sur le
//    héros : la cible automatique, et sans elle rien.
// 3. Orchestrateur : le tir part vers le curseur, même à l'opposé de la cible
//    du follet, et le héros se tourne vers lui ; sans visée, vers la cible.
// Les seuils sont lus dans les modules, jamais épinglés.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { viseeDuCurseur } from '../src/curseur.js';
import { pointVise, RAYON_VISEE_MORTE_PX } from '../src/competences.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { CAMP_HEROS } from '../src/projectiles.js';

// --- 1. Qui tient le curseur --------------------------------------------------------
{
  const souris = { x: 10, y: 20, source: 'souris' };
  const stick = { x: 10, y: 20, source: 'stick' };
  assert.deepEqual(viseeDuCurseur(souris, 'clavier'), { x: 10, y: 20 });
  assert.equal(viseeDuCurseur(souris, 'manette'), null, 'une souris posée ne vise pas pour la manette');
  assert.deepEqual(viseeDuCurseur(stick, 'manette'), { x: 10, y: 20 });
  assert.equal(viseeDuCurseur(stick, 'clavier'), null);
  assert.equal(viseeDuCurseur(souris, 'tactile'), null, 'au doigt, jamais');
  assert.equal(viseeDuCurseur(stick, 'tactile'), null);
  assert.equal(viseeDuCurseur(null, 'clavier'), null, 'un curseur qui n\'a jamais bougé ne vise pas');
  console.log('OK viseeDuCurseur : la souris au clavier, le stick à la manette, jamais au doigt');
}

// --- 2. Le point visé ------------------------------------------------------------
{
  const hero = { x: 100, y: 100 };
  const monstres = [{ id: 'm', x: 150, y: 100, mort: false }];
  const auto = pointVise({ hero, porteePx: 80, follet: null, monstres });
  assert.equal(auto.cible.id, 'm', 'personne ne vise : la cible automatique');
  const vise = pointVise({ visee: { x: 100, y: 60 }, hero, porteePx: 80, follet: null, monstres });
  assert.equal(vise.cible, null, 'la visée ne choisit pas de monstre');
  assert.ok(Math.abs(vise.x - 100) < 1e-9 && Math.abs(vise.y - 20) < 1e-9, 'vers le curseur, au bout de la portée');
  const loin = pointVise({ visee: { x: 1000, y: 100 }, hero, porteePx: 80, follet: null, monstres });
  assert.ok(Math.abs(Math.hypot(loin.x - hero.x, loin.y - hero.y) - 80) < 1e-9, 'un curseur lointain ne rallonge pas la portée');
  const surLeHeros = pointVise({ visee: { x: hero.x + RAYON_VISEE_MORTE_PX / 2, y: hero.y }, hero, porteePx: 80, follet: null, monstres });
  assert.equal(surLeHeros.cible.id, 'm', 'le curseur sur le héros : la cible automatique');
  assert.ok(pointVise({ visee: { x: 0, y: 0 }, hero, porteePx: 80, follet: null, monstres: [] }), 'on vise même sans monstre');
  assert.equal(pointVise({ hero, porteePx: 80, follet: null, monstres: [] }), null, 'sans visée ni monstre : rien');
  console.log('OK pointVise : la direction du curseur, la portée entière ; sinon la cible automatique');
}

// --- 3. L'orchestrateur -------------------------------------------------------------
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
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
// La salle aux cracheurs et l'Onde, lues dans les données (aucun id ici).
const COFFRE = donnees.puzzles.find((p) => p.type === 'coffre_parchemin');
const COMPETENCE = donnees.skills.find((c) => c.id === COFFRE.competence);
const VERBE = donnees.action_slots.find((a) => a.id === COMPETENCE.emplacement).verb;
const SALLE_1 = donnees.scenes.find((s) => s.descente && s.nettoyage && (s.spawns || []).length > 1);

function banc(lireVisee) {
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
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'clavier' },
    lireContactsTactiles: () => [],
    lireVisee,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat()) => { prochain = e; orch.maj(16); };
  frame();
  // Charger l'Onde collé à l'OUEST d'un cracheur : la cible automatique est à l'est.
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
  frame(etat({ [VERBE]: true }));
  const tirs = orch.obtenirProjectiles().filter((p) => p.camp === CAMP_HEROS);
  assert.equal(tirs.length, 1, 'le tir est parti');
  return { tir: tirs[0], orientation: orch.obtenirOrientationHeros() };
}
{
  const sansVisee = banc(() => null);
  assert.ok(sansVisee.tir.vx > 0, 'sans visée : vers le cracheur, à l\'est');
  // Le bord gauche de l'écran : à l'ouest du héros, quelle que soit la caméra.
  const auCurseur = banc(() => ({ x: 0, y: 135 }));
  assert.ok(auCurseur.tir.vx < 0, 'au curseur : vers l\'ouest, à l\'opposé de la cible du follet');
  assert.equal(auCurseur.orientation, 'ouest', 'le héros regarde où il vise');
  console.log('OK orchestrateur : le tir suit le curseur, sinon la cible automatique');
}

console.log('OK test_d247_visee_curseur');

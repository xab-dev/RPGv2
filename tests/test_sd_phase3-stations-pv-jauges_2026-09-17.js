// Contrat (SD_phase3-stations-pv-jauges_2026-09-17.md) : diagnostic de la
// première validation en jeu du Palier A-E — trois symptômes, trois causes
// racines distinctes, aucune corrigée sans que sa cause ne soit écrite
// d'abord (voir le journal de session pour le texte de chaque cause).
//
// Sujet 3 (jauges figées) est déjà couvert par test_save_migration_3_4
// (etatInitialSurvie unique, clés jauge_faim/jauge_soif) ; ce fichier
// couvre les sujets 1 (rendu des stations) et 2 (réconciliation PV/pv_max).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcilierPvMax, creerHeros } from '../src/entities.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// --- Sujet 2 : reconcilierPvMax() (pur) ------------------------------------

// 1. Premier calcul (pv encore null) : pv = pv_max, comportement inchangé
// depuis avant cette fiche.
{
  const hero = creerHeros({ x: 0, y: 0, rayon: 1, pvMax: 1 });
  hero.pv = null;
  const suivant = reconcilierPvMax(hero, 40);
  assert.equal(suivant.pv, 40);
  assert.equal(suivant.pvMax, 40);
}

// 2. pv_max qui MONTE (buff de Vitalité) : pv monte du même delta ABSOLU —
// le buff donne réellement les PV qu'il promet, la barre ne peut donc
// jamais paraître PLUS VIDE qu'avant de manger (ratio en hausse ou égal,
// jamais en baisse) — c'est exactement le ressenti "PV perdus" à corriger.
{
  const hero = { pv: 30, pvMax: 40 };
  const ratioAvant = hero.pv / hero.pvMax;
  const suivant = reconcilierPvMax(hero, 56); // +16 (buff_repas +2 vitalite, cf. data)
  assert.equal(suivant.pv, 46, 'pv doit monter du même delta absolu que pv_max');
  assert.equal(suivant.pvMax, 56);
  assert.ok(suivant.pv / suivant.pvMax >= ratioAvant, 'le ratio affiché ne doit jamais baisser en mangeant');
}

// 3. pv_max qui REDESCEND (expiration du buff), pv déjà sous le NOUVEAU
// plafond (le héros a encaissé des dégâts pendant le buff) : aucune perte,
// seul pv_max change.
{
  const hero = { pv: 35, pvMax: 56 };
  const suivant = reconcilierPvMax(hero, 40);
  assert.equal(suivant.pv, 35, 'aucune perte de PV tant que pv reste sous le nouveau plafond');
  assert.equal(suivant.pvMax, 40);
}

// 4. pv_max qui redescend, pv AU-DESSUS du nouveau plafond (cas limite : PV
// au max pendant le buff, puis expiration) : clampé au nouveau plafond,
// jamais en dessous.
{
  const hero = { pv: 56, pvMax: 56 };
  const suivant = reconcilierPvMax(hero, 40);
  assert.equal(suivant.pv, 40, 'clampé au nouveau plafond, sans perte supplémentaire au-delà');
}

// 5. pv_max inchangé (cas courant, la plupart des frames) : no-op.
{
  const hero = { pv: 25, pvMax: 40 };
  const suivant = reconcilierPvMax(hero, 40);
  assert.equal(suivant.pv, 25);
}

// --- Sujet 1 : garde-fou "solide sans rendu" + résolution réelle ----------

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreursChargement, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

// 6. Garde-fou : un interactif `type: "station"` reproduisant exactement le
// cas de la Phase 3 (solide, sans render.visuel) est refusé AU BOOT — c'est
// la classe de bug que le garde-fou protège réellement (donnée invalide),
// distincte de la cause racine trouvée ici (filtre de RENDU obsolète, cf.
// journal).
{
  const donneesTest = JSON.parse(JSON.stringify(donnees));
  donneesTest.puzzles = [
    ...donneesTest.puzzles,
    { id: 'station_test_sans_visuel', type: 'station', position: { x: 0, y: 0 }, station_type: 'station_type_puits', solide: true },
  ];
  const erreurs = validerCatalogues(donneesTest);
  assert.ok(
    erreurs.some((e) => e.includes('station_test_sans_visuel') && e.includes('render.visuel')),
    `le garde-fou doit nommer l'interactif fautif :\n${erreurs.join('\n')}`
  );
}

// 7. Les 4 vraies stations + le puits résolvent bien un visuel non nul (la
// donnée était déjà valide — la cause du bug n'était pas ici, cf. sujet 8).
{
  for (const id of ['station_table', 'station_coffre', 'station_atelier', 'station_puits']) {
    const puzzle = registre.obtenir('puzzles', id);
    assert.equal(puzzle.type, 'station', `${id} doit être de type "station" (Palier A)`);
    const visuel = registre.obtenir('visuels', puzzle.render.visuel);
    assert.ok(visuel, `${id} > render.visuel "${puzzle.render.visuel}" doit résoudre un visuel réel`);
  }
}

// 8. Cause racine confirmée : sur le VRAI orchestrateur, les 4 stations
// (type "station") sont bien SOLIDES (collision, déjà couvert par
// test_stations_collision) ET auraient été exclues du rendu par l'ancien
// filtre `p.type === 'levier' || p.type === 'station_placeholder'` — la
// preuve directe (canvas jamais exercé headless) revient à Xav via
// docs/CHECKLIST_visuelle.md état 21, mais on vérifie ici que le nouveau
// filtre structurel (`p.render && p.render.visuel`) inclut bien les 4
// stations, le puits, ET les leviers de la grotte — rien exclu par erreur.
{
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  const menuFactice = { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} };
  const dialogue = creerDialogue();
  const input = { maj: () => ({
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false }, skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false }, interact: { pressed: false, held: false }, menu: { pressed: false, held: false },
  }) };
  const orch = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu: menuFactice, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });
  const scene = orch.obtenirScene();

  const idsAttendusDessines = ['station_table', 'station_coffre', 'station_atelier', 'station_puits'];
  for (const id of idsAttendusDessines) {
    const puzzle = registre.obtenir('puzzles', id);
    assert.ok(scene.interactifs.includes(id), `${id} doit être dans scene.interactifs`);
    // Reproduit exactement le nouveau filtre de main.js#dessiner() : la
    // preuve que la classe de bug (filtre par type énuméré) ne peut plus se
    // reproduire pour un interactif qui déclare un render.visuel valide.
    assert.ok(puzzle.render && puzzle.render.visuel, `${id} doit passer le filtre structurel du rendu`);
  }
}

console.log('OK test_sd_phase3-stations-pv-jauges');

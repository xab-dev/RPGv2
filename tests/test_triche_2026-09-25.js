// `?cheat=phenom` (demande de Xav, 25/09) : « tous les contenus (craft
// gratuit) + Nv50, c'est tout ». Le boss, Zéros et les dialogues doivent se
// dérouler comme dans une partie neuve.
//
// Prouvé :
//   1. `triche.js` : le mot de passe exact, l'XP du dernier niveau lue dans la
//      table, une recette gratuite qui garde ce qui n'est pas un coût ;
//   2. sur le vrai orchestrateur, une partie neuve trichée : le dernier niveau
//      et tous ses points, chaque compétence connue et rangée, AUCUN flag posé
//      hors des flags de niveau (le coffre du parchemin reste donc fermé, le
//      Gardien et Zéros attendent toujours leur flag) ;
//   3. l'Atelier : toutes ses recettes, poche vide, fabriquées sans rien payer
//      ni attendre ; sans triche, la même poche ne fabrique rien ;
//   4. « Nouvelle partie » sous la triche repart au dernier niveau.
//
// CE QUE CE FICHIER NE PROUVE PAS : que la sauvegarde trichée vive à part
// (IndexedDB n'existe pas sous Node : `storage_indexeddb.js` reçoit le nom de
// base, c'est tout), ni que le jeu soit agréable au Nv.50.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { lireTriche, xpNiveauMax, recetteGratuite, NOM_BASE_TRICHE } from '../src/triche.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const NIVEAUX = registre.tous('levels');
const NIVEAU_MAX = Math.max(...NIVEAUX.map((n) => n.niveau));
const NIVEAU_DEPART = Math.min(...NIVEAUX.map((n) => n.niveau));
const POINTS_MAX = NIVEAUX.filter((n) => n.niveau > NIVEAU_DEPART).reduce((s, n) => s + n.points_stats, 0);
const COFFRE = registre.tous('puzzles').find((p) => p.type === 'coffre_parchemin');

// --- 1. Le module -----------------------------------------------------------
{
  assert.equal(lireTriche('?cheat=phenom'), true);
  assert.equal(lireTriche('?debug=fps&cheat=phenom'), true, 'avec d\'autres paramètres');
  assert.equal(lireTriche('?cheat=Phenom'), false, 'le mot exact');
  assert.equal(lireTriche('?cheat='), false);
  assert.equal(lireTriche(''), false);
  assert.equal(lireTriche(null), false);
  assert.notEqual(NOM_BASE_TRICHE, 'rpg_v2', 'une base à part : la vraie partie n\'est jamais écrasée');
  assert.equal(xpNiveauMax(NIVEAUX), registre.obtenir('levels', `niveau_${NIVEAU_MAX}`).xp_cumulee);
  const vraie = registre.tous('recipes').find((r) => r.unique && r.entrees.length && r.cout_eclats);
  const gratuite = recetteGratuite(vraie);
  assert.deepEqual([gratuite.entrees, gratuite.cout_eclats, gratuite.cooldown_ms], [[], 0, 0]);
  assert.equal(gratuite.unique, true, 'un outil unique le reste');
  assert.deepEqual(gratuite.sortie, vraie.sortie);
  assert.ok(vraie.entrees.length > 0, 'la vraie recette n\'est pas mutée');
  console.log('OK triche.js : le mot exact, le dernier niveau lu dans la table, une recette sans coût');
}

// --- L'orchestrateur ----------------------------------------------------------
const b = (v) => ({ pressed: v, held: v });
const etat = (interact = false) => ({
  move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
  skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
});
// Une partie neuve, sortie de la grotte : ce qui fait fermer les yeux au test
// (les ambiances, les premières fois des stations) est déjà vu, pour qu'aucun
// dialogue ne capte INTERACT devant l'Atelier.
function partie(triche) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
    ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])),
  };
  const flagsAvant = { ...save.flags };
  const ouvert = {};
  let frame = etat();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), triche,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
      ouvrirCraft: (obtenirEntrees) => { ouvert.obtenirEntrees = obtenirEntrees; },
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
      indicesAffiches: () => false, rafraichirIndices: () => {},
    },
    input: { maj: () => frame },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const atelier = () => {
    const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
    orch.obtenirHero().x = empreinte.x - 20;
    orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
    frame = etat(true);
    orch.maj(16);
    frame = etat();
    assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l\'Atelier ouvre l\'écran Craft');
    return ouvert.obtenirEntrees();
  };
  return { save, orch, flagsAvant, atelier };
}

// --- 2. Une partie neuve trichée -------------------------------------------------
const { save, orch, flagsAvant, atelier } = partie(true);
{
  assert.equal(save.hero.niveau, NIVEAU_MAX, 'le dernier niveau');
  assert.equal(save.hero.points_stats_libres, POINTS_MAX, 'tous ses points, à répartir');
  const poses = Object.keys(save.flags).filter((id) => !(id in flagsAvant));
  assert.ok(poses.length > 0 && poses.every((id) => /^flag_niveau_\d+$/.test(id)),
    `seuls les flags de niveau sont posés (posés : ${poses.filter((id) => !/^flag_niveau_/.test(id)).join(', ') || 'aucun autre'})`);
  for (const competence of registre.tous('skills')) {
    assert.ok(!save.flags[competence.flag], `${competence.id} : son flag n'est pas posé`);
    assert.ok(Object.values(save.hero.competences).includes(competence.id), `${competence.id} : rangée, prête à lancer`);
  }
  assert.ok(!save.flags[registre.obtenir('skills', COFFRE.competence).flag], 'le coffre du parchemin reste fermé');
  const cartes = orch.obtenirEntreesStats().map((e) => e.titre);
  for (const competence of registre.tous('skills')) {
    assert.ok(cartes.includes(i18n.t(competence.label_key)), `${competence.id} : sa carte dans Stats`);
  }
  console.log(`OK partie neuve trichée : Nv.${NIVEAU_MAX}, ${POINTS_MAX} points, compétences rangées, aucun flag d'histoire posé`);
}

// --- 3. L'Atelier, gratuit -------------------------------------------------------
{
  save.inventaire.items = {};
  save.inventaire.eclats = 0;
  const recettesAtelier = registre.tous('recipes').filter((r) => r.station === 'station_type_atelier');
  let entrees = atelier();
  assert.equal(entrees.length, recettesAtelier.length, 'toutes les recettes de l\'Atelier, sans condition');
  assert.ok(entrees.every((e) => !e.grisee), 'poche vide, aucune n\'est grisée');
  // Un outil, puis tout de suite une seconde recette : ni ingrédient, ni
  // éclat, ni recharge.
  const outils = recettesAtelier.filter((r) => r.sortie.item && r.unique);
  assert.ok(outils.length >= 2, 'deux outils à l\'Atelier');
  for (const recette of outils.slice(0, 2)) {
    entrees = ouvertParTitre(entrees, recette);
    assert.equal(save.inventaire.items[recette.sortie.item], recette.sortie.qte, `${recette.id} : fabriquée pour rien`);
    entrees = atelier();
  }
  assert.equal(save.inventaire.eclats, 0, 'aucun éclat dépensé');
  const deja = entrees.find((e) => e.titre === i18n.t(outils[0].label_key));
  assert.equal(deja.grisee, true, 'un outil unique qu\'on a déjà reste refusé : ce n\'est pas un coût');
  console.log(`OK l'Atelier : ${recettesAtelier.length} recettes, fabriquées poche vide et sans attendre`);
}
function ouvertParTitre(entrees, recette) {
  const entree = entrees.find((e) => e.titre === i18n.t(recette.label_key));
  entree.action();
  return entrees;
}

// Sans la triche, la même poche vide ne fabrique rien.
{
  const sans = partie(false);
  assert.equal(sans.save.hero.niveau, NIVEAU_DEPART, 'sans triche, une partie neuve reste au premier niveau');
  const entrees = sans.atelier();
  assert.ok(entrees.length < registre.tous('recipes').filter((r) => r.station === 'station_type_atelier').length,
    'sans triche, une recette à palier reste cachée');
  assert.ok(entrees.every((e) => e.grisee), 'sans triche, poche vide : tout est grisé');
  assert.deepEqual(sans.save.hero.competences, {}, 'sans triche, rien de rangé');
  console.log('OK sans triche : rien ne change');
}

// --- 4. « Nouvelle partie » sous la triche -----------------------------------------
{
  await orch.reinitialiserPartie();
  assert.equal(save.hero.niveau, NIVEAU_MAX, 'une partie trichée repart au dernier niveau');
  assert.equal(save.hero.points_stats_libres, POINTS_MAX);
  assert.ok(registre.tous('skills').every((c) => Object.values(save.hero.competences).includes(c.id)));
  assert.ok(!save.flags.flag_follet_choisi, 'l\'histoire, elle, repart de zéro');
  console.log('OK « Nouvelle partie » sous la triche : le dernier niveau, l\'histoire à zéro');
}

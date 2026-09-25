// specs/08_menus-cartes.md, palier C3 — l'écran Stats en « maître-détail ».
// Ce que fournit le VRAI orchestrateur à l'écran : une tuile par stat du
// catalogue, une fiche faite des stats dérivées qui en dépendent (lues dans
// `stats_derivees.json`, jamais écrites par stat), un bouton « +1 » seulement
// s'il reste un point, et un sous-titre qui porte ce qui n'est pas une action
// (points libres, progression d'XP). Le rendu DOM et la parité pointeur/verbes
// sont couverts par test_d43_c1 et test_sd_construction_parite_clic_verbe.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const save = saveNeuve();
save.hero.scene = 'scene_maison_exterieur';
save.hero.companion = 'comp_follet_eau';
save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
save.hero.points_stats_libres = 2;
let rafraichissements = 0;
const menu = {
  estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
  ouvrirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirStats: () => { rafraichissements += 1; },
};
const orch = creerOrchestrateurGrotte({
  registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
  input: { maj: () => null }, ctxLogique: null, ctxVisible: null, canvasLogique: null,
});

// --- 1. Une tuile par stat du catalogue ------------------------------------------------
{
  const entrees = orch.obtenirEntreesStats();
  const stats = registre.tous('stats');
  assert.deepEqual(entrees.map((e) => e.titre), stats.map((s) => i18n.t(s.label_key)), 'une entrée par stat, dans l’ordre du catalogue — et rien d’autre');
  assert.deepEqual(entrees.map((e) => e.icone), stats.map((s) => s.icone), 'son icône vient de `stats.json`');
  assert.ok(entrees.every((e) => Number.isFinite(e.quantite)), 'sa valeur en pastille');
  assert.ok(entrees.every((e) => e.libelleAction === i18n.t('menu.stats_ajouter') && e.grisee === false), 'des points à dépenser : le bouton « +1 »');

  // La fiche : les dérivées qui dépendent de CETTE stat, et elles seules —
  // celles qui ne sont pas encore visibles en moins (spec 14, palier G : la
  // puissance des compétences attend la première, `D-62`). Une partie neuve
  // n'en a aucune : toutes les lignes sont des entiers.
  for (const [i, s] of stats.entries()) {
    const attendues = registre.tous('stats_derivees').filter((d) => d.stat === s.id && !d.visible_si).map((d) => i18n.t(d.label_key));
    assert.deepEqual(entrees[i].lignes.map((l) => l.split(' : ')[0]), attendues, `${s.id} : ses dérivées, lues dans le catalogue`);
    assert.ok(entrees[i].lignes.every((l) => /: -?\d+$/.test(l)), `${s.id} : chaque ligne porte une valeur entière (${entrees[i].lignes.join(' · ')})`);
  }
  console.log('OK Stats : une tuile par stat ; la fiche liste les dérivées du catalogue, avec leur valeur');
}

// --- 2. Dépenser un point : la valeur, la dérivée et le sous-titre suivent -----------------
{
  const vitalite = registre.tous('stats').findIndex((s) => s.id === 'stat_vitalite');
  const avant = orch.obtenirEntreesStats()[vitalite];
  assert.match(orch.sousTitreStats(), new RegExp(`^${i18n.t('menu.points_libres')} : 2 · ${i18n.t('menu.stats_xp')} : `), 'le sous-titre : points libres, puis la progression d’XP');
  avant.action();
  const apres = orch.obtenirEntreesStats()[vitalite];
  assert.equal(apres.quantite, avant.quantite + 1);
  assert.notEqual(apres.lignes[0], avant.lignes[0], 'les PV max de la fiche ont bougé avec la Vitalité');
  assert.equal(save.hero.points_stats_libres, 1);
  assert.equal(rafraichissements, 1, 'l’action demande à l’écran de se relire');
  assert.match(orch.sousTitreStats(), / : 1 · /);

  // Plus de point : plus de bouton — et l'action, appelée quand même, ne fait rien.
  apres.action();
  const sansPoint = orch.obtenirEntreesStats();
  assert.ok(sansPoint.every((e) => e.libelleAction === null), 'plus aucun point : aucun bouton');
  assert.ok(sansPoint.every((e) => e.grisee === false), 'mais aucune tuile grisée : c’est d’abord un écran d’information');
  const valeur = sansPoint[vitalite].quantite;
  sansPoint[vitalite].action();
  assert.equal(orch.obtenirEntreesStats()[vitalite].quantite, valeur, 'sans point, l’action réelle ne donne rien : le résultat fait foi');
  console.log('OK Stats : +1 met à jour valeur, dérivées et sous-titre ; sans point, ni bouton ni effet');
}

console.log('OK test_d43_c3_stats_fiches');

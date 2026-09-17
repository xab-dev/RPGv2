// Contrat (§3, §7 de specs/04_maison-interieur.md) : la boucle 5 minutes
// jouée par un bot sur le VRAI orchestrateur (creerOrchestrateurGrotte,
// données réelles de /data) — 2 branches + 1 caillou -> hache -> bois,
// 1 branche + 2 cailloux -> pioche -> pierre, fruit -> fruit cuit -> mangé,
// XP créditée par le craft, niveau qui monte, flags posés. `menu` est une
// fausse implémentation qui capture `obtenirEntrees` (comme le ferait
// ui/menu.js à l'ouverture) plutôt qu'un vrai DOM : ce test vérifie la
// logique de bout en bout (main.js#essayerStation/entreesCraft/fabriquer),
// jamais le rendu ni la navigation focus/manette (hors contrainte de
// méthode, canvas/DOM jamais exercés headless).
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreursChargement, []);
assert.deepEqual(validerCatalogues(donnees), []);

const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const store = creerStoreMemoire();
const save = saveNeuve();
save.hero.scene = 'scene_maison_exterieur';
save.hero.companion = 'comp_follet_eau';
save.hero.pv = 40;
save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true, flag_grotte_monstre_tue: true, flag_levier_salle1: true };
// Départ direct avec de quoi crafter hache + pioche (le ramassage au sol est
// déjà couvert par test_phase2_chemin_critique) — la boucle réelle prouvée
// ici est craft -> outil -> récolte -> XP -> niveau -> manger.
save.inventaire.items = { item_branche: 3, item_caillou: 3, item_fruit: 1 };

let dernieresEntreesCraft = null;
let dernieresEntreesCoffre = null;
const menu = {
  estOuvert: () => false,
  traiterInput: () => {},
  ouvrir: () => {},
  ouvrirCraft: (obtenirEntrees) => { dernieresEntreesCraft = obtenirEntrees; },
  rafraichirCraft: () => {},
  ouvrirCoffre: (obtenirEntrees) => { dernieresEntreesCoffre = obtenirEntrees; },
  rafraichirCoffre: () => {},
  rafraichirStats: () => {},
};
const dialogue = creerDialogue();
const frames = [];
const input = { maj: () => frames[frames.length - 1] };
const orch = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });
const scene = orch.obtenirScene();

function etat({ interact = false, consume = false } = {}) {
  return {
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false }, skill_3: { pressed: false, held: false },
    consume: { pressed: consume, held: consume }, interact: { pressed: interact, held: interact }, menu: { pressed: false, held: false },
  };
}

function allerA(idStation) {
  const empreinte = scene.empreintesSolides.find((e) => e.id === idStation);
  assert.ok(empreinte, `empreinte introuvable pour ${idStation}`);
  const hero = orch.obtenirHero();
  hero.x = empreinte.x - 20; // marge < DISTANCE_INTERACT_PX (28), côté ouest
  hero.y = empreinte.y + empreinte.h / 2;
}

function interagir() {
  frames.push(etat({ interact: true }));
  orch.maj(16);
  frames.push(etat());
  orch.maj(16);
}

function fabriquerViaMenu(labelKey) {
  dernieresEntreesCraft = null;
  interagir();
  assert.ok(dernieresEntreesCraft, `menu.ouvrirCraft n'a pas été appelé pour ${labelKey}`);
  const entrees = dernieresEntreesCraft();
  const texteAttendu = i18n.t(labelKey);
  const entree = entrees.find((e) => e.texte.startsWith(texteAttendu));
  assert.ok(entree, `entrée "${texteAttendu}" introuvable dans le menu Craft`);
  assert.equal(entree.grisee, false, `"${texteAttendu}" ne doit pas être grisée`);
  entree.action();
}

// --- Atelier : hache puis pioche ---
allerA('station_atelier');
fabriquerViaMenu('recipe.hache');
assert.equal(save.inventaire.items.item_hache, 1, 'hache fabriquée');
assert.equal(save.inventaire.items.item_branche, 1, '2 branches consommées sur 3');
assert.equal(save.inventaire.items.item_caillou, 2, '1 caillou consommé sur 3');
assert.equal(save.flags.flag_premier_craft, true);

fabriquerViaMenu('recipe.pioche');
assert.equal(save.inventaire.items.item_pioche, 1, 'pioche fabriquée');
assert.equal(save.inventaire.items.item_branche, 0);
assert.equal(save.inventaire.items.item_caillou, 0);

// XP créditée par les 2 crafts (rec_hache.xp + rec_pioche.xp, cf.
// data/recipes.json) : niveau doit avoir progressé.
assert.ok(save.hero.xp > 0, 'XP créditée par le craft');
assert.ok(save.hero.niveau >= 2, `niveau doit avoir progressé (actuel : ${save.hero.niveau})`);
assert.equal(save.flags.flag_niveau_2, true);

// --- Récolte réelle : bois (hache) puis pierre (pioche) ---
let cibleBois = null;
let ciblePierre = null;
for (let ty = 0; ty < scene.height && (!cibleBois || !ciblePierre); ty++) {
  for (let tx = 0; tx < scene.width; tx++) {
    const tuile = scene.tuileA(tx, ty);
    if (!tuile) continue;
    if (tuile.ressource === 'res_bois' && !cibleBois) cibleBois = { tx, ty };
    if (tuile.ressource === 'res_pierre' && !ciblePierre) ciblePierre = { tx, ty };
  }
}
assert.ok(cibleBois && ciblePierre, 'les deux types de ressources doivent exister dans la scène');

const hero = orch.obtenirHero();
hero.x = (cibleBois.tx + 0.5) * scene.tileSize;
hero.y = (cibleBois.ty + 0.5) * scene.tileSize + 20;
interagir();
assert.equal(save.inventaire.items.item_bois, 1, 'bois récolté avec la hache');

hero.x = (ciblePierre.tx + 0.5) * scene.tileSize;
hero.y = (ciblePierre.ty + 0.5) * scene.tileSize + 20;
interagir();
assert.equal(save.inventaire.items.item_pierre, 1, 'pierre récoltée avec la pioche');

// --- Cuisine : fruit cuit, mangé au champ (CONSUME) ---
allerA('station_table');
fabriquerViaMenu('recipe.fruit_cuit');
assert.equal(save.inventaire.items.item_fruit_cuit, 1, 'fruit cuit fabriqué');
assert.equal(save.inventaire.items.item_fruit, 0);

const faimAvantRepas = save.survie.jauge_faim;
save.survie.jauge_faim = 0.5; // simule une jauge déjà entamée pour observer la hausse
save.hero.equipement.consommable = 'item_fruit_cuit';
frames.push(etat({ consume: true }));
orch.maj(16);
assert.equal(save.inventaire.items.item_fruit_cuit, 0, 'le fruit cuit est consommé');
assert.ok(save.survie.jauge_faim > 0.5, 'la faim doit remonter après avoir mangé');
assert.ok(Object.keys(save.hero.buffs_actifs).length > 0, 'un buff temporaire doit être actif après le repas');
void faimAvantRepas;

// --- Niveau final : au moins niveau 3 (hache 15 + pioche 15 + fruit cuit
// 10 = 40 xp, cf. data/levels.json niveau_3.xp_cumulee = 40) ---
assert.ok(save.hero.niveau >= 3, `niveau final attendu >= 3 (actuel : ${save.hero.niveau})`);
assert.equal(save.flags.flag_niveau_3, true);

// --- Coffre (Palier E, confort) : déposer le bois, le retirer ---
allerA('station_coffre');
dernieresEntreesCoffre = null;
interagir();
assert.ok(dernieresEntreesCoffre, 'menu.ouvrirCoffre n\'a pas été appelé');
{
  const entreesAvant = dernieresEntreesCoffre();
  const depotBois = entreesAvant.find((e) => e.texte.startsWith(i18n.t('menu.coffre_deposer')) && e.texte.includes(i18n.t('item.bois')));
  assert.ok(depotBois, 'entrée "Déposer : Bois" introuvable');
  depotBois.action();
}
assert.equal(save.inventaire.items.item_bois, 0, 'le bois quitte la poche');
assert.equal(save.coffre.items.item_bois, 1, 'le bois arrive dans le coffre');
{
  const entreesApres = dernieresEntreesCoffre();
  const retraitBois = entreesApres.find((e) => e.texte.startsWith(i18n.t('menu.coffre_retirer')) && e.texte.includes(i18n.t('item.bois')));
  assert.ok(retraitBois, 'entrée "Retirer : Bois" introuvable après dépôt');
  retraitBois.action();
}
assert.equal(save.inventaire.items.item_bois, 1, 'le bois revient dans la poche');
assert.equal(save.coffre.items.item_bois, 0, 'le coffre est de nouveau vide');

// --- Stats (Palier D) : +1 sur la première stat, points libres décrémentés ---
{
  const pointsAvant = save.hero.points_stats_libres;
  assert.ok(pointsAvant > 0, 'des points de stats libres doivent être disponibles après ces niveaux');
  const entrees = orch.obtenirEntreesStats();
  const premiereStat = entrees[0];
  assert.equal(premiereStat.grisee, false);
  const statId = registre.tous('stats')[0].id;
  const pointsAllouesAvant = save.hero.stats.points[statId] || 0;
  premiereStat.action();
  assert.equal(save.hero.points_stats_libres, pointsAvant - 1);
  assert.equal(save.hero.stats.points[statId] || 0, pointsAllouesAvant + 1);
}

console.log('OK test_phase3_boucle');

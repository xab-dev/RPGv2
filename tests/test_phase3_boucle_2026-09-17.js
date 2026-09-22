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
// flag_premier_ramassage posé d'avance : le dialogue de premier ramassage
// (couvert par test_phase2_chemin_critique) ouvrirait une UI qui gèlerait le
// temps actif pendant tout ce bot, sans rapport avec ce qui est prouvé ici.
save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true, flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true };
// `D-120` (22/09) : hache et pioche sont gâtées au Nv.10 et coûtent des
// éclats — c'est le cœur du ralentissement voulu par Xav. Ce bot n'éprouve
// PAS le déblocage (c'est `test_d120_outils_nv10`) : il éprouve la boucle
// « sortir → récolter → revenir → cuisiner/crafter → repartir », qui suppose
// les outils accessibles. On lui donne donc le niveau qu'un joueur aura
// atteint quand il fabriquera sa première hache, et de quoi la payer.
//
// Le niveau va avec son XP : il est RECALCULÉ depuis l'XP totale à chaque
// crédit, donc un niveau posé seul retomberait à 1 au premier craft.
save.hero.niveau = 10;
save.hero.xp = registre.obtenir('levels', 'niveau_10').xp_cumulee;
save.inventaire.eclats = 60;

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
    consume: { pressed: consume, held: consume }, interact: { pressed: interact, held: interact }, menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
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

// Ramasse le premier exemplaire au sol de `itemId` (SD_respawn-items-au-sol
// §"trou du bot" : ce test doit exercer le VRAI chemin de ramassage, pas
// seulement une poche pré-remplie).
function ramasserItem(itemId) {
  const positions = save.monde.items_sol[scene.id][itemId];
  assert.ok(positions && positions.length > 0, `aucun "${itemId}" au sol`);
  const hero = orch.obtenirHero();
  const avant = save.inventaire.items[itemId] || 0;
  hero.x = positions[0].x;
  hero.y = positions[0].y;
  interagir();
  assert.equal(save.inventaire.items[itemId], avant + 1, `"${itemId}" pas ramassé`);
}

// Fait avancer le temps de jeu actif de `ms` en pas de 16ms (même patron que
// le reste du bot), pour laisser courir un respawn différé (Palier B §3.2).
function avancerTempsActif(ms) {
  let t = 0;
  while (t < ms) {
    frames.push(etat());
    orch.maj(16);
    t += 16;
  }
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

// --- Ramassage réel (SD_respawn-items-au-sol §"trou du bot") --------------
// `D-59` a changé ce que cette étape éprouve, et il faut le dire. AVANT, la
// scène posait 2 branches + 2 cailloux : de quoi faire la hache (2 branches
// + 1 caillou) mais pas la pioche (1 branche + 2 cailloux), et la boucle
// passait obligatoirement par un RESPAWN — le chemin que Xav avait signalé
// cassé. Depuis le tirage du jour, le matin pose dix branches et dix
// cailloux, et un objet ramassé ne repousse plus dans la journée : le
// respawn n'est plus sur le chemin critique de la boucle 5 minutes.
//
// Ce qui est éprouvé ici reste donc : ramasser pour de vrai, fabriquer les
// deux outils, et vérifier que la poche compte juste. Le respawn, lui, a
// son propre test (`test_sd_respawn-items-au-sol`), où il est vérifié sur
// l'item qui le déclare — et où un témoin épingle que les autres ne
// repoussent PAS.
const stockBranches = save.monde.items_sol[scene.id].item_branche.length;
const stockCailloux = save.monde.items_sol[scene.id].item_caillou.length;
assert.ok(stockBranches >= 3, `le tirage du jour doit poser de quoi jouer (${stockBranches} branches)`);
assert.ok(stockCailloux >= 3, `le tirage du jour doit poser de quoi jouer (${stockCailloux} cailloux)`);

ramasserItem('item_branche');
ramasserItem('item_branche');
ramasserItem('item_caillou');
ramasserItem('item_caillou');
assert.equal(save.inventaire.items.item_branche, 2, '2 branches ramassées au sol');
assert.equal(save.inventaire.items.item_caillou, 2, '2 cailloux ramassés au sol');
assert.equal(
  save.monde.items_sol[scene.id].item_branche.length, stockBranches - 2,
  'le compte au sol baisse immédiatement',
);

// --- Atelier : hache puis pioche ---
allerA('station_atelier');
fabriquerViaMenu('recipe.hache');
assert.equal(save.inventaire.items.item_hache, 1, 'hache fabriquée');
assert.equal(save.inventaire.items.item_branche, 0, '2 branches consommées sur 2');
assert.equal(save.inventaire.items.item_caillou, 1, '1 caillou consommé sur 2');
assert.equal(save.flags.flag_premier_craft, true);

// La pioche demande 1 branche + 2 cailloux : il faut retourner en ramasser.
ramasserItem('item_branche');
ramasserItem('item_caillou');
assert.equal(save.inventaire.items.item_branche, 1, '1 branche ramassée pour la pioche');
assert.equal(save.inventaire.items.item_caillou, 2, '1 caillou de plus, + 1 déjà en poche');

allerA('station_atelier');
fabriquerViaMenu('recipe.pioche');
assert.equal(save.inventaire.items.item_pioche, 1, 'pioche fabriquée');
assert.equal(save.inventaire.items.item_branche, 0);
assert.equal(save.inventaire.items.item_caillou, 0);

// XP créditée par les 2 crafts (rec_hache.xp + rec_pioche.xp, cf.
// data/recipes.json) : niveau doit avoir progressé.
assert.ok(save.hero.xp > 0, 'XP créditée par le craft');
// `D-120` : le bot part du Nv.10 (voir plus haut), donc ce qui se vérifie ici
// n'est plus « le niveau a franchi 2 » mais « le craft a bien crédité de
// l'XP » — et c'est cela que l'étape voulait dire depuis le début.
const NIVEAU_DEPART = 10;
assert.ok(save.hero.niveau >= NIVEAU_DEPART, `le niveau ne doit pas régresser (actuel : ${save.hero.niveau})`);
assert.ok(save.hero.xp > registre.obtenir('levels', 'niveau_10').xp_cumulee, 'les deux crafts ont crédité de l’XP');

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

// --- Vider ses poches avant de repartir (`D-118`) ---
// Ceci n'est pas un détour de test, c'est la boucle elle-même qui a changé :
// avec quatre slots, hache + pioche + bois + pierre REMPLISSENT la poche, et
// le fruit ne rentre plus. Le rituel « vider ses poches, aller chercher,
// revenir » est voulu (décision de Xav, 22/09) — le bot le joue donc aussi.
allerA('station_coffre');
{
  dernieresEntreesCoffre = null;
  interagir();
  assert.ok(dernieresEntreesCoffre, 'menu.ouvrirCoffre n\'a pas été appelé avant la cuisine');
  // La pierre suffit : un slot libéré, c'est la place du fruit. Le bois reste
  // en poche pour l'étape « Coffre » plus bas, qui l'y dépose et le reprend.
  const depot = dernieresEntreesCoffre().find(
    (e) => e.texte.startsWith(i18n.t('menu.coffre_deposer')) && e.titre === i18n.t(registre.obtenir('items', 'item_pierre').label_key),
  );
  assert.ok(depot, 'entrée "Déposer : Pierre" introuvable');
  depot.action();
  assert.equal(save.inventaire.items.item_pierre, 0, 'la pierre est au coffre, un slot se libère');
}

// --- Cuisine : fruit cuit, mangé au champ (CONSUME) ---
ramasserItem('item_fruit');
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
assert.ok(save.hero.niveau >= NIVEAU_DEPART, `niveau final au moins celui du départ (actuel : ${save.hero.niveau})`);
// Le flag d'un niveau est posé par le FRANCHISSEMENT, pas par le fait d'y
// être : un bot qui démarre au Nv.10 sans l'avoir franchi ne l'a pas, et
// c'est correct. Ce que la boucle doit prouver ici est que l'XP monte, et
// c'est déjà fait plus haut.

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
assert.equal(save.maison.stations.station_coffre.contenu.item_bois, 1, 'le bois arrive dans le coffre');
{
  const entreesApres = dernieresEntreesCoffre();
  const retraitBois = entreesApres.find((e) => e.texte.startsWith(i18n.t('menu.coffre_retirer')) && e.texte.includes(i18n.t('item.bois')));
  assert.ok(retraitBois, 'entrée "Retirer : Bois" introuvable après dépôt');
  retraitBois.action();
}
assert.equal(save.inventaire.items.item_bois, 1, 'le bois revient dans la poche');
assert.equal(save.maison.stations.station_coffre.contenu.item_bois, 0, 'le coffre est de nouveau vide');

// --- Stats (Palier D) : +1 sur la première stat, points libres décrémentés ---
{
  // Les points libres viennent des niveaux FRANCHIS. Le bot part désormais du
  // Nv.10 sans les avoir franchis (`D-120`), donc on lui en donne un : ce que
  // cette étape éprouve est l'écran Stats, pas la comptabilité des niveaux
  // (celle-là a son propre test, `test_phase3_xp`).
  if (save.hero.points_stats_libres === 0) save.hero.points_stats_libres = 1;
  const pointsAvant = save.hero.points_stats_libres;
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

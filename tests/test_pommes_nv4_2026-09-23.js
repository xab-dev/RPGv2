// La pomme d'amour et la pomme cuite (demande de Xav, 23/09 ; passée de l'Atelier à la Cuisine le 24/09, choix de Xav).
//
// DEMANDE : au Nv.4, à la Cuisine, 1 fruit cuit + 1 papyrus (la pomme emballée,
// puis cuite dans son emballage : 24/09, demande de Xav ; avant, 3 herbes) → une pomme
// d'amour, sans éclats. Elle ne se mange pas et ne s'équipe pas : elle doit
// passer une seconde fois à la Cuisine, qui en fait une pomme cuite. C'est la pomme cuite qui
// se mange, et elle donne la régénération de vie (R2).
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`) : les
// nombres vivent dans les catalogues et appartiennent à Xav. Prouvé ici :
//   1. la pomme d'amour n'est ni mangeable ni équipable, la pomme cuite l'est
//      et soigne ;
//   2. les deux recettes, en données : la Cuisine n'annonce pas la pomme
//      cuite avant de savoir faire la pomme d'amour (`D-62`) ;
//   3. sur le vrai orchestrateur : fruit cuit → Cuisine → Cuisine → manger →
//      régénération, et la pomme d'amour refusée à la bouche.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, entreePoche } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const AMOUR = registre.obtenir('items', 'item_pomme_amour');
const CUITE = registre.obtenir('items', 'item_pomme_cuite');
const REC_AMOUR = registre.obtenir('recipes', 'rec_pomme_amour');
const REC_CUITE = registre.obtenir('recipes', 'rec_pomme_cuite');

// --- 1. Ce qui se mange, ce qui s'équipe ---------------------------------
{
  // LA fonction de l'écran Poche, jamais une recopie de sa règle.
  const fiche = (item) => entreePoche(item, 1, {
    equipementHero: saveNeuve().hero.equipement, registre, i18n, peripherique: 'manette',
  });
  assert.equal(fiche(AMOUR).consommable, false, 'la pomme d’amour ne se mange pas');
  assert.equal(fiche(AMOUR).equipement, null, 'ni ne s’équipe');
  assert.equal(fiche(CUITE).consommable, true, 'la pomme cuite se mange');
  assert.ok(fiche(CUITE).equipement, 'et va dans la case consommable, comme le fruit cuit');

  const soins = (CUITE.consommation.effets || [])
    .map((id) => registre.obtenir('status_effects', id))
    .filter((e) => e.famille === 'buff' && e.param === 'pv');
  assert.equal(soins.length, 1, 'la pomme cuite donne un soin sur la durée');
  console.log(`OK la pomme d’amour : ni mangée ni équipée ; la pomme cuite : mangée, ${soins[0].id}`);
}

// --- 2. Les deux recettes, en données -----------------------------------
{
  assert.equal(REC_AMOUR.station, 'station_type_cuisine');
  assert.equal(REC_AMOUR.sortie.item, AMOUR.id);
  assert.ok(REC_AMOUR.entrees.some((e) => e.item === 'item_fruit_cuit'), 'elle part d’un fruit CUIT');
  assert.ok(!REC_AMOUR.cout_eclats, 'sans éclats');
  assert.equal(REC_AMOUR.unique, undefined, 'fabrication illimitée');

  assert.equal(REC_CUITE.station, 'station_type_cuisine');
  assert.equal(REC_CUITE.sortie.item, CUITE.id);
  assert.deepEqual(REC_CUITE.entrees.map((e) => e.item), [AMOUR.id], 'la pomme d’amour, et elle seule');

  // `D-62` : rien n'est annoncé avant l'heure. La Cuisine ne montre pas une
  // recette dont l'ingrédient ne peut pas encore exister.
  assert.equal(REC_AMOUR.visible_si.valeur, 'niveau');
  assert.equal(REC_CUITE.visible_si.valeur, 'niveau');
  assert.ok(REC_CUITE.visible_si.min >= REC_AMOUR.visible_si.min,
    'la pomme cuite n’apparaît pas avant la pomme d’amour');
  console.log(`OK les recettes : toutes deux à la Cuisine, au Nv.${REC_AMOUR.visible_si.min}, sans éclats`);
}

// --- 3. La chaîne entière, sur le vrai orchestrateur --------------------
function demarrer({ niveau, poche }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  // Le niveau va avec son XP : recalculé depuis l'XP totale à chaque crédit.
  save.hero.xp = registre.obtenir('levels', `niveau_${niveau}`).xp_cumulee;
  save.inventaire.items = { ...poche };
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    // Un dialogue gèle le temps actif : lignes d'ambiance et premières
    // interactions déduites du catalogue, jamais recopiées (`Q-42`).
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
    ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])),
  };
  const ouvert = {};
  const b = (v) => ({ pressed: v, held: v });
  let frame = null;
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: (obtenirEntrees) => { ouvert.obtenirEntrees = obtenirEntrees; },
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frame },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  // Se poster contre une station et appuyer INTERACT : rend ses entrées.
  const station = (id) => {
    const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === id);
    orch.obtenirHero().x = empreinte.x - 20;
    orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
    ouvert.obtenirEntrees = null;
    frame = {
      move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
      skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
    };
    orch.maj(16);
    assert.ok(ouvert.obtenirEntrees, `INTERACT à côté de ${id} ouvre l’écran Craft`);
    return ouvert.obtenirEntrees();
  };
  return { save, orch, station };
}

const titre = (r) => i18n.t(r.label_key);
const pocheAmour = Object.fromEntries(REC_AMOUR.entrees.map((e) => [e.item, e.qte]));

{
  const avant = demarrer({ niveau: REC_AMOUR.visible_si.min - 1, poche: { ...pocheAmour, [AMOUR.id]: 1 } });
  assert.ok(!avant.station('station_table').some((e) => e.titre === titre(REC_AMOUR)), 'absente de la Cuisine sous le palier');
  assert.ok(!avant.station('station_table').some((e) => e.titre === titre(REC_CUITE)), 'la pomme cuite non plus');
  console.log(`OK sous le Nv.${REC_AMOUR.visible_si.min} : aucune des deux recettes n’existe`);
}

{
  const jeu = demarrer({ niveau: REC_CUITE.visible_si.min, poche: pocheAmour });
  const items = () => jeu.save.inventaire.items;

  const amour = jeu.station('station_table').find((e) => e.titre === titre(REC_AMOUR));
  assert.ok(amour && amour.grisee === false, 'la Cuisine la propose, fabricable');
  amour.action();
  assert.equal(items()[AMOUR.id], 1, 'une pomme d’amour');
  for (const e of REC_AMOUR.entrees) assert.equal(items()[e.item] || 0, 0, `${e.item} consommé`);

  // Elle ne se mange pas : refusée, et rien ne bouge.
  assert.equal(jeu.orch.consommerItem(AMOUR.id), false, 'la pomme d’amour ne se mange pas');
  assert.equal(items()[AMOUR.id], 1);

  const cuisine = jeu.station('station_table').find((e) => e.titre === titre(REC_CUITE));
  assert.ok(cuisine && cuisine.grisee === false, 'la Cuisine la propose, fabricable');
  cuisine.action();
  assert.equal(items()[CUITE.id], 1, 'une pomme cuite');
  assert.equal(items()[AMOUR.id] || 0, 0, 'la pomme d’amour est consommée');

  assert.equal(jeu.orch.consommerItem(CUITE.id), true, 'la pomme cuite se mange');
  for (const effet of CUITE.consommation.effets) {
    assert.ok(jeu.save.hero.buffs_actifs[effet] > 0, `${effet} est actif`);
  }
  console.log('OK la chaîne : fruit cuit → Cuisine → Cuisine → manger → régénération active');
}

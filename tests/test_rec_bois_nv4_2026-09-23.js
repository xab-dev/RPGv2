// Le bois à l'Atelier, avant la hache (demande de Xav, 23/09) : 5 branches +
// 2 herbes + 1 éclat, au Nv.4.
//
// INTENTION DE XAV, qui sert de critère : un chemin vers le bois AVANT le
// Nv.10, mais qu'on n'a pas envie d'emprunter souvent — chaque éclat dépensé
// ici manquera à l'épée (« punition indirecte »). La hache reste la voie
// normale ; cette recette n'est qu'un avant-goût.
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`) : les nombres
// vivent dans `data/recipes.json` et appartiennent à Xav. Le test vérifie que
// la recette passe par le mécanisme générique (`visible_si`, `cout_eclats`),
// qu'elle s'ouvre AVANT les outils, qu'elle ne demande aucun outil, et
// qu'elle fabrique réellement du bois sur le vrai orchestrateur.
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

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const BOIS = registre.obtenir('recipes', 'rec_bois');
const HACHE = registre.obtenir('recipes', 'rec_hache');

// --- 1. La recette, en données, par le mécanisme générique ----------------
{
  assert.equal(BOIS.station, 'station_type_atelier', 'à l’Atelier');
  assert.equal(BOIS.sortie.item, 'item_bois', 'elle produit le bois que la hache récolte');
  assert.equal(BOIS.visible_si.valeur, 'niveau', 'débloquée par le NIVEAU, pas par un flag dédié');
  // Relation, jamais chiffre : c'est l'avant-goût du bois, donc AVANT la hache.
  assert.ok(BOIS.visible_si.min < HACHE.visible_si.min, 'elle s’ouvre avant les outils');
  // Le coût en éclats est ce qui la rend chère à répéter (l'épée les attend).
  assert.ok(BOIS.cout_eclats > 0, 'elle coûte des éclats');
  // Aucun outil en entrée : sinon ce ne serait pas un chemin AVANT la hache.
  for (const e of BOIS.entrees) {
    const item = registre.obtenir('items', e.item);
    assert.notEqual(item.categorie, 'outil', `${e.item} : aucun outil ne doit être requis`);
  }
  console.log(`OK rec_bois : à l’Atelier, au Nv.${BOIS.visible_si.min} (avant les outils), sans outil, avec un coût en éclats`);
}

// --- 2. Sur le vrai jeu : absente avant, fabricable au palier -------------
function monter({ niveau, poche = {}, eclats = 0 }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.hero.niveau = niveau;
  // Le niveau va avec son XP : il est recalculé depuis l'XP totale à chaque
  // crédit, donc un niveau posé seul retomberait au premier craft.
  save.hero.xp = registre.obtenir('levels', `niveau_${niveau}`).xp_cumulee;
  save.inventaire.items = { ...poche };
  save.inventaire.eclats = eclats;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    // Un dialogue gèle le temps actif : lignes d'ambiance et premières
    // interactions déduites du catalogue, jamais recopiées (`Q-42`).
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
    ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])),
  };
  const ouvert = {};
  const frames = [];
  let i = 0;
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: (obtenirEntrees) => { ouvert.obtenirEntrees = obtenirEntrees; },
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {},
      rafraichirStats: () => {},
    },
    input: { maj: () => frames[Math.min(i += 1, frames.length) - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const b = (v) => ({ pressed: v, held: v });
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  frames.push({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
  });
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l’atelier ouvre l’écran Craft');
  return { save, entrees: () => ouvert.obtenirEntrees() };
}

const pocheComplete = Object.fromEntries(BOIS.entrees.map((e) => [e.item, e.qte]));
const titre = i18n.t(BOIS.label_key);

{
  const avant = monter({ niveau: BOIS.visible_si.min - 1, poche: pocheComplete, eclats: 99 });
  assert.ok(!avant.entrees().some((e) => e.titre === titre), 'absente sous le palier (`D-62`), jamais grisée');
  console.log(`OK sous le Nv.${BOIS.visible_si.min} : la recette n’existe pas à l’Atelier`);
}

{
  const palier = monter({ niveau: BOIS.visible_si.min, poche: pocheComplete, eclats: BOIS.cout_eclats });
  const entree = palier.entrees().find((e) => e.titre === titre);
  assert.ok(entree, 'présente au palier');
  assert.equal(entree.grisee, false, 'fabricable avec la poche et les éclats exacts');
  assert.equal(palier.save.inventaire.items.item_hache || 0, 0, 'et SANS hache');
  entree.action();
  assert.equal(palier.save.inventaire.items.item_bois, BOIS.sortie.qte, 'le bois est fabriqué');
  assert.equal(palier.save.inventaire.eclats, 0, 'les éclats sont payés');
  for (const e of BOIS.entrees) {
    assert.equal(palier.save.inventaire.items[e.item] || 0, 0, `${e.item} est consommé`);
  }
  console.log(`OK au Nv.${BOIS.visible_si.min} : le bois se fabrique sans hache, et coûte ses éclats`);
}

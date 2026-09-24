// Le tri de l'écran Craft (demande de Xav, 24/09) : par TYPE, dans l'ordre
// du catalogue `recipe_categories`, puis par COÛT TOTAL croissant
// (ingrédients à l'unité + éclats), le nom départageant les égalités.
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`) : aucun ordre
// de recettes n'est recopié ici. Prouvé :
//   1. la règle, sur des recettes fabriquées pour elle : le type l'emporte
//      sur le coût, le coût sur le nom, et les éclats comptent ;
//   2. l'entrée d'un type nouveau se range là où le catalogue la place, sans
//      une ligne de code (règle d'architecture directrice) ;
//   3. sur le vrai orchestrateur, l'Atelier et la Cuisine suivent la règle,
//      toutes recettes visibles ;
//   4. le catalogue réel : tout type de recette déclaré, et chaque type ne
//      l'est qu'une fois (l'ordre ne peut pas être ambigu).
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
import { trierRecettes, coutTotalRecette } from '../src/recipes.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// --- 1. La règle ---------------------------------------------------------
const r = (id, categorie, entrees, cout_eclats) => ({
  id, categorie, entrees: entrees.map((qte) => ({ item: 'x', qte })), ...(cout_eclats ? { cout_eclats } : {}),
});
const parId = (liste) => liste.map((x) => x.id);
{
  const ordre = ['cat_a', 'cat_b'];
  const recettes = [
    r('b_bon_marche', 'cat_b', [1]),
    r('a_chere', 'cat_a', [5, 5]),
    r('a_zeta', 'cat_a', [2]),
    r('a_alpha', 'cat_a', [1, 1]),
    r('a_eclats', 'cat_a', [1], 3),
  ];
  assert.equal(coutTotalRecette(recettes[4]), 4, 'les éclats comptent dans le coût');
  assert.deepEqual(
    parId(trierRecettes(recettes, ordre, (x) => x.id)),
    ['a_alpha', 'a_zeta', 'a_eclats', 'a_chere', 'b_bon_marche'],
    'type, puis coût, puis nom',
  );
  assert.equal(recettes[0].id, 'b_bon_marche', 'la liste reçue n’est pas mutée');

  // --- 2. Un type nouveau se place par le catalogue seul -----------------
  assert.deepEqual(
    parId(trierRecettes(recettes, ['cat_b', 'cat_a'], (x) => x.id))[0],
    'b_bon_marche',
    'inverser le catalogue inverse les types',
  );
  console.log('OK la règle : type, coût (éclats compris), nom ; l’ordre des types vient du catalogue');
}

// --- 3. Le vrai jeu --------------------------------------------------------
const ORDRE = registre.tous('recipe_categories').map((c) => c.id);
function verifierOrdre(liste, station) {
  const recettes = liste.map((e) => registre.tous('recipes')
    .find((x) => x.station === station && i18n.t(x.label_key) === e.titre));
  assert.ok(recettes.every(Boolean), 'chaque tuile est une recette de la station');
  for (let i = 1; i < recettes.length; i += 1) {
    const [a, b] = [recettes[i - 1], recettes[i]];
    const [ra, rb] = [ORDRE.indexOf(a.categorie), ORDRE.indexOf(b.categorie)];
    assert.ok(ra <= rb, `${a.id} (${a.categorie}) avant ${b.id} (${b.categorie})`);
    if (ra === rb) {
      assert.ok(coutTotalRecette(a) <= coutTotalRecette(b), `${a.id} coûte moins que ${b.id}`);
      if (coutTotalRecette(a) === coutTotalRecette(b)) {
        assert.ok(i18n.t(a.label_key).localeCompare(i18n.t(b.label_key)) <= 0, `${a.id} avant ${b.id} par le nom`);
      }
    }
  }
  return recettes;
}

function ecranCraft(idStation) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  // Assez haut pour que toute recette à palier de niveau soit visible ; la
  // besace, elle, attend en plus de ne pas être portée — elle ne l'est pas.
  const niveauMax = Math.max(...registre.tous('levels').map((n) => n.niveau));
  save.hero.niveau = niveauMax;
  save.hero.xp = registre.obtenir('levels', `niveau_${niveauMax}`).xp_cumulee;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
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
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === idStation);
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  frame = {
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
  };
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, `INTERACT à côté de ${idStation} ouvre l’écran Craft`);
  return ouvert.obtenirEntrees();
}

for (const [idPuzzle, typeStation] of [['station_atelier', 'station_type_atelier'], ['station_table', 'station_type_cuisine']]) {
  const liste = ecranCraft(idPuzzle);
  const recettes = verifierOrdre(liste, typeStation);
  assert.equal(recettes.length, registre.tous('recipes').filter((x) => x.station === typeStation).length,
    `${typeStation} : toutes ses recettes sont là`);
  console.log(`OK ${typeStation} : ${recettes.map((x) => `${x.id.replace('rec_', '')}(${coutTotalRecette(x)})`).join(' → ')}`);
}

// --- 4. Le catalogue réel --------------------------------------------------
{
  assert.equal(new Set(ORDRE).size, ORDRE.length, 'chaque type est déclaré une fois');
  for (const recette of registre.tous('recipes')) {
    assert.ok(ORDRE.includes(recette.categorie), `${recette.id} : type déclaré`);
  }
  console.log(`OK le catalogue : ${ORDRE.join(' → ')}`);
}

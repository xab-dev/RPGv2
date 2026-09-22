// `D-122` (T6) : une recette qui ne se fabrique pas DIT pourquoi.
//
// Le défaut que Xav a relevé le 22/09 : une tuile de Craft pouvait ne rien
// faire à l'action, sans indication — la pioche déjà possédée s'affichait
// « 1/1 » et l'appui restait muet.
//
// La règle du 21/09 ne bouge pas (`Q-39` ⑥) : **grisé est un indice, jamais un
// verrou**. L'action réelle est toujours tentée, le résultat fait foi. Ce qui
// change est qu'on peut enfin écrire la raison, avec son détail.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { peutFabriquer, fabriquer } from '../src/recipes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

const flagsOuverts = { evaluate: () => true };
const HACHE = registre.obtenir('recipes', 'rec_hache');
const CUISINE = registre.obtenir('recipes', 'rec_fruit_cuit');
const pocheComplete = (r) => Object.fromEntries(r.entrees.map((e) => [e.item, e.qte]));

// --- 1. Chacune des quatre raisons, avec son détail -----------------------
{
  // (a) déjà possédé — la raison qui manquait, et celle qui explique le « 1/1 ».
  const dejaEnPoche = { ...pocheComplete(HACHE), [HACHE.sortie.item]: 1 };
  const a = peutFabriquer(HACHE, dejaEnPoche, flagsOuverts, {}, 0, 99);
  assert.equal(a.raison, 'deja_possede');
  assert.equal(a.detail.item, HACHE.sortie.item);

  // (b) ingrédient manquant : LEQUEL, et COMBIEN.
  const premier = HACHE.entrees[0];
  const pocheIncomplete = { ...pocheComplete(HACHE), [premier.item]: premier.qte - 1 };
  const b = peutFabriquer(HACHE, pocheIncomplete, flagsOuverts, {}, 0, 99);
  assert.equal(b.raison, 'ingredients');
  assert.deepEqual(b.detail, { item: premier.item, manque: 1 });

  // (c) éclats : combien il en manque, pas seulement qu'il en manque.
  const c = peutFabriquer(HACHE, pocheComplete(HACHE), flagsOuverts, {}, 0, HACHE.cout_eclats - 3);
  assert.equal(c.raison, 'eclats');
  assert.deepEqual(c.detail, { manque: 3 });

  // (d) poche pleine : connue AVANT d'agir, dès que l'appelant sait calculer
  // le plafond. Sans plafond fourni, le verdict est celui d'avant ce ticket.
  const d = peutFabriquer(CUISINE, pocheComplete(CUISINE), flagsOuverts, {}, 0, 0, () => 0);
  assert.equal(d.raison, 'poche_pleine');
  const sansPlafond = peutFabriquer(CUISINE, pocheComplete(CUISINE), flagsOuverts, {}, 0, 0);
  assert.equal(sansPlafond.ok, true, 'sans plafond fourni, la place en poche n’est pas jugée');
  console.log('OK les quatre raisons, chacune avec le détail que seule cette fonction connaît');
}

// --- 2. Le plafond se mesure APRÈS le retrait des ingrédients -------------
// Cuire son dernier fruit dans une poche pleine LIBÈRE le slot du fruit : le
// refuser serait faux, et c'est exactement ce qu'une mesure sur la poche
// d'avant produirait. Le témoin est la seconde ligne.
{
  const poche = pocheComplete(CUISINE);
  const apresRetrait = (p) => (Object.values(p).some((q) => q > 0) ? 0 : 1);
  const verdict = peutFabriquer(CUISINE, poche, flagsOuverts, {}, 0, 0, apresRetrait);
  assert.equal(verdict.ok, true, 'la place libérée par les ingrédients compte');
  const sansRetrait = apresRetrait(poche);
  assert.equal(sansRetrait, 0, 'témoin : mesurée sur la poche d’AVANT, il n’y aurait pas la place');
  console.log('OK le plafond se mesure sur la poche d’après le retrait — une seule règle, dans le verdict');
}

// --- 3. `fabriquer` ne refait pas la règle : il suit le verdict -----------
// C'est le point d'architecture du ticket. Avant, la place en poche était
// jugée DEUX fois — une pour griser, une pour agir — et rien ne garantissait
// qu'elles disent la même chose.
{
  const poche = pocheComplete(CUISINE);
  const plafondNul = () => 0;
  const verdict = peutFabriquer(CUISINE, poche, flagsOuverts, {}, 0, 0, plafondNul);
  const resultat = fabriquer(CUISINE, {
    poche, flags: flagsOuverts, cooldowns: {}, heureMs: 0, plafondSortie: plafondNul, eclats: 0,
  });
  assert.equal(resultat.ok, verdict.ok, 'ce qui est grisé et ce qui échoue disent la même chose');
  assert.equal(resultat.raison, verdict.raison);
  assert.deepEqual(resultat.poche, poche, 'et rien n’a été consommé');
  console.log('OK `fabriquer` suit le verdict : une seule règle, impossible à faire diverger');
}

// --- 4. `unique` vit en données, et ne concerne que les objets ------------
{
  const uniques = registre.tous('recipes').filter((r) => r.unique);
  assert.ok(uniques.length > 0, 'les outils et l’arme doivent être uniques');
  for (const r of uniques) {
    assert.ok(r.sortie.item, `${r.id} : "unique" n'a de sens que pour une recette d'objet`);
    const itemDef = registre.obtenir('items', r.sortie.item);
    // Cohérence avec `D-118` : un objet dont on ne fabrique qu'un exemplaire
    // est aussi un objet qui ne s'empile pas. Les deux disent la même chose,
    // chacune à sa place — et si elles divergeaient, la tuile afficherait
    // « déjà possédé » sur un objet qu'on peut empiler.
    assert.equal(itemDef.pile_max, 1, `${itemDef.id} : une recette unique produit un objet qui ne s’empile pas`);
  }
  // Et une recette NON unique se refabrique tant qu'il y a la place : le
  // témoin de la règle.
  assert.equal(CUISINE.unique, undefined);
  const dejaCuit = { ...pocheComplete(CUISINE), [CUISINE.sortie.item]: 1 };
  assert.equal(peutFabriquer(CUISINE, dejaCuit, flagsOuverts, {}, 0, 0).ok, true);
  console.log('OK `unique` est en données, réservé aux objets, et cohérent avec leur pile');
}

// --- 5. Les quatre phrases existent, en FR et en EN -----------------------
{
  const cles = [
    'menu.fiche.deja_possede', 'menu.fiche.ingredient_manquant',
    'menu.fiche.eclats_manquants_n', 'menu.fiche.poche_pleine', 'menu.craft_deja_possede',
  ];
  for (const langue of Object.keys(dictionnaires)) {
    const i18n = creerI18n(dictionnaires, langue);
    for (const cle of cles) {
      assert.notEqual(i18n.t(cle), cle, `${cle} manque en ${langue}`);
    }
    // Les deux gabarits à trou doivent substituer, sinon la phrase sortirait
    // avec ses accolades — le défaut que `D-48` a déjà coûté une fois.
    assert.ok(!i18n.t('menu.fiche.ingredient_manquant', { n: 3, item: 'Branche' }).includes('{'));
    assert.ok(!i18n.t('menu.fiche.eclats_manquants_n', { n: 8 }).includes('{'));
  }
  console.log('OK les phrases du refus existent dans les deux langues, marqueurs substitués');
}

console.log('OK test_d122_raison_du_refus');

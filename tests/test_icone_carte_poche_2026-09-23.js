// L'icône de la carte Poche suit l'équipement porté (Xav, 23/09, `Q-127`) :
// l'icône de poche jusqu'à la besace, celle de la besace ensuite. « Le sac
// arrivera plus tard, ces travaux nous resserviront » : la règle est donc
// générale (`icones_si` sur n'importe quelle carte), et c'est elle qu'on
// éprouve — jamais un id de visuel épinglé (`D-52`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { iconeCarte } from '../src/menu_cartes.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);

// --- 1. La règle : la première variante qui tient, sinon la base ----------
{
  const carte = {
    icone: 'base',
    icones_si: [{ condition: 'flag_sac', icone: 'sac' }, { condition: 'flag_besace', icone: 'besace' }],
  };
  const avec = (...poses) => (c) => poses.includes(c);
  assert.equal(iconeCarte(carte, avec()), 'base', 'rien de porté : l’icône de base');
  assert.equal(iconeCarte(carte, avec('flag_besace')), 'besace');
  assert.equal(iconeCarte(carte, avec('flag_besace', 'flag_sac')), 'sac', 'la première de la liste passe devant');
  assert.equal(iconeCarte({ icone: 'seule' }, avec('flag_besace')), 'seule', 'une carte sans variantes ne bouge pas');
  console.log('OK la règle : base, puis la première variante dont la condition tient');
}

// --- 2. Le catalogue réel : la carte Poche et la besace -------------------
{
  const cartePoche = donnees.menus.flatMap((m) => m.cartes).find((c) => c.cible === 'ecran_poche');
  const flagBesace = donnees.recipes.find((r) => r.id === 'rec_besace').sortie.flag;
  const sansBesace = iconeCarte(cartePoche, () => false);
  const avecBesace = iconeCarte(cartePoche, (c) => c === flagBesace);
  assert.equal(sansBesace, cartePoche.icone, 'l’icône de poche jusqu’au craft');
  assert.notEqual(avecBesace, sansBesace, 'la besace portée change l’icône');
  // Même famille que les autres icônes du menu : une silhouette teintable,
  // jamais le dessin en couleur de l'objet (il jurerait dans la grille).
  const visuel = donnees.visuels.find((v) => v.id === avecBesace);
  assert.equal(visuel.teintable, true, 'une silhouette de menu, teintable comme ses voisines');
  console.log(`OK la carte Poche : ${sansBesace} → ${avecBesace} quand la besace est portée`);
}

// --- 3. Le démarrage refuse une variante mal déclarée ---------------------
{
  const refuse = (modifier, motif) => {
    const copie = JSON.parse(JSON.stringify(donnees));
    modifier(copie.menus.flatMap((m) => m.cartes).find((c) => c.cible === 'ecran_poche'));
    const errs = validerCatalogues(copie);
    assert.ok(errs.some((e) => motif.test(e)), `attendu ${motif} : ${errs.join(' | ')}`);
  };
  refuse((c) => { c.icones_si[0].icone = 'visuel_inconnu'; }, /icones_si\[0\] > icone "visuel_inconnu"/);
  refuse((c) => { c.icones_si[0].condition = 'flag_inconnu'; }, /flag_inconnu/);
  refuse((c) => { delete c.icones_si[0].condition; }, /condition requise/);
  console.log('OK le démarrage refuse : icône inconnue, flag inconnu, condition absente');
}

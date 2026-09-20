// specs/08_menus-cartes.md, palier C4 — le Coffre en « maître-détail », et `D-45`.
// Ce que fournit le VRAI orchestrateur : deux groupes (la poche à déposer, le
// coffre à retirer), une tuile par objet, la même fiche que la Poche, la raison
// d'un refus probable — et surtout : un transfert vers une pile pleine ne fait
// plus DISPARAÎTRE l'objet (`D-45`, constaté en réécrivant ces entrées).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, lignesFicheItem } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const typeCoffre = registre.tous('stations').find((s) => s.role === 'stockage');
const bois = registre.obtenir('items', 'item_bois');

// Un orchestrateur posé à côté du coffre ; le menu factice garde ce qu'on lui ouvre.
function monter({ poche, coffre, registre: registreDuBanc = registre }) {
  const registre = registreDuBanc;
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true };
  save.inventaire.items = { ...poche };
  save.coffre.items = { ...coffre };
  const ouvert = {};
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
    ouvrirCraft: () => {}, rafraichirCraft: () => {}, rafraichirCoffre: () => {},
    ouvrirCoffre: (obtenirEntrees, titre, options) => Object.assign(ouvert, { obtenirEntrees, titre, options }),
  };
  const frames = [];
  let i = 0;
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => frames[Math.min(i++, frames.length - 1)] }, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_coffre');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  const b = (v) => ({ pressed: v, held: v });
  frames.push({ move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false), skill_3: b(false), consume: b(false), interact: b(true), menu: b(false) });
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté du coffre ouvre l’écran Coffre');
  return { save, ouvert, entrees: () => ouvert.obtenirEntrees() };
}

// --- 1. Deux groupes, une tuile par objet, la fiche de la Poche -----------------------
{
  const { ouvert, entrees } = monter({ poche: { item_bois: 3, item_fruit: 1 }, coffre: { item_pierre: 4 } });
  assert.equal(ouvert.titre, i18n.t(typeCoffre.label_key));
  const liste = entrees();
  assert.deepEqual(liste.map((e) => [e.groupe, e.titre, e.quantite, e.libelleAction]), [
    [i18n.t('menu.poche'), 'Bois', 3, i18n.t('menu.coffre_deposer')],
    [i18n.t('menu.poche'), 'Fruit', 1, i18n.t('menu.coffre_deposer')],
    [i18n.t(typeCoffre.label_key), 'Pierre', 4, i18n.t('menu.coffre_retirer')],
  ], 'la poche d’abord (on dépose), le coffre ensuite (on retire)');
  assert.deepEqual(liste[1].lignes, lignesFicheItem(registre.obtenir('items', 'item_fruit'), registre, i18n), 'la même fiche que dans la Poche');
  assert.ok(liste.every((e) => e.icone && e.grisee === false));
  assert.equal(ouvert.options.sousTitre(), i18n.t('menu.fiche.coffre_piles', { n: 1, max: typeCoffre.capacite }), 'le sous-titre dit la capacité');
  console.log('OK Coffre : deux groupes, une tuile par objet, la fiche de la Poche, la capacité en sous-titre');
}

// --- 2. Un transfert déplace UNE unité ; le sous-titre suit ------------------------------
{
  const { save, ouvert, entrees } = monter({ poche: { item_bois: 2 }, coffre: {} });
  entrees()[0].action();
  assert.deepEqual([save.inventaire.items.item_bois, save.coffre.items.item_bois], [1, 1]);
  assert.match(ouvert.options.sousTitre(), /1 \//);
  entrees().find((e) => e.libelleAction === i18n.t('menu.coffre_retirer')).action();
  assert.deepEqual([save.inventaire.items.item_bois, save.coffre.items.item_bois], [2, 0]);
  console.log('OK Coffre : déposer puis retirer, une unité à la fois');
}

// --- 3. `D-45` : une pile pleine ne mange plus l'objet ------------------------------------
{
  // La pile du COFFRE est pleine : déposer est refusé, et rien ne disparaît.
  const a = monter({ poche: { item_bois: 2 }, coffre: { item_bois: bois.stack_max } });
  const depot = a.entrees()[0];
  assert.equal(depot.grisee, true);
  assert.ok(depot.lignes.includes(i18n.t('menu.fiche.pile_pleine')), 'la fiche dit pourquoi');
  depot.action();
  assert.deepEqual([a.save.inventaire.items.item_bois, a.save.coffre.items.item_bois], [2, bois.stack_max],
    'avant le correctif : 1 et stack_max — une unité de bois s’évaporait');

  // La pile de la POCHE est pleine : retirer est refusé de même.
  const b = monter({ poche: { item_bois: bois.stack_max }, coffre: { item_bois: 5 } });
  const retrait = b.entrees().find((e) => e.libelleAction === i18n.t('menu.coffre_retirer'));
  assert.equal(retrait.grisee, true);
  retrait.action();
  assert.deepEqual([b.save.inventaire.items.item_bois, b.save.coffre.items.item_bois], [bois.stack_max, 5]);
  console.log('OK D-45 : vers une pile pleine, rien ne bouge et rien ne disparaît — dans les deux sens');
}

// --- 4. Coffre plein (nombre de piles) : un NOUVEL objet est refusé, un connu passe --------
{
  // Le vrai coffre a plus de piles que le jeu n'a d'objets : pour le remplir,
  // le même catalogue avec une capacité de 2 — une DONNÉE, le code ne change pas.
  const capacite = 2;
  const petit = construireRegistre({ ...donnees, stations: donnees.stations.map((st) => (st.role === 'stockage' ? { ...st, capacite } : st)) });
  const tous = registre.tous('items').map((it) => it.id);
  const remplissage = Object.fromEntries(tous.slice(0, capacite).map((id) => [id, 1]));
  const nouveau = tous[capacite];
  const connu = tous[0];
  const { save, entrees } = monter({ poche: { [nouveau]: 1, [connu]: 1 }, coffre: remplissage, registre: petit });
  const parTitre = (id) => entrees().find((e) => e.groupe === i18n.t('menu.poche') && e.titre === i18n.t(registre.obtenir('items', id).label_key));
  assert.equal(parTitre(nouveau).grisee, true);
  assert.ok(parTitre(nouveau).lignes.includes(i18n.t('menu.fiche.coffre_plein')));
  parTitre(nouveau).action();
  assert.equal(save.inventaire.items[nouveau], 1, 'coffre plein : l’objet reste en poche');
  assert.equal(parTitre(connu).grisee, false, 'un objet DÉJÀ au coffre n’ouvre pas de pile : il passe');
  parTitre(connu).action();
  assert.deepEqual([save.inventaire.items[connu], save.coffre.items[connu]], [0, 2]);
  console.log('OK Coffre plein : refus d’une nouvelle pile, jamais d’un objet déjà présent');
}

console.log('OK test_d43_c4_coffre_fiches');

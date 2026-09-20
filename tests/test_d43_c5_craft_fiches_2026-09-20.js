// specs/08_menus-cartes.md, palier C5 — Craft en « maître-détail ».
// Ce que fournit le VRAI orchestrateur à l'écran, pour chaque recette connue de
// la station : la tuile de l'objet PRODUIT, une fiche qui dit ce que la recette
// demande (et ce qu'on a en poche), ce qu'elle donne, et la raison d'un refus
// probable — le tout lu dans `recipes.json` / `items.json`, rien par recette.
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

function monter({ poche }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true };
  save.inventaire.items = { ...poche };
  const ouvert = {};
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
    ouvrirCoffre: () => {}, rafraichirCraft: () => {}, rafraichirCoffre: () => {},
    ouvrirCraft: (obtenirEntrees, titre, options) => Object.assign(ouvert, { obtenirEntrees, titre, options }),
  };
  const frames = [];
  let i = 0;
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => frames[Math.min(i++, frames.length - 1)] }, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  const b = (v) => ({ pressed: v, held: v });
  frames.push({ move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false), skill_3: b(false), consume: b(false), interact: b(true), menu: b(false) });
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l’atelier ouvre l’écran Craft');
  return { save, ouvert, entrees: () => ouvert.obtenirEntrees() };
}

const recetteHache = registre.obtenir('recipes', 'rec_hache');
const hache = registre.obtenir('items', recetteHache.sortie.item);
const nom = (idItem) => i18n.t(registre.obtenir('items', idItem).label_key);

// --- 1. Une tuile par recette connue ; la fiche vient des données --------------------
{
  const { ouvert, entrees } = monter({ poche: { item_branche: 6, item_caillou: 1 } });
  assert.equal(ouvert.options.texteVide, i18n.t('menu.fiche.aucune_recette'));
  const liste = entrees();
  assert.ok(liste.length >= 2, 'l’atelier connaît au moins la hache et la pioche');
  const e = liste.find((x) => x.titre === i18n.t(recetteHache.label_key));
  assert.ok(e, 'la recette de la hache est listée');
  assert.equal(e.icone, hache.render.visuel, 'la tuile montre l’objet PRODUIT');
  assert.equal(e.libelleAction, i18n.t('menu.fiche.fabriquer'));
  assert.equal(e.grisee, false, 'ingrédients réunis : pas grisée');
  assert.deepEqual(e.lignes, [
    ...recetteHache.entrees.map((x) => i18n.t('menu.fiche.ingredient', { item: nom(x.item), n: x.qte, possede: { item_branche: 6, item_caillou: 1 }[x.item] })),
    i18n.t('menu.fiche.donne', { item: nom(hache.id), n: recetteHache.sortie.qte }),
    ...lignesFicheItem(hache, registre, i18n),
  ], 'ce qu’elle demande (et ce qu’on a), ce qu’elle donne, puis la fiche de l’objet produit');
  assert.ok(liste.every((x) => x.lignes.every((l) => !l.includes('[[') && !l.includes('{'))), 'aucune clé manquante, aucun marqueur non substitué');

  // La pioche demande 2 cailloux : on n'en a qu'un.
  const pioche = liste.find((x) => x.titre === i18n.t('recipe.pioche'));
  assert.equal(pioche.grisee, true);
  assert.equal(pioche.lignes.at(-1), i18n.t('menu.fiche.ingredients_manquants'), 'la fiche dit pourquoi');
  console.log('OK Craft : une tuile par recette connue ; la fiche dit ce qu’il faut, ce qu’on a, ce que ça donne, et pourquoi non');
}

// --- 2. Fabriquer : la poche bouge, la fiche se relit, le délai s'annonce -------------------
{
  const { save, entrees } = monter({ poche: { item_branche: 6, item_caillou: 3 } });
  const avant = entrees().find((x) => x.titre === i18n.t(recetteHache.label_key));
  avant.action();
  assert.equal(save.inventaire.items[hache.id], 1, 'la hache est fabriquée');
  const apres = entrees().find((x) => x.titre === i18n.t(recetteHache.label_key));
  assert.equal(apres.lignes[0], i18n.t('menu.fiche.ingredient', { item: nom('item_branche'), n: 2, possede: 4 }), 'ce qu’on a en poche est relu');
  assert.equal(apres.grisee, true, 'la recette vient de servir : en recharge');
  assert.match(apres.lignes.at(-1), new RegExp(`^${i18n.t('menu.fiche.recharge', { n: 'X' }).replace('X', '\\d+')}$`), 'et la fiche dit dans combien de temps');
  // Grisée = un indice : l'action réelle est retentée, et ne donne rien.
  apres.action();
  assert.equal(save.inventaire.items[hache.id], 1, 'pendant la recharge, retenter ne fabrique rien : le résultat fait foi');
  console.log('OK Craft : fabriquer met à jour la poche et la fiche ; la recharge s’annonce, et tient');
}

console.log('OK test_d43_c5_craft_fiches');

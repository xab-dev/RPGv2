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
// `D-103` : une ligne de fiche peut porter une icône. On la lit par la
// fonction de la VUE elle-même, jamais en redéfinissant sa forme ici — un
// harnais qui réimplémente ce qu'il éprouve est exactement ce qui a laissé
// passer `D-72`.
import { normaliserLigneFiche } from '../src/ui/ecran_fiches.js';

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
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true, ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])) };
  save.inventaire.items = { ...poche };
  // `D-120` (22/09) : hache et pioche sont désormais gâtées au Nv.10 et
  // coûtent des éclats. Cet écran-ci n'éprouve pas le déblocage (c'est
  // `test_d62_anti_spoil` et `test_d120_outils_nv10`) mais la FICHE — il lui
  // faut donc un héros qui y a droit, sinon il n'y a plus rien à lister.
  save.hero.niveau = 10;
  // ET l'XP qui va avec : le niveau est RECALCULÉ depuis l'XP totale à chaque
  // crédit. Un niveau posé à la main sans son XP retombe à 1 au premier
  // craft, et les recettes gâtées disparaissent en plein test.
  save.hero.xp = registre.obtenir('levels', 'niveau_10').xp_cumulee;
  save.inventaire.eclats = 50;
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
  frames.push({ move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false), skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false) });
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l’atelier ouvre l’écran Craft');
  return { save, ouvert, entrees: () => ouvert.obtenirEntrees() };
}

const recetteHache = registre.obtenir('recipes', 'rec_hache');
const hache = registre.obtenir('items', recetteHache.sortie.item);
const nom = (idItem) => i18n.t(registre.obtenir('items', idItem).label_key);

// --- 1. Une tuile par recette connue ; la fiche vient des données --------------------
{
  const { save, ouvert, entrees } = monter({ poche: { item_branche: 6, item_caillou: 1 } });
  assert.equal(ouvert.options.texteVide, i18n.t('menu.fiche.aucune_recette'));
  const liste = entrees();
  assert.ok(liste.length >= 2, 'l’atelier connaît au moins la hache et la pioche');
  const e = liste.find((x) => x.titre === i18n.t(recetteHache.label_key));
  assert.ok(e, 'la recette de la hache est listée');
  assert.equal(e.icone, hache.render.visuel, 'la tuile montre l’objet PRODUIT');
  assert.equal(e.libelleAction, i18n.t('menu.fiche.fabriquer'));
  assert.equal(e.grisee, false, 'ingrédients réunis : pas grisée');
  assert.deepEqual(e.lignes.map(normaliserLigneFiche), [
    // `D-103` : l'ingrédient MONTRE ce dont il parle. La silhouette est lue
    // sur l'item, comme celle de sa tuile dans la Poche — jamais choisie ici.
    ...recetteHache.entrees.map((x) => ({
      texte: i18n.t('menu.fiche.ingredient', { item: nom(x.item), n: x.qte, possede: { item_branche: 6, item_caillou: 1 }[x.item] }),
      icone: registre.obtenir('items', x.item).render.visuel,
    })),
    // `D-120` : la hache coûte désormais des éclats. La ligne est lue sur la
    // RECETTE, pas recopiée : le jour où le coût bouge, ce test suit. Et
    // depuis `D-103` elle porte la silhouette de la MONNAIE, qui vient de
    // `monnaies.json` et de nulle part ailleurs.
    ...(recetteHache.cout_eclats
      ? [{
        texte: i18n.t('menu.fiche.cout_eclats', { n: recetteHache.cout_eclats, possede: save.inventaire.eclats }),
        icone: registre.obtenir('monnaies', 'monnaie_eclats').icone,
      }]
      : []),
    { texte: i18n.t('menu.fiche.donne', { item: nom(hache.id), n: recetteHache.sortie.qte }), icone: null },
    // 24/09 (Xav) : l'XP de la recette se dit, lue sur la RECETTE.
    ...(recetteHache.xp > 0 ? [{ texte: i18n.t('menu.fiche.rapporte_xp', { n: recetteHache.xp }), icone: null }] : []),
    ...lignesFicheItem(hache, registre, i18n).map((l) => ({ texte: l, icone: null })),
  ], 'ce qu’elle demande (et ce qu’on a), ce qu’elle donne, ce qu’elle rapporte, puis la fiche de l’objet produit');
  assert.ok(
    liste.every((x) => x.lignes.map(normaliserLigneFiche).every((l) => !l.texte.includes('[[') && !l.texte.includes('{'))),
    'aucune clé manquante, aucun marqueur non substitué',
  );

  // La pioche demande 2 cailloux : on n'en a qu'un.
  const pioche = liste.find((x) => x.titre === i18n.t('recipe.pioche'));
  assert.equal(pioche.grisee, true);
  // `D-122` : la fiche nomme l'ingrédient et le nombre. Lu sur la RECETTE et
  // la poche du banc, jamais recopié — le jour où la recette change, ce test
  // suit.
  const caillou = registre.obtenir('recipes', 'rec_pioche').entrees.find((e) => e.item === 'item_caillou');
  assert.equal(
    pioche.lignes.at(-1),
    i18n.t('menu.fiche.ingredient_manquant', { n: caillou.qte - 1, item: nom('item_caillou') }),
    'la fiche dit ce qui manque, et combien',
  );
  console.log('OK Craft : une tuile par recette connue ; la fiche dit ce qu’il faut, ce qu’on a, ce que ça donne, et pourquoi non');
}

// --- 2. Fabriquer : la poche bouge, la fiche se relit, le délai s'annonce -------------------
{
  const { save, entrees } = monter({ poche: { item_branche: 6, item_caillou: 3 } });
  const avant = entrees().find((x) => x.titre === i18n.t(recetteHache.label_key));
  avant.action();
  assert.equal(save.inventaire.items[hache.id], 1, 'la hache est fabriquée');
  const apres = entrees().find((x) => x.titre === i18n.t(recetteHache.label_key));
  assert.equal(normaliserLigneFiche(apres.lignes[0]).texte, i18n.t('menu.fiche.ingredient', { item: nom('item_branche'), n: 2, possede: 4 }), 'ce qu’on a en poche est relu');
  assert.equal(apres.grisee, true, 'la recette vient de servir : la tuile est grisée');
  // `D-122` : la hache est `unique`, et « tu l'as déjà » passe AVANT « en
  // recharge » — c'est la plus utile des deux raisons, et c'est elle qui
  // explique le « 1/1 » que Xav avait vu sans comprendre. La ligne de
  // recharge reste éprouvée sur une recette non unique
  // (`test_phase3_recipes`, cas 4).
  assert.equal(apres.lignes.at(-1), i18n.t('menu.fiche.deja_possede'), 'et la fiche dit pourquoi');
  // Grisée = un indice : l'action réelle est retentée, et ne donne rien.
  apres.action();
  assert.equal(save.inventaire.items[hache.id], 1, 'retenter ne fabrique pas un second exemplaire : le résultat fait foi');
  console.log('OK Craft : fabriquer met à jour la poche et la fiche ; le refus s’annonce, et tient');
}

console.log('OK test_d43_c5_craft_fiches');

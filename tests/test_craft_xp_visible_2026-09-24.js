// L'XP d'une fabrication se VOIT (demande de Xav, 24/09).
//
// CONSTAT : toutes les recettes rapportaient déjà de l'XP, mais rien ne le
// disait — le craft créditait sans position, donc sans « +N xp », et la fiche
// ne l'annonçait pas. Xav croyait qu'elles n'en donnaient pas.
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`) : les valeurs
// d'XP vivent dans `recipes.json` et appartiennent à Xav. Prouvé ici, sur le
// vrai orchestrateur :
//   1. la fiche d'une recette qui rapporte de l'XP le dit, avec SON nombre ;
//   2. fabriquer fait naître un texte d'XP de ce nombre, posé DANS la station
//      (le texte dit d'où vient le gain, comme au puits) ;
//   3. deux fabrications enchaînées sous le menu ne font qu'un texte (gelé
//      sous UI, `D-05`), qui porte la somme.
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

// La recette est lue du catalogue, jamais nommée pour son nombre : la pomme
// d'amour est à la Cuisine, sans éclats ni station à poser.
const RECETTE = registre.obtenir('recipes', 'rec_pomme_amour');
assert.ok(RECETTE.xp > 0, 'la recette éprouvée rapporte de l’XP');

function demarrer() {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = RECETTE.visible_si.min;
  save.hero.xp = registre.obtenir('levels', `niveau_${save.hero.niveau}`).xp_cumulee;
  // De quoi fabriquer DEUX fois.
  save.inventaire.items = Object.fromEntries(RECETTE.entrees.map((e) => [e.item, e.qte * 2]));
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
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_table');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  frame = {
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
  };
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de la Cuisine ouvre l’écran Craft');
  return { save, orch, empreinte, entree: () => ouvert.obtenirEntrees().find((e) => e.titre === i18n.t(RECETTE.label_key)) };
}

const textesXp = (orch) => orch.obtenirTextesFlottants().filter((t) => t.cle === 'gain_xp');
const texteLigne = (l) => (typeof l === 'string' ? l : l.texte);

// --- 1. La fiche annonce l'XP ---------------------------------------------
{
  const { entree } = demarrer();
  const attendu = i18n.t('menu.fiche.rapporte_xp', { n: RECETTE.xp });
  assert.ok(entree().lignes.map(texteLigne).includes(attendu), `la fiche dit « ${attendu} »`);
  console.log(`OK la fiche : « ${attendu} »`);
}

// --- 2 et 3. Le texte d'XP naît dans la station, et fusionne -------------
{
  const { save, orch, empreinte, entree } = demarrer();
  const xpAvant = save.hero.xp;
  entree().action();
  assert.equal(save.hero.xp, xpAvant + RECETTE.xp, 'l’XP est créditée');
  const [texte] = textesXp(orch);
  assert.ok(texte, 'un texte d’XP est né');
  assert.equal(texte.quantite, RECETTE.xp);
  assert.ok(texte.x >= empreinte.x && texte.x <= empreinte.x + empreinte.w
    && texte.y >= empreinte.y && texte.y <= empreinte.y + empreinte.h, 'il naît dans la station');

  // La recette attend son cooldown : on avance l'horloge du monde à la main,
  // sans frame — c'est l'équivalent de deux recettes DIFFÉRENTES de la même
  // station, fabriquées l'une après l'autre sans fermer le menu.
  save.monde.heure += RECETTE.cooldown_ms ?? 60000;
  entree().action();
  assert.equal(textesXp(orch).length, 1, 'deux fabrications, un seul texte');
  assert.equal(textesXp(orch)[0].quantite, RECETTE.xp * 2, 'qui porte la somme');
  console.log(`OK le texte : +${RECETTE.xp}xp dans la station, puis +${RECETTE.xp * 2}xp fusionnés`);
}

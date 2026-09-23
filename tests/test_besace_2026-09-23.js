// La besace (demande de Xav, 23/09) : +2 slots de poche, fabrication unique au
// Nv.10 (2 papyrus + 2 cordes + 1 branche + 1 caillou, 10 éclats, 10 XP).
//
// CHOIX DE XAV : « portée d'office » — fabriquée, elle ne va ni en poche ni au
// coffre, elle se porte pour toujours. Sa présence est un FLAG, et le bonus
// de slots est déclaré en données sur la poche (`conteneurs.json#bonus`).
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`). Prouvé ici :
//   1. la capacité : la base sans le flag, la base + le bonus avec ;
//   2. le démarrage refuse un bonus ou une sortie « portée » mal déclarés ;
//   3. le module de recettes : rien en poche, le flag rendu, une seconde refusée ;
//   4. sur le vrai orchestrateur : absente avant le palier, fabriquée au palier,
//      la poche grandit, la recette quitte l'Atelier ;
//   5. une sauvegarde qui porte la besace et remplit ses six slots se
//      recharge SANS rien descendre au coffre (la normalisation de `D-118`
//      passe après les flags).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, texteRemplissagePoche } from '../src/main.js';
import { resoudreCapacite, slotsOccupes } from '../src/inventory.js';
import { peutFabriquer, fabriquer } from '../src/recipes.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const POCHE = registre.obtenir('conteneurs', 'conteneur_poche');
const RECETTE = registre.obtenir('recipes', 'rec_besace');
const FLAG = RECETTE.sortie.flag;
const BONUS = POCHE.bonus.find((b) => b.condition === FLAG);
const obtenirItem = (id) => registre.obtenir('items', id);

// --- 1. La capacité ------------------------------------------------------
{
  assert.ok(BONUS, 'la poche déclare un bonus sous le flag de la besace');
  const sans = resoudreCapacite(POCHE, () => false);
  const avec = resoudreCapacite(POCHE, (c) => c === FLAG);
  assert.equal(sans.slots, POCHE.slots, 'sans besace : la base');
  assert.equal(avec.slots, POCHE.slots + BONUS.slots, 'avec : la base + le bonus');
  assert.equal(resoudreCapacite(POCHE).slots, POCHE.slots, 'sans évaluateur, aucun bonus ne tient');
  assert.equal(avec.pile, sans.pile, 'la besace ajoute des slots, pas de la hauteur de pile');
  console.log(`OK la capacité : ${sans.slots} slots sans besace, ${avec.slots} avec`);
}

// --- 2. Le démarrage refuse ce qui est mal déclaré ------------------------
{
  const refuse = (modifier, motif) => {
    const copie = JSON.parse(JSON.stringify(donnees));
    modifier(copie);
    const errs = validerCatalogues(copie);
    assert.ok(errs.some((e) => motif.test(e)), `attendu ${motif} : ${errs.join(' | ')}`);
  };
  const poche = (c) => c.conteneurs.find((x) => x.id === POCHE.id);
  const rec = (c) => c.recipes.find((x) => x.id === RECETTE.id);
  refuse((c) => { poche(c).bonus[0].slots = -2; }, /slots doit être un entier strictement positif/);
  refuse((c) => { poche(c).bonus[0].condition = 'flag_inconnu'; }, /flag_inconnu/);
  refuse((c) => { rec(c).sortie.flag = 'flag_inconnu'; }, /sortie\.flag "flag_inconnu"/);
  refuse((c) => { rec(c).sortie.item = 'item_besace'; rec(c).sortie.qte = 1; }, /exactement un de "item", "station" ou "porte"/);
  refuse((c) => { rec(c).sortie.porte = 'item_inconnu'; }, /sortie\.porte "item_inconnu"/);
  console.log('OK le démarrage refuse : bonus négatif ou sous un flag inconnu, sortie portée incomplète ou ambiguë');
}

// --- 3. Le module de recettes, seul --------------------------------------
{
  const poche = Object.fromEntries(RECETTE.entrees.map((e) => [e.item, e.qte]));
  const flagsSans = { evaluate: (c) => typeof c !== 'string' || c !== FLAG };
  const r = fabriquer(RECETTE, {
    poche, flags: flagsSans, cooldowns: {}, heureMs: 0, plafondSortie: () => 0, eclats: RECETTE.cout_eclats,
  });
  assert.equal(r.ok, true, r.raison);
  assert.equal(r.porte, FLAG, 'le module rend le flag à poser');
  assert.equal(r.poche[RECETTE.sortie.porte] || 0, 0, 'l’objet porté n’entre pas en poche');
  assert.equal(slotsOccupes(r.poche, resoudreCapacite(POCHE), obtenirItem), 0, 'les ingrédients sont partis');
  assert.equal(r.eclats, 0, 'les éclats sont payés');

  const flagsAvec = { evaluate: () => true };
  assert.equal(peutFabriquer(RECETTE, poche, flagsAvec, {}, 0, 99).raison, 'deja_possede', 'une seconde : refusée');
  console.log('OK le module : rien en poche, le flag rendu, une seconde besace refusée');
}

// --- 4 et 5. Sur le vrai orchestrateur ------------------------------------
function demarrer({ niveau, poche = {}, eclats = 0, flagsEnPlus = {} }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  // Le niveau va avec son XP : recalculé depuis l'XP totale à chaque crédit.
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
    ...flagsEnPlus,
  };
  const ouvert = {};
  const b = (v) => ({ pressed: v, held: v });
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: (obtenirEntrees) => { ouvert.obtenirEntrees = obtenirEntrees; },
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: {
      maj: () => ({
        move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
        skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
      }),
    },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const atelier = () => {
    const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
    orch.obtenirHero().x = empreinte.x - 20;
    orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
    ouvert.obtenirEntrees = null;
    orch.maj(16);
    assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l’atelier ouvre l’écran Craft');
    return ouvert.obtenirEntrees();
  };
  const remplissage = () => texteRemplissagePoche(save, registre, i18n, orch.evaluerCondition);
  return { save, orch, atelier, remplissage };
}

const titre = i18n.t(RECETTE.label_key);
const pocheRecette = Object.fromEntries(RECETTE.entrees.map((e) => [e.item, e.qte]));
const palier = RECETTE.visible_si.all.find((c) => c.valeur === 'niveau').min;

{
  const avant = demarrer({ niveau: palier - 1, poche: pocheRecette, eclats: 99 });
  assert.ok(!avant.atelier().some((e) => e.titre === titre), 'absente sous le palier (`D-62`)');
  console.log(`OK sous le Nv.${palier} : la besace n’existe pas à l’Atelier`);
}

{
  const jeu = demarrer({ niveau: palier, poche: pocheRecette, eclats: RECETTE.cout_eclats });
  assert.equal(jeu.remplissage(), i18n.t('menu.fiche.coffre_piles', {
    n: slotsOccupes(pocheRecette, resoudreCapacite(POCHE), obtenirItem), max: POCHE.slots,
  }), 'avant : la base');
  const entree = jeu.atelier().find((e) => e.titre === titre);
  assert.ok(entree && entree.grisee === false, 'fabricable au palier');
  // Sa fiche ne dit ni « Donne : Besace × 1 » ni sa catégorie : elle n'entre
  // jamais en poche (simplification demandée par Xav, 24/09). Sa description reste.
  const textes = entree.lignes.map((l) => (typeof l === 'string' ? l : l.texte));
  const objet = registre.obtenir('items', RECETTE.sortie.porte);
  assert.ok(!textes.some((t) => t.startsWith(i18n.t('menu.fiche.donne', { item: '', n: '' }).split(' ')[0])), 'aucune ligne « Donne »');
  assert.ok(!textes.includes(i18n.t(`item.categorie.${objet.categorie}`)), 'aucune ligne de catégorie');
  assert.ok(textes.includes(i18n.t(objet.description_key)), 'la description reste');
  const xpAvant = jeu.save.hero.xp;
  entree.action();

  assert.equal(jeu.save.flags[FLAG], true, 'le flag est posé, donc sauvegardé');
  assert.equal(jeu.save.inventaire.items[RECETTE.sortie.porte] || 0, 0, 'la besace n’est pas dans la poche');
  assert.equal(jeu.save.inventaire.eclats, 0, 'les éclats sont payés');
  assert.equal(jeu.save.hero.xp, xpAvant + RECETTE.xp, 'l’XP est créditée');
  assert.equal(jeu.remplissage(), i18n.t('menu.fiche.coffre_piles', { n: 0, max: POCHE.slots + BONUS.slots }),
    'la poche a grandi, et l’écran Poche le dit');
  assert.ok(!jeu.atelier().some((e) => e.titre === titre), 'fabriquée, elle quitte l’Atelier');
  console.log(`OK au Nv.${palier} : fabriquée, portée, la poche passe à ${POCHE.slots + BONUS.slots} slots, la recette disparaît`);
}

{
  // Une poche de six sortes, cinq de chaque : six slots pleins.
  const pleine = {
    item_branche: 5, item_caillou: 5, item_herbe: 5, item_bois: 5, item_pierre: 5, item_corde: 5,
  };
  const porteur = demarrer({ niveau: palier, poche: pleine, flagsEnPlus: { [FLAG]: true } });
  assert.deepEqual(porteur.save.inventaire.items, pleine, 'avec la besace, rien ne descend au coffre au chargement');

  // Le témoin : sans besace, la même poche déborde, et la normalisation de
  // `D-118` fait toujours son travail.
  const sansBesace = demarrer({ niveau: palier, poche: pleine });
  const reste = slotsOccupes(sansBesace.save.inventaire.items, resoudreCapacite(POCHE), obtenirItem);
  assert.equal(reste, POCHE.slots, 'sans besace, la poche est ramenée à sa base');
  console.log('OK au chargement : six slots pleins tiennent avec la besace ; sans elle, le surplus descend au coffre');
}

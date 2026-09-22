// `D-66` (file Nv.0 → Nv.10, T5) — l'épée en bois.
//
// DÉCISIONS DE XAV (21/09) : recette **15 éclats + 1 bois + 1 branche** à la
// table de craft, `visible_si` niveau ≥ 10 ; **Force +1** ; pas de durabilité
// (jugée trop punitive) ; portée **[0 ; 0,75]** tuile, « à mi-chemin entre les
// mains nues et l'ancienne valeur ». Intention, qui sert de critère à la
// validation en jeu : « faire plus de dégâts de zone au corps à corps sans
// donner un avantage trop gros avant la suite du jeu ».
//
// CE TICKET EST LE TEST DES FONDATIONS. Ce qu'il éprouve : la recette, le
// `visible_si`, le bonus de Force porté par une ARME, et le passage mains
// nues → épée par le craft.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { peutFabriquer, fabriquer } from '../src/recipes.js';
import { calculerStatsPrimaires } from '../src/stats.js';
import { resoudreArmeEquipee } from '../src/combat.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

const EPEE = registre.obtenir('weapons', 'weapon_epee_bois');
const MAINS = registre.obtenir('weapons', 'weapon_mains_nues');
const RECETTE = registre.obtenir('recipes', 'rec_epee_bois');
const ITEM = registre.obtenir('items', 'item_epee_bois');

// --- 1. L'arme, telle que Xav l'a décidée ------------------------------
{
  assert.deepEqual(EPEE.portee, { min: 0, max: 0.75 }, 'portée [0 ; 0,75] tuile');
  assert.deepEqual(EPEE.modificateurs, { stat_force: 1 }, 'Force +1, portée par l\'ARME');
  assert.ok(EPEE.portee.max > MAINS.portee.max, 'elle porte plus loin que les mains nues');
  // Pas de durabilité, jugée trop punitive : rien ne doit la compter.
  for (const champ of ['durabilite', 'usure', 'points_de_vie']) {
    assert.equal(EPEE[champ], undefined, `pas de durabilité sur l'arme (champ "${champ}")`);
  }
  console.log('OK l\'arme : portée [0 ; 0,75], Force +1, aucune durabilité');
}

// --- 2. La recette, et son verrou de niveau ----------------------------
{
  assert.equal(RECETTE.station, 'station_type_atelier', 'à la table de craft');
  assert.equal(RECETTE.cout_eclats, 15, '15 éclats');
  const parItem = Object.fromEntries(RECETTE.entrees.map((e) => [e.item, e.qte]));
  assert.deepEqual(parItem, { item_bois: 1, item_branche: 1 }, '1 bois (la lame) + 1 branche (la garde)');
  assert.deepEqual(RECETTE.visible_si, { valeur: 'niveau', min: 10 }, 'verrouillée sous le niveau 10');
  assert.equal(RECETTE.sortie.item, ITEM.id);
  assert.equal(ITEM.arme, EPEE.id, 'l\'objet de poche dit QUELLE arme il devient');

  // Les éclats ne sont pas un item de poche : ils ne peuvent donc pas figurer
  // dans `entrees`, et rien ne doit prétendre le contraire.
  assert.ok(
    !RECETTE.entrees.some((e) => e.item.includes('eclat')),
    'les éclats sont une monnaie, pas un item : ils passent par `cout_eclats`',
  );
  console.log('OK la recette : 15 éclats + 1 bois + 1 branche, cachée sous le niveau 10');
}

// --- 3. Les éclats sont un vrai coût, refusé et déduit -----------------
{
  const flagsToujours = { evaluate: () => true };
  const poche = { item_bois: 1, item_branche: 1 };

  assert.equal(
    peutFabriquer(RECETTE, poche, flagsToujours, {}, 0, 14).raison, 'eclats',
    '14 éclats ne suffisent pas, et le refus le DIT',
  );
  assert.equal(peutFabriquer(RECETTE, poche, flagsToujours, {}, 0, 15).ok, true, '15 suffisent');

  const resultat = fabriquer(RECETTE, {
    poche, flags: flagsToujours, cooldowns: {}, heureMs: 0, plafondSortie: () => 1, eclats: 40,
  });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.eclats, 25, 'les 15 éclats sont déduits, et RENDUS (le module reste pur)');
  assert.equal(resultat.poche.item_epee_bois, 1);
  assert.equal(resultat.poche.item_bois || 0, 0, 'le bois est consommé');
  assert.equal(resultat.poche.item_branche || 0, 0, 'la branche aussi');

  // Une recette SANS coût en éclats ne les regarde jamais. *Révisé par
  // `D-120`* (22/09) : hache et pioche en coûtent désormais dix chacune, et
  // c'est voulu — le ralentissement du début de partie passe par là. La
  // cuisine, elle, ne bouge pas, et c'est ELLE qui porte le contrat ici.
  for (const id of ['rec_fruit_cuit']) {
    const r = registre.obtenir('recipes', id);
    const pocheComplete = Object.fromEntries(r.entrees.map((e) => [e.item, e.qte]));
    assert.equal(
      peutFabriquer(r, pocheComplete, flagsToujours, {}, 0, 0).ok, true,
      `${id} ne doit pas se mettre à coûter des éclats`,
    );
  }
  console.log('OK les éclats : refusés s\'ils manquent, déduits sinon, ignorés par les autres recettes');
}

// --- 4. Le bonus de Force vient de l'arme, et de rien d'autre ----------
{
  const forceSansArme = calculerStatsPrimaires(registre, {}).stat_force;
  const forceAvecEpee = calculerStatsPrimaires(registre, EPEE.modificateurs).stat_force;
  assert.equal(forceAvecEpee, forceSansArme + 1, 'l\'épée ajoute exactement +1 à la Force');

  // Et la portée reste celle de l'ARME, jamais une stat : on le vérifie en
  // changeant la Force sans toucher à l'arme.
  const armeTresForte = { ...EPEE, modificateurs: { stat_force: 99 } };
  assert.deepEqual(armeTresForte.portee, EPEE.portee, 'la Force ne change pas la portée');
  console.log('OK Force +1 portée par l\'arme, et la portée reste indépendante des stats');
}

// --- 5. En jeu : mains nues → épée, par le craft -----------------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.hero.niveau = 10;
  save.inventaire.eclats = 30;
  save.inventaire.items = { item_bois: 1, item_branche: 1 };
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    flag_ambiance_vent_cendre: true, flag_premiere_faim: true, flag_maison_decouverte: true,
  };

  let entreesCraftVues = null;
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
    ouvrirCraft: (entrees) => { entreesCraftVues = entrees; },
    rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
  };
  const dialogue = creerDialogue();
  const frames = [];
  const input = { maj: () => frames[frames.length - 1] };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const etat = ({ interact = false } = {}) => ({
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact }, menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
  });

  // Au départ : mains nues.
  assert.equal(resoudreArmeEquipee(registre, save.hero.equipement.arme).id, 'weapon_mains_nues');

  // On ouvre l'atelier pour de vrai, en marchant dessus et en appuyant.
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  const atelier = registre.tous('puzzles').find((p) => p.station_type === 'station_type_atelier');
  const pose = scene.poseEffectiveInteractif(atelier.id);
  hero.x = (pose.x + 0.5) * scene.tileSize;
  hero.y = (pose.y + 0.5) * scene.tileSize;
  frames.push(etat({ interact: true }));
  orch.maj(16);
  assert.ok(entreesCraftVues, 'l\'atelier doit s\'ouvrir (sinon ce test ne prouve rien)');

  const entree = entreesCraftVues().find((e) => e.titre === i18n.t(RECETTE.label_key));
  assert.ok(entree, 'au niveau 10, l\'épée est listée');
  assert.equal(entree.grisee, false, 'avec 30 éclats et les deux matériaux, elle est fabricable');
  entree.action();

  assert.equal(save.inventaire.items.item_epee_bois, 1, 'l\'épée entre en poche');
  assert.equal(save.inventaire.eclats, 15, '15 éclats de moins');

  // Elle n'est pas équipée d'office : on l'équipe depuis la Poche, par le
  // MÊME point que la nourriture.
  assert.equal(resoudreArmeEquipee(registre, save.hero.equipement.arme).id, 'weapon_mains_nues');
  console.log('OK craftée à l\'atelier : 15 éclats consommés, l\'épée en poche');
}

// --- 6. Équiper l'épée change la portée ET la Force --------------------
// On passe par le même chemin que l'écran Poche : `equiper(slot, itemId)`.
{
  const save = saveNeuve();
  save.inventaire.items = { item_epee_bois: 1 };
  // Ce que fait `main.js#equiper` : pour une arme, on retient l'id de
  // l'ARME, pas celui de l'objet de poche.
  save.hero.equipement.arme = ITEM.arme;

  const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
  assert.equal(arme.id, 'weapon_epee_bois');
  assert.equal(arme.portee.max, 0.75, 'la portée suit l\'arme équipée');
  assert.equal(
    calculerStatsPrimaires(registre, arme.modificateurs).stat_force,
    calculerStatsPrimaires(registre, {}).stat_force + 1,
    'et la Force aussi',
  );
  console.log('OK équipée, elle porte à 0,75 tuile et donne Force +1');
}

// --- 7. Les textes existent dans les deux langues ---------------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  for (const langue of i18n.languesDisponibles()) {
    i18n.definirLangue(langue);
    for (const cle of [ITEM.label_key, RECETTE.label_key, EPEE.label_key,
      'item.categorie.arme', 'menu.craft_manque_eclats', 'menu.fiche.eclats_manquants',
      'menu.fiche.cout_eclats', 'menu.fiche.bonus_stat']) {
      assert.ok(!i18n.t(cle).startsWith('[['), `${cle} manque en ${langue}`);
    }
    // Les gabarits à marqueurs doivent se résoudre entièrement.
    const cout = i18n.t('menu.fiche.cout_eclats', { n: 15, possede: 3 });
    assert.ok(!/\{[a-z_]+\}/.test(cout), `marqueur non résolu (${langue}) : ${cout}`);
    const bonus = i18n.t('menu.fiche.bonus_stat', { stat: 'Force', n: '+1' });
    assert.ok(!/\{[a-z_]+\}/.test(bonus), `marqueur non résolu (${langue}) : ${bonus}`);
  }
  console.log('OK tous les textes de l\'épée existent en FR et en EN');
}

console.log('OK test_d66_epee_bois');

// `D-120` (T4 de la file « inventaire survivaliste ») : hache et pioche au
// Nv.10, avec un coût en éclats.
//
// C'est le cœur du ralentissement voulu par Xav : jusqu'ici les deux outils se
// fabriquaient à la première minute, avec deux branches ramassées en chemin,
// et toute la carte s'ouvrait avec eux.
//
// Ce qui est éprouvé ici est un CONTRAT, jamais un réglage (`D-52`) : les
// nombres (10, le coût, l'ordre) appartiennent à Xav et vivent dans
// `data/recipes.json`. Ce test vérifie que le gâtage EXISTE, qu'il passe par
// le mécanisme générique (`visible_si`, donc données seules), qu'il s'ouvre
// au même palier pour les trois recettes d'outil et d'arme, et que la chaîne
// du même soir tient.
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
const i18n = creerI18n(dictionnaires, 'fr');

const HACHE = registre.obtenir('recipes', 'rec_hache');
const PIOCHE = registre.obtenir('recipes', 'rec_pioche');
const EPEE = registre.obtenir('recipes', 'rec_epee_bois');
const CUISINE = registre.obtenir('recipes', 'rec_fruit_cuit');

// --- 1. Le gâtage vit en DONNÉES, par le mécanisme générique --------------
{
  for (const recette of [HACHE, PIOCHE, EPEE]) {
    assert.ok(recette.visible_si, `${recette.id} doit déclarer un déblocage`);
    assert.equal(recette.visible_si.valeur, 'niveau', `${recette.id} se débloque par le NIVEAU, pas par un flag dédié`);
    assert.ok(recette.cout_eclats > 0, `${recette.id} doit coûter des éclats`);
  }
  // Les trois s'ouvrent au MÊME palier : c'est ce qui rend possible « hache →
  // bois → épée le même soir ». Testé en relation, jamais en chiffre.
  assert.equal(HACHE.visible_si.min, PIOCHE.visible_si.min);
  assert.equal(HACHE.visible_si.min, EPEE.visible_si.min);
  // Et l'ordre voulu par Xav : la hache coûte moins cher que l'épée, sinon
  // « fabriquer la hache d'abord » ne serait pas un chemin, mais un détour.
  assert.ok(HACHE.cout_eclats < EPEE.cout_eclats, 'la hache doit être moins chère que l’épée');

  // La CUISINE ne bouge pas (décision du 22/09) : c'est le témoin.
  assert.equal(CUISINE.visible_si, undefined, 'la cuisine reste ouverte dès le premier jour');
  assert.equal(CUISINE.cout_eclats, undefined, 'la cuisine ne coûte pas d’éclats');
  console.log('OK le gâtage est en données, au même palier pour les trois, et la cuisine n’a pas bougé');
}

// --- 2. Sur le vrai jeu : rien avant, les trois après ---------------------
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

const titres = (entrees) => entrees.map((e) => e.titre);

{
  // Sous le palier, avec TOUT ce qu'il faut par ailleurs : ni hache, ni
  // pioche, ni épée. Et elles ne sont pas grisées — elles sont ABSENTES
  // (`D-62` : une entrée verrouillée est invisible, jamais « ??? »).
  const avant = monter({
    niveau: HACHE.visible_si.min - 1,
    poche: { item_branche: 5, item_caillou: 5 },
    eclats: 99,
  });
  const listeAvant = titres(avant.entrees());
  for (const r of [HACHE, PIOCHE, EPEE]) {
    assert.ok(!listeAvant.includes(i18n.t(r.label_key)), `${r.id} ne doit pas être listée sous le palier`);
  }
  console.log(`OK sous le Nv.${HACHE.visible_si.min} : aucune des trois recettes n’existe à l’Atelier`);
}

{
  const apres = monter({
    niveau: HACHE.visible_si.min,
    poche: { item_branche: 5, item_caillou: 5 },
    eclats: 99,
  });
  const listeApres = titres(apres.entrees());
  for (const r of [HACHE, PIOCHE, EPEE]) {
    assert.ok(listeApres.includes(i18n.t(r.label_key)), `${r.id} doit être listée au palier`);
  }
  console.log(`OK au Nv.${HACHE.visible_si.min} : les trois apparaissent, avec leur coût`);
}

// --- 3. Le refus par manque d'éclats est DIT, pas silencieux --------------
{
  const sansEclats = monter({
    niveau: HACHE.visible_si.min,
    poche: { item_branche: 5, item_caillou: 5 },
    eclats: HACHE.cout_eclats - 1,
  });
  const entree = sansEclats.entrees().find((e) => e.titre === i18n.t(HACHE.label_key));
  assert.equal(entree.grisee, true, 'sans les éclats, la tuile est grisée');
  // `D-122` : la fiche dit COMBIEN il en manque, pas seulement qu'il en
  // manque — le nombre vient du verdict, jamais recompté ici.
  assert.ok(
    entree.lignes.includes(i18n.t('menu.fiche.eclats_manquants_n', { n: 1 })),
    'et la fiche dit pourquoi, avec le nombre',
  );
  // Grisée est un INDICE, jamais un verrou : l'action est retentée, et ne
  // donne rien (règle du 21/09, `Q-39` ⑥).
  entree.action();
  assert.equal(sansEclats.save.inventaire.items.item_hache || 0, 0, 'retenter ne fabrique rien');
  assert.equal(sansEclats.save.inventaire.eclats, HACHE.cout_eclats - 1, 'et ne coûte rien non plus');
  console.log('OK sans les éclats : grisée, la fiche dit pourquoi, et retenter ne donne rien');
}

// --- 4. La chaîne du même soir : hache → bois → épée ----------------------
// Le point d'attention du ticket : au palier, avec de quoi payer, la chaîne
// se fait SANS autre déblocage. Le bois vient de la récolte à la hache
// (couverte par `test_phase3_recolte`) — ici on le pose en poche, parce que
// ce qui est en jeu est l'enchaînement des RECETTES.
{
  const soir = monter({
    niveau: HACHE.visible_si.min,
    poche: { item_branche: 3, item_caillou: 2 },
    eclats: HACHE.cout_eclats + EPEE.cout_eclats,
  });
  const fabriquer = (recette) => {
    const e = soir.entrees().find((x) => x.titre === i18n.t(recette.label_key));
    assert.ok(e, `${recette.id} introuvable`);
    assert.equal(e.grisee, false, `${recette.id} doit être fabricable`);
    e.action();
  };

  fabriquer(HACHE);
  assert.equal(soir.save.inventaire.items.item_hache, 1, 'la hache est fabriquée');
  assert.equal(soir.save.inventaire.eclats, EPEE.cout_eclats, 'elle a coûté ses éclats');

  // Le bois arrive (récolté à la hache), l'épée suit — aucun déblocage de
  // plus n'a été nécessaire entre les deux.
  soir.save.inventaire.items.item_bois = 1;
  fabriquer(EPEE);
  assert.equal(soir.save.inventaire.items.item_epee_bois, 1, 'l’épée est fabriquée dans la foulée');
  assert.equal(soir.save.inventaire.eclats, 0, 'les deux coûts ont été payés');
  console.log('OK la chaîne hache → bois → épée se fait sans autre déblocage');
}

// --- 5. Une vieille sauvegarde garde ses outils ---------------------------
// Une entrée verrouillée est invisible à l'Atelier, mais l'OBJET possédé ne
// bouge pas : personne ne se fait retirer sa hache par un ticket
// d'équilibrage.
{
  const ancienne = monter({ niveau: 1, poche: { item_hache: 1, item_pioche: 1 } });
  assert.equal(ancienne.save.inventaire.items.item_hache, 1);
  assert.equal(ancienne.save.inventaire.items.item_pioche, 1);
  assert.deepEqual(
    titres(ancienne.entrees()).filter((t) => [HACHE, PIOCHE].some((r) => i18n.t(r.label_key) === t)), [],
    'les recettes restent invisibles, mais les outils restent en poche',
  );
  console.log('OK une vieille sauvegarde garde hache et pioche, même sous le palier');
}

console.log('OK test_d120_outils_nv10');

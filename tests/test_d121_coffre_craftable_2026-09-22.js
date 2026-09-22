// `D-121` (T5 de la file « inventaire survivaliste ») : le coffre craftable,
// et un contenu PAR INSTANCE.
//
// Le contrat que ce fichier garde, et qui est le seul point d'architecture de
// toute la file : **un coffre = un type + une pose + un contenu**. Cinq
// coffres posés, cinq contenus distincts, qui survivent à un rechargement.
// Tout ce qui viendra ensuite (niveaux de coffre, entonnoirs, tri automatique,
// `Q-66`) repose là-dessus.
//
// Ce qui n'est PAS testé ici : le rendu du fantôme, la navigation au stick —
// le canvas n'est jamais exercé headless, et ça revient à Xav (`V-66`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import {
  saveNeuve, creerStoreMemoire, migrer, sauvegarder, charger, VERSION_SCHEMA_COURANTE,
} from '../src/save.js';
import {
  creerOrchestrateurGrotte, instancesCreees, modeleDeStation, erreursRecettesDeStation,
  instanceDeStockageDeBase,
} from '../src/main.js';

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

const RECETTE = registre.obtenir('recipes', 'rec_coffre');
const TYPE_COFFRE = RECETTE.sortie.station;
const COFFRE_DE_BASE = instanceDeStockageDeBase(registre);

// --- 1. La recette produit une STATION, et elle a un modèle à cloner ------
{
  assert.equal(RECETTE.sortie.item, undefined, 'une recette de station ne produit pas d’objet de poche');
  assert.equal(RECETTE.categorie, 'station');
  assert.ok(RECETTE.cout_eclats > 0, 'elle coûte des éclats');
  assert.ok(RECETTE.visible_si, 'elle est gâtée par niveau, comme les outils');
  // Le contrôle de démarrage : une station fabricable doit avoir une
  // instance de catalogue à cloner, sinon la faute ne se verrait qu'en jouant.
  assert.deepEqual(erreursRecettesDeStation(donnees.recipes, donnees.puzzles), []);
  // Témoin : sans modèle, le contrôle crie — sinon il ne prouverait rien.
  assert.equal(erreursRecettesDeStation(donnees.recipes, []).length, 1);
  assert.ok(modeleDeStation(registre, TYPE_COFFRE), 'le type de coffre a bien un modèle');
  // Et la recette tient en poche : c'est la condition posée par Xav (`Q-63`),
  // le craft ne puise pas au coffre.
  const poche = registre.obtenir('conteneurs', 'conteneur_poche');
  assert.ok(
    RECETTE.entrees.length <= poche.slots,
    'la recette doit tenir en poche : autant de sortes d’ingrédients que de slots, au plus',
  );
  for (const e of RECETTE.entrees) {
    assert.ok(e.qte <= poche.pile, `${e.item} : ${e.qte} doit tenir dans une pile de poche`);
  }
  console.log('OK la recette produit une station, elle a un modèle, et elle TIENT en poche');
}

// --- 2. Une instance créée est un interactif comme un autre --------------
{
  const creees = instancesCreees(registre, 'scene_maison_exterieur', {
    // une pose sauvegardée ordinaire : ce n'est PAS une instance créée
    station_coffre: { x: 3, y: 4, rotation: 0 },
    // un contenu seul non plus
    station_atelier: { contenu: { item_bois: 2 } },
    // celle-ci, si : elle porte un `type`
    mon_coffre: { type: TYPE_COFFRE, scene: 'scene_maison_exterieur', x: 90, y: 60, rotation: 1 },
    // et celle-là est ailleurs
    coffre_ailleurs: { type: TYPE_COFFRE, scene: 'scene_grotte_salle_1', x: 5, y: 5 },
  });
  assert.deepEqual(creees.map((p) => p.id), ['mon_coffre'], 'seules les entrées avec `type` et la bonne scène');
  const clone = creees[0];
  const modele = modeleDeStation(registre, TYPE_COFFRE);
  assert.equal(clone.type, 'station');
  assert.equal(clone.station_type, modele.station_type, 'le clone garde le type du modèle');
  assert.equal(clone.render.visuel, modele.render.visuel, 'et sa silhouette');
  assert.equal(clone.solide, modele.solide, 'et sa solidité — c’est un mur comme l’autre');
  assert.deepEqual(clone.position, { x: 90, y: 60 }, 'mais sa propre pose');
  assert.notEqual(clone.id, modele.id);
  console.log('OK une instance créée CLONE le modèle de son type, et ne change que son id et sa pose');
}

// --- 3. Sur le vrai jeu : fabriquer, poser, et deux contenus distincts ----
function monterPartie(stations = null) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.hero.niveau = 10;
  save.hero.xp = registre.obtenir('levels', 'niveau_10').xp_cumulee;
  save.inventaire.eclats = 99;
  save.inventaire.items = { item_bois: 5, item_branche: 5, item_herbe: 5 };
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    // `D-125` : les lignes d'ambiance, toutes, DÉRIVÉES du catalogue — un
    // dialogue gèle le temps actif, et ce fichier éprouve autre chose. Déduites
    // plutôt que recopiées, pour qu'une ligne de plus ne rouvre pas neuf
    // fichiers (`Q-42`).
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true, ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
  };
  const ouvert = { craft: null, coffre: null, placement: null, listeRouverte: 0 };
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
    ouvrirCraft: (obtenirEntrees) => { ouvert.craft = obtenirEntrees; },
    rafraichirCraft: () => {},
    ouvrirCoffre: (obtenirEntrees, titre, options) => { ouvert.coffre = { obtenirEntrees, titre, options }; },
    rafraichirCoffre: () => {},
    rafraichirStats: () => {},
    ouvrirPlacementConstruction: (nom) => { ouvert.placement = nom; },
    reouvrirListeConstruction: () => { ouvert.listeRouverte += 1; ouvert.placement = null; },
    fermerPlacementConstruction: () => { ouvert.placement = null; },
  };
  // Les instances posées AVANT la création de l'orchestrateur : la scène les
  // résout à son chargement, exactement comme au démarrage du jeu.
  if (stations) Object.assign(save.maison.stations, JSON.parse(JSON.stringify(stations)));
  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const b = (v) => ({ pressed: v, held: v });
  const etat = (interact) => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
  });
  const interagir = () => { frames.push(etat(true)); orch.maj(16); frames.push(etat(false)); orch.maj(16); };
  const allerA = (id) => {
    const e = orch.obtenirScene().empreintesSolides.find((x) => x.id === id);
    assert.ok(e, `empreinte introuvable pour ${id}`);
    orch.obtenirHero().x = e.x - 20;
    orch.obtenirHero().y = e.y + e.h / 2;
  };
  return { save, orch, ouvert, interagir, allerA };
}

{
  const p = monterPartie();
  p.allerA('station_atelier');
  p.interagir();
  assert.ok(p.ouvert.craft, 'l’Atelier s’ouvre');
  const entree = p.ouvert.craft().find((e) => e.titre === i18n.t(RECETTE.label_key));
  assert.ok(entree, 'la recette du coffre est listée au Nv.10');
  assert.equal(entree.grisee, false, 'avec les ingrédients et les éclats, elle est fabricable');

  entree.action();

  // Ce qui doit s'être passé : les ingrédients consommés, l'instance créée,
  // et le mode Construction ouvert avec SON fantôme.
  assert.equal(p.save.inventaire.items.item_bois, 0, 'les ingrédients sont consommés');
  assert.equal(p.save.inventaire.eclats, 99 - RECETTE.cout_eclats, 'les éclats aussi');
  const creees = Object.entries(p.save.maison.stations).filter(([, e]) => e.type === TYPE_COFFRE);
  assert.equal(creees.length, 1, 'une instance de coffre a été créée');
  const [idCree] = creees[0];
  assert.notEqual(idCree, COFFRE_DE_BASE.id, 'et ce n’est pas le coffre de base');
  assert.equal(p.ouvert.placement, i18n.t(registre.obtenir('stations', TYPE_COFFRE).label_key),
    'le mode Construction s’ouvre avec le nom de ce qu’on vient de fabriquer');
  assert.equal(p.orch.obtenirConstruction().puzzle.id, idCree, 'et c’est bien SON fantôme');

  // Aucun objet n'est entré en poche : une station se pose, elle ne se porte
  // pas — et c'est ce qui permet de la fabriquer poche pleine.
  assert.equal(p.save.inventaire.items[TYPE_COFFRE], undefined);
  console.log('OK fabriquer un coffre le CRÉE et ouvre son placement, sans rien mettre en poche');

  // La station créée est dans la scène : actionnable, solide, déplaçable.
  const scene = p.orch.obtenirScene();
  assert.ok(scene.interactifs.includes(idCree), 'l’instance créée est un interactif de la scène');
  assert.ok(scene.puzzle(idCree), 'et elle se résout par son id');
  assert.ok(scene.empreintesSolides.some((e) => e.id === idCree), 'elle est solide, comme le coffre de base');
  console.log('OK l’instance créée est un interactif ordinaire : résolue, solide, dans la liste');
}

// --- 4. Deux coffres, deux contenus, qui survivent au rechargement --------
{
  // Deux instances posées à la main : ce qui est éprouvé ici est le CONTENU
  // par instance, pas le chemin de fabrication (couvert juste au-dessus).
  const interieur = registre.obtenir('scenes', 'scene_maison_exterieur').structures.find((st) => st.interieur).interieur;
  const q = monterPartie({
    coffre_bois: {
      type: TYPE_COFFRE, scene: 'scene_maison_exterieur', x: interieur.x + 1, y: interieur.y + 1, rotation: 0,
    },
    [COFFRE_DE_BASE.id]: { contenu: { item_pierre: 4 } },
  });

  // On ouvre le coffre de BASE et on y lit ce qu'il contient.
  q.allerA(COFFRE_DE_BASE.id);
  q.interagir();
  assert.ok(q.ouvert.coffre, 'le coffre de base s’ouvre');
  const titresDuCoffre = () => q.ouvert.coffre.obtenirEntrees()
    .filter((e) => e.groupe !== i18n.t('menu.poche'))
    .map((e) => e.titre);
  assert.deepEqual(titresDuCoffre(), [i18n.t('item.pierre')], 'le coffre de base a SON contenu');

  // On dépose un objet dans le coffre CRÉÉ : il ne doit rien changer à l'autre.
  q.save.inventaire.items = { item_bois: 2 };
  q.allerA('coffre_bois');
  q.interagir();
  const depot = q.ouvert.coffre.obtenirEntrees()
    .find((e) => e.groupe === i18n.t('menu.poche') && e.titre === i18n.t('item.bois'));
  assert.ok(depot, 'on peut déposer dans le coffre créé');
  depot.action();

  assert.equal(q.save.maison.stations.coffre_bois.contenu.item_bois, 1, 'le bois est dans le coffre créé');
  assert.deepEqual(
    q.save.maison.stations[COFFRE_DE_BASE.id].contenu, { item_pierre: 4 },
    'et le coffre de base n’a pas bougé d’un objet',
  );
  console.log('OK deux coffres, deux contenus : déposer dans l’un ne touche pas l’autre');

  // Rechargement : les deux tiennent.
  const store = creerStoreMemoire();
  await sauvegarder(store, q.save);
  const { payload } = await charger(store);
  assert.equal(payload.schema_version, VERSION_SCHEMA_COURANTE);
  assert.equal(payload.maison.stations.coffre_bois.contenu.item_bois, 1);
  assert.deepEqual(payload.maison.stations[COFFRE_DE_BASE.id].contenu, { item_pierre: 4 });
  assert.equal(payload.maison.stations.coffre_bois.type, TYPE_COFFRE, 'l’instance créée survit, avec son type');
  console.log('OK sauvegardé puis rechargé : les deux coffres tiennent, contenus compris');
}

// --- 5. La migration 6 -> 7 : le coffre de base hérite -------------------
{
  const v6 = {
    schema_version: 6,
    hero: { scene: 'scene_maison_exterieur', x: 0, y: 0, equipement: {} },
    inventaire: { eclats: 3, items: {} },
    coffre: { items: { item_bois: 7, item_pierre: 2 } },
    maison: { stations: { [COFFRE_DE_BASE.id]: { x: 80, y: 50, rotation: 1 } } },
    monde: {}, flags: {}, settings: {},
  };
  const migre = migrer(v6);
  assert.equal(migre.coffre, undefined, 'le champ `coffre` a disparu');
  assert.deepEqual(
    migre.maison.stations[COFFRE_DE_BASE.id].contenu, { item_bois: 7, item_pierre: 2 },
    'le coffre de base hérite de ce qu’il contenait — jamais vidé par une mise à jour',
  );
  assert.deepEqual(
    [migre.maison.stations[COFFRE_DE_BASE.id].x, migre.maison.stations[COFFRE_DE_BASE.id].rotation], [80, 1],
    'et sa POSE est conservée : on ajoute un champ, on ne remplace pas l’entrée',
  );

  // Un coffre vide ne laisse aucune trace : une migration ne crée pas de
  // données pour rien.
  const vide = migrer({ ...v6, coffre: { items: {} }, maison: { stations: {} } });
  assert.deepEqual(vide.maison.stations, {}, 'un coffre vide ne crée aucune entrée');
  console.log('OK migration 6 -> 7 : le coffre de base hérite, sa pose tient, un coffre vide ne laisse rien');
}

// --- 6. Les sauvegardes réelles de Xav se chargent -----------------------
// Le dossier grossit à chaque export : ce test lit ce qu'il TROUVE, et les
// fichiers n'y sont pas tous de la même époque — depuis le 22/09 certains
// sont déjà en v7, le coffre de base portant son contenu dans sa propre
// entrée. Ce qui se vérifie n'est donc pas « la v6 a bien été convertie »
// mais la propriété qui vaut des deux côtés : **rien ne se perd**, quelle que
// soit la forme d'arrivée.
{
  const fs = await import('node:fs/promises');
  const dossier = path.join(RACINE, 'docs', 'sauvegardes');
  const fichiers = (await fs.readdir(dossier)).filter((f) => f.endsWith('.json'));
  assert.ok(fichiers.length > 0, 'il doit y avoir des sauvegardes réelles à éprouver');
  for (const fichier of fichiers) {
    const brut = JSON.parse(await fs.readFile(path.join(dossier, fichier), 'utf8'));
    const payload = brut.payload || brut;
    if (typeof payload.schema_version !== 'number') continue;
    const migre = migrer(payload);
    assert.equal(migre.schema_version, VERSION_SCHEMA_COURANTE, `${fichier} : migrée à la version courante`);
    assert.equal(migre.coffre, undefined, `${fichier} : plus de champ coffre`);
    // Rien de perdu : ce que le coffre de base portait AVANT — dans le champ
    // `coffre` d'une v6, ou déjà dans son entrée de `maison.stations` — est
    // toujours là après.
    const total = (t) => Object.values(t || {}).reduce((a, b) => a + b, 0);
    const stationsAvant = (payload.maison && payload.maison.stations) || {};
    const avant = total((payload.coffre && payload.coffre.items))
      + total((stationsAvant[COFFRE_DE_BASE.id] || {}).contenu);
    const apres = total((migre.maison.stations[COFFRE_DE_BASE.id] || {}).contenu);
    assert.equal(apres, avant, `${fichier} : le contenu du coffre est intact`);
  }
  console.log(`OK les ${fichiers.length} sauvegardes réelles se chargent, coffre intact`);
}

// --- 7. Six coffres posés : la maison reste praticable -------------------
// « Aucune limite de nombre autre que la place dans la grille » (Xav, 22/09).
// Ce qui protège le joueur n'est donc pas un compteur, c'est `poseValide` —
// et sa règle de praticabilité du couloir, qui existe depuis la spec 05. Ce
// test vérifie qu'elle tient toujours quand ce sont SIX coffres qui
// encombrent la pièce, et qu'elle refuse la pose de trop plutôt que de
// laisser le joueur s'enfermer.
{
  const interieur = registre.obtenir('scenes', 'scene_maison_exterieur').structures.find((st) => st.interieur).interieur;
  const stations = {};
  // Une rangée le long du mur du haut : des poses que rien n'interdit.
  for (let n = 0; n < 6; n += 1) {
    stations[`coffre_${n}`] = {
      type: TYPE_COFFRE, scene: 'scene_maison_exterieur',
      x: interieur.x + 1 + n * 2, y: interieur.y + 1, rotation: 0,
    };
  }
  const six = monterPartie(stations);
  const scene = six.orch.obtenirScene();
  for (let n = 0; n < 6; n += 1) {
    assert.ok(scene.interactifs.includes(`coffre_${n}`), `coffre_${n} doit exister dans la scène`);
    assert.ok(scene.empreintesSolides.some((e) => e.id === `coffre_${n}`), `coffre_${n} doit être solide`);
  }
  // Et le héros peut toujours traverser : les tuiles atteignables depuis son
  // point d'entrée couvrent encore l'intérieur de la maison. On le demande à
  // la VRAIE fonction de collision, jamais à une grille recopiée.
  const { calculerTuilesAtteignables } = await import('../src/ground_items.js');
  const hero = six.orch.obtenirHero();
  const atteignables = calculerTuilesAtteignables(
    scene, Math.floor(hero.x / scene.tileSize), Math.floor(hero.y / scene.tileSize),
  );
  let libres = 0;
  let joignables = 0;
  for (let ty = interieur.y; ty < interieur.y + interieur.h; ty += 1) {
    for (let tx = interieur.x; tx < interieur.x + interieur.w; tx += 1) {
      if (scene.estSolideAuPoint((tx + 0.5) * scene.tileSize, (ty + 0.5) * scene.tileSize, () => true)) continue;
      libres += 1;
      if (atteignables.has(`${tx},${ty}`)) joignables += 1;
    }
  }
  assert.ok(libres > 0, 'il doit rester des tuiles libres dans la maison');
  assert.equal(joignables, libres, 'toute tuile libre de la maison reste joignable avec six coffres posés');
  console.log(`OK six coffres posés : ${libres} tuiles libres, toutes joignables`);
}

console.log('OK test_d121_coffre_craftable');

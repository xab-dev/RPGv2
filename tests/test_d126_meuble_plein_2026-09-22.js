// `D-126` : on ne déplace pas un meuble plein — et la racine du défaut qui
// l'avait fait naître par accident.
//
// DEUX CHOSES DANS UN SEUL FICHIER, parce qu'elles sont la même histoire.
//
// 1. LA RÈGLE, voulue par Xav (22/09) : un coffre vide se déplace librement,
//    un coffre qui porte ne serait-ce qu'un objet ne bouge plus. Elle est
//    DÉCLARÉE en données (`stations.json > deplacable_si_vide`), pas déduite
//    du rôle « stockage » : une règle de jeu se lit, elle ne se devine pas.
//
// 2. LA RACINE : avant ce ticket, le premier coffre se scellait tout seul,
//    pour une raison qui n'avait rien d'une règle. Depuis `D-121`, une entrée
//    de `save.maison.stations` n'est plus une pose mais une FICHE (contenu,
//    type, scène), et elle n'a des coordonnées que si le joueur a déplacé la
//    station. Trois endroits la lisaient, un seul le savait : le fantôme de
//    Construction naissait à `x: undefined`, la poussée faisait
//    `undefined + 1`, et rien ne le disait. Le même oubli, côté écriture,
//    REMPLAÇAIT la fiche par la seule pose — donc vidait un coffre qu'on
//    déplaçait, et faisait disparaître du monde un coffre FABRIQUÉ (il y
//    perdait `type` et `scene`).
//
// Les contrats gardés ici sont donc ceux-là : une seule lecture de la pose,
// une écriture qui ENRICHIT (`D-71`), et une pose qui n'est pas un nombre
// refusée plutôt qu'acceptée.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { poseValide } from '../src/placement.js';
import { creerOrchestrateurGrotte, poseSauvegardeeDeStation, stationDeplacable } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const TYPE_COFFRE = registre.tous('stations').find((s) => s.role === 'stockage');

// --- 1. La règle vit en données, et elle est pure ------------------------
{
  assert.equal(TYPE_COFFRE.deplacable_si_vide, true, 'le coffre déclare lui-même qu’il ne se déplace que vide');

  assert.deepEqual(stationDeplacable(TYPE_COFFRE, {}), { ok: true, raison: null }, 'coffre vide : libre');
  assert.deepEqual(stationDeplacable(TYPE_COFFRE, undefined), { ok: true, raison: null },
    'aucun contenu du tout : libre aussi — un coffre jamais ouvert est vide');
  assert.deepEqual(stationDeplacable(TYPE_COFFRE, { item_bois: 1 }), { ok: false, raison: 'station_pleine' },
    'UN objet suffit à le sceller : c’est la mécanique demandée, pas un seuil');
  // Un contenu à zéro n'est pas un contenu : `retirerItem` peut laisser une
  // clé derrière lui, et un coffre vidé doit redevenir déplaçable.
  assert.deepEqual(stationDeplacable(TYPE_COFFRE, { item_bois: 0 }), { ok: true, raison: null },
    'vidé jusqu’au dernier objet : le coffre se rouvre au déplacement');

  // Témoin : une station qui ne déclare rien se déplace pleine. C'est ce qui
  // fait que les trois autres n'ont rien à changer.
  const sansRegle = { id: 'station_type_test', placable: true };
  assert.deepEqual(stationDeplacable(sansRegle, { item_bois: 5 }), { ok: true, raison: null },
    'absence du champ = aucune contrainte, jamais un défaut caché');

  // Et le schéma refuse un champ mal typé, au boot.
  const faux = JSON.parse(JSON.stringify(donnees));
  faux.stations.find((s) => s.id === TYPE_COFFRE.id).deplacable_si_vide = 'oui';
  assert.ok(
    validerCatalogues(faux, SCHEMAS).some((e) => e.includes('deplacable_si_vide')),
    'deplacable_si_vide mal typé doit tomber au démarrage',
  );
  console.log('OK la règle est en données, pure, et un contenu à zéro ne compte pas');
}

// --- 2. Une entrée de `maison.stations` n'est une pose que si elle en a une
// C'est LE point de lecture, et la raison d'être du ticket : les quatre
// formes qu'une entrée peut prendre depuis `D-121`, plus celle qu'une
// sauvegarde abîmée par le défaut a pu prendre (`x: null`, NaN sérialisé).
{
  assert.equal(poseSauvegardeeDeStation(undefined), null, 'aucune entrée : aucune pose');
  assert.equal(poseSauvegardeeDeStation({ contenu: { item_bois: 2 } }), null,
    'un contenu seul n’est PAS une pose — c’est tout le défaut, en une ligne');
  assert.equal(poseSauvegardeeDeStation({ x: null, y: null, rotation: 0 }), null,
    'une sauvegarde abîmée par le défaut (NaN sérialisé en null) ne devient pas une pose');
  assert.equal(poseSauvegardeeDeStation({ x: NaN, y: 3 }), null, 'ni un NaN vivant');
  assert.deepEqual(poseSauvegardeeDeStation({ x: 87, y: 54 }), { x: 87, y: 54, rotation: 0 },
    'une pose sans rotation vaut rotation 0');
  assert.deepEqual(
    poseSauvegardeeDeStation({ x: 87, y: 54, rotation: 2, contenu: { item_bois: 1 }, type: 'station_type_coffre' }),
    { x: 87, y: 54, rotation: 2 },
    'et la pose rendue est PROPRE : le contenu ne part pas se promener dans les overrides de scène',
  );
  console.log('OK poseSauvegardeeDeStation : une pose, ou rien — jamais un undefined qui se propage');
}

// --- 3. Une pose qui n'est pas un nombre est REFUSÉE ---------------------
// Le garde-fou qui manquait : toute comparaison avec NaN étant fausse,
// `poseValide` répondait `ok` sur une empreinte introuvable.
{
  // La VRAIE structure de la maison, lue au catalogue : un rectangle inventé
  // ici finirait par ne plus ressembler à celui que le jeu valide.
  const structure = registre.obtenir('scenes', 'scene_maison_exterieur')
    .structures.find((s) => s.interieur);
  const tuile = registre.obtenir('scenes', 'scene_maison_exterieur').tile_size;
  const saine = {
    x: (structure.interieur.x + 1) * tuile, y: (structure.interieur.y + 1) * tuile, w: tuile, h: tuile,
  };
  assert.equal(poseValide({ empreinte: saine, structure, autresEmpreintes: [], tileSize: 32 }).ok, true,
    'témoin : la même pose, avec des nombres, est valide');
  const verdict = poseValide({
    empreinte: { ...saine, x: NaN }, structure, autresEmpreintes: [], tileSize: 32,
  });
  assert.deepEqual(verdict, { ok: false, raison: 'pose_invalide' }, 'une empreinte NaN est refusée, pas acceptée');
  console.log('OK poseValide refuse une empreinte qui n’est pas faite de nombres');
}

// --- Un banc de partie, héros DANS la maison -----------------------------
function monter(stations = {}) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  Object.assign(save.maison.stations, JSON.parse(JSON.stringify(stations)));
  save.flags = Object.fromEntries([
    ...registre.tous('ambiances').map((a) => a.flag),
    'flag_follet_choisi', 'flag_grotte_sortie', 'flag_grotte_sequence', 'flag_grotte_monstre_tue',
    'flag_levier_salle1', 'flag_premier_ramassage', 'flag_maison_decouverte',
  ].map((f) => [f, true]));
  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
      ouvrirPlacementConstruction: () => {}, reouvrirListeConstruction: () => {},
      fermerPlacementConstruction: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const scene = orch.obtenirScene();
  const structure = (scene.structures || []).find((s) => s.interieur);
  const hero = orch.obtenirHero();
  hero.x = (structure.interieur.x + 1.5) * scene.tileSize;
  hero.y = (structure.interieur.y + 1.5) * scene.tileSize;
  const b = (v) => ({ pressed: v, held: v });
  const etat = (o = {}) => ({
    move: o.move || { x: 0, y: 0 }, attack: b(!!o.attack), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  });
  const tick = (o) => { frames.push(etat(o)); orch.maj(16); };
  const coffres = () => orch.entreesConstruction().filter((e) => e.titre === i18n.t(TYPE_COFFRE.label_key));
  return { save, orch, tick, coffres };
}

// --- 4. En jeu : vide il se déplace, plein il est scellé, et ça se DIT ----
{
  // (a) Un coffre rempli sans jamais avoir été déplacé — le cas exact de Xav.
  const plein = monter({ station_coffre: { contenu: { item_bois: 2 } } });
  const tuile = plein.coffres()[0];
  assert.equal(tuile.grisee, true, 'plein : la tuile est grisée');
  assert.deepEqual(tuile.lignes, [i18n.t('menu.fiche.refus_station_pleine')], 'et la fiche dit pourquoi');
  tuile.action();
  assert.equal(plein.orch.obtenirConstruction(), null, 'le placement ne démarre pas — le résultat fait foi');
  plein.tick({ move: { x: 1, y: 0 } });
  plein.tick({ attack: true });
  assert.deepEqual(
    plein.save.maison.stations.station_coffre, { contenu: { item_bois: 2 } },
    'et rien n’a bougé : ni la pose, ni surtout le contenu',
  );

  // (b) Le même coffre, vidé : il se déplace, et son entrée garde sa forme.
  const vide = monter({ station_coffre: { contenu: {} } });
  const tuileVide = vide.coffres()[0];
  assert.equal(tuileVide.grisee, false, 'vide : la tuile n’est plus grisée');
  assert.deepEqual(tuileVide.lignes, [], 'et la fiche n’a plus de raison à donner');
  tuileVide.action();
  assert.ok(vide.orch.obtenirConstruction(), 'le placement démarre');
  assert.deepEqual(
    vide.orch.obtenirConstruction().pose,
    { x: 86, y: 54, rotation: 0 },
    'le fantôme naît à la position du catalogue, jamais à `undefined`',
  );
  vide.tick({ move: { x: 1, y: 0 } });
  const pose = vide.orch.obtenirConstruction().pose;
  assert.equal(pose.x, 87, 'et il BOUGE — c’est ce qui ne marchait plus');
  vide.tick({ attack: true });
  assert.equal(vide.save.maison.stations.station_coffre.x, 87, 'la pose est enregistrée');
  assert.deepEqual(vide.save.maison.stations.station_coffre.contenu, {}, 'et le contenu (vide) est resté là');
  console.log('OK plein il ne bouge pas et le dit ; vidé, il se déplace comme avant');
}

// --- 5. Déplacer ENRICHIT l'entrée, ne la remplace jamais (`D-71`) -------
// C'est l'autre moitié du défaut, et elle survit à la nouvelle règle : un
// coffre FABRIQUÉ et vide se déplace, et il doit garder `type` et `scene` —
// sans eux, `instancesCreees` ne le rend plus et il disparaît du monde au
// rechargement.
{
  const p = monter({
    coffre_bois: { type: TYPE_COFFRE.id, scene: 'scene_maison_exterieur', x: 87, y: 55, rotation: 0 },
  });
  const fabrique = p.coffres()[1];
  assert.ok(fabrique, 'le coffre fabriqué est lui aussi dans la liste de Construction');
  fabrique.action();
  assert.deepEqual(p.orch.obtenirConstruction().pose, { x: 87, y: 55, rotation: 0 }, 'sa pose à lui');
  p.tick({ move: { x: 1, y: 0 } });
  p.tick({ attack: true });
  const entree = p.save.maison.stations.coffre_bois;
  assert.equal(entree.x, 88, 'il a bougé');
  assert.equal(entree.type, TYPE_COFFRE.id, 'et il a GARDÉ son type');
  assert.equal(entree.scene, 'scene_maison_exterieur', 'et sa scène');
  console.log('OK déplacer enrichit l’entrée : un coffre fabriqué reste un coffre fabriqué');
}

console.log('OK test_d126_meuble_plein');

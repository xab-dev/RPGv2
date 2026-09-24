// `specs/13` palier D (`Q-52`) : les lisières, le mécanisme.
//
// Ce qui se prouve ici : QUELLES poses une case reçoit (un bord par côté
// dominé, un coin par diagonale seule, rien entre deux surfaces de même rang,
// la surface lue par `tuileDeSol`, un ordre stable), la validation au
// démarrage, le rayon d'influence, et l'ORDRE de dessin d'une case dans le
// calque (§4.3 : grain, lisières, objet). L'image elle-même se juge en scène
// (`tools/scenarios/lisieres.mjs`, puis Xav : `V-145`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisieresCase, tableLisieres, visuelsDesLisieres } from '../src/lisieres.js';
import { rayonInfluence } from '../src/defilement.js';
import {
  dessinerScene, definirTamponsActifs, invaliderCoucheStatique,
} from '../src/render.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { boiteDessin } from '../src/tampons.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
const registre = construireRegistre(donnees);
const TILE = 32;

// Une scène de poche : une grille de caractères, une légende, et le même
// contrat que `scene.js` (`tuileA`, `tuile(id)`) — rien de plus n'est lu.
function sceneDe(lignes, legende, seed = 7) {
  return {
    id: 'scene_test_lisieres',
    seed,
    tileSize: TILE,
    width: lignes[0].length,
    height: lignes.length,
    tuileA(x, y) {
      if (y < 0 || y >= lignes.length || x < 0 || x >= lignes[0].length) return null;
      return registre.obtenir('tiles', legende[lignes[y][x]]);
    },
    tuile: (id) => registre.obtenir('tiles', id),
  };
}
const LEGENDE = {
  '.': 'tile_herbe', C: 'tile_chemin', A: 'tile_arbre_fond', a: 'tile_arbre', P: 'tile_parquet', T: 'tile_terre',
};
const table = tableLisieres(registre.tous('tiles'), (id) => registre.obtenir('visuels', id));
const BORD = registre.obtenir('visuels', 'visuel_lisiere_herbe_bord');
const COIN = registre.obtenir('visuels', 'visuel_lisiere_herbe_coin');
const OMBRE = registre.obtenir('visuels', 'visuel_lisiere_herbe_bord_ombre');
const OMBRE_COIN = registre.obtenir('visuels', 'visuel_lisiere_herbe_coin_ombre');
const poses = (scene, x, y) => lisieresCase(scene, x, y, () => false, table);
const NOMS = new Map([[BORD, 'bord'], [COIN, 'coin'], [OMBRE, 'ombre'], [OMBRE_COIN, 'ombre_coin']]);
const nommer = (liste) => liste.map((p) => `${NOMS.get(p.visuel)}@${p.rotation}`);
// Les sections 2 à 5 parlent des bords et des coins ; les ombres ont la leur (10).
const resume = (liste) => nommer(liste.filter((p) => p.visuel !== OMBRE && p.visuel !== OMBRE_COIN));

// --- 1. Le catalogue réel : l'herbe domine le chemin ---------------------------
{
  assert.equal(table.get('tile_herbe').bord, BORD);
  assert.ok(table.get('tile_herbe').rang > table.get('tile_chemin').rang, 'l\'herbe mange le chemin (Q-132)');
  assert.equal(table.get('tile_chemin').bord, null, 'le chemin ne déborde sur rien');
  assert.equal(table.has('tile_parquet'), false, 'le parquet, construit, garde un bord net');
  console.log('OK le catalogue : herbe rang 3 sur chemin rang 1');
}

// --- 2. Un bord par côté dominé, dans l'ordre N-E-S-O --------------------------
{
  const scene = sceneDe([
    '...',
    '.C.',
    '...',
  ], LEGENDE);
  assert.deepEqual(resume(poses(scene, 1, 1)), ['bord@0', 'bord@90', 'bord@180', 'bord@270'],
    'quatre côtés dominés : quatre bords, N-E-S-O, et aucun coin (les bords couvrent les angles)');
  const nord = sceneDe([
    '...',
    'CCC',
    'CCC',
  ], LEGENDE);
  assert.deepEqual(resume(poses(nord, 1, 1)), ['bord@0'], 'l\'herbe au nord seulement : un bord, tourné vers le nord');
  assert.deepEqual(resume(poses(nord, 1, 2)), [], 'une case entourée de chemin ne reçoit rien');
  assert.deepEqual(resume(poses(nord, 1, 0)), [], 'la surface qui domine ne reçoit rien d\'une surface plus basse');
  console.log('OK un bord par côté dominé, N-E-S-O');
}

// --- 3. Un coin intérieur par diagonale SEULE -----------------------------------
{
  const scene = sceneDe([
    '.CC',
    'CCC',
    'CC.',
  ], LEGENDE);
  assert.deepEqual(resume(poses(scene, 1, 1)), ['coin@0', 'coin@180'],
    'herbe au nord-ouest et au sud-est, en diagonale seulement : deux coins, NO puis SE');
  const escalier = sceneDe([
    '..C',
    '.CC',
    'CCC',
  ], LEGENDE);
  // (1,1) : herbe au nord et à l'ouest -> deux bords, et le coin NO est déjà
  // couvert : pas de coin. (2,1) : chemin au nord et à l'ouest, herbe en
  // diagonale NO -> le coin intérieur. (1,2) : même chose au nord-ouest.
  assert.deepEqual(resume(poses(escalier, 1, 1)), ['bord@0', 'bord@270'], 'angle rentrant de l\'herbe : les deux bords se croisent');
  assert.deepEqual(resume(poses(escalier, 2, 1)), ['coin@0'], 'la marche de l\'escalier reçoit son coin');
  assert.deepEqual(resume(poses(escalier, 1, 2)), ['coin@0'], 'et la marche d\'en dessous aussi');
  const coins = sceneDe([
    '.C.',
    'CCC',
    '.C.',
  ], LEGENDE);
  assert.deepEqual(resume(poses(coins, 1, 1)), ['coin@0', 'coin@90', 'coin@180', 'coin@270'], 'un croisement de deux chemins : quatre coins, NO-NE-SE-SO');
  assert.ok(poses(coins, 1, 1).every((p) => !p.miroir), 'un coin ne se retourne jamais : son miroir serait le coin d\'à côté');
  console.log('OK un coin intérieur par diagonale seule');
}

// --- 4. Même rang, ou rang absent : aucun bord ---------------------------------
{
  const parquet = sceneDe([
    '...',
    '.P.',
    '...',
  ], LEGENDE);
  assert.deepEqual(poses(parquet, 1, 1), [], 'le parquet n\'a pas de rang : son bord reste net');
  const terre = sceneDe([
    'TTT',
    'TCT',
    'TTT',
  ], LEGENDE);
  assert.deepEqual(poses(terre, 1, 1), [], 'la terre n\'a pas de rang (aucune carte n\'en pose, `Q-151`) : rien');
  // Deux surfaces de même rang, construites à la main.
  const egal = new Map([['tile_herbe', { rang: 2, bord: BORD, coin: COIN }], ['tile_chemin', { rang: 2, bord: BORD, coin: COIN }]]);
  const scene = sceneDe(['...', '.C.', '...'], LEGENDE);
  assert.deepEqual(lisieresCase(scene, 1, 1, () => false, egal), [], 'même rang : aucune lisière');
  assert.deepEqual(lisieresCase(scene, 1, 1, () => false, new Map()), [], 'sans table : aucune lisière');
  console.log('OK même rang ou rang absent : le bord reste net');
}

// --- 5. La SURFACE est comparée, jamais la tuile ------------------------------------
{
  // Un arbre posé sur l'herbe fait déborder l'herbe ; un arbre posé sur le
  // chemin reçoit, sous lui, le bord de l'herbe voisine.
  const scene = sceneDe([
    'CAC',
    'CCC',
    '.a.',
  ], LEGENDE);
  assert.deepEqual(resume(poses(scene, 1, 1)), ['bord@0', 'coin@180', 'coin@270'],
    'l\'arbre de la forêt (sur l\'herbe) domine le chemin au nord ; l\'herbe du sud touche en diagonale');
  assert.deepEqual(resume(poses(scene, 1, 2)), ['bord@90', 'bord@270'], 'l\'arbre à récolter est posé sur le chemin : il reçoit');
  console.log('OK la surface lue par tuileDeSol');
}

// --- 6. Le miroir : tiré par la position, stable, et varié ----------------------------
{
  const lignes = ['.'.repeat(40), 'C'.repeat(40), 'C'.repeat(40)];
  const scene = sceneDe(lignes, LEGENDE);
  const miroirs = Array.from({ length: 40 }, (_, x) => poses(scene, x, 1)[0].miroir);
  assert.deepEqual(Array.from({ length: 40 }, (_, x) => poses(scene, x, 1)[0].miroir), miroirs, 'le même tirage à chaque appel');
  const nbMiroirs = miroirs.filter(Boolean).length;
  assert.ok(nbMiroirs > 5 && nbMiroirs < 35, `les bords voisins ne portent pas tous le même dessin (${nbMiroirs}/40 en miroir)`);
  assert.notDeepEqual(Array.from({ length: 40 }, (_, x) => poses(sceneDe(lignes, LEGENDE, 8), x, 1)[0].miroir), miroirs,
    'une autre graine, un autre tirage');
  console.log(`OK le miroir d'un bord : ${nbMiroirs}/40, stable`);
}

// --- 7. La validation au démarrage refuse les entrées fautives -------------------------
{
  const avec = (modifier) => {
    const copie = structuredClone(donnees);
    modifier(copie);
    return validerCatalogues(copie);
  };
  const tuile = (d, id) => d.tiles.find((t) => t.id === id);
  assert.deepEqual(validerCatalogues(structuredClone(donnees)), [], 'le catalogue réel est valide');
  const cas = [
    ['rang nul', (d) => { tuile(d, 'tile_herbe').render.lisiere.rang = 0; }, /rang doit être un entier >= 1/],
    ['rang décimal', (d) => { tuile(d, 'tile_herbe').render.lisiere.rang = 2.5; }, /rang doit être un entier >= 1/],
    ['bord introuvable', (d) => { tuile(d, 'tile_herbe').render.lisiere.bord = 'visuel_absent'; }, /bord "visuel_absent" introuvable/],
    ['bord sans coin', (d) => { delete tuile(d, 'tile_herbe').render.lisiere.coin_interieur; }, /bord et coin_interieur vont ensemble/],
    ['dessin ancré en bas', (d) => { tuile(d, 'tile_herbe').render.lisiere.bord = 'visuel_grain_herbe'; }, /doit être ancré au centre/],
    ['tuile solide', (d) => { tuile(d, 'tile_mur_maison').render.lisiere = { rang: 2 }; }, /une tuile solide ne déborde pas/],
    ['tuile posée sur un sol', (d) => { tuile(d, 'tile_sortie').render.lisiere = { rang: 2 }; }, /c'est son sol qui déborde/],
    ['domine sans dessin', (d) => { tuile(d, 'tile_terre').render.lisiere = { rang: 2 }; }, /domine "tile_chemin".*sans bord/],
    ['pas un objet', (d) => { tuile(d, 'tile_chemin').render.lisiere = 3; }, /doit être un objet/],
    ['ombre sans bord', (d) => { tuile(d, 'tile_chemin').render.lisiere.ombre = structuredClone(tuile(d, 'tile_herbe').render.lisiere.ombre); }, /une ombre suit un bord/],
    ['ombre sans coin', (d) => { delete tuile(d, 'tile_herbe').render.lisiere.ombre.coin_interieur; }, /ombre > coin_interieur manquant/],
    ['ombre ancrée en bas', (d) => { tuile(d, 'tile_herbe').render.lisiere.ombre.bord = 'visuel_grain_herbe'; }, /ombre > bord "visuel_grain_herbe" doit être ancré au centre/],
    ['côté inconnu', (d) => { tuile(d, 'tile_herbe').render.lisiere.ombre.cotes = ['S', 'X']; }, /cotes doit être une liste/],
    ['côté en double', (d) => { tuile(d, 'tile_herbe').render.lisiere.ombre.cotes = ['S', 'S']; }, /cotes doit être une liste/],
    ['aucun côté', (d) => { tuile(d, 'tile_herbe').render.lisiere.ombre.cotes = []; }, /cotes doit être une liste/],
  ];
  for (const [nom, modifier, attendu] of cas) {
    const erreurs = avec(modifier);
    assert.ok(erreurs.some((e) => attendu.test(e) && e.includes('render.lisiere')), `${nom} : refusé (${JSON.stringify(erreurs)})`);
  }
  console.log(`OK ${cas.length} entrées fautives refusées au démarrage, avec le chemin`);
}

// --- 8. Le rayon d'influence : une lisière qui tient dans sa case n'ajoute rien --------
{
  for (const visuel of visuelsDesLisieres(table)) {
    const b = boiteDessin(visuel);
    assert.ok(b.minX >= -TILE / 2 && b.maxX <= TILE / 2 && b.minY >= -TILE / 2 && b.maxY <= TILE / 2,
      `${visuel.id} se dessine dans la case qui le reçoit (${JSON.stringify(b)})`);
  }
  const sansArbre = new Map();
  assert.equal(rayonInfluence({ visuelsTuiles: sansArbre, visuelsLisieres: visuelsDesLisieres(table), tileSize: TILE }), 0,
    'les lisières du catalogue ne peignent pas chez les voisines');
  // Un bord qui déborderait de 10 px vers le nord agrandit le rayon, tout seul
  // — et dans les quatre directions, puisqu'il se tourne.
  const debordant = { id: 'visuel_test', ancre: 'centre', primitives: [{ forme: 'rect', dx: 0, dy: -21, w: 32, h: 10, couleur: '#000' }] };
  assert.equal(rayonInfluence({ visuelsTuiles: sansArbre, visuelsLisieres: [debordant], tileSize: TILE }), 1,
    'un bord qui sort de sa case agrandit le rayon');
  console.log('OK le rayon d\'influence compte les lisières');
}

// --- 10. L'ombre (`D-202`) : des côtés FIXES à l'écran, et sous tous les bords ----------
{
  // La lumière se lit d'en haut : l'ombre ne tourne pas avec le bord. L'herbe
  // la déclare à l'est, au sud et à l'ouest ; au nord, le bord se pose sans elle.
  assert.deepEqual(registre.obtenir('tiles', 'tile_herbe').render.lisiere.ombre.cotes, ['E', 'S', 'O'],
    'le catalogue : pas d\'ombre au nord (Xav : « the path is on top of the north herbs »)');
  const ilot = sceneDe(['...', '.C.', '...'], LEGENDE);
  const liste = poses(ilot, 1, 1);
  assert.deepEqual(nommer(liste), ['ombre@90', 'ombre@180', 'ombre@270', 'bord@0', 'bord@90', 'bord@180', 'bord@270'],
    'les ombres des côtés déclarés, puis TOUS les bords : à un coin extérieur, une ombre ne couvre pas l\'herbe d\'à côté');
  for (const r of [90, 180, 270]) {
    const ombre = liste.find((p) => p.visuel === OMBRE && p.rotation === r);
    const bord = liste.find((p) => p.visuel === BORD && p.rotation === r);
    assert.equal(ombre.miroir, bord.miroir, `l'ombre suit le contour de son bord, miroir compris (${r}°)`);
  }
  const nord = sceneDe(['...', 'CCC', 'CCC'], LEGENDE);
  assert.deepEqual(nommer(poses(nord, 1, 1)), ['bord@0'], 'l\'herbe au nord : le bord, sans ombre');
  const sud = sceneDe(['CCC', 'CCC', '...'], LEGENDE);
  assert.deepEqual(nommer(poses(sud, 1, 1)), ['ombre@180', 'bord@180'], 'l\'herbe au sud : son ombre, puis son bord');
  const croisement = sceneDe(['.C.', 'CCC', '.C.'], LEGENDE);
  assert.deepEqual(nommer(poses(croisement, 1, 1)),
    ['ombre_coin@180', 'ombre_coin@270', 'coin@0', 'coin@90', 'coin@180', 'coin@270'],
    'un coin n\'a d\'ombre que si ses DEUX côtés en ont : SE et SO, jamais NO ni NE');
  // Une surface sans ombre déclarée : ses bords seuls, comme au palier D.
  const sansOmbre = new Map([...table].map(([id, e]) => [id, { ...e, ombre: null }]));
  assert.deepEqual(nommer(lisieresCase(ilot, 1, 1, () => false, sansOmbre)), ['bord@0', 'bord@90', 'bord@180', 'bord@270'],
    'sans `ombre`, aucune ombre');
  const toutes = visuelsDesLisieres(table);
  assert.ok(toutes.includes(OMBRE) && toutes.includes(OMBRE_COIN), 'le rayon d\'influence connaît aussi les ombres');
  console.log('OK l\'ombre : côtés fixes à l\'écran, sous les bords');
}

// --- 9. L'ordre dans une case : grain, lisières, objet (§4.3) --------------------------
{
  // Chaque couleur posée sur un contexte du calque, dans l'ordre. Les dessins
  // sont rejoués en vectoriel (instrument des tampons coupé) : tout passe par
  // le même contexte, donc tout se lit dans un seul journal.
  const journal = [];
  const faireCanvas = (largeur = 480, hauteur = 270) => {
    const canvas = { width: largeur, height: hauteur, style: {} };
    const ctx = new Proxy({}, {
      get(_, p) {
        if (p === 'canvas') return canvas;
        if (p === 'measureText') return () => ({ width: 10 });
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        return () => {};
      },
      set(_, p, v) {
        if (p === 'fillStyle' && typeof v === 'string') journal.push(v);
        return true;
      },
    });
    canvas.getContext = () => ctx;
    return canvas;
  };
  const documentAvant = global.document;
  const windowAvant = global.window;
  global.document = { createElement: () => faireCanvas(1, 1) };
  global.window = { devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080, addEventListener() {}, location: { search: '' } };
  try {
    definirTamponsActifs(false);
    // Une case : l'arbre à récolter, posé sur le chemin, l'herbe au SUD (le
    // côté où l'herbe pose son ombre, `D-202` : c'est elle qu'on suit ici).
    const scene = sceneDe(['a', '.'], LEGENDE);
    const visuelsTuiles = new Map(['tile_herbe', 'tile_chemin', 'tile_arbre'].map((id) => {
      const t = registre.obtenir('tiles', id);
      return [id, [t.render.visuel, ...(t.render.visuel_variantes || [])].map((v) => registre.obtenir('visuels', v))];
    }));
    const ctx = faireCanvas().getContext('2d');
    journal.length = 0;
    dessinerScene(ctx, {
      scene, decor: [], camera: { x: 0, y: 0 }, hero: { x: -500, y: -500 }, heroVisuel: registre.tous('visuels')[0],
      follet: null, estFlagActif: () => false, visuelsTuiles, lisieres: table,
    });
    const dernier = (c) => journal.lastIndexOf(c);
    const premier = (c) => journal.indexOf(c);
    const grainChemin = dernier('#9c8760');
    const ombreLisiere = premier('#3d3322');
    const feuillage = premier('#2a4a1f');
    assert.ok(grainChemin >= 0 && ombreLisiere >= 0 && feuillage >= 0, 'grain, lisière et arbre sont tous dessinés');
    assert.ok(grainChemin < ombreLisiere, 'la lisière passe SUR le grain du chemin');
    assert.ok(ombreLisiere < feuillage, 'et SOUS l\'arbre');
    console.log('OK l\'ordre d\'une case : grain, lisières, objet');
  } finally {
    definirTamponsActifs(true);
    invaliderCoucheStatique();
    global.document = documentAvant;
    global.window = windowAvant;
  }
}

console.log('OK test_lisieres');

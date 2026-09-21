// OUTIL DE DEV — jamais chargé par le jeu (`D-59`, file Nv.0 → Nv.10, T2).
//
// T2 demande « une liste de points candidats **posés à la main**, environ
// 3 fois le nombre d'objets présents », avec un **gradient** : dense le long
// du chemin et autour du Jardin, clairsemé au loin.
//
// Poser 40 coordonnées à la main dans un layout de 170 × 116 sans se tromper
// (une tuile solide, une tuile isolée par la forêt procédurale) n'est pas un
// travail d'humain. Cet outil PROPOSE la liste ; elle est ensuite écrite dans
// `data/scenes.json`, où elle devient une donnée ordinaire que Xav peut
// déplacer, retirer ou compléter point par point. Le jeu, lui, ne connaît que
// la liste : il ne recalcule jamais rien.
//
//   node tools/semer_points_ressources.mjs            (affiche)
//   node tools/semer_points_ressources.mjs --ecrire   (écrit dans scenes.json)
//
// Le gradient est un POIDS, pas une frontière : une tuile loin du chemin
// reste candidate, elle est seulement moins souvent retenue. C'est ce qui
// laisse au vétéran quelque chose à chercher.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { calculerTuilesAtteignables } from '../src/ground_items.js';
import { mulberry32 } from '../src/decor.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_ID = 'scene_maison_exterieur';

// Nombre de points candidats par objet présent. « Environ 3 fois » (T2) : en
// dessous, deux aubes de suite reposent les objets au même endroit et le
// tirage ne se voit pas ; bien au-dessus, la liste devient illisible à la
// main, ce qui lui ferait perdre son intérêt.
const CANDIDATS_PAR_OBJET = 3;

// Écartement minimal entre deux points candidats, en tuiles. Sans lui, le
// tirage pondéré empile les points sur les quelques tuiles les mieux notées,
// et « semi-aléatoire » redevient « toujours au même endroit ».
const ECART_MIN_TUILES = 4;

// Part des points FORCÉS au bord du chemin (≤ `BORD_CHEMIN_TUILES` d'une
// tuile de chemin). Le tirage pondéré seul ne le garantit pas : il penche
// vers le chemin, mais rien ne l'oblige à poser quoi que ce soit dessus, et
// une carte où la première branche est à six tuiles dans la forêt ne répond
// pas à « le débutant trouve en marchant ». C'est aussi ce qui rend le
// chemin critique jouable en ligne droite, donc vérifiable par un bot.
const PART_AU_BORD_DU_CHEMIN = 1 / 3;
const BORD_CHEMIN_TUILES = 2;

const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
if (erreurs.length) { console.error(erreurs); process.exit(1); }
const registre = construireRegistre(donnees);
const donneesScene = registre.obtenir('scenes', SCENE_ID);
const scene = chargerScene(registre, SCENE_ID);
const atteignables = calculerTuilesAtteignables(scene, donneesScene.spawn.x, donneesScene.spawn.y);

// --- Le gradient ----------------------------------------------------------
// Deux pôles : le CHEMIN (la bande de tuiles `tile_chemin`, qui traverse la
// carte d'ouest en est) et le JARDIN (sa zone). Le poids décroît avec la
// distance au plus proche des deux, et ne tombe jamais à zéro.
const tuilesChemin = [];
for (let ty = 0; ty < scene.height; ty += 1) {
  for (let tx = 0; tx < scene.width; tx += 1) {
    const t = scene.tuileA(tx, ty);
    if (t && t.id === 'tile_chemin') tuilesChemin.push([tx, ty]);
  }
}
const jardin = (donneesScene.zones || []).find((z) => z.type === 'jardin').rect;
const centreJardin = [jardin.x + jardin.w / 2, jardin.y + jardin.h / 2];

function distanceAuChemin(tx, ty) {
  let min = Infinity;
  for (const [cx, cy] of tuilesChemin) {
    const d = Math.abs(cx - tx) + Math.abs(cy - ty);
    if (d < min) min = d;
  }
  return min;
}

function poids(tx, ty) {
  const dChemin = distanceAuChemin(tx, ty);
  const dJardin = Math.hypot(tx - centreJardin[0], ty - centreJardin[1]);
  const d = Math.min(dChemin, dJardin);
  // Décroissance EXPONENTIELLE, et pas en 1/(1+d) : la carte compte bien
  // plus de tuiles lointaines que de tuiles proches (170 × 116 contre une
  // bande de trois rangées), et une décroissance douce se fait donc noyer
  // par le nombre — la première version de cet outil ne posait pas UN point
  // à moins de 8 tuiles du chemin. À 12 tuiles une tuile vaut ~37 % du bord,
  // à 36 ~5 %, jamais zéro : le lointain reste possible, seulement rare.
  return Math.exp(-d / 12);
}

function dansRect(tx, ty, r) { return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h; }

const resultat = {};
for (const item of registre.tous('items')) {
  if (!item.spawn) continue;
  const zonesOk = (donneesScene.zones || []).filter((z) => item.spawn.zones.includes(z.type));
  const zonesNon = (donneesScene.zones || []).filter((z) => (item.spawn.zones_exclues || []).includes(z.type));

  const candidats = [];
  for (let ty = 0; ty < scene.height; ty += 1) {
    for (let tx = 0; tx < scene.width; tx += 1) {
      if (!zonesOk.some((z) => dansRect(tx, ty, z.rect))) continue;
      if (zonesNon.some((z) => dansRect(tx, ty, z.rect))) continue;
      const tuile = scene.tuileA(tx, ty);
      if (!tuile || tuile.solid) continue;
      if (!atteignables.has(`${tx},${ty}`)) continue;
      candidats.push({ tx, ty, p: poids(tx, ty) });
    }
  }

  // Tirage pondéré sans remise, à graine FIXE : l'outil relancé deux fois
  // propose la même liste. Ce qui varie d'une aube à l'autre en jeu, c'est le
  // choix DANS la liste, pas la liste elle-même.
  // La graine mêle l'id de l'item : sans cela, branche et caillou reçoivent
  // EXACTEMENT la même liste (mêmes zones, même graine) et se retrouvent
  // toujours côte à côte.
  let hachageId = 0;
  for (let i = 0; i < item.id.length; i += 1) hachageId = (hachageId * 31 + item.id.charCodeAt(i)) >>> 0;
  const alea = mulberry32((donneesScene.seed ^ 0x5eed ^ hachageId) >>> 0);
  const vises = item.spawn.nb_au_sol * CANDIDATS_PAR_OBJET;
  const retenus = [];
  let restants = candidats;

  // Une passe pondérée, jouée deux fois : d'abord sur les seules tuiles du
  // bord du chemin (quota), puis sur toute la zone. Le quota n'est pas un
  // « au moins un point sympa » posé à côté du tirage : c'est le tirage
  // lui-même, restreint — le gradient continue de décider LESQUELLES.
  function tirer(source, combien) {
    let pool = source;
    while (retenus.length < combien && pool.length > 0) {
      const total = pool.reduce((s, c) => s + c.p, 0);
      let tir = alea() * total;
      let choisi = pool[pool.length - 1];
      for (const c of pool) { tir -= c.p; if (tir <= 0) { choisi = c; break; } }
      retenus.push([choisi.tx, choisi.ty]);
      const loin = (c) => Math.abs(c.tx - choisi.tx) + Math.abs(c.ty - choisi.ty) >= ECART_MIN_TUILES;
      pool = pool.filter(loin);
      restants = restants.filter(loin);
    }
  }

  const auBord = candidats.filter((c) => distanceAuChemin(c.tx, c.ty) <= BORD_CHEMIN_TUILES);
  tirer(auBord, Math.max(1, Math.round(vises * PART_AU_BORD_DU_CHEMIN)));
  tirer(restants, vises);
  resultat[item.id] = retenus.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const distances = retenus.map(([x, y]) => Math.min(distanceAuChemin(x, y), Math.hypot(x - centreJardin[0], y - centreJardin[1]))).sort((a, b) => a - b);
  console.log(
    `${item.id} : ${retenus.length} points pour ${item.spawn.nb_au_sol} objets · `
    + `distance au plus proche pôle (chemin ou Jardin) : `
    + `min ${distances[0].toFixed(0)}, médiane ${distances[Math.floor(distances.length / 2)].toFixed(0)}, `
    + `max ${distances[distances.length - 1].toFixed(0)} tuiles`
  );
}

if (process.argv.includes('--ecrire')) {
  // ÉCRITURE CHIRURGICALE, jamais `JSON.stringify` sur tout le fichier : la
  // première version de cet outil a réécrit `data/scenes.json` en entier et
  // produit 869 lignes de diff pour 21 points — exactement le reformatage
  // massif que le projet a déjà nommé une fois (commit `2d40ab3`,
  // `visuels.json`/`stats.json`). On insère un bloc de texte devant la clé
  // `layout` de la scène visée, et rien d'autre du fichier ne bouge.
  const chemin = path.join(RACINE, 'data', 'scenes.json');
  const source = await fs.readFile(chemin, 'utf8');

  const lignes = Object.entries(resultat)
    .map(([id, pts]) => `      "${id}": [${pts.map(([x, y]) => `[${x}, ${y}]`).join(', ')}]`)
    .join(',\n');
  const bloc = `    "points_ressources": {\n${lignes}\n    },\n`;

  // On vise la scène par son id — jamais le premier `"layout"` du fichier,
  // qui appartient à la Grotte.
  const debutScene = source.indexOf(`"id": "${SCENE_ID}"`);
  if (debutScene < 0) throw new Error(`${SCENE_ID} introuvable dans scenes.json`);

  const ancien = source.indexOf('    "points_ressources": {', debutScene);
  const MARQUE_FIN = '\n    },\n';
  let avecBloc;
  if (ancien >= 0) {
    const fin = source.indexOf(MARQUE_FIN, ancien) + MARQUE_FIN.length;
    avecBloc = source.slice(0, ancien) + bloc + source.slice(fin);
  } else {
    const posLayout = source.indexOf('    "layout":', debutScene);
    if (posLayout < 0) throw new Error('clé "layout" introuvable après la scène visée');
    avecBloc = source.slice(0, posLayout) + bloc + source.slice(posLayout);
  }

  JSON.parse(avecBloc); // témoin : on n'écrit jamais un JSON qu'on n'a pas relu
  await fs.writeFile(chemin, avecBloc, 'utf8');
  console.log(`\npoints_ressources écrits dans data/scenes.json (${SCENE_ID}), sans toucher au reste du fichier`);
} else {
  console.log('\n(essai à blanc — relancer avec --ecrire pour écrire dans data/scenes.json)');
  for (const [id, pts] of Object.entries(resultat)) {
    console.log(`  ${id} : ${pts.map(([x, y]) => `[${x},${y}]`).join(' ')}`);
  }
}

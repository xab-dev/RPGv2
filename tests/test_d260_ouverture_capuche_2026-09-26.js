// `D-260` — l'ouverture de la capuche, de côté (Xav, 26/09 : « dans ouest, il
// faudrait le décaler à gauche et la partie gauche du trou devrait donc
// logiquement ne pas être apparente » ; le globe « doit rester entier, il faut
// désigner qui est devant, le globe, et qui est derrière » ; « pas de liseret
// là où la capuche n'est plus apparente »).
//
// Contrats :
// 1. Le dessin : une pièce découpée l'est par le chemin même que sa
//    silhouette dessine dans cette direction (pliée, reflétée) ; le reste du
//    dessin n'est jamais découpé.
// 2. Les données du héros : l'ouverture (cavité, façade, halo) se découpe
//    d'un bloc, le globe jamais ; les vues de l'est restent le reflet de
//    celles de l'ouest.
// 3. Démarrage : une découpe sans silhouette à suivre, une silhouette
//    ambiguë, refusées.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIENTATIONS, poseDePiece } from '../src/orientation.js';
import { dessinerVisuel } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);
const OUVERTURE = ['cavite', 'facade', 'halo'];

// Un faux contexte qui tient sa transform comme un vrai (ce que rend
// `getTransform`, ce que reprend `setTransform`) et note, pour chaque
// remplissage, le chemin en coordonnées de l'écran et s'il est découpé.
function dessiner(orientation) {
  const pile = [];
  let m = [1, 0, 0, 1, 0, 0];
  let decoupe = null;
  let chemin = [];
  const remplissages = [];
  const decoupes = [];
  const mult = ([a, b, c, d, e, f]) => {
    const [A, B, C, D, E, F] = m;
    m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F];
  };
  const point = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]].map((n) => Math.round(n * 1e6) / 1e6);
  const ctx = new Proxy({}, {
    get(_, prop) {
      switch (prop) {
        case 'save': return () => pile.push([m, decoupe]);
        case 'restore': return () => { [m, decoupe] = pile.pop(); };
        case 'translate': return (x, y) => mult([1, 0, 0, 1, x, y]);
        case 'scale': return (x, y) => mult([x, 0, 0, y, 0, 0]);
        case 'rotate': return (r) => mult([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
        case 'transform': return (...t) => mult(t);
        case 'getTransform': return () => { const [a, b, c, d, e, f] = m; return { a, b, c, d, e, f }; };
        case 'setTransform': return (t, ...reste) => { m = typeof t === 'object' ? [t.a, t.b, t.c, t.d, t.e, t.f] : [t, ...reste]; };
        case 'beginPath': return () => { chemin = []; };
        case 'moveTo': case 'lineTo': return (x, y) => chemin.push(point(x, y));
        case 'clip': return () => { decoupe = JSON.stringify(chemin); decoupes.push(decoupe); };
        case 'fill': return () => remplissages.push({ chemin: JSON.stringify(chemin), decoupe });
        default: return () => ({ addColorStop() {} });
      }
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, HEROS, 10, 20, { orientation, echelle: 3, teinte: '#ff0000' });
  // L'ombre portée se remplit avant les primitives.
  return { remplissages: remplissages.slice(HEROS.ombre ? 1 : 0), decoupes };
}

// Les primitives dessinées dans une direction, dans l'ordre du dessin.
const dessinees = (o) => HEROS.primitives.filter((p) => {
  if (p.piece === undefined) return true;
  const pose = poseDePiece(HEROS, o, p.piece);
  return pose !== null && !(p.cachee && pose === undefined);
});

// --- 1. Le dessin --------------------------------------------------------------
const DECOUPEES = ORIENTATIONS.filter((o) => OUVERTURE.some((p) => poseDePiece(HEROS, o, p)?.decoupe));
assert.ok(DECOUPEES.length > 0, 'au moins une vue découpe son ouverture');
for (const o of ORIENTATIONS) {
  const { remplissages, decoupes } = dessiner(o);
  const primitives = dessinees(o);
  assert.equal(remplissages.length, primitives.length, `${o} : une primitive, un remplissage`);
  primitives.forEach((p, i) => {
    const piece = p.piece !== undefined ? poseDePiece(HEROS, o, p.piece)?.decoupe : undefined;
    if (!piece) {
      assert.equal(remplissages[i].decoupe, null, `${o} : primitive ${i} (${p.piece ?? 'sans pièce'}) jamais découpée`);
      return;
    }
    // Le chemin de la découpe est celui que la silhouette a rempli.
    const silhouette = primitives.findIndex((q) => q.piece === piece && q.silhouette);
    assert.ok(silhouette >= 0, `${o} : la silhouette de "${piece}" est dessinée`);
    assert.equal(remplissages[i].decoupe, remplissages[silhouette].chemin, `${o} : ${p.piece} découpée par la silhouette de "${piece}" telle qu'elle est dessinée`);
  });
  if (!DECOUPEES.includes(o)) assert.equal(decoupes.length, 0, `${o} : aucune découpe`);
}
console.log(`OK dessin : l'ouverture découpée par la silhouette dessinée de la capuche (${DECOUPEES.join(', ')}), rien d'autre`);

// --- 2. Les données du héros -------------------------------------------------------
{
  for (const o of ORIENTATIONS) {
    const decoupes = OUVERTURE.map((p) => poseDePiece(HEROS, o, p)?.decoupe);
    assert.ok(decoupes.every((d) => d === decoupes[0]), `${o} : l'ouverture (cavité, façade, halo) se découpe d'un bloc`);
    // Rouverte en hauteur (« on triche pareil +1% […] +2% »), d'un bloc aussi :
    // le liseré et sa lueur suivent le trou.
    const hauteurs = OUVERTURE.map((p) => poseDePiece(HEROS, o, p)?.echelle_y);
    assert.ok(hauteurs.every((h) => h === hauteurs[0]), `${o} : l'ouverture se rouvre en hauteur d'un bloc`);
    assert.equal(poseDePiece(HEROS, o, 'visage')?.decoupe, undefined, `${o} : le globe, devant, ne se découpe jamais`);
  }
  // `D-253` : une vue de l'est est le reflet de sa vue de l'ouest — pour
  // l'ouverture, qui ne se reflète pas (elle est symétrique), le centre de
  // chaque pièce et sa découpe.
  const centre = (o, piece) => {
    const pose = poseDePiece(HEROS, o, piece) || {};
    const p = HEROS.primitives.find((q) => q.piece === piece);
    const [e, a] = [pose.echelle ?? 1, ((pose.rotation ?? 0) * Math.PI) / 180];
    return [(pose.dx ?? 0) + e * (p.dx * Math.cos(a) - p.dy * Math.sin(a)), (pose.dy ?? 0) + e * (p.dx * Math.sin(a) + p.dy * Math.cos(a))];
  };
  for (const [ouest, est] of [['ouest', 'est'], ['sud_ouest', 'sud_est']]) {
    for (const piece of [...OUVERTURE, 'visage']) {
      if (!poseDePiece(HEROS, ouest, piece)) continue;
      const [[xo, yo], [xe, ye]] = [centre(ouest, piece), centre(est, piece)];
      assert.ok(Math.abs(xo + xe) < 0.01 && Math.abs(yo - ye) < 0.01, `${est} : ${piece} au reflet de ${ouest} (${xo.toFixed(3)} / ${xe.toFixed(3)})`);
      assert.equal(poseDePiece(HEROS, est, piece)?.decoupe, poseDePiece(HEROS, ouest, piece)?.decoupe, `${est} : ${piece} découpée comme dans ${ouest}`);
    }
  }
  console.log('OK données : l\'ouverture découpée d\'un bloc, le globe jamais, l\'est au reflet de l\'ouest');
}

// --- 3. Démarrage ------------------------------------------------------------------
{
  const refuse = (modifier, attendu, message) => {
    const copie = structuredClone(donnees);
    modifier(copie.visuels.find((v) => v.id === VISUEL_HEROS_ID));
    assert.ok(validerCatalogues(copie).some((e) => e.includes(attendu)), message);
  };
  const o = DECOUPEES[0];
  refuse((v) => { v.orientations[o].facade.decoupe = 'visage'; }, 'decoupe doit nommer', 'une découpe par une pièce sans silhouette, refusée');
  refuse((v) => { v.orientations[o].capuche.decoupe = 'capuche'; }, 'decoupe doit nommer', 'une pièce qui se découpe elle-même, refusée');
  refuse((v) => { v.orientations[o].capuche = null; }, 'est cachée dans cette direction', 'une découpe par une pièce cachée, refusée');
  refuse((v) => { v.primitives.filter((p) => p.piece === 'capuche')[1].silhouette = true; }, 'silhouette vaut true', 'deux silhouettes pour une pièce, refusées');
  refuse((v) => { v.primitives.find((p) => p.piece === 'facade').silhouette = true; }, 'silhouette vaut true', 'une silhouette qui n\'est pas un polygone, refusée');
  console.log('OK démarrage : une découpe sans silhouette à suivre, une silhouette ambiguë, refusées');
}

console.log('OK test_d260_ouverture_capuche');

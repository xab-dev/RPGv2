// `D-282` (hotfix, 26/09) — L'ANGLE ET L'ANIMATION DU HÉROS ARRIVENT AU DESSIN.
//
// Xav, 26/09, au joystick sur le jeu en ligne comme en local : « le personnage
// saute d'une position à l'autre, aucune transition même entre sud et
// sud_ouest ». Cause : `main.js` passait `heroAngle` et `heroAnimation` à
// `render.js#dessinerScene`, qui recopiait les options du héros champ par
// champ (ses paramètres, puis l'objet transmis au dessin de chaque élément) et
// n'avait jamais recopié ces deux-là — depuis `D-269`, le
// jeu dessinait les huit poses seules, sans souffle, sans pas, sans capuche en
// retard ; seuls les bancs les montraient. Le test de `D-269` cherchait le
// TEXTE `angle: scene.heroAngle` dans render.js : il était là, la valeur n'y
// arrivait jamais.
//
// Correctif de fond : `heroOptions`, les options de `dessinerVisuel` résolues
// par main.js, traversent render.js telles quelles.
//
// Ce test fait le trajet pour de vrai : `dessinerScene` sur un contexte qui
// enregistre ses ordres, le héros dessiné à deux angles (puis deux états
// d'animation) pour une même direction. Si l'angle (l'animation) arrive au
// dessin, les ordres diffèrent ; s'il se perd en route, ils sont identiques.
// Contrat, aucune valeur de réglage : on ne dit pas QUELS ordres, seulement
// qu'ils suivent ce qu'on passe.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dessinerScene, invaliderCoucheStatique } from '../src/render.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { chargerScene } from '../src/scene.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
const registre = construireRegistre(donnees);
const scene = chargerScene(registre, 'scene_maison_exterieur');
const heroVisuel = registre.obtenir('visuels', VISUEL_HEROS_ID);

// Un contexte qui enregistre chaque appel de méthode et ses arguments (même
// faux canvas que `test_defilement` : le rendu canvas n'est jamais exercé).
let journal = [];
const faireCanvas = (largeur = 480, hauteur = 270) => {
  const canvas = { width: largeur, height: hauteur, style: {} };
  const ctx = new Proxy({}, {
    get(_, p) {
      if (p === 'canvas') return canvas;
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return (...args) => { journal.push(`${String(p)}(${args.map((a) => (typeof a === 'number' ? a.toFixed(4) : typeof a)).join(',')})`); };
    },
    set: () => true,
  });
  canvas.getContext = () => ctx;
  return canvas;
};
const documentAvant = global.document;
const windowAvant = global.window;
global.document = { createElement: () => faireCanvas(1, 1) };
global.window = { devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080, addEventListener() {}, location: { search: '' } };
try {
  const ctx = faireCanvas().getContext('2d');
  const camera = { x: 1000, y: 800 };
  const ordres = (options) => {
    invaliderCoucheStatique();
    journal = [];
    dessinerScene(ctx, {
      scene, decor: [], camera, hero: { x: camera.x + 240, y: camera.y + 135, rayon: 10 }, heroVisuel, follet: null,
      estFlagActif: () => false, visuelsTuiles: new Map(), heroOptions: { teinte: '#ff6a3d', orientation: 'sud', ...options },
    });
    return journal.join('\n');
  };

  // Témoin : la même frame dessinée deux fois donne les mêmes ordres.
  assert.equal(ordres({ angle: 90 }), ordres({ angle: 90 }), 'le témoin est stable');
  // L'angle : entre sud (90°) et sud-ouest (135°), la direction du gameplay
  // reste « sud », l'angle affiché, lui, a tourné.
  assert.notEqual(ordres({ angle: 112 }), ordres({ angle: 90 }),
    'l\'angle affiché arrive au dessin du héros (sinon : huit poses, aucune transition)');
  // Sans angle (un appelant qui n'en a pas), rien ne change : la direction seule.
  assert.equal(ordres({}), ordres({ angle: null }), 'sans angle, la direction seule');
  console.log('OK dessinerScene : l\'angle du héros arrive au dessin');

  // L'animation : le souffle au repos et le pas en marche (spec 16, paliers C
  // à E) — deux instants d'horloge différents se dessinent différemment.
  const animation = (tempsMs, marche) => ({ tempsMs, marche, pasMs: tempsMs, cadence: 1, angle: 90, inertie: [] });
  assert.notEqual(ordres({ angle: 90, animation: animation(900, 1) }), ordres({ angle: 90, animation: animation(0, 1) }),
    'l\'animation arrive au dessin du héros (sinon : ni souffle, ni pas, ni capuche en retard)');
  console.log('OK dessinerScene : l\'animation du héros arrive au dessin');
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

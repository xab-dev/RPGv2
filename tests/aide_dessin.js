// Ce que partagent les tests du DESSIN des visuels (le héros surtout) : les
// catalogues validés, et trois faux contextes 2D. Pas un test : `run_tests.js`
// ne lance que les fichiers `test_*.js`.
//
// Pourquoi un module : dix tests du héros (spec 16, `D-252` à `D-279`)
// recopiaient chacun le chargement des catalogues et leur faux contexte, à la
// virgule près ou presque — spec 17, palier B. Le rendu canvas n'est jamais
// exercé par les tests : ces contextes notent ce que `dessinerVisuel` leur
// DEMANDE, jamais ce qu'un canvas en ferait. Aucun ne refait un calcul du
// dessin (règle : un harnais ne réimplémente jamais ce qu'il éprouve) ; celui
// qui tient la transform n'applique que l'algèbre du canvas lui-même.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dessinerVisuel } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

export const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Les catalogues du disque, validés comme au démarrage (un test qui partirait
// d'un catalogue refusé éprouverait un jeu qui ne démarre pas), et le héros.
export async function cataloguesValides() {
  const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
  assert.deepEqual(erreurs, []);
  assert.deepEqual(validerCatalogues(donnees), []);
  return { donnees, HEROS: donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID) };
}

// LES ORDRES : chaque appel, dans l'ordre, avec ses arguments. Un dégradé se
// crée, puis reçoit ses paliers ; un style posé se note par ce qu'il est, pas
// par son objet (ses paliers sont déjà notés à sa création). Deux dessins
// égaux ordre pour ordre sont le même dessin.
export function ordresDessin(visuel, options = {}, x = 10, y = 20) {
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      return (...args) => {
        appels.push([String(prop), ...args]);
        return String(prop).startsWith('create') ? { addColorStop: (...a) => appels.push(['addColorStop', ...a]) } : undefined;
      };
    },
    set(_, prop, valeur) { appels.push([`=${String(prop)}`, typeof valeur === 'object' ? '[dégradé]' : valeur]); return true; },
  });
  dessinerVisuel(ctx, visuel, x, y, options);
  return appels;
}

// LA GÉOMÉTRIE : un contexte qui tient sa transform (l'algèbre du canvas :
// translate, scale, rotate, transform, setTransform, save, restore) et rend,
// pour chaque remplissage, son chemin À L'ÉCRAN (arrondi à `precision`) et la
// découpe active, elle aussi à l'écran. Rend `{ remplissages, decoupes }`.
export function geometrieDessin(visuel, options = {}, { x = 0, y = 0, precision = 1e4 } = {}) {
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
  const point = (px, py) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]].map((n) => Math.round(n * precision) / precision);
  const ctx = new Proxy({}, {
    get(_, prop) {
      switch (prop) {
        case 'save': return () => pile.push([m, decoupe]);
        case 'restore': return () => { [m, decoupe] = pile.pop(); };
        case 'translate': return (tx, ty) => mult([1, 0, 0, 1, tx, ty]);
        case 'scale': return (sx, sy) => mult([sx, 0, 0, sy, 0, 0]);
        case 'rotate': return (r) => mult([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
        case 'transform': return (...t) => mult(t);
        case 'getTransform': return () => { const [a, b, c, d, e, f] = m; return { a, b, c, d, e, f }; };
        case 'setTransform': return (t, ...reste) => { m = typeof t === 'object' ? [t.a, t.b, t.c, t.d, t.e, t.f] : [t, ...reste]; };
        case 'beginPath': return () => { chemin = []; };
        case 'moveTo': case 'lineTo': return (px, py) => chemin.push(point(px, py));
        case 'clip': return () => { decoupe = JSON.stringify(chemin); decoupes.push(decoupe); };
        case 'fill': return () => remplissages.push({ chemin: JSON.stringify(chemin), decoupe });
        default: return () => ({ addColorStop() {} });
      }
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, visuel, x, y, options);
  return { remplissages, decoupes };
}

// L'OPACITÉ : chaque appel, avec l'alpha du moment (`[méthode, alpha, ...args]`)
// et, en propriété `style`, le style de remplissage du moment — tous deux
// suivent `save`/`restore` comme sur un canvas. Pour éprouver ce qui
// s'efface, se couvre ou baisse d'éclat.
export function opacitesDessin(visuel, options = {}) {
  let alpha = 1;
  let style = null;
  const pile = [];
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'globalAlpha') return alpha;
      if (prop === 'getTransform') return () => ({});
      return (...args) => {
        if (prop === 'save') pile.push([alpha, style]);
        if (prop === 'restore') [alpha, style] = pile.pop();
        appels.push(Object.assign([String(prop), alpha, ...args], { style }));
        return String(prop).startsWith('create') ? { addColorStop: () => {} } : undefined;
      };
    },
    set(_, prop, valeur) {
      if (prop === 'globalAlpha') alpha = valeur;
      if (prop === 'fillStyle') style = valeur;
      return true;
    },
  });
  dessinerVisuel(ctx, visuel, 0, 0, options);
  return appels;
}

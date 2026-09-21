// `D-113` — palier C, 2ᵉ levier : `grain_sol`.
//
// Le levier coupe la liste des primitives du visuel de grain d'une tuile NON
// SOLIDE, par la fin — convention écrite dans le schéma des tuiles : les
// primitives d'un grain sont rangées par importance décroissante. À zéro, la
// tuile sort de la table que `render.js` reçoit : le rendu ne la cherche même
// plus, donc elle ne coûte plus rien. La couleur de base ne bouge jamais (le
// sol perd son grain, jamais sa surface), et une tuile SOLIDE n'est pas
// touchée : sa silhouette *est* le monde (§4.3).
//
// Ce fichier n'épingle aucun nombre du catalogue (`D-52`) : il éprouve des
// relations (moins de primitives en Bas qu'en Moyen), une identité (Moyen
// rend le visuel du catalogue tel quel), un préfixe (on coupe par la fin,
// jamais au hasard) et une immunité (les solides).
//
// Il interroge la VRAIE table construite par l'orchestrateur, jamais une
// recopie de la règle à côté (`D-72`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { appliquerGrainSol, valeurLevier } from '../src/qualite.js';
import { creerOrchestrateurGrotte, resoudreGraphismes } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

const config = registre.obtenir('graphismes', 'graphismes_presets');
const PRESETS = config.paliers.filter((p) => p.leviers !== undefined).map((p) => p.id);
const fraction = (preset) => valeurLevier(config, preset, 'grain_sol');

// --- 1. La fonction pure : couper par la fin, jamais au hasard ------------
{
  const visuel = { id: 'x', primitives: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
  assert.equal(appliquerGrainSol(visuel, 1), visuel, 'à 1, le visuel du catalogue est rendu tel quel');
  assert.equal(appliquerGrainSol(visuel, 0), null, 'à 0, il ne reste rien du tout');

  const moitie = appliquerGrainSol(visuel, 0.5);
  assert.deepEqual(moitie.primitives, [1, 2, 3, 4, 5], 'la moitié gardée est le PRÉFIXE, pas un échantillon');
  assert.equal(visuel.primitives.length, 10, 'le catalogue n\'est jamais muté');

  // Monotone : plus la fraction monte, plus il reste de primitives.
  let precedent = -1;
  for (const f of [0, 0.1, 0.2, 0.5, 0.8, 1]) {
    const sortie = appliquerGrainSol(visuel, f);
    const n = sortie === null ? 0 : sortie.primitives.length;
    assert.ok(n >= precedent, `la fraction ${f} ne peut pas rendre moins que la précédente`);
    precedent = n;
  }
  // Un visuel sans primitives (une silhouette d'un autre genre) traverse sans
  // être touché : la fonction ne suppose rien de ce qu'elle ne connaît pas.
  const sansPrimitives = { id: 'y' };
  assert.equal(appliquerGrainSol(sansPrimitives, 0), sansPrimitives);
  console.log('OK appliquerGrainSol : préfixe, monotone, sans mutation');
}

// --- 2. `0.2` rend bien « trois brins au lieu de quatorze » ---------------
// Le repli prêt de `Q-55`, éprouvé sur le VRAI grain de l'herbe : si la
// convention d'arrondi changeait, la porte de sortie de Xav changerait avec.
{
  const herbe = registre.obtenir('visuels', 'visuel_grain_herbe');
  const allege = appliquerGrainSol(herbe, 0.2);
  assert.ok(allege !== null, 'à 0,2 il reste du grain');
  assert.ok(
    allege.primitives.length > 0 && allege.primitives.length < herbe.primitives.length,
    'nettement moins de brins, mais pas zéro',
  );
  assert.deepEqual(
    allege.primitives, herbe.primitives.slice(0, allege.primitives.length),
    'et ce sont les premiers brins du catalogue, ceux que la convention dit importants',
  );
  console.log(`OK Q-55 : 0,2 laisse ${allege.primitives.length} primitives sur ${herbe.primitives.length}`);
}

// --- 3. La vraie table, par preset ----------------------------------------
function faireCanvas() {
  const canvas = { width: 480, height: 270, style: {} };
  const ctx = new Proxy({}, {
    get(_, p) {
      if (p === 'canvas') return canvas;
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return () => {};
    },
    set: () => true,
  });
  canvas.getContext = () => ctx;
  return { canvas, ctx };
}

const documentAvant = global.document;
const windowAvant = global.window;
global.document = { createElement: () => faireCanvas().canvas };
global.window = { devicePixelRatio: 1, addEventListener() {}, location: { search: '' } };

function tableDesGrains(preset) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  const logique = faireCanvas();
  const visible = faireCanvas();
  return creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false,
      traiterInput() {},
      ouvrir() {},
      ouvrirCraft() {},
      rafraichirCraft() {},
      ouvrirCoffre() {},
      rafraichirCoffre() {},
      rafraichirStats() {},
    },
    input: {
      maj: () => null,
      tactileActif: () => false,
      peripheriqueActif: () => 'manette',
    },
    ctxLogique: logique.ctx,
    ctxVisible: visible.ctx,
    canvasLogique: logique.canvas,
    graphismes: resoudreGraphismes(registre, save, null, `?qualite=${preset}`),
  }).obtenirVisuelsTuiles();
}

try {
  const tuiles = registre.tous('tiles').filter((t) => t.render && t.render.visuel);
  const solides = tuiles.filter((t) => t.solid);
  const sols = tuiles.filter((t) => !t.solid);
  assert.ok(solides.length > 0 && sols.length > 0, 'le catalogue doit avoir des deux, sinon rien n\'est prouvé');

  const tables = Object.fromEntries(PRESETS.map((p) => [p, tableDesGrains(p)]));

  // a) Moyen = l'état actuel : la table est celle du catalogue, entrée pour
  //    entrée, sans une primitive de moins.
  for (const t of tuiles) {
    assert.deepEqual(
      tables.moyen.get(t.id), registre.obtenir('visuels', t.render.visuel),
      `${t.id} : sous Moyen, le visuel du catalogue, tel quel`,
    );
  }

  // b) Les tuiles SOLIDES ne bougent dans AUCUN preset.
  for (const preset of PRESETS) {
    for (const t of solides) {
      assert.deepEqual(
        tables[preset].get(t.id), registre.obtenir('visuels', t.render.visuel),
        `${t.id} est solide : sa silhouette EST le monde, "${preset}" n'y touche pas`,
      );
    }
  }

  // c) Bas retire le grain des sols — et les sort de la table, pour que le
  //    rendu ne les cherche même plus.
  for (const t of sols) {
    assert.equal(tables.bas.has(t.id), false, `${t.id} : en Bas, plus de grain du tout, et plus d'entrée`);
  }

  // d) L'ordre, en relation plutôt qu'en nombres.
  const primitives = (table) => sols.reduce(
    (n, t) => n + (table.has(t.id) ? table.get(t.id).primitives.length : 0), 0,
  );
  assert.ok(primitives(tables.bas) < primitives(tables.moyen), 'Bas dessine moins de grain que Moyen');
  assert.ok(primitives(tables.haut) >= primitives(tables.moyen), 'Haut n\'en dessine jamais moins que Moyen');
  assert.ok(fraction('bas') < fraction('moyen'), 'et le catalogue dit bien la même chose');

  console.log(
    `OK table réelle : ${primitives(tables.bas)} primitives de sol en Bas, `
    + `${primitives(tables.moyen)} en Moyen, ${primitives(tables.haut)} en Haut `
    + `(${solides.length} tuiles solides intouchées)`,
  );
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

// --- 4. La couleur de base ne bouge jamais --------------------------------
// Le levier retire un grain, pas une surface : si cette ligne tombait, Bas
// rendrait des trous noirs là où il doit rendre un aplat.
{
  for (const t of registre.tous('tiles')) {
    assert.equal(typeof t.render.valeur, 'string', `${t.id} garde une couleur de base`);
  }
  console.log('OK la couleur de base des tuiles est hors du levier');
}

console.log('--- D-113 : le grain du sol s\'allège, le monde ne bouge pas.');

// `D-114` — palier C, 3ᵉ levier : `densite_decor`.
//
// Le levier multiplie la `densite` déclarée par la scène. Le point délicat
// n'est pas la quantité, c'est l'INCLUSION : un caillou présent en Bas doit
// être au même endroit en Moyen et en Haut, faute de quoi le décor se
// réarrangerait à chaque changement de réglage — visible, gratuit, et le
// contraire de ce qu'un réglage graphique promet.
//
// CE QUI A ÉTÉ VÉRIFIÉ À LA CAUSE, comme la spec le demandait. `genererDecor`
// tire bien ses nombres en séquence, mais **chaque itération consomme un
// nombre CONSTANT de tirages** : réduire le compte ne décale donc rien, il
// tronque. Le décor réduit est exactement le PRÉFIXE du décor complet. Il n'y
// avait rien à corriger — il y avait un contrat implicite à rendre explicite,
// et c'est ce fichier qui le tient : si quelqu'un ajoute un jour un tirage
// conditionnel dans cette boucle, c'est ici que ça tombera, et pas sous les
// yeux de Xav.
//
// (Le remède suggéré par la spec — un tirage par tuile comparé à un seuil —
// aurait, lui, déplacé TOUS les motifs de la Maison, y compris sous Moyen :
// une régression visible au nom d'un défaut qui n'existe pas.)
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { valeurLevier } from '../src/qualite.js';
import { genererDecor } from '../src/decor.js';
import { chargerScene } from '../src/scene.js';
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
const densite = (preset) => valeurLevier(config, preset, 'densite_decor');

// --- 1. Le multiplicateur, sur la vraie scène Maison ----------------------
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  assert.ok(scene.decor && scene.decor.densite > 0, 'la Maison déclare bien un décor');

  const plein = genererDecor(scene, 1);
  assert.deepEqual(genererDecor(scene), plein, 'sans multiplicateur, rien ne change : le défaut est 1');
  assert.ok(plein.length > 0, 'et elle en produit');
  assert.deepEqual(genererDecor(scene, 0), [], 'à zéro, plus un motif');

  // Monotone, et proportionnel à ce que la scène déclare.
  let precedent = -1;
  for (const m of [0, 0.25, 0.5, 1, 2]) {
    const n = genererDecor(scene, m).length;
    assert.ok(n >= precedent, `multiplicateur ${m} : jamais moins de motifs que le précédent`);
    precedent = n;
  }
  console.log(`OK densité : 0 → 0, 1 → ${plein.length} motifs sur la Maison`);
}

// --- 2. L'INCLUSION, et le contrat qui la rend vraie ----------------------
// C'est le cœur du ticket. On l'éprouve deux fois : comme un PRÉFIXE (ce que
// la mécanique garantit) et comme une INCLUSION d'ensembles (ce que la spec
// demande, et qui resterait vrai même si la mécanique changeait de forme).
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  const cle = (m) => `${m.visuel}@${m.x},${m.y},${m.rotation}`;

  const paliers = [0, 0.25, 0.5, 1, 2];
  for (let i = 1; i < paliers.length; i += 1) {
    const petit = genererDecor(scene, paliers[i - 1]);
    const grand = genererDecor(scene, paliers[i]);
    assert.deepEqual(
      grand.slice(0, petit.length), petit,
      `densité ${paliers[i - 1]} → ${paliers[i]} : le petit décor est le PRÉFIXE du grand`,
    );
    const dansLeGrand = new Set(grand.map(cle));
    for (const motif of petit) {
      assert.ok(dansLeGrand.has(cle(motif)), `le motif ${cle(motif)} doit rester au MÊME endroit`);
    }
  }

  // Le même constat, énoncé sur la mécanique elle-même : chaque motif coûte
  // le même nombre de tirages. C'est ce qui casserait si quelqu'un ajoutait
  // un tirage conditionnel dans la boucle.
  const un = genererDecor(scene, 1);
  const deux = genererDecor(scene, 2);
  assert.ok(deux.length > un.length, 'le scénario doit bien comparer deux tailles différentes');
  assert.deepEqual(deux.slice(0, un.length), un, 'doubler la densité AJOUTE, ça ne redistribue pas');
  console.log(`OK inclusion prouvée sur ${paliers.length} densités de la scène Maison`);
}

// --- 3. Le vrai décor du jeu, preset par preset ---------------------------
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

function decorDuJeu(preset) {
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
  }).obtenirDecor();
}

try {
  const decors = Object.fromEntries(PRESETS.map((p) => [p, decorDuJeu(p)]));
  const scene = chargerScene(registre, 'scene_maison_exterieur');

  // a) Moyen = l'état actuel : exactement le décor d'avant le ticket.
  assert.equal(
    decors.moyen.length, genererDecor(scene).length,
    'sous Moyen, la Maison a très exactement le décor qu\'elle avait',
  );

  // b) Bas ⊂ Moyen ⊂ Haut, sur le décor RÉEL du jeu (visuels résolus compris).
  const cle = (m) => `${m.visuel.id}@${m.x},${m.y}`;
  const ordonnes = ['bas', 'moyen', 'haut'].filter((p) => PRESETS.includes(p));
  for (let i = 1; i < ordonnes.length; i += 1) {
    const petit = decors[ordonnes[i - 1]];
    const grand = decors[ordonnes[i]];
    assert.ok(petit.length <= grand.length, `${ordonnes[i - 1]} n'a jamais plus de motifs que ${ordonnes[i]}`);
    const dansLeGrand = new Set(grand.map(cle));
    for (const motif of petit) {
      assert.ok(dansLeGrand.has(cle(motif)), `${cle(motif)} : même endroit en "${ordonnes[i]}"`);
    }
  }
  assert.equal(decors.bas.length, 0, 'Bas retire le décor (décision 2 de Xav)');
  assert.ok(densite('bas') < densite('moyen'), 'et le catalogue dit la même chose');

  console.log(
    `OK décor réel : ${decors.bas.length} motifs en Bas, ${decors.moyen.length} en Moyen, `
    + `${decors.haut.length} en Haut — Bas ⊂ Moyen ⊂ Haut`,
  );
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

console.log('--- D-114 : la densité du décor est un réglage, et le décor ne se réarrange pas.');

// `D-278` — l'œil passe DERRIÈRE la capuche au lieu de s'éteindre (Xav,
// 26/09 : « l'œil dépasse de la capuche et garde sa forme entière pour
// accentuer l'effet 3D » ; « si on le voit, il brille toujours » ; le rideau
// « devrait arriver en fondu »).
//
// Contrats :
// 1. Poses : entre une clé où une pièce `passe_derriere` se voit et une clé où
//    elle est cachée, elle garde son éclat (alpha 1) et reçoit un `rideau`
//    entre 0 et 1. Une pièce ordinaire, elle, s'efface toujours.
// 2. Dessin : sous le `debut` de son rideau, la pièce se dessine telle
//    quelle, sans découpe ; au-delà, chaque primitive se dessine en anneaux
//    (le bord en fondu), du plus effacé au plein éclat — jamais deux fois au
//    même endroit (chaque anneau a sa découpe). Sans fondu, un seul dessin.
//    Une pièce qui en suit une autre sans passer derrière elle-même (la
//    lueur) s'éteint avec le rideau, comme avant.
// 3. Démarrage : un `passe_derriere` mal formé est refusé.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIENTATIONS } from '../src/orientation.js';
import { dessinerVisuel } from '../src/visuels.js';
import { definitionPiece, poseVisible, poseAAngle } from '../src/poses.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);
const PAS = 360 / ORIENTATIONS.length;

// Une clé où l'œil se voit, voisine d'une clé où il est caché, hors reflet.
const DERRIERE = Object.keys(HEROS.pieces).filter((p) => HEROS.pieces[p].passe_derriere);
assert.ok(DERRIERE.length > 0, 'au moins une pièce passe derrière');
const piece = DERRIERE[0];
const i = ORIENTATIONS.findIndex((o, k) => poseVisible(HEROS, o, piece) != null && !HEROS.reflets[o]
  && poseVisible(HEROS, ORIENTATIONS[(k + 1) % ORIENTATIONS.length], piece) === null);
assert.ok(i >= 0, `${piece} : une clé visible voisine d'une clé cachée`);
const reglage = definitionPiece(HEROS, piece).passe_derriere;
const debut = reglage === true ? 0 : reglage.debut ?? 0;
const fondu = reglage === true ? 0 : reglage.fondu ?? 0;

// --- 1. Les poses ------------------------------------------------------------------
{
  for (const t of [0.25, 0.5, 0.75]) {
    const pose = poseAAngle(HEROS, (i + t) * PAS, piece);
    assert.ok(pose.rideau > 0 && pose.rideau < 1 && (pose.alpha ?? 1) === 1, `${piece} à ${(i + t) * PAS}° : couvert en partie, l'éclat intact`);
  }
  const ordinaire = Object.keys(HEROS.pieces).find((p) => !HEROS.pieces[p].passe_derriere && !HEROS.pieces[p].suit
    && poseVisible(HEROS, ORIENTATIONS[i], p) != null && poseVisible(HEROS, ORIENTATIONS[(i + 1) % ORIENTATIONS.length], p) === null);
  if (ordinaire) {
    const pose = poseAAngle(HEROS, (i + 0.5) * PAS, ordinaire);
    assert.ok(pose.alpha > 0 && pose.alpha < 1 && pose.rideau === undefined, `${ordinaire} : une pièce ordinaire s'efface toujours`);
  }
  console.log(`OK poses : ${piece} passe derrière (rideau, éclat intact)${ordinaire ? `, ${ordinaire} s'efface` : ''}`);
}

// --- 2. Le dessin ------------------------------------------------------------------
// Un faux contexte qui note chaque appel et l'opacité à chaque dessin.
function ordres(visuel, angle) {
  const appels = [];
  let alpha = 1;
  const pile = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'globalAlpha') return alpha;
      if (prop === 'getTransform') return () => ({});
      return (...args) => {
        if (prop === 'save') pile.push(alpha);
        if (prop === 'restore') alpha = pile.pop();
        appels.push([String(prop), alpha, ...args]);
        return String(prop).startsWith('create') ? { addColorStop: () => {} } : undefined;
      };
    },
    set(_, prop, valeur) { if (prop === 'globalAlpha') alpha = valeur; return true; },
  });
  dessinerVisuel(ctx, visuel, 0, 0, { angle });
  return appels;
}
// Les découpes en anneau (`evenodd`) : une par anneau dessiné.
const anneaux = (appels) => appels.filter((a) => a[0] === 'clip' && a[2] === 'evenodd').length;
const primitivesPiece = HEROS.primitives.filter((p) => p.piece === piece).length;
{
  const avant = debut > 0 ? (i + debut / 2) * PAS : null;
  if (avant !== null) assert.equal(anneaux(ordres(HEROS, avant)), 0, `sous le début du rideau (${avant}°), ${piece} se dessine sans découpe`);
  const pendant = (i + debut + (1 - debut) / 2) * PAS;
  const attendus = primitivesPiece * (fondu > 0 ? 5 : 1);
  assert.ok(anneaux(ordres(HEROS, Math.round(pendant))) >= attendus, `à ${pendant}°, ${piece} en anneaux (${attendus} attendus)`);
  // Sans fondu : un seul dessin par primitive.
  const net = structuredClone(HEROS);
  net.pieces[piece].passe_derriere = true;
  assert.equal(anneaux(ordres(net, Math.round((i + 0.5) * PAS))), primitivesPiece, 'sans fondu, un dessin par primitive');
  // Le fondu : du plus effacé au plein éclat, dans l'ordre des anneaux.
  const lisse = structuredClone(HEROS);
  lisse.pieces[piece].passe_derriere = { debut: 0, fondu: 1 };
  const appels = ordres(lisse, Math.round((i + 0.5) * PAS));
  const alphas = appels.filter((a) => a[0] === 'clip' && a[2] === 'evenodd').slice(0, 5).map((a) => a[1]);
  const alphasDessin = [];
  let k = appels.findIndex((a) => a[0] === 'clip' && a[2] === 'evenodd');
  while (alphasDessin.length < 5 && k < appels.length) {
    const suivant = appels.findIndex((a, j) => j > k && a[0] === 'restore');
    const dessin = appels.slice(k, suivant).find((a) => ['fill', 'arc', 'ellipse'].includes(a[0]) && a[0] === 'fill');
    if (dessin) alphasDessin.push(dessin[1]);
    k = appels.findIndex((a, j) => j > suivant && a[0] === 'clip' && a[2] === 'evenodd');
    if (k < 0) break;
  }
  assert.equal(alphas.length, 5, 'le premier dessin passe par cinq anneaux');
  assert.ok(alphasDessin.every((a, j) => j === 0 || a > alphasDessin[j - 1]) && alphasDessin.at(-1) === 1,
    `les anneaux, du plus effacé au plein éclat (${alphasDessin.map((a) => a.toFixed(2))})`);
  console.log(`OK dessin : ${piece} sans découpe avant le rideau, puis en anneaux du plus effacé au plein éclat`);
}
{
  // La lueur suit l'ouverture ; si l'ouverture passe derrière, la lueur, qui
  // ne passe pas derrière elle-même, s'éteint.
  const suiveuse = Object.keys(HEROS.pieces).find((p) => HEROS.pieces[p].suit);
  if (suiveuse) {
    const suivie = HEROS.pieces[suiveuse].suit;
    const essai = structuredClone(HEROS);
    essai.pieces[suivie].passe_derriere = { debut: 0, fondu: 0 };
    const pose = poseAAngle(essai, (i + 0.5) * PAS, suivie);
    if (pose && pose.rideau > 0) {
      const couleur = essai.primitives.find((p) => p.piece === suiveuse);
      const appels = ordres(essai, Math.round((i + 0.5) * PAS));
      assert.ok(appels.some((a) => a[0] === 'fill' && a[1] > 0 && a[1] < 1), `${suiveuse} : s'éteint avec le rideau de ${suivie}`);
      assert.ok(couleur, `${suiveuse} porte une primitive`);
    }
    console.log(`OK ${suiveuse} : suit ${suivie} sans passer derrière — elle s'éteint`);
  }
}

// --- 3. Le démarrage ---------------------------------------------------------------
{
  const refuse = (valeur, message) => {
    const copie = structuredClone(donnees);
    copie.visuels.find((v) => v.id === VISUEL_HEROS_ID).pieces[piece].passe_derriere = valeur;
    const trouvees = validerCatalogues(copie);
    assert.ok(trouvees.some((e) => e.includes(`pieces > ${piece}`)), `${message} (${trouvees.join(' | ') || 'aucune erreur'})`);
  };
  refuse(false, 'faux n\'est pas une valeur (on retire la clé)');
  refuse({ debut: 1 }, 'un début à 1 ne laisserait jamais passer le rideau');
  refuse({ debut: -0.1 }, 'un début négatif');
  refuse({ fondu: -1 }, 'un fondu négatif');
  refuse({ vitesse: 2 }, 'une clé inconnue');
  console.log('OK démarrage : un passe_derriere mal formé, refusé');
}

console.log('OK test_d278_oeil_derriere');

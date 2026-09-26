// `D-279` — la lueur de l'œil sur la cape suit l'épaule et brille de ce qu'on
// voit de l'œil (Xav, 26/09 : « le halo projeté sur la cape […] n'est pas
// présent sur l'épaule à 221° » ; « à partir de ~188° il devrait suivre
// l'épaule » ; puis, au banc : « si 221° = 18 % alors → 28 % »).
//
// Contrats :
// 1. Une pièce `source` (une lumière projetée) brille pleinement tant que sa
//    source n'est pas couverte, s'assombrit à mesure que le rideau de la
//    source avance — un peu moins vite qu'elle —, et ne se dessine pas là où
//    la source est cachée.
// 2. Démarrage : une source qui n'est pas une autre pièce portée est refusée.
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

const lumiere = Object.keys(HEROS.pieces).find((p) => HEROS.pieces[p].source);
assert.ok(lumiere, 'le héros a une lumière projetée');
const source = HEROS.pieces[lumiere].source;

// L'opacité à laquelle se remplit la lumière, à un angle ; `null` si elle ne
// se dessine pas. On la reconnaît à sa primitive, rendue seule reconnaissable.
const TEMOIN = '#123457';
const essai = structuredClone(HEROS);
essai.primitives.filter((p) => p.piece === lumiere).forEach((p) => { p.degrade = undefined; p.forme = 'cercle'; p.couleur = TEMOIN; delete p.teinte; });
function opacite(angle) {
  let alpha = 1, style = null, vue = null;
  const pile = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'globalAlpha') return alpha;
      if (prop === 'getTransform') return () => ({});
      return () => {
        if (prop === 'save') pile.push(alpha);
        if (prop === 'restore') alpha = pile.pop();
        if (prop === 'fill' && style === TEMOIN) vue = alpha;
        return prop.startsWith?.('create') ? { addColorStop: () => {} } : undefined;
      };
    },
    set(_, prop, valeur) { if (prop === 'globalAlpha') alpha = valeur; if (prop === 'fillStyle') style = valeur; return true; },
  });
  dessinerVisuel(ctx, essai, 0, 0, { angle });
  return vue;
}

// --- 1. L'éclat ---------------------------------------------------------------------
{
  const i = ORIENTATIONS.findIndex((o, k) => poseVisible(HEROS, o, source) != null && !HEROS.reflets[o]
    && poseVisible(HEROS, ORIENTATIONS[(k + 1) % ORIENTATIONS.length], source) === null);
  assert.ok(i >= 0, `${source} : une clé visible voisine d'une clé cachée`);
  const cle = ORIENTATIONS[i];
  assert.equal(opacite(i * PAS), 1, `${cle} : la source entière, la lumière pleine`);
  // Là où le rideau de la source a avancé : plus sombre que pleine, plus
  // claire que la part visible de la source.
  const reglage = definitionPiece(HEROS, source).passe_derriere;
  const debut = reglage && reglage !== true ? reglage.debut ?? 0 : 0;
  let precedente = 1;
  for (const t of [0.6, 0.75, 0.9]) {
    const angle = Math.round((i + t) * PAS);
    const rideau = poseAAngle(HEROS, angle, source).rideau;
    const visible = 1 - Math.max(0, (rideau - debut) / (1 - debut));
    const vue = opacite(angle);
    assert.ok(vue !== null && vue < precedente && vue < 1, `${angle}° : la lumière baisse avec la source (${vue})`);
    if (visible > 0 && visible < 1) assert.ok(vue > visible, `${angle}° : un peu moins vite que la source ne se couvre (${vue.toFixed(2)} > ${visible.toFixed(2)})`);
    precedente = vue;
  }
  const cachee = ORIENTATIONS[(i + 1) % ORIENTATIONS.length];
  assert.equal(opacite((i + 1) * PAS), null, `${cachee} : la source cachée, la lumière ne se dessine pas`);
  console.log(`OK ${lumiere} : brille de ce qu'on voit de ${source}, s'éteint avec elle`);
}

// --- 2. Le démarrage ---------------------------------------------------------------
{
  const refuse = (valeur, message) => {
    const copie = structuredClone(donnees);
    copie.visuels.find((v) => v.id === VISUEL_HEROS_ID).pieces[lumiere].source = valeur;
    assert.ok(validerCatalogues(copie).some((e) => e.includes(`pieces > ${lumiere}`)), message);
  };
  refuse(lumiere, 'une lumière qui serait sa propre source');
  refuse('chapeau', 'une source que rien ne porte');
  console.log('OK démarrage : une source mal nommée, refusée');
}

console.log('OK test_d279_lueur_epaule');

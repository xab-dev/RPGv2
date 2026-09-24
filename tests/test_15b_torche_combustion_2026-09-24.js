// `specs/15` palier B (`D-195`) : la torche tenue brûle la nuit et à l'aube,
// en temps actif, et une torche dure une nuit. Éteinte, elle quitte la poche ;
// la suivante prend le relais ; la dernière rend les mains nues.
//
// Deux étages : le module pur (`combustion.js`), puis le VRAI orchestrateur
// sur une nuit entière — c'est lui qui décide quand l'horloge avance, et
// c'est là qu'une combustion oubliée ou doublée se verrait.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { PHASES_CYCLE, phaseAHeure } from '../src/daynight.js';
import { brule, normaliser, consumer, prendre, rendre } from '../src/combustion.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const torche = registre.obtenir('items', 'item_torche');
const DUREE = torche.combustion.duree_ms;

// --- 1. Le module pur ------------------------------------------------------
{
  const allumees = PHASES_CYCLE.map((p) => p.nom).filter((nom) => brule(torche, nom));
  assert.deepEqual(allumees.sort(), ['aube', 'nuit'], 'la torche brûle la nuit et à l’aube, jamais le jour ni au crépuscule');
  assert.equal(brule(torche, null), false, 'rien ne brûle dans une scène sans cycle');
  assert.equal(brule(registre.obtenir('items', 'item_epee_bois'), 'nuit'), false);

  let r = consumer([], DUREE, 1000);
  assert.deepEqual(r, { liste: [DUREE - 1000], eteints: 0 }, 'une torche neuve s’entame');
  r = consumer([500], DUREE, 1000);
  assert.deepEqual(r, { liste: [], eteints: 1 }, 'au bout de son temps, elle s’éteint');
  assert.deepEqual(normaliser([100, 200, 0], 1), [100], 'pas plus d’entamées que de torches en poche');
  assert.deepEqual(prendre([700, 900], DUREE), { restantMs: 700, liste: [900] }, 'on plante celle qu’on tenait');
  assert.deepEqual(prendre([], DUREE), { restantMs: DUREE, liste: [] });
  assert.deepEqual(rendre([900], 400, DUREE), [400, 900], 'reprise, elle repasse en tête avec son temps');
  assert.deepEqual(rendre([], DUREE, DUREE), [], 'une torche intacte redevient neuve');
}
console.log('OK combustion.js : quand ça brûle, s’entamer, s’éteindre, prendre, rendre');

// --- 2. Le vrai orchestrateur, une nuit entière -----------------------------
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
const DEBUT_NUIT = PHASES_CYCLE.slice(0, PHASES_CYCLE.findIndex((p) => p.nom === 'nuit')).reduce((s, p) => s + p.duree_ms, 0);

const save = saveNeuve();
save.hero.scene = 'scene_maison_exterieur';
save.hero.x = 85.5 * 32;
save.hero.y = 52.5 * 32;
save.hero.companion = 'comp_follet_eau';
// Aucune ligne d'ambiance ne doit s'ouvrir : un dialogue gèle le temps actif.
save.flags = {
  flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true,
  ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
};
save.inventaire.items = { item_torche: 2 };
save.hero.equipement = { arme: torche.arme, consommable: null };
save.monde.heure = DEBUT_NUIT;

const logique = faireCanvas();
const visible = faireCanvas();
// Un dialogue du follet peut s'ouvrir la nuit, et il gèle le temps actif :
// le harnais le ferme comme un joueur, INTERACT un appui sur deux.
let appuyerInteract = false;
const neutre = () => {
  const b = { pressed: false, held: false };
  const i = appuyerInteract ? { pressed: true, held: true } : b;
  return { move: { x: 0, y: 0 }, attack: b, skill_1: b, skill_2: b, skill_3: b, consume: b, interact: i, menu: b, target_next: b };
};
const orch = creerOrchestrateurGrotte({
  registre, i18n: creerI18n(dictionnaires, 'fr'), save, store: creerStoreMemoire(), dialogue: creerDialogue(),
  menu: {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
    ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
    rafraichirCoffre: () => {}, rafraichirStats: () => {},
  },
  input: { maj: neutre, tactileActif: () => false, peripheriqueActif: () => 'manette' },
  ctxLogique: logique.ctx, ctxVisible: visible.ctx, canvasLogique: logique.canvas,
});

// Avance jusqu'à ce que l'horloge ait parcouru `ms` (la boucle peut plafonner
// un pas : on compte le temps réellement écoulé, pas le nombre d'appels).
function avancer(ms) {
  let parcouru = 0;
  while (parcouru < ms) {
    if (orch.dialogueOuvert()) {
      appuyerInteract = !appuyerInteract;
      orch.maj(50);
      continue;
    }
    appuyerInteract = false;
    const avant = save.monde.heure;
    orch.maj(50);
    const cycle = PHASES_CYCLE.reduce((s, p) => s + p.duree_ms, 0);
    const pas = (((save.monde.heure - avant) % cycle) + cycle) % cycle;
    assert.ok(pas > 0, 'l’horloge doit avancer (aucune interface ouverte)');
    parcouru += pas;
  }
}

avancer(DUREE / 2);
assert.equal(save.inventaire.items.item_torche, 2, 'à mi-nuit, la première torche brûle encore');
assert.ok(save.inventaire.combustion.item_torche[0] < DUREE, 'et elle est entamée');
{
  // La lumière tenue et l'icône allumée passent par le dessin sans lever.
  // Même faux `document` et même fausse `window` que `test_d92_d93_slots_verite`.
  const documentAvant = global.document;
  const windowAvant = global.window;
  global.document = { createElement: () => faireCanvas().canvas };
  global.window = { devicePixelRatio: 1, addEventListener() {}, location: { search: '' } };
  try { orch.dessiner(); } finally { global.window = windowAvant; global.document = documentAvant; }
}

avancer(DUREE / 2 + 1000);
assert.equal(phaseAHeure(save.monde.heure), 'jour', 'une nuit et une aube plus tard, il fait jour');
assert.equal(save.inventaire.items.item_torche, 1, 'une torche a brûlé une nuit entière, pas une de plus');
assert.equal(save.hero.equipement.arme, torche.arme, 'la suivante reste en main');

avancer(60000);
assert.equal(save.inventaire.items.item_torche, 1, 'le jour, la torche ne se consume pas');
assert.equal(save.inventaire.combustion && save.inventaire.combustion.item_torche, undefined, 'ni ne s’entame');
// Le reste du jour ne nous apprend rien : l'horloge est posée au soir suivant.
save.monde.heure = DEBUT_NUIT;
avancer(DUREE + 1000);
assert.equal(save.inventaire.items.item_torche || 0, 0, 'la dernière torche a brûlé la nuit suivante');
assert.equal(save.hero.equipement.arme, null, 'éteinte, elle rend les mains nues (revalidation `D-92`)');
console.log('OK sur le vrai orchestrateur : une torche = une nuit ; le jour, rien ne brûle ; la dernière rend les mains nues');

console.log('OK test_15b_torche_combustion');

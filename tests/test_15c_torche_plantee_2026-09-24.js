// `specs/15` palier C (`D-196`) : planter la torche, la reprendre. « Planter »
// remplace « Jeter » pour elle seule ; plantée, elle garde le temps de la
// torche qu'on tenait, brûle la nuit, disparaît au bout ; INTERACT la reprend
// avec ce qui lui reste. Tout sur le VRAI orchestrateur.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, entreePoche } from '../src/main.js';
import { PHASES_CYCLE } from '../src/daynight.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const torche = registre.obtenir('items', 'item_torche');
const DUREE = torche.combustion.duree_ms;

// --- 1. La Poche : « Planter » pour la torche, « Jeter » pour le reste -----
{
  const ctx = { equipementHero: { arme: null, consommable: null }, registre, i18n, peripherique: 'manette' };
  assert.equal(entreePoche(torche, 1, ctx).plantable, true);
  assert.equal(entreePoche(registre.obtenir('items', 'item_branche'), 1, ctx).plantable, false);
  const copie = { ...donnees, items: donnees.items.map((it) => (it.id === 'item_branche' ? { ...it, plantable: { visuel: 'visuel_inconnu' } } : it)) };
  assert.ok(validerCatalogues(copie).some((e) => /plantable/.test(e)), 'un visuel planté inconnu tombe au boot');
  const sansFeu = { ...donnees, items: donnees.items.map((it) => (it.id === 'item_branche' ? { ...it, plantable: { visuel: 'visuel_torche_plantee', visuel_allume: 'visuel_torche_plantee_allumee' } } : it)) };
  assert.ok(validerCatalogues(sansFeu).some((e) => /plantable/.test(e)), 'une silhouette allumée sans combustion est refusée');
}
console.log('OK la Poche dit « Planter » pour la torche seule ; le boot refuse un plantable mal formé');

// --- 2. Le vrai orchestrateur ------------------------------------------------
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
const CYCLE = PHASES_CYCLE.reduce((s, p) => s + p.duree_ms, 0);
const DEBUT_NUIT = PHASES_CYCLE.slice(0, PHASES_CYCLE.findIndex((p) => p.nom === 'nuit')).reduce((s, p) => s + p.duree_ms, 0);

const save = saveNeuve();
save.hero.scene = 'scene_maison_exterieur';
save.hero.x = 85.5 * 32;
save.hero.y = 49.5 * 32;
save.hero.companion = 'comp_follet_eau';
save.flags = {
  flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true,
  ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
};
save.inventaire.items = { item_torche: 2 };
save.inventaire.combustion = { item_torche: [200000] }; // celle qu'on tient est entamée
save.hero.equipement = { arme: torche.arme, consommable: null };
save.monde.heure = DEBUT_NUIT;

let appuyerInteract = false;
const neutre = () => {
  const b = { pressed: false, held: false };
  const i = appuyerInteract ? { pressed: true, held: true } : b;
  return { move: { x: 0, y: 0 }, attack: b, skill_1: b, skill_2: b, skill_3: b, consume: b, interact: i, menu: b, target_next: b };
};
const logique = faireCanvas();
const visible = faireCanvas();
const orch = creerOrchestrateurGrotte({
  registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
  menu: {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
    ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
    rafraichirCoffre: () => {}, rafraichirStats: () => {},
  },
  input: { maj: neutre, tactileActif: () => false, peripheriqueActif: () => 'manette' },
  ctxLogique: logique.ctx, ctxVisible: visible.ctx, canvasLogique: logique.canvas,
});
function avancer(ms) {
  let parcouru = 0;
  while (parcouru < ms) {
    if (orch.dialogueOuvert()) { appuyerInteract = !appuyerInteract; orch.maj(50); continue; }
    appuyerInteract = false;
    const avant = save.monde.heure;
    orch.maj(50);
    const pas = (((save.monde.heure - avant) % CYCLE) + CYCLE) % CYCLE;
    assert.ok(pas > 0, 'l’horloge doit avancer');
    parcouru += pas;
  }
}
avancer(100);

// Planter : la torche qu'on tenait, avec SON temps.
const restantAvant = save.inventaire.combustion.item_torche[0];
assert.equal(orch.jeterItem('item_torche'), true, 'la torche se plante');
assert.equal(save.inventaire.items.item_torche, 1);
let plantees = orch.obtenirObjetsPlantes();
assert.equal(plantees.length, 1);
assert.equal(plantees[0].restant_ms, restantAvant, 'on plante celle qu’on tenait, entamée');
assert.equal(orch.obtenirObjetsJetes().length, 0, 'ce n’est pas un objet jeté');

// Elle brûle la nuit, comme en main.
avancer(20000);
plantees = orch.obtenirObjetsPlantes();
assert.ok(plantees[0].restant_ms <= restantAvant - 20000 + 100, 'plantée, elle brûle');

// INTERACT la reprend, avec ce qui lui reste — elle repasse en tête de file.
const restantPlantee = plantees[0].restant_ms;
appuyerInteract = true; orch.maj(16); appuyerInteract = false; orch.maj(16);
assert.equal(orch.obtenirObjetsPlantes().length, 0, 'reprise, elle quitte le sol');
assert.equal(save.inventaire.items.item_torche, 2);
assert.ok(Math.abs(save.inventaire.combustion.item_torche[0] - restantPlantee) <= 100, 'avec son temps restant');

// Replantée neuve (la seconde torche n'a jamais servi) et laissée jusqu'au bout.
save.inventaire.combustion = {};
assert.equal(orch.jeterItem('item_torche'), true);
assert.equal(orch.obtenirObjetsPlantes()[0].restant_ms, DUREE, 'une torche neuve se plante pleine');
save.monde.heure = DEBUT_NUIT;
save.hero.x += 32 * 3; // on s'éloigne : INTERACT ne doit pas la reprendre
avancer(DUREE + 1000);
assert.equal(orch.obtenirObjetsPlantes().length, 0, 'au bout d’une nuit, la torche plantée a disparu');
{
  const documentAvant = global.document;
  const windowAvant = global.window;
  global.document = { createElement: () => faireCanvas().canvas };
  global.window = { devicePixelRatio: 1, addEventListener() {}, location: { search: '' } };
  save.monde.heure = DEBUT_NUIT;
  orch.jeterItem('item_torche');
  try { orch.dessiner(); } finally { global.window = windowAvant; global.document = documentAvant; }
}
console.log('OK planter garde le temps, la plantée brûle, INTERACT la reprend avec son temps, elle disparaît au bout');

console.log('OK test_15c_torche_plantee');

// `D-08` — « Manger » depuis la Poche, sans équiper l'objet.
//
// Ce qui se vérifie sur le VRAI orchestrateur : `consommerItem(id)` mange CET
// objet (pas celui de la case), par le même chemin que le verbe CONSUME —
// jauges, retrait, buffs — ; la case consommable n'est pas touchée ; un objet
// absent ou qui ne se mange pas ne fait rien. Le bouton lui-même (A = Manger,
// X = Équiper) est éprouvé dans `test_d43_c2_poche_fiches`. Aucune valeur de
// réglage épinglée (`D-52`) : les effets attendus sont relus dans `items.json`.
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

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

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

try {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.survie = { jauge_faim: 0.3, jauge_soif: 0.3 };
  save.inventaire.items = { item_fruit: 2, item_fruit_cuit: 1, item_branche: 3 };
  save.hero.equipement.consommable = 'item_fruit';
  const logique = faireCanvas();
  const visible = faireCanvas();
  const orch = creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput() {}, ouvrir() {}, ouvrirCraft() {}, rafraichirCraft() {},
      ouvrirCoffre() {}, rafraichirCoffre() {}, rafraichirStats() {},
    },
    input: { maj: () => null, tactileActif: () => false, peripheriqueActif: () => 'manette' },
    ctxLogique: logique.ctx,
    ctxVisible: visible.ctx,
    canvasLogique: logique.canvas,
  });
  const s = () => orch.obtenirSave();

  // Manger le fruit CUIT, alors que la case porte le fruit cru.
  const cuit = registre.obtenir('items', 'item_fruit_cuit').consommation;
  assert.equal(orch.consommerItem('item_fruit_cuit'), true);
  assert.equal(s().inventaire.items.item_fruit_cuit || 0, 0, 'CET objet est retiré');
  assert.equal(s().inventaire.items.item_fruit, 2, 'celui de la case, non');
  assert.equal(s().hero.equipement.consommable, 'item_fruit', 'la case n’a pas bougé');
  assert.ok(Math.abs(s().survie.jauge_faim - Math.min(1, 0.3 + cuit.faim)) < 1e-9, 'la faim remonte de ce que l’objet déclare');
  for (const effet of cuit.effets || []) {
    assert.ok(JSON.stringify(s().hero.buffs_actifs).includes(effet), `le buff ${effet} est posé, comme par CONSUME`);
  }
  console.log('OK Manger depuis la Poche : cet objet, ses jauges, ses buffs, la case intacte');

  // Rien à manger : rien ne se passe.
  const avant = JSON.stringify(s());
  assert.equal(orch.consommerItem('item_fruit_cuit'), false, 'plus en poche');
  assert.equal(orch.consommerItem('item_branche'), false, 'une branche ne se mange pas');
  assert.equal(JSON.stringify(s()), avant, 'et rien n’a changé');
  console.log('OK objet absent ou non comestible : aucun effet');
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

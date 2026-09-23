// `D-145` (23/09, micro-ticket de Xav) — « Jeter » depuis la Poche.
// Ce qui est éprouvé, dans l'ordre de la demande :
//   1. l'objet n'est pas détruit : il est posé au sol, sous le héros ;
//   2. plusieurs objets s'empilent sur une tuile, jusqu'à la capacité du
//      conteneur « sol » (lue dans les données, jamais recopiée ici), puis
//      c'est refusé ;
//   3. le ramassage est inchangé : un par un, par INTERACT — et il ne
//      rapporte AUCUNE XP (sinon jeter/reprendre ferait monter de niveau) ;
//   4. l'écran de fiches porte une troisième action, sur Y (`skill_2`) et
//      sur son bouton, absente quand l'entrée n'en a pas.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compterObjetsSurTuile, poserObjetJete, trouverObjetJeteProche, retirerObjetJete, decalageDansPile,
} from '../src/ground_items.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { resoudreCapacite } from '../src/inventory.js';
import { creerEcranFiches } from '../src/ui/ecran_fiches.js';
import { creerNavigationEcrans } from '../src/menu_cartes.js';

// --- 1. La partie pure -----------------------------------------------------
{
  const T = 32;
  let jetes = [];
  jetes = poserObjetJete(jetes, 'item_a', 2, 3, T);
  jetes = poserObjetJete(jetes, 'item_b', 2, 3, T);
  assert.deepEqual(jetes[0], { item: 'item_a', x: 2.5 * T, y: 3.5 * T }, 'au centre de la tuile');
  const semes = { item_c: [{ x: 2.5 * T, y: 3.5 * T }], item_d: [{ x: 9 * T, y: 9 * T }] };
  assert.equal(compterObjetsSurTuile(semes, jetes, 2, 3, T), 3, 'semés et jetés comptent ensemble');
  assert.equal(compterObjetsSurTuile(semes, jetes, 9, 9, T), 1);
  const proche = trouverObjetJeteProche(jetes, { x: 2.5 * T, y: 3.5 * T }, 10);
  assert.equal(proche.itemId, 'item_b', 'sur une pile, le dessus (le dernier posé) se ramasse d’abord');
  assert.equal(trouverObjetJeteProche(jetes, { x: 0, y: 0 }, 10), null, 'hors de portée : rien');
  assert.deepEqual(retirerObjetJete(jetes, 1).map((j) => j.item), ['item_a']);
  assert.deepEqual(decalageDansPile(0), [0, 0], 'le premier objet est au centre');
  assert.notDeepEqual(decalageDansPile(1), decalageDansPile(0), 'les suivants sont décalés, la pile se lit');
  console.log('OK partie pure : pose au centre, comptage commun, dessus de pile, décalage de dessin');
}

// --- 2. Sur le vrai orchestrateur ------------------------------------------
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const CAPACITE = resoudreCapacite(registre.obtenir('conteneurs', 'conteneur_sol')).slots;
assert.ok(CAPACITE >= 2, 'le sol tient au moins deux objets : sinon rien ne s’empile');

const b = (v) => ({ pressed: v, held: v });
const etat = ({ interact = false } = {}) => ({
  move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
  skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
});

const save = saveNeuve();
save.hero.scene = 'scene_maison_exterieur';
save.hero.companion = 'comp_follet_eau';
save.hero.pv = 40;
save.flags = {
  flag_follet_choisi: true, flag_grotte_sortie: true, flag_premier_ramassage: true,
  ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
};
let prochain = etat();
const orch = creerOrchestrateurGrotte({
  registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
  menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, rafraichirStats: () => {} },
  input: { maj: () => { const e = prochain; prochain = etat(); return e; } },
  ctxLogique: null, ctxVisible: null, canvasLogique: null,
});
const frame = (e) => { prochain = e; orch.maj(16); };
frame(etat());

// Le héros est posé sur une tuile libre, loin de tout objet SEMÉ et de toute
// station : ce test éprouve les objets jetés, pas le semis du jour.
{
  const scene = orch.obtenirScene();
  const ts = scene.tileSize;
  const semes = Object.values(save.monde.items_sol[scene.id] || {}).flat();
  const libre = (tx, ty) => {
    const t = scene.tuileA(tx, ty);
    if (!t || t.solid) return false;
    const c = { x: (tx + 0.5) * ts, y: (ty + 0.5) * ts };
    if (semes.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < 4 * ts)) return false;
    return !scene.empreintesSolides.some((e) => c.x > e.x - 2 * ts && c.x < e.x + e.w + 2 * ts
      && c.y > e.y - 2 * ts && c.y < e.y + e.h + 2 * ts);
  };
  const h = orch.obtenirHero();
  const tx0 = Math.floor(h.x / ts);
  const ty0 = Math.floor(h.y / ts);
  let trouve = null;
  for (let r = 0; r < 40 && !trouve; r++) {
    for (let dx = -r; dx <= r && !trouve; dx++) {
      for (let dy = -r; dy <= r && !trouve; dy++) {
        if (libre(tx0 + dx, ty0 + dy)) trouve = [tx0 + dx, ty0 + dy];
      }
    }
  }
  assert.ok(trouve, 'une tuile libre existe près du héros');
  h.x = (trouve[0] + 0.5) * ts;
  h.y = (trouve[1] + 0.5) * ts;
}

{
  assert.equal(save.monde.objets_jetes, undefined, 'une partie qui n’a rien jeté n’a pas le champ : son absence est une valeur');
  save.inventaire.items = { item_branche: CAPACITE };
  const xpAvant = save.hero.xp;

  for (let i = 0; i < CAPACITE; i++) assert.equal(orch.jeterItem('item_branche'), true, `jet n°${i + 1}`);
  assert.equal(save.inventaire.items.item_branche || 0, 0, 'la poche s’est vidée');
  assert.equal(orch.obtenirObjetsJetes().length, CAPACITE, 'rien n’a été détruit : tout est au sol');
  const scene = orch.obtenirScene();
  const h = orch.obtenirHero();
  const surTuileHeros = (j) => Math.floor(j.x / scene.tileSize) === Math.floor(h.x / scene.tileSize)
    && Math.floor(j.y / scene.tileSize) === Math.floor(h.y / scene.tileSize);
  assert.ok(orch.obtenirObjetsJetes().every(surTuileHeros), 'tous sous le héros, sur sa tuile');
  assert.equal(orch.solPleinSousHeros(), true, 'la tuile est pleine');

  save.inventaire.items = { item_branche: 1 };
  assert.equal(orch.jeterItem('item_branche'), false, 'au-delà de la capacité : refusé');
  assert.equal(save.inventaire.items.item_branche, 1, 'et l’objet reste en poche');
  assert.equal(orch.obtenirObjetsJetes().length, CAPACITE);
  console.log(`OK jeter : posé sous le héros, ${CAPACITE} par tuile, puis refusé sans rien perdre`);

  frame(etat({ interact: true }));
  assert.equal(save.inventaire.items.item_branche, 2, 'INTERACT reprend UN objet');
  assert.equal(orch.obtenirObjetsJetes().length, CAPACITE - 1);
  assert.equal(orch.solPleinSousHeros(), false, 'une place s’est libérée');
  // Poche : 4 slots de 5 — le reste de la pile y tient toujours.
  for (let i = 0; i < CAPACITE - 1; i++) {
    frame(etat());
    frame(etat({ interact: true }));
  }
  assert.equal(orch.obtenirObjetsJetes().length, 0, 'un appui, un objet : la pile est reprise en entier');
  assert.equal(save.inventaire.items.item_branche, CAPACITE + 1);
  assert.equal(save.hero.xp, xpAvant, 'reprendre un objet jeté ne rapporte aucune XP');
  console.log('OK ramassage d’un objet jeté : un par un, sans XP');
}

{
  save.inventaire.items = {};
  assert.equal(orch.jeterItem('item_branche'), false, 'on ne jette pas ce qu’on n’a pas');
  console.log('OK rien à jeter : sans effet');
}

// --- 3. L'écran de fiches : la troisième action ----------------------------
// Faux DOM minimal, copié et non partagé (convention du dépôt).
class El {
  constructor(tag) {
    this.tagName = tag; this.dataset = {}; this.style = {}; this.children = [];
    this._c = []; this._l = {}; this._t = ''; this.hidden = false;
  }
  get className() { return this._c.join(' '); }
  set className(v) { this._c = String(v || '').split(/\s+/).filter(Boolean); }
  appendChild(e) { this.children.push(e); return e; }
  addEventListener(t, f) { (this._l[t] ||= []).push(f); }
  declencher(t) { for (const f of this._l[t] || []) f({}); }
  get textContent() { return this._t; }
  set textContent(v) { this._t = v; this.children = []; }
  set innerHTML(_) { this.children = []; }
  querySelectorAll() { return []; }
}
const trouver = (el, pred) => {
  for (const e of el.children) {
    if (pred(e)) return e;
    const r = trouver(e, pred);
    if (r) return r;
  }
  return null;
};
{
  const faits = [];
  const entrees = [
    {
      titre: 'Branche', quantite: 3, libelleAction: 'Équiper', action: () => faits.push('A'),
      libelleActionTertiaire: 'Jeter', actionTertiaire: () => faits.push('jeter'),
    },
    { titre: 'Caillou', quantite: 1, libelleAction: 'Équiper', action: () => faits.push('A2') },
  ];
  const nav = creerNavigationEcrans({ onFermer: () => {} });
  const ecran = creerEcranFiches({
    document: { createElement: (t) => new El(t), body: new El('body') }, i18n: { t: (c) => c },
    afficherEcran: (el, v) => { el.hidden = !v; }, seuilPoussee: 0.5, onRetour: () => nav.retour(),
    glypheActionTertiaire: () => 'Y',
  });
  nav.empiler({ vue: ecran, id: 'poche', titre: 'Poche', obtenirEntrees: () => entrees });
  const avecY = (v) => ({ ...etat(), skill_2: b(v) });
  nav.traiterInput(avecY(true));
  nav.traiterInput(avecY(false));
  assert.deepEqual(faits, ['jeter'], 'Y déclenche la troisième action de la tuile focalisée');
  const bouton = trouver(ecran.element, (x) => x.dataset.action === 'fiche-tertiaire');
  assert.ok(bouton, 'la fiche porte un troisième bouton');
  bouton.declencher('click');
  assert.deepEqual(faits, ['jeter', 'jeter'], 'le bouton appelle la même action (au doigt, le tap)');

  nav.traiterInput({ ...etat(), move: { x: 1, y: 0 } });
  nav.traiterInput(etat());
  assert.equal(trouver(ecran.element, (x) => x.dataset.action === 'fiche-tertiaire'), null, 'sans action tertiaire, pas de bouton');
  nav.traiterInput(avecY(true));
  nav.traiterInput(avecY(false));
  assert.deepEqual(faits, ['jeter', 'jeter'], 'et Y n’y fait rien');
  console.log('OK écran de fiches : la troisième action sur Y et sur son bouton, absente sinon');
}

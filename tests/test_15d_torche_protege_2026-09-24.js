// `specs/15` palier D (`D-197`) : les monstres n'entrent pas dans la lumière
// d'une torche plantée allumée, et n'y naissent pas (Xav : « elle permettra
// aussi de protéger les plantations »).
//
// Le demi-tour lui-même est déjà éprouvé par `test_07c` : ce qui est tenu ici,
// c'est que la torche est BRANCHÉE dessus. D'abord le tirage pur (l'exclusion
// ne change aucun tirage quand elle ne refuse rien), puis une nuit de Chaos
// sur le vrai orchestrateur, héros au milieu du Champ nord : sans torche, les
// rôdeurs viennent au contact ; avec une torche plantée à ses pieds, aucun
// n'entre dans son cercle.
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
import { chargerScene } from '../src/scene.js';
import { rectanglesDeZone, tirerPositionApparition, estEnZoneSure } from '../src/spawns.js';
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
const RAYON = torche.combustion.lumiere.rayon;
assert.equal(torche.plantable.protege, true, 'la torche plantée protège');
const scene = chargerScene(registre, 'scene_maison_exterieur');

// --- 1. Le tirage : une exclusion en pixels, sans rien déranger d'autre ----
{
  const base = { zoneId: 'chaos_nord_est', hero: null, graine: 7 };
  for (let g = 1; g <= 20; g += 1) {
    assert.deepEqual(
      tirerPositionApparition(scene, { ...base, graine: g }),
      tirerPositionApparition(scene, { ...base, graine: g, exclue: () => false }),
      'une exclusion qui ne refuse rien ne change aucun tirage',
    );
  }
  const p = tirerPositionApparition(scene, base);
  const q = tirerPositionApparition(scene, { ...base, exclue: (x, y) => Math.hypot(x - p.x, y - p.y) < RAYON });
  assert.ok(Math.hypot(q.x - p.x, q.y - p.y) >= RAYON, 'le tirage évite la lumière');
}
console.log('OK le tirage évite la lumière, et ne change rien quand elle est absente');

// --- 2. Une nuit de Chaos, sans puis avec la torche ---------------------------
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

// Le héros au milieu du Champ nord (le domaine des rôdeurs), hors zone sûre.
const champ = rectanglesDeZone(scene, 'champ_nord')[0];
const tx = champ.x + Math.floor(champ.w / 2);
const ty = champ.y + Math.floor(champ.h / 2);
assert.equal(estEnZoneSure(scene, tx, ty), false);
const HX = (tx + 0.5) * scene.tileSize;
const HY = (ty + 0.5) * scene.tileSize;

function nuit({ avecTorche }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.x = HX;
  save.hero.y = HY;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 20;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true,
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
  };
  save.monde.heure = DEBUT_NUIT;
  if (avecTorche) {
    save.monde.objets_plantes = { scene_maison_exterieur: [{ item: 'item_torche', x: HX, y: HY, restant_ms: torche.combustion.duree_ms }] };
  }
  let appuyer = false;
  const neutre = () => {
    const b = { pressed: false, held: false };
    return { move: { x: 0, y: 0 }, attack: b, skill_1: b, skill_2: b, skill_3: b, consume: b, interact: appuyer ? { pressed: true, held: true } : b, menu: b, target_next: b };
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
  let distanceMin = Infinity;
  let nes = 0;
  const vus = new Set();
  for (let t = 0; t < 240000; t += 50) {
    // Un dialogue du follet peut s'ouvrir : on le ferme comme un joueur.
    appuyer = orch.dialogueOuvert() ? !appuyer : false;
    save.hero.pv = 999; // le héros ne meurt pas : on mesure les monstres, pas lui
    orch.maj(50);
    for (const m of orch.obtenirMonstres()) {
      if (m.mort || !m.spawnId) continue;
      if (!vus.has(m.id)) { vus.add(m.id); nes += 1; }
      distanceMin = Math.min(distanceMin, Math.hypot(m.x - HX, m.y - HY));
    }
  }
  return { distanceMin, nes };
}

const sans = nuit({ avecTorche: false });
assert.ok(sans.nes > 0, 'des rôdeurs naissent la nuit');
assert.ok(sans.distanceMin < RAYON / 2, `sans torche, ils viennent au contact (${sans.distanceMin.toFixed(0)} px)`);

const avec = nuit({ avecTorche: true });
assert.ok(avec.nes > 0, 'avec la torche, ils naissent toujours (ailleurs)');
// Le demi-tour se décide une demi-tuile devant le monstre : il peut mordre la
// lumière de ce demi-pas, jamais davantage.
assert.ok(avec.distanceMin >= RAYON - scene.tileSize / 2,
  `avec la torche, aucun n'entre dans sa lumière (au plus près : ${avec.distanceMin.toFixed(0)} px, rayon ${RAYON})`);
console.log(`OK une nuit de Chaos : sans torche au contact (${sans.distanceMin.toFixed(0)} px), avec torche ils restent dehors (${avec.distanceMin.toFixed(0)} px)`);

console.log('OK test_15d_torche_protege');

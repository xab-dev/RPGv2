// `specs/13` palier E : le levier `lisiere` des presets.
//
// Même coupe que le grain (`qualite.js#appliquerGrainSol`) : un dessin de
// lisière garde ses PREMIÈRES primitives, les plus importantes — le contour de
// l'herbe d'abord. Ce fichier éprouve, sur la VRAIE table construite par
// l'orchestrateur (jamais une recopie de la règle, `D-72`) :
// - Moyen rend les dessins du catalogue tels quels ;
// - Bas les coupe par la fin, sans jamais les perdre (`specs/13` §5 : sans
//   grain, l'escalier d'aplats est ce que Bas ne devrait pas perdre) ;
// - Haut n'en dessine jamais moins que Moyen ;
// - les RANGS ne bougent dans aucun preset : un preset allège un dessin, il ne
//   change pas qui déborde sur qui ;
// - §4.1 : une lisière est un dessin, jamais une solidité — le chemin reste
//   praticable jusqu'à son bord logique, là même où l'herbe y mord.
// Aucun nombre du catalogue n'est épinglé (`D-52`) : des relations.
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
import { lisieresCase } from '../src/lisieres.js';
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
assert.ok(config.leviers.includes('lisiere'), 'le levier est déclaré');

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

function orchestrateur(preset) {
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
    input: { maj: () => null, tactileActif: () => false, peripheriqueActif: () => 'manette' },
    ctxLogique: logique.ctx,
    ctxVisible: visible.ctx,
    canvasLogique: logique.canvas,
    graphismes: resoudreGraphismes(registre, save, null, `?qualite=${preset}`),
  });
}

// Les dessins d'une entrée de table, nommés par leur rôle.
const dessins = (e) => ({
  bord: e.bord, coin: e.coin, ombre_bord: e.ombre && e.ombre.bord, ombre_coin: e.ombre && e.ombre.coin,
});
const nbPrimitives = (table) => [...table.values()].reduce(
  (n, e) => n + Object.values(dessins(e)).reduce((m, v) => m + (v ? v.primitives.length : 0), 0), 0,
);

try {
  const orchs = Object.fromEntries(PRESETS.map((p) => [p, orchestrateur(p)]));
  const tables = Object.fromEntries(PRESETS.map((p) => [p, orchs[p].obtenirLisieres()]));
  const avecLisiere = registre.tous('tiles').filter((t) => t.render && t.render.lisiere);
  const debordantes = avecLisiere.filter((t) => t.render.lisiere.bord);
  assert.ok(debordantes.length > 0, 'au moins une surface déborde, sinon rien n\'est prouvé');

  // --- 1. Moyen : le catalogue tel quel ------------------------------------
  for (const t of debordantes) {
    const l = t.render.lisiere;
    const e = tables.moyen.get(t.id);
    assert.equal(e.bord, registre.obtenir('visuels', l.bord), `${t.id} : sous Moyen, le bord du catalogue, tel quel`);
    assert.equal(e.coin, registre.obtenir('visuels', l.coin_interieur), `${t.id} : et le coin`);
    if (l.ombre) assert.equal(e.ombre.bord, registre.obtenir('visuels', l.ombre.bord), `${t.id} : et l'ombre`);
  }
  console.log('OK Moyen : les dessins du catalogue, tels quels');

  // --- 2. Bas : le contour reste, coupé par la fin -------------------------
  assert.ok(valeurLevier(config, 'bas', 'lisiere') < valeurLevier(config, 'moyen', 'lisiere'), 'Bas allège les lisières');
  assert.ok(valeurLevier(config, 'bas', 'lisiere') > 0, 'sans les éteindre (§5 : le contour seul)');
  for (const t of debordantes) {
    const bas = dessins(tables.bas.get(t.id));
    const moyen = dessins(tables.moyen.get(t.id));
    for (const role of Object.keys(moyen)) {
      if (!moyen[role]) continue;
      assert.ok(bas[role], `${t.id} > ${role} : Bas le garde (le contour d'abord)`);
      assert.deepEqual(bas[role].primitives, moyen[role].primitives.slice(0, bas[role].primitives.length),
        `${t.id} > ${role} : ce que Bas garde est le PRÉFIXE du dessin`);
    }
    assert.ok(bas.bord.primitives.length < moyen.bord.primitives.length, `${t.id} : le bord de Bas est plus léger`);
  }
  assert.ok(nbPrimitives(tables.bas) < nbPrimitives(tables.moyen), 'Bas dessine moins de lisière que Moyen');
  assert.ok(nbPrimitives(tables.haut) >= nbPrimitives(tables.moyen), 'Haut n\'en dessine jamais moins que Moyen');
  console.log(`OK le levier : ${nbPrimitives(tables.bas)} primitives de lisière en Bas, `
    + `${nbPrimitives(tables.moyen)} en Moyen, ${nbPrimitives(tables.haut)} en Haut`);

  // --- 3. Les rangs ne bougent dans aucun preset ---------------------------
  for (const preset of PRESETS) {
    for (const t of avecLisiere) {
      assert.equal(tables[preset].get(t.id).rang, t.render.lisiere.rang, `${t.id} : "${preset}" ne change pas son rang`);
    }
  }
  // Et donc les MÊMES cases reçoivent une lisière, aux mêmes côtés.
  const scene = orchs.moyen.obtenirScene();
  const estFlagActif = () => false;
  const recues = (table) => {
    const liste = [];
    for (let y = 0; y < scene.height; y += 1) {
      for (let x = 0; x < scene.width; x += 1) {
        const poses = lisieresCase(scene, x, y, estFlagActif, table);
        if (poses.length) liste.push(`${x},${y}:${poses.map((p) => p.rotation).join('/')}`);
      }
    }
    return liste;
  };
  const reference = recues(tables.moyen);
  assert.ok(reference.length > 0, 'la Maison a bien des cases qui reçoivent une lisière');
  for (const preset of PRESETS) {
    assert.deepEqual(recues(tables[preset]), reference, `"${preset}" : les mêmes cases, les mêmes côtés`);
  }
  console.log(`OK les rangs et les poses ne bougent pas (${reference.length} cases de la Maison reçoivent une lisière)`);

  // --- 4. §4.1 : une lisière est un dessin, jamais une solidité ------------
  // Dans chaque case de chemin qui reçoit un bord, le point à 1 px du bord
  // logique — là où l'herbe mord — reste praticable, dans tous les presets.
  const T = scene.tileSize;
  const COTES = { 0: [0, -1], 90: [1, 0], 180: [0, 1], 270: [-1, 0] };
  for (const preset of PRESETS) {
    const sc = orchs[preset].obtenirScene();
    let eprouves = 0;
    for (let y = 0; y < sc.height; y += 1) {
      for (let x = 0; x < sc.width; x += 1) {
        const t = sc.tuileA(x, y, estFlagActif);
        if (!t || t.solid) continue;
        for (const pose of lisieresCase(sc, x, y, estFlagActif, tables[preset])) {
          const cote = COTES[pose.rotation];
          if (!cote || pose.visuel !== tables[preset].get('tile_herbe').bord) continue;
          const px = (x + 0.5) * T + cote[0] * (T / 2 - 1);
          const py = (y + 0.5) * T + cote[1] * (T / 2 - 1);
          assert.equal(sc.estSolideAuPoint(px, py, estFlagActif), false,
            `"${preset}" : (${x},${y}) reste praticable jusqu'à son bord, sous l'herbe qui y mord`);
          eprouves += 1;
        }
      }
    }
    assert.ok(eprouves > 0, `"${preset}" : des bords ont bien été éprouvés`);
  }
  console.log('OK §4.1 : le chemin reste praticable sous les lisières, dans tous les presets');
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

console.log('OK test_levier_lisiere');

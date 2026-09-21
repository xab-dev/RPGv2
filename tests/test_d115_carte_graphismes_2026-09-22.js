// `D-115` — palier D : la carte Graphismes dans Paramètres, et le changement
// à chaud (§4.5).
//
// Ce qui se teste ici : le CYCLE (ordre du catalogue), la CLÉ affichée (une
// seule, et « Auto (Bas) » jamais « Auto » seul), le CÂBLAGE dans les deux
// sens (toute carte a sa fonction, toute fonction a sa carte), et surtout le
// changement à chaud — ce qui bouge, et tout ce qui ne bouge pas.
//
// Ce qui ne s'y teste pas, et n'y a rien à faire : que la carte tienne dans
// l'écran. Node n'a pas de moteur de mise en page (règle du 20/09) — c'est le
// scénario de captures `tools/scenarios/reglages_graphiques.mjs`, aux trois
// profils, et l'œil de Xav.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { cleEtatCarte, presetSuivant } from '../src/qualite.js';
import { erreursCablageMenus, nombreCases, choisirGrille, CASES_MAX } from '../src/menu_cartes.js';
import { initialiserMenu } from '../src/ui/menu.js';
import { creerOrchestrateurGrotte, resoudreGraphismes } from '../src/main.js';
import { statsCoucheStatique } from '../src/render.js';

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

// --- 1. Le cycle : auto → bas → moyen → haut → auto ------------------------
// L'ordre est celui du CATALOGUE, pas une liste écrite en code : insérer un
// preset au bon endroit du tableau suffit à l'ajouter au cycle.
{
  const attendu = config.paliers.map((p) => p.id);
  const vu = [];
  let courant = config.defaut;
  for (let i = 0; i < attendu.length; i += 1) {
    vu.push(courant);
    courant = presetSuivant(config, courant);
  }
  assert.deepEqual(vu, attendu, 'le cycle parcourt les paliers dans l\'ordre du catalogue');
  assert.equal(courant, config.defaut, 'et il boucle');

  // Un réglage absent, c'est le défaut : le premier appui doit donc donner le
  // SUIVANT du défaut, pas le défaut lui-même (sinon la première pression ne
  // ferait rien de visible).
  assert.equal(presetSuivant(config, undefined), presetSuivant(config, config.defaut));
  // Une valeur inconnue ne bloque pas la carte : le joueur appuie, il obtient
  // un réglage valide. Rien à taire ici, contrairement à la résolution.
  assert.ok(attendu.includes(presetSuivant(config, 'ultra')), 'un choix inconnu retombe dans le cycle');
  console.log(`OK cycle : ${vu.join(' → ')} → ${courant}`);
}

// --- 2. Une seule clé, et elle existe dans les deux langues ---------------
{
  for (const palier of config.paliers.filter((p) => p.leviers !== undefined)) {
    assert.equal(cleEtatCarte(config, palier.id, palier.id), palier.cle_etat, 'choisi : son nom seul');
    assert.equal(cleEtatCarte(config, config.defaut, palier.id), palier.cle_etat_auto, 'résolu par Auto : « Auto (…) »');
    for (const langue of ['fr', 'en']) {
      for (const cle of [palier.cle_etat, palier.cle_etat_auto]) {
        assert.equal(typeof dictionnaires[langue][cle], 'string', `${cle} manque dans locales/${langue}.json`);
      }
    }
    // Le libellé d'Auto dit le palier résolu : il n'est jamais « Auto » tout
    // court (§5), sans quoi personne ne saurait en quoi il joue.
    for (const langue of ['fr', 'en']) {
      assert.notEqual(
        dictionnaires[langue][palier.cle_etat_auto], dictionnaires[langue][config.paliers[0].cle_etat],
        `en ${langue}, « Auto (${palier.id}) » ne peut pas s'écrire « Auto » tout court`,
      );
    }
  }
  console.log('OK une clé par situation, FR et EN, et Auto dit toujours ce qu\'il a résolu');
}

// --- 3. La carte, sa case, et l'écran désormais plein ---------------------
{
  const parametres = registre.tous('menus').find((e) => e.id === 'menu_parametres');
  const carte = parametres.cartes.find((c) => c.id === 'carte_graphismes');
  assert.ok(carte, 'la carte existe dans le catalogue');
  assert.equal(carte.type, 'bascule');
  assert.equal(carte.case, CASES_MAX - 1, 'la 6ᵉ et DERNIÈRE case (décision 5 de Xav)');

  const cases = parametres.cartes.map((c) => c.case).sort((a, b) => a - b);
  assert.deepEqual(cases, [...Array(CASES_MAX).keys()], 'les 6 cases sont prises, sans trou ni doublon');
  assert.deepEqual(choisirGrille(nombreCases(parametres)), { colonnes: 3, rangees: 2 });

  // « Paramètres est plein après ce ticket » (§6) — et ce n'est pas une
  // formule : une 7ᵉ case ne rentre dans aucune grille, l'écran serait VIDE.
  // Consigné, non traité : le remède est un dossier, une décision de Xav.
  assert.equal(choisirGrille(CASES_MAX + 1), null, 'un 7ᵉ réglage n\'a nulle part où aller');
  console.log('OK la carte est en 6ᵉ case, et Paramètres est plein');
}

// --- 4. Le câblage, dans les deux sens ------------------------------------
// C'est le contrôle que `demarrerJeu` fait au démarrage, joué ici sur le VRAI
// catalogue et le VRAI jeu de fonctions de `ui/menu.js` — pas une liste
// recopiée (`D-72`). Sans lui, une carte citant une action inexistante ne se
// verrait qu'en ouvrant ce sous-écran-là.
{
  const documentAvant = global.document;
  global.document = fauxDocument();
  try {
    const menu = initialiserMenu({
      document: global.document,
      i18n: creerI18n(dictionnaires, 'fr'),
      menus: registre.tous('menus'),
      exporterSauvegarde() {},
      importerSauvegarde() {},
    });
    const cablage = menu.cablage();
    assert.ok(cablage.actions.includes('action_cycler_graphismes'), 'l\'action est enregistrée');
    assert.ok(cablage.etats.includes('etat_graphismes'), 'le lecteur d\'état est enregistré');
    assert.deepEqual(
      erreursCablageMenus(registre.tous('menus'), { ...cablage, valeurs: ['niveau', 'stations_placables', 'plein_ecran_disponible'] }),
      [], 'toute carte a sa fonction, et toute fonction a sa carte',
    );
  } finally {
    global.document = documentAvant;
  }
  console.log('OK câblage vérifié dans les deux sens, sur le vrai catalogue');
}

// --- 5. Le changement À CHAUD : ce qui bouge, et tout ce qui ne bouge pas --
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

function fauxDocument() {
  const creer = () => {
    const el = {
      style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, children: [],
      appendChild(e) { this.children.push(e); return e; },
      removeChild() {}, addEventListener() {}, removeEventListener() {}, remove() {},
      querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, getAttribute: () => null,
      focus() {}, click() {}, insertBefore() {}, replaceChildren() { this.children = []; },
      get firstChild() { return this.children[0] || null; },
      textContent: '', innerHTML: '', hidden: false,
    };
    return el;
  };
  const corps = creer();
  return {
    createElement: creer,
    createTextNode: () => creer(),
    body: corps,
    documentElement: creer(),
    getElementById: () => creer(),
    querySelector: () => creer(),
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
  };
}

const documentAvant = global.document;
const windowAvant = global.window;
global.document = { createElement: () => faireCanvas().canvas };
global.window = { devicePixelRatio: 1, addEventListener() {}, location: { search: '' } };

try {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  const logique = faireCanvas();
  const visible = faireCanvas();
  const frames = [];
  const orch = creerOrchestrateurGrotte({
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
      maj: () => frames[frames.length - 1] || null,
      tactileActif: () => false,
      peripheriqueActif: () => 'manette',
    },
    ctxLogique: logique.ctx,
    ctxVisible: visible.ctx,
    canvasLogique: logique.canvas,
    graphismes: resoudreGraphismes(registre, save, null, '?qualite=moyen'),
  });

  const etat = (mx) => ({
    move: { x: mx, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: false, held: false }, menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
  });
  const tour = (mx) => { frames.push(etat(mx)); orch.maj(16); orch.dessiner(); };

  for (let i = 0; i < 90; i += 1) tour(1);

  const avant = {
    grains: orch.obtenirVisuelsTuiles().size,
    decor: orch.obtenirDecor().length,
    hero: { ...orch.obtenirHero() },
    heure: save.monde.heure,
    calque: statsCoucheStatique(),
  };
  assert.ok(avant.grains > 0 && avant.decor > 0, 'le témoin doit bien avoir du grain et du décor');
  assert.ok(avant.calque !== null, 'et un calque statique déjà construit');

  // Le changement lui-même.
  orch.appliquerGraphismes(resoudreGraphismes(registre, save, null, '?qualite=bas'));

  // a) Ce qui doit bouger.
  const grainsEnBas = orch.obtenirVisuelsTuiles().size;
  assert.ok(grainsEnBas < avant.grains, "le grain du sol s'allège tout de suite");
  assert.equal(orch.obtenirDecor().length, 0, 'et le décor part, sans changer de scène');
  assert.equal(statsCoucheStatique(), null, 'le calque statique est invalidé — UNE fois, en le jetant');
  assert.equal(orch.obtenirGraphismes().preset, 'bas');

  // b) Ce qui ne doit surtout PAS bouger : le jeu.
  assert.deepEqual({ ...orch.obtenirHero() }, avant.hero, 'le héros ne bouge pas d\'un pixel');
  assert.equal(save.monde.heure, avant.heure, 'l\'heure du monde ne saute pas');
  assert.equal(save.settings.graphismes, undefined, 'le preset RÉSOLU n\'est jamais persisté (§5.3)');

  // c) Une seule reconstruction, pas une par frame : la frame suivante refait
  //    le calque, et celle d'après le garde.
  tour(0);
  const refait = statsCoucheStatique();
  assert.ok(refait !== null, 'la frame suivante reconstruit');
  for (let i = 0; i < 30; i += 1) tour(0);
  assert.deepEqual(statsCoucheStatique(), refait, 'et à l\'arrêt, plus rien n\'est reconstruit');

  // d) Le retour en arrière rend exactement l'état d'avant — un réglage n'est
  //    pas un aller simple.
  orch.appliquerGraphismes(resoudreGraphismes(registre, save, null, '?qualite=moyen'));
  assert.equal(orch.obtenirVisuelsTuiles().size, avant.grains, 'le grain revient');
  assert.equal(orch.obtenirDecor().length, avant.decor, 'le décor aussi, et au même compte');

  console.log(
    `OK changement à chaud : grain ${avant.grains} → ${grainsEnBas} → ${orch.obtenirVisuelsTuiles().size} tuiles, `
    + `décor ${avant.decor} → 0 → ${orch.obtenirDecor().length}, calque jeté une fois, jeu intact`,
  );
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

console.log('--- D-115 : la carte est là, et le réglage se change en jeu.');

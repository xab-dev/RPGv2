// `D-112` — palier C, 1er levier : `particules`.
//
// Ce que le levier fait : il multiplie les quantités de particules déclarées
// par les effets **cosmétiques** de `data/effets.json`. À zéro, le système
// n'émet rien et ne dessine rien. Un effet `information` n'est jamais touché
// (§4.2 : Bas retire du cosmétique, jamais ce qui dit quelque chose au
// joueur).
//
// Ce que ce fichier NE fait pas : épingler les nombres du catalogue (règle
// `D-52`). Les multiplicateurs appartiennent à Xav et vivent en données. Ce
// qui se teste est le contrat — un ordre (Bas ≤ Moyen ≤ Haut), une
// équivalence (Moyen = l'état d'aujourd'hui), une extinction (Bas n'émet
// rien), une immunité (l'information ne bouge pas) — et l'invariant §4.1 :
// **un preset ne change jamais le jeu**, éprouvé sur la vraie scène Maison
// en faisant jouer les trois presets sur la MÊME suite de frames.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { appliquerParticules, lirePresetForce, valeurLevier } from '../src/qualite.js';
import {
  creerPoussiere, avancerPoussiere, bouffeesVisibles, CAPACITE_RESERVE,
} from '../src/poussiere.js';
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
const mult = (preset) => valeurLevier(config, preset, 'particules');

// --- 1. Moyen ne change rien : le contrat de non-régression ---------------
// Énoncé en ÉQUIVALENCE, jamais en nombres : sous le preset neutre, la
// configuration que le système reçoit est celle du catalogue, au champ près.
{
  for (const id of ['effet_poussiere', 'effet_sillage_follet', 'effet_curseur', 'effet_curseur_sillage']) {
    const brut = registre.obtenir('effets', id);
    const applique = appliquerParticules(brut, mult('moyen'), { capacite: CAPACITE_RESERVE });
    for (const champ of Object.keys(brut)) {
      assert.deepEqual(applique[champ], brut[champ], `${id} > ${champ} ne doit pas bouger sous Moyen`);
    }
    // La réserve effective est celle d'aujourd'hui — y compris pour un effet
    // qui ne déclare pas de `capacite` et vivait sur le défaut du module.
    const capaciteEffective = applique.capacite === undefined ? CAPACITE_RESERVE : applique.capacite;
    const capaciteAvant = brut.capacite === undefined ? CAPACITE_RESERVE : brut.capacite;
    assert.equal(capaciteEffective, capaciteAvant, `${id} : même réserve qu'avant le ticket`);
  }
  console.log("OK Moyen = l'état actuel (équivalence, pas une liste de nombres)");
}

// --- 2. L'ordre des presets, en relation -----------------------------------
{
  for (const id of ['effet_poussiere', 'effet_curseur_sillage']) {
    const brut = registre.obtenir('effets', id);
    const reserve = (p) => appliquerParticules(brut, mult(p), { capacite: CAPACITE_RESERVE }).capacite;
    assert.ok(reserve('bas') <= reserve('moyen'), `${id} : Bas n'a jamais plus de particules que Moyen`);
    assert.ok(reserve('moyen') <= reserve('haut'), `${id} : Haut n'en a jamais moins que Moyen`);
    assert.equal(reserve('bas'), 0, `${id} : Bas éteint le système`);
  }
  // L'orbite du curseur suit la même règle, avec son propre mot pour
  // « combien » : c'est bien le champ, pas le nom, qui compte.
  const curseur = registre.obtenir('effets', 'effet_curseur');
  assert.equal(appliquerParticules(curseur, mult('bas')).nb_particules, 0, "Bas : plus d'étincelles autour du curseur");
  assert.ok(
    appliquerParticules(curseur, mult('haut')).nb_particules >= curseur.nb_particules,
    "Haut : au moins autant d'étincelles qu'aujourd'hui",
  );
  console.log('OK Bas ≤ Moyen ≤ Haut, et Bas éteint');
}

// --- 3. Éteint veut dire : n'émet pas ET ne dessine pas --------------------
// Éprouvé sur le VRAI module de particules, pas sur la configuration seule :
// c'est la promesse visible du levier.
{
  const parcours = (preset) => {
    const effet = appliquerParticules(
      registre.obtenir('effets', 'effet_poussiere'), mult(preset), { capacite: CAPACITE_RESERVE },
    );
    const etat = creerPoussiere(effet);
    let vues = 0;
    for (let i = 1; i <= 400; i += 1) {
      avancerPoussiere(etat, {
        x: i * 3, y: 0, distancePx: 3, deltaMs: 16, emettre: true, depuisX: (i - 1) * 3, depuisY: 0,
      });
      vues = Math.max(vues, bouffeesVisibles(etat).length);
    }
    return vues;
  };
  const bas = parcours('bas');
  const moyen = parcours('moyen');
  const haut = parcours('haut');
  assert.equal(bas, 0, 'Bas : pas une bouffée sur 400 frames de marche');
  assert.ok(moyen > 0, 'Moyen : la traînée existe toujours');
  assert.ok(haut >= moyen, 'Haut : au moins autant de bouffées visibles');
  // `D-116` : dès que Haut multiplie, il doit SE VOIR — plus de bouffées à
  // l'écran au même pas, pas seulement une réserve plus grande qui ne se
  // remplit jamais (c'était le défaut : Haut rendait Moyen au pixel près).
  if (mult('haut') > mult('moyen')) assert.ok(haut > moyen, 'Haut : strictement plus de bouffées visibles que Moyen');
  console.log(`OK extinction réelle (bas ${bas}, moyen ${moyen}, haut ${haut} bouffées au plus)`);
}

// --- 4. L'information est immunisée ----------------------------------------
{
  const information = registre.tous('effets').filter((e) => e.role === 'information');
  assert.ok(information.length > 0, "le catalogue doit bien déclarer des effets d'information");
  for (const effet of information) {
    for (const preset of PRESETS) {
      assert.deepEqual(
        appliquerParticules(effet, mult(preset), { capacite: CAPACITE_RESERVE }), effet,
        `${effet.id} est de l'information : aucun preset n'y touche`,
      );
    }
  }
  console.log(`OK ${information.length} effets d'information intouchés dans les ${PRESETS.length} presets`);
}

// --- 5. `?qualite=` : forçage de debug, jamais un repli silencieux ---------
{
  assert.deepEqual(lirePresetForce('', config), { preset: null, avertissement: null });
  assert.deepEqual(lirePresetForce('?debug=fps', config), { preset: null, avertissement: null });
  for (const preset of PRESETS) {
    assert.equal(lirePresetForce(`?qualite=${preset}`, config).preset, preset);
  }
  for (const brut of ['ultra', 'auto', 'BAS', '']) {
    const lu = lirePresetForce(`?qualite=${brut}`, config);
    assert.equal(lu.preset, null, `?qualite=${brut} n'est pas un palier réel`);
    assert.ok(lu.avertissement && lu.avertissement.includes('ignoré'), "une valeur invalide s'annonce");
  }
  console.log("OK ?qualite= (auto refusé : ce n'est pas un palier, il se résout)");
}

// --- 6. La VRAIE fonction de démarrage, pas une décision rejouée ----------
{
  const avec = (choix, search) => {
    const save = saveNeuve();
    if (choix !== undefined) save.settings.graphismes = choix;
    return resoudreGraphismes(registre, save, null, search);
  };
  assert.equal(avec(undefined, null).auto, true, 'sans choix : Auto');
  assert.equal(avec('haut', null).preset, 'haut', 'le choix du joueur est respecté');

  const force = avec('haut', '?qualite=bas');
  assert.equal(force.preset, 'bas', "?qualite= l'emporte sur le réglage enregistré");
  assert.equal(force.auto, false, "un preset forcé n'est pas « choisi par Auto »");

  const invalide = avec('haut', '?qualite=ultra');
  assert.equal(invalide.preset, 'haut', 'valeur invalide : le réglage du joueur est conservé');
  assert.ok(invalide.avertissement.includes('ultra'), "et elle s'annonce, avec ce qui a été lu");

  // Deux avertissements peuvent tomber ensemble (réglage inconnu EN PLUS d'un
  // paramètre invalide) : aucun des deux ne doit manger l'autre.
  const deux = avec('ultra', '?qualite=extreme');
  assert.ok(deux.avertissement.includes('ultra') && deux.avertissement.includes('extreme'));
  console.log('OK resoudreGraphismes : forçage, conservation, double avertissement');
}

// --- 7. §4.1 — un preset ne change JAMAIS le jeu --------------------------
// La preuve se fait sur la vraie scène Maison, en jouant la MÊME suite de
// frames dans les trois presets et en comparant tout ce qui décide du jeu :
// solidité des tuiles, empreintes des stations, objets au sol, position et
// PV du héros, monstres, et la sauvegarde entière.
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

function empreinteDeJeu(preset) {
  const i18n = creerI18n(dictionnaires, 'fr');
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = {
    flag_follet_choisi: true,
    flag_grotte_sortie: true,
    flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true,
    flag_levier_salle1: true,
    flag_premier_ramassage: true,
  };
  const frames = [];
  const logique = faireCanvas();
  const visible = faireCanvas();
  const orch = creerOrchestrateurGrotte({
    registre,
    i18n,
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
      maj: () => frames[frames.length - 1],
      tactileActif: () => false,
      peripheriqueActif: () => 'manette',
    },
    ctxLogique: logique.ctx,
    ctxVisible: visible.ctx,
    canvasLogique: logique.canvas,
    graphismes: resoudreGraphismes(registre, save, null, `?qualite=${preset}`),
  });
  const etat = (mx, my) => ({
    move: { x: mx, y: my },
    attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: false, held: false },
    menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
  });
  // Un trajet qui va buter dans le décor : c'est là qu'une collision qui
  // aurait bougé se verrait.
  for (let i = 0; i < 600; i += 1) {
    const mx = i < 200 ? 1 : (i < 400 ? 0 : -1);
    const my = i < 200 ? 0 : (i < 400 ? 1 : -1);
    frames.push(etat(mx, my));
    orch.maj(16);
    orch.dessiner();
  }
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  // La solidité se relit par LA fonction de collision du jeu
  // (`estSolideAuPoint`), jamais par une grille recopiée à côté : c'est elle
  // qui décide où le héros peut se tenir, donc c'est elle qu'il faut comparer.
  const estFlagActif = (f) => !!orch.obtenirSave().flags[f];
  const solides = [];
  for (let ty = 0; ty < scene.height; ty += 1) {
    let ligne = '';
    for (let tx = 0; tx < scene.width; tx += 1) {
      const px = (tx + 0.5) * scene.tileSize;
      const py = (ty + 0.5) * scene.tileSize;
      ligne += scene.estSolideAuPoint(px, py, estFlagActif) ? '1' : '0';
    }
    solides.push(ligne);
  }
  return {
    solides: solides.join('|'),
    empreintesSolides: JSON.stringify(scene.empreintesSolides),
    hero: { x: hero.x, y: hero.y, pv: hero.pv },
    monstres: orch.obtenirMonstres().map((m) => `${m.id}@${Math.round(m.x)},${Math.round(m.y)}:${m.pv}`),
    // `saved_at` est une horloge, pas un fait de jeu : la comparer ferait
    // tomber ce test pour la seule raison que deux parties n'ont pas démarré
    // à la même milliseconde.
    save: { ...orch.obtenirSave(), saved_at: null },
  };
}

try {
  const reference = empreinteDeJeu('moyen');
  assert.ok(reference.solides.length > 0, 'la scène Maison doit bien avoir un monde');
  assert.ok(reference.solides.includes('1'), 'et des tuiles solides, sinon la comparaison ne prouve rien');
  // Le trajet doit vraiment avoir eu lieu : un scénario qui ne bouge pas
  // rendrait ce test vert sans rien éprouver.
  assert.ok(reference.save.monde.heure > 0, 'les 600 frames ont bien été jouées');
  assert.ok(reference.hero.x !== 0 || reference.hero.y !== 0, 'le héros a bien marché');
  for (const preset of PRESETS) {
    if (preset === 'moyen') continue;
    assert.deepEqual(empreinteDeJeu(preset), reference, `§4.1 : "${preset}" ne change rien au jeu`);
  }
  console.log(`OK §4.1 — le jeu est identique dans les ${PRESETS.length} presets (600 frames, scène Maison)`);
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

console.log('--- D-112 : le levier `particules` est branché, et il ne touche que le cosmétique.');

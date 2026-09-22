// `D-117` — palier E de `specs/09_reglages-graphiques.md` : le mode Auto.
//
// Auto démarre bas sur un appareil modeste (§5.1, livré et testé au palier B)
// et **descend seul** quand le jeu rame (§5.2). Ce fichier éprouve la
// descente, et les quatre promesses qui l'accompagnent : une descente par
// niveau, une seule annonce, jamais de remontée, rien pendant qu'une UI est
// ouverte.
//
// Aucune horloge nulle part : la durée de la fenêtre est la SOMME des deltas
// de frames, donc le test n'a rien à simuler — il donne des nombres. Et la
// règle n'est jamais recopiée ici (`D-72`) : ce qui est interrogé est la
// fonction de `qualite.js` d'un côté, le VRAI orchestrateur de l'autre.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { SEUIL_FRAME_LENTE_MS } from '../src/debug_perf.js';
import {
  creerDescenteAuto, doitDescendre, doitDescendreAgrege, presetInferieur,
} from '../src/qualite.js';
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
const SEUILS = { ...config.auto, seuil_frame_lente_ms: SEUIL_FRAME_LENTE_MS };
const LENTE = SEUIL_FRAME_LENTE_MS + 10;
const FLUIDE = 16;

// --- 1. UNE seule règle, deux appelants ----------------------------------
// `doitDescendre` (la liste, pour les tests et l'outillage) et
// `doitDescendreAgrege` (les compteurs courants, pour le jeu) doivent rendre
// le même verdict — sinon Auto descendrait sur un critère que personne n'a
// jamais lu. C'est la leçon de `D-71`/`D-72`, appliquée avant le bug.
{
  const jeux = [
    [],
    new Array(400).fill(FLUIDE),
    new Array(400).fill(LENTE),
    // 10 % de frames lentes : sous les 15 %, donc « assez fluide ».
    new Array(1000).fill(FLUIDE).map((v, i) => (i % 10 === 0 ? LENTE : v)),
    // 20 % : au-dessus.
    new Array(1000).fill(FLUIDE).map((v, i) => (i % 5 === 0 ? LENTE : v)),
  ];
  for (const deltas of jeux) {
    const parListe = doitDescendre(deltas, SEUILS);
    const parAgregats = doitDescendreAgrege({
      totalMs: deltas.reduce((s, d) => s + d, 0),
      framesLentes: deltas.filter((d) => d > SEUIL_FRAME_LENTE_MS).length,
      framesTotales: deltas.length,
    }, SEUILS);
    assert.deepEqual(parAgregats, parListe, "les deux formes de la décision ne peuvent pas diverger");
  }
  // La fenêtre INCOMPLÈTE ne descend jamais, même si tout y est lent : sans
  // cette borne, les trois premières frames d'un démarrage suffiraient.
  assert.equal(doitDescendre(new Array(5).fill(200), SEUILS).descendre, false);
  assert.equal(doitDescendre(new Array(5).fill(200), SEUILS).motif, 'fenêtre incomplète');
  console.log('OK la décision est la même vue de la liste et vue des compteurs');
}

// --- 2. La machine à états, sans horloge ----------------------------------
{
  // a) Fluide : elle ne descend jamais, quel que soit le temps passé.
  const fluide = creerDescenteAuto(config, SEUIL_FRAME_LENTE_MS);
  for (let i = 0; i < 5000; i += 1) {
    assert.equal(fluide.observer(FLUIDE, 'haut'), null, 'un jeu fluide ne descend pas');
  }

  // b) Lent : elle descend, et pas avant que la fenêtre soit pleine.
  const lent = creerDescenteAuto(config, SEUIL_FRAME_LENTE_MS);
  let premiere = null;
  let framesAvant = 0;
  while (premiere === null) {
    framesAvant += 1;
    premiere = lent.observer(LENTE, 'haut');
    assert.ok(framesAvant < 10000, 'elle doit finir par descendre');
  }
  assert.ok(
    framesAvant * LENTE >= config.auto.fenetre_ms,
    `la descente n'arrive qu'après ${config.auto.fenetre_ms} ms de jeu mesuré`,
  );
  assert.equal(premiere.preset, presetInferieur(config, 'haut'), 'UN cran, jamais deux');
  assert.equal(premiere.annoncer, true, 'la première descente se dit');
  console.log(`OK descente après ${framesAvant} frames lentes (${framesAvant * LENTE} ms de jeu)`);

  // c) La fenêtre repart de zéro : la frame suivante ne redescend pas.
  assert.equal(lent.observer(LENTE, premiere.preset), null, 'la fenêtre repart de zéro après une descente');

  // d) Un cran de plus, et une SEULE annonce — puis le plancher, où plus rien
  //    ne descend quoi qu'il arrive.
  let preset = premiere.preset;
  const descentes = [premiere];
  for (let i = 0; i < 20000; i += 1) {
    const d = lent.observer(LENTE, preset);
    if (!d) continue;
    descentes.push(d);
    assert.equal(
      presetInferieur(config, preset), d.preset,
      'chaque descente est exactement un cran sous le preset courant',
    );
    preset = d.preset;
  }
  assert.equal(presetInferieur(config, preset), null, 'la suite de descentes finit au plancher');
  assert.equal(
    descentes.filter((d) => d.annoncer).length, 1,
    "l'annonce est faite une fois, jamais répétée à chaque cran",
  );
  // « Jamais de remontée » : il n'existe aucun chemin qui rende un preset
  // au-dessus du courant. On l'éprouve sur la suite complète.
  const ordre = config.paliers.filter((p) => p.leviers !== undefined).map((p) => p.id);
  let rang = ordre.indexOf('haut');
  for (const d of descentes) {
    const nouveau = ordre.indexOf(d.preset);
    assert.ok(nouveau < rang, `${d.preset} doit être STRICTEMENT sous le précédent — Auto ne remonte jamais`);
    rang = nouveau;
  }
  console.log(`OK ${descentes.length} descente(s) jusqu'au plancher, 1 annonce, aucune remontée`);

  // e) Au plancher, on continue d'observer sans rien rendre.
  const plancher = creerDescenteAuto(config, SEUIL_FRAME_LENTE_MS);
  for (let i = 0; i < 3000; i += 1) {
    assert.equal(plancher.observer(LENTE, ordre[0]), null, `en "${ordre[0]}", plus rien ne descend`);
  }
  console.log(`OK en "${ordre[0]}" (plancher), Auto n'a plus rien à retirer`);
}

// --- 3. Le VRAI orchestrateur ---------------------------------------------
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

// Un jeu déjà commencé, dans la Maison, follet choisi : pas d'intro, donc des
// frames qui COMPTENT dès la première.
function partieEnCours(reglage) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.x = 85.5 * 32;
  save.hero.y = 52.5 * 32;
  save.hero.companion = 'comp_follet_eau';
  // `D-125` : les lignes d'ambiance, toutes, DÉRIVÉES du catalogue — un
  // dialogue gèle le temps actif, et ce fichier éprouve autre chose. Déduites
  // plutôt que recopiées, pour qu'une ligne de plus ne rouvre pas neuf
  // fichiers (`Q-42`).
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true, ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])), };
  if (reglage !== undefined) save.settings.graphismes = reglage;
  return save;
}

const MENU_INERTE = {
  estOuvert: () => false,
  traiterInput() {}, ouvrir() {}, ouvrirCraft() {}, rafraichirCraft() {},
  ouvrirCoffre() {}, rafraichirCoffre() {}, rafraichirStats() {},
};
// Un joueur qui ne touche à rien : on mesure les frames du jeu, pas ce qu'on
// y ferait. La forme est celle qu'`input.js` rend, et rien de plus.
const ETAT_NEUTRE = {
  move: { x: 0, y: 0 },
  attack: { pressed: false, held: false },
  skill_1: { pressed: false, held: false },
  skill_2: { pressed: false, held: false },
  skill_3: { pressed: false, held: false },
  consume: { pressed: false, held: false },
  interact: { pressed: false, held: false },
  menu: { pressed: false, held: false },
  target_next: { pressed: false, held: false },
};
const INPUT_INERTE = {
  maj: () => ETAT_NEUTRE, tactileActif: () => false, peripheriqueActif: () => 'manette',
};

function monterLeJeu(save, { menuOuvert = null, search = null } = {}) {
  const logique = faireCanvas();
  const visible = faireCanvas();
  const presetsAppliques = [];
  const orchestrateur = creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: menuOuvert ? { ...MENU_INERTE, estOuvert: menuOuvert } : MENU_INERTE,
    input: INPUT_INERTE,
    ctxLogique: logique.ctx,
    ctxVisible: visible.ctx,
    canvasLogique: logique.canvas,
    // Auto, sans signal d'appareil : `pointeurGrossier` faux, donc Moyen (§5.1).
    graphismes: resoudreGraphismes(registre, save, null, search),
    onGraphismesAppliques: (resolu) => presetsAppliques.push(resolu.preset),
  });
  return { orchestrateur, presetsAppliques };
}

function courir(orchestrateur, frames, deltaMs) {
  for (let i = 0; i < frames; i += 1) orchestrateur.maj(deltaMs);
}

// Court jusqu'à ce que le preset change, et rend le nombre de frames qu'il a
// fallu. Deux frames de plus après coup : l'annonce est POSÉE par la descente
// et RÉCLAMÉE à la frame suivante (elle peut avoir à attendre la bannière).
// Sans cette précision, le test regarderait la bannière trop tard — elle dure
// quelques secondes, le scénario en dure vingt.
function courirJusquAuChangement(orchestrateur, deltaMs, maxFrames) {
  const depart = orchestrateur.obtenirGraphismes().preset;
  for (let i = 1; i <= maxFrames; i += 1) {
    orchestrateur.maj(deltaMs);
    if (orchestrateur.obtenirGraphismes().preset !== depart) {
      orchestrateur.maj(deltaMs);
      return i;
    }
  }
  return null;
}

// De quoi remplir une fenêtre entière, plus la marge d'entrée en scène.
const FRAMES_POUR_DESCENDRE = Math.ceil(
  (config.auto.fenetre_ms + config.auto.delai_entree_scene_ms) / LENTE,
) + 2;

try {
  // a) Le cas du ticket : Auto part en Moyen, le jeu rame, Auto descend.
  {
    const save = partieEnCours();
    const { orchestrateur, presetsAppliques } = monterLeJeu(save);
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'moyen', 'sans pointeur grossier, Auto part en Moyen');
    assert.equal(orchestrateur.obtenirGraphismes().auto, true);

    // Les premières secondes d'une scène ne comptent pas : le calque s'y
    // construit, et le juger ferait descendre Auto sur un chargement.
    courir(orchestrateur, Math.floor(config.auto.delai_entree_scene_ms / LENTE), LENTE);
    assert.equal(
      orchestrateur.obtenirGraphismes().preset, 'moyen',
      `les ${config.auto.delai_entree_scene_ms} ms qui suivent l'entrée en scène ne comptent pas`,
    );

    const heroAvant = { x: save.hero.x, y: save.hero.y };
    const frames = courirJusquAuChangement(orchestrateur, LENTE, FRAMES_POUR_DESCENDRE);
    assert.ok(frames !== null, 'le jeu rame : Auto doit descendre');
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'bas', "et il descend d'un cran, en Bas");
    assert.deepEqual(presetsAppliques, ['bas'], 'une seule application, et le dehors en est prévenu');

    // Ce qui n'a PAS bougé. Le plus important d'abord (§5.3) : rien n'est
    // écrit dans la sauvegarde — le preset résolu par Auto ne se persiste
    // jamais, seul le choix du joueur le ferait.
    assert.equal(save.settings.graphismes, undefined, "Auto n'écrit RIEN dans la sauvegarde");
    assert.equal(orchestrateur.obtenirGraphismes().choix, undefined, 'le choix du joueur reste « jamais choisi »');
    assert.equal(orchestrateur.obtenirGraphismes().auto, true, 'et Auto reste Auto : il a résolu, pas choisi');
    assert.deepEqual({ x: save.hero.x, y: save.hero.y }, heroAvant, "le héros n'a pas bougé d'un pixel");

    // Et l'annonce, faite une fois, dans la langue du joueur.
    const banniere = orchestrateur.obtenirIndiceAffiche();
    assert.ok(banniere, 'la descente est DITE au joueur');
    assert.equal(banniere.label_key, config.auto.cle_annonce);
    assert.equal(banniere.glyphe_key, null, "une annonce n'a pas de touche à montrer");
    for (const langue of ['fr', 'en']) {
      const texte = creerI18n(dictionnaires, langue).t(config.auto.cle_annonce);
      assert.ok(texte && texte !== config.auto.cle_annonce, `le texte existe en ${langue}`);
    }

    // Elle passe, et elle ne revient pas : plus rien ne descend, plus rien ne
    // s'annonce, même si le jeu continue de ramer.
    courir(orchestrateur, FRAMES_POUR_DESCENDRE * 3, LENTE);
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'bas', 'en Bas, plus rien à retirer');
    assert.equal(orchestrateur.obtenirIndiceAffiche(), null, "l'annonce est éphémère, et unique");
    assert.deepEqual(presetsAppliques, ['bas'], 'aucune seconde application');
    console.log(`OK le jeu rame : Moyen -> Bas après ${frames} frames, annoncé une fois, sauvegarde intacte`);
  }

  // b) Un jeu fluide ne descend jamais.
  {
    const { orchestrateur } = monterLeJeu(partieEnCours());
    courir(orchestrateur, 4000, FLUIDE);
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'moyen', 'un jeu fluide reste où il est');
    assert.equal(orchestrateur.obtenirIndiceAffiche(), null, "et n'a rien à annoncer");
    console.log('OK un jeu fluide ne descend pas, même longtemps');
  }

  // c) Rien pendant qu'une UI est ouverte — le menu gèle le jeu, donc ses
  //    frames ne mesurent pas le jeu.
  {
    let ouvert = true;
    const { orchestrateur } = monterLeJeu(partieEnCours(), { menuOuvert: () => ouvert });
    courir(orchestrateur, FRAMES_POUR_DESCENDRE * 3, LENTE);
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'moyen', 'menu ouvert : aucune frame ne compte');
    // Le même jeu, menu refermé, descend — sans quoi le test ci-dessus ne
    // prouverait rien (il passerait aussi si Auto était cassé).
    ouvert = false;
    assert.ok(
      courirJusquAuChangement(orchestrateur, LENTE, FRAMES_POUR_DESCENDRE) !== null,
      'menu refermé, le même jeu descend',
    );
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'bas');
    console.log("OK une UI ouverte ne fait pas descendre Auto — et ne l'empêche pas ensuite");
  }

  // d) Un choix manuel COUPE Auto : le joueur a dit ce qu'il voulait.
  {
    const { orchestrateur } = monterLeJeu(partieEnCours('haut'));
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'haut');
    assert.equal(orchestrateur.obtenirGraphismes().auto, false);
    courir(orchestrateur, FRAMES_POUR_DESCENDRE * 3, LENTE);
    assert.equal(
      orchestrateur.obtenirGraphismes().preset, 'haut',
      'le joueur a choisi Haut : le jeu peut ramer, on ne le lui retire pas',
    );
    console.log('OK un choix manuel coupe Auto, même quand ça rame');
  }

  // e) `?qualite=` n'est pas un choix d'Auto non plus : l'outil de debug doit
  //    rendre ce qu'on lui demande, sinon une mesure changerait en cours de route.
  {
    const { orchestrateur } = monterLeJeu(partieEnCours(), { search: '?qualite=moyen' });
    assert.equal(orchestrateur.obtenirGraphismes().auto, false);
    courir(orchestrateur, FRAMES_POUR_DESCENDRE * 3, LENTE);
    assert.equal(orchestrateur.obtenirGraphismes().preset, 'moyen', '?qualite= tient bon, même quand ça rame');
    console.log("OK ?qualite= n'est pas piloté par Auto");
  }
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

console.log('--- D-117 : Auto descend seul, une fois, le dit une fois, et ne remonte jamais.');

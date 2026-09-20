// Contrat SD_construction-parite-clic-verbe_2026-09-19.md : cause racine
// DISTINCTE de SD_construction-ecrans-orphelins_2026-09-17.md, bien que le
// symptôme se ressemble (le menu Pause réapparaît en Construction). Cette
// fois le bug n'est PAS dans quel CONTRAT « ouvert » est vrai (déjà unifié,
// journal du 17/09 soir) mais dans `creerEcranListeGenerique#traiterInput` :
// sa branche `else` DÉDUIT « fermé par B/skill_3 » du seul fait que
// `controleur.estOuvert()` est faux après `controleur.traiterInput(etat)` —
// or une ACTION choisie par ATTACK (ex. sélectionner une station, qui appelle
// `ecranConstruction.fermerSansCallback()` via `demarrerConstruction`) peut
// AUSSI fermer ce contrôleur dans le même appel, sans jamais vouloir
// déclencher `onFermer`. Le clic, lui, appelle `toutes[i].action()`
// directement (`menu.js#reconstruire`), sans jamais passer par cette
// déduction — d'où la divergence : souris/tactile sains, manette ET clavier
// cassés identiquement (retour Xav, 2026-09-19).
//
// Méthode imposée (§3 de la fiche) : la séquence S1->S4 est jouée DEUX FOIS
// sur le VRAI `ui/menu.js` — (a) par clics DOM, (b) UNIQUEMENT par
// `menu.traiterInput(etat)` avec de vrais `attack.pressed`/`skill_3.pressed`/
// `move`, JAMAIS un appel direct à `entree.action()` (c'est précisément ce
// raccourci qui rendait test_sd_menu_ecrans_orphelins_2026-09-17.js vert sans
// voir ce bug — cf. son propre §2). Rouge attendu sur HEAD, chemin (b), dès la
// sélection de la première station.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { voisin, COLONNES_TUILES } from '../src/menu_cartes.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { initialiserMenu } from '../src/ui/menu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');
const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreursChargement, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

function etat({ moveX = 0, moveY = 0, attack = false, interact = false, skill1 = false, skill3 = false, menu = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: skill1, held: skill1 },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: skill3, held: skill3 },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: menu, held: menu },
  };
}
function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}

function saveDansLaMaison() {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  // Même position calme que test_construction_2026-09-17.js/
  // test_sd_menu_ecrans_orphelins_2026-09-17.js : loin du couloir (y=57) et
  // des 3 stations par défaut (table/cuisine 82,54 / coffre 86,54 / atelier
  // 89,61).
  save.hero.x = px(85, 52).x;
  save.hero.y = px(85, 52).y;
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_maison_decouverte: true,
  };
  return save;
}

// --- Faux DOM minimal pour exercer le VRAI ui/menu.js — même gabarit que
// test_construction_2026-09-17.js et test_sd_menu_ecrans_orphelins_2026-09-17.js
// (copié, pas partagé, convention du dépôt : un fichier par contrat).
class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.id = '';
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this._classes = [];
    this._listeners = {};
    this._texte = '';
    this.hidden = false;
    this.value = '';
  }
  setAttribut(nom, val) {
    if (nom === 'id') this.id = val;
    else if (nom === 'class') this._classes = (val || '').split(/\s+/).filter(Boolean);
    else if (nom.startsWith('data-')) {
      const cle = nom.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[cle] = val;
    } else if (nom === 'value') this.value = val;
  }
  appendChild(enfant) {
    enfant.parentNode = this;
    this.children.push(enfant);
    return enfant;
  }
  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }
  get textContent() {
    return this._texte;
  }
  set textContent(v) {
    this._texte = v;
    this.children = [];
  }
  set innerHTML(html) {
    this.children = analyserHTMLFactice(html);
    this.children.forEach((c) => (c.parentNode = this));
  }
  querySelectorAll(selecteur) {
    const resultats = [];
    const visiter = (el) => {
      for (const enfant of el.children) {
        if (correspondFactice(enfant, selecteur)) resultats.push(enfant);
        visiter(enfant);
      }
    };
    visiter(this);
    return resultats;
  }
  querySelector(selecteur) {
    return this.querySelectorAll(selecteur)[0] || null;
  }
}

function correspondFactice(el, selecteur) {
  if (selecteur.startsWith('#')) return el.id === selecteur.slice(1);
  if (selecteur.startsWith('.')) return el._classes.includes(selecteur.slice(1));
  if (selecteur.startsWith('[') && selecteur.endsWith(']')) {
    const nomAttr = selecteur.slice(1, -1);
    if (nomAttr.startsWith('data-')) {
      const cle = nomAttr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return Object.prototype.hasOwnProperty.call(el.dataset, cle);
    }
  }
  return selecteur === 'button' && el.tagName === 'BUTTON';
}

function analyserHTMLFactice(html) {
  const racine = new ElementFactice('root');
  const pile = [racine];
  const regexTag = /<(\/)?([a-zA-Z0-9-]+)([^>]*?)(\/)?>|([^<]+)/g;
  let m;
  while ((m = regexTag.exec(html))) {
    const [, fermante, nomTag, attrsStr, autoFerme, texte] = m;
    if (texte !== undefined) continue;
    if (fermante) {
      pile.pop();
      continue;
    }
    const el = new ElementFactice(nomTag);
    const regexAttr = /([a-zA-Z0-9-]+)(?:="([^"]*)")?/g;
    let a;
    while ((a = regexAttr.exec(attrsStr || ''))) {
      if (!a[1]) continue;
      el.setAttribut(a[1], a[2] !== undefined ? a[2] : true);
    }
    pile[pile.length - 1].appendChild(el);
    if (!autoFerme) pile.push(el);
  }
  return racine.children;
}

function creerFauxDocument() {
  return {
    createElement: (tag) => new ElementFactice(tag),
    body: new ElementFactice('body'),
  };
}

// Même critère que les autres tests de ce chantier (leçon du diagnostic reset
// invisible) : `hidden` seul ne suffit pas.
function estVisibleEffectif(el) {
  return el.hidden === false && el.style.display !== 'none' && el.style.display !== undefined;
}

function estLeBandeau(el) {
  return el.style.pointerEvents === 'none';
}

function declencherClic(el) {
  (el._listeners.click || []).forEach((fn) => fn());
}

// Le seul écran (bandeau exclu) actuellement visible sous document.body —
// vrai par construction du module (un seul écran plein/partiel focalisable à
// la fois, cf. carte §5).
function ecranVisible(document) {
  return document.body.children.find((el) => estVisibleEffectif(el) && !estLeBandeau(el)) || null;
}

function boutonsDe(ecran) {
  return ecran.querySelectorAll('button');
}

function construireBanc() {
  const save = saveDansLaMaison();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const document = creerFauxDocument();
  const menu = initialiserMenu({
    document, i18n, menus: registre.tous('menus'), exporterSauvegarde: () => {}, importerSauvegarde: () => {},
    // specs/08 palier C : de quoi donner des TUILES à la Poche (sans cela elle
    // est vide, et il n'y aurait que sa sortie à comparer).
    listerPoche: () => [
      { id: 'item_branche', label: 'Branche', quantite: 3, categorie: 'ressource', icone: 'visuel_branche', lignes: [] },
      { id: 'item_fruit', label: 'Fruit', quantite: 2, categorie: 'nourriture', icone: 'visuel_fruit', lignes: [] },
    ],
  });
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  // Câblage réel (main.js#demarrerJeu) : sans lui, la carte Construction ne
  // s'afficherait pas (sa condition ne serait pas évaluable) et n'aurait
  // aucune entrée à afficher.
  menu.definirEvaluateurCondition(orchestrateur.evaluerCondition);
  menu.definirEntreesConstruction(orchestrateur.entreesConstruction);
  // specs/08 palier C3 : de vraies tuiles dans l'écran Stats, et un point à
  // dépenser pour que la fiche ait son bouton « +1 ».
  save.hero.points_stats_libres = 3;
  menu.definirEntreesStats(orchestrateur.obtenirEntreesStats, orchestrateur.sousTitreStats);
  const conteneur = document.body.querySelector('#menu');
  return { save, orchestrateur, frames, menu, document, conteneur };
}

// Une frame verbe + une frame neutre (front montant), même patron que les 2
// autres fichiers de ce chantier.
function jouerVerbe(banc, etatVerbe) {
  banc.frames.push(etatVerbe);
  banc.orchestrateur.maj(16);
  banc.frames.push(etat());
  banc.orchestrateur.maj(16);
}

// specs/08_menus-cartes.md (palier A4) : le menu Pause est devenu une grille de
// cartes. Une entrée n'est plus un bouton `#menu-…` d'une liste, c'est une
// carte de `data/menus.json`, retrouvée par son id (`data-carte`) ; la sortie
// n'est plus l'entrée « Fermer » en fin de liste, c'est le bouton de
// l'en-tête figé (`data-sortie`) — et, au verbe, B à la racine.
function carteDuMenu(document, id) {
  const carte = document.body.querySelectorAll('[data-carte]').find((c) => c.dataset.carte === id);
  assert.ok(carte, `la carte "${id}" doit être affichée`);
  return carte;
}
function boutonSortieDuMenu(document) {
  return document.body.querySelector('[data-sortie]');
}

// Amène le focus de la grille sur une carte, uniquement par MOVE réel, en DEUX
// dimensions : depuis la case 0 (focus à l'ouverture d'un écran), autant de
// crans à droite que sa colonne, puis autant vers le bas que sa rangée. La
// position est LUE sur la grille affichée, jamais codée en dur.
function focaliserCarte(banc, id) {
  const { cases, colonnes } = banc.menu.obtenirEtatCartes();
  const cible = cases.indexOf(id);
  assert.ok(cible >= 0, `la carte "${id}" doit être dans la grille affichée`);
  for (let i = 0; i < cible % colonnes; i++) jouerVerbe(banc, etat({ moveX: 1 }));
  for (let i = 0; i < Math.floor(cible / colonnes); i++) jouerVerbe(banc, etat({ moveY: 1 }));
  assert.equal(banc.menu.obtenirEtatCartes().focus, cible, `le focus doit avoir atteint "${id}" au stick`);
}

// Navigue jusqu'à l'index `cible` d'un écran déjà ouvert, uniquement par MOVE
// réel (front montant par cran, `creerNavigationMenu`) — jamais
// `definirIndex()`, réservé au survol souris.
function focaliserIndex(banc, cible) {
  for (let i = 0; i < cible; i++) {
    jouerVerbe(banc, etat({ moveY: 1 }));
  }
}

function nomEcran(el, conteneur) {
  if (el === conteneur) return 'conteneur';
  if (estLeBandeau(el)) return 'bandeau';
  const h2 = el.querySelector('h2');
  return h2 ? `ecran:${h2.textContent}` : 'ecran-inconnu';
}

// Quadruplet du §3 de la fiche, traduit en assertions comparables : écrans
// visibles (bandeau exclu de rien ici, on veut TOUT voir), `menu.estOuvert()`,
// `constructionActif()`. « Qui reçoit MOVE » (fantôme/focus) se déduit de ces
// trois-là (main.js#maj : `constructionActif()` prioritaire sur le gameplay,
// `menu.estOuvert()` prioritaire sur `constructionActif()`) — pas une 4e
// mesure indépendante, donc pas dupliqué ici.
function instantane(banc) {
  const { document, orchestrateur, menu, conteneur } = banc;
  return {
    ecransVisibles: document.body.children
      .filter((el) => estVisibleEffectif(el))
      .map((el) => nomEcran(el, conteneur))
      .sort(),
    menuOuvert: menu.estOuvert(),
    constructionActif: orchestrateur.constructionActif(),
  };
}

// =========================================================================
// Partie 1 (§3.1) : séquence composée S1->S4, jouée deux fois sur deux bancs
// INDÉPENDANTS — (a) uniquement des clics DOM, (b) uniquement des verbes
// réels (`menu.traiterInput`, jamais `entree.action()` direct). Les deux
// séquences doivent produire exactement les mêmes instantanés, étape par
// étape.
// =========================================================================

function sequenceParClics() {
  const banc = construireBanc();
  const { document } = banc;
  const snaps = [];

  // Start : aucun équivalent clic (verbe des deux côtés, hors du champ de
  // parité — ouvre juste le menu Pause).
  jouerVerbe(banc, etat({ menu: true }));
  snaps.push(instantane(banc));

  declencherClic(carteDuMenu(document, 'carte_construction'));
  snaps.push(instantane(banc));

  // specs/08 palier C6 : la liste Construction est un maître-détail — au
  // pointeur, on SÉLECTIONNE la tuile puis on agit par le bouton de sa fiche.
  declencherClic(tuilesDe(ecranVisible(document))[0]); // 1ère station
  declencherClic(boutonFicheDe(ecranVisible(document)));
  snaps.push(instantane(banc));

  // MOVE (déplace le fantôme) : aucun équivalent clic, verbe des deux côtés.
  jouerVerbe(banc, etat({ moveX: -1 }));
  snaps.push(instantane(banc));

  // B (annule le placement) : le bandeau n'a ni focus ni bouton (carte §1.3),
  // verbe des deux côtés.
  jouerVerbe(banc, etat({ skill3: true }));
  snaps.push(instantane(banc));

  declencherClic(tuilesDe(ecranVisible(document))[1]); // 2e station
  declencherClic(boutonFicheDe(ecranVisible(document)));
  snaps.push(instantane(banc));

  // Pose confirmée : verbe des deux côtés (pas de bouton "poser" pendant le
  // placement).
  jouerVerbe(banc, etat({ attack: true }));
  snaps.push(instantane(banc));

  declencherClic(sortieDe(ecranVisible(document))); // la sortie de l'écran, dans son en-tête
  snaps.push(instantane(banc));

  declencherClic(boutonSortieDuMenu(document)); // [X] de l'en-tête, à la racine
  snaps.push(instantane(banc));

  return snaps;
}

function sequenceParVerbes() {
  const banc = construireBanc();

  jouerVerbe(banc, etat({ menu: true }));
  const snaps = [instantane(banc)];

  // Focus par défaut = case 0 après ouverture ; la carte Construction tient
  // la case contextuelle — sa position est lue sur la grille affichée plutôt
  // que codée en dur, au cas où le catalogue bougerait un jour.
  focaliserCarte(banc, 'carte_construction');
  jouerVerbe(banc, etat({ attack: true }));
  snaps.push(instantane(banc));

  // A sur la 1ère station (index 0, focus par défaut à l'ouverture de la
  // liste) — AUCUN appel direct à `entree.action()` : uniquement l'ATTACK
  // réel routé par `menu.traiterInput` -> `ecranConstruction.traiterInput`.
  jouerVerbe(banc, etat({ attack: true }));
  snaps.push(instantane(banc));

  jouerVerbe(banc, etat({ moveX: -1 }));
  snaps.push(instantane(banc));

  jouerVerbe(banc, etat({ skill3: true }));
  snaps.push(instantane(banc));

  // A sur la 2e station (index 1) : navigation réelle avant l'ATTACK.
  focaliserTuile(banc, 1);
  jouerVerbe(banc, etat({ attack: true }));
  snaps.push(instantane(banc));

  jouerVerbe(banc, etat({ attack: true })); // pose confirmée
  snaps.push(instantane(banc));

  // Quitter la liste : B — la même fonction que la sortie de son en-tête (elle
  // n'est plus une entrée focalisable, comme sur la grille de cartes).
  jouerVerbe(banc, etat({ skill3: true }));
  snaps.push(instantane(banc));

  // Fermer le menu Pause : B à la racine — la même fonction que le [X] de
  // l'en-tête (la sortie a quitté la grille, elle n'est plus une entrée
  // focalisable).
  jouerVerbe(banc, etat({ skill3: true }));
  snaps.push(instantane(banc));

  return snaps;
}

{
  const snapsClics = sequenceParClics();
  const snapsVerbes = sequenceParVerbes();
  assert.equal(snapsClics.length, snapsVerbes.length, 'les deux séquences doivent avoir le même nombre d\'étapes');

  const LIBELLES = [
    'Start', 'Construction (ouverture liste)', 'A sur la 1ère station',
    'MOVE (fantôme)', 'B (annule, retour liste)', 'A sur la 2e station',
    'A (pose confirmée)', 'Fermer la liste (B logique)', 'Fermer le menu Pause',
  ];
  snapsClics.forEach((snapClic, i) => {
    assert.deepEqual(
      snapsVerbes[i], snapClic,
      `étape "${LIBELLES[i]}" : verbe (${JSON.stringify(snapsVerbes[i])}) doit produire le même état que clic (${JSON.stringify(snapClic)})`
    );
  });
  console.log('OK parité clic/verbe sur la séquence composée S1->S4 (Construction)');
}

// =========================================================================
// Partie 2 (§3.4, invariant permanent) : pour CHAQUE entrée de CHAQUE écran
// générique (Poche/Craft/Coffre/Stats/Construction), clic et verbe doivent
// produire le même quadruplet. Liste d'entrées TOUJOURS lue depuis le DOM
// réel, jamais codée en dur — un futur écran ou une future entrée est
// couvert(e) sans toucher ce fichier.
// =========================================================================

function ouvrirPoche(banc) {
  jouerVerbe(banc, etat({ menu: true }));
  declencherClic(carteDuMenu(banc.document, 'carte_heros'));
  declencherClic(carteDuMenu(banc.document, 'carte_poche'));
}
function ouvrirStats(banc) {
  jouerVerbe(banc, etat({ menu: true }));
  declencherClic(carteDuMenu(banc.document, 'carte_heros'));
  declencherClic(carteDuMenu(banc.document, 'carte_stats'));
}
function ouvrirConstructionListe(banc) {
  jouerVerbe(banc, etat({ menu: true }));
  declencherClic(carteDuMenu(banc.document, 'carte_construction'));
}
function ouvrirCraft(banc) {
  // specs/08 palier C5 : Craft est un maître-détail — des entrées à TUILES.
  banc.menu.ouvrirCraft(() => [
    { titre: 'Hache (test)', libelleAction: 'Fabriquer (test)', action: () => {} },
    { titre: 'Pioche (test)', libelleAction: 'Fabriquer (test)', grisee: true, action: () => {} },
  ], 'Craft (test)');
}
function ouvrirCoffre(banc) {
  // specs/08 palier C4 : le Coffre est un maître-détail — des entrées à TUILES, en deux groupes.
  banc.menu.ouvrirCoffre(() => [
    { groupe: 'Poche (test)', titre: 'Branche', quantite: 2, libelleAction: 'Déposer (test)', action: () => {} },
    { groupe: 'Coffre (test)', titre: 'Bois', quantite: 5, libelleAction: 'Retirer (test)', action: () => {} },
  ], 'Coffre (test)');
}

function testerCliqueVsVerbePourEcran(nomDeLEcran, ouvrir) {
  const bancSonde = construireBanc();
  ouvrir(bancSonde);
  const ecranSonde = ecranVisible(bancSonde.document);
  assert.ok(ecranSonde, `${nomDeLEcran} : un écran doit être visible après ouverture`);
  const nbEntrees = boutonsDe(ecranSonde).length;
  assert.ok(nbEntrees >= 1, `${nomDeLEcran} : au moins l'entrée "Fermer"`);

  for (let idx = 0; idx < nbEntrees; idx++) {
    const bancClic = construireBanc();
    ouvrir(bancClic);
    declencherClic(boutonsDe(ecranVisible(bancClic.document))[idx]);
    const snapClic = instantane(bancClic);

    const bancVerbe = construireBanc();
    ouvrir(bancVerbe);
    focaliserIndex(bancVerbe, idx);
    jouerVerbe(bancVerbe, etat({ attack: true }));
    const snapVerbe = instantane(bancVerbe);

    assert.deepEqual(
      snapVerbe, snapClic,
      `${nomDeLEcran}, entrée ${idx} : clic (${JSON.stringify(snapClic)}) et verbe (${JSON.stringify(snapVerbe)}) doivent produire le même quadruplet`
    );
  }
  console.log(`OK parité clic/verbe : ${nomDeLEcran} (${nbEntrees} entrée(s))`);
}

// =========================================================================
// specs/08_menus-cartes.md, palier C : les écrans « maître-détail »
// (`ui/ecran_fiches.js`). Le geste n'y est plus « un bouton par entrée » : une
// tuile se SÉLECTIONNE, et c'est le bouton de la fiche qui agit. L'invariant
// de cette fiche, lui, ne bouge pas — le pointeur et les verbes doivent
// produire le même quadruplet :
//   pointeur : clic sur la tuile, puis clic sur le bouton de la fiche
//   verbes   : le stick jusqu'à la tuile (par `voisin()`, la fonction même du
//              composant), puis ATTACK
// et pour la SORTIE : clic sur le bouton d'en-tête, contre B. Les tuiles sont
// lues dans le DOM réel, jamais codées en dur.
// =========================================================================
// (Des déclarations de fonction, hissées : la Partie 1, plus haut, s'en sert.)
function tuilesDe(ecran) { return ecran.querySelectorAll('[data-tuile]'); }
function boutonFicheDe(ecran) { return ecran.querySelectorAll('[data-action]')[0] || null; }
function sortieDe(ecran) { return ecran.querySelectorAll('[data-sortie]')[0] || null; }

// Le chemin le plus court, au stick, du focus courant à la case visée.
function focaliserTuile(banc, indexEntree) {
  const { cases, focus } = banc.menu.obtenirEtatFiches();
  const cible = cases.indexOf(indexEntree);
  const presente = (i) => cases[i] !== null;
  const precedent = new Map([[focus, null]]);
  const file = [focus];
  while (file.length && !precedent.has(cible)) {
    const i = file.shift();
    for (const direction of ['haut', 'bas', 'gauche', 'droite']) {
      const j = voisin(i, direction, COLONNES_TUILES, cases.length, presente);
      if (!precedent.has(j)) { precedent.set(j, [i, direction]); file.push(j); }
    }
  }
  assert.ok(precedent.has(cible), `la tuile ${indexEntree} doit être atteignable au stick`);
  const chemin = [];
  for (let i = cible; precedent.get(i); i = precedent.get(i)[0]) chemin.unshift(precedent.get(i)[1]);
  const pousse = { haut: { moveY: -1 }, bas: { moveY: 1 }, gauche: { moveX: -1 }, droite: { moveX: 1 } };
  for (const direction of chemin) jouerVerbe(banc, etat(pousse[direction]));
}

function testerPariteFiches(nomDeLEcran, ouvrir) {
  const bancSonde = construireBanc();
  ouvrir(bancSonde);
  const ecranSonde = ecranVisible(bancSonde.document);
  assert.ok(ecranSonde && sortieDe(ecranSonde), `${nomDeLEcran} : un écran « maître-détail » doit être visible après ouverture`);
  const nbTuiles = tuilesDe(ecranSonde).length;

  for (let idx = 0; idx < nbTuiles; idx++) {
    const bancClic = construireBanc();
    ouvrir(bancClic);
    declencherClic(tuilesDe(ecranVisible(bancClic.document))[idx]);
    const bouton = boutonFicheDe(ecranVisible(bancClic.document));
    if (bouton) declencherClic(bouton);
    const snapClic = instantane(bancClic);
    const focusClic = bancClic.menu.obtenirEtatFiches().entreeFocalisee;

    const bancVerbe = construireBanc();
    ouvrir(bancVerbe);
    focaliserTuile(bancVerbe, idx);
    const focusVerbe = bancVerbe.menu.obtenirEtatFiches().entreeFocalisee;
    jouerVerbe(bancVerbe, etat({ attack: true }));
    const snapVerbe = instantane(bancVerbe);

    assert.equal(focusVerbe, focusClic, `${nomDeLEcran}, tuile ${idx} : le stick et le clic sélectionnent la même entrée`);
    assert.deepEqual(
      snapVerbe, snapClic,
      `${nomDeLEcran}, tuile ${idx} : pointeur (${JSON.stringify(snapClic)}) et verbes (${JSON.stringify(snapVerbe)}) doivent produire le même quadruplet`
    );
  }

  // La sortie : le bouton d'en-tête contre B.
  const bancClic = construireBanc();
  ouvrir(bancClic);
  declencherClic(sortieDe(ecranVisible(bancClic.document)));
  const bancVerbe = construireBanc();
  ouvrir(bancVerbe);
  jouerVerbe(bancVerbe, etat({ skill3: true }));
  assert.deepEqual(instantane(bancVerbe), instantane(bancClic), `${nomDeLEcran} : la sortie au clic et B doivent mener au même endroit`);
  console.log(`OK parité pointeur/verbes : ${nomDeLEcran} (maître-détail, ${nbTuiles} tuile(s) + la sortie)`);
}

testerPariteFiches('Poche', ouvrirPoche);
testerPariteFiches('Stats', ouvrirStats);
testerPariteFiches('Construction (liste)', ouvrirConstructionListe);
testerPariteFiches('Craft', ouvrirCraft);
testerPariteFiches('Coffre', ouvrirCoffre);

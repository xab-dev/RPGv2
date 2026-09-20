// Contrat SD_construction-ecrans-orphelins_2026-09-17.md, fondé sur
// docs/CARTE_cycle-de-vie-ui_2026-09-17.md §1.2/§3 : `menu.estOuvert()`
// OR-combine 7 signaux à DEUX contrats différents (booléen pur pour
// `controleur`/`controleurConfirmation`, booléen ET `!el.hidden` pour les 5
// écrans génériques). Le correctif d'`a70a089` (`controleur.fermer()` dans
// `ouvrirPlacementConstruction`) répare le sens ALLER (liste -> placement)
// mais casse le sens RETOUR : `reouvrirListeConstruction()` rouvre
// `ecranConstruction` sans jamais rouvrir `controleur` — `menu.estOuvert()`
// retombe à `false` alors que `conteneur` est réaffiché par
// `onFermerVersMenuPrincipal()`. Ce fichier exerce le VRAI `ui/menu.js` (pas
// le stub à 3 booléens des autres tests de ce chantier) sur la séquence
// composée complète, pas transition par transition — copié plutôt que
// partagé depuis test_construction_2026-09-17.js (convention du dépôt, un
// fichier par contrat).
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
  // Tuile intérieure calme (79..92, 51..62), loin du couloir (y=57) et des
  // 3 stations par défaut (table/cuisine 82,54 / coffre 86,54 / atelier 89,61)
  // — même position que test_construction_2026-09-17.js#saveDansLaMaison.
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
// test_construction_2026-09-17.js (copié, pas partagé, convention du dépôt) et
// test_phase1_sd_menu_reset_invisible_2026-09-15.js.
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
  return false;
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

// Même critère que test_phase1_sd_menu_reset_invisible / test_construction :
// `hidden` seul ne suffit pas (leçon du diagnostic reset invisible).
function estVisibleEffectif(el) {
  return el.hidden === false && el.style.display !== 'none' && el.style.display !== undefined;
}

// Le bandeau (`ui/menu.js`) est le seul écran DOM sans focus/navigation —
// posé en `pointer-events: none` dans le vrai code (jamais dans les 7 autres
// enfants directs de `document.body` : `conteneur`, `confirmation`, les 5
// écrans génériques). Marqueur structurel plutôt qu'une référence directe
// (non exposée par `initialiserMenu`), documenté ici pour ne pas devenir un
// piège si un futur écran adoptait aussi `pointer-events: none` pour une
// autre raison.
function estLeBandeau(el) {
  return el.style.pointerEvents === 'none';
}

// « Au moins un écran de menu (bandeau exclu) visible dans le DOM » — carte
// §1.2 : exactement les 7 signaux OR-combinés par `menu.estOuvert()`, jamais
// le bandeau (voir `ui/menu.js#estOuvert` et le journal pour le pourquoi).
function auMoinsUnEcranMenuVisibleSansBandeau(document) {
  return document.body.children.some((el) => estVisibleEffectif(el) && !estLeBandeau(el));
}

// specs/08_menus-cartes.md (palier A4) : le menu Pause est devenu une grille de
// cartes. Une entrée n'est plus un bouton `#menu-…` d'une liste, c'est une
// carte de `data/menus.json`, retrouvée par son id (`data-carte`). Un clic
// dessus passe par la même fonction que le verbe ATTACK.
function carteDuMenu(document, id) {
  return document.body.querySelectorAll('[data-carte]').find((c) => c.dataset.carte === id) || null;
}

function declencherClic(el) {
  (el._listeners.click || []).forEach((fn) => fn());
}

// Invariant vérifié après CHAQUE verbe de la séquence, §3 de la fiche :
// - `menu.estOuvert()` doit refléter EXACTEMENT la visibilité DOM des 7
//   écrans qu'il OR-combine (bandeau exclu, cf. commentaire sur
//   `ui/menu.js#estOuvert` : l'y inclure romprait la priorité de dispatch de
//   `main.js#maj()`, jamais touchée par cette fiche).
// - `menu.bandeauEstOuvert()` doit coïncider avec `constructionActif()` —
//   c'est l'appariement par convention de la carte §1.3, désormais
//   vérifiable au lieu d'implicite.
// - `uiOuverteMaintenant()` reste l'OR exact de ses composantes (carte §1.1).
function verifierInvariants(orchestrateur, menu, document) {
  const visibleSansBandeau = auMoinsUnEcranMenuVisibleSansBandeau(document);
  assert.equal(
    menu.estOuvert(), visibleSansBandeau,
    `menu.estOuvert() (${menu.estOuvert()}) doit refléter exactement la visibilité DOM des écrans (${visibleSansBandeau}), bandeau exclu`
  );
  assert.equal(
    menu.bandeauEstOuvert(), orchestrateur.constructionActif(),
    'le bandeau ne doit être visible QUE pendant que constructionActif() est vrai (carte §1.3)'
  );
  const attendu = (
    menu.estOuvert() || orchestrateur.constructionActif() || orchestrateur.dialogueOuvert() ||
    orchestrateur.obtenirChoixFollet() !== null || orchestrateur.obtenirIntro() !== null || orchestrateur.obtenirDepart() !== null
  );
  assert.equal(orchestrateur.uiOuverteMaintenant(), attendu, 'uiOuverteMaintenant() doit rester l\'OR exact de ses composantes');
}

function construireBanc() {
  const save = saveDansLaMaison();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const document = creerFauxDocument();
  const menu = initialiserMenu({ document, i18n, menus: registre.tous('menus'), exporterSauvegarde: () => {}, importerSauvegarde: () => {} });
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  // Câblage réel (main.js#demarrerJeu) : sans lui, la carte Construction
  // ne s'afficherait pas (condition non évaluable) et n'aurait aucune entrée à afficher et le clic ci-dessous n'ouvrirait
  // qu'une liste vide.
  menu.definirEvaluateurCondition(orchestrateur.evaluerCondition);
  menu.definirEntreesConstruction(orchestrateur.entreesConstruction);
  const conteneur = document.body.querySelector('#menu');
  return { save, orchestrateur, frames, menu, document, conteneur };
}

// Une frame verbe + une frame neutre (front montant, §3 de la fiche
// 05_construction-stations.md) — même patron que
// test_construction_2026-09-17.js#pousserAxe/pousserBouton, invariant vérifié
// après chacune.
function jouerVerbe(banc, etatVerbe) {
  banc.frames.push(etatVerbe);
  banc.orchestrateur.maj(16);
  verifierInvariants(banc.orchestrateur, banc.menu, banc.document);
  banc.frames.push(etat());
  banc.orchestrateur.maj(16);
  verifierInvariants(banc.orchestrateur, banc.menu, banc.document);
}

// --- Séquence composée complète, §3 de la fiche : Start -> Construction ->
// A (station) -> MOVE (fantôme, pas le focus) -> B -> liste -> A (autre
// station) -> A (pose) -> liste -> B -> menu Pause visible ET rouvert ->
// Quitter -> rien de visible, héros mobile. ------------------------------
{
  const banc = construireBanc();
  const { orchestrateur, menu, document, conteneur } = banc;

  // Start : ouvre le VRAI menu Pause (bouton "Construction" compris).
  jouerVerbe(banc, etat({ menu: true }));
  assert.equal(menu.estOuvert(), true, 'Start ouvre le menu Pause');
  assert.equal(estVisibleEffectif(conteneur), true);

  // Clic réel sur "Construction" (équivalent souris du focus+ATTACK,
  // exerce exactement actionOuvrirConstruction()) : liste ouverte, conteneur
  // masqué.
  declencherClic(carteDuMenu(document, 'carte_construction'));
  verifierInvariants(orchestrateur, menu, document);
  assert.equal(menu.estOuvert(), true, 'liste Construction ouverte : menu.estOuvert() doit rester vrai');
  assert.equal(estVisibleEffectif(conteneur), false, 'conteneur masqué au profit de la liste');

  // A sur une station (même patron que test_construction_2026-09-17.js#C3 :
  // `entree.action()` EST l'action que le bouton réel invoquerait — vérifié
  // ci-dessus par le clic sur #menu-construction pour l'étape précédente).
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  assert.ok(entreeAtelier, 'l\'atelier fait partie des entrées');
  entreeAtelier.action();
  verifierInvariants(orchestrateur, menu, document);
  assert.equal(orchestrateur.constructionActif(), true, 'le mode Construction démarre');
  assert.equal(menu.estOuvert(), false, 'le menu Pause (contrôleur de premier niveau inclus) doit être entièrement fermé à l\'entrée en placement');
  assert.equal(menu.bandeauEstOuvert(), true, 'le bandeau remplace la liste pendant le placement');

  // MOVE : le premier mouvement après A doit bouger le FANTÔME, jamais
  // naviguer un menu Pause fantôme (régression du symptôme 3 de la fiche).
  const poseDepart = { ...orchestrateur.obtenirConstruction().pose };
  jouerVerbe(banc, etat({ moveX: -1 }));
  const poseApres = orchestrateur.obtenirConstruction().pose;
  assert.deepEqual(
    { x: poseApres.x, y: poseApres.y }, { x: poseDepart.x - 1, y: poseDepart.y },
    'le premier MOVE après A doit déplacer le fantôme'
  );

  // B (skill_3) : annule, retour à la LISTE (jamais au jeu nu, jamais au
  // menu Pause).
  jouerVerbe(banc, etat({ skill3: true }));
  assert.equal(orchestrateur.constructionActif(), false, 'B annule le placement');
  assert.equal(menu.estOuvert(), true, 'la liste Construction doit être réouverte');
  assert.equal(menu.bandeauEstOuvert(), false, 'le bandeau doit disparaître au retour à la liste');
  assert.equal(estVisibleEffectif(conteneur), false, 'toujours pas le menu Pause nu, la LISTE');

  // A sur une AUTRE station.
  const entreeCuisine = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.cuisine'));
  assert.ok(entreeCuisine, 'la cuisine fait partie des entrées');
  entreeCuisine.action();
  verifierInvariants(orchestrateur, menu, document);
  assert.equal(orchestrateur.constructionActif(), true);
  assert.equal(menu.estOuvert(), false, 'ré-entrée en placement : menu Pause de nouveau entièrement fermé');

  // A (pose confirmée, position par défaut de la cuisine déjà valide au
  // chargement — aucun déplacement nécessaire pour ce test).
  assert.equal(orchestrateur.obtenirConstruction().verdict.ok, true, 'position par défaut valide');
  jouerVerbe(banc, etat({ attack: true }));
  assert.equal(orchestrateur.constructionActif(), false, 'la pose confirmée quitte le placement');
  assert.equal(menu.estOuvert(), true, 'retour à la LISTE après confirmation');
  assert.equal(estVisibleEffectif(conteneur), false, 'toujours la liste, pas le menu Pause nu');

  // B (skill_3) DEPUIS LA LISTE, aucune station choisie cette fois : doit
  // revenir au menu Pause RÉEL, avec son contrôleur de premier niveau
  // rouvert (cause racine H1 de SD_construction-ecrans-orphelins : sous
  // a70a089, `controleur` restait fermé pour toujours après la première
  // entrée en placement — ce `B`-ci exposait le symptôme 3, DOM affiché avec
  // `menu.estOuvert() === false`).
  jouerVerbe(banc, etat({ skill3: true }));
  assert.equal(menu.estOuvert(), true, 'retour au menu Pause : menu.estOuvert() doit être vrai');
  assert.equal(estVisibleEffectif(conteneur), true, 'le menu Pause (conteneur) doit être visible, pas seulement "logiquement" ouvert');

  // Quitter (skill_3 depuis le menu Pause nu) : plus rien de visible, le
  // héros redevient mobile.
  const heroAvant = { x: orchestrateur.obtenirHero().x, y: orchestrateur.obtenirHero().y };
  jouerVerbe(banc, etat({ skill3: true }));
  assert.equal(menu.estOuvert(), false, 'Quitter ferme entièrement le menu');
  assert.equal(auMoinsUnEcranMenuVisibleSansBandeau(document), false, 'plus aucun écran de menu visible');
  jouerVerbe(banc, etat({ moveX: 1 }));
  const heroApres = orchestrateur.obtenirHero();
  assert.notEqual(heroApres.x, heroAvant.x, 'le héros doit redevenir mobile après Quitter');

  console.log('OK séquence composée Start -> Construction -> A -> MOVE -> B -> liste -> A -> A -> liste -> B -> Pause -> Quitter');
}

// --- Même séquence jusqu'au placement, puis MENU (Start) pendant le
// placement au lieu de B : doit annuler et revenir PROPREMENT au menu Pause,
// jamais superposé (§4 de specs/05_construction-stations.md, jamais retouché
// par cette fiche — reconstruit entièrement par menu.ouvrir(), voir §1 de la
// fiche : "Start + Quitter répare parce que menu.ouvrir() reconstruit tout"). -
{
  const banc = construireBanc();
  const { save, orchestrateur, menu, document, conteneur } = banc;

  jouerVerbe(banc, etat({ menu: true }));
  declencherClic(carteDuMenu(document, 'carte_construction'));
  verifierInvariants(orchestrateur, menu, document);
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  entreeAtelier.action();
  verifierInvariants(orchestrateur, menu, document);
  assert.equal(orchestrateur.constructionActif(), true);

  jouerVerbe(banc, etat({ moveX: -1 }));

  // MENU pendant le placement : annule, revient au menu Pause.
  jouerVerbe(banc, etat({ menu: true }));
  assert.equal(orchestrateur.constructionActif(), false, 'MENU annule le placement en cours');
  assert.equal(menu.estOuvert(), true, 'retour au menu Pause : menu.estOuvert() doit être vrai');
  assert.equal(estVisibleEffectif(conteneur), true, 'le menu Pause (conteneur) doit être visible');
  assert.equal(menu.bandeauEstOuvert(), false, 'le bandeau doit disparaître');
  assert.equal(save.maison?.stations?.station_atelier, undefined, 'MENU annule sans jamais persister');

  const heroAvant = { x: orchestrateur.obtenirHero().x, y: orchestrateur.obtenirHero().y };
  jouerVerbe(banc, etat({ skill3: true }));
  assert.equal(menu.estOuvert(), false, 'Quitter ferme entièrement le menu');
  jouerVerbe(banc, etat({ moveX: 1 }));
  assert.notEqual(orchestrateur.obtenirHero().x, heroAvant.x, 'le héros doit redevenir mobile');

  console.log('OK MENU pendant le placement -> annule proprement, retour au menu Pause, héros mobile ensuite');
}

// specs/08_menus-cartes.md, palier B2 — UNE seule pile. Le test d'invariant que
// la spec exige (§6) et que la carte proposait (docs/CARTE_cycle-de-vie-ui_
// 2026-09-17.md, pistes) : sur TOUTES les transitions de son tableau §3,
//
//     menu.estOuvert() === au moins un écran réellement visible
//
// et, plus fort, ce que la pile garantit par construction : jamais DEUX écrans
// visibles à la fois. Vérifié après CHAQUE frame et CHAQUE clic, avec le vrai
// `ui/menu.js`, le vrai orchestrateur et le vrai catalogue — jamais un stub.
//
// Les transitions du tableau, telles qu'elles existent depuis le palier A :
// Start → menu Pause · Quitter (`[X]`, B) · Craft/Coffre par INTERACT · Stats ·
// Poche · Reset + confirmation (Non au clic, Non par B, Oui) · Construction
// (liste) · liste → placement · placement → liste (A, B) · placement → menu
// Pause (MENU) · liste → menu Pause (B). Plus celles que la grille a ajoutées :
// dossier du catalogue, bascule, action.
//
// Faux DOM copié du test des écrans orphelins (convention du dépôt : copié,
// pas partagé).
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
    menu: { pressed: menu, held: menu }, target_next: { pressed: false, held: false },
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

// --- L'invariant du palier B --------------------------------------------------
// « Écran » = un enfant direct du document qui porte la classe des écrans
// plein écran. Le bandeau de placement n'en est pas un (ni focus, ni verbes :
// ils vont à `main.js`), pas plus que le sélecteur de fichier caché.
// (Ce faux DOM n'a pas de setter `className` : la classe posée par le code y
// reste une simple propriété, celle d'un gabarit HTML va dans `_classes`.)
const aLaClasse = (el, classe) => el._classes.includes(classe) || String(el.className || '').split(" ").includes(classe);
function ecransVisibles(document) {
  return document.body.children.filter((el) => aLaClasse(el, 'ecran-ui') && estVisibleEffectif(el));
}

function verifierInvariants(banc, contexte) {
  const { orchestrateur, menu, document } = banc;
  const visibles = ecransVisibles(document);
  assert.ok(visibles.length <= 1, `${contexte} : jamais deux écrans visibles à la fois (${visibles.length})`);
  assert.equal(menu.estOuvert(), visibles.length === 1,
    `${contexte} : menu.estOuvert() (${menu.estOuvert()}) === au moins un écran réellement visible (${visibles.length})`);
  const pile = menu.obtenirEtatPile();
  if (pile.profondeur === 0) assert.equal(visibles.length, 0, `${contexte} : pile vide, donc rien à l'écran`);
  assert.equal(menu.bandeauEstOuvert(), orchestrateur.constructionActif(),
    `${contexte} : le bandeau n'est visible QUE pendant le placement (carte §1.3)`);
  // Le seul cas « pile non vide, rien de visible » est le placement d'une station.
  if (pile.profondeur > 0 && visibles.length === 0) {
    assert.equal(orchestrateur.constructionActif(), true, `${contexte} : un sommet masqué n'existe que pendant un placement`);
  }
  const attendu = (
    menu.estOuvert() || orchestrateur.constructionActif() || orchestrateur.dialogueOuvert() ||
    orchestrateur.obtenirChoixFollet() !== null || orchestrateur.obtenirIntro() !== null || orchestrateur.obtenirDepart() !== null
  );
  assert.equal(orchestrateur.uiOuverteMaintenant(), attendu, `${contexte} : uiOuverteMaintenant() reste l'OR exact de ses composantes`);
}

function construireBanc(positionHero = null) {
  const save = saveDansLaMaison();
  if (positionHero) {
    save.hero.x = positionHero.x;
    save.hero.y = positionHero.y;
  }
  // De quoi remplir la Poche et le Coffre : sur une liste VIDE, la seule
  // entrée est « Fermer », et « A sur une entrée » fermerait l'écran.
  save.inventaire.items = { item_branche: 3, item_caillou: 2 };
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const document = creerFauxDocument();
  const journal = [];
  const menu = initialiserMenu({
    document, i18n, menus: registre.tous('menus'),
    exporterSauvegarde: () => journal.push('exporter'), importerSauvegarde: () => journal.push('importer'),
    listerPoche: () => Object.entries(save.inventaire.items).map(([id, quantite]) => ({ id, label: id, quantite, categorie: 'ressource' })),
  });
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null,
    // Comme main.js#demarrerJeu : sans elle, la condition de la carte Plein écran lèverait.
    valeursExternes: () => ({ plein_ecran_disponible: 1 }),
  });
  // Le câblage de `main.js#demarrerJeu`, en entier.
  menu.definirEvaluateurCondition(orchestrateur.evaluerCondition);
  menu.definirEntreesConstruction(orchestrateur.entreesConstruction);
  menu.definirEntreesStats(orchestrateur.obtenirEntreesStats);
  menu.definirActionReinitialiser(() => journal.push('reinitialiser'));
  const banc = { save, orchestrateur, frames, menu, document, journal };
  verifierInvariants(banc, 'au démarrage');
  return banc;
}

// Une frame verbe + une frame neutre (front montant), invariant après chacune.
function jouer(banc, etatVerbe, contexte) {
  banc.frames.push(etatVerbe);
  banc.orchestrateur.maj(16);
  verifierInvariants(banc, `${contexte} (frame du verbe)`);
  banc.frames.push(etat());
  banc.orchestrateur.maj(16);
  verifierInvariants(banc, `${contexte} (frame neutre)`);
}
function cliquer(banc, el, contexte) {
  assert.ok(el, `${contexte} : l'élément à cliquer existe`);
  declencherClic(el);
  verifierInvariants(banc, contexte);
}
const carte = (banc, id) => carteDuMenu(banc.document, id);
const boutonEntete = (banc) => banc.document.body.querySelector('[data-sortie]');
// « L'écran posé sur le menu » : un écran de liste (sa sortie est `.ecran-ui-fermer`)
// ou, depuis le palier C, un écran « maître-détail » (`[data-sortie]`, comme la
// grille — dont il se distingue par son id : la grille est `#menu`).
const sortieDe = (el) => el.querySelector('.ecran-ui-fermer') || (el.id !== 'menu' ? el.querySelector('[data-sortie]') : null);
const listeVisible = (banc) => ecransVisibles(banc.document).find((el) => sortieDe(el)) || null;
const fermerDeLaListe = (banc) => sortieDe(listeVisible(banc));
const sommet = (banc) => banc.menu.obtenirEtatPile().sommet;
const profondeur = (banc) => banc.menu.obtenirEtatPile().profondeur;

// --- 1. Start → menu Pause ; Quitter par `[X]` et par B ------------------------
{
  const banc = construireBanc();
  jouer(banc, etat({ menu: true }), 'Start');
  assert.deepEqual([banc.menu.estOuvert(), sommet(banc), profondeur(banc)], [true, 'menu_racine', 1]);
  cliquer(banc, boutonEntete(banc), '[X] à la racine');
  assert.equal(banc.menu.estOuvert(), false);

  jouer(banc, etat({ menu: true }), 'Start (2)');
  jouer(banc, etat({ skill3: true }), 'B à la racine');
  assert.equal(banc.menu.estOuvert(), false, '[X] et B à la racine : le même point de fermeture');
  assert.equal(profondeur(banc), 0);
  console.log('OK Start → menu Pause ; Quitter par [X] et par B');
}

// --- 2. Écrans de cartes : dossier, bascule, action, danger ---------------------
{
  const banc = construireBanc();
  jouer(banc, etat({ menu: true }), 'Start');
  cliquer(banc, carte(banc, 'carte_parametres'), 'dossier Paramètres');
  cliquer(banc, carte(banc, 'carte_musique'), 'bascule Musique');
  assert.equal(sommet(banc), 'menu_parametres', 'une bascule ne change rien à la pile');
  cliquer(banc, carte(banc, 'carte_sauvegarde'), 'dossier Sauvegarde');
  assert.equal(profondeur(banc), 3);

  // Reset + confirmation : « Non » (clic), puis « Non » (B), puis « Oui ».
  cliquer(banc, carte(banc, 'carte_reinitialiser'), 'danger : la confirmation s\'empile');
  assert.equal(profondeur(banc), 4);
  cliquer(banc, carte(banc, 'carte_reinitialiser#non'), '« Non, revenir » au clic');
  assert.deepEqual([sommet(banc), profondeur(banc)], ['menu_sauvegarde', 3]);
  cliquer(banc, carte(banc, 'carte_reinitialiser'), 'danger (2)');
  jouer(banc, etat({ skill3: true }), 'B sur la confirmation');
  assert.deepEqual([sommet(banc), profondeur(banc)], ['menu_sauvegarde', 3]);
  cliquer(banc, carte(banc, 'carte_reinitialiser'), 'danger (3)');
  cliquer(banc, carte(banc, 'carte_reinitialiser#oui'), '« Oui » : agit, puis ferme TOUT');
  assert.deepEqual([banc.menu.estOuvert(), profondeur(banc), banc.journal], [false, 0, ['reinitialiser']]);

  // Une action ordinaire ferme tout, depuis la profondeur 3.
  jouer(banc, etat({ menu: true }), 'Start');
  cliquer(banc, carte(banc, 'carte_parametres'), 'Paramètres');
  cliquer(banc, carte(banc, 'carte_sauvegarde'), 'Sauvegarde');
  cliquer(banc, carte(banc, 'carte_exporter'), 'action Exporter');
  assert.deepEqual([banc.menu.estOuvert(), profondeur(banc)], [false, 0]);

  // Retour niveau par niveau, `[←]` puis B.
  jouer(banc, etat({ menu: true }), 'Start');
  cliquer(banc, carte(banc, 'carte_parametres'), 'Paramètres');
  cliquer(banc, carte(banc, 'carte_sauvegarde'), 'Sauvegarde');
  cliquer(banc, boutonEntete(banc), '[←] depuis Sauvegarde');
  assert.equal(sommet(banc), 'menu_parametres');
  jouer(banc, etat({ skill3: true }), 'B depuis Paramètres');
  assert.equal(sommet(banc), 'menu_racine');
  jouer(banc, etat({ skill3: true }), 'B à la racine');
  assert.equal(banc.menu.estOuvert(), false);
  console.log('OK écrans de cartes : dossier, bascule, action, danger (Non au clic, Non par B, Oui)');
}

// --- 3. Poche et Stats : empilés sur l'écran Héros, au clic ET aux verbes ------
{
  const banc = construireBanc();
  for (const [idCarte, idEcran, versLaCarte] of [
    ['carte_poche', 'ecran_poche', []],
    ['carte_stats', 'ecran_stats', [etat({ moveX: 1 })]],
  ]) {
    // Aux verbes : Start, A (Héros), [→], A.
    jouer(banc, etat({ menu: true }), `Start (${idEcran})`);
    jouer(banc, etat({ attack: true }), 'A sur Héros');
    for (const e of versLaCarte) jouer(banc, e, 'vers la carte');
    jouer(banc, etat({ attack: true }), `A sur ${idCarte}`);
    assert.deepEqual([sommet(banc), profondeur(banc)], [idEcran, 3], 'l\'écran de liste est un niveau de LA pile');
    assert.ok(listeVisible(banc), 'et c\'est lui qu\'on voit');
    // Un verbe dans la liste ne fuit pas vers la grille d'en dessous.
    jouer(banc, etat({ moveY: 1 }), 'naviguer dans la liste');
    jouer(banc, etat({ attack: true }), 'A dans la liste');
    assert.equal(sommet(banc), idEcran);
    jouer(banc, etat({ skill3: true }), 'B ferme la liste');
    assert.deepEqual([sommet(banc), profondeur(banc)], ['menu_heros', 2], 'B dépile UN niveau, pas deux');
    const cartes = banc.menu.obtenirEtatCartes();
    assert.equal(cartes.cases[cartes.focus], idCarte, 'focus rendu à la carte qui avait ouvert la liste');

    // Au clic : la carte, puis « Fermer » de l'en-tête de la liste.
    cliquer(banc, carte(banc, idCarte), `clic sur ${idCarte}`);
    assert.equal(sommet(banc), idEcran);
    cliquer(banc, fermerDeLaListe(banc), '« Fermer » de la liste');
    assert.deepEqual([sommet(banc), profondeur(banc)], ['menu_heros', 2], 'clic et verbe : la MÊME fonction, le même résultat');
    banc.menu.fermer();
    verifierInvariants(banc, 'fermeture programmatique');
  }
  console.log('OK Poche et Stats : un niveau de plus dans la même pile ; B et « Fermer » dépilent pareil');
}

// --- 4. Craft et Coffre par INTERACT : seuls dans la pile -----------------------
{
  for (const [idStation, idEcran] of [['station_table', 'ecran_craft'], ['station_coffre', 'ecran_coffre']]) {
    const empreinte = construireBanc().orchestrateur.obtenirScene().empreintesSolides.find((e) => e.id === idStation);
    assert.ok(empreinte, `${idStation} a une empreinte`);
    const aCote = { x: empreinte.x - 20, y: empreinte.y + empreinte.h / 2 };
    for (const sortie of ['verbe', 'clic']) {
      const banc = construireBanc(aCote);
      jouer(banc, etat({ interact: true }), `INTERACT sur ${idStation}`);
      assert.deepEqual([banc.menu.estOuvert(), sommet(banc), profondeur(banc)], [true, idEcran, 1], 'ouvert depuis le monde : un seul niveau');
      jouer(banc, etat({ attack: true }), 'A sur une entrée (le résultat fait foi, l\'écran reste)');
      assert.equal(sommet(banc), idEcran);
      if (sortie === 'verbe') jouer(banc, etat({ skill3: true }), 'B');
      else cliquer(banc, fermerDeLaListe(banc), '« Fermer »');
      assert.deepEqual([banc.menu.estOuvert(), profondeur(banc)], [false, 0], 'rien dessous : retour = tout est fermé');
      const avant = banc.orchestrateur.obtenirHero().x;
      jouer(banc, etat({ moveX: -1 }), 'le héros repart');
      assert.notEqual(banc.orchestrateur.obtenirHero().x, avant, 'le jeu n\'est pas resté gelé');
    }
  }
  console.log('OK Craft et Coffre : ouverts par INTERACT dans la même pile, fermés par B comme par « Fermer »');
}

// --- 5. Construction : liste, placement (sommet masqué), retours, MENU ---------
{
  const banc = construireBanc();
  const { orchestrateur, menu } = banc;
  const choisir = (cleStation, contexte) => {
    const entree = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t(cleStation));
    assert.ok(entree, `${cleStation} fait partie des entrées`);
    entree.action();
    verifierInvariants(banc, contexte);
  };

  jouer(banc, etat({ menu: true }), 'Start');
  cliquer(banc, carte(banc, 'carte_construction'), 'carte Construction');
  assert.deepEqual([sommet(banc), profondeur(banc)], ['ecran_construction', 2]);

  // liste → placement : le sommet est MASQUÉ, la pile intacte.
  choisir('station.atelier', 'liste → placement');
  assert.deepEqual([menu.estOuvert(), orchestrateur.constructionActif(), profondeur(banc)], [false, true, 2],
    'pendant le placement : pile intacte, menu PAS ouvert — la clause « ET son sommet est visible »');
  jouer(banc, etat({ moveX: -1 }), 'MOVE déplace le fantôme');

  // placement → liste par B.
  jouer(banc, etat({ skill3: true }), 'placement → liste (B)');
  assert.deepEqual([menu.estOuvert(), sommet(banc), profondeur(banc)], [true, 'ecran_construction', 2]);

  // placement → liste par A (pose valide).
  choisir('station.cuisine', 'liste → placement (2)');
  assert.equal(orchestrateur.obtenirConstruction().verdict.ok, true);
  jouer(banc, etat({ attack: true }), 'placement → liste (A, pose valide)');
  assert.deepEqual([menu.estOuvert(), sommet(banc), profondeur(banc)], [true, 'ecran_construction', 2]);

  // liste → menu Pause par B : la racine était restée dessous.
  jouer(banc, etat({ skill3: true }), 'liste → menu Pause (B)');
  assert.deepEqual([sommet(banc), profondeur(banc)], ['menu_racine', 1]);
  const cartes = menu.obtenirEtatCartes();
  assert.equal(cartes.cases[cartes.focus], 'carte_construction', 'focus rendu à la carte Construction');

  // placement → menu Pause par MENU : le menu se rouvre à sa RACINE, sans reste.
  cliquer(banc, carte(banc, 'carte_construction'), 'carte Construction (2)');
  choisir('station.atelier', 'liste → placement (3)');
  jouer(banc, etat({ menu: true }), 'placement → menu Pause (MENU)');
  assert.deepEqual([menu.estOuvert(), orchestrateur.constructionActif(), sommet(banc), profondeur(banc)],
    [true, false, 'menu_racine', 1]);
  jouer(banc, etat({ skill3: true }), 'Quitter');
  assert.equal(menu.estOuvert(), false);
  const avant = orchestrateur.obtenirHero().x;
  jouer(banc, etat({ moveX: 1 }), 'le héros repart');
  assert.notEqual(orchestrateur.obtenirHero().x, avant);
  console.log('OK Construction : placement = sommet masqué, pile intacte ; B, A et MENU ramènent où il faut');
}

// --- 6. `Q-36` (B3) : MENU, menu ouvert, ferme TOUT — le chemin du `[X]` ---------
{
  // Depuis chaque profondeur et chaque genre d'écran, et le héros repart.
  const scenarios = [
    ['la racine', []],
    ['un écran de cartes profond', ['carte_parametres', 'carte_sauvegarde']],
    ['la confirmation d\'un danger', ['carte_parametres', 'carte_sauvegarde', 'carte_reinitialiser']],
    ['un écran de liste empilé', ['carte_heros', 'carte_stats']],
    ['la liste Construction', ['carte_construction']],
  ];
  for (const [nom, chemin] of scenarios) {
    const banc = construireBanc();
    jouer(banc, etat({ menu: true }), 'Start');
    assert.equal(banc.menu.estOuvert(), true, 'MENU qui OUVRE ne referme pas dans la même frame');
    for (const id of chemin) cliquer(banc, carte(banc, id), id);
    assert.equal(profondeur(banc), chemin.length + 1);
    jouer(banc, etat({ menu: true }), `MENU depuis ${nom}`);
    assert.deepEqual([banc.menu.estOuvert(), profondeur(banc), banc.journal], [false, 0, []], `MENU depuis ${nom} : tout est fermé, rien n'a été déclenché`);
    const avant = banc.orchestrateur.obtenirHero().x;
    jouer(banc, etat({ moveX: 1 }), 'le héros repart');
    assert.notEqual(banc.orchestrateur.obtenirHero().x, avant);
    // Et MENU rouvre, à la racine : une bascule ouvrir/fermer sur la même touche.
    jouer(banc, etat({ menu: true }), 'MENU rouvre');
    assert.deepEqual([banc.menu.estOuvert(), sommet(banc), profondeur(banc)], [true, 'menu_racine', 1]);
  }

  // Craft, ouvert par INTERACT : la même pile, donc le même verbe le ferme.
  const empreinte = construireBanc().orchestrateur.obtenirScene().empreintesSolides.find((e) => e.id === 'station_table');
  const banc = construireBanc({ x: empreinte.x - 20, y: empreinte.y + empreinte.h / 2 });
  jouer(banc, etat({ interact: true }), 'INTERACT');
  assert.equal(sommet(banc), 'ecran_craft');
  jouer(banc, etat({ menu: true }), 'MENU depuis Craft');
  assert.deepEqual([banc.menu.estOuvert(), profondeur(banc)], [false, 0]);

  // La frame où MENU ferme reste une frame d'UI : aucun verbe de cette frame
  // n'atteint le gameplay (même règle que la frame où B ferme).
  const banc2 = construireBanc();
  jouer(banc2, etat({ menu: true }), 'Start');
  const x0 = banc2.orchestrateur.obtenirHero().x;
  banc2.frames.push(etat({ menu: true, moveX: 1 }));
  banc2.orchestrateur.maj(16);
  verifierInvariants(banc2, 'MENU + MOVE dans la même frame');
  assert.equal(banc2.menu.estOuvert(), false);
  assert.equal(banc2.orchestrateur.obtenirHero().x, x0, 'le MOVE de la frame de fermeture est neutralisé');
  console.log('OK Q-36 : MENU ferme tout depuis partout, par le chemin du [X] ; MENU rouvre à la racine');
}

console.log('OK test_d43_b2_pile_unique_transitions');

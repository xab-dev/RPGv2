// `D-274` (Xav, 26/09, `Q-173` (5) : « oui pour "Exporter d'abord" liseret
// VERT , le reste OK ») : la pop-up de réinitialisation propose d'exporter
// d'abord.
//
// Ce que ce fichier tient :
//   1. la part pure : la carte de prudence en case 2, sous « Non » (0) et
//      « Oui » (1) qui ne bougent pas ; elle porte son action, reste, et sa
//      marque ; sans `popup_prudence`, la pop-up de `D-244` telle quelle ;
//   2. le schéma et les textes : seulement avec `cle_popup`, bien formée, son
//      titre en FR et en EN ;
//   3. dans la grille : le stick descend de « Non » comme de « Oui » vers
//      elle ; l'activer exporte et laisse la pop-up ouverte ; elle porte la
//      classe du vert, que la feuille de style pose en bordure sur toute la
//      largeur. Que le vert se LISE, c'est Xav (`V-192`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construireConfirmation, construirePopup, erreursTextesMenus, CLES_TEXTE_COMPOSANT } from '../src/menu_cartes.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { creerMenuCartes } from '../src/ui/grille_cartes.js';
import { afficherEcran, SEUIL_POUSSEE_MENU } from '../src/ui/menu.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const lireLocale = (l) => JSON.parse(fs.readFileSync(path.join(RACINE, 'locales', `${l}.json`), 'utf8'));
const carteDe = (menus, id) => menus.flatMap((e) => e.cartes).find((c) => c.id === id);
const copie = (o) => JSON.parse(JSON.stringify(o));

// --- 1. La part pure -------------------------------------------------------
{
  const reset = carteDe(donnees.menus, 'carte_reinitialiser');
  assert.ok(reset.popup_prudence, 'la réinitialisation propose d’exporter d’abord');
  const oui = construireConfirmation(reset, 'visuel_retour').cartes.find((c) => c.interne === 'confirmer');
  const [non, ouiPopup, prudence] = construirePopup(oui, 'visuel_retour').cartes;
  assert.deepEqual([non.case, non.interne, ouiPopup.case, ouiPopup.action], [0, 'retour', 1, reset.action], '« Non » et « Oui » ne bougent pas');
  assert.equal(ouiPopup.popup_prudence, undefined, 'le « Oui » ne la porte plus');
  assert.deepEqual([prudence.case, prudence.prudence, prudence.apres, prudence.action, prudence.icone, prudence.cle_titre],
    [2, true, 'reste', reset.popup_prudence.action, reset.popup_prudence.icone, reset.popup_prudence.cle_titre]);
  assert.ok(!prudence.danger, 'la prudence n’est pas un danger');
  const { popup_prudence: _ignoree, ...sans } = oui;
  assert.equal(construirePopup(sans, 'visuel_retour').cartes.length, 2, 'sans elle, la pop-up de D-244');
  console.log('OK construirePopup : la prudence en case 2, sous « Non » et « Oui »');
}

// --- 2. Le schéma et les textes --------------------------------------------
{
  const refuse = (modif, attendu) => {
    const menus = copie(donnees.menus);
    modif(menus);
    assert.ok(validerCatalogues({ ...donnees, menus }).some((e) => e.includes(attendu)), attendu);
  };
  refuse((m) => { carteDe(m, 'carte_exporter').popup_prudence = carteDe(m, 'carte_reinitialiser').popup_prudence; }, 'n\'a de sens qu\'avec cle_popup');
  refuse((m) => { delete carteDe(m, 'carte_reinitialiser').popup_prudence.action; }, 'popup_prudence doit être');
  refuse((m) => { carteDe(m, 'carte_reinitialiser').popup_prudence.icone = 'visuel_absent'; }, 'popup_prudence doit être');
  refuse((m) => { carteDe(m, 'carte_reinitialiser').popup_prudence.couleur = 'vert'; }, 'popup_prudence doit être');
  const dictionnaires = { fr: lireLocale('fr'), en: lireLocale('en') };
  assert.deepEqual(erreursTextesMenus(donnees.menus, dictionnaires, CLES_TEXTE_COMPOSANT), []);
  const menus = copie(donnees.menus);
  carteDe(menus, 'carte_reinitialiser').popup_prudence.cle_titre = 'menu.cle_absente';
  assert.ok(erreursTextesMenus(menus, dictionnaires, CLES_TEXTE_COMPOSANT).some((e) => e.includes('popup_prudence')), 'son titre absent tombe au démarrage');
  console.log('OK schéma et textes');
}

// --- 3. Dans la grille -----------------------------------------------------
class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this._classes = [];
    this._listeners = {};
    this._texte = '';
    this.hidden = false;
  }
  get className() { return this._classes.join(' '); }
  set className(v) { this._classes = String(v || '').split(/\s+/).filter(Boolean); }
  appendChild(enfant) { enfant.parentNode = this; this.children.push(enfant); return enfant; }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  declencher(type) { for (const fn of this._listeners[type] || []) fn({}); }
  get textContent() { return this._texte; }
  set textContent(v) { this._texte = v; this.children = []; }
  set innerHTML(html) { assert.equal(html, ''); this.children = []; }
  querySelectorAll(selecteur) {
    const classe = selecteur.slice(1);
    const trouves = [];
    const visiter = (el) => { for (const e of el.children) { if (e._classes.includes(classe)) trouves.push(e); visiter(e); } };
    visiter(this);
    return trouves;
  }
}
const b = (v) => ({ pressed: v, held: v });
const etat = ({ x = 0, y = 0 } = {}) => ({
  move: { x, y }, attack: b(false), skill_1: b(false), skill_2: b(false), skill_3: b(false),
  consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
});
{
  const document = { createElement: (tag) => new ElementFactice(tag), body: new ElementFactice('body') };
  const journal = [];
  const menu = creerMenuCartes({
    document, i18n: { t: (cle) => `«${cle}»` }, menus: donnees.menus, afficherEcran, seuilPoussee: SEUIL_POUSSEE_MENU,
    actions: {
      action_reinitialiser_sauvegarde: () => journal.push('REINITIALISER'),
      action_exporter_sauvegarde: () => journal.push('EXPORTER'),
    },
    etats: new Proxy({}, { get: () => () => 'menu.etat' }),
    evaluerCondition: () => true,
    onFermer: () => journal.push('FERME'),
  });
  const el = menu.element;
  const parCarte = (id) => el.querySelectorAll('.carte').find((c) => c.dataset.carte === id);
  const [popup] = el.querySelectorAll('.cartes-popup');
  const pousser = (dir) => { menu.traiterInput(etat(dir)); menu.traiterInput(etat()); };

  menu.ouvrir();
  parCarte('carte_parametres').declencher('click');
  parCarte('carte_sauvegarde').declencher('click');
  parCarte('carte_reinitialiser').declencher('click');
  parCarte('carte_reinitialiser#oui').declencher('click');
  const prudence = parCarte('carte_reinitialiser#oui#popup_prudence');
  assert.ok(prudence, 'la carte est dans la boîte');
  assert.ok(prudence._classes.includes('carte-prudence') && !prudence._classes.includes('carte-danger'), 'au vert, pas à l’écarlate');
  assert.equal(menu.obtenirEtat().focus, 0, '« Non » reste le focus par défaut');
  pousser({ y: 1 });
  assert.equal(menu.obtenirEtat().focus, 2, 'de « Non », le stick descend vers elle');
  pousser({ y: -1 });
  pousser({ x: 1 });
  assert.equal(menu.obtenirEtat().focus, 1);
  pousser({ y: 1 });
  assert.equal(menu.obtenirEtat().focus, 2, 'de « Oui » aussi');

  parCarte('carte_reinitialiser#oui#popup_prudence').declencher('click');
  assert.deepEqual(journal, ['EXPORTER'], 'elle exporte, n’efface rien, ne ferme rien');
  assert.equal(menu.obtenirEtat().ecran, 'carte_reinitialiser#oui#popup', 'la pop-up reste ouverte');
  assert.equal(popup.hidden, false);
  assert.equal(menu.obtenirEtat().focus, 2, 'focus en place');
  parCarte('carte_reinitialiser#oui#popup_oui').declencher('click');
  assert.deepEqual(journal, ['EXPORTER', 'REINITIALISER', 'FERME'], 'puis « Oui » efface, comme avant');
  console.log('OK la grille : le stick y descend, elle exporte et la pop-up reste');
}

// --- La feuille de style : le vert en bordure, toute la largeur ------------
{
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  assert.match(html, /--menu-prudence: #[0-9a-f]{6};/);
  assert.match(html, /\.carte-prudence \{ --carte-trait: var\(--menu-prudence\); border-color: var\(--menu-prudence\); \}/, 'en bordure et en icône, jamais en aplat');
  assert.match(html, /\.cartes-popup-cartes \.carte-prudence \{ grid-column: 1 \/ -1; \}/, 'sur toute la largeur de la boîte');
  assert.doesNotMatch(html.match(/\.cartes-popup-cartes \{([^}]*)\}/)[1], /(^|[^-])height:/, 'la boîte grandit d’une rangée au lieu de tasser');
  console.log('OK feuille de style');
}
console.log('OK test_d274_popup_exporter');

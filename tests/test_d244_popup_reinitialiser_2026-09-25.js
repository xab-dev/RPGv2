// `D-244` (Xav, 25/09 : « ajouter un écran de validation en plus : pas de menu
// supplémentaire mais une pop-up : "es tu sur ? pense à exporter ta sauvegarde
// d'abord." OUI/NON ») : « Oui, réinitialiser » ouvre une pop-up, dont seul le
// « Oui » efface.
//
// Ce que ce fichier tient :
//   1. la part pure : « Non » en case 0 (le focus par défaut), le « Oui » porte
//      l'action et ne rouvre pas de pop-up ;
//   2. le schéma : `cle_popup` seulement sur une carte `danger` ; la carte
//      Réinitialiser en porte une, et son texte existe en FR et en EN ;
//   3. la pop-up est un niveau de LA pile (un retour la ferme), dessiné par la
//      même vue : une seule vue, jamais deux écrans ;
//   4. la règle tactile, dans ce qu'elle a de structurel : « Non » est dans la
//      boîte, hors du corps qui défile ; les cartes recouvertes ne réagissent
//      plus au doigt ; la feuille de style pose la boîte par-dessus tout
//      l'écran. Qu'elle TIENNE dans l'écran, Node ne peut pas le dire : c'est
//      `V-172`.
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
  const oui = construireConfirmation(reset, 'visuel_retour').cartes.find((c) => c.interne === 'confirmer');
  assert.equal(oui.cle_popup, reset.cle_popup, 'le « Oui » de la confirmation sait qu’une pop-up le suit');
  const popup = construirePopup(oui, 'visuel_retour');
  assert.equal(popup.popup, true);
  assert.equal(popup.cle_texte, 'menu.reset_popup');
  const [non, ouiPopup] = popup.cartes;
  assert.deepEqual([non.case, non.interne], [0, 'retour'], '« Non » en case 0 : le focus par défaut');
  assert.deepEqual([ouiPopup.case, ouiPopup.interne, ouiPopup.danger, ouiPopup.action],
    [1, 'confirmer', true, 'action_reinitialiser_sauvegarde'], 'le « Oui » de la pop-up porte l’action');
  assert.equal(ouiPopup.cle_popup, undefined, 'et ne rouvre pas de pop-up');
  console.log('OK construirePopup : « Non » d’abord, le « Oui » agit');
}

// --- 2. Le schéma et les textes --------------------------------------------
{
  const menus = copie(donnees.menus);
  carteDe(menus, 'carte_exporter').cle_popup = 'menu.reset_popup';
  assert.ok(validerCatalogues({ ...donnees, menus }).some((e) => e.includes('"cle_popup" n\'a de sens qu\'avec danger: true')));
  const menus2 = copie(donnees.menus);
  carteDe(menus2, 'carte_reinitialiser').cle_popup = 3;
  assert.ok(validerCatalogues({ ...donnees, menus: menus2 }).some((e) => e.includes('cle_popup doit être une clé de texte')));
  const dictionnaires = { fr: lireLocale('fr'), en: lireLocale('en') };
  assert.deepEqual(erreursTextesMenus(donnees.menus, dictionnaires, CLES_TEXTE_COMPOSANT), []);
  const menus3 = copie(donnees.menus);
  carteDe(menus3, 'carte_reinitialiser').cle_popup = 'menu.cle_absente';
  assert.ok(erreursTextesMenus(menus3, dictionnaires, CLES_TEXTE_COMPOSANT).some((e) => e.includes('cle_popup')),
    'une clé de pop-up absente tombe au démarrage');
  console.log('OK cle_popup : sur une carte danger seulement, texte vérifié en FR et en EN');
}

// --- 3 et 4. Dans la grille ------------------------------------------------
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
const etat = ({ x = 0, attack = false, skill3 = false } = {}) => ({
  move: { x, y: 0 }, attack: b(attack), skill_1: b(false), skill_2: b(false), skill_3: b(skill3),
  consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
});
const ancetres = (el) => { const l = []; for (let p = el.parentNode; p; p = p.parentNode) l.push(p); return l; };
{
  const document = { createElement: (tag) => new ElementFactice(tag), body: new ElementFactice('body') };
  const journal = [];
  const menu = creerMenuCartes({
    document, i18n: { t: (cle) => `«${cle}»` }, menus: donnees.menus, afficherEcran, seuilPoussee: SEUIL_POUSSEE_MENU,
    actions: { action_reinitialiser_sauvegarde: () => journal.push('REINITIALISER') },
    etats: new Proxy({}, { get: () => () => 'menu.etat' }),
    evaluerCondition: () => true,
    onFermer: () => journal.push('FERME'),
  });
  const el = menu.element;
  const parCarte = (id) => el.querySelectorAll('.carte').find((c) => c.dataset.carte === id);
  const [popup] = el.querySelectorAll('.cartes-popup');
  const [corps] = el.querySelectorAll('.ecran-ui-corps');

  menu.ouvrir();
  parCarte('carte_parametres').declencher('click');
  parCarte('carte_sauvegarde').declencher('click');
  parCarte('carte_reinitialiser').declencher('click');
  assert.equal(popup.hidden, true, 'pas de pop-up sur la confirmation elle-même');
  parCarte('carte_reinitialiser#oui').declencher('click');
  assert.equal(menu.obtenirEtat().ecran, 'carte_reinitialiser#oui#popup');
  assert.equal(popup.hidden, false, 'la pop-up se montre');
  assert.equal(el.querySelectorAll('.cartes-popup-texte')[0].textContent, '«menu.reset_popup»');
  assert.equal(el.hidden, false, 'une seule vue, celle des cartes, qui dessine les deux');
  assert.deepEqual(journal, [], 'rien d’effacé, rien de fermé');

  const non = parCarte('carte_reinitialiser#oui#popup_non');
  assert.ok(ancetres(non).includes(popup), '« Non » est dans la boîte');
  assert.ok(!ancetres(non).includes(corps), 'et hors du corps qui défile');
  assert.ok(non._classes.includes('carte-focus'), 'focalisé par défaut');
  assert.equal(el.children[el.children.length - 1]._classes.includes('cartes-entete'), true,
    'l’en-tête reste le dernier enfant du document');

  // Sous le voile, la confirmation se voit, inerte : son « Oui » n'efface rien.
  const ouiRecouvert = parCarte('carte_reinitialiser#oui');
  assert.ok(ancetres(ouiRecouvert).includes(corps), 'l’écran recouvert reste dessiné');
  assert.ok(ouiRecouvert._classes.includes('carte-focus'), 'avec la carte qui a ouvert la pop-up en évidence');
  ouiRecouvert.declencher('click');
  assert.equal(menu.obtenirEtat().ecran, 'carte_reinitialiser#oui#popup', 'une carte recouverte ne réagit pas');
  assert.deepEqual(journal, []);

  // Le stick ne va que de « Non » à « Oui », et B referme la pop-up.
  menu.traiterInput(etat({ x: 1 }));
  menu.traiterInput(etat());
  assert.equal(menu.obtenirEtat().focus, 1);
  menu.traiterInput(etat({ x: 1 }));
  menu.traiterInput(etat());
  assert.equal(menu.obtenirEtat().focus, 1, 'rien au-delà du « Oui »');
  menu.traiterInput(etat({ skill3: true }));
  assert.equal(menu.obtenirEtat().ecran, 'carte_reinitialiser#confirmation');
  assert.equal(popup.hidden, true, 'la pop-up se cache au retour');

  // Au doigt : « Oui », puis le « Oui » de la pop-up — agit, puis ferme tout.
  parCarte('carte_reinitialiser#oui').declencher('click');
  parCarte('carte_reinitialiser#oui#popup_oui').declencher('click');
  assert.deepEqual(journal, ['REINITIALISER', 'FERME']);
  assert.equal(menu.estOuvert(), false);
  console.log('OK la pop-up : un niveau de la pile, « Non » dans la boîte, l’écran recouvert inerte');
}

// La feuille de style pose la boîte par-dessus TOUT l'écran (en-tête compris),
// et ne la fait jamais défiler.
{
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const regle = (sel) => {
    const m = html.match(new RegExp(`\\n\\s*${sel.replace('.', '\\.')} \\{([^}]*)\\}`));
    assert.ok(m, `règle ${sel} présente`);
    return m[1];
  };
  const voile = regle('.cartes-popup');
  assert.match(voile, /position: absolute; inset: 0;/, 'le voile couvre tout l’écran');
  assert.match(voile, /z-index:/, 'au-dessus de l’en-tête');
  assert.match(html, /\.cartes-popup\[hidden\] \{ display: none; \}/, 'caché quand hidden');
  assert.doesNotMatch(regle('.cartes-popup-boite'), /overflow/, 'la boîte ne défile pas');
  console.log('OK la feuille de style : un voile sur tout l’écran, une boîte qui ne défile pas');
}
console.log('OK test_d244_popup_reinitialiser');

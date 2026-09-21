// specs/08_menus-cartes.md, palier C2 — la Poche devient un écran « maître-détail ».
// Ce fichier exerce le vrai `ui/menu.js` sur les vrais catalogues : ce que dit
// la fiche d'un objet vient des données (`main.js#lignesFicheItem`), « Équiper »
// n'existe que sur la nourriture, l'objet équipé se VOIT (repère sur la tuile,
// ligne dans la fiche), une poche vide le dit — et tout texte composé par les
// fiches existe en FR comme en EN.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS, CATEGORIES_ITEM } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { lignesFicheItem, clesTexteFiches } from '../src/main.js';
import { initialiserMenu } from '../src/ui/menu.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// --- 1. Les textes des fiches existent dans toutes les langues --------------------
{
  for (const cle of clesTexteFiches()) {
    for (const [langue, dict] of Object.entries(dictionnaires)) {
      assert.ok(Object.prototype.hasOwnProperty.call(dict, cle), `${cle} existe en ${langue}`);
    }
  }
  for (const c of CATEGORIES_ITEM) assert.ok(clesTexteFiches().includes(`item.categorie.${c}`), `la catégorie ${c} a sa clé, contrôlée au démarrage`);
  console.log('OK textes des fiches : toutes les catégories d’objets, FR et EN, contrôlées au démarrage');
}

// --- 2. La fiche d'un objet vient du catalogue, jamais d'un texte par objet ----------
{
  for (const item of registre.tous('items')) {
    const lignes = lignesFicheItem(item, registre, i18n);
    assert.equal(lignes[0], i18n.t(`item.categorie.${item.categorie}`), `${item.id} : sa catégorie d’abord`);
    assert.ok(lignes.every((l) => typeof l === 'string' && !l.includes('[[')), `${item.id} : aucune clé manquante (${lignes.join(' · ')})`);
  }
  const fruitCuit = lignesFicheItem(registre.obtenir('items', 'item_fruit_cuit'), registre, i18n);
  assert.deepEqual(fruitCuit, ['Nourriture', 'Faim +35 %', 'Soif +10 %', 'Repas chaud'], 'ce qu’il rend, puis ses effets — lus dans `consommation`');
  assert.deepEqual(lignesFicheItem(registre.obtenir('items', 'item_bois'), registre, i18n), ['Ressource']);
  console.log('OK fiche d’un objet : catégorie, faim, soif, effets — tout vient des données');
}

// --- Faux DOM minimal — même gabarit que test_d43_c1 (copié, pas partagé). ---------
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
  // `ui/menu.js` compose encore du HTML pour ses écrans de LISTE (en-tête) :
  // ce test n'en lit rien, il suffit que l'affectation ne lève pas.
  set innerHTML(html) { this.children = []; }
  querySelector(selecteur) { return this.querySelectorAll(selecteur)[0] || null; }
  querySelectorAll(selecteur) {
    const trouves = [];
    const correspond = (e) => (selecteur.startsWith('.') ? e._classes.includes(selecteur.slice(1))
      : selecteur.startsWith('[data-') ? Object.prototype.hasOwnProperty.call(e.dataset, selecteur.slice(6, -1)) : false);
    const visiter = (el) => { for (const e of el.children) { if (correspond(e)) trouves.push(e); visiter(e); } };
    visiter(this);
    return trouves;
  }
}

// --- 3. La Poche, dans le vrai menu ----------------------------------------------------
{
  const poche = { item_branche: 6, item_fruit: 3, item_fruit_cuit: 1, item_hache: 1 };
  let equipe = null;
  const document = { createElement: (tag) => new ElementFactice(tag), body: new ElementFactice('body') };
  // Le menu compose le gabarit de ses écrans de liste par `innerHTML`, puis y
  // cherche des éléments : ce faux DOM-ci ne les fabrique pas. Les écrans de
  // liste ne sont pas le sujet — on leur donne de quoi se construire.
  const creer = document.createElement;
  document.createElement = (tag) => {
    const el = creer(tag);
    const qs = el.querySelector.bind(el);
    el.querySelector = (s) => qs(s) || (s.startsWith('.ecran-ui') || s === '.menu-item' ? new ElementFactice('div') : null);
    return el;
  };
  const menu = initialiserMenu({
    document, i18n, menus: registre.tous('menus'), exporterSauvegarde: () => {}, importerSauvegarde: () => {},
    // Exactement ce que fait `main.js#demarrerJeu`.
    // `D-66` (T5) : c'est `main.js` qui dit désormais si un objet s'équipe et
    // dans quel emplacement (`equipement`) — l'écran ne connaît plus aucune
    // catégorie d'item. On reproduit ici la même décision pour le seul
    // emplacement que ce test regarde, le consommable.
    listerPoche: () => Object.entries(poche).filter(([, q]) => q > 0).map(([id, quantite]) => {
      const def = registre.obtenir('items', id);
      return {
        id, label: i18n.t(def.label_key), quantite, categorie: def.categorie,
        icone: def.render.visuel, lignes: lignesFicheItem(def, registre, i18n),
        equipement: def.categorie === 'nourriture'
          ? {
            slot: 'consommable',
            deja: equipe === id,
            lignes: [i18n.t('menu.fiche.manger', { glyphe: i18n.t('glyphe.manette.consume') })],
          }
          : null,
      };
    }),
    equiper: (slot, id) => { equipe = id; },
  });
  menu.definirEvaluateurCondition(() => false);
  const carte = (id) => document.body.querySelectorAll('[data-carte]').find((c) => c.dataset.carte === id);
  const ecran = () => document.body.children.find((el) => el._classes.includes('ecran-fiches'));
  const tuiles = () => ecran().querySelectorAll('[data-tuile]');
  const fiche = () => ({
    titre: ecran().querySelector('.fiche-titre')?.textContent ?? null,
    lignes: ecran().querySelectorAll('.fiche-ligne').map((l) => l.textContent),
    bouton: ecran().querySelector('[data-action]'),
  });

  menu.ouvrir();
  carte('carte_heros').declencher('click');
  carte('carte_poche').declencher('click');
  assert.deepEqual(menu.obtenirEtatPile(), { profondeur: 3, sommet: 'ecran_poche' });
  assert.equal(ecran().hidden, false, 'la Poche est l’écran « maître-détail »');
  assert.equal(ecran().querySelector('.cartes-titre').textContent, i18n.t('menu.poche_titre'));
  assert.deepEqual(tuiles().map((t) => [t.querySelector('.tuile-nom').textContent, t.querySelector('.tuile-quantite').textContent]),
    [['Branche', '6'], ['Fruit', '3'], ['Fruit cuit', '1'], ['Hache', '1']], 'une tuile par objet : son nom, sa quantité');
  assert.deepEqual(tuiles().map((t) => t.querySelector('.carte-icone').dataset.icone),
    ['visuel_branche', 'visuel_fruit', 'visuel_fruit_cuit', 'visuel_hache'], 'et sa silhouette du monde, lue dans `items.json`');

  // Une ressource : une fiche, AUCUN bouton (plutôt qu'un bouton qui ne fait rien).
  assert.deepEqual([fiche().titre, fiche().lignes, fiche().bouton], ['Branche', ['Ressource'], null]);

  // La nourriture : « Équiper ». Sélectionner ne fait rien ; le bouton équipe.
  tuiles()[1].declencher('click');
  assert.equal(equipe, null, 'sélectionner une tuile n’équipe rien');
  assert.deepEqual([fiche().titre, fiche().bouton.querySelector('.fiche-action-libelle').textContent], ['Fruit', i18n.t('menu.poche_equiper')]);
  assert.equal(fiche().bouton.querySelector('.fiche-action-glyphe').textContent, i18n.t('glyphe.manette.attack'), 'le glyphe du périphérique actif (la manette, par défaut)');
  fiche().bouton.declencher('click');
  assert.equal(equipe, 'item_fruit');
  // L'écran s'est relu : l'objet équipé se VOIT, et le dit.
  assert.deepEqual(tuiles().map((t) => t.querySelectorAll('.tuile-marque').length), [0, 1, 0, 0], 'un repère sur la tuile équipée, et elle seule');
  assert.deepEqual(fiche().lignes, [
    'Nourriture', 'Faim +15 %', 'Soif +5 %', i18n.t('menu.fiche.equipe'),
    i18n.t('menu.fiche.manger', { glyphe: i18n.t('glyphe.manette.consume') }),
  ], 'équipé : la fiche dit aussi comment le manger, au glyphe du périphérique actif');
  assert.equal(fiche().bouton, null, 'rééquiper serait sans effet : plus de bouton');
  assert.equal(tuiles()[1]._classes.includes('tuile-grisee'), false, '« équipé » n’est pas « indisponible » : la tuile n’est pas grisée');
  assert.equal(menu.obtenirEtatFiches().entreeFocalisee, 'Fruit', 'le focus n’a pas bougé pendant la relecture');

  // Équiper un autre consommable déplace le repère.
  tuiles()[2].declencher('click');
  fiche().bouton.declencher('click');
  assert.equal(equipe, 'item_fruit_cuit');
  assert.deepEqual(tuiles().map((t) => t.querySelectorAll('.tuile-marque').length), [0, 0, 1, 0]);

  // Poche vide : aucune tuile, la fiche le dit, la sortie marche.
  for (const id of Object.keys(poche)) poche[id] = 0;
  menu.fermer();
  menu.ouvrir();
  carte('carte_heros').declencher('click');
  carte('carte_poche').declencher('click');
  assert.equal(tuiles().length, 0);
  assert.equal(ecran().querySelector('.fiche-vide').textContent, i18n.t('menu.poche_vide'));
  ecran().querySelector('[data-sortie]').declencher('click');
  assert.deepEqual(menu.obtenirEtatPile(), { profondeur: 2, sommet: 'menu_heros' }, 'la sortie ramène à l’écran Héros');
  console.log('OK Poche : une tuile par objet ; « Équiper » sur la seule nourriture ; l’équipé se voit ; poche vide dite');
}

console.log('OK test_d43_c2_poche_fiches');

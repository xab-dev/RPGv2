// `D-44` — la langue choisie dans le menu est RENDUE à qui l'enregistre.
//
// Le défaut (relevé le 20/09, `D-43` A4) : basculer FR ↔ EN changeait la
// langue de la session, mais rien n'écrivait `save.settings.lang`, que
// `main.js` lit au démarrage — un joueur anglophone repartait en français à
// chaque visite. La musique, elle, se sauvegardait déjà.
//
// Ce qui est prouvé ici : le vrai menu (`ui/menu.js`), branché sur le vrai
// `i18n.js` et le vrai catalogue `data/menus.json`, rend à `langueChoisie` la
// langue que le jeu parle APRÈS la bascule, à chaque bascule. Que `main.js`
// l'écrive dans `save.settings.lang` est une ligne, lue à la relecture ; que
// la sauvegarde la garde est le contrat de `save.js`, déjà tenu ailleurs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initialiserMenu } from '../src/ui/menu.js';
import { creerI18n } from '../src/i18n.js';

const lire = (chemin) => JSON.parse(fs.readFileSync(new URL(chemin, import.meta.url), 'utf8'));
const MENUS = lire('../data/menus.json');

// Faux DOM minimal, même gabarit que les autres tests de `ui/menu.js`
// (copié, pas partagé : convention du dépôt).
class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.id = ''; this.dataset = {}; this.style = {}; this.children = [];
    this.parentNode = null; this._classes = []; this._listeners = {};
    this._texte = ''; this.hidden = false; this.value = '';
  }
  get className() { return this._classes.join(' '); }
  set className(v) { this._classes = String(v || '').split(/\s+/).filter(Boolean); }
  setAttribut(nom, val) {
    if (nom === 'id') this.id = val;
    else if (nom === 'class') this._classes = (val || '').split(/\s+/).filter(Boolean);
    else if (nom.startsWith('data-')) {
      const cle = nom.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[cle] = val;
    } else if (nom === 'value') this.value = val;
  }
  appendChild(e) { e.parentNode = this; this.children.push(e); return e; }
  addEventListener(t, f) { (this._listeners[t] ||= []).push(f); }
  declencher(t) { for (const f of this._listeners[t] || []) f({}); }
  scrollIntoView() {}
  get textContent() { return this._texte; }
  set textContent(v) { this._texte = v; this.children = []; }
  set innerHTML(html) {
    const racine = new ElementFactice('root');
    const pile = [racine];
    const regexTag = /<(\/)?([a-zA-Z0-9-]+)([^>]*?)(\/)?>|([^<]+)/g;
    let m;
    while ((m = regexTag.exec(html))) {
      const [, fermante, nomTag, attrsStr, autoFerme, texte] = m;
      if (texte !== undefined) continue;
      if (fermante) { pile.pop(); continue; }
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
    this.children = racine.children;
    this.children.forEach((c) => (c.parentNode = this));
  }
  querySelectorAll(sel) {
    const out = [];
    const visiter = (el) => {
      for (const enfant of el.children) {
        if (sel.startsWith('#') ? enfant.id === sel.slice(1)
          : sel.startsWith('.') ? enfant._classes.includes(sel.slice(1))
            : false) out.push(enfant);
        visiter(enfant);
      }
    };
    visiter(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

{
  const document = { createElement: (t) => new ElementFactice(t), body: new ElementFactice('body') };
  const i18n = creerI18n({ fr: lire('../locales/fr.json'), en: lire('../locales/en.json') }, 'fr');
  const choisies = [];
  const menu = initialiserMenu({
    document, i18n, menus: MENUS, exporterSauvegarde: () => {}, importerSauvegarde: () => {},
    langueChoisie: (langue) => choisies.push(langue),
  });
  menu.definirEvaluateurCondition(() => false);
  // La grille reconstruit ses cartes à chaque affichage : on relit toujours.
  const carte = (id) => document.body.querySelectorAll('.carte').find((c) => c.dataset.carte === id) || null;

  menu.ouvrir();
  carte('carte_parametres').declencher('click');
  assert.ok(carte('carte_langue'), 'la carte Langue est dans les Paramètres');

  carte('carte_langue').declencher('click');
  assert.equal(i18n.langueCourante(), 'en', 'la bascule change la langue de la session');
  assert.deepEqual(choisies, ['en'], 'et la rend, une fois, à qui l’enregistre');

  carte('carte_langue').declencher('click');
  assert.equal(i18n.langueCourante(), 'fr');
  assert.deepEqual(choisies, ['en', 'fr'], 'chaque bascule est rendue, retour compris');
  console.log('  la langue choisie est rendue à la sauvegarde à chaque bascule');
}

console.log('OK test_d44_langue_sauvegardee');

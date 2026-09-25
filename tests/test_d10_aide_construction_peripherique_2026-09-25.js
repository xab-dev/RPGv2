// `D-10` — l'aide de la Construction parle le périphérique du joueur.
//
// La ligne (ouverte au temps de la Construction) disait : « aide-texte
// toujours en glyphes manette, `ui/menu.js` ne reçoit pas
// `input.peripheriqueActif()` ». Le câblage a été posé avec le bandeau de
// placement (`e1c4ff3`, 17/09) sans que la ligne soit close, et rien ne le
// tenait. Ce fichier le tient : la fiche d'une station (palier C6) porte les
// cinq verbes du placement dans les glyphes du périphérique ACTIF, relus à
// chaque ouverture — manette, clavier, doigt.
//
// Ce qui n'est pas prouvé ici, et ne change pas : pendant un placement, le
// bandeau est écrit une fois, à l'entrée (simplification acceptée au 17/09).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initialiserMenu } from '../src/ui/menu.js';
import { creerI18n } from '../src/i18n.js';

const lire = (chemin) => JSON.parse(fs.readFileSync(new URL(chemin, import.meta.url), 'utf8'));
const MENUS = lire('../data/menus.json');
const FR = lire('../locales/fr.json');

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
  const i18n = creerI18n({ fr: FR, en: lire('../locales/en.json') }, 'fr');
  let peripherique = 'manette';
  const menu = initialiserMenu({
    document, i18n, menus: MENUS, exporterSauvegarde: () => {}, importerSauvegarde: () => {},
    peripheriqueActif: () => peripherique,
  });
  // Dans la Maison : une station se déplace, la case contextuelle est Construction.
  menu.definirEvaluateurCondition((c) => c && c.valeur === 'stations_placables');
  menu.definirEntreesConstruction(() => [{ titre: 'Coffre', action: () => {} }]);
  const carte = (id) => document.body.querySelectorAll('.carte').find((c) => c.dataset.carte === id) || null;
  const lignesFiche = () => {
    const bloc = document.body.querySelectorAll('.fiche-lignes')[0];
    return bloc ? bloc.children.map((l) => l.textContent).join(' | ') : '';
  };
  const ouvrirConstruction = () => {
    menu.fermer();
    menu.ouvrir();
    carte('carte_construction').declencher('click');
  };

  // Les glyphes attendus sont lus dans la locale, jamais recopiés ici.
  const glyphes = (p) => ['move', 'skill_1', 'attack', 'skill_3', 'menu'].map((v) => FR[`glyphe.${p}.${v}`]);
  for (const p of ['manette', 'clavier', 'tactile']) {
    peripherique = p;
    ouvrirConstruction();
    const texte = lignesFiche();
    for (const g of glyphes(p)) {
      assert.ok(texte.includes(g), `${p} : la fiche doit dire « ${g} » — elle dit : ${texte}`);
    }
    if (p !== 'manette') {
      assert.ok(!texte.includes(FR['glyphe.manette.attack'] + ' |') && !texte.includes(FR['glyphe.manette.move']),
        `${p} : aucun glyphe de manette ne doit rester — ${texte}`);
    }
  }
  console.log('  la fiche de Construction suit le périphérique actif : manette, clavier, doigt');
}

console.log('OK test_d10_aide_construction_peripherique');

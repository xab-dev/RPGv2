// `D-42` — un menu qu'on peut toujours fermer, au doigt comme au verbe.
//
// Constat de Xav (20/09, 03 h 15, Chrome Android, hors plein écran) : en
// paysage la page fait ~703 × 280 px CSS, le menu Pause déborde, « Fermer »
// est hors écran et rien ne défile au doigt. Il a dû quitter le jeu.
//
// CE QUE CE FICHIER NE PROUVE PAS, et ne peut pas prouver : « ça tient dans
// l'écran ». Node n'a pas de moteur de mise en page — aucune hauteur, aucun
// débordement, aucun défilement réel n'y est mesurable. Le verdict est une
// validation en jeu (`V-26`). Ce qui est testable ici, et rien d'autre :
//
//   1. la feuille de style dit bien les trois choses qui manquaient (une
//      hauteur bornée, un corps qui défile, un `touch-action` qui ne bâillonne
//      plus toute la page) ;
//   2. « Fermer » n'est plus un enfant de la liste défilante — c'est ce qui le
//      rend atteignable sans défiler, quelle que soit la longueur de la liste ;
//   3. il reste malgré tout la DERNIÈRE entrée de la navigation (le ticket
//      interdit de changer l'ordre des entrées) ;
//   4. les sept écrans partagés reçoivent tous le même habillage — le défaut
//      était commun, le correctif doit l'être aussi ;
//   5. le focus demande la mise en vue de l'entrée sélectionnée (manette et
//      clavier : sans ça, le curseur se perdrait hors de la zone visible) ;
//   6. un clic sur « Fermer » ne ferme qu'UNE fois, même après plusieurs
//      reconstructions de la liste — son élément DOM survit désormais aux
//      reconstructions, empiler ses écouteurs était le piège à éviter.
//
// Mesures réelles ayant servi au diagnostic (Chrome, viewport 703 × 280,
// journal de la session) : contenu du menu Pause = 339 px pour une boîte de
// 280 ; `<h2>` à −39 px (hors écran par le HAUT, là où aucun défilement ne
// peut le ramener) ; « Fermer » à 318 px (hors écran par le bas) ;
// `scrollTop = 200` laissait `scrollTop` à **0** — la boîte n'était pas un
// conteneur défilant du tout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialiserMenu } from '../src/ui/menu.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- Faux DOM minimal — même gabarit que les autres tests de `ui/menu.js`
// (copié, pas partagé : convention du dépôt), plus `scrollIntoView`, qui est
// justement ce que ce ticket ajoute.
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
    this.misEnVue = 0; // nombre d'appels à scrollIntoView
  }
  get className() {
    return this._classes.join(' ');
  }
  set className(v) {
    this._classes = String(v || '').split(/\s+/).filter(Boolean);
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
  declencher(type, evt = {}) {
    for (const fn of this._listeners[type] || []) fn(evt);
  }
  scrollIntoView() {
    this.misEnVue += 1;
  }
  get textContent() {
    return this._texte;
  }
  set textContent(v) {
    this._texte = v;
    this.children = [];
  }
  set innerHTML(html) {
    this.children = analyserHTML(html);
    this.children.forEach((c) => (c.parentNode = this));
  }
  querySelectorAll(selecteur) {
    const resultats = [];
    const visiter = (el) => {
      for (const enfant of el.children) {
        if (correspond(enfant, selecteur)) resultats.push(enfant);
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

function correspond(el, selecteur) {
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

function analyserHTML(html) {
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

function creerFauxI18n() {
  let langue = 'fr';
  return {
    t: (cle) => cle,
    langueCourante: () => langue,
    definirLangue: (l) => (langue = l),
  };
}

function etat({ y = 0, attack = false, skill3 = false } = {}) {
  return {
    move: { x: 0, y },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: skill3, held: skill3 },
    consume: { pressed: false, held: false },
    interact: { pressed: false, held: false },
    menu: { pressed: false, held: false },
  };
}

function construireMenu(options = {}) {
  const document = creerFauxDocument();
  const menu = initialiserMenu({
    document,
    i18n: creerFauxI18n(),
    exporterSauvegarde: () => {},
    importerSauvegarde: () => {},
    ...options,
  });
  return { document, menu };
}

// Un ancêtre portant cette classe existe-t-il ? (`.closest` n'est pas
// implémenté par le faux DOM, et `ui/menu.js` ne s'en sert pas non plus.)
function aPourAncetre(el, classe) {
  for (let p = el.parentNode; p; p = p.parentNode) {
    if (p._classes.includes(classe)) return true;
  }
  return false;
}

// --- 1. La feuille de style dit les trois choses qui manquaient ----------
{
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');

  // a) `touch-action: none` ne bâillonne plus toute la page. C'était le seul
  //    suspect « d'ambiance » du ticket ; il n'explique pas à lui seul le
  //    défaut (`touch-action` n'est pas une propriété héritée, l'écran
  //    calculait bien `auto` — vérifié dans Chrome), mais il annonçait au
  //    navigateur que RIEN dans cette page ne se fait défiler au doigt. Il
  //    descend donc sur sa seule cible réelle, le canvas.
  const reglesHtmlBody = html.match(/html,\s*body\s*\{[^}]*\}/);
  assert.ok(reglesHtmlBody, 'la règle html, body doit exister');
  assert.ok(!/touch-action/.test(reglesHtmlBody[0]),
    '`touch-action` ne doit plus être posé sur toute la page');
  const regleCanvas = html.match(/\bcanvas\s*\{[^}]*\}/);
  assert.ok(regleCanvas && /touch-action:\s*none/.test(regleCanvas[0]),
    'le canvas, lui, doit toujours interdire défilement et zoom natifs pendant le jeu');

  // b) L'écran est borné à la hauteur RÉELLEMENT visible, avec son repli :
  //    `100dvh` d'abord pour les navigateurs mobiles à barre rétractable,
  //    `100vh` déclaré AVANT lui pour ceux qui l'ignorent (l'ordre fait le
  //    repli — jamais un test de capacité en JS).
  const regleEcran = html.match(/\.ecran-ui\s*\{[^}]*\}/);
  assert.ok(regleEcran, '.ecran-ui doit exister');
  const iVh = regleEcran[0].indexOf('height: 100vh');
  const iDvh = regleEcran[0].indexOf('height: 100dvh');
  assert.ok(iVh !== -1 && iDvh !== -1, 'hauteur bornée : 100vh ET 100dvh');
  assert.ok(iVh < iDvh, '100vh doit être déclaré AVANT 100dvh, sinon le repli écrase la bonne valeur');

  // c) Le corps défile, et le doigt a le droit de le faire défiler.
  const regleCorps = html.match(/\.ecran-ui-corps\s*\{[^}]*\}/);
  assert.ok(regleCorps, '.ecran-ui-corps doit exister');
  assert.ok(/overflow-y:\s*auto/.test(regleCorps[0]), 'le corps doit être un conteneur défilant');
  assert.ok(/min-height:\s*0/.test(regleCorps[0]),
    'sans min-height: 0, un enfant de flex grandit pour tout contenir et rien ne défile jamais');
  assert.ok(/touch-action:\s*pan-y/.test(regleCorps[0]), 'le défilement vertical au doigt doit être autorisé');
  assert.ok(!/justify-content:\s*center/.test(regleCorps[0]),
    'centrer un conteneur qui déborde pousse le haut du contenu hors de portée du défilement — c’est la cause racine');
  console.log('  index.html : page libérée, écran borné (100vh puis 100dvh), corps défilant au doigt');
}

// --- 2. « Fermer » est hors de la liste défilante, dans l'en-tête figé ----
{
  const { document, menu } = construireMenu();
  menu.ouvrir();

  const fermerMenu = document.body.querySelector('#menu-fermer');
  assert.ok(fermerMenu, 'le menu Pause a une entrée Fermer');
  assert.equal(aPourAncetre(fermerMenu, 'ecran-ui-liste'), false,
    '« Fermer » ne doit plus être un enfant de la liste défilante');
  assert.equal(aPourAncetre(fermerMenu, 'ecran-ui-entete'), true,
    '« Fermer » vit dans l’en-tête, qui ne défile pas');

  // Même chose pour un écran générique (Poche) : c'est le même défaut, donc
  // le même correctif — jamais écran par écran.
  menu.traiterInput(etat({ y: 1 }));
  menu.traiterInput(etat({ y: 0 }));
  menu.traiterInput(etat({ y: 1 }));
  menu.traiterInput(etat({ y: 0 }));
  menu.traiterInput(etat({ attack: true })); // "Poche" (index 2)
  const poche = document.body.children.find((el) => el.hidden === false && el._classes.includes('ecran-ui') && el.id === '');
  assert.ok(poche, 'la Poche doit être ouverte');
  const entetePoche = poche.querySelector('.ecran-ui-entete');
  const listePoche = poche.querySelector('.ecran-ui-liste');
  assert.ok(entetePoche && listePoche, 'un en-tête et une liste');
  const fermerPoche = entetePoche.querySelector('.ecran-ui-fermer');
  assert.ok(fermerPoche, '« Fermer » de la Poche est dans l’en-tête');
  assert.equal(listePoche.querySelectorAll('.ecran-ui-fermer').length, 0,
    'et nulle part dans la liste défilante');
  console.log('  « Fermer » sorti de la liste : menu Pause et écran générique');
}

// --- 3. …et reste la DERNIÈRE entrée de la navigation --------------------
// Le ticket interdit de changer l'ordre ou le contenu des entrées. L'ordre
// du DOM le dit encore (l'en-tête est le dernier enfant, remonté à l'écran
// par `order: -1`), et c'est ce que vérifient sans modification les trois
// tests d'écrans existants ; on le réaffirme ici, explicitement.
{
  const { document, menu } = construireMenu();
  menu.ouvrir();
  const conteneur = document.body.querySelector('#menu');
  const items = conteneur.querySelectorAll('.menu-item');
  const dernier = items[items.length - 1];
  assert.ok(dernier.querySelector('#menu-fermer'),
    '« Fermer » doit rester la dernière entrée dans l’ordre du document');
  assert.equal(items.length, 9, 'les 9 entrées du menu Pause, ni une de plus ni une de moins');
  console.log('  ordre des entrées inchangé : « Fermer » toujours en dernier');
}

// --- 4. Les sept écrans partagés ont tous le même habillage --------------
// Le bandeau de Construction est exclu : ce n'est pas un écran plein écran
// (`pointer-events: none`, sans focus ni navigation — carte §1.3).
{
  const { document } = construireMenu();
  const ecrans = document.body.children.filter((el) => el.style.pointerEvents !== 'none');
  assert.equal(ecrans.length, 7,
    'menu Pause, confirmation de reset, Poche, Craft, Coffre, Stats, Construction');
  for (const el of ecrans) {
    assert.ok(el._classes.includes('ecran-ui'),
      `chaque écran porte la classe commune (${el.id || 'écran générique'})`);
    assert.equal(el.querySelectorAll('.ecran-ui-corps').length, 1, 'un corps défilant, et un seul');
    assert.equal(el.querySelectorAll('.ecran-ui-liste').length, 1, 'une liste, et une seule');
  }
  console.log('  les 7 écrans partagés portent le même habillage (bandeau exclu)');
}

// --- 5. Le focus demande la mise en vue ----------------------------------
// Depuis que le corps défile, une entrée focalisée peut être hors de la zone
// visible : à la manette et au clavier, le curseur s'y perdrait.
{
  const { document, menu } = construireMenu();
  menu.ouvrir();
  const conteneur = document.body.querySelector('#menu');
  const items = conteneur.querySelectorAll('.menu-item');
  const compteursAvant = items.map((el) => el.misEnVue);
  assert.ok(compteursAvant.some((n) => n > 0), 'le focus initial est déjà mis en vue');

  // Trois crans vers le bas : à chaque fois, c'est l'entrée focalisée — et
  // elle seule — qui demande à être ramenée dans la zone visible.
  for (let i = 0; i < 3; i += 1) {
    const avant = items.map((el) => el.misEnVue);
    menu.traiterInput(etat({ y: 1 }));
    menu.traiterInput(etat({ y: 0 }));
    const bouges = items.map((el, k) => el.misEnVue - avant[k]).map((n, k) => (n > 0 ? k : -1)).filter((k) => k >= 0);
    assert.deepEqual(bouges, [i + 1], `cran ${i + 1} : seule l’entrée focalisée est mise en vue`);
  }
  console.log('  le focus ramène l’entrée sélectionnée dans la zone visible (manette/clavier)');
}

// --- 6. « Fermer » ne ferme qu'une fois, même après N reconstructions -----
// Son élément DOM SURVIT désormais aux reconstructions de la liste (il est
// dans l'en-tête, qui n'est pas réécrit) : y empiler un écouteur à chaque
// `rafraichir()` aurait fermé l'écran autant de fois qu'il a été reconstruit.
// Craft est l'écran qui expose publiquement les deux (`ouvrirCraft`,
// `rafraichirCraft`) — c'est aussi le plus reconstruit en jeu, une recette
// craftée grisant la suivante.
{
  const { document, menu } = construireMenu();
  menu.ouvrirCraft(() => [{ texte: 'recette', action: () => {} }], 'craft');
  const craft = document.body.children.find((el) => el.hidden === false && el._classes.includes('ecran-ui'));
  const boutonFermer = craft.querySelector('.ecran-ui-fermer');
  assert.ok(boutonFermer, 'l’écran Craft a son « Fermer » dans l’en-tête');

  for (let i = 0; i < 5; i += 1) menu.rafraichirCraft();
  assert.equal(boutonFermer._listeners.click.length, 1,
    'un seul écouteur de clic sur « Fermer », quel que soit le nombre de reconstructions');

  boutonFermer.declencher('click');
  assert.equal(craft.hidden, true, 'un clic referme l’écran');
  assert.equal(menu.estOuvert(), false,
    'et l’invariant tient : plus aucun écran de menu ouvert');
  console.log('  « Fermer » garde un seul écouteur, même après plusieurs reconstructions');
}

console.log('OK test_d42_menu_fermable_tactile');

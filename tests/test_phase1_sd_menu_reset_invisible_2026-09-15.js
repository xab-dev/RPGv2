// Contrat : SD_menu-reset-invisible_2026-09-15.md — l'écran de confirmation
// du reset doit être *effectivement* visible (position + display), pas
// seulement marqué non-`hidden`. Un test qui ne lirait que `.hidden` reste
// vert dès l'écriture (le bug réel est un défaut de style, pas de logique
// d'ouverture) : ce test lit donc aussi le style calculé, comme le ferait
// l'inspecteur navigateur décrit par la fiche.
//
// Aucune dépendance (ajv/jsdom exclus par CLAUDE.md) : faux DOM minimal,
// taillé pour les seuls gabarits `innerHTML` de menu.js — même esprit que
// `creerFausseCible()` de test_phase0_input, étendu ici à un mini-arbre DOM
// puisque menu.js a besoin de `createElement`/`innerHTML`/`querySelector`.
import assert from 'node:assert/strict';
import { initialiserMenu } from '../src/ui/menu.js';

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
  declencher(type, evt = {}) {
    for (const fn of this._listeners[type] || []) fn(evt);
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

// Parseur volontairement minimal : ne couvre que les gabarits réellement
// utilisés par menu.js (balises bien formées, un seul niveau d'attributs
// entre guillemets doubles, pas de texte statique — tout passe par
// data-cle + i18n). Pas un parseur HTML général.
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

// Même forme que creerCoucheInput().maj() (cf. test_menu_navigation).
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

// Un élément est effectivement visible s'il n'est pas `hidden` ET si son
// style ne le fait pas disparaître du flux affiché (display:none, ou aucun
// display du tout alors qu'un positionnement plein écran est attendu).
// C'est cette double condition, pas seulement `.hidden`, qui distingue le
// bug réel (rapporté par Xav : logique saine, rendu invisible) d'un test
// qui resterait vert par accident.
function estVisibleEffectif(el) {
  return el.hidden === false && el.style.display !== 'none' && el.style.display !== undefined;
}

function construireMenu() {
  const document = creerFauxDocument();
  const menu = initialiserMenu({
    document,
    i18n: creerFauxI18n(),
    exporterSauvegarde: () => {},
    importerSauvegarde: () => {},
  });
  const conteneur = document.body.querySelector('#menu');
  const confirmation = document.body.querySelector('#menu-confirmation-reset');
  return { menu, conteneur, confirmation };
}

// Amène le focus du menu principal sur l'entrée "Réinitialiser" (index 3 :
// langue, exporter, importer, réinitialiser, fermer) par 3 crans successifs
// avant/après relâchement, comme le ferait réellement une manette.
// "Réinitialiser la sauvegarde" est le 6ᵉ élément (index 5) depuis
// 03_maison-exterieur (Musique et Poche insérées avant lui, ordre : langue,
// musique, poche, exporter, importer, réinitialiser, fermer).
function focaliserReset(menu) {
  for (let i = 0; i < 5; i++) {
    menu.traiterInput(etat({ y: 1 }));
    menu.traiterInput(etat({ y: 0 }));
  }
}

// 1. Le conteneur de confirmation est bien attaché au document (élimine
//    l'hypothèse A : `appendChild` absent).
{
  const { confirmation } = construireMenu();
  assert.notEqual(confirmation, null, "l'écran de confirmation doit être attaché au document");
}

// 2. Le conteneur de confirmation n'est jamais un enfant du conteneur du
//    menu principal (élimine l'hypothèse B : masquer le menu principal ne
//    doit pas aussi masquer la confirmation).
{
  const { conteneur, confirmation } = construireMenu();
  assert.notEqual(confirmation.parentNode, conteneur, 'la confirmation doit être un frère, pas un enfant, du menu principal');
}

// 3. Ouvrir le menu, focaliser "Réinitialiser", ATTACK → la confirmation
//    devient *effectivement* visible (pas seulement non-`hidden`) et le
//    menu principal *effectivement* invisible. C'est le test qui aurait dû
//    être rouge avant patch : le bug réel est un défaut de style, pas
//    seulement de logique d'ouverture (cf. commentaire estVisibleEffectif).
{
  const { menu, conteneur, confirmation } = construireMenu();
  menu.ouvrir();
  focaliserReset(menu);
  menu.traiterInput(etat({ attack: true }));

  assert.equal(estVisibleEffectif(confirmation), true, "l'écran de confirmation doit être effectivement visible après ouverture");
  assert.equal(estVisibleEffectif(conteneur), false, 'le menu principal doit être effectivement masqué pendant la confirmation');
}

// 4. B (skill_3) depuis la confirmation → retour au menu principal,
//    effectivement visible ; confirmation effectivement masquée.
{
  const { menu, conteneur, confirmation } = construireMenu();
  menu.ouvrir();
  focaliserReset(menu);
  menu.traiterInput(etat({ attack: true }));

  menu.traiterInput(etat({ skill3: true }));

  assert.equal(estVisibleEffectif(confirmation), false, 'confirmation masquée après retour (B)');
  assert.equal(estVisibleEffectif(conteneur), true, 'menu principal effectivement visible après retour (B)');
}

// 5. Focus par défaut de la confirmation sur "Non" (index 1), sécurité déjà
//    actée au diagnostic précédent — revérifié ici pour non-régression.
{
  const { menu, confirmation } = construireMenu();
  menu.ouvrir();
  focaliserReset(menu);
  menu.traiterInput(etat({ attack: true }));

  const curseurs = confirmation.querySelectorAll('.menu-curseur');
  assert.equal(curseurs[0].textContent, '', '"Oui" (index 0) ne doit pas être focalisé par défaut');
  assert.equal(curseurs[1].textContent, '›', '"Non" (index 1) doit être focalisé par défaut');
}

console.log('OK test_phase1_sd_menu_reset_invisible');

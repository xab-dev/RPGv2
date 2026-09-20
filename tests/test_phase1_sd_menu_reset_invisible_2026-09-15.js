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
//
// specs/08_menus-cartes.md (palier A4, 2026-09-20) — CE QUE CE FICHIER EST
// DEVENU. La confirmation du reset n'est plus un second conteneur DOM, frère du
// menu principal : c'est un NIVEAU de la pile de la grille de cartes, affiché
// dans le même élément `#menu`. Les hypothèses A et B de la fiche (« jamais
// attaché au document », « enfant du conteneur qu'on masque ») n'ont donc plus
// d'objet — il n'y a plus de second élément à oublier d'attacher ou de styler,
// et c'est exactement ce qui rend la classe de bug impossible. Le CONTRAT,
// lui, est conservé et revérifié à l'identique : la confirmation est
// *effectivement* visible (pas seulement non-`hidden`), le focus par défaut
// est sur « Non », B revient en arrière, et Poche/Stats masquent puis rendent
// le menu quel que soit le chemin de fermeture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initialiserMenu } from '../src/ui/menu.js';

const MENUS = JSON.parse(fs.readFileSync(new URL('../data/menus.json', import.meta.url), 'utf8'));

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
function etat({ x = 0, y = 0, attack = false, skill3 = false } = {}) {
  return {
    move: { x, y },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: skill3, held: skill3 },
    consume: { pressed: false, held: false },
    interact: { pressed: false, held: false },
    menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
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
    menus: MENUS,
    exporterSauvegarde: () => {},
    importerSauvegarde: () => {},
  });
  const conteneur = document.body.querySelector('#menu');
  return { menu, conteneur };
}

// Un cran de stick = une poussée, puis le retour au neutre (front montant).
function cran(menu, x, y) {
  menu.traiterInput(etat({ x, y }));
  menu.traiterInput(etat());
}

// Amène le focus sur une carte de l'écran affiché, par crans réels, comme le
// ferait une manette : sa position est LUE sur la grille (jamais un index
// codé en dur — c'est ce qui rendait l'ancien `focaliserReset` fragile, il
// avait dû être recompté à chaque entrée ajoutée au menu).
function focaliserCarte(menu, id) {
  const { cases, colonnes } = menu.obtenirEtatCartes();
  const cible = cases.indexOf(id);
  assert.ok(cible >= 0, `la carte "${id}" doit être affichée`);
  for (let i = 0; i < cible % colonnes; i++) cran(menu, 1, 0);
  for (let i = 0; i < Math.floor(cible / colonnes); i++) cran(menu, 0, 1);
  assert.equal(menu.obtenirEtatCartes().focus, cible, `le focus doit atteindre "${id}" au stick`);
}
function valider(menu, id) {
  focaliserCarte(menu, id);
  menu.traiterInput(etat({ attack: true }));
  menu.traiterInput(etat());
}

// Racine → Paramètres → Sauvegarde → Réinitialiser, à la manette seule.
function ouvrirConfirmationReset(menu) {
  menu.ouvrir();
  valider(menu, 'carte_parametres');
  valider(menu, 'carte_sauvegarde');
  valider(menu, 'carte_reinitialiser');
}

// 1. Le menu est attaché au document, et il n'existe plus de second conteneur
//    de confirmation à attacher, à styler ou à oublier.
{
  const document = creerFauxDocument();
  initialiserMenu({ document, i18n: creerFauxI18n(), menus: MENUS, exporterSauvegarde: () => {}, importerSauvegarde: () => {} });
  assert.notEqual(document.body.querySelector('#menu'), null, 'le menu doit être attaché au document');
  assert.equal(document.body.querySelector('#menu-confirmation-reset'), null, 'plus de conteneur de confirmation séparé');
}

// 2. Ouvrir le menu, aller jusqu'à « Réinitialiser », ATTACK → la confirmation
//    est *effectivement* visible (pas seulement non-`hidden`). C'est le test
//    qui aurait dû être rouge avant le patch de la fiche : le bug réel était
//    un défaut de style, pas de logique d'ouverture (cf. estVisibleEffectif).
{
  const { menu, conteneur } = construireMenu();
  let reinitialisations = 0;
  menu.definirActionReinitialiser(() => { reinitialisations += 1; });
  ouvrirConfirmationReset(menu);

  assert.equal(menu.obtenirEtatCartes().ecran, 'carte_reinitialiser#confirmation', "c'est bien l'écran de confirmation qui est affiché");
  assert.equal(estVisibleEffectif(conteneur), true, "l'écran de confirmation doit être effectivement visible après ouverture");
  assert.equal(menu.estOuvert(), true);
  assert.equal(reinitialisations, 0, 'ouvrir la confirmation ne réinitialise rien');
}

// 3. B (skill_3) depuis la confirmation → retour d'UN écran, effectivement
//    visible, focus rendu à la carte qui avait ouvert la confirmation.
{
  const { menu, conteneur } = construireMenu();
  ouvrirConfirmationReset(menu);

  menu.traiterInput(etat({ skill3: true }));

  const apres = menu.obtenirEtatCartes();
  assert.equal(apres.ecran, 'menu_sauvegarde', 'B depuis la confirmation revient à l\'écran Sauvegarde');
  assert.equal(apres.cases[apres.focus], 'carte_reinitialiser', 'le focus revient sur la carte qui avait ouvert la confirmation');
  assert.equal(estVisibleEffectif(conteneur), true, 'le menu reste effectivement visible après retour (B)');
}

// 4. Focus par défaut de la confirmation sur « Non », sécurité actée au
//    diagnostic précédent — revérifiée ici pour non-régression. « Non » tient
//    la case 0, et ATTACK sans bouger ne réinitialise JAMAIS.
{
  const { menu } = construireMenu();
  let reinitialisations = 0;
  menu.definirActionReinitialiser(() => { reinitialisations += 1; });
  ouvrirConfirmationReset(menu);

  const { cases, focus } = menu.obtenirEtatCartes();
  assert.equal(cases[focus], 'carte_reinitialiser#non', '« Non » doit être focalisé par défaut');
  menu.traiterInput(etat({ attack: true })); // le joueur martèle A : rien ne s'efface
  assert.equal(reinitialisations, 0, 'ATTACK sur le focus par défaut ne réinitialise jamais');
  assert.equal(menu.obtenirEtatCartes().ecran, 'menu_sauvegarde');

  // « Oui » : un cran à droite, délibéré. Réinitialise UNE fois, et ferme tout.
  menu.traiterInput(etat());
  valider(menu, 'carte_reinitialiser');
  cran(menu, 1, 0);
  menu.traiterInput(etat({ attack: true }));
  assert.equal(reinitialisations, 1);
  assert.equal(menu.estOuvert(), false, '« Oui » referme tout le menu : la partie redémarre');
}

// 5. Palier D/C de 04_maison-interieur.md — Poche/Stats masquent le menu SANS
// jamais le fermer : régression trouvée en revue (§ journal) — le menu restait
// superposé derrière l'écran ouvert, puis restait masqué APRÈS fermeture si
// elle passait par B (skill_3) plutôt que par le clic sur « Fermer ». Vérifié
// ici via B, le chemin qui avait été oublié.
for (const [idCarte, nom] of [['carte_poche', 'Poche'], ['carte_stats', 'Stats']]) {
  const { menu, conteneur } = construireMenu();
  menu.ouvrir();
  valider(menu, 'carte_heros');
  valider(menu, idCarte);

  assert.equal(estVisibleEffectif(conteneur), false, `le menu doit être masqué pendant que ${nom} est ouvert`);
  assert.equal(menu.estOuvert(), true, `${nom} ouvert : menu.estOuvert() reste vrai`);

  menu.traiterInput(etat({ skill3: true })); // ferme l'écran via B

  assert.equal(estVisibleEffectif(conteneur), true, `le menu doit réapparaître après fermeture de ${nom} par B`);
  const apres = menu.obtenirEtatCartes();
  assert.equal(apres.ecran, 'menu_heros', 'B ferme l\'écran de liste, et lui SEUL : la grille ne dépile pas dans la même frame');
  assert.equal(apres.cases[apres.focus], idCarte, `le focus est resté sur la carte ${nom}`);
}

console.log('OK test_phase1_sd_menu_reset_invisible');

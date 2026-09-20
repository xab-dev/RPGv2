// `D-43`, palier A4 (specs/08_menus-cartes.md §6) — le branchement : la grille
// de cartes REMPLACE la liste du menu Pause ; Poche, Stats et Construction
// s'ouvrent depuis leurs cartes, inchangés.
//
// Ce fichier teste L'ASSEMBLAGE — le vrai `ui/menu.js`, le vrai orchestrateur,
// le vrai registre de flags, le vrai `data/menus.json` — pas deux doubles qui
// se parlent. Les écrans de liste eux-mêmes ont leurs propres tests, adaptés
// à ce palier sans que leur contrat bouge (`test_construction`,
// `test_sd_menu_ecrans_orphelins`, `test_sd_construction_parite_clic_verbe`,
// `test_phase1_sd_menu_reset_invisible`, `test_d42…`, `test_d30…`).
//
// CE QU'IL NE PROUVE PAS : que le menu est lisible, que l'accent est le bon,
// que ça tient dans l'écran. Captures `docs/captures/menus-cartes-2026-09-20/`
// et `V-27`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { initialiserMenu, clesTexteEtats } from '../src/ui/menu.js';
import { erreursCablageMenus, erreursTextesMenus, CLES_TEXTE_COMPOSANT } from '../src/menu_cartes.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreursChargement, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

function etat({ moveX = 0, moveY = 0, attack = false, skill3 = false, menu = false } = {}) {
  const b = (v) => ({ pressed: v, held: v });
  return {
    move: { x: moveX, y: moveY }, attack: b(attack), skill_1: b(false), skill_2: b(false), skill_3: b(skill3),
    consume: b(false), interact: b(false), menu: b(menu),
  };
}
function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}

// --- Faux DOM minimal (copié, pas partagé : convention du dépôt). Celui-ci
// ENREGISTRE les variables CSS posées, pour vérifier la géométrie et l'accent.
class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.id = ''; this.dataset = {}; this.children = []; this.parentNode = null;
    this._classes = []; this._listeners = {}; this._texte = ''; this.hidden = false;
    const variables = {};
    this.variables = variables;
    this.style = {
      setProperty: (nom, valeur) => { variables[nom] = valeur; },
      removeProperty: (nom) => { delete variables[nom]; },
    };
    this.clics = 0;
  }
  get className() { return this._classes.join(' '); }
  set className(v) { this._classes = String(v || '').split(/\s+/).filter(Boolean); }
  setAttribut(nom, val) {
    if (nom === 'id') this.id = val;
    else if (nom === 'class') this.className = val;
    else if (nom.startsWith('data-')) this.dataset[nom.slice(5)] = val;
  }
  appendChild(e) { e.parentNode = this; this.children.push(e); return e; }
  addEventListener(t, f) { (this._listeners[t] ||= []).push(f); }
  declencher(t, evt = {}) { for (const f of this._listeners[t] || []) f(evt); }
  click() { this.clics += 1; }
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
      while ((a = regexAttr.exec(attrsStr || ''))) if (a[1]) el.setAttribut(a[1], a[2] !== undefined ? a[2] : true);
      pile[pile.length - 1].appendChild(el);
      if (!autoFerme) pile.push(el);
    }
    this.children = racine.children;
    this.children.forEach((c) => (c.parentNode = this));
  }
  querySelectorAll(sel) {
    const out = [];
    const ok = (el) => (sel.startsWith('#') ? el.id === sel.slice(1)
      : sel.startsWith('.') ? el._classes.includes(sel.slice(1))
        : sel.startsWith('[data-') ? Object.prototype.hasOwnProperty.call(el.dataset, sel.slice(6, -1)) : false);
    const visiter = (el) => { for (const e of el.children) { if (ok(e)) out.push(e); visiter(e); } };
    visiter(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
const creerFauxDocument = () => ({ createElement: (t) => new ElementFactice(t), body: new ElementFactice('body') });

function saveAvec({ dansLaMaison, compagnon = 'comp_follet_eau' }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  // Dans la Maison : tuile intérieure calme (même position que
  // test_construction). Dehors : sur le chemin, loin de toute structure.
  const position = dansLaMaison ? px(85, 52) : px(60, 57);
  save.hero.x = position.x;
  save.hero.y = position.y;
  save.hero.companion = compagnon;
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_maison_decouverte: true,
  };
  return save;
}

// Le câblage de `main.js#demarrerJeu`, reproduit ligne pour ligne.
function construireBanc({ dansLaMaison = true, compagnon, pleinEcranDisponible = true } = {}) {
  const save = saveAvec({ dansLaMaison, compagnon });
  const document = creerFauxDocument();
  const journal = [];
  const menu = initialiserMenu({
    document, i18n, menus: registre.tous('menus'),
    exporterSauvegarde: () => journal.push('exporter'),
    importerSauvegarde: () => journal.push('importer'),
    couleurAccent: () => {
      const c = save.hero.companion ? registre.obtenir('companions', save.hero.companion) : null;
      return c ? c.couleur_ui : null;
    },
    rectangleJeu: () => ({ x: 111, y: 5, unite: 1 }),
  });
  const frames = [];
  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: creerInputScripte(frames), ctxLogique: null, ctxVisible: null, canvasLogique: null,
    valeursExternes: () => ({ plein_ecran_disponible: pleinEcranDisponible ? 1 : 0 }),
  });
  menu.definirActionReinitialiser(() => journal.push('REINITIALISER'));
  menu.definirEntreesStats(orchestrateur.obtenirEntreesStats);
  menu.definirEvaluateurCondition(orchestrateur.evaluerCondition);
  menu.definirEntreesConstruction(orchestrateur.entreesConstruction);
  const jouer = (e) => { frames.push(e); orchestrateur.maj(16); frames.push(etat()); orchestrateur.maj(16); };
  const carte = (id) => document.body.querySelectorAll('[data-carte]').find((c) => c.dataset.carte === id) || null;
  return { save, document, menu, orchestrateur, journal, jouer, carte, el: document.body.querySelector('#menu') };
}

// --- 1. Le câblage RÉEL du jeu passe le contrôle de démarrage, dans les deux sens
{
  const { menu, orchestrateur } = construireBanc();
  const enregistres = { ...menu.cablage(), valeurs: orchestrateur.nomsValeursConditions() };
  assert.deepEqual(erreursCablageMenus(registre.tous('menus'), enregistres), [],
    'toute carte trouve sa fonction, toute fonction a sa carte, toute valeur citée est fournie');
  assert.deepEqual(enregistres.valeurs.sort(), ['niveau', 'plein_ecran_disponible', 'stations_placables']);
  assert.deepEqual(enregistres.ecrans, ['ecran_poche', 'ecran_stats', 'ecran_construction'],
    'les trois écrans existants que le palier A rebranche — Craft et Coffre s’ouvrent par INTERACT, pas par une carte');

  // Les textes que le CODE choisit (états des bascules, composant) existent
  // dans les deux langues — aucune carte ne les cite, ce contrôle seul les voit.
  assert.deepEqual(erreursTextesMenus(registre.tous('menus'), dictionnaires,
    [...CLES_TEXTE_COMPOSANT, ...clesTexteEtats(Object.keys(dictionnaires))]), []);
  assert.ok(clesTexteEtats(['fr', 'en']).includes('menu.etat.langue_en'), 'une clé d’état par langue chargée');
  console.log('OK câblage réel : contrôle de démarrage vert dans les deux sens, textes du code compris');
}

// --- 2. MENU ouvre la grille ; la case contextuelle suit le LIEU, par le vrai registre de flags
{
  const dedans = construireBanc({ dansLaMaison: true });
  dedans.jouer(etat({ menu: true }));
  assert.equal(dedans.menu.estOuvert(), true, 'le verbe MENU ouvre le menu Pause');
  assert.deepEqual(dedans.menu.obtenirEtatCartes().cases, ['carte_heros', 'carte_parametres', null, 'carte_construction'],
    'dans la Maison : Construction tient la case contextuelle ; la case 2 reste libre');
  assert.equal(dedans.orchestrateur.uiOuverteMaintenant(), true, 'menu ouvert = jeu gelé (point de décision unique, inchangé)');

  const dehors = construireBanc({ dansLaMaison: false });
  dehors.jouer(etat({ menu: true }));
  assert.deepEqual(dehors.menu.obtenirEtatCartes().cases, ['carte_heros', 'carte_parametres', null, null],
    'hors de la Maison : la case contextuelle est VIDE, Héros et Paramètres n’ont pas bougé');
  assert.equal(dehors.orchestrateur.evaluerCondition({ valeur: 'stations_placables', min: 1 }), false);
  assert.equal(dedans.orchestrateur.evaluerCondition({ valeur: 'stations_placables', min: 1 }), true);
  console.log('OK case contextuelle : présente dans la Maison, vide ailleurs — évaluée par flags.js, sans format nouveau');
}

// --- 3. Accent et géométrie -----------------------------------------------------
{
  const eau = construireBanc({ compagnon: 'comp_follet_eau' });
  eau.menu.ouvrir();
  assert.equal(eau.el.variables['--menu-accent'], registre.obtenir('companions', 'comp_follet_eau').couleur_ui);
  assert.deepEqual([eau.el.variables['--jeu-x'], eau.el.variables['--jeu-y'], eau.el.variables['--u']], ['111px', '5px', '1px'],
    'la boîte se cale sur le rectangle du canvas, l’unité vient de l’appelant');

  // Avant le choix du follet : AUCUN accent posé — c'est la feuille de style
  // qui porte l'accent neutre, le code n'en connaît pas la couleur.
  const neutre = construireBanc({ compagnon: null });
  neutre.menu.ouvrir();
  assert.equal('--menu-accent' in neutre.el.variables, false);
  // L'accent est relu à CHAQUE ouverture : le follet choisi entre-temps recolore le menu.
  neutre.save.hero.companion = 'comp_follet_terre';
  neutre.menu.ouvrir();
  assert.equal(neutre.el.variables['--menu-accent'], registre.obtenir('companions', 'comp_follet_terre').couleur_ui);

  // Un 4ᵉ follet = une entrée : tous les menus se recolorent seuls (§4.5).
  for (const c of registre.tous('companions')) {
    const b = construireBanc({ compagnon: c.id });
    b.menu.ouvrir();
    assert.equal(b.el.variables['--menu-accent'], c.couleur_ui, `${c.id} : son accent, sans une ligne de code`);
  }
  console.log('OK accent : lu sur le compagnon à chaque ouverture, neutre = rien de posé · géométrie calée sur le canvas');
}

// --- 4. Poche, Stats, Construction s'ouvrent depuis leurs cartes, INCHANGÉS ---------
{
  const banc = construireBanc();
  const { menu, document, el } = banc;
  const listeVisible = () => document.body.children.find((e) => e !== el && e.tagName === 'DIV' && e.hidden === false && e._classes.includes('ecran-ui'));
  // Un écran de liste (`.ecran-ui-titre`) ou, depuis le palier C, un écran
  // « maître-détail » (`.cartes-titre`, le même en-tête que la grille).
  const titreListe = () => (listeVisible().querySelector('.ecran-ui-titre') || listeVisible().querySelector('.cartes-titre')).textContent;

  for (const [chemin, titre] of [
    [['carte_heros', 'carte_poche'], i18n.t('menu.poche_titre')],
    [['carte_heros', 'carte_stats'], i18n.t('menu.stats_titre')],
    [['carte_construction'], i18n.t('menu.construction_titre')],
  ]) {
    menu.ouvrir();
    for (const id of chemin) banc.carte(id).declencher('click');
    assert.equal(titreListe(), titre, `${chemin.join(' → ')} ouvre l’écran existant`);
    assert.equal(el.hidden, true, 'la grille s’efface derrière lui');
    assert.equal(menu.estOuvert(), true, 'menu.estOuvert() reste vrai : un écran de menu est visible');
    // Palier B : l'écran de liste est un NIVEAU de la même pile que les
    // écrans de cartes (au palier A, la grille se masquait et gardait sa pile
    // pour elle). Ce que le joueur voit n'a pas changé ; ce qui s'observe, si.
    const ecranParent = registre.tous('menus').find((e) => e.cartes.some((c) => c.id === chemin.at(-1))).id;
    assert.equal(menu.obtenirEtatPile().profondeur, chemin.length + 1, 'l’écran de liste est empilé sur le niveau qui l’ouvre');
    banc.jouer(etat({ skill3: true })); // B ferme l'écran de liste…
    assert.equal(listeVisible(), undefined);
    assert.equal(el.hidden, false, '…et la grille réapparaît');
    const apres = menu.obtenirEtatCartes();
    assert.deepEqual([apres.profondeur, apres.ecran], [chemin.length, ecranParent], 'B a dépilé UN niveau : on retrouve l’écran qui l’avait ouvert');
    assert.equal(apres.cases[apres.focus], chemin.at(-1), 'exactement où on l’avait laissé : le focus est resté sur la carte');
  }
  console.log('OK écrans existants : ouverts depuis leurs cartes, refermés par B — un seul niveau dépilé, focus rendu');
}

// --- 5. Les actions : agir, PUIS fermer — et Importer sans contrôle natif dans la grille
{
  const banc = construireBanc();
  const { menu, document, journal } = banc;
  const allerASauvegarde = () => { menu.ouvrir(); banc.carte('carte_parametres').declencher('click'); banc.carte('carte_sauvegarde').declencher('click'); };

  allerASauvegarde();
  banc.carte('carte_exporter').declencher('click');
  assert.deepEqual(journal, ['exporter']);
  assert.equal(menu.estOuvert(), false, 'une action ferme le menu');

  // Importer : le sélecteur de fichier natif vit HORS de la grille, caché ;
  // la carte le déclenche, et le fichier choisi part à `importerSauvegarde`.
  const selecteur = document.body.children.find((e) => e.tagName === 'INPUT');
  assert.ok(selecteur && selecteur.hidden, 'un <input type=file> caché, enfant du document');
  assert.equal(banc.el.querySelectorAll('[data-carte]').some((c) => c.tagName === 'INPUT'), false);
  allerASauvegarde();
  banc.carte('carte_importer').declencher('click');
  assert.equal(selecteur.clics, 1, 'la carte ouvre le sélecteur de fichier');
  selecteur.declencher('change', { target: { files: [{ name: 'save.json' }] } });
  assert.deepEqual(journal, ['exporter', 'importer']);

  // Réinitialiser : l'action réelle est fournie APRÈS la construction du menu
  // (couture différée) — la carte doit appeler la version à jour, pas celle
  // qui existait quand le menu a été construit.
  allerASauvegarde();
  banc.carte('carte_reinitialiser').declencher('click');
  assert.equal(journal.includes('REINITIALISER'), false, 'la carte danger ouvre une confirmation, elle n’efface rien');
  banc.carte('carte_reinitialiser#oui').declencher('click');
  assert.deepEqual(journal.slice(-1), ['REINITIALISER']);
  assert.equal(menu.estOuvert(), false);
  console.log('OK actions : exporter / importer / réinitialiser — agir puis fermer, confirmation avant le danger');
}

// --- 6. menu.fermer() et menu.ouvrir() ne laissent jamais deux écrans visibles ------
{
  const banc = construireBanc();
  const { menu, document, el } = banc;
  const ecransVisibles = () => document.body.children.filter((e) => e.tagName === 'DIV' && e.hidden === false && e._classes.includes('ecran-ui')).length;
  menu.ouvrir();
  banc.carte('carte_heros').declencher('click');
  banc.carte('carte_poche').declencher('click');
  assert.equal(ecransVisibles(), 1);
  // Fermeture programmatique PENDANT qu'une liste est ouverte : sa fermeture
  // rappelle `reafficher()` — la grille, déjà vidée, ne doit pas ressurgir.
  menu.fermer();
  assert.equal(ecransVisibles(), 0, 'menu.fermer() ne laisse rien à l’écran');
  assert.equal(menu.estOuvert(), false);
  // Et une réouverture par-dessus une liste ouverte repart de la racine, seule.
  menu.ouvrir();
  banc.carte('carte_heros').declencher('click');
  banc.carte('carte_stats').declencher('click');
  menu.ouvrir();
  assert.equal(ecransVisibles(), 1);
  assert.equal(el.hidden, false);
  assert.deepEqual([menu.obtenirEtatCartes().ecran, menu.obtenirEtatCartes().profondeur], ['menu_racine', 1]);
  console.log('OK ouvrir/fermer : jamais deux écrans visibles, jamais une grille qui ressurgit');
}

// --- 7. Ni le composant ni le menu ne connaissent un id du catalogue des CARTES ------
// Test du catalogue, côté code : « ajouter une entrée sans toucher au code du
// menu ». Le composant ne nomme RIEN ; `ui/menu.js` nomme ce qu'il ENREGISTRE
// (actions, états, écrans — l'autre moitié du contrat), jamais une carte ni un
// écran du catalogue.
{
  const sansCommentaires = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8').replace(/\/\/.*$/gm, '');
  const composant = sansCommentaires('src/ui/grille_cartes.js');
  for (const prefixe of ['carte_', 'menu_', 'action_', 'etat_', 'ecran_', 'visuel_']) {
    assert.equal(new RegExp(`['"\`]${prefixe}[a-z_]+['"\`]`).test(composant), false, `ui/grille_cartes.js ne doit citer aucun id "${prefixe}…"`);
  }
  const menuJs = sansCommentaires('src/ui/menu.js');
  for (const prefixe of ['carte_', 'menu_racine', 'menu_heros', 'menu_parametres', 'menu_sauvegarde', 'visuel_']) {
    assert.equal(new RegExp(`['"\`]${prefixe}`).test(menuJs), false, `ui/menu.js ne doit citer aucun id "${prefixe}…"`);
  }
  // Et il ignore toujours l'audio, la sauvegarde et l'API plein écran.
  for (const interdit of ['requestFullscreen', 'fullscreenElement', 'AudioContext', 'indexedDB', 'localStorage']) {
    assert.equal(menuJs.includes(interdit), false, `ui/menu.js ne connaît pas ${interdit}`);
    assert.equal(composant.includes(interdit), false, `ui/grille_cartes.js ne connaît pas ${interdit}`);
  }
  console.log('OK frontières : aucun id de carte ou d’écran du catalogue dans le code du menu ; ni audio, ni sauvegarde, ni plein écran');
}

console.log('OK test_d43_a4_branchement_menu');

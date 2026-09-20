// Contrat specs/05_construction-stations.md : grille intérieure (une tuile
// par front montant), rotation par quart de tour (4x = identité), refus
// (chevauchement / hors intérieur / couloir bloqué), pose invalide au
// chargement (sauvegarde altérée -> position par défaut), puits jamais
// placable, et le test data-driven du §7 (une 5ᵉ station placable en JSON de
// test se place sans toucher une ligne de code de système).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { initialiserMenu } from '../src/ui/menu.js';
import { tournerEmpreinte, empreinteAbsoluePuzzle, resoudreEmpreinteInteractif } from '../src/structures.js';
import { dansRectangleTuile, rectanglesChevauchent, couloirPraticable, poseValide } from '../src/placement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');
const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

// --- Partie A : structures.js pur — rotation d'empreinte -------------------

{
  const rect = { x: -10, y: -30, w: 20, h: 10 }; // rectangle asymétrique, aucun axe de symétrie
  const r1 = tournerEmpreinte(rect, 1);
  const r2 = tournerEmpreinte(rect, 2);
  const r3 = tournerEmpreinte(rect, 3);
  const r4 = tournerEmpreinte(rect, 4);
  // Dimensions permutées aux quarts impairs, inchangées au quart pair.
  assert.deepEqual({ w: r1.w, h: r1.h }, { w: rect.h, h: rect.w });
  assert.deepEqual({ w: r2.w, h: r2.h }, { w: rect.w, h: rect.h });
  assert.deepEqual({ w: r3.w, h: r3.h }, { w: rect.h, h: rect.w });
  assert.deepEqual(r4, rect, '4 quarts de tour = identité');
  assert.notDeepEqual(r1, rect, 'une rotation change bien le rectangle (pas un no-op déguisé)');
  console.log('OK tournerEmpreinte : dimensions permutées aux quarts impairs, 4x = identité');
}

{
  const visuel = { primitives: [{ forme: 'rect', dx: 0, dy: -5, w: 4, h: 10, couleur: '#fff' }] };
  const puzzle = { solide: true, echelle: 1 };
  const base = resoudreEmpreinteInteractif(puzzle, visuel, 0);
  const tourne = resoudreEmpreinteInteractif(puzzle, visuel, 1);
  assert.deepEqual(tourne, tournerEmpreinte(base, 1), 'resoudreEmpreinteInteractif applique tournerEmpreinte, jamais un 2e calcul');
  const abs = empreinteAbsoluePuzzle(puzzle, visuel, { x: 2, y: 3, rotation: 1 }, TILE);
  const centre = { x: (2 + 0.5) * TILE, y: (3 + 0.5) * TILE };
  assert.deepEqual(abs, { x: centre.x + tourne.x, y: centre.y + tourne.y, w: tourne.w, h: tourne.h });
  console.log('OK empreinteAbsoluePuzzle : centre de tuile + empreinte tournée');
}

// --- Partie B : placement.js pur — grille, chevauchement, couloir ---------

{
  assert.equal(dansRectangleTuile(5, 5, { x: 0, y: 0, w: 10, h: 10 }), true);
  assert.equal(dansRectangleTuile(10, 5, { x: 0, y: 0, w: 10, h: 10 }), false, 'borne max exclue');
  assert.equal(rectanglesChevauchent({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 }), true);
  assert.equal(rectanglesChevauchent({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 10, w: 5, h: 5 }), false, 'bord-à-bord = pas de chevauchement');
  console.log('OK dansRectangleTuile / rectanglesChevauchent');
}

{
  // Structure-jouet : intérieur 5x3, couloir porte-ouest (-1,1) -> porte-est (5,1).
  const structure = { interieur: { x: 0, y: 0, w: 5, h: 3 }, couloir: [{ x: -1, y: 1 }, { x: 5, y: 1 }] };
  assert.equal(couloirPraticable(structure, [], TILE), true, 'salle vide : toujours praticable');

  // Empreinte qui couvre PILE la seule tuile connectée à la porte ouest (0,1).
  const empreinteBloquante = { x: 0 * TILE, y: 1 * TILE, w: TILE, h: TILE };
  assert.equal(couloirPraticable(structure, [empreinteBloquante], TILE), false, 'la seule case reliée à la porte ouest est bloquée');

  // Une empreinte ailleurs (coin, jamais sur le chemin) ne bloque rien.
  const empreinteAnodine = { x: 4 * TILE, y: 0 * TILE, w: TILE, h: TILE };
  assert.equal(couloirPraticable(structure, [empreinteAnodine], TILE), true);
}

{
  const structure = { rect: { x: 0, y: 0, w: 7, h: 5 }, interieur: { x: 1, y: 1, w: 5, h: 3 }, couloir: [{ x: 0, y: 2 }, { x: 6, y: 2 }] };
  const tileSize = TILE;
  const empreinteCentree = (tx, ty) => ({ x: (tx + 0.5) * tileSize - 8, y: (ty + 0.5) * tileSize - 8, w: 16, h: 16 });

  // Débordement : une empreinte qui dépasse le rectangle intérieur -> refusée, jamais coupée.
  const debordante = { x: (1 + 0.5) * tileSize - 40, y: (1 + 0.5) * tileSize, w: 80, h: 10 };
  assert.deepEqual(poseValide({ empreinte: debordante, structure, autresEmpreintes: [], tileSize }),
    { ok: false, raison: 'hors_interieur' });

  // Chevauchement avec une autre empreinte déjà en place.
  const existante = empreinteCentree(3, 2);
  const candidate = empreinteCentree(3, 2);
  assert.deepEqual(poseValide({ empreinte: candidate, structure, autresEmpreintes: [existante], tileSize }),
    { ok: false, raison: 'chevauchement' });

  // Couloir bloqué : la case reliée à la porte ouest (1,2) est couverte.
  const bloqueCouloir = empreinteCentree(1, 2);
  assert.deepEqual(poseValide({ empreinte: bloqueCouloir, structure, autresEmpreintes: [], tileSize }),
    { ok: false, raison: 'couloir_bloque' });

  // Pose valide : dans l'intérieur, sans chevauchement, couloir intact.
  const valide = empreinteCentree(4, 1);
  assert.deepEqual(poseValide({ empreinte: valide, structure, autresEmpreintes: [], tileSize }), { ok: true, raison: null });
  console.log('OK poseValide : hors_interieur / chevauchement / couloir_bloque / ok');
}

// --- Partie C : intégration sur le VRAI orchestrateur + les vraies données -

function etat({ moveX = 0, moveY = 0, attack = false, interact = false, skill1 = false, skill3 = false, menu = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: skill1, held: skill1 },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: skill3, held: skill3 },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: menu, held: menu },
  };
}
function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}
function fermerDialogue(orchestrateur, frames) {
  let garde = 0;
  while (orchestrateur.dialogueOuvert() && garde++ < 30) {
    frames.push(etat({ attack: true }));
    orchestrateur.maj(16);
    for (let i = 0; i < Math.ceil(DELAI_ARMEMENT_DIALOGUE_MS / 16) + 2; i++) {
      frames.push(etat());
      orchestrateur.maj(16);
    }
  }
}
// MT_construction-bandeau-placement_2026-09-17 §3 : invariant « construction
// active ⇒ UI ouverte » — vérifié après chaque frame de manipulation du
// fantôme (appelé par pousserAxe/pousserBouton ci-dessous, seuls usages de
// ces deux helpers dans ce fichier).
function verifierInvariantUiOuverte(orchestrateur) {
  if (orchestrateur.constructionActif()) {
    assert.ok(orchestrateur.uiOuverteMaintenant(), 'invariant : construction active doit impliquer UI ouverte');
  }
}
// Un déplacement de grille avance UNE tuile par FRONT MONTANT (§3) : une
// frame poussée puis une frame neutre, jamais une impulsion continue.
function pousserAxe(orchestrateur, frames, { moveX = 0, moveY = 0 } = {}) {
  frames.push(etat({ moveX, moveY }));
  orchestrateur.maj(16);
  verifierInvariantUiOuverte(orchestrateur);
  frames.push(etat());
  orchestrateur.maj(16);
  verifierInvariantUiOuverte(orchestrateur);
}
function pousserBouton(orchestrateur, frames, champ) {
  frames.push(etat({ [champ]: true }));
  orchestrateur.maj(16);
  verifierInvariantUiOuverte(orchestrateur);
  frames.push(etat());
  orchestrateur.maj(16);
  verifierInvariantUiOuverte(orchestrateur);
}

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreursChargement, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// Stub de menu.js — modélise seulement les 3 états observables depuis main.js
// (liste / bandeau / pause), pas la navigation interne réelle d'un écran
// generique (ça, c'est le rôle de ui/menu.js, exercé ailleurs avec un faux
// DOM, ex. test_phase1_sd_menu_reset_invisible). `menu.fermer()` modélise
// "le joueur est ressorti jusqu'au jeu" (skill_3 depuis la liste, puis Fermer
// depuis le menu Pause) — un raccourci volontaire : cette chaîne de retour
// n'est pas ce que ce ticket a changé, main.js#quitterConstructionVersMenuPause/
// reouvrirListeConstruction/ouvrirPlacementConstruction eux, le sont.
function nouvelOrchestrateur(save) {
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  let listeOuverte = false;
  let bandeauVisible = false;
  let pauseOuverte = false;
  let appelsOuvrirPlacement = 0;
  const menu = {
    estOuvert: () => listeOuverte || pauseOuverte,
    traiterInput: () => {},
    ouvrir: () => { pauseOuverte = true; listeOuverte = false; bandeauVisible = false; },
    fermer: () => { pauseOuverte = false; listeOuverte = false; bandeauVisible = false; },
    ouvrirCraft: () => {},
    rafraichirCraft: () => {},
    ouvrirCoffre: () => {},
    rafraichirCoffre: () => {},
    // MT_construction-bandeau-placement_2026-09-17 : les 3 transitions de la
    // machine Construction, exactement le contrat que main.js appelle.
    ouvrirPlacementConstruction: () => {
      appelsOuvrirPlacement += 1;
      listeOuverte = false;
      bandeauVisible = true;
      pauseOuverte = false;
    },
    reouvrirListeConstruction: () => { bandeauVisible = false; listeOuverte = true; pauseOuverte = false; },
    fermerPlacementConstruction: () => { bandeauVisible = false; },
  };
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  return {
    orchestrateur, frames, menu,
    menuEtat: () => ({ listeOuverte, bandeauVisible, pauseOuverte }),
    obtenirAppelsOuvrirPlacement: () => appelsOuvrirPlacement,
  };
}

function saveDansLaMaison() {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  // Tuile intérieure calme (79..92, 51..62), loin du couloir (y=57) et des
  // 3 stations par défaut (table 82,54 / coffre 86,54 / atelier 89,61).
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

// --- C1 : disponibilité — jamais hors de la maison, jamais dans l'embrasure ---
{
  const save = saveDansLaMaison();
  const { orchestrateur } = nouvelOrchestrateur(save);
  assert.equal(orchestrateur.disponibiliteConstruction(), true, 'héros dans la maison : entrée disponible');

  const savePorte = saveDansLaMaison();
  savePorte.hero.x = px(78, 57).x; // embrasure de la porte ouest, sur le pourtour
  savePorte.hero.y = px(78, 57).y;
  const { orchestrateur: orchPorte } = nouvelOrchestrateur(savePorte);
  assert.equal(orchPorte.disponibiliteConstruction(), false, 'dans l\'embrasure (portes exclues) : entrée absente');

  const saveDehors = saveDansLaMaison();
  saveDehors.hero.x = px(6, 58).x; // spawn extérieur, loin de la maison
  saveDehors.hero.y = px(6, 58).y;
  const { orchestrateur: orchDehors } = nouvelOrchestrateur(saveDehors);
  assert.equal(orchDehors.disponibiliteConstruction(), false, 'hors de toute structure : entrée absente');
  console.log('OK disponibiliteConstruction : maison seulement, jamais dans l\'embrasure');
}

// --- C2 : liste des stations placable — jamais le puits ---
{
  const save = saveDansLaMaison();
  const { orchestrateur } = nouvelOrchestrateur(save);
  const entrees = orchestrateur.entreesConstruction();
  assert.equal(entrees.length, 3, 'table, coffre, atelier — jamais le puits');
  const libellePuits = i18n.t('station.puits');
  assert.equal(entrees.some((e) => e.texte === libellePuits), false, 'le puits (non placable) n\'apparaît jamais');
  console.log('OK entreesConstruction : 3 stations placable, puits absent');
}

// --- C3 : grille, rotation, confirmation (A -> retour LISTE), INTERACT à la
// nouvelle position ----------------------------------------------------
{
  const save = saveDansLaMaison();
  const { orchestrateur, frames, menu, menuEtat, obtenirAppelsOuvrirPlacement } = nouvelOrchestrateur(save);
  const entrees = orchestrateur.entreesConstruction();
  const labelAtelier = i18n.t('station.atelier');
  const entreeAtelier = entrees.find((e) => e.texte === labelAtelier);
  assert.ok(entreeAtelier, 'l\'atelier fait partie des entrées');

  entreeAtelier.action();
  assert.equal(orchestrateur.constructionActif(), true, 'le mode Construction démarre');
  assert.deepEqual(
    menuEtat(), { listeOuverte: false, bandeauVisible: true, pauseOuverte: false },
    'transition ATOMIQUE liste -> placement : écran-liste retiré, bandeau levé, jamais le menu Pause'
  );
  assert.equal(obtenirAppelsOuvrirPlacement(), 1);
  assert.ok(orchestrateur.uiOuverteMaintenant(), 'invariant : construction active ⇒ UI ouverte');
  const poseDepart = { ...orchestrateur.obtenirConstruction().pose };
  assert.deepEqual(poseDepart, { x: 89, y: 61, rotation: 0 }, 'position par défaut de puzzles.json au premier réglage');

  // Grille : 2 tuiles à gauche puis 1 tuile vers le haut, une par front montant.
  pousserAxe(orchestrateur, frames, { moveX: -1 });
  pousserAxe(orchestrateur, frames, { moveX: -1 });
  pousserAxe(orchestrateur, frames, { moveY: -1 });
  const poseApresGrille = orchestrateur.obtenirConstruction().pose;
  assert.deepEqual(
    { x: poseApresGrille.x, y: poseApresGrille.y },
    { x: poseDepart.x - 2, y: poseDepart.y - 1 },
    'une tuile par front montant, sur chaque axe indépendamment'
  );

  // Rotation : 4 appuis SKILL_1 = un tour complet, retour à 0.
  for (let i = 0; i < 4; i++) pousserBouton(orchestrateur, frames, 'skill1');
  assert.equal(orchestrateur.obtenirConstruction().pose.rotation, 0, '4 quarts de tour = identité');

  // Position atteinte : (87,60), loin de toute autre station -> pose valide.
  assert.equal(orchestrateur.obtenirConstruction().verdict.ok, true, 'position dégagée : pose valide');

  // Confirmation (ATTACK) : persiste la pose, quitte le PLACEMENT — mais
  // §4 (décision Xav) : retour à la LISTE, jamais au jeu nu ni au menu Pause
  // ("on enchaîne et on range toute la maison sans repasser par MENU").
  frames.push(etat({ attack: true }));
  orchestrateur.maj(16);
  assert.equal(orchestrateur.constructionActif(), false, 'la pose confirmée quitte le placement');
  assert.deepEqual(
    menuEtat(), { listeOuverte: true, bandeauVisible: false, pauseOuverte: false },
    'A confirmé -> retour à la LISTE, jamais au menu Pause'
  );
  assert.deepEqual(save.maison.stations.station_atelier, { x: 87, y: 60, rotation: 0 });

  const scene = orchestrateur.obtenirScene();
  const poseEffective = scene.poseEffectiveInteractif('station_atelier');
  assert.deepEqual(poseEffective, { x: 87, y: 60, rotation: 0 }, 'scene.poseEffectiveInteractif reflète la pose confirmée');
  assert.equal(scene.empreintesSolides.some((e) => e.id === 'station_atelier'
    && Math.abs(e.x - (87.5 * TILE)) < TILE), true, 'empreinte solide recalculée à la nouvelle position');

  // Le joueur ressort ensuite jusqu'au jeu (skill_3 depuis la liste puis
  // Fermer depuis le menu Pause, navigation interne de ui/menu.js — hors
  // périmètre de ce stub, cf. commentaire de nouvelOrchestrateur ci-dessus) :
  // modélisé directement par menu.fermer(), pour vérifier que le gameplay
  // reprend bien (le héros peut à nouveau marcher).
  menu.fermer();
  assert.deepEqual(menuEtat(), { listeOuverte: false, bandeauVisible: false, pauseOuverte: false });

  // INTERACT depuis la nouvelle position atteint bien l'atelier déplacé (et
  // plus son ancien emplacement) — marche d'abord sous la rangée table/coffre
  // (y=54), pour ne jamais les croiser en chemin, puis vers l'atelier.
  function marcherVers(cible, maxFrames) {
    for (let i = 0; i < maxFrames; i++) {
      const hero = orchestrateur.obtenirHero();
      const dx = cible.x - hero.x;
      const dy = cible.y - hero.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 20) break;
      frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
      orchestrateur.maj(16);
    }
  }
  marcherVers(px(85, 59), 300);
  marcherVers(px(87, 60), 300);
  frames.push(etat({ interact: true }));
  orchestrateur.maj(16);
  // Rôle "craft" (station_type_atelier) : ouvre le menu Craft, jamais un
  // dialogue — vérifié indirectement (aucun dialogue bloqué ouvert).
  assert.equal(orchestrateur.dialogueOuvert(), false, 'INTERACT sur l\'atelier déplacé ouvre Craft, pas un dialogue');
  console.log('OK grille / rotation 4 quarts / confirmation / INTERACT à la nouvelle position');
}

// --- Faux DOM minimal pour exercer le VRAI ui/menu.js (pas le stub à 3 états
// ci-dessus, qui modélise le contrat observable par main.js mais jamais le
// contrôleur interne de premier niveau du menu Pause — c'est précisément ce
// que SD_construction-menu-ouvert-placement_2026-09-17.md reprochait : le
// stub ne pouvait pas attraper cette classe de bug). Même esprit et mêmes
// gabarits que test_phase1_sd_menu_reset_invisible_2026-09-15.js — copié ici
// plutôt que partagé, chaque fichier de test restant autonome (convention du
// dépôt, CLAUDE.md#Architecture : « un fichier par contrat/diagnostic »).
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

// Même critère que test_phase1_sd_menu_reset_invisible : `hidden` seul ne
// suffit pas (leçon du diagnostic reset invisible), il faut aussi le style
// calculé.
function estVisibleEffectif(el) {
  return el.hidden === false && el.style.display !== 'none' && el.style.display !== undefined;
}

// --- C3bis : le VRAI menu Pause (contrôleur de premier niveau inclus) doit
// se fermer ENTIÈREMENT à l'entrée en placement — SD_construction-menu-
// ouvert-placement_2026-09-17.md, puis SD_construction-ecrans-orphelins_2026-
// 09-17.md (le correctif initial de cette fiche, `controleur.fermer()` dans
// `ouvrirPlacementConstruction`, cassait le sens RETOUR — voir C3ter plus bas
// et le journal courant). Ce test échoue sans PASSER RÉELLEMENT par l'écran-
// liste Construction (précondition indispensable depuis le contrat unifié de
// `menu.estOuvert()`, carte §1.2 : `conteneur` doit avoir été effectivement
// caché par `actionOuvrirConstruction`, pas seulement "on suppose que
// Construction a été choisie") — un simple `menu.ouvrir()` suivi directement
// de l'action de la station ne suffit plus à lui seul.
{
  const save = saveDansLaMaison();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const document = creerFauxDocument();
  const menu = initialiserMenu({ document, i18n, menus: registre.tous('menus'), exporterSauvegarde: () => {}, importerSauvegarde: () => {} });
  const conteneur = document.body.querySelector('#menu');
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  // specs/08_menus-cartes.md (A4) : la carte Construction s'affiche sur une
  // CONDITION de `menus.json`, évaluée par le registre de flags — plus par une
  // fonction de disponibilité dédiée.
  menu.definirEvaluateurCondition(orchestrateur.evaluerCondition);
  menu.definirEntreesConstruction(orchestrateur.entreesConstruction);

  // MENU (ouvre le menu Pause réel) -> clic RÉEL sur "Construction"
  // (équivalent souris d'ATTACK sur l'entrée focalisée, exerce
  // `actionOuvrirConstruction()` — sans lui, `conteneur` ne serait jamais
  // caché et le test suivant ne prouverait plus rien depuis le contrat
  // unifié) -> A sur "atelier" (choix simulé, même patron que C3 :
  // `entreeAtelier.action()` est exactement l'action que l'écran-liste réel
  // invoquerait).
  menu.ouvrir();
  // La carte `carte_construction` (grille de cartes, specs/08 A4) a remplacé
  // le bouton `#menu-construction` de l'ancienne liste.
  const boutonConstruction = document.body.querySelectorAll('[data-carte]').find((c) => c.dataset.carte === 'carte_construction');
  assert.ok(boutonConstruction, 'dans la Maison, la case contextuelle porte la carte Construction');
  (boutonConstruction._listeners.click || []).forEach((fn) => fn());
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  entreeAtelier.action();

  assert.equal(orchestrateur.constructionActif(), true, 'le mode Construction démarre');
  assert.equal(menu.estOuvert(), false, 'le menu Pause (contrôleur de premier niveau inclus) doit être entièrement fermé à l\'entrée en placement');
  assert.equal(estVisibleEffectif(conteneur), false, 'aucun écran DOM du menu Pause ne doit rester monté pendant le placement');

  const poseDepart = { ...orchestrateur.obtenirConstruction().pose };
  pousserAxe(orchestrateur, frames, { moveX: -1 });
  const poseApres = orchestrateur.obtenirConstruction().pose;
  assert.deepEqual(
    { x: poseApres.x, y: poseApres.y }, { x: poseDepart.x - 1, y: poseDepart.y },
    'le premier MOVE après A doit déjà déplacer le fantôme, pas naviguer un menu Pause fantôme'
  );
  console.log('OK menu Pause réel entièrement fermé à l\'entrée en placement (contrôleur de premier niveau inclus)');
}

// --- C4 : refus (chevauchement), dialogue localisé, annulation (skill_3 -> LISTE, sans persister) ---
{
  const save = saveDansLaMaison();
  const { orchestrateur, frames, menuEtat } = nouvelOrchestrateur(save);
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  entreeAtelier.action();

  // Déplace l'atelier (89,61) jusque sur la table (82,54) : 7 tuiles à
  // gauche, 7 tuiles vers le haut -> chevauchement.
  for (let i = 0; i < 7; i++) pousserAxe(orchestrateur, frames, { moveX: -1 });
  for (let i = 0; i < 7; i++) pousserAxe(orchestrateur, frames, { moveY: -1 });
  assert.deepEqual(
    { x: orchestrateur.obtenirConstruction().pose.x, y: orchestrateur.obtenirConstruction().pose.y },
    { x: 82, y: 54 }
  );
  assert.equal(orchestrateur.obtenirConstruction().verdict.ok, false);
  assert.equal(orchestrateur.obtenirConstruction().verdict.raison, 'chevauchement');

  frames.push(etat({ attack: true }));
  orchestrateur.maj(16);
  assert.equal(orchestrateur.constructionActif(), true, 'une pose invalide ne se confirme jamais');
  assert.equal(orchestrateur.dialogueOuvert(), true, 'message localisé avec la raison');
  const ligne = orchestrateur.dialogueLigneCourante();
  assert.equal(ligne.locuteur, i18n.t('companion.follet_eau'));
  fermerDialogue(orchestrateur, frames);
  assert.equal(orchestrateur.constructionActif(), true, 'le mode reprend après le dialogue, rien n\'a changé');

  // Annulation : skill_3 (§4 : "B pendant le placement -> retour à la liste").
  frames.push(etat({ skill3: true }));
  orchestrateur.maj(16);
  assert.equal(orchestrateur.constructionActif(), false);
  assert.equal(save.maison.stations.station_atelier, undefined, 'annuler = retour sans changement, jamais écrit');
  assert.deepEqual(
    menuEtat(), { listeOuverte: true, bandeauVisible: false, pauseOuverte: false },
    'B -> retour à la LISTE (pas au jeu nu, pas au menu Pause)'
  );
  console.log('OK refus chevauchement + dialogue localisé + annulation -> liste, sans effet');
}

// --- C5 : débordement (hors_interieur) et couloir bloqué -------------------
{
  const save = saveDansLaMaison();
  const { orchestrateur, frames, menuEtat } = nouvelOrchestrateur(save);
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  entreeAtelier.action();

  // structure_maison.rect = {x:78,y:50,w:16,h:14} ; interieur = {x:79,...} —
  // pousser jusqu'au mur ouest (x=78, hors de l'intérieur) : refusé, jamais coupé.
  for (let i = 0; i < 20; i++) pousserAxe(orchestrateur, frames, { moveX: -1 });
  assert.equal(orchestrateur.obtenirConstruction().pose.x, 78, 'bornée au rectangle de la structure (garde-fou), pas plus loin');
  assert.equal(orchestrateur.obtenirConstruction().verdict.ok, false);
  assert.equal(orchestrateur.obtenirConstruction().verdict.raison, 'hors_interieur');
  frames.push(etat({ skill3: true }));
  orchestrateur.maj(16);
  assert.deepEqual(menuEtat(), { listeOuverte: true, bandeauVisible: false, pauseOuverte: false });
}
{
  const save = saveDansLaMaison();
  const { orchestrateur, frames } = nouvelOrchestrateur(save);
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  entreeAtelier.action();

  // (89,61) -> (80,57) : son empreinte (46x25 px à l'échelle 2,1) déborde
  // jusque sur (79,57), la seule tuile intérieure reliée à la porte ouest,
  // tout en restant elle-même entièrement dans l'intérieur.
  for (let i = 0; i < 9; i++) pousserAxe(orchestrateur, frames, { moveX: -1 });
  for (let i = 0; i < 4; i++) pousserAxe(orchestrateur, frames, { moveY: -1 });
  assert.deepEqual(
    { x: orchestrateur.obtenirConstruction().pose.x, y: orchestrateur.obtenirConstruction().pose.y },
    { x: 80, y: 57 }
  );
  assert.equal(orchestrateur.obtenirConstruction().verdict.raison, 'couloir_bloque', 'bloque l\'unique accès à la porte ouest');
  console.log('OK débordement (hors_interieur borné) et couloir bloqué (accès porte ouest)');
}

// --- C5bis : MENU pendant le placement (§4) — annule, revient PROPREMENT au
// menu Pause, jamais superposé, aucun écran orphelin ------------------------
{
  const save = saveDansLaMaison();
  const { orchestrateur, frames, menuEtat } = nouvelOrchestrateur(save);
  const entreeAtelier = orchestrateur.entreesConstruction().find((e) => e.texte === i18n.t('station.atelier'));
  entreeAtelier.action();
  pousserAxe(orchestrateur, frames, { moveX: -1 }); // un déplacement quelconque, pour prouver qu'il est bien annulé
  assert.equal(orchestrateur.constructionActif(), true);

  frames.push(etat({ menu: true }));
  orchestrateur.maj(16);
  assert.equal(orchestrateur.constructionActif(), false, 'MENU annule la pose en cours');
  assert.equal(save.maison.stations.station_atelier, undefined, 'rien de persisté');
  assert.deepEqual(
    menuEtat(), { listeOuverte: false, bandeauVisible: false, pauseOuverte: true },
    'MENU -> menu Pause proprement (jamais la liste ET jamais le bandeau en même temps, aucun écran orphelin)'
  );

  // Rejouer MENU une fois dans le jeu réel (hors placement) reste sans danger
  // (aucune régression du chemin existant) : ici, `menu.estOuvert()` est déjà
  // vrai (pauseOuverte), donc le garde-fou `!menu.estOuvert()` l'empêche de
  // rouvrir par erreur.
  frames.push(etat({ menu: true }));
  orchestrateur.maj(16);
  assert.deepEqual(menuEtat(), { listeOuverte: false, bandeauVisible: false, pauseOuverte: true });
  console.log('OK MENU pendant le placement : annule + retour propre au menu Pause, aucun écran orphelin');
}

// --- C6 : pose invalide au chargement (sauvegarde altérée) -----------------
{
  const save = saveDansLaMaison();
  // Deux stations poussées sur la même tuile par une sauvegarde altérée —
  // scene.interactifs traite station_table AVANT station_coffre : la
  // première prend la tuile, la seconde retombe sur sa position par défaut.
  save.maison.stations = {
    station_table: { x: 85, y: 55, rotation: 0 },
    station_coffre: { x: 85, y: 55, rotation: 0 },
  };
  const { orchestrateur } = nouvelOrchestrateur(save);
  const scene = orchestrateur.obtenirScene();
  assert.deepEqual(scene.poseEffectiveInteractif('station_table'), { x: 85, y: 55, rotation: 0 }, 'la première pose est acceptée');
  assert.deepEqual(scene.poseEffectiveInteractif('station_coffre'), { x: 86, y: 54, rotation: 0 }, 'la seconde retombe sur sa position par défaut');
  console.log('OK pose invalide au chargement : la seconde station revient à sa position par défaut, loguée');
}

// --- C7 : test data-driven (§7) — une 5ᵉ station placable, sans code -------
{
  const donneesEtendues = structuredClone(donnees);
  donneesEtendues.stations.push({
    id: 'station_type_test_etabli', label_key: 'station.cuisine', role: 'craft', placable: true,
  });
  donneesEtendues.puzzles.push({
    id: 'station_test_etabli', type: 'station', position: { x: 84, y: 59 },
    station_type: 'station_type_test_etabli', render: { visuel: 'visuel_table' }, echelle: 2.1, solide: true,
  });
  donneesEtendues.scenes = donneesEtendues.scenes.map((s) => (
    s.id === 'scene_maison_exterieur' ? { ...s, interactifs: [...s.interactifs, 'station_test_etabli'] } : s
  ));
  assert.deepEqual(validerCatalogues(donneesEtendues), [], 'catalogue étendu toujours valide sans toucher au code');

  const registreEtendu = construireRegistre(donneesEtendues);
  const save = saveDansLaMaison();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const menu = { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {} };
  const frames = [];
  const input = creerInputScripte(frames);
  const orchestrateur = creerOrchestrateurGrotte({
    registre: registreEtendu, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const entrees = orchestrateur.entreesConstruction();
  assert.equal(entrees.length, 4, 'la 5ᵉ station (4ᵉ placable) apparaît dans la liste sans changement de code');
  console.log('OK test data-driven : nouvelle station placable ajoutée en JSON seul');
}

console.log('OK test_construction');

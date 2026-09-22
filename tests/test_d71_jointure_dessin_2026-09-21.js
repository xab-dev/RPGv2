// `D-71` — la jointure « texte flottant → rendu », et l'angle mort qu'elle a
// révélé.
//
// CE QUI S'EST PASSÉ. `D-58` (T1) a ajouté une clé `style` aux textes
// flottants et l'a rendue obligatoire au rendu. Mais `main.js#dessiner()`
// reconstruisait l'objet envoyé au rendu champ par champ : la clé est tombée
// dans l'intervalle, et le jeu se figeait au PREMIER ramassage. Les deux
// moitiés étaient testées — le module émettait bien `style`, le catalogue le
// déclarait bien —, **le passage de l'une à l'autre ne l'était pas**, parce
// qu'il vivait dans `dessiner()`, que le headless n'exécute jamais.
//
// Ce fichier ferme cet angle mort pour de bon, en deux temps :
//   1. la composition est devenue une fonction PURE : on la teste directement,
//      et on exige qu'elle TRANSMETTE (aucune clé perdue, quelle qu'elle soit) ;
//   2. un tour de dessin complet, avec un faux contexte 2D, APRÈS chaque
//      action type — ramasser, frapper, ouvrir un menu. C'est la seule façon
//      de voir tomber un branchement de rendu sans lancer un navigateur.
//
// Et le filet de dernier recours : `creerBoucle` ne meurt plus d'une exception.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import {
  creerOrchestrateurGrotte, composerTextesFlottants,
  erreursStylesTexteFlottant, STYLES_TEXTE_FLOTTANT,
} from '../src/main.js';
import { creerBoucle } from '../src/render.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

// --- 1. La composition TRANSMET : aucune clé ne peut tomber -------------
{
  const traduire = (cle, params) => `[${cle}:${params.n}]`;
  // On y met une clé que personne n'utilise encore : c'est justement le cas
  // qui a cassé. Si quelqu'un revient un jour à une recopie champ par champ,
  // c'est cette ligne-ci qui tombera, et pas le jeu de Xav.
  const entree = {
    x: 1, y: 2, alpha: 0.5, cle: 'item_bois', quantite: 3,
    format: 'monde.gain_item', libelle: null, style: 'gain',
    cle_inventee_demain: 'ne doit pas disparaître',
  };
  const [sortie] = composerTextesFlottants([entree], traduire);

  for (const champ of Object.keys(entree)) {
    assert.deepEqual(sortie[champ], entree[champ], `la clé "${champ}" doit être transmise telle quelle`);
  }
  assert.equal(sortie.texte, '[monde.gain_item:3]', 'le texte résolu est le seul AJOUT');

  // Et l'entrée n'est pas mutée : le module garde sa réserve, on ne lui
  // écrit pas dedans depuis le rendu.
  assert.equal(entree.texte, undefined, 'la réserve du module ne doit pas être modifiée');

  // Le reliquat `item` de `D-58` est parti : le gabarit ne porte plus que
  // `{n}`, passer autre chose mentirait sur le contrat.
  const parametresVus = [];
  composerTextesFlottants([entree], (cle, params) => { parametresVus.push(params); return ''; });
  assert.deepEqual(Object.keys(parametresVus[0]), ['n'], 'un seul paramètre : la quantité');
  console.log('OK la composition transmet tout, et n\'ajoute que le texte');
}

// --- 2. Les styles émis par le code sont contrôlés AU DÉMARRAGE ---------
// C'est le garde-fou de `D-58` déplacé : il vivait dans la boucle de dessin,
// sous forme d'exception, et le schéma ne pouvait pas le voir (il vérifie la
// forme de ce qui est déclaré, jamais que ce que le code émet existe).
{
  assert.deepEqual(erreursStylesTexteFlottant(donnees.effets), [], 'le catalogue réel doit être complet');

  for (const style of STYLES_TEXTE_FLOTTANT) {
    const ampute = donnees.effets.map((e) => {
      if (e.id !== 'effet_texte_gain') return e;
      const styles = { ...e.styles };
      delete styles[style];
      return { ...e, styles };
    });
    // Témoin : `validerCatalogues` laisse passer — c'est bien pour ça que ce
    // contrôle-ci doit exister.
    assert.deepEqual(validerCatalogues({ ...donnees, effets: ampute }, SCHEMAS), []);
    const messages = erreursStylesTexteFlottant(ampute);
    assert.equal(messages.length, 1, `retirer le style "${style}" doit être refusé au démarrage`);
    assert.ok(messages[0].includes(style));
  }
  console.log(`OK les ${STYLES_TEXTE_FLOTTANT.length} styles émis par le code sont exigés au démarrage`);
}

// --- 3. Un tour de dessin COMPLET après chaque action type --------------
// Le faux contexte 2D ne dessine rien : il encaisse tout. Ce qu'on éprouve
// n'est pas le pixel — le projet interdit de le tester — c'est que le chemin
// de rendu ne LÈVE PAS. C'est exactement ce que la suite ne voyait pas.
function faireCanvas() {
  const canvas = { width: 480, height: 270, style: {} };
  const ctx = new Proxy({}, {
    get(_, p) {
      if (p === 'canvas') return canvas;
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      // `D-132` : un motif réel, pour que le chemin du toit à bardeaux soit
      // PARCOURU — un `undefined` le ferait retomber sur l'aplat sans rien éprouver.
      if (p === 'createPattern') return () => ({});
      return () => {};
    },
    set: () => true,
  });
  canvas.getContext = () => ctx;
  return { canvas, ctx };
}

function monterPartie() {
  const i18n = creerI18n(dictionnaires, 'fr');
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.hero.niveau = 5;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    flag_ambiance_vent_cendre: true, flag_premiere_faim: true,
  };
  let menuOuvert = false;
  const menu = {
    estOuvert: () => menuOuvert, traiterInput() {}, ouvrir() { menuOuvert = true; },
    ouvrirCraft() {}, rafraichirCraft() {}, ouvrirCoffre() {}, rafraichirCoffre() {}, rafraichirStats() {},
  };
  const frames = [];
  const logique = faireCanvas();
  const visible = faireCanvas();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: {
      maj: () => frames[frames.length - 1],
      tactileActif: () => false,
      peripheriqueActif: () => 'manette',
    },
    ctxLogique: logique.ctx, ctxVisible: visible.ctx, canvasLogique: logique.canvas,
  });
  const etat = (touches = {}) => ({
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: false, held: false }, menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
    ...Object.fromEntries(Object.entries(touches).map(([k, v]) => [k, { pressed: v, held: v }])),
  });
  const tour = (touches) => { frames.push(etat(touches)); orch.maj(16); orch.dessiner(); };
  return {
    orch, save, tour, ouvrirMenu: () => { menuOuvert = true; }, fermerMenu: () => { menuOuvert = false; },
  };
}

// Le DOM minimal dont `render.js` a besoin pour ses calques hors écran.
const documentAvant = global.document;
const windowAvant = global.window;
global.document = { createElement: () => faireCanvas().canvas };
global.window = { devicePixelRatio: 1, addEventListener() {}, location: { search: '' } };

try {
  // a) au repos — le témoin : si celui-ci tombe, le reste ne veut rien dire.
  {
    const p = monterPartie();
    p.tour();
    console.log('OK dessin au repos');
  }

  // b) RAMASSER — l'action qui figeait le jeu.
  {
    const p = monterPartie();
    p.tour();
    const scene = p.orch.obtenirScene();
    const hero = p.orch.obtenirHero();
    const [itemId, positions] = Object.entries(p.save.monde.items_sol[scene.id])
      .find(([, liste]) => liste.length > 0);
    hero.x = positions[0].x;
    hero.y = positions[0].y;
    p.tour({ interact: true });
    assert.equal(p.save.inventaire.items[itemId], 1, 'le ramassage doit avoir eu lieu');
    // Les deux textes sont bien en vol pendant qu'on dessine : sans eux, ce
    // tour de dessin ne prouverait rien.
    const styles = p.orch.obtenirTextesFlottants().map((t) => t.style).sort();
    assert.deepEqual(styles, ['gain', 'xp'], 'le gain ET son XP doivent être en vol');
    p.tour();
    console.log('OK dessin après un ramassage (le crash de `D-58`)');
  }

  // c) FRAPPER — l'anneau d'attaque, le flash, la barre de PV du monstre.
  {
    const p = monterPartie();
    p.tour();
    p.tour({ attack: true });
    p.tour();
    console.log('OK dessin après une attaque');
  }

  // d) OUVRIR UN MENU — le gameplay est gelé, mais le monde se dessine encore.
  {
    const p = monterPartie();
    p.tour();
    p.ouvrirMenu();
    p.tour();
    p.fermerMenu();
    p.tour();
    console.log('OK dessin menu ouvert, puis refermé');
  }

  // e) MOURIR — le clignement du respawn (`D-65`), dessiné en tout dernier.
  {
    const p = monterPartie();
    p.tour();
    p.orch.obtenirHero().pv = 0;
    p.tour();
    assert.notEqual(p.orch.obtenirClignementRespawn(), null, 'le clignement doit être en cours');
    p.tour();
    console.log('OK dessin pendant le clignement de retour de mort');
  }
} finally {
  global.document = documentAvant;
  global.window = windowAvant;
}

// --- 4. La boucle survit à une exception --------------------------------
// Le filet de dernier recours. Deux fois en cinq jours, une faute minuscule a
// tué la boucle et donc la partie (freeze musique du 17/09, style manquant du
// 21/09). Une frame perdue reste une frame perdue — pas une partie perdue.
{
  const planifiees = [];
  const rafAvant = global.requestAnimationFrame;
  global.requestAnimationFrame = (fn) => { planifiees.push(fn); return planifiees.length; };
  const erreursAvant = console.error;
  const journal = [];
  console.error = (...args) => journal.push(args.map(String).join(' '));

  try {
    let tours = 0;
    const boucle = creerBoucle({
      maj: () => { tours += 1; },
      dessiner: () => { throw new Error('panne simulée de dessin'); },
    });
    boucle.demarrer();
    // Cinq frames, toutes en échec : la boucle doit les enchaîner quand même.
    for (let i = 0; i < 5; i += 1) planifiees.pop()(i * 16);

    assert.equal(tours, 5, 'la boucle doit avoir continué à tourner (`maj` appelé 5 fois)');
    assert.equal(boucle.framesEnEchec(), 5, 'et avoir compté les 5 frames perdues');
    assert.ok(planifiees.length > 0, 'une frame suivante doit toujours être demandée');
    assert.ok(
      journal.some((l) => l.includes('la boucle CONTINUE')),
      'la panne doit être JOURNALISÉE, pas masquée',
    );
    // Une panne répétée ne doit pas noyer la console : le premier message est
    // celui qu'on cherche à lire.
    assert.equal(journal.length, 1, 'une panne identique ne se répète pas à chaque frame');

    // Et quand la panne cesse, la boucle repart normalement.
    let dessins = 0;
    const saine = creerBoucle({ maj: () => {}, dessiner: () => { dessins += 1; } });
    saine.demarrer();
    planifiees.pop()(0);
    assert.equal(dessins, 1);
    assert.equal(saine.framesEnEchec(), 0);
    console.log('OK une exception coûte une frame, jamais la partie — et elle est journalisée');
  } finally {
    global.requestAnimationFrame = rafAvant;
    console.error = erreursAvant;
  }
}

console.log('OK test_d71_jointure_dessin');

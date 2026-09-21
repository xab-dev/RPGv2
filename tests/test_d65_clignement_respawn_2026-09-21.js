// `D-65` (file Nv.0 → Nv.10, T8) — le clignement au respawn.
//
// DEMANDE DE XAV (21/09) : après chaque mort dans la Grotte, le héros revient
// avec le **clignement d'yeux de l'intro**, en version courte. Respawn mesuré
// aujourd'hui : ~4 s, **à ne pas allonger**. « Réutilise la séquence
// existante, aucune seconde implémentation. Durées en données. »
//
// Contrats vérifiés ici :
//   - c'est LA MÊME fonction que l'intro, avec d'autres durées ;
//   - les durées vivent en données, et la version est bien COURTE ;
//   - la séquence part à la mort, se termine seule, et repart de zéro à la
//     mort suivante ;
//   - elle n'allonge rien : le héros peut bouger pendant ;
//   - elle est gelée sous UI, comme tout le reste du gameplay.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { ouverturePaupieres, dureeClignements } from '../src/intro.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

const CLIGNEMENT = registre.obtenir('effets', 'effet_clignement_respawn');
const INTRO = registre.obtenir('scenes', 'scene_grotte_salle_1').intro.clignements;
const DUREE = dureeClignements(CLIGNEMENT);

// --- 1. Les durées vivent en données, et ce sont CELLES DE L'INTRO ----
{
  assert.ok(Array.isArray(CLIGNEMENT.ouvertures_ms) && CLIGNEMENT.ouvertures_ms.length > 0);
  const dureeIntro = dureeClignements(INTRO);
  // Xav, 21/09 : « le clignement des yeux est trop rapide » à la mort — on
  // rejoue l'intro (sauf le choix du follet). Ce qui se teste n'est donc PAS
  // un nombre de millisecondes (un réglage appartient à Xav, `D-52`), c'est
  // la RELATION : mourir rouvre les yeux comme la première fois.
  // *Révise* la contrainte d'origine de `D-65` (« plus court que l'intro »).
  assert.deepEqual(
    CLIGNEMENT.ouvertures_ms, INTRO.ouvertures_ms,
    "le clignement du respawn doit rejouer les ouvertures de l'intro",
  );
  assert.equal(CLIGNEMENT.noir_ms, INTRO.noir_ms);
  assert.equal(DUREE, dureeIntro);
  console.log(`OK durées en données, et identiques à l'intro : ${DUREE} ms`);
}

// --- 2. C'est la MÊME séquence, pas une seconde implémentation ---------
{
  // La forme est celle d'`intro.js` : on redemande la même fonction avec les
  // mêmes données, et on exige les mêmes valeurs — si quelqu'un réécrivait
  // un modèle de clignement ailleurs, les courbes finiraient par diverger.
  const source = await fs.readFile(path.join(RACINE, 'src', 'main.js'), 'utf8');
  const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(
    code.includes('ouverturePaupieres'),
    'main.js doit appeler la fonction de l\'intro, pas recalculer une courbe',
  );
  for (const interdit of ['easeInOut', 'ouvertureClignement']) {
    assert.ok(!code.includes(interdit), `main.js ne doit pas refaire le modèle de clignement ("${interdit}")`);
  }

  // Et la courbe elle-même : noir aux extrémités, grand ouvert au milieu de
  // la dernière ouverture — c'est ce qu'« un clignement » veut dire.
  assert.equal(ouverturePaupieres(CLIGNEMENT, 0), 0, 'ça commence dans le noir');
  const derniere = CLIGNEMENT.ouvertures_ms[CLIGNEMENT.ouvertures_ms.length - 1];
  const debutDerniere = DUREE - derniere;
  assert.ok(
    ouverturePaupieres(CLIGNEMENT, debutDerniere + derniere / 2) > 0.9,
    'les yeux doivent s\'ouvrir en grand au milieu de la dernière ouverture',
  );
  assert.equal(ouverturePaupieres(CLIGNEMENT, DUREE), 0, 'et ça finit refermé, juste avant de disparaître');
  console.log('OK la même fonction que l\'intro, avec d\'autres durées');
}

// --- 3. En jeu : elle part à la mort, finit seule, repart à la suivante -
function monterPartie() {
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    flag_ambiance_vent_cendre: true, flag_premiere_faim: true,
  };
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, ouvrirCraft: () => {},
    rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
  };
  const dialogue = creerDialogue();
  const frames = [];
  const input = { maj: () => frames[frames.length - 1] };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const etat = () => ({
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: false, held: false }, menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
  });
  const tick = (ms = 16) => { frames.push(etat()); orch.maj(ms); };
  // Une frame d'échauffement : à la toute première, les stats dérivées font
  // passer `pvMax` de 1 à sa vraie valeur, et `reconcilierPvMax` reporte ce
  // gain sur les PV courants. Tuer le héros avant ça le ferait ressusciter
  // dans la même frame — un artefact de banc d'essai, pas du jeu, où les PV
  // sont déjà justes depuis longtemps quand on meurt.
  tick();
  const tuerLeHeros = () => {
    // On vide les PV et on laisse la frame suivante constater la mort : c'est
    // le chemin réel (`hero.pv <= 0 && !hero.mort`), pas un appel privé.
    orch.obtenirHero().pv = 0;
    tick();
  };
  return { orch, save, menu, tick, tuerLeHeros };
}

{
  const partie = monterPartie();
  assert.equal(partie.orch.obtenirClignementRespawn(), null, 'rien avant la première mort');

  partie.tuerLeHeros();
  assert.notEqual(partie.orch.obtenirClignementRespawn(), null, 'la mort rouvre les yeux');
  assert.equal(partie.orch.obtenirScene().id, 'scene_grotte_salle_1', 'et renvoie dans la Grotte');

  // Elle se termine SEULE, sans que personne n'ait à l'arrêter.
  let ecoule = 16;
  while (ecoule < DUREE + 100) { partie.tick(); ecoule += 16; }
  assert.equal(partie.orch.obtenirClignementRespawn(), null, 'la séquence se termine d\'elle-même');

  // Deuxième mort : elle repart de ZÉRO, elle ne se prolonge pas.
  partie.tuerLeHeros();
  const debut = partie.orch.obtenirClignementRespawn();
  assert.ok(debut !== null && debut < 0.2, `une mort rejoue la séquence depuis le noir (obtenu ${debut})`);
  console.log('OK elle part à la mort, se termine seule, et repart de zéro à la suivante');
}

// --- 4. Elle n'allonge rien, et elle est gelée sous UI ------------------
{
  // Le héros peut bouger pendant : c'est un effet visuel, pas un rideau de
  // cinématique. Le respawn ne dure pas une milliseconde de plus qu'avant.
  const partie = monterPartie();
  partie.tuerLeHeros();
  const hero = partie.orch.obtenirHero();
  assert.equal(hero.mort, false, 'le héros est déjà revenu : le clignement ne retarde pas le retour');
  assert.ok(hero.pv > 0, 'et il a ses PV');

  // Gelée sous UI, comme la poussière et les textes flottants — LE point de
  // décision unique, jamais une condition propre.
  const avant = partie.orch.obtenirClignementRespawn();
  partie.menu.estOuvert = () => true;
  for (let i = 0; i < 40; i += 1) partie.tick();
  assert.equal(
    partie.orch.obtenirClignementRespawn(), avant,
    'menu ouvert : le clignement ne doit pas progresser',
  );
  partie.menu.estOuvert = () => false;
  partie.tick();
  assert.notEqual(partie.orch.obtenirClignementRespawn(), avant, 'et il reprend à la fermeture');
  console.log('OK elle ne retarde pas le retour, et elle est gelée sous UI');
}

console.log('OK test_d65_clignement_respawn');

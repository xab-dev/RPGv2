// `D-61` (file Nv.0 → Nv.10, T3, `Q-34`) — une ligne d'ambiance par palier.
//
// Le constat de Xav : un joueur qui atteint le niveau 5 sans le savoir voit
// des monstres apparaître sans comprendre ce qui a changé. Le jeu n'a ni
// journal de quêtes ni objectif affiché, et n'en aura pas : la réponse est
// la narration diffuse. Motif générique en données — `palier atteint +
// condition → une ligne de texte, une seule fois`.
//
// Contrats vérifiés ici :
//   - le choix est PUR et ne connaît ni niveau, ni nuit, ni cendre ;
//   - une ligne ne se déclenche qu'une fois, même interrompue ;
//   - le catalogue accueille une ligne de plus SANS CODE (on en ajoute une
//     factice, de toutes pièces, et elle marche) ;
//   - en jeu : au niveau 4, rien ; au niveau 5, à la nuit, la ligne tombe ;
//   - son texte existe en FR et en EN.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { ambianceADeclencher } from '../src/ambiances.js';
import { PHASES_CYCLE } from '../src/daynight.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_ID = 'scene_maison_exterieur';

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

// Début de la nuit, en temps de jeu actif — même calcul que les tests du
// Chaos : la somme des phases qui la précèdent.
const DEBUT_NUIT_MS = PHASES_CYCLE.slice(0, PHASES_CYCLE.findIndex((p) => p.nom === 'nuit'))
  .reduce((somme, p) => somme + p.duree_ms, 0);
const DUREE_NUIT_MS = PHASES_CYCLE.find((p) => p.nom === 'nuit').duree_ms;

// --- 1. Le choix est pur, et il ne sait rien du monde --------------------
{
  const source = await (await import('node:fs/promises')).readFile(
    path.join(RACINE, 'src', 'ambiances.js'), 'utf8',
  );
  const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const interdit of ['niveau', 'nuit', 'cendre', 'i18n', 'flag_', 'scene_']) {
    assert.ok(
      !code.includes(interdit),
      `ambiances.js ne doit jamais connaître "${interdit}" : c'est un motif, pas un script`,
    );
  }
  console.log('OK le module ne connaît ni niveau, ni nuit, ni cendre');
}

// --- 2. Le catalogue accueille une ligne de plus, sans code -------------
// Le test d'architecture du projet : « ajouter une entrée doit être possible
// en ajoutant une entrée JSON, sans toucher une ligne de code de système ».
// On en fabrique une de toutes pièces, avec une condition, une scène et une
// phase que le catalogue réel n'utilise pas.
{
  const factice = {
    id: 'amb_factice',
    condition: { valeur: 'niveau', min: 12 },
    phases: ['jour'],
    scenes: ['scene_grotte_salle_1'],
    dialogue: 'dlg_grotte_choix_follet',
    flag: 'flag_grotte_sequence',
  };
  const vus = new Set();
  const contexte = (niveau, sceneId, phase) => ({
    sceneId, phase, aDejaVu: (f) => vus.has(f),
    evaluerCondition: (c) => niveau >= c.min,
  });

  assert.equal(ambianceADeclencher([factice], contexte(11, 'scene_grotte_salle_1', 'jour')), null, 'niveau trop bas');
  assert.equal(ambianceADeclencher([factice], contexte(12, SCENE_ID, 'jour')), null, 'mauvaise scène');
  assert.equal(ambianceADeclencher([factice], contexte(12, 'scene_grotte_salle_1', 'nuit')), null, 'mauvaise phase');
  assert.equal(
    ambianceADeclencher([factice], contexte(12, 'scene_grotte_salle_1', 'jour')), factice,
    'tout est réuni : la ligne doit tomber',
  );
  vus.add(factice.flag);
  assert.equal(
    ambianceADeclencher([factice], contexte(12, 'scene_grotte_salle_1', 'jour')), null,
    'déjà vue : plus jamais',
  );

  // Champs absents = « partout, à toute heure, sans condition ».
  const partout = { id: 'amb_partout', dialogue: 'dlg_grotte_choix_follet', flag: 'flag_levier_salle1' };
  assert.equal(
    ambianceADeclencher([partout], contexte(0, 'n_importe_quelle_scene', 'crepuscule')), partout,
    'sans scenes/phases/condition, une ligne se déclenche partout',
  );

  // Deux prêtes en même temps : la PREMIÈRE du catalogue seulement — deux
  // dialogues ouverts dans la même frame se recouvriraient.
  assert.equal(ambianceADeclencher([partout, factice], contexte(12, 'scene_grotte_salle_1', 'jour')), partout);
  console.log('OK une ligne de plus est une entrée JSON de plus, et une seule parle à la fois');
}

// --- 3. En jeu : le seuil, et une seule fois ---------------------------
function bot({ niveau, heure, flagsSupplementaires = {} }) {
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = SCENE_ID;
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.hero.niveau = niveau;
  save.monde.heure = heure;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, ...flagsSupplementaires };
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
  // La survie est remise à plein à chaque frame : ce test regarde une ligne
  // d'ambiance, pas la faim — sans quoi `dlg_premiere_faim` s'ouvrirait
  // d'abord et gèlerait tout.
  const jouer = (ms) => {
    for (let t = 0; t < ms; t += 16) {
      for (const jauge of Object.keys(save.survie)) save.survie[jauge] = 1;
      const hero = orch.obtenirHero();
      hero.pv = hero.pvMax;
      frames.push(etat());
      orch.maj(16);
      if (dialogue.estOuvert()) return true;
    }
    return false;
  };
  return { orch, save, dialogue, jouer };
}

{
  // Niveau 4 : la nuit entière passe, rien ne se dit.
  const bas = bot({ niveau: 4, heure: DEBUT_NUIT_MS });
  assert.equal(bas.jouer(DUREE_NUIT_MS), false, 'au niveau 4, aucune ligne ne doit tomber');
  assert.ok(!bas.save.flags.flag_ambiance_vent_cendre, 'et son flag ne doit pas être posé');
  console.log('OK niveau 4 : la nuit entière reste muette');
}
{
  // Niveau 5, tombée de nuit : la ligne tombe.
  const haut = bot({ niveau: 5, heure: DEBUT_NUIT_MS });
  assert.equal(haut.jouer(DUREE_NUIT_MS), true, 'au niveau 5, la nuit doit dire quelque chose');
  assert.equal(haut.save.flags.flag_ambiance_vent_cendre, true, 'le flag est posé AVANT le dialogue');
  console.log('OK niveau 5 : la première nuit dit ce qui a changé');
}
{
  // Déjà vue : plus jamais, même une nuit entière plus tard.
  const revu = bot({ niveau: 5, heure: DEBUT_NUIT_MS, flagsSupplementaires: { flag_ambiance_vent_cendre: true } });
  assert.equal(revu.jouer(DUREE_NUIT_MS), false, 'une ligne déjà vue ne revient jamais');
  console.log('OK une ligne d\'ambiance ne se dit qu\'une fois');
}

// --- 4. Le texte existe dans les deux langues --------------------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  for (const ambiance of registre.tous('ambiances')) {
    const dlg = registre.obtenir('dialogues', ambiance.dialogue);
    for (const langue of i18n.languesDisponibles()) {
      i18n.definirLangue(langue);
      // Spec 11 : une ligne d'ambiance peut être devenue un choix (la maison) —
      // ses nœuds et ses options portent des textes au même titre.
      const porteurs = [
        ...(dlg.lignes || []),
        ...Object.values(dlg.noeuds || {}).flatMap((n) => [n, ...(n.options || [])]),
      ];
      for (const ligne of porteurs) {
        assert.ok(
          !i18n.t(ligne.text_key).startsWith('[['),
          `${ambiance.id} : ${ligne.text_key} manque en ${langue}`,
        );
      }
      assert.ok(
        !i18n.t(registre.obtenir('flags', ambiance.flag).label_key).startsWith('[['),
        `${ambiance.id} : le libellé de son flag manque en ${langue}`,
      );
    }
  }
  console.log('OK chaque ligne d\'ambiance existe en FR et en EN');
}

console.log('OK test_d61_ambiance_paliers');

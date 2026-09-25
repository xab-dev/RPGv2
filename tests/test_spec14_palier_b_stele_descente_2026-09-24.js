// Contrat de `specs/14_annexe-1.md`, palier B : la stèle s'éveille, et la
// descente commence.
//
// 1. `flags.js` : une condition compare une valeur NOMMÉE par `egal` (`Q-137`,
//    `a_portee`) ; `retirer` enlève des flags posés et la sauvegarde suit ;
//    `?flags=` tient des flags pour vrais sans les poser ni les sauvegarder.
// 2. Le démarrage refuse ce qui casserait la descente : une condition `egal`
//    mal formée, un déchiffrement dont le flag n'est pas celui que lit
//    `lisible_si`, une stèle qui descend vers une scène sans descente, un flag
//    de descente cible d'un unlock.
// 3. `descente.js` : l'Annexe est la scène d'arrivée et tout ce qu'on atteint
//    d'elle par ses portails sans sortir des scènes qui déclarent une
//    descente — une Annexe 2 à quatre salles se déclare en DONNÉES seules.
// 4. `indices.js` : le déchiffrement révèle un signe à la fois, dans l'ordre
//    de lecture, blancs gardés ; B l'accélère.
// 5. Les trois salles du vrai catalogue : on entre par le sud, on sort par le
//    nord ; chaque arrivée est une case libre, jamais sur un portail ; chaque
//    porte s'ouvre sur un flag de la descente ; l'escalier ramène au pied de
//    la stèle bleue ; la sortie débouche à côté de la stèle rouge, HORS de sa
//    clairière, sur une case d'où l'on rejoint le chemin.
// 6. Le vrai orchestrateur : au Nv.15, au pied de la stèle, le follet parle ;
//    le carnet ouvert là déchiffre l'indice (pas ailleurs, pas avant) ; la vue
//    rapprochée montre la gravure en clair et propose Descendre ; Descendre
//    remet la descente à zéro et mène en salle 1 ; B ferme sans descendre ;
//    l'escalier remonte.
// 7. Aucun id de l'Annexe dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que l'animation se lit, que la gravure en
// clair tient dans la pierre, que les salles ressemblent à la Grotte. Ça se
// voit dans Chrome (`V-150`).

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, valeursParesseuses } from '../src/main.js';
import { creerRegistreFlags, lireFlagsForces } from '../src/flags.js';
import { scenesDeLaDescente, flagsDeLaDescente, descenteDisponible } from '../src/descente.js';
import {
  textesEnDechiffrement, creerDechiffrement, avancerDechiffrement, accelererDechiffrement, progressionDechiffrement,
  brouillerTexte,
} from '../src/indices.js';
import { chargerScene } from '../src/scene.js';
import { calculerTuilesAtteignables } from '../src/ground_items.js';
import { zoneGravureStele } from '../src/ui/ecran_stele.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// La stèle qui descend, lue dans les données — le test ne connaît pas son id.
const STELE = donnees.puzzles.find((p) => p.type === 'stele' && p.descente);
assert.ok(STELE, 'une stèle du catalogue déclare une descente');
const AUTRES_STELES = donnees.puzzles.filter((p) => p.type === 'stele' && !p.descente);
const INDICE = donnees.indices.find((i) => i.id === STELE.indice);
const SCENE_SURFACE = donnees.scenes.find((s) => (s.interactifs || []).includes(STELE.id)).id;
const SALLES = scenesDeLaDescente(donnees.scenes, STELE.descente.scene);
const FLAGS_DESCENTE = flagsDeLaDescente(donnees.scenes, STELE.descente.scene);
const scene = (id) => donnees.scenes.find((s) => s.id === id);

// --- 1. flags.js -----------------------------------------------------------------
{
  const faux = { tous: (c) => (c === 'flags' ? [{ id: 'a' }, { id: 'b' }, { id: 'c' }] : []) };
  let valeur = 'pierre';
  const retraits = [];
  const unlocks = [];
  const f = creerRegistreFlags(faux, {
    initial: ['a', 'b'], forces: ['c'], valeurs: () => ({ a_portee: valeur }),
    onRetrait: (id) => retraits.push(id), onUnlock: (id) => unlocks.push(id),
  });
  assert.equal(f.evaluate({ valeur: 'a_portee', egal: 'pierre' }), true);
  assert.equal(f.evaluate({ valeur: 'a_portee', egal: 'autre' }), false);
  valeur = null;
  assert.equal(f.evaluate({ valeur: 'a_portee', egal: 'pierre' }), false, 'null = rien à portée, une valeur connue');
  assert.throws(() => f.evaluate({ valeur: 'inconnue', egal: 'x' }), /inconnue/, 'une valeur absente explose en dev');
  const prod = creerRegistreFlags(faux, { mode: 'prod', valeurs: () => ({}) });
  const warn = console.warn;
  console.warn = () => {};
  assert.equal(prod.evaluate({ valeur: 'inconnue', egal: 'x' }), false, 'et vaut faux en prod');
  console.warn = warn;

  assert.equal(f.has('c'), true, 'un flag forcé est tenu pour vrai');
  f.retirer(['a', 'c', 'inexistant']);
  assert.equal(f.has('a'), false);
  assert.equal(f.has('b'), true);
  assert.equal(f.has('c'), true, 'la remise à zéro n\'éteint pas un flag forcé');
  assert.deepEqual(retraits, ['a'], 'seul un flag POSÉ se retire, et la sauvegarde en est prévenue');
  assert.deepEqual(unlocks, [], 'un flag forcé ne passe jamais par onUnlock (jamais sauvegardé)');

  assert.deepEqual(lireFlagsForces('', registre), { ids: [], avertissement: null });
  const lu = lireFlagsForces(`?flags=${FLAGS_DESCENTE[0]}, flag_qui_n_existe_pas`, registre);
  assert.deepEqual(lu.ids, [FLAGS_DESCENTE[0]]);
  assert.match(lu.avertissement, /flag_qui_n_existe_pas/, 'un id inconnu est écarté ET dit');
  // Les valeurs nommées sont paresseuses : une condition n'en calcule qu'une
  // (mesuré au banc : les calculer toutes à chaque frame coûtait jusqu'à 40 %
  // de `maj()` la nuit).
  const appels = [];
  const v = valeursParesseuses({ a: () => { appels.push('a'); return 1; }, b: () => { appels.push('b'); return 2; } }, { c: 3 });
  const tenue = creerRegistreFlags(faux, { valeurs: () => v }).evaluate({ valeur: 'a', min: 1 });
  assert.equal(tenue, true);
  assert.deepEqual(appels, ['a'], 'seule la valeur lue est calculée');
  assert.deepEqual(Object.keys(v).sort(), ['a', 'b', 'c'], 'et toutes restent nommées (contrôle de câblage)');
  console.log('OK flags.js : `egal`, `retirer`, flags forcés par `?flags=` ; valeurs paresseuses');
}

// --- 2. Le démarrage refuse ce qui casserait la descente ----------------------------
{
  const erreursApres = (abimer) => {
    const copie = structuredClone(donnees);
    abimer(copie);
    return validerCatalogues(copie);
  };
  const refuse = (abimer, motif) => {
    const e = erreursApres(abimer);
    assert.ok(e.some((m) => motif.test(m)), `attendu ${motif}, reçu ${JSON.stringify(e)}`);
  };
  const indiceDe = (c) => c.indices.find((i) => i.id === INDICE.id);
  const steleDe = (c) => c.puzzles.find((p) => p.id === STELE.id);
  refuse((c) => { indiceDe(c).dechiffrement.condition.all.push({ valeur: 'a_portee', egal: 'x', min: 1 }); }, /egal OU min\/max/);
  refuse((c) => { indiceDe(c).dechiffrement.condition.all.push({ valeur: 'a_portee', egal: 3 }); }, /egal doit être un nom/);
  refuse((c) => { indiceDe(c).lisible_si = { valeur: 'niveau', min: 15 }; }, /lisible_si doit être son flag/);
  refuse((c) => { indiceDe(c).dechiffrement.flag = 'flag_absent'; }, /dechiffrement\.flag "flag_absent"/);
  refuse((c) => { steleDe(c).descente.scene = SCENE_SURFACE; }, /ne déclare pas de descente/);
  refuse((c) => { steleDe(c).descente.flag_requis = 'flag_absent'; }, /flag_requis "flag_absent"/);
  refuse((c) => { c.scenes.find((s) => s.id === SALLES[0]).descente.flags.push('flag_absent'); }, /descente\.flags : "flag_absent"/);
  refuse((c) => { c.unlocks.push({ id: 'unlock_x', condition: 'flag_follet_choisi', target: FLAGS_DESCENTE[0] }); }, /cible d'un unlock/);
  console.log('OK catalogue : une descente mal déclarée tombe au démarrage, avec son chemin');
}

// --- 3. descente.js ------------------------------------------------------------------
{
  assert.equal(SALLES[0], STELE.descente.scene, 'la descente commence là où la stèle mène');
  assert.equal(SALLES.length, 3, 'trois salles, du sud au nord');
  assert.ok(!SALLES.includes(SCENE_SURFACE), 'la surface n\'est pas une salle de la descente, même si des portails y mènent');
  const tous = SALLES.flatMap((id) => scene(id).descente.flags);
  assert.deepEqual([...FLAGS_DESCENTE].sort(), [...new Set(tous)].sort());

  // Règle directrice : une Annexe 2 à quatre salles, en données seules.
  const salle = (id, vers, flags) => ({ id, descente: { flags }, portails: vers.map((cible) => ({ cible })) });
  const annexe2 = [
    { id: 'dehors', portails: [{ cible: 'b1' }] },
    salle('b1', ['b2', 'dehors'], ['f1']), salle('b2', ['b1', 'b3'], ['f2', 'f1']),
    salle('b3', ['b4'], []), salle('b4', ['dehors'], ['f4']),
  ];
  assert.deepEqual(scenesDeLaDescente(annexe2, 'b1'), ['b1', 'b2', 'b3', 'b4']);
  assert.deepEqual(flagsDeLaDescente(annexe2, 'b1').sort(), ['f1', 'f2', 'f4']);

  const pose = new Set();
  assert.equal(descenteDisponible(STELE, (id) => pose.has(id)), false, 'pas de Descendre avant le déchiffrement');
  pose.add(STELE.descente.flag_requis);
  assert.equal(descenteDisponible(STELE, (id) => pose.has(id)), true);
  for (const autre of AUTRES_STELES) assert.equal(descenteDisponible(autre, () => true), false, `${autre.id} : aucune action`);
  console.log('OK descente.js : trois salles, leurs flags ; une Annexe 2 en données seules');
}

// --- 4. Le déchiffrement -----------------------------------------------------------
{
  const alphabet = donnees.indices.find((i) => i.id === 'indices_config').hieroglyphes;
  const clairs = ['Le titre', 'Une ligne, puis une autre.'];
  const textes = clairs.map((clair, i) => ({ clair, brouille: brouillerTexte(clair, `t#${i}`, alphabet) }));
  const signes = (t) => Array.from(t).filter((c) => !/\s/.test(c)).length;
  const total = clairs.reduce((n, t) => n + signes(t), 0);
  assert.deepEqual(textesEnDechiffrement(textes, 0), textes.map((t) => t.brouille), 'au départ, tout est brouillé');
  assert.deepEqual(textesEnDechiffrement(textes, 1), clairs, 'à la fin, tout est clair');
  let precedent = -1;
  for (let k = 0; k <= total; k += 1) {
    const mele = textesEnDechiffrement(textes, k / total);
    mele.forEach((m, i) => assert.equal(Array.from(m).length, Array.from(clairs[i]).length, 'la longueur ne bouge pas'));
    const clairsDejaLa = mele.reduce((n, m, i) => n + Array.from(m).filter((c, j) => !/\s/.test(c) && c === Array.from(clairs[i])[j]
      && c !== Array.from(textes[i].brouille)[j]).length, 0);
    assert.ok(clairsDejaLa >= precedent, 'un signe révélé ne se rebrouille jamais');
    precedent = clairsDejaLa;
  }
  // L'ordre de lecture : le titre entier avant la première lettre des lignes.
  const auTitre = textesEnDechiffrement(textes, signes(clairs[0]) / total);
  assert.equal(auTitre[0], clairs[0]);
  assert.equal(auTitre[1], textes[1].brouille);

  const reglage = { dechiffrement_ms: 1000, acceleration: 4 };
  let d = creerDechiffrement('x');
  d = avancerDechiffrement(d, 100, reglage);
  assert.equal(progressionDechiffrement(d, reglage), 0.1);
  d = avancerDechiffrement(accelererDechiffrement(d), 100, reglage);
  assert.equal(progressionDechiffrement(d, reglage), 0.5, 'B accélère, et l\'accélération tient jusqu\'à la fin');
  console.log('OK indices.js : un signe à la fois, dans l\'ordre de lecture ; B accélère');
}

// --- 5. Les trois salles --------------------------------------------------------------
{
  const libre = (sc, x, y) => { const t = sc.tuileA(x, y); return !!t && !t.solid; };
  for (const id of SALLES) {
    const def = scene(id);
    const sc = chargerScene(registre, id, {}, []);
    const portailA = (x, y) => (def.portails || []).some((p) => x >= p.zone.x && x < p.zone.x + p.zone.w && y >= p.zone.y && y < p.zone.y + p.zone.h);
    assert.ok(libre(sc, def.spawn.x, def.spawn.y) && !portailA(def.spawn.x, def.spawn.y), `${id} : le point d'arrivée est libre, hors portail`);
    // Portes : chacune s'ouvre sur un flag de la descente, et le portail qui la
    // traverse attend le même flag.
    for (const porte of def.portes || []) {
      assert.ok(FLAGS_DESCENTE.includes(porte.flag), `${id} : la porte s'ouvre sur un flag de la descente`);
      const portail = def.portails.find((p) => p.zone.x === porte.position.x && p.zone.y === porte.position.y);
      assert.equal(portail && portail.condition, porte.flag, `${id} : le portail de la porte attend son flag`);
    }
    // Vers le nord pour avancer (la suivante, ou dehors), vers le sud pour reculer.
    const suivante = SALLES[SALLES.indexOf(id) + 1];
    const avancer = def.portails.find((p) => p.cible === (suivante || SCENE_SURFACE) && p.condition);
    assert.ok(avancer && avancer.zone.y === 0, `${id} : on en sort par le nord`);
    const reculer = def.portails.find((p) => p !== avancer);
    assert.ok(reculer && reculer.zone.y + reculer.zone.h === def.height && reculer.condition === null,
      `${id} : un passage toujours ouvert au sud`);
    // Chaque arrivée dans la scène cible est libre, hors portail, et l'on en
    // rejoint la sortie par où l'on est venu sans traverser un mur.
    for (const p of def.portails) {
      const cible = scene(p.cible);
      const sc2 = chargerScene(registre, p.cible, {}, []);
      assert.ok(libre(sc2, p.spawn.x, p.spawn.y), `${id} → ${p.cible} : arrivée (${p.spawn.x},${p.spawn.y}) libre`);
      const dansPortail = (cible.portails || []).some((q) => p.spawn.x >= q.zone.x && p.spawn.x < q.zone.x + q.zone.w
        && p.spawn.y >= q.zone.y && p.spawn.y < q.zone.y + q.zone.h);
      assert.ok(!dansPortail, `${id} → ${p.cible} : l'arrivée n'est pas sur un portail (aller-retour sans fin)`);
    }
  }

  // L'escalier ramène au pied de la stèle bleue, dans sa clairière.
  const surface = chargerScene(registre, SCENE_SURFACE, {}, []);
  const t = surface.tileSize;
  const escalier = scene(SALLES[0]).portails.find((p) => p.cible === SCENE_SURFACE);
  assert.ok(!surface.estSolideAuPoint((escalier.spawn.x + 0.5) * t, (escalier.spawn.y + 0.5) * t, () => false),
    'l\'escalier ne pose pas le héros dans la pierre');
  assert.ok(Math.max(Math.abs(escalier.spawn.x - STELE.position.x), Math.abs(escalier.spawn.y - STELE.position.y)) <= 2,
    'l\'escalier remonte au pied de la stèle');

  // La sortie : à côté de la stèle rouge, hors de sa clairière, et reliée au chemin.
  const sortie = scene(SALLES.at(-1)).portails.find((p) => p.cible === SCENE_SURFACE);
  const rouge = AUTRES_STELES.find((s) => (scene(SCENE_SURFACE).interactifs || []).includes(s.id)
    && Math.abs(s.position.x - sortie.spawn.x) + Math.abs(s.position.y - sortie.spawn.y) <= 6);
  assert.ok(rouge, 'la sortie débouche près d\'une autre stèle de la surface');
  const clairiere = scene(SCENE_SURFACE).zones.find((z) => z.type === 'clairiere'
    && rouge.position.x >= z.rect.x && rouge.position.x < z.rect.x + z.rect.w
    && rouge.position.y >= z.rect.y && rouge.position.y < z.rect.y + z.rect.h).rect;
  const { x, y } = sortie.spawn;
  const dedans = x >= clairiere.x && x < clairiere.x + clairiere.w && y >= clairiere.y && y < clairiere.y + clairiere.h;
  assert.ok(!dedans, 'l\'arrivée est HORS de la clairière (la pierre reste cachée, `V-123`)');
  const collee = x >= clairiere.x - 1 && x <= clairiere.x + clairiere.w && y >= clairiere.y - 1 && y <= clairiere.y + clairiere.h;
  assert.ok(collee, 'et collée à elle');
  assert.ok(libre(surface, x, y) && !surface.estSolideAuPoint((x + 0.5) * t, (y + 0.5) * t, () => false), 'sur une case libre');
  const atteignables = calculerTuilesAtteignables(surface, x, y);
  const chemin = [...atteignables].some((cle) => { const [cx, cy] = cle.split(',').map(Number); return surface.tuileA(cx, cy).id === 'tile_chemin'; });
  assert.ok(chemin, 'd\'où l\'on rejoint le chemin à pied (jamais enfermé dans la forêt)');
  console.log(`OK les ${SALLES.length} salles : sud → nord, arrivées libres, portes sur les flags de la descente ; escalier et sortie à leur place`);
}

// --- 6. Le vrai orchestrateur ---------------------------------------------------------
const neutre = { pressed: false, held: false };
const appui = { pressed: true, held: true };
function etat(verbes = {}) {
  const e = {
    move: { x: 0, y: 0 }, attack: neutre, skill_1: neutre, skill_2: neutre, skill_3: neutre,
    consume: neutre, interact: neutre, menu: neutre, target_next: neutre,
  };
  for (const v of Object.keys(verbes)) e[v] = verbes[v] ? appui : neutre;
  return e;
}
function banc({ niveau = 15, pres = true, flagsSave = {}, flagsForces = [], menuOuvert = false } = {}) {
  const save = saveNeuve();
  save.hero.scene = SCENE_SURFACE;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  // Un vrai joueur du Nv.15 a déjà vu la porte du chapitre 1 (spec 11) : sans
  // son flag, ce dialogue-là parlerait avant le follet de la pierre.
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, ...flagsSave };
  const t = registre.obtenir('scenes', SCENE_SURFACE).tile_size;
  save.hero.x = (STELE.position.x + 0.5) * t;
  save.hero.y = (STELE.position.y + (pres ? 1.1 : 12)) * t;
  let prochain = etat();
  let contacts = [];
  const vusParLeMenu = [];
  const menu = {
    ouvert: menuOuvert, rafraichissements: 0,
    estOuvert() { return this.ouvert; },
    indicesAffiches() { return this.ouvert; },
    rafraichirIndices() { this.rafraichissements += 1; },
    traiterInput: (e) => vusParLeMenu.push(e),
    ouvrir() {}, fermer() { this.ouvert = false; },
  };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'manette' },
    lireContactsTactiles: () => { const c = contacts; contacts = []; return c; },
    flagsForces,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  const toucher = (p) => { contacts = [p]; };
  return { save, orch, frame, menu, vusParLeMenu, toucher };
}
const aPortee = { valeur: 'a_portee', egal: STELE.id };

// 6a. `a_portee` et le follet qui suggère.
{
  const loin = banc({ pres: false });
  assert.equal(loin.orch.evaluerCondition(aPortee), false, 'loin de la pierre, elle n\'est pas à portée');
  const sous = banc({ niveau: 14 });
  assert.equal(sous.orch.evaluerCondition(aPortee), true, 'au pied de la pierre, elle est à portée');
  for (let i = 0; i < 30; i += 1) sous.frame();
  assert.equal(sous.save.flags.flag_ambiance_stele_carnet, undefined, 'sous le Nv.15, le follet se tait');

  const b = banc();
  for (let i = 0; i < 30 && !b.orch.dialogueOuvert(); i += 1) b.frame();
  assert.ok(b.orch.dialogueOuvert(), 'au Nv.15, au pied de la pierre, le follet parle');
  const ambiance = donnees.ambiances.find((a) => a.dialogue && JSON.stringify(a.condition).includes('a_portee'));
  assert.equal(b.save.flags[ambiance.flag], true, 'une seule fois');
  console.log('OK a_portee : la même portée qu\'INTERACT ; au Nv.15, au pied de la pierre, le follet suggère le carnet');
}

// 6b. Le carnet : il se déchiffre là, et seulement là.
{
  const flag = INDICE.dechiffrement.flag;
  const sous = banc({ niveau: 14 });
  sous.orch.ouvrirCarnet();
  assert.equal(sous.save.flags[flag], undefined, 'au Nv.14, le carnet ouvert au pied de la pierre ne déchiffre rien');
  const loin = banc({ pres: false });
  loin.orch.ouvrirCarnet();
  assert.equal(loin.save.flags[flag], undefined, 'au Nv.15, loin de la pierre, rien non plus');
  const avant = loin.orch.obtenirEntreesIndices().find((e) => e.id === INDICE.id);
  assert.equal(avant.lisible, false, 'le Nv.15 ne suffit plus à lire l\'indice (changement assumé, §4.1)');

  const b = banc({ menuOuvert: true });
  b.orch.ouvrirCarnet();
  assert.equal(b.save.flags[flag], true, 'au pied de la pierre, au Nv.15 : déchiffré, et retenu');
  const debut = b.orch.obtenirEntreesIndices().find((e) => e.id === INDICE.id);
  assert.equal(debut.chasseFixe, true, 'l\'animation commence en hiéroglyphes');
  assert.notEqual(debut.titre, i18n.t(INDICE.cle_titre));
  const reglage = donnees.indices.find((i) => i.id === 'indices_config');
  let ms = 0;
  while (b.orch.obtenirDechiffrement() && ms < reglage.dechiffrement_ms * 2) { b.frame(etat(), 16); ms += 16; }
  assert.equal(b.orch.obtenirDechiffrement(), null, 'l\'animation se termine seule');
  assert.ok(ms >= reglage.dechiffrement_ms - 16, 'et prend sa durée');
  assert.ok(b.menu.rafraichissements > 5, 'l\'écran est relu pendant l\'animation, signe après signe');
  const fin = b.orch.obtenirEntreesIndices().find((e) => e.id === INDICE.id);
  assert.equal(fin.lisible, true);
  assert.deepEqual(fin.lignes, INDICE.lignes.map((c) => i18n.t(c)));
  b.orch.ouvrirCarnet();
  assert.equal(b.orch.obtenirDechiffrement(), null, 'l\'animation ne se joue qu\'à la première lecture');

  // B et MENU accélèrent, et le menu ne les voit pas.
  const c = banc({ menuOuvert: true });
  c.orch.ouvrirCarnet();
  let msB = 0;
  while (c.orch.obtenirDechiffrement() && msB < reglage.dechiffrement_ms) {
    c.frame(etat({ skill_3: msB === 0, menu: msB === 16 }), 16);
    msB += 16;
  }
  assert.equal(c.orch.obtenirDechiffrement(), null);
  assert.ok(msB < reglage.dechiffrement_ms / 2, `B accélère jusqu'à la fin (${msB} ms)`);
  assert.equal(c.menu.ouvert, true, 'MENU n\'a pas fermé le carnet');
  assert.ok(c.vusParLeMenu.every((e) => !e.skill_3.pressed && !e.menu.pressed), 'le menu n\'a vu ni B ni MENU');
  console.log('OK carnet : déchiffré au pied de la pierre, au Nv.15, une fois ; B et MENU accélèrent sans fermer');
}

// 6c. La vue rapprochée, Descendre, et la remise à zéro.
{
  const flag = INDICE.dechiffrement.flag;
  const avantDechiffrement = banc();
  avantDechiffrement.frame(etat({ interact: true }));
  assert.ok(avantDechiffrement.orch.obtenirVueStele());
  assert.deepEqual(avantDechiffrement.orch.contenuVueStele().actions, [], 'pas de Descendre avant le déchiffrement');

  // Une descente précédente a laissé ses passages ouverts ; un flag de la
  // surface doit, lui, rester.
  const flagsSave = { [flag]: true, flag_ambiance_stele_carnet: true };
  for (const f of FLAGS_DESCENTE) flagsSave[f] = true;
  const b = banc({ flagsSave });
  b.frame(etat({ interact: true }));
  const contenu = b.orch.contenuVueStele();
  assert.deepEqual(contenu.lignes, INDICE.lignes.map((c) => i18n.t(c)), 'la gravure se lit en clair');
  assert.equal(contenu.actions.length, 2, 'Descendre et Fermer');
  assert.equal(contenu.actions[0].glyphe, i18n.t('glyphe.manette.attack'), 'A à la manette');
  b.frame(etat({ attack: true }), 1);
  assert.equal(b.orch.obtenirScene().id, SCENE_SURFACE, 'A avant l\'armement ne descend pas');
  b.frame(etat(), STELE.armement_ms);
  b.frame(etat({ attack: true }));
  assert.notEqual(b.orch.obtenirVueStele().fermetureMs, null, 'Descendre ferme la vue en fondu');
  assert.equal(b.orch.obtenirScene().id, SCENE_SURFACE, 'et le jeu attend la fin du fondu');
  b.frame(etat(), 1000);
  assert.equal(b.orch.obtenirVueStele(), null);
  assert.equal(b.orch.obtenirScene().id, STELE.descente.scene, 'la descente mène à la première salle');
  const spawn = scene(STELE.descente.scene).spawn;
  const t = scene(STELE.descente.scene).tile_size;
  assert.equal(Math.floor(b.orch.obtenirHero().x / t), spawn.x);
  assert.equal(Math.floor(b.orch.obtenirHero().y / t), spawn.y);
  for (const f of FLAGS_DESCENTE) {
    assert.equal(b.save.flags[f], undefined, `${f} : remis à zéro, dans la sauvegarde aussi`);
    assert.equal(b.orch.evaluerCondition(f), false);
  }
  assert.equal(b.save.flags[flag], true, 'ce qui est persistant le reste');

  // L'escalier remonte au pied de la stèle.
  const escalier = scene(STELE.descente.scene).portails.find((p) => p.cible === SCENE_SURFACE);
  b.orch.obtenirHero().x = (escalier.zone.x + 0.5) * t;
  b.orch.obtenirHero().y = (escalier.zone.y + 0.5) * t;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, SCENE_SURFACE, 'l\'escalier remonte');
  assert.equal(b.orch.evaluerCondition(aPortee), true, 'au pied de la pierre');

  // B ferme sans descendre ; au doigt, la gravure descend, ailleurs on ferme.
  const c = banc({ flagsSave: { [flag]: true } });
  c.frame(etat({ interact: true }));
  c.frame(etat(), STELE.armement_ms);
  c.frame(etat({ skill_3: true }));
  c.frame(etat(), 1000);
  assert.equal(c.orch.obtenirVueStele(), null);
  assert.equal(c.orch.obtenirScene().id, SCENE_SURFACE, 'B ferme sans descendre');
  c.frame(etat({ interact: true }));
  c.frame(etat(), STELE.armement_ms);
  c.toucher({ x: 2, y: 2 });
  c.frame();
  c.frame(etat(), 1000);
  assert.equal(c.orch.obtenirScene().id, SCENE_SURFACE, 'un toucher hors de la gravure ferme');
  c.frame(etat({ interact: true }));
  c.frame(etat(), STELE.armement_ms);
  const zone = zoneGravureStele();
  c.toucher({ x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 });
  c.frame();
  c.frame(etat(), 1000);
  assert.equal(c.orch.obtenirScene().id, STELE.descente.scene, 'un toucher sur la gravure descend');
  console.log('OK stèle : gravure en clair, Descendre après l\'armement puis le fondu, descente remise à zéro ; B ferme ; l\'escalier remonte');
}

// 6d. `?flags=` : les portes forcées survivent à la remise à zéro, sans être sauvegardées.
{
  const flag = INDICE.dechiffrement.flag;
  const b = banc({ flagsSave: { [flag]: true }, flagsForces: FLAGS_DESCENTE });
  b.frame(etat({ interact: true }));
  b.frame(etat(), STELE.armement_ms);
  b.frame(etat({ attack: true }));
  b.frame(etat(), 1000);
  assert.equal(b.orch.obtenirScene().id, STELE.descente.scene);
  for (const f of FLAGS_DESCENTE) {
    assert.equal(b.orch.evaluerCondition(f), true, `${f} forcé : tenu malgré la remise à zéro`);
    assert.equal(b.save.flags[f], undefined, `${f} forcé : jamais sauvegardé`);
  }
  // Portes ouvertes : on traverse les trois salles jusqu'à la sortie.
  let ici = STELE.descente.scene;
  for (let n = 0; n < SALLES.length; n += 1) {
    const avancer = scene(ici).portails.find((p) => p.condition);
    const t = scene(ici).tile_size;
    b.orch.obtenirHero().x = (avancer.zone.x + 0.5) * t;
    b.orch.obtenirHero().y = (avancer.zone.y + 0.5) * t;
    b.frame();
    // Palier H (`Q-153`) : la sortie passe par un fondu, la scène change au plus noir.
    if (avancer.fondu_ms) b.frame(etat(), avancer.fondu_ms);
    assert.equal(b.orch.obtenirScene().id, avancer.cible, `${ici} → ${avancer.cible}`);
    ici = avancer.cible;
  }
  assert.equal(ici, SCENE_SURFACE, 'la dernière porte ressort à la surface');
  console.log('OK ?flags= : portes ouvertes toute la session, sans sauvegarde ; les trois salles se traversent');
}

// --- 7. Aucun id de l'Annexe dans le code système -----------------------------------
{
  const ids = [STELE.id, INDICE.id, INDICE.dechiffrement.flag, ...SALLES, ...FLAGS_DESCENTE,
    ...donnees.ambiances.filter((a) => JSON.stringify(a.condition || '').includes('a_portee')).map((a) => a.flag)];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id de l\'Annexe (stèle, indice, salles, flags) dans le code système');
}

console.log('OK test_spec14_palier_b_stele_descente');

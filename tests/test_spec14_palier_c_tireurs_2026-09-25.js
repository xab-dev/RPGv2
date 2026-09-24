// Contrat de `specs/14_annexe-1.md`, palier C : les tireurs.
//
// 1. `projectiles.js` : un tir part vers sa cible, vole en ligne droite,
//    s'arrête sur un mur, touche une cible d'un AUTRE camp (disque contre
//    disque) une seule fois, s'éteint au bout de sa course ; un tir rapide ne
//    traverse ni un mur fin ni le héros ; la réserve pleine refuse un tir.
// 2. `comportement_monstres.js#deciderTireur` : il recule sous `recul_tuiles`,
//    s'approche hors de portée, reste entre les deux, et ne tire qu'à portée,
//    cadence écoulée.
// 3. `spawns.js#sceneNettoyee` et `descente.js#interactifsDeLaDescente`.
// 4. Le démarrage refuse ce qui casserait un tireur, une salle nettoyée ou un
//    interactif qui apparaît ; un second tireur et une Annexe 2 nettoyable se
//    déclarent en DONNÉES seules.
// 5. Le vrai orchestrateur, en salle 1 : les cracheurs tirent, un crachat
//    touche le héros ; le dernier tombé pose le flag de la salle ; le levier
//    apparaît alors (pas avant), s'actionne et ouvre le passage ; revenir dans
//    la salle ne fait pas renaître les cracheurs ; une descente neuve remet
//    les cracheurs, le levier et le passage à zéro.
// 6. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que les tirs se lisent dans le noir, que
// l'esquive est possible au doigt, que la cadence est « faible » et les dégâts
// « modérés ». Ça se joue dans Chrome (`V-151`).

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
import { creerOrchestrateurGrotte } from '../src/main.js';
import {
  creerProjectiles, tirer, avancerProjectiles, viderProjectiles, projectilesEnVol, CAMP_MONSTRES, CAMP_HEROS,
} from '../src/projectiles.js';
import { deciderTireur } from '../src/comportement_monstres.js';
import { sceneNettoyee } from '../src/spawns.js';
import { scenesDeLaDescente, interactifsDeLaDescente } from '../src/descente.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// Tout est lu dans les données : le test ne connaît aucun id du palier.
const STELE = donnees.puzzles.find((p) => p.type === 'stele' && p.descente);
const SALLE_1 = donnees.scenes.find((s) => s.id === STELE.descente.scene);
const SCENE_SURFACE = donnees.scenes.find((s) => (s.interactifs || []).includes(STELE.id)).id;
const TIREUR = donnees.enemies.find((e) => e.comportement === 'distance');
const FLAG_NETTOYEE = SALLE_1.nettoyage.flag;
const LEVIER = donnees.puzzles.find((p) => SALLE_1.interactifs.includes(p.id) && p.visible_si !== undefined);
const T = SALLE_1.tile_size;
const scene = (id) => donnees.scenes.find((s) => s.id === id);

// --- 1. projectiles.js -------------------------------------------------------------
{
  const aucunMur = () => false;
  const tir = { x: 0, y: 0, versX: 100, versY: 0, vitesse: 100, rayon: 3, degats: 5, camp: CAMP_MONSTRES, visuel: 'v', courseMaxPx: 1000 };

  const e = creerProjectiles(4);
  assert.ok(tirer(e, tir));
  avancerProjectiles(e, 500, { estSolide: aucunMur });
  const [p] = projectilesEnVol(e);
  assert.ok(Math.abs(p.x - 50) < 1e-9 && Math.abs(p.y) < 1e-9, 'ligne droite, à sa vitesse');

  // Un mur l'arrête.
  const m = creerProjectiles(4);
  tirer(m, tir);
  avancerProjectiles(m, 1000, { estSolide: (x) => x >= 40 });
  assert.equal(projectilesEnVol(m).length, 0, 'arrêté par le mur');

  // Il touche un autre camp, une fois ; il traverse le sien.
  const h = creerProjectiles(4);
  tirer(h, tir);
  const cibles = [
    { id: 'allie', x: 30, y: 0, rayon: 8, camp: CAMP_MONSTRES },
    { id: 'heros', x: 60, y: 0, rayon: 8, camp: CAMP_HEROS },
  ];
  const touches = avancerProjectiles(h, 1000, { estSolide: aucunMur, cibles });
  assert.deepEqual(touches, [{ cibleId: 'heros', degats: 5 }], 'le héros, pas le monstre de son camp');
  assert.equal(projectilesEnVol(h).length, 0, 'un tir ne touche qu\'une fois');

  // Une frame longue ne fait traverser ni un mur fin, ni le héros.
  const rapide = { ...tir, vitesse: 2000 };
  const f = creerProjectiles(4);
  tirer(f, rapide);
  avancerProjectiles(f, 100, { estSolide: (x) => x >= 100 && x < 102 });
  assert.equal(projectilesEnVol(f).length, 0, 'un mur de 2 px arrête un tir à 2 000 px/s sur 100 ms');
  const g = creerProjectiles(4);
  tirer(g, rapide);
  assert.equal(avancerProjectiles(g, 100, { estSolide: aucunMur, cibles: [{ id: 'heros', x: 120, y: 0, rayon: 2, camp: CAMP_HEROS }] }).length, 1);

  // La course s'épuise.
  const c = creerProjectiles(4);
  tirer(c, { ...tir, courseMaxPx: 30 });
  avancerProjectiles(c, 1000, { estSolide: aucunMur });
  assert.equal(projectilesEnVol(c).length, 0, 'éteint au bout de sa course');

  // La réserve pleine refuse ; une visée sans direction ne part pas.
  const r = creerProjectiles(2);
  assert.ok(tirer(r, tir) && tirer(r, tir));
  assert.equal(tirer(r, tir), false, 'réserve pleine');
  assert.equal(r.emplacements.length, 2, 'aucune allocation en jeu');
  viderProjectiles(r);
  assert.equal(projectilesEnVol(r).length, 0);
  assert.equal(tirer(r, { ...tir, versX: 0 }), false, 'aucune direction : pas de tir');
  console.log('OK projectiles.js : ligne droite, mur, autre camp une fois, frame longue, course, réserve');
}

// --- 2. deciderTireur ----------------------------------------------------------------
{
  const a = TIREUR.attaque_distance;
  const decider = (distanceTuiles, cooldownTirMs = 0) => deciderTireur({
    monstre: { x: 0, y: 0 }, hero: { x: distanceTuiles * T, y: 0 }, attaque: a, tileSize: T, cooldownTirMs,
  });
  const proche = decider(a.recul_tuiles / 2);
  assert.ok(proche.but && proche.but.x < 0, 'trop près : il recule, à l\'opposé du héros');
  assert.equal(proche.tirer, true, 'et tire quand même, à portée');
  const loin = decider(a.portee_tuiles + 2);
  assert.ok(loin.but && loin.but.x > 0 && loin.tirer === false, 'hors de portée : il s\'approche sans tirer');
  const bien = decider((a.recul_tuiles + a.portee_tuiles) / 2);
  assert.equal(bien.but, null, 'entre les deux : il reste');
  assert.equal(bien.tirer, true);
  assert.equal(decider((a.recul_tuiles + a.portee_tuiles) / 2, 1).tirer, false, 'cadence pas écoulée : pas de tir');
  console.log('OK deciderTireur : recule, s\'approche, reste ; tire à portée, cadence écoulée');
}

// --- 3. Salle nettoyée, interactifs de la descente ------------------------------------
{
  assert.equal(sceneNettoyee([]), false, 'rien n\'est tombé');
  assert.equal(sceneNettoyee([{ mort: true }, { mort: false }]), false);
  assert.equal(sceneNettoyee([{ mort: true }, { mort: true }]), true);
  assert.equal(sceneNettoyee([{ mort: true }, { mort: false, spawnId: 'spawn_chaos' }]), true, 'le Chaos ne compte pas');
  assert.equal(sceneNettoyee([{ mort: false, spawnId: 'spawn_chaos' }]), false, 'une salle sans monstre à elle');

  const ids = interactifsDeLaDescente(donnees.scenes, SALLE_1.id);
  assert.ok(ids.includes(LEVIER.id), 'le levier de la salle 1 est de la descente');
  for (const id of ids) {
    assert.ok(scenesDeLaDescente(donnees.scenes, SALLE_1.id).some((s) => scene(s).interactifs.includes(id)));
  }
  assert.ok(!ids.includes(STELE.id), 'la stèle, à la surface, n\'en est pas');
  console.log('OK sceneNettoyee, interactifsDeLaDescente');
}

// --- 4. Le démarrage ------------------------------------------------------------------
{
  const refuse = (abimer, motif) => {
    const copie = structuredClone(donnees);
    abimer(copie);
    const e = validerCatalogues(copie);
    assert.ok(e.some((m) => motif.test(m)), `attendu ${motif}, reçu ${JSON.stringify(e)}`);
  };
  const tireurDe = (c) => c.enemies.find((e) => e.id === TIREUR.id);
  const salleDe = (c) => c.scenes.find((s) => s.id === SALLE_1.id);
  refuse((c) => { delete tireurDe(c).attaque_distance; }, /sans attaque_distance/);
  refuse((c) => { tireurDe(c).comportement = 'melee'; }, /attaque_distance sans comportement/);
  refuse((c) => { tireurDe(c).comportement = 'kamikaze'; }, /comportement "kamikaze" inconnu/);
  refuse((c) => { tireurDe(c).attaque_distance.recul_tuiles = 9; }, /recul_tuiles doit être inférieur/);
  refuse((c) => { tireurDe(c).attaque_distance.cadence_ms = 0; }, /cadence_ms doit être un nombre > 0/);
  refuse((c) => { tireurDe(c).attaque_distance.visuel = 'visuel_absent'; }, /attaque_distance\.visuel "visuel_absent"/);
  refuse((c) => { salleDe(c).nettoyage.flag = 'flag_absent'; }, /nettoyage\.flag "flag_absent"/);
  refuse((c) => { salleDe(c).spawns = []; }, /jamais nettoyée/);
  refuse((c) => { c.puzzles.find((p) => p.id === LEVIER.id).solide = true; }, /un interactif solide ne peut pas apparaître/);
  refuse((c) => { c.puzzles.find((p) => p.id === LEVIER.id).visible_si = 'flag_absent'; }, /visible_si/);

  // Un second tireur et une Annexe 2 nettoyable : des entrées JSON, rien d'autre.
  const copie = structuredClone(donnees);
  copie.enemies.push({ ...structuredClone(TIREUR), id: 'enemy_essai_tireur', attaque_distance: { ...TIREUR.attaque_distance, portee_tuiles: 8 } });
  copie.flags.push({ id: 'flag_essai_nettoyee', label_key: 'flag.annexe_salle_1_nettoyee' });
  copie.scenes.push({
    ...structuredClone(SALLE_1), id: 'scene_essai_annexe_2', descente: { flags: ['flag_essai_nettoyee'] },
    nettoyage: { flag: 'flag_essai_nettoyee' }, interactifs: [],
    spawns: [{ enemy: 'enemy_essai_tireur', position: { x: 4, y: 4 } }],
    portails: [], portes: [], lumieres: [],
  });
  assert.deepEqual(validerCatalogues(copie), [], 'un second tireur et une Annexe 2 se déclarent en données');
  console.log('OK démarrage : tireur, salle nettoyée et interactif qui apparaît mal déclarés refusés ; second tireur en données');
}

// --- 5. Le vrai orchestrateur ---------------------------------------------------------
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
function banc({ sceneId = SALLE_1.id, x = SALLE_1.spawn.x, y = SALLE_1.spawn.y, flagsSave = {}, puzzles = {} } = {}) {
  const save = saveNeuve();
  save.hero.scene = sceneId;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 15;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, ...flagsSave };
  save.puzzles = { ...puzzles };
  const t = scene(sceneId).tile_size;
  save.hero.x = (x + 0.5) * t;
  save.hero.y = (y + 0.5) * t;
  let prochain = etat();
  const menu = {
    estOuvert: () => false, indicesAffiches: () => false, rafraichirIndices() {},
    traiterInput() {}, ouvrir() {}, fermer() {},
  };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'manette' },
    lireContactsTactiles: () => [],
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  return { save, orch, frame };
}
const tireurs = (orch) => orch.obtenirMonstres().filter((m) => m.enemyId === TIREUR.id);
const aPorteeDuLevier = { valeur: 'a_portee', egal: LEVIER.id };

// 5a. Les cracheurs tirent, et un crachat touche.
{
  const b = banc();
  b.frame();
  assert.equal(tireurs(b.orch).length, SALLE_1.spawns.length, 'les cracheurs attendent déjà');
  const pv = b.orch.obtenirHero().pv;
  let vuTir = false;
  let touche = false;
  for (let i = 0; i < 1000 && !touche; i += 1) {
    b.frame();
    vuTir = vuTir || b.orch.obtenirProjectiles().length > 0;
    touche = b.orch.obtenirHero().pv < pv;
  }
  assert.ok(vuTir, 'un crachat part');
  assert.ok(touche, 'et touche le héros immobile');
  assert.equal(b.orch.obtenirScene().id, SALLE_1.id);
  // Un tireur trop près recule.
  const m = tireurs(b.orch)[0];
  const h = b.orch.obtenirHero();
  m.x = h.x + T;
  m.y = h.y;
  const avant = Math.hypot(m.x - h.x, m.y - h.y);
  for (let i = 0; i < 10; i += 1) b.frame();
  const apres = tireurs(b.orch).find((t) => t.id === m.id);
  assert.ok(Math.hypot(apres.x - h.x, apres.y - h.y) > avant, 'trop près, il recule');
  // Changer de scène éteint les tirs.
  b.frame();
  const escalier = SALLE_1.portails.find((p) => p.cible === SCENE_SURFACE);
  h.x = (escalier.zone.x + 0.5) * T;
  h.y = (escalier.zone.y + 0.5) * T;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, SCENE_SURFACE);
  assert.equal(b.orch.obtenirProjectiles().length, 0, 'aucun crachat ne remonte l\'escalier');
  console.log('OK salle 1 : les cracheurs tirent, un crachat touche ; trop près, il recule ; l\'escalier éteint les tirs');
}

// 5b. Nettoyée : le flag, le levier qui apparaît, le passage.
{
  // Le héros au pied du levier, là où il apparaîtra.
  const b = banc({ x: LEVIER.position.x, y: LEVIER.position.y + 0.6 });
  b.frame();
  assert.equal(b.orch.evaluerCondition(aPorteeDuLevier), false, 'avant : le levier n\'existe pas');
  b.frame(etat({ interact: true }));
  assert.equal(b.orch.evaluerCondition(LEVIER.flag_pose), false, 'ni actionnable');
  // `maj()` recrée les monstres à chaque frame : on relit l'état avant chaque
  // coup de grâce.
  for (const m of tireurs(b.orch).slice(1)) m.mort = true;
  b.frame();
  assert.equal(b.orch.evaluerCondition(FLAG_NETTOYEE), false, 'un cracheur debout : pas nettoyée');
  for (const m of tireurs(b.orch)) m.mort = true;
  b.frame();
  assert.equal(b.save.flags[FLAG_NETTOYEE], true, 'le dernier tombé : la salle est nettoyée, sauvegardée');
  assert.equal(b.orch.evaluerCondition(aPorteeDuLevier), true, 'le levier est là');
  b.frame(etat({ interact: true }));
  assert.equal(b.orch.evaluerCondition(LEVIER.flag_pose), true, 'actionné, il ouvre le passage');
  assert.equal(b.save.puzzles[LEVIER.id].actif, true);
  const passage = SALLE_1.portails.find((p) => p.condition === LEVIER.flag_pose);
  const h = b.orch.obtenirHero();
  h.x = (passage.zone.x + 0.5) * T;
  h.y = (passage.zone.y + 0.5) * T;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, passage.cible, 'le passage mène à la salle 2');

  // Revenir par le sud : les cracheurs ne renaissent pas, le levier reste levé.
  const salle2 = scene(passage.cible);
  const retour = salle2.portails.find((p) => p.cible === SALLE_1.id);
  h.x = (retour.zone.x + 0.5) * salle2.tile_size;
  h.y = (retour.zone.y + 0.5) * salle2.tile_size;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, SALLE_1.id);
  assert.equal(tireurs(b.orch).length, 0, 'une salle nettoyée le reste pendant la descente');
  assert.equal(b.save.puzzles[LEVIER.id].actif, true);
  console.log('OK salle nettoyée : le dernier tombé pose le flag, le levier apparaît et ouvre le passage ; le retour ne fait rien renaître');
}

// 5c. Une descente neuve remet tout à zéro.
{
  const INDICE = donnees.indices.find((i) => i.id === STELE.indice);
  const t = scene(SCENE_SURFACE).tile_size;
  const b = banc({
    sceneId: SCENE_SURFACE, x: STELE.position.x, y: STELE.position.y + 1.1 - 0.5,
    flagsSave: { [INDICE.dechiffrement.flag]: true, flag_ambiance_stele_carnet: true, [FLAG_NETTOYEE]: true, [LEVIER.flag_pose]: true },
    puzzles: { [LEVIER.id]: { actif: true } },
  });
  b.orch.obtenirHero().y = (STELE.position.y + 1.1) * t;
  b.frame(etat({ interact: true }));
  b.frame(etat(), STELE.armement_ms);
  b.frame(etat({ attack: true }));
  b.frame(etat(), 1000);
  assert.equal(b.orch.obtenirScene().id, SALLE_1.id);
  assert.equal(b.save.flags[FLAG_NETTOYEE], undefined, 'la salle est à nettoyer de nouveau');
  assert.equal(b.save.flags[LEVIER.flag_pose], undefined, 'le passage est refermé');
  assert.equal(b.save.puzzles[LEVIER.id].actif, false, 'le levier est rabaissé');
  assert.equal(tireurs(b.orch).length, SALLE_1.spawns.length, 'les cracheurs sont revenus');
  console.log('OK descente neuve : cracheurs, levier et passage remis à zéro');
}

// --- 6. Aucun id du palier dans le code système -----------------------------------
{
  const ids = [TIREUR.id, TIREUR.loot_table, TIREUR.render.visuel, TIREUR.attaque_distance.visuel, LEVIER.id, FLAG_NETTOYEE];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (cracheur, crachat, levier, salle nettoyée) dans le code système');
}

console.log('OK test_spec14_palier_c_tireurs');

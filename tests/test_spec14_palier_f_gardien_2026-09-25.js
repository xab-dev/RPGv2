// Contrat de `specs/14_annexe-1.md`, palier F : le Gardien.
//
// 1. `comportement_monstres.js` : le boss tire son mode au sort, selon les
//    poids (un poids nul ne sort jamais), le garde le temps tiré, puis en
//    change ; agressif fonce sans tirer, kite garde ses distances et tire,
//    errance va d'un point à un autre (et en change s'il n'avance plus).
// 2. `projectiles.js` : une salve vise en éventail, symétrique, à la même
//    distance ; sans salve, la visée seule.
// 3. Le démarrage refuse un boss mal déclaré (sans modes, type inconnu ou en
//    double, aucun poids, durée absurde, salve d'un seul tir) et des modes sur
//    un monstre qui n'est pas un boss ; un second boss se déclare en DONNÉES.
// 4. Le vrai orchestrateur, en salle 3 : le Gardien est là, sa barre en haut
//    de l'écran (et pas au-dessus de lui) ; il tire des salves et frappe au
//    contact ; vaincu, il pose son flag (persistant), rapporte son XP et sa
//    barre disparaît ; il ne revient plus. Mourir devant lui ramène à la Grotte.
// 5. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que le combat soit juste (perdu au Nv.16,
// gagné difficilement au Nv.30), que les modes se lisent, que la barre et le
// dessin tiennent à l'écran. Ça se joue dans Chrome, manette en main.

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
import { creerEtatBoss, deciderBoss, tirerModeBoss } from '../src/comportement_monstres.js';
import { viseesSalve } from '../src/projectiles.js';

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
const BOSS = donnees.enemies.find((e) => e.comportement === 'boss');
assert.ok(BOSS, 'un boss au catalogue');
const SALLE_3 = donnees.scenes.find((s) => (s.spawns || []).some((sp) => sp.enemy === BOSS.id));
const FLAG_VAINCU = SALLE_3.nettoyage.flag;
const T = SALLE_3.tile_size;

// --- 1. La décision du boss ---------------------------------------------------------
{
  const modes = [
    { type: 'agressif', poids: 40, facteur_vitesse: 1.5, tir: false },
    { type: 'kite', poids: 0, tir: true },
    { type: 'errance', poids: 20, tir: true },
  ];
  assert.equal(tirerModeBoss(modes, () => 0).type, 'agressif');
  assert.equal(tirerModeBoss(modes, () => 0.99).type, 'errance');
  for (let i = 0; i < 100; i += 1) assert.notEqual(tirerModeBoss(modes, () => i / 100).type, 'kite', 'un poids nul ne sort jamais');

  const attaque = { portee_tuiles: 7, recul_tuiles: 4, cadence_ms: 1000 };
  const base = {
    deltaMs: 16, tileSize: 32, dureeModeMs: { min: 3000, max: 3000 }, attaque, cooldownTirMs: 0,
    alea: () => 0, tirerPoint: () => ({ x: 500, y: 500 }),
  };
  const monstre = { x: 100, y: 100 };
  const pres = { x: 140, y: 100 };
  const loin = { x: 100 + 5 * 32, y: 100 };

  // Agressif : sur le héros, plus vite, sans tirer.
  let d = deciderBoss(creerEtatBoss(), { ...base, modes, monstre, hero: loin });
  assert.equal(d.etat.mode.type, 'agressif');
  assert.deepEqual(d.but, loin);
  assert.equal(d.facteurVitesse, 1.5);
  assert.equal(d.tirer, false, 'agressif ne tire pas');
  // Le mode dure, puis se retire.
  const garde = deciderBoss(d.etat, { ...base, modes, monstre, hero: loin, deltaMs: 2900, alea: () => 0.99 });
  assert.equal(garde.etat.mode.type, 'agressif', 'avant la fin de sa durée, le mode tient');
  const change = deciderBoss(garde.etat, { ...base, modes, monstre, hero: loin, deltaMs: 200, alea: () => 0.99 });
  assert.equal(change.etat.mode.type, 'errance', 'sa durée écoulée, un autre tirage');

  // Kite : il recule quand on s'approche, tire à portée.
  const kite = [{ type: 'kite', poids: 1, tir: true }];
  d = deciderBoss(creerEtatBoss(), { ...base, modes: kite, monstre, hero: pres });
  assert.ok(d.but.x < monstre.x, 'trop près : il recule');
  assert.equal(d.tirer, true, 'à portée, cadence prête : il tire');
  d = deciderBoss(creerEtatBoss(), { ...base, modes: kite, monstre, hero: loin, cooldownTirMs: 10 });
  assert.equal(d.but, null, 'entre ses deux distances : il reste');
  assert.equal(d.tirer, false, 'la cadence n\'est pas prête');

  // Errance : un point, puis un autre s'il n'avance plus.
  const errance = [{ type: 'errance', poids: 1, tir: false }];
  let n = 0;
  const tirerPoint = () => { n += 1; return { x: 100 * n, y: 300 }; };
  d = deciderBoss(creerEtatBoss(), { ...base, modes: errance, monstre, hero: loin, tirerPoint });
  assert.deepEqual(d.but, { x: 100, y: 300 });
  const bloque = deciderBoss(d.etat, { ...base, modes: errance, monstre, hero: loin, tirerPoint, distanceParcouruePx: 0, deltaMs: 800 });
  assert.deepEqual(bloque.but, { x: 200, y: 300 }, 'coincé : il change de point');
  const arrive = deciderBoss(bloque.etat, { ...base, modes: errance, monstre: { x: 200, y: 300 }, hero: loin, tirerPoint, distanceParcouruePx: 1 });
  assert.deepEqual(arrive.but, { x: 300, y: 300 }, 'arrivé : un autre point');
  console.log('OK décision du boss : tirage pondéré, durée du mode, agressif, kite, errance');
}

// --- 2. La salve ----------------------------------------------------------------
{
  assert.deepEqual(viseesSalve(0, 0, 10, 0, undefined), [{ x: 10, y: 0 }]);
  const v = viseesSalve(0, 0, 100, 0, { nombre: 3, ecart_deg: 20 });
  assert.equal(v.length, 3);
  assert.ok(Math.abs(v[1].x - 100) < 1e-9 && Math.abs(v[1].y) < 1e-9, 'le tir du milieu vise le héros');
  for (const p of v) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 100) < 1e-9, 'même distance');
  assert.ok(Math.abs(v[0].y + v[2].y) < 1e-9, 'symétrique');
  assert.ok(Math.abs(Math.atan2(v[2].y, v[2].x) * 180 / Math.PI - 20) < 1e-9, 'écart déclaré');
  console.log('OK salve : éventail symétrique, à la distance de la visée');
}

// --- 3. Le démarrage ---------------------------------------------------------------
{
  const copie = () => structuredClone(donnees);
  const erreursDe = (modifier) => { const c = copie(); modifier(c); return validerCatalogues(c); };
  const boss = (c) => c.enemies.find((e) => e.id === BOSS.id);
  const autre = (c) => c.enemies.find((e) => e.comportement === 'melee');
  assert.ok(erreursDe((c) => { delete boss(c).modes; }).some((e) => e.includes('sans modes')));
  assert.ok(erreursDe((c) => { boss(c).modes[0].type = 'danse'; }).some((e) => e.includes('"danse" inconnu')));
  assert.ok(erreursDe((c) => { boss(c).modes[1].type = boss(c).modes[0].type; }).some((e) => e.includes('en double')));
  assert.ok(erreursDe((c) => { for (const m of boss(c).modes) m.poids = 0; }).some((e) => e.includes('aucun poids positif')));
  assert.ok(erreursDe((c) => { boss(c).duree_mode_ms = { min: 5000, max: 1000 }; }).some((e) => e.includes('duree_mode_ms')));
  assert.ok(erreursDe((c) => { delete boss(c).modes[0].tir; }).some((e) => e.includes('tir doit')));
  assert.ok(erreursDe((c) => { delete boss(c).attaque_distance; }).some((e) => e.includes('sans attaque_distance')));
  assert.ok(erreursDe((c) => { boss(c).attaque_distance.salve = { nombre: 1, ecart_deg: 10 }; }).some((e) => e.includes('salve.nombre')));
  assert.ok(erreursDe((c) => { boss(c).boss = 'oui'; }).some((e) => e.includes('boss doit')));
  assert.ok(erreursDe((c) => { autre(c).modes = structuredClone(BOSS.modes); }).some((e) => e.includes('modes sans comportement')));
  assert.ok(erreursDe((c) => { autre(c).attaque_distance = structuredClone(BOSS.attaque_distance); })
    .some((e) => e.includes('attaque_distance sans comportement')));

  // Un second boss (l'Annexe 2) : une entrée de données, aucune ligne de code.
  const c = copie();
  c.enemies.push({ ...structuredClone(BOSS), id: 'enemy_essai_boss', modes: [{ type: 'kite', poids: 1, tir: true }] });
  assert.deepEqual(validerCatalogues(c), [], 'un second boss, un seul mode : des données seulement');
  console.log('OK démarrage : boss, modes, salve mal déclarés refusés ; un second boss en données');
}

// --- 4. L'orchestrateur, en salle 3 -----------------------------------------------
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
function banc({ flagsSave = {} } = {}) {
  const save = saveNeuve();
  save.hero.scene = SALLE_3.id;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 16;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, ...flagsSave };
  save.hero.x = (SALLE_3.spawn.x + 0.5) * T;
  save.hero.y = (SALLE_3.spawn.y + 0.5) * T;
  let prochain = etat();
  const menu = {
    estOuvert: () => false, indicesAffiches: () => false, rafraichirIndices() {},
    traiterInput() {}, ouvrir() {}, fermer() {},
  };
  const dialogue = creerDialogue();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue, menu,
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'manette' },
    lireContactsTactiles: () => [],
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  const gardien = () => orch.obtenirMonstres().find((m) => m.enemyId === BOSS.id && !m.mort);
  return { save, orch, frame, gardien, dialogue };
}

// Le hasard du boss n'a pas de graine en jeu ; ici, une suite fixe, pour que
// le test ne dépende pas d'un tirage.
const hasardDuJeu = Math.random;
let graine = 7;
Math.random = () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
try {
  const b = banc();
  b.frame();
  assert.equal(b.orch.obtenirScene().id, SALLE_3.id);
  const g = b.gardien();
  assert.ok(g, 'le Gardien est là');
  const barre = b.orch.obtenirBarreBoss();
  assert.deepEqual(barre, { nom: i18n.t(BOSS.label_key), ratio: 1 }, 'sa barre en haut de l\'écran, pleine, à son nom');

  // Il tire des salves et frappe : le héros tient (PV rendus à chaque frame),
  // on compte ce qui lui arrive.
  let salve = false;
  let pertes = 0;
  const hero = b.orch.obtenirHero();
  for (let i = 0; i < 1500 && !(salve && pertes > 0); i += 1) {
    const avant = b.orch.obtenirProjectiles().length;
    hero.pv = hero.pvMax;
    b.frame();
    if (b.orch.obtenirProjectiles().length - avant >= BOSS.attaque_distance.salve.nombre) salve = true;
    if (hero.pv < hero.pvMax) pertes += 1;
  }
  assert.ok(salve, 'une salve part : plusieurs tirs dans la même frame');
  assert.ok(pertes > 0, 'et il blesse le héros');
  assert.equal(b.orch.obtenirScene().id, SALLE_3.id, 'toujours là');

  // Vaincu : un dernier coup, au contact.
  const xpAvant = b.save.hero.xp;
  const cible = b.gardien();
  cible.pv = 1;
  hero.x = cible.x + 12;
  hero.y = cible.y;
  hero.pv = hero.pvMax;
  for (let i = 0; i < 60 && b.gardien(); i += 1) b.frame(etat({ attack: true }));
  assert.equal(b.gardien(), undefined, 'le Gardien tombe');
  assert.equal(b.save.flags[FLAG_VAINCU], true, 'son flag est posé');
  assert.ok(!SALLE_3.descente.flags.includes(FLAG_VAINCU), 'un flag persistant : la descente ne le retire pas');
  assert.equal(b.save.hero.xp, xpAvant + BOSS.xp, 'il rapporte son XP');
  assert.equal(b.orch.obtenirBarreBoss(), null, 'sa barre disparaît');
  console.log('OK orchestrateur : le Gardien, sa barre, ses salves, ses coups ; vaincu, flag, XP, barre effacée');
} finally {
  Math.random = hasardDuJeu;
}

// Vaincu une fois : les descentes suivantes n'ont plus de boss.
{
  const b = banc({ flagsSave: { [FLAG_VAINCU]: true } });
  b.frame();
  assert.equal(b.gardien(), undefined, 'la salle 3 est vide de boss');
  assert.equal(b.orch.obtenirBarreBoss(), null);
  console.log('OK descentes suivantes : plus de Gardien');
}

// Mourir devant lui : la Grotte, comme partout.
{
  const b = banc();
  b.frame();
  b.orch.obtenirHero().pv = 0;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, 'scene_grotte_salle_1', 'la mort ramène à la Grotte');
  assert.notEqual(b.save.flags[FLAG_VAINCU], true);
  console.log('OK mort : retour à la Grotte, le Gardien invaincu');
}

// --- 5. Aucun id du palier dans le code système -----------------------------------
{
  const ids = [BOSS.id, BOSS.render.visuel, BOSS.attaque_distance.visuel, FLAG_VAINCU, SALLE_3.id];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (Gardien, ses dessins, son flag, la salle) dans le code système');
}

console.log('OK test_spec14_palier_f_gardien');

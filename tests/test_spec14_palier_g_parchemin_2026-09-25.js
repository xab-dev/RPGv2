// Contrat de `specs/14_annexe-1.md`, palier G : le coffre, le parchemin, la
// première compétence.
//
// 1. `competences.js` : la charge ne monte que pendant l'engagement du follet,
//    plafonne, et se garde ; la recharge descend ; il faut les deux pour
//    relancer ; la hâte raccourcit les deux. Les dégâts : Force × puissance
//    d'Esprit × multiplicateur, en un seul point — sans Force, rien. La cible :
//    celle du follet si elle est à portée, sinon la plus proche, jamais un
//    intouchable, et rien quand il n'y a rien.
// 2. `projectiles.js` : un tir à zone éclate au contact, au mur ou au bout de
//    sa course et touche tout l'autre camp dans son rayon ; un tir ordinaire
//    ne change pas.
// 3. `parchemin.js` : les lettres s'écrivent une à une, dans l'ordre de lecture.
// 4. Le démarrage refuse une compétence, un coffre ou une dérivée mal déclarés ;
//    une seconde compétence se déclare en DONNÉES.
// 5. Le vrai orchestrateur : le coffre n'existe qu'une fois le Gardien vaincu ;
//    l'ouvrir apprend la compétence, ouvre le parchemin (jeu gelé), B achève
//    l'écriture puis ferme ; ouvert, il ne s'ouvre plus. L'emplacement
//    apparaît ; la charge monte pendant l'engagement ; le tir part, éclate,
//    blesse ; la recharge démarre ; sans cible, l'appui est refusé et le dit.
//    La fiche Esprit montre la puissance et la hâte, une fois la compétence
//    apprise seulement.
// 6. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que la cinématique soit belle, que les
// lettres d'or se lisent, que la jauge dise la charge et la recharge d'un
// coup d'œil, que le tir se voie et que l'onde tienne dans l'arène. Ça se
// joue dans Chrome, à la manette, au clavier et au doigt (CHECKLIST_visuelle).

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
  creerEtatCompetence, dureesCompetence, chargeActive, avancerCompetence, competencePrete, lancerCompetence,
  ratiosCompetence, resoudreDegats, choisirCible,
} from '../src/competences.js';
import { creerProjectiles, tirer, avancerProjectiles, projectilesEnVol, CAMP_HEROS, CAMP_MONSTRES } from '../src/projectiles.js';
import { lignesEcrites, dureeEcriture, ecritureFinie, MS_PAR_SIGNE } from '../src/parchemin.js';

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
const COFFRE = donnees.puzzles.find((p) => p.type === 'coffre_parchemin');
assert.ok(COFFRE, 'un coffre à parchemin au catalogue');
const COMPETENCE = donnees.skills.find((c) => c.id === COFFRE.competence);
const SALLE_3 = donnees.scenes.find((s) => (s.interactifs || []).includes(COFFRE.id));
const SALLE_1 = donnees.scenes.find((s) => s.descente && s.nettoyage && (s.spawns || []).length > 1);
const VERBE = donnees.action_slots.find((a) => a.id === COMPETENCE.emplacement).verb;
const T = SALLE_3.tile_size;

// --- 1. Le cycle d'une compétence, ses dégâts, sa cible -----------------------------
{
  const c = COMPETENCE;
  const sansHate = dureesCompetence(c, {});
  assert.deepEqual(sansHate, { chargeMs: c.charge.duree_ms, rechargeMs: c.cooldown_ms });
  const avecHate = dureesCompetence(c, { derivee_hate_competence: 0.5 });
  assert.deepEqual(avecHate, { chargeMs: c.charge.duree_ms / 2, rechargeMs: c.cooldown_ms / 2 }, 'la hâte raccourcit les deux');

  assert.equal(chargeActive(c, { follet: { etat: 'engager' } }), true);
  assert.equal(chargeActive(c, { follet: { etat: 'suivre' } }), false);
  assert.equal(chargeActive(c, { follet: { etat: 'poste' } }), false, 'posé, il ne charge pas');
  assert.equal(chargeActive(c, { follet: null }), false);

  const d = { chargeMs: 1000, rechargeMs: 2000 };
  let e = creerEtatCompetence();
  e = avancerCompetence(e, 600, { active: true, durees: d });
  assert.equal(e.chargeMs, 600);
  e = avancerCompetence(e, 600, { active: false, durees: d });
  assert.equal(e.chargeMs, 600, 'hors engagement, la charge se garde (Q-144)');
  e = avancerCompetence(e, 5000, { active: true, durees: d });
  assert.equal(e.chargeMs, 1000, 'elle plafonne');
  assert.equal(competencePrete(e, d), true);
  e = lancerCompetence(e, d);
  assert.deepEqual(e, { chargeMs: 0, rechargeMs: 2000 }, 'lancer vide la charge, démarre la recharge');
  e = avancerCompetence(e, 1500, { active: true, durees: d });
  assert.equal(competencePrete(e, d), false, 'chargée, mais la recharge n\'est pas finie');
  assert.deepEqual(ratiosCompetence(e, d), { charge: 1, recharge: 0.25, prete: false });
  e = avancerCompetence(e, 600, { active: false, durees: d });
  assert.equal(competencePrete(e, d), true, 'les deux remplies : prête');

  const derivees = { derivee_degats_attaque: 10, derivee_puissance_competence: 1.25 };
  assert.equal(resoudreDegats(c, derivees), 10 * 1.25 * c.effet.multiplicateur, 'Force × Esprit × multiplicateur (B1)');
  assert.equal(resoudreDegats(c, { ...derivees, derivee_degats_attaque: 0 }), 0, 'sans Force, rien');

  const hero = { x: 0, y: 0 };
  const monstres = [
    { id: 'a', x: 50, y: 0, mort: false },
    { id: 'b', x: 30, y: 0, mort: false },
    { id: 'z', x: 10, y: 0, mort: false, visable: false },
    { id: 'loin', x: 900, y: 0, mort: false },
  ];
  assert.equal(choisirCible({ follet: { etat: 'engager', cibleMonstreId: 'a' }, monstres, hero, porteePx: 100 }).id, 'a', 'la cible du follet');
  assert.equal(choisirCible({ follet: { etat: 'suivre' }, monstres, hero, porteePx: 100 }).id, 'b', 'sinon la plus proche — jamais l\'intouchable');
  assert.equal(choisirCible({ follet: { etat: 'engager', cibleMonstreId: 'loin' }, monstres, hero, porteePx: 100 }).id, 'b', 'hors de portée, la cible du follet cède');
  assert.equal(choisirCible({ follet: null, monstres: [monstres[3]], hero, porteePx: 100 }), null, 'rien à portée : rien');
  console.log('OK competences.js : charge, recharge, hâte, dégâts (B1), cible');
}

// --- 2. Le tir à zone ---------------------------------------------------------------
{
  const libre = () => false;
  const cibles = [
    { id: 'h', x: 0, y: 0, rayon: 6, camp: CAMP_HEROS },
    { id: 'm1', x: 100, y: 0, rayon: 8, camp: CAMP_MONSTRES },
    { id: 'm2', x: 130, y: 0, rayon: 8, camp: CAMP_MONSTRES },
    { id: 'm3', x: 200, y: 0, rayon: 8, camp: CAMP_MONSTRES },
  ];
  const tir = { x: 0, y: 0, versX: 100, versY: 0, vitesse: 200, rayon: 4, degats: 7, camp: CAMP_HEROS, visuel: 'v', courseMaxPx: 400 };

  let p = creerProjectiles();
  const eclats = [];
  tirer(p, { ...tir, zonePx: 40, etiquette: { couleur: '#fff' } });
  let touches = [];
  for (let i = 0; i < 100 && projectilesEnVol(p).length > 0; i += 1) {
    touches = touches.concat(avancerProjectiles(p, 16, { estSolide: libre, cibles, surEclat: (e) => eclats.push(e) }));
  }
  assert.deepEqual(touches.map((t) => t.cibleId).sort(), ['m1', 'm2'], 'au contact : tout l\'autre camp dans le rayon, le héros jamais');
  assert.ok(touches.every((t) => t.degats === 7));
  assert.equal(eclats.length, 1);
  assert.deepEqual(eclats[0].etiquette, { couleur: '#fff' }, 'l\'étiquette revient avec l\'éclat');

  p = creerProjectiles();
  tirer(p, { ...tir, zonePx: 40 });
  touches = [];
  for (let i = 0; i < 100 && projectilesEnVol(p).length > 0; i += 1) {
    touches = touches.concat(avancerProjectiles(p, 16, { estSolide: (x) => x >= 60, cibles }));
  }
  assert.deepEqual(touches.map((t) => t.cibleId), ['m1'], 'au mur : il éclate là, et touche ce qui est à portée de l\'éclat');

  p = creerProjectiles();
  tirer(p, { ...tir, versX: 0, versY: 100, courseMaxPx: 50, zonePx: 40 });
  const bout = [];
  for (let i = 0; i < 100 && projectilesEnVol(p).length > 0; i += 1) avancerProjectiles(p, 16, { estSolide: libre, cibles, surEclat: (e) => bout.push(e) });
  assert.equal(bout.length, 1, 'au bout de sa course : il éclate aussi');

  p = creerProjectiles();
  tirer(p, tir);
  touches = [];
  for (let i = 0; i < 100 && projectilesEnVol(p).length > 0; i += 1) touches = touches.concat(avancerProjectiles(p, 16, { estSolide: libre, cibles }));
  assert.deepEqual(touches.map((t) => t.cibleId), ['m1'], 'sans zone : une cible, comme avant');
  console.log('OK projectiles.js : le tir à zone éclate au contact, au mur, au bout de sa course ; le tir ordinaire inchangé');
}

// --- 3. L'écriture du parchemin -------------------------------------------------------
{
  const lignes = ['Abc', 'de'];
  assert.deepEqual(lignesEcrites(lignes, 0), ['', '']);
  assert.deepEqual(lignesEcrites(lignes, 2 * MS_PAR_SIGNE), ['Ab', '']);
  assert.deepEqual(lignesEcrites(lignes, 4 * MS_PAR_SIGNE), ['Abc', 'd'], 'une ligne finie, la suivante commence');
  assert.equal(dureeEcriture(lignes), 5 * MS_PAR_SIGNE);
  assert.equal(ecritureFinie(lignes, 5 * MS_PAR_SIGNE - 1), false);
  assert.deepEqual(lignesEcrites(lignes, 99999), lignes);
  console.log('OK parchemin.js : un signe à la fois, dans l\'ordre de lecture');
}

// --- 4. Le démarrage ---------------------------------------------------------------
{
  const erreursDe = (modifier) => { const c = structuredClone(donnees); modifier(c); return validerCatalogues(c); };
  const comp = (c) => c.skills.find((s) => s.id === COMPETENCE.id);
  const coffre = (c) => c.puzzles.find((p) => p.id === COFFRE.id);
  assert.ok(erreursDe((c) => { comp(c).emplacement = 'slot_attaque'; }).some((e) => e.includes('pas un emplacement de compétence')));
  assert.ok(erreursDe((c) => { comp(c).flag = SALLE_3.descente.flags[0]; }).some((e) => e.includes('flag de descente')));
  assert.ok(erreursDe((c) => { comp(c).charge.source = 'soleil'; }).some((e) => e.includes('charge.source')));
  assert.ok(erreursDe((c) => { comp(c).effet.type = 'rayon'; }).some((e) => e.includes('effet.type')));
  assert.ok(erreursDe((c) => { comp(c).effet.multiplicateur = 0; }).some((e) => e.includes('multiplicateur')));
  assert.ok(erreursDe((c) => { comp(c).projectile.visuel = 'visuel_absent'; }).some((e) => e.includes('projectile.visuel')));
  assert.ok(erreursDe((c) => { delete comp(c).icone; }).length > 0);
  assert.ok(erreursDe((c) => { coffre(c).competence = 'skill_absente'; }).some((e) => e.includes('competence')));
  assert.ok(erreursDe((c) => { delete coffre(c).render.visuel_ouvert; }).some((e) => e.includes('visuel_ouvert')));
  assert.ok(erreursDe((c) => { c.stats_derivees[0].affichage = 'fraction'; }).some((e) => e.includes('affichage')));

  // Une seconde compétence, sur le deuxième emplacement : des données seulement.
  const c = structuredClone(donnees);
  const slot2 = c.action_slots.find((a) => a.verb === 'skill_2');
  c.skills.push({ ...structuredClone(COMPETENCE), id: 'skill_essai', emplacement: slot2.id, flag: slot2.visible_si });
  assert.deepEqual(validerCatalogues(c), [], 'une seconde compétence chargée par le follet : une entrée JSON');
  console.log('OK démarrage : compétence, coffre et dérivée mal déclarés refusés ; une seconde compétence en données');
}

// --- 5. L'orchestrateur ------------------------------------------------------------
const neutre = { pressed: false, held: false };
const appui = { pressed: true, held: true };
function etat(verbes = {}) {
  const e = {
    move: { x: 0, y: 0 }, attack: neutre, skill_1: neutre, skill_2: neutre, skill_3: neutre,
    consume: neutre, interact: neutre, menu: neutre, target_next: neutre,
  };
  for (const v of Object.keys(verbes)) {
    if (v === 'move') e.move = verbes.move;
    else e[v] = verbes[v] ? appui : neutre;
  }
  return e;
}
function banc({ scene = SALLE_3, flagsSave = {}, position = null } = {}) {
  const save = saveNeuve();
  save.hero.scene = scene.id;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 30;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, ...flagsSave };
  // `position` : en tuiles ; `devantCoffre` : juste sous le coffre, à portée
  // d'INTERACT (un interactif non solide n'a pas d'empreinte : la portée se
  // mesure à son centre).
  const p = position || scene.spawn;
  save.hero.x = (p.x + 0.5) * scene.tile_size;
  save.hero.y = (p.y + 0.5) * scene.tile_size;
  if (position === 'devantCoffre') {
    save.hero.x = (COFFRE.position.x + 0.5) * scene.tile_size;
    save.hero.y = (COFFRE.position.y + 0.5) * scene.tile_size + 18;
  }
  let prochain = etat();
  const menu = {
    estOuvert: () => false, indicesAffiches: () => false, rafraichirIndices() {}, rafraichirStats() {},
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
  return { save, orch, frame };
}
const FLAG_VAINCU = SALLE_3.nettoyage.flag;
const lignesEsprit = (orch) => orch.obtenirEntreesStats()[registre.tous('stats').findIndex((s) => s.id === 'stat_esprit')].lignes;

// Le Gardien invaincu : pas de coffre.
{
  const b = banc({ position: 'devantCoffre' });
  b.frame();
  b.frame(etat({ interact: true }));
  assert.equal(b.orch.obtenirVueParchemin(), null, 'avant la victoire, le coffre n\'existe pas');
  console.log('OK le coffre n\'apparaît qu\'une fois le Gardien vaincu');
}

// Vaincu : le coffre, le parchemin, la compétence.
{
  const b = banc({ flagsSave: { [FLAG_VAINCU]: true }, position: 'devantCoffre' });
  b.frame();
  assert.ok(!b.orch.obtenirVerbesActions().includes(VERBE), 'l\'emplacement est caché avant le parchemin');
  assert.equal(lignesEsprit(b.orch).some((l) => l.includes(i18n.t('derivee.puissance_competence'))), false, 'la puissance ne s\'annonce pas avant (D-62)');
  b.frame(etat({ interact: true }));
  const vue = b.orch.obtenirVueParchemin();
  assert.ok(vue, 'INTERACT ouvre le coffre : le parchemin');
  assert.equal(b.save.flags[COMPETENCE.flag], true, 'la compétence est apprise à l\'ouverture');
  assert.ok(!SALLE_3.descente.flags.includes(COMPETENCE.flag), 'et pour toujours');
  assert.equal(b.orch.uiOuverteMaintenant(), true, 'le jeu est gelé');

  const hero = b.orch.obtenirHero();
  const x0 = hero.x;
  b.frame(etat({ move: { x: 1, y: 0 } }));
  assert.equal(hero.x, x0, 'le héros ne bouge pas sous le parchemin');

  // L'écriture court ; B l'achève sans fermer (après l'armement).
  for (let i = 0; i < Math.ceil(COFFRE.armement_ms / 16) + 1; i += 1) b.frame();
  let contenu = b.orch.contenuVueParchemin();
  assert.notDeepEqual(contenu.lignes, contenu.lignesCompletes, 'les lettres s\'écrivent encore');
  assert.equal(contenu.actions.length, 0, 'pas de « Fermer » tant que tout n\'est pas écrit');
  assert.equal(contenu.lignesCompletes[0], i18n.t(COMPETENCE.label_key), 'le titre : le nom de la compétence');
  assert.ok(contenu.lignesCompletes.some((l) => l.includes(i18n.t(`glyphe.manette.${VERBE}`))), 'il nomme le bouton, au périphérique actif');
  b.frame(etat({ skill_3: true }));
  contenu = b.orch.contenuVueParchemin();
  assert.ok(b.orch.obtenirVueParchemin(), 'B pendant l\'écriture ne ferme pas');
  assert.deepEqual(contenu.lignes, contenu.lignesCompletes, 'il l\'achève');
  assert.equal(contenu.actions.length, 1, 'Fermer apparaît');
  b.frame(etat({ skill_3: true }));
  for (let i = 0; i < 40 && b.orch.obtenirVueParchemin(); i += 1) b.frame();
  assert.equal(b.orch.obtenirVueParchemin(), null, 'le second B ferme, après le fondu');
  assert.equal(b.orch.uiOuverteMaintenant(), false);

  assert.ok(b.orch.obtenirVerbesActions().includes(VERBE), 'l\'emplacement apparaît');
  assert.ok(lignesEsprit(b.orch).some((l) => l.startsWith(i18n.t('derivee.puissance_competence')) && l.endsWith('%')), 'la fiche Esprit dit la puissance, en pourcentage');
  assert.ok(lignesEsprit(b.orch).some((l) => l.startsWith(i18n.t('derivee.hate_competence')) && l.endsWith('%')), 'et la hâte');

  b.frame(etat({ interact: true }));
  assert.equal(b.orch.obtenirVueParchemin(), null, 'ouvert, le coffre ne s\'ouvre plus');

  // Prête mais sans rien à viser (l'arène est vide) : l'appui est refusé et le dit.
  const compEtat = () => b.orch.obtenirEtatsCompetences()[COMPETENCE.id];
  compEtat().chargeMs = 1e9;
  b.frame();
  const textesAvant = b.orch.obtenirTextesFlottants().length;
  b.frame(etat({ [VERBE]: true }));
  assert.equal(b.orch.obtenirProjectiles().length, 0, 'aucun tir');
  assert.ok(compEtat().chargeMs > 0, 'la charge est gardée');
  assert.ok(b.orch.obtenirTextesFlottants().length > textesAvant, 'le refus se dit');
  console.log('OK orchestrateur : coffre, parchemin (gelé, B achève puis ferme), compétence apprise, emplacement, fiche Esprit ; sans cible, refusé');
}

// En salle 1, face aux cracheurs : la charge monte pendant l'engagement, le tir part et blesse.
{
  const b = banc({ scene: SALLE_1, flagsSave: { [COMPETENCE.flag]: true } });
  b.frame();
  const hero = b.orch.obtenirHero();
  const vivants = () => b.orch.obtenirMonstres().filter((m) => !m.mort);
  assert.ok(vivants().length > 0, 'les cracheurs sont là');
  const compEtat = () => b.orch.obtenirEtatsCompetences()[COMPETENCE.id];
  assert.equal(compEtat().chargeMs, 0, 'la charge part de zéro');

  // Le follet engage quand un monstre est tout près du héros : on colle le
  // héros au premier cracheur, on le soigne à chaque frame.
  let engageVu = false;
  for (let i = 0; i < 2000 && !(b.orch.obtenirJaugesSlots()[VERBE] || {}).prete; i += 1) {
    const cible = vivants()[0];
    hero.x = cible.x + 10;
    hero.y = cible.y;
    hero.pv = hero.pvMax;
    b.frame();
    if (b.orch.obtenirFollet().etat === 'engager') engageVu = true;
  }
  assert.ok(engageVu, 'le follet a engagé');
  assert.equal(b.orch.obtenirJaugesSlots()[VERBE].prete, true, 'chargée pendant l\'engagement : prête');

  const pvAvant = new Map(vivants().map((m) => [m.id, m.pv]));
  b.frame(etat({ [VERBE]: true }));
  const tirs = b.orch.obtenirProjectiles().filter((p) => p.camp === CAMP_HEROS);
  assert.equal(tirs.length, 1, 'le tir de la compétence part');
  assert.equal(compEtat().chargeMs, 0, 'la charge est vidée');
  assert.ok(compEtat().rechargeMs > 0, 'la recharge démarre');
  assert.equal(b.orch.obtenirJaugesSlots()[VERBE].prete, false);
  let ondeVue = false;
  for (let i = 0; i < 200 && b.orch.obtenirProjectiles().some((p) => p.camp === CAMP_HEROS); i += 1) {
    hero.pv = hero.pvMax;
    b.frame();
    if (b.orch.obtenirOndes().length > 0) ondeVue = true;
  }
  assert.ok(ondeVue, 'il éclate : une onde');
  const blesses = b.orch.obtenirMonstres().filter((m) => pvAvant.has(m.id) && (m.mort || m.pv < pvAvant.get(m.id)));
  assert.ok(blesses.length >= 1, 'il blesse ce qui est dans l\'éclat');

  // Un second appui pendant la recharge : rien ne part.
  b.frame(etat({ [VERBE]: true }));
  assert.equal(b.orch.obtenirProjectiles().filter((p) => p.camp === CAMP_HEROS).length, 0, 'en recharge, l\'appui ne fait rien');
  console.log('OK orchestrateur : la charge monte pendant l\'engagement, le tir part, éclate, blesse ; la recharge tient');
}

// --- 6. Aucun id du palier dans le code système -----------------------------------
{
  const ids = [COFFRE.id, COMPETENCE.id, COMPETENCE.flag, COMPETENCE.icone, COMPETENCE.projectile.visuel, COFFRE.render.visuel, COFFRE.render.visuel_ouvert];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (coffre, compétence, son flag, ses dessins) dans le code système');
}

console.log('OK test_spec14_palier_g_parchemin');

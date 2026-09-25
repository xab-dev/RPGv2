// Contrat de `specs/14_annexe-1.md`, palier D : Zéros.
//
// 1. `rencontre.js` : quand une rencontre démarre, se raccourcit (déjà eue)
//    ou ne fait rien ; ses phases (apparition, combat, fin, effacement,
//    terminée) ; le fondu ; le plancher de la cible ; la cible au seuil.
// 2. Les entités : un INTOUCHABLE ne perd aucun PV, l'auto-attaque et le
//    follet l'ignorent ; une cible à plancher s'y arrête et ne meurt pas ;
//    l'orbite d'un follet autour d'un autre centre (`avancerOrbiteAutour`).
// 3. Le démarrage refuse une rencontre qui ne finirait jamais (cible absente
//    ou intouchable, seuil hors de ]0 ; 1[), un flag ou un dialogue inconnu,
//    une relève sans `sans_defaite`, une orbite mal déclarée, un locuteur
//    inconnu ; une seconde rencontre (une Annexe 2) se déclare en DONNÉES.
// 4. Le vrai orchestrateur, en salle 1, la première fois : le levier fait
//    apparaître Zéros et son follet en fondu (inertes), Zéros parle ; le coup
//    du héros ne le touche pas, notre follet ne le prend pas ; tomber à 0 PV
//    RELÈVE le héros (PV pleins, sans malus, sans quitter la salle) ; le
//    follet de Zéros au seuil fige tout et Zéros parle ; le dialogue fermé,
//    ils s'effacent, le flag de la rencontre et le passage sont posés.
// 5. Une rencontre interrompue (l'escalier) se rejoue au retour, sans double.
// 6. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que la scène se lit comme un combat qu'on
// ne peut pas perdre (et pas comme un bug), que le blanc de Zéros et le noir
// de son follet se voient, que le follet de Zéros s'attrape. Ça se joue dans
// Chrome (`V-152`).

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
  deciderRencontre, creerEtatRencontre, avancerRencontre, passerALaFin, passerALEffacement,
  rencontreAgit, rencontreEnCours, opaciteRencontre, plancherCible, cibleAuSeuil,
} from '../src/rencontre.js';
import { creerMonstre, infligerDegats, approcherEnLigneDroite } from '../src/entities.js';
import { resoudreAutoAttaque } from '../src/combat.js';
import { monstreEngageable, cibleSuivante, avancerOrbiteAutour } from '../src/companion.js';

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
const RENCONTRE = SALLE_1.rencontre;
const LEVIER = donnees.puzzles.find((p) => SALLE_1.interactifs.includes(p.id) && p.type === 'levier');
const ennemi = (id) => donnees.enemies.find((e) => e.id === id);
const CIBLE = ennemi(RENCONTRE.cible);
const INTOUCHABLE = ennemi(RENCONTRE.monstres.map((m) => m.enemy).find((id) => ennemi(id).intouchable));
const PASSAGE = RENCONTRE.flags_fin[0];
const FLAG_NETTOYEE = SALLE_1.nettoyage.flag;
const T = SALLE_1.tile_size;
const scene = (id) => donnees.scenes.find((s) => s.id === id);

// --- 1. rencontre.js ----------------------------------------------------------------
{
  const r = { declencheur: 'd', flag_rencontre: 'fait', flags_fin: ['ouvert'] };
  const flags = (...poses) => ({ evaluer: (c) => poses.includes(c), has: (f) => poses.includes(f) });
  assert.equal(deciderRencontre(r, flags()), null, 'pas déclenchée');
  assert.equal(deciderRencontre(r, flags('d')), 'demarrer');
  assert.equal(deciderRencontre(r, flags('d', 'fait')), 'raccourci', 'déjà eue : ses flags de fin tout de suite');
  assert.equal(deciderRencontre(r, flags('d', 'fait', 'ouvert')), null, 'déjà ouvert : rien');
  assert.equal(deciderRencontre(r, flags('d', 'ouvert')), null, 'forcé par debug : rien');
  assert.equal(deciderRencontre(r, { ...flags('d'), enCours: true }), null, 'déjà lancée');
  assert.equal(deciderRencontre(null, flags('d')), null);

  let e = creerEtatRencontre();
  assert.equal(e.phase, 'apparition');
  assert.equal(rencontreAgit(e), false, 'inerte pendant l\'apparition');
  assert.equal(rencontreEnCours(e), true, 'la défaite est déjà suspendue');
  assert.equal(opaciteRencontre(e, 1000), 0);
  ({ etat: e } = avancerRencontre(e, 500, 1000));
  assert.equal(opaciteRencontre(e, 1000), 0.5, 'le fondu, au temps de jeu');
  let evenement;
  ({ etat: e, evenement } = avancerRencontre(e, 500, 1000));
  assert.equal(evenement, 'combat');
  assert.equal(rencontreAgit(e), true);
  assert.equal(opaciteRencontre(e, 1000), 1);
  assert.deepEqual(avancerRencontre(e, 99999, 1000).etat, e, 'le combat n\'avance pas au temps : il attend la cible');
  assert.equal(passerALEffacement(e), e, 'pas d\'effacement sans fin');
  e = passerALaFin(e);
  assert.equal(e.phase, 'fin');
  assert.equal(rencontreAgit(e), false, 'tout se fige');
  e = passerALEffacement(e);
  ({ etat: e } = avancerRencontre(e, 250, 1000));
  assert.equal(opaciteRencontre(e, 1000), 0.75);
  ({ etat: e, evenement } = avancerRencontre(e, 750, 1000));
  assert.equal(evenement, 'efface');
  assert.equal(rencontreEnCours(e), false);
  assert.equal(avancerRencontre(creerEtatRencontre(), 0, 0).evenement, 'combat', 'un fondu nul passe en une frame');

  assert.equal(plancherCible(160, 0.25), 40);
  assert.equal(plancherCible(10, 0.25), 3, 'arrondi au-dessus : un PV entier atteignable');
  assert.equal(plancherCible(2, 0.1), 1, 'jamais zéro');
  const m = [{ rencontre: true, enemyId: 'c', pv: 41, pvPlancher: 40 }, { enemyId: 'c', pv: 1, pvPlancher: 40 }];
  assert.equal(cibleAuSeuil(m, 'c'), false, 'au-dessus du seuil ; un monstre hors rencontre ne compte pas');
  m[0].pv = 40;
  assert.equal(cibleAuSeuil(m, 'c'), true);
  assert.equal(cibleAuSeuil([], 'c'), false, 'sans cible, on attend');
  console.log('OK rencontre.js : démarrer, raccourcir, rien ; phases, fondu, plancher, seuil');
}

// --- 2. Les entités -----------------------------------------------------------------
{
  const zeros = creerMonstre(INTOUCHABLE, { x: 0, y: 0, id: 'z#1' });
  assert.equal(zeros.intouchable, true);
  assert.equal(infligerDegats(zeros, 999), zeros, 'un intouchable ne perd rien');
  const ordinaire = creerMonstre(ennemi('enemy_grotte_rampant') || donnees.enemies[0], { x: 0, y: 0, id: 'r#1' });
  assert.equal(ordinaire.intouchable, false, 'un monstre ordinaire reste touchable');

  const cible = { ...creerMonstre(CIBLE, { x: 0, y: 0, id: 'f#1' }), pvPlancher: 40 };
  const frappee = infligerDegats(cible, 1000);
  assert.equal(frappee.pv, 40, 'la cible s\'arrête au plancher');
  assert.equal(frappee.mort, false, 'et ne meurt pas');
  assert.equal(infligerDegats(frappee, 5).pv, 40);
  assert.equal(infligerDegats({ ...cible, pv: 50 }, 3).pv, 47, 'au-dessus, les dégâts passent');

  const hero = { x: 0, y: 0 };
  const monstres = [{ ...zeros, x: 5, y: 0 }, { ...cible, x: 10, y: 0 }];
  assert.deepEqual(resoudreAutoAttaque(hero, monstres, { min: 0, max: 1 }, 32).map((m) => m.id), ['f#1'], 'le coup ignore l\'intouchable');
  const companion = donnees.companions[0];
  assert.equal(monstreEngageable(monstres[0], hero, null, companion), false, 'notre follet ignore l\'intouchable');
  assert.equal(monstreEngageable(monstres[1], hero, null, companion), true);
  const follet = { x: 0, y: 0, etat: 'suivre', cibleMonstreId: null };
  assert.equal(cibleSuivante(follet, hero, [monstres[0]], companion), follet, 'RB ne l\'envoie pas sur l\'intouchable');

  // Le contact : Zéros s'arrête à sa distance, il ne se cache pas sous le héros.
  let approche = { x: 0, y: 0, mort: false };
  for (let i = 0; i < 200; i += 1) approche = approcherEnLigneDroite(approche, 100, 0, 60, 1 / 60, INTOUCHABLE.distance_contact_px);
  assert.ok(Math.abs(approche.x - (100 - INTOUCHABLE.distance_contact_px)) < 1e-9, 'arrêté au contact');
  assert.ok(INTOUCHABLE.distance_contact_px < INTOUCHABLE.portee_attaque, 'et il frappe de là');
  assert.equal(approcherEnLigneDroite({ x: 0, y: 0 }, 100, 0, 6000, 1).x, 100, 'sans contact déclaré, jusque sur la cible (Phase 1)');

  // L'orbite : le corps rejoint son rayon, et tourne.
  const orbite = { rayonPx: CIBLE.orbite.rayon_px, vitesseRadS: CIBLE.orbite.vitesse_rad_s };
  const centre = { x: 100, y: 100 };
  let corps = { x: 100, y: 100 };
  for (let i = 0; i < 300; i += 1) corps = avancerOrbiteAutour(corps, centre, orbite, 1 / 60);
  const rayon = Math.hypot(corps.x - centre.x, corps.y - centre.y);
  assert.ok(Math.abs(rayon - orbite.rayonPx) < orbite.rayonPx * 0.15, `à son rayon (${rayon.toFixed(1)} px)`);
  const angle = corps.angleOrbite;
  assert.ok(Math.abs(angle - 5 * orbite.vitesseRadS) < 1e-9, 'l\'angle suit le temps, pas les frames');
  console.log('OK entités : intouchable, plancher, auto-attaque et follet l\'ignorent ; l\'orbite autour d\'un autre centre');
}

// --- 3. Le démarrage ----------------------------------------------------------------
{
  const refus = (muter, attendu) => {
    const copie = structuredClone(donnees);
    muter(copie);
    const e = validerCatalogues(copie);
    assert.ok(e.some((x) => x.includes(attendu)), `refus attendu (${attendu}) : ${e.join(' | ') || 'aucune erreur'}`);
  };
  const salle = (c) => c.scenes.find((s) => s.id === SALLE_1.id);
  refus((c) => { salle(c).rencontre.cible = INTOUCHABLE.id; }, 'ne finirait jamais');
  refus((c) => { salle(c).rencontre.cible = 'enemy_inconnu'; }, 'absente de ses monstres');
  refus((c) => { salle(c).rencontre.seuil_fin = 1; }, 'seuil_fin');
  refus((c) => { salle(c).rencontre.seuil_fin = 0; }, 'seuil_fin');
  refus((c) => { salle(c).rencontre.flag_rencontre = 'flag_inconnu'; }, 'flag_rencontre');
  refus((c) => { salle(c).rencontre.flags_fin = []; }, 'flags_fin');
  refus((c) => { salle(c).rencontre.dialogue = 'dlg_inconnu'; }, 'dialogue "dlg_inconnu"');
  refus((c) => { salle(c).rencontre.sans_defaite = false; }, 'dialogue_releve sans sans_defaite');
  refus((c) => { salle(c).rencontre.monstres[0].position = { x: 99, y: 0 }; }, 'hors de la scène');
  refus((c) => { delete salle(c).rencontre.declencheur; }, 'declencheur');
  refus((c) => { c.enemies.find((e) => e.id === CIBLE.id).orbite.autour = CIBLE.id; }, 'autour de lui-même');
  refus((c) => { delete c.enemies.find((e) => e.id === CIBLE.id).orbite; }, 'sans orbite');
  refus((c) => { c.enemies.find((e) => e.id === INTOUCHABLE.id).orbite = CIBLE.orbite; }, 'orbite sans comportement');
  refus((c) => { c.enemies.find((e) => e.id === INTOUCHABLE.id).intouchable = 'oui'; }, 'intouchable doit être un booléen');
  refus((c) => { c.enemies.find((e) => e.id === INTOUCHABLE.id).distance_contact_px = 999; }, 'ne frappe jamais');
  refus((c) => { c.dialogues.find((d) => d.id === RENCONTRE.dialogue).noeuds.l1.locuteur = 'inconnu'; }, 'locuteur');

  // Une seconde rencontre, ailleurs, en données seules : un autre duelliste
  // intouchable, un autre follet qui tourne autour de lui, une autre salle.
  const copie = structuredClone(donnees);
  copie.flags.push({ id: 'flag_essai_levier', label_key: 'flag.annexe_levier_1' }, { id: 'flag_essai_vu', label_key: 'flag.zeros_rencontre' },
    { id: 'flag_essai_ouvert', label_key: 'flag.annexe_passage_1' });
  copie.enemies.push({ ...structuredClone(INTOUCHABLE), id: 'enemy_essai_double' });
  copie.enemies.push({ ...structuredClone(CIBLE), id: 'enemy_essai_follet', orbite: { ...CIBLE.orbite, autour: 'enemy_essai_double' } });
  copie.scenes.push({
    ...structuredClone(SALLE_1),
    id: 'scene_essai_annexe_2',
    descente: { flags: ['flag_essai_levier', 'flag_essai_ouvert'] },
    rencontre: {
      ...structuredClone(RENCONTRE),
      declencheur: 'flag_essai_levier', flag_rencontre: 'flag_essai_vu', flags_fin: ['flag_essai_ouvert'], cible: 'enemy_essai_follet',
      monstres: [{ enemy: 'enemy_essai_double', position: { x: 5, y: 5 } }, { enemy: 'enemy_essai_follet', position: { x: 6, y: 5 } }],
    },
  });
  assert.deepEqual(validerCatalogues(copie), [], 'une seconde rencontre ne demande aucune ligne de code');
  console.log('OK démarrage : rencontre, orbite, intouchable et locuteur mal déclarés refusés ; une seconde rencontre en données');
}

// --- 4. L'orchestrateur -------------------------------------------------------------
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
function banc({ sceneId = SALLE_1.id, x = LEVIER.position.x, y = LEVIER.position.y + 0.6, flagsSave = {}, puzzles = {} } = {}) {
  const save = saveNeuve();
  save.hero.scene = sceneId;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 15;
  // Salle 1 déjà nettoyée : le levier est là.
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, [FLAG_NETTOYEE]: true, ...flagsSave };
  save.puzzles = { ...puzzles };
  const t = scene(sceneId).tile_size;
  save.hero.x = (x + 0.5) * t;
  save.hero.y = (y + 0.5) * t;
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
  const finirDialogue = () => {
    for (let garde = 0; dialogue.estOuvert() && garde < 30; garde += 1) {
      frame(etat(), 3000);
      frame(etat({ attack: true }));
    }
    assert.equal(dialogue.estOuvert(), false, 'le dialogue se ferme');
  };
  return { save, orch, frame, dialogue, finirDialogue };
}
const deLaRencontre = (orch) => orch.obtenirMonstres().filter((m) => m.rencontre);
const cibleDe = (orch) => deLaRencontre(orch).find((m) => m.enemyId === CIBLE.id);
const zerosDe = (orch) => deLaRencontre(orch).find((m) => m.enemyId === INTOUCHABLE.id);

{
  const b = banc();
  b.frame();
  assert.equal(b.orch.obtenirRencontre(), null, 'avant le levier : personne');
  assert.equal(deLaRencontre(b.orch).length, 0);

  // Le levier : Zéros et son follet apparaissent, en fondu, inertes.
  b.frame(etat({ interact: true }));
  assert.equal(b.orch.obtenirRencontre().phase, 'apparition');
  assert.equal(deLaRencontre(b.orch).length, RENCONTRE.monstres.length);
  assert.equal(b.save.flags[PASSAGE], undefined, 'la première fois, le levier n\'ouvre pas le passage');
  const avant = zerosDe(b.orch);
  b.frame(etat(), RENCONTRE.fondu_ms / 2);
  assert.equal(zerosDe(b.orch).x, avant.x, 'inerte pendant l\'apparition');
  b.frame(etat(), RENCONTRE.fondu_ms);
  assert.equal(b.orch.obtenirRencontre().phase, 'combat');
  if (RENCONTRE.dialogue_debut) {
    assert.equal(b.dialogue.estOuvert(), true, 'Zéros parle en arrivant');
    b.finirDialogue();
  }

  // Le coup du héros ne touche pas Zéros ; notre follet ne le prend pas.
  const h = b.orch.obtenirHero();
  const z = zerosDe(b.orch);
  h.x = z.x + 4;
  h.y = z.y;
  for (let i = 0; i < 20; i += 1) b.frame(etat({ attack: true }), 50);
  assert.equal(zerosDe(b.orch).pv, zerosDe(b.orch).pvMax, 'intouchable');
  const follet = b.orch.obtenirFollet();
  assert.notEqual(follet.cibleMonstreId, zerosDe(b.orch).id, 'notre follet ne l\'engage pas');

  // La relève : à 0 PV, le héros se relève dans la salle, PV pleins, sans malus.
  const survieAvant = structuredClone(b.save.survie);
  h.pv = 0;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, SALLE_1.id, 'pas de retour à la Grotte');
  assert.equal(h.mort, false);
  assert.equal(h.pv, h.pvMax, 'PV à 100 %');
  // Le malus ramènerait les jauges à `malus_respawn` ; une frame de jeu ne
  // les fait baisser que d'un souffle.
  for (const jauge of Object.keys(survieAvant)) {
    assert.ok(b.save.survie[jauge] > survieAvant[jauge] - 0.001, `aucun malus de survie (${jauge})`);
  }
  assert.equal(b.dialogue.estOuvert(), true, 'le follet dit « Continue de te battre ! »');
  b.finirDialogue();

  // Le follet de Zéros au seuil : tout se fige, Zéros parle.
  const cible = cibleDe(b.orch);
  assert.equal(cible.pvPlancher, plancherCible(CIBLE.pv, RENCONTRE.seuil_fin));
  cible.pv = cible.pvPlancher + 1;
  b.frame();
  assert.equal(b.orch.obtenirRencontre().phase, 'combat', 'au-dessus du seuil, le combat continue');
  cibleDe(b.orch).pv = cibleDe(b.orch).pvPlancher;
  b.frame();
  assert.equal(b.orch.obtenirRencontre().phase, 'fin');
  assert.equal(b.dialogue.estOuvert(), true, 'Zéros parle');
  assert.equal(b.save.flags[PASSAGE], undefined, 'le passage attend la fin du dialogue');
  b.finirDialogue();
  assert.equal(b.orch.obtenirRencontre().phase, 'effacement');
  assert.equal(deLaRencontre(b.orch).length, RENCONTRE.monstres.length, 'ils s\'effacent, ils sont encore là');
  b.frame(etat(), RENCONTRE.fondu_ms + 16);
  assert.equal(deLaRencontre(b.orch).length, 0, 'partis');
  assert.equal(b.save.flags[RENCONTRE.flag_rencontre], true, 'une seule fois, sauvegardé');
  assert.equal(b.save.flags[PASSAGE], true, 'le passage s\'ouvre');
  assert.equal(b.orch.obtenirRencontre().phase, 'terminee');

  // Hors rencontre, la mort redevient la mort.
  h.pv = 0;
  b.frame();
  assert.notEqual(b.orch.obtenirScene().id, SALLE_1.id, 'la rencontre finie, mourir renvoie à la Grotte');
  console.log('OK salle 1 : le levier fait venir Zéros ; intouchable ; la relève ; le seuil, le dialogue, l\'effacement, le passage');
}

// --- 5. Interrompue, elle se rejoue --------------------------------------------------
// La salle 1 ne se rejoint que par la stèle, qui remet la descente à zéro :
// l'interruption qui compte est de QUITTER le jeu au milieu. Le levier levé est
// sauvegardé, la rencontre (de session) ne l'est pas : au chargement, elle se
// rejoue depuis l'apparition, une fois. Fuir par l'escalier, elle, l'arrête.
{
  const b = banc();
  b.frame(etat({ interact: true }));
  b.frame(etat(), RENCONTRE.fondu_ms + 16);
  if (b.dialogue.estOuvert()) b.finirDialogue();
  assert.equal(b.orch.obtenirRencontre().phase, 'combat');

  const recharge = banc({ flagsSave: { ...b.save.flags }, puzzles: { ...b.save.puzzles } });
  recharge.frame();
  assert.equal(recharge.orch.obtenirRencontre().phase, 'apparition', 'au chargement, elle se rejoue');
  recharge.frame();
  assert.equal(deLaRencontre(recharge.orch).length, RENCONTRE.monstres.length, 'sans double');

  const escalier = SALLE_1.portails.find((p) => p.condition === null);
  const h = b.orch.obtenirHero();
  h.x = (escalier.zone.x + 0.5) * T;
  h.y = (escalier.zone.y + 0.5) * T;
  b.frame();
  assert.notEqual(b.orch.obtenirScene().id, SALLE_1.id, 'on fuit par l’escalier');
  assert.equal(b.orch.obtenirRencontre(), null, 'la rencontre ne suit pas');
  assert.equal(deLaRencontre(b.orch).length, 0);
  assert.equal(b.save.flags[RENCONTRE.flag_rencontre], undefined, 'elle n’a pas eu lieu');
  console.log('OK une rencontre interrompue (le jeu quitté) se rejoue au chargement, sans double ; l’escalier l’arrête');
}

// --- 6. Aucun id du palier dans le code système -----------------------------------
{
  const dlg = [RENCONTRE.dialogue, RENCONTRE.dialogue_debut, RENCONTRE.dialogue_releve].filter(Boolean);
  const ids = [INTOUCHABLE.id, CIBLE.id, INTOUCHABLE.render.visuel, CIBLE.render.visuel, CIBLE.loot_table,
    RENCONTRE.flag_rencontre, LEVIER.flag_pose, ...dlg];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (Zéros, son follet, leurs visuels, flags, dialogues) dans le code système');
}

console.log('OK test_spec14_palier_d_zeros');

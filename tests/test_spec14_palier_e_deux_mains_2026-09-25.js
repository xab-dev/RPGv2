// Contrat de `specs/14_annexe-1.md`, palier E : les deux mains.
//
// 1. `puzzles.js` : un levier TENU s'allume à INTERACT, reste allumé tant
//    qu'on le tient, s'éteint après son délai sans personne (une fois), ne se
//    rallume jamais seul ; un `simultane` est résolu quand tous ses leviers
//    sont allumés à la fois.
// 2. `companion.js` : l'état `poste` (B2) — posé, le follet n'engage rien et
//    va à son poste ; rappelé, il revient en `suivre`.
// 3. Le démarrage refuse un levier tenu sans `maintien`, une paire qui cite un
//    levier ordinaire, une explication sur un flag de descente, une réplique
//    qui nomme un verbe inconnu ; une seconde paire se déclare en DONNÉES.
//    Une réplique nomme le bouton du périphérique actif (RB, Tab, le doigt).
// 4. Le vrai orchestrateur, en salle 2 : le levier s'éteint quand on part ;
//    à la deuxième extinction, le follet explique (une fois par partie) ; RB
//    près d'un levier allumé pose le follet, qui le tient pendant qu'on
//    allume l'autre ; les deux allumés ouvrent le passage, qui reste ouvert ;
//    RB rappelle ; changer de salle rappelle aussi. Aux descentes suivantes,
//    le follet ne réexplique pas.
// 5. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que l'extinction se voit, que la marche
// dans l'ombre se lit comme voulue, que toucher le follet au doigt le pose et
// le rappelle. Ça se joue dans Chrome, à la manette, au clavier et au doigt.

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, resoudreNoeud } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import {
  etatInitial, allumerLevierMaintenu, avancerLevierMaintenu, simultanesResolus,
} from '../src/puzzles.js';
import {
  creerFollet, poserFollet, rappelerFollet, folletPoste, mettreAJourEtat, avancerPosition, cibleSuivante,
} from '../src/companion.js';

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
const PAIRE = donnees.puzzles.find((p) => p.type === 'simultane' && p.explication);
const [GAUCHE, DROITE] = PAIRE.tous_allumes.map((id) => donnees.puzzles.find((p) => p.id === id));
const SALLE_2 = donnees.scenes.find((s) => (s.interactifs || []).includes(GAUCHE.id));
const EXPLICATION = donnees.dialogues.find((d) => d.id === PAIRE.explication.dialogue);
const T = SALLE_2.tile_size;
const centre = (p) => ({ x: (p.position.x + 0.5) * T, y: (p.position.y + 0.5) * T });

// --- 1. puzzles.js ------------------------------------------------------------------
{
  const init = etatInitial(registre);
  assert.deepEqual(init[GAUCHE.id], { actif: false, sansMainteneurMs: 0 }, 'éteint au départ');
  let e = allumerLevierMaintenu(registre, init, GAUCHE.id);
  assert.equal(e[GAUCHE.id].actif, true);
  assert.equal(allumerLevierMaintenu(registre, e, 'inconnu'), e, 'un id inconnu : rien');

  const x = 600;
  let r = avancerLevierMaintenu(e[GAUCHE.id], true, 5000, x);
  assert.equal(r.etat, e[GAUCHE.id], 'tenu : rien ne change, aussi longtemps qu\'on veut');
  r = avancerLevierMaintenu(r.etat, false, x - 1, x);
  assert.equal(r.etat.actif, true, 'sans personne : encore allumé avant le délai');
  assert.equal(r.eteint, false);
  const repris = avancerLevierMaintenu(r.etat, true, 16, x);
  assert.equal(repris.etat.sansMainteneurMs, 0, 'repris à temps : le délai repart de zéro');
  r = avancerLevierMaintenu(r.etat, false, 1, x);
  assert.equal(r.etat.actif, false, 'le délai écoulé : éteint');
  assert.equal(r.eteint, true, 'l\'extinction se signale, une fois');
  const apres = avancerLevierMaintenu(r.etat, true, 16, x);
  assert.equal(apres.etat.actif, false, 'être là ne rallume pas : il faut INTERACT');
  assert.equal(apres.eteint, false);

  const pose = new Set();
  const estPose = (f) => pose.has(f);
  e = allumerLevierMaintenu(registre, init, GAUCHE.id);
  assert.deepEqual(simultanesResolus(registre, e, estPose), [], 'un seul allumé : rien');
  e = allumerLevierMaintenu(registre, e, DROITE.id);
  assert.deepEqual(simultanesResolus(registre, e, estPose).map((p) => p.id), [PAIRE.id], 'les deux à la fois');
  pose.add(PAIRE.flag_pose);
  assert.deepEqual(simultanesResolus(registre, e, estPose), [], 'déjà ouvert : rien de plus');
  console.log('OK puzzles.js : allumer, tenir, délai, extinction signalée une fois, jamais rallumé seul ; la paire');
}

// --- 2. Le follet posé --------------------------------------------------------------
{
  const hero = { x: 100, y: 100 };
  const compagnon = registre.obtenir('companions', 'comp_follet_eau');
  const monstre = { id: 'm#1', x: 105, y: 100, pv: 10, mort: false };
  let f = creerFollet('comp_follet_eau', hero);
  f = poserFollet(f, { id: 'levier', x: 300, y: 100 });
  assert.equal(folletPoste(f), true);
  assert.deepEqual(f.poste, { id: 'levier', x: 300, y: 100 });
  assert.equal(mettreAJourEtat(f, hero, [monstre], compagnon), f, 'posé : il n\'engage pas le monstre collé au héros');
  for (let i = 0; i < 200; i += 1) f = avancerPosition(f, hero, [monstre], 1 / 60);
  assert.ok(Math.hypot(f.x - 300, f.y - 100) < 0.5, 'il va à son poste et y reste, le héros ailleurs');
  const rappele = rappelerFollet(f);
  assert.equal(rappele.etat, 'suivre');
  assert.equal(rappele.poste, null);
  assert.equal(rappelerFollet(rappele), rappele, 'rappeler un follet qui suit : rien');
  assert.equal(mettreAJourEtat(rappele, hero, [monstre], compagnon).etat, 'engager', 'rappelé, il reprend son travail');
  assert.equal(cibleSuivante(creerFollet('comp_follet_eau', hero), hero, [], compagnon).etat, 'suivre', 'la cible suivante, inchangée');
  console.log('OK companion.js : l\'état poste, posé puis rappelé');
}

// --- 3. Le démarrage, et la réplique qui nomme un bouton ----------------------------
{
  const copie = () => structuredClone(donnees);
  const erreursDe = (modifier) => { const c = copie(); modifier(c); return validerCatalogues(c); };
  const puzzle = (c, id) => c.puzzles.find((p) => p.id === id);
  assert.ok(erreursDe((c) => { delete puzzle(c, GAUCHE.id).maintien; }).some((e) => e.includes('maintien')));
  assert.ok(erreursDe((c) => { puzzle(c, GAUCHE.id).maintien.portee_px = 0; }).some((e) => e.includes('portee_px')));
  const levierOrdinaire = donnees.puzzles.find((p) => p.type === 'levier').id;
  assert.ok(erreursDe((c) => { puzzle(c, PAIRE.id).tous_allumes = [GAUCHE.id, levierOrdinaire]; })
    .some((e) => e.includes("n'est pas un levier_maintenu")));
  assert.ok(erreursDe((c) => { puzzle(c, PAIRE.id).tous_allumes = [GAUCHE.id]; }).some((e) => e.includes('au moins deux')));
  assert.ok(erreursDe((c) => { delete puzzle(c, PAIRE.id).flag_pose; }).some((e) => e.includes('flag_pose')));
  assert.ok(erreursDe((c) => { puzzle(c, PAIRE.id).explication.flag = PAIRE.flag_pose; })
    .some((e) => e.includes('flag de descente')), 'une explication sur un flag de descente se rejouerait à chaque descente');
  assert.ok(erreursDe((c) => { puzzle(c, PAIRE.id).explication.dialogue = 'dlg_absent'; }).some((e) => e.includes('dlg_absent')));
  assert.ok(erreursDe((c) => {
    const d = c.dialogues.find((x) => x.id === EXPLICATION.id);
    Object.values(d.noeuds)[0].glyphe = 'voler';
  }).some((e) => e.includes('glyphe "voler"')));

  // Une seconde paire (une Annexe 2) : des lignes de données, aucune de code.
  assert.deepEqual(validerCatalogues({
    ...copie(),
    puzzles: [...copie().puzzles,
      { id: 'puzzle_essai_a', type: 'levier_maintenu', position: { x: 1, y: 1 }, maintien: { portee_px: 30, extinction_ms: 0 }, render: { visuel: 'visuel_levier' } },
      { id: 'puzzle_essai_b', type: 'levier_maintenu', position: { x: 9, y: 1 }, maintien: { portee_px: 30, extinction_ms: 0 }, render: { visuel: 'visuel_levier' } },
      { id: 'puzzle_essai_c', type: 'levier_maintenu', position: { x: 5, y: 9 }, maintien: { portee_px: 30, extinction_ms: 0 }, render: { visuel: 'visuel_levier' } },
      { id: 'puzzle_essai_paire', type: 'simultane', tous_allumes: ['puzzle_essai_a', 'puzzle_essai_b', 'puzzle_essai_c'], flag_pose: 'flag_follet_choisi' }],
  }), [], 'trois mains, sans explication : des données seulement');

  // La réplique qui nomme le bouton : au périphérique actif.
  const noeudId = Object.keys(EXPLICATION.noeuds).find((id) => EXPLICATION.noeuds[id].glyphe);
  assert.ok(noeudId, 'l\'explication nomme le geste');
  const verbe = EXPLICATION.noeuds[noeudId].glyphe;
  for (const peripherique of ['manette', 'clavier', 'tactile']) {
    const { texte } = resoudreNoeud(EXPLICATION, noeudId, registre, i18n, 'comp_follet_eau', peripherique);
    assert.ok(texte.includes(i18n.t(`glyphe.${peripherique}.${verbe}`)), `${peripherique} : « ${texte} »`);
    assert.ok(!texte.includes('{glyphe}'));
  }
  const en = creerI18n(dictionnaires, 'en');
  assert.ok(resoudreNoeud(EXPLICATION, noeudId, registre, en, 'comp_follet_eau', 'tactile').texte.includes(en.t(`glyphe.tactile.${verbe}`)));
  console.log('OK démarrage : levier tenu, paire, explication et glyphe mal déclarés refusés ; une seconde paire en données ; RB / Tab / doigt');
}

// --- 4. L'orchestrateur, en salle 2 -------------------------------------------------
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
  save.hero.scene = SALLE_2.id;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 15;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, ...flagsSave };
  const c = centre(GAUCHE);
  save.hero.x = c.x;
  save.hero.y = c.y + T * 0.6;
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
  // Le héros se déplace d'un coup (pas de marche à simuler) : juste sous le
  // levier, ou au milieu de la salle, hors de portée des deux.
  const aller = (p) => {
    const h = orch.obtenirHero();
    const c2 = p ? centre(p) : { x: (SALLE_2.width / 2) * T, y: (SALLE_2.height / 2) * T };
    h.x = c2.x;
    h.y = c2.y + (p ? T * 0.6 : 0);
  };
  const allume = (p) => !!save.puzzles[p.id]?.actif;
  const finirDialogue = () => {
    for (let garde = 0; dialogue.estOuvert() && garde < 30; garde += 1) {
      frame(etat(), 3000);
      frame(etat({ attack: true }));
    }
    assert.equal(dialogue.estOuvert(), false, 'le dialogue se ferme');
  };
  return { save, orch, frame, dialogue, aller, allume, finirDialogue };
}
const EXTINCTION = GAUCHE.maintien.extinction_ms;

{
  const b = banc();
  b.frame();
  assert.equal(b.orch.obtenirScene().id, SALLE_2.id);

  // Seul : allumé, puis éteint dès qu'on part.
  for (let n = 1; n <= PAIRE.explication.apres_extinctions; n += 1) {
    b.aller(GAUCHE);
    b.frame(etat({ interact: true }));
    assert.equal(b.allume(GAUCHE), true, 'INTERACT allume');
    b.frame(etat(), 2000);
    assert.equal(b.allume(GAUCHE), true, 'tenu par le héros : il reste');
    b.aller(null);
    b.frame(etat(), EXTINCTION / 2);
    assert.equal(b.allume(GAUCHE), true, 'le temps de voir qu\'il s\'éteint');
    b.frame(etat(), EXTINCTION);
    assert.equal(b.allume(GAUCHE), false, 'personne : il s\'éteint');
    if (n < PAIRE.explication.apres_extinctions) assert.equal(b.dialogue.estOuvert(), false, `pas d'explication après ${n}`);
  }
  assert.equal(b.dialogue.estOuvert(), true, 'le follet explique, après avoir vu le problème');
  assert.equal(b.save.flags[PAIRE.explication.flag], true, 'une fois par partie');
  b.finirDialogue();

  // RB près du levier allumé : le follet s'y pose et le tient.
  b.aller(GAUCHE);
  b.frame(etat({ interact: true }));
  b.frame(etat({ target_next: true }));
  const posé = b.orch.obtenirFollet();
  assert.equal(posé.etat, 'poste', 'RB pose le follet');
  assert.equal(posé.poste.id, GAUCHE.id);
  b.aller(DROITE);
  b.frame(etat(), EXTINCTION * 3);
  assert.equal(b.allume(GAUCHE), true, 'le follet tient le levier, le héros est loin');
  const f = b.orch.obtenirFollet();
  assert.ok(Math.hypot(f.x - centre(GAUCHE).x, f.y - centre(GAUCHE).y) < 2, 'et il y est, avec sa lumière');
  assert.equal(b.save.flags[PAIRE.flag_pose], undefined, 'un seul allumé : fermé');
  b.frame(etat({ interact: true }));
  assert.equal(b.allume(DROITE), true);
  assert.equal(b.save.flags[PAIRE.flag_pose], true, 'les deux à la fois : le passage s\'ouvre');

  // RB, n'importe où : il revient ; les leviers s'éteignent, le passage reste.
  b.aller(null);
  b.frame(etat({ target_next: true }));
  assert.equal(b.orch.obtenirFollet().etat, 'suivre', 'RB rappelle, loin du levier');
  b.frame(etat(), EXTINCTION * 2);
  assert.equal(b.allume(GAUCHE), false);
  assert.equal(b.allume(DROITE), false);
  assert.equal(b.save.flags[PAIRE.flag_pose], true, 'le passage reste ouvert');
  assert.equal(b.dialogue.estOuvert(), false, 'la paire résolue, les extinctions ne réexpliquent rien');

  // Posé, puis changer de salle : il revient.
  b.aller(GAUCHE);
  b.frame(etat({ interact: true }));
  b.frame(etat({ target_next: true }));
  assert.equal(b.orch.obtenirFollet().etat, 'poste');
  const retour = SALLE_2.portails.find((p) => !p.condition);
  const h = b.orch.obtenirHero();
  h.x = (retour.zone.x + 0.5) * T;
  h.y = (retour.zone.y + 0.5) * T;
  b.frame();
  assert.equal(b.orch.obtenirScene().id, retour.cible);
  assert.equal(b.orch.obtenirFollet().etat, 'suivre', 'changer de salle le rappelle');
  console.log('OK orchestrateur : extinction, explication, follet posé qui tient, passage ouvert qui le reste, rappel');
}

// Les descentes suivantes : le flag appris, le follet ne réexplique pas.
{
  const b = banc({ flagsSave: { [PAIRE.explication.flag]: true } });
  b.frame();
  for (let n = 0; n < PAIRE.explication.apres_extinctions + 1; n += 1) {
    b.aller(GAUCHE);
    b.frame(etat({ interact: true }));
    b.aller(null);
    b.frame(etat(), EXTINCTION + 16);
  }
  assert.equal(b.dialogue.estOuvert(), false, 'appris : pas de dialogue');
  console.log('OK descentes suivantes : même mécanisme, sans le dialogue');
}

// --- 5. Aucun id du palier dans le code système -----------------------------------
{
  const ids = [GAUCHE.id, DROITE.id, PAIRE.id, PAIRE.flag_pose, PAIRE.explication.flag, PAIRE.explication.dialogue, SALLE_2.id];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (leviers, paire, flags, dialogue, salle) dans le code système');
}

console.log('OK test_spec14_palier_e_deux_mains');

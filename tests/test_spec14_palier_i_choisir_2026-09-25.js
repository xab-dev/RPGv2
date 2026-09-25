// Contrat de `specs/14_annexe-1.md`, palier I (§4.9) : choisir ses stats, ses
// compétences et son follet.
//
// 1. `competences.js` : ranger une compétence la fait quitter son ancien
//    emplacement et REMPLACE celle qui occupait le nouveau (jamais d'échange) ;
//    une compétence qu'on vient d'apprendre se range dans son emplacement par
//    défaut s'il est libre, sinon dans le premier libre, sinon nulle part —
//    elle ne chasse jamais ce que le joueur a rangé.
// 2. La migration v8 -> v9 : la compétence du parchemin sur son emplacement
//    si son flag est posé, `{}` sinon — le champ est ÉCRIT dans les deux cas ;
//    les sauvegardes réelles de Xav (`prive/`) migrent sans perte.
// 3. Les données : le déblocage est une ligne d'ambiance qui attend la
//    compétence et pose le flag du choix ; la carte Follet l'attend, la carte
//    Stats aussi pour qu'on y choisisse.
// 4. Le vrai orchestrateur : le coffre range la compétence ; à la première
//    sortie, le follet parle et le choix s'ouvre ; « Tout reprendre » rend
//    chaque point dépensé (confirmé d'abord) ; la compétence se range en 3 et
//    B la lance, plus le 1 ; les cases du HUD suivent ; changer de follet
//    change tout de suite, sans toucher l'alignement, par un fondu court.
// 5. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que la page Stats se lise avec ses
// compétences, que le choix des emplacements se comprenne, que le fondu du
// follet soit joli, ni que tout ça se fasse à la manette, au clavier ET au
// doigt. Ça se joue dans Chrome (CHECKLIST_visuelle).

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire, migrer, VERSION_SCHEMA_COURANTE } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import {
  equiperCompetence, emplacementDe, rangerCompetenceApprise, estEmplacementCompetence, valeurCompetenceEn,
} from '../src/competences.js';
import { CAMP_HEROS } from '../src/projectiles.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// Tout est lu dans les données.
const COFFRE = donnees.puzzles.find((p) => p.type === 'coffre_parchemin');
const COMPETENCE = donnees.skills.find((c) => c.id === COFFRE.competence);
const SALLE_3 = donnees.scenes.find((s) => (s.interactifs || []).includes(COFFRE.id));
const SALLE_1 = donnees.scenes.find((s) => s.descente && s.nettoyage && (s.spawns || []).length > 1);
const EMPLACEMENTS = donnees.action_slots.filter(estEmplacementCompetence);
const CARTE_STATS = donnees.menus.flatMap((e) => e.cartes).find((c) => c.cible === 'ecran_stats');
const CARTE_FOLLET = donnees.menus.flatMap((e) => e.cartes).find((c) => c.cible === 'ecran_follet');
const DEBLOCAGE = donnees.ambiances.find((a) => a.flag === CARTE_FOLLET.condition);
const SORTIE = SALLE_3.portails.find((p) => !donnees.scenes.find((s) => s.id === p.cible).descente);

// --- 1. Ranger, remplacer, apprendre --------------------------------------------
{
  assert.equal(EMPLACEMENTS.length, 3, 'trois emplacements de compétence');
  const [e1, e2, e3] = EMPLACEMENTS.map((s) => s.id);
  assert.equal(estEmplacementCompetence(donnees.action_slots.find((s) => s.verb === 'attack')), false);

  let t = equiperCompetence({}, 'a', e1);
  assert.deepEqual(t, { [e1]: 'a' });
  t = equiperCompetence(t, 'a', e3);
  assert.deepEqual(t, { [e3]: 'a' }, 'elle quitte le 1 pour le 3');
  t = equiperCompetence(t, 'b', e1);
  t = equiperCompetence(t, 'b', e3);
  assert.deepEqual(t, { [e3]: 'b' }, 'b remplace a en 3 : a n\'est plus rangée, jamais échangée');
  assert.equal(emplacementDe(t, 'a'), null);
  assert.equal(emplacementDe(t, 'b'), e3);
  const gele = Object.freeze({ [e1]: 'a' });
  equiperCompetence(gele, 'b', e2);
  assert.deepEqual(gele, { [e1]: 'a' }, 'la table reçue n\'est jamais modifiée');

  const ids = [e1, e2, e3];
  assert.deepEqual(rangerCompetenceApprise({}, { id: 'a', emplacement: e2 }, ids), { [e2]: 'a' }, 'son emplacement par défaut, libre');
  assert.deepEqual(rangerCompetenceApprise({ [e2]: 'x' }, { id: 'a', emplacement: e2 }, ids), { [e2]: 'x', [e1]: 'a' },
    'occupé : le premier libre, sans chasser ce que le joueur a rangé');
  assert.deepEqual(rangerCompetenceApprise({ [e1]: 'x', [e2]: 'y', [e3]: 'z' }, { id: 'a', emplacement: e2 }, ids),
    { [e1]: 'x', [e2]: 'y', [e3]: 'z' }, 'tout est pris : rangée nulle part');
  assert.deepEqual(rangerCompetenceApprise({ [e3]: 'a' }, { id: 'a', emplacement: e1 }, ids), { [e3]: 'a' }, 'déjà rangée : rien ne bouge');
  assert.equal(valeurCompetenceEn(e3), `competence_en_${e3}`);
  console.log('OK ranger quitte l\'ancien emplacement et remplace sans échanger ; apprendre range sans rien chasser');
}

// --- 2. La migration v8 -> v9 ---------------------------------------------------------
{
  assert.equal(VERSION_SCHEMA_COURANTE, 9);
  assert.deepEqual(saveNeuve().hero.competences, {}, 'une partie neuve n\'a rien d\'équipé');
  const v8 = (flags) => {
    const s = { ...saveNeuve(), schema_version: 8, flags };
    s.hero = { ...s.hero };
    delete s.hero.competences;
    return s;
  };
  const lu = migrer(v8({ [COMPETENCE.flag]: true }));
  assert.equal(lu.schema_version, 9);
  assert.deepEqual(lu.hero.competences, { [COMPETENCE.emplacement]: COMPETENCE.id }, 'le parchemin lu : la compétence là où elle se lançait');
  const pasLu = migrer(v8({}));
  assert.ok(Object.prototype.hasOwnProperty.call(pasLu.hero, 'competences'), 'le champ est ÉCRIT, pas sous-entendu');
  assert.deepEqual(pasLu.hero.competences, {});

  const dossier = path.join(RACINE, 'prive', 'sauvegardes');
  const present = await fs.stat(dossier).then(() => true, () => false);
  if (!present) {
    console.log('-- NON ÉPROUVÉ : prive/sauvegardes/ absent, la migration 8 -> 9 n\'a pas été jouée sur les sauvegardes réelles');
  } else {
    const fichiers = (await fs.readdir(dossier)).filter((f) => f.endsWith('.json'));
    assert.ok(fichiers.length > 0);
    for (const fichier of fichiers) {
      const brut = JSON.parse(await fs.readFile(path.join(dossier, fichier), 'utf8'));
      const payload = brut.payload || brut;
      const migre = migrer(payload);
      const avant = migrer(payload, Math.max(8, payload.schema_version));
      assert.equal(migre.schema_version, 9, `${fichier} : migrée`);
      const attendu = (payload.flags || {})[COMPETENCE.flag] ? { [COMPETENCE.emplacement]: COMPETENCE.id } : {};
      assert.deepEqual(migre.hero.competences, attendu, `${fichier} : ce qu'elle avait appris, rangé`);
      // Sans perte (`D-15`) : tout le reste est celui de la v8.
      const { competences, ...heroSansChamp } = migre.hero;
      assert.deepEqual(heroSansChamp, avant.hero, `${fichier} : le héros, intact`);
      assert.deepEqual(migre.inventaire, avant.inventaire, `${fichier} : la poche`);
      assert.deepEqual(migre.flags, avant.flags, `${fichier} : les flags`);
    }
    console.log(`OK les ${fichiers.length} sauvegardes réelles migrent en v9 sans perte`);
  }
  console.log('OK migration v8 -> v9 : la compétence du parchemin rangée si elle était apprise, {} sinon');
}

// --- 3. Les données ----------------------------------------------------------------------
{
  assert.ok(DEBLOCAGE, 'une ligne d\'ambiance pose le flag qu\'attend la carte Follet');
  assert.equal(DEBLOCAGE.condition, COMPETENCE.flag, 'elle attend la compétence du parchemin');
  assert.ok(DEBLOCAGE.scenes.includes(SORTIE.cible), 'elle se dit dehors, là où mène la sortie de l\'Annexe');
  assert.equal(CARTE_STATS.choisir_si, DEBLOCAGE.flag, 'on choisit dans Stats une fois débloqué');
  assert.ok(donnees.flags.some((f) => f.id === DEBLOCAGE.flag));
  for (const slot of EMPLACEMENTS) {
    assert.deepEqual(slot.visible_si, { valeur: valeurCompetenceEn(slot.id), min: 1 },
      `${slot.id} : sa case s'affiche quand une compétence y est rangée`);
  }
  // Une carte mal déclarée tombe au démarrage.
  const avec = (modifier) => {
    const c = structuredClone(donnees);
    modifier(c.menus.flatMap((e) => e.cartes).find((x) => x.cible === 'ecran_stats'));
    return validerCatalogues(c);
  };
  assert.ok(avec((carte) => { carte.choisir_si = 'flag_absent'; }).some((e) => e.includes('choisir_si')));
  assert.ok(avec((carte) => { carte.icone_reprendre = 'visuel_absent'; }).some((e) => e.includes('icone_reprendre')));
  console.log('OK données : le déblocage attend la compétence, la carte Follet et le choix dans Stats l\'attendent');
}

// --- 4. L'orchestrateur ---------------------------------------------------------------
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
function banc({ scene = SALLE_3, flagsSave = {}, competences = {}, position = null, points = {}, libres = 0 } = {}) {
  const save = saveNeuve();
  save.hero.scene = scene.id;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 30;
  save.hero.alignement = -2;
  save.hero.stats.points = { ...points };
  save.hero.points_stats_libres = libres;
  save.hero.competences = { ...competences };
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true, ...flagsSave };
  const p = position || scene.spawn;
  save.hero.x = (p.x + 0.5) * scene.tile_size;
  save.hero.y = (p.y + 0.5) * scene.tile_size + (p.dy || 0);
  let prochain = etat();
  const traces = { choix: [], confirmations: [], fermetures: 0 };
  const menu = {
    estOuvert: () => false, indicesAffiches: () => false, rafraichirIndices() {}, rafraichirStats() {},
    traiterInput() {}, ouvrir() {}, fermer() { traces.fermetures += 1; },
    empilerChoix(ecran) { traces.choix.push(ecran); },
    demanderConfirmation(carte) { traces.confirmations.push(carte); },
  };
  const dialogue = creerDialogue();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue, menu,
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'manette' },
    lireContactsTactiles: () => [],
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  return { save, orch, frame, traces, dialogue };
}
const INDEX_ESPRIT = registre.tous('stats').findIndex((s) => s.id === 'stat_esprit');

// Le coffre range la compétence ; le parchemin nomme le bouton de SON emplacement.
{
  const b = banc({
    flagsSave: { [SALLE_3.nettoyage.flag]: true },
    position: { x: COFFRE.position.x, y: COFFRE.position.y, dy: 18 },
  });
  b.frame();
  b.frame(etat({ interact: true }));
  assert.deepEqual(b.save.hero.competences, { [COMPETENCE.emplacement]: COMPETENCE.id }, 'apprise, elle se range d\'elle-même');
  console.log('OK le coffre apprend la compétence et la range dans son emplacement par défaut');
}

// La première sortie : le follet parle, le choix s'ouvre.
{
  // Le Gardien vaincu, la porte de sortie ouverte (le levier-récompense).
  const b = banc({
    scene: SALLE_3,
    flagsSave: { [COMPETENCE.flag]: true, [SALLE_3.nettoyage.flag]: true, [SORTIE.condition]: true },
  });
  b.frame();
  assert.equal(b.save.flags[DEBLOCAGE.flag], undefined, 'dans l\'Annexe, pas encore');
  const t = SALLE_3.tile_size;
  const hero = b.orch.obtenirHero();
  hero.x = (SORTIE.zone.x + 0.5) * t;
  hero.y = (SORTIE.zone.y + 0.5) * t;
  b.frame();
  for (let i = 0; i < 200 && b.save.flags[DEBLOCAGE.flag] === undefined; i += 1) b.frame();
  assert.equal(b.orch.obtenirScene().id, SORTIE.cible, 'dehors');
  assert.equal(b.save.flags[DEBLOCAGE.flag], true, 'le choix est débloqué, pour toujours');
  assert.equal(b.dialogue.estOuvert(), true, 'et le follet le dit');
  console.log('OK à la première sortie, le follet annonce le choix et son flag est posé');
}

// Stats : sans le déblocage, on regarde ; avec, on choisit.
{
  const points = { stat_force: 5, stat_esprit: 3 };
  const b = banc({
    scene: SALLE_1, flagsSave: { [COMPETENCE.flag]: true }, points, libres: 2,
    competences: { [COMPETENCE.emplacement]: COMPETENCE.id },
  });
  b.frame();
  const stats = registre.tous('stats');
  let entrees = b.orch.obtenirEntreesStats({ choisir: false });
  assert.equal(entrees.length, stats.length + 1, 'quatre stats, puis une compétence apprise');
  const tuileComp = entrees[stats.length];
  assert.equal(tuileComp.titre, i18n.t(COMPETENCE.label_key));
  assert.equal(tuileComp.groupe, i18n.t('menu.stats_groupe_competences'), 'sous les stats, dans son groupe');
  assert.equal(tuileComp.marque, true, 'rangée : la tuile porte le repère');
  assert.equal(tuileComp.libelleAction, null, 'avant le déblocage, on ne range pas');
  assert.ok(entrees.slice(0, stats.length).every((e) => !e.actionSecondaire), 'ni ne reprend');
  assert.ok(tuileComp.lignes.includes(i18n.t(COMPETENCE.description_key)), 'la fiche dit ce qu\'elle fait');
  const ligneRangee = i18n.t('competence.fiche_rangee', { n: 1, glyphe: 'X' });
  assert.ok(tuileComp.lignes.includes(ligneRangee), 'et où elle est rangée, avec son bouton');
  assert.ok(tuileComp.lignes.some((l) => l.includes('1 = X') && l.includes('3 = B')), 'et le bouton de chaque emplacement');

  // L'Esprit se VOIT sur la charge : un point de plus, une charge plus courte.
  const prefixeCharge = i18n.t('competence.fiche_charge').split('{')[0];
  const charge = (liste) => liste[stats.length].lignes.find((l) => l.startsWith(prefixeCharge));
  const avant = charge(entrees);
  entrees[INDEX_ESPRIT].action();
  entrees = b.orch.obtenirEntreesStats({ choisir: false });
  assert.notEqual(charge(entrees), avant, 'un point d\'Esprit raccourcit la charge affichée');

  // Tout reprendre : confirmé d'abord, puis chaque point dépensé redevient libre.
  entrees = b.orch.obtenirEntreesStats({ choisir: true, iconeReprendre: 'visuel_icone_menu_danger' });
  const libresAvant = b.save.hero.points_stats_libres;
  const depenses = Object.values(b.save.hero.stats.points).reduce((a, n) => a + n, 0);
  assert.equal(entrees[0].libelleActionSecondaire, i18n.t('menu.stats_reprendre'));
  entrees[0].actionSecondaire();
  assert.equal(b.traces.confirmations.length, 1, 'un danger : la confirmation d\'abord');
  assert.deepEqual(b.save.hero.stats.points, { stat_force: 5, stat_esprit: 4 }, 'rien n\'a bougé avant « Oui »');
  const confirmation = b.traces.confirmations[0];
  assert.equal(confirmation.apres, 'retour', 'puis retour à la page Stats');
  assert.equal(confirmation.icone, 'visuel_icone_menu_danger', 'la silhouette vient des données');
  confirmation.faire();
  assert.deepEqual(b.save.hero.stats.points, {}, 'les stats reviennent à leur base');
  assert.equal(b.save.hero.points_stats_libres, libresAvant + depenses, 'tous les points dépensés sont rendus');
  const hero = b.orch.obtenirHero();
  b.frame();
  assert.ok(hero.pv <= hero.pvMax, 'les PV suivent la Vitalité');
  entrees = b.orch.obtenirEntreesStats({ choisir: true });
  assert.ok(!entrees[0].actionSecondaire, 'plus rien à reprendre : l\'action se retire');
  console.log('OK Stats : la compétence en carte sous les stats (charge selon l\'Esprit) ; tout reprendre, confirmé, rend chaque point');

  // Ranger en 3 : B la lance, le 1 plus.
  entrees[stats.length].action();
  assert.equal(b.traces.choix.length, 1, 'A ouvre le choix des emplacements, en cartes');
  const choix = b.traces.choix[0];
  assert.equal(choix.cartes.length, EMPLACEMENTS.length);
  assert.equal(choix.cartes[0].titre, i18n.t('competence.emplacement', { n: 1, glyphe: 'X' }), 'chaque carte dit son bouton');
  assert.equal(choix.cartes[0].phrase, i18n.t('competence.emplacement_ici'));
  assert.equal(choix.cartes[2].phrase, i18n.t('competence.emplacement_libre'));
  assert.ok(choix.cartes.every((c) => c.apres === 'retour'), 'puis retour à Stats');
  choix.cartes[2].faire();
  assert.deepEqual(b.save.hero.competences, { [EMPLACEMENTS[2].id]: COMPETENCE.id }, 'elle quitte le 1 pour le 3');
  assert.deepEqual(b.orch.obtenirVerbesActions(), ['attack', EMPLACEMENTS[2].verb], 'la case du 1 s\'en va, celle du 3 vient');

  const vivants = () => b.orch.obtenirMonstres().filter((m) => !m.mort);
  const cible = vivants()[0];
  hero.x = cible.x + 40;
  hero.y = cible.y;
  hero.pv = hero.pvMax;
  const etatComp = b.orch.obtenirEtatsCompetences()[COMPETENCE.id];
  etatComp.chargeMs = 1e9;
  etatComp.rechargeMs = 0;
  b.frame(etat({ [EMPLACEMENTS[0].verb]: true }));
  const tirs = () => b.orch.obtenirProjectiles().filter((p) => p.camp === CAMP_HEROS).length;
  assert.equal(tirs(), 0, 'le bouton du 1 ne lance plus rien');
  b.frame(etat({ [EMPLACEMENTS[2].verb]: true }));
  assert.equal(tirs(), 1, 'B la lance');
  console.log('OK ranger en 3 : la case suit, B lance la compétence, X ne lance plus rien');
}

// Changer de follet : tout de suite, sans toucher l'alignement, par un fondu court.
{
  const b = banc({ scene: SALLE_1, flagsSave: { [COMPETENCE.flag]: true, [DEBLOCAGE.flag]: true } });
  b.frame();
  const entrees = b.orch.obtenirEntreesFollet();
  assert.equal(entrees.length, donnees.companions.length, 'les follets du catalogue');
  const actuel = entrees.find((e) => e.marque);
  assert.equal(actuel.titre, i18n.t(registre.obtenir('companions', 'comp_follet_eau').label_key), 'celui qui accompagne porte le repère');
  assert.equal(actuel.libelleAction, null, 'on ne choisit pas celui qu\'on a');
  const autreIndex = entrees.findIndex((e) => !e.marque);
  const autre = donnees.companions[autreIndex];
  const alignement = b.save.hero.alignement;
  entrees[autreIndex].action();
  assert.equal(b.save.hero.companion, autre.id, 'la sauvegarde suit');
  assert.equal(b.orch.obtenirFollet().companionId, autre.id, 'le follet du jeu aussi, tout de suite');
  assert.equal(b.save.hero.alignement, alignement, 'l\'alignement ne bouge pas : c\'est une stat du héros');
  assert.equal(b.traces.fermetures, 1, 'le menu se ferme : on le voit arriver');
  assert.ok(b.orch.obtenirChangementFollet(), 'le fondu commence');
  for (let i = 0; i < 60 && b.orch.obtenirChangementFollet(); i += 1) b.frame();
  assert.equal(b.orch.obtenirChangementFollet(), null, 'et finit vite');
  console.log('OK changer de follet : sauvegarde et follet suivent tout de suite, alignement intact, fondu court');
}

// --- 5. Aucun id du palier dans le code système ------------------------------------------
{
  const ids = [DEBLOCAGE.id, DEBLOCAGE.flag, DEBLOCAGE.dialogue, CARTE_FOLLET.id, CARTE_FOLLET.icone, CARTE_STATS.icone_reprendre];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (déblocage, son flag, son dialogue, la carte Follet) dans le code système');
}

console.log('OK test_spec14_palier_i_choisir');

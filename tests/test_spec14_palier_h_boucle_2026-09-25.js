// Contrat de `specs/14_annexe-1.md`, palier H : la boucle.
//
// 1. `fondu_scene.js` : l'écran descend au noir, la scène change UNE fois, au
//    plus noir, puis l'écran remonte.
// 2. Le démarrage refuse une récompense de levier, un objet-monnaie et un
//    fondu de portail mal déclarés.
// 3. Les données : le levier-récompense apparaît avec la victoire, dans la
//    salle du Gardien ; il ouvre la porte de sortie (un flag de la descente) ;
//    sa récompense tombe sur une case libre ; la sortie passe par un fondu.
// 4. Le vrai orchestrateur, TROIS DESCENTES D'AFFILÉE, par la stèle, portes
//    des salles 1 et 2 forcées : à chaque fois, le levier dépose un éclat au
//    sol (un seul, même si on l'actionne deux fois), l'éclat ramassé compte
//    parmi les éclats sans entrer en poche ni rapporter d'XP, la porte s'ouvre,
//    la sortie passe par le noir et débouche près de la stèle rouge. Rien ne se
//    rejoue : ni Zéros, ni le Gardien, ni le parchemin.
// 5. Aucun id du palier dans le code système.
//
// CE QUE CE FICHIER NE PROUVE PAS : que l'éclat se voie au pied du levier, que
// le fondu soit agréable, que le rendement (un éclat par descente, plus ceux
// des cracheurs) donne envie de revenir. Ça se joue dans Chrome.

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
import { creerFondu, avancerFondu, alphaFondu } from '../src/fondu_scene.js';
import { chargerScene } from '../src/scene.js';

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
const LEVIER = donnees.puzzles.find((p) => p.type === 'levier' && p.recompense);
assert.ok(LEVIER, 'un levier-récompense au catalogue');
const RECOMPENSE = donnees.items.find((i) => i.id === LEVIER.recompense.item);
const SALLE_3 = donnees.scenes.find((s) => (s.interactifs || []).includes(LEVIER.id));
const SORTIE = SALLE_3.portails.find((p) => p.condition === LEVIER.flag_pose);
const SURFACE = SORTIE.cible;
const STELE = donnees.puzzles.find((p) => p.type === 'stele' && p.descente);
const COFFRE = donnees.puzzles.find((p) => p.type === 'coffre_parchemin');
const COMPETENCE = donnees.skills.find((c) => c.id === COFFRE.competence);
const DESCENTE = donnees.scenes.filter((s) => s.descente);
// Les portes des salles 1 et 2 (celles que le test force) : les portails qui
// avancent, hors de la salle du Gardien.
const PASSAGES = DESCENTE.filter((s) => s.id !== SALLE_3.id)
  .flatMap((s) => s.portails.filter((p) => typeof p.condition === 'string').map((p) => p.condition));

// --- 1. Le fondu ---------------------------------------------------------------
{
  let f = creerFondu(1000, { cible: 'x' });
  assert.equal(alphaFondu(f), 0);
  let pas = avancerFondu(f, 250);
  assert.equal(pas.changerMaintenant, false);
  assert.equal(alphaFondu(pas.fondu), 0.5, 'il descend au noir');
  pas = avancerFondu(pas.fondu, 250);
  assert.equal(pas.changerMaintenant, true, 'au plus noir, la scène change');
  assert.equal(alphaFondu(pas.fondu), 1);
  pas = avancerFondu(pas.fondu, 250);
  assert.equal(pas.changerMaintenant, false, 'une seule fois');
  assert.equal(alphaFondu(pas.fondu), 0.5, 'puis il remonte');
  pas = avancerFondu(pas.fondu, 250);
  assert.equal(pas.termine, true);
  f = creerFondu(1000, {});
  pas = avancerFondu(f, 5000);
  assert.ok(pas.changerMaintenant && pas.termine, 'une frame très longue change ET finit : rien n\'est sauté');
  console.log('OK fondu_scene.js : au noir, la scène change une fois, puis l\'écran remonte');
}

// --- 2. Le démarrage ---------------------------------------------------------------
{
  const erreursDe = (modifier) => { const c = structuredClone(donnees); modifier(c); return validerCatalogues(c); };
  const levier = (c) => c.puzzles.find((p) => p.id === LEVIER.id);
  assert.ok(erreursDe((c) => { levier(c).recompense.item = 'item_absent'; }).some((e) => e.includes('recompense.item')));
  assert.ok(erreursDe((c) => { levier(c).recompense.quantite = 0; }).some((e) => e.includes('recompense.quantite')));
  assert.ok(erreursDe((c) => { delete levier(c).recompense.decalage; }).some((e) => e.includes('recompense.decalage')));
  assert.ok(erreursDe((c) => { c.items.find((i) => i.id === RECOMPENSE.id).monnaie = 'monnaie_absente'; }).some((e) => e.includes('monnaie')));
  assert.ok(erreursDe((c) => { c.scenes.find((s) => s.id === SALLE_3.id).portails.find((p) => p.cible === SURFACE).fondu_ms = -1; })
    .some((e) => e.includes('fondu_ms')));
  console.log('OK démarrage : récompense, objet-monnaie et fondu mal déclarés refusés');
}

// --- 3. Les données -------------------------------------------------------------------
{
  assert.equal(LEVIER.visible_si, SALLE_3.nettoyage.flag, 'il apparaît avec la victoire sur le Gardien');
  assert.ok(SALLE_3.descente.flags.includes(LEVIER.flag_pose), 'il pose un flag de la descente : une fois par descente');
  assert.ok(SALLE_3.portes.some((p) => p.flag === LEVIER.flag_pose), 'ce flag ouvre la porte de sortie');
  assert.ok(RECOMPENSE.monnaie, 'sa récompense est une monnaie : l\'éclat');
  assert.ok(SORTIE.fondu_ms > 0, 'la sortie passe par un fondu (Q-153)');
  assert.ok(DESCENTE.filter((s) => s.id !== SALLE_3.id).every((s) => s.portails.every((p) => !p.fondu_ms)), 'entre les salles, aucun fondu');
  const scene = chargerScene(registre, SALLE_3.id);
  const tx = LEVIER.position.x + LEVIER.recompense.decalage.x;
  const ty = LEVIER.position.y + LEVIER.recompense.decalage.y;
  assert.equal(scene.estSolideAuPoint((tx + 0.5) * SALLE_3.tile_size, (ty + 0.5) * SALLE_3.tile_size, () => false), false, 'l\'éclat tombe sur une case libre');
  console.log('OK données : le levier de la salle du Gardien, la porte, l\'éclat sur une case libre, le fondu de la sortie seulement');
}

// --- 4. Trois descentes d'affilée -------------------------------------------------------
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
{
  // Un joueur qui a tout fait une fois : l'indice déchiffré, Zéros rencontré,
  // l'explication des deux mains entendue, le Gardien vaincu, le parchemin lu.
  const persistants = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_chapitre_1_vu: true,
    [STELE.descente.flag_requis]: true,
    [SALLE_3.nettoyage.flag]: true,
    [COMPETENCE.flag]: true,
  };
  for (const s of DESCENTE) if (s.rencontre) persistants[s.rencontre.flag_rencontre] = true;
  for (const p of donnees.puzzles) if (p.explication) persistants[p.explication.flag] = true;
  for (const a of donnees.ambiances) if (JSON.stringify(a.condition || '').includes('a_portee')) persistants[a.flag] = true;
  // Palier I : le déblocage du choix, qu'on entend à la première sortie après
  // le parchemin — déjà entendu, lui aussi.
  for (const a of donnees.ambiances) if (JSON.stringify(a.condition || '').includes(COMPETENCE.flag)) persistants[a.flag] = true;

  const save = saveNeuve();
  save.hero.scene = STELE.descente.scene;
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 30;
  save.flags = { ...persistants };
  let prochain = etat();
  const dialogue = creerDialogue();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue,
    menu: { estOuvert: () => false, indicesAffiches: () => false, rafraichirIndices() {}, traiterInput() {}, ouvrir() {}, fermer() {} },
    input: { maj: () => { const e = prochain; prochain = etat(); return e; }, peripheriqueActif: () => 'manette' },
    lireContactsTactiles: () => [],
    flagsForces: PASSAGES,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  const hero = orch.obtenirHero();
  const placer = (sceneId, tx, ty, dy = 0) => {
    const t = registre.obtenir('scenes', sceneId).tile_size;
    hero.x = (tx + 0.5) * t;
    hero.y = (ty + 0.5) * t + dy;
  };
  const eclatsAuSol = () => orch.obtenirObjetsJetes().filter((o) => o.item === RECOMPENSE.id);

  // On part de la surface, au pied de la stèle.
  frame();
  let eclats = save.inventaire.eclats;
  for (let descente = 1; descente <= 3; descente += 1) {
    // Remonter à la surface, au pied de la stèle bleue, et descendre.
    if (orch.obtenirScene().id !== SURFACE) {
      const escalier = registre.obtenir('scenes', STELE.descente.scene).portails.find((p) => p.cible === SURFACE);
      placer(STELE.descente.scene, escalier.zone.x, escalier.zone.y);
      frame();
    }
    assert.equal(orch.obtenirScene().id, SURFACE);
    placer(SURFACE, STELE.position.x, STELE.position.y + 0.6);
    frame(etat({ interact: true }));
    frame(etat(), STELE.armement_ms);
    frame(etat({ attack: true }));
    frame(etat(), 1000);
    assert.equal(orch.obtenirScene().id, STELE.descente.scene, `descente ${descente} : la salle 1`);
    assert.equal(save.flags[LEVIER.flag_pose], undefined, 'la porte de sortie est refermée');

    // Traverser jusqu'à la salle du Gardien, portes forcées.
    let ici = STELE.descente.scene;
    while (ici !== SALLE_3.id) {
      const avancer = registre.obtenir('scenes', ici).portails.find((p) => typeof p.condition === 'string');
      placer(ici, avancer.zone.x, avancer.zone.y);
      frame();
      assert.equal(orch.obtenirScene().id, avancer.cible);
      ici = avancer.cible;
    }
    frame();
    assert.equal(orch.obtenirRencontre(), null, 'Zéros ne revient pas');
    assert.equal(orch.obtenirBarreBoss(), null, 'le Gardien non plus');
    assert.equal(orch.obtenirMonstres().filter((m) => !m.mort).length, 0, 'la salle du Gardien est vide');

    // Le coffre ouvert ne se rouvre pas.
    placer(SALLE_3.id, COFFRE.position.x, COFFRE.position.y, 18);
    frame(etat({ interact: true }));
    assert.equal(orch.obtenirVueParchemin(), null, 'le parchemin ne se rejoue pas');

    // Le levier : un éclat au sol, la porte ouverte. Deux fois : un seul éclat.
    const auSolAvant = eclatsAuSol().length;
    placer(SALLE_3.id, LEVIER.position.x, LEVIER.position.y, 12);
    frame(etat({ interact: true }));
    frame(etat({ interact: true }));
    assert.equal(eclatsAuSol().length, auSolAvant + LEVIER.recompense.quantite, `descente ${descente} : un éclat au sol, pas deux`);
    assert.equal(save.flags[LEVIER.flag_pose], true, 'la porte s\'ouvre');
    assert.equal(save.inventaire.eclats, eclats, 'pas encore ramassé : rien de compté');

    // Le ramasser : il compte parmi les éclats, sans poche ni XP.
    const xpAvant = save.hero.xp;
    const pocheAvant = JSON.stringify(save.inventaire.items);
    placer(SALLE_3.id, LEVIER.position.x + LEVIER.recompense.decalage.x, LEVIER.position.y + LEVIER.recompense.decalage.y, 8);
    frame(etat({ interact: true }));
    assert.equal(save.inventaire.eclats, eclats + 1, 'ramassé, il rejoint les éclats');
    assert.equal(eclatsAuSol().length, auSolAvant, 'il n\'est plus au sol');
    assert.equal(JSON.stringify(save.inventaire.items), pocheAvant, 'il n\'entre pas en poche');
    assert.equal(save.hero.xp, xpAvant, 'et ne rapporte aucune XP');
    eclats = save.inventaire.eclats;

    // La sortie : par le noir, près de la stèle rouge.
    placer(SALLE_3.id, SORTIE.zone.x, SORTIE.zone.y);
    frame();
    assert.ok(orch.obtenirFonduScene(), 'la sortie lance le fondu');
    assert.equal(orch.uiOuverteMaintenant(), true, 'le jeu est gelé pendant le fondu');
    assert.equal(orch.obtenirScene().id, SALLE_3.id, 'la scène ne change pas tout de suite');
    for (let i = 0; i < 200 && orch.obtenirFonduScene(); i += 1) frame();
    assert.equal(orch.obtenirScene().id, SURFACE, `descente ${descente} : dehors`);
    const t = registre.obtenir('scenes', SURFACE).tile_size;
    assert.ok(Math.abs(hero.x - (SORTIE.spawn.x + 0.5) * t) < t && Math.abs(hero.y - (SORTIE.spawn.y + 0.5) * t) < t, 'au point de sortie');
  }
  console.log('OK trois descentes d\'affilée : un éclat chacune, ramassé sans poche ni XP ; la sortie par le noir ; rien ne se rejoue');
}

// --- 5. Aucun id du palier dans le code système -----------------------------------
{
  const ids = [LEVIER.id, RECOMPENSE.id, LEVIER.flag_pose];
  const dossiers = [path.join(RACINE, 'src'), path.join(RACINE, 'src', 'ui'), path.join(RACINE, 'src', 'input')];
  for (const dossier of dossiers) {
    for (const nom of (await fs.readdir(dossier)).filter((f) => f.endsWith('.js'))) {
      const code = (await fs.readFile(path.join(dossier, nom), 'utf8')).split('\n')
        .filter((l) => !l.trim().startsWith('//')).join('\n');
      for (const id of ids) assert.ok(!code.includes(id), `${nom} cite "${id}" hors commentaire`);
    }
  }
  console.log('OK aucun id du palier (levier-récompense, éclat, flag de la sortie) dans le code système');
}

console.log('OK test_spec14_palier_h_boucle');

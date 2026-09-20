// specs/07_chaos-nocturne.md, PALIER C : « un domaine, pas un piquet ».
//
// Les cinq règles du §2.3, chacune vérifiée sur la machine à états PURE
// (déterministe, rapide) puis, pour ce qui ne se voit qu'en jeu, sur
// l'orchestrateur réel :
//   1. errance dans le domaine, jamais immobile ;
//   2. poursuite bornée depuis le point de REPÉRAGE, pas de la naissance ;
//   3. désintérêt de quelques secondes après un abandon ;
//   4. demi-tour en lisière de zone sûre — condition sur la position DU
//      MONSTRE — puis éloignement, jamais planté à la bordure ;
//   5. anti-blocage : contre un mur, il change d'idée après blocage_ms.
// Plus : mort du héros de nuit -> retour Grotte, cibles lâchées.
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
import { PHASES_CYCLE } from '../src/daynight.js';
import { rectanglesDeZone, estEnZoneSurePx } from '../src/spawns.js';
import {
  creerComportement, avancerComportement, ETAT_ERRANCE, ETAT_POURSUITE, ETAT_DESINTERET,
} from '../src/comportement_monstres.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const TABLE = donnees.spawns.find((s) => s.id === 'spawn_chaos_nord_est');
const TUILE = 32;
const FRAME_MS = 16;

// Bac à sable pour la machine pure : pas de zone sûre, pas de mur, un point
// d'errance fixe — on n'y teste qu'une règle à la fois.
function contexte(monstre, hero, options = {}) {
  return {
    deltaMs: FRAME_MS,
    monstre,
    hero,
    table: TABLE,
    tileSize: TUILE,
    distanceParcouruePx: options.distanceParcouruePx === undefined ? 5 : options.distanceParcouruePx,
    estEnZoneSure: options.estEnZoneSure || (() => false),
    tirerPointDomaine: options.tirerPointDomaine || (() => ({ x: monstre.x + 200, y: monstre.y })),
    alea: options.alea || (() => 0.5),
  };
}

// --- 1. Errance : il bouge, et il reste chez lui -------------------------
{
  let c = creerComportement();
  assert.equal(c.etat, ETAT_ERRANCE);
  const monstre = { x: 5000, y: 300 };
  const heroLoin = { x: 0, y: 5000 };
  let pauses = 0;
  let buts = 0;
  for (let i = 0; i < 400; i += 1) {
    const r = avancerComportement(c, contexte(monstre, heroLoin));
    c = r.comportement;
    if (r.but) {
      buts += 1;
      assert.equal(r.facteurVitesse, TABLE.errance.facteur_vitesse, 'il erre à vitesse réduite');
      // Il avance vers son but (on le déplace un peu, comme le ferait le jeu).
      monstre.x += Math.sign(r.but.x - monstre.x) * 4;
    } else {
      pauses += 1;
    }
  }
  assert.ok(buts > 0, 'il se donne des destinations');
  assert.ok(pauses > 0, 'et il marque des pauses');
  assert.equal(c.etat, ETAT_ERRANCE, 'sans joueur en vue, il reste en errance');
  console.log(`OK errance : ${buts} frames en marche, ${pauses} en pause, à ${TABLE.errance.facteur_vitesse} de sa vitesse`);
}

// --- 2. Poursuite bornée depuis le point de repérage ---------------------
{
  let c = creerComportement();
  const monstre = { x: 5000, y: 300 };
  // Le joueur entre dans le champ de détection : repérage.
  const hero = { x: monstre.x + TABLE.detection_tuiles * TUILE - 10, y: 300 };
  let r = avancerComportement(c, contexte(monstre, hero));
  c = r.comportement;
  assert.equal(c.etat, ETAT_POURSUITE, 'il repère le joueur à portée de détection');
  assert.ok(r.reperage, 'la frame du repérage est signalée');
  assert.equal(c.reperageX, monstre.x, 'le point de repérage est SA position, pas celle du joueur');
  assert.equal(r.facteurVitesse, 1, 'en poursuite, il court vraiment');

  // Le joueur fuit en ligne droite ; le monstre suit.
  let framesPoursuite = 0;
  let abandon = null;
  for (let i = 0; i < 2000 && !abandon; i += 1) {
    hero.x += 3;
    monstre.x += 2; // il court, un peu moins vite que le fuyard
    r = avancerComportement(c, contexte(monstre, hero));
    c = r.comportement;
    if (r.abandon) abandon = { x: monstre.x };
    else framesPoursuite += 1;
  }
  assert.ok(abandon, 'il finit par lâcher');
  const parcourue = Math.abs(abandon.x - 5000) / TUILE;
  assert.ok(
    Math.abs(parcourue - TABLE.poursuite_max_tuiles) < 1,
    `abandon à ${parcourue.toFixed(1)} tuiles du point de repérage (attendu ${TABLE.poursuite_max_tuiles})`,
  );
  assert.equal(c.etat, ETAT_DESINTERET);

  // ...et il ne re-cible pas pendant desinteret_ms, même collé au joueur.
  let ecoule = 0;
  while (ecoule < TABLE.desinteret_ms - FRAME_MS) {
    r = avancerComportement(c, contexte(monstre, { x: monstre.x + 5, y: monstre.y }));
    c = r.comportement;
    ecoule += FRAME_MS;
    assert.notEqual(c.etat, ETAT_POURSUITE, `re-ciblage après seulement ${ecoule} ms de désintérêt`);
  }
  // Une fois le compte écoulé, il repère de nouveau.
  for (let i = 0; i < 3; i += 1) {
    r = avancerComportement(c, contexte(monstre, { x: monstre.x + 5, y: monstre.y }));
    c = r.comportement;
  }
  assert.equal(c.etat, ETAT_POURSUITE, 'passé le désintérêt, il redevient sensible');
  console.log(`OK poursuite bornée à ${TABLE.poursuite_max_tuiles} tuiles du repérage, puis ${TABLE.desinteret_ms} ms de désintérêt`);
}

// --- 3. Demi-tour en lisière de zone sûre --------------------------------
{
  // Une zone sûre à droite de x = 6000. Le joueur s'y réfugie.
  const estEnZoneSure = (x) => x >= 6000;
  let c = creerComportement();
  const monstre = { x: 5900, y: 300 };
  // Dans la zone sûre ET à portée de détection (8 tuiles = 256 px) : c'est le
  // cas qui compte, celui où le monstre VEUT y aller.
  const hero = { x: 6100, y: 300 };

  // Il le repère (la détection ne regarde pas la zone sûre)...
  let r = avancerComportement(c, contexte(monstre, hero, { estEnZoneSure }));
  c = r.comportement;
  // ...mais dès qu'un pas l'y mènerait, il renonce.
  let demiTour = false;
  for (let i = 0; i < 400 && !demiTour; i += 1) {
    r = avancerComportement(c, contexte(monstre, hero, { estEnZoneSure }));
    c = r.comportement;
    if (r.demiTour) demiTour = true;
    else if (r.but) monstre.x += Math.sign(r.but.x - monstre.x) * 4;
    assert.ok(!estEnZoneSure(monstre.x), `le monstre est entré en zone sûre (x=${monstre.x})`);
  }
  assert.ok(demiTour, 'il fait demi-tour en lisière');
  assert.equal(c.etat, ETAT_DESINTERET, 'le demi-tour vaut désintérêt (règle 3)');

  // Et il s'ÉLOIGNE : il ne reste pas planté à la bordure.
  const xAuDemiTour = monstre.x;
  for (let i = 0; i < 200; i += 1) {
    r = avancerComportement(c, contexte(monstre, hero, {
      estEnZoneSure,
      tirerPointDomaine: () => ({ x: 5000, y: 300 }), // un point de son domaine, à l'ouest
    }));
    c = r.comportement;
    if (r.but) monstre.x += Math.sign(r.but.x - monstre.x) * 4;
  }
  assert.ok(monstre.x < xAuDemiTour - 100, `il s'éloigne de la lisière (${xAuDemiTour} -> ${monstre.x})`);
  console.log(`OK demi-tour : jamais entré, désintérêt, éloignement de ${(xAuDemiTour - monstre.x).toFixed(0)} px`);
}

// --- 4. Anti-blocage -----------------------------------------------------
{
  let c = creerComportement();
  const monstre = { x: 5000, y: 300 };
  const heroLoin = { x: 0, y: 5000 };
  // Il se donne un but...
  let r = avancerComportement(c, contexte(monstre, heroLoin));
  c = r.comportement;
  while (!r.but) { r = avancerComportement(c, contexte(monstre, heroLoin)); c = r.comportement; }
  const premierBut = { ...r.but };

  // ...et il n'avance plus d'un pixel (mur).
  let bloque = false;
  let ecoule = 0;
  for (let i = 0; i < 500 && !bloque; i += 1) {
    r = avancerComportement(c, contexte(monstre, heroLoin, {
      distanceParcouruePx: 0,
      tirerPointDomaine: () => ({ x: 4500, y: 900 }),
    }));
    c = r.comportement;
    ecoule += FRAME_MS;
    if (r.bloque) bloque = true;
  }
  assert.ok(bloque, 'il finit par changer d’idée');
  assert.ok(
    Math.abs(ecoule - TABLE.blocage_ms) <= FRAME_MS * 2,
    `changement d'idée après ${ecoule} ms (attendu ~${TABLE.blocage_ms})`,
  );
  assert.notDeepEqual(r.but, premierBut, 'et il vise ailleurs');

  // Bloqué EN POURSUITE, il lâche le joueur plutôt que de s'acharner.
  let c2 = creerComportement();
  const m2 = { x: 5000, y: 300 };
  const h2 = { x: 5100, y: 300 };
  let r2 = avancerComportement(c2, contexte(m2, h2));
  c2 = r2.comportement;
  assert.equal(c2.etat, ETAT_POURSUITE);
  for (let i = 0; i < 500 && c2.etat === ETAT_POURSUITE; i += 1) {
    r2 = avancerComportement(c2, contexte(m2, h2, { distanceParcouruePx: 0 }));
    c2 = r2.comportement;
  }
  assert.equal(c2.etat, ETAT_DESINTERET, 'coincé en poursuivant, il abandonne');
  console.log(`OK anti-blocage : nouvelle idée après ${ecoule} ms, et abandon de la poursuite si coincé`);
}

// --- 5. En jeu réel : ils errent dans leur domaine, et n'entrent pas -----
{
  const DEBUT_NUIT = PHASES_CYCLE.slice(0, 2).reduce((s, p) => s + p.duree_ms, 0);
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = 5;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.monde.heure = DEBUT_NUIT;
  const orch = creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} },
    input: {
      maj: () => ({
        move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
        skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
        skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
        interact: { pressed: false, held: false }, menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
      }),
    },
    ctxLogique: null,
    ctxVisible: null,
    canvasLogique: null,
  });
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();

  // Le héros reste dans la zone sûre du Jardin — exactement le scénario de la
  // spec : « joueur réfugié dans le Jardin -> le monstre n'entre jamais ».
  const jardin = scene.zones.find((z) => z.type === 'jardin').rect;
  const positionsDepart = new Map();
  let deplacementTotal = 0;
  for (let t = 0; t < 180000; t += FRAME_MS) {
    hero.x = (jardin.x + jardin.w / 2) * scene.tileSize;
    hero.y = (jardin.y + jardin.h / 2) * scene.tileSize;
    hero.pv = hero.pvMax;
    orch.maj(FRAME_MS);
    for (const m of orch.obtenirMonstres()) {
      assert.ok(!estEnZoneSurePx(scene, m.x, m.y), `monstre entré en zone sûre (${m.x}, ${m.y})`);
      if (!positionsDepart.has(m.id)) positionsDepart.set(m.id, { x: m.x, y: m.y });
      deplacementTotal += m.distanceParcouruePx || 0;
    }
  }
  const monstres = orch.obtenirMonstres();
  assert.ok(monstres.length > 0, 'des monstres sont là');
  assert.ok(deplacementTotal > 0, 'ils ne sont pas immobiles');

  // Ils restent chez eux : personne n'a traversé la carte pour venir camper
  // devant le Jardin (le joueur ne les a jamais attirés).
  const champNord = rectanglesDeZone(scene, 'champ_nord');
  for (const m of monstres) {
    const tx = Math.floor(m.x / scene.tileSize);
    const ty = Math.floor(m.y / scene.tileSize);
    const chezLui = champNord.some((r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h);
    assert.ok(chezLui, `monstre sorti de son domaine sans y avoir été attiré : (${tx},${ty})`);
  }
  console.log(`OK en jeu : ${monstres.length} rôdeurs, tous dans le Champ nord après 3 min, aucun n'entre en zone sûre`);

  // Mort du héros de nuit -> retour Grotte, monstres lâchés.
  hero.pv = 1;
  const monstreProche = orch.obtenirMonstres()[0];
  hero.x = monstreProche.x;
  hero.y = monstreProche.y;
  for (let i = 0; i < 400 && orch.obtenirScene().id === 'scene_maison_exterieur'; i += 1) orch.maj(FRAME_MS);
  assert.equal(orch.obtenirScene().id, 'scene_grotte_salle_1', 'mort -> retour dans la Grotte');
  assert.ok(
    orch.obtenirMonstres().every((m) => !m.spawnId),
    'aucun monstre nocturne ne suit le héros dans la Grotte',
  );
  console.log('OK mort de nuit : retour Grotte, monstres nocturnes lâchés');
}

console.log('OK test_07c_comportement');

// specs/07_chaos-nocturne.md, PALIER B : la nuit et le seuil.
//
// Un bot headless joue des nuits entières dans la vraie scène, avec le vrai
// orchestrateur. Ce que la spec §5 demande, et qui est vérifié ici :
//   - héros niveau 4 -> nuit complète, zéro apparition ; niveau 5 -> ça sort ;
//   - jamais plus que le plafond ; aucune apparition en zone sûre, en
//     Campagne, ni à moins de la distance minimale du joueur ;
//   - plus aucun monstre nocturne à l'aube ; zéro apparition de jour ;
//   - UI ouverte -> rien ne naît, rien ne bouge ;
//   - la sauvegarde ne change pas de version (rien n'est persisté).
//
// S'y ajoute une régression que le palier B rend visible : deux monstres du
// même type doivent être deux monstres, pas un seul frappé deux fois.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire, VERSION_SCHEMA_COURANTE } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { PHASES_CYCLE, phaseAHeure } from '../src/daynight.js';
import { estEnZoneSure, rectanglesDeZone } from '../src/spawns.js';
import { creerMonstre } from '../src/entities.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

const TABLE = donnees.spawns.find((s) => s.id === 'spawn_chaos_nord_est');
const DEBUT_NUIT_MS = PHASES_CYCLE.slice(0, 2).reduce((somme, p) => somme + p.duree_ms, 0);
const DUREE_NUIT_MS = PHASES_CYCLE.find((p) => p.nom === 'nuit').duree_ms;
const FRAME_MS = 16;

const etatNeutre = {
  move: { x: 0, y: 0 },
  attack: { pressed: false, held: false },
  skill_1: { pressed: false, held: false },
  skill_2: { pressed: false, held: false },
  skill_3: { pressed: false, held: false },
  consume: { pressed: false, held: false },
  interact: { pressed: false, held: false },
  menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
};

// Un orchestrateur planté dans la Région Maison, au niveau voulu, à l'heure
// voulue. `menuOuvert` permet de simuler une UI ouverte sans toucher au reste.
function bot({ niveau, heure, menuOuvert = false }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.monde.heure = heure;
  const menuFactice = { estOuvert: () => menuOuvert, traiterInput: () => {}, ouvrir: () => {} };
  const orch = creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: menuFactice,
    input: { maj: () => etatNeutre },
    ctxLogique: null,
    ctxVisible: null,
    canvasLogique: null,
  });
  return { orch, save };
}

// Joue `dureeMs` frame par frame et surveille, à chaque frame, tout ce que la
// spec interdit. Renvoie ce qu'on a vu.
//
// Le héros est maintenu en vie de force : au palier B, les monstres foncent
// encore en ligne droite sur lui (le comportement « un domaine, pas un
// piquet » est le palier C), et sur une nuit de 4 minutes ils finissent par
// traverser la carte et le tuer. Sa mort renverrait la scène à zéro et ce
// test ne mesurerait plus les apparitions mais le combat. On ne triche donc
// que sur ce qui n'est pas le sujet.
// `vus` peut être fourni pour enchaîner deux appels sur le même bot : un
// monstre n'est contrôlé qu'à la frame où il NAÎT (ensuite il marche, et
// il a parfaitement le droit d'entrer en Campagne en poursuivant).
function jouer(orch, save, dureeMs, vus = new Set()) {
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  const chaos = rectanglesDeZone(scene, TABLE.zone_apparition)[0];
  const campagne = scene.zones.find((z) => z.type === 'campagne').rect;
  let maxSimultanes = 0;
  let nesDeJour = 0;

  for (let t = 0; t < dureeMs; t += FRAME_MS) {
    hero.pv = hero.pvMax;
    orch.maj(FRAME_MS);
    const phase = phaseAHeure(save.monde.heure);
    const nocturnes = orch.obtenirMonstres().filter((m) => m.spawnId === TABLE.id);
    maxSimultanes = Math.max(maxSimultanes, nocturnes.length);

    for (const m of nocturnes) {
      const tx = Math.floor(m.x / scene.tileSize);
      const ty = Math.floor(m.y / scene.tileSize);
      if (!vus.has(m.id)) {
        vus.add(m.id);
        if (phase !== 'nuit') nesDeJour += 1;
        assert.ok(!estEnZoneSure(scene, tx, ty), `apparition en zone sûre : (${tx},${ty})`);
        assert.ok(
          tx >= chaos.x && tx < chaos.x + chaos.w && ty >= chaos.y && ty < chaos.y + chaos.h,
          `apparition hors de la zone de Chaos : (${tx},${ty})`,
        );
        // La Campagne est neutre : rien n'y naît. (La zone de Chaos est dans
        // les Champs, donc hors de la bande centrale — on le vérifie plutôt
        // que de le supposer.)
        const dansCampagneSeule = tx >= campagne.x && tx < campagne.x + campagne.w
          && ty >= campagne.y && ty < campagne.y + campagne.h
          && !(tx >= chaos.x && tx < chaos.x + chaos.w && ty >= chaos.y && ty < chaos.y + chaos.h);
        assert.ok(!dansCampagneSeule, `apparition en Campagne : (${tx},${ty})`);
        assert.ok(
          Math.hypot(hero.x - m.x, hero.y - m.y) >= TABLE.distance_min_joueur_tuiles * scene.tileSize,
          'apparition à moins de la distance minimale du joueur',
        );
      }
    }
  }
  return { vus, maxSimultanes, nesDeJour, restants: orch.obtenirMonstres().filter((m) => m.spawnId === TABLE.id) };
}

// --- 1. Le seuil : niveau 4 -> nuit vide, niveau 5 -> ça sort ------------
{
  const { orch, save } = bot({ niveau: 4, heure: DEBUT_NUIT_MS });
  const r = jouer(orch, save, DUREE_NUIT_MS);
  assert.equal(r.vus.size, 0, 'au niveau 4, la nuit entière reste vide');
  console.log('OK niveau 4 : nuit complète, zéro apparition');
}
{
  const { orch, save } = bot({ niveau: 5, heure: DEBUT_NUIT_MS });
  const r = jouer(orch, save, DUREE_NUIT_MS);
  assert.ok(r.vus.size > 0, 'au niveau 5, les monstres sortent');
  assert.ok(
    r.maxSimultanes <= TABLE.max_simultanes,
    `jamais plus que le plafond (vu ${r.maxSimultanes}, plafond ${TABLE.max_simultanes})`,
  );
  assert.equal(r.maxSimultanes, TABLE.max_simultanes, 'une nuit de 4 min remplit le plafond');
  assert.equal(r.nesDeJour, 0, 'aucune apparition hors de la phase nuit');
  console.log(`OK niveau 5 : ${r.vus.size} apparitions, plafond ${r.maxSimultanes}/${TABLE.max_simultanes}, toutes de nuit, toutes dans la zone`);
}

// --- 2. À l'aube, il ne reste rien --------------------------------------
{
  const { orch, save } = bot({ niveau: 5, heure: DEBUT_NUIT_MS });
  const vus = new Set();
  jouer(orch, save, DUREE_NUIT_MS - 5000, vus);
  assert.ok(orch.obtenirMonstres().length > 0, 'il y a du monde juste avant l’aube');
  const pocheAvant = JSON.stringify(save.inventaire.items);
  const xpAvant = save.hero.xp;

  // 6 s de plus : on bascule dans l'aube.
  const r = jouer(orch, save, 6000, vus);
  assert.equal(phaseAHeure(save.monde.heure), 'aube');
  assert.equal(r.restants.length, 0, 'plus aucun monstre nocturne à l’aube');
  assert.equal(JSON.stringify(save.inventaire.items), pocheAvant, 'ils s’en vont sans laisser de butin');
  assert.equal(save.hero.xp, xpAvant, 'et sans donner d’XP : ils ne sont pas tués');
  console.log('OK à l’aube : retrait sec, ni butin ni XP');
}

// --- 3. De jour, rien, même au niveau 30 --------------------------------
{
  const { orch, save } = bot({ niveau: 30, heure: 0 });
  const r = jouer(orch, save, 60000);
  assert.equal(phaseAHeure(save.monde.heure), 'jour');
  assert.equal(r.vus.size, 0, 'zéro apparition de jour');
  console.log('OK de jour : rien, même au niveau 30');
}

// --- 4. UI ouverte : le monde est gelé ----------------------------------
{
  const { orch, save } = bot({ niveau: 5, heure: DEBUT_NUIT_MS, menuOuvert: true });
  const heureAvant = save.monde.heure;
  for (let t = 0; t < 60000; t += FRAME_MS) orch.maj(FRAME_MS);
  assert.equal(orch.obtenirMonstres().length, 0, 'aucune apparition sous UI');
  assert.equal(save.monde.heure, heureAvant, 'et l’horloge elle-même ne bouge pas (point de décision unique)');
  console.log('OK UI ouverte : ni apparition, ni horloge');
}

// --- 5. Rien n'est persisté : pas de migration --------------------------
{
  const { orch, save } = bot({ niveau: 5, heure: DEBUT_NUIT_MS });
  jouer(orch, save, 60000);
  assert.ok(orch.obtenirMonstres().length > 0, 'des monstres sont nés');
  assert.equal(save.schema_version, VERSION_SCHEMA_COURANTE, 'la version de sauvegarde n’a pas bougé');
  const texte = JSON.stringify(save);
  assert.ok(!texte.includes('spawn_chaos'), 'aucune trace des monstres nocturnes dans la sauvegarde');
  assert.ok(!texte.includes('enemy_chaos_rodeur'), 'ni du monstre lui-même');
  console.log('OK non persistés : la sauvegarde ne change pas de version, recharger repart de zéro');
}

// --- 6. Deux monstres du même type sont deux monstres -------------------
// Jusqu'au palier B, `creerMonstre` donnait à l'instance l'id du CATALOGUE :
// invisible dans la Grotte (un seul monstre de chaque type), mais avec six
// rôdeurs identiques, frapper l'un les aurait tous blessés.
{
  const donneesEnnemi = registre.obtenir('enemies', 'enemy_chaos_rodeur');
  const a = creerMonstre(donneesEnnemi, { x: 0, y: 0, id: 'enemy_chaos_rodeur#1' });
  const b = creerMonstre(donneesEnnemi, { x: 500, y: 500, id: 'enemy_chaos_rodeur#2' });
  assert.notEqual(a.id, b.id, 'deux instances, deux ids');

  // Et dans le jeu réel : tous les ids nocturnes sont distincts.
  const { orch, save } = bot({ niveau: 5, heure: DEBUT_NUIT_MS });
  jouer(orch, save, DUREE_NUIT_MS - 5000);
  const ids = orch.obtenirMonstres().map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, `ids tous distincts (${ids.join(', ')})`);
  console.log(`OK ids d’instance uniques (${ids.length} monstres vivants, ${new Set(ids).size} ids)`);
}

console.log('OK test_07b_nuit_et_seuil');

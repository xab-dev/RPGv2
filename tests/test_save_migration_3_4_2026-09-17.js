// Contrat (§2.2/§4 de specs/04_maison-interieur.md) : une sauvegarde v3
// migre vers v4 avec jauges pleines, XP à 0, niveau 1, coffre vide, cooldowns
// vides, rien de l'existant perdu ; une version future (5) reste refusée.
import assert from 'node:assert/strict';
import { migrer, VERSION_SCHEMA_COURANTE, creerStoreMemoire, sauvegarder, charger, saveNeuve } from '../src/save.js';

function payloadV3() {
  return {
    schema_version: 3,
    saved_at: '2026-09-17T00:00:00.000Z',
    hero: {
      scene: 'scene_maison_exterieur', x: 300, y: 1900, pv: 40, companion: 'comp_follet_eau',
      equipement: { arme: 'weapon_epee_bois' },
    },
    inventaire: { eclats: 5, items: { item_branche: 2, item_caillou: 1 } },
    monde: { items_sol: { scene_maison_exterieur: { item_fruit: [{ x: 10, y: 20 }] } }, heure: 12345 },
    puzzles: { puzzle_levier_salle1: { actif: true } },
    flags: { flag_follet_choisi: true, flag_grotte_sortie: true },
    settings: { lang: 'en', musique: false },
  };
}

// 1. Migration 3 -> 4 : nouveaux champs à leur valeur de départ, rien de
// l'existant perdu (position, PV, follet, poche, items au sol, heure,
// puzzles, flags, réglages).
{
  const migre = migrer(payloadV3(), 4);
  assert.equal(migre.schema_version, 4);
  assert.equal(migre.hero.xp, 0);
  assert.equal(migre.hero.niveau, 1);
  assert.equal(migre.hero.points_stats_libres, 0);
  assert.deepEqual(migre.hero.stats, { points: {} });
  assert.deepEqual(migre.hero.buffs_actifs, {});
  assert.equal(migre.hero.equipement.consommable, null);
  assert.equal(migre.hero.equipement.arme, 'weapon_epee_bois', 'équipement déjà présent conservé');
  assert.deepEqual(migre.cooldowns, {});
  assert.deepEqual(migre.survie, { jauge_faim: 1, jauge_soif: 1 }, 'jauges pleines à la migration, jamais affamé');
  assert.deepEqual(migre.coffre, { items: {} });
  assert.deepEqual(migre.recettes_decouvertes, []);
  assert.deepEqual(migre.monde.respawns_en_attente, {});

  // Rien de l'existant perdu.
  assert.equal(migre.hero.x, 300);
  assert.equal(migre.hero.y, 1900);
  assert.equal(migre.hero.pv, 40);
  assert.equal(migre.hero.companion, 'comp_follet_eau');
  assert.deepEqual(migre.inventaire, { eclats: 5, items: { item_branche: 2, item_caillou: 1 } });
  assert.deepEqual(migre.monde.items_sol, { scene_maison_exterieur: { item_fruit: [{ x: 10, y: 20 }] } });
  assert.equal(migre.monde.heure, 12345);
  assert.deepEqual(migre.puzzles, { puzzle_levier_salle1: { actif: true } });
  assert.deepEqual(migre.flags, { flag_follet_choisi: true, flag_grotte_sortie: true });
  assert.equal(migre.settings.lang, 'en');
  assert.equal(migre.settings.musique, false, 'réglage déjà présent conservé, jamais réécrasé par la migration');
}

// 2. La version courante du module a avancé depuis (specs/05_construction-
// stations.md a introduit sa propre migration 4 -> 5, cf.
// test_save_migration_4_5) — cette fiche ne couvre que 3 -> 4, qui reste
// valide telle quelle en appelant migrer(..., 4) explicitement partout
// ci-dessus.
{
  assert.equal(VERSION_SCHEMA_COURANTE, 6);
}

// 3. Cycle complet écrire/relire d'une v3 migrée automatiquement au
// chargement — charger() migre désormais jusqu'à la version courante (5), en
// cascade par tous les paliers, jamais en s'arrêtant à 4.
{
  const store = creerStoreMemoire();
  await sauvegarder(store, payloadV3());
  const { payload } = await charger(store);
  assert.equal(payload.schema_version, VERSION_SCHEMA_COURANTE);
  assert.equal(payload.hero.x, 300);
  assert.deepEqual(payload.survie, { jauge_faim: 1, jauge_soif: 1 });
}

// 4. §4 edge case : cooldown avec un horodatage "dans le futur" relatif au
// temps actif courant (import d'une autre partie, ou bouclage du cycle
// jour/nuit) -> traité comme expiré après migration, jamais bloqué.
{
  const migre = migrer(payloadV3(), 4);
  migre.cooldowns['res:scene_x:1:1'] = 999999; // horodatage aberrant
  // Vérifié via cooldowns.js directement (le point exact de la règle) :
  // ce test s'assure seulement que la migration ne fabrique pas elle-même
  // de cooldowns pré-remplis qui pourraient déclencher ce cas — cooldowns
  // repart toujours vide.
  assert.deepEqual(migrer(payloadV3(), 4).cooldowns, {});
}

// 5bis. SD_phase3-stations-pv-jauges_2026-09-17.md, sujet 3 : partie neuve
// et sauvegarde migrée produisent le MÊME état de survie (une seule
// source, save.js#etatInitialSurvie) — jamais deux littéraux qui
// pourraient diverger.
{
  assert.deepEqual(saveNeuve().survie, migrer(payloadV3(), 4).survie);
  // Les clés sont bien celles que survival.json/ui/hud.js attendent
  // (jauge_faim/jauge_soif, jamais faim/soif) — cause racine du bug
  // "jauges grises" : ui/hud.js lisait les mauvaises clés.
  assert.deepEqual(Object.keys(saveNeuve().survie).sort(), ['jauge_faim', 'jauge_soif']);
}

// 5. Version supérieure à celle du jeu (5, future) -> refusée.
{
  const payloadFutur = { schema_version: 5, hero: { scene: 'x', x: 0, y: 0 }, flags: {}, settings: { lang: 'fr' } };
  assert.throws(() => migrer(payloadFutur, 4), /supérieure/);
}

console.log('OK test_save_migration_3_4');

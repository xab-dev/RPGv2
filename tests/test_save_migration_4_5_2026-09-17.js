// Contrat (specs/05_construction-stations.md §2) : une sauvegarde v4 migre
// vers v5 avec `maison.stations` vide (aucune pose custom n'a jamais pu
// exister avant cette fiche), rien de l'existant perdu ; une version future
// (6) reste refusée.
import assert from 'node:assert/strict';
import { migrer, VERSION_SCHEMA_COURANTE, creerStoreMemoire, sauvegarder, charger, saveNeuve } from '../src/save.js';

function payloadV4() {
  return {
    schema_version: 4,
    saved_at: '2026-09-17T00:00:00.000Z',
    hero: {
      scene: 'scene_maison_exterieur', x: 300, y: 1900, pv: 40, companion: 'comp_follet_eau',
      equipement: { arme: 'weapon_epee_bois', consommable: null },
      xp: 120, niveau: 3, points_stats_libres: 1, stats: { points: { stat_force: 1 } }, buffs_actifs: {},
    },
    inventaire: { eclats: 5, items: { item_branche: 2, item_caillou: 1 } },
    monde: { items_sol: { scene_maison_exterieur: { item_fruit: [{ x: 10, y: 20 }] } }, respawns_en_attente: {}, heure: 12345 },
    puzzles: { puzzle_levier_salle1: { actif: true } },
    flags: { flag_follet_choisi: true, flag_grotte_sortie: true },
    settings: { lang: 'en', musique: false },
    cooldowns: {},
    survie: { jauge_faim: 0.8, jauge_soif: 0.9 },
    coffre: { items: { item_bois: 3 } },
    recettes_decouvertes: ['rec_hache'],
  };
}

// 1. Migration 4 -> 5 : `maison.stations` apparaît vide, rien de l'existant
// perdu (position, follet, XP/niveau/stats, poche, items au sol, coffre,
// recettes découvertes, réglages).
{
  const migre = migrer(payloadV4(), 5);
  assert.equal(migre.schema_version, 5);
  assert.deepEqual(migre.maison, { stations: {} });
  assert.equal(migre.hero.x, 300);
  assert.equal(migre.hero.companion, 'comp_follet_eau');
  assert.equal(migre.hero.niveau, 3);
  assert.equal(migre.hero.points_stats_libres, 1);
  assert.deepEqual(migre.inventaire.items, { item_branche: 2, item_caillou: 1 });
  assert.deepEqual(migre.monde.items_sol, payloadV4().monde.items_sol);
  assert.deepEqual(migre.coffre.items, { item_bois: 3 });
  assert.deepEqual(migre.recettes_decouvertes, ['rec_hache']);
  assert.equal(migre.settings.lang, 'en', 'les réglages déjà présents ne doivent pas être perdus');
}

// 2. La version courante du module est bien 5.
{
  assert.equal(VERSION_SCHEMA_COURANTE, 6);
}

// 3. Cycle complet écrire/relire d'une v4 migrée automatiquement au chargement.
{
  const store = creerStoreMemoire();
  await sauvegarder(store, payloadV4());
  const { payload } = await charger(store);
  assert.equal(payload.schema_version, VERSION_SCHEMA_COURANTE);
  assert.deepEqual(payload.maison, { stations: {} });
  assert.equal(payload.hero.x, 300);
}

// 4. Une partie neuve (saveNeuve) a la MÊME forme de `maison` qu'une v4
// migrée (une seule source, jamais deux littéraux qui pourraient diverger).
{
  assert.deepEqual(saveNeuve().maison, migrer(payloadV4(), 5).maison);
}

// 5. Version supérieure à celle du jeu (6, future) -> refusée.
{
  const payloadFutur = { schema_version: 6, hero: { scene: 'x', x: 0, y: 0 }, flags: {}, settings: { lang: 'fr' } };
  assert.throws(() => migrer(payloadFutur, 5), /supérieure/);
}

console.log('OK test_save_migration_4_5');

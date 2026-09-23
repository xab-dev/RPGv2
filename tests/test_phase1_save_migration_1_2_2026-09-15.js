// Contrat (§3.10) : le schéma passe en version 2 (compagnon, PV, équipement,
// inventaire, puzzles) ; une sauvegarde v1 réelle migre proprement, une
// version 3 (future, inexistante) est refusée.
import assert from 'node:assert/strict';
import { migrer, VERSION_SCHEMA_COURANTE, creerStoreMemoire, sauvegarder, charger } from '../src/save.js';

// 1. Migration 1 -> 2 sur un payload v1 fictif (forme réelle de la Phase 0).
{
  const payloadV1 = {
    schema_version: 1,
    saved_at: '2026-01-01T00:00:00.000Z',
    hero: { scene: 'scene_salle_test', x: 12, y: 34 },
    flags: {},
    settings: { lang: 'en' },
  };
  const migre = migrer(payloadV1, 2);
  assert.equal(migre.schema_version, 2);
  assert.equal(migre.hero.x, 12, 'la position déjà présente doit être conservée');
  assert.equal(migre.hero.y, 34);
  assert.equal(migre.hero.companion, null, 'follet non choisi -> rejoue le choix (§4)');
  assert.equal(migre.hero.equipement.arme, 'weapon_epee_bois');
  assert.equal(migre.inventaire.eclats, 0);
  assert.deepEqual(migre.puzzles, {});
  assert.equal(migre.settings.lang, 'en', 'les réglages déjà présents ne doivent pas être perdus');
}

// 2. La version courante du module (03_maison-exterieur §3.7 : migration
// 2 -> 3 ; Palier A-E de 04_maison-interieur.md : migration 3 -> 4 ;
// specs/05_construction-stations.md : migration 4 -> 5, cf.
// test_save_migration_3_4/test_save_migration_4_5) — cette fiche ne couvre
// que 1 -> 2, qui reste valide telle quelle en appelant migrer(..., 2)
// explicitement ci-dessus.
{
  assert.equal(VERSION_SCHEMA_COURANTE, 8);
}

// 3. Cycle complet écrire/relire d'une sauvegarde v1 migrée automatiquement
// au chargement — jusqu'à la version courante (chaîne 1 -> 2 -> 3 -> 4 -> 5).
{
  const store = creerStoreMemoire();
  const payloadV1 = { schema_version: 1, hero: { scene: 'scene_salle_test', x: 5, y: 5 }, flags: {}, settings: { lang: 'fr' } };
  await sauvegarder(store, payloadV1);
  const { payload } = await charger(store);
  assert.equal(payload.schema_version, VERSION_SCHEMA_COURANTE);
  assert.equal(payload.hero.x, 5);
}

// 4. Version supérieure à celle du jeu (5, future) -> refusée, jamais de migration descendante.
{
  const payloadFutur = { schema_version: 5, hero: { scene: 'x', x: 0, y: 0 }, flags: {}, settings: { lang: 'fr' } };
  assert.throws(() => migrer(payloadFutur, 2), /supérieure/);
}

console.log('OK test_phase1_save_migration_1_2');

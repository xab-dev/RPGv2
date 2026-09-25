// Contrat (03_maison-exterieur §3.7/§4/§7) : schema_version passe à 3
// (inventaire.items, monde.items_sol, monde.heure, settings.musique) ;
// une sauvegarde v2 pointant encore vers scene_maison_exterieur_placeholder
// (retiré) est REDIRIGÉE explicitement, pas seulement rattrapée par le repli
// générique de main.js ; une version 4 (future) est refusée.
import assert from 'node:assert/strict';
import { migrer, VERSION_SCHEMA_COURANTE, creerStoreMemoire, sauvegarder, charger } from '../src/save.js';

function payloadV2(scene = 'scene_grotte_salle_1') {
  return {
    schema_version: 2,
    saved_at: '2026-09-16T00:00:00.000Z',
    hero: {
      scene, x: 100, y: 200, pv: 40, companion: 'comp_follet_eau',
      equipement: { arme: 'weapon_epee_bois' },
    },
    inventaire: { eclats: 5 },
    puzzles: { puzzle_levier_salle1: { actif: true } },
    flags: { flag_follet_choisi: true },
    settings: { lang: 'en' },
  };
}

// 1. Migration 2 -> 3 : poche vide, monde initialisé, musique activée par
// défaut, RIEN de l'existant perdu (position, PV, follet, puzzles, flags,
// langue).
{
  const migre = migrer(payloadV2(), 3);
  assert.equal(migre.schema_version, 3);
  assert.deepEqual(migre.inventaire, { eclats: 5, items: {} });
  assert.deepEqual(migre.monde, { items_sol: {}, heure: 0 });
  assert.equal(migre.settings.musique, true);
  assert.equal(migre.settings.lang, 'en', 'réglage déjà présent conservé');
  assert.equal(migre.hero.x, 100);
  assert.equal(migre.hero.pv, 40);
  assert.equal(migre.hero.companion, 'comp_follet_eau');
  assert.deepEqual(migre.puzzles, { puzzle_levier_salle1: { actif: true } });
  assert.deepEqual(migre.flags, { flag_follet_choisi: true });
}

// 2. Edge case §4 : une sauvegarde v2 qui pointait vers le placeholder retiré
// est redirigée vers scene_maison_exterieur, à son spawn — jamais laissée
// au repli générique de main.js (qui ramènerait à tort à la grotte).
{
  const migre = migrer(payloadV2('scene_maison_exterieur_placeholder'), 3);
  assert.equal(migre.hero.scene, 'scene_maison_exterieur');
  assert.equal(migre.hero.x, (6 + 0.5) * 32);
  assert.equal(migre.hero.y, (58 + 0.5) * 32);
}

// 3. Une scène v2 normale (grotte) n'est jamais touchée par cette
// redirection.
{
  const migre = migrer(payloadV2('scene_grotte_salle_2'), 3);
  assert.equal(migre.hero.scene, 'scene_grotte_salle_2');
  assert.equal(migre.hero.x, 100);
}

// 4. La version courante du module a bien avancé depuis la Phase 2 (Palier
// A-E de la Phase 3 a introduit sa propre migration 3 -> 4, puis
// specs/05_construction-stations.md la migration 4 -> 5, cf.
// test_save_migration_3_4/test_save_migration_4_5) — cette fiche ne couvre
// que 2 -> 3, qui reste valide telle quelle en appelant migrer(..., 3)
// explicitement partout ci-dessus.
{
  assert.equal(VERSION_SCHEMA_COURANTE, 9);
}

// 5. Cycle complet écrire/relire d'une v2 migrée automatiquement au
// chargement, placeholder redirigé y compris via ce chemin — charger()
// migre désormais jusqu'à la version courante (4), en cascade par les deux
// paliers (2->3 puis 3->4), jamais en s'arrêtant à 3.
{
  const store = creerStoreMemoire();
  await sauvegarder(store, payloadV2('scene_maison_exterieur_placeholder'));
  const { payload } = await charger(store);
  assert.equal(payload.schema_version, VERSION_SCHEMA_COURANTE);
  assert.equal(payload.hero.scene, 'scene_maison_exterieur');
}

// 6. Version supérieure à celle du jeu (5, future) -> refusée.
{
  const payloadFutur = { schema_version: 5, hero: { scene: 'x', x: 0, y: 0 }, flags: {}, settings: { lang: 'fr' } };
  assert.throws(() => migrer(payloadFutur, 3), /supérieure/);
}

console.log('OK test_phase2_save_migration_2_3');

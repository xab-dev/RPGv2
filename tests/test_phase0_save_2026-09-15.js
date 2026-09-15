// Contrat : sauvegarde unique, automatique, versionnée, en double tampon.
import assert from 'node:assert/strict';
import {
  creerStoreMemoire,
  sauvegarder,
  charger,
  migrer,
  importerSauvegarde,
  saveNeuve,
  estValide,
} from '../src/save.js';

// 1. Cycle écrire/relire : promotion en save_current.
{
  const store = creerStoreMemoire();
  const payload = saveNeuve();
  payload.hero.x = 123;
  await sauvegarder(store, payload);
  const { payload: relu, origine } = await charger(store);
  assert.equal(relu.hero.x, 123);
  assert.equal(origine, 'save_current');
}

// 2. save_next non promu si la relecture échoue.
{
  const store = creerStoreMemoire();
  const ecritureOriginale = store.ecrire.bind(store);
  let compteur = 0;
  store.ecrire = async (cle, valeur) => {
    compteur++;
    if (cle === 'save_next' && compteur === 1) {
      // Corrompt délibérément ce qui est écrit dans save_next.
      return ecritureOriginale(cle, { schema_version: 1 }); // hero manquant -> invalide
    }
    return ecritureOriginale(cle, valeur);
  };

  await assert.rejects(() => sauvegarder(store, saveNeuve()));
  const actuelle = await store.lire('save_current');
  assert.equal(actuelle, undefined, 'save_current ne doit jamais être écrasée par une écriture invalide');
}

// 3. Migration 0 -> 1 sur un payload fictif (version antérieure imaginaire pour le test).
{
  const payloadV0 = { schema_version: 0, hero: { scene: 'scene_salle_test', x: 0, y: 0 }, flags: {} };
  const migrationsFictives = {
    0: (p) => ({ ...p, schema_version: 1, settings: { lang: 'fr' } }),
  };
  const migre = migrer(payloadV0, 1, migrationsFictives);
  assert.equal(migre.schema_version, 1);
  assert.equal(migre.settings.lang, 'fr');
}

// 4. Version supérieure à celle du jeu → refusée, jamais de migration descendante.
{
  const payloadFutur = { schema_version: 99, hero: { scene: 'x', x: 0, y: 0 }, flags: {}, settings: { lang: 'fr' } };
  assert.throws(() => migrer(payloadFutur, 1), /supérieure/);

  const store = creerStoreMemoire();
  await assert.rejects(() => importerSauvegarde(store, payloadFutur), /supérieure/);
}

// 5. Sauvegarde corrompue (save_current illisible) → repli sur save_next.
{
  const store = creerStoreMemoire();
  await store.ecrire('save_current', { pas: 'une sauvegarde valide' });
  await store.ecrire('save_next', saveNeuve());
  const { payload, origine } = await charger(store);
  assert.equal(origine, 'save_next (repli)');
  assert.ok(estValide(payload));
}

// 6. Les deux tampons illisibles → partie neuve, jamais en silence (motif explicite).
{
  const store = creerStoreMemoire();
  const { payload, origine } = await charger(store);
  assert.ok(estValide(payload));
  assert.ok(origine.includes('neuve'));
}

// 7. Import manuel valide : écrit bien en double tampon.
{
  const store = creerStoreMemoire();
  const payload = saveNeuve();
  payload.hero.x = 77;
  await importerSauvegarde(store, payload);
  const { payload: relu } = await charger(store);
  assert.equal(relu.hero.x, 77);
}

console.log('OK test_phase0_save');

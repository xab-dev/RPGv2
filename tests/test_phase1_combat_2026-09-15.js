// Contrat : l'auto-attaque touche une zone annulaire définie par la portée
// de l'arme équipée, respecte un cooldown, et le premier monstre meurt en
// 2-3 coups à Force de base (équilibrage sur les valeurs réelles de
// enemies.json/stats.json).
import assert from 'node:assert/strict';
import { estDansPortee, resoudreAutoAttaque, tickCooldown } from '../src/combat.js';
import { creerHeros, creerMonstre, infligerDegats } from '../src/entities.js';
import { construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';

const TILE_SIZE = 32;
const PORTEE_MELEE = { min: 0, max: 1 }; // équivalent weapon_epee_bois

// 1. Monstre dans le cercle (min=0) touché, hors du cercle non touché.
{
  const hero = creerHeros({ x: 0, y: 0, rayon: 10, pvMax: 20 });
  const dansLeCercle = creerMonstre({ id: 'm', pv: 5 }, { x: TILE_SIZE * 0.5, y: 0 });
  const horsDuCercle = creerMonstre({ id: 'm2', pv: 5 }, { x: TILE_SIZE * 2, y: 0 });

  assert.equal(estDansPortee(hero, dansLeCercle, PORTEE_MELEE, TILE_SIZE), true);
  assert.equal(estDansPortee(hero, horsDuCercle, PORTEE_MELEE, TILE_SIZE), false);

  const touches = resoudreAutoAttaque(hero, [dansLeCercle, horsDuCercle], PORTEE_MELEE, TILE_SIZE);
  assert.deepEqual(touches.map((m) => m.id), ['m']);
}

// 2. Une arme à distance (min > 0) exclut le corps-à-corps.
{
  const hero = creerHeros({ x: 0, y: 0, rayon: 10, pvMax: 20 });
  const auCorpsACorps = creerMonstre({ id: 'm', pv: 5 }, { x: TILE_SIZE * 0.5, y: 0 });
  const portee = { min: 2, max: 4 };
  assert.equal(estDansPortee(hero, auCorpsACorps, portee, TILE_SIZE), false);
}

// 3. Un monstre mort n'est jamais retouché par l'auto-attaque.
{
  const hero = creerHeros({ x: 0, y: 0, rayon: 10, pvMax: 20 });
  let monstre = creerMonstre({ id: 'm', pv: 5 }, { x: 0, y: 0 });
  monstre = infligerDegats(monstre, 999);
  assert.equal(monstre.mort, true);
  assert.deepEqual(resoudreAutoAttaque(hero, [monstre], PORTEE_MELEE, TILE_SIZE), []);
}

// 4. Cooldown : tickCooldown décroît jusqu'à 0, jamais en dessous.
{
  assert.equal(tickCooldown(500, 200), 300);
  assert.equal(tickCooldown(100, 200), 0);
}

// 5. Équilibrage cible (§3.5, §7) : enemy_grotte_rampant meurt en 2-3
// auto-attaques à Force de base — lu depuis les vrais catalogues du dépôt,
// pas des valeurs recopiées ici, pour que ce test casse si l'équilibrage
// change en JSON.
{
  const noms = ['stats', 'enemies', 'loot_tables'];
  const { donnees } = await chargerCataloguesDepuisDisque('data', noms);
  const registre = construireRegistre(donnees);
  const forceBase = registre.obtenir('stats', 'stat_force').base;
  const ennemi = registre.obtenir('enemies', 'enemy_grotte_rampant');

  let monstre = creerMonstre(ennemi, { x: 0, y: 0 });
  let coups = 0;
  while (!monstre.mort && coups < 10) {
    monstre = infligerDegats(monstre, forceBase);
    coups++;
  }
  assert.ok(coups >= 2 && coups <= 3, `attendu 2-3 coups, obtenu ${coups}`);

  // Le monstre n'inflige pas plus de ~10% des PV max du héros par coup.
  const pvMaxHeros = 10 + 8 * registre.obtenir('stats', 'stat_vitalite').base;
  assert.ok(ennemi.force <= pvMaxHeros * 0.1, 'le monstre ne doit pas infliger plus de 10% des PV du héros par coup');
}

console.log('OK test_phase1_combat');

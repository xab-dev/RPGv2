// Contrat (§3.6/§7) : le follet passe de `suivre` à `engager` quand un
// monstre est à `distance_engagement`, et revient à `suivre` à la mort du
// monstre (ou s'il s'éloigne).
import assert from 'node:assert/strict';
import { creerFollet, mettreAJourEtat, avancerPosition } from '../src/companion.js';

function hero(x, y) {
  return { x, y };
}
function monstre(id, x, y, mort = false) {
  return { id, x, y, mort };
}

// 1. État initial : `suivre`, aucune cible.
{
  const follet = creerFollet('comp_feu', hero(0, 0));
  assert.equal(follet.etat, 'suivre');
  assert.equal(follet.cibleMonstreId, null);
}

// 2. Monstre à portée d'engagement -> passage à `engager`.
{
  const follet = creerFollet('comp_feu', hero(0, 0));
  const suivant = mettreAJourEtat(follet, hero(0, 0), [monstre('m1', 10, 0)]);
  assert.equal(suivant.etat, 'engager');
  assert.equal(suivant.cibleMonstreId, 'm1');
}

// 3. Monstre hors de portée -> reste en `suivre`.
{
  const follet = creerFollet('comp_feu', hero(0, 0));
  const suivant = mettreAJourEtat(follet, hero(0, 0), [monstre('m1', 500, 0)]);
  assert.equal(suivant.etat, 'suivre');
}

// 4. Mort du monstre engagé -> retour à `suivre`.
{
  let follet = mettreAJourEtat(creerFollet('comp_feu', hero(0, 0)), hero(0, 0), [monstre('m1', 10, 0)]);
  assert.equal(follet.etat, 'engager');
  follet = mettreAJourEtat(follet, hero(0, 0), [monstre('m1', 10, 0, true)]);
  assert.equal(follet.etat, 'suivre');
  assert.equal(follet.cibleMonstreId, null);
}

// 5. Le monstre engagé s'éloigne -> retour à `suivre`.
{
  let follet = mettreAJourEtat(creerFollet('comp_feu', hero(0, 0)), hero(0, 0), [monstre('m1', 10, 0)]);
  assert.equal(follet.etat, 'engager');
  follet = mettreAJourEtat(follet, hero(0, 0), [monstre('m1', 500, 0)]);
  assert.equal(follet.etat, 'suivre');
}

// 6. Position : le follet REJOINT le monstre engagé sans jamais s'y téléporter
// (`D-37`) — l'approche est amortie comme le retour en orbite, et elle
// converge. Ce test disait "collée au monstre dès la 1ʳᵉ frame" : c'était le
// flash que la décision de Xav du 20/09 supprime.
// `D-53` (`specs/10` palier B) : l'amortissement est désormais en temps réel,
// donc « une frame » s'éprouve avec la durée d'une VRAIE frame (1/60 s). Le
// pas de 0,1 s d'avant valait six frames, et le follet a le droit d'y
// parcourir ce qu'il parcourt en six frames — plus de la moitié du chemin.
{
  const h = hero(0, 0);
  const cible = monstre('m1', 10, 20);
  let follet = mettreAJourEtat(creerFollet('comp_feu', h), h, [cible]);
  const depart = { x: follet.x, y: follet.y };
  follet = avancerPosition(follet, h, [cible], 1 / 60);
  const saut = Math.hypot(follet.x - depart.x, follet.y - depart.y);
  assert.ok(saut > 0, 'le follet avance vers sa cible');
  assert.ok(saut < Math.hypot(cible.x - depart.x, cible.y - depart.y) * 0.5,
    `la 1ʳᵉ frame ne doit pas téléporter le follet (saut = ${saut.toFixed(2)} px)`);
  for (let i = 0; i < 200; i += 1) follet = avancerPosition(follet, h, [cible], 0.1);
  assert.ok(Math.hypot(follet.x - cible.x, follet.y - cible.y) < 0.01,
    'après quelques secondes, le follet est collé au monstre (la lumière suit sans code séparé)');
}

console.log('OK test_phase1_companion');

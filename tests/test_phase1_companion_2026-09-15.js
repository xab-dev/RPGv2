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

// 6. Position : collée au monstre engagé (la lumière suit sans code séparé).
{
  let follet = mettreAJourEtat(creerFollet('comp_feu', hero(0, 0)), hero(0, 0), [monstre('m1', 10, 20)]);
  follet = avancerPosition(follet, hero(0, 0), [monstre('m1', 10, 20)], 0.1);
  assert.equal(follet.x, 10);
  assert.equal(follet.y, 20);
}

console.log('OK test_phase1_companion');

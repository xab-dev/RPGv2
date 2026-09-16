// Contrat (03_maison-exterieur §3.4/§7) : opacité du toit = 1 loin, 0 dedans,
// monotone entre les deux — fonction pure distance -> opacité, jamais exercé
// via le rendu canvas (contrainte de méthode).
import assert from 'node:assert/strict';
import { distanceAuRectangle, calculerOpaciteToit } from '../src/structures.js';

const TILE = 32;
const STRUCTURE = { rect: { x: 10, y: 10, w: 5, h: 4 } }; // px : [320,480] x [320,448]
const CONFIG = { rayonEffacement: 110 * 1.25, margeFondu: 30 };

// 1. Distance à un rectangle : 0 à l'intérieur, > 0 dehors, mesurée au bord
// (pas au centre).
{
  assert.equal(distanceAuRectangle(350, 400, { x: 320, y: 320, w: 160, h: 128 }), 0);
  assert.equal(distanceAuRectangle(300, 400, { x: 320, y: 320, w: 160, h: 128 }), 20);
}

// 2. Loin de la structure : opacité 1 (toit plein).
{
  const heroLoin = { x: 0, y: 0 };
  assert.equal(calculerOpaciteToit(heroLoin, STRUCTURE, TILE, CONFIG), 1);
}

// 3. À l'intérieur (ou tout près) : opacité 0 (toit invisible).
{
  const heroDedans = { x: 400, y: 380 };
  assert.equal(calculerOpaciteToit(heroDedans, STRUCTURE, TILE, CONFIG), 0);
}

// 4. Monotone entre les deux : l'opacité ne fait jamais un bond ni un
// rebond en se rapprochant progressivement du rectangle.
{
  const rectPx = { x: STRUCTURE.rect.x * TILE, y: STRUCTURE.rect.y * TILE, w: STRUCTURE.rect.w * TILE, h: STRUCTURE.rect.h * TILE };
  const centreX = rectPx.x + rectPx.w / 2;
  const yFixe = rectPx.y - 5; // légèrement au-dessus du rectangle, distance = pure verticale
  let precedente = -1;
  for (let distance = 300; distance >= 0; distance -= 10) {
    const opacite = calculerOpaciteToit({ x: centreX, y: yFixe - distance }, STRUCTURE, TILE, CONFIG);
    assert.ok(opacite >= 0 && opacite <= 1, `opacité hors bornes : ${opacite}`);
    assert.ok(opacite <= precedente + 1e-9 || precedente === -1, `opacité non monotone : ${precedente} -> ${opacite}`);
    precedente = opacite;
  }
}

// 5. Deux structures proches : l'opacité se calcule indépendamment (§4 edge
// case) — juste une vérification qu'appeler la fonction 2 fois ne partage
// aucun état caché.
{
  const structureVoisine = { rect: { x: 20, y: 10, w: 5, h: 4 } };
  const hero = { x: 400, y: 380 };
  const o1 = calculerOpaciteToit(hero, STRUCTURE, TILE, CONFIG);
  const o2 = calculerOpaciteToit(hero, structureVoisine, TILE, CONFIG);
  assert.equal(o1, 0);
  assert.ok(o2 > o1, 'la structure voisine, plus loin du même héros, doit être plus opaque');
}

console.log('OK test_phase2_toit_opacite');

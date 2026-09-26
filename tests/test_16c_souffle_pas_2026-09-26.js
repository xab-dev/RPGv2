// Spec 16, palier C — le souffle et le pas du héros.
//
// Contrats :
// 1. `poses.js#matriceAnimation` : rien sans état ni animations ; au repos
//    (`marche` 0), seules les animations de repos jouent, en marche (1) seules
//    celles de marche, entre deux chacune à son poids ; un `rebond` ne passe
//    jamais du côté opposé à son amplitude ; une animation de pièces ne touche
//    que ses pièces.
// 2. `orientation.js#avancerAnimationHeros` : le poids de la marche glisse
//    vers son but à vitesse bornée, dans les deux sens ; l'horloge avance.
// 3. Le dessin : l'ombre portée reste au sol (dessinée avant la matrice
//    d'animation).
// 4. Démarrage : une période sous 3 Hz, un champ ou une pièce inconnus,
//    refusés.
// 5. Le branchement : `main.js` → `render.js` → `dessinerVisuel`.
// Aucune valeur de réglage n'est épinglée.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matriceAnimation } from '../src/poses.js';
import { dessinerVisuel } from '../src/visuels.js';
import { creerAnimationHeros, avancerAnimationHeros, VITESSE_POIDS_MARCHE_S } from '../src/orientation.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);

// --- 1. La matrice -------------------------------------------------------------------
{
  const temoin = {
    primitives: [{ piece: 'tete' }, { piece: 'corps' }],
    animations: [
      { quand: 'repos', champ: 'dy', amplitude: 2, periode_ms: 1000 },
      { quand: 'marche', champ: 'dx', amplitude: 3, periode_ms: 1000, forme: 'rebond' },
      { quand: 'marche', champ: 'rotation', amplitude: 10, periode_ms: 1000, origine: [0, 5], pieces: ['tete'] },
    ],
  };
  assert.equal(matriceAnimation(temoin, null, null), null, 'sans état, rien');
  assert.equal(matriceAnimation({ primitives: [] }, null, { tempsMs: 250, marche: 0 }), null, 'sans animations, rien');
  const repos = matriceAnimation(temoin, null, { tempsMs: 250, marche: 0 });
  assert.deepEqual(repos, [1, 0, 0, 1, 0, 2], 'au repos, le souffle seul (au quart de période, son amplitude)');
  const marche = matriceAnimation(temoin, null, { tempsMs: 500, marche: 1 });
  assert.ok(Math.abs(marche[4] - 3) < 1e-9 && marche[5] === 0, 'en marche, le pas seul (le rebond au sommet à mi-période)');
  const moitie = matriceAnimation(temoin, null, { tempsMs: 250, marche: 0.5 });
  assert.ok(Math.abs(moitie[5] - 1) < 1e-9, 'entre deux, chacune à son poids');
  for (let t = 0; t < 1000; t += 37) {
    assert.ok(matriceAnimation(temoin, null, { tempsMs: t, marche: 1 })[4] >= 0, `le rebond ne s'enfonce jamais (${t} ms)`);
  }
  assert.equal(matriceAnimation(temoin, 'corps', { tempsMs: 250, marche: 1 }), null, 'une pièce que l\'animation ne nomme pas ne bouge pas');
  const tete = matriceAnimation(temoin, 'tete', { tempsMs: 250, marche: 1 });
  const [a, b, c, d, e, f] = tete;
  assert.ok(Math.abs(c * 5 + e) < 1e-9 && Math.abs(d * 5 + f - 5) < 1e-9, 'la rotation tourne autour de son origine');
  assert.ok(Math.abs(Math.atan2(b, a) - (10 * Math.PI) / 180) < 1e-9);
  console.log('OK matrice : repos, marche, poids, rebond, pièces, origine');
}

// --- 2. L'état ---------------------------------------------------------------------
{
  let s = creerAnimationHeros();
  assert.equal(s.tempsMs, 0);
  assert.equal(s.marche, 0);
  s = avancerAnimationHeros(s, { deltaMs: 16, dx: 1, dy: 0 });
  assert.ok(s.marche > 0 && s.marche <= (VITESSE_POIDS_MARCHE_S * 16) / 1000 + 1e-12, 'le poids part, à vitesse bornée');
  for (let i = 0; i < 200; i += 1) s = avancerAnimationHeros(s, { deltaMs: 16, dx: 1, dy: 0 });
  assert.equal(s.marche, 1, 'et atteint la marche');
  s = avancerAnimationHeros(s, { deltaMs: 16 });
  assert.ok(s.marche < 1 && s.marche > 0, 'à l\'arrêt, il redescend sans sauter');
  assert.equal(s.tempsMs, 16 * 202);
  console.log('OK état : le poids de la marche glisse, l\'horloge avance');
}

// --- 3. L'ombre reste au sol -------------------------------------------------------
{
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) { return (...args) => { appels.push(String(prop)); return { addColorStop() {} }; }; },
    set() { return true; },
  });
  dessinerVisuel(ctx, HEROS, 0, 0, { orientation: 'sud', animation: { tempsMs: 1000, marche: 0 } });
  const premierRemplissage = appels.indexOf('fill');
  const premiereAnimation = appels.indexOf('transform');
  assert.ok(HEROS.ombre && premierRemplissage >= 0 && premiereAnimation > premierRemplissage, 'l\'ombre se remplit avant toute matrice d\'animation');
  console.log('OK ombre : au sol');
}

// --- 4. Démarrage ------------------------------------------------------------------
{
  const refuse = (modif, message) => {
    const copie = structuredClone(donnees);
    modif(copie.visuels.find((v) => v.id === VISUEL_HEROS_ID));
    assert.ok(validerCatalogues(copie).some((e) => e.includes('animations[0]')), message);
  };
  assert.ok(HEROS.animations.length > 0, 'le héros respire et marche');
  refuse((v) => { v.animations[0].periode_ms = 200; }, 'plus de 3 Hz, refusé');
  refuse((v) => { v.animations[0].champ = 'couleur'; }, 'un champ inconnu, refusé');
  refuse((v) => { v.animations[0].pieces = ['chapeau']; }, 'une pièce inconnue, refusée');
  refuse((v) => { v.animations[0].quand = 'toujours'; }, 'un moment inconnu, refusé');
  console.log('OK démarrage : période, champ, pièce, moment');
}

// --- 5. Le branchement --------------------------------------------------------------
{
  const main = fs.readFileSync(path.join(RACINE, 'src/main.js'), 'utf8');
  const render = fs.readFileSync(path.join(RACINE, 'src/render.js'), 'utf8');
  assert.ok(/heroAnimation:\s*animationHeros/.test(main) && /avancerAnimationHeros\(/.test(main));
  assert.ok(/animation:\s*scene\.heroAnimation/.test(render));
  console.log('OK branchement');
}

console.log('OK test_16c_souffle_pas');

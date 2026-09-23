// `D-157` — la sortie et la porte de la Grotte : une ouverture dans le mur,
// et un halo qui n'éclaire le passage qu'une fois le passage ouvert.
//
// Contrat 1 — `scene.js#lumieresActives` : une lumière de scène peut porter
// une `condition` (même forme que celle d'un portail) ; sans condition, elle
// brille toujours. Sans AUCUNE lumière conditionnelle, la liste de la scène
// est rendue telle quelle (appelée à chaque frame, elle n'alloue rien).
//
// Contrat 2 — une lumière ne trahit jamais une porte fermée : toute lumière
// posée sur la case d'une porte conditionnelle attend le flag de cette porte.
// Sinon le halo dessinerait l'ouverture dans un mur encore plein.
//
// Contrat 3 — le boot refuse une condition de lumière qui cite un flag
// inconnu, comme il le refuse pour un portail.
//
// Aucune valeur de réglage (rayon, couleur) n'est épinglée (`D-52`).
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { lumieresActives } from '../src/scene.js';

// Contrat 1
{
  const sans = { lumieres: [{ x: 0, y: 0, rayon: 10 }] };
  const jamais = { evaluate: () => { throw new Error('aucune condition à évaluer'); } };
  assert.equal(lumieresActives(sans, jamais), sans.lumieres, 'sans condition, la liste de la scène est rendue telle quelle');
  assert.deepEqual(lumieresActives({}, jamais), [], 'une scène sans lumière n\'en a aucune');

  const avec = { lumieres: [{ x: 0, y: 0, rayon: 10 }, { x: 1, y: 1, rayon: 10, condition: 'flag_porte' }] };
  const fermee = { evaluate: (c) => c !== 'flag_porte' };
  const ouverte = { evaluate: () => true };
  assert.deepEqual(lumieresActives(avec, fermee), [avec.lumieres[0]], 'porte fermée : la lumière conditionnelle est éteinte');
  assert.deepEqual(lumieresActives(avec, ouverte), avec.lumieres, 'porte ouverte : les deux lumières brillent');
}

const { donnees } = await chargerCataloguesDepuisDisque('data', Object.keys(SCHEMAS));

// Contrat 2
let lumieresDePorte = 0;
for (const scene of donnees.scenes) {
  for (const porte of scene.portes || []) {
    const t = scene.tile_size;
    const surLaPorte = (scene.lumieres || []).filter((l) => (l.type || 'halo') === 'halo'
      && Math.abs(l.x - (porte.position.x + 0.5) * t) <= t && Math.abs(l.y - (porte.position.y + 0.5) * t) <= t);
    for (const l of surLaPorte) {
      lumieresDePorte++;
      assert.equal(l.condition, porte.flag, `${scene.id} : la lumière en (${l.x}, ${l.y}) éclaire une porte fermée`);
    }
  }
}
assert.ok(lumieresDePorte > 0, 'la sortie de la salle 2 a perdu sa lumière (le contrat ne vérifierait plus rien)');

// Contrat 3
{
  const casse = structuredClone(donnees);
  const scene = casse.scenes.find((s) => (s.lumieres || []).some((l) => l.condition));
  scene.lumieres.find((l) => l.condition).condition = 'flag_qui_n_existe_pas';
  const erreurs = validerCatalogues(casse);
  assert.ok(erreurs.some((e) => e.includes('lumieres[]') && e.includes('flag_qui_n_existe_pas')),
    `une condition de lumière inconnue passe le boot : ${JSON.stringify(erreurs)}`);
}
assert.deepEqual(validerCatalogues(donnees), [], 'les catalogues du jeu doivent être valides au boot');

console.log(`test_d157_sortie_grotte : lumières conditionnelles, ${lumieresDePorte} lumière de porte qui attend son flag, condition validée au boot`);

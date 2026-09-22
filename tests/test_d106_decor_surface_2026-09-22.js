// `D-106` (et `D-133`, qui en était un symptôme) — le décor sait sur quelle
// surface il pousse.
//
// Un motif de `scenes.json > decor.motifs` peut déclarer `sur` : les tuiles
// qui le portent. `genererDecor` REJETTE un motif tiré ailleurs, sans le
// re-tirer — re-tirer consommerait des nombres de plus et redistribuerait le
// décor qui suit à chaque preset (contrat de préfixe de `D-114`, qui reste
// tenu par son propre test).
//
// Ce qui se vérifie ici : plus rien sur le parquet de la Maison, à aucune
// densité ; chaque motif sur une tuile qu'il déclare ; les scènes sans `sur`
// (la Grotte, hors périmètre) strictement inchangées ; un `sur` fautif tombe
// au boot. Aucune valeur de réglage n'est épinglée (`D-52`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { genererDecor, mulberry32 } from '../src/decor.js';
import { chargerScene } from '../src/scene.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

const tuileSous = (scene, motif) => scene.tuileA(Math.floor(motif.x / scene.tileSize), Math.floor(motif.y / scene.tileSize));

// --- 1. La Maison : chaque motif sur une surface qui le porte ------------
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  const sur = new Map(scene.decor.motifs.map((m) => [m.visuel, m.sur ? new Set(m.sur) : null]));
  assert.ok([...sur.values()].some(Boolean), 'la Maison déclare au moins un `sur`');
  for (const densite of [1, 2, 5, 10]) {
    const decor = genererDecor(scene, densite);
    assert.ok(decor.length > 0);
    for (const motif of decor) {
      const tuile = tuileSous(scene, motif);
      assert.notEqual(tuile.id, 'tile_parquet', `densité ${densite} : ${motif.visuel} dans la Maison (D-133)`);
      const permis = sur.get(motif.visuel);
      if (permis) assert.ok(permis.has(tuile.id), `${motif.visuel} posé sur ${tuile.id}, qu'il ne déclare pas`);
    }
  }
  console.log('OK Maison : aucun motif sur le parquet, chacun sur une surface qu\'il déclare');
}

// --- 2. Sans `sur`, rien ne bouge (la Grotte est hors périmètre) ---------
// Référence recalculée avec l'algorithme d'avant `D-106`, tirage pour
// tirage : même graine, mêmes cinq tirages par motif, aucun rejet.
function decorSansSurface(scene, multiplicateur) {
  const { densite, motifs } = scene.decor;
  const poidsTotal = motifs.reduce((s, m) => s + m.poids, 0);
  const alea = mulberry32(scene.seed);
  const positions = [];
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const t = scene.tuileA(x, y);
      if (t && !t.solid) positions.push({ x, y });
    }
  }
  const n = Math.floor(positions.length * densite * multiplicateur);
  const sortie = [];
  for (let i = 0; i < n; i++) {
    const p = positions[Math.floor(alea() * positions.length)];
    let tirage = alea() * poidsTotal;
    let visuel = motifs[motifs.length - 1].visuel;
    for (const m of motifs) {
      if (tirage < m.poids) { visuel = m.visuel; break; }
      tirage -= m.poids;
    }
    sortie.push({ x: (p.x + alea()) * scene.tileSize, y: (p.y + alea()) * scene.tileSize, visuel, rotation: (alea() * 2 - 1) * 10 });
  }
  return sortie;
}
{
  let scenesSansSurface = 0;
  for (const { id } of donnees.scenes) {
    const scene = chargerScene(registre, id);
    if (!scene.decor || scene.decor.motifs.some((m) => m.sur)) continue;
    scenesSansSurface += 1;
    assert.deepEqual(genererDecor(scene, 1), decorSansSurface(scene, 1), `${id} : sans \`sur\`, le décor est celui d'avant, au motif près`);
  }
  assert.ok(scenesSansSurface > 0, 'au moins une scène (la Grotte) reste sans `sur`');
  console.log(`OK ${scenesSansSurface} scène(s) sans \`sur\` : décor identique à celui d'avant D-106`);
}

// --- 3. Le rejet ne redistribue rien : ce qui reste est à sa place -------
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  const cle = (m) => `${m.visuel}@${m.x},${m.y},${m.rotation}`;
  const avant = new Set(decorSansSurface(scene, 1).map(cle));
  const apres = genererDecor(scene, 1);
  for (const motif of apres) assert.ok(avant.has(cle(motif)), `${cle(motif)} a bougé : le rejet a re-tiré au lieu de retirer`);
  console.log(`OK Maison : ${avant.size - apres.length} motif(s) retiré(s), aucun déplacé`);
}

// --- 4. Un `sur` fautif tombe au boot ------------------------------------
{
  const casse = (sur) => {
    const copie = structuredClone(donnees);
    const maison = copie.scenes.find((s) => s.id === 'scene_maison_exterieur');
    maison.decor.motifs[0].sur = sur;
    return validerCatalogues(copie, SCHEMAS).join('\n');
  };
  assert.match(casse(['tile_inexistante']), /sur : "tile_inexistante" introuvable/);
  assert.match(casse([]), /sur doit être une liste non vide/);
  assert.match(casse('tile_herbe'), /sur doit être une liste non vide/);
  console.log('OK un `sur` fautif (id inconnu, liste vide, chaîne) refuse le démarrage');
}

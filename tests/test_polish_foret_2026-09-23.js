// Polish ambiance (23/09), étape Forêt — `D-110` et l'ombre de sous-bois.
//
// 1. L'ombre d'une zone (`zones[].ombre`) est une opacité de voile qui monte
//    depuis le bord de la zone : nulle dehors, croissante en s'enfonçant,
//    plafonnée à la valeur déclarée ; plusieurs zones → la plus sombre. Le
//    schéma refuse une opacité hors de [0, 1].
// 2. La forêt n'est plus un mur d'arbres identiques : sa tuile déclare
//    plusieurs silhouettes et le miroir, et garde `visuel_arbre` en tête (la
//    forêt garde son arbre, demande de Xav du 22/09, `D-129`). Chaque
//    silhouette respecte l'ordre de peinture du calque statique : pas plus
//    large que sa cellule (la tuile suivante la couperait), rien sous son bord
//    bas — vers le haut elle dépasse, c'est ce qui fait un arbre.
// Aucune valeur de réglage n'est épinglée (`D-52`) : seulement des relations.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { opaciteOmbreZones, FONDU_OMBRE_TUILES } from '../src/daynight.js';
import { boitePrimitive } from '../src/structures.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);

// --- 1. L'ombre d'une zone ------------------------------------------------
{
  const T = 32;
  const zone = { type: 'foret', ombre: 0.4, rect: { x: 10, y: 10, w: 40, h: 40 } };
  const a = (tx, ty, zones = [zone]) => opaciteOmbreZones(zones, tx * T, ty * T, T);
  assert.equal(a(5, 30), 0, 'dehors : aucune ombre');
  assert.equal(a(10, 30), 0, 'sur le bord : pas encore');
  assert.ok(a(11, 30) > 0 && a(11, 30) < zone.ombre, 'une tuile dedans : l\'ombre commence');
  assert.ok(a(12, 30) > a(11, 30), 'elle monte en s\'enfonçant');
  assert.equal(a(10 + FONDU_OMBRE_TUILES + 1, 30), zone.ombre, 'au cœur : la valeur déclarée, pas plus');
  assert.equal(a(30, 30), zone.ombre);
  assert.equal(a(30, 30, [{ type: 'campagne', rect: zone.rect }]), 0, 'une zone sans ombre n\'assombrit rien');
  const plusSombre = { ...zone, ombre: 0.6 };
  assert.equal(a(30, 30, [zone, plusSombre]), 0.6, 'deux zones : la plus sombre');
  assert.equal(opaciteOmbreZones(undefined, 0, 0, T), 0, 'une scène sans zones');

  const avec = (ombre) => ({
    ...donnees,
    scenes: donnees.scenes.map((s) => (s.id === 'scene_maison_exterieur'
      ? { ...s, zones: s.zones.map((z) => (z.type === 'foret' ? { ...z, ombre } : z)) } : s)),
  });
  assert.match(validerCatalogues(avec(1.5), SCHEMAS).join(' | '), /ombre doit être un nombre dans \[0, 1\]/);
  assert.match(validerCatalogues(avec('sombre'), SCHEMAS).join(' | '), /ombre doit être un nombre/);
  const foret = donnees.scenes.flatMap((s) => s.zones || []).find((z) => z.type === 'foret');
  assert.ok(foret.ombre > 0, 'la forêt de la Maison est ombragée');
  console.log('OK ombre de zone : nulle dehors, monte sur le fondu, plafonnée, la plus sombre gagne');
}

// --- 2. La forêt : plusieurs silhouettes, chacune dans l'ordre de peinture -
{
  const cotes = [...new Set(donnees.scenes.map((s) => s.tile_size))];
  for (const s of donnees.scenes.filter((x) => x.foret_procedurale)) {
    const tuile = donnees.tiles.find((t) => t.id === s.foret_procedurale.tile_plein);
    assert.equal(tuile.render.visuel, 'visuel_arbre', 'la forêt garde son arbre en tête (D-129)');
    const ids = [tuile.render.visuel, ...(tuile.render.visuel_variantes || [])];
    assert.ok(ids.length >= 2 || tuile.render.miroir, `${tuile.id} : un seul dessin, un mur d'arbres identiques (D-110)`);
    for (const id of ids) {
      const v = donnees.visuels.find((x) => x.id === id);
      for (const cote of cotes) {
        const boites = v.primitives.map((p) => boitePrimitive(p));
        const minX = Math.min(...boites.map((b) => b.minX));
        const maxX = Math.max(...boites.map((b) => b.maxX));
        const maxY = Math.max(...boites.map((b) => b.maxY));
        assert.ok(minX >= -cote / 2 && maxX <= cote / 2, `${id} plus large que sa cellule (${minX}..${maxX})`);
        assert.ok(maxY <= 0, `${id} descend sous le bord bas de sa cellule (${maxY})`);
      }
    }
    console.log(`OK ${tuile.id} : ${ids.length} silhouettes${tuile.render.miroir ? ' × miroir' : ''}, chacune dans sa cellule`);
  }
}

console.log('--- polish Forêt : un sous-bois, et des arbres qui ne sont plus des clones.');

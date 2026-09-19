// specs/07_chaos-nocturne.md, PALIER D : « la zone de Chaos doit se deviner
// de loin la nuit ». Sobre, via les mécanismes existants.
//
// Le dessin lui-même n'est jamais exercé (canvas, contrainte de méthode) :
// c'est `zonesSignalees` — pure — qui décide de tout, et render.js ne fait
// que peindre ce qu'elle rend. Ce fichier prouve :
//   1. de jour, rien ; la teinte monte avec la nuit ;
//   2. rien non plus quand la table est fermée (niveau trop bas) : on ne
//      fait pas miroiter une zone qui ne produira personne ;
//   3. la teinte couvre la zone d'apparition, en pixels monde ;
//   4. la pulsation ne s'éteint jamais complètement, et suit l'horloge
//      partagée (donc elle est gelée sous UI, comme le reste) ;
//   5. AUCUNE lueur n'est attachée aux monstres (décision Xav, `Q-27`).
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { creerRegistreFlags } from '../src/flags.js';
import { zonesSignalees, tablesDeScene, rectanglesDeZone } from '../src/spawns.js';
import { PHASES_CYCLE } from '../src/daynight.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), []);
const registre = construireRegistre(catalogues);
const scene = chargerScene(registre, 'scene_maison_exterieur');
const TABLES = tablesDeScene(catalogues.spawns, 'scene_maison_exterieur');
const TABLE = TABLES[0];
const OPACITE_MAX = Math.max(...PHASES_CYCLE.map((p) => p.opacite));

function flagsAuNiveau(niveau) {
  return creerRegistreFlags(registre, { mode: 'prod', valeurs: () => ({ niveau }) });
}

function signal({ phase, opacite, niveau = 5, heureMs = 0 }) {
  return zonesSignalees(scene, TABLES, {
    phase,
    evaluerCondition: flagsAuNiveau(niveau).evaluate,
    opacite,
    opaciteMax: OPACITE_MAX,
    heureMs,
  });
}

// --- 1. De jour rien ; la teinte monte avec la nuit ---------------------
{
  assert.deepEqual(signal({ phase: 'jour', opacite: 0 }), [], 'aucune teinte de jour');
  assert.deepEqual(signal({ phase: 'crepuscule', opacite: 0 }), [], 'ni au crépuscule, qui n’assombrit pas encore');

  const pleineNuit = signal({ phase: 'nuit', opacite: OPACITE_MAX });
  assert.equal(pleineNuit.length, 1, 'une zone signalée en pleine nuit');
  const demiNuit = signal({ phase: 'nuit', opacite: OPACITE_MAX / 2 });
  assert.ok(
    demiNuit[0].alpha < pleineNuit[0].alpha,
    'la teinte suit l’obscurité : plus la nuit est noire, plus la zone se devine',
  );
  assert.ok(pleineNuit[0].alpha <= TABLE.signal.alpha, 'et ne dépasse jamais l’alpha déclaré en données');
  console.log(`OK intensité : 0 de jour, ${demiNuit[0].alpha.toFixed(3)} à mi-nuit, ${pleineNuit[0].alpha.toFixed(3)} en pleine nuit`);
}

// --- 2. Table fermée : rien à deviner ------------------------------------
{
  assert.deepEqual(
    signal({ phase: 'nuit', opacite: OPACITE_MAX, niveau: 4 }),
    [],
    'au niveau 4, la zone ne s’annonce pas : elle ne produira personne',
  );
  console.log('OK niveau 4 : aucune teinte — on ne fait pas miroiter une zone fermée');
}

// --- 3. La teinte couvre la zone d'apparition, en pixels monde ----------
{
  const [zone] = signal({ phase: 'nuit', opacite: OPACITE_MAX });
  const [rectTuiles] = rectanglesDeZone(scene, TABLE.zone_apparition);
  assert.deepEqual(zone.rect, {
    x: rectTuiles.x * scene.tileSize,
    y: rectTuiles.y * scene.tileSize,
    w: rectTuiles.w * scene.tileSize,
    h: rectTuiles.h * scene.tileSize,
  });
  assert.equal(zone.couleur, TABLE.signal.couleur, 'la couleur vient des données');
  console.log(`OK zone signalée : ${zone.rect.w}×${zone.rect.h} px à (${zone.rect.x}, ${zone.rect.y}), couleur ${zone.couleur}`);
}

// --- 4. Pulsation : douce, jamais éteinte, sur l'horloge partagée -------
{
  const alphas = [];
  for (let t = 0; t < TABLE.signal.pulsation_ms * 2; t += 100) {
    alphas.push(signal({ phase: 'nuit', opacite: OPACITE_MAX, heureMs: t })[0].alpha);
  }
  const min = Math.min(...alphas);
  const max = Math.max(...alphas);
  assert.ok(min > 0, 'la teinte ne s’éteint jamais complètement');
  assert.ok(min / max > 0.7, `pulsation douce (${(min / max).toFixed(2)} du maximum au creux)`);
  assert.ok(max - min > 0, 'mais elle respire');
  // Gelée sous UI : `heureMs` est l'horloge de temps de jeu actif, qui ne
  // tourne pas quand une UI est ouverte. Même heure = même teinte.
  assert.equal(
    signal({ phase: 'nuit', opacite: OPACITE_MAX, heureMs: 1234 })[0].alpha,
    signal({ phase: 'nuit', opacite: OPACITE_MAX, heureMs: 1234 })[0].alpha,
  );
  console.log(`OK pulsation entre ${(min / max * 100).toFixed(0)} % et 100 %, sur l’horloge partagée`);
}

// --- 5. Aucune lueur sur les monstres ------------------------------------
{
  // Décision Xav (`Q-27`) : la ZONE se devine, pas les créatures. On le
  // vérifie sur les données plutôt que sur une intention : le rôdeur n'a ni
  // lumière propre, ni visuel qui lui en donnerait une.
  const rodeur = catalogues.enemies.find((e) => e.id === 'enemy_chaos_rodeur');
  assert.equal(rodeur.lumiere, undefined, 'le rôdeur ne porte aucune lumière');
  assert.equal(rodeur.signal, undefined, 'ni signal propre');

  // Et le rendu n'en fabrique pas une : la seule fonction de signal du
  // moteur ne prend que des zones.
  const source = fs.readFileSync(path.join(RACINE, 'src/render.js'), 'utf8');
  const fonction = source.slice(source.indexOf('export function dessinerSignalZones'));
  const corps = fonction.slice(0, fonction.indexOf('\n}\n') + 3).replace(/\/\/.*$/gm, '');
  assert.ok(!/monstre/i.test(corps), 'dessinerSignalZones ne connaît pas les monstres');
  console.log('OK aucune lueur sur les monstres : on devine la zone, pas les créatures');
}

// --- 6. Data-driven : une table sans `signal` ne dessine rien -----------
{
  const copie = JSON.parse(JSON.stringify(catalogues));
  delete copie.spawns[0].signal;
  assert.deepEqual(validerCatalogues(copie), [], 'le signal est optionnel');
  const zones = zonesSignalees(scene, copie.spawns, {
    phase: 'nuit',
    evaluerCondition: flagsAuNiveau(5).evaluate,
    opacite: OPACITE_MAX,
    opaciteMax: OPACITE_MAX,
    heureMs: 0,
  });
  assert.deepEqual(zones, [], 'une zone sans signal reste invisible, sans erreur');

  // Un signal mal formé, lui, tombe au boot.
  for (const mauvais of [{ couleur: 'violet', alpha: 0.2 }, { couleur: '#a24bd0', alpha: 0 }, { couleur: '#a24bd0', alpha: 3 }]) {
    const copie2 = JSON.parse(JSON.stringify(catalogues));
    copie2.spawns[0].signal = mauvais;
    assert.ok(validerCatalogues(copie2).some((e) => /signal/.test(e)), `signal ${JSON.stringify(mauvais)} refusé au boot`);
  }
  console.log('OK signal optionnel, et refusé au boot s’il est mal formé');
}

console.log('OK test_07d_signal_zone');

// Contrat `D-178` : la cinématique d'une partie neuve (convergence, écran de
// choix, départ) suit les réglages graphiques par les MÊMES effets que le
// follet en jeu.
//   1. Chaque effet de la cinématique s'éteint en Bas et s'allume au palier
//      déclaré en données : l'anneau qui respire dès Moyen
//      (`effet_anneau_choix`), les étincelles en Haut (`effet_ornement_follet`,
//      celui du jeu) ; le sillage suit le levier `particules` (Bas : réserve
//      vide, donc rien n'est émis).
//   2. Une seule source des positions (`folletsCinematique`), lue par le
//      dessin ET par le sillage ; les trois dessins d'avant ont disparu.
// Le rendu se juge dans Chrome (`tools/scenarios/intro_reglages.mjs`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { valeurLevier, appliquerParticules } from '../src/qualite.js';
import { ornementActif } from '../src/ornements.js';
import { creerPoussiere, avancerPoussiere, bouffeesVisibles, CAPACITE_RESERVE } from '../src/poussiere.js';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
const config = donnees.graphismes[0];
const effet = (id) => donnees.effets.find((e) => e.id === id);
const levier = (preset, nom) => valeurLevier(config, preset, nom);

// 1. Les paliers, lus sur le vrai catalogue.
{
  const anneau = effet('effet_anneau_choix');
  const etincelles = effet('effet_ornement_follet');
  assert.ok(anneau && anneau.type === 'respiration', 'l\'anneau respire, par un effet en données');
  const allume = (e, preset) => ornementActif(e, levier(preset, 'ornements')) !== null;
  assert.deepEqual(['bas', 'moyen', 'haut'].map((p) => allume(anneau, p)), [false, true, true], 'anneau : dès Moyen');
  assert.deepEqual(['bas', 'moyen', 'haut'].map((p) => allume(etincelles, p)), [false, false, true], 'étincelles : Haut');

  // Le sillage : la même réserve qu'en jeu, allégée par le levier. En Bas,
  // un follet qui traverse l'écran ne laisse rien.
  const emis = (preset) => {
    const reserve = creerPoussiere(appliquerParticules(effet('effet_sillage_follet'), levier(preset, 'particules'), { capacite: CAPACITE_RESERVE }));
    for (let i = 1; i <= 30; i++) avancerPoussiere(reserve, { x: i * 4, y: 0, distancePx: 4, deltaMs: 16, emettre: true });
    return bouffeesVisibles(reserve).length;
  };
  assert.equal(emis('bas'), 0, 'Bas : pas de sillage');
  assert.ok(emis('moyen') > 0, 'Moyen : un sillage');
  assert.ok(emis('haut') >= emis('moyen'), 'Haut : au moins autant qu\'en Moyen');
}

// 2. Une source, un dessin.
{
  const main = fs.readFileSync(path.join(racine, 'src', 'main.js'), 'utf8');
  for (const ancien of ['function dessinerEcranChoixFollet', 'function dessinerIntroConvergence', 'function dessinerDepart']) {
    assert.ok(!main.includes(ancien), `${ancien} a disparu : une seule fonction dessine la cinématique`);
  }
  const corps = (nom) => {
    const i = main.indexOf(`function ${nom}(`);
    assert.ok(i >= 0, nom);
    return main.slice(i, main.indexOf('\n  }\n', i));
  };
  assert.match(corps('dessinerFolletsCinematique'), /folletsCinematique\(\)/);
  assert.match(corps('avancerSillagesCinematique'), /folletsCinematique\(\)/);
  assert.match(corps('dessinerFolletsCinematique'), /effetOrnement/, 'les étincelles du jeu');
  assert.match(corps('dessinerFolletsCinematique'), /effetAnneauChoix/, 'l\'anneau qui respire');
  // Un changement de réglage à chaud refait tout ce que la cinématique lit.
  const appliquer = corps('appliquerGraphismes');
  assert.match(appliquer, /effetAnneauChoix = ornementActif/);
  assert.match(appliquer, /sillagesCinematique = /);
}
console.log('OK test_d178_cinematique_reglages');

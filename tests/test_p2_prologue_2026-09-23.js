// `specs/12_prologue.md`, ticket P2 — la machine à états du prologue et son
// catalogue.
//
// Contrats (jamais une valeur de réglage épinglée : les durées sont lues dans
// les données ou posées par le test lui-même) :
// 1. Un écran attend l'appui : sans lui, il ne part jamais, quel que soit le temps.
// 2. Avant `armement_ms`, l'appui est ignoré ; après, l'écran sort en fondu
//    (`fondu_ms`) et le suivant entre ; après le dernier, le prologue est terminé.
// 3. L'opacité monte à l'entrée, descend à la sortie, reste dans [0, 1] ; un
//    fondu nul est franc.
// 4. Une liste vide est un prologue déjà terminé.
// 5. Le vrai catalogue passe la validation, chaque clé qu'il cite existe dans
//    les deux locales, et un écran mal formé tombe au boot avec son chemin.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { creerPrologue, avancerPrologue, alphaPrologue, prologueArme } from '../src/prologue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const ECRANS = [
  { id: 'a', titre: 't.a', lignes: [], fondu_ms: 200, armement_ms: 500 },
  { id: 'b', titre: 't.b', lignes: [], fondu_ms: 0, armement_ms: 0 },
];

function avancer(etat, ms, appui = false) {
  for (let t = 0; t < ms; t += 16) etat = avancerPrologue(etat, 16, appui);
  return etat;
}

// 1
{
  const etat = avancer(creerPrologue(ECRANS), 60_000);
  assert.equal(etat.index, 0, 'sans appui, le premier écran reste');
  assert.equal(etat.termine, false);
  assert.equal(alphaPrologue(etat), 1);
}

// 2 et 3
{
  let etat = creerPrologue(ECRANS);
  assert.equal(alphaPrologue(etat), 0, 'on entre depuis le noir');
  etat = avancer(etat, 100);
  const alphaEntree = alphaPrologue(etat);
  assert.ok(alphaEntree > 0 && alphaEntree < 1, 'le fondu d’entrée est en cours');

  etat = avancerPrologue(etat, 16, true);
  assert.equal(etat.sortieMs, null, "avant l'armement, l'appui est ignoré");
  assert.equal(prologueArme(etat), false);

  etat = avancer(etat, 500);
  assert.equal(prologueArme(etat), true, "passé l'armement, l'appui est attendu");
  etat = avancerPrologue(etat, 16, true);
  assert.notEqual(etat.sortieMs, null, "l'appui lance la sortie");
  assert.equal(prologueArme(etat), false, 'on ne ré-appuie pas pendant la sortie');
  etat = avancer(etat, 100);
  const alphaSortie = alphaPrologue(etat);
  assert.ok(alphaSortie > 0 && alphaSortie < 1, 'le fondu de sortie est en cours');
  assert.equal(etat.index, 0);

  etat = avancer(etat, 200);
  assert.equal(etat.index, 1, 'le suivant entre à la fin du fondu');
  assert.equal(alphaPrologue(etat), 1, 'un fondu nul est franc');
  assert.equal(prologueArme(etat), true, 'un armement nul accepte tout de suite');

  etat = avancerPrologue(etat, 16, true);
  etat = avancerPrologue(etat, 16, false);
  assert.equal(etat.termine, true, 'après le dernier écran, le prologue est terminé');
  assert.equal(alphaPrologue(etat), 0);
  assert.equal(avancerPrologue(etat, 16, true), etat, 'un prologue terminé ne bouge plus');
}

// 4
assert.equal(creerPrologue([]).termine, true, 'une liste vide est un prologue déjà terminé');

// 5
{
  const noms = Object.keys(SCHEMAS);
  const [locales, { donnees, erreurs }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.equal(erreurs.length, 0, erreurs.join(' ; '));
  assert.deepEqual(validerCatalogues(donnees), []);
  assert.ok(donnees.prologue.length > 0, 'le jeu servi a un prologue');
  for (const ecran of donnees.prologue) {
    for (const cle of [ecran.titre, ...ecran.lignes]) {
      for (const langue of ['fr', 'en']) assert.ok(cle in locales[langue], `clé ${cle} absente de ${langue}.json`);
    }
  }

  const casse = structuredClone(donnees);
  casse.prologue[0].fondu_ms = -1;
  casse.prologue[1].lignes = ['ok', 3];
  const erreursCasse = validerCatalogues(casse).join('\n');
  assert.match(erreursCasse, /prologue.*fondu_ms/);
  assert.match(erreursCasse, /prologue.*lignes/);
}

console.log('OK test_p2_prologue : un écran attend l’appui armé, sort en fondu, le suivant entre ; catalogue valide');

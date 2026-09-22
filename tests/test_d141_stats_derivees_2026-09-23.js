// `D-141` — toute stat primaire du catalogue RÉEL a au moins une dérivée.
// Une stat sans dérivée n'a aucune formule à régler en données : le jour où
// un système en aurait besoin, il la lirait brute (c'était le cas des dégâts
// sur la Force), et l'équilibrage passerait par du code. Même patron que
// l'icône de stat (`test_d13_buffs_bandeau`, bloc 1) : le schéma reste
// permissif pour les fixtures, c'est le jeu réel qui est tenu.
//
// Aucun nombre n'est épinglé ici (règle `D-52`) : on vérifie le contrat,
// jamais la valeur d'un réglage.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { calculerStatsPrimaires, calculerStatsDerivees } from '../src/stats.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

// 1. Chaque stat primaire nourrit au moins une dérivée.
{
  const derivees = registre.tous('stats_derivees');
  for (const s of registre.tous('stats')) {
    assert.ok(derivees.some((d) => d.stat === s.id), `${s.id} n'a aucune stat dérivée dans stats_derivees.json`);
  }
  console.log('OK chaque stat primaire a au moins une dérivée');
}

// 2. Chaque dérivée rend un nombre fini à la valeur de départ des stats :
// une formule mal écrite ne doit pas attendre la première partie pour se voir.
{
  const derivees = calculerStatsDerivees(registre, calculerStatsPrimaires(registre, {}));
  for (const d of registre.tous('stats_derivees')) {
    assert.ok(Number.isFinite(derivees[d.id]), `${d.id} ne rend pas un nombre fini`);
  }
  console.log('OK chaque dérivée rend un nombre fini à une partie neuve');
}

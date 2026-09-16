// Contrat : stats dérivées calculées depuis les données (jamais en dur), et
// les modificateurs (buffs) s'additionnent aux stats de base avant calcul.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { calculerStatsPrimaires, calculerStatsDerivees } from '../src/stats.js';

function registreDeTest() {
  return construireRegistre({
    stats: [
      { id: 'stat_force', label_key: 'x', base: 5 },
      { id: 'stat_agilite', label_key: 'x', base: 5 },
      { id: 'stat_vitalite', label_key: 'x', base: 5 },
    ],
    stats_derivees: [
      { id: 'derivee_pv_max', label_key: 'x', stat: 'stat_vitalite', formule: { base: 10, coefficient: 8, min: 1 } },
      { id: 'derivee_cooldown_attaque_ms', label_key: 'x', stat: 'stat_agilite', formule: { base: 700, coefficient: -40, min: 150 } },
    ],
  });
}

// 1. Stats de base sans modificateur : identiques aux données.
{
  const registre = registreDeTest();
  const primaires = calculerStatsPrimaires(registre);
  assert.equal(primaires.stat_force, 5);
  assert.equal(primaires.stat_vitalite, 5);
}

// 2. Un buff +1 Force modifie bien la stat primaire.
{
  const registre = registreDeTest();
  const primaires = calculerStatsPrimaires(registre, { stat_force: 1 });
  assert.equal(primaires.stat_force, 6);
}

// 3. Dérivées calculées depuis la formule des données, jamais une constante en dur.
{
  const registre = registreDeTest();
  const primaires = calculerStatsPrimaires(registre);
  const derivees = calculerStatsDerivees(registre, primaires);
  assert.equal(derivees.derivee_pv_max, 10 + 8 * 5);
  assert.equal(derivees.derivee_cooldown_attaque_ms, 700 - 40 * 5);
}

// 4. Le plancher (min) de la formule est respecté même à agilité très haute.
{
  const registre = registreDeTest();
  const primaires = calculerStatsPrimaires(registre, { stat_agilite: 100 });
  const derivees = calculerStatsDerivees(registre, primaires);
  assert.equal(derivees.derivee_cooldown_attaque_ms, 150, 'le cooldown ne doit jamais descendre sous le plancher');
}

// 5. Data-driven : ajouter une 3ᵉ dérivée en JSON de test fonctionne sans
// modification de code (aucune formule n'est câblée en dur dans stats.js).
{
  const registre = construireRegistre({
    stats: [{ id: 'stat_esprit', label_key: 'x', base: 5 }],
    stats_derivees: [
      { id: 'derivee_fantaisie', label_key: 'x', stat: 'stat_esprit', formule: { base: 0, coefficient: 3 } },
    ],
  });
  const derivees = calculerStatsDerivees(registre, { stat_esprit: 5 });
  assert.equal(derivees.derivee_fantaisie, 15);
}

console.log('OK test_phase1_stats');

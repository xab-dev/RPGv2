// Contrat (Palier D, specs/04_maison-interieur.md §3.4/§7) : crediter()
// franchit plusieurs niveaux d'un coup, crédite les points cumulés, jamais
// ne perd l'XP en trop — et le vrai catalogue levels.json est valide.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { niveauPourXp, crediter } from '../src/xp.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const NIVEAUX = [
  { id: 'n1', niveau: 1, xp_cumulee: 0, points_stats: 0 },
  { id: 'n2', niveau: 2, xp_cumulee: 10, points_stats: 1 },
  { id: 'n3', niveau: 3, xp_cumulee: 25, points_stats: 1 },
  { id: 'n4', niveau: 4, xp_cumulee: 45, points_stats: 2 },
];

// 1. niveauPourXp : le plus haut niveau atteint.
{
  assert.equal(niveauPourXp(NIVEAUX, 0).niveau, 1);
  assert.equal(niveauPourXp(NIVEAUX, 9).niveau, 1);
  assert.equal(niveauPourXp(NIVEAUX, 10).niveau, 2);
  assert.equal(niveauPourXp(NIVEAUX, 44).niveau, 3);
  assert.equal(niveauPourXp(NIVEAUX, 1000).niveau, 4, 'plafonne au dernier niveau de la table');
}

// 2. crediter() : petit gain, un seul niveau franchi.
{
  const etat = { xp: 0, niveau: 1, pointsStatsLibres: 0 };
  const resultat = crediter(etat, 10, NIVEAUX);
  assert.equal(resultat.xp, 10);
  assert.equal(resultat.niveau, 2);
  assert.equal(resultat.pointsStatsLibres, 1);
  assert.deepEqual(resultat.niveauxFranchis, [2]);
}

// 3. Gros gain d'un coup : plusieurs niveaux franchis, points cumulés,
// jamais d'XP perdue (au-delà de 45, le total XP est conservé intact).
{
  const etat = { xp: 0, niveau: 1, pointsStatsLibres: 0 };
  const resultat = crediter(etat, 50, NIVEAUX);
  assert.equal(resultat.xp, 50);
  assert.equal(resultat.niveau, 4);
  assert.equal(resultat.pointsStatsLibres, 1 + 1 + 2);
  assert.deepEqual(resultat.niveauxFranchis, [2, 3, 4]);
}

// 4. Gain qui ne franchit aucun niveau : xp augmente, niveau et points
// libres inchangés.
{
  const etat = { xp: 12, niveau: 2, pointsStatsLibres: 3 };
  const resultat = crediter(etat, 5, NIVEAUX);
  assert.equal(resultat.xp, 17);
  assert.equal(resultat.niveau, 2);
  assert.equal(resultat.pointsStatsLibres, 3);
  assert.deepEqual(resultat.niveauxFranchis, []);
}

// 5. Le vrai catalogue du dépôt (levels.json) est valide et couvre au moins
// le niveau 10 (cf. §3.4 : "l'arc futur").
{
  const { donnees, erreurs: erreursChargement } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
  assert.deepEqual(erreursChargement, []);
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  const niveaux = registre.tous('levels');
  assert.ok(niveaux.some((n) => n.niveau === 10), 'la table doit couvrir au moins le niveau 10');
  assert.ok(niveaux.some((n) => n.niveau === 5), 'la table doit couvrir le niveau 5 (critère de la boucle)');
}

console.log('OK test_phase3_xp');

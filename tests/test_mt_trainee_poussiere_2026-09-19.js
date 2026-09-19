// MT_trainee-poussiere_2026-09-19 : petites bouffées blanches quand le héros
// marche, 2-3 visibles à la fois. Remplace le roulement (jamais implémenté).
//
// Contrats vérifiés ici, tels que listés par la fiche §Tests :
//   - X px parcourus -> k bouffées (émission à la DISTANCE, pas au temps) ;
//   - la réserve ne grandit jamais (zéro allocation en jeu) ;
//   - immobile -> 0 ; UI ouverte -> 0 ;
//   - deux exécutions identiques donnent exactement les mêmes bouffées.
//
// Et la règle directrice de la fiche : l'effet ne dépend pas de la forme du
// héros — ce module ne reçoit qu'une position et une distance, jamais un
// rayon ni un visuel.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  creerPoussiere,
  avancerPoussiere,
  bouffeesVisibles,
  viderPoussiere,
  CAPACITE_RESERVE,
} from '../src/poussiere.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);

const CONFIG = donnees.effets.find((e) => e.id === 'effet_poussiere');
assert.ok(CONFIG, 'effet_poussiere doit exister dans data/effets.json');
assert.ok(
  donnees.visuels.some((v) => v.id === CONFIG.visuel),
  'le visuel de la poussière doit exister dans data/visuels.json',
);

// Avance en ligne droite, par pas de `pasPx`, sur `distanceTotale` px.
function marcher(etat, distanceTotale, { pasPx = 2, deltaMs = 16, emettre = true } = {}) {
  let x = 0;
  const emises = [];
  const avant = etat.bouffees.length;
  for (let parcouru = 0; parcouru < distanceTotale; parcouru += pasPx) {
    x += pasPx;
    const actifsAvant = etat.bouffees.filter((b) => b.active).length;
    avancerPoussiere(etat, { x, y: 0, distancePx: pasPx, deltaMs, emettre });
    const actifsApres = etat.bouffees.filter((b) => b.active).length;
    if (actifsApres > actifsAvant) emises.push(x);
    assert.equal(etat.bouffees.length, avant, 'la réserve ne doit JAMAIS grandir');
  }
  return emises;
}

// --- 1. X px parcourus -> k bouffées, indépendamment du framerate ---------
{
  const distance = CONFIG.intervalle_px * 5;
  // Durée volontairement longue pour qu'aucune bouffée ne meure pendant la
  // mesure : on compte bien les émissions, pas les survivantes.
  for (const pasPx of [1, 2, 4, 7]) {
    const etat = creerPoussiere({ ...CONFIG, duree_ms: 1e9 });
    const actifs = etat.bouffees.filter((b) => b.active).length;
    assert.equal(actifs, 0, 'une réserve neuve est vide');
    marcher(etat, distance, { pasPx, deltaMs: 1 });
    const vivantes = etat.bouffees.filter((b) => b.active).length;
    assert.equal(
      vivantes,
      5,
      `${distance} px parcourus par pas de ${pasPx} px doivent donner 5 bouffées (obtenu ${vivantes})`,
    );
  }
  console.log('OK X px -> k bouffées, identique quel que soit le pas (émission à la distance)');
}

// Même distance, framerate très différent : même nombre de bouffées.
{
  const distance = CONFIG.intervalle_px * 8;
  const lent = creerPoussiere({ ...CONFIG, duree_ms: 1e9 });
  const rapide = creerPoussiere({ ...CONFIG, duree_ms: 1e9 });
  marcher(lent, distance, { pasPx: 8, deltaMs: 33 }); // ~30 fps
  marcher(rapide, distance, { pasPx: 1, deltaMs: 7 }); // ~144 fps
  assert.equal(
    lent.bouffees.filter((b) => b.active).length,
    rapide.bouffees.filter((b) => b.active).length,
    'la densité de la traînée ne dépend pas du framerate',
  );
  console.log('OK densité identique à 30 et 144 fps');
}

// --- 2. La réserve ne grandit jamais, même en abus ------------------------
{
  const etat = creerPoussiere({ ...CONFIG, duree_ms: 1e9 });
  assert.equal(etat.bouffees.length, CAPACITE_RESERVE, 'réserve pré-allouée à sa capacité');
  // 100 fois de quoi émettre : la réserve sature, elle ne s'agrandit pas.
  marcher(etat, CONFIG.intervalle_px * 100, { pasPx: 3 });
  assert.equal(etat.bouffees.length, CAPACITE_RESERVE, 'la réserve garde sa taille');
  assert.ok(
    etat.bouffees.filter((b) => b.active).length <= CAPACITE_RESERVE,
    'jamais plus de bouffées actives que la capacité',
  );
  // Un saut de position énorme (téléportation) ne fait pas non plus grandir.
  avancerPoussiere(etat, { x: 99999, y: 99999, distancePx: 50000, deltaMs: 16, emettre: true });
  assert.equal(etat.bouffees.length, CAPACITE_RESERVE, 'une téléportation ne réalloue rien');
  console.log('OK la réserve reste fixe (8), y compris en saturation et en téléportation');
}

// --- 3. Immobile -> 0 ; UI ouverte -> 0 -----------------------------------
{
  const etat = creerPoussiere(CONFIG);
  for (let i = 0; i < 200; i += 1) {
    avancerPoussiere(etat, { x: 10, y: 10, distancePx: 0, deltaMs: 16, emettre: true });
  }
  assert.equal(bouffeesVisibles(etat).length, 0, 'à l\'arrêt, aucune bouffée');

  // UI ouverte : l'appelant passe emettre=false. Même en « bougeant », rien.
  const sousUi = creerPoussiere(CONFIG);
  marcher(sousUi, CONFIG.intervalle_px * 20, { emettre: false });
  assert.equal(bouffeesVisibles(sousUi).length, 0, 'UI ouverte, aucune bouffée');
  console.log('OK immobile -> 0 bouffée, UI ouverte -> 0 bouffée');
}

// L'arrêt ne met rien « en réserve » : reprendre la marche ne crache pas une
// bouffée en retard.
{
  const etat = creerPoussiere(CONFIG);
  // Presque de quoi émettre, puis arrêt.
  avancerPoussiere(etat, { x: 0, y: 0, distancePx: CONFIG.intervalle_px - 0.5, deltaMs: 16, emettre: true });
  assert.equal(etat.bouffees.filter((b) => b.active).length, 0);
  avancerPoussiere(etat, { x: 0, y: 0, distancePx: 0, deltaMs: 16, emettre: true });
  assert.equal(etat.distanceDepuisDerniere, 0, 'l\'arrêt remet le compteur de distance à zéro');
  avancerPoussiere(etat, { x: 1, y: 0, distancePx: 1, deltaMs: 16, emettre: true });
  assert.equal(etat.bouffees.filter((b) => b.active).length, 0, 'reprendre la marche ne crache pas une bouffée en retard');
  console.log('OK l\'arrêt ne met aucune bouffée « en attente »');
}

// --- 4. Déterminisme : deux exécutions identiques, mêmes bouffées ---------
{
  const a = creerPoussiere(CONFIG);
  const b = creerPoussiere(CONFIG);
  const scenario = [3, 7, 2, 11, 5, 1, 9, 4, 6, 8, 2, 13];
  for (const pas of scenario) {
    avancerPoussiere(a, { x: pas, y: pas * 2, distancePx: pas, deltaMs: 16, emettre: true });
    avancerPoussiere(b, { x: pas, y: pas * 2, distancePx: pas, deltaMs: 16, emettre: true });
  }
  assert.deepEqual(bouffeesVisibles(a), bouffeesVisibles(b), 'deux exécutions identiques -> mêmes bouffées');
  assert.ok(bouffeesVisibles(a).length > 0, 'le scénario doit bien produire des bouffées');
  console.log(`OK déterminisme (${bouffeesVisibles(a).length} bouffées identiques, aucun Math.random)`);
}

// Le décalage latéral alterne bien (gauche/droite), de façon déterministe.
{
  const etat = creerPoussiere({ ...CONFIG, duree_ms: 1e9 });
  marcher(etat, CONFIG.intervalle_px * 4, { pasPx: 1 });
  const cotes = etat.bouffees.filter((b) => b.active).map((b) => b.cote);
  assert.deepEqual(new Set(cotes), new Set([1, -1]), 'les bouffées alternent de part et d\'autre');
  console.log('OK décalage latéral alterné');
}

// --- 5. Vieillissement : alpha décroît, échelle grossit, puis la bouffée meurt ---
{
  const etat = creerPoussiere(CONFIG);
  avancerPoussiere(etat, { x: 0, y: 0, distancePx: CONFIG.intervalle_px, deltaMs: 0, emettre: true });
  const naissance = bouffeesVisibles(etat)[0];
  assert.ok(naissance, 'une bouffée à la naissance');
  assert.ok(Math.abs(naissance.alpha - CONFIG.alpha_depart) < 1e-9, 'alpha de départ conforme aux données');
  assert.ok(Math.abs(naissance.echelle - CONFIG.echelle_depart) < 1e-9, 'échelle de départ conforme aux données');

  let precedent = naissance;
  for (let t = 0; t < CONFIG.duree_ms; t += 10) {
    avancerPoussiere(etat, { x: 0, y: 0, distancePx: 0, deltaMs: 10, emettre: false });
    const courant = bouffeesVisibles(etat)[0];
    if (!courant) break;
    assert.ok(courant.alpha <= precedent.alpha + 1e-9, 'alpha ne remonte jamais');
    assert.ok(courant.echelle >= precedent.echelle - 1e-9, 'échelle ne rapetisse jamais');
    precedent = courant;
  }
  // Une fois la durée écoulée, la bouffée est morte (recyclable).
  avancerPoussiere(etat, { x: 0, y: 0, distancePx: 0, deltaMs: CONFIG.duree_ms, emettre: false });
  assert.equal(bouffeesVisibles(etat).length, 0, 'la bouffée meurt au bout de duree_ms');
  assert.equal(etat.bouffees.length, CAPACITE_RESERVE, 'et sa place est recyclée, pas retirée');
  console.log('OK vieillissement : alpha décroît, échelle grossit, puis recyclage');
}

// --- 6. viderPoussiere : changement de scène ------------------------------
{
  const etat = creerPoussiere({ ...CONFIG, duree_ms: 1e9 });
  marcher(etat, CONFIG.intervalle_px * 3, { pasPx: 1 });
  assert.ok(bouffeesVisibles(etat).length > 0);
  viderPoussiere(etat);
  assert.equal(bouffeesVisibles(etat).length, 0, 'la traînée ne suit pas le héros d\'une scène à l\'autre');
  assert.equal(etat.bouffees.length, CAPACITE_RESERVE, 'sans réallouer la réserve');
  console.log('OK viderPoussiere() vide sans réallouer');
}

// --- 7. L'effet ne dépend pas de la forme du héros ------------------------
// Garde-fou de la règle directrice : la signature publique du module ne parle
// que de position et de distance. Si un jour quelqu'un y passe un rayon ou un
// visuel de héros, ce test le signalera.
{
  const fichier = await import('node:fs/promises').then((fs) =>
    fs.readFile(path.join(RACINE, 'src', 'poussiere.js'), 'utf8'),
  );
  // Les commentaires, eux, ONT le droit de parler du héros (ils expliquent
  // justement pourquoi le module l'ignore) : on n'inspecte que le code.
  const source = fichier
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('//'))
    .join('\n');
  for (const interdit of ['rayon', 'heroVisuel', 'hitbox']) {
    assert.ok(
      !source.includes(interdit),
      `poussiere.js ne doit jamais connaître "${interdit}" : l'effet vit dans le monde, pas sur le héros`,
    );
  }
  assert.ok(!/Math\.random/.test(source), 'aucun Math.random dans le module (déterminisme exigé)');
  console.log('OK le module ignore la forme du héros et n\'utilise aucun aléa');
}

console.log('OK test_mt_trainee_poussiere');

// Contrat de `specs/10_alignement-follet.md`, palier A : la STAT, et rien
// d'autre — aucun effet en jeu à ce palier.
//
// 1. `regime` : le signe donne le régime, la valeur absolue le palier, et la
//    bande morte rend neutre. Éprouvé aux onze valeurs entières et aux bords
//    de la spec (±0,99 / ±1 / ±2 / ±3 / ±4,99 / ±5).
// 2. Bornage sans arrondi, et `ecart` dit ce qui a réellement bougé.
// 3. Migration 7 -> 8 : 0 écrit EXPLICITEMENT ; après elle, un champ absent
//    ou hors bornes est un échec dur, jamais un repli sur 0.
// 4. Les sauvegardes réelles de Xav (`prive/`, `D-15`) migrent sans rien
//    perdre et naissent neutres.
// 5. `?alignement=N` : patron de `?echelle=N`, jamais de repli plausible.
// 6. Le schéma d'`alignement.json` refuse ce qui rendrait `regime` faux.
// 7. `modifierAlignement` est le SEUL écrivain de `save.hero.alignement`, et
//    la valeur forcée par l'URL masque la sauvegarde sans l'écrire.
// 8. Aucune clé de localisation ne nomme l'alignement (§0 : jamais affiché).

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, migrer, creerStoreMemoire, VERSION_SCHEMA_COURANTE } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import {
  configAlignement, regime, borner, appliquerDelta, lireAlignement, lireAlignementForce,
} from '../src/alignement.js';
import { formaterReleve } from '../src/debug_perf.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const config = configAlignement(registre);
const { bornes } = config;

// --- 1. Régime et palier ---------------------------------------------------
// Les paliers ne sont pas un réglage : ils sont la DÉCISION verrouillée de
// Xav (NS alignement §2 A, spec §0) — `abs(A) < 1` neutre · 1–2 · 3–4 · 5.
// Le test les éprouve donc sur le catalogue réel : si les données dérivent de
// la décision, c'est ici que ça doit se voir.
{
  const attendu = (v) => {
    const a = Math.abs(v);
    const palier = a < 1 ? 0 : a < 3 ? 1 : a < 5 ? 2 : 3;
    return { regime: palier === 0 ? 'neutre' : v > 0 ? 'positif' : 'negatif', palier };
  };
  const valeurs = [];
  for (let v = -5; v <= 5; v++) valeurs.push(v);
  for (const b of [0.99, 1, 2, 3, 4.99, 5]) valeurs.push(b, -b);
  for (const v of valeurs) {
    assert.deepEqual(regime(v, config), attendu(v), `regime(${v})`);
  }
  // `-0` est un zéro : neutre, jamais « négatif palier 0 ».
  assert.deepEqual(regime(-0, config), { regime: 'neutre', palier: 0 });
  // Le cas que « jusqu'à » laissait flou : entre deux entiers.
  assert.equal(regime(2.5, config).palier, 1);
  assert.equal(regime(-4.75, config).palier, 2);
  console.log(`OK regime : ${valeurs.length} valeurs, signe = régime, valeur absolue = palier, bande morte neutre`);
}

// --- 2. Bornage et écart ---------------------------------------------------
{
  assert.equal(borner(7, bornes), bornes.max);
  assert.equal(borner(-9, bornes), bornes.min);
  assert.equal(borner(1.25, bornes), 1.25);
  // Aucun arrondi : un +0,1 (lecture complète) s'accumule tel quel.
  assert.deepEqual(appliquerDelta(0, 0.25, bornes), { valeur: 0.25, ecart: 0.25 });
  assert.deepEqual(appliquerDelta(-0.25, -0.25, bornes), { valeur: -0.5, ecart: -0.5 + 0.25 });
  // Contre la borne, l'écart dit la vérité : ce qui a bougé, pas ce qu'on a demandé.
  assert.deepEqual(appliquerDelta(bornes.max - 1, 5, bornes), { valeur: bornes.max, ecart: 1 });
  assert.deepEqual(appliquerDelta(bornes.min, -1, bornes), { valeur: bornes.min, ecart: 0 });
  console.log('OK bornage sans arrondi, écart = ce qui a réellement bougé');
}

// --- 3. Sauvegarde : partie neuve, migration 7 -> 8, échec dur ----------
{
  assert.equal(VERSION_SCHEMA_COURANTE, 8);
  const neuve = saveNeuve();
  assert.equal(neuve.hero.alignement, 0, 'un héros naît neutre');
  assert.equal(lireAlignement(neuve.hero, bornes), 0);

  const v7 = { ...saveNeuve(), schema_version: 7 };
  delete v7.hero.alignement;
  const migre = migrer(v7);
  assert.equal(migre.schema_version, 8);
  assert.ok(Object.prototype.hasOwnProperty.call(migre.hero, 'alignement'), 'le champ est ÉCRIT, pas sous-entendu');
  assert.equal(migre.hero.alignement, 0);
  assert.equal(migre.hero.niveau, v7.hero.niveau, 'la migration ne touche que son champ');

  // Après la migration, l'absence n'est jamais lue comme 0.
  const sansChamp = { ...saveNeuve().hero };
  delete sansChamp.alignement;
  assert.throws(() => lireAlignement(sansChamp, bornes), /absent/);
  assert.throws(() => lireAlignement({ alignement: '2' }, bornes), /non numérique/);
  assert.throws(() => lireAlignement({ alignement: NaN }, bornes), /non numérique/);
  assert.throws(() => lireAlignement({ alignement: bornes.max + 1 }, bornes), /hors des bornes/);
  assert.equal(lireAlignement({ alignement: -3.25 }, bornes), -3.25);
  console.log('OK sauvegarde : partie neuve à 0, migration 7 -> 8 écrit 0, absence = échec dur');
}

// --- 4. Les sauvegardes réelles (`D-15`) -----------------------------------
// Même discipline que `test_d121` : `prive/` n'existe que sur le PC de Xav.
// Là où il manque, le bloc le DIT en toutes lettres — ce n'est pas un vert
// silencieux, c'est une preuve qui n'a pas pu être faite ici.
{
  const dossier = path.join(RACINE, 'prive', 'sauvegardes');
  const present = await fs.stat(dossier).then(() => true, () => false);
  if (!present) {
    console.log('-- NON ÉPROUVÉ : prive/sauvegardes/ absent, la migration 7 -> 8 n\'a pas été jouée sur les sauvegardes réelles');
  } else {
    const fichiers = (await fs.readdir(dossier)).filter((f) => f.endsWith('.json'));
    assert.ok(fichiers.length > 0, 'il doit y avoir des sauvegardes réelles à éprouver');
    const versions = new Set();
    for (const fichier of fichiers) {
      const brut = JSON.parse(await fs.readFile(path.join(dossier, fichier), 'utf8'));
      const payload = brut.payload || brut;
      assert.equal(typeof payload.schema_version, 'number', `${fichier} : version lisible`);
      versions.add(payload.schema_version);
      const migre = migrer(payload);
      assert.equal(migre.schema_version, VERSION_SCHEMA_COURANTE, `${fichier} : migrée`);
      assert.equal(lireAlignement(migre.hero, bornes), 0, `${fichier} : née neutre`);
      // Sans perte (`D-15`) : lieu, niveau, heure du cycle, poche.
      const deVersion = migrer(payload, payload.schema_version < 7 ? 7 : payload.schema_version);
      assert.equal(migre.hero.scene, deVersion.hero.scene, `${fichier} : lieu`);
      assert.equal(migre.hero.niveau, deVersion.hero.niveau, `${fichier} : niveau`);
      assert.equal(migre.monde.heure, deVersion.monde.heure, `${fichier} : heure du cycle`);
      assert.deepEqual(migre.inventaire, deVersion.inventaire, `${fichier} : poche`);
    }
    console.log(`OK les ${fichiers.length} sauvegardes réelles (versions ${[...versions].sort().join(', ')}) migrent en v8, neutres, sans perte`);
  }
}

// --- 5. `?alignement=N` ------------------------------------------------------
{
  assert.deepEqual(lireAlignementForce('', bornes), { valeur: null, avertissement: null });
  assert.deepEqual(lireAlignementForce('?debug=fps', bornes), { valeur: null, avertissement: null });
  assert.deepEqual(lireAlignementForce('?alignement=3', bornes), { valeur: 3, avertissement: null });
  assert.deepEqual(lireAlignementForce('?alignement=-0.5', bornes), { valeur: -0.5, avertissement: null });
  assert.deepEqual(lireAlignementForce('?alignement=0', bornes), { valeur: 0, avertissement: null });
  for (const brut of ['9', '-6', 'abc', '', ' ', 'Infinity']) {
    const lu = lireAlignementForce(`?alignement=${brut}`, bornes);
    assert.equal(lu.valeur, null, `?alignement=${brut} : aucune valeur de repli`);
    assert.match(lu.avertissement, /ignoré/, `?alignement=${brut} : l'avertissement est dit`);
  }
  console.log('OK ?alignement=N : valeur dans les bornes des données, sinon null ET avertissement');
}

// --- 6. Schéma --------------------------------------------------------------
{
  const valider = (entree) => SCHEMAS.alignement.custom(entree, donnees, 'alignement.json > test');
  assert.deepEqual(valider(config), [], 'le catalogue réel est valide');
  const cas = [
    ['bornes qui n\'encadrent pas 0', { ...config, bornes: { min: 0, max: 5 } }],
    ['paliers non croissants', { ...config, paliers: [{ des: 3, palier: 1 }, { des: 1, palier: 2 }] }],
    ['palier 0 déclaré', { ...config, paliers: [{ des: 1, palier: 0 }] }],
    ['seuil hors bornes', { ...config, paliers: [{ des: 1, palier: 1 }, { des: 6, palier: 2 }] }],
    ['durée d\'inversion absente', { ...config, orbite: {} }],
    ['poids manquant', { ...config, poids_defaut: { ...config.poids_defaut, mort: undefined } }],
    ['entrée étrangère', { id: 'alignement_autre' }],
  ];
  for (const [nom, entree] of cas) {
    assert.ok(valider(entree).length > 0, `refusé : ${nom}`);
  }
  console.log(`OK schéma d'alignement.json : catalogue réel valide, ${cas.length} formes fautives refusées`);
}

// --- 7. Un seul écrivain, et la valeur forcée ne s'écrit jamais -----------
function orchestrateur(save, alignementForce = null) {
  const input = {
    maj: () => ({
      move: { x: 0, y: 0 },
      attack: { pressed: false, held: false },
      skill_1: { pressed: false, held: false },
      skill_2: { pressed: false, held: false },
      skill_3: { pressed: false, held: false },
      consume: { pressed: false, held: false },
      interact: { pressed: false, held: false },
      menu: { pressed: false, held: false },
      target_next: { pressed: false, held: false },
    }),
  };
  return creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} },
    input,
    ctxLogique: null,
    ctxVisible: null,
    canvasLogique: null,
    alignementForce,
  });
}
{
  const save = saveNeuve();
  const orch = orchestrateur(save);
  assert.deepEqual(orch.etatAlignement(), { valeur: 0, forcee: false, regime: 'neutre', palier: 0 });
  assert.deepEqual(orch.modifierAlignement(-1.25, 'test'), { valeur: -1.25, ecart: -1.25 });
  assert.equal(save.hero.alignement, -1.25);
  assert.deepEqual(orch.etatAlignement(), { valeur: -1.25, forcee: false, regime: 'negatif', palier: 1 });
  assert.deepEqual(orch.modifierAlignement(-10, 'test'), { valeur: bornes.min, ecart: bornes.min + 1.25 });
  // Aucun effet à ce palier : écrire n'a déplacé ni le héros, ni le follet.
  orch.maj(16);
  assert.equal(save.hero.alignement, bornes.min, 'une frame ne réécrit pas l\'alignement');

  // `?alignement=3` : le jeu voit 3, la sauvegarde garde SA valeur, et une
  // écriture pendant la session atteint la sauvegarde sans changer ce qu'on voit.
  const save2 = saveNeuve();
  save2.hero.alignement = -2;
  const force = orchestrateur(save2, 3);
  assert.deepEqual(force.etatAlignement(), { valeur: 3, forcee: true, regime: 'positif', palier: 2 });
  force.maj(16);
  assert.equal(save2.hero.alignement, -2, 'la valeur forcée n\'est jamais persistée');
  force.modifierAlignement(0.5, 'test');
  assert.equal(save2.hero.alignement, -1.5);
  assert.equal(force.etatAlignement().valeur, 3);

  // Le relevé `?debug=fps` dit la valeur, et dit quand elle est forcée.
  const ligne = (etat) => formaterReleve({
    fps: 60, deltaMoyenMs: 16, deltaP95Ms: 16, deltaMaxMs: 16, framesPlafonnees: 0, framesTotales: 1,
    dureeMajMoyenneMs: 0, dureeMajP95Ms: 0, dureeDessinerMoyenneMs: 0, dureeDessinerP95Ms: 0, framesLentes: 0,
    recalculsCoucheStatique: { nombre: 0 },
    ecartHeroX: { moyenne: 0, min: 0, max: 0 }, ecartHeroY: { moyenne: 0, min: 0, max: 0 },
    entites: { monstres: 0, puzzles: 0, objetsSol: 0 },
    ecranPhysique: { largeurPhysique: 1, hauteurPhysique: 1, dpr: 1 },
    echelleRendu: { forcee: null, naturelle: 4 }, coucheStatique: null, canvasVoile: null,
    peripheriqueActif: 'manette', basculesParSeconde: 0, alignement: etat,
  }).split('\n').pop();
  assert.equal(ligne(orch.etatAlignement()), `alignement : ${bornes.min} — régime negatif, palier 3`);
  assert.match(ligne(force.etatAlignement()), /^alignement : 3 \(forcé par \?alignement\) — régime positif, palier 2$/);
  assert.equal(ligne(null), 'alignement : non relevé');
  console.log('OK modifierAlignement écrit, borne et rend l\'écart ; ?alignement masque sans persister ; le relevé le dit');
}

// Garde statique : dans `src/`, `hero.alignement` n'est ASSIGNÉ qu'à un seul
// endroit (`main.js#modifierAlignement`) — la sauvegarde neuve et la
// migration, dans `save.js`, le déclarent comme littéral d'objet, jamais par
// affectation. Un second écrivain ferait diverger ce que la spec 11 croit
// être la seule porte.
{
  const dossierSrc = path.join(RACINE, 'src');
  const fichiers = [];
  const parcourir = async (dossier) => {
    for (const e of await fs.readdir(dossier, { withFileTypes: true })) {
      const complet = path.join(dossier, e.name);
      if (e.isDirectory()) await parcourir(complet);
      else if (e.name.endsWith('.js')) fichiers.push(complet);
    }
  };
  await parcourir(dossierSrc);
  const affectations = [];
  for (const f of fichiers) {
    const lignes = (await fs.readFile(f, 'utf8')).split(/\r?\n/);
    lignes.forEach((l, i) => {
      if (/hero\.alignement\s*(=(?!=)|\+=|-=)/.test(l)) affectations.push(`${path.relative(RACINE, f)}:${i + 1}`);
    });
  }
  assert.equal(affectations.length, 1, `un seul écrivain attendu, trouvés : ${affectations.join(', ')}`);
  assert.match(affectations[0], /^src[\\/]main\.js:/);
  console.log(`OK un seul écrivain de hero.alignement dans src/ (${affectations[0]})`);
}

// --- 8. Aucun texte ne la nomme --------------------------------------------
{
  for (const [langue, dico] of Object.entries(dictionnaires)) {
    const cles = Object.keys(dico).filter((c) => /align/i.test(c));
    assert.deepEqual(cles, [], `locales/${langue}.json : aucune clé ne nomme l'alignement`);
    const valeurs = Object.entries(dico).filter(([, v]) => typeof v === 'string' && /alignement|alignment/i.test(v));
    assert.deepEqual(valeurs, [], `locales/${langue}.json : aucun texte ne nomme l'alignement`);
  }
  console.log('OK aucune clé ni aucun texte de localisation ne nomme l\'alignement');
}

console.log('OK test_spec10_alignement_palier_a');

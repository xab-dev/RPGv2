// Contrat de `specs/14_annexe-1.md`, palier A : les niveaux jusqu'au Nv.50.
//
// 1. La table réelle : contiguë depuis le Nv.1, XP strictement croissante,
//    jusqu'au Nv.50 au moins (Xav en a besoin pour ses tests, §3.9).
// 2. Chaque niveau a son flag, déclaré et traduit en FR et en EN — et le
//    démarrage REFUSE un niveau sans flag : l'oubli ne peut plus arriver.
// 3. `crediter` part du niveau crédité, jamais de celui que l'XP donnerait :
//    un niveau dû après l'allongement de la table est rendu (flag + point),
//    et un niveau crédité n'est jamais repris.
// 4. Au chargement, l'orchestrateur rattrape les niveaux dus, sans jamais
//    rétrograder.
// 5. Les sauvegardes réelles de Xav (`prive/`) : chargées, elles ne perdent
//    ni ne gagnent un niveau qu'elles n'ont pas, et continuent de progresser
//    au-delà du Nv.30.
//
// Aucune valeur de réglage n'est épinglée (courbe, points par niveau) : les
// seuils sont relus dans la table.

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, migrer, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { crediter, niveauPourXp, flagDeNiveau } from '../src/xp.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const NIVEAUX = [...registre.tous('levels')].sort((a, b) => a.niveau - b.niveau);
const seuil = (n) => NIVEAUX.find((x) => x.niveau === n).xp_cumulee;
const points = (n) => NIVEAUX.find((x) => x.niveau === n).points_stats;

// --- 1. La table ---------------------------------------------------------------
{
  NIVEAUX.forEach((n, i) => assert.equal(n.niveau, i + 1, `table contiguë : ${n.id}`));
  for (let i = 1; i < NIVEAUX.length; i++) {
    assert.ok(NIVEAUX[i].xp_cumulee > NIVEAUX[i - 1].xp_cumulee, `XP strictement croissante au ${NIVEAUX[i].id}`);
  }
  assert.ok(NIVEAUX.length >= 50, `la table va jusqu'au Nv.50 au moins (elle s'arrête au Nv.${NIVEAUX.length})`);
  console.log(`OK table : Nv.1 à Nv.${NIVEAUX.length}, contiguë, XP croissante`);
}

// --- 2. Un flag par niveau -----------------------------------------------------
{
  for (const n of NIVEAUX) {
    const flag = registre.tous('flags').find((f) => f.id === flagDeNiveau(n.niveau));
    assert.ok(flag, `${n.id} : son flag est déclaré`);
    for (const langue of ['fr', 'en']) {
      assert.equal(typeof dictionnaires[langue][flag.label_key], 'string', `${flag.id} : traduit en ${langue}`);
    }
  }
  // Le démarrage refuse un niveau dont le flag manque, avec son chemin.
  const sansFlag = { ...donnees, flags: donnees.flags.filter((f) => f.id !== flagDeNiveau(NIVEAUX.at(-1).niveau)) };
  const refus = validerCatalogues(sansFlag);
  assert.ok(
    refus.some((e) => e.includes('levels') && e.includes(flagDeNiveau(NIVEAUX.at(-1).niveau))),
    `un niveau sans flag est refusé au démarrage (reçu : ${JSON.stringify(refus)})`,
  );
  console.log('OK chaque niveau a son flag, traduit ; un flag manquant est refusé au démarrage');
}

// --- 3. `crediter` part du niveau crédité -------------------------------------
{
  // Un héros resté au Nv.30 alors que son XP atteint déjà le Nv.31 : rien
  // gagné, et pourtant le Nv.31 lui est dû.
  const du = crediter({ xp: seuil(31), niveau: 30, pointsStatsLibres: 2 }, 0, NIVEAUX);
  assert.deepEqual(du.niveauxFranchis, [31]);
  assert.equal(du.niveau, 31);
  assert.equal(du.pointsStatsLibres, 2 + points(31));
  // Même cas avec un gain : le niveau dû ET le suivant.
  const avecGain = crediter({ xp: seuil(31), niveau: 30, pointsStatsLibres: 0 }, seuil(32) - seuil(31), NIVEAUX);
  assert.deepEqual(avecGain.niveauxFranchis, [31, 32]);
  // Jamais repris : un Nv.10 sans l'XP qui va avec reste Nv.10.
  const pose = crediter({ xp: 0, niveau: 10, pointsStatsLibres: 0 }, 0, NIVEAUX);
  assert.equal(pose.niveau, 10);
  assert.deepEqual(pose.niveauxFranchis, []);
  // Et un gain qui ne l'amène pas au Nv.11 ne le fait pas redescendre.
  assert.equal(crediter({ xp: 0, niveau: 10, pointsStatsLibres: 0 }, 1, NIVEAUX).niveau, 10);
  // Sans niveau connu (un état ancien), le départ reste celui de l'XP.
  assert.deepEqual(crediter({ xp: seuil(3), pointsStatsLibres: 0 }, 0, NIVEAUX).niveauxFranchis, []);
  console.log('OK crediter : un niveau dû est rendu (flag + point), un niveau crédité n\'est jamais repris');
}

// --- 4. Le rattrapage au chargement -------------------------------------------
function orchestrateur(save) {
  const neutre = { pressed: false, held: false };
  return creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} },
    input: {
      maj: () => ({
        move: { x: 0, y: 0 },
        attack: neutre, skill_1: neutre, skill_2: neutre, skill_3: neutre,
        consume: neutre, interact: neutre, menu: neutre, target_next: neutre,
      }),
    },
    ctxLogique: null,
    ctxVisible: null,
    canvasLogique: null,
  });
}
{
  const save = saveNeuve();
  save.hero.niveau = 30;
  save.hero.xp = seuil(32);
  save.hero.points_stats_libres = 0;
  orchestrateur(save);
  assert.equal(save.hero.niveau, 32, 'les niveaux dus sont crédités dès le chargement');
  assert.equal(save.hero.points_stats_libres, points(31) + points(32));
  assert.equal(save.flags[flagDeNiveau(31)], true);
  assert.equal(save.flags[flagDeNiveau(32)], true);
  assert.notEqual(save.flags[flagDeNiveau(33)], true);

  const posee = saveNeuve();
  posee.hero.niveau = 10;
  const flagsAvant = { ...posee.flags };
  orchestrateur(posee);
  assert.equal(posee.hero.niveau, 10, 'le chargement ne rétrograde jamais');
  assert.deepEqual(posee.flags, flagsAvant, 'et ne pose aucun flag de niveau');
  console.log('OK chargement : niveaux dus rattrapés (flags + points), jamais de rétrogradation');
}

// --- 5. Les sauvegardes réelles (`prive/`, `D-15`) ------------------------------
// Même discipline que `test_d121` : `prive/` n'existe que sur le PC de Xav.
// Là où il manque, le bloc le DIT — ce n'est pas un vert silencieux.
{
  const dossier = path.join(RACINE, 'prive', 'sauvegardes');
  const present = await fs.stat(dossier).then(() => true, () => false);
  if (!present) {
    console.log('-- NON ÉPROUVÉ : prive/sauvegardes/ absent, les sauvegardes réelles n\'ont pas été chargées');
  } else {
    const fichiers = (await fs.readdir(dossier)).filter((f) => f.endsWith('.json'));
    let auDernierPalierAvant = 0;
    for (const fichier of fichiers) {
      const brut = JSON.parse(await fs.readFile(path.join(dossier, fichier), 'utf8'));
      const save = migrer(brut.payload || brut);
      const niveauLu = save.hero.niveau;
      const attendu = Math.max(niveauLu, niveauPourXp(NIVEAUX, save.hero.xp).niveau);
      orchestrateur(save);
      assert.equal(save.hero.niveau, attendu, `${fichier} : ni perdu ni gagné de niveau au chargement`);
      for (let n = 2; n <= save.hero.niveau; n++) {
        if (n > niveauLu) assert.equal(save.flags[flagDeNiveau(n)], true, `${fichier} : flag du Nv.${n} rattrapé`);
      }
      if (niveauLu < 30) continue;
      // Au-delà du Nv.30 (la fin de l'ancienne table) : elle progresse.
      auDernierPalierAvant += 1;
      const suivant = save.hero.niveau + 1;
      save.hero.xp = seuil(suivant);
      const libres = save.hero.points_stats_libres;
      orchestrateur(save);
      assert.equal(save.hero.niveau, suivant, `${fichier} : passe au Nv.${suivant}`);
      assert.equal(save.flags[flagDeNiveau(suivant)], true, `${fichier} : pose le flag du Nv.${suivant}`);
      assert.equal(save.hero.points_stats_libres, libres + points(suivant), `${fichier} : reçoit son point`);
    }
    console.log(`OK les ${fichiers.length} sauvegardes réelles se chargent sans perdre de niveau`
      + (auDernierPalierAvant ? ` ; ${auDernierPalierAvant} au Nv.30 ou plus progressent au-delà` : ' — AUCUNE au Nv.30 : la progression au-delà n\'a pas été éprouvée sur une vraie partie'));
  }
}

console.log('OK test_spec14_palier_a_niveaux');

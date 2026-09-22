// `D-72` — l'écran Poche affichait un autre écran.
//
// CE QUI S'EST PASSÉ. `D-66` (T5) a ajouté `equipementDeLItem` au câblage du
// menu, qui vit dans `demarrerJeu`. Mais la fonction avait été écrite DANS
// `creerOrchestrateurGrotte` — deux fonctions sœurs, pas imbriquées. Le nom
// n'existait pas là où on l'appelait : `ReferenceError` à chaque rendu de la
// Poche. Et comme les cinq écrans maître-détail partagent une seule vue, et
// que `rendre()` appelait `obtenirEntrees()` avant d'effacer quoi que ce soit,
// l'écran PRÉCÉDENT restait affiché — on ouvrait la Poche, on voyait les
// Stats ou Construction. Un défaut de portée déguisé en défaut de menu.
//
// POURQUOI RIEN NE L'A VU. `demarrerJeu` n'est jamais exécuté headless (DOM,
// IndexedDB, réseau) : tout le câblage du menu y vit, sans test. Et le test
// de la Poche RECOPIAIT la décision au lieu d'appeler la fonction — c'est
// corrigé dans `test_d43_c2_poche_fiches`.
//
// CE FICHIER ferme la classe entière, statiquement : aucun nom déclaré dans
// l'une des deux grandes fonctions de `main.js` ne peut être référencé depuis
// l'autre. Vingt lignes, et ça aurait arrêté celui-ci.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { equipementDeLItem, lignesBonusArme, SLOT_PAR_CATEGORIE } from '../src/main.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(RACINE, 'src', 'main.js'), 'utf8');
const lignes = source.split('\n');

// Bornes d'une fonction de premier niveau, par comptage d'accolades. Grossier,
// mais suffisant et sans dépendance — on ne cherche pas à analyser du JS, on
// cherche à savoir dans QUEL corps tombe une ligne.
function corps(debutLigne) {
  const i = lignes.findIndex((l) => l.startsWith(debutLigne));
  assert.ok(i >= 0, `"${debutLigne}" introuvable dans main.js`);
  let profondeur = 0;
  let ouverte = false;
  for (let n = i; n < lignes.length; n += 1) {
    const l = lignes[n];
    profondeur += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
    if (l.includes('{')) ouverte = true;
    if (ouverte && profondeur <= 0) return { debut: i + 1, fin: n + 1 };
  }
  return { debut: i + 1, fin: lignes.length };
}

const ORCHESTRATEUR = corps('export function creerOrchestrateurGrotte({');
const DEMARRAGE = corps('export async function demarrerJeu()');

// --- 1. Les deux corps sont bien disjoints -----------------------------
// Si un jour l'un se retrouvait DANS l'autre, tout ce qui suit perdrait son
// sens sans rien dire : on le vérifie plutôt que de le supposer.
{
  assert.ok(ORCHESTRATEUR.fin < DEMARRAGE.debut, 'les deux fonctions doivent être sœurs, jamais imbriquées');
  console.log(
    `OK creerOrchestrateurGrotte ${ORCHESTRATEUR.debut}-${ORCHESTRATEUR.fin}, `
    + `demarrerJeu ${DEMARRAGE.debut}-${DEMARRAGE.fin} : disjointes`,
  );
}

// --- 2. Aucun nom de l'une n'est appelé depuis l'autre ------------------
{
  // Les déclarations d'un corps : indentées de deux espaces, donc au premier
  // niveau de cette fonction — ce sont celles qui ne sortent pas.
  function declarations({ debut, fin }) {
    const noms = new Map();
    for (let n = debut; n < fin; n += 1) {
      const m = /^ {2}(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lignes[n - 1]);
      if (m) noms.set(m[1], n);
    }
    return noms;
  }

  // Tout ce qui est LIÉ dans un corps, à n'importe quelle profondeur :
  // déclarations, paramètres déstructurés de la signature, variables de
  // boucle. Sans cette liste, le garde élargi de `D-118` criait 200 fois à
  // tort — `registre`, `i18n`, `menu` et `dialogue` sont des noms que les
  // DEUX fonctions portent légitimement (les uns paramètres, les autres
  // locaux), et il n'y a là aucune fuite de portée.
  function nomsLies({ debut, fin }) {
    const lies = new Set();
    for (let n = debut - 1; n < fin; n += 1) {
      const ligne = lignes[n - 1] || '';
      for (const m of ligne.matchAll(/(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) lies.add(m[1]);
      // Une ligne qui n'est qu'une liste de noms séparés par des virgules est
      // une signature déstructurée (`registre, i18n, save, store, …`) ou une
      // déstructuration d'affectation : tous ces noms sont liés ici.
      if (/^\s*[A-Za-z_$][\w$]*(\s*,\s*[A-Za-z_$][\w$]*)*\s*,?\s*$/.test(ligne)) {
        for (const m of ligne.matchAll(/[A-Za-z_$][\w$]*/g)) lies.add(m[0]);
      }
      // Un paramètre À VALEUR PAR DÉFAUT occupe sa propre ligne dans une
      // signature déstructurée (`moniteurPerf = { … }`, `graphismes = …`) :
      // il est lié ici, même si la ligne ne ressemble pas à une déclaration.
      for (const m of ligne.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*=[^=]/g)) lies.add(m[1]);
    }
    return lies;
  }

  function fuites(deQui, versQui, nomDe, nomVers) {
    const noms = declarations(deQui);
    const liesLaBas = nomsLies(versQui);
    for (const nom of [...noms.keys()]) if (liesLaBas.has(nom)) noms.delete(nom);
    assert.ok(noms.size > 0, `aucune déclaration trouvée dans ${nomDe} : le balayage ne prouverait rien`);
    const trouvees = [];
    for (let n = versQui.debut; n < versQui.fin; n += 1) {
      const ligne = lignes[n - 1];
      // Les commentaires citent librement les noms de l'autre moitié — c'est
      // même souhaitable. On ne regarde que le code.
      if (ligne.trim().startsWith('//') || ligne.trim().startsWith('*')) continue;
      for (const [nom, ou] of noms) {
        // `(?<![.\w$])` : un accès MEMBRE (`orchestrateur.maj(delta)`) n'est
        // jamais une fuite de portée — c'est justement ce qu'il faut écrire
        // quand on veut appeler l'autre moitié. Sans cette exclusion, le
        // garde interdisait la seule forme correcte (vu en branchant le
        // curseur sur la boucle, `D-108`) ; avec elle, un appel NU comme
        // `equipementDeLItem(item)` reste attrapé — le témoin le vérifie.
        // `D-118` a élargi ce garde, et il a fallu un bug pour le voir : la
        // version d'origine ne cherchait que des APPELS (`nom(`). Or
        // `sousTitrePoche` LISAIT `capacitePoche.slots` et passait
        // `obtenirItemDef` en argument — deux lectures nues, sans une
        // parenthèse, et le `ReferenceError` n'est tombé qu'à la capture sous
        // Chrome. On cherche donc l'identifiant, appelé ou non.
        // `(?!\\s*:)` : une CLÉ d'objet (`maj: (d) => …`) porte souvent le
        // nom de ce qu'elle expose, et n'est pas une lecture de portée.
        if (new RegExp(`(?<![.\\w$])${nom}(?![\\w$]|\\s*:)`).test(ligne)) {
          trouvees.push(`${nom} déclaré l.${ou} dans ${nomDe}, utilisé l.${n} dans ${nomVers}`);
        }
      }
    }
    return trouvees;
  }

  const fuitesOrchestrateur = fuites(ORCHESTRATEUR, DEMARRAGE, 'creerOrchestrateurGrotte', 'demarrerJeu');
  const fuitesDemarrage = fuites(DEMARRAGE, ORCHESTRATEUR, 'demarrerJeu', 'creerOrchestrateurGrotte');

  assert.deepEqual(
    [...fuitesOrchestrateur, ...fuitesDemarrage], [],
    'un nom déclaré dans l\'une des deux grandes fonctions est appelé depuis l\'autre — '
    + 'c\'est un ReferenceError à l\'exécution, et il ne se verra qu\'en jouant (`D-72`). '
    + 'Ce qui doit être partagé se déclare au NIVEAU MODULE, où il devient aussi testable.',
  );
  // TÉMOIN. Un garde qui ne crie jamais ne prouve rien — et celui-ci a
  // justement laissé passer `D-118` dans sa version « appels seulement ». On
  // lui présente donc les deux formes, sur des lignes fabriquées : un appel
  // nu, et la LECTURE nue qui l'avait berné.
  {
    const lignesAvant = lignes.slice();
    try {
      // Une déclaration dans l'orchestrateur, deux usages dans `demarrerJeu`.
      lignes[ORCHESTRATEUR.debut] = '  const temoinDePortee = 1;';
      lignes[DEMARRAGE.debut] = '  const x = temoinDePortee.slots;';
      lignes[DEMARRAGE.debut + 1] = '  temoinDePortee();';
      const cris = fuites(ORCHESTRATEUR, DEMARRAGE, 'creerOrchestrateurGrotte', 'demarrerJeu');
      assert.equal(cris.length, 2, 'le garde doit attraper la LECTURE nue autant que l’appel');
    } finally {
      lignes.length = 0;
      lignes.push(...lignesAvant);
    }
  }
  console.log('OK aucun nom ne traverse la frontière — lecture nue comprise (témoin vérifié)');
}

// --- 3. Les fonctions déplacées sont pures, et elles marchent -----------
// L'autre moitié du remède : au niveau module, elles sont enfin testables —
// donc le test de la Poche appelle la vraie fonction, et celui-ci l'éprouve.
{
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');
  const contexte = (equipementHero) => ({
    equipementHero, registre, traduire: i18n.t, peripherique: 'manette',
  });

  // Une ressource ne s'équipe pas.
  assert.equal(
    equipementDeLItem(registre.obtenir('items', 'item_branche'), contexte({})), null,
    'une branche ne va dans aucun emplacement',
  );

  // Une nourriture va au consommable, et dit comment la manger.
  const fruit = equipementDeLItem(registre.obtenir('items', 'item_fruit'), contexte({ consommable: null }));
  assert.equal(fruit.slot, 'consommable');
  assert.equal(fruit.deja, false);
  assert.ok(fruit.lignes[0].includes(i18n.t('glyphe.manette.consume')), 'la fiche dit avec quelle touche manger');
  assert.equal(
    equipementDeLItem(registre.obtenir('items', 'item_fruit'), contexte({ consommable: 'item_fruit' })).deja,
    true, 'déjà équipé : la fiche le sait',
  );

  // Une arme va à l'arme — et l'emplacement retient l'id de l'ARME, pas celui
  // de l'objet de poche. C'est le piège que `D-66` a dû franchir.
  const epeeItem = registre.obtenir('items', 'item_epee_bois');
  const epee = equipementDeLItem(epeeItem, contexte({ arme: 'weapon_mains_nues' }));
  assert.equal(epee.slot, 'arme');
  assert.equal(epee.deja, false, 'mains nues équipées : l\'épée ne l\'est pas');
  assert.equal(
    equipementDeLItem(epeeItem, contexte({ arme: epeeItem.arme })).deja, true,
    'l\'emplacement compare l\'id de l\'arme, jamais celui de l\'objet de poche',
  );
  assert.deepEqual(
    epee.lignes, lignesBonusArme(epeeItem.arme, { registre, traduire: i18n.t }),
    'la fiche annonce le bonus de l\'arme, lu sur weapons.json',
  );
  assert.equal(epee.lignes.length, 1, 'l\'épée en bois annonce son unique bonus (Force +1)');

  // La table des emplacements est la seule à connaître les catégories.
  assert.deepEqual(Object.keys(SLOT_PAR_CATEGORIE).sort(), ['arme', 'nourriture']);
  console.log('OK equipementDeLItem est pure, et dit le bon emplacement pour chaque catégorie');
}

console.log('OK test_d72_portees_main');

// `D-62` (file Nv.0 → Nv.10, T4) — le filtre anti-spoil, en UN seul point.
//
// DÉCISION DE XAV (21/09) : une entrée verrouillée est **invisible**. Pas de
// « ??? », **aucun compteur** du type « 3/12 ». Ce qui existe déjà dans le
// jeu reste visible ; seul ce qui se débloquera plus tard est caché.
//
// Contrats vérifiés ici :
//   - `visible_si` absent = visible (donc l'existant ne bouge pas) ;
//   - une entrée verrouillée n'apparaît dans AUCUN écran et dans aucun
//     compte — pas même en position grisée ;
//   - elle réapparaît dès que sa condition devient vraie, sans rechargement ;
//   - une condition mal écrite tombe au boot, dans n'importe quel catalogue ;
//   - **contrôles de source** : `src/ui/` ne lit jamais un catalogue, et
//     `visibilite.js` est le seul module qui sache lire `visible_si`.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { estVisible, entreesVisibles } from '../src/visibilite.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);

// --- 1. Le contrat de base : absent = visible ---------------------------
{
  const jamais = { evaluate: () => false };
  const toujours = { evaluate: () => true };

  assert.equal(estVisible({ id: 'a' }, jamais), true, 'sans `visible_si`, une entrée est visible');
  assert.equal(estVisible({ id: 'a', visible_si: null }, jamais), true, '`null` vaut absent');
  assert.equal(estVisible({ id: 'a', visible_si: 'flag_x' }, jamais), false);
  assert.equal(estVisible({ id: 'a', visible_si: 'flag_x' }, toujours), true);

  // Et le point du ticket : aucun catalogue d'AUJOURD'HUI ne porte le champ,
  // donc aucun écran d'aujourd'hui ne change. Ce contrôle tombera le jour où
  // quelqu'un cachera quelque chose — et ce jour-là, il faudra l'avoir voulu.
  const catalogue = [{ id: 'a' }, { id: 'b', visible_si: 'flag_x' }, { id: 'c' }];
  assert.deepEqual(entreesVisibles(catalogue, jamais).map((e) => e.id), ['a', 'c']);
  assert.deepEqual(entreesVisibles(catalogue, toujours).map((e) => e.id), ['a', 'b', 'c']);
  assert.equal(entreesVisibles(catalogue, jamais).length, 2, 'le COMPTE lui-même ignore le verrouillé');
  console.log('OK `visible_si` absent = visible, et le compte ne voit que le visible');
}

// --- 2. En jeu : une recette verrouillée n'existe nulle part ------------
// On en ajoute une de toutes pièces au catalogue, verrouillée derrière un
// niveau que le héros n'a pas. Elle ne doit apparaître dans aucun écran, ni
// dans aucun compte — et surtout pas grisée, ce qui reviendrait à l'annoncer.
function monterPartie({ niveau, recetteEnPlus }) {
  const catalogues = {
    ...donnees,
    recipes: recetteEnPlus ? [...donnees.recipes, recetteEnPlus] : donnees.recipes,
  };
  assert.deepEqual(validerCatalogues(catalogues, SCHEMAS), [], 'le catalogue augmenté doit rester valide');
  const registre = construireRegistre(catalogues);
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.hero.niveau = niveau;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    flag_ambiance_vent_cendre: true,
  };
  // De quoi fabriquer, pour que la recette ne soit pas seulement grisée faute
  // d'ingrédients : c'est sa VISIBILITÉ qu'on éprouve, rien d'autre.
  save.inventaire.items = { item_branche: 20, item_caillou: 20 };

  let entreesCraftVues = null;
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
    ouvrirCraft: (entrees) => { entreesCraftVues = entrees; },
    rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
  };
  const dialogue = creerDialogue();
  const frames = [];
  const input = { maj: () => frames[frames.length - 1] };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const etat = ({ interact = false } = {}) => ({
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact }, menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
  });

  // Ouvre l'atelier : on place le héros sur sa station et on appuie.
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  const atelier = registre.tous('puzzles').find((p) => p.station_type === 'station_type_atelier');
  const pose = scene.poseEffectiveInteractif(atelier.id);
  hero.x = (pose.x + 0.5) * scene.tileSize;
  hero.y = (pose.y + 0.5) * scene.tileSize;
  save.hero.scene = 'scene_maison_interieur';
  frames.push(etat({ interact: true }));
  orch.maj(16);
  return { save, i18n, registre, entreesCraft: entreesCraftVues };
}

const RECETTE_SECRETE = {
  id: 'rec_secrete_test',
  // Un libellé existant, mais qu'aucune autre recette n'utilise : c'est à
  // son TITRE qu'on la reconnaîtra dans la liste, les entrées d'écran ne
  // portant pas d'id de recette (et n'ont pas à en porter).
  label_key: 'item.plume',
  station: 'station_type_atelier',
  entrees: [{ item: 'item_branche', qte: 1 }],
  sortie: { item: 'item_hache', qte: 1 },
  categorie: 'outil',
  xp: 1,
  visible_si: { valeur: 'niveau', min: 10 },
};

{
  const bas = monterPartie({ niveau: 1, recetteEnPlus: RECETTE_SECRETE });
  assert.ok(bas.entreesCraft, 'le menu Craft doit avoir été ouvert (sinon ce test ne prouve rien)');
  const entreesBas = bas.entreesCraft();
  const sansSecrete = entreesBas.filter((e) => e.id === RECETTE_SECRETE.id);
  assert.equal(sansSecrete.length, 0, 'une recette verrouillée n\'est pas listée, même grisée');

  const haut = monterPartie({ niveau: 10, recetteEnPlus: RECETTE_SECRETE });
  const entreesHaut = haut.entreesCraft();
  // Le compte se juge à niveau ÉGAL, avec et sans la recette factice : depuis
  // `D-66` (T5), l'épée en bois est elle aussi cachée derrière le niveau 10,
  // et comparer le niveau 1 au niveau 10 mesurerait les deux à la fois.
  const memeNiveauSansSecrete = monterPartie({ niveau: 10 }).entreesCraft();
  assert.equal(
    entreesHaut.length, memeNiveauSansSecrete.length + 1,
    'au niveau 10, la recette apparaît — et le COMPTE change avec elle',
  );
  assert.ok(
    memeNiveauSansSecrete.length > entreesBas.length,
    "et le catalogue réel a lui aussi de quoi s'ouvrir au niveau 10 (`D-66`)",
  );
  assert.ok(
    entreesHaut.some((e) => e.titre === haut.i18n.t(RECETTE_SECRETE.label_key)),
    'au niveau 10, la recette secrète doit être dans la liste',
  );
  console.log('OK une recette verrouillée n\'apparaît dans aucun écran ni aucun compte');
}

// --- 3. Elle s'ouvre sans rechargement ---------------------------------
// La condition est relue à CHAQUE affichage (les valeurs nommées de
// `flags.js` sont lues à l'évaluation, jamais capturées) : monter de niveau
// pendant la partie suffit.
{
  const partie = monterPartie({ niveau: 9, recetteEnPlus: RECETTE_SECRETE });
  const titre = partie.i18n.t(RECETTE_SECRETE.label_key);
  assert.ok(!partie.entreesCraft().some((e) => e.titre === titre), 'invisible au niveau 9');
  partie.save.hero.niveau = 10;
  assert.ok(
    partie.entreesCraft().some((e) => e.titre === titre),
    "visible dès le niveau 10, sans rouvrir l'écran",
  );
  console.log('OK elle apparaît dès que la condition devient vraie, sans rechargement');
}

// --- 4. Une condition mal écrite tombe au boot, dans TOUT catalogue -----
{
  for (const catalogue of ['recipes', 'items', 'weapons']) {
    const abimes = {
      ...donnees,
      [catalogue]: donnees[catalogue].map((e, i) => (i === 0 ? { ...e, visible_si: 'flag_qui_nexiste_pas' } : e)),
    };
    const messages = validerCatalogues(abimes, SCHEMAS);
    assert.ok(
      messages.some((m) => m.includes('visible_si') && m.includes('flag_qui_nexiste_pas')),
      `un visible_si cassé dans ${catalogue}.json doit tomber au boot : ${messages.join(' | ')}`,
    );
  }
  console.log('OK un `visible_si` cassé tombe au boot, dans n\'importe quel catalogue');
}

// --- 5. Contrôles de source -------------------------------------------
// Le ticket demande qu'« un test statique échoue si `src/ui/` itère un
// catalogue sans passer par la fonction ». La forme que ça prend ici est plus
// forte, et plus simple à tenir : `src/ui/` ne lit JAMAIS un catalogue. Les
// écrans reçoivent des entrées déjà construites par l'orchestrateur, qui est
// le seul à posséder le registre — donc le seul endroit où le filtre peut
// manquer, et il tient en une ligne.
{
  const fichiersUi = (await fs.readdir(path.join(RACINE, 'src', 'ui'))).filter((f) => f.endsWith('.js'));
  assert.ok(fichiersUi.length > 0, 'il doit y avoir des écrans à contrôler');
  for (const fichier of fichiersUi) {
    const source = await fs.readFile(path.join(RACINE, 'src', 'ui', fichier), 'utf8');
    const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    // On cherche une LECTURE de catalogue, pas le mot « json » : `couleurs_ui.js`
    // compose des chemins d'erreur lisibles (« companions.json > … ») sans
    // jamais ouvrir quoi que ce soit, et le confondre avec une lecture rendrait
    // ce contrôle bruyant — donc, à terme, ignoré.
    for (const interdit of ['registre.tous(', 'registre.obtenir(', 'registry.js', 'io_node', 'io_navigateur']) {
      assert.ok(
        !code.includes(interdit),
        `src/ui/${fichier} ne doit pas lire un catalogue ("${interdit}") : `
        + 'il recevrait alors des entrées non filtrées par entreesVisibles()',
      );
    }
  }

  // Et l'autre moitié : un seul module sait ce que `visible_si` veut dire.
  const fichiersSrc = (await fs.readdir(path.join(RACINE, 'src'))).filter((f) => f.endsWith('.js'));
  const autorises = new Set(['visibilite.js', 'schemas.js', 'registry.js']);
  for (const fichier of fichiersSrc) {
    if (autorises.has(fichier)) continue;
    const source = await fs.readFile(path.join(RACINE, 'src', fichier), 'utf8');
    const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(
      !code.includes('visible_si'),
      `src/${fichier} lit "visible_si" : le filtre anti-spoil doit rester en UN seul point (visibilite.js)`,
    );
  }
  console.log('OK src/ui/ ne lit aucun catalogue, et un seul module sait lire `visible_si`');
}

console.log('OK test_d62_anti_spoil');

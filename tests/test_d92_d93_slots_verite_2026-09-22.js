// `D-92` + `D-93` (T2 de la file « inventaire survivaliste ») : un slot
// d'équipement dit la vérité.
//
// Les deux lignes sont la MÊME famille et se traitent ensemble (décision de
// Xav, 21/09) : un slot garde un id que plus rien ne revalide — là l'id ne
// résout plus (`D-92`), ici il résout mais l'objet n'est plus en poche
// (`D-93`). Une seule fonction les couvre, `main.js#revaliderEquipement`.
//
// Le tour de dessin à faux contexte est repris de `D-71` : la case d'attaque
// et la case du consommable se composent dans `dessiner()`, que rien
// n'exerce headless — c'est exactement là que `D-71` s'était logé.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, revaliderEquipement } from '../src/main.js';
import { resoudreArmeEquipee } from '../src/combat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const ARME_DEFAUT = registre.obtenir('equipment_slots', 'equip_arme').defaut;
const OBJET_ARME = registre.tous('items').find((it) => it.categorie === 'arme');

// Faux canvas, repris de `test_d71_jointure_dessin` : aucun pixel n'est jugé.
function faireCanvas() {
  const canvas = { width: 480, height: 270, style: {} };
  const ctx = new Proxy({}, {
    get(_, p) {
      if (p === 'canvas') return canvas;
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return () => {};
    },
    set: () => true,
  });
  canvas.getContext = () => ctx;
  return { canvas, ctx };
}

function faussSave({ poche = {}, arme = null, consommable = null } = {}) {
  const save = saveNeuve();
  save.inventaire.items = { ...poche };
  save.hero.equipement = { arme, consommable };
  return save;
}

// --- 1. Une arme rangée au coffre quitte la case d'attaque ----------------
{
  const save = faussSave({ poche: {}, arme: OBJET_ARME.arme });
  const { changements } = revaliderEquipement(save, registre);
  assert.equal(save.hero.equipement.arme, null, 'l’arme absente de la poche quitte le slot');
  assert.deepEqual(changements, [{ slot: 'arme', raison: 'absente', id: OBJET_ARME.arme }]);
  // Et le défaut du slot reprend la main — sans que personne l'écrive ici.
  assert.equal(resoudreArmeEquipee(registre, save.hero.equipement.arme).id, ARME_DEFAUT);

  // Reprendre l'épée au coffre ne la rééquipe PAS : on l'équipe depuis la
  // Poche, comme n'importe quel objet.
  save.inventaire.items[OBJET_ARME.id] = 1;
  revaliderEquipement(save, registre);
  assert.equal(save.hero.equipement.arme, null, 'l’objet revenu en poche ne se rééquipe pas tout seul');

  // En poche ET équipée : rien ne bouge.
  save.hero.equipement.arme = OBJET_ARME.arme;
  assert.deepEqual(revaliderEquipement(save, registre).changements, []);
  assert.equal(save.hero.equipement.arme, OBJET_ARME.arme);
  console.log('OK l’arme rangée quitte la case, et reprendre l’objet ne la rééquipe pas');
}

// --- 2. `D-92` : un id d'arme inconnu ne fige plus rien -------------------
{
  const save = faussSave({ arme: 'weapon_qui_n_existe_pas' });
  const { changements } = revaliderEquipement(save, registre);
  assert.equal(save.hero.equipement.arme, null);
  assert.deepEqual(changements, [{ slot: 'arme', raison: 'inconnue', id: 'weapon_qui_n_existe_pas' }]);
  // Le point qui comptait : `arme.portee` était lu sans garde, et le héros ne
  // pouvait plus jamais frapper. Après revalidation, l'arme résolue existe.
  const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
  assert.ok(arme && arme.portee, 'une arme résolue a toujours une portée');

  // Les mains nues NE sont pas en poche, et c'est normal : le défaut du slot
  // n'est jamais revalidé contre la poche.
  const nues = faussSave({ arme: ARME_DEFAUT });
  assert.deepEqual(revaliderEquipement(nues, registre).changements, []);
  assert.equal(nues.hero.equipement.arme, ARME_DEFAUT, 'le défaut du slot reste en place');
  console.log('OK D-92 : un id inconnu replie sur le défaut, et le dit — jamais un échec dur');
}

// --- 3. `D-93` + `Q-64` : le consommable épuisé passe au suivant ----------
{
  const consommables = registre.tous('items').filter((it) => it.categorie === 'nourriture');
  assert.ok(consommables.length >= 2, 'il faut deux consommables pour éprouver la relève');
  const [a, b] = consommables;

  // Un autre consommable en poche : il prend la case.
  const releve = faussSave({ poche: { [b.id]: 1 }, consommable: a.id });
  const { changements } = revaliderEquipement(releve, registre);
  assert.equal(releve.hero.equipement.consommable, b.id, 'le suivant prend la case');
  assert.deepEqual(changements, [{ slot: 'consommable', raison: 'epuise', id: a.id, remplace: b.id }]);

  // Rien d'autre en poche : la case se vide.
  const vide = faussSave({ poche: {}, consommable: a.id });
  revaliderEquipement(vide, registre);
  assert.equal(vide.hero.equipement.consommable, null, 'sans rien d’autre, la case se vide');

  // Un id inconnu se comporte comme un stock à zéro.
  const inconnu = faussSave({ poche: {}, consommable: 'item_qui_n_existe_pas' });
  const bilan = revaliderEquipement(inconnu, registre);
  assert.equal(inconnu.hero.equipement.consommable, null);
  assert.equal(bilan.changements[0].raison, 'inconnu');
  console.log('OK D-93 : le consommable épuisé passe au suivant, ou la case se vide');
}

// --- 4. Sur le vrai jeu : la case DISPARAÎT, et elle revient -------------
// Le loquet `flag_premier_consommable` est retiré : la case suit l'état réel
// de la poche, par une valeur nommée que `action_slots.json` cite.
{
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    // `D-125` : les lignes d'ambiance, toutes, DÉRIVÉES du catalogue — un
    // dialogue gèle le temps actif, et ce fichier éprouve autre chose. Déduites
    // plutôt que recopiées, pour qu'une ligne de plus ne rouvre pas neuf
    // fichiers (`Q-42`).
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true, ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
  };
  save.inventaire.items = { item_fruit: 1, [OBJET_ARME.id]: 1 };
  save.hero.equipement = { arme: OBJET_ARME.arme, consommable: 'item_fruit' };

  const frames = [];
  const logique = faireCanvas();
  const visible = faireCanvas();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: {
      maj: () => frames[frames.length - 1],
      tactileActif: () => false,
      peripheriqueActif: () => 'manette',
    },
    ctxLogique: logique.ctx, ctxVisible: visible.ctx, canvasLogique: logique.canvas,
  });
  const b = (v) => ({ pressed: v, held: v });
  const neutre = () => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  });
  const tick = () => { frames.push(neutre()); orch.maj(16); };

  tick();
  assert.ok(orch.obtenirVerbesActions().includes('consume'), 'un consommable en poche : la case est là');

  // On mange le dernier fruit (et on range l'épée au coffre dans la foulée).
  save.inventaire.items = {};
  save.maison.stations.station_coffre = { contenu: { [OBJET_ARME.id]: 1 } };
  tick();
  assert.equal(orch.obtenirVerbesActions().includes('consume'), false, 'plus rien à manger : la case disparaît');
  assert.equal(save.hero.equipement.arme, null, 'l’épée rangée quitte la case d’attaque');

  // On en reramasse un : la case revient.
  save.inventaire.items = { item_fruit: 1 };
  tick();
  assert.ok(orch.obtenirVerbesActions().includes('consume'), 'un consommable revenu : la case revient');
  console.log('OK sur le vrai jeu : la case suit la poche, et l’épée rangée quitte l’attaque');

  // --- 5. Le tour de dessin (`D-71`) : composer les cases ne lève pas -----
  // Un contexte 2D factice : on ne juge aucun pixel (jamais headless), on
  // vérifie que la composition des icônes de slots traverse `dessiner()`.
  // Le même faux canvas et la même fausse `window` que
  // `test_d71_jointure_dessin` : on ne juge aucun pixel (le rendu n'est
  // jamais exercé headless), on vérifie que la composition des icônes de
  // slots traverse `dessiner()` sans lever.
  const documentAvant = global.document;
  const windowAvant = global.window;
  global.document = { createElement: () => faireCanvas().canvas };
  global.window = { devicePixelRatio: 1, addEventListener() {}, location: { search: '' } };
  for (const etatPoche of [{}, { item_fruit: 1 }, { [OBJET_ARME.id]: 1 }]) {
    save.inventaire.items = etatPoche;
    tick();
    assert.doesNotThrow(
      () => orch.dessiner(),
      `le tour de dessin lève avec la poche ${JSON.stringify(etatPoche)}`,
    );
  }
  global.window = windowAvant;
  global.document = documentAvant;
  console.log('OK le tour de dessin traverse les trois états de poche sans lever (`D-71`)');
}

console.log('OK test_d92_d93_slots_verite');

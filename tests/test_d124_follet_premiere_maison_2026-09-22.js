// `D-124` (T8) : le follet parle la première fois qu'on entre dans la Maison.
//
// **Données seules.** C'est le point du ticket, et c'est ce que ce fichier
// garde : aucun déclencheur nouveau n'a été écrit. Le patron de `D-61`
// (« palier atteint + condition → une ligne, une seule fois ») et le flag de
// zone qui existait déjà depuis la Phase 2 (`flag_maison_decouverte`, posé en
// marchant dans le rectangle `maison`) suffisent — la ligne est une entrée de
// `ambiances.json`, et rien de plus.
//
// Le TEXTE est de Xav, gardé mot pour mot. L'anglais est une proposition.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

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

const AMBIANCE = registre.obtenir('ambiances', 'amb_maison_premiere_visite');

// --- 1. La ligne est une DONNÉE, sur le mécanisme existant ---------------
{
  assert.equal(AMBIANCE.condition, 'flag_maison_decouverte',
    'elle s’accroche au flag de zone existant, jamais à un déclencheur neuf');
  assert.deepEqual(AMBIANCE.scenes, ['scene_maison_exterieur']);
  assert.equal(AMBIANCE.phases, undefined, 'à toute heure : découvrir la maison n’a pas d’horaire');
  // Le flag de la zone `maison` est bien celui que la scène déclare : si le
  // rectangle disparaissait, la ligne ne tomberait jamais, et ce test le dirait.
  const zones = registre.obtenir('scenes', 'scene_maison_exterieur').zones || [];
  assert.ok(zones.some((z) => z.type === 'maison'), 'la scène doit déclarer une zone "maison"');
  // Et c'est le FOLLET qui parle, pas le narrateur.
  const dialogue = registre.obtenir('dialogues', AMBIANCE.dialogue);
  assert.deepEqual(dialogue.lignes.map((l) => l.locuteur), ['follet']);
  console.log('OK la ligne est une entrée d’ambiance, accrochée au flag de zone existant');
}

// --- 2. Le texte de Xav, mot pour mot, et son pendant anglais ------------
{
  const cle = registre.obtenir('dialogues', AMBIANCE.dialogue).lignes[0].text_key;
  assert.equal(
    i18n.t(cle),
    'Oh, regarde, quelqu’un a laissé des stations ici. Regarde vite, va voir ce qu’il y a à l’intérieur.',
    'le texte est celui de Xav, gardé tel quel',
  );
  const en = creerI18n(dictionnaires, 'en');
  assert.notEqual(en.t(cle), cle, 'une proposition anglaise existe');
  console.log('OK le texte de Xav est intact, et l’anglais existe');
}

// --- 3. Sur le vrai jeu : une fois, à l'entrée, et jamais deux -----------
{
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  // Rien n'est posé d'avance : c'est une partie neuve qui arrive de la Grotte.
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
  };
  const dialogue = creerDialogue();
  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const b = (v) => ({ pressed: v, held: v });
  const neutre = () => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  });
  const tick = () => { frames.push(neutre()); orch.maj(16); };
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();

  // Dehors, loin de la maison : rien.
  tick();
  assert.equal(dialogue.estOuvert(), false, 'au spawn, le follet ne dit rien de la maison');

  // On entre dans le rectangle `maison`.
  const maison = scene.zones.find((z) => z.type === 'maison').rect;
  hero.x = (maison.x + maison.w / 2) * scene.tileSize;
  hero.y = (maison.y + maison.h / 2) * scene.tileSize;
  tick();
  assert.equal(dialogue.estOuvert(), true, 'entrer dans la Maison ouvre la ligne du follet');
  assert.equal(save.flags.flag_ambiance_maison_premiere_visite, true, 'et son flag est posé');

  // On la ferme, on ressort, on revient : elle ne revient JAMAIS.
  dialogue.fermer();
  hero.x = 10 * scene.tileSize;
  tick();
  hero.x = (maison.x + maison.w / 2) * scene.tileSize;
  for (let n = 0; n < 5; n += 1) tick();
  assert.equal(dialogue.estOuvert(), false, 'une seule fois veut dire une seule fois');
  console.log('OK elle tombe une fois, en entrant, et ne revient jamais');
}

console.log('OK test_d124_follet_premiere_maison');

// `D-09` (décision de Xav, 23/09) : `dlg_recette_indisponible` se déclenche à
// la première interaction avec l'Atelier.
//
// La ligne était gelée parce qu'« un dialogue par-dessus un menu casserait le
// routage » : `maj()` ne sert qu'une UI à la fois. Le contrat éprouvé ici est
// donc l'ORDRE — la réplique d'abord, l'écran Craft ensuite, jamais les deux
// ouverts ensemble — et le fait que la règle vit en données
// (`stations.json > premiere_interaction`), pas dans le code. Le texte de la
// réplique appartient à Xav : aucun test ne l'épingle (`D-52`).
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

const ATELIER = registre.obtenir('stations', 'station_type_atelier');

// --- 1. La règle vit en données, et une faute tombe au boot -----------------
{
  assert.ok(ATELIER.premiere_interaction, 'l’Atelier déclare sa réplique de première interaction');
  assert.equal(ATELIER.premiere_interaction.dialogue, 'dlg_recette_indisponible');
  // La cuisine est le témoin : elle ne parle pas.
  assert.equal(registre.obtenir('stations', 'station_type_cuisine').premiere_interaction, undefined);

  const casser = (pi) => {
    const copie = structuredClone(donnees);
    copie.stations.find((s) => s.id === 'station_type_atelier').premiere_interaction = pi;
    return validerCatalogues(copie).join('\n');
  };
  assert.match(casser({ dialogue: 'dlg_inexistant', flag: ATELIER.premiere_interaction.flag }), /premiere_interaction\.dialogue/);
  assert.match(casser({ dialogue: 'dlg_recette_indisponible', flag: 'flag_inexistant' }), /premiere_interaction\.flag/);
  assert.match(casser('dlg_recette_indisponible'), /premiere_interaction doit être un objet/);
  console.log('OK la réplique est déclarée en données, et un dialogue ou un flag inconnu fait échouer le boot');
}

// --- 2. Sur le vrai orchestrateur ------------------------------------------
const b = (v) => ({ pressed: v, held: v });
const etat = ({ interact = false, attack = false } = {}) => ({
  move: { x: 0, y: 0 }, attack: b(attack), skill_1: b(false), skill_2: b(false),
  skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
});

function monter({ dejaVue }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    // Les lignes d'ambiance, dérivées du catalogue (`Q-42`) : elles
    // passeraient avant celle qu'on éprouve.
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
    ...(dejaVue ? { [ATELIER.premiere_interaction.flag]: true } : {}),
  };
  const suivi = { craftOuvert: 0 };
  let prochain = etat();
  const dialogue = creerDialogue();
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => { suivi.craftOuvert += 1; },
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {},
      rafraichirStats: () => {},
    },
    input: { maj: () => { const e = prochain; prochain = etat(); return e; } },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  const frame = (e) => { prochain = e; orch.maj(16); };
  return { save, suivi, dialogue, frame };
}

{
  const { save, suivi, dialogue, frame } = monter({ dejaVue: false });
  frame(etat({ interact: true }));
  assert.equal(dialogue.estOuvert(), true, 'la première interaction ouvre la réplique');
  assert.equal(suivi.craftOuvert, 0, 'l’écran Craft ne s’ouvre PAS par-dessus la réplique');
  assert.equal(save.flags[ATELIER.premiere_interaction.flag], true,
    'le flag est posé dès l’ouverture : une sauvegarde prise pendant la réplique ne la fait pas revenir');

  // Le joueur ferme la réplique par de vrais appuis (machine à écrire, puis
  // armement) : on alterne appui et relâché jusqu'à la fermeture.
  let n = 0;
  while (dialogue.estOuvert() && n < 2000) {
    frame(etat({ attack: n % 2 === 0 }));
    n += 1;
  }
  assert.equal(dialogue.estOuvert(), false, 'la réplique se ferme aux appuis');
  assert.equal(suivi.craftOuvert, 1, 'à la fermeture de la réplique, l’écran Craft s’ouvre — une fois');
  console.log(`OK première interaction : la réplique d’abord, puis le Craft à sa fermeture (${n} frames)`);

  // Seconde interaction : directement le Craft, sans réplique.
  frame(etat({ interact: true }));
  assert.equal(dialogue.estOuvert(), false, 'la réplique ne revient pas');
  assert.equal(suivi.craftOuvert, 2);
  console.log('OK seconde interaction : le Craft s’ouvre directement, la réplique ne revient jamais');
}

{
  // Une partie qui a déjà entendu la réplique (sauvegarde, rechargement) :
  // rien ne change pour elle.
  const { suivi, dialogue, frame } = monter({ dejaVue: true });
  frame(etat({ interact: true }));
  assert.equal(dialogue.estOuvert(), false);
  assert.equal(suivi.craftOuvert, 1);
  console.log('OK flag déjà posé : aucune réplique, le Craft s’ouvre au premier appui');
}

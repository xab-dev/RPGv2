// La corde et le papyrus, tirés de l'herbe (demande de Xav, 23/09).
//
// DEMANDE : deux recettes de base « à partir de l'herbe ». Le pendant
// « cailloux → pierre » a été REFUSÉ par Xav (« attacher cinq cailloux pour
// faire une pierre, ça ne marche pas ») : les cailloux attendent la mine, la
// ferronnerie et le concasseur. Ce test veille donc aussi à ce qu'aucune
// recette de l'Atelier ne fasse de la pierre.
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`) : quantités,
// palier et XP vivent dans `data/recipes.json`.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, entreePoche } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const RECETTES = ['rec_corde', 'rec_papyrus'].map((id) => registre.obtenir('recipes', id));

// --- 1. En données : de l'herbe seule, à l'Atelier, sans éclats ----------
for (const r of RECETTES) {
  assert.equal(r.station, 'station_type_atelier', `${r.id} : à l’Atelier`);
  assert.deepEqual(r.entrees.map((e) => e.item), ['item_herbe'], `${r.id} : de l’herbe, et rien d’autre`);
  assert.ok(!r.cout_eclats, `${r.id} : sans éclats`);
  assert.equal(r.visible_si.valeur, 'niveau', `${r.id} : débloquée par le niveau`);
  const item = registre.obtenir('items', r.sortie.item);
  const fiche = entreePoche(item, 1, { equipementHero: saveNeuve().hero.equipement, registre, i18n, peripherique: 'manette' });
  assert.equal(fiche.consommable, false, `${item.id} ne se mange pas`);
  assert.equal(fiche.equipement, null, `${item.id} ne s’équipe pas`);
}
assert.ok(
  !registre.tous('recipes').some((r) => r.sortie.item === 'item_pierre'),
  'aucune recette ne fait de la pierre : les cailloux attendent la ferronnerie (décision de Xav, 23/09)',
);
console.log('OK corde et papyrus : de l’herbe seule, à l’Atelier, ni mangés ni équipés ; pas de pierre fabriquée');

// --- 2. Sur le vrai orchestrateur : absentes avant, fabriquées au palier --
function atelier({ niveau, poche }) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  // Le niveau va avec son XP : recalculé depuis l'XP totale à chaque crédit.
  save.hero.xp = registre.obtenir('levels', `niveau_${niveau}`).xp_cumulee;
  save.inventaire.items = { ...poche };
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    // Un dialogue gèle le temps actif : lignes d'ambiance et premières
    // interactions déduites du catalogue, jamais recopiées (`Q-42`).
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
    ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])),
  };
  const ouvert = {};
  const b = (v) => ({ pressed: v, held: v });
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: (obtenirEntrees) => { ouvert.obtenirEntrees = obtenirEntrees; },
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: {
      maj: () => ({
        move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
        skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
      }),
    },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l’atelier ouvre l’écran Craft');
  return { save, entrees: () => ouvert.obtenirEntrees() };
}

for (const r of RECETTES) {
  const poche = Object.fromEntries(r.entrees.map((e) => [e.item, e.qte]));
  const avant = atelier({ niveau: r.visible_si.min - 1, poche });
  assert.ok(!avant.entrees().some((e) => e.titre === i18n.t(r.label_key)), `${r.id} absente sous le palier (\`D-62\`)`);

  const jeu = atelier({ niveau: r.visible_si.min, poche });
  const entree = jeu.entrees().find((e) => e.titre === i18n.t(r.label_key));
  assert.ok(entree && entree.grisee === false, `${r.id} fabricable au palier`);
  entree.action();
  assert.equal(jeu.save.inventaire.items[r.sortie.item], r.sortie.qte, `${r.sortie.item} fabriqué`);
  assert.equal(jeu.save.inventaire.items.item_herbe || 0, 0, 'l’herbe est consommée');
  console.log(`OK ${r.id} : absente sous le Nv.${r.visible_si.min}, fabriquée au palier`);
}

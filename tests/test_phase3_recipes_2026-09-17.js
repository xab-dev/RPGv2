// Contrat (Palier A, specs/04_maison-interieur.md §3.1/§7) : peutFabriquer()/
// fabriquer() — découverte, cooldown, ingrédients, poche pleine (refus AVANT
// consommation) — et preuve data-driven : une 4ᵉ recette en JSON de test
// fonctionne sans modification de /src.
import assert from 'node:assert/strict';
import { peutFabriquer, fabriquer, recettesDeStation, recetteDecouverte } from '../src/recipes.js';
import { poserCooldown } from '../src/cooldowns.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';

// `D-118` : `fabriquer` reçoit un PLAFOND (un nombre), plus une fiche
// d'objet — « combien en tiennent encore » dépend du conteneur, que ce
// module ne connaît pas. Ici la hache ne s'empile pas : son plafond est 1.
const PLAFOND_HACHE = 1;
const recetteHache = {
  id: 'rec_hache', label_key: 'x', station: 'station_type_atelier',
  entrees: [{ item: 'item_branche', qte: 2 }, { item: 'item_caillou', qte: 1 }],
  sortie: { item: 'item_hache', qte: 1 }, categorie: 'outil', xp: 15,
  cooldown_ms: 60000,
};
// `D-62` (T4) : plus de `connue_au_depart`/`deblocage`. Une recette sans
// `visible_si` est VISIBLE — l'inverse de l'ancien couple, et c'est ce qui
// garantit que l'existant ne bouge pas quand un catalogue adopte le champ.

const flagsFactice = { evaluate: () => false };
const flagsQuiDebloquentTout = { evaluate: () => true };

// 1. Ingrédients insuffisants -> refus, raison "ingredients".
{
  const verdict = peutFabriquer(recetteHache, { item_branche: 1, item_caillou: 1 }, flagsFactice, {}, 0);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.raison, 'ingredients');
}

// 2. Ingrédients suffisants, recette sans `visible_si` (donc visible) -> ok.
{
  const verdict = peutFabriquer(recetteHache, { item_branche: 2, item_caillou: 1 }, flagsFactice, {}, 0);
  // `D-122` : le verdict porte un `detail` (quel ingrédient, combien),
  // `null` quand il n'y a rien à préciser.
  assert.deepEqual(verdict, { ok: true, raison: null, detail: null });
}

// 3. Recette verrouillée : `visible_si` qui n'est jamais vrai (`D-62`).
{
  const recetteVerrouillee = { ...recetteHache, visible_si: { all: ['flag_niveau_10'] } };
  assert.equal(recetteDecouverte(recetteVerrouillee, flagsFactice), false);
  const verdict = peutFabriquer(recetteVerrouillee, { item_branche: 2, item_caillou: 1 }, flagsFactice, {}, 0);
  assert.equal(verdict.raison, 'verrouillee');
  assert.equal(recetteDecouverte(recetteVerrouillee, flagsQuiDebloquentTout), true);
}

// 4. Cooldown actif (posé à heureMs=0, durée 60000) -> refus à heureMs=1000.
{
  const cooldowns = poserCooldown({}, 'rec_hache', 0);
  const verdict = peutFabriquer(recetteHache, { item_branche: 2, item_caillou: 1 }, flagsFactice, cooldowns, 1000);
  assert.equal(verdict.raison, 'cooldown');
  // Expiré après 60000 ms.
  const verdictExpire = peutFabriquer(recetteHache, { item_branche: 2, item_caillou: 1 }, flagsFactice, cooldowns, 61000);
  assert.equal(verdictExpire.ok, true);
}

// 5. fabriquer() : retire les entrées, ajoute la sortie, pose le cooldown,
// renvoie l'xp.
{
  const poche = { item_branche: 3, item_caillou: 2 };
  const resultat = fabriquer(recetteHache, { poche, flags: flagsFactice, cooldowns: {}, heureMs: 500, plafondSortie: () => PLAFOND_HACHE });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.poche.item_branche, 1);
  assert.equal(resultat.poche.item_caillou, 1);
  assert.equal(resultat.poche.item_hache, 1);
  assert.equal(resultat.xp, 15);
  assert.equal(resultat.cooldowns.rec_hache, 500);
}

// 6. §4 edge case : sortie ne rentrant pas dans la poche (plafond) -> refus
// AVANT toute consommation, rien n'est modifié.
{
  const poche = { item_branche: 3, item_caillou: 2, item_hache: 1 }; // déjà au plafond (1)
  const resultat = fabriquer(recetteHache, { poche, flags: flagsFactice, cooldowns: {}, heureMs: 0, plafondSortie: () => PLAFOND_HACHE });
  assert.equal(resultat.ok, false);
  assert.equal(resultat.raison, 'poche_pleine');
  assert.deepEqual(resultat.poche, poche, 'aucune entrée ne doit avoir été retirée');
}

// 7. recettesDeStation filtre par type de station.
{
  const recettes = [recetteHache, { ...recetteHache, id: 'rec_pioche', station: 'station_type_atelier' }, { ...recetteHache, id: 'rec_fruit_cuit', station: 'station_type_cuisine' }];
  const registreFactice = { tous: (cat) => (cat === 'recipes' ? recettes : []) };
  assert.equal(recettesDeStation(registreFactice, 'station_type_atelier').length, 2);
  assert.equal(recettesDeStation(registreFactice, 'station_type_cuisine').length, 1);
}

// 8. Data-driven : une 4ᵉ recette (corde, débloquée par flag_niveau_3) dans
// un catalogue de test complet valide sans modification de /src.
{
  const donnees = {};
  for (const nom of Object.keys(SCHEMAS)) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'x', icon: 'x', shape: 'x' }];
  donnees.stats = [{ id: 'stat_force', label_key: 'x', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'x' }];
  donnees.flags = [{ id: 'flag_niveau_3', label_key: 'x' }];
  donnees.unlocks = [];
  donnees.visuels = [{ id: 'v', ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] }];
  donnees.items = [
    { id: 'item_branche', label_key: 'x', categorie: 'ressource', render: { visuel: 'v' } },
    { id: 'item_corde', label_key: 'x', categorie: 'materiau', render: { visuel: 'v' } },
  ];
  donnees.items[1].categorie = 'valeur'; // catégorie libre existante, la corde n'a pas besoin d'une nouvelle catégorie
  donnees.stations = [{ id: 'station_type_atelier', label_key: 'x', role: 'craft', placable: true }];
  // Le type d'une recette est une référence (24/09, tri de l'écran Craft).
  donnees.recipe_categories = [{ id: 'categorie_ressource' }];
  donnees.recipes = [{
    id: 'rec_corde', label_key: 'x', station: 'station_type_atelier',
    entrees: [{ item: 'item_branche', qte: 2 }], sortie: { item: 'item_corde', qte: 1 },
    categorie: 'categorie_ressource', xp: 5, cooldown_ms: 30000,
    visible_si: { all: ['flag_niveau_3'] },
  }];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `4ᵉ recette rejetée :\n${erreurs.join('\n')}`);

  const recette = donnees.recipes[0];
  assert.equal(recetteDecouverte(recette, flagsFactice), false);
  assert.equal(recetteDecouverte(recette, flagsQuiDebloquentTout), true);
}

console.log('OK test_phase3_recipes');

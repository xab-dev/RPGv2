// Contrat `D-20` palier A (décision `Q-21`) : « sans arme » n'existe pas —
// les mains nues sont une arme comme une autre. La portée effective de
// l'auto-attaque vient donc TOUJOURS de l'entrée d'arme équipée, l'arme par
// défaut est désignée en données, et l'anneau de feedback lit exactement la
// même entrée que le calcul de dégâts (une seule résolution, jamais deux qui
// pourraient diverger).
import assert from 'node:assert/strict';
import { resoudreArmeEquipee, resoudreAutoAttaque, estDansPortee } from '../src/combat.js';
import { creerHeros, creerMonstre } from '../src/entities.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { saveNeuve } from '../src/save.js';

const TILE_SIZE = 32;
const CATALOGUES = ['weapons', 'equipment_slots'];

const { donnees } = await chargerCataloguesDepuisDisque('data', CATALOGUES);
const registre = construireRegistre(donnees);

// 1. Une partie neuve n'inscrit AUCUN id d'arme en dur : l'arme se résout au
// chargement, depuis le défaut déclaré en données.
{
  const save = saveNeuve();
  const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
  assert.ok(arme, 'une partie neuve doit résoudre une arme équipée');
  assert.equal(arme.id, 'weapon_mains_nues');
}

// 2. L'épée en bois porte plus loin que les mains nues — lu dans les vrais
// catalogues, jamais recopié ici.
//
// `D-66` (T5) : le rapport exact n'est PLUS la moitié. Xav a tranché le
// 21/09 : l'épée passe de 1 tuile à **0,75**, « à mi-chemin entre les mains
// nues et l'ancienne valeur », pour « faire plus de dégâts de zone au corps
// à corps sans donner un avantage trop gros avant la suite du jeu ». Ce que
// ce test doit garantir, c'est la RELATION (une arme porte plus loin que les
// poings), pas un ratio d'équilibrage qui appartient à Xav.
{
  const mainsNues = registre.obtenir('weapons', 'weapon_mains_nues');
  const epee = registre.obtenir('weapons', 'weapon_epee_bois');
  assert.ok(
    epee.portee.max > mainsNues.portee.max,
    `l'épée (${epee.portee.max}) doit porter plus loin que les mains nues (${mainsNues.portee.max})`,
  );
  assert.equal(mainsNues.portee.min, epee.portee.min);
}

// 3. La portée EFFECTIVE vient de l'arme : à distance égale, un monstre hors
// de portée des mains nues est à portée de l'épée. C'est le cœur du ticket —
// aucune stat, aucune constante de combat.js n'intervient.
{
  const hero = creerHeros({ x: 0, y: 0, rayon: 10, pvMax: 20 });
  // Entre les deux portées, et strictement : à 0,75 tuile pile, le monstre
  // serait exactement SUR le bord de l'épée depuis `D-66`, et ce test
  // dépendrait d'un « <= » contre un « < ».
  const monstre = creerMonstre({ id: 'm', pv: 5 }, { x: TILE_SIZE * 0.6, y: 0 });
  const mainsNues = registre.obtenir('weapons', 'weapon_mains_nues');
  const epee = registre.obtenir('weapons', 'weapon_epee_bois');

  assert.equal(estDansPortee(hero, monstre, mainsNues.portee, TILE_SIZE), false);
  assert.equal(estDansPortee(hero, monstre, epee.portee, TILE_SIZE), true);
  assert.deepEqual(resoudreAutoAttaque(hero, [monstre], mainsNues.portee, TILE_SIZE), []);
}

// 4. Changer l'arme par défaut EN DONNÉES change la portée du héros, sans
// toucher une ligne de code — le test de la règle d'architecture directrice
// appliqué à ce catalogue.
{
  const donneesModifiees = {
    ...donnees,
    equipment_slots: donnees.equipment_slots.map((s) => (
      s.id === 'equip_arme' ? { ...s, defaut: 'weapon_epee_bois' } : s
    )),
  };
  const autreRegistre = construireRegistre(donneesModifiees);
  const save = saveNeuve();
  assert.equal(resoudreArmeEquipee(autreRegistre, save.hero.equipement.arme).id, 'weapon_epee_bois');
}

// 5. Une arme réellement équipée (sauvegarde existante) prime sur le défaut :
// le défaut ne sert qu'à combler une absence de choix.
{
  assert.equal(resoudreArmeEquipee(registre, 'weapon_epee_bois').id, 'weapon_epee_bois');
}

// 6. Une référence d'arme inconnue est un échec DUR AU BOOT, avec le chemin
// exact — jamais un `undefined` qui casserait plus tard dans la boucle de jeu.
{
  const donneesCassees = {
    ...donnees,
    equipment_slots: donnees.equipment_slots.map((s) => (
      s.id === 'equip_arme' ? { ...s, defaut: 'weapon_inexistante' } : s
    )),
  };
  // On ne charge ici que les 2 catalogues utiles : validerCatalogues signale
  // aussi tous les absents, on ne retient donc que ce qui parle de l'arme.
  const erreurs = validerCatalogues(donneesCassees).filter((e) => e.includes('weapon_inexistante'));
  assert.equal(erreurs.length, 1, `attendu 1 erreur d'arme, obtenu : ${JSON.stringify(erreurs)}`);
  assert.equal(erreurs[0], 'equipment_slots.json > equip_arme > defaut > "weapon_inexistante" introuvable dans weapons.json');
}

// 7. L'anneau de feedback et le calcul de dégâts lisent la MÊME entrée : un
// seul point de résolution exporté, pas deux chemins parallèles (main.js
// appelle resoudreArmeEquipee aux deux endroits, cf. journal du ticket).
{
  const save = saveNeuve();
  const pourDegats = resoudreArmeEquipee(registre, save.hero.equipement.arme);
  const pourAnneau = resoudreArmeEquipee(registre, save.hero.equipement.arme);
  assert.deepEqual(pourDegats.portee, pourAnneau.portee);
  assert.equal(pourAnneau.portee.max * TILE_SIZE, 16, 'anneau : 0,5 tuile = 16 px logiques');
}

console.log('OK test_d20_mains_nues');

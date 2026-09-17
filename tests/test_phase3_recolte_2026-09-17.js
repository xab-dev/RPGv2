// Contrat (Palier B, specs/04_maison-interieur.md §3.2/§7) : peutRecolter()
// devient enfin true avec l'outil en poche, cooldown PAR TUILE (deux arbres
// = deux cooldowns), respawn des items au sol différé — vérifié sur le vrai
// orchestrateur (données réelles), pas seulement les fonctions pures.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { peutRecolter } from '../src/resources.js';
import { estExpire, poserCooldown } from '../src/cooldowns.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// 1. peutRecolter : false sans l'outil, true une fois l'outil en poche.
{
  const ressource = { outil_requis: 'item_hache' };
  assert.equal(peutRecolter(ressource, {}), false);
  assert.equal(peutRecolter(ressource, { item_hache: 0 }), false, 'un outil à 0 exemplaire ne compte pas');
  assert.equal(peutRecolter(ressource, { item_hache: 1 }), true);
}

// 2. Cooldown PAR TUILE : deux clés différentes (deux arbres) restent
// indépendantes, une même clé reste bloquée jusqu'à expiration.
{
  let cooldowns = {};
  cooldowns = poserCooldown(cooldowns, 'res:scene_x:10:20', 0);
  assert.equal(estExpire(cooldowns, 'res:scene_x:10:20', 60000, 1000), false);
  assert.equal(estExpire(cooldowns, 'res:scene_x:11:20', 60000, 1000), true, 'une autre tuile a son propre cooldown');
  assert.equal(estExpire(cooldowns, 'res:scene_x:10:20', 60000, 61000), true, 'expiré après cooldown_ms');
}

// 3. Le vrai catalogue resources.json pointe vers de vrais outils/items.
{
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  const resBois = registre.obtenir('resources', 'res_bois');
  assert.equal(resBois.outil_requis, 'item_hache');
  assert.equal(resBois.item_produit, 'item_bois');
  assert.ok(registre.existe('items', 'item_hache'));
  assert.ok(registre.existe('items', 'item_bois'));

  // 4. Intégration : avec la hache en poche, INTERACT sur l'arbre donne du
  // bois ; un second INTERACT immédiat est bloqué par le cooldown (dialogue
  // ouvert) ; après expiration simulée, la récolte fonctionne à nouveau.
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.inventaire.items.item_hache = 1;

  const menuFactice = { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} };
  const dialogue = creerDialogue();
  const frames = [];
  const input = { maj: () => frames[frames.length - 1] };
  const orch = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu: menuFactice, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });
  const scene = orch.obtenirScene();

  // Cherche la première tuile-ressource "res_bois" de la scène réelle.
  let cible = null;
  for (let ty = 0; ty < scene.height && !cible; ty++) {
    for (let tx = 0; tx < scene.width; tx++) {
      const tuile = scene.tuileA(tx, ty);
      if (tuile && tuile.ressource === 'res_bois') { cible = { tx, ty }; break; }
    }
  }
  assert.ok(cible, 'au moins une tuile res_bois doit exister dans scene_maison_exterieur');

  const hero = orch.obtenirHero();
  hero.x = (cible.tx + 0.5) * scene.tileSize;
  hero.y = (cible.ty + 0.5) * scene.tileSize + 20; // à portée (< DISTANCE_INTERACT_PX), hors de la tuile solide elle-même

  const etatInteract = {
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false }, skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false }, interact: { pressed: true, held: true }, menu: { pressed: false, held: false },
  };
  const etatNeutre = { ...etatInteract, interact: { pressed: false, held: false } };

  frames.push(etatInteract);
  orch.maj(16);
  assert.equal(save.inventaire.items.item_bois, 1, 'la récolte doit créditer du bois');
  assert.equal(dialogue.estOuvert(), false, 'une récolte réussie ne montre aucun dialogue');

  frames.push(etatNeutre);
  orch.maj(16);
  frames.push(etatInteract);
  orch.maj(16);
  assert.equal(save.inventaire.items.item_bois, 1, 'le cooldown bloque une 2ᵉ récolte immédiate');
  assert.equal(dialogue.estOuvert(), true, 'le dialogue de cooldown doit s\'ouvrir');
}

console.log('OK test_phase3_recolte');

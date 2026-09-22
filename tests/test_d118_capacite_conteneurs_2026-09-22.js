// `D-118` (T1 de la file « inventaire survivaliste ») : la poche et le coffre
// comptent. Ce qui est éprouvé ici est un CONTRAT, jamais un réglage — les
// quatre nombres (4 slots / pile 5, 10 slots / pile 20) appartiennent à Xav et
// vivent dans `data/conteneurs.json` ; aucun n'est écrit ci-dessous (`D-52`).
//
// Les relations, elles, sont vraies quelles que soient les valeurs :
//   - la pile appartient au CONTENEUR, l'objet ne fait que l'abaisser ;
//   - un outil ne s'empile pas, dans n'importe quel conteneur ;
//   - la poche est plus petite que le coffre ;
//   - plein = refus, et le refus ne consomme pas le cooldown de la tuile ;
//   - une vieille sauvegarde ne perd rien en silence.
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
import {
  resoudreCapacite, pileEffective, slotsOccupes, plafondPourItem, ajouterItem, normaliserContenus, accepte,
} from '../src/inventory.js';

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
const obtenirItem = (id) => registre.obtenir('items', id);

const poche = resoudreCapacite(registre.obtenir('conteneurs', 'conteneur_poche'));
const coffre = resoudreCapacite(registre.obtenir('conteneurs', 'conteneur_coffre'));

// --- 1. Les quatre nombres vivent en données, et le point de résolution les
// rend tels quels (aucun modificateur livré, §0 du brief) -------------------
{
  const brut = registre.obtenir('conteneurs', 'conteneur_poche');
  assert.deepEqual(poche, { slots: brut.slots, pile: brut.pile, filtre: null });
  assert.ok(poche.slots * poche.pile < coffre.slots * coffre.pile, 'la poche est plus petite que le coffre');
  assert.equal(accepte(obtenirItem('item_bois'), poche), true, 'sans filtre, un conteneur accepte tout');
  console.log('OK la capacité vient des données, résolue en UN point, rendue telle quelle');
}

// --- 2. La pile appartient au conteneur ; l'objet peut l'abaisser ----------
{
  const bois = obtenirItem('item_bois');
  assert.equal(bois.pile_max, undefined, 'une ressource ne plafonne rien : le conteneur décide');
  assert.equal(pileEffective(bois, poche), poche.pile);
  assert.equal(pileEffective(bois, coffre), coffre.pile, 'le même objet s’empile plus haut dans le coffre');
  assert.ok(pileEffective(bois, poche) < pileEffective(bois, coffre));

  for (const id of registre.tous('items').filter((it) => ['outil', 'arme'].includes(it.categorie)).map((it) => it.id)) {
    assert.equal(pileEffective(obtenirItem(id), coffre), 1, `${id} ne s’empile dans AUCUN conteneur`);
  }
  console.log('OK la pile vient du conteneur, l’objet ne fait que l’abaisser — un outil occupe un slot, seul');
}

// --- 3. Les slots sont une conséquence, pas un tableau de cases ------------
{
  const pile = poche.pile;
  assert.equal(slotsOccupes({ item_bois: pile }, poche, obtenirItem), 1);
  assert.equal(slotsOccupes({ item_bois: pile + 1 }, poche, obtenirItem), 2, 'au-delà d’une pile, un second slot');
  assert.equal(slotsOccupes({ item_bois: 0 }, poche, obtenirItem), 0, 'une clé à zéro n’occupe rien');
  // Un outil occupe un slot entier à lui tout seul — c'est ce qui donnera son
  // sens au porte-outils (`Q-65`).
  assert.equal(slotsOccupes({ item_hache: 1, item_pioche: 1 }, poche, obtenirItem), 2);
  console.log('OK les slots se déduisent du contenu : douze unités à cinq par pile en occupent trois');
}

// --- 4. Plein = refus, et le plafond tient compte des AUTRES objets --------
{
  const presque = { item_hache: 1, item_pioche: 1, item_caillou: 1 };
  const libres = poche.slots - slotsOccupes(presque, poche, obtenirItem);
  assert.equal(plafondPourItem(presque, 'item_bois', poche, obtenirItem), libres * poche.pile);

  const pleine = { ...presque, item_bois: 1 };
  assert.equal(slotsOccupes(pleine, poche, obtenirItem), poche.slots, 'quatre sortes d’objets remplissent la poche');
  assert.equal(
    plafondPourItem(pleine, 'item_branche', poche, obtenirItem), 0,
    'la cinquième sorte n’a plus de slot : elle est refusée',
  );
  const refus = ajouterItem(pleine, 'item_branche', 1, plafondPourItem(pleine, 'item_branche', poche, obtenirItem));
  assert.equal(refus.ajoute, 0, 'et le refus se DIT, par `ajoute` — jamais un ajout silencieux');
  // Un objet DÉJÀ en poche, lui, continue d'entrer tant que sa pile n'est pas
  // pleine : la poche pleine ne fige pas tout.
  assert.ok(plafondPourItem(pleine, 'item_bois', poche, obtenirItem) > 1);
  console.log('OK poche pleine : la sorte nouvelle est refusée, celle déjà là continue d’entrer');
}

// --- 5. Une vieille sauvegarde ne perd rien en silence ---------------------
{
  // 20 bois en poche : c'était légal avant `D-118` (l'ancien plafond par
  // objet), ça ne l'est plus si trois autres slots sont pris.
  const bilan = normaliserContenus(
    { poche: { item_hache: 1, item_pioche: 1, item_epee_bois: 1, item_bois: 20 }, coffre: {} },
    { capacitePoche: poche, capaciteCoffre: coffre, obtenirItem },
  );
  const garde = bilan.poche.item_bois;
  assert.equal(garde, poche.pile, 'il reste un slot : une pile y tient, pas plus');
  assert.equal(bilan.coffre.item_bois, 20 - garde, 'le surplus descend au coffre');
  assert.deepEqual(bilan.deplaces, [{ item: 'item_bois', quantite: 20 - garde }], 'et le déplacement est DIT');
  assert.deepEqual(bilan.perdus, [], 'rien n’est perdu tant que le coffre a de la place');

  // Le coffre plein aussi : ce qui ne rentre nulle part est RENDU, pas jeté.
  const sature = normaliserContenus(
    { poche: { item_bois: poche.slots * poche.pile + 1 }, coffre: { item_bois: coffre.slots * coffre.pile } },
    { capacitePoche: poche, capaciteCoffre: coffre, obtenirItem },
  );
  assert.ok(sature.perdus.length > 0, 'un surplus sans place est signalé, jamais silencieux');
  console.log('OK vieille sauvegarde : découpée, le surplus au coffre, et ce qui ne rentre pas est DIT');
}

// --- 6. Sur le vrai jeu : récolter poche pleine ne mange plus le cooldown --
// C'est la seconde moitié de `D-28`, et elle ne se prouve que de bout en
// bout : `peutRecolter`, le plafond et le cooldown vivent dans trois endroits
// différents, que seul l'orchestrateur assemble.
{
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true, flag_ambiance_maison_premiere_visite: true,
  };
  // La poche est pleine de quatre sortes, dont la hache (sinon la récolte est
  // refusée pour une autre raison : l'outil manquant).
  save.inventaire.items = {
    item_hache: 1, item_pioche: 1, item_caillou: 1, item_branche: 1,
  };

  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  const b = (v) => ({ pressed: v, held: v });
  const etat = (interact) => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
  });

  let cible = null;
  for (let ty = 0; ty < scene.height && !cible; ty += 1) {
    for (let tx = 0; tx < scene.width && !cible; tx += 1) {
      const tuile = scene.tuileA(tx, ty);
      if (tuile && tuile.ressource === 'res_bois') cible = { tx, ty };
    }
  }
  assert.ok(cible, 'la scène doit porter au moins un arbre');
  hero.x = (cible.tx + 0.5) * scene.tileSize;
  hero.y = (cible.ty + 0.5) * scene.tileSize + 20;

  const cleCooldown = `res:${scene.id}:${cible.tx}:${cible.ty}`;
  frames.push(etat(true));
  orch.maj(16);
  frames.push(etat(false));
  orch.maj(16);

  assert.equal(save.inventaire.items.item_bois || 0, 0, 'poche pleine : rien n’est récolté');
  assert.equal(
    save.cooldowns[cleCooldown], undefined,
    '`D-28` : un refus ne consomme pas le cooldown de la tuile — les deux chemins de récolte se comportent enfin pareil',
  );
  console.log('OK D-28 clos : récolter poche pleine ne rapporte rien ET ne mange pas le cooldown');
}

// --- 7. Les textes du refus existent, en FR et en EN -----------------------
{
  const en = creerI18n(dictionnaires, 'en');
  for (const cle of ['monde.poche_pleine', 'monde.coffre_plein', 'conteneur.poche', 'conteneur.coffre']) {
    for (const [langue, dico] of [['fr', i18n], ['en', en]]) {
      assert.notEqual(dico.t(cle), cle, `${cle} manque en ${langue}`);
    }
  }
  console.log('OK les textes du refus existent dans les deux langues');
}

console.log('OK test_d118_capacite_conteneurs');

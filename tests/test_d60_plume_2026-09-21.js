// `D-60` (file Nv.0 → Nv.10, T6) — décision de Xav du 21/09 : **la Plume**.
// Un objet unique, posé dans le champ de vision du joueur à la sortie de la
// Grotte, dans l'axe du chemin. Elle **ne sert à rien** : aucune recette,
// aucun effet. C'est le premier ramassage du jeu, et un support pour le lore.
//
// Contrats vérifiés ici :
//   - elle est là où la main l'a mise, et VISIBLE depuis le point d'arrivée ;
//   - elle ne sert à rien — aucune recette ne la cite, ni comme ingrédient
//     ni comme sortie, et elle n'a ni consommation ni effet ;
//   - elle est hors du tirage du jour (`D-59`) : aucun bloc `spawn`, et elle
//     ne bouge pas d'une aube à l'autre ;
//   - ramassée, elle rapporte « +1 » et « +1xp » comme tout objet au sol ;
//   - ramassée, elle ne revient JAMAIS, pas même après une aube ;
//   - une sauvegarde ancienne la trouve au sol, sans migration ;
//   - sa fiche porte son texte, dans les deux langues.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, lignesFicheItem } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_ID = 'scene_maison_exterieur';
const PLUME = 'item_plume';

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const plumeDef = registre.obtenir('items', PLUME);
const donneesScene = registre.obtenir('scenes', SCENE_ID);

// Monte une partie dans la Région Maison, au point d'arrivée de la Grotte.
function monterPartie(flagsSupplementaires = {}) {
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = SCENE_ID;
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    ...flagsSupplementaires,
  };
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, ouvrirCraft: () => {},
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
  const tick = (options) => { frames.push(etat(options)); orch.maj(16); };
  // Passer plusieurs aubes demande une demi-heure de temps de jeu ACTIF, et
  // la survie tuerait le héros bien avant (il serait renvoyé dans la Grotte,
  // et la scène observée ne serait plus la bonne). On le nourrit donc à
  // chaque tour de boucle : c'est un raccourci de banc d'essai, pas une
  // règle de jeu — ce qui est éprouvé ici, c'est le tirage à l'aube, pas la
  // faim, qui a ses propres tests.
  const avancerJusquA = (ms) => {
    for (let t = 0; t < ms; t += 16) {
      for (const jauge of Object.keys(save.survie)) save.survie[jauge] = 1;
      tick();
    }
  };
  return { orch, save, i18n, tick, avancerJusquA, etat, frames };
}

// --- 1. Elle est là où la main l'a mise, et on la voit en arrivant --------
{
  const declaration = (donneesScene.objets_uniques || []).find((o) => o.item === PLUME);
  assert.ok(declaration, 'la Plume doit être déclarée dans objets_uniques de la Région Maison');

  const { save } = monterPartie();
  const posees = save.monde.items_sol[SCENE_ID][PLUME];
  assert.equal(posees.length, 1, 'une seule Plume dans tout le jeu');
  const tileSize = donneesScene.tile_size;
  assert.equal(Math.floor(posees[0].x / tileSize), declaration.x);
  assert.equal(Math.floor(posees[0].y / tileSize), declaration.y);

  // « Dans le champ de vision du joueur à la sortie de la Grotte, dans l'axe
  // du chemin » : à la résolution logique 480 × 270, la caméra montre 15
  // tuiles de large et 8 de haut autour du héros. On garde de la marge (la
  // caméra est bornée au bord de la carte, donc l'arrivée n'est pas
  // exactement au centre) : il faut qu'elle soit devant, et pas trop loin.
  const arrivee = donneesScene.spawn;
  const ecartX = declaration.x - arrivee.x;
  const ecartY = Math.abs(declaration.y - arrivee.y);
  assert.ok(ecartX > 0 && ecartX <= 10, `la Plume doit être DEVANT le joueur, à portée de vue (écart x ${ecartX})`);
  assert.ok(ecartY <= 3, `la Plume doit rester dans l'axe du chemin (écart y ${ecartY})`);
  console.log('OK la Plume est posée devant la sortie de la Grotte, dans l\'axe du chemin');
}

// --- 2. Elle ne sert à rien, et c'est le contrat -------------------------
{
  for (const recette of registre.tous('recipes')) {
    const ingredients = recette.ingredients || [];
    assert.ok(
      !ingredients.some((i) => i.item === PLUME),
      `${recette.id} ne doit pas demander la Plume : elle ne sert à rien`,
    );
    assert.notEqual(recette.sortie.item, PLUME, `${recette.id} ne doit pas produire la Plume : il n'y en a qu'une`);
  }
  assert.equal(plumeDef.consommation, undefined, 'la Plume ne se consomme pas');
  assert.equal(plumeDef.pile_max, 1, 'il n\'y en a qu\'une : la pile est de 1');
  assert.equal(plumeDef.spawn, undefined, 'la Plume est hors du tirage du jour (`D-59`) : aucun bloc spawn');
  console.log('OK la Plume ne sert à rien, et rien ne la produit');
}

// --- 3. Elle ne bouge pas d'une aube à l'autre ---------------------------
// Le tirage du jour rebat toute la carte ; elle, non. Sans ce contrôle, la
// rendre « comme les autres » passerait inaperçu.
{
  const { save, avancerJusquA } = monterPartie();
  const avant = { ...save.monde.items_sol[SCENE_ID][PLUME][0] };
  const jourAvant = save.monde.jour;
  // Deux cycles complets de jour/nuit, donc au moins deux aubes.
  avancerJusquA(2 * 17 * 60 * 1000);
  assert.ok(save.monde.jour > jourAvant, 'le compteur de jours doit avoir avancé, sinon ce test ne prouve rien');
  const apres = save.monde.items_sol[SCENE_ID][PLUME];
  assert.equal(apres.length, 1, 'toujours une seule Plume après plusieurs aubes');
  assert.deepEqual({ x: apres[0].x, y: apres[0].y }, avant, 'la Plume ne suit pas le tirage du jour');
  console.log(`OK la Plume ne bouge pas (${save.monde.jour - jourAvant} aube(s) passée(s))`);
}

// --- 4. Ramassée : « +1 » et « +1xp », puis plus jamais ------------------
{
  const { orch, save, tick, avancerJusquA } = monterPartie();
  const hero = orch.obtenirHero();
  const position = save.monde.items_sol[SCENE_ID][PLUME][0];
  hero.x = position.x;
  hero.y = position.y;
  const xpAvant = save.hero.xp;

  tick({ interact: true });
  assert.equal(save.inventaire.items[PLUME], 1, 'la Plume doit entrer en poche');
  assert.equal(save.flags.flag_plume_ramassee, true, 'son flag doit être posé au ramassage');
  assert.equal(save.hero.xp, xpAvant + plumeDef.xp, 'elle rapporte l\'XP de sa fiche catalogue');

  // Le couple de textes de `D-58` : c'est elle qui enseigne le geste.
  const textes = orch.obtenirTextesFlottants();
  const gain = textes.find((t) => t.style === 'gain');
  const xp = textes.find((t) => t.style === 'xp');
  assert.ok(gain && xp, 'le ramassage doit émettre « +1 » ET « +1xp »');
  assert.equal(gain.cle, PLUME);
  assert.equal(xp.quantite, plumeDef.xp);

  // Plus jamais : ni tout de suite, ni après des aubes.
  assert.equal((save.monde.items_sol[SCENE_ID][PLUME] || []).length, 0, 'elle quitte le sol');
  avancerJusquA(2 * 17 * 60 * 1000);
  assert.equal(
    (save.monde.items_sol[SCENE_ID][PLUME] || []).length, 0,
    'une fois ramassée, la Plume ne revient jamais — pas même après une aube',
  );
  console.log('OK ramassée, elle donne « +1 » et « +1xp », et ne revient jamais');
}

// --- 5. Une sauvegarde ancienne la trouve, sans migration ---------------
// Rien n'a été ajouté à la sauvegarde pour elle : c'est l'ABSENCE de son
// flag qui la pose. Une partie commencée avant ce ticket la verra donc à sa
// prochaine entrée dans la Région Maison.
{
  const { save } = monterPartie({ flag_maison_decouverte: true, flag_jardin_decouvert: true, flag_niveau_2: true });
  assert.equal(save.monde.items_sol[SCENE_ID][PLUME].length, 1, 'une partie déjà avancée trouve quand même la Plume');
  const { save: saveApres } = monterPartie({ flag_plume_ramassee: true });
  assert.equal(
    (saveApres.monde.items_sol[SCENE_ID][PLUME] || []).length, 0,
    'et une partie qui l\'a déjà ramassée ne la revoit pas',
  );
  console.log('OK aucune migration : c\'est l\'absence du flag qui pose la Plume');
}

// --- 6. Sa fiche porte son texte, dans les deux langues -----------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  for (const langue of i18n.languesDisponibles()) {
    i18n.definirLangue(langue);
    const lignes = lignesFicheItem(plumeDef, registre, i18n);
    const texte = i18n.t(plumeDef.description_key);
    assert.ok(!texte.startsWith('[['), `${plumeDef.description_key} doit exister en ${langue}`);
    assert.ok(lignes.includes(texte), `la fiche doit porter le texte de la Plume en ${langue}`);
    assert.ok(!i18n.t(plumeDef.label_key).startsWith('[['), `le nom de la Plume doit exister en ${langue}`);
  }
  console.log('OK la fiche de la Plume porte son texte, en FR et en EN');
}

console.log('OK test_d60_plume');

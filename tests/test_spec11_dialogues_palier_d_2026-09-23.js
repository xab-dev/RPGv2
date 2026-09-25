// `specs/11_dialogues-consequences.md` palier D : le coffre effacé (chapitre 3,
// « Discernement », §7.3).
//
// Le follet annonce qu'en rangeant il a déplacé le coffre et que tout s'est
// effacé. C'est faux : l'effet de monde `coffre_apparence_vide` fait seulement
// AFFICHER un coffre vide, et le contenu réel ne bouge pas d'un octet. Ce test
// tient les contrats de la spec (§8, palier D) :
//   1. la valeur nommée `remplissage_coffre` : juste sous le seuil rien, au
//      seuil oui, une seule fois ;
//   2. pendant l'effet, la liste du Coffre est vide et le contenu sauvegardé
//      est INTACT ;
//   3. un dépôt pendant l'effet atterrit dans le vrai contenu ;
//   4. à la durée exacte, la liste revient, et le follet le dit ;
//   5. l'effet n'est pas dans la sauvegarde ;
//   6. l'option par défaut (celle de qui spamme) ne pose aucun effet — une
//      option `defaut` n'a jamais de conséquence (spec §0).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, erreursTextesDialogues, indexOptionDefaut } from '../src/dialogue.js';
import { slotsOccupes, resoudreCapacite } from '../src/inventory.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');
const [dictionnaires, { donnees }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const obtenirItem = (id) => registre.obtenir('items', id);

const ID = 'dlg_chapitre_3';
const EFFET = 'coffre_apparence_vide';
const chapitre = registre.obtenir('dialogues', ID);
assert.ok(chapitre, 'le chapitre 3 est au catalogue');
const ambiance = donnees.ambiances.find((a) => a.dialogue === ID);
assert.ok(ambiance, 'une entrée d’ambiance l’ouvre');
const effetDef = registre.obtenir('effets_monde', EFFET);
assert.ok(effetDef, `« ${EFFET} » est au catalogue des effets de monde`);
assert.ok(registre.obtenir('dialogues', effetDef.dialogue_fin), 'l’effet nomme la réplique de sa fin');

// Le seuil se LIT dans la condition (jamais recopié ici) : le test tient le
// contrat « au seuil oui, juste dessous non », pas la valeur 0,7.
const conditionsDe = (c) => (c.all ? c.all : [c]);
const seuil = conditionsDe(ambiance.condition).find((c) => c.valeur === 'remplissage_coffre');
assert.ok(seuil && typeof seuil.min === 'number', 'la porte interroge remplissage_coffre');
assert.ok(conditionsDe(ambiance.condition).some((c) => c.valeur === 'niveau' && c.min === 15), 'et le Nv.15');

const capacite = resoudreCapacite(registre.obtenir('conteneurs', registre.obtenir('stations',
  registre.obtenir('puzzles', 'station_coffre').station_type).conteneur));
const slotsAuSeuil = Math.ceil(seuil.min * capacite.slots - 1e-9);
// Une quantité de bois qui occupe exactement `k` slots du coffre.
function boisPour(k) {
  for (let q = 1; q < 10000; q += 1) {
    if (slotsOccupes({ item_bois: q }, capacite, obtenirItem) === k) return q;
  }
  throw new Error(`aucune quantité de bois n’occupe ${k} slots`);
}

// --- 0. Données et textes -----------------------------------------------
{
  assert.deepEqual(erreursTextesDialogues(donnees.dialogues, dictionnaires), []);
  const options = chapitre.noeuds[chapitre.entree].options;
  const defaut = options[indexOptionDefaut(chapitre.noeuds[chapitre.entree])];
  assert.equal(defaut.effets_monde, undefined, 'l’option par défaut ne pose aucun effet');
  assert.ok(options.some((o) => (o.effets_monde || []).some((e) => e.id === EFFET)), 'une option pose le coffre vide');
  // Un effet qui nomme un dialogue inconnu tombe au démarrage.
  const casse = JSON.parse(JSON.stringify(donnees));
  casse.effets_monde.find((e) => e.id === EFFET).dialogue_fin = 'dlg_inexistant';
  assert.ok(validerCatalogues(casse).some((e) => e.includes('dialogue_fin')));
  console.log('OK le chapitre 3 en données ; le défaut ne pose rien ; dialogue_fin vérifié au boot');
}

// --- Sur le vrai jeu ------------------------------------------------------
const b = (v) => ({ pressed: v, held: v });
const neutre = () => ({
  move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
  skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
});
function partie({ niveau = 15, slots = slotsAuSeuil, dehors = false } = {}) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
  };
  // Les AUTRES lignes d'ambiance déjà dites (elles passeraient avant).
  for (const a of donnees.ambiances) if (a.dialogue !== ID) save.flags[a.flag] = true;
  save.inventaire.items = { item_caillou: 3 };
  save.maison.stations.station_coffre = { contenu: { item_bois: boisPour(slots) } };
  const dialogue = creerDialogue();
  const frames = [];
  let fournisseurCoffre = null;
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {},
      ouvrirCoffre: (f) => { fournisseurCoffre = f; },
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  // Contre le coffre, DANS la maison : c'est là que le follet en parle.
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_coffre');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  // Dehors : sur la route, à l'ouest de la maison (la case d'arrivée depuis la Grotte).
  if (dehors) {
    const ts = orch.obtenirScene().tileSize;
    orch.obtenirHero().x = 20 * ts;
    orch.obtenirHero().y = 58.5 * ts;
  }
  const tick = (modif = {}, ms = 16) => { frames.push({ ...neutre(), ...modif }); orch.maj(ms); };
  const attendre = () => { for (let i = 0; i < 400; i += 1) tick(); };
  const ouvrirCoffre = () => { fournisseurCoffre = null; tick({ interact: b(true) }); tick(); return fournisseurCoffre; };
  return { save, dialogue, orch, tick, attendre, ouvrirCoffre };
}
function choisir(dialogue, tick, attendre, rang) {
  attendre();
  // `D-243` : la question s'arrête comme une réplique ; un appui armé fait
  // paraître ses options, qui s'arment à neuf.
  assert.equal(dialogue.ligneCourante().options, null, 'la question attend un appui avant ses options');
  tick({ attack: b(true) });
  attendre();
  let sel = dialogue.ligneCourante().selection;
  while (sel !== rang) {
    tick({ move: { x: 0, y: rang > sel ? 1 : -1 } });
    tick();
    sel = dialogue.ligneCourante().selection;
  }
  tick({ attack: b(true) });
}
function finir(dialogue, tick, attendre) {
  for (let garde = 0; dialogue.estOuvert() && garde < 10; garde += 1) {
    attendre();
    tick({ attack: b(true) });
  }
  assert.equal(dialogue.estOuvert(), false);
}
const retraits = (entrees) => entrees.filter((e) => e.texte.startsWith(i18n.t('menu.coffre_retirer')));

// --- 1. La porte : juste sous le seuil rien, au seuil oui, une fois ---------
{
  const { dialogue, tick } = partie({ slots: slotsAuSeuil - 1 });
  for (let i = 0; i < 30; i += 1) tick();
  assert.equal(dialogue.estOuvert(), false, `à ${slotsAuSeuil - 1}/${capacite.slots} slots, rien`);
  const auNv14 = partie({ niveau: 14 });
  for (let i = 0; i < 30; i += 1) auNv14.tick();
  assert.equal(auNv14.dialogue.estOuvert(), false, 'au Nv.14, rien');
  const dehors = partie({ dehors: true });
  for (let i = 0; i < 30; i += 1) dehors.tick();
  assert.equal(dehors.dialogue.estOuvert(), false, 'dehors, rien : le follet en parle dans la Maison');
  console.log(`OK sous le seuil (${slotsAuSeuil - 1}/${capacite.slots}), au Nv.14, ou dehors : rien`);
}

// --- 2 à 5. « Montre-moi » : le coffre paraît vide, il ne l'est pas ---------
{
  const { save, dialogue, tick, attendre, ouvrirCoffre } = partie();
  tick();
  assert.equal(dialogue.estOuvert(), true, `à ${slotsAuSeuil}/${capacite.slots} slots, au Nv.15 : le follet parle`);
  assert.equal(dialogue.etatConversation().dialogueId, ID);
  const contenuAvant = JSON.stringify(save.maison.stations.station_coffre.contenu);
  const options = chapitre.noeuds[chapitre.entree].options;
  const rangEffet = options.findIndex((o) => (o.effets_monde || []).some((e) => e.id === EFFET));
  const duree = options[rangEffet].effets_monde.find((e) => e.id === EFFET).duree_ms;
  choisir(dialogue, tick, attendre, rangEffet);
  finir(dialogue, tick, attendre);

  // 2. Le Coffre s'ouvre VIDE ; le contenu réel est intact.
  const fournisseur = ouvrirCoffre();
  assert.ok(fournisseur, 'le Coffre s’ouvre');
  assert.equal(retraits(fournisseur()).length, 0, 'pendant l’effet, rien à retirer : il paraît vide');
  assert.equal(JSON.stringify(save.maison.stations.station_coffre.contenu), contenuAvant, 'le contenu réel est intact');
  // 5. L'effet n'est pas dans la sauvegarde.
  assert.ok(!JSON.stringify(save).includes(EFFET), 'l’effet n’entre jamais dans la sauvegarde');

  // 3. Un dépôt pendant l'effet va dans le VRAI coffre.
  const depot = fournisseur().find((e) => e.texte.startsWith(i18n.t('menu.coffre_deposer')) && e.texte.includes(i18n.t('item.caillou')));
  assert.ok(depot && !depot.grisee, 'déposer reste possible');
  depot.action();
  assert.equal(save.maison.stations.station_coffre.contenu.item_caillou, 1, 'le caillou est dans le vrai coffre');
  assert.equal(retraits(fournisseur()).length, 0, 'et la liste reste vide tant que l’effet dure');

  // 4. À la durée exacte : la liste revient, le follet le dit. Le temps de
  // l'effet a commencé à la fermeture de la bulle ; on compte depuis là les
  // frames jouées (deux pour ouvrir le Coffre), au pas de 16 ms qui tombe
  // juste sur la durée.
  assert.equal(duree % 16, 0, 'la durée tombe sur un pas de 16 ms');
  const deja = 2 * 16;
  for (let t = deja; t < duree - 16; t += 16) tick();
  assert.equal(retraits(fournisseur()).length, 0, 'un pas avant la fin, toujours vide');
  assert.equal(dialogue.estOuvert(), false);
  tick();
  assert.ok(retraits(fournisseur()).length > 0, 'à la durée exacte, le contenu revient');
  // La réplique de fin s'ouvre à la frame suivante au plus tard.
  tick();
  assert.equal(dialogue.estOuvert(), true, 'le follet dit que tout est là');
  assert.equal(dialogue.etatConversation().dialogueId, effetDef.dialogue_fin);
  finir(dialogue, tick, attendre);

  // Une fois, pas deux.
  for (let i = 0; i < 30; i += 1) tick();
  assert.equal(dialogue.estOuvert(), false, 'le chapitre ne revient pas');
  console.log(`OK « Montre-moi » : ${duree} ms de coffre vide à l’écran, contenu intact, dépôt réel, puis « tout est là »`);
}

// --- 6. Qui spamme : l'option par défaut, aucun effet --------------------
{
  const { save, dialogue, tick, ouvrirCoffre } = partie();
  tick();
  tick();
  for (let garde = 0; dialogue.estOuvert() && garde < 2000; garde += 1) { tick({ attack: b(true) }); tick(); }
  assert.equal(dialogue.estOuvert(), false);
  const fournisseur = ouvrirCoffre();
  assert.ok(retraits(fournisseur()).length > 0, 'le défaut ne vide rien à l’écran');
  assert.ok(save.hero.alignement < 0, 'le spam a coûté');
  console.log('OK qui spamme prend le défaut : aucun effet, le coffre reste plein à l’écran');
}

console.log('OK test_spec11_dialogues_palier_d');

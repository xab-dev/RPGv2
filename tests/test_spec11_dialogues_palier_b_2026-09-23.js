// `specs/11_dialogues-consequences.md`, palier B : le monde et la refonte.
//
// Ce que ce fichier tient (spec §8) :
//   1. la migration de TOUS les dialogues au schéma à nœuds s'est faite à
//      texte identique — clé par clé, locuteur par locuteur, en FR et en EN,
//      contre l'instantané pris AVANT la migration (ci-dessous, figé) ;
//   2. `tick` lève un effet de monde à `duree_ms` exactement ;
//   3. un effet actif n'est PAS dans la sauvegarde ;
//   4. la troisième option de la maison occulte le toit soixante secondes de
//      jeu, puis plus ;
//   5. une réplique répétable (`mesure: false`) ne se farme pas ;
//   6. la bulle n'a qu'un chemin : plus aucun `dialogue.ouvrir` dans le jeu,
//      plus de `resoudreLignes`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import * as moduleDialogue from '../src/dialogue.js';
import { creerDialogue, ouvrirConversation, avancerConversation, resultatConversation } from '../src/dialogue.js';
import { creerEtatEffets, activer, tick, actif } from '../src/effets_monde.js';
import { configAlignement } from '../src/alignement.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const POIDS = configAlignement(registre).poids_defaut;

// Ce que chaque dialogue disait AVANT la migration (23/09, palier B) :
// [locuteur, clé, texte FR, texte EN] par ligne. Figé, jamais régénéré : c'est
// la mémoire de l'ancien catalogue. La ligne de la maison n'y est pas — elle
// avait déjà migré au palier A (et `test_d124` garde son texte).
const AVANT = {
  dlg_grotte_choix_follet: [
    ['narrateur', 'dlg.choix_follet.1', 'Trois feux follets tournent autour de toi... Lequel choisis-tu pour t\'accompagner ?', 'Three will-o\'-the-wisps circle around you... Which one will you choose to walk with you?'],
  ],
  dlg_grotte_follet_enthousiaste: [
    ['follet', 'dlg.follet_enthousiaste.1', 'Toi et moi, meilleurs amis ! Allons-y, l\'aventure nous attend !', 'You and me, best friends! Let\'s go, adventure awaits!'],
  ],
  dlg_grotte_tuto_combat: [
    ['follet', 'dlg.tuto_combat.1', 'Attention, un monstre ! Si tu le bats, je deviens plus fort — et toi aussi.', 'Watch out, a monster! If you defeat it, I grow stronger — and so do you.'],
    ['follet', 'dlg.tuto_combat.2', 'Laisse-moi m\'approcher, je m\'occupe de lui. Frappe quand il est à ta portée !', 'Let me get close, I\'ll handle him. Strike when he\'s in your range!'],
  ],
  dlg_grotte_eclats: [
    ['follet', 'dlg.eclats.1', 'Des éclats ! Ramasse-les, ils te seront utiles plus tard.', 'Shards! Pick them up, they\'ll be useful later.'],
  ],
  dlg_ressource_bloquee_bois: [
    ['follet', 'dlg.ressource_bloquee_bois.1', 'Tu ne peux pas encore le couper. Reviens avec les bons outils.', 'You can\'t chop this yet. Come back with the right tools.'],
  ],
  dlg_ressource_bloquee_pierre: [
    ['follet', 'dlg.ressource_bloquee_pierre.1', 'Tu ne peux pas encore le casser. Reviens avec les bons outils.', 'You can\'t break this yet. Come back with the right tools.'],
  ],
  dlg_station_pas_encore: [
    ['follet', 'dlg.station_pas_encore.1', 'Pas encore utilisable. Reviens plus tard.', 'Not usable yet. Come back later.'],
  ],
  dlg_puits_pas_encore: [
    ['follet', 'dlg.puits_pas_encore.1', 'Le puits n\'est pas encore utilisable. Reviens plus tard.', 'The well isn\'t usable yet. Come back later.'],
  ],
  dlg_premier_ramassage: [
    ['follet', 'dlg.premier_ramassage.1', 'Bien joué ! Ouvre ta Poche depuis le menu pour voir ce que tu portes.', 'Nice! Open your Pouch from the menu to see what you\'re carrying.'],
  ],
  dlg_puits_cooldown: [
    ['follet', 'dlg.puits_cooldown.1', 'Le puits a besoin d\'un instant pour se remplir à nouveau.', 'The well needs a moment to fill back up.'],
  ],
  dlg_ressource_cooldown: [
    ['follet', 'dlg.ressource_cooldown.1', 'Laisse-lui un instant pour se reformer.', 'Give it a moment to grow back.'],
  ],
  dlg_recette_indisponible: [
    ['follet', 'dlg.recette_indisponible.1', 'Il manque quelque chose pour fabriquer ça.', 'Something\'s missing to craft that.'],
  ],
  dlg_construction_refus_interieur: [
    ['follet', 'dlg.construction_refus_interieur.1', 'Ça dépasserait des murs de la maison.', 'That would stick out past the house walls.'],
  ],
  dlg_construction_refus_chevauchement: [
    ['follet', 'dlg.construction_refus_chevauchement.1', 'Une autre installation occupe déjà cet endroit.', 'Something else is already there.'],
  ],
  dlg_construction_refus_couloir: [
    ['follet', 'dlg.construction_refus_couloir.1', 'Le passage entre les deux portes doit rester libre.', 'The path between the two doors has to stay clear.'],
  ],
  dlg_premiere_faim: [
    ['follet', 'dlg.premiere_faim.1', 'J\'ai un petit creux.', 'I\'m getting a bit hungry.'],
  ],
  dlg_ambiance_vent_cendre: [
    ['narrateur', 'dlg.ambiance.vent_cendre', 'Le vent du nord-est sent la cendre, cette nuit.', 'The north-east wind smells of ash tonight.'],
  ],
  dlg_lore_poche_pleine: [
    ['follet', 'dlg.lore.poche_pleine', 'Tes mains ne tiennent plus rien de plus. Le coffre de la maison, lui, ne se plaint jamais.', 'Your hands can’t hold anything more. The chest back at the house never complains.'],
  ],
  dlg_lore_premiere_herbe: [
    ['follet', 'dlg.lore.premiere_herbe', 'De l’herbe sèche. Ça lie, ça rembourre, et ça prend feu en un souffle. Ceux d’avant en gardaient toujours une brassée.', 'Dry grass. It binds, it pads, and it catches fire in one breath. The ones before you always kept an armful.'],
  ],
  dlg_lore_premier_rangement: [
    ['follet', 'dlg.lore.premier_rangement', 'Ce que tu laisses là t’attend. Même si tu mets longtemps à revenir.', 'What you leave in there waits for you. However long you take to come back.'],
  ],
  dlg_lore_niveau_10: [
    ['follet', 'dlg.lore.niveau_10', 'Tu ne tiens plus tes mains comme hier. Il y avait des choses hors de ta portée ; il y en a moins.', 'You don’t hold your hands the way you did yesterday. Some things were out of your reach; fewer are now.'],
  ],
  dlg_lore_coffre_pose: [
    ['follet', 'dlg.lore.coffre_pose', 'Un coffre de plus. À force, cet endroit finira par te ressembler.', 'Another chest. Keep going and this place will end up looking like you.'],
  ],
};

// --- 1. À texte identique ---------------------------------------------------
{
  for (const d of donnees.dialogues) assert.equal(d.lignes, undefined, `${d.id} : plus aucune forme « lignes »`);
  for (const [id, lignes] of Object.entries(AVANT)) {
    const d = registre.obtenir('dialogues', id);
    assert.ok(d, `${id} existe toujours (Q-104 : rien n'est retiré)`);
    // La chaîne des nœuds, depuis l'entrée, suite par suite.
    const chaine = [];
    for (let n = d.entree; n; n = d.noeuds[n].suite) {
      assert.equal((d.noeuds[n].options || []).length, 0, `${id} : une réplique migrée ne gagne aucune option`);
      chaine.push(d.noeuds[n]);
    }
    assert.equal(chaine.length, Object.keys(d.noeuds).length, `${id} : aucun nœud hors de la chaîne`);
    assert.deepEqual(chaine.map((n) => [n.locuteur, n.text_key]), lignes.map((l) => [l[0], l[1]]), `${id} : mêmes clés, même ordre`);
    for (const [locale, rang] of [['fr', 2], ['en', 3]]) {
      for (let i = 0; i < lignes.length; i += 1) {
        assert.equal(dictionnaires[locale][chaine[i].text_key], lignes[i][rang], `${id}[${i}] (${locale}) : texte identique`);
      }
    }
  }
  console.log(`OK ${Object.keys(AVANT).length} dialogues migrés à texte identique, FR et EN, clé par clé`);
}

// --- 2. tick lève l'effet à duree_ms exactement ---------------------------
{
  let e = activer(creerEtatEffets(), 'toit_occulte', 60000);
  assert.equal(actif(e, 'toit_occulte'), true);
  for (let i = 0; i < 59; i += 1) e = tick(e, 1000);
  e = tick(e, 999);
  assert.equal(actif(e, 'toit_occulte'), true, 'à 59 999 ms : encore actif');
  e = tick(e, 1);
  assert.equal(actif(e, 'toit_occulte'), false, 'à 60 000 ms : levé');
  // Réactiver repart de la pleine durée, sans cumuler.
  let r = activer(creerEtatEffets(), 'x', 1000);
  r = tick(r, 600);
  r = activer(r, 'x', 1000);
  assert.equal(actif(tick(r, 999), 'x'), true);
  assert.equal(actif(tick(r, 1000), 'x'), false, 'la même peine deux fois ne double pas');
  assert.equal(actif(creerEtatEffets(), 'inconnu'), false, 'un id inconnu n’est jamais actif');
  // Un effet inconnu du catalogue, cité par une option, tombe au boot.
  const faux = JSON.parse(JSON.stringify(donnees.dialogues));
  const maison = faux.find((d) => d.id === 'dlg_maison_premiere_visite');
  maison.noeuds[maison.entree].options[2].effets_monde = [{ id: 'effet_inexistant', duree_ms: 1000 }];
  assert.ok(validerCatalogues({ ...donnees, dialogues: faux }).some((m) => m.includes('effet_inexistant')));
  console.log('OK tick lève l’effet à duree_ms exactement ; réactiver repart ; un effet inconnu tombe au boot');
}

// --- 3 et 4. La maison, troisième option : le toit, et pas la sauvegarde ----
const b = (v) => ({ pressed: v, held: v });
{
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
  };
  const dialogue = creerDialogue();
  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n: creerI18n(dictionnaires, 'fr'), save, store: creerStoreMemoire(), dialogue,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const neutre = () => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  });
  const tickJeu = (modif = {}) => { frames.push({ ...neutre(), ...modif }); orch.maj(16); };
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  const zone = scene.zones.find((z) => z.type === 'maison').rect;
  hero.x = (zone.x + zone.w / 2) * scene.tileSize;
  hero.y = (zone.y + zone.h / 2) * scene.tileSize;
  tickJeu();
  assert.ok(dialogue.etatConversation());
  const attendre = () => { for (let i = 0; i < 200; i += 1) tickJeu(); };
  attendre();
  tickJeu({ move: { x: 0, y: 1 } }); tickJeu();
  tickJeu({ move: { x: 0, y: 1 } }); tickJeu();
  assert.equal(dialogue.ligneCourante().selection, 2);
  tickJeu({ attack: b(true) });
  // Pendant la réponse du follet, rien n'est encore posé : les conséquences
  // tombent à la fin.
  assert.equal(actif(orch.obtenirEffetsMonde(), 'toit_occulte'), false);
  attendre();
  tickJeu({ attack: b(true) });
  assert.equal(dialogue.estOuvert(), false);
  assert.equal(actif(orch.obtenirEffetsMonde(), 'toit_occulte'), true, 'la troisième option occulte le toit');
  assert.equal(save.hero.alignement, -0.9);
  assert.ok(!JSON.stringify(save).includes('toit_occulte'), 'un effet actif n’est PAS dans la sauvegarde');

  // Soixante secondes de JEU : 3 749 frames de 16 ms = 59 984 ms, encore
  // actif ; la suivante le lève.
  for (let i = 0; i < 3749; i += 1) tickJeu();
  assert.equal(actif(orch.obtenirEffetsMonde(), 'toit_occulte'), true, 'à 59 984 ms de jeu : encore occulté');
  tickJeu();
  assert.equal(actif(orch.obtenirEffetsMonde(), 'toit_occulte'), false, 'passé 60 s : le toit s’efface de nouveau');
  console.log('OK la troisième option occulte le toit 60 s de jeu, et rien n’entre dans la sauvegarde');
}

// --- 5. Une réplique répétable ne se farme pas ------------------------------
{
  const repetable = registre.obtenir('dialogues', 'dlg_ressource_cooldown');
  assert.equal(repetable.mesure, false);
  const lu = avancerConversation(ouvrirConversation(repetable), repetable, true, true);
  assert.deepEqual(resultatConversation(lu, repetable, POIDS).consequences, [], 'la lire ne rapporte rien');
  let spam = ouvrirConversation(repetable);
  for (let i = 0; i < 3; i += 1) spam = avancerConversation(spam, repetable, true, false);
  spam = avancerConversation(spam, repetable, true, true);
  assert.deepEqual(resultatConversation(spam, repetable, POIDS).consequences, [], 'la marteler ne coûte rien');
  // Une réplique ordinaire, elle, mesure.
  const unique = registre.obtenir('dialogues', 'dlg_premiere_faim');
  assert.notEqual(unique.mesure, false);
  const luUnique = avancerConversation(ouvrirConversation(unique), unique, true, true);
  assert.deepEqual(resultatConversation(luUnique, unique, POIDS).consequences.map((c) => c.source), ['lecture']);
  console.log('OK mesure: false — une réplique répétable ne rapporte ni ne coûte ; une réplique unique mesure');
}

// --- 6. Un seul chemin -------------------------------------------------------
{
  assert.equal(moduleDialogue.resoudreLignes, undefined, 'resoudreLignes n’existe plus');
  const main = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');
  assert.ok(!/dialogue\.ouvrir\(/.test(main), 'le jeu n’ouvre plus aucune réplique en dehors du catalogue');
  assert.ok(registre.obtenir('dialogues', 'dlg_recette_indisponible'), 'Q-104 : gardé tel quel');
  console.log('OK un seul chemin : tout passe par ouvrirDialogueCatalogue ; dlg_recette_indisponible gardé');
}

console.log('OK test_spec11_dialogues_palier_b');

// `specs/11_dialogues-consequences.md` palier C : la porte du Nv.15 et le
// premier chapitre de l'arc (« Description », §7.1).
//
// Le palier est en DONNÉES seules (une conversation, une entrée d'ambiance,
// deux flags, des textes) : s'il avait fallu toucher `src/`, la forme du §3
// aurait été fausse. Ce test prouve donc surtout que le moteur livré aux
// paliers A et B porte un chapitre tel quel :
//   1. la porte : au Nv.14 rien, au Nv.15 la conversation s'ouvre, une fois ;
//   2. une CONVERSATION, pas un choix : au moins un tour de plus après le
//      premier, et un nœud atteint par deux chemins ;
//   3. le follet répond à la FORMULATION : les trois façons de demander
//      mènent à trois réponses différentes, et la demande précise est la
//      seule qui pose `flag_chapitre_1_precis` ;
//   4. l'option par défaut (celle de qui spamme) est la demande vague, sans
//      conséquence — spammer rend une réponse vague, c'est la leçon ;
//   5. les poids du chapitre sont « plus lourds qu'avant le 15 » (§7.2 :
//      de 0,5 à 2 en valeur absolue) — une borne de la spec, pas un réglage ;
//   6. sur le vrai orchestrateur : les trois parties, de bout en bout.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import {
  creerDialogue, ouvrirConversation, avancerConversation, selectionnerOption,
  resultatConversation, erreursTextesDialogues, indexOptionDefaut,
} from '../src/dialogue.js';
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

const ID = 'dlg_chapitre_1';
const chapitre = registre.obtenir('dialogues', ID);
assert.ok(chapitre, 'le chapitre 1 est au catalogue');
const ambiance = donnees.ambiances.find((a) => a.dialogue === ID);
assert.ok(ambiance, 'une entrée d’ambiance l’ouvre');
const POIDS = donnees.alignement.find((a) => a.id === 'alignement_config').poids_defaut;

// Joue une suite de rangs d'option, tout armé (une lecture sans spam).
function jouer(rangs) {
  let etat = ouvrirConversation(chapitre);
  const traverses = [etat.noeud];
  const reste = [...rangs];
  while (!etat.termine) {
    if (chapitre.noeuds[etat.noeud].options) etat = selectionnerOption(etat, chapitre, reste.shift());
    etat = avancerConversation(etat, chapitre, true, true);
    if (!etat.termine) traverses.push(etat.noeud);
  }
  assert.equal(reste.length, 0, `tous les choix ${JSON.stringify(rangs)} ont servi`);
  return { traverses, resultat: resultatConversation(etat, chapitre, POIDS) };
}
const optionsEntree = chapitre.noeuds[chapitre.entree].options;
const rangDe = (noeud, pred) => chapitre.noeuds[noeud].options.findIndex(pred);

// --- 1. Données et textes -----------------------------------------------
{
  assert.deepEqual(erreursTextesDialogues(donnees.dialogues, dictionnaires), []);
  assert.equal(optionsEntree.length, 3, 'trois façons de demander');
  assert.ok(chapitre.mesure !== false, 'le chapitre mesure le spam et la lecture');
  assert.equal(ambiance.condition.valeur, 'niveau');
  assert.equal(ambiance.condition.min, 15, 'la porte est le Nv.15');
  console.log('OK le chapitre 1 est en données, textes FR et EN présents');
}

// --- 2. Une conversation : un tour de plus, un nœud rejoint ---------------
{
  const avecOptions = Object.values(chapitre.noeuds).filter((n) => n.options);
  assert.ok(avecOptions.length >= 2, 'au moins deux tours de parole');
  const entrants = {};
  for (const n of Object.values(chapitre.noeuds)) {
    for (const s of [n.suite, ...(n.options || []).map((o) => o.suite)]) {
      if (s) entrants[s] = (entrants[s] || 0) + 1;
    }
  }
  assert.ok(Object.values(entrants).some((k) => k >= 2), 'deux chemins se rejoignent (un graphe, pas un arbre de copies)');
  console.log('OK une conversation multi-tours, deux chemins se rejoignent');
}

// --- 3-4. Le follet répond à la formulation --------------------------------
const rangPrecis = optionsEntree.findIndex((o) => (o.flags || []).includes('flag_chapitre_1_precis'));
const rangVague = indexOptionDefaut(chapitre.noeuds[chapitre.entree]);
const rangAutre = [0, 1, 2].find((r) => r !== rangPrecis && r !== rangVague);
{
  assert.ok(rangPrecis >= 0, 'une demande précise pose flag_chapitre_1_precis');
  assert.notEqual(rangPrecis, rangVague);
  const vague = optionsEntree[rangVague];
  assert.equal(vague.alignement, undefined, 'la demande vague (le défaut) ne pèse rien');
  assert.equal(vague.flags, undefined);
  const suites = optionsEntree.map((o) => o.suite);
  assert.equal(new Set(suites).size, 3, 'trois formulations, trois réponses');
  assert.ok(suites.every((s) => s), 'aucune formulation ne reste sans réponse');
  const texte = (n) => i18n.t(chapitre.noeuds[n].text_key);
  assert.equal(new Set(suites.map(texte)).size, 3);
  console.log('OK trois formulations, trois réponses ; le défaut est la demande vague');
}

// --- 5. Des poids plus lourds qu'avant le 15 ------------------------------
{
  for (const [id, n] of Object.entries(chapitre.noeuds)) {
    for (const o of n.options || []) {
      if (o.alignement === undefined) continue;
      assert.ok(Math.abs(o.alignement) >= 0.5 && Math.abs(o.alignement) <= 2, `${id} : poids ${o.alignement} hors [0,5 ; 2]`);
    }
  }
  console.log('OK les poids du chapitre restent dans [0,5 ; 2] (§7.2)');
}

// Les parties pures : ce que chaque chemin rapporte, dans l'ordre.
{
  const precis = jouer([rangPrecis]);
  assert.ok(precis.resultat.consequences.some((c) => c.type === 'flag' && c.id === 'flag_chapitre_1_precis'));
  const autre = jouer([rangAutre]);
  assert.ok(!autre.resultat.consequences.some((c) => c.type === 'flag'), 'l’autre formulation ne pose aucun flag');
  // La demande vague, puis sa reprise précise : on rejoint la réponse précise.
  const noeudVague = optionsEntree[rangVague].suite;
  assert.ok(chapitre.noeuds[noeudVague].options, 'après la réponse vague, on peut reformuler');
  const rangReprise = rangDe(noeudVague, (o) => (o.flags || []).includes('flag_chapitre_1_precis'));
  assert.ok(rangReprise >= 0, 'la reformulation précise pose le même flag');
  const reprise = jouer([rangVague, rangReprise]);
  assert.equal(reprise.traverses.at(-1), precis.traverses.at(-1), 'reformuler rejoint la réponse précise');
  // Laisser la réponse vague telle quelle : aucune option ne pèse, seule la lecture compte.
  const resigne = jouer([rangVague, indexOptionDefaut(chapitre.noeuds[noeudVague])]);
  assert.deepEqual(resigne.resultat.consequences, [{ type: 'alignement', delta: POIDS.lecture_complete, source: 'lecture' }]);
  console.log('OK vague → reformuler rejoint la réponse précise ; accepter le vague ne rapporte que la lecture');
}

// --- 6. Sur le vrai jeu -----------------------------------------------------
function b(v) { return { pressed: v, held: v }; }
function partie(niveau) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.niveau = niveau;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    flag_maison_decouverte: true,
  };
  // Toutes les AUTRES lignes d'ambiance déjà dites : elles passeraient avant
  // (ordre du catalogue), et ce test ne parle que du chapitre.
  for (const a of donnees.ambiances) if (a.dialogue !== ID) save.flags[a.flag] = true;
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
  const neutre = () => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  });
  const tick = (modif = {}, ms = 16) => { frames.push({ ...neutre(), ...modif }); orch.maj(ms); };
  const attendre = () => { for (let i = 0; i < 400; i += 1) tick(); };
  return { save, dialogue, tick, attendre };
}
{
  const { dialogue, tick } = partie(14);
  for (let i = 0; i < 30; i += 1) tick();
  assert.equal(dialogue.estOuvert(), false, 'au Nv.14, rien');
  console.log('OK Nv.14 : rien');
}
// Choisit le rang voulu au stick (depuis la sélection courante), confirme.
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
{
  const { save, dialogue, tick, attendre } = partie(15);
  tick();
  assert.equal(dialogue.estOuvert(), true, 'au Nv.15, dans la Maison dehors : la conversation s’ouvre');
  assert.equal(dialogue.etatConversation().dialogueId, ID);
  choisir(dialogue, tick, attendre, rangPrecis);
  finir(dialogue, tick, attendre);
  assert.equal(save.flags.flag_chapitre_1_precis, true);
  assert.equal(save.flags[ambiance.flag], true, 'le chapitre est vu');
  const precisAttendu = optionsEntree[rangPrecis].alignement + POIDS.lecture_complete;
  assert.equal(save.hero.alignement, Math.round(precisAttendu * 1e6) / 1e6);
  // Une fois, pas deux.
  for (let i = 0; i < 30; i += 1) tick();
  assert.equal(dialogue.estOuvert(), false, 'le chapitre ne revient pas');
  console.log('OK Nv.15 : la demande précise, de bout en bout, une seule fois');
}
{
  const { save, dialogue, tick, attendre } = partie(15);
  tick();
  choisir(dialogue, tick, attendre, rangAutre);
  finir(dialogue, tick, attendre);
  assert.equal(save.flags.flag_chapitre_1_precis, undefined);
  const attendu = (optionsEntree[rangAutre].alignement || 0) + POIDS.lecture_complete;
  assert.equal(save.hero.alignement, Math.round(attendu * 1e6) / 1e6);
  console.log('OK Nv.15 : la troisième formulation, de bout en bout');
}
{
  // Spammer : le défaut est la demande vague ; la réponse est vague, et le
  // spam coûte. Le joueur pressé repart sans rien savoir de plus.
  const { save, dialogue, tick } = partie(15);
  tick();
  tick();
  for (let garde = 0; dialogue.estOuvert() && garde < 2000; garde += 1) { tick({ attack: b(true) }); tick(); }
  assert.equal(dialogue.estOuvert(), false);
  assert.equal(save.flags.flag_chapitre_1_precis, undefined, 'qui spamme ne reçoit pas la réponse précise');
  assert.ok(save.hero.alignement < 0, 'et le spam a coûté');
  console.log('OK Nv.15 : qui spamme repart avec la réponse vague');
}

console.log('OK test_spec11_dialogues_palier_c');

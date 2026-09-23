// `specs/11_dialogues-consequences.md`, palier A : le choix.
//
// Ce que ce fichier tient (spec §8, « test rouge d'abord ») :
//   1. le schéma refuse ce qui casserait la bulle ou la mesure — une option
//      `defaut` qui porte une conséquence, cinq options, un graphe qui boucle ;
//   2. un appui non armé est COMPTÉ et n'avance rien ; le spam est plafonné ;
//      une lecture intacte rapporte +0,1 ;
//   3. le résultat d'un dialogue est ORDONNÉ et déterministe ;
//   4. parité verbe / tap : choisir au doigt et au stick rend le même résultat ;
//   5. sur le vrai orchestrateur, le dialogue de la maison applique ses poids
//      par `modifierAlignement`, et seulement à sa fin naturelle ;
//   6. la dérive des flottants ne fait pas manquer un palier (dix lectures = 1).
//
// Le rendu de la bulle n'est jamais exercé ici (contrainte de méthode) : la
// GÉOMÉTRIE, elle, est pure, et c'est elle que le doigt lit.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import {
  creerDialogue, ouvrirConversation, avancerConversation, deplacerSelection, selectionnerOption,
  resultatConversation, erreursTextesDialogues, DELAI_ARMEMENT_DIALOGUE_MS, MACHINE_ECRIRE_MS_PAR_CARACTERE,
} from '../src/dialogue.js';
import { appliquerDelta, regime, configAlignement } from '../src/alignement.js';
import { geometrieBoiteDialogue, toucherBoiteDialogue, BOUTON_ATTAQUE } from '../src/ui/hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';
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
const i18n = creerI18n(dictionnaires, 'fr');
const POIDS = configAlignement(registre).poids_defaut;

// Un dialogue d'essai, indépendant du contenu réel : le moteur ne doit pas
// dépendre de ce que Xav écrira.
const ESSAI = {
  id: 'dlg_essai',
  declencheur: 'essai',
  entree: 'n1',
  noeuds: {
    n1: {
      locuteur: 'follet',
      text_key: 'dlg.maison.premiere_visite',
      options: [
        { text_key: 'dlg.maison.o_y_aller', defaut: true, suite: null },
        { text_key: 'dlg.maison.o_quelquun', alignement: 1, flags: ['flag_premier_ramassage'], suite: 'n2' },
        { text_key: 'dlg.maison.o_a_nous', alignement: -1, suite: null },
      ],
    },
    n2: { locuteur: 'follet', text_key: 'dlg.maison.invites' },
  },
};

// Valide le catalogue réel dont on a remplacé les dialogues par `liste`.
function erreursAvec(liste) {
  return validerCatalogues({ ...donnees, dialogues: [...donnees.dialogues, ...liste] });
}
function copie(o) {
  return JSON.parse(JSON.stringify(o));
}

// --- 1. Le schéma ---------------------------------------------------------
{
  assert.deepEqual(erreursAvec([ESSAI]), [], 'le dialogue d’essai est valide');

  const defautCharge = copie(ESSAI);
  defautCharge.noeuds.n1.options[0].alignement = 0.5;
  assert.ok(erreursAvec([defautCharge]).some((e) => e.includes('defaut ne porte aucune conséquence')),
    'une option defaut avec conséquence est refusée');

  const cinq = copie(ESSAI);
  cinq.noeuds.n1.options.push({ text_key: 'k', suite: null }, { text_key: 'k', suite: null });
  assert.ok(erreursAvec([cinq]).some((e) => e.includes('5 options')), 'cinq options : refusé');

  const une = copie(ESSAI);
  une.noeuds.n1.options = [{ text_key: 'k', defaut: true, suite: null }];
  assert.ok(erreursAvec([une]).some((e) => e.includes('1 options')), 'une option seule n’est pas un choix');

  const cycle = copie(ESSAI);
  cycle.noeuds.n2.suite = 'n1';
  assert.ok(erreursAvec([cycle]).some((e) => e.includes('boucle')), 'un graphe cyclique est refusé');

  const orphelin = copie(ESSAI);
  orphelin.noeuds.n3 = { locuteur: 'follet', text_key: 'k' };
  assert.ok(erreursAvec([orphelin]).some((e) => e.includes('inatteignable')), 'un nœud orphelin est refusé');

  const deuxDefauts = copie(ESSAI);
  deuxDefauts.noeuds.n1.options[2] = { text_key: 'k', defaut: true, suite: null };
  assert.ok(erreursAvec([deuxDefauts]).some((e) => e.includes('2 option(s) defaut')), 'exactement une option defaut');

  const suiteCassee = copie(ESSAI);
  suiteCassee.noeuds.n1.options[1].suite = 'n9';
  assert.ok(erreursAvec([suiteCassee]).some((e) => e.includes('"n9"')), 'une suite vers un nœud absent est refusée');

  const trop = copie(ESSAI);
  trop.noeuds.n1.options[1].alignement = 6;
  assert.ok(erreursAvec([trop]).some((e) => e.includes('hors des bornes')), 'un poids hors [−5 ; +5] est refusé');

  const flagInconnu = copie(ESSAI);
  flagInconnu.noeuds.n1.options[1].flags = ['flag_qui_n_existe_pas'];
  assert.ok(erreursAvec([flagInconnu]).some((e) => e.includes('flag_qui_n_existe_pas')), 'un flag non déclaré est refusé');

  const aVenir = copie(ESSAI);
  aVenir.noeuds.n1.options[2].effets_monde = [{ id: 'toit_occulte', duree_ms: 60000 }];
  assert.ok(erreursAvec([aVenir]).some((e) => e.includes('pas encore pris en charge')),
    'effets_monde est refusé au palier A plutôt qu’ignoré en silence');

  const deuxFormes = copie(ESSAI);
  deuxFormes.lignes = [{ locuteur: 'follet', text_key: 'k' }];
  assert.ok(erreursAvec([deuxFormes]).some((e) => e.includes('lignes et noeuds')), 'une seule forme par dialogue');

  // Toute clé des vrais dialogues existe en FR et en EN — le contrôle de boot.
  assert.deepEqual(erreursTextesDialogues(donnees.dialogues, dictionnaires), []);
  assert.ok(erreursTextesDialogues([{ ...ESSAI, noeuds: { n1: { ...ESSAI.noeuds.n1, text_key: 'cle.absente' }, n2: ESSAI.noeuds.n2 } }], dictionnaires)
    .some((e) => e.includes('cle.absente')), 'une clé absente tombe au boot');
  console.log('OK le schéma refuse defaut chargé, 5 options, cycle, orphelin, bornes, flag inconnu ; clés FR/EN');
}

// --- 2. Spam, plafond, lecture -------------------------------------------
{
  let etat = ouvrirConversation(ESSAI);
  assert.equal(etat.selection, 0, 'l’option defaut est présélectionnée');
  const avant = etat;
  etat = avancerConversation(etat, ESSAI, true, false);
  assert.equal(etat.spamCompte, 1, 'un appui non armé est compté');
  assert.equal(etat.noeud, 'n1', 'et n’avance rien');
  assert.equal(etat.lectureIntacte, false);
  assert.equal(avant.spamCompte, 0, 'pur : l’état d’avant n’est pas touché');
  assert.equal(avancerConversation(etat, ESSAI, false, true), etat, 'sans appui, rien ne bouge');

  // Cinq spams puis l'option par défaut : −1,25 plafonné à −1, aucune lecture.
  for (let i = 0; i < 4; i += 1) etat = avancerConversation(etat, ESSAI, true, false);
  etat = avancerConversation(etat, ESSAI, true, true);
  assert.equal(etat.termine, true);
  assert.deepEqual(resultatConversation(etat, ESSAI, POIDS).consequences,
    [{ type: 'alignement', delta: POIDS.spam_plafond_par_dialogue, source: 'spam' }],
    'le spam est plafonné, et l’option defaut ne rapporte rien');

  // Deux spams : −0,5, pas de plafond.
  let deux = ouvrirConversation(ESSAI);
  deux = avancerConversation(avancerConversation(deux, ESSAI, true, false), ESSAI, true, false);
  deux = avancerConversation(deux, ESSAI, true, true);
  assert.deepEqual(resultatConversation(deux, ESSAI, POIDS).consequences,
    [{ type: 'alignement', delta: 2 * POIDS.spam_par_occurrence, source: 'spam' }]);

  // Lecture intacte : +0,1, même sur l'option defaut.
  const lu = avancerConversation(ouvrirConversation(ESSAI), ESSAI, true, true);
  assert.deepEqual(resultatConversation(lu, ESSAI, POIDS).consequences,
    [{ type: 'alignement', delta: POIDS.lecture_complete, source: 'lecture' }]);
  console.log('OK non armé = compté sans avancer ; spam plafonné à −1 ; lecture intacte = +0,1');
}

// --- 3. Ordonné et déterministe ------------------------------------------
{
  const jouer = () => {
    let e = ouvrirConversation(ESSAI);
    e = avancerConversation(e, ESSAI, true, false); // un spam
    e = deplacerSelection(e, ESSAI, +1);
    e = avancerConversation(e, ESSAI, true, true); // option 2 → n2
    assert.equal(e.noeud, 'n2');
    assert.equal(e.selection, null, 'une réplique n’a pas de sélection');
    e = avancerConversation(e, ESSAI, true, true); // fin de n2
    return resultatConversation(e, ESSAI, POIDS);
  };
  const r = jouer();
  assert.deepEqual(r.consequences, [
    { type: 'alignement', delta: 1, source: 'option' },
    { type: 'flag', id: 'flag_premier_ramassage' },
    { type: 'alignement', delta: POIDS.spam_par_occurrence, source: 'spam' },
  ], 'options d’abord, puis le spam, puis la lecture (absente ici)');
  assert.equal(r.dialogueId, 'dlg_essai');
  assert.equal(r.vu, true);
  assert.deepEqual(jouer(), r, 'les mêmes gestes rendent le même résultat');

  // La sélection est bornée, sans boucle.
  let e = ouvrirConversation(ESSAI);
  e = deplacerSelection(e, ESSAI, -1);
  assert.equal(e.selection, 0);
  e = deplacerSelection(deplacerSelection(deplacerSelection(e, ESSAI, 1), ESSAI, 1), ESSAI, 1);
  assert.equal(e.selection, 2);
  assert.equal(selectionnerOption(e, ESSAI, 9), e, 'un rang hors des options ne change rien');
  assert.equal(selectionnerOption(e, ESSAI, 0).selection, 0);
  console.log('OK le résultat est ordonné (options, spam, lecture) et déterministe ; sélection bornée');
}

// --- 4. La bulle : compté pas exaucé, options après l'armement, parité ---
const b = (v) => ({ pressed: v, held: v });
const verbes = ({ attack = false, y = 0 } = {}) => ({
  move: { x: 0, y }, attack: b(attack), interact: b(false),
});
function resoudre(noeudId) {
  const n = ESSAI.noeuds[noeudId];
  return { locuteur: 'Follet', texte: i18n.t(n.text_key), options: (n.options || []).map((o) => i18n.t(o.text_key)) };
}
function armer(dialogue) {
  const texte = resoudre(dialogue.etatConversation().noeud).texte;
  dialogue.maj(texte.length * MACHINE_ECRIRE_MS_PAR_CARACTERE + 1);
  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS + 1);
}
{
  const dialogue = creerDialogue();
  let resultat = null;
  dialogue.demarrerConversation(ESSAI, { resoudre, poids: POIDS, onResultat: (r) => { resultat = r; } });
  dialogue.maj(10);
  const complet = resoudre('n1').texte;
  assert.ok(dialogue.ligneCourante().texte.length < complet.length);
  dialogue.traiterInput(verbes({ attack: true }));
  // `Q-107` (Xav, 23/09) : les deux à la fois — la ligne se complète comme
  // avant, et l'appui est compté.
  assert.equal(dialogue.ligneCourante().texte, complet, 'un appui pendant l’écriture complète la ligne');
  assert.equal(dialogue.etatConversation().spamCompte, 1, 'et il est compté');
  assert.equal(dialogue.ligneCourante().arme, false, 'complétée à l’instant : pas encore armée');
  assert.equal(dialogue.ligneCourante().options, null, 'donc pas encore d’options');
  dialogue.traiterInput(verbes({ attack: true }));
  assert.equal(dialogue.etatConversation().spamCompte, 2, 'un second appui avant l’armement est compté aussi');
  assert.equal(dialogue.etatConversation().noeud, 'n1', 'et ne saute rien');

  armer(dialogue);
  assert.deepEqual(dialogue.ligneCourante().options, resoudre('n1').options, 'armée : les options apparaissent');
  assert.equal(dialogue.ligneCourante().selection, 0);
  // Le stick maintenu ne défile pas : un cran par poussée.
  dialogue.traiterInput(verbes({ y: 1 }));
  dialogue.traiterInput(verbes({ y: 1 }));
  assert.equal(dialogue.ligneCourante().selection, 1, 'une poussée, un cran');
  dialogue.traiterInput(verbes({ y: 0 }));
  dialogue.traiterInput(verbes({ attack: true }));
  assert.equal(dialogue.etatConversation().noeud, 'n2', 'confirmer suit la suite de l’option');
  assert.equal(resultat, null, 'aucune conséquence avant la fin');
  armer(dialogue);
  dialogue.traiterInput(verbes({ attack: true }));
  assert.equal(dialogue.estOuvert(), false);
  assert.deepEqual(resultat.consequences.map((c) => c.source || c.type), ['option', 'flag', 'spam']);

  // Fermée de l'extérieur (réinitialisation) : aucune conséquence.
  let coupe = null;
  dialogue.demarrerConversation(ESSAI, { resoudre, poids: POIDS, onResultat: (r) => { coupe = r; } });
  armer(dialogue);
  dialogue.fermer();
  assert.equal(coupe, null, 'un dialogue coupé en plein milieu n’a rien jugé');
  console.log('OK la bulle compte sans exaucer, montre les options armées, un cran par poussée, rien si coupée');
}
{
  // Parité : « deuxième option » au stick + A, et au doigt (tap, tap).
  const auStick = creerDialogue();
  let rStick = null;
  auStick.demarrerConversation(ESSAI, { resoudre, poids: POIDS, onResultat: (r) => { rStick = r; } });
  armer(auStick);
  auStick.traiterInput(verbes({ y: 1 }));
  auStick.traiterInput(verbes());
  auStick.traiterInput(verbes({ attack: true }));
  armer(auStick);
  auStick.traiterInput(verbes({ attack: true }));

  const auDoigt = creerDialogue();
  let rDoigt = null;
  auDoigt.demarrerConversation(ESSAI, { resoudre, poids: POIDS, onResultat: (r) => { rDoigt = r; } });
  armer(auDoigt);
  const geo = geometrieBoiteDialogue(auDoigt.ligneCourante().options.length, RESOLUTION_LOGIQUE);
  const surOption2 = { x: geo.options[1].x + 20, y: geo.options[1].y + 5 };
  // Le doigt posé à gauche prend aussi le joystick : MOVE poussé la même
  // frame ne doit pas déplacer la sélection qu'il vient de désigner.
  auDoigt.traiterInput(verbes({ y: 1 }), toucherBoiteDialogue(geo, [surOption2]));
  assert.equal(auDoigt.ligneCourante().selection, 1, 'un tap sélectionne, le stick de la même frame est ignoré');
  auDoigt.traiterInput(verbes({ y: 0 }), toucherBoiteDialogue(geo, [surOption2]));
  assert.equal(auDoigt.etatConversation().noeud, 'n2', 'un second tap sur la même option confirme');
  armer(auDoigt);
  const geoTexte = geometrieBoiteDialogue(0, RESOLUTION_LOGIQUE);
  auDoigt.traiterInput(verbes(), toucherBoiteDialogue(geoTexte, [{ x: geoTexte.boite.x + 50, y: geoTexte.boite.y + 30 }]));
  assert.deepEqual(rDoigt, rStick, 'au doigt comme au stick, le même résultat');

  // Les rangées d'options ne croisent pas le bouton d'attaque : un doigt
  // qui sélectionne ne confirme pas par le bouton.
  for (const r of geometrieBoiteDialogue(4, RESOLUTION_LOGIQUE).options) {
    assert.ok(r.x + r.largeur <= BOUTON_ATTAQUE.cx - BOUTON_ATTAQUE.rayon, 'une rangée s’arrête avant le bouton d’attaque');
    assert.ok(r.y + r.hauteur <= RESOLUTION_LOGIQUE.hauteur, 'et tient dans l’écran');
  }
  assert.equal(toucherBoiteDialogue(geoTexte, [{ x: 5, y: 5 }]), null, 'hors de la bulle, rien');
  console.log('OK parité verbe / tap : stick + A et tap + tap rendent le même résultat');
}

// --- 5. Sur le vrai jeu : le dialogue de la maison ------------------------
function partieALaMaison({ contacts = () => [] } = {}) {
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
    registre, i18n, save, store: creerStoreMemoire(), dialogue,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
    lireContactsTactiles: contacts,
  });
  const neutre = () => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  });
  const tick = (modif = {}, ms = 16) => { frames.push({ ...neutre(), ...modif }); orch.maj(ms); };
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();
  const maison = scene.zones.find((z) => z.type === 'maison').rect;
  hero.x = (maison.x + maison.w / 2) * scene.tileSize;
  hero.y = (maison.y + maison.h / 2) * scene.tileSize;
  tick();
  assert.equal(dialogue.estOuvert(), true, 'entrer dans la Maison ouvre le choix');
  assert.ok(dialogue.etatConversation(), 'et c’est une conversation, pas une réplique');
  // Laisser la ligne s'écrire et s'armer, par petites frames (le delta de
  // jeu est plafonné) : ~3 s de jeu suffisent largement.
  const attendre = () => { for (let i = 0; i < 200; i += 1) tick(); };
  return { save, dialogue, orch, tick, attendre };
}
{
  // Lire, choisir « Quelqu'un vit peut-être ici » : +1, puis +0,1 de lecture.
  const { save, dialogue, orch, tick, attendre } = partieALaMaison();
  assert.equal(save.hero.alignement, 0);
  attendre();
  assert.equal(dialogue.ligneCourante().options.length, 3);
  tick({ move: { x: 0, y: 1 } });
  tick();
  tick({ attack: b(true) });
  assert.equal(save.hero.alignement, 0, 'rien n’est appliqué avant la fin');
  attendre();
  tick({ attack: b(true) });
  assert.equal(dialogue.estOuvert(), false);
  assert.equal(save.hero.alignement, 1.1, 'option +1, lecture +0,1');
  assert.equal(orch.etatAlignement().regime, 'positif');
  console.log('OK la maison : lire et choisir la deuxième option = +1,1');
}
{
  // Spammer A pendant l'écriture puis laisser l'option par défaut : −1 net.
  const { save, dialogue, tick, attendre } = partieALaMaison();
  // La frame qui suit l'ouverture est neutre par construction (défense de la
  // Phase 1b : le geste qui a ouvert ne ferme pas) — elle ne compte donc rien.
  tick();
  for (let i = 0; i < 6; i += 1) { tick({ attack: b(true) }); tick(); }
  assert.equal(dialogue.etatConversation().spamCompte, 6);
  attendre();
  tick({ attack: b(true) });
  assert.equal(dialogue.estOuvert(), false);
  assert.equal(save.hero.alignement, -1, 'six spams plafonnés à −1, l’option defaut ne pèse rien');
  console.log('OK la maison : spammer puis prendre le défaut = −1 (plafond)');
}
{
  // Au doigt, sur le vrai orchestrateur : tap, tap sur la troisième option.
  let aTaper = [];
  const { save, dialogue, tick, attendre } = partieALaMaison({ contacts: () => { const c = aTaper; aTaper = []; return c; } });
  attendre();
  const geo = geometrieBoiteDialogue(3, RESOLUTION_LOGIQUE);
  const surOption3 = { x: geo.options[2].x + 30, y: geo.options[2].y + 9 };
  aTaper = [surOption3];
  tick();
  assert.equal(dialogue.ligneCourante().selection, 2);
  aTaper = [surOption3];
  tick();
  assert.equal(dialogue.etatConversation().noeud, 'si_tu_le_dis');
  attendre();
  const geoTexte = geometrieBoiteDialogue(0, RESOLUTION_LOGIQUE);
  aTaper = [{ x: geoTexte.boite.x + 40, y: geoTexte.boite.y + 30 }];
  tick();
  assert.equal(dialogue.estOuvert(), false, 'un tap sur le texte ferme la réplique finale');
  assert.equal(save.hero.alignement, -0.9, 'option −1, lecture +0,1');
  console.log('OK la maison au doigt : tap, tap sur la troisième option, tap sur le texte = −0,9');
}

// --- 6. La dérive des flottants ne fait pas manquer un palier -------------
{
  const config = configAlignement(registre);
  let v = 0;
  for (let i = 0; i < 10; i += 1) v = appliquerDelta(v, POIDS.lecture_complete, config.bornes).valeur;
  assert.equal(v, 1, 'dix lectures complètes font exactement 1');
  assert.equal(regime(v, config).palier, 1, 'et ouvrent le palier 1');
  console.log('OK dix lectures = 1, palier 1 (plus de 0,9999999999999999)');
}

console.log('OK test_spec11_dialogues_palier_a');

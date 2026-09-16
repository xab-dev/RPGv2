// Contrat (03_grotte-polish §3.5, palier 4) : intro cinématique de la Grotte,
// machine à états PURE (src/intro.js) — étapes dans l'ordre, budget étapes
// 1+2 <= 8s sur les VRAIES données de scenes.json (jamais un fixture inventé
// pour ce chiffre précis, cf. §3.5/§7), inputs jamais lus avant l'étape 3
// (vérifié en bout en bout sur le vrai orchestrateur), reset -> étape 1.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import {
  creerIntro, avancerIntro, etatRendu, dureeClignements, dureeEtapesTempsFixe,
  ETAPE_CLIGNEMENTS, ETAPE_CONVERGENCE, creerDepart, avancerDepart, etatRenduDepart,
} from '../src/intro.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const CONFIG_TEST = {
  clignements: { ouvertures_ms: [100, 200, 300], noir_ms: 50 },
  convergence_ms: 500,
  depart_ms: 200,
  levitation: { amplitude_px: 3, periode_ms: 900 },
};
const CIBLES_TEST = [{ x: 150, y: 113 }, { x: 240, y: 113 }, { x: 330, y: 113 }];

// ===== 1. Étapes dans l'ordre, pures, sur un fixture de test =====
{
  let intro = creerIntro(CONFIG_TEST);
  assert.equal(etatRendu(intro, CIBLES_TEST).etape, ETAPE_CLIGNEMENTS);

  const dureeCli = dureeClignements(CONFIG_TEST.clignements);
  // Avance jusqu'à 1ms avant la fin des clignements : toujours cette étape.
  intro = avancerIntro(intro, dureeCli - 1);
  assert.equal(etatRendu(intro, CIBLES_TEST).etape, ETAPE_CLIGNEMENTS, 'encore les clignements juste avant la frontière');
  assert.equal(intro.terminee, false);

  intro = avancerIntro(intro, 2); // franchit la frontière clignements -> convergence
  assert.equal(etatRendu(intro, CIBLES_TEST).etape, ETAPE_CONVERGENCE);
  assert.equal(intro.terminee, false, 'la convergence ne doit pas terminer l\'intro avant sa propre durée');

  intro = avancerIntro(intro, CONFIG_TEST.convergence_ms + 100); // dépasse largement la fin
  assert.equal(intro.terminee, true, 'l\'intro doit se terminer une fois convergence_ms écoulé');

  // Une fois terminée, avancerIntro() est un no-op (état figé, jamais négatif
  // ni au-delà de la durée totale) — cohérent avec dialogue.js#avancer.
  const introFigee = avancerIntro(intro, 1000);
  assert.deepEqual(introFigee, intro, 'aucun effet une fois terminée');
}

// ===== 2. Budget §3.5 : étapes 1+2 <= 8s SUR LES VRAIES DONNÉES =====
{
  const noms = Object.keys(SCHEMAS);
  const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms);
  assert.equal(erreurs.length, 0, `catalogues invalides : ${erreurs.join(' ; ')}`);
  assert.equal(validerCatalogues(donnees).length, 0);

  const sceneGrotte1 = donnees.scenes.find((s) => s.id === 'scene_grotte_salle_1');
  assert.ok(sceneGrotte1.intro, 'scene_grotte_salle_1 doit déclarer une configuration intro');

  const duree = dureeEtapesTempsFixe(sceneGrotte1.intro);
  assert.ok(duree <= 8000, `étapes 1+2 doivent tenir sous 8000ms sur les données réelles (mesuré : ${duree}ms)`);
  assert.ok(duree <= 10000, 'plafond dur absolu de 10s (§3.5)');
}

// ===== 3. Positions des follets pendant la convergence : partent hors écran,
// finissent exactement sur les 3 cibles fournies (écran de choix). =====
{
  let intro = creerIntro(CONFIG_TEST);
  const dureeCli = dureeClignements(CONFIG_TEST.clignements);
  intro = avancerIntro(intro, dureeCli); // pile à la frontière -> convergence, tConv = 0
  const debut = etatRendu(intro, CIBLES_TEST);
  assert.equal(debut.follets.length, 3);
  debut.follets.forEach((f, i) => {
    const distance = Math.hypot(f.x - CIBLES_TEST[i].x, f.y - CIBLES_TEST[i].y);
    assert.ok(distance > 50, 'au tout début de la convergence, encore loin de la cible');
  });

  intro = avancerIntro(intro, CONFIG_TEST.convergence_ms);
  const fin = etatRendu(intro, CIBLES_TEST);
  fin.follets.forEach((f, i) => {
    assert.ok(Math.abs(f.x - CIBLES_TEST[i].x) < 0.01, `follet ${i} doit atteindre exactement sa cible en fin de convergence`);
    assert.equal(f.alpha, 1, 'pleinement apparu en fin de convergence');
  });
}

// ===== 4. Départ (étape 4) : les 2 non élus reviennent vers leur position de
// départ en s'éteignant, l'élu n'apparaît jamais dans le résultat. =====
{
  let depart = creerDepart(CONFIG_TEST, 1); // index 1 (eau) élu
  const debut = etatRenduDepart(depart, CIBLES_TEST);
  assert.equal(debut.length, 2, 'seuls les 2 non élus sont renvoyés');
  assert.ok(debut.every((d) => d.index !== 1), 'l\'élu (index 1) ne doit jamais apparaître dans le départ');
  debut.forEach((d) => assert.equal(d.alpha, 1, 'pleinement visibles au tout début du départ'));

  depart = avancerDepart(depart, CONFIG_TEST.depart_ms);
  assert.equal(depart.terminee, true);
  const fin = etatRenduDepart(depart, CIBLES_TEST);
  fin.forEach((d) => assert.equal(d.alpha, 0, 'entièrement éteints en fin de départ'));
}

// ===== 5. Bout en bout sur le vrai orchestrateur : inputs ignorés avant
// l'étape 3 (non skippable), reset -> étape 1. =====
{
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.equal(erreurs.length, 0);
  assert.equal(validerCatalogues(donnees).length, 0);

  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');
  const save = saveNeuve();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const menu = { estOuvert: () => false, traiterInput() {} };

  function etat({ attack = false } = {}) {
    return {
      move: { x: 0, y: 0 },
      attack: { pressed: attack, held: attack },
      skill_1: { pressed: false, held: false },
      skill_2: { pressed: false, held: false },
      skill_3: { pressed: false, held: false },
      consume: { pressed: false, held: false },
      interact: { pressed: false, held: false },
      menu: { pressed: false, held: false },
    };
  }
  // Source d'input scriptée simplifiée : ce test ne pousse QUE des appuis
  // ATTACK continus (jamais de mouvement, jamais besoin du patron front-
  // montant/file des autres tests) — on lit directement la dernière frame.
  let derniereFrame = etat();
  const inputSimple = { maj: () => derniereFrame };

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input: inputSimple,
    ctxLogique: null, ctxVisible: null, canvasLogique: null, sourceTactile: { estActif: () => false },
  });

  // Dès la construction (entrerDansScene -> declencherEvenementsEntree),
  // l'intro doit être active et la narration PAS encore ouverte.
  assert.notEqual(orchestrateur.obtenirIntro(), null, 'l\'intro doit démarrer dès l\'entrée en salle 1');
  assert.equal(orchestrateur.dialogueOuvert(), false);

  // Spam ATTACK pendant toute la durée de l'intro : non skippable, aucun
  // effet, la narration ne doit s'ouvrir qu'à l'heure prévue par le minuteur,
  // jamais avant à cause d'un appui.
  derniereFrame = etat({ attack: true });
  let dialogueOuvert = false;
  for (let i = 0; i < 500 && !dialogueOuvert; i++) {
    orchestrateur.maj(16);
    if (orchestrateur.dialogueOuvert()) dialogueOuvert = true;
  }
  assert.ok(dialogueOuvert, 'la narration doit finir par s\'ouvrir une fois l\'intro terminée');
  assert.equal(orchestrateur.obtenirIntro(), null, 'l\'intro doit être terminée');
  // La narration vient tout juste de s'ouvrir : le spam en cours ne doit pas
  // l'avoir aussi refermée à la même frame (mécanisme 1, §3.2, réutilisé).
  assert.equal(orchestrateur.dialogueOuvert(), true, 'le spam ATTACK ne doit pas fermer la narration à la frame où elle s\'ouvre');

  // --- reset -> étape 1 (§4 edge case) ---
  derniereFrame = etat();
  await orchestrateur.reinitialiserPartie();
  assert.notEqual(orchestrateur.obtenirIntro(), null, 'reinitialiserPartie() doit relancer l\'intro à l\'étape 1');
  assert.equal(orchestrateur.obtenirIntro().tMs, 0, 'l\'intro rejouée doit repartir de tMs=0, jamais un état réutilisé');
  assert.equal(orchestrateur.dialogueOuvert(), false, 'la narration ne doit pas réapparaître avant la fin de l\'intro rejouée');
}

console.log('OK test_phase1b_intro');

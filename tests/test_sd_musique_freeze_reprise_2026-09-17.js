// Diagnostic (SD_musique-freeze-reprise_2026-09-17) : le jeu gelait quand
// "Musique" repassait de non à oui. Cause racine (a) : `definirMusiqueActive`
// appelait une fonction de reprise qui supposait l'AudioContext/gain déjà
// créés par `demarrerSynthese` — or le repli fichier→synthèse peut faire
// passer `modeActuel` à 'synthese' sans jamais les avoir créés, si le
// réglage était "non" au moment (asynchrone) où l'échec de chargement du
// fichier arrivait. Ces deux scénarios sont testables headless avec un
// `AudioContext`/`Audio` factices minimaux (aucun accès réseau/rendu réel) :
// c'est la seule partie de audio.js testable ainsi (cf. son en-tête).
import assert from 'node:assert/strict';
import { armerAudio, definirMusiqueActive, reinitialiserPourTests } from '../src/audio.js';

class FauxGain {
  constructor() {
    this.gain = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} };
  }
  connect() {
    return this;
  }
}
class FauxOscillateur {
  constructor() {
    this.frequency = { value: 0 };
  }
  connect() {
    return this;
  }
  start() {}
  stop() {}
}
class FauxAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() {
    return new FauxGain();
  }
  createOscillator() {
    return new FauxOscillateur();
  }
}
// Simule un <audio> : ni chargement réseau ni lecture réelle, seulement de
// quoi déclencher `error` à la demande, sur commande du test — jamais un
// vrai minuteur/timing, pour rester déterministe.
class FauxAudioElement {
  constructor(src) {
    this.src = src;
    this._ecouteurs = {};
    FauxAudioElement.derniere = this;
  }
  addEventListener(type, gestionnaire) {
    this._ecouteurs[type] = gestionnaire;
  }
  play() {
    return Promise.resolve();
  }
  pause() {}
  // Test uniquement : simule l'échec de chargement (fichier absent), qui en
  // vrai arrive de façon asynchrone, à un moment quelconque après l'armement.
  declencherErreur() {
    this._ecouteurs.error();
  }
}

function activerFaux() {
  globalThis.window = { AudioContext: FauxAudioContext };
  globalThis.Audio = FauxAudioElement;
}
function desactiverFaux() {
  delete globalThis.window;
  delete globalThis.Audio;
  reinitialiserPourTests();
}

const pisteSynthese = () => ({
  id: 'mus_synthese_test',
  type: 'synthese',
  tempo_bpm: 600, // rapide : le test n'attend jamais un vrai minuteur
  boucle: true,
  volume: 0.2,
  notes: [{ note: 'A3', duree_beats: 1 }],
});

// 1. Cas 4 du ticket : réglage persisté "non", premier bascule vers "oui".
// `armerAudio(..., actif=false)` ne doit jamais créer le contexte (cf.
// commentaire de demarrerSynthese) ; avant le correctif, le bascule suivant
// appelait une reprise qui déréférençait un gain `null` → TypeError.
{
  activerFaux();
  const piste = pisteSynthese();
  armerAudio([piste], piste.id, false);
  assert.doesNotThrow(
    () => definirMusiqueActive(true),
    'boot avec réglage "non" puis bascule vers "oui" ne doit jamais lever (cause racine a, cas 4 du ticket)'
  );
  desactiverFaux();
}

// 2. Cas 3 du ticket, la course exacte reproduite : boot "oui" (le fichier
// piano_solo est absent), l'utilisateur coupe la musique via le menu AVANT
// que l'échec de chargement (asynchrone) ne soit connu, puis cet échec
// bascule sur la synthèse pendant que "Musique" est sur non (donc sans
// créer le contexte, cf. `actifCourant` dans armerAudio) ; le bascule
// suivant vers "oui" est la transition qui gelait le jeu.
{
  activerFaux();
  const pisteFichier = {
    id: 'mus_fichier_test',
    type: 'fichier',
    fichier: 'introuvable.mp3',
    boucle: true,
    volume: 0.5,
    repli: 'mus_synthese_test',
  };
  const pisteRepli = pisteSynthese();
  armerAudio([pisteFichier, pisteRepli], pisteFichier.id, true); // 1. boot → premier geste
  definirMusiqueActive(false); // 2. Menu → Musique → non (OK, avant l'échec de chargement)
  FauxAudioElement.derniere.declencherErreur(); // l'échec, réellement async, arrive ici
  assert.doesNotThrow(
    () => definirMusiqueActive(true), // 3. Menu → Musique → oui : gelait le jeu
    'reprise après un repli survenu pendant que "Musique" était sur non ne doit jamais lever (cause racine a, cas 3 du ticket)'
  );
  desactiverFaux();
}

// 3. Garde-fou (b) : une exception dans le chemin de démarrage ne doit
// jamais sortir d'audio.js, même sans rapport avec la cause racine (a) —
// ici un AudioContext factice qui lève à la création du gain.
{
  activerFaux();
  class ContexteQuiLeve extends FauxAudioContext {
    createGain() {
      throw new Error('panne simulée, sans rapport avec (a)');
    }
  }
  globalThis.window = { AudioContext: ContexteQuiLeve };
  const piste = pisteSynthese();
  assert.doesNotThrow(
    () => armerAudio([piste], piste.id, true),
    'une exception interne à audio.js ne doit jamais sortir de armerAudio (garde-fou b)'
  );
  desactiverFaux();
}

console.log('OK test_sd_musique_freeze_reprise');

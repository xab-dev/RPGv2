// Audio (03_maison-exterieur §3.6, complété par MT_musique-ambiance-synth
// pour le repli synthé) : initialisation sur le premier geste utilisateur,
// une piste en boucle — fichier (<audio>) ou synthèse (oscillateurs), même
// contrat de lecture pour les deux : armerAudio() démarre, definirMusique-
// Active() coupe/reprend. Seul point du jeu qui touche l'API Audio/Web
// Audio — le reste ne connaît que ces deux fonctions (+ resoudrePisteRepli,
// pure, exportée pour le test headless). Jamais testé headless au-delà de
// cette résolution pure (accès DOM/Audio, comme ui/hud.js et render.js pour
// le canvas) — importable depuis Node malgré tout (rien au niveau module).

const SEMITONES_DEPUIS_DO = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

let elementFichier = null;
// Le volume PROPRE de la piste fichier en cours : `elementFichier.volume` porte
// déjà le produit par le maître, on ne peut donc pas le relire pour le
// recalculer — il faut garder le facteur d'origine.
let volumeFichierPropre = 1;
let contexteSynthese = null; // AudioContext Web Audio, créé au premier geste seulement
let gainSynthese = null;
let minuteurPhraseSynthese = null;
let modeActuel = null; // 'fichier' | 'synthese' | null (aucune piste résolue)
let pisteSyntheseActuelle = null; // données (notes/tempo/volume) de la synthèse en cours
let actifCourant = false; // dernier état "Musique" demandé (armement initial ou menu)
let armee = false;
// `D-64` (T7) : le volume MAÎTRE, un facteur 0..1 appliqué par-dessus le
// volume propre de la piste. Deux réglages, et c'est voulu : la piste dit
// son équilibre (la synthèse est naturellement plus forte qu'un piano
// enregistré), le joueur dit combien fort il veut du tout. Les multiplier
// garde l'équilibre entre pistes quel que soit le curseur.
//
// Verdict de Xav le 21/09 (`V-04`) : il coupait le son systématiquement,
// donc l'ambiance n'était de fait jamais entendue. Entre « fort » et
// « rien », il n'existait aucun cran.
let volumeMaitre = 1;

// Résolution pure de la piste de secours déclarée sur une piste (`repli`,
// un id du même catalogue music.json) — aucune AudioContext, testable
// headless. armerAudio() l'utilise pour savoir vers quoi basculer si la
// piste `fichier` échoue à charger.
export function resoudrePisteRepli(piste, catalogueMusic) {
  if (!piste || !piste.repli) return null;
  return (catalogueMusic || []).find((p) => p.id === piste.repli) || null;
}

// Nom de note scientifique ("A3", "C#4", "Bb2") → fréquence Hz par calcul
// (jamais une table de fréquences figée) : ajouter/changer une note dans
// data/music.json doit rester une modification de données pure, jamais une
// modification de ce fichier (règle d'architecture directrice, carte
// mentale §7).
function frequenceNote(nom) {
  const correspondance = /^([A-G])(#|b)?(-?\d+)$/.exec(nom);
  if (!correspondance) {
    console.warn(`audio.js : note "${nom}" illisible — jouée en silence`);
    return null;
  }
  const [, lettre, alteration, octaveTexte] = correspondance;
  let semitone = SEMITONES_DEPUIS_DO[lettre];
  if (alteration === '#') semitone += 1;
  if (alteration === 'b') semitone -= 1;
  const midi = (Number(octaveTexte) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

function creerElementFichier(fichier, boucle, volume, surErreur) {
  const a = new Audio(`assets/audio/${fichier}`);
  a.loop = boucle;
  a.volume = volume;
  // Fichier absent (ex. piano_solo.mp3 pas encore livré, cf. ticket) ou
  // format non supporté : repli sur la piste synthétisée déclarée en donnée
  // plutôt qu'un silence — le jour où le fichier existe, cet écouteur ne se
  // déclenche jamais, aucune ligne de code à retoucher.
  a.addEventListener('error', () => {
    console.warn(`audio.js : impossible de charger "${fichier}" — repli sur l'ambiance synthétisée`);
    surErreur();
  });
  return a;
}

function jouerNoteSynthese(frequence, delaiSec, dureeSec) {
  if (frequence === null) return; // silence (note omise dans la phrase)
  const debut = contexteSynthese.currentTime + delaiSec;
  const osc = contexteSynthese.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequence;
  const enveloppe = contexteSynthese.createGain();
  // Attaque/relâchement doux : un front raide sur un oscillateur produit un
  // clic audible à chaque début/fin de note (§1 du ticket).
  const attaque = Math.min(0.3, dureeSec * 0.3);
  const relachement = Math.min(0.5, dureeSec * 0.3);
  enveloppe.gain.setValueAtTime(0, debut);
  enveloppe.gain.linearRampToValueAtTime(1, debut + attaque);
  enveloppe.gain.setValueAtTime(1, Math.max(debut + attaque, debut + dureeSec - relachement));
  enveloppe.gain.linearRampToValueAtTime(0, debut + dureeSec);
  osc.connect(enveloppe).connect(gainSynthese);
  osc.start(debut);
  osc.stop(debut + dureeSec + 0.05);
}

// Rejoue la phrase entière puis se replanifie elle-même si `boucle` — chaque
// note a déjà son enveloppe retombée à 0 avant la suivante (y compris au
// point de bouclage), donc aucune couture audible sans mécanisme séparé.
function jouerPhraseSynthese(piste) {
  const secondesParBeat = 60 / piste.tempo_bpm;
  let curseur = 0;
  for (const n of piste.notes) {
    const duree = n.duree_beats * secondesParBeat;
    jouerNoteSynthese(n.note ? frequenceNote(n.note) : null, curseur, duree);
    curseur += duree;
  }
  if (piste.boucle) {
    minuteurPhraseSynthese = setTimeout(() => jouerPhraseSynthese(piste), curseur * 1000);
  }
}

// Unique point d'entrée pour démarrer OU reprendre la synthèse (SD_musique-
// freeze-reprise_2026-09-17, cause racine (a)) : avant ce correctif,
// `armerAudio` créait le contexte/gain au premier geste tandis que le menu
// appelait une fonction de reprise séparée qui supposait ce contexte déjà
// créé. Or le repli fichier→synthèse (cf. plus bas) peut faire passer
// `modeActuel` à 'synthese' sans jamais avoir appelé cette création, si le
// réglage était "non" au moment où l'erreur de chargement arrivait
// (l'armement initial passe `actif=false`, ou l'utilisateur avait déjà
// coupé le son avant que l'événement `error`, asynchrone, ne se déclenche).
// Le bascule "non → oui" du menu retombait alors sur un contexte/gain
// `null` → exception non rattrapée dans `maj()` → boucle de jeu qui ne se
// replanifie plus (manette/clavier morts, souris vivante car indépendante
// du `requestAnimationFrame`). En faisant de la reprise un simple rappel de
// cette même fonction (création paresseuse si besoin), le bascule devient
// un geste utilisateur comme un autre, exactement comme le premier geste.
// Le palier suivant, en boucle — PUR, et testé. Séparé du reste parce que
// c'est la seule part de ce module qui n'a rien à voir avec le son : c'est
// la mécanique d'une carte de menu qui cycle des valeurs.
//
// Une valeur courante hors liste (sauvegarde bricolée, palier retiré du
// catalogue depuis) repart du PREMIER palier plutôt que de planter ou de
// rester coincée : le joueur récupère la main au premier appui.
export function palierSuivant(paliers, courant) {
  const index = paliers.indexOf(courant);
  if (index < 0) return paliers[0];
  return paliers[(index + 1) % paliers.length];
}

// Le volume effectif d'une piste : son équilibre propre, mis à l'échelle du
// maître. Une seule formule, lue par les deux modes (fichier et synthèse) —
// sans quoi monter le son ne ferait pas la même chose selon la piste en cours.
function volumeEffectif(piste) {
  const propre = piste && typeof piste.volume === 'number' ? piste.volume : 1;
  return Math.max(0, Math.min(1, propre * volumeMaitre));
}

// Change le volume maître et l'applique à ce qui joue DÉJÀ — sans rien
// recréer, exactement comme `definirMusiqueActive`. Même contrat « meilleur
// effort » : le menu (donc, à la manette, la boucle de jeu) ne doit jamais
// hériter d'une exception d'ici.
export function definirVolumeMaitre(valeur) {
  volumeMaitre = Math.max(0, Math.min(1, Number(valeur) || 0));
  try {
    if (modeActuel === 'fichier' && elementFichier) {
      elementFichier.volume = volumeEffectif({ volume: volumeFichierPropre });
    } else if (modeActuel === 'synthese' && gainSynthese && actifCourant) {
      gainSynthese.gain.setTargetAtTime(
        volumeEffectif(pisteSyntheseActuelle), contexteSynthese.currentTime, 0.05,
      );
    }
  } catch (erreur) {
    console.warn('audio.js : changement de volume en échec, le jeu continue', erreur);
  }
}

function demarrerSynthese(piste) {
  if (!contexteSynthese) {
    contexteSynthese = new (window.AudioContext || window.webkitAudioContext)();
    gainSynthese = contexteSynthese.createGain();
    gainSynthese.connect(contexteSynthese.destination);
  }
  // Un seul minuteur de phrase à la fois : un double appel (ex. double clic)
  // ne doit jamais superposer deux boucles.
  clearTimeout(minuteurPhraseSynthese);
  gainSynthese.gain.setTargetAtTime(volumeEffectif(piste), contexteSynthese.currentTime, 0.05);
  // Repart du début de la phrase plutôt que de sa position exacte avant
  // coupure : le ticket ne demande pas de conserver la position, et ne
  // jamais faire vivre un "curseur" au-delà d'un cycle démarrer/couper
  // élimine toute donnée de planification obsolète à la reprise.
  jouerPhraseSynthese(piste);
}

function arreterSynthese() {
  clearTimeout(minuteurPhraseSynthese);
  // Rien à couper si la synthèse n'a jamais démarré (ex. armée avec le
  // réglage "non", jamais jouée) — un no-op, jamais une exception.
  if (!gainSynthese) return;
  // Fondu court plutôt qu'une coupure sèche (§2 du ticket) : la note en
  // cours s'éteint en douceur au lieu d'un clic.
  gainSynthese.gain.setTargetAtTime(0, contexteSynthese.currentTime, 0.05);
}

// Appelée une seule fois, au premier geste utilisateur détecté (cf.
// commentaire main.js) : créer un <audio>/AudioContext avant ce geste
// serait de toute façon bloqué par les navigateurs (lecture avec son
// interdite hors interaction), donc ce point d'entrée unique suffit à
// respecter la contrainte "contexte audio créé/repris sur geste utilisateur"
// pour l'unique piste du jeu, quel que soit son type.
export function armerAudio(catalogueMusic, idPisteDefaut, actif) {
  if (armee) return;
  armee = true;
  actifCourant = actif;

  // (b) L'audio est un système "meilleur effort" (comme un fichier absent,
  // cf. commentaire de creerElementFichier) : une exception ici ne doit
  // jamais remonter jusqu'à la boucle de jeu qui a déclenché l'armement.
  try {
    const pisteDefaut = (catalogueMusic || []).find((p) => p.id === idPisteDefaut);
    if (!pisteDefaut) return;

    if (pisteDefaut.type === 'synthese') {
      modeActuel = 'synthese';
      pisteSyntheseActuelle = pisteDefaut;
      if (actif) demarrerSynthese(pisteDefaut);
      return;
    }

    const pisteRepli = resoudrePisteRepli(pisteDefaut, catalogueMusic);
    modeActuel = 'fichier';
    volumeFichierPropre = pisteDefaut.volume;
    elementFichier = creerElementFichier(pisteDefaut.fichier, pisteDefaut.boucle, volumeEffectif(pisteDefaut), () => {
      try {
        elementFichier.pause();
        modeActuel = pisteRepli ? 'synthese' : null;
        pisteSyntheseActuelle = pisteRepli;
        if (modeActuel === 'synthese' && actifCourant) demarrerSynthese(pisteRepli);
      } catch (erreur) {
        console.warn('audio.js : repli vers la synthèse en échec, le jeu continue sans musique', erreur);
      }
    });
    if (actif) elementFichier.play().catch(() => {});
  } catch (erreur) {
    console.warn('audio.js : armement audio en échec, le jeu continue sans musique', erreur);
  }
}

// Entrée "Musique" du menu (§3.3/§3.6) : bascule sans recréer la source,
// quel que soit son type (fichier ou synthèse, y compris après un repli
// survenu en cours de partie). Un seul chemin de (re)démarrage pour la
// synthèse (`demarrerSynthese`, cf. son commentaire) — jamais de fonction de
// reprise séparée qui suppose un état déjà initialisé (SD_musique-freeze-
// reprise_2026-09-17, cause racine (a)).
export function definirMusiqueActive(actif) {
  actifCourant = actif;
  // (b) même garde qu'armerAudio : le menu (et donc, à la manette, la
  // boucle de jeu qui traite le verbe ATTACK) ne doit jamais hériter d'une
  // exception d'audio.js.
  try {
    if (modeActuel === 'fichier') {
      if (actif) elementFichier.play().catch(() => {});
      else elementFichier.pause();
    } else if (modeActuel === 'synthese') {
      if (actif) demarrerSynthese(pisteSyntheseActuelle);
      else arreterSynthese();
    }
  } catch (erreur) {
    console.warn('audio.js : bascule "Musique" en échec, le jeu continue', erreur);
  }
}

// Tests uniquement : revient à l'état "jamais armé" (l'armement réel ne
// devrait jamais se produire côté test, cette fonction n'existe que pour ne
// pas laisser un état module-level fuiter entre deux tests qui
// importeraient ce fichier — actuellement aucun test headless ne le fait,
// gardé par prudence/symétrie avec le reste du module).
export function reinitialiserPourTests() {
  armee = false;
  actifCourant = false;
  elementFichier = null;
  volumeFichierPropre = 1;
  volumeMaitre = 1;
  contexteSynthese = null;
  gainSynthese = null;
  clearTimeout(minuteurPhraseSynthese);
  minuteurPhraseSynthese = null;
  modeActuel = null;
  pisteSyntheseActuelle = null;
}

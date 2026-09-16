// Audio (03_maison-exterieur §3.6) : initialisation sur le premier geste
// utilisateur, une piste en boucle. Seul point du jeu qui touche l'API
// Audio — le reste ne connaît que armerAudio()/definirMusiqueActive().
// Jamais testé headless (accès DOM/Audio, comme ui/hud.js et render.js pour
// le canvas) — importable depuis Node malgré tout (rien au niveau module).

let element = null;
let armee = false;

function creerElement(fichier, boucle, volume) {
  const a = new Audio(fichier);
  a.loop = boucle;
  a.volume = volume;
  // Fichier absent ou format non supporté par le navigateur : silence,
  // jamais de crash bloquant (§4 edge case) — juste un avertissement console
  // pour le dev, l'entrée Musique du menu reste affichée normalement.
  a.addEventListener('error', () => {
    console.warn(`audio.js : impossible de charger "${fichier}" — le jeu continue sans son`);
  });
  return a;
}

// Appelée une seule fois, au premier geste utilisateur détecté (clavier/
// souris/tactile par main.js, manette via le premier verbe abstrait vu par
// l'orchestrateur — cf. journal) : créer un <audio> avant ce geste serait de
// toute façon bloqué par les navigateurs (lecture avec son interdite hors
// interaction), donc ce point d'entrée unique suffit à respecter la
// contrainte "AudioContext créé/repris sur geste utilisateur" pour l'unique
// piste du jeu.
export function armerAudio(pisteDefaut, actif) {
  if (armee) return;
  armee = true;
  if (!pisteDefaut) return;
  element = creerElement(`assets/audio/${pisteDefaut.fichier}`, pisteDefaut.boucle, pisteDefaut.volume);
  if (actif) element.play().catch(() => {});
}

// Entrée "Musique" du menu (§3.3/§3.6) : bascule sans recréer l'élément.
export function definirMusiqueActive(actif) {
  if (!element) return;
  if (actif) element.play().catch(() => {});
  else element.pause();
}

// Tests uniquement : revient à l'état "jamais armé" (l'armement réel ne
// devrait jamais se produire côté test, cette fonction n'existe que pour ne
// pas laisser un module-level `armee` fuiter entre deux tests qui
// importeraient ce fichier — actuellement aucun test headless ne le fait,
// gardé par prudence/symétrie avec le reste du module).
export function reinitialiserPourTests() {
  armee = false;
  element = null;
}

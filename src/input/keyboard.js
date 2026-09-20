// Lecture clavier : indépendante de la disposition (KeyboardEvent.code).
// L'écoute s'attache à la cible fournie par l'appelant (window en jeu, un
// faux EventTarget en test) — jamais à `window` au niveau module.

// Provisoire, non validé en jeu par Xav.
export const MAPPING_CLAVIER_PROVISOIRE = {
  gauche: ['KeyA', 'ArrowLeft'],
  droite: ['KeyD', 'ArrowRight'],
  haut: ['KeyW', 'ArrowUp'],
  bas: ['KeyS', 'ArrowDown'],
  attack: ['Space'],
  skill_1: ['Digit1'],
  skill_2: ['Digit2'],
  skill_3: ['Digit3'],
  // E porte l'action la plus fréquente (interagir, récolter, ramasser) :
  // la main gauche posée sur les touches de déplacement y tombe seule.
  // F prend l'action plus rare (se nourrir). Retour de playtest du
  // 2026-09-19 (D-22) — les deux touches portaient les verbes inverses.
  interact: ['KeyE'],
  consume: ['KeyF'],
  menu: ['Escape'],
  // `D-54` : cible suivante du follet. Tab était libre (vérifié le 20/09).
  target_next: ['Tab'],
};

// Codes dont l'action PAR DÉFAUT du navigateur sortirait le joueur du jeu.
// La liste ne se dérive pas du mapping : la raison d'être d'une entrée
// n'est pas « c'est un verbe », c'est « le navigateur en fait autre chose ».
// Aujourd'hui `Tab` seul — sans `preventDefault`, il déplace le focus hors
// du canvas et l'appui suivant ne revient jamais au jeu.
const CODES_ACTION_NAVIGATEUR = new Set(['Tab']);

// `interceptionActive` : le jeu a-t-il la main en ce moment ? Fourni par
// l'appelant, parce que lui seul le sait (main.js#maj tient LE point de
// décision unique UI/gameplay) et parce qu'un `keydown` arrive hors frame.
// Menu ouvert, on n'intercepte rien : les écrans de cartes sont du DOM, et
// `Tab` y appartient au navigateur. Vrai par défaut — les tests headless et
// tout appelant qui n'a pas d'UI n'ont rien à fournir.
export function creerSourceClavier(cible, mapping = MAPPING_CLAVIER_PROVISOIRE, { interceptionActive = () => true } = {}) {
  const touchesEnfoncees = new Set();

  function surAppui(e) {
    touchesEnfoncees.add(e.code);
    if (CODES_ACTION_NAVIGATEUR.has(e.code) && interceptionActive() && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
  }
  function surRelache(e) {
    touchesEnfoncees.delete(e.code);
  }
  // Un `keyup` n'est pas garanti après une perte de focus de la fenêtre
  // (alt-tab, clic hors fenêtre, notification système) alors qu'une touche
  // est physiquement tenue (diagnostic SD_grotte-blocage-choix-follet_
  // 2026-09-15.md) : sans ce filet, le verbe reste "enfoncé" pour toujours
  // côté clavier, et src/input/input.js#maj (un seul OR par verbe, toutes
  // sources confondues) ne produit alors plus jamais de front montant sur ce
  // verbe pour AUCUNE source (manette ou tactile incluses) — un blocage total
  // et silencieux, sans erreur, jusqu'au rechargement de la page.
  function surPertefocus() {
    touchesEnfoncees.clear();
  }

  if (cible && typeof cible.addEventListener === 'function') {
    cible.addEventListener('keydown', surAppui);
    cible.addEventListener('keyup', surRelache);
    cible.addEventListener('blur', surPertefocus);
  }

  function unePresente(codes) {
    return codes.some((c) => touchesEnfoncees.has(c));
  }

  return {
    instantane() {
      let x = 0;
      let y = 0;
      if (unePresente(mapping.gauche)) x -= 1;
      if (unePresente(mapping.droite)) x += 1;
      if (unePresente(mapping.haut)) y -= 1;
      if (unePresente(mapping.bas)) y += 1;

      return {
        move: { x, y },
        attack: unePresente(mapping.attack),
        skill_1: unePresente(mapping.skill_1),
        skill_2: unePresente(mapping.skill_2),
        skill_3: unePresente(mapping.skill_3),
        consume: unePresente(mapping.consume),
        interact: unePresente(mapping.interact),
        menu: unePresente(mapping.menu),
        target_next: unePresente(mapping.target_next || []),
      };
    },
    // Exposé pour les tests : simule un événement sans vrai DOM.
    _injecterAppui: surAppui,
    _injecterRelache: surRelache,
  };
}

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
  consume: ['KeyE'],
  interact: ['KeyF'],
  menu: ['Escape'],
};

export function creerSourceClavier(cible, mapping = MAPPING_CLAVIER_PROVISOIRE) {
  const touchesEnfoncees = new Set();

  function surAppui(e) {
    touchesEnfoncees.add(e.code);
  }
  function surRelache(e) {
    touchesEnfoncees.delete(e.code);
  }

  if (cible && typeof cible.addEventListener === 'function') {
    cible.addEventListener('keydown', surAppui);
    cible.addEventListener('keyup', surRelache);
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
      };
    },
    // Exposé pour les tests : simule un événement sans vrai DOM.
    _injecterAppui: surAppui,
    _injecterRelache: surRelache,
  };
}

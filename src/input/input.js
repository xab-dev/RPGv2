// Couche d'input abstraite : combine clavier + manette en un unique état par
// frame, exprimé uniquement en verbes de gameplay (§2.4). Aucun système de
// jeu ne doit lire un Gamepad ou un KeyboardEvent directement — seulement
// cet état.

const VERBES_BOUTON = ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu'];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function creerCoucheInput({ sourceClavier, sourceManette }) {
  const held = Object.fromEntries(VERBES_BOUTON.map((v) => [v, false]));

  function maj() {
    const clavier = sourceClavier ? sourceClavier.instantane() : null;
    const manette = sourceManette ? sourceManette.instantane() : null;

    const move = {
      x: clamp((clavier ? clavier.move.x : 0) + (manette ? manette.move.x : 0), -1, 1),
      y: clamp((clavier ? clavier.move.y : 0) + (manette ? manette.move.y : 0), -1, 1),
    };

    const etat = { move };

    for (const verbe of VERBES_BOUTON) {
      // Recalculé à zéro chaque frame à partir des deux sources : une
      // manette débranchée ne peut jamais laisser un verbe "collé" à vrai.
      const brut = !!(clavier && clavier[verbe]) || !!(manette && manette[verbe]);
      etat[verbe] = { pressed: brut && !held[verbe], held: brut };
      held[verbe] = brut;
    }

    return etat;
  }

  return { maj };
}

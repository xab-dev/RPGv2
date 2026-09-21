// Lecture manette : traduit le Gamepad API en état brut par verbe. Reçoit sa
// source (`nav`) en paramètre — jamais de référence à `navigator` au niveau
// module — pour permettre l'injection d'une fausse manette en test.

// Provisoire : mapping standard Xbox (disposition "standard" du Gamepad
// API). Pas encore validé en jeu à la manette par Xav.
export const MAPPING_MANETTE_PROVISOIRE = {
  boutons: {
    attack: 0, // A
    skill_3: 1, // B
    skill_1: 2, // X
    skill_2: 3, // Y
    interact: 4, // LB
    consume: 7, // RT (gâchette)
    menu: 9, // Start
    // `D-54` : cible suivante du follet. RB était libre (vérifié le 20/09),
    // et c'est le bouton que Xav a choisi.
    target_next: 5, // RB
  },
  axeX: 0,
  axeY: 1,
  // `D-109` : le stick DROIT pilote le curseur, et rien d'autre. Il était
  // libre — la croix directionnelle est réservée (décision du 15/09) et le
  // stick droit n'avait jamais servi. Ce n'est pas un verbe de gameplay :
  // c'est un pointeur analogique, exposé à part (cf. input.js).
  axeXDroit: 2,
  axeYDroit: 3,
  seuilMort: 0.2, // évite la dérive au repos du stick
};

// Deux manettes connectées → la première qui produit une entrée devient active.
export function creerSourceManette(nav, mapping = MAPPING_MANETTE_PROVISOIRE) {
  let indexActif = null;

  function manettesConnectees() {
    if (!nav || typeof nav.getGamepads !== 'function') return [];
    return Array.from(nav.getGamepads()).filter(Boolean);
  }

  function produitUneEntree(gp) {
    const axeActif =
      Math.abs(gp.axes[mapping.axeX] || 0) > mapping.seuilMort ||
      Math.abs(gp.axes[mapping.axeY] || 0) > mapping.seuilMort;
    const boutonActif = gp.buttons.some((b) => b && b.pressed);
    return axeActif || boutonActif;
  }

  return {
    instantane() {
      const manettes = manettesConnectees();
      if (manettes.length === 0) {
        indexActif = null;
        return null;
      }

      if (indexActif === null || !manettes.some((gp) => gp.index === indexActif)) {
        const candidate = manettes.find(produitUneEntree) || manettes[0];
        indexActif = candidate.index;
      }

      const gp = manettes.find((g) => g.index === indexActif);
      if (!gp) return null;

      const brut = (index) => !!(gp.buttons[index] && gp.buttons[index].pressed);

      let x = gp.axes[mapping.axeX] || 0;
      let y = gp.axes[mapping.axeY] || 0;
      if (Math.abs(x) < mapping.seuilMort) x = 0;
      if (Math.abs(y) < mapping.seuilMort) y = 0;

      // Même zone morte que le stick gauche : une manette usée dérive des
      // deux côtés, et un curseur qui part tout seul se remarque plus qu'un
      // héros qui avance tout seul.
      let viseX = gp.axes[mapping.axeXDroit] || 0;
      let viseY = gp.axes[mapping.axeYDroit] || 0;
      if (Math.abs(viseX) < mapping.seuilMort) viseX = 0;
      if (Math.abs(viseY) < mapping.seuilMort) viseY = 0;

      return {
        move: { x, y },
        // `pointeur` n'est PAS un verbe : il ne traverse pas `etat`, il sort
        // par un accesseur à part (cf. input.js). Le gameplay ne le voit
        // jamais — seul le curseur le lit.
        pointeur: { x: viseX, y: viseY },
        attack: brut(mapping.boutons.attack),
        skill_1: brut(mapping.boutons.skill_1),
        skill_2: brut(mapping.boutons.skill_2),
        skill_3: brut(mapping.boutons.skill_3),
        consume: brut(mapping.boutons.consume),
        interact: brut(mapping.boutons.interact),
        menu: brut(mapping.boutons.menu),
        target_next: brut(mapping.boutons.target_next),
      };
    },
  };
}

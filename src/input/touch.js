// Lecture tactile : joystick virtuel (gauche) + boutons (droite), produisant
// exactement le même état brut que clavier/manette (§2.3). Écoute la cible
// fournie par l'appelant (le canvas en jeu, un faux EventTarget en test) —
// jamais `window`/le DOM au niveau module. `versLogique` convertit
// clientX/clientY (coordonnées écran) en coordonnées de résolution logique
// (§2.2) : c'est l'appelant (main.js, qui connaît l'échelle courante et la
// position du canvas) qui la fournit ; ce module ne connaît que des
// coordonnées déjà logiques, comme le reste du jeu.

import { JOYSTICK, boutonsTactiles } from '../ui/hud_layout.js';

function dansCercle(x, y, cercle) {
  return Math.hypot(x - cercle.cx, y - cercle.cy) <= cercle.rayon;
}

// `surPremierContact` (`D-30`) : crochet optionnel appelé DANS le
// gestionnaire de `touchstart`, donc **pendant** le geste du joueur — c'est
// la condition que les navigateurs posent pour accorder le plein écran, et
// c'est pourquoi il est ici plutôt que dans `maj()` à la frame suivante.
//
// Ce module ne sait pas ce qu'on en fait : il ne connaît ni le plein écran,
// ni l'orientation, ni le DOM au-delà de ses propres événements. Il appelle à
// **chaque** contact ; c'est `plein_ecran.js` qui porte le loquet « une seule
// fois », en un seul endroit. Mettre le loquet ici l'aurait dispersé.
export function creerSourceTactile(cible, {
  versLogique = (x, y) => ({ x, y }),
  surPremierContact = null,
} = {}) {
  let actif = false;
  // Incrémenté à chaque touchstart (jamais décrémenté) : `estActif()` est un
  // loquet à vie (une fois vrai, reste vrai), insuffisant pour détecter "un
  // NOUVEAU contact vient d'arriver" une fois que le clavier/la manette a
  // repris la main (§3, extinction) — src/input/input.js compare ce
  // compteur d'une frame à l'autre pour ne rallumer le tactile que sur un
  // vrai nouveau touchstart, jamais par un simple "il a déjà touché un jour".
  let nbContacts = 0;
  let idJoystick = null; // le doigt qui a "pris" le joystick, jusqu'à son relâchement
  const doigts = new Map(); // identifier -> position logique { x, y }

  function positionsLogiques(touchList) {
    return Array.from(touchList).map((t) => ({ identifier: t.identifier, ...versLogique(t.clientX, t.clientY) }));
  }

  // Un doigt qui apparaît dans la moitié gauche de l'écran (JOYSTICK.limiteX)
  // "prend" le joystick et continue à le piloter même s'il glisse loin du
  // centre visuel (comportement standard d'un joystick virtuel) — la
  // magnitude reste clampée à 1 par ailleurs (rayonZone). Le premier doigt
  // qui prend la zone fait foi tant qu'il n'est pas relâché (§4).
  function attribuerJoystickSiBesoin(points) {
    if (idJoystick !== null && doigts.has(idJoystick)) return;
    idJoystick = null;
    const candidat = points.find((p) => p.x < JOYSTICK.limiteX);
    if (candidat) idJoystick = candidat.identifier;
  }

  // Empêche le scroll/zoom natif du navigateur pendant le jeu — sans effet
  // sur les faux événements de test, qui n'ont pas de preventDefault().
  function bloquerComportementNatif(e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }

  function surDebut(e) {
    bloquerComportementNatif(e);
    actif = true;
    nbContacts += 1;
    // Avant toute autre chose, et sans jamais rien rattraper ici : le crochet
    // est « meilleur effort » et rattrape ses propres erreurs à sa frontière
    // (plein_ecran.js). Un `try/catch` de plus ici masquerait un vrai bug
    // d'input le jour où le crochet servira à autre chose.
    if (surPremierContact) surPremierContact();
    const points = positionsLogiques(e.touches);
    for (const p of points) doigts.set(p.identifier, p);
    attribuerJoystickSiBesoin(points);
  }
  function surDeplacement(e) {
    bloquerComportementNatif(e);
    const points = positionsLogiques(e.touches);
    for (const p of points) doigts.set(p.identifier, p);
  }
  function surFin(e) {
    // Un doigt qui n'est plus dans e.touches a été relâché : `move` repasse
    // à {0,0} immédiatement, aucun état ne doit rester "collé" (§4, même
    // exigence que le hot-swap manette).
    const restants = new Set(Array.from(e.touches).map((t) => t.identifier));
    for (const id of Array.from(doigts.keys())) {
      if (!restants.has(id)) doigts.delete(id);
    }
    if (idJoystick !== null && !restants.has(idJoystick)) idJoystick = null;
  }

  if (cible && typeof cible.addEventListener === 'function') {
    cible.addEventListener('touchstart', surDebut);
    cible.addEventListener('touchmove', surDeplacement);
    cible.addEventListener('touchend', surFin);
    cible.addEventListener('touchcancel', surFin);
  }

  return {
    estActif: () => actif,
    compteurContacts: () => nbContacts,
    instantane() {
      let move = { x: 0, y: 0 };
      const doigtJoystick = idJoystick !== null ? doigts.get(idJoystick) : undefined;
      if (doigtJoystick) {
        const dx = doigtJoystick.x - JOYSTICK.cx;
        const dy = doigtJoystick.y - JOYSTICK.cy;
        const distance = Math.hypot(dx, dy);
        const magnitude = Math.min(1, distance / JOYSTICK.rayonZone);
        if (magnitude > 0) {
          const angle = Math.atan2(dy, dx);
          move = { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
        }
      }

      const points = Array.from(doigts.values());
      const etat = { move };
      for (const bouton of boutonsTactiles()) {
        etat[bouton.verbe] = points.some((p) => dansCercle(p.x, p.y, bouton));
      }
      return etat;
    },
  };
}

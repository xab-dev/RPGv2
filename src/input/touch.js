// Lecture tactile : joystick virtuel (gauche) + boutons (droite), produisant
// exactement le même état brut que clavier/manette (§2.3). Écoute la cible
// fournie par l'appelant (le canvas en jeu, un faux EventTarget en test) —
// jamais `window`/le DOM au niveau module. `versLogique` convertit
// clientX/clientY (coordonnées écran) en coordonnées de résolution logique
// (§2.2) : c'est l'appelant (main.js, qui connaît l'échelle courante et la
// position du canvas) qui la fournit ; ce module ne connaît que des
// coordonnées déjà logiques, comme le reste du jeu.

import { JOYSTICK, boutonsTactiles, boutonsTactilesVisibles } from '../ui/hud_layout.js';

function dansCercle(x, y, cercle) {
  return Math.hypot(x - cercle.cx, y - cercle.cy) <= cercle.rayon;
}

// `surRelachement` (`D-30`, rouvert le 20/09) : crochet optionnel appelé DANS
// le gestionnaire de `touchend`, donc **pendant** le geste du joueur.
//
// Il était appelé sur `touchstart` jusqu'au 20/09, et c'était l'erreur. Le
// contrat d'« activation utilisateur » du HTML ne liste PAS `touchstart`
// parmi les événements qui l'accordent (il peut encore ouvrir un défilement,
// le navigateur ne sait donc pas encore si c'est un geste ou un glissement) —
// il liste `keydown`, `mousedown`, `pointerdown`, `pointerup` et **`touchend`**.
// Une demande de plein écran partie du contact était donc refusée d'office,
// silencieusement, une seule fois et pour toujours.
//
// `touchcancel` ne l'appelle PAS : un contact annulé par le système (appel
// entrant, geste de navigation) n'accorde aucune activation, et il aurait
// brûlé le loquet « une seule fois » sans rien obtenir.
//
// Ce module ne sait toujours pas ce qu'on en fait : il ne connaît ni le plein
// écran, ni l'orientation, ni le DOM au-delà de ses propres événements. Il
// appelle à **chaque** relâchement ; c'est `plein_ecran.js` qui porte le
// loquet, en un seul endroit. Mettre le loquet ici l'aurait dispersé.
//
// `verbesActions` (`D-63`, T9) : les verbes de la barre d'actions réellement
// débloqués, annoncés par l'orchestrateur à chaque frame — même patron que
// `interceptionActive` pour le clavier (`D-54`). Un bouton masqué ne doit pas
// rester cliquable : un doigt posé sur une case invisible déclencherait une
// compétence que le joueur n'a pas, et il ne comprendrait jamais pourquoi.
//
// La couche d'input ne DÉCIDE rien : elle ne sait pas ce qu'est un slot, ni
// une compétence, ni un flag. Elle reçoit une liste, comme le rendu. Un seul
// écrivain (l'orchestrateur), deux lecteurs — jamais deux règles.
//
// Défaut : tout est actif. C'est le bon défaut ICI, et seulement ici : les
// tests headless et les bancs d'essai qui ne branchent rien doivent garder
// des boutons qui répondent, alors que le RENDU, lui, ne doit rien dessiner
// sans qu'on le lui dise (un défaut y masquerait un branchement oublié).
//
// `zonesMonde` (`Q-40`, 23/09) : des cibles tactiles qui BOUGENT avec le
// monde (aujourd'hui le seul follet), en coordonnées logiques d'écran,
// annoncées par l'orchestrateur à chaque frame — `[{ cx, cy, rayon, verbe }]`.
// Même patron que `verbesActions` : ce module ne sait ni ce qu'est un follet
// ni où est la caméra, il reçoit des cercles. Défaut : aucune, donc un banc
// qui ne branche rien n'a pas de zone fantôme.
export function creerSourceTactile(cible, {
  versLogique = (x, y) => ({ x, y }),
  surRelachement = null,
  verbesActions = () => boutonsTactiles().map((b) => b.verbe),
  zonesMonde = () => [],
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
  // Spec 11 §4.2 : les doigts POSÉS depuis la dernière lecture, en
  // coordonnées logiques. Un contact est une position, pas un verbe : il sort
  // par un accesseur séparé, jamais dans l'état de verbes (même règle que le
  // pointeur du stick droit, `D-109`) — le gameplay n'en voit rien, seule la
  // bulle de dialogue le résout en option. Vidé à chaque lecture : un contact
  // n'est lu qu'une fois, et un contact que personne ne lit ne s'accumule pas.
  let contactsNouveaux = [];

  function positionsLogiques(touchList) {
    return Array.from(touchList).map((t) => ({ identifier: t.identifier, ...versLogique(t.clientX, t.clientY) }));
  }

  // Un doigt qui apparaît dans la bande gauche de l'écran (JOYSTICK.limiteX)
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
    const points = positionsLogiques(e.touches);
    for (const p of points) {
      if (!doigts.has(p.identifier)) contactsNouveaux.push({ x: p.x, y: p.y });
    }
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

  // `touchend` seul (jamais `touchcancel`, cf. l'en-tête). Le crochet part
  // APRÈS la mise à jour de l'état : ce qu'il déclenche peut redimensionner
  // la page (plein écran), et l'état d'input doit être cohérent avant. Sans
  // jamais rien rattraper ici non plus — le crochet est « meilleur effort »
  // et rattrape ses propres erreurs à sa frontière (`plein_ecran.js`) ; un
  // `try/catch` de plus ici masquerait un vrai bug d'input le jour où il
  // servira à autre chose.
  function surRelachementTactile(e) {
    surFin(e);
    if (surRelachement) surRelachement();
  }

  if (cible && typeof cible.addEventListener === 'function') {
    cible.addEventListener('touchstart', surDebut);
    cible.addEventListener('touchmove', surDeplacement);
    cible.addEventListener('touchend', surRelachementTactile);
    cible.addEventListener('touchcancel', surFin);
  }

  return {
    estActif: () => actif,
    compteurContacts: () => nbContacts,
    lireContactsNouveaux() {
      const lus = contactsNouveaux;
      contactsNouveaux = [];
      return lus;
    },
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
      // Tous les verbes sont émis à chaque frame, y compris ceux des boutons
      // masqués : un verbe absent de l'état serait `undefined` là où le
      // gameplay lit `.pressed` en direct. Ce qui change, c'est qu'un bouton
      // masqué vaut toujours `false`, quoi qu'on pose dessus.
      const actifs = new Set(boutonsTactilesVisibles(verbesActions()).map((b) => b.verbe));
      for (const bouton of boutonsTactiles()) {
        etat[bouton.verbe] = actifs.has(bouton.verbe)
          && points.some((p) => dansCercle(p.x, p.y, bouton));
      }
      // Le doigt qui pilote le joystick n'en fait pas partie : un pouce qui
      // glisse sur le follet en se déplaçant changerait de cible à chaque
      // passage, sans l'avoir voulu. Un verbe déjà vrai par un bouton le reste.
      const libres = Array.from(doigts.entries()).filter(([id]) => id !== idJoystick).map(([, p]) => p);
      for (const zone of zonesMonde()) {
        etat[zone.verbe] = !!etat[zone.verbe] || libres.some((p) => dansCercle(p.x, p.y, zone));
      }
      return etat;
    },
  };
}

// Lecture tactile : joystick virtuel (gauche) + boutons (droite), produisant
// exactement le même état brut que clavier/manette (§2.3). Écoute la cible
// fournie par l'appelant (le canvas en jeu, un faux EventTarget en test) —
// jamais `window`/le DOM au niveau module. `versLogique` convertit
// clientX/clientY (coordonnées écran) en coordonnées de résolution logique
// (§2.2) : c'est l'appelant (main.js, qui connaît l'échelle courante et la
// position du canvas) qui la fournit ; ce module ne connaît que des
// coordonnées déjà logiques, comme le reste du jeu.

import {
  JOYSTICK, boutonsTactiles, boutonsTactilesVisibles, bornerCentreJoystick, magnitudeJoystick,
} from '../ui/hud_layout.js';

// `D-248` (`Q-167`, Xav : « un tap and drag de la compétence pour
// téléphone ») : provisoire, non validé au doigt. En deçà, un doigt posé sur le
// bouton d'une compétence qui vise est un simple TOUCHER (la visée
// automatique) ; au-delà, un GLISSÉ, dont la direction vise. En unités
// logiques : ~4 % de la hauteur de l'écran, assez pour qu'un pouce qui roule
// sur le bouton ne vise pas par accident.
export const SEUIL_GLISSE_PX = 12;

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
//
// `verbesVisants` (`D-248`) : les verbes dont le bouton VISE (une compétence
// y est rangée), annoncés par l'orchestrateur à chaque frame — même patron.
// Un tel bouton ne part pas au contact mais au RELÂCHEMENT : le doigt a eu le
// temps de glisser. Le verbe est vrai une seule lecture, et la direction du
// glissé sort par un accesseur séparé (`viseeTactile`), jamais dans l'état de
// verbes. Défaut : aucun, donc tout bouton part au contact comme avant.
export function creerSourceTactile(cible, {
  versLogique = (x, y) => ({ x, y }),
  surRelachement = null,
  verbesActions = () => boutonsTactiles().map((b) => b.verbe),
  zonesMonde = () => [],
  verbesVisants = () => [],
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
  // `D-138` : le centre du joystick tant qu'un doigt le tient — là où il s'est
  // posé, puis tiré derrière lui (la laisse, cf. `JOYSTICK`). `null` au repos.
  let centreJoystick = null;
  const doigts = new Map(); // identifier -> position logique { x, y }
  // Spec 11 §4.2 : les doigts POSÉS depuis la dernière lecture, en
  // coordonnées logiques. Un contact est une position, pas un verbe : il sort
  // par un accesseur séparé, jamais dans l'état de verbes (même règle que le
  // pointeur du stick droit, `D-109`) — le gameplay n'en voit rien, seule la
  // bulle de dialogue le résout en option. Vidé à chaque lecture : un contact
  // n'est lu qu'une fois, et un contact que personne ne lit ne s'accumule pas.
  let contactsNouveaux = [];
  // `D-248` : les doigts posés sur un bouton qui vise, jusqu'à leur
  // relâchement — identifier -> { verbe, x0, y0 } (où le doigt s'est posé : le
  // glissé se mesure depuis lui, pas depuis le centre du bouton, plus
  // indulgent pour un pouce qui tombe au bord). Puis les relâchements pas encore
  // lus, et ce que la dernière lecture en a tiré.
  const doigtsVisants = new Map();
  let relachements = [];
  let viseesLues = new Map();

  function positionsLogiques(touchList) {
    return Array.from(touchList).map((t) => ({ identifier: t.identifier, ...versLogique(t.clientX, t.clientY) }));
  }

  // Un doigt qui apparaît dans la bande gauche de l'écran (JOYSTICK.limiteX)
  // "prend" le joystick et continue à le piloter même s'il glisse hors de la
  // bande. Le premier doigt qui prend la zone fait foi tant qu'il n'est pas
  // relâché (§4). `D-138` : le centre naît sous lui — le pouce n'a plus à
  // viser un cercle qu'il couvre.
  function attribuerJoystickSiBesoin(points) {
    if (idJoystick !== null && doigts.has(idJoystick)) return;
    idJoystick = null;
    centreJoystick = null;
    const candidat = points.find((p) => p.x < JOYSTICK.limiteX);
    if (candidat) {
      idJoystick = candidat.identifier;
      centreJoystick = bornerCentreJoystick(candidat.x, candidat.y);
    }
  }

  // La laisse : un doigt qui s'éloigne du centre de plus de `rayonZone` le
  // tire derrière lui. Suivie à chaque événement, pas à chaque frame : le
  // centre dépend du CHEMIN du doigt, et la cadence des événements est la
  // plus fine qu'on ait de ce chemin. Le centre tiré reste dans la limite
  // (`D-251`, `LIMITE_JOYSTICK`) : au-delà, le doigt s'éloigne seul.
  function tirerLaisse() {
    const doigt = idJoystick !== null ? doigts.get(idJoystick) : undefined;
    if (!doigt || !centreJoystick) return;
    const dx = doigt.x - centreJoystick.x;
    const dy = doigt.y - centreJoystick.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= JOYSTICK.rayonZone) return;
    const recul = JOYSTICK.rayonZone / distance;
    centreJoystick = bornerCentreJoystick(doigt.x - dx * recul, doigt.y - dy * recul);
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
    for (const p of points) {
      if (!doigts.has(p.identifier)) capturerSiVisant(p);
      doigts.set(p.identifier, p);
    }
    attribuerJoystickSiBesoin(points);
    // Un second doigt qui se pose rapporte aussi la position du premier.
    tirerLaisse();
  }

  // Un doigt qui se POSE sur un bouton visible et qui vise lui appartient
  // jusqu'à ce qu'il se lève, où qu'il glisse. Un doigt qui y arrive en
  // glissant d'ailleurs ne le prend pas : il n'a pas voulu viser.
  function capturerSiVisant(p) {
    const visants = new Set(verbesVisants());
    if (visants.size === 0) return;
    const bouton = boutonsTactilesVisibles(verbesActions())
      .find((b) => visants.has(b.verbe) && dansCercle(p.x, p.y, b));
    if (bouton) doigtsVisants.set(p.identifier, { verbe: bouton.verbe, x0: p.x, y0: p.y });
  }
  function surDeplacement(e) {
    bloquerComportementNatif(e);
    const points = positionsLogiques(e.touches);
    for (const p of points) doigts.set(p.identifier, p);
    tirerLaisse();
  }
  // `annule` : un contact interrompu par le système (`touchcancel`) ne lance
  // rien — le joueur n'a pas levé le doigt.
  function surFin(e, annule = true) {
    // Un doigt qui n'est plus dans e.touches a été relâché : `move` repasse
    // à {0,0} immédiatement, aucun état ne doit rester "collé" (§4, même
    // exigence que le hot-swap manette).
    const restants = new Set(Array.from(e.touches).map((t) => t.identifier));
    for (const id of Array.from(doigts.keys())) {
      if (restants.has(id)) continue;
      const visant = doigtsVisants.get(id);
      if (visant && !annule) {
        // La DERNIÈRE position connue : `touchend` ne dit plus où était un
        // doigt qui vient de partir (il n'est plus dans `e.touches`).
        const p = doigts.get(id);
        relachements.push({ verbe: visant.verbe, direction: directionGlisse(visant, p) });
      }
      doigtsVisants.delete(id);
      doigts.delete(id);
    }
    if (idJoystick !== null && !restants.has(idJoystick)) {
      idJoystick = null;
      centreJoystick = null;
    }
  }

  // `touchend` seul (jamais `touchcancel`, cf. l'en-tête). Le crochet part
  // APRÈS la mise à jour de l'état : ce qu'il déclenche peut redimensionner
  // la page (plein écran), et l'état d'input doit être cohérent avant. Sans
  // jamais rien rattraper ici non plus — le crochet est « meilleur effort »
  // et rattrape ses propres erreurs à sa frontière (`plein_ecran.js`) ; un
  // `try/catch` de plus ici masquerait un vrai bug d'input le jour où il
  // servira à autre chose.
  function surRelachementTactile(e) {
    surFin(e, false);
    if (surRelachement) surRelachement();
  }

  // La direction d'un glissé, ou `null` pour un simple toucher.
  function directionGlisse(visant, p) {
    if (!p) return null;
    const dx = p.x - visant.x0;
    const dy = p.y - visant.y0;
    return Math.hypot(dx, dy) >= SEUIL_GLISSE_PX ? { dx, dy } : null;
  }

  if (cible && typeof cible.addEventListener === 'function') {
    cible.addEventListener('touchstart', surDebut);
    cible.addEventListener('touchmove', surDeplacement);
    cible.addEventListener('touchend', surRelachementTactile);
    cible.addEventListener('touchcancel', (e) => surFin(e, true));
  }

  return {
    estActif: () => actif,
    compteurContacts: () => nbContacts,
    // `D-248` : la direction du glissé qui a lancé `verbe` à la dernière
    // lecture (`instantane`), ou `null` (un simple toucher, ou rien).
    viseeTactile: (verbe) => viseesLues.get(verbe) || null,
    // Les glissés EN COURS, au-delà du seuil — ce que le rendu montre pendant
    // que le doigt vise. `[{ verbe, dx, dy }]`.
    glissesEnCours() {
      const enCours = [];
      for (const [id, visant] of doigtsVisants) {
        const direction = directionGlisse(visant, doigts.get(id));
        if (direction) enCours.push({ verbe: visant.verbe, ...direction });
      }
      return enCours;
    },
    // `D-138` : ce que le HUD dessine du joystick — son centre et le doigt qui
    // le tient, ou `null` au repos (le cercle reste alors à `JOYSTICK.cx/cy`).
    // Une position, jamais un verbe : même règle que `glissesEnCours`.
    joystickAffiche() {
      const doigt = idJoystick !== null ? doigts.get(idJoystick) : undefined;
      if (!doigt || !centreJoystick) return null;
      return { cx: centreJoystick.x, cy: centreJoystick.y, x: doigt.x, y: doigt.y };
    },
    lireContactsNouveaux() {
      const lus = contactsNouveaux;
      contactsNouveaux = [];
      return lus;
    },
    instantane() {
      let move = { x: 0, y: 0 };
      const doigtJoystick = idJoystick !== null ? doigts.get(idJoystick) : undefined;
      if (doigtJoystick && centreJoystick) {
        const dx = doigtJoystick.x - centreJoystick.x;
        const dy = doigtJoystick.y - centreJoystick.y;
        const magnitude = magnitudeJoystick(Math.hypot(dx, dy));
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
      // `D-248` : un bouton qui vise ne part pas sous le doigt, mais une seule
      // lecture après son relâchement ; ses doigts ne touchent rien d'autre.
      const visants = new Set(verbesVisants());
      const libresBoutons = Array.from(doigts.entries()).filter(([id]) => !doigtsVisants.has(id)).map(([, p]) => p);
      for (const bouton of boutonsTactiles()) {
        etat[bouton.verbe] = actifs.has(bouton.verbe) && !visants.has(bouton.verbe)
          && libresBoutons.some((p) => dansCercle(p.x, p.y, bouton));
      }
      viseesLues = new Map();
      for (const r of relachements) {
        if (!actifs.has(r.verbe)) continue;
        etat[r.verbe] = true;
        if (r.direction) viseesLues.set(r.verbe, r.direction);
      }
      relachements = [];
      // Le doigt qui pilote le joystick n'en fait pas partie : un pouce qui
      // glisse sur le follet en se déplaçant changerait de cible à chaque
      // passage, sans l'avoir voulu. Un verbe déjà vrai par un bouton le reste.
      const libres = Array.from(doigts.entries()).filter(([id]) => id !== idJoystick && !doigtsVisants.has(id)).map(([, p]) => p);
      for (const zone of zonesMonde()) {
        etat[zone.verbe] = !!etat[zone.verbe] || libres.some((p) => dansCercle(p.x, p.y, zone));
      }
      return etat;
    },
  };
}

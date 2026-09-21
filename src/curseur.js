// Le curseur de la souris (`D-108`).
//
// Demande de Xav (22/09), mot pour mot : reprendre le thème du **vif d'or** —
// une petite sphère avec **deux particules en orbite**, la **même traînée** que
// le feu follet, en **argenté neutre**. Et il l'a demandé en connaissance du
// risque : ma recommandation était de masquer le curseur manette en main, il
// préfère un curseur toujours visible. Ce module ne le masque donc jamais.
//
// LE POINT D'ARCHITECTURE, et il n'y en a qu'un. Un curseur animé ne peut pas
// être un `cursor: url(…)` (une image fixe), et un curseur entièrement dessiné
// dans le canvas du jeu a deux défauts qui se voient : il **traîne d'une frame**
// derrière le vrai pointeur, et il **n'existe pas au-dessus des menus DOM**,
// c'est-à-dire précisément là où la souris sert. D'où la route retenue, qui
// tranche par ce qui EXIGE d'être exact :
//
//   - la **tête** (l'orbe) est un vrai curseur CSS, dessiné UNE fois au
//     démarrage depuis `visuels.json` : exactement sous le pointeur, quel que
//     soit l'écran par-dessus, et zéro coût par frame ;
//   - les **particules** et la **traînée** vivent sur un calque de recouvrement
//     (`pointer-events: none`), qui a le droit de traîner d'une frame — c'est
//     une traînée. Pendant un geste rapide, les étincelles restent en arrière
//     de l'orbe : c'est ce qu'on veut voir, pas un défaut.
//
// La traînée n'est PAS un système nouveau : c'est une 3ᵉ instance de
// `poussiere.js` (la 1ʳᵉ est celle du héros, la 2ᵉ le sillage du follet), avec
// sa propre entrée de `data/effets.json`. Zéro ligne de mécanique de
// particules écrite ici — c'était la condition pour que ce ticket reste un
// ticket d'habillage.
//
// L'ORBE OCCULTE SA PROPRE ORBITE, gratuitement : le curseur système est
// composé PAR-DESSUS la page, donc la particule qui passe « derrière » la
// sphère disparaît derrière elle sans qu'une ligne de tri de profondeur soit
// écrite. Elle est seulement dessinée plus petite et plus pâle quand elle est
// du côté lointain de l'ellipse — le même trois quarts que tout le reste du
// jeu.
//
// Ce module ne connaît ni le jeu, ni la scène, ni l'UI : il n'est pas gelé
// sous `uiOuverte`, et c'est voulu — un curseur qui se fige quand on ouvre un
// menu, c'est un curseur qui a l'air cassé au moment où il sert le plus.
//
// Contrat « meilleur effort », comme `plein_ecran.js` et `souris.js` : ça
// marche, ou le jeu continue exactement comme avant (curseur du système). Le
// DOM n'est touché qu'à l'appel, jamais au niveau module.

import { empreinteParDefaut } from './structures.js';
import { echelleVisuel } from './visuels.js';
import { creerPoussiere, avancerPoussiere, bouffeesVisibles } from './poussiere.js';

// Marge autour de la silhouette dans le bitmap du curseur. Deux pixels CSS
// suffisent : ils absorbent l'anticrénelage du bord de l'orbe, qui serait
// sinon coupé net par le bord de l'image.
export const PADDING_BITMAP_PX = 2;

// Plafond des navigateurs sur un curseur d'image : au-delà, Chrome ignore la
// déclaration EN SILENCE et le joueur reste avec la flèche système sans que
// rien ne le dise. On préfère le voir venir (repli explicite, cf. `poserTete`).
export const TAILLE_MAX_CURSEUR_PX = 128;

// Marge d'effacement autour de ce qui a été dessiné la frame d'avant. Elle
// doit couvrir la plus grande silhouette du calque : au stick (`D-109`) c'est
// l'orbe lui-même, 17 unités de large, et non plus la seule particule d'orbite.
// Trop petite, elle laisserait des bavures permanentes à l'écran.
export const MARGE_EFFACEMENT_PX = 16;

// Côté lointain de l'ellipse d'orbite : la particule s'éloigne, donc elle
// rapetisse et pâlit. Deux nombres *provisoires*, à l'œil de Xav.
export const ECHELLE_PARTICULE_LOIN = 0.7;
export const ALPHA_PARTICULE_LOIN = 0.45;

// --- Les parts PURES : la boîte du bitmap et la géométrie de l'orbite -------

// La boîte du bitmap du curseur EST la boîte englobante de ses primitives,
// exactement comme l'empreinte d'une station est celle de son dessin (`D-78`).
// Conséquence voulue : redessiner l'orbe en données déplace tout seul la taille
// de l'image ET le point chaud — il n'y a aucun nombre à tenir à jour à côté.
export function boiteBitmapCurseur(visuel, echelle, { padding = PADDING_BITMAP_PX } = {}) {
  const boite = empreinteParDefaut(visuel, echelle * echelleVisuel(visuel));
  return {
    largeur: boite.w + padding * 2,
    hauteur: boite.h + padding * 2,
    // Le point chaud est l'ORIGINE de la silhouette (son 0,0), pas le centre
    // du bitmap : une silhouette dessinée de travers garde ainsi son point de
    // visée là où l'auteur l'a mis.
    chaudX: -boite.x + padding,
    chaudY: -boite.y + padding,
  };
}

// Position des particules en orbite à l'instant `tMs`, relativement au
// pointeur. Ellipse et non cercle : le jeu entier est vu de trois quarts, une
// orbite ronde jurerait. `profondeur` vaut +1 devant, −1 derrière — c'est le
// sinus de l'angle, et rien d'autre.
export function positionsOrbite(config, tMs) {
  const {
    nb_particules: nb, rayon_orbite_px: rayon, aplatissement, periode_ms: periode, sens, phase_rad: phase,
  } = config;
  const positions = [];
  if (!(nb > 0)) return positions;
  const tour = ((tMs / periode) % 1) * Math.PI * 2 * sens;
  for (let i = 0; i < nb; i += 1) {
    // Les particules sont réparties également sur l'orbite : deux d'entre
    // elles sont donc diamétralement opposées, sans que « 2 » soit écrit
    // nulle part — en mettre trois demain reste un réglage de données.
    const angle = tour + phase + (Math.PI * 2 * i) / nb;
    positions.push({
      dx: Math.cos(angle) * rayon,
      dy: Math.sin(angle) * rayon * aplatissement,
      profondeur: Math.sin(angle),
    });
  }
  return positions;
}

// Déplacement du curseur pour une frame, au stick droit (`D-109`). Pur.
//
// Deux choses qu'une simple multiplication ne donnerait pas. D'abord la
// NORME est bornée à 1 : sans ça, une diagonale plein stick irait √2 fois plus
// vite qu'un déplacement droit (c'est exactement le défaut relevé en `D-102`
// pour le clavier, sauf qu'ici on peut le corriger sans toucher au gameplay).
// Ensuite la COURBE : le stick rend une position, pas une vitesse, et un
// rapport linéaire donne un curseur nerveux au centre et sans finesse — un
// exposant > 1 rend le début de course lent, donc le pointage précis dans un
// menu, sans rien coûter à la vitesse de traversée.
export function deplacementStick(pointeur, config, deltaMs) {
  const { vitesse_stick_px_s: vitesse, courbe_stick: courbe } = config;
  if (!pointeur) return { dx: 0, dy: 0 };
  // Deux longueurs distinctes, et les confondre est le piège : `brut` sert à
  // donner la DIRECTION (on divise par lui, donc plein stick en diagonale
  // pointe bien à 45° sans être 1,41 fois plus long), `norme` sert à donner
  // la VITESSE (bornée à 1 : un stick carré rend jusqu'à 1,41 sur la
  // diagonale). Le premier jet divisait par `norme` et la diagonale allait
  // √2 fois trop vite — le test l'a attrapé.
  const brut = Math.hypot(pointeur.x || 0, pointeur.y || 0);
  if (!(brut > 0)) return { dx: 0, dy: 0 };
  const norme = Math.min(1, brut);
  const distance = (norme ** courbe) * vitesse * (deltaMs / 1000);
  return { dx: (pointeur.x / brut) * distance, dy: (pointeur.y / brut) * distance };
}

// Rectangle à effacer : l'union de deux boîtes, la seconde étant souvent
// `null` (première frame, ou rien dessiné). Pur, et c'est ce qui rend le
// calque quasi gratuit — on n'efface jamais l'écran entier.
export function unionRectangles(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// --- La part DOM ------------------------------------------------------------

export function creerCurseur({
  doc = null,
  fenetre = null,
  config = null,
  configSillage = null,
  visuelOrbe = null,
  visuelParticule = null,
  visuelSillage = null,
  dessinerVisuel = null,
} = {}) {
  const inerte = {
    disponible: () => false,
    avancer() {},
    dessiner() {},
    definirEffets() {},
    retirer() {},
  };
  if (!doc || !fenetre || !config || !visuelOrbe || typeof dessinerVisuel !== 'function') return inerte;

  let calque = null;
  let ctx = null;
  let dprPose = 0;
  // Position du pointeur en pixels CSS, et la précédente : la distance entre
  // les deux est ce qui nourrit la traînée. `null` tant qu'aucune SOURIS n'a
  // bougé — au doigt, ce module ne fait donc jamais rien, et ne coûte rien.
  let x = null;
  let y = null;
  let xPrec = null;
  let yPrec = null;
  let tMs = 0;
  let rectPrecedent = null;
  // La déclaration CSS de l'orbe, retenue telle quelle : passer au stick la
  // remplace par `none` (sinon le curseur système resterait planté où la
  // souris l'a laissé, et on en verrait deux), et revenir à la souris la
  // repose — sans régénérer le bitmap, qui n'a pas changé.
  let declarationTete = null;
  // Qui tient le pointeur : `souris` (la tête est le curseur système) ou
  // `stick` (la tête est dessinée sur le calque, comme les étincelles). Le
  // dernier qui bouge gagne — aucune bascule à faire à la main.
  let mode = 'souris';
  let sillage = configSillage && visuelSillage ? creerPoussiere(configSillage) : null;

  // --- La tête, en CSS ------------------------------------------------------

  function supporteImageSet() {
    try {
      return !!(fenetre.CSS && fenetre.CSS.supports
        && fenetre.CSS.supports('cursor', 'image-set(url("data:image/png;base64,") 2x) 0 0, auto'));
    } catch {
      return false;
    }
  }

  // Le bitmap est rendu à la densité de l'écran quand le navigateur sait lire
  // un `image-set` (donc net sur un écran HiDPI), à 1× sinon — sans quoi la
  // déclaration entière serait invalide et le joueur retrouverait la flèche
  // système, le pire des deux mondes.
  function poserTete() {
    try {
      const dpr = fenetre.devicePixelRatio || 1;
      const multiple = supporteImageSet() ? dpr : 1;
      const boite = boiteBitmapCurseur(visuelOrbe, config.echelle);
      const largeur = Math.ceil(boite.largeur * multiple);
      const hauteur = Math.ceil(boite.hauteur * multiple);
      if (largeur > TAILLE_MAX_CURSEUR_PX || hauteur > TAILLE_MAX_CURSEUR_PX) {
        // Repli explicite plutôt qu'un refus muet du navigateur : la variable
        // n'est pas posée, la feuille de style retombe sur `auto`/`pointer`.
        console.warn(
          `curseur.js : orbe de ${largeur}×${hauteur} px, au-delà du plafond de ${TAILLE_MAX_CURSEUR_PX} px `
          + '— curseur système conservé (baisser `echelle` sur `effet_curseur`)',
        );
        return false;
      }
      const bitmap = doc.createElement('canvas');
      bitmap.width = largeur;
      bitmap.height = hauteur;
      const ctxBitmap = bitmap.getContext('2d');
      if (!ctxBitmap) return false;
      // Contexte à nous, transform posée à neuf : rien ne peut fuir vers le
      // contexte du jeu (la règle des calques ne vise que celui-là).
      ctxBitmap.setTransform(multiple, 0, 0, multiple, 0, 0);
      dessinerVisuel(ctxBitmap, visuelOrbe, boite.chaudX, boite.chaudY, { echelle: config.echelle });
      const url = bitmap.toDataURL('image/png');
      const chaud = `${Math.round(boite.chaudX)} ${Math.round(boite.chaudY)}`;
      const valeur = multiple === 1
        ? `url("${url}") ${chaud}, auto`
        : `image-set(url("${url}") ${multiple}x) ${chaud}, auto`;
      declarationTete = valeur;
      doc.documentElement.style.setProperty('--curseur-jeu', valeur);
      dprPose = dpr;
      return true;
    } catch {
      // Muet, par contrat : le jeu se joue très bien avec la flèche système.
      return false;
    }
  }

  // --- Le calque, pour l'orbite et la traînée -------------------------------

  function redimensionner() {
    if (!calque) return;
    const dpr = fenetre.devicePixelRatio || 1;
    // La taille CSS vient de la FEUILLE DE STYLE (`clientWidth`), pas de
    // `innerWidth` : c'est elle qui décide de la place réelle du calque, et
    // les deux diffèrent d'un pixel ici ou là (barre de défilement, zoom du
    // navigateur). Mesurer ce que le style a donné évite que le dessin soit
    // mis à l'échelle d'un cheveu sans que personne ne sache pourquoi.
    const largeurCss = calque.clientWidth || fenetre.innerWidth || 0;
    const hauteurCss = calque.clientHeight || fenetre.innerHeight || 0;
    const largeur = Math.max(1, Math.round(largeurCss * dpr));
    const hauteur = Math.max(1, Math.round(hauteurCss * dpr));
    if (calque.width !== largeur || calque.height !== hauteur) {
      calque.width = largeur;
      calque.height = hauteur;
      rectPrecedent = null;
    }
    // Le calque se dessine en pixels CSS : c'est l'unité dans laquelle arrivent
    // `clientX`/`clientY`, et la seule où l'orbite garde la même taille d'un
    // écran à l'autre. La conversion se fait ICI et nulle part ailleurs —
    // même leçon que `D-48`, où un menu lisait une largeur physique comme si
    // elle était en pixels CSS.
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // L'écran a changé de densité (fenêtre glissée sur un autre moniteur) :
    // le bitmap du curseur, lui, avait été rendu pour l'ancienne.
    if (dpr !== dprPose) poserTete();
  }

  try {
    calque = doc.createElement('canvas');
    calque.className = 'curseur-calque';
    ctx = calque.getContext('2d');
    doc.body.appendChild(calque);
  } catch {
    calque = null;
    ctx = null;
  }

  const tetePosee = poserTete();
  redimensionner();

  // Une souris, jamais un doigt : `pointermove` parle pour les trois (souris,
  // stylet, doigt), et c'est bien ce qu'on veut — un seul écouteur, qui refuse
  // explicitement le tactile plutôt que d'ignorer la question.
  function surMouvement(evenement) {
    const genre = evenement && evenement.pointerType;
    if (genre && genre !== 'mouse' && genre !== 'pen') return;
    passerEnMode('souris');
    x = evenement.clientX;
    y = evenement.clientY;
    if (xPrec === null) { xPrec = x; yPrec = y; }
  }

  // `D-109` : le seul endroit qui décide qui porte la tête. En mode stick, la
  // variable vaut `none` — c'est-à-dire que la feuille de style continue de
  // décider, y compris au-dessus d'une carte de menu (qui retomberait sinon
  // sur son `pointer`), et le code ne connaît toujours aucune valeur de style
  // qu'il n'ait pas fabriquée lui-même.
  function passerEnMode(nouveau) {
    if (mode === nouveau) return;
    mode = nouveau;
    try {
      if (nouveau === 'stick') doc.documentElement.style.setProperty('--curseur-jeu', 'none');
      else if (declarationTete) doc.documentElement.style.setProperty('--curseur-jeu', declarationTete);
    } catch { /* muet, par contrat */ }
  }

  // Pointeur sorti de la fenêtre : la traînée s'éteint plutôt que de rester
  // figée au bord de l'écran.
  function surSortie(evenement) {
    if (evenement && evenement.relatedTarget) return;
    x = null;
    y = null;
    xPrec = null;
    yPrec = null;
  }

  try {
    doc.addEventListener('pointermove', surMouvement, { passive: true });
    doc.addEventListener('pointerout', surSortie, { passive: true });
    fenetre.addEventListener('resize', redimensionner);
  } catch {
    // Contrat « meilleur effort » : la tête CSS, elle, est déjà posée.
  }

  function avancer(deltaMs, pointeur = null) {
    const { dx: dxStick, dy: dyStick } = deplacementStick(pointeur, config, deltaMs);
    if (dxStick !== 0 || dyStick !== 0) {
      passerEnMode('stick');
      // Le stick réveille le curseur au CENTRE de la fenêtre quand aucune
      // souris n'a jamais bougé : c'est la seule position qui ne suppose rien
      // (un coin ferait croire à un bug, et l'origine est hors de l'écran).
      if (x === null) {
        x = (calque ? calque.clientWidth : 0) / 2;
        y = (calque ? calque.clientHeight : 0) / 2;
        xPrec = x;
        yPrec = y;
      }
      // Borné à la fenêtre, comme l'est un vrai curseur : sans ça il part
      // dans le décor et on ne le retrouve qu'en traversant l'écran.
      x = Math.max(0, Math.min(calque ? calque.clientWidth : x, x + dxStick));
      y = Math.max(0, Math.min(calque ? calque.clientHeight : y, y + dyStick));
    }
    if (x === null || !sillage) return;
    tMs += deltaMs;
    const dx = x - xPrec;
    const dy = y - yPrec;
    // `depuisX`/`depuisY` : une souris fait couramment 60 px en une frame, et
    // sans le point de départ toutes les bouffées d'une même frame naîtraient
    // au point d'arrivée — une grappe, pas une traînée. C'est le seul endroit
    // du jeu où la vitesse rend la différence visible.
    avancerPoussiere(sillage, {
      x, y, depuisX: xPrec, depuisY: yPrec, distancePx: Math.hypot(dx, dy), deltaMs, emettre: true,
    });
    xPrec = x;
    yPrec = y;
  }

  function dessiner() {
    if (!ctx) return;
    // On efface ce qu'on a peint la frame d'avant, et rien de plus : le calque
    // couvre tout l'écran, l'effacer en entier à chaque frame serait le seul
    // vrai coût de ce ticket.
    if (rectPrecedent) {
      ctx.clearRect(rectPrecedent.x, rectPrecedent.y, rectPrecedent.w, rectPrecedent.h);
      rectPrecedent = null;
    }

    let peint = null;
    const noter = (px, py) => {
      peint = unionRectangles(peint, {
        x: px - MARGE_EFFACEMENT_PX,
        y: py - MARGE_EFFACEMENT_PX,
        w: MARGE_EFFACEMENT_PX * 2,
        h: MARGE_EFFACEMENT_PX * 2,
      });
    };

    if (sillage && visuelSillage) {
      for (const bouffee of bouffeesVisibles(sillage)) {
        dessinerVisuel(ctx, visuelSillage, bouffee.x, bouffee.y, {
          alpha: bouffee.alpha, echelle: bouffee.echelle,
        });
        noter(bouffee.x, bouffee.y);
      }
    }

    // En mode stick, l'orbe est dessiné ICI : le curseur du système ne peut pas
    // être déplacé par la page (aucune API ne le permet, et c'est très bien
    // ainsi), donc c'est le calque qui le porte. Même silhouette, même
    // fonction de dessin, même échelle — rien de ce que Xav a validé ne
    // change, seul le porteur change. Dessiné AVANT les étincelles pour que
    // celles du premier plan passent devant, comme le compositeur du
    // navigateur le fait pour l'autre mode.
    if (x !== null && mode === 'stick') {
      dessinerVisuel(ctx, visuelOrbe, x, y, { echelle: config.echelle });
      noter(x, y);
    }

    if (x !== null && visuelParticule) {
      for (const p of positionsOrbite(config, tMs)) {
        // Côté lointain de l'ellipse : plus petite et plus pâle. C'est la
        // seule profondeur qu'on écrive — l'occultation par l'orbe est faite
        // par le compositeur du navigateur, gratuitement.
        const loin = p.profondeur < 0;
        dessinerVisuel(ctx, visuelParticule, x + p.dx, y + p.dy, {
          alpha: loin ? ALPHA_PARTICULE_LOIN : 1,
          echelle: loin ? ECHELLE_PARTICULE_LOIN : 1,
        });
        noter(x + p.dx, y + p.dy);
      }
    }

    rectPrecedent = peint;
  }

  return {
    disponible: () => tetePosee,
    // Palier D de `specs/09_reglages-graphiques.md` (§4.5) : le curseur suit
    // le changement de preset comme le reste, sans recharger. Deux
    // configurations, rien d'autre — ce module ne saura jamais qu'un preset
    // existe, il reçoit des nombres déjà multipliés. La tête n'est pas
    // redessinée : sa silhouette ne dépend d'aucun levier, et la regénérer
    // ferait clignoter le pointeur pour rien.
    definirEffets(nouvelleConfig, nouvelleConfigSillage) {
      try {
        if (nouvelleConfig) config = nouvelleConfig;
        configSillage = nouvelleConfigSillage || configSillage;
        // Recréée, donc VIDÉE : même geste qu'à l'entrée en scène — une
        // traînée dessinée à l'ancienne capacité n'a rien à faire là.
        sillage = configSillage && visuelSillage ? creerPoussiere(configSillage) : null;
      } catch { /* muet, par contrat */ }
    },
    // Enrobage « meilleur effort » à la frontière de l'API publique, jamais
    // chez l'appelant : un curseur ne doit pas pouvoir coûter une frame de jeu
    // (la boucle y survit depuis `D-71`, mais une frame perdue reste une frame
    // perdue).
    avancer(deltaMs, pointeur) { try { avancer(deltaMs, pointeur); } catch { /* muet, par contrat */ } },
    dessiner() { try { dessiner(); } catch { /* muet, par contrat */ } },
    retirer() {
      try {
        doc.removeEventListener('pointermove', surMouvement);
        doc.removeEventListener('pointerout', surSortie);
        fenetre.removeEventListener('resize', redimensionner);
        if (calque && calque.parentNode) calque.parentNode.removeChild(calque);
        doc.documentElement.style.removeProperty('--curseur-jeu');
      } catch { /* muet, par contrat */ }
    },
  };
}

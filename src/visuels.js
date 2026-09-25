// Interprète visuels.json (03_grotte-polish §3.3) : UNE seule fonction de
// rendu pour toute silhouette du jeu (héros, follets, monstres, leviers,
// futurs motifs de décor) — plus aucune forme d'entité dessinée inline dans
// render.js/main.js#dessiner(). Composition pure (aucun état, aucune
// lecture de ctx.canvas.width/height : dessinerVisuel écrit en unités
// logiques sous la transform déjà active, cf. la règle de méthode née de
// SD_dialogues-invisibles) — testée sur un faux ctx enregistreur, jamais sur
// un vrai rendu (contrainte de méthode, canvas jamais exercé headless).
//
// Direction artistique (Xav, « assemblage moderne ») : une silhouette est un
// empilement ORDONNÉ de primitives simples (cercle/ellipse/rect/polygone/
// ligne/dégradé), jamais un sprite bitmap ni un ctx.filter (support/perf
// mobile incertains) — le volume vient de formes annexes (reflet, facette
// éclairée) plutôt que d'un flou.

import { poseDePiece } from './orientation.js';

// Convention de taille de référence pour les silhouettes de follet (§3.1) :
// visuels.json les dessine à ce rayon-là ; chaque appelant (scène, HUD, écran
// de choix) calcule `echelle = tailleVoulue / TAILLE_REFERENCE_FOLLET_PX`
// plutôt que de dupliquer les primitives à plusieurs tailles — un seul
// dessin, mis à l'échelle partout où il apparaît.
export const TAILLE_REFERENCE_FOLLET_PX = 7;

// MT_heros-echelle_2026-09-19 : échelle propre d'une silhouette, déclarée en
// données (`echelle` sur l'entrée de visuels.json), 1 par défaut pour tout
// visuel qui ne la déclare pas — un catalogue existant reste valide tel quel.
// Exposée plutôt que lue inline pour que le rendu ET la boîte de collision du
// héros dérivent du MÊME champ par la MÊME fonction (même esprit que
// structures.js#tournerEmpreinte pour la rotation).
export function echelleVisuel(visuel) {
  const valeur = visuel && visuel.echelle;
  return typeof valeur === 'number' && valeur > 0 ? valeur : 1;
}

function hexVersRgba(hex, alpha = 1) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Un dégradé (linéaire horizontal/vertical, ou radial pour `degrade_radial`)
// est centré sur l'origine LOCALE (0,0) du repère déjà translaté/pivoté par
// dessinerPrimitive — jamais recalculé en coordonnées monde ici.
function creerDegrade(ctx, primitive) {
  const { direction = 'horizontal', stops } = primitive.degrade;
  const largeur = primitive.w || 0;
  const hauteur = primitive.h || 0;
  let degrade;
  if (direction === 'radial' || primitive.forme === 'degrade_radial') {
    degrade = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(largeur, hauteur) / 2);
  } else if (direction === 'vertical') {
    degrade = ctx.createLinearGradient(0, -hauteur / 2, 0, hauteur / 2);
  } else {
    degrade = ctx.createLinearGradient(-largeur / 2, 0, largeur / 2, 0);
  }
  for (const stop of stops) {
    degrade.addColorStop(stop.offset, hexVersRgba(stop.couleur, stop.alpha ?? 1));
  }
  return degrade;
}

// Couleur effective d'une primitive : la teinte passée à l'appel (couleur du
// compagnon pour le héros, blanc pour un monstre en flash, couleur d'état
// pour un levier…) ne s'applique QU'aux primitives explicitement marquées
// `teinte: true` (schemas.js impose que ceci n'existe que si le visuel entier
// se déclare `teintable: true`) — les autres (reflets, facettes) gardent
// toujours leur propre couleur d'auteur.
function resoudreStyle(ctx, primitive, teinte) {
  const couleurBase = primitive.teinte && teinte ? teinte : primitive.couleur;
  ctx.fillStyle = primitive.degrade ? creerDegrade(ctx, primitive) : couleurBase;
  return couleurBase;
}

function tracerChemin(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function dessinerPrimitive(ctx, primitive, teinte) {
  ctx.save();
  ctx.translate(primitive.dx || 0, primitive.dy || 0);
  if (primitive.rotation) ctx.rotate((primitive.rotation * Math.PI) / 180);
  if (primitive.alpha != null) ctx.globalAlpha *= primitive.alpha;

  switch (primitive.forme) {
    case 'cercle': {
      resoudreStyle(ctx, primitive, teinte);
      ctx.beginPath();
      ctx.arc(0, 0, primitive.w / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ellipse':
    case 'degrade_radial': {
      resoudreStyle(ctx, primitive, teinte);
      ctx.beginPath();
      ctx.ellipse(0, 0, primitive.w / 2, primitive.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rect': {
      resoudreStyle(ctx, primitive, teinte);
      ctx.fillRect(-primitive.w / 2, -primitive.h / 2, primitive.w, primitive.h);
      break;
    }
    case 'polygone': {
      resoudreStyle(ctx, primitive, teinte);
      tracerChemin(ctx, primitive.points);
      ctx.fill();
      break;
    }
    case 'ligne': {
      const couleur = primitive.teinte && teinte ? teinte : primitive.couleur;
      ctx.strokeStyle = couleur;
      ctx.lineWidth = primitive.epaisseur || 1;
      tracerChemin(ctx, primitive.points);
      ctx.stroke();
      break;
    }
    default:
      // Ne doit jamais arriver en jeu réel : schemas.js#validerVisuel refuse
      // au boot toute forme inconnue — une primitive invalide n'atteint donc
      // jamais dessinerVisuel avec des données validées. Un échec dur ici
      // (plutôt qu'un dessin silencieusement vide) protège malgré tout un
      // appel direct avec des données non validées (tests, outillage futur).
      throw new Error(`visuels.js#dessinerPrimitive : forme "${primitive.forme}" inconnue`);
  }
  ctx.restore();
}

// Point d'entrée unique (§3.3) : dessine `visuel` (une entrée de
// visuels.json) à la position logique (x,y). `options.teinte` (couleur CSS)
// ne s'applique qu'aux primitives `teinte: true` ; `options.alpha` module la
// silhouette entière (ex. follet qui s'éteint en fin d'intro, palier 4) ;
// `options.echelle` la redimensionne uniformément (HUD/écran de choix vs
// scène, cf. TAILLE_REFERENCE_FOLLET_PX) ; `options.rotation` (degrés) la
// pivote entièrement — utilisé par le décor (§3.4 : "légère variation
// d'inclinaison par graine" sur l'herbe, decor.js#genererDecor) plutôt que de
// dupliquer une silhouette pré-tournée pour chaque instance.
export function dessinerVisuel(ctx, visuel, x, y, options = {}) {
  const { teinte = null, alpha = 1, echelle = 1, rotation = 0, miroir = false, orientation = null } = options;
  // MT_heros-echelle_2026-09-19 : `visuel.echelle` est l'échelle PROPRE de la
  // silhouette (sa taille de référence en données), multipliée par l'échelle
  // d'INSTANCE passée à l'appel (une station tournée, un follet au HUD). Deux
  // notions distinctes qui se composent, jamais l'une écrasant l'autre — et
  // surtout : c'est le SEUL endroit où l'échelle propre du héros est lue pour
  // le rendu, la hitbox lisant le même champ (main.js#rayonHeros), pour que
  // visuel et collision ne puissent plus diverger comme ils le faisaient
  // (rayon visuel 11 px contre rayon de collision 10 px avant cette fiche).
  const echelleEffective = echelle * echelleVisuel(visuel);
  ctx.save();
  ctx.translate(x, y);
  if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
  if (echelleEffective !== 1) ctx.scale(echelleEffective, echelleEffective);
  // `options.miroir` (polish ambiance, 23/09) : retournement HORIZONTAL autour
  // de l'ancre — une case de sol ou un arbre de la forêt tiré en miroir par
  // `decor.js#varianteTuile`. Jamais vertical : la lumière vient d'en haut
  // (reflets, ombres portées), et un brin d'herbe ne pousse pas vers le sol.
  if (miroir) ctx.scale(-1, 1);
  if (alpha !== 1) ctx.globalAlpha *= alpha;

  // Ombre portée (§3.3) : ellipse sombre dessinée AVANT les primitives, sous
  // la silhouette — jamais teintable (une ombre ne prend pas la couleur du
  // compagnon).
  if (visuel.ombre) {
    const { dy, w, h, alpha: alphaOmbre } = visuel.ombre;
    ctx.save();
    ctx.translate(0, dy);
    ctx.fillStyle = `rgba(0, 0, 0, ${alphaOmbre})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const primitive of visuel.primitives) {
    // `D-229` : une primitive qui appartient à une PIÈCE (`piece`, le visage
    // du héros) suit la pose que le visuel déclare pour `options.orientation`
    // — cachée, ou décalée puis resserrée à l'horizontale autour de l'ancre.
    // Sans orientation, ou sans pose déclarée, elle se dessine telle quelle :
    // la pose de référence est le dessin validé en jeu.
    const pose = primitive.piece === undefined ? undefined : poseDePiece(visuel, orientation, primitive.piece);
    if (pose === null) continue;
    if (pose === undefined) {
      dessinerPrimitive(ctx, primitive, teinte);
      continue;
    }
    ctx.save();
    ctx.translate(pose.dx ?? 0, 0);
    if (pose.echelle_x !== undefined) ctx.scale(pose.echelle_x, 1);
    dessinerPrimitive(ctx, primitive, teinte);
    ctx.restore();
  }

  ctx.restore();
}

// `D-191` : le liseré d'un visuel (`surlignage`) est-il allumé à cette phase ?
// `phase` est le nom de la phase du cycle, ou `null` dans une scène sans cycle
// (la Grotte n'a pas de nuit, elle est seulement sombre). Pure : le même
// verdict sert au sol (render.js) et dans les icônes des menus
// (ui/icone_canvas.js), jamais deux règles.
export function surlignageActif(visuel, phase) {
  return !!(visuel && visuel.surlignage && phase && visuel.surlignage.phases.includes(phase));
}

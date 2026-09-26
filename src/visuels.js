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

import { definitionPiece, poseVisible, poseAAngle, matricePose, primitivePosee, matriceAnimation, angleDePiece, poserPoint } from './poses.js';

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
// `D-256` : un palier `teinte: true` prend la teinte passée à l'appel (le
// halo de l'œil du héros suit la couleur du follet, comme l'iris) ; sans
// teinte, sa propre couleur. La teinte est un hex, comme toutes celles du jeu.
// `D-263` : `centre` décale le dégradé dans ce repère — la lumière d'un
// volume (la cape, la capuche) vient d'en haut à gauche, pas de son milieu.
function creerDegrade(ctx, primitive, teinte) {
  const { direction = 'horizontal', stops, centre: [cx, cy] = [0, 0] } = primitive.degrade;
  const largeur = primitive.w || 0;
  const hauteur = primitive.h || 0;
  let degrade;
  if (direction === 'elliptique') {
    // `D-257` : les anneaux suivent l'ellipse — `dessinerPrimitive` a déjà
    // écrasé le repère à la hauteur, le dégradé y est un cercle de la largeur.
    degrade = ctx.createRadialGradient(cx, cy, 0, cx, cy, largeur / 2);
  } else if (direction === 'radial' || primitive.forme === 'degrade_radial') {
    degrade = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(largeur, hauteur) / 2);
  } else if (direction === 'vertical') {
    degrade = ctx.createLinearGradient(cx, cy - hauteur / 2, cx, cy + hauteur / 2);
  } else {
    degrade = ctx.createLinearGradient(cx - largeur / 2, cy, cx + largeur / 2, cy);
  }
  for (const stop of stops) {
    degrade.addColorStop(stop.offset, hexVersRgba(stop.teinte && teinte ? teinte : stop.couleur, stop.alpha ?? 1));
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
  ctx.fillStyle = primitive.degrade ? degradeGarde(ctx, primitive, teinte) : couleurBase;
  return couleurBase;
}

// `D-271` : un dégradé ne dépend que de sa primitive et de la teinte ; ses
// coordonnées se lisent dans la transform du moment où il remplit, pas de
// celui où il est créé. Il se garde donc, par contexte, primitive et teinte,
// au lieu d'être refait à chaque frame (le héros poli en porte une vingtaine :
// le banc l'a vu, +18 % de `dessiner()` sous CPU bridé ×6). Une primitive
// pliée ou reflétée est un objet gardé à part (`poses.js`) : elle a le sien.
const degradesGardes = new WeakMap();
function degradeGarde(ctx, primitive, teinte) {
  let parPrimitive = degradesGardes.get(ctx);
  if (!parPrimitive) degradesGardes.set(ctx, (parPrimitive = new WeakMap()));
  let parTeinte = parPrimitive.get(primitive);
  if (!parTeinte) parPrimitive.set(primitive, (parTeinte = new Map()));
  let degrade = parTeinte.get(teinte);
  if (!degrade) parTeinte.set(teinte, (degrade = creerDegrade(ctx, primitive, teinte)));
  return degrade;
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
      // `D-257` : un dégradé `elliptique` (l'ouverture de la capuche, plus
      // large que haute) se peint dans un repère écrasé à la hauteur : ses
      // anneaux suivent l'ellipse, quand un dégradé radial reste un cercle
      // que l'ellipse coupe. Et un `trou` (une ellipse concentrique) perce la
      // forme — la façade de la capuche, devant l'œil qu'on voit au travers.
      const { w, h, trou } = primitive;
      const k = primitive.degrade && primitive.degrade.direction === 'elliptique' ? h / w : 1;
      if (k !== 1) ctx.scale(1, k);
      resoudreStyle(ctx, primitive, teinte);
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2 / k, 0, 0, Math.PI * 2);
      if (trou) {
        ctx.ellipse(0, 0, trou.w / 2, trou.h / 2 / k, 0, 0, Math.PI * 2);
        ctx.fill('evenodd');
      } else {
        ctx.fill();
      }
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

// Une pièce posée : la matrice de sa pose (`poses.js#matricePose`) sur le
// canvas, puis la primitive pliée ou reflétée qu'elle dessine.
function dessinerPosee(ctx, visuel, piece, primitive, pose, teinte) {
  // Spec 16 : une pièce qui paraît ou s'efface entre deux clés.
  if (pose.alpha !== undefined) ctx.globalAlpha *= pose.alpha;
  ctx.transform(...matricePose(visuel, piece, pose));
  dessinerPrimitive(ctx, primitivePosee(visuel, piece, primitive, pose), teinte);
}

// La DÉCOUPE d'une pièce par la silhouette d'une autre (`decoupe` de la
// pièce). L'ouverture de la capuche est DANS la capuche : quand elle glisse
// vers le bord, de profil, ce qui passe au-delà n'est plus vu — ni le trou,
// ni son liseré, ni sa lueur (Xav, 26/09 : « la partie gauche du trou devrait
// donc logiquement ne pas être apparente »). L'œil, lui, ne se découpe pas :
// il est DEVANT. La silhouette est la primitive `silhouette` de la pièce
// nommée, posée comme cette pièce dans la même direction ; son chemin se trace
// sous sa pose, la découpe s'applique dans la transform d'avant — un chemin
// garde les coordonnées où il a été tracé.
function decouperParSilhouette(ctx, visuel, poseDe, animation, piece) {
  const silhouette = visuel.primitives.find((p) => p.piece === piece && p.silhouette);
  const pose = poseDe(piece);
  const avant = ctx.getTransform();
  const anime = matriceAnimation(visuel, piece, animation);
  if (anime) ctx.transform(...anime);
  const posee = pose ? primitivePosee(visuel, piece, silhouette, pose) : silhouette;
  if (pose) ctx.transform(...matricePose(visuel, piece, pose));
  ctx.translate(posee.dx || 0, posee.dy || 0);
  if (posee.rotation) ctx.rotate((posee.rotation * Math.PI) / 180);
  tracerChemin(ctx, posee.points);
  ctx.setTransform(avant);
  ctx.clip();
}

// LE RIDEAU d'une pièce qui passe derrière (`passe_derriere`, spec 16) : en
// quittant la vue, l'œil ne s'éteint pas, la capuche passe devant lui. Elle le
// couvre du côté de l'axe du héros — la tête est là, entre nous et lui — vers
// l'extérieur, où il dépasse le plus longtemps. `pose.rideau` : 0, rien de
// couvert ; 1, tout. En données, sur la pièce : `debut` (la part du passage où
// le rideau n'a pas encore bougé) et `fondu` (la largeur de son bord doux).
// Le bord est un arc, le flanc de la capuche qui passe devant (une coupe
// droite tranchait le globe en demi-disque) ; il arrive en fondu, des anneaux
// de plus en plus effacés — disjoints, pour que les reflets du globe ne se
// dessinent jamais deux fois l'un sur l'autre. Provisoires tant que Xav ne les
// a pas vus en jeu : le rayon du flanc, la montée (linéaire), le nombre
// d'anneaux (sous le pixel à la taille du jeu).
const RAYON_FLANC_RIDEAU = 6;
const MONTEE_RIDEAU = 1;
const ANNEAUX_FONDU_RIDEAU = 4;
// L'éclat d'une lumière projetée, puissance de la part visible de sa source
// (`D-279`). Xav, 26/09, au banc : à 221° l'œil n'est plus visible qu'à 18 %,
// la lueur sur l'épaule doit y garder 28 % (0,178 ** 0,74 ≈ 0,28). À 1,
// l'éclat suivrait la source exactement. Provisoire, non validé en jeu.
const ECLAT_SOURCE_EXPOSANT = 0.74;
// La part couverte d'une pièce qui passe derrière (0 à 1), son `debut` passé.
function avanceRideau(visuel, piece, pose) {
  if (!pose || !(pose.rideau > 0)) return 0;
  const reglage = definitionPiece(visuel, piece).passe_derriere;
  const debut = reglage && reglage !== true ? reglage.debut ?? 0 : 0;
  return Math.max(0, (pose.rideau - debut) / (1 - debut)) ** MONTEE_RIDEAU;
}

function dessinerSousRideau(ctx, visuel, piece, pose, dessiner, decouperDevant = null) {
  // Une pièce qui en `suit` une autre sans passer derrière elle-même (la
  // lueur de l'ouverture) reçoit son rideau : elle s'éteint comme avant.
  const reglage = definitionPiece(visuel, piece).passe_derriere;
  if (!reglage) {
    ctx.save();
    ctx.globalAlpha *= 1 - pose.rideau;
    dessiner();
    ctx.restore();
    return;
  }
  const { debut = 0, fondu = 0, bord: forme = 'convexe', rayon = RAYON_FLANC_RIDEAU, ombre = [1] } = reglage === true ? {} : reglage;
  const avance = avanceRideau(visuel, piece, pose);
  if (avance <= 0) return dessiner();
  const [cx, cy] = poserPoint(visuel, piece, pose, definitionPiece(visuel, piece).origine ?? [0, 0]);
  const r = Math.max(...visuel.primitives.filter((p) => p.piece === piece).map((p) => Math.max(p.w ?? 0, p.h ?? 0) / 2)) * (pose.echelle ?? 1);
  const dehors = Math.sign(cx) || -1;
  const concave = forme === 'concave';
  // Le bord du flanc : du bord intérieur de la pièce, fondu compris (rien de
  // couvert), à son bord extérieur (tout). Concave, ses cornes (au-dessus et
  // au-dessous de l'axe) précèdent son milieu : il part d'un fondu plus loin.
  const course = concave ? 2 * (r + fondu) : 2 * r + fondu;
  const bord = cx - dehors * (r + fondu) + dehors * course * avance;
  // La part COUVERTE, élargie de `e` vers la pièce (0 : la couverte ; `fondu` :
  // jusqu'au bout du bord doux). Convexe (`D-278`) : un disque côté axe.
  // Concave (Xav, 26/09 : « donner une forme concave à la bordure de l'ombre
  // […] coller à la forme de l'ouverture ») : le flanc de l'ouverture vu
  // depuis le globe, le côté axe d'un disque posé vers l'extérieur, hors du
  // disque — un demi-plan creusé.
  // `cadre` : tout le reste, en pair-impair (le cadre d'abord, l'ordre de `D-278`).
  const couverte = (e, cadre = false) => {
    ctx.beginPath();
    if (cadre) ctx.rect(-100, -100, 200, 200);
    if (!concave) return ctx.arc(bord - dehors * rayon, cy, rayon + e, 0, Math.PI * 2);
    const centre = bord + dehors * rayon;
    const rr = Math.max(0, rayon - e);
    ctx.moveTo(centre, cy - 100);
    ctx.lineTo(centre - dehors * 200, cy - 100);
    ctx.lineTo(centre - dehors * 200, cy + 100);
    ctx.lineTo(centre, cy + 100);
    ctx.lineTo(centre, cy + rr);
    ctx.arc(centre, cy, rr, Math.PI / 2, -Math.PI / 2, dehors < 0);
    ctx.closePath();
  };
  const horsDe = (e) => { couverte(e, true); ctx.clip('evenodd'); };
  // L'ombre (Xav, 26/09 : « c'est une ombre pas un masque ») : l'opacité de
  // la part couverte au fil du passage, par paliers égaux de `ombre` (défaut :
  // pleine d'un bout à l'autre, l'occlusion de `D-278`). Le bord doux passe de
  // cette ombre au plein éclat. Provisoire, non validé en jeu.
  const pas = (ombre.length - 1) * avance;
  const i = Math.min(Math.floor(pas), ombre.length - 2);
  const opacite = ombre.length === 1 ? ombre[0] : ombre[i] + (ombre[i + 1] - ombre[i]) * (pas - i);
  const n = fondu > 0 ? ANNEAUX_FONDU_RIDEAU : 0;
  for (let k = 0; k <= n; k += 1) {
    ctx.save();
    horsDe((fondu * k) / (n || 1));
    if (k < n) {
      couverte((fondu * (k + 1)) / (n || 1));
      ctx.clip();
      ctx.globalAlpha *= 1 - opacite + (opacite * (k + 1)) / (n + 1);
    }
    dessiner();
    ctx.restore();
  }
  // Hors de la silhouette de ce qui passe devant (`devant`), rien : une ombre
  // se pose SUR le globe, elle ne le montre pas là où la capuche le cache.
  if (opacite < 1) {
    ctx.save();
    if (decouperDevant) decouperDevant();
    couverte(0);
    ctx.clip();
    ctx.globalAlpha *= 1 - opacite;
    dessiner();
    ctx.restore();
  }
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
  const { teinte = null, alpha = 1, echelle = 1, rotation = 0, miroir = false, orientation = null, angle = null, animation = null } = options;
  // Spec 16 : `options.angle` (degrés, 0 = est, 90 = sud) montre les pièces à
  // tout angle, entre les directions déclarées ; sinon `options.orientation`,
  // une direction. Palier E : une pièce d'`inertie` se pose à son angle à
  // elle (la capuche en retard sur le regard) ; sa découpe suit, puisqu'elle
  // passe par ce même `poseDe`.
  const poseDe = angle !== null
    ? (piece) => poseAAngle(visuel, angleDePiece(visuel, animation, angle, piece), piece)
    : (piece) => poseVisible(visuel, orientation, piece);
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
  // Spec 16, palier C : `options.animation` (`{ tempsMs, marche }`) fait
  // respirer et marcher le visuel (`poses.js#matriceAnimation`) — l'ombre
  // portée reste au sol.
  const animeTout = matriceAnimation(visuel, null, animation);
  if (animeTout) ctx.transform(...animeTout);

  for (const primitive of visuel.primitives) {
    // Une primitive d'une PIÈCE (le héros : sa capuche, l'ouverture, l'œil)
    // suit la pose que le visuel déclare pour son orientation (`poses.js`) :
    // cachée (`null`, et une pièce `cachee` là où rien ne la pose), ou
    // déplacée, tournée, pliée. Sans pose, elle se dessine telle qu'elle est
    // écrite.
    const { piece } = primitive;
    if (piece === undefined) {
      dessinerPrimitive(ctx, primitive, teinte);
      continue;
    }
    const definition = definitionPiece(visuel, piece);
    const pose = poseDe(piece);
    if (pose === null) continue;
    // Une LUMIÈRE PROJETÉE (`source` de la pièce : la lueur de l'œil sur la
    // cape, `D-279`) brille de ce qu'on voit de sa source : pleine tant que
    // l'œil est entier, éteinte quand la capuche l'a couvert ou qu'il est
    // caché. Sa place, elle, est à elle (elle glisse sur l'épaule). Elle
    // baisse un peu moins vite que sa source ne se couvre : la lumière
    // déborde encore quand l'œil est presque caché (`ECLAT_SOURCE_EXPOSANT`).
    let eclat = 1;
    if (definition.source) {
      const poseSource = poseDe(definition.source);
      if (poseSource === null) continue;
      eclat = (1 - avanceRideau(visuel, definition.source, poseSource)) ** ECLAT_SOURCE_EXPOSANT;
      if (eclat <= 0) continue;
    }
    const anime = matriceAnimation(visuel, piece, animation);
    if (pose === undefined && !definition.decoupe && !anime && eclat === 1) {
      dessinerPrimitive(ctx, primitive, teinte);
      continue;
    }
    ctx.save();
    if (eclat < 1) ctx.globalAlpha *= eclat;
    if (definition.decoupe) decouperParSilhouette(ctx, visuel, poseDe, animation, definition.decoupe);
    // L'ombre du rideau se découpe par la silhouette de la pièce qui passe
    // devant, dans la transform d'avant l'animation (celle de la découpe).
    const devant = pose && pose.rideau > 0 ? definition.passe_derriere?.devant : undefined;
    const avantAnime = devant ? ctx.getTransform() : null;
    if (anime) ctx.transform(...anime);
    if (pose && pose.rideau > 0) {
      dessinerSousRideau(ctx, visuel, piece, pose, () => dessinerPosee(ctx, visuel, piece, primitive, pose, teinte), devant && (() => {
        const t = ctx.getTransform();
        ctx.setTransform(avantAnime);
        decouperParSilhouette(ctx, visuel, poseDe, animation, devant);
        ctx.setTransform(t);
      }));
    }
    else if (pose) dessinerPosee(ctx, visuel, piece, primitive, pose, teinte);
    else dessinerPrimitive(ctx, primitive, teinte);
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

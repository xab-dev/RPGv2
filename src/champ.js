// Ce qui est DANS LE CHAMP de la caméra (`specs/13` palier F, §4.6) — la part
// pure du tri des entités par la vue. Aucun canvas ici : `render.js` demande,
// pour chaque chose qu'il s'apprête à dessiner, si elle peut toucher l'écran.
//
// Pourquoi : le budget de la carte dit qu'une frame de marche dépend de ce qui
// est à l'écran, jamais de la taille de la scène ni du nombre total de ses
// monstres. Le palier A l'a chiffré (`docs/archives/JOURNAL_2026-09-24_spec13.md`
// §3) : sous ×6, chaque monstre de la scène coûtait ~0,25 ms de `dessiner()`,
// qu'il soit à l'écran ou à l'autre bout de la carte ; et le voile de nuit
// perçait un halo pour CHAQUE motif lumineux du décor de toute la carte.
// L'Annexe 1 ajoute une zone de monstres et de la surface : sans ce tri, elle
// paierait des dessins que personne ne voit.
//
// Ce qui est comparé est ce qui se PEINT, jamais une position : un arbre, un
// levier tourné ou une station à l'échelle ×2 débordent de leur ancre, et une
// entité à moitié hors champ doit rester dessinée. La boîte d'un visuel est
// celle des tampons (`tampons.js#boiteDessin` : primitives, traits, ombre
// portée, échelle, miroir, rotation) — un seul calcul de « ce que dessine un
// visuel » pour tout le rendu. Un tri trop large ne coûte qu'un dessin de
// plus ; un tri trop serré coupe une entité au bord de l'écran. Dans le doute,
// on garde.
import { boiteDessin } from './tampons.js';
import { echelleVisuel } from './visuels.js';

// Un pixel logique autour de la vue : l'antialias d'un bord qui tombe pile
// sur le bord de l'écran déborde d'une fraction de pixel (même raison que
// `defilement.js#MARGE_ANTIALIAS_LOGIQUE`).
const MARGE_CHAMP_PX = 1;

// La vue en coordonnées du MONDE (px logiques) : la caméra est le coin haut
// gauche de ce qui s'affiche, et l'écran logique a la taille `resolution`.
export function vueDeCamera(camera, resolution) {
  return {
    gauche: camera.x - MARGE_CHAMP_PX,
    haut: camera.y - MARGE_CHAMP_PX,
    droite: camera.x + resolution.largeur + MARGE_CHAMP_PX,
    bas: camera.y + resolution.hauteur + MARGE_CHAMP_PX,
  };
}

// Une boîte du monde `{ minX, maxX, minY, maxY }` touche-t-elle la vue ?
// Bornes incluses : une boîte qui affleure le bord garde son pixel
// d'antialias.
export function boiteDansLeChamp(boite, vue) {
  return boite.maxX >= vue.gauche && boite.minX <= vue.droite
    && boite.maxY >= vue.haut && boite.minY <= vue.bas;
}

// Un disque (un halo, un faisceau borné par sa longueur) touche-t-il la vue ?
// Le point du rectangle le plus proche du centre, comparé au rayon : un halo
// dont seul le bord flou entre dans l'écran reste percé.
export function disqueDansLeChamp(x, y, rayon, vue) {
  const px = Math.max(vue.gauche, Math.min(x, vue.droite));
  const py = Math.max(vue.haut, Math.min(y, vue.bas));
  const dx = x - px;
  const dy = y - py;
  return dx * dx + dy * dy <= rayon * rayon;
}

// Les boîtes relatives à l'ancre, gardées par visuel puis par pose : un
// visuel est un objet du registre, stable pour toute la partie, et une scène
// n'en pose que quelques dizaines de distincts. `WeakMap` : un registre
// rechargé (tests) n'est pas retenu.
const boitesParVisuel = new WeakMap();

function boiteRelative(visuel, echelle, rotation, miroir) {
  let parPose = boitesParVisuel.get(visuel);
  if (!parPose) {
    parPose = new Map();
    boitesParVisuel.set(visuel, parPose);
  }
  const cle = `${echelle}|${rotation}|${miroir ? 1 : 0}`;
  let boite = parPose.get(cle);
  if (!boite) {
    // `echelle` est l'échelle de la POSE ; `dessinerVisuel` la multiplie par
    // l'échelle propre du visuel — la boîte fait de même.
    boite = boiteDessin(visuel, { echelle: echelle * echelleVisuel(visuel), miroir, rotation });
    parPose.set(cle, boite);
  }
  return boite;
}

// Un visuel posé à `(x, y)` du monde, avec les options que `render.js` passe
// à `dessinerVisuel` (`echelle`, `rotation` en degrés, `miroir`), peint-il
// dans la vue ?
export function visuelDansLeChamp(visuel, x, y, vue, options = {}) {
  return boiteDansLeChamp(boiteDuVisuel(visuel, x, y, options), vue);
}

// La boîte, dans le MONDE, de ce que peint un visuel posé à `(x, y)` — la même
// que juge le champ. `D-223` s'en sert pour savoir si deux dessins se touchent
// (le fondu d'un passage n'a lieu que là où l'ordre se voit).
export function boiteDuVisuel(visuel, x, y, { echelle = 1, rotation = 0, miroir = false } = {}) {
  const b = boiteRelative(visuel, echelle || 1, rotation || 0, miroir);
  return { minX: x + b.minX, maxX: x + b.maxX, minY: y + b.minY, maxY: y + b.maxY };
}

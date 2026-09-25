// La PROFONDEUR de la scène (`D-222`, demande de Xav, 25/09) — la part pure :
// ce qui se tient DEBOUT, où est son PIED, et dans quel ordre tout ce qui est
// debout se peint. Aucun canvas ici : `render.js` demande, il dessine.
//
// Pourquoi : jusqu'ici, le calque statique cuisait ensemble le sol, les arbres
// et le décor, puis toutes les entités étaient peintes PAR-DESSUS, dans un
// ordre fixe. Un héros au nord d'un arbre passait donc devant son feuillage ;
// et le décor, peint après toutes les tuiles, posait une flaque sur la
// couronne de l'arbre du dessous ou un caillou sur la touffe d'herbe placée
// devant lui. Il n'existait aucune notion de « devant ».
//
// La règle, une seule, lue sur le DESSIN (jamais une liste d'ids) :
// - **un visuel qui porte une ombre portée se tient debout** (`visuel.ombre`) :
//   il a un point de contact avec le sol, donc un devant et un derrière. Les
//   arbres, les rochers, les cailloux et les touffes du décor, le héros, les
//   monstres, le follet, les objets au sol. Ce qui n'a pas d'ombre est PEINT
//   À PLAT sur le sol (le grain, les lisières, les flaques, les murs vus du
//   dessus) et reste dans le calque statique, sous tout ce qui est debout ;
// - **son pied est le centre de son ombre** : c'est là qu'il touche le sol.
//   Sans ombre (un monstre, une station qui n'en déclare pas), le bas de son
//   dessin ;
// - **ce qui est debout se peint du nord au sud, par son pied** : ce qui
//   touche le sol plus bas à l'écran est plus près de nous, et passe devant.
//
// Ajouter un arbre, un rocher, une borne au catalogue n'a donc rien à
// déclarer : son ombre suffit (règle d'architecture directrice).
import { boiteDessin } from './tampons.js';
import { echelleVisuel } from './visuels.js';
import { varianteTuile } from './decor.js';

// Un visuel se tient-il debout ? Voir l'en-tête : son ombre portée le dit.
export function estDebout(visuel) {
  return !!(visuel && visuel.ombre);
}

// Les tuiles dont l'OBJET se tient debout, parmi la table des grains de
// `main.js#construireTableGrains` (id de tuile → ses visuels). Une tuile est
// debout si l'un de ses dessins l'est : ses variantes se valent, et l'arbre de
// la case voisine ne doit pas changer de calque parce qu'il a tiré un autre
// dessin. Gardé par table : `main.js` la refait à l'entrée en scène et au
// changement de preset, jamais en place.
const deboutParTable = new WeakMap();
export function tuilesDebout(visuelsTuiles) {
  let ids = deboutParTable.get(visuelsTuiles);
  if (!ids) {
    ids = new Set();
    for (const [id, visuels] of visuelsTuiles) {
      if (visuels.some(estDebout)) ids.add(id);
    }
    deboutParTable.set(visuelsTuiles, ids);
  }
  return ids;
}

// La table des grains privée de ce qui se tient debout : ce que le calque
// statique peint encore, et donc tout ce dont son rayon d'influence doit
// tenir compte (`defilement.js#rayonInfluence`). L'arbre n'y est plus : il ne
// déborde plus chez ses voisines DANS le calque.
const aPlatParTable = new WeakMap();
export function tableAPlat(visuelsTuiles) {
  let table = aPlatParTable.get(visuelsTuiles);
  if (!table) {
    const debout = tuilesDebout(visuelsTuiles);
    table = new Map([...visuelsTuiles].filter(([id]) => !debout.has(id)));
    aPlatParTable.set(visuelsTuiles, table);
  }
  return table;
}

// Le bas du dessin, relatif à l'ancre, pour une pose donnée. Gardé par visuel
// puis par pose, comme les boîtes de `champ.js` : un visuel est un objet du
// registre, stable pour la partie.
const basParVisuel = new WeakMap();
function basDuDessin(visuel, echelle, rotation) {
  let parPose = basParVisuel.get(visuel);
  if (!parPose) {
    parPose = new Map();
    basParVisuel.set(visuel, parPose);
  }
  const cle = `${echelle}|${rotation}`;
  let bas = parPose.get(cle);
  if (bas === undefined) {
    bas = boiteDessin(visuel, { echelle, rotation }).maxY;
    parPose.set(cle, bas);
  }
  return bas;
}

// Le PIED d'un visuel posé à `(x, y)` du monde, en y du monde, avec les
// options que `render.js` passe à `dessinerVisuel` (`echelle` de la pose,
// `rotation` en degrés). L'ombre est posée à `(0, ombre.dy)` dans le repère du
// visuel, que `dessinerVisuel` tourne puis met à l'échelle : son centre
// descend donc de `dy × échelle × cos(rotation)`. Le miroir est horizontal,
// il ne change pas le pied.
export function piedDe(visuel, y, { echelle = 1, rotation = 0 } = {}) {
  const e = (echelle || 1) * echelleVisuel(visuel);
  if (visuel.ombre) {
    return y + visuel.ombre.dy * e * Math.cos(((rotation || 0) * Math.PI) / 180);
  }
  return y + basDuDessin(visuel, e, rotation || 0);
}

// Les objets de tuile DEBOUT d'une fenêtre de cases, prêts à trier : l'ancre
// du dessin (milieu du bas de la case, comme dans le calque), le dessin et le
// miroir que la case a tirés (`decor.js#varianteTuile` — le même tirage que le
// calque faisait, donc le même arbre au même endroit qu'avant), et le pied.
// Ne lit que les cases de la fenêtre, jamais toute la scène (`specs/13` §4.6).
export function objetsDeboutDeLaFenetre(scene, fenetre, estFlagActif, visuelsTuiles) {
  const debout = tuilesDebout(visuelsTuiles);
  const objets = [];
  if (debout.size === 0) return objets;
  const T = scene.tileSize;
  for (let y = fenetre.yDebut; y < fenetre.yFin; y++) {
    for (let x = fenetre.xDebut; x < fenetre.xFin; x++) {
      const tuile = scene.tuileA(x, y, estFlagActif);
      if (!tuile || !debout.has(tuile.id)) continue;
      const visuels = visuelsTuiles.get(tuile.id);
      const { index, miroir } = varianteTuile(scene, x, y, visuels.length, tuile.render.miroir);
      const visuel = visuels[index];
      const ancreX = (x + 0.5) * T;
      const ancreY = (y + 1) * T;
      objets.push({ x: ancreX, y: ancreY, visuel, miroir, pied: piedDe(visuel, ancreY) });
    }
  }
  return objets;
}

// Trie par pied, du nord au sud. Le tri de JavaScript est STABLE : à pied
// égal, l'ordre d'arrivée est gardé — l'appelant met le décor avant les
// entités, pour qu'un héros exactement au pied d'un caillou reste visible.
export function trierParPied(elements) {
  return elements.sort((a, b) => a.pied - b.pied);
}

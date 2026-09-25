// `D-224` — la hitbox des arbres de la forêt (demande de Xav, 25/09) : « réduire
// la hitbox des arbres de la forêt pour que ça colle un peu plus à ce que l'on
// voit (notamment les angles à arrondir un peu plus, un peu comme les cartes du
// menu) ».
//
// 1. la géométrie pure (`formes_collision.js`) : un rectangle aux coins
//    arrondis au pied de la case ; un côté se ferme jusqu'au bord dès qu'une
//    voisine solide le touche, et seul un coin aux deux côtés exposés s'arrondit ;
//    la sortie d'un point pousse exactement hors de la forme ;
// 2. la forêt ne devient pas une passoire : sur la vraie Maison, entre deux
//    cases solides voisines (côte à côte ou en diagonale), aucun passage ne
//    s'ouvre — tout le bord commun est solide ;
// 3. contre un arbre isolé de la vraie Maison, avec la vraie collision : le
//    héros s'approche plus près qu'avant (il passe derrière le feuillage par le
//    nord), et, pris par le coin arrondi, il glisse autour au lieu de buter —
//    là où la case entière l'arrêtait net ;
// 4. le catalogue refuse une forme sur une tuile non solide.
// Aucun nombre du catalogue n'est épinglé (`D-52`) : les valeurs sont lues.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { chargerScene, resoudreDeplacement } from '../src/scene.js';
import { echelleVisuel } from '../src/visuels.js';
import { formeCollision, pointDansForme, sortieDeForme } from '../src/formes_collision.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

// --- 1. La géométrie --------------------------------------------------------
{
  const T = 32;
  const c = { largeur: 20, hauteur: 16, rayon: 7, retrait_bas: 3 };
  const seule = formeCollision(c, T, {});
  assert.ok(pointDansForme(seule, 16, 20), 'le pied de l\'arbre bloque');
  assert.ok(!pointDansForme(seule, 16, 5), 'le haut de la case est libre : on passe derrière le feuillage');
  assert.ok(!pointDansForme(seule, 2, 28), 'les côtés de la case sont libres');
  assert.ok(!pointDansForme(seule, 16, 31), 'le retrait du bas est libre');
  // Le coin arrondi : le coin carré de la forme est dehors, le centre de l'arc dedans.
  assert.ok(!pointDansForme(seule, seule.x0 + 0.5, seule.y0 + 0.5), 'un coin exposé est arrondi');
  assert.ok(pointDansForme(seule, seule.x0 + 7, seule.y0 + 7));

  // Une voisine solide ferme son côté ; une diagonale ferme les deux côtés
  // qu'elle touche ; le coin n'est arrondi que si ses deux côtés sont exposés.
  const aLOuest = formeCollision(c, T, { O: true });
  for (let y = aLOuest.y0 + 0.5; y < aLOuest.y1; y += 1) assert.ok(pointDansForme(aLOuest, 0, y), 'côté ouest fermé jusqu\'au bord');
  assert.equal(aLOuest.rayons.hg, 0);
  assert.equal(aLOuest.rayons.hd, 7);
  const auNordEst = formeCollision(c, T, { NE: true });
  assert.ok(pointDansForme(auNordEst, 31.9, 0) && pointDansForme(auNordEst, 16, 0), 'une diagonale ferme le nord et l\'est');
  assert.ok(!pointDansForme(auNordEst, 0.5, 31.5), 'le coin opposé reste arrondi');

  // La sortie pousse exactement jusqu'au bord, arc compris.
  for (const [lx, ly, axe, sens] of [[16, 20, 'y', 1], [16, 20, 'y', -1], [10, 27, 'x', -1], [7.5, 26, 'y', 1], [24, 17, 'x', 1]]) {
    const d = sortieDeForme(seule, lx, ly, axe, sens);
    assert.ok(d > 0, `(${lx}, ${ly}) est dedans`);
    const [nx, ny] = axe === 'y' ? [lx, ly + sens * d] : [lx + sens * d, ly];
    assert.ok(!pointDansForme(seule, nx, ny), `(${lx}, ${ly}) poussé de ${d.toFixed(2)} sort de la forme`);
    const [px, py] = axe === 'y' ? [lx, ly + sens * (d - 0.05)] : [lx + sens * (d - 0.05), ly];
    assert.ok(pointDansForme(seule, px, py), 'et pas plus loin que nécessaire');
  }
  assert.equal(sortieDeForme(seule, 16, 2, 'y', 1), 0, 'un point dehors ne bouge pas');
}

const ID = 'scene_maison_exterieur';
const scene = chargerScene(registre, ID);
const T = scene.tileSize;
const aForme = registre.tous('tiles').filter((t) => t.collision);
assert.ok(aForme.length > 0 && aForme.every((t) => t.solid), 'des arbres déclarent une forme, toutes sur des tuiles solides');
const idsForme = new Set(aForme.map((t) => t.id));
const solide = (x, y) => { const t = scene.tuileA(x, y); return !t || t.solid; };

// --- 2. La forêt reste fermée -------------------------------------------------
{
  // Entre une case à forme et une voisine solide (8 directions), la LIGNE qui
  // joint leurs deux cœurs est solide de bout en bout. Une ligne solide
  // continue d'un obstacle à l'autre, c'est ce qu'aucune hitbox ne traverse :
  // pour passer entre les deux, il faudrait la franchir. Le cœur d'une case à
  // forme est le milieu de sa forme sans voisine ; celui d'une case pleine,
  // son centre.
  const coeur = (x, y) => {
    const t = scene.tuileA(x, y);
    if (t && t.collision) return [(x + 0.5) * T, (y + 1) * T - (t.collision.retrait_bas || 0) - t.collision.hauteur / 2];
    return [(x + 0.5) * T, (y + 0.5) * T];
  };
  let paires = 0;
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const t = scene.tuileA(x, y);
      if (!t || !idsForme.has(t.id)) continue;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]]) {
        if (!solide(x + dx, y + dy)) continue;
        // Hors de la carte, tout est solide : rien à prouver de ce côté.
        if (x + dx < 0 || y + dy < 0 || x + dx >= scene.width || y + dy >= scene.height) continue;
        paires += 1;
        // En diagonale, la ligne passe par le coin qu'elles partagent : c'est
        // là que les deux formes se rejoignent (et la droite entre les cœurs,
        // décalés vers le bas des cases, frôlerait une case libre).
        const chemin = [coeur(x, y)];
        if (dx && dy) chemin.push([(x + (dx > 0 ? 1 : 0)) * T, (y + (dy > 0 ? 1 : 0)) * T]);
        chemin.push(coeur(x + dx, y + dy));
        for (let k = 0; k + 1 < chemin.length; k++) {
          const [[ax, ay], [bx, by]] = [chemin[k], chemin[k + 1]];
          const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
          for (let i = 0; i <= n; i++) {
            const px = ax + ((bx - ax) * i) / n;
            const py = ay + ((by - ay) * i) / n;
            // Le coin lui-même appartient à une case libre (un point se juge
            // dans la case qui le contient) : c'était déjà vrai des cases
            // pleines, et un point n'est pas un passage — une hitbox qui s'y
            // centre a déjà un coin dans l'une des deux formes.
            if (px % T === 0 && py % T === 0) continue;
            assert.ok(scene.estSolideAuPoint(px, py), `(${x}, ${y}) → (${x + dx}, ${y + dy}) : passage ouvert en (${px.toFixed(2)}, ${py.toFixed(2)})`);
          }
        }
      }
    }
  }
  assert.ok(paires > 0, 'la Maison a des arbres voisins d\'une case solide');
  console.log(`  ${paires} paires de cases solides voisines, aucune ne s'ouvre`);
}

// --- 3. Contre un arbre isolé, la vraie collision ------------------------------
{
  const heroVisuel = registre.obtenir('visuels', 'visuel_heros');
  const rayon = 10 * echelleVisuel(heroVisuel); // `main.js#rayonHeros`
  const boite = (x, y) => ({ x: x - rayon, y: y - rayon, largeur: rayon * 2, hauteur: rayon * 2 });
  const libre = (x, y) => !solide(x, y);
  let arbre = null;
  for (let y = 3; y < scene.height - 3 && !arbre; y++) {
    for (let x = 3; x < scene.width - 3 && !arbre; x++) {
      const t = scene.tuileA(x, y);
      if (!t || !idsForme.has(t.id)) continue;
      let dega = true;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && !libre(x + dx, y + dy)) dega = false;
      if (dega) arbre = { x, y, forme: t.collision };
    }
  }
  assert.ok(arbre, 'la Maison porte un arbre à forme entouré de deux cases libres');
  const cx = (arbre.x + 0.5) * T;

  // Par le nord, en descendant : arrêté au haut de la forme, plus bas que le
  // haut de la case — le héros passe sous le feuillage.
  let y = (arbre.y - 1.5) * T;
  for (let i = 0; i < 200; i++) y = resoudreDeplacement(scene, boite(cx, y), 0, 1, () => false).y + rayon;
  const hautForme = (arbre.y + 1) * T - (arbre.forme.retrait_bas || 0) - arbre.forme.hauteur;
  assert.ok(y + rayon > arbre.y * T, 'par le nord, le héros entre dans la case de l\'arbre');
  assert.ok(Math.abs(y + rayon - hautForme) < 1.01, `arrêté au haut de la forme (${(y + rayon).toFixed(1)} contre ${hautForme})`);

  // Par le sud, pris par le coin arrondi : le bord droit du héros mord la forme
  // de 4 px, au-delà de la tolérance de coin d'un bord droit. Il glisse autour
  // de l'arc et passe au nord de l'arbre, pas à pas (1,5 px : une frame de
  // marche).
  const x0 = (arbre.x + 0.5) * T - arbre.forme.largeur / 2;
  const xDepart = x0 + 4 - rayon;
  let pos = { x: xDepart, y: (arbre.y + 1.8) * T };
  for (let i = 0; i < 120; i++) {
    const r = resoudreDeplacement(scene, boite(pos.x, pos.y), 0, -1.5, () => false);
    pos = { x: r.x + rayon, y: r.y + rayon };
  }
  assert.ok(pos.y < arbre.y * T, `le héros a contourné le coin arrondi (y=${pos.y.toFixed(1)})`);
  assert.ok(pos.x < xDepart, 'en glissant vers l\'extérieur');

  // La même approche contre la case entière (la tuile sans forme) : bloqué net.
  const tuile = scene.tuileA(arbre.x, arbre.y);
  const sansForme = { ...scene, sortieAxe: () => null, estSolideAuPoint: (px, py) => {
    const tx = Math.floor(px / T); const ty = Math.floor(py / T);
    if (tx === arbre.x && ty === arbre.y) return true;
    return scene.estSolideAuPoint(px, py);
  } };
  let bloque = { x: arbre.x * T + 4 - rayon, y: (arbre.y + 1.8) * T };
  for (let i = 0; i < 120; i++) {
    const r = resoudreDeplacement(sansForme, boite(bloque.x, bloque.y), 0, -1.5, () => false);
    bloque = { x: r.x + rayon, y: r.y + rayon };
  }
  assert.ok(bloque.y > (arbre.y + 1) * T, 'contre la case entière, le même coup d\'épaule bute');
  console.log(`  arbre isolé (${arbre.x}, ${arbre.y}, ${tuile.id}) : par le nord jusqu'à y=${(y + rayon).toFixed(1)}, coin contourné`);
}

// --- 4. Le catalogue --------------------------------------------------------
{
  const faux = structuredClone(donnees);
  const sol = faux.tiles.find((t) => !t.solid);
  sol.collision = { largeur: 10, hauteur: 10 };
  const fautes = validerCatalogues(faux, SCHEMAS);
  assert.ok(fautes.some((e) => /collision sur une tuile non solide/.test(e)), 'une forme sur une tuile non solide est refusée');
  const arbre = faux.tiles.find((t) => t.collision && t.solid);
  arbre.collision = { largeur: 10, hauteur: 0, rayon: 9 };
  const fautes2 = validerCatalogues(faux, SCHEMAS);
  assert.ok(fautes2.some((e) => /collision\.hauteur/.test(e)));
  assert.ok(fautes2.some((e) => /collision\.rayon dépasse/.test(e)));
}

console.log('OK test_d224_hitbox_arbres');

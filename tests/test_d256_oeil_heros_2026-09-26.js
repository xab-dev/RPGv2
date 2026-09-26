// `D-256` — l'œil du héros, un globe (Xav, 26/09, d'après Wheatley : « que
// l'œil prenne tout l'espace et ressemble vraiment à un globe oculaire »,
// jamais « qu'il s'aplatisse en ovale »).
//
// Contrats :
// 1. La couleur du follet atteint les dégradés : un palier `teinte: true`
//    prend la teinte passée au dessin (le halo de l'œil), les autres gardent
//    la leur.
// 2. Un globe ne s'aplatit pas : aucune direction qui montre le visage ne le
//    resserre à l'horizontale (`echelle_x`) ; il rapetisse d'un bloc
//    (`echelle`), et la pose l'applique dans les deux sens.
// 3. Démarrage : un palier teinté sur un visuel non teintable, refusé.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIENTATIONS, poseDePiece } from '../src/orientation.js';
import { dessinerVisuel, courberPoints } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);

// Un faux contexte qui note les paliers des dégradés et les mises à
// l'échelle.
function trace(visuel, options) {
  const paliers = [];
  const echelles = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'scale') return (x, y) => echelles.push([x, y]);
      return () => ({ addColorStop: (offset, couleur) => paliers.push(couleur) });
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, visuel, 0, 0, options);
  return { paliers, echelles };
}

// --- 1. La teinte dans les dégradés -------------------------------------------
{
  // (le halo est sur la façade de la capuche depuis `D-257` : on le cherche
  // sur tout le héros)
  const teintes = HEROS.primitives.filter((p) => p.degrade && p.degrade.stops.some((s) => s.teinte));
  assert.ok(teintes.length > 0, 'le héros a un dégradé qui suit le follet (le halo)');
  const { paliers } = trace(HEROS, { orientation: 'sud', teinte: '#00ff00' });
  assert.ok(paliers.some((c) => c.startsWith('rgba(0, 255, 0,')), 'un palier teinté prend la couleur du follet');
  const { paliers: sansTeinte } = trace(HEROS, { orientation: 'sud' });
  assert.ok(!sansTeinte.some((c) => c.startsWith('rgba(0, 255, 0,')), 'sans teinte, sa propre couleur');
  assert.ok(paliers.some((c) => c.startsWith('rgba(0, 0, 0,')), 'un palier non teinté garde la sienne (l\'ombre du globe)');
  console.log('OK teinte : le halo suit le follet, l\'ombre du globe reste noire');
}

// --- 2. Le globe reste rond ------------------------------------------------------
{
  const avecVisage = ORIENTATIONS.filter((d) => poseDePiece(HEROS, d, 'visage') !== null);
  assert.ok(avecVisage.length > 1);
  for (const d of avecVisage) {
    const pose = poseDePiece(HEROS, d, 'visage') || {};
    assert.ok(pose.echelle_x === undefined || pose.echelle_x === 1, `${d} : le globe n'est pas resserré à l'horizontale`);
  }
  const reduite = avecVisage.find((d) => (poseDePiece(HEROS, d, 'visage') || {}).echelle !== undefined);
  assert.ok(reduite, 'une direction rapetisse le globe d\'un bloc');
  const e = poseDePiece(HEROS, reduite, 'visage').echelle;
  const { echelles } = trace(HEROS, { orientation: reduite });
  assert.ok(echelles.some(([x, y]) => x === e && y === e), `${reduite} : l'échelle s'applique dans les deux sens`);
  console.log(`OK globe : rond dans ${avecVisage.length} directions, rapetissé d'un bloc de côté`);
}

// --- 3. Le démarrage ------------------------------------------------------------
{
  const copie = structuredClone(donnees);
  const plume = copie.visuels.find((v) => !v.teintable && v.primitives.length > 0);
  plume.primitives.push({ forme: 'degrade_radial', dx: 0, dy: 0, w: 2, h: 2, degrade: { stops: [
    { offset: 0, couleur: '#ffffff', teinte: true }, { offset: 1, couleur: '#ffffff', alpha: 0 },
  ] } });
  assert.ok(validerCatalogues(copie).some((e) => e.includes('un palier teinte:true nécessite')));
  console.log('OK démarrage : un palier teinté sur un visuel non teintable, refusé');
}

// --- 4. `D-257` : devant, derrière -------------------------------------------------
// Xav : « définir ce qui est devant et ce qui est derrière, comme on l'a fait
// avec l'arbre ». Dans le visuel, l'ordre des primitives est la profondeur :
// la cavité (le dedans de la capuche) avant le globe, la façade percée après.
{
  const rang = (piece, dernier = false) => {
    const rangs = HEROS.primitives.map((p, i) => (p.piece === piece ? i : -1)).filter((i) => i >= 0);
    return dernier ? Math.max(...rangs) : Math.min(...rangs);
  };
  assert.ok(rang('cavite', true) < rang('visage'), 'la cavité est derrière le globe');
  assert.ok(rang('facade') > rang('visage', true), 'la façade est devant le globe');
  assert.ok(rang('halo') > rang('facade', true), 'le halo éclaire la lèvre de la façade, devant elle');
  const facade = HEROS.primitives.find((p) => p.piece === 'facade' && p.trou);
  assert.ok(facade, 'la façade est percée');
  assert.ok(facade.trou.w > facade.trou.h, 'l\'ouverture est plus large que haute');
  for (const d of ORIENTATIONS) {
    assert.equal(poseDePiece(HEROS, d, 'facade') === null, poseDePiece(HEROS, d, 'cavite') === null, `${d} : façade et cavité paraissent ensemble`);
    // Le halo (sa propre pièce depuis le polish : il rapetisse de profil pour
    // ne pas sortir de la silhouette) paraît avec elles.
    assert.equal(poseDePiece(HEROS, d, 'halo') === null, poseDePiece(HEROS, d, 'facade') === null, `${d} : le halo paraît avec la façade`);
    // Xav : « il faut garder la même proportion que face » — de côté,
    // l'ouverture rapetisse, glisse et s'incline, jamais ne s'écrase.
    const pose = poseDePiece(HEROS, d, 'facade') || {};
    assert.ok(pose.echelle_x === undefined, `${d} : l'ouverture garde les proportions de face`);
  }
  const inclinee = ORIENTATIONS.find((d) => (poseDePiece(HEROS, d, 'facade') || {}).rotation);
  assert.ok(inclinee, 'de côté, l\'ouverture s\'incline');
  const tours = [];
  const tracant = new Proxy({}, {
    get(_, prop) {
      if (prop === 'rotate') return (a) => tours.push(a);
      return () => ({ addColorStop() {} });
    },
    set() { return true; },
  });
  dessinerVisuel(tracant, HEROS, 0, 0, { orientation: inclinee });
  const attendu = (poseDePiece(HEROS, inclinee, 'facade').rotation * Math.PI) / 180;
  assert.ok(tours.some((a) => Math.abs(a - attendu) < 1e-12), `${inclinee} : la rotation de pose s'applique`);

  // Le dessin d'un trou et d'un dégradé elliptique.
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      return (...args) => {
        appels.push([String(prop), ...args]);
        return String(prop).startsWith('create') ? { addColorStop() {} } : undefined;
      };
    },
    set() { return true; },
  });
  const anneau = { id: 'visuel_anneau', ancre: 'centre', primitives: [{
    forme: 'degrade_radial', dx: 0, dy: 0, w: 8, h: 4, trou: { w: 4, h: 2 },
    degrade: { direction: 'elliptique', stops: [{ offset: 0, couleur: '#000000' }, { offset: 1, couleur: '#ffffff' }] },
  }] };
  dessinerVisuel(ctx, anneau, 0, 0);
  assert.ok(appels.some((a) => a[0] === 'fill' && a[1] === 'evenodd'), 'un trou se remplit pair-impair : il perce la forme');
  assert.equal(appels.filter((a) => a[0] === 'ellipse').length, 2, 'la forme et son trou');
  assert.ok(appels.some((a) => a[0] === 'scale' && a[1] === 1 && a[2] === 0.5), 'elliptique : le repère écrasé à la hauteur');
  const [, , , , , , rayon] = appels.find((a) => a[0] === 'createRadialGradient');
  assert.equal(rayon, 4, 'elliptique : le dégradé est un cercle de la largeur, dans le repère écrasé');

  const copie = structuredClone(donnees);
  copie.visuels.find((v) => v.id === VISUEL_HEROS_ID).primitives.find((p) => p.trou).trou = { w: 40, h: 1 };
  assert.ok(validerCatalogues(copie).some((e) => e.includes('trou doit être')), 'un trou plus grand que sa forme, refusé');
  console.log('OK devant / derrière : la cavité derrière le globe, la façade percée devant, l\'ouverture plus large que haute');
}

// --- 5. `D-259` : le regard se lit où il va -----------------------------------
// Le regard se lit à la place du globe DANS son ouverture : le vecteur du
// centre de l'ouverture au centre du globe. `D-257` avait déplacé et incliné
// l'ouverture sans le globe, resté au bas (et, de trois quarts, à l'arrière)
// de son trou : de profil, le héros regardait ses pieds (Xav : « east and
// west seems to look to the bottom »). Contrat : pour toute direction qui
// montre l'œil, ce vecteur pointe vers elle, à 30° près (l'écran : y descend,
// le sud est vers le bas).
{
  const VECTEURS = {
    est: [1, 0], sud_est: [1, 1], sud: [0, 1], sud_ouest: [-1, 1], ouest: [-1, 0],
  };
  // Un point de la pièce, posé comme `dessinerVisuel` le pose (sans cisaillement :
  // ni l'œil ni l'ouverture n'en portent).
  const poser = (pose, [x, y]) => {
    const e = pose.echelle ?? 1;
    const a = ((pose.rotation ?? 0) * Math.PI) / 180;
    const [px, py] = [x * e * (pose.echelle_x ?? 1) * (pose.miroir ? -1 : 1), y * e];
    return [(pose.dx ?? 0) + px * Math.cos(a) - py * Math.sin(a), (pose.dy ?? 0) + px * Math.sin(a) + py * Math.cos(a)];
  };
  const IRIS = HEROS.primitives.find((p) => p.piece === 'visage' && p.teinte);
  const TROU = HEROS.primitives.find((p) => p.piece === 'facade' && p.trou);
  for (const [d, [vx, vy]] of Object.entries(VECTEURS)) {
    const [gx, gy] = poser(poseDePiece(HEROS, d, 'visage') || {}, [IRIS.dx, IRIS.dy]);
    const [ox, oy] = poser(poseDePiece(HEROS, d, 'facade') || {}, [TROU.dx, TROU.dy]);
    const [rx, ry] = [gx - ox, gy - oy];
    assert.ok(Math.hypot(rx, ry) > 0, `${d} : le globe n'est pas au centre de son ouverture`);
    const ecart = Math.abs(((Math.atan2(ry, rx) - Math.atan2(vy, vx)) * 180) / Math.PI);
    assert.ok(Math.min(ecart, 360 - ecart) <= 30, `${d} : le regard lu (${rx.toFixed(2)}, ${ry.toFixed(2)}) s'écarte de ${Math.min(ecart, 360 - ecart).toFixed(0)}° de sa direction`);
  }
  console.log('OK regard : dans chaque vue, le globe est décalé dans son ouverture du côté où il regarde');
}

// --- 6. `D-259` : la joue ---------------------------------------------------------
// De côté, le bord arrière de l'ouverture (une ellipse) débordait la tangente
// que la capuche suit en perspective (Xav : « ça dépasse et casse la
// perspective […] il ne faut pas déplacer tout le cercle, il faut le
// déformer »). Une joue, aux couleurs de la capuche, passe devant l'ouverture
// le long de cette tangente. Elle n'est invisible hors de l'ouverture que si
// elle reste DANS la capuche et hors de son liseré : contrat, dans chaque vue
// qui la montre.
{
  const FOND = HEROS.primitives.find((p) => p.piece === 'capuche' && p.couleur === '#1a1f27');
  const LISERE = HEROS.primitives.filter((p) => p.piece === 'capuche' && p.alpha !== undefined);
  const dans = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const JOUES = [...new Set(HEROS.primitives.filter((p) => p.piece && p.piece.startsWith('joue')).map((p) => p.piece))];
  assert.ok(JOUES.length > 0, 'de côté, une joue borde l\'ouverture');
  let vues = 0;
  for (const d of ORIENTATIONS) {
    for (const piece of JOUES) {
      const pose = poseDePiece(HEROS, d, piece);
      if (!pose) continue;
      vues += 1;
      const capuche = poseDePiece(HEROS, d, 'capuche') || {};
      // La capuche de la vue, pliée puis reflétée comme `dessinerVisuel` la pose.
      const reflet = (pts) => (capuche.miroir ? pts.map(([x, y]) => [-x, y]) : pts);
      const coque = reflet(courberPoints(FOND.points, capuche));
      const lisere = LISERE.map((p) => reflet(courberPoints(p.points, capuche)));
      const a = ((pose.rotation ?? 0) * Math.PI) / 180;
      const placer = ([x, y]) => {
        const px = x * (pose.miroir ? -1 : 1);
        return [(pose.dx ?? 0) + px * Math.cos(a) - y * Math.sin(a), (pose.dy ?? 0) + px * Math.sin(a) + y * Math.cos(a)];
      };
      const pan = HEROS.primitives.find((p) => p.piece === piece && p.couleur === FOND.couleur);
      for (let i = 0; i < pan.points.length; i += 1) {
        const [p, q] = [pan.points[i], pan.points[(i + 1) % pan.points.length]];
        for (let k = 0; k <= 10; k += 1) {
          const pt = placer([p[0] + ((q[0] - p[0]) * k) / 10, p[1] + ((q[1] - p[1]) * k) / 10]);
          assert.ok(dans(pt, coque), `${d} : la joue sort de la capuche en (${pt.map((n) => n.toFixed(2))})`);
          assert.ok(!lisere.some((l) => dans(pt, l)), `${d} : la joue couvre le liseré de la capuche en (${pt.map((n) => n.toFixed(2))})`);
        }
      }
    }
  }
  assert.ok(vues >= 4, 'profil et trois quarts, des deux côtés');
  for (const d of ['sud', 'nord']) assert.ok(JOUES.every((p) => !poseDePiece(HEROS, d, p)), `${d} : pas de joue, l'ouverture est de face`);
  console.log(`OK joue : dans ${vues} vues, elle borde l'ouverture sans sortir de la capuche ni toucher son liseré`);
}

console.log('OK test_d256_oeil_heros');

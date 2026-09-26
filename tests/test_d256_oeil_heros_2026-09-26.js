// `D-256` — l'œil du héros, un globe (Xav, 26/09, d'après Wheatley : « que
// l'œil prenne tout l'espace et ressemble vraiment à un globe oculaire »,
// jamais « qu'il s'aplatisse en ovale »).
//
// Contrats :
// 1. La couleur du follet atteint les dégradés : un palier `teinte: true`
//    prend la teinte passée au dessin (le halo de l'œil), les autres gardent
//    la leur.
// 2. Un globe ne s'aplatit pas : aucune direction qui montre l'œil ne
//    l'étire en hauteur ; il rapetisse d'un bloc (`echelle`), et la pose
//    l'applique dans les deux sens.
// 3. Démarrage : un palier teinté sur un visuel non teintable, refusé.
// 4. `D-257` : devant, derrière — la cavité derrière le globe, la façade
//    percée devant ; de côté, l'ouverture garde ses proportions, s'incline,
//    se rouvre en hauteur sans jamais se refermer.
// 5. `D-259` : dans chaque vue qui montre l'œil, le regard (du centre de
//    l'ouverture au centre du globe) va dans la direction.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import { ORIENTATIONS } from '../src/orientation.js';
import { dessinerVisuel } from '../src/visuels.js';
import { poseDePiece, poserPoint, matricePose } from '../src/poses.js';
import { VISUEL_HEROS_ID } from '../src/save.js';
import { validerCatalogues } from '../src/registry.js';
import { cataloguesValides } from './aide_dessin.js';

const { donnees, HEROS } = await cataloguesValides();

// Un faux contexte qui note les paliers des dégradés et les matrices de pose
// que reçoit le canvas.
function trace(visuel, options) {
  const paliers = [];
  const matrices = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'transform') return (...m) => matrices.push(m);
      return () => ({ addColorStop: (offset, couleur) => paliers.push(couleur) });
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, visuel, 0, 0, options);
  return { paliers, matrices };
}

// --- 1. La teinte dans les dégradés -------------------------------------------
{
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
  const avecOeil = ORIENTATIONS.filter((d) => poseDePiece(HEROS, d, 'oeil') !== null);
  assert.ok(avecOeil.length > 1);
  for (const d of avecOeil) {
    const pose = poseDePiece(HEROS, d, 'oeil') || {};
    assert.ok(pose.echelle_y === undefined || pose.echelle_y === 1, `${d} : le globe n'est pas étiré en hauteur`);
  }
  const reduite = avecOeil.find((d) => (poseDePiece(HEROS, d, 'oeil') || {}).echelle !== undefined);
  assert.ok(reduite, 'une direction rapetisse le globe d\'un bloc');
  const e = poseDePiece(HEROS, reduite, 'oeil').echelle;
  const { matrices } = trace(HEROS, { orientation: reduite });
  assert.ok(matrices.some(([a, b, c, d]) => Math.abs(Math.hypot(a, b) - e) < 1e-12 && Math.abs(Math.hypot(c, d) - e) < 1e-12),
    `${reduite} : l'échelle s'applique dans les deux sens`);
  console.log(`OK globe : rond dans ${avecOeil.length} directions, rapetissé d'un bloc de côté`);
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
  const rangs = (predicat) => HEROS.primitives.map((p, i) => (predicat(p) ? i : -1)).filter((i) => i >= 0);
  const teinte = (p) => !!(p.degrade && p.degrade.stops.some((st) => st.teinte));
  const oeil = rangs((p) => p.piece === 'oeil');
  const cavite = rangs((p) => p.piece === 'ouverture' && !p.trou && !teinte(p));
  const facade = HEROS.primitives.find((p) => p.piece === 'ouverture' && p.trou);
  const iFacade = HEROS.primitives.indexOf(facade);
  const halo = rangs((p) => p.piece === 'ouverture' && teinte(p));
  assert.ok(cavite.length > 0 && Math.max(...cavite) < Math.min(...oeil), 'la cavité est derrière le globe');
  assert.ok(facade, 'la façade est percée');
  assert.ok(iFacade > Math.max(...oeil), 'la façade est devant le globe');
  assert.ok(halo.length > 0 && Math.min(...halo) > iFacade, 'le halo éclaire la lèvre de la façade, devant elle');
  assert.ok(facade.trou.w > facade.trou.h, 'l\'ouverture est plus large que haute');
  for (const d of ORIENTATIONS) {
    // Xav : « il faut garder la même proportion que face » — de côté,
    // l'ouverture rapetisse, glisse et s'incline, jamais ne s'écrase.
    // `D-260` : elle peut se rouvrir un peu en hauteur (« j'ai l'impression
    // qu'il se referme sur l'oeil […] du coup on triche »), jamais se refermer.
    const pose = poseDePiece(HEROS, d, 'ouverture') || {};
    assert.ok(pose.echelle_y === undefined || pose.echelle_y >= 1, `${d} : l'ouverture ne se referme pas en hauteur`);
  }
  const inclinee = ORIENTATIONS.find((d) => (poseDePiece(HEROS, d, 'ouverture') || {}).rotation);
  assert.ok(inclinee, 'de côté, l\'ouverture s\'incline');
  const pose = poseDePiece(HEROS, inclinee, 'ouverture');
  const matrice = matricePose(HEROS, 'ouverture', pose);
  const angle = ((pose.reflet ? -1 : 1) * pose.rotation * Math.PI) / 180;
  assert.ok(Math.abs(Math.atan2(matrice[1], matrice[0]) - angle) < 1e-12, `${inclinee} : la rotation de pose est dans sa matrice`);
  assert.ok(trace(HEROS, { orientation: inclinee }).matrices.some((m) => m.every((v, i) => v === matrice[i])), `${inclinee} : le canvas reçoit cette matrice`);

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
  const IRIS = HEROS.primitives.find((p) => p.piece === 'oeil' && p.teinte);
  const TROU = HEROS.primitives.find((p) => p.piece === 'ouverture' && p.trou);
  for (const [d, [vx, vy]] of Object.entries(VECTEURS)) {
    const [gx, gy] = poserPoint(HEROS, 'oeil', poseDePiece(HEROS, d, 'oeil') || {}, [IRIS.dx, IRIS.dy]);
    const [ox, oy] = poserPoint(HEROS, 'ouverture', poseDePiece(HEROS, d, 'ouverture') || {}, [TROU.dx, TROU.dy]);
    const [rx, ry] = [gx - ox, gy - oy];
    assert.ok(Math.hypot(rx, ry) > 0, `${d} : le globe n'est pas au centre de son ouverture`);
    const ecart = Math.abs(((Math.atan2(ry, rx) - Math.atan2(vy, vx)) * 180) / Math.PI);
    assert.ok(Math.min(ecart, 360 - ecart) <= 30, `${d} : le regard lu (${rx.toFixed(2)}, ${ry.toFixed(2)}) s'écarte de ${Math.min(ecart, 360 - ecart).toFixed(0)}° de sa direction`);
  }
  console.log('OK regard : dans chaque vue, le globe est décalé dans son ouverture du côté où il regarde');
}

console.log('OK test_d256_oeil_heros');

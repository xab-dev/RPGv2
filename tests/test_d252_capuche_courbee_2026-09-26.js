// `D-252` — la capuche du héros de profil et de trois quarts : son sommet
// reste sur l'axe du héros, seule la pointe dit où il regarde (Xav, 26/09 :
// « le sommet de la capuche devrait être à cet endroit (pas le sommet du
// visage), et à partir de ce point de repère on peut donner à la capuche son
// sens de direction juste en orientant la pointe »).
//
// Contrats :
// 1. `poses.js#plierPoints` : sous la ligne `pli.pivot_y`, aucun point ne
//    bouge ; un point de l'axe à `pli.longueur` au-dessus du pivot tourne de
//    `pli.angle` degrés autour du pivot, vers l'est si l'angle est positif ;
//    l'origine de la primitive est prise en compte. Le rabat écrase le haut
//    en calotte.
// 2. Données : toute direction qui plie la capuche garde son sommet (le point
//    le plus haut, pose appliquée) plus près de l'axe que sa pointe — c'est
//    la plainte de Xav (le cisaillement emportait le sommet avec la pointe) ;
//    la face et le dos (`D-254`) n'écartent de l'axe ni la pointe ni le
//    sommet du dessin d'auteur (depuis `D-276`, symétrique).
// 3. Dessin : une pose pliée dessine deux fois exactement la même chose (les
//    points pliés se gardent, ils ne se refont pas au hasard d'une frame).
//    Une direction en reflet (`D-253`) reflète le dessin de la pièce
//    `miroir`, et d'elle seule ; une pièce `cachee` ne paraît que là où une
//    direction la pose ; la lumière ne se reflète pas (`reflet` d'une
//    primitive).
// 4. Démarrage : un pli ou un rabat incomplet, un miroir qui n'est pas un
//    booléen, un reflet mal déclaré, une primitive qui se dit cachée,
//    refusés.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import { ORIENTATIONS } from '../src/orientation.js';
import { poseDePiece, poserPoint, plierPoints } from '../src/poses.js';
import { VISUEL_HEROS_ID } from '../src/save.js';
import { validerCatalogues } from '../src/registry.js';
import { cataloguesValides, ordresDessin } from './aide_dessin.js';

const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg} (${a} ≠ ${b})`);

// --- 1. La fonction pure -------------------------------------------------------------
{
  const pose = { pli: { angle: 90, longueur: 4, pivot_y: 0 } };
  const carre = [[-2, 3], [2, 3], [2, 1], [-2, 1]];
  const plie = plierPoints(carre, pose);
  for (const [x, y] of carre) {
    assert.ok(plie.some(([a, b]) => a === x && b === y), `(${x}, ${y}), sous le pivot, ne bouge pas`);
  }
  const [[x, y]] = plierPoints([[0, -4]], pose);
  proche(x, 4, 'à la longueur, un quart de tour vers l\'est : x');
  proche(y, 0, 'à la longueur, un quart de tour vers l\'est : y');
  const [[xo]] = plierPoints([[0, -4]], { pli: { ...pose.pli, angle: -90 } });
  proche(xo, -4, 'un angle négatif plie vers l\'ouest');
  const [[xd, yd]] = plierPoints([[0, -2]], pose, 0, -2);
  proche(xd, 4, 'l\'origine de la primitive compte : x');
  proche(yd, 2, 'l\'origine de la primitive compte : y (repère de la primitive)');
  console.log('OK plierPoints : le bas posé, la pointe tournée autour du pivot');
}
{
  // `D-254` : le rabat. Sous la ligne, rien ne bouge ; au-dessus, tout tient
  // dans la calotte ; la pointe (à `longueur` de la ligne) en fait le sommet,
  // le reste monte avec la hauteur, sans jamais la dépasser.
  const rabat = { y: -2, longueur: 4, hauteur: 1 };
  const [[xb, yb]] = plierPoints([[3, 0]], { rabat });
  assert.ok(xb === 3 && yb === 0, 'sous la ligne du rabat, rien ne bouge');
  const [[xp, yp]] = plierPoints([[0.5, -6]], { rabat });
  proche(xp, 0.5, 'le rabat ne déplace pas un point en largeur');
  proche(yp, rabat.y - rabat.hauteur, 'la pointe devient le haut de la calotte');
  const hauts = [-2.5, -3, -4, -5, -8].map((y) => plierPoints([[0, y]], { rabat })[0][1]);
  assert.ok(hauts.every((y, i) => y >= rabat.y - rabat.hauteur && y < rabat.y && (i === 0 || y <= hauts[i - 1])),
    `au-dessus de la ligne : dans la calotte, d'autant plus haut qu'on partait haut (${hauts.map((y) => y.toFixed(2))})`);
  console.log('OK rabat : le bas posé, le haut écrasé en calotte');
}

// --- 2. Les données -----------------------------------------------------------------
const { donnees, HEROS } = await cataloguesValides();
const CAPUCHE = HEROS.primitives.filter((p) => p.piece === 'capuche');
const plusHaut = (points) => points.reduce((a, b) => (b[1] < a[1] ? b : a));
const POINTE = plusHaut(CAPUCHE.flatMap((p) => p.points));
{
  // Les arêtes coupées comme le dessin les coupe (un pli vide ne plie rien) :
  // le sommet d'un dôme plié peut tomber au milieu d'une arête.
  const ARETES = CAPUCHE.flatMap((p) => plierPoints(p.points, {}, p.dx, p.dy).map(([x, y]) => [x + p.dx, y + p.dy]));
  const pliees = ORIENTATIONS.filter((d) => (poseDePiece(HEROS, d, 'capuche') || {}).pli);
  assert.ok(pliees.length > 0, 'au moins une direction plie la capuche');
  for (const d of pliees) {
    const pose = poseDePiece(HEROS, d, 'capuche');
    const sommet = plusHaut(ARETES.map((pt) => poserPoint(HEROS, 'capuche', pose, pt)));
    const [xPointe] = poserPoint(HEROS, 'capuche', pose, POINTE);
    if (Math.abs(xPointe) > Math.abs(POINTE[0])) {
      assert.ok(Math.abs(sommet[0]) < Math.abs(xPointe), `${d} : le sommet (x = ${sommet[0].toFixed(2)}) plus près de l'axe que la pointe (x = ${xPointe.toFixed(2)})`);
    } else {
      // La face et le dos (`D-254`) : la pointe ne part d'aucun côté. Depuis
      // `D-276`, le dessin d'auteur l'a sur l'axe ; la pose ne l'en écarte pas.
      // Le rabat aplatit le haut en calotte : son sommet est un plat, dont on
      // juge le milieu, pas un bord pris au hasard de l'ordre des points.
      const poses = ARETES.map((pt) => poserPoint(HEROS, 'capuche', pose, pt));
      const plat = poses.filter(([, y]) => y - sommet[1] < 1e-6).map(([x]) => x);
      const milieu = (Math.min(...plat) + Math.max(...plat)) / 2;
      assert.ok(Math.abs(xPointe) <= Math.abs(POINTE[0]) + 1e-9 && Math.abs(milieu) <= Math.abs(POINTE[0]) + 0.01,
        `${d} : la pointe (x = ${xPointe.toFixed(2)}) et le milieu du sommet (x = ${milieu.toFixed(2)}) pas plus loin de l'axe que sur le dessin d'auteur (x = ${POINTE[0]})`);
    }
  }
  console.log(`OK données : ${pliees.join(', ')} — le sommet sur l'axe, la pointe à l'écart ou redressée`);
}

// --- 3. Le dessin -------------------------------------------------------------------
// Le dessin, ordre pour ordre (`aide_dessin.js#ordresDessin`).
const ordres = ordresDessin;
const styles = (visuel, orientation) => ordres(visuel, { orientation }).filter((a) => a[0] === '=fillStyle').map((a) => a[1]);
{
  const pliee = ORIENTATIONS.find((d) => (poseDePiece(HEROS, d, 'capuche') || {}).pli);
  const une = ordres(HEROS, { orientation: pliee });
  assert.deepEqual(ordres(HEROS, { orientation: pliee }), une, 'deux frames, le même dessin');
  const lignes = (a) => a.filter((x) => x[0] === 'lineTo').length;
  assert.ok(lignes(une) > lignes(ordres(HEROS, {})), 'le pli arrondit : plus de segments que le dessin d\'auteur');

  // `D-253` : une direction en reflet reflète le dessin de la pièce miroir,
  // et d'elle seule — les autres pièces n'y reflètent que leur place.
  const avecMiroir = structuredClone(HEROS);
  avecMiroir.pieces = { capuche: { miroir: true } };
  avecMiroir.orientations = { ouest: { capuche: {}, oeil: { dx: -1 } } };
  avecMiroir.reflets = { est: 'ouest' };
  const retournes = ordres(avecMiroir, { orientation: 'est' }).filter((a) => a[0] === 'transform' && a[1] < 0).length;
  assert.equal(retournes, CAPUCHE.length, 'une primitive de la capuche, un dessin retourné ; rien d\'autre');

  // `D-254` : une pièce cachée ne paraît que là où une direction la pose.
  const avecCachee = structuredClone(HEROS);
  avecCachee.primitives.push({ forme: 'cercle', dx: 0, dy: 0, w: 1, couleur: '#123456', piece: 'temoin' });
  avecCachee.pieces = { temoin: { cachee: true } };
  avecCachee.orientations = { nord: { temoin: {} } };
  avecCachee.reflets = {};
  assert.ok(styles(avecCachee, 'nord').includes('#123456'), 'posée : elle paraît');
  for (const o of [null, 'sud', 'est']) assert.ok(!styles(avecCachee, o).includes('#123456'), `${o} : sans pose, elle reste cachée`);

  // `D-255` : la lumière ne se reflète pas — dessinée en miroir, une
  // primitive prend son style `reflet` ; sinon, le sien.
  const avecReflet = structuredClone(HEROS);
  avecReflet.primitives.push({ forme: 'cercle', dx: 0, dy: 0, w: 1, couleur: '#aaaaaa', reflet: { couleur: '#bbbbbb' }, piece: 'temoin' });
  avecReflet.pieces = { temoin: { miroir: true } };
  avecReflet.orientations = { ouest: { temoin: {} } };
  avecReflet.reflets = { est: 'ouest' };
  assert.ok(styles(avecReflet, 'est').includes('#bbbbbb') && !styles(avecReflet, 'est').includes('#aaaaaa'), 'reflétée : le style du reflet');
  assert.ok(styles(avecReflet, 'ouest').includes('#aaaaaa') && !styles(avecReflet, 'ouest').includes('#bbbbbb'), 'sans miroir : son propre style');
  console.log('OK dessin : la capuche pliée, stable d\'une frame à l\'autre ; le reflet sur la seule pièce miroir ; la pièce cachée ; la lumière fixe');
}

// --- 4. Le démarrage --------------------------------------------------------------
{
  const refuse = (modif, attendu, message) => {
    const copie = structuredClone(donnees);
    modif(copie.visuels.find((v) => v.id === VISUEL_HEROS_ID));
    const trouvees = validerCatalogues(copie);
    assert.ok(trouvees.some((e) => e.includes(attendu)), `${message} (${trouvees.join(' | ') || 'aucune erreur'})`);
  };
  const pliee = ORIENTATIONS.find((d) => HEROS.orientations[d] && (HEROS.orientations[d].capuche || {}).pli);
  const chemin = `orientations > ${pliee} > capuche`;
  refuse((v) => { v.orientations[pliee].capuche = { pli: { angle: 30, pivot_y: -5 } }; }, chemin, 'un pli sans longueur');
  refuse((v) => { v.orientations[pliee].capuche = { pli: { angle: 30, pivot_y: -5, longueur: 0 } }; }, chemin, 'un pli de longueur nulle');
  refuse((v) => { v.orientations[pliee].capuche = { pli: { angle: 'fort', pivot_y: -5, longueur: 5 } }; }, chemin, 'un angle qui n\'est pas un nombre');
  refuse((v) => { v.orientations[pliee].capuche = { rabat: { y: -8, longueur: 3 } }; }, chemin, 'un rabat incomplet');
  refuse((v) => { v.orientations[pliee].capuche = { courbure: 30 }; }, chemin, 'une clé de pose inconnue');
  refuse((v) => { v.pieces.capuche.miroir = 'oui'; }, 'pieces > capuche', 'un miroir qui n\'est pas un booléen');
  refuse((v) => { v.pieces.chapeau = {}; }, 'aucune primitive ne porte', 'une pièce que rien ne porte');
  refuse((v) => { delete v.pieces.capuche.miroir; }, 'se déclare miroir', 'une pièce pliée, reflétée sans que son dessin le soit');
  refuse((v) => { v.reflets = { est: 'nord_est' }; }, 'reflets > est', 'un reflet d\'une direction non déclarée');
  refuse((v) => { v.reflets = { sud: 'nord' }; }, 'déjà déclarée', 'une direction déclarée deux fois');
  refuse((v) => { v.primitives[0].cachee = true; }, 'cachee se déclare sur la pièce', 'une primitive qui se dit cachée');
  refuse((v) => { v.primitives[0].reflet = { couleur: '#000000' }; }, 'reflet doit être', 'un reflet sans pièce ne servirait jamais');
  refuse((v) => { v.primitives.find((p) => p.reflet).reflet = { teinte: true }; }, 'reflet doit être', 'un reflet qui teinte');
  console.log('OK démarrage : un pli, un rabat, un miroir, un reflet ou une pièce cachée mal déclarés, refusés');
}

console.log('OK test_d252_capuche_courbee');

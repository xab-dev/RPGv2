// Contrat (§2.2) : résolution logique mise à l'échelle par un facteur
// entier, jamais fractionnaire, jamais nul, centrée avec bandes noires.
// Le dessin canvas lui-même n'est jamais exercé en headless (contrainte de
// méthode) : seule la logique pure de mise à l'échelle est testée ici.
import assert from 'node:assert/strict';
import {
  calculerEchelleEntiere, calculerRectanglePresentation, versCoordonneesLogiques, RESOLUTION_LOGIQUE,
} from '../src/render.js';

// 1. Écran exactement au double de la résolution logique -> échelle 2.
// Dérivé de RESOLUTION_LOGIQUE (480x270, validée diagnostic SD_ui-lisibilite
// §9) plutôt qu'une valeur en dur, pour ne pas laisser ce test passer par
// accident si la résolution change encore.
{
  const echelle = calculerEchelleEntiere(RESOLUTION_LOGIQUE.largeur * 2, RESOLUTION_LOGIQUE.hauteur * 2);
  assert.equal(echelle, 2);
}

// 2. Écran plus large que haut par rapport au ratio logique -> l'axe le
// plus contraignant (hauteur) fixe l'échelle.
{
  const echelle = calculerEchelleEntiere(3000, 400); // 400/270 ≈ 1.48, 3000/480 = 6.25
  assert.equal(echelle, 1);
}

// 3. Écran plus petit que la résolution logique -> jamais 0, toujours >= 1.
{
  assert.equal(calculerEchelleEntiere(320, 180), 1);
  assert.equal(calculerEchelleEntiere(1, 1), 1);
}

// 4. L'échelle est toujours un entier (pixel art net), jamais fractionnaire.
{
  const echelle = calculerEchelleEntiere(1000, 1000);
  assert.equal(Number.isInteger(echelle), true);
}

// 5. Rectangle de présentation centré, bandes noires symétriques.
{
  const largeurEcran = RESOLUTION_LOGIQUE.largeur * 2;
  const hauteurEcran = RESOLUTION_LOGIQUE.hauteur * 2 + 80; // + bande verticale forcée
  const rect = calculerRectanglePresentation(largeurEcran, hauteurEcran);
  assert.equal(rect.echelle, 2);
  assert.equal(rect.largeur, RESOLUTION_LOGIQUE.largeur * 2);
  assert.equal(rect.hauteur, RESOLUTION_LOGIQUE.hauteur * 2);
  assert.equal(rect.x, 0, 'aucune bande latérale quand la largeur correspond exactement');
  assert.equal(rect.y, 40);
}

// 6. versCoordonneesLogiques est la réciproque exacte de la mise à l'échelle
// (diagnostic SD_ui-lisibilite §3c) : un point du canvas visible pris au
// centre exact d'un rectangle mis à l'échelle avec offset (letterbox non
// nul) doit retomber sur la coordonnée logique attendue.
{
  const largeurEcran = RESOLUTION_LOGIQUE.largeur * 2;
  const hauteurEcran = RESOLUTION_LOGIQUE.hauteur * 2 + 80; // offset vertical non nul
  const rect = calculerRectanglePresentation(largeurEcran, hauteurEcran);
  assert.equal(rect.y, 40);

  // Coin haut-gauche de la zone logique -> (0,0) une fois l'offset retiré.
  const origine = versCoordonneesLogiques(rect.x, rect.y, rect);
  assert.equal(origine.x, 0);
  assert.equal(origine.y, 0);

  // Un point logique connu (240, 100), placé à l'écran par la même échelle
  // et le même offset que le rendu, doit revenir exactement à (240, 100).
  const logiqueAttendu = { x: 240, y: 100 };
  const clientX = rect.x + logiqueAttendu.x * rect.echelle;
  const clientY = rect.y + logiqueAttendu.y * rect.echelle;
  const logique = versCoordonneesLogiques(clientX, clientY, rect);
  assert.equal(logique.x, logiqueAttendu.x);
  assert.equal(logique.y, logiqueAttendu.y);
}

// 7. Rendu net à résolution physique (MT_rendu-net_2026-09-15, point 4/5) :
// un écran HiDPI a plus de pixels physiques que de pixels CSS — le facteur
// entier doit se calculer sur les pixels physiques (largeurCSS x DPR), et
// versCoordonneesLogiques (qui reçoit des coordonnées d'événement en
// pixels CSS) doit appliquer le même DPR pour rester la réciproque exacte
// de la présentation. `window.devicePixelRatio` n'existe pas sous Node :
// simulé ici via un faux global, retiré après coup pour ne pas contaminer
// les autres tests du fichier.
{
  global.window = { devicePixelRatio: 3 };
  try {
    const largeurCss = 360;
    const hauteurCss = 640;
    const largeurPhysique = largeurCss * 3;
    const hauteurPhysique = hauteurCss * 3;
    assert.equal(largeurPhysique, 1080);
    assert.equal(hauteurPhysique, 1920);

    const echelle = calculerEchelleEntiere(largeurPhysique, hauteurPhysique);
    assert.equal(echelle, 2, '480x270 à f=2 tient dans 1080x1920 physiques (f=3 dépasserait 480*3=1440 > 1080)');

    const rect = calculerRectanglePresentation(largeurPhysique, hauteurPhysique);
    assert.equal(rect.largeur, RESOLUTION_LOGIQUE.largeur * 2);
    assert.equal(rect.hauteur, RESOLUTION_LOGIQUE.hauteur * 2);
    assert.equal(rect.x, 60); // (1080 - 960) / 2
    assert.equal(rect.y, 690); // (1920 - 540) / 2

    // Aller-retour : un point logique connu, placé à l'écran en tenant
    // compte du DPR (l'événement réel arrive en pixels CSS), doit revenir
    // exactement à sa coordonnée logique de départ.
    const logiqueAttendu = { x: 120, y: 105 };
    const clientX = (rect.x + logiqueAttendu.x * rect.echelle) / 3;
    const clientY = (rect.y + logiqueAttendu.y * rect.echelle) / 3;
    assert.equal(clientX, 100);
    assert.equal(clientY, 300);
    const logique = versCoordonneesLogiques(clientX, clientY, rect);
    assert.equal(logique.x, logiqueAttendu.x);
    assert.equal(logique.y, logiqueAttendu.y);
  } finally {
    delete global.window;
  }
}

console.log('OK test_phase1_render_resolution');

// `D-48` — l'unité `--u` des menus est une grandeur en pixels CSS.
//
// Le défaut : sur un téléphone à DPR 3, chaque OUVERTURE d'un écran de menu
// posait `--u` = 4 px (l'échelle en pixels PHYSIQUES) dans une fenêtre de
// 360 px CSS de haut — la mise en page prévue pour 1080p affichée dans un
// écran de 360. Un `resize` (pivoter l'appareil) la remettait à 1 px, l'entrée
// dans un sous-écran la recassait. Relevé réel avant correctif, profil
// `telephone` de `tools/scenarios/commun.mjs` :
//     ouverture --u 4px · après resize --u 1px · sous-écran --u 4px
// À DPR 1, les trois valeurs étaient déjà identiques : c'est pour ça que ni le
// PC, ni les deux profils de capture d'alors, ni aucun test n'avaient pu le
// voir.
//
// CE QU'IL NE PROUVE PAS : que le menu est lisible sur le téléphone de Xav.
// Node n'a pas de moteur de mise en page. La preuve en vrais pixels est le
// scénario `tools/scenarios/diagnostic_unite_dpr.mjs` sous Chrome sans
// fenêtre ; le verdict reste `V-31`, en jeu, au doigt.
import assert from 'node:assert/strict';
import { rectangleMenuCss } from '../src/menu_cartes.js';
import { calculerRectanglePresentation, RESOLUTION_LOGIQUE } from '../src/render.js';

// Les trois profils de `tools/scenarios/commun.mjs`, recopiés ici en tant que
// CAS DE TEST (pas en tant que réglage partagé : un outil de dev ne doit pas
// pouvoir faire passer ou tomber la suite en changeant une taille).
const PROFILS = [
  { nom: 'pc 703x280 DPR 1', largeurCss: 703, hauteurCss: 280, dpr: 1 },
  { nom: 'grand 1920x1080 DPR 1', largeurCss: 1920, hauteurCss: 1080, dpr: 1 },
  { nom: 'telephone 780x360 DPR 3', largeurCss: 780, hauteurCss: 360, dpr: 3 },
];

// 1. Le témoin du défaut. `calculerRectanglePresentation` rend des pixels
//    PHYSIQUES — c'est son contrat, et il est juste. Ce qui était faux, c'est
//    de poser ce nombre-là dans une variable CSS. On le mesure plutôt que de
//    le raconter en commentaire : le jour où quelqu'un rebranche la boîte du
//    menu sur cette fonction, ce bloc dit pourquoi ça ne peut pas marcher.
{
  const physique = calculerRectanglePresentation(780 * 3, 360 * 3);
  assert.equal(physique.echelle, 4, 'témoin : 2340 x 1080 px physiques -> échelle 4');
  assert.ok(
    physique.echelle * RESOLUTION_LOGIQUE.hauteur > 360,
    'témoin : 4 x 270 = 1080 px, soit trois fois la hauteur CSS de la fenêtre',
  );
}

// 2. Le contrat : la boîte du menu, en px CSS, tient dans la fenêtre — sous
//    TOUS les profils, DPR compris. C'est l'assertion qui échoue si on
//    reposait une grandeur physique.
for (const { nom, largeurCss, hauteurCss, dpr } of PROFILS) {
  const boite = rectangleMenuCss({ largeurCss, hauteurCss, dpr });
  assert.ok(boite.unite > 0, `${nom} : unité positive`);
  assert.ok(
    boite.unite * RESOLUTION_LOGIQUE.hauteur <= hauteurCss + 0.5,
    `${nom} : la boîte (${boite.unite * RESOLUTION_LOGIQUE.hauteur} px) doit tenir dans ${hauteurCss} px CSS`,
  );
  assert.ok(
    boite.unite * RESOLUTION_LOGIQUE.largeur <= largeurCss + 0.5,
    `${nom} : la boîte doit tenir dans ${largeurCss} px CSS de large`,
  );
  assert.ok(boite.x >= 0 && boite.y >= 0, `${nom} : origine dans la fenêtre`);
}

// 3. Le symptôme exact de Xav : l'unité posée à l'OUVERTURE d'un écran et
//    celle posée après un `resize` sont le même nombre. Avant le correctif,
//    les deux chemins lisaient deux grandeurs différentes (le backing store du
//    canvas, écrit tantôt en px physiques par `presenter()`, tantôt en px CSS
//    par `ajusterTailleCanvas`) ; ils traversent désormais cette seule
//    fonction, qui ne connaît que la fenêtre — donc elle rend la même valeur
//    quel que soit le moment, y compris plusieurs fois d'affilée.
for (const { nom, largeurCss, hauteurCss, dpr } of PROFILS) {
  const ouverture = rectangleMenuCss({ largeurCss, hauteurCss, dpr });
  const apresResize = rectangleMenuCss({ largeurCss, hauteurCss, dpr });
  const sousEcran = rectangleMenuCss({ largeurCss, hauteurCss, dpr });
  assert.deepEqual(apresResize, ouverture, `${nom} : resize ne change rien`);
  assert.deepEqual(sousEcran, ouverture, `${nom} : ouvrir un sous-écran ne change rien`);
}

// 4. La boîte recouvre EXACTEMENT l'image du jeu à l'écran — c'est tout
//    l'intérêt de se caler sur le rectangle de présentation plutôt que sur un
//    calcul à soi. Le rectangle physique divisé par le DPR, c'est le rectangle
//    CSS : une seule formule, convertie une fois.
for (const { nom, largeurCss, hauteurCss, dpr } of PROFILS) {
  const boite = rectangleMenuCss({ largeurCss, hauteurCss, dpr });
  const physique = calculerRectanglePresentation(Math.round(largeurCss * dpr), Math.round(hauteurCss * dpr));
  assert.equal(boite.unite, physique.echelle / dpr, `${nom} : unité = échelle physique / DPR`);
  assert.equal(boite.x, physique.x / dpr, `${nom} : origine x en px CSS`);
  assert.equal(boite.y, physique.y / dpr, `${nom} : origine y en px CSS`);
}

// 5. Non-régression du PC : à DPR 1, rien ne bouge — les valeurs mesurées sous
//    Chrome aux deux tailles de `specs/08_menus-cartes.md` §7 sont rendues au
//    pixel près (`--u` 1 px et `--jeu-x` 111 px à 703 x 280, `--u` 4 px et
//    `--jeu-x` 0 px à 1920 x 1080, journal du 20/09).
assert.deepEqual(rectangleMenuCss({ largeurCss: 703, hauteurCss: 280, dpr: 1 }), { x: 111, y: 5, unite: 1 });
assert.deepEqual(rectangleMenuCss({ largeurCss: 1920, hauteurCss: 1080, dpr: 1 }), { x: 0, y: 0, unite: 4 });

// 6. Le téléphone de Xav, chiffré : 780 x 360 CSS à DPR 3 = 2340 x 1080
//    physiques, échelle 4, donc une image de 1920 x 1080 physiques = 640 x 360
//    px CSS, centrée. L'unité vaut 4/3 — décimale, et c'est voulu : la boîte
//    recouvre l'image du jeu, elle n'est pas un multiple entier d'elle.
{
  const boite = rectangleMenuCss({ largeurCss: 780, hauteurCss: 360, dpr: 3 });
  assert.equal(boite.unite, 4 / 3);
  assert.equal(boite.x, 70);
  assert.equal(boite.y, 0);
  assert.equal(boite.unite * RESOLUTION_LOGIQUE.largeur, 640);
  assert.equal(boite.unite * RESOLUTION_LOGIQUE.hauteur, 360);
}

// 7. Un DPR absent, nul ou absurde ne doit pas faire disparaître le menu
//    (division par zéro -> `Infinity`) : on retombe sur 1, le comportement PC.
for (const dpr of [undefined, 0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
  const boite = rectangleMenuCss({ largeurCss: 703, hauteurCss: 280, dpr });
  assert.deepEqual(boite, { x: 111, y: 5, unite: 1 }, `DPR ${String(dpr)} : repli sur 1`);
}

console.log('OK test_d48_unite_menu_px_css');

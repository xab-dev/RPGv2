// Boucle de rendu : requestAnimationFrame + dessin canvas. Le plafond de
// delta-time et le calcul d'échelle sont isolés en fonctions pures
// testables ; le dessin canvas lui-même n'est jamais exercé en headless
// (contrainte de méthode : le rendu revient à Xav dans un vrai navigateur).

import { dessinerVisuel } from './visuels.js';
import { couleurTuile } from './decor.js';

const DELTA_MAX_MS = 100; // provisoire : une frame ne rattrape jamais plus de 100 ms

export function plafonnerDelta(deltaMs) {
  return Math.min(deltaMs, DELTA_MAX_MS);
}

// Résolution logique (§2.2 de specs/02_grotte.md) : tout le jeu (caméra,
// HUD, tactile) raisonne dans cet espace ; seule la dernière étape de rendu
// met à l'échelle vers le canvas visible. 480x270 = 16:9, 15x8,4375 tuiles de
// 32px — validée par Xav le 2026-09-15 sur capture (diagnostic
// SD_ui-lisibilite : 640x360 rendait les salles de la grotte minuscules à
// l'écran, §9 fermé), plus provisoire.
export const RESOLUTION_LOGIQUE = { largeur: 480, hauteur: 270 };

// Facteur d'échelle entier (jamais fractionnaire — le cadrage des salles ne
// change pas, cf. MT_rendu-net_2026-09-15) : le plus grand entier qui fait
// tenir la résolution logique dans l'écran disponible, jamais 0 (un écran
// plus petit que la résolution logique affiche quand même à l'échelle 1,
// quitte à déborder plutôt que disparaître). `largeurEcran`/`hauteurEcran`
// sont désormais des pixels PHYSIQUES (device), pas CSS — cf.
// `dimensionsEcranPhysiques()` plus bas : un écran HiDPI a plus de pixels
// physiques que de pixels CSS, et c'est ce nombre-là qui doit driver le
// facteur pour un rendu net (avant ce ticket, un calcul en CSS pouvait
// sous-estimer l'échelle disponible sur mobile).
export function calculerEchelleEntiere(largeurEcran, hauteurEcran, resolution = RESOLUTION_LOGIQUE) {
  const echelle = Math.floor(Math.min(largeurEcran / resolution.largeur, hauteurEcran / resolution.hauteur));
  return Math.max(1, echelle);
}

// Échelle de RENDU (MT_echelle-debug_2026-09-19, `D-23`) : l'échelle
// naturelle ci-dessus, sauf si `?echelle=N` en impose une autre — auquel cas
// elle la REMPLACE purement et simplement. Instrument de mesure : tant que
// `echelleForcee` vaut null (le seul cas du jeu réel), cette fonction rend
// exactement `calculerEchelleEntiere`, à laquelle elle délègue plutôt que de
// refaire le calcul — deux formules qui pourraient diverger, c'est
// précisément ce que le ticket interdit.
//
// Deux fonctions et non un paramètre de plus sur `calculerEchelleEntiere` :
// la présentation à l'écran (`calculerRectanglePresentation` juste dessous)
// doit rester sur l'échelle NATURELLE quoi qu'il arrive — c'est ce qui fait
// que la boîte affichée ne bouge pas, que le navigateur agrandit lui-même
// l'image plus petite, et que le hit-test tactile tombe au même endroit
// logique avec et sans le paramètre. Une échelle forcée est par ailleurs
// autorisée à être décimale, ce que le nom "entière" démentirait.
export function calculerEchelleRendu(largeurEcran, hauteurEcran, resolution = RESOLUTION_LOGIQUE, echelleForcee = null) {
  if (echelleForcee !== null && echelleForcee !== undefined) return echelleForcee;
  return calculerEchelleEntiere(largeurEcran, hauteurEcran, resolution);
}

// LA dérivation de l'échelle à partir d'un canvas déjà dimensionné — seul
// endroit où elle est écrite. Les calques (statique, obscurité, paupières)
// ne reçoivent jamais l'échelle : ils la relisent ici, sur la largeur du
// canvas qu'ils accompagnent. C'est ce qui rend vraie la phrase du ticket
// "tous les calques en dérivent : aucun calque ne recalcule sa taille de son
// côté", et ce qui ferme la porte au diagnostic "dialogues invisibles"
// (SD_dialogues-invisibles_2026-09-15) sous échelle forcée.
export function echelleDepuisCanvas(largeurCanvas, resolution = RESOLUTION_LOGIQUE) {
  return largeurCanvas / resolution.largeur;
}

// Dimensions du canvas hors-écran pour un écran donné. Pure (donc testable
// sans DOM, alors que `ajusterCanvasLogiquePhysique` ne l'est pas) : c'est
// elle qui porte le contrat de non-régression du ticket — sans échelle
// forcée, elle rend exactement 480·f x 270·f, la formule d'avant, au pixel
// près.
//
// L'échelle rendue est celle RELUE sur la largeur arrondie, jamais celle
// demandée : un canvas ne peut pas faire 1584,000000002 px de large, et
// c'est la largeur réelle du canvas que tous les calques liront ensuite. La
// hauteur dérive de cette même échelle effective, pour que l'image ne soit
// jamais étirée dans un sens et pas dans l'autre.
export function dimensionnerCanvasRendu(largeurEcran, hauteurEcran, echelleForcee = null, resolution = RESOLUTION_LOGIQUE) {
  const demandee = calculerEchelleRendu(largeurEcran, hauteurEcran, resolution, echelleForcee);
  const largeur = Math.max(1, Math.round(resolution.largeur * demandee));
  const echelle = echelleDepuisCanvas(largeur, resolution);
  return { echelle, largeur, hauteur: Math.max(1, Math.round(resolution.hauteur * echelle)) };
}

// Échelle forcée courante : une variable de module, posée une seule fois au
// boot par main.js (qui lit `location.search` via debug_perf.js#
// lireEchelleForcee) — render.js ne lit jamais `location` lui-même, il doit
// rester importable depuis Node. null = le jeu réel, comportement d'avant.
let echelleForceeRendu = null;

export function definirEchelleForcee(echelle) {
  echelleForceeRendu = typeof echelle === 'number' && Number.isFinite(echelle) && echelle > 0 ? echelle : null;
}

// Accesseur de lecture seule pour le relevé `?debug=fps` (ui/hud_debug.js) —
// jamais appelé par le rendu. Les deux chiffres côte à côte sont ce que
// `A-05` demande de noter à chaque échelle.
export function etatEchelleRendu() {
  const { largeurPhysique, hauteurPhysique } = dimensionsEcranPhysiques();
  return {
    forcee: echelleForceeRendu,
    naturelle: calculerEchelleEntiere(largeurPhysique, hauteurPhysique),
  };
}

// Rectangle (en pixels PHYSIQUES du canvas visible) où l'image logique mise
// à l'échelle est centrée — le reste du canvas reste en bandes noires
// (letterboxing), déjà peintes par la couleur de fond du canvas.
export function calculerRectanglePresentation(largeurEcran, hauteurEcran, resolution = RESOLUTION_LOGIQUE) {
  const echelle = calculerEchelleEntiere(largeurEcran, hauteurEcran, resolution);
  const largeur = resolution.largeur * echelle;
  const hauteur = resolution.hauteur * echelle;
  return {
    echelle,
    largeur,
    hauteur,
    x: Math.floor((largeurEcran - largeur) / 2),
    y: Math.floor((hauteurEcran - hauteur) / 2),
  };
}

// `surFrame` (MT_mesure-saccades_2026-09-19) : hook de mesure optionnel,
// jamais appelé (donc jamais un seul `performance.now()` supplémentaire) si
// l'appelant ne le fournit pas — la boucle réelle du jeu ne le passe que sous
// `?debug=fps` (cf. ui/hud_debug.js), zéro coût sinon. Reçoit
// { tMs, deltaBrut, delta, plafonne, dureeMajMs, dureeDessinerMs } : la
// distinction deltaBrut/delta et le flag `plafonne` répondent à la piste 2 du
// ticket (irrégularité du delta-time / frames plafonnées), dureeMajMs/
// dureeDessinerMs à la piste 4 (part maj()/dessiner() dans une frame lente).
export function creerBoucle({ maj, dessiner, surFrame }) {
  let dernierT = null;
  let enCours = false;

  function frame(tMs) {
    if (!enCours) return;
    if (dernierT === null) dernierT = tMs;
    const deltaBrut = tMs - dernierT;
    const delta = plafonnerDelta(deltaBrut);
    dernierT = tMs;
    const t0 = surFrame ? performance.now() : 0;
    maj(delta);
    const t1 = surFrame ? performance.now() : 0;
    dessiner();
    if (surFrame) {
      surFrame({
        tMs,
        deltaBrut,
        delta,
        plafonne: deltaBrut > delta,
        dureeMajMs: t1 - t0,
        dureeDessinerMs: performance.now() - t1,
      });
    }
    requestAnimationFrame(frame);
  }

  return {
    demarrer() {
      enCours = true;
      dernierT = null;
      requestAnimationFrame(frame);
    },
    arreter() {
      enCours = false;
    },
  };
}

// DPR : lu ici et nulle part ailleurs (avec `versCoordonneesLogiques`, qui
// doit s'accorder sur le même chiffre) — deux lectures indépendantes de
// `devicePixelRatio` pourraient diverger d'une frame à l'autre sur un
// changement de zoom/écran (point 5 de specs/MT_rendu-net_2026-09-15.md).
// 1 hors navigateur (headless), où `window` n'existe pas.
function obtenirDpr() {
  return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
}

// Taille de la fenêtre en pixels à la fois CSS et PHYSIQUES (device) :
// confondre les deux sous-estime l'échelle disponible sur un écran HiDPI
// (ex. téléphone 360 px CSS de large à DPR 3 -> 1080 px physiques réels).
function dimensionsEcranPhysiques() {
  const dpr = obtenirDpr();
  const largeurCss = window.innerWidth;
  const hauteurCss = window.innerHeight;
  return {
    dpr,
    largeurCss,
    hauteurCss,
    largeurPhysique: Math.round(largeurCss * dpr),
    hauteurPhysique: Math.round(hauteurCss * dpr),
  };
}

// Alias exporté (MT_mesure-saccades_2026-09-19, piste 5 : "coût par pixel" —
// afficher DPR + résolution physique) — même fonction, jamais un second
// calcul : ui/hud_debug.js n'a pas d'autre moyen de lire ces chiffres, qui
// restent internes au module partout ailleurs.
export function dimensionsEcranPhysiquesActuelles() {
  return dimensionsEcranPhysiques();
}

// Redimensionne le canvas hors-écran de la scène en pixels PHYSIQUES
// (480·f x 270·f, f = échelle entière courante) et pose le repère qui fait
// que tout le reste du dessin de la frame — dessinerScene lui-même, puis
// dessinerObscurite, le HUD, la boîte de dialogue et l'écran de choix du
// follet (tous en main.js/ui/*, non modifiés) — continue d'écrire en unités
// logiques (480x270) tout en sortant net à la résolution physique de
// l'écran (MT_rendu-net_2026-09-15, point 1). Appelé sans condition à
// chaque frame (pas seulement au redimensionnement) : `ctx.setTransform`
// remplace l'état plutôt que de l'accumuler, donc rejouer la même valeur
// est sans risque et protège contre un `save`/`restore` déséquilibré ailleurs.
// `D-23` : seul endroit de tout le rendu qui consulte l'échelle forcée. Tout
// le reste (calques, HUD, dialogue, hit-test) n'en entend jamais parler —
// soit il écrit en unités logiques sous le repère posé ici, soit il relit
// l'échelle sur la largeur du canvas (echelleDepuisCanvas).
function ajusterCanvasLogiquePhysique(ctx) {
  const { largeurPhysique, hauteurPhysique } = dimensionsEcranPhysiques();
  const { echelle, largeur, hauteur } = dimensionnerCanvasRendu(largeurPhysique, hauteurPhysique, echelleForceeRendu);
  const canvas = ctx.canvas;
  if (canvas.width !== largeur || canvas.height !== hauteur) {
    canvas.width = largeur;
    canvas.height = hauteur;
  }
  ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
}

// §2.2 03_grotte-polish, provisoire, un seul endroit : dimensions de la
// barre de PV au-dessus d'un monstre "actif" (combat.js#estMonstreActif),
// px logiques.
export const BARRE_PV_MONSTRE = { largeur: 20, hauteur: 3, decalage_y: -14 };

// Couleur du témoin d'un levier activé (§3.3 03_grotte-polish) — seul
// endroit : la primitive `teinte: true` de visuel_levier passe du gris par
// défaut (JSON) à ce jaune allumé quand puzzlesEtat[id].actif est vrai, même
// mécanisme que le flash blanc du monstre touché (`options.teinte`).
const COULEUR_LEVIER_ACTIF = '#ffd94a';

// Aura pointillée du follet engagé (§2.2/§3.4 03_grotte-polish) — remplace
// l'ancien cercle plein épais du diagnostic SD_ui-lisibilite : purement
// visuel : le rayon, lui, vient de companion.js#resoudreRayonAuraPx, seule
// source du cercle dessiné comme de la règle qui l'utilise (`D-51`, `D-37`).
export const AURA_TRAIT = { largeur: 1, pointilles: [4, 4], alpha: 0.25 };

// Fantôme de pose (specs/05_construction-stations.md §3) : vert/rouge selon
// verdict.ok (main.js#poseValide), MAIS jamais la couleur seule (P4② carte
// mentale) — un marqueur de FORME distincte (coche pleine / croix) au-dessus
// de la silhouette translucide fait la différence pour un joueur qui ne
// distingue pas le vert du rouge.
const COULEUR_FANTOME_VALIDE = '#4ade80';
const COULEUR_FANTOME_INVALIDE = '#f87171';
const ALPHA_FANTOME = 0.6;

// --- Calque statique tuiles + décor (§3.4 grotte-polish, fenêtré depuis
// 03_maison-exterieur §2.2) -------------------------------------------------
// Une scène ne change jamais tuile par tuile pendant qu'on la visite (sauf
// une porte qui s'ouvre, cf. signaturePortesScene ci-dessous) : recalculer
// fillRect×(largeur×hauteur) + dessinerVisuel(décor) à CHAQUE frame est le
// premier poste de coût sur le plancher 30 fps mobile visé. Pré-rendu une
// fois par (scène, échelle, portes, FENÊTRE de tuiles visible) sur un canvas
// hors-écran, recadré par drawImage à chaque frame — même patron que
// canvasVoile plus bas.
//
// 03_maison-exterieur §2.2 (contrat de performance de la grande carte) exige
// que le rendu n'itère JAMAIS la scène entière (168x115+ tuiles) : le calque
// n'est donc plus construit sur la taille de la scène complète (viable pour
// les petites salles de la grotte, pas pour la Région Maison — un canvas
// couvrant 5440x3712px physiques dépasserait vite les limites mémoire/taille
// de canvas du navigateur) mais sur la seule FENÊTRE de tuiles visible (±1
// tuile de marge, cf. selectionnerTuilesVisibles). Recalculé seulement quand
// cette fenêtre change de tuile de départ (à chaque franchissement de tuile
// pendant un déplacement, pas à chaque frame) — un "cache de secteur" au
// sens de la fiche, pas un tableau pré-calculé de toute la carte.
let coucheStatique = null; // { sceneId, echelle, signaturePortes, xDebut, yDebut, canvas }

// Accesseur de lecture seule (MT_mesure-saccades_2026-09-19, piste 5 : "coût
// par pixel" du calque statique) — jamais appelé par le rendu lui-même,
// seulement par ui/hud_debug.js sous `?debug=fps`. `null` avant la première
// construction (aucune scène encore dessinée).
export function statsCoucheStatique() {
  return coucheStatique ? { largeur: coucheStatique.canvas.width, hauteur: coucheStatique.canvas.height } : null;
}

// Fenêtre de tuiles à dessiner pour couvrir le viewport logique courant, avec
// une marge (tuiles partiellement visibles au bord). Pure, testée
// (03_maison-exterieur §2.2 : bornée par le viewport, jamais par la taille de
// la scène) — indépendante de toute donnée de scène, seule la caméra et la
// résolution comptent.
export function selectionnerTuilesVisibles(camera, resolution, tileSize, margeTuiles = 1) {
  return {
    xDebut: Math.floor(camera.x / tileSize) - margeTuiles,
    yDebut: Math.floor(camera.y / tileSize) - margeTuiles,
    xFin: Math.ceil((camera.x + resolution.largeur) / tileSize) + margeTuiles,
    yFin: Math.ceil((camera.y + resolution.hauteur) / tileSize) + margeTuiles,
  };
}

// Signature de l'état des portes conditionnelles (scene.portes[], scene.js) :
// seule dépendance du calque statique qui peut changer SANS que la scène ou
// l'échelle changent (une porte qui s'ouvre pendant qu'on est dans la salle,
// §3.3 Phase 1) — sans cette clé, le calque pré-rendu figerait la porte dans
// son état d'entrée en scène pour toujours.
function signaturePortesScene(scene, estFlagActif) {
  return (scene.portes || []).map((p) => (estFlagActif && estFlagActif(p.flag) ? '1' : '0')).join('');
}

// `visuelsTuiles` : Map(id de tuile -> entrée visuels.json), résolue une fois
// par main.js à l'entrée en scène (même patron que `decor` déjà résolu) —
// une tuile qui en porte un (arbre, rocher…) est dessinée par-dessus son
// aplat de couleur, ancrée au bas de sa cellule (§3.3 : formes distinctes,
// jamais un simple carré plein).
function construireCoucheStatique(scene, decor, echelle, signaturePortes, estFlagActif, fenetre, visuelsTuiles) {
  const { xDebut, yDebut, xFin, yFin } = fenetre;
  const largeurCanvas = (xFin - xDebut) * scene.tileSize;
  const hauteurCanvas = (yFin - yDebut) * scene.tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(largeurCanvas * echelle));
  canvas.height = Math.max(1, Math.round(hauteurCanvas * echelle));
  const ctxCouche = canvas.getContext('2d');
  // Repère logique -> physique de CE calque (MT_rendu-net_2026-09-15) : un
  // dessin ici sort net à la résolution physique, jamais ré-échantillonné.
  ctxCouche.setTransform(echelle, 0, 0, echelle, 0, 0);

  for (let y = yDebut; y < yFin; y++) {
    for (let x = xDebut; x < xFin; x++) {
      const couleur = couleurTuile(scene, x, y, estFlagActif);
      if (!couleur) continue;
      const localX = (x - xDebut) * scene.tileSize;
      const localY = (y - yDebut) * scene.tileSize;
      ctxCouche.fillStyle = couleur;
      ctxCouche.fillRect(localX, localY, scene.tileSize, scene.tileSize);

      const tuile = scene.tuileA(x, y, estFlagActif);
      const visuelTuile = tuile && visuelsTuiles.get(tuile.id);
      if (visuelTuile) {
        dessinerVisuel(ctxCouche, visuelTuile, localX + scene.tileSize / 2, localY + scene.tileSize, {});
      }
    }
  }

  // Décor : seuls les motifs dont la tuile tombe dans la fenêtre — filtrer
  // avant de dessiner plutôt que de parcourir tout `decor` à chaque secteur
  // (§2.2 : le décor lui-même reste une liste en mémoire, générée une fois à
  // l'entrée en scène, cf. decor.js ; seul le DESSIN est borné ici).
  for (const motif of decor) {
    const tx = Math.floor(motif.x / scene.tileSize);
    const ty = Math.floor(motif.y / scene.tileSize);
    if (tx < xDebut || tx >= xFin || ty < yDebut || ty >= yFin) continue;
    dessinerVisuel(ctxCouche, motif.visuel, motif.x - xDebut * scene.tileSize, motif.y - yDebut * scene.tileSize, {
      rotation: motif.rotation,
    });
  }

  return { sceneId: scene.id, echelle, signaturePortes, xDebut, yDebut, canvas };
}

// Composite le calque statique (reconstruit si scène/échelle/portes/fenêtre
// ont changé) sur `ctx`, recadré à la position de la caméra — même technique
// que la composition du voile plus bas (repère identité le temps de l'appel,
// copie de pixels physiques 1:1, jamais un ré-échantillonnage).
//
// `surRecalcul` (MT_mesure-saccades_2026-09-19, piste 1 : "re-rendu du calque
// statique fenêtré au franchissement du bord") — optionnel, jamais appelé
// (donc jamais de `performance.now()`) hors `?debug=fps`, cf. creerBoucle
// ci-dessus pour le même patron. Reçoit { dureeMs } exactement quand le
// calque est effectivement reconstruit, jamais sur un simple recadrage.
function dessinerCoucheStatique(ctx, scene, decor, camera, estFlagActif, visuelsTuiles, surRecalcul) {
  const echelle = echelleDepuisCanvas(ctx.canvas.width);
  const signature = signaturePortesScene(scene, estFlagActif);
  const fenetre = selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, scene.tileSize);

  if (
    !coucheStatique ||
    coucheStatique.sceneId !== scene.id ||
    coucheStatique.echelle !== echelle ||
    coucheStatique.signaturePortes !== signature ||
    coucheStatique.xDebut !== fenetre.xDebut ||
    coucheStatique.yDebut !== fenetre.yDebut
  ) {
    const debut = surRecalcul ? performance.now() : 0;
    coucheStatique = construireCoucheStatique(scene, decor, echelle, signature, estFlagActif, fenetre, visuelsTuiles);
    if (surRecalcul) surRecalcul({ dureeMs: performance.now() - debut });
  }

  const { canvas, xDebut, yDebut } = coucheStatique;
  // Toujours >= 0 par construction (le calque commence à xDebut/yDebut, la
  // caméra ne peut être plus à gauche/haut que ce que la fenêtre couvre) —
  // remplace l'ancien mécanisme `calculerOrigineCouche` (scène plus petite
  // que le viewport, caméra centrée négative) : la fenêtre l'absorbe déjà,
  // elle n'a jamais besoin d'un décalage séparé.
  const sourceX = (camera.x - xDebut * scene.tileSize) * echelle;
  const sourceY = (camera.y - yDebut * scene.tileSize) * echelle;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(
    canvas,
    sourceX, sourceY, ctx.canvas.width, ctx.canvas.height,
    0, 0, ctx.canvas.width, ctx.canvas.height
  );
  ctx.restore();
}

// Dessine scène + décor + leviers + monstres + follet + héros sur le
// contexte logique (480x270 en unités logiques, quel que soit le facteur
// physique du canvas hors-écran — cf. ajusterCanvasLogiquePhysique
// ci-dessus). Jamais appelé depuis les tests headless. `heroVisuel`,
// `monstres[].visuel`, `follet.visuel` et `puzzles[].visuel` sont déjà
// résolus par l'appelant (main.js, qui a le registre) — dessinerScene ne
// connaît jamais visuels.json par id, seulement dessinerVisuel (§3.3 : une
// seule fonction de rendu, plus aucune forme d'entité dessinée inline ici).
export function dessinerScene(ctx, {
  scene, decor, camera, hero, heroVisuel, heroTeinte = null, monstres = [], follet, puzzles = [], estFlagActif, anneauAttaque,
  visuelsTuiles = new Map(), objetsSol = [], structures = [], fantome = null,
  // MT_trainee-poussiere_2026-09-19 : bouffées déjà calculées par
  // src/poussiere.js (pur) et déjà résolues en visuel par l'appelant — ce
  // fichier ne connaît ni le module, ni visuels.json par id. Défaut vide :
  // un appelant qui ne fournit rien dessine exactement comme avant.
  poussiere = null, sillage = null,
  // MT_mesure-saccades_2026-09-19, piste 1 : cf. dessinerCoucheStatique plus
  // haut — `undefined` par défaut, jamais fourni par le jeu réel hors
  // `?debug=fps` (ui/hud_debug.js).
  surRecalculCoucheStatique,
}) {
  ajusterCanvasLogiquePhysique(ctx);
  ctx.clearRect(0, 0, RESOLUTION_LOGIQUE.largeur, RESOLUTION_LOGIQUE.hauteur);

  // Tuiles + décor (§3.4 grotte-polish, fenêtré §2.2 03_maison-exterieur) :
  // calque statique pré-rendu, recadré par caméra — remplace les anciennes
  // boucles inline (fillRect par tuile + petit carré par motif de décor).
  dessinerCoucheStatique(ctx, scene, decor, camera, estFlagActif, visuelsTuiles, surRecalculCoucheStatique);

  // Leviers (§2.1/§3.3 : première fois qu'un puzzle "levier" a un rendu du
  // tout — Phase 1 posait le flag sans jamais rien afficher). Ancre "bas" :
  // (x,y) est le point de contact au sol, cf. visuel_levier.
  for (const levier of puzzles) {
    dessinerVisuel(ctx, levier.visuel, levier.x - camera.x, levier.y - camera.y, {
      teinte: levier.actif ? COULEUR_LEVIER_ACTIF : null,
      // specs/04_stations-proportions-collision.md : échelle par entrée
      // (stations ×2,1, leviers 1 par défaut) — dessinerVisuel() default déjà
      // 1 si absent, jamais un second défaut ici.
      echelle: levier.echelle,
      // specs/05_construction-stations.md §3 : rotation par quart de tour
      // (0 pour tout interactif jamais tourné, levier compris) — même champ
      // `options.rotation` (degrés) que dessinerVisuel() expose déjà.
      rotation: levier.rotation || 0,
    });
  }

  // Fantôme de pose (§3, mode Construction) : dessiné après les stations
  // réelles pour rester lisible par-dessus, jamais solide (aucune interaction
  // ni collision tant que la pose n'est pas confirmée).
  if (fantome) {
    const gx = fantome.x - camera.x;
    const gy = fantome.y - camera.y;
    const couleur = fantome.valide ? COULEUR_FANTOME_VALIDE : COULEUR_FANTOME_INVALIDE;
    dessinerVisuel(ctx, fantome.visuel, gx, gy, {
      teinte: couleur, alpha: ALPHA_FANTOME, echelle: fantome.echelle, rotation: fantome.rotation,
    });
    // Marqueur de forme (P4② : jamais la couleur seule) : coche pleine si
    // valide, croix si refusée — au-dessus de la silhouette.
    ctx.save();
    ctx.translate(gx, gy);
    ctx.strokeStyle = couleur;
    ctx.fillStyle = couleur;
    ctx.lineWidth = 2;
    if (fantome.valide) {
      ctx.beginPath();
      ctx.arc(0, -20, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-5, -25);
      ctx.lineTo(5, -15);
      ctx.moveTo(5, -25);
      ctx.lineTo(-5, -15);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Objets au sol (03_maison-exterieur §3.3) : branche/caillou/fruit — même
  // patron que les leviers ci-dessus, ancre "centre" (cf. visuel_branche &co).
  for (const objet of objetsSol) {
    dessinerVisuel(ctx, objet.visuel, objet.x - camera.x, objet.y - camera.y, {});
  }

  for (const monstre of monstres) {
    if (monstre.mort) continue;
    const mx = monstre.x - camera.x;
    const my = monstre.y - camera.y;

    // Flash "touché" (§3.1 03_grotte-polish) : teinte forcée en blanc pendant
    // FLASH_TOUCHE_MS, sur un coup d'auto-attaque comme sur un tick de DoT
    // (main.js#mettreAJourCombat pose monstre.flashMs dans les deux cas) —
    // s'arrête de lui-même si le monstre meurt (il n'est alors plus dessiné,
    // cf. le `continue` ci-dessus). Seule la primitive `teinte: true` du
    // visuel (le corps) blanchit ; une éventuelle facette non-teintable
    // reste visible par-dessus.
    dessinerVisuel(ctx, monstre.visuel, mx, my, { teinte: monstre.flashMs > 0 ? '#ffffff' : null });

    // Barre de PV (§3.1) : visible seulement si le monstre est "actif"
    // (engagé ou déjà touché) — jamais sur un monstre inerte à distance,
    // même déjà visible à l'écran.
    if (monstre.actif) {
      const { largeur: barreLargeur, hauteur: barreHauteur, decalage_y } = BARRE_PV_MONSTRE;
      const barreX = mx - barreLargeur / 2;
      const barreY = my + decalage_y;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barreX, barreY, barreLargeur, barreHauteur);
      const ratioPv = monstre.pvMax > 0 ? Math.max(0, Math.min(1, monstre.pv / monstre.pvMax)) : 0;
      ctx.fillStyle = '#c23a3a';
      ctx.fillRect(barreX, barreY, barreLargeur * ratioPv, barreHauteur);
    }

    // `D-40` (décision de Xav, 20/09) : **plus de nom au-dessus des
    // monstres**. L'étiquette du §4 de SD_ui-lisibilite chargeait l'affichage
    // — on les distingue désormais par la forme et la couleur, et rien n'est
    // mis à la place. Seul le DESSIN part : les noms restent dans
    // `enemies.json` et dans les locales pour le futur bestiaire et le
    // journal des découvertes. La barre de PV ci-dessus n'est pas concernée,
    // c'est un bloc distinct.
  }

  // Héros (§3.4 03_grotte-polish) : gris neutre au spawn (avant choix du
  // follet), teinté à la couleur du compagnon choisi ensuite — `heroTeinte`
  // est déjà résolu par l'appelant (main.js, save.js#COULEUR_HERO_NEUTRE ou
  // companion.render.couleur), jamais une 2ᵉ silhouette dessinée pour le cas
  // "neutre".
  // Traînée de poussière : SOUS le héros (dessinée juste avant lui) et dans
  // le monde (coordonnées caméra, comme toute entité) — donc le calque
  // d'obscurité, appliqué bien plus tard, l'assombrit la nuit sans code
  // dédié, exactement comme le reste de la scène.
  if (poussiere && poussiere.bouffees.length > 0) {
    for (const b of poussiere.bouffees) {
      dessinerVisuel(ctx, poussiere.visuel, b.x - camera.x, b.y - camera.y, {
        alpha: b.alpha,
        echelle: b.echelle,
      });
    }
  }

  dessinerVisuel(ctx, heroVisuel, hero.x - camera.x, hero.y - camera.y, { teinte: heroTeinte });

  // Sillage du follet (`D-36`) : même mécanisme que la poussière, dessiné
  // juste avant la silhouette pour passer dessous. render.js ne sait pas que
  // c'est un follet : il reçoit un visuel, une teinte et des bouffées.
  if (sillage && sillage.bouffees.length > 0) {
    for (const b of sillage.bouffees) {
      dessinerVisuel(ctx, sillage.visuel, b.x - camera.x, b.y - camera.y, {
        teinte: sillage.teinte,
        alpha: b.alpha,
        echelle: b.echelle,
      });
    }
  }

  if (follet) {
    // `D-34` : `follet.echelle` est résolue par main.js (échelle de jeu en
    // données, interpolée à la sortie de la cinématique). Absente = 1, donc
    // un appelant qui l'ignore dessine comme avant.
    dessinerVisuel(ctx, follet.visuel, follet.x - camera.x, follet.y - camera.y, {
      teinte: follet.couleur,
      echelle: follet.echelle === undefined ? 1 : follet.echelle,
    });
  }

  // Anneau d'attaque (§3.1 03_grotte-polish, spec 02_grotte.md §3.5 jamais
  // implémenté avant ce palier) : donut translucide entre [rayonMin,
  // rayonMax] (portée de l'arme équipée, déjà convertie en px logiques par
  // l'appelant) — un simple disque plein quand rayonMin = 0 (mêlée). Tracé
  // en evenodd : le cercle intérieur en sens inverse "troue" le disque
  // extérieur, généralise à une arme à distance (rayonMin > 0) sans code
  // spécifique. `alpha` décroît avec le temps restant (main.js), jamais
  // affiché pendant le cooldown (anneauAttaque est alors `null`).
  if (anneauAttaque) {
    const { rayonMin, rayonMax, alpha } = anneauAttaque;
    const cx = hero.x - camera.x;
    const cy = hero.y - camera.y;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rayonMax, 0, Math.PI * 2);
    if (rayonMin > 0) {
      ctx.moveTo(cx + rayonMin, cy);
      ctx.arc(cx, cy, rayonMin, 0, Math.PI * 2, true);
    }
    ctx.fillStyle = `rgba(255, 255, 255, ${(Math.max(0, Math.min(1, alpha)) * 0.35).toFixed(3)})`;
    ctx.fill('evenodd');
    ctx.restore();
  }

  // Toit (03_maison-exterieur §3.4) : dessiné APRÈS les entités (ordre de
  // calque documenté §4 : "scène -> entités -> toit -> obscurité ->
  // HUD/dialogue") — un simple rectangle teinté de la couleur de
  // `structure.render.valeur` (déjà résolue par l'appelant), opacité déjà
  // calculée par main.js (structures.js#calculerOpaciteToit, fonction pure
  // testée ailleurs). `opacite <= 0` : rien à peindre, la structure est
  // "grand ouverte" (intérieur entièrement visible).
  for (const structure of structures) {
    if (structure.opacite <= 0) continue;
    const x = structure.rect.x * scene.tileSize - camera.x;
    const y = structure.rect.y * scene.tileSize - camera.y;
    const largeur = structure.rect.w * scene.tileSize;
    const hauteur = structure.rect.h * scene.tileSize;
    ctx.save();
    ctx.globalAlpha = structure.opacite;
    ctx.fillStyle = structure.couleur;
    ctx.fillRect(x, y, largeur, hauteur);
    ctx.restore();
  }
}

// Voile jamais noir pur (0,94 rendait murs/sol/décor totalement invisibles
// hors halo, diagnostic SD_ui-lisibilite §2) mais bleuté — la grotte reste à
// 0,72 (valeur historique). Depuis 03_grotte-polish §3.4, l'opacité est une
// donnée PAR SCÈNE (scene.obscurite.opacite, cf. dessinerObscurite) : les
// futures maps "vides" pourront monter jusqu'à ~0,9 (D10 carte mentale,
// jamais 1.0 — "jamais de noir absolu"), sans toucher ce fichier.
const COULEUR_VOILE = '6, 10, 16'; // bleuté, pas gris neutre ni noir pur

// Portion du rayon d'une source de lumière totalement percée (voile à 0)
// avant d'entamer la décroissance douce vers le bord — un dégradé qui
// commence à décroître dès le centre (comportement d'avant ce diagnostic)
// donne un disque flou sans jamais de zone bien éclairée.
const RATIO_COEUR_LUMIERE = 0.35;

function hexVersRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Faisceau (§3.4 03_grotte-polish) : "rayon de lumière" tombant du haut de la
// scène, un triangle (apex à (x,y), base à `longueur` de distance, largeur
// dictée par `ouverture`) rempli d'un dégradé qui décroît vers la base —
// composé en 'lighter' par l'appelant (dessinerObscurite), jamais ici : cette
// fonction ne fait que tracer la forme, pas la composition du calque.
function dessinerFaisceau(ctx, { x, y, angle, ouverture, longueur, alpha }, camera) {
  const cx = x - camera.x;
  const cy = y - camera.y;
  const demiLargeurBase = Math.tan((ouverture / 2) * (Math.PI / 180)) * longueur;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  const degrade = ctx.createLinearGradient(0, 0, 0, longueur);
  degrade.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  degrade.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = degrade;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-demiLargeurBase, longueur);
  ctx.lineTo(demiLargeurBase, longueur);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Canvas hors-écran dédié au voile, réutilisé d'une frame à l'autre (créé
// paresseusement — jamais au niveau module, `document` n'existe pas sous
// Node). Cause racine trouvée en vérifiant le rendu en navigateur pendant ce
// diagnostic : percer un trou en "destination-out" DIRECTEMENT sur le canvas
// où la scène vient d'être dessinée n'y révèle pas la scène, ça l'EFFACE
// (elle est déjà fusionnée au voile en un seul bitmap) — le trou montrait du
// noir/transparent, jamais les murs/sol/héros dessous, quels que soient
// l'opacité ou le dégradé réglés. Le voile doit donc vivre sur son propre
// calque, puis se composer par-dessus la scène déjà dessinée (`ctx.drawImage`
// en `source-over` par défaut) : opaque = assombrit la scène, trou
// transparent = laisse la scène intacte en dessous.
let canvasVoile = null;
function obtenirCanvasVoile(largeur, hauteur) {
  if (!canvasVoile || canvasVoile.width !== largeur || canvasVoile.height !== hauteur) {
    canvasVoile = document.createElement('canvas');
    canvasVoile.width = largeur;
    canvasVoile.height = hauteur;
  }
  return canvasVoile;
}

// Même patron que statsCoucheStatique() plus haut — MT_mesure-saccades_2026-09-19.
export function statsCanvasVoile() {
  return canvasVoile ? { largeur: canvasVoile.width, hauteur: canvasVoile.height } : null;
}

// Calque d'obscurité (§3.1/§3.6) : la scène est noire hors des sources de
// lumière statiques (scene.lumieres) et de la lumière du follet, collée à
// sa position courante — jamais celle du héros (décision Xav : "le héros
// reste dans la pénombre, c'est voulu"). On peint le voile opaque sur son
// propre calque, on y perce des trous dégradés (coeur net, bord doux, cf.
// constantes ci-dessus) en "destination-out", puis on compose ce calque
// par-dessus la scène.
export function dessinerObscurite(ctx, { scene, camera, follet, rayonLumiereFollet, couleurLumiereFollet }) {
  if (!scene.obscurite) return;

  // Taille déjà posée par dessinerScene un peu plus tôt dans la même frame
  // (main.js les appelle l'un après l'autre sur le même ctx) : on la relit
  // au lieu de recalculer le facteur une 2ᵉ fois indépendamment — une seule
  // définition du facteur par frame (MT_rendu-net_2026-09-15, point 5).
  const { width: largeur, height: hauteur } = ctx.canvas;
  const echelle = echelleDepuisCanvas(largeur);

  // Calque voile à la MÊME taille physique que la scène, avec le même repère
  // logique : ses propres dessins (dégradés, arcs) sortent alors nets à la
  // résolution physique au lieu d'être pixélisés (point 2 du ticket).
  const voile = obtenirCanvasVoile(largeur, hauteur).getContext('2d');
  voile.setTransform(echelle, 0, 0, echelle, 0, 0);
  voile.clearRect(0, 0, RESOLUTION_LOGIQUE.largeur, RESOLUTION_LOGIQUE.hauteur);
  voile.globalCompositeOperation = 'source-over';
  voile.fillStyle = `rgba(${COULEUR_VOILE}, ${scene.obscurite.opacite})`;
  voile.fillRect(0, 0, RESOLUTION_LOGIQUE.largeur, RESOLUTION_LOGIQUE.hauteur);

  voile.globalCompositeOperation = 'destination-out';
  // Seuls les "halo" percent le voile (révèlent le sol) — un "faisceau" est
  // une atmosphère additive dessinée plus bas, jamais un trou (§3.4).
  const halos = (scene.lumieres || []).filter((l) => (l.type || 'halo') === 'halo');
  const sources = [...halos.map((l) => ({ x: l.x, y: l.y, rayon: l.rayon }))];
  if (follet) sources.push({ x: follet.x, y: follet.y, rayon: rayonLumiereFollet || 0 });

  for (const source of sources) {
    const x = source.x - camera.x;
    const y = source.y - camera.y;
    const degrade = voile.createRadialGradient(x, y, 0, x, y, source.rayon);
    degrade.addColorStop(0, 'rgba(255,255,255,1)');
    degrade.addColorStop(RATIO_COEUR_LUMIERE, 'rgba(255,255,255,1)');
    degrade.addColorStop(1, 'rgba(255,255,255,0)');
    voile.fillStyle = degrade;
    voile.beginPath();
    voile.arc(x, y, source.rayon, 0, Math.PI * 2);
    voile.fill();
  }

  // Composition 1:1 en pixels physiques : le calque voile est déjà à la
  // même taille physique que `ctx` (cf. `echelle` ci-dessus) — un drawImage
  // sous le repère logique (echelle,...) encore actif sur `ctx` doublerait
  // la mise à l'échelle et ne couvrirait qu'une fraction de l'écran. Repère
  // identité le temps de ce seul appel (MT_rendu-net_2026-09-15, point 2).
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(voile.canvas, 0, 0);
  ctx.restore();

  // Faisceaux (§3.4 03_grotte-polish) : atmosphère additive tombant du haut
  // de la scène, jamais un percement du voile (cf. `halos` ci-dessus, qui ne
  // contient QUE les lumières type "halo") — un faisceau éclaire l'air, il
  // ne révèle pas le sol dessous comme un halo. Repère logique restauré par
  // le ctx.restore() ci-dessus.
  const faisceaux = (scene.lumieres || []).filter((l) => l.type === 'faisceau');
  if (faisceaux.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const faisceau of faisceaux) dessinerFaisceau(ctx, faisceau, camera);
    ctx.restore();
  }

  // Teinte chaude légère au centre de la lumière du follet uniquement
  // (§2, "provisoire") : composite additif par-dessus le trou déjà percé,
  // jamais sur les lumières statiques (le halo d'entrée reste un simple
  // percement neutre, pas une source magique). Repère logique restauré par
  // le ctx.restore() ci-dessus : ces coordonnées restent en unités logiques.
  if (follet && couleurLumiereFollet && rayonLumiereFollet) {
    const { r, g, b } = hexVersRgb(couleurLumiereFollet);
    const x = follet.x - camera.x;
    const y = follet.y - camera.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const degrade = ctx.createRadialGradient(x, y, 0, x, y, rayonLumiereFollet);
    degrade.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.35)`);
    degrade.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.arc(x, y, rayonLumiereFollet, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Signal des zones de Chaos (specs/07_chaos-nocturne.md, palier D) : « la
// zone doit se deviner de loin la nuit ». Une teinte additive, douce, posée
// APRÈS le calque d'obscurité — elle se voit donc à travers la nuit, sans
// percer le voile ni révéler le sol (ce n'est pas une source de lumière : on
// devine une présence, on ne voit pas où l'on marche). Même patron que les
// faisceaux de la Grotte, dont elle reprend le principe.
//
// **Aucune lueur sur les monstres eux-mêmes** (décision Xav, `Q-27`) : avec
// une lumière de follet réduite, on ne les voit qu'au dernier moment, et
// c'est voulu.
//
// `zones` arrive tout prêt de main.js : { rect (px monde), couleur, alpha }.
// render.js ne lit ni spawns.json ni les zones de la scène.
export function dessinerSignalZones(ctx, { zones = [], camera }) {
  if (zones.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const zone of zones) {
    if (!(zone.alpha > 0)) continue;
    const { r, g, b } = hexVersRgb(zone.couleur);
    const cx = zone.rect.x + zone.rect.w / 2 - camera.x;
    const cy = zone.rect.y + zone.rect.h / 2 - camera.y;
    // Rayon = demi-diagonale : la teinte s'éteint au bord du rectangle plutôt
    // que de s'arrêter net, sinon on verrait la boîte au lieu de deviner la
    // zone.
    const rayon = Math.hypot(zone.rect.w, zone.rect.h) / 2;
    const degrade = ctx.createRadialGradient(cx, cy, 0, cx, cy, rayon);
    degrade.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${zone.alpha})`);
    degrade.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- Textes flottants de gain (MT_texte-flottant_2026-09-19, `D-05`) ------
// « +1 Bois » qui monte depuis la source du gain et s'efface. Dessiné en
// coordonnées du MONDE (comme toute entité) mais APRÈS le calque
// d'obscurité : c'est un retour d'interface, il doit rester lisible de nuit
// sans que la nuit ne l'assombrisse. C'est la seule raison pour laquelle il
// ne vit pas dans dessinerScene() avec la poussière.
//
// `textes` arrive déjà composé par l'appelant ({ x, y, texte, alpha }) :
// ce fichier ne connaît ni src/texte_flottant.js, ni i18n, ni le catalogue
// des items — même patron que `poussiere` et `monstre.label` plus haut.
// `config` porte les réglages de data/effets.json (tous PROVISOIRES).
//
// ctx.save()/restore() en tête/fin (règle de méthode née du diagnostic
// dialogues-invisibles) : ce calque ne touche pas la transform, mais modifie
// font/alpha/fillStyle — les restaurer évite toute fuite sur le HUD, dessiné
// juste après.
export function dessinerTextesFlottants(ctx, { textes, camera, config }) {
  if (!textes || textes.length === 0) return;
  const decalageY = config.offset_y_px || 0;
  const contourPx = config.contour_px || 0;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round'; // sans ça, le contour épais produit des pointes aux angles des lettres
  ctx.lineWidth = contourPx;
  for (const t of textes) {
    // `D-58` : la taille et la couleur viennent du STYLE du texte, pas du
    // réglage global — c'est la taille qui distingue « +1 » de « +1xp », et
    // la couleur ne fait que l'appuyer (elle ne porte jamais seule la
    // différence : règle d'accessibilité posée par Xav le 21/09). Un style
    // inconnu est une erreur de catalogue, jamais un repli silencieux qui
    // afficherait les deux textes identiques.
    const style = config.styles[t.style];
    if (!style) {
      throw new Error(
        `render.js#dessinerTextesFlottants : style de texte "${t.style}" absent de l'entrée d'effets `
        + `(styles connus : ${Object.keys(config.styles).join(', ')})`
      );
    }
    ctx.font = `bold ${style.taille_px}px monospace`;
    ctx.globalAlpha = t.alpha;
    const x = t.x - camera.x;
    const y = t.y - camera.y + decalageY;
    // Contour d'abord, remplissage ensuite : le texte reste lisible aussi
    // bien sur le sol clair du Jardin que sur le voile de nuit, sans
    // cartouche opaque qui masquerait la scène (§ "se lit sans gêner").
    if (contourPx > 0 && config.contour) {
      ctx.strokeStyle = config.contour;
      ctx.strokeText(t.texte, x, y);
    }
    ctx.fillStyle = style.couleur;
    ctx.fillText(t.texte, x, y);
  }
  ctx.restore();
}

// --- Paupières de l'intro (§3.5 étape 1, 03_grotte-polish palier 4) --------
// Même piège que le voile d'obscurité (SD_dialogues-invisibles_2026-09-15) :
// percer un trou en "destination-out" DIRECTEMENT sur `ctx` (scène déjà
// dessinée dessus) effacerait la scène au lieu de la révéler — elle est déjà
// fusionnée en un seul bitmap à ce stade. Calque dédié, composé par
// `drawImage` ensuite, même patron que `obtenirCanvasVoile`/`dessinerObscurite`.
let canvasPaupieres = null;
function obtenirCanvasPaupieres(largeur, hauteur) {
  if (!canvasPaupieres || canvasPaupieres.width !== largeur || canvasPaupieres.height !== hauteur) {
    canvasPaupieres = document.createElement('canvas');
    canvasPaupieres.width = largeur;
    canvasPaupieres.height = hauteur;
  }
  return canvasPaupieres;
}

// Bord dégradé de l'ouverture (même principe que RATIO_COEUR_LUMIERE) : sans
// lui, le contour de l'ellipse serait une coupure nette, contraire à la
// direction artistique "assemblage moderne" (dégradés, jamais de flou/filtre).
const RATIO_COEUR_PAUPIERE = 0.7;

// `ouverture` : 0 = paupières fermées (noir plein écran), 1 = grand ouvert
// (aucun voile dessiné, cf. le retour anticipé ci-dessous). Appelée par
// main.js#dessiner() en tout dernier, par-dessus scène/HUD/dialogue : c'est
// un rideau de cinématique, il doit tout couvrir tant qu'il n'est pas ouvert.
export function dessinerPaupieres(ctx, ouverture) {
  if (ouverture >= 1) return;
  const { width: largeur, height: hauteur } = ctx.canvas;
  const echelle = echelleDepuisCanvas(largeur);

  const calque = obtenirCanvasPaupieres(largeur, hauteur).getContext('2d');
  calque.setTransform(echelle, 0, 0, echelle, 0, 0);
  calque.clearRect(0, 0, RESOLUTION_LOGIQUE.largeur, RESOLUTION_LOGIQUE.hauteur);
  calque.globalCompositeOperation = 'source-over';
  calque.fillStyle = '#000000';
  calque.fillRect(0, 0, RESOLUTION_LOGIQUE.largeur, RESOLUTION_LOGIQUE.hauteur);

  if (ouverture > 0) {
    // Ellipse = cercle de rayon 1 tracé dans un repère mis à l'échelle
    // (rx, ry) plutôt qu'un dégradé radial elliptique natif (inexistant en
    // Canvas 2D) — save/restore encadre ce repère local, jamais de fuite vers
    // le reste du calque.
    calque.globalCompositeOperation = 'destination-out';
    calque.save();
    calque.translate(RESOLUTION_LOGIQUE.largeur / 2, RESOLUTION_LOGIQUE.hauteur / 2);
    calque.scale((RESOLUTION_LOGIQUE.largeur / 2) * ouverture, (RESOLUTION_LOGIQUE.hauteur / 2) * ouverture);
    const degrade = calque.createRadialGradient(0, 0, 0, 0, 0, 1);
    degrade.addColorStop(0, 'rgba(255,255,255,1)');
    degrade.addColorStop(RATIO_COEUR_PAUPIERE, 'rgba(255,255,255,1)');
    degrade.addColorStop(1, 'rgba(255,255,255,0)');
    calque.fillStyle = degrade;
    calque.beginPath();
    calque.arc(0, 0, 1, 0, Math.PI * 2);
    calque.fill();
    calque.restore();
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(calque.canvas, 0, 0);
  ctx.restore();
}

// Présente le canvas logique (mis à l'échelle par un facteur entier,
// centré, bandes noires) sur le canvas visible. `ctxVisible.canvas` doit
// déjà être dimensionné à la taille de la fenêtre par l'appelant (§4 :
// "fenêtre redimensionnée -> recalcul du facteur entier à la frame suivante").
// Conversion écran -> logique (inverse de calculerRectanglePresentation) :
// seule fonction pure qui sait faire ce calcul (diagnostic SD_ui-lisibilite
// §3c — avant cette extraction, main.js recopiait la formule inline pour le
// hit-test tactile, un 2ᵉ endroit qui aurait pu diverger du dessin sans
// qu'aucun test ne le remarque). Le dessin (logique -> écran) reste
// `calculerRectanglePresentation` + `drawImage` dans `presenter()` ; ceci en
// est la réciproque, utilisée par le hit-test tactile de main.js.
// `clientX`/`clientY` arrivent en pixels CSS (contrat des événements souris/
// tactiles du navigateur), `rect` est désormais en pixels PHYSIQUES (cf.
// calculerRectanglePresentation) : il faut donc convertir via le même DPR
// que la présentation, au même endroit unique (`obtenirDpr`) — sinon le
// hit-test tactile et le rendu pourraient s'accorder sur des facteurs
// différents (MT_rendu-net_2026-09-15, point 5).
export function versCoordonneesLogiques(clientX, clientY, rect) {
  const dpr = obtenirDpr();
  return { x: (clientX * dpr - rect.x) / rect.echelle, y: (clientY * dpr - rect.y) / rect.echelle };
}

export function presenter(ctxVisible, canvasLogique) {
  const canvas = ctxVisible.canvas;
  const { largeurCss, hauteurCss, largeurPhysique, hauteurPhysique } = dimensionsEcranPhysiques();

  // Buffer du canvas visible en pixels PHYSIQUES, boîte affichée en pixels
  // CSS via `style` : avant ce ticket, le buffer était dimensionné en
  // pixels CSS (largeurEcran = window.innerWidth sans tenir compte du DPR),
  // ce qui forçait le navigateur à ré-échantillonner lui-même un buffer
  // trop petit pour l'écran réel — flou/blocs (`image-rendering: pixelated`
  // d'index.html) même à un facteur entier par ailleurs correct.
  if (canvas.width !== largeurPhysique || canvas.height !== hauteurPhysique) {
    canvas.width = largeurPhysique;
    canvas.height = hauteurPhysique;
    canvas.style.width = `${largeurCss}px`;
    canvas.style.height = `${hauteurCss}px`;
  }

  ctxVisible.fillStyle = '#000000';
  ctxVisible.fillRect(0, 0, largeurPhysique, hauteurPhysique);

  const rect = calculerRectanglePresentation(largeurPhysique, hauteurPhysique);
  // canvasLogique est déjà rendu à cette même résolution physique (cf.
  // ajusterCanvasLogiquePhysique, appelé par dessinerScene avant ce
  // presenter() dans la même frame) : ce drawImage est un blit 1:1, plus un
  // ré-échantillonnage — `imageSmoothingEnabled` (hérité du mode pixel art)
  // est donc retiré, il n'y a plus rien à (dés)activer à cette étape.
  ctxVisible.drawImage(canvasLogique, rect.x, rect.y, rect.largeur, rect.hauteur);
}

// Boucle de rendu : requestAnimationFrame + dessin canvas. Le plafond de
// delta-time et le calcul d'échelle sont isolés en fonctions pures
// testables ; le dessin canvas lui-même n'est jamais exercé en headless
// (contrainte de méthode : le rendu revient à Xav dans un vrai navigateur).

import { dessinerVisuel, echelleVisuel } from './visuels.js';
import { boiteTampon, cleTampon, creerCacheTampons, MARGE_ANTIALIAS_PX } from './tampons.js';
import { couleurTuile, tuileDeSol, varianteTuile, ROTATION_MAX_DEG } from './decor.js';
import { cellulesAPeindre, indexerDecor, motifsDesCellules, planDefilement, rayonInfluence } from './defilement.js';
import { lisieresCase, visuelsDesLisieres } from './lisieres.js';
import { dessinerBarre, PALETTE_JAUGES } from './ui/barre.js';
import { boiteDansLeChamp, boiteDuVisuel, disqueDansLeChamp, vueDeCamera, visuelDansLeChamp } from './champ.js';
import { POLICE_CALLIGRAPHIE, POLICE_CHIFFRES } from './polices.js';
import {
  estDebout, objetsDeboutDeLaFenetre, ordonnerAvecFondus, piedDe, sansOmbre, tableAPlat, tuilesDebout,
} from './profondeur.js';

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
//
// `D-71` — LA BOUCLE SURVIT À UNE EXCEPTION. Décision de Xav, 21/09, après
// que la panne ait figé le jeu pour la DEUXIÈME fois : le freeze musique du
// 17/09 (une exception dans `audio.js` remontée jusqu'ici), puis le style de
// texte flottant manquant du 21/09. Les deux fois, la cause était minuscule
// et le symptôme total : plus une seule frame, donc plus de sondage manette
// ni clavier (ils vivent dans `maj()`), souris encore vivante parce qu'elle
// ne dépend pas du `requestAnimationFrame` — un tableau qui ne ressemble à
// aucun bug et qu'on ne sait pas lire.
//
// Ceci *révise* la position du 17/09 (« jamais un try/catch global autour de
// update()/dessiner(), qui masquerait aussi de vraies erreurs de gameplay »).
// Ce qui a changé : on ne masque rien. L'exception est journalisée avec sa
// pile, elle reste parfaitement visible en console — c'est seulement la MORT
// de la boucle qui n'est plus la punition. Une frame qui échoue est une
// frame perdue, pas une partie perdue.
export function creerBoucle({ maj, dessiner, surFrame }) {
  let dernierT = null;
  let enCours = false;
  // Compteur et signature de la dernière panne : à 60 fps, une frame qui
  // échoue échoue en général à toutes les suivantes. Tout journaliser noierait
  // le premier message — c'est-à-dire exactement celui qu'on cherche à lire.
  let nbFramesEnEchec = 0;
  let dernierePanne = null;

  function signalerPanne(erreur) {
    nbFramesEnEchec += 1;
    const signature = String((erreur && erreur.message) || erreur);
    if (signature !== dernierePanne) {
      dernierePanne = signature;
      console.error(
        'render.js#creerBoucle : exception pendant la frame — la boucle CONTINUE, '
        + 'mais cette frame est perdue (`D-71`)', erreur,
      );
    } else if (nbFramesEnEchec % 300 === 0) {
      console.error(`render.js#creerBoucle : ${nbFramesEnEchec} frames perdues sur « ${signature} »`);
    }
  }

  function frame(tMs) {
    if (!enCours) return;
    if (dernierT === null) dernierT = tMs;
    const deltaBrut = tMs - dernierT;
    const delta = plafonnerDelta(deltaBrut);
    dernierT = tMs;
    // La replanification est dans le `finally` : quoi qu'il arrive au-dessus,
    // y compris une exception dans `surFrame` lui-même, la frame suivante est
    // demandée. C'est LE point du ticket, et il ne doit dépendre d'aucun
    // chemin d'exécution particulier.
    try {
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
    } catch (erreur) {
      signalerPanne(erreur);
    } finally {
      requestAnimationFrame(frame);
    }
  }

  return {
    demarrer() {
      enCours = true;
      dernierT = null;
      nbFramesEnEchec = 0;
      dernierePanne = null;
      requestAnimationFrame(frame);
    },
    arreter() {
      enCours = false;
    },
    // Exposé pour les tests : combien de frames ont été perdues. Le seul
    // moyen de prouver qu'une exception n'a pas tué la boucle sans lire la
    // console.
    framesEnEchec: () => nbFramesEnEchec,
  };
}

// DPR : lu ici et nulle part ailleurs (avec `versCoordonneesLogiques`, qui
// doit s'accorder sur le même chiffre) — deux lectures indépendantes de
// `devicePixelRatio` pourraient diverger d'une frame à l'autre sur un
// changement de zoom/écran (point 5 de docs/archives/MT_rendu-net_2026-09-15.md).
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
// px logiques. `D-165` : 4 px de haut (à 3, le reflet et l'arête de la barre
// du bandeau se confondaient) et remontée à −19 — le rôdeur redessiné
// (`D-161`) porte des épines jusqu'à −14, que la barre recouvrait.
export const BARRE_PV_MONSTRE = { largeur: 20, hauteur: 4, decalage_y: -19 };

// Couleur du témoin d'un levier activé (§3.3 03_grotte-polish) — seul
// endroit : les primitives `teinte: true` du levier (voyant du socle, pommeau
// du manche) passent du gris par défaut (JSON) à cette couleur quand le geste
// du levier a touché sa butée (`D-158`), même mécanisme que le flash blanc du
// monstre touché (`options.teinte`). Ambre depuis le diagnostic polish du
// 23/09 (médiéval post-industriel : une lampe qui chauffe plutôt qu'un jaune
// de signalisation) — gardé LUMINEUX sur consigne de Xav : « on ne les
// assombrit pas, il faut bien voir qu'ils s'allument ». Provisoire.
const COULEUR_LEVIER_ACTIF = '#ffb84a';

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
let coucheStatique = null; // { sceneId, echelle, signaturePortes, xDebut, yDebut, xFin, yFin, canvas, numero, decor, visuelsTuiles, lisieres }
// `specs/13` paliers B puis C : DEUX canvas de calque, alloués une fois à la
// taille de la plus grande fenêtre possible (`tailleMaxCalque`), qui se passent
// le relais (ping-pong) : un défilement recopie l'un dans l'autre, décalé. En
// créer un neuf à chaque reconstruction coûtait une allocation de plusieurs
// mégaoctets et une part du ramasse-miettes, sans rien apporter ; les
// redimensionner chaque fois que la fenêtre passe de 17 à 18 cases aussi. Ils
// survivent à `invaliderCoucheStatique` : jeter le calque, c'est jeter ce
// qu'il MONTRE.
const canvasCalques = [null, null];
const AUCUNE_LISIERE = new Map();

// `specs/13` palier B (`D-153`) : les dessins de tuile, tramés une fois et
// posés ensuite (`tampons.js`). `echelleTampons` est l'échelle à laquelle le
// cache a été rempli : une autre échelle le vide.
const cacheTampons = creerCacheTampons(fabriquerTampon);
let echelleTampons = null;
// Faux seulement pour l'instrument `tools/scenarios/calque_identique.mjs`, qui
// importe ce module dans la page (le MÊME module que le jeu, une URL = une
// instance) et compare le calque tamponné au calque vectoriel. Le jeu ne le
// touche jamais.
let tamponsActifs = true;
export function definirTamponsActifs(actifs) {
  tamponsActifs = actifs;
  invaliderCoucheStatique();
}
// Même rôle pour le palier C : faux, chaque sortie de la zone pré-rendue
// reconstruit en entier — c'est la référence à laquelle `calque_identique.mjs`
// compare le calque défilé. Le jeu ne le touche jamais.
let defilementActif = true;
export function definirDefilementActif(actif) {
  defilementActif = actif;
  invaliderCoucheStatique();
}
// Refait le calque courant EN ENTIER, sur la MÊME fenêtre : la référence
// exacte d'un calque défilé (une reconstruction à la caméra du moment
// choisirait une autre fenêtre, et ses bords différeraient légitimement).
// `dx`, `dy` (en cases) la déplacent : c'est la contre-épreuve du scénario, deux
// reconstructions complètes d'origines différentes. Instrument seulement
// (`calque_identique.mjs`).
let fenetreImposee = null;
export function refaireCoucheStatiqueEnEntier({ dx = 0, dy = 0 } = {}) {
  if (!coucheStatique) return;
  const f = fenetreDe(coucheStatique);
  fenetreImposee = { xDebut: f.xDebut + dx, yDebut: f.yDebut + dy, xFin: f.xFin + dx, yFin: f.yFin + dy };
  coucheStatique = null;
}
function fenetreDe({ xDebut, yDebut, xFin, yFin }) {
  return { xDebut, yDebut, xFin, yFin };
}

// Ce que le défilement doit savoir d'un décor, d'une table des grains et d'une
// table des lisières : le décor rangé par case, et le RAYON D'INFLUENCE
// (`defilement.js#rayonInfluence`, jusqu'où une case peint chez ses voisines).
// Calculés une fois par liste de décor et par table : `main.js` refait ces
// objets à l'entrée en scène et au changement de preset, et ne les modifie
// jamais en place.
let influence = null;
function influenceDu(decor, visuelsTuiles, lisieres, tileSize) {
  if (influence && influence.decor === decor && influence.visuelsTuiles === visuelsTuiles
    && influence.lisieres === lisieres && influence.tileSize === tileSize) {
    return influence;
  }
  const memeDecor = influence && influence.decor === decor && influence.tileSize === tileSize;
  // `D-222` : le calque ne peint plus que ce qui est À PLAT (`profondeur.js`) ;
  // son rayon ne compte donc que ce qui y reste. Ce qui se tient debout a son
  // propre rayon, `rayonDebout` : jusqu'où, hors de sa case, un arbre ou un
  // caillou peut peindre — la marge de la fenêtre que la passe triée lit.
  const visuelsDecor = new Set(decor.map((m) => m.visuel));
  const table = tableAPlat(visuelsTuiles);
  const debout = tuilesDebout(visuelsTuiles);
  influence = {
    decor,
    visuelsTuiles,
    lisieres,
    tileSize,
    index: memeDecor ? influence.index : indexerDecor(decor, tileSize),
    rayon: rayonInfluence({
      visuelsTuiles: table,
      visuelsDecor: [...visuelsDecor].filter((v) => !estDebout(v)),
      visuelsLisieres: visuelsDesLisieres(lisieres),
      tileSize,
      rotationDecorMaxDeg: ROTATION_MAX_DEG,
    }),
    rayonDebout: rayonInfluence({
      visuelsTuiles: new Map([...visuelsTuiles].filter(([id]) => debout.has(id))),
      visuelsDecor: [...visuelsDecor].filter(estDebout),
      tileSize,
      rotationDecorMaxDeg: ROTATION_MAX_DEG,
    }),
  };
  return influence;
}

// Accesseur de lecture seule (MT_mesure-saccades_2026-09-19, piste 5 : "coût
// par pixel" du calque statique) — jamais appelé par le rendu lui-même,
// seulement par ui/hud_debug.js sous `?debug=fps`. `null` avant la première
// construction (aucune scène encore dessinée).
export function statsCoucheStatique() {
  return coucheStatique ? { largeur: coucheStatique.canvas.width, hauteur: coucheStatique.canvas.height } : null;
}

// Jette le calque : la prochaine frame le reconstruit, UNE fois (§4.5 du
// palier D de `specs/09_reglages-graphiques.md`). Il existe parce qu'un
// changement de preset modifie ce qu'on DESSINE sur le calque sans rien
// changer à ce que sa signature observe (scène, échelle, portes) : sans cet
// appel, l'ancien sol resterait affiché jusqu'au prochain franchissement de
// tuile. Un `null`, et rien d'autre — pas un drapeau « à refaire » qui
// pourrait rester allumé et reconstruire à chaque frame.
export function invaliderCoucheStatique() {
  coucheStatique = null;
  // Un changement de preset change les visuels de la table des grains (moins
  // de primitives) : les tampons d'avant montreraient l'ancien grain.
  cacheTampons.vider();
}

// Accesseur de lecture seule pour les instruments (`calque_identique.mjs`,
// `?debug=fps`) : le canvas du calque, et le nombre de tampons en cache.
// Jamais appelé par le rendu lui-même.
export function lireCoucheStatique() {
  return coucheStatique ? { ...coucheStatique, tampons: cacheTampons.taille } : null;
}

// Fenêtre de tuiles à dessiner pour couvrir le viewport logique courant, avec
// une marge (tuiles partiellement visibles au bord). Pure, testée
// (03_maison-exterieur §2.2 : bornée par le viewport, jamais par la taille de
// la scène) — indépendante de toute donnée de scène, seule la caméra et la
// résolution comptent.
const MARGE_FENETRE_TUILES = 1;
export function selectionnerTuilesVisibles(camera, resolution, tileSize, margeTuiles = MARGE_FENETRE_TUILES) {
  return {
    xDebut: Math.floor(camera.x / tileSize) - margeTuiles,
    yDebut: Math.floor(camera.y / tileSize) - margeTuiles,
    xFin: Math.ceil((camera.x + resolution.largeur) / tileSize) + margeTuiles,
    yFin: Math.ceil((camera.y + resolution.hauteur) / tileSize) + margeTuiles,
  };
}

// La taille, en cases, de la plus grande fenêtre que `selectionnerTuilesVisibles`
// peut rendre : `ceil((c + L) / t) − floor(c / t)` vaut au plus `ceil(L / t) + 1`
// (la vue à cheval sur une case de plus), plus la marge des deux côtés. Les
// deux canvas du calque ont cette taille : la fenêtre n'en occupe qu'une
// partie, le reste reste transparent et n'est jamais lu.
export function tailleMaxCalque(resolution, tileSize, margeTuiles = MARGE_FENETRE_TUILES) {
  return {
    cases: Math.ceil(resolution.largeur / tileSize) + 1 + 2 * margeTuiles,
    rangees: Math.ceil(resolution.hauteur / tileSize) + 1 + 2 * margeTuiles,
  };
}

// LA décision « faut-il reconstruire le calque statique ? », pure et exportée
// — appelée par le rendu ET par les tests, jamais recopiée d'un côté ou de
// l'autre (règle née de `D-71`/`D-72` : un harnais qui réimplémente ce qu'il
// prétend éprouver ne prouve rien).
//
// `D-01` (palier A de `specs/09_reglages-graphiques.md`) : la condition
// comparait `xDebut`/`yDebut` d'une frame à l'autre, donc reconstruisait à
// CHAQUE tuile franchie — alors que la fenêtre bâtie porte déjà une marge
// d'une tuile pleine, plus la fraction que `floor`/`ceil` ajoutent de chaque
// côté (entre 1 et 2 tuiles de rab, 1,5 en moyenne). Cette marge existait
// depuis la Phase 2 sans servir d'amortisseur. Elle le devient : on ne
// reconstruit que lorsque la vue SORT de la zone déjà pré-rendue.
//
// La question se pose en pixels PHYSIQUES, parce que c'est exactement celle
// que `drawImage` pose plus bas : « le rectangle source tient-il dans le
// calque ? ». Un test en pixels logiques laisserait passer l'arrondi de
// `canvas.width`, et une demi-frange vide au bord de l'écran.
export function calqueDoitEtreReconstruit(calque, { sceneId, echelle, signaturePortes, camera, tileSize, resolution = RESOLUTION_LOGIQUE }) {
  if (!calque) return true;
  if (calque.sceneId !== sceneId || calque.echelle !== echelle || calque.signaturePortes !== signaturePortes) return true;

  const sourceX = (camera.x - calque.xDebut * tileSize) * echelle;
  const sourceY = (camera.y - calque.yDebut * tileSize) * echelle;
  if (sourceX < 0 || sourceY < 0) return true;

  // Mêmes arrondis que `construireCoucheStatique` : c'est la taille réelle du
  // canvas qui borne, pas la taille idéale.
  const largeurCalque = Math.max(1, Math.round((calque.xFin - calque.xDebut) * tileSize * echelle));
  const hauteurCalque = Math.max(1, Math.round((calque.yFin - calque.yDebut) * tileSize * echelle));
  return sourceX + resolution.largeur * echelle > largeurCalque || sourceY + resolution.hauteur * echelle > hauteurCalque;
}

// Signature de l'état des portes conditionnelles (scene.portes[], scene.js) :
// seule dépendance du calque statique qui peut changer SANS que la scène ou
// l'échelle changent (une porte qui s'ouvre pendant qu'on est dans la salle,
// §3.3 Phase 1) — sans cette clé, le calque pré-rendu figerait la porte dans
// son état d'entrée en scène pour toujours.
function signaturePortesScene(scene, estFlagActif) {
  return (scene.portes || []).map((p) => (estFlagActif && estFlagActif(p.flag) ? '1' : '0')).join('');
}

// `visuelsTuiles` : Map(id de tuile -> LISTE d'entrées visuels.json — le
// visuel de la tuile puis ses variantes, déjà allégées par le preset), résolue
// une fois par main.js à l'entrée en scène (même patron que `decor` déjà
// résolu) — une tuile qui en porte un (arbre, rocher…) est dessinée par-dessus
// son aplat de couleur, ancrée au bas de sa cellule (§3.3 : formes
// distinctes, jamais un simple carré plein). La case choisit SON dessin et son
// miroir par `decor.js#varianteTuile` (polish ambiance, 23/09).
// `specs/13` palier B : le même dessin, POSÉ depuis son tampon au lieu d'être
// rejoué primitive par primitive. L'ancre est ramenée à un pixel physique
// entier (elle l'est déjà à toute échelle entière : le jeu réel), et le
// tampon la porte sur un pixel entier : le trait tombe au même endroit de la
// grille des pixels que s'il était dessiné ici.
function dessinerVisuelDeTuile(ctx, scene, tuile, visuels, x, y, localX, localY, echelle) {
  const { index, miroir } = varianteTuile(scene, x, y, visuels.length, tuile.render.miroir);
  const visuel = visuels[index];
  const ancreX = localX + scene.tileSize / 2;
  const ancreY = localY + scene.tileSize;
  poserDessin(ctx, visuel, ancreX, ancreY, echelle, miroir, 0);
}

// `specs/13` palier D : une LISIÈRE reçue (`lisieres.js#lisieresCase`), ancrée
// au CENTRE de sa case — un quart de tour autour du centre garde le dessin dans
// la case. Tamponnée comme un grain : la rotation entre dans la clé.
function dessinerLisiere(ctx, pose, localX, localY, tileSize, echelle) {
  poserDessin(ctx, pose.visuel, localX + tileSize / 2, localY + tileSize / 2, echelle, pose.miroir, pose.rotation);
}

// Un dessin de tuile, posé depuis son tampon (ou rejoué en vectoriel sous
// l'instrument `definirTamponsActifs(false)`). L'ancre est ramenée à un pixel
// physique entier (elle l'est déjà à toute échelle entière : le jeu réel), et le
// tampon la porte sur un pixel entier : le trait tombe au même endroit de la
// grille des pixels que s'il était dessiné ici.
function poserDessin(ctx, visuel, ancreX, ancreY, echelle, miroir, rotation) {
  if (!tamponsActifs) {
    dessinerVisuel(ctx, visuel, ancreX, ancreY, { miroir, rotation });
    return;
  }
  const cle = cleTampon({ id: visuel.id, nbPrimitives: visuel.primitives.length, miroir, rotation, echelle });
  const tampon = cacheTampons.obtenir(cle, visuel, echelle, miroir, rotation);
  poserTampon(ctx, tampon, Math.round(ancreX * echelle), Math.round(ancreY * echelle), echelle);
}

// Trame UN dessin dans un canvas à sa taille (`tampons.js#boiteTampon`), son
// ancre sur un pixel entier. Contexte à lui, transform posée à neuf : rien ne
// fuit vers le calque.
function fabriquerTampon(visuel, echelle, miroir, rotation) {
  const boite = boiteTampon(visuel, echelle, { echelleVisuel: echelleVisuel(visuel), miroir, rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, boite.largeur);
  canvas.height = Math.max(1, boite.hauteur);
  const ctxTampon = canvas.getContext('2d');
  ctxTampon.setTransform(echelle, 0, 0, echelle, boite.ancreX, boite.ancreY);
  dessinerVisuel(ctxTampon, visuel, 0, 0, { miroir, rotation });
  return { canvas, ancreX: boite.ancreX, ancreY: boite.ancreY };
}

// Pose un tampon à une position PHYSIQUE entière : sous le repère identité le
// temps du `drawImage`, pour qu'aucune division par l'échelle ne laisse une
// fraction de pixel qui ferait ré-échantillonner l'image. La transform du
// calque (`echelle`) est remise en fin de fonction : l'appelant continue en
// unités logiques (règle des calques qui touchent la transform).
function poserTampon(ctx, tampon, ancrePhysX, ancrePhysY, echelle) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tampon.canvas, ancrePhysX - tampon.ancreX, ancrePhysY - tampon.ancreY);
  ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
}

// Le canvas n° `i` du calque, à la taille maximale de la fenêtre à cette
// échelle. Créé une fois ; redimensionné seulement quand l'échelle change.
function canvasDuCalque(i, tileSize, echelle) {
  const { cases, rangees } = tailleMaxCalque(RESOLUTION_LOGIQUE, tileSize);
  const largeur = Math.max(1, Math.round(cases * tileSize * echelle));
  const hauteur = Math.max(1, Math.round(rangees * tileSize * echelle));
  if (!canvasCalques[i]) canvasCalques[i] = document.createElement('canvas');
  const canvas = canvasCalques[i];
  if (canvas.width !== largeur || canvas.height !== hauteur) {
    // Redimensionner efface déjà le canvas (et remet son contexte à zéro).
    canvas.width = largeur;
    canvas.height = hauteur;
  }
  return canvas;
}

// Peint les `cellules` de `fenetre`, puis le décor qui y est ancré, dans
// l'ordre qui DÉFINIT le calque (`specs/13` §4.3) : case par case, ligne par
// ligne, l'aplat, le grain de sa surface, les lisières qu'elle reçoit, l'objet
// de la tuile ; puis le décor, dans l'ordre de sa liste. La lisière passe donc
// SOUS l'arbre et SUR le grain.
// `D-222` : seulement ce qui est À PLAT. Un objet de tuile ou un motif de décor
// qui se tient debout (`profondeur.js`) n'est plus cuit ici : il se peint à
// chaque frame, trié avec les entités par son pied (`dessinerScene`). Cuit, il
// était sous le héros quoi qu'il arrive, et la flaque du décor peinte après lui
// recouvrait sa couronne. La reconstruction complète et la bande d'un
// défilement passent toutes deux par ici : c'est ce qui garantit qu'elles
// peignent la même chose. Le contexte est sous la transform du calque
// (`echelle`) et y reste.
function peindreCellules(ctxCouche, scene, index, echelle, estFlagActif, fenetre, cellules, visuelsTuiles, lisieres) {
  const { xDebut, yDebut } = fenetre;
  const debout = tuilesDebout(visuelsTuiles);
  for (const { x, y } of cellules) {
    const couleur = couleurTuile(scene, x, y, estFlagActif);
    if (!couleur) continue;
    const localX = (x - xDebut) * scene.tileSize;
    const localY = (y - yDebut) * scene.tileSize;
    ctxCouche.fillStyle = couleur;
    ctxCouche.fillRect(localX, localY, scene.tileSize, scene.tileSize);

    const tuile = scene.tuileA(x, y, estFlagActif);
    // `Q-70` : le grain du sol d'abord (celui de la table, donc allégé par
    // le preset exactement comme la surface voisine), l'objet par-dessus.
    // Une tuile sans `render.sol` EST sa surface : son dessin est son grain,
    // et il passe avant les lisières.
    const sol = tuile && tuileDeSol(scene, tuile);
    const grainSol = sol && !debout.has(sol.id) && visuelsTuiles.get(sol.id);
    if (grainSol) dessinerVisuelDeTuile(ctxCouche, scene, sol, grainSol, x, y, localX, localY, echelle);
    for (const pose of lisieresCase(scene, x, y, estFlagActif, lisieres)) {
      dessinerLisiere(ctxCouche, pose, localX, localY, scene.tileSize, echelle);
    }
    const visuelsTuile = tuile && tuile !== sol && !debout.has(tuile.id) && visuelsTuiles.get(tuile.id);
    if (visuelsTuile) dessinerVisuelDeTuile(ctxCouche, scene, tuile, visuelsTuile, x, y, localX, localY, echelle);
  }

  // Décor : les seuls motifs ancrés dans ces cases, lus dans l'index par case
  // (`defilement.js#indexerDecor`) et remis dans l'ordre de la liste — jamais
  // un parcours de tout `decor`, dont la longueur suit la taille de la carte
  // (§4.5). Le décor garde son dessin vectoriel (rotation continue, §4.4).
  for (const motif of motifsDesCellules(index, cellules)) {
    if (estDebout(motif.visuel)) continue;
    dessinerVisuel(ctxCouche, motif.visuel, motif.x - xDebut * scene.tileSize, motif.y - yDebut * scene.tileSize, {
      rotation: motif.rotation,
    });
  }
}

// `xFin`/`yFin` sont gardés depuis `D-01` : sans eux, personne ne peut dire
// jusqu'où le calque couvre, donc personne ne peut décider de NE PAS le
// reconstruire (cf. `calqueDoitEtreReconstruit`). `decor`, `visuelsTuiles` et
// `lisieres` disent ce que le calque montre : un défilement n'a le droit de
// recopier que ce qu'il redessinerait à l'identique.
function calqueDe(scene, echelle, signaturePortes, { xDebut, yDebut, xFin, yFin }, canvas, numero, decor, visuelsTuiles, lisieres) {
  return { sceneId: scene.id, echelle, signaturePortes, xDebut, yDebut, xFin, yFin, canvas, numero, decor, visuelsTuiles, lisieres };
}

// La reconstruction COMPLÈTE : toute la fenêtre, sur un canvas effacé.
function construireCoucheStatique(scene, decor, echelle, signaturePortes, estFlagActif, fenetre, visuelsTuiles, lisieres) {
  const { index } = influenceDu(decor, visuelsTuiles, lisieres, scene.tileSize);
  const numero = coucheStatique ? coucheStatique.numero : 0;
  const canvas = canvasDuCalque(numero, scene.tileSize, echelle);
  const ctxCouche = canvas.getContext('2d');
  // Une case sans couleur (hors de la scène) reste transparente : l'ancien
  // calque ne doit pas s'y voir.
  ctxCouche.setTransform(1, 0, 0, 1, 0, 0);
  ctxCouche.clearRect(0, 0, canvas.width, canvas.height);
  // Repère logique -> physique de CE calque (MT_rendu-net_2026-09-15) : un
  // dessin ici sort net à la résolution physique, jamais ré-échantillonné.
  ctxCouche.setTransform(echelle, 0, 0, echelle, 0, 0);
  peindreCellules(ctxCouche, scene, index, echelle, estFlagActif, fenetre, cellulesAPeindre(fenetre), visuelsTuiles, lisieres);
  return calqueDe(scene, echelle, signaturePortes, fenetre, canvas, numero, decor, visuelsTuiles, lisieres);
}

// `specs/13` palier C (`D-01`) : le DÉFILEMENT. Seules les cases qui peuvent
// toucher la zone nouvelle sont peintes (`defilement.js#planDefilement` : la
// bande entrante, élargie du rayon d'influence), par `peindreCellules` — les
// mêmes cases, dans le même ordre, qu'une reconstruction complète. Puis la
// zone `copie` est effacée et reçoit l'ancien calque, décalé. Rend `null`
// quand rien ne se recopie (saut de caméra) : l'appelant reconstruit en
// entier.
//
// Pourquoi peindre D'ABORD et recopier ENSUITE par-dessus, plutôt que
// recopier puis repeindre sous un découpage (`clip`) comme le disait la
// spec : le résultat est le même par construction (la recopie remplace tout
// ce que la peinture a mis dans `copie`), sans chemin de découpe à poser.
// Dans la zone repeinte, chaque dessin est tramé comme dans la reconstruction
// complète ; la recopie (un `drawImage` sur des pixels effacés) pose l'ancien
// calque tel quel. Seul écart mesuré (`calque_identique.mjs`, contre-épreuve
// comprise) : le décor vectoriel, à des positions fractionnaires, peut
// différer d'UN niveau d'antialias selon l'origine du calque où il a été
// tramé — ce que deux reconstructions complètes décalées font déjà.
//
// Tout se compte en pixels PHYSIQUES entiers : une case y mesure
// `tileSize × echelle`, entier à toute échelle du jeu réel. Sous `?echelle=N`
// décimale (debug), une case tomberait entre deux pixels et la recopie
// ré-échantillonnerait : on reconstruit alors en entier, toujours.
function defilerCoucheStatique(ancien, scene, decor, echelle, estFlagActif, fenetre, visuelsTuiles, lisieres) {
  const pas = scene.tileSize * echelle;
  if (!Number.isInteger(pas)) return null;
  const { index, rayon } = influenceDu(decor, visuelsTuiles, lisieres, scene.tileSize);
  const plan = planDefilement(ancien, fenetre, rayon);
  if (!plan) return null;

  const numero = 1 - ancien.numero;
  const canvas = canvasDuCalque(numero, scene.tileSize, echelle);
  const ctxCouche = canvas.getContext('2d');
  ctxCouche.setTransform(1, 0, 0, 1, 0, 0);
  ctxCouche.clearRect(0, 0, canvas.width, canvas.height);
  ctxCouche.setTransform(echelle, 0, 0, echelle, 0, 0);
  peindreCellules(
    ctxCouche, scene, index, echelle, estFlagActif, fenetre, cellulesAPeindre(fenetre, plan.sansDessin), visuelsTuiles, lisieres,
  );

  // La recopie, sous le repère identité : effacer, puis poser. Sur des pixels
  // effacés, `source-over` pose les pixels tels quels (prémultipliés, rien à
  // arrondir) — la zone recopiée EST l'ancien calque, au pixel.
  const { copie } = plan;
  const largeur = (copie.xFin - copie.xDebut) * pas;
  const hauteur = (copie.yFin - copie.yDebut) * pas;
  const cibleX = (copie.xDebut - fenetre.xDebut) * pas;
  const cibleY = (copie.yDebut - fenetre.yDebut) * pas;
  ctxCouche.setTransform(1, 0, 0, 1, 0, 0);
  ctxCouche.clearRect(cibleX, cibleY, largeur, hauteur);
  ctxCouche.drawImage(
    ancien.canvas,
    (copie.xDebut - ancien.xDebut) * pas, (copie.yDebut - ancien.yDebut) * pas, largeur, hauteur,
    cibleX, cibleY, largeur, hauteur,
  );
  // Le calque rendu est sous la transform du calque, comme après une
  // reconstruction complète.
  ctxCouche.setTransform(echelle, 0, 0, echelle, 0, 0);

  return calqueDe(scene, echelle, ancien.signaturePortes, fenetre, canvas, numero, decor, visuelsTuiles, lisieres);
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
function dessinerCoucheStatique(ctx, scene, decor, camera, estFlagActif, visuelsTuiles, lisieres, surRecalcul) {
  const echelle = echelleDepuisCanvas(ctx.canvas.width);
  const signature = signaturePortesScene(scene, estFlagActif);
  if (echelle !== echelleTampons) {
    cacheTampons.vider();
    echelleTampons = echelle;
  }

  if (calqueDoitEtreReconstruit(coucheStatique, {
    sceneId: scene.id, echelle, signaturePortes: signature, camera, tileSize: scene.tileSize, resolution: RESOLUTION_LOGIQUE,
  })) {
    // La fenêtre n'est calculée QUE lorsqu'on reconstruit : tant que la vue
    // tient dans le calque, il n'y a rien à sélectionner.
    const fenetre = fenetreImposee || selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, scene.tileSize);
    fenetreImposee = null;
    const debut = surRecalcul ? performance.now() : 0;
    // `specs/13` palier C : la MARCHE défile (même scène, même échelle, mêmes
    // portes, même décor, même table des grains, même table des lisières :
    // seule la caméra a bougé) ; tout le reste, et tout saut de caméra,
    // reconstruit en entier.
    const ancien = coucheStatique;
    const marche = defilementActif && ancien && ancien.sceneId === scene.id && ancien.echelle === echelle
      && ancien.signaturePortes === signature && ancien.decor === decor && ancien.visuelsTuiles === visuelsTuiles
      && ancien.lisieres === lisieres;
    const defile = marche
      ? defilerCoucheStatique(ancien, scene, decor, echelle, estFlagActif, fenetre, visuelsTuiles, lisieres)
      : null;
    coucheStatique = defile
      || construireCoucheStatique(scene, decor, echelle, signature, estFlagActif, fenetre, visuelsTuiles, lisieres);
    if (surRecalcul) surRecalcul({ dureeMs: performance.now() - debut, defilement: defile !== null });
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

// `D-222` : ce qui se tient DEBOUT dans le monde statique, autour de la vue —
// les objets de tuile (arbres, rochers) et les motifs de décor debout
// (cailloux, touffes, cristaux), prêts à trier avec les entités. Ils ne sont
// plus cuits dans le calque (`peindreCellules`) : ils se posent à chaque frame.
//
// La fenêtre est celle de la vue, élargie du rayon de ce qui est debout
// (`influenceDu#rayonDebout`, déduit des dessins : la couronne d'un arbre de la
// rangée sous l'écran dépasse dans l'écran). La liste ne se refait que quand
// cette fenêtre, les portes, le décor ou la table des grains changent — une
// fois par case franchie, comme le calque ; entre deux, elle est relue telle
// quelle, et `dessinerScene` n'en garde que ce qui est dans le champ. Elle ne
// lit jamais que les cases de sa fenêtre (`specs/13` §4.6).
let deboutStatiques = null;
function dessinsDeboutStatiques(scene, decor, camera, estFlagActif, visuelsTuiles, lisieres) {
  const { index, rayonDebout } = influenceDu(decor, visuelsTuiles, lisieres, scene.tileSize);
  const fenetre = selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, scene.tileSize, Math.max(MARGE_FENETRE_TUILES, rayonDebout));
  const signature = signaturePortesScene(scene, estFlagActif);
  const cle = `${scene.id}|${fenetre.xDebut},${fenetre.yDebut},${fenetre.xFin},${fenetre.yFin}|${signature}`;
  if (deboutStatiques && deboutStatiques.cle === cle && deboutStatiques.decor === decor
    && deboutStatiques.visuelsTuiles === visuelsTuiles) {
    return deboutStatiques.elements;
  }
  const tuiles = objetsDeboutDeLaFenetre(scene, fenetre, estFlagActif, visuelsTuiles)
    .map((o) => ({ ...o, genre: 'tuile', rotation: 0 }));
  const motifs = motifsDesCellules(index, cellulesAPeindre(fenetre))
    .filter((m) => estDebout(m.visuel))
    .map((m) => ({
      genre: 'decor', x: m.x, y: m.y, visuel: m.visuel, rotation: m.rotation, miroir: false,
      pied: piedDe(m.visuel, m.y, { rotation: m.rotation }),
    }));
  // Le décor avant les tuiles : à pied égal, le tri (stable) garde cet ordre.
  deboutStatiques = { cle, decor, visuelsTuiles, elements: [...motifs, ...tuiles] };
  return deboutStatiques.elements;
}

// Un objet de tuile debout, posé depuis son TAMPON (le même cache que le
// calque : un arbre est tramé une fois par dessin, miroir et échelle). Le
// calque montre une ancre de tuile au pixel physique `round(ancre × échelle)`,
// recopié à l'écran décalé de `caméra × échelle` : l'arbre est posé exactement
// là, donc il glisse avec son sol au même sous-pixel près — ni tremblement
// entre le tronc et l'herbe, ni ré-échantillonnage de plus que le sol. Sous
// l'instrument `definirTamponsActifs(false)`, le dessin vectoriel.
//
// `alpha` (`D-223`) : le repassage d'un fondu. Un tampon est déjà UN bloc : une
// opacité sur sa pose est un vrai fondu du dessin entier.
function poserObjetDeTuile(ctx, objet, camera, echelle, alpha = 1) {
  if (!tamponsActifs) {
    dessinerVisuel(ctx, objet.visuel, objet.x - camera.x, objet.y - camera.y, { miroir: objet.miroir, alpha });
    return;
  }
  const cle = cleTampon({ id: objet.visuel.id, nbPrimitives: objet.visuel.primitives.length, miroir: objet.miroir, rotation: 0, echelle });
  const tampon = cacheTampons.obtenir(cle, objet.visuel, echelle, objet.miroir, 0);
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  poserTampon(
    ctx, tampon,
    Math.round(objet.x * echelle) - camera.x * echelle,
    Math.round(objet.y * echelle) - camera.y * echelle,
    echelle,
  );
  ctx.restore();
}

// `D-223` : ce qu'un élément de la profondeur peint, et où — le visuel, sa
// position et sa pose, lus pour savoir si son dessin touche celui du héros.
function poseDe(element, hero, heroVisuel) {
  switch (element.genre) {
    case 'tuile':
    case 'decor':
      return { visuel: element.visuel, x: element.x, y: element.y, options: { miroir: element.miroir, rotation: element.rotation } };
    case 'puzzle':
      return {
        visuel: element.levier.visuel, x: element.levier.x, y: element.levier.y,
        options: { echelle: element.levier.echelle, rotation: element.levier.rotation },
      };
    case 'objet':
      return { visuel: element.objet.visuel, x: element.objet.x, y: element.objet.y, options: {} };
    case 'monstre':
      return { visuel: element.monstre.visuel, x: element.monstre.x, y: element.monstre.y, options: { miroir: element.monstre.miroir === true } };
    case 'heros':
      return { visuel: heroVisuel, x: hero.x, y: hero.y, options: {} };
    default:
      return null;
  }
}

// Le même élément, peint sans son ombre portée : le repassage d'un fondu.
function sansOmbreElement(element) {
  switch (element.genre) {
    case 'tuile':
    case 'decor':
      return { ...element, visuel: sansOmbre(element.visuel) };
    case 'puzzle':
      return { ...element, levier: { ...element.levier, visuel: sansOmbre(element.levier.visuel) } };
    case 'objet':
      return { ...element, objet: { ...element.objet, visuel: sansOmbre(element.objet.visuel) } };
    case 'monstre':
      return { ...element, monstre: { ...element.monstre, visuel: sansOmbre(element.monstre.visuel) } };
    default:
      return element;
  }
}

// Peint UN élément de la profondeur. `scene` porte ce que certains ont besoin
// de connaître (la caméra, l'échelle, le héros et son follet).
function dessinerElement(ctx, element, scene) {
  const { camera } = scene;
  switch (element.genre) {
    case 'tuile':
      poserObjetDeTuile(ctx, element, camera, scene.echelle);
      break;
    case 'decor':
      dessinerVisuel(ctx, element.visuel, element.x - camera.x, element.y - camera.y, { rotation: element.rotation });
      break;
    case 'puzzle':
      dessinerInteractif(ctx, element.levier, camera);
      break;
    case 'objet':
      dessinerVisuel(ctx, element.objet.visuel, element.objet.x - camera.x, element.objet.y - camera.y, {});
      break;
    case 'monstre':
      dessinerCorpsMonstre(ctx, element.monstre, camera);
      break;
    case 'heros':
      // Héros : `heroOptions` sont les options de `dessinerVisuel`, résolues
      // par l'appelant (main.js : la teinte du follet ou le gris neutre,
      // la direction du regard, l'angle affiché, le souffle et le pas) et
      // passées TELLES QUELLES. `D-282` : recopiées champ par champ ici, deux
      // fois, elles perdaient en route ce qu'on leur ajoutait (l'angle et
      // l'animation de la spec 16, jamais arrivés au jeu) ; une option de plus
      // du héros ne touche plus ce fichier.
      dessinerVisuel(ctx, scene.heroVisuel, scene.hero.x - camera.x, scene.hero.y - camera.y, scene.heroOptions);
      break;
    case 'follet':
      dessinerFollet(ctx, scene.follet, scene.sillage, scene.ornementsFollet, camera);
      break;
    default:
      break;
  }
}

// `D-223` : le repassage d'un fondu, peint en UN BLOC à l'opacité `alpha`.
// Un dessin vectoriel est un empilement de primitives : lui donner une
// opacité primitive par primitive laisserait voir ses propres superpositions
// (la facette d'un caillou à travers sa base). On le peint donc d'abord, net,
// dans un petit canvas à part, puis on pose ce canvas d'un coup. Le canvas est
// alloué une fois et ne fait que grandir ; seule la boîte de l'élément est
// effacée et recopiée. Un objet de tuile est déjà un tampon : il n'y passe pas.
//
// Fonction unique qui touche les transforms (règle née de SD_dialogues-
// invisibles) : celle du canvas à part est posée à neuf à chaque appel, celle
// du contexte est rendue par `restore`.
let canvasFondu = null;
function dessinerEnBloc(ctx, echelle, boiteEcran, alpha, dessiner) {
  const gauche = Math.floor(boiteEcran.minX * echelle) - MARGE_ANTIALIAS_PX;
  const haut = Math.floor(boiteEcran.minY * echelle) - MARGE_ANTIALIAS_PX;
  const largeur = Math.ceil(boiteEcran.maxX * echelle) + MARGE_ANTIALIAS_PX - gauche;
  const hauteur = Math.ceil(boiteEcran.maxY * echelle) + MARGE_ANTIALIAS_PX - haut;
  if (largeur <= 0 || hauteur <= 0) return;
  if (!canvasFondu) canvasFondu = document.createElement('canvas');
  if (canvasFondu.width < largeur || canvasFondu.height < hauteur) {
    canvasFondu.width = Math.max(canvasFondu.width, largeur);
    canvasFondu.height = Math.max(canvasFondu.height, hauteur);
  }
  const c = canvasFondu.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, largeur, hauteur);
  c.setTransform(echelle, 0, 0, echelle, -gauche, -haut);
  dessiner(c);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(canvasFondu, 0, 0, largeur, hauteur, gauche, haut, largeur, hauteur);
  ctx.restore();
}
// La pièce mobile d'un levier tourne autour d'un pivot pris dans son dessin :
// elle peut dépasser la boîte du corps. Une marge pour elle, en px logiques.
const MARGE_PIECE_MOBILE_PX = 8;

// Un interactif (levier, station, coffre, stèle) et sa pièce mobile.
function dessinerInteractif(ctx, levier, camera) {
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
  // `D-158` : la pièce qui bascule (le manche), posée à son pivot — pivot
  // tourné avec l'interactif (une station tournée par quart de tour
  // garderait sa pièce en place), puis son propre angle par-dessus.
  if (levier.pieceMobile) {
    const { visuel, pivot, angle } = levier.pieceMobile;
    const rad = ((levier.rotation || 0) * Math.PI) / 180;
    const echelle = levier.echelle || 1;
    const px = (pivot[0] * Math.cos(rad) - pivot[1] * Math.sin(rad)) * echelle;
    const py = (pivot[0] * Math.sin(rad) + pivot[1] * Math.cos(rad)) * echelle;
    dessinerVisuel(ctx, visuel, levier.x + px - camera.x, levier.y + py - camera.y, {
      teinte: levier.actif ? COULEUR_LEVIER_ACTIF : null,
      echelle: levier.echelle,
      rotation: (levier.rotation || 0) + angle,
    });
  }
}

// Le corps d'un monstre (sa barre de PV se peint à part, après la profondeur).
function dessinerCorpsMonstre(ctx, monstre, camera) {
  // Flash "touché" (§3.1 03_grotte-polish) : teinte forcée en blanc pendant
  // FLASH_TOUCHE_MS, sur un coup d'auto-attaque comme sur un tick de DoT
  // (main.js#mettreAJourCombat pose monstre.flashMs dans les deux cas) —
  // s'arrête de lui-même si le monstre meurt (il n'est alors plus dessiné).
  // Seule la primitive `teinte: true` du visuel (le corps) blanchit ; une
  // éventuelle facette non-teintable reste visible par-dessus.
  // Spec 14, palier D : `miroir` (Zéros, la silhouette du héros retournée)
  // et `alpha` (le fondu d'une rencontre), résolus par l'appelant.
  //
  // `D-40` (décision de Xav, 20/09) : **plus de nom au-dessus des monstres**
  // — on les distingue par la forme et la couleur. Les noms restent dans
  // `enemies.json` et les locales pour le futur bestiaire.
  dessinerVisuel(ctx, monstre.visuel, monstre.x - camera.x, monstre.y - camera.y, {
    teinte: monstre.flashMs > 0 ? '#ffffff' : null,
    miroir: monstre.miroir === true,
    alpha: monstre.alpha == null ? 1 : monstre.alpha,
  });
}

// Le follet, son sillage et ses étincelles : un seul élément de la profondeur,
// peint d'un bloc — le sillage passe sous sa silhouette, l'orbite derrière
// puis devant.
function dessinerFollet(ctx, follet, sillage, ornementsFollet, camera) {
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

  // `D-134` : une orbite se lit parce qu'elle passe DERRIÈRE puis DEVANT ce
  // qu'elle entoure — d'où deux passes autour de la silhouette du follet.
  const dessinerEtincelles = (devant) => {
    if (!ornementsFollet) return;
    for (const e of ornementsFollet.etincelles) {
      if (e.devant !== devant) continue;
      dessinerVisuel(ctx, ornementsFollet.visuel, e.x - camera.x, e.y - camera.y, {
        teinte: ornementsFollet.teinte, alpha: e.alpha, echelle: e.echelle,
      });
    }
  };

  if (!follet) return;
  dessinerEtincelles(false);
  // `D-34` : `follet.echelle` est résolue par main.js (échelle de jeu en
  // données, interpolée à la sortie de la cinématique). Absente = 1, donc
  // un appelant qui l'ignore dessine comme avant.
  dessinerVisuel(ctx, follet.visuel, follet.x - camera.x, follet.y - camera.y, {
    teinte: follet.couleur,
    echelle: follet.echelle === undefined ? 1 : follet.echelle,
  });
  dessinerEtincelles(true);
}

// Dessine scène + décor + leviers + monstres + follet + héros sur le
// contexte logique (480x270 en unités logiques, quel que soit le facteur
// physique du canvas hors-écran — cf. ajusterCanvasLogiquePhysique
// ci-dessus). Jamais exercé sur un vrai canvas par les tests. `heroVisuel`,
// `monstres[].visuel`, `follet.visuel` et `puzzles[].visuel` sont déjà
// résolus par l'appelant (main.js, qui a le registre) — dessinerScene ne
// connaît jamais visuels.json par id, seulement dessinerVisuel (§3.3 : une
// seule fonction de rendu, plus aucune forme d'entité dessinée inline ici).
export function dessinerScene(ctx, {
  scene, decor, camera, hero, heroVisuel, heroOptions = {}, monstres = [], follet, puzzles = [], estFlagActif, anneauAttaque,
  visuelsTuiles = new Map(), objetsSol = [], structures = [], fantome = null,
  // `specs/13` palier D : la table des lisières (`lisieres.js#tableLisieres`),
  // construite par `main.js` et rendue telle quelle à `lisieresCase` — ce
  // fichier ne lit jamais un rang. Absente = aucune lisière. Le défaut est UNE
  // table, toujours la même : une table neuve à chaque frame empêcherait le
  // calque de défiler.
  lisieres = AUCUNE_LISIERE,
  // `D-223` : la largeur, en px logiques, de la bande du fondu d'un passage
  // (`graphismes.json > profondeur > fondu_px`, lue par `main.js`). 0 ou absente :
  // aucun fondu, le tri seul.
  fonduProfondeurPx = 0,
  // MT_trainee-poussiere_2026-09-19 : bouffées déjà calculées par
  // src/poussiere.js (pur) et déjà résolues en visuel par l'appelant — ce
  // fichier ne connaît ni le module, ni visuels.json par id. Défaut vide :
  // un appelant qui ne fournit rien dessine exactement comme avant.
  poussiere = null, sillage = null,
  // `D-134` : étincelles en orbite autour du follet ({ visuel, teinte,
  // etincelles: [{ x, y, devant, alpha, echelle }] }), déjà calculées par
  // `ornements.js`. Absent = rien, donc un appelant d'avant dessine pareil.
  ornementsFollet = null,
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
  // Depuis `D-222`, seulement ce qui est À PLAT : ce qui se tient debout est
  // trié plus bas avec les entités.
  dessinerCoucheStatique(ctx, scene, decor, camera, estFlagActif, visuelsTuiles, lisieres, surRecalculCoucheStatique);

  // `specs/13` palier F (§4.6) : une entité hors du champ ne se dessine pas.
  // Le calque statique est déjà fenêtré ; ce qui suit parcourait TOUTE la
  // scène — chaque monstre, interactif et objet au sol de la carte, à chaque
  // frame. `champ.js` juge sur ce qui se PEINT (boîte du dessin), jamais sur
  // la position seule : une station à moitié hors écran reste dessinée. Les
  // comptes remontent à l'instrument `?debug=fps` (dessinés / présents) ; le
  // héros, le follet et ce qui les suit sont toujours à l'écran, ils ne se
  // trient pas.
  const vue = vueDeCamera(camera, RESOLUTION_LOGIQUE);
  const dessines = { monstres: 0, puzzles: 0, objetsSol: 0 };

  // `D-222` : LA PROFONDEUR. Tout ce qui se tient debout (`profondeur.js` : ce
  // qui porte une ombre portée) se peint dans UNE liste, triée du nord au sud
  // par son pied : les arbres et les rochers de la carte, les cailloux et les
  // touffes du décor, les interactifs, les objets au sol, les monstres, le
  // héros, le follet. Un héros au nord d'un arbre passe derrière son feuillage,
  // au sud il passe devant. Ce qui est à plat est déjà sur le calque, dessous.
  // Avant, chaque famille avait son rang fixe (leviers, objets, monstres,
  // héros, follet), et le calque cuisait les arbres sous tout le monde.
  //
  // Ce qui dépasse d'une entité sans être un objet du monde (la barre de PV
  // d'un monstre, le fantôme d'une pose) se peint après la liste : c'est une
  // indication, un arbre ne doit pas la cacher.
  const echelle = echelleDepuisCanvas(ctx.canvas.width);
  const aTrier = [];
  for (const statique of dessinsDeboutStatiques(scene, decor, camera, estFlagActif, visuelsTuiles, lisieres)) {
    if (!visuelDansLeChamp(statique.visuel, statique.x, statique.y, vue, { miroir: statique.miroir, rotation: statique.rotation })) continue;
    aTrier.push(statique);
  }

  // Leviers (§2.1/§3.3 : première fois qu'un puzzle "levier" a un rendu du
  // tout — Phase 1 posait le flag sans jamais rien afficher). Ancre "bas" :
  // (x,y) est le point de contact au sol, cf. visuel_levier.
  for (const levier of puzzles) {
    // La pièce mobile tourne autour d'un pivot pris DANS le dessin de
    // l'interactif : si le corps est hors champ, elle l'est aussi.
    if (!visuelDansLeChamp(levier.visuel, levier.x, levier.y, vue, { echelle: levier.echelle, rotation: levier.rotation })) continue;
    dessines.puzzles += 1;
    aTrier.push({
      genre: 'puzzle', levier, pied: piedDe(levier.visuel, levier.y, { echelle: levier.echelle, rotation: levier.rotation }),
    });
  }

  // Objets au sol (03_maison-exterieur §3.3) : branche/caillou/fruit — même
  // patron que les leviers ci-dessus, ancre "centre" (cf. visuel_branche &co).
  for (const objet of objetsSol) {
    if (!visuelDansLeChamp(objet.visuel, objet.x, objet.y, vue)) continue;
    dessines.objetsSol += 1;
    aTrier.push({ genre: 'objet', objet, pied: piedDe(objet.visuel, objet.y) });
  }

  const barres = [];
  for (const monstre of monstres) {
    if (monstre.mort) continue;
    // Le corps OU sa barre de PV (qui dépasse au-dessus de la tête) : un
    // monstre sous le bord haut de l'écran peut n'y montrer que sa barre.
    const { largeur: barreL, hauteur: barreH, decalage_y: barreDy } = BARRE_PV_MONSTRE;
    const barreVisible = monstre.actif && boiteDansLeChamp({
      minX: monstre.x - barreL / 2, maxX: monstre.x + barreL / 2,
      minY: monstre.y + barreDy, maxY: monstre.y + barreDy + barreH,
    }, vue);
    const corpsVisible = visuelDansLeChamp(monstre.visuel, monstre.x, monstre.y, vue);
    if (!barreVisible && !corpsVisible) continue;
    dessines.monstres += 1;
    if (corpsVisible) aTrier.push({ genre: 'monstre', monstre, pied: piedDe(monstre.visuel, monstre.y) });
    // Barre de PV (§3.1) : visible seulement si le monstre est "actif"
    // (engagé ou déjà touché) — jamais sur un monstre inerte à distance,
    // même déjà visible à l'écran.
    if (monstre.actif) barres.push(monstre);
  }

  aTrier.push({ genre: 'heros', pied: piedDe(heroVisuel, hero.y) });
  if (follet) {
    aTrier.push({
      genre: 'follet',
      pied: piedDe(follet.visuel, follet.y, { echelle: follet.echelle === undefined ? 1 : follet.echelle }),
      // `D-223` : son orbite passe devant et derrière le héros par dessin.
      sansFondu: true,
    });
  }

  // Traînée de poussière : au ras du sol, donc SOUS tout ce qui est debout
  // (avant `D-222`, juste sous le héros). Dans le monde (coordonnées caméra,
  // comme toute entité) : le calque d'obscurité, appliqué bien plus tard,
  // l'assombrit la nuit sans code dédié, exactement comme le reste de la scène.
  if (poussiere && poussiere.bouffees.length > 0) {
    for (const b of poussiere.bouffees) {
      dessinerVisuel(ctx, poussiere.visuel, b.x - camera.x, b.y - camera.y, {
        alpha: b.alpha,
        echelle: b.echelle,
      });
    }
  }
  // Un sillage sans silhouette (le follet vient de disparaître) finit de
  // s'effacer au sol ; sinon il est peint avec le follet, sous lui.
  if (!follet) dessinerFollet(ctx, null, sillage, null, camera);

  // `D-223` : le fondu d'un passage (`profondeur.js#ordonnerAvecFondus`). Un
  // élément dont le pied est dans la bande du héros, et dont le dessin touche
  // le sien, est peint derrière lui puis repeint par-dessus, sans son ombre, à
  // l'opacité de sa part « devant ».
  const elementHeros = aTrier.find((e) => e.genre === 'heros');
  const poseHeros = poseDe(elementHeros, hero, heroVisuel);
  const boiteHeros = boiteDuVisuel(poseHeros.visuel, poseHeros.x, poseHeros.y, poseHeros.options);
  const boiteElement = (element) => {
    const pose = poseDe(element, hero, heroVisuel);
    if (!pose) return null;
    const b = boiteDuVisuel(pose.visuel, pose.x, pose.y, pose.options);
    if (element.genre !== 'puzzle' || !element.levier.pieceMobile) return b;
    const m = MARGE_PIECE_MOBILE_PX;
    return { minX: b.minX - m, maxX: b.maxX + m, minY: b.minY - m, maxY: b.maxY + m };
  };
  const touche = (element) => {
    const b = boiteElement(element);
    return !!b && b.maxX > boiteHeros.minX && b.minX < boiteHeros.maxX && b.maxY > boiteHeros.minY && b.minY < boiteHeros.maxY;
  };
  const scenePeinte = { camera, echelle, hero, heroVisuel, heroOptions, follet, sillage, ornementsFollet };
  for (const { element, alpha, repasse } of ordonnerAvecFondus(aTrier, elementHeros, fonduProfondeurPx, touche)) {
    if (!repasse) {
      dessinerElement(ctx, element, scenePeinte);
    } else if (element.genre === 'tuile') {
      poserObjetDeTuile(ctx, sansOmbreElement(element), camera, echelle, alpha);
    } else {
      const b = boiteElement(element);
      const boiteEcran = { minX: b.minX - camera.x, maxX: b.maxX - camera.x, minY: b.minY - camera.y, maxY: b.maxY - camera.y };
      const seul = sansOmbreElement(element);
      dessinerEnBloc(ctx, echelle, boiteEcran, alpha, (c) => dessinerElement(c, seul, scenePeinte));
    }
  }

  // Barres de PV, après la liste (voir plus haut).
  for (const monstre of barres) {
    const { largeur: barreLargeur, hauteur: barreHauteur, decalage_y } = BARRE_PV_MONSTRE;
    const barreX = monstre.x - camera.x - barreLargeur / 2;
    const barreY = monstre.y - camera.y + decalage_y;
    const ratioPv = monstre.pvMax > 0 ? Math.max(0, Math.min(1, monstre.pv / monstre.pvMax)) : 0;
    const alphaMonstre = monstre.alpha == null ? 1 : monstre.alpha;
    // `D-165` : la barre du bandeau (creux, corps, reflet, arête), plus un
    // fond noir et un aplat rouge — un monstre touché parle la même langue
    // que la jauge de PV du héros.
    ctx.save();
    if (alphaMonstre !== 1) ctx.globalAlpha *= alphaMonstre;
    dessinerBarre(ctx, { x: barreX, y: barreY, largeur: barreLargeur, hauteur: barreHauteur }, ratioPv, PALETTE_JAUGES.pv);
    ctx.restore();
  }

  // Fantôme de pose (§3, mode Construction) : dessiné après tout ce qui est
  // debout pour rester lisible par-dessus — c'est une intention, pas encore un
  // objet du monde —, jamais solide (aucune interaction ni collision tant que
  // la pose n'est pas confirmée).
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
    // `D-166` : une ONDE, plus un aplat — vive au bord intérieur, éteinte au
    // bord extérieur, à la couleur du compagnon (celle du héros : c'est lui
    // qui frappe). Même alpha de pointe que l'aplat d'avant (0,35) : l'anneau
    // ne se voit pas plus, il se lit mieux. Avant le choix du follet, la teinte
    // neutre du héros ; blanc si aucune.
    const a = Math.max(0, Math.min(1, alpha)) * 0.35;
    const { r, g, b } = hexVersRgb(heroOptions.teinte || '#ffffff');
    const onde = ctx.createRadialGradient(cx, cy, rayonMin, cx, cy, rayonMax);
    onde.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`);
    onde.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${(a * 0.7).toFixed(3)})`);
    onde.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = onde;
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
    dessinerToit(ctx, structure, scene, camera);
  }

  // Ce qui a été dessiné, sur ce qui était présent : lu par `?debug=fps`
  // seul (`main.js` le passe au moniteur), jamais par le jeu.
  return {
    monstres: { dessines: dessines.monstres, presents: monstres.filter((m) => !m.mort).length },
    puzzles: { dessines: dessines.puzzles, presents: puzzles.length },
    objetsSol: { dessines: dessines.objetsSol, presents: objetsSol.length },
  };
}

// `D-132` : un toit qui porte un `visuel` (celui de sa tuile, résolu par
// main.js) est une SURFACE de tuiles, comme le sol : le motif d'une cellule,
// répété sur tout le rectangle. Il est dessiné à CHAQUE frame (le toit passe
// au-dessus des entités et son opacité bouge avec le héros), donc jamais
// cellule par cellule — 224 cellules × une quarantaine de primitives, c'est
// dix mille ordres par frame. Le motif d'une cellule est rendu UNE fois, à la
// résolution physique, puis posé par `createPattern` : un seul remplissage.
//
// Le remplissage se fait en repère IDENTITÉ, à des coordonnées physiques
// entières — même raison que le calque statique : le motif est alors copié
// pixel pour pixel, jamais ré-échantillonné (un bardeau flou à chaque pas de
// caméra). Fonction unique qui touche la transform, et qui la restaure
// (règle de méthode née de SD_dialogues-invisibles).
//
// Sans `visuel`, l'aplat d'avant, à l'identique.
const motifsToit = new Map();
const MOTIFS_TOIT_MAX = 8; // un redimensionnement crée une échelle nouvelle ; le cache ne grossit pas sans fin

function motifDeToit(ctx, visuel, couleur, tileSize, echelle) {
  const cle = `${visuel.id}|${couleur}|${tileSize}|${echelle}`;
  let motif = motifsToit.get(cle);
  if (!motif) {
    const cote = Math.max(1, Math.round(tileSize * echelle));
    const cellule = document.createElement('canvas');
    cellule.width = cote;
    cellule.height = cote;
    const ctxCellule = cellule.getContext('2d');
    ctxCellule.setTransform(cote / tileSize, 0, 0, cote / tileSize, 0, 0);
    ctxCellule.fillStyle = couleur;
    ctxCellule.fillRect(0, 0, tileSize, tileSize);
    // Même ancrage que les tuiles du calque statique : milieu du bas de la cellule.
    dessinerVisuel(ctxCellule, visuel, tileSize / 2, tileSize, {});
    // `createPattern` peut rendre `null` (image sans données) : on ne met
    // alors rien en cache, et le toit retombe sur son aplat plutôt que de
    // lever dans la boucle de dessin (`D-71`).
    motif = ctx.createPattern(cellule, 'repeat') || null;
    if (!motif) return null;
    if (motifsToit.size >= MOTIFS_TOIT_MAX) motifsToit.clear();
    motifsToit.set(cle, motif);
  }
  return motif;
}

function dessinerToit(ctx, structure, scene, camera) {
  const x = structure.rect.x * scene.tileSize - camera.x;
  const y = structure.rect.y * scene.tileSize - camera.y;
  const largeur = structure.rect.w * scene.tileSize;
  const hauteur = structure.rect.h * scene.tileSize;
  const echelle = echelleDepuisCanvas(ctx.canvas.width);
  const motif = structure.visuel
    ? motifDeToit(ctx, structure.visuel, structure.couleur, scene.tileSize, echelle)
    : null;
  ctx.save();
  ctx.globalAlpha = structure.opacite;
  if (motif) {
    // Un motif s'ancre à l'origine du repère courant : on place donc
    // l'origine AU COIN du toit (en pixels physiques entiers), sinon les
    // bardeaux glisseraient sous le toit à chaque pas de caméra.
    ctx.setTransform(1, 0, 0, 1, Math.round(x * echelle), Math.round(y * echelle));
    ctx.fillStyle = motif;
    ctx.fillRect(0, 0, Math.round(largeur * echelle), Math.round(hauteur * echelle));
  } else {
    ctx.fillStyle = structure.couleur;
    ctx.fillRect(x, y, largeur, hauteur);
  }
  ctx.restore();
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

// Polish ambiance (23/09) : un halo de scène qui déclare une `couleur` (les
// cristaux de la Grotte, `decor.js#lumieresDuDecor`) teinte ce qu'il révèle,
// par le même geste additif que la lumière du follet — sans quoi le trou
// percé montre le sol en neutre, et une lumière magique éclaire comme une
// lampe. Plus bas que le follet (0,35) : la lumière que PORTE le héros reste
// la plus franche de l'écran. Provisoire, au jugé de la capture.
const ALPHA_TEINTE_HALO = 0.22;

function hexVersRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Faisceau (§3.4 03_grotte-polish) : "rayon de lumière" tombant du haut de la
// scène, un triangle (apex à (x,y), base à `longueur` de distance, largeur
// dictée par `ouverture`) rempli d'un dégradé qui décroît vers la base —
// composé en 'lighter' par l'appelant (dessinerObscurite), jamais ici : cette
// fonction ne fait que tracer la forme, pas la composition du calque.
function demiLargeurFaisceau({ ouverture, longueur }) {
  return Math.tan((ouverture / 2) * (Math.PI / 180)) * longueur;
}

// Jusqu'où une lumière de scène peint depuis son centre : le rayon d'un halo,
// et pour un faisceau la distance à ses coins lointains — le triangle tourne
// avec `angle`, un disque le couvre dans tous les sens.
function rayonDeLumiere(l) {
  return l.type === 'faisceau' ? Math.hypot(l.longueur, demiLargeurFaisceau(l)) : l.rayon;
}

function dessinerFaisceau(ctx, { x, y, angle, ouverture, longueur, alpha }, camera) {
  const cx = x - camera.x;
  const cy = y - camera.y;
  const demiLargeurBase = demiLargeurFaisceau({ ouverture, longueur });

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
// `respirationLumiereFollet` (`D-134`, défaut 1) : un facteur qui module la
// seule TEINTE chaude, jamais le trou percé dans le voile — ce que la lumière
// révèle du sol est une règle de jeu (`rayon_lumiere`, `D-35`), ce qu'elle
// colore est un ornement.
export function dessinerObscurite(ctx, {
  scene, camera, follet, rayonLumiereFollet, couleurLumiereFollet, respirationLumiereFollet = 1,
}) {
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
  // `specs/13` palier F : une lumière hors du champ n'éclaire rien de
  // visible. Sans ce tri, le voile perçait un dégradé pour chaque motif
  // lumineux du décor de TOUTE la carte (`decor.js#lumieresDuDecor`), à
  // chaque frame de nuit — un coût qui suivait la taille de la scène. Un halo
  // dont seul le bord flou entre dans l'écran reste percé.
  const vue = vueDeCamera(camera, RESOLUTION_LOGIQUE);
  const toutesLesLumieres = scene.lumieres || [];
  const lumieres = toutesLesLumieres.filter((l) => disqueDansLeChamp(l.x, l.y, rayonDeLumiere(l), vue));
  // Seuls les "halo" percent le voile (révèlent le sol) — un "faisceau" est
  // une atmosphère additive dessinée plus bas, jamais un trou (§3.4).
  const halos = lumieres.filter((l) => (l.type || 'halo') === 'halo');
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
  const teintes = halos.filter((l) => l.couleur);
  if (teintes.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of teintes) {
      const { r, g, b } = hexVersRgb(l.couleur);
      const x = l.x - camera.x;
      const y = l.y - camera.y;
      const degrade = ctx.createRadialGradient(x, y, 0, x, y, l.rayon);
      degrade.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${ALPHA_TEINTE_HALO})`);
      degrade.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = degrade;
      ctx.beginPath();
      ctx.arc(x, y, l.rayon, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const faisceaux = lumieres.filter((l) => l.type === 'faisceau');
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
    degrade.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 * respirationLumiereFollet})`);
    degrade.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.arc(x, y, rayonLumiereFollet, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Même rôle que le retour de `dessinerScene` : lu par `?debug=fps` seul.
  return { lumieres: { dessines: lumieres.length, presents: toutesLesLumieres.length } };
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

// --- Surlignages nocturnes (`D-191`) ----------------------------------------
// Le liseré blanc d'un objet au sol, la nuit (la plume), et son filet de
// particules en réglage Haut. APRÈS le calque d'obscurité, pour la même raison
// que les textes de gain : sous le voile, un blanc deviendrait gris. Ce n'est
// PAS une lumière : rien n'est projeté autour, le voile reste entier, seul le
// trait brille.
//
// Tout arrive résolu de main.js : `surlignages` = { x, y, visuel, alpha },
// `particules` = { x, y, visuel, alpha, echelle }. render.js ne sait ni quelle
// phase est la nuit, ni quel objet en porte un, ni quel réglage est actif.
// `dessinerVisuel` encadre chaque dessin d'un save/restore : la transform et
// l'alpha du contexte ressortent tels qu'ils sont entrés.
export function dessinerSurlignages(ctx, { surlignages = [], particules = [], camera }) {
  // `specs/13` palier F : même tri que les objets au sol qu'ils soulignent.
  const vue = vueDeCamera(camera, RESOLUTION_LOGIQUE);
  for (const s of surlignages) {
    if (!visuelDansLeChamp(s.visuel, s.x, s.y, vue)) continue;
    dessinerVisuel(ctx, s.visuel, s.x - camera.x, s.y - camera.y, { alpha: s.alpha });
  }
  for (const p of particules) {
    if (!visuelDansLeChamp(p.visuel, p.x, p.y, vue, { echelle: p.echelle })) continue;
    dessinerVisuel(ctx, p.visuel, p.x - camera.x, p.y - camera.y, { alpha: p.alpha, echelle: p.echelle });
  }
}

// --- Les tirs en vol (spec 14, palier C) ------------------------------------
// Dessinés APRÈS le voile, comme les surlignages : un crachat se voit venir
// dans le noir de l'Annexe (0,72), où le dessiner sous le voile le rendrait
// invisible hors des halos — et le lire à temps pour l'esquiver est tout le
// jeu. `projectiles` arrive résolu par l'appelant ({ x, y, visuel }) : ce
// fichier ne connaît ni `projectiles.js`, ni `visuels.json` par id. Trié par
// le champ (`specs/13` palier F), sur ce qui se peint.
export function dessinerProjectiles(ctx, { projectiles = [], camera }) {
  if (projectiles.length === 0) return 0;
  const vue = vueDeCamera(camera, RESOLUTION_LOGIQUE);
  let dessines = 0;
  for (const p of projectiles) {
    if (!visuelDansLeChamp(p.visuel, p.x, p.y, vue)) continue;
    dessines += 1;
    dessinerVisuel(ctx, p.visuel, p.x - camera.x, p.y - camera.y, {});
  }
  return dessines;
}

// --- L'onde d'un tir à zone (spec 14, palier G, la compétence) --------------
// Là où le tir a éclaté, un anneau s'élargit jusqu'au rayon qu'il a touché et
// s'efface : le joueur VOIT la zone, sans qu'elle dure. Après le voile, comme
// les tirs. `ondes` arrive résolu ({ x, y, rayon, couleur, t }, `t` de 0 à 1) ;
// ce fichier ne connaît pas la compétence. ctx.save()/restore() : il touche au
// trait et à l'alpha, jamais à la transform.
const ONDE_RAYON_DEPART = 0.35;
export function dessinerOndes(ctx, { ondes = [], camera }) {
  if (ondes.length === 0) return;
  ctx.save();
  for (const o of ondes) {
    const t = Math.min(1, Math.max(0, o.t));
    const rayon = o.rayon * (ONDE_RAYON_DEPART + (1 - ONDE_RAYON_DEPART) * (1 - (1 - t) * (1 - t)));
    const x = o.x - camera.x;
    const y = o.y - camera.y;
    ctx.globalAlpha = 0.18 * (1 - t);
    ctx.fillStyle = o.couleur || '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, rayon, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9 * (1 - t);
    ctx.strokeStyle = o.couleur || '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// --- La visée d'un doigt qui glisse (`D-248`) -----------------------------
// Tant qu'un doigt glisse depuis le bouton d'une compétence, un trait en
// pointillés part du héros dans sa direction, jusqu'au bout de la portée, et
// un cercle y montre la zone : au doigt, rien d'autre ne dit où l'on vise.
// Après le voile, comme les tirs (on vise aussi la nuit). `visees` arrive
// résolu ({ dx, dy, longueur, rayon, couleur }) : ce fichier ne connaît pas
// la compétence. ctx.save()/restore() : il touche au trait, au pointillé et à
// l'alpha, jamais à la transform.
export function dessinerVisees(ctx, { visees = [], camera, hero }) {
  if (visees.length === 0) return;
  ctx.save();
  const x0 = hero.x - camera.x;
  const y0 = hero.y - camera.y;
  for (const v of visees) {
    const n = Math.hypot(v.dx, v.dy);
    if (!(n > 0)) continue;
    const x1 = x0 + (v.dx / n) * v.longueur;
    const y1 = y0 + (v.dy / n) * v.longueur;
    ctx.strokeStyle = v.couleur || '#ffffff';
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x1, y1, v.rayon || 4, 0, Math.PI * 2);
    ctx.stroke();
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
    // différence : règle d'accessibilité posée par Xav le 21/09).
    //
    // `D-71` : un style inconnu ne lève PLUS ici. Ce `throw` vivait dans la
    // boucle de dessin, qui ne se replanifiait pas après une exception : il
    // transformait un texte sans taille — un défaut cosmétique — en jeu mort,
    // clavier et manette compris. Le garde-fou est remonté au démarrage
    // (`main.js#erreursStylesTexteFlottant`), là où une faute de catalogue se
    // voit avant d'être jouée. Ici, on saute le texte : c'est la bonne
    // dégradation pour un retour d'interface.
    const style = config.styles[t.style];
    if (!style) continue;
    // Polish libre du 24/09 : la même paire que le bandeau du HUD — chiffres
    // alignés, lettres à la plume — au lieu d'un `monospace` de console. Le
    // gras reste : c'est lui, avec le contour, qui tient le texte sur l'herbe.
    ctx.font = `bold ${style.taille_px}px "${POLICE_CHIFFRES}", "${POLICE_CALLIGRAPHIE}", serif`;
    ctx.globalAlpha = t.alpha;
    const x = t.x - camera.x;
    // Décalage propre au style, en plus du décalage global : deux gains émis
    // au MÊME point (« +1 » et « +1xp » d'une récolte) se chevauchaient et
    // devenaient illisibles. Le nombre vit en données, comme tout réglage —
    // et il est constant dans le temps, donc les deux textes montent ensemble
    // en gardant leur écart (demande de Xav, 21/09).
    const y = t.y - camera.y + decalageY + (style.offset_y_px || 0);
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

// Le symbole du jeu (ticket L2) : ses trois calques d'image superposés, chacun
// à son alpha et à son décalage (`logo.js#etatLogo`), centrés sur (x, y) en px
// logiques. `images` vient de `main.js#demarrerJeu` ; une image absente, pas
// encore chargée ou en erreur ne se dessine pas — « meilleur effort », le jeu
// tourne sans son logo comme il tourne sans sa musique. La transform du
// contexte n'est pas touchée : seul l'alpha change, rendu par save/restore.
export function dessinerLogo(ctx, images, { x, y, hauteur, calques }) {
  if (!images || images.length === 0) return;
  ctx.save();
  calques.forEach((calque, i) => {
    const image = images[i];
    if (!image || !image.complete || !image.naturalWidth || calque.alpha <= 0) return;
    const largeur = (hauteur * image.naturalWidth) / image.naturalHeight;
    ctx.globalAlpha = calque.alpha;
    ctx.drawImage(image, x - largeur / 2, y - hauteur / 2 + calque.dy, largeur, hauteur);
  });
  ctx.restore();
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
  // trop petit pour l'écran réel — flou/blocs (`image-rendering: pixelated`,
  // que portait alors index.html, retiré par `D-29`) même à un facteur entier
  // par ailleurs correct.
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

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

export function creerBoucle({ maj, dessiner }) {
  let dernierT = null;
  let enCours = false;

  function frame(tMs) {
    if (!enCours) return;
    if (dernierT === null) dernierT = tMs;
    const delta = plafonnerDelta(tMs - dernierT);
    dernierT = tMs;
    maj(delta);
    dessiner();
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
function ajusterCanvasLogiquePhysique(ctx) {
  const { largeurPhysique, hauteurPhysique } = dimensionsEcranPhysiques();
  const echelle = calculerEchelleEntiere(largeurPhysique, hauteurPhysique);
  const largeurCanvas = RESOLUTION_LOGIQUE.largeur * echelle;
  const hauteurCanvas = RESOLUTION_LOGIQUE.hauteur * echelle;
  const canvas = ctx.canvas;
  if (canvas.width !== largeurCanvas || canvas.height !== hauteurCanvas) {
    canvas.width = largeurCanvas;
    canvas.height = hauteurCanvas;
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
// visuel, DISTANCE_ENGAGEMENT_PX (companion.js) inchangé. Un seul endroit.
export const AURA_TRAIT = { largeur: 1, pointilles: [4, 4], alpha: 0.25 };

// --- Calque statique tuiles + décor (§3.4, performance) --------------------
// Une scène ne change jamais tuile par tuile pendant qu'on la visite (sauf
// une porte qui s'ouvre, cf. signaturePortesScene ci-dessous) : recalculer
// fillRect×(largeur×hauteur) + dessinerVisuel(décor) à CHAQUE frame est le
// premier poste de coût sur le plancher 30 fps mobile visé (les dégradés du
// décor — flaques — sont l'exemple cité par la fiche). Pré-rendu une fois par
// (scène, échelle, état des portes) sur un canvas hors-écran à la taille
// PHYSIQUE de la scène ENTIÈRE, puis simplement recadré par drawImage à
// chaque frame — même patron que canvasVoile plus bas, en plus grand et
// invalidé sur bien moins de changements (§4 : "changement de facteur
// d'échelle -> invalidé et reconstruit à la frame suivante", satisfait par
// construction puisque `echelle` fait partie de la clé de cache).
let coucheStatique = null; // { sceneId, echelle, signaturePortes, canvas, origineX, origineY }

// Une scène plus petite que le viewport est CENTRÉE, jamais bornée
// (camera.js) : camera.x/y peuvent alors être négatifs. `origine` décale le
// contenu pré-rendu dans un canvas assez grand pour couvrir aussi la zone de
// centrage — calculé avec exactement la même formule que calculerCamera,
// pour que `camera + origine` reste toujours >= 0 (sinon `drawImage` recevrait
// une coordonnée source négative).
function calculerOrigineCouche(tailleScenePx, tailleVue) {
  return Math.max(0, (tailleVue - tailleScenePx) / 2);
}

// Signature de l'état des portes conditionnelles (scene.portes[], scene.js) :
// seule dépendance du calque statique qui peut changer SANS que la scène ou
// l'échelle changent (une porte qui s'ouvre pendant qu'on est dans la salle,
// §3.3 Phase 1) — sans cette clé, le calque pré-rendu figerait la porte dans
// son état d'entrée en scène pour toujours.
function signaturePortesScene(scene, estFlagActif) {
  return (scene.portes || []).map((p) => (estFlagActif && estFlagActif(p.flag) ? '1' : '0')).join('');
}

function construireCoucheStatique(scene, decor, echelle, signaturePortes, estFlagActif) {
  const largeurScenePx = scene.width * scene.tileSize;
  const hauteurScenePx = scene.height * scene.tileSize;
  const origineX = calculerOrigineCouche(largeurScenePx, RESOLUTION_LOGIQUE.largeur);
  const origineY = calculerOrigineCouche(hauteurScenePx, RESOLUTION_LOGIQUE.hauteur);
  const largeurCanvas = Math.max(largeurScenePx, RESOLUTION_LOGIQUE.largeur);
  const hauteurCanvas = Math.max(hauteurScenePx, RESOLUTION_LOGIQUE.hauteur);

  const canvas = document.createElement('canvas');
  canvas.width = largeurCanvas * echelle;
  canvas.height = hauteurCanvas * echelle;
  const ctxCouche = canvas.getContext('2d');
  // Repère logique -> physique de CE calque, indépendant de celui de la
  // scène visible (mais au même facteur f) : un dessin ici sort net à la
  // résolution physique, jamais ré-échantillonné au moment du recadrage
  // (MT_rendu-net_2026-09-15) puisque source et destination partagent le
  // même facteur d'échelle.
  ctxCouche.setTransform(echelle, 0, 0, echelle, 0, 0);
  ctxCouche.translate(origineX, origineY);

  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const couleur = couleurTuile(scene, x, y, estFlagActif);
      if (!couleur) continue;
      ctxCouche.fillStyle = couleur;
      ctxCouche.fillRect(x * scene.tileSize, y * scene.tileSize, scene.tileSize, scene.tileSize);
    }
  }

  for (const motif of decor) {
    dessinerVisuel(ctxCouche, motif.visuel, motif.x, motif.y, { rotation: motif.rotation });
  }

  return { sceneId: scene.id, echelle, signaturePortes, canvas, origineX, origineY };
}

// Composite le calque statique (reconstruit si scène/échelle/portes ont
// changé) sur `ctx`, recadré à la position de la caméra — même technique que
// la composition du voile plus bas (repère identité le temps de l'appel,
// copie de pixels physiques 1:1, jamais un ré-échantillonnage).
function dessinerCoucheStatique(ctx, scene, decor, camera, estFlagActif) {
  const echelle = ctx.canvas.width / RESOLUTION_LOGIQUE.largeur;
  const signature = signaturePortesScene(scene, estFlagActif);

  if (
    !coucheStatique ||
    coucheStatique.sceneId !== scene.id ||
    coucheStatique.echelle !== echelle ||
    coucheStatique.signaturePortes !== signature
  ) {
    coucheStatique = construireCoucheStatique(scene, decor, echelle, signature, estFlagActif);
  }

  const { canvas, origineX, origineY } = coucheStatique;
  const sourceX = (camera.x + origineX) * echelle;
  const sourceY = (camera.y + origineY) * echelle;

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
}) {
  ajusterCanvasLogiquePhysique(ctx);
  ctx.clearRect(0, 0, RESOLUTION_LOGIQUE.largeur, RESOLUTION_LOGIQUE.hauteur);

  // Tuiles + décor (§3.4) : calque statique pré-rendu, recadré par caméra —
  // remplace les anciennes boucles inline (fillRect par tuile + petit carré
  // par motif de décor) de la Phase 1/palier 2, cf. dessinerCoucheStatique.
  dessinerCoucheStatique(ctx, scene, decor, camera, estFlagActif);

  // Leviers (§2.1/§3.3 : première fois qu'un puzzle "levier" a un rendu du
  // tout — Phase 1 posait le flag sans jamais rien afficher). Ancre "bas" :
  // (x,y) est le point de contact au sol, cf. visuel_levier.
  for (const levier of puzzles) {
    dessinerVisuel(ctx, levier.visuel, levier.x - camera.x, levier.y - camera.y, {
      teinte: levier.actif ? COULEUR_LEVIER_ACTIF : null,
    });
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

    // Étiquette (§4 diagnostic SD_ui-lisibilite) : nom seul sous le sprite,
    // déjà traduit par l'appelant (main.js) — pas de niveau, le champ
    // n'existe pas encore dans enemies.json (Phase 1).
    if (monstre.label) {
      ctx.save();
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(monstre.label, mx, my + 10);
      ctx.restore();
    }
  }

  // Héros (§3.4 03_grotte-polish) : gris neutre au spawn (avant choix du
  // follet), teinté à la couleur du compagnon choisi ensuite — `heroTeinte`
  // est déjà résolu par l'appelant (main.js, save.js#COULEUR_HERO_NEUTRE ou
  // companion.render.couleur), jamais une 2ᵉ silhouette dessinée pour le cas
  // "neutre".
  dessinerVisuel(ctx, heroVisuel, hero.x - camera.x, hero.y - camera.y, { teinte: heroTeinte });

  if (follet) {
    dessinerVisuel(ctx, follet.visuel, follet.x - camera.x, follet.y - camera.y, { teinte: follet.couleur });
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
  const echelle = largeur / RESOLUTION_LOGIQUE.largeur;

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
  const echelle = largeur / RESOLUTION_LOGIQUE.largeur;

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

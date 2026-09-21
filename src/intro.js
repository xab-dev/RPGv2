// Intro cinématique de la Grotte (03_grotte-polish §3.5, palier 4) : machine
// à états PURE, temps -> étape, jamais de DOM ici (rendue par dessinerVisuel
// depuis main.js#dessiner()/render.js) — même discipline que dialogue.js
// (une méthode maj(deltaMs) séparée du traitement d'input, testée hors
// canvas). Non narrée, non skippable : tant qu'elle tourne, le gameplay reçoit
// etatNeutre() au point de décision unique de main.js#maj() — une UI ouverte
// de plus (§6), aucune lecture d'input ici.
//
// Durées et paramètres de lévitation viennent de
// scenes.json > scene_grotte_salle_1.intro (données, toutes provisoires,
// §2.2/§9) : ce fichier ne code AUCUNE durée en dur, seulement les formes
// d'interpolation (ease) et les 3 positions de départ des follets (bords de
// la salle, arrangement visuel arbitraire sans effet gameplay — même statut
// que main.js#ORDRE_CHOIX_FOLLET).

// §3.5 étape 2 : "hors du halo, bords de la salle" — coordonnées ÉCRAN
// (résolution logique 480x270), pas monde : l'intro se dessine en overlay
// comme l'écran de choix existant (main.js#dessinerEcranChoixFollet), jamais
// via la caméra. Sans effet gameplay, provisoire comme tout arrangement
// purement visuel de cet écran.
const POSITIONS_DEPART_FOLLETS = [
  { x: -20, y: 200 },
  { x: 240, y: -30 },
  { x: 500, y: 200 },
];

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

// Un "clignement" isolé est modélisé en triangle (0 -> 1 -> 0) sur toute sa
// durée : suffisant pour l'effet recherché (§3.5 : paupières qui s'ouvrent
// puis se referment), pas besoin d'un plateau "grand ouvert" séparé.
function ouvertureClignement(t, duree) {
  const p = duree > 0 ? Math.min(1, t / duree) : 1;
  return p < 0.5 ? easeInOutQuad(p * 2) : easeInOutQuad((1 - p) * 2);
}

// Durée de l'étape "clignements" (§3.5 étape 1) : somme des ouvertures +
// les noirs ENTRE elles (jamais après la dernière, cf. boucle ci-dessous).
export function dureeClignements({ ouvertures_ms, noir_ms }) {
  return ouvertures_ms.reduce((a, b) => a + b, 0) + noir_ms * Math.max(0, ouvertures_ms.length - 1);
}

// Budget §3.5 : étapes 1 (clignements) + 2 (convergence) <= 8s sur les
// données réelles, vérifié par test — étapes 3 (bulle de choix, écran
// existant) et 4 (départ) ne sont pas comptées ici, elles dépendent du
// rythme du joueur, pas d'une durée fixe rejouée sans interaction.
export function dureeEtapesTempsFixe(config) {
  return dureeClignements(config.clignements) + config.convergence_ms;
}

export const ETAPE_CLIGNEMENTS = 'clignements';
export const ETAPE_CONVERGENCE = 'convergence';
// MT_intro-follets-visibles_2026-09-19 : 3ᵉ étape, atteinte une fois la partie
// à temps fixe finie. Elle ne dure pas un temps connu — elle tient tant que
// main.js la garde vivante (le dialogue de choix est ouvert, le joueur lit à
// son rythme). Avant cette fiche, l'intro était mise à `null` à cet instant
// précis et PLUS PERSONNE ne dessinait les follets pendant tout le texte :
// ils disparaissaient puis revenaient d'un coup à l'appui sur A.
export const ETAPE_ATTENTE = 'attente';

// État initial, reconstruit à chaque entrée en scène_grotte_salle_1 sans
// flag_follet_choisi (jamais réutilisé d'une partie à l'autre, §4 edge case
// "reinitialiserPartie() pendant l'intro").
export function creerIntro(config) {
  return { config, tMs: 0, tAttenteMs: 0, terminee: false };
}

// Avance le temps interne du même delta plafonné que le jeu (DELTA_MAX_MS,
// render.js) — l'onglet masqué pendant l'intro ne fait donc jamais "sauter"
// l'animation au retour (§4), juste une frame un peu plus longue comme
// n'importe quel autre système du jeu.
export function avancerIntro(intro, deltaMs) {
  // MT_intro-follets-visibles_2026-09-19 : une fois `terminee`, l'horloge ne
  // se fige plus — elle bascule sur `tAttenteMs`, qui fait vivre l'étape
  // ATTENTE (lévitation qui se pose). `terminee` garde exactement le même
  // sens et le même INSTANT qu'avant (fin de la partie à temps fixe, budget
  // ≤ 8 s inchangé) : c'est toujours lui qui déclenche l'ouverture du
  // dialogue de choix côté main.js, une seule fois.
  if (intro.terminee) return { ...intro, tAttenteMs: intro.tAttenteMs + deltaMs };
  const tMs = intro.tMs + deltaMs;
  const dureeTotale = dureeEtapesTempsFixe(intro.config);
  if (tMs < dureeTotale) return { ...intro, tMs };
  // Le dépassement de la frame de bascule n'est pas perdu : il amorce
  // l'attente, pour que la lévitation ne marque pas un micro-temps d'arrêt.
  return { ...intro, tMs: dureeTotale, tAttenteMs: tMs - dureeTotale, terminee: true };
}

// Ouverture des paupières (0 = noir plein écran, 1 = grand ouvert) à
// l'instant `tMs` de l'étape clignements uniquement.
//
// EXPORTÉE depuis `D-65` (T8) : le retour de mort réutilise exactement cette
// séquence, en version courte — demande de Xav du 21/09. « Réutilise la
// séquence existante, aucune seconde implémentation » : c'est la même
// fonction, avec d'autres durées, lues dans `data/effets.json`. Un second
// modèle de clignement finirait par ne plus ressembler au premier.
export function ouverturePaupieres({ ouvertures_ms, noir_ms }, tMs) {
  let t = tMs;
  for (let i = 0; i < ouvertures_ms.length; i++) {
    const duree = ouvertures_ms[i];
    if (t < duree) return ouvertureClignement(t, duree);
    t -= duree;
    if (i < ouvertures_ms.length - 1) {
      if (t < noir_ms) return 0;
      t -= noir_ms;
    }
  }
  return 0; // ne doit pas être atteint : dureeClignements() borne déjà l'appelant
}

// Position + alpha d'un follet à l'instant `tConvMs` de l'étape convergence :
// lévite en continu (oscillation sinus, déphasée par index pour ne pas les
// voir tous synchronisés) tout en convergeant (ease-out, "ralentit en
// approchant") de sa position de départ vers `cible` (une des 3 positions de
// l'écran de choix, déjà connues de l'appelant).
// `amortissement` (1 = lévitation pleine, 0 = posé exactement sur la cible)
// sert à l'étape ATTENTE : la phase du sinus CONTINUE de courir (mêmes
// `tConvMs` que si la convergence se prolongeait), seule son amplitude
// décroît — d'où une continuité exacte à la frontière convergence→attente
// (amortissement = 1 des deux côtés) ET à la frontière attente→écran de
// choix (amortissement = 0, donc position = cible, exactement là où
// main.js#dessinerEcranChoixFollet les redessine). Sans ça, le passage au
// choix aurait sauté d'au plus `amplitude_px`.
function positionFolletConvergence(index, cible, tConvMs, config, amortissement = 1) {
  const { amplitude_px, periode_ms } = config.levitation;
  const progression = config.convergence_ms > 0 ? Math.min(1, tConvMs / config.convergence_ms) : 1;
  const avancement = easeOutCubic(progression);
  const depart = POSITIONS_DEPART_FOLLETS[index];
  const oscillation = periode_ms > 0 ? Math.sin((tConvMs / periode_ms) * Math.PI * 2 + index) * amplitude_px * amortissement : 0;
  return {
    x: depart.x + (cible.x - depart.x) * avancement,
    y: depart.y + (cible.y - depart.y) * avancement + oscillation,
    // Apparition rapide (fade-in) en tout début d'étape plutôt qu'un pop
    // instantané au bord de l'écran.
    alpha: Math.min(1, progression * 3),
  };
}

// État de rendu à l'instant courant de `intro` : `paupieres` (0..1) pendant
// les clignements, `follets` (3 { x, y, alpha }, dans l'ordre de `cibles`)
// pendant la convergence — jamais les deux en même temps (dureeClignements
// sert de frontière exacte entre les deux).
export function etatRendu(intro, cibles) {
  const dureeCli = dureeClignements(intro.config.clignements);
  if (intro.tMs < dureeCli) {
    return {
      etape: ETAPE_CLIGNEMENTS,
      paupieres: ouverturePaupieres(intro.config.clignements, intro.tMs),
      follets: null,
    };
  }
  const tConv = intro.tMs - dureeCli;
  if (!intro.terminee) {
    return {
      etape: ETAPE_CONVERGENCE,
      paupieres: 1,
      follets: cibles.map((cible, i) => positionFolletConvergence(i, cible, tConv, intro.config)),
    };
  }
  // ATTENTE : les follets sont arrivés (avancement = 1, donc centrés sur les
  // cibles) et se posent en une période de lévitation — durée DÉRIVÉE des
  // données existantes (`levitation.periode_ms`), pas un nouveau seuil à
  // régler. La phase du sinus continue de courir depuis la convergence :
  // aucune discontinuité à l'entrée dans l'étape.
  const { periode_ms } = intro.config.levitation;
  const amortissement = periode_ms > 0 ? Math.max(0, 1 - intro.tAttenteMs / periode_ms) : 0;
  return {
    etape: ETAPE_ATTENTE,
    paupieres: 1,
    follets: cibles.map((cible, i) =>
      positionFolletConvergence(i, cible, tConv + intro.tAttenteMs, intro.config, amortissement),
    ),
  };
}

// --- Étape 4 : départ des 2 follets non élus (§3.5) ------------------------
// Déclenché par main.js#confirmerChoixFollet(), indépendant du minuteur de
// l'intro ci-dessus (le joueur choisit à son rythme en étape 3) : machine à
// états séparée, même discipline (pure, temps -> état).

export function creerDepart(config, indexElu) {
  return { config, indexElu, tMs: 0, terminee: false };
}

export function avancerDepart(depart, deltaMs) {
  if (depart.terminee) return depart;
  const tMs = depart.tMs + deltaMs;
  return tMs >= depart.config.depart_ms ? { ...depart, tMs: depart.config.depart_ms, terminee: true } : { ...depart, tMs };
}

// Les 2 follets non élus repartent (ease-out) vers leur position de départ de
// convergence (symétrique, cf. POSITIONS_DEPART_FOLLETS) en s'éteignant
// (alpha 1 -> 0) ; l'élu n'est jamais renvoyé ici — main.js dessine déjà le
// vrai follet (companion.js) qui prend sa place, jamais une 2ᵉ silhouette.
// Avancement (0..1, déjà amorti) de l'étape de départ. Exposé pour `D-34` :
// la taille du follet élu s'interpole sur **cette** courbe-là, celle qui porte
// déjà les positions des deux partants — jamais une 2ᵉ horloge qui pourrait
// dériver. Les étapes et les durées de l'intro ne sont pas touchées.
export function avancementDepart(depart) {
  const { config, tMs } = depart;
  const progression = config.depart_ms > 0 ? Math.min(1, tMs / config.depart_ms) : 1;
  return easeOutCubic(progression);
}

export function etatRenduDepart(depart, cibles) {
  const { indexElu } = depart;
  const avancement = avancementDepart(depart);
  return cibles
    .map((cible, index) => ({ index, cible }))
    .filter(({ index }) => index !== indexElu)
    .map(({ index, cible }) => {
      const depart_ = POSITIONS_DEPART_FOLLETS[index];
      return {
        index,
        x: cible.x + (depart_.x - cible.x) * avancement,
        y: cible.y + (depart_.y - cible.y) * avancement,
        alpha: 1 - avancement,
      };
    });
}

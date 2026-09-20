// Follet (§3.6) : orbite autour du héros par défaut, se colle à un monstre
// engagé sinon. Pur, testé : la lumière et l'aura suivent la même position
// dans tous les états (aucun code séparé pour "la lumière suit l'engagement").

// Provisoires, non validés en jeu par Xav.
const ORBITE_RAYON_PX = 24;
const ORBITE_VITESSE_RAD_S = 2;
const ORBITE_LERP = 0.15; // "retard ressort" du suivi

// --- Valeurs de base destinées à grandir (principe d'équilibrage du 19/09) ---
// « Les valeurs de base du début de jeu sont basses, et tout grandit ensuite »
// (équipement, niveaux, buffs). La seule conséquence d'architecture de ce
// principe : une valeur destinée à grandir n'est **jamais lue directement**
// par un système — elle passe par une fonction pure de résolution, qui rend
// aujourd'hui la base telle quelle. Le jour où un talisman doublera l'orbite
// (`Q-29`), il n'y aura qu'ici à le brancher, et un seul endroit à relire.
// AUCUN modificateur n'est livré avec ces points d'entrée : c'est volontaire.

// Distance d'orbite EFFECTIVE. `D-34` : elle **ne change pas** avec la taille
// du follet (décision Xav, `Q-26`) — réduite, elle serrerait trop le follet
// contre le héros, et c'est justement une valeur appelée à grandir.
export function resoudreOrbiteRayonPx() {
  return ORBITE_RAYON_PX;
}

// Rayon d'aura EFFECTIF (`D-51`). L'aura n'est plus un cercle décoratif : le
// trait pointillé DESSINÉ et la règle qui décide « ce monstre est dans
// l'aura » lisent tous les deux ce nombre-ci, et jamais `companion.rayon_aura`
// en direct — c'est ce qui garantit que ce qui est dessiné est ce qui agit
// (même contrat que `rayon_lumiere`, à la fois halo et trou dans le voile).
// Déclaré par compagnon dans `data/companions.json#rayon_aura` (requis par le
// schéma, donc jamais absent d'un catalogue valide).
//
// AUCUN modificateur n'est livré ici : un talisman qui élargirait l'aura
// (`Q-29`) ou un pourcentage de synergie se brancheront à cet endroit, et à
// cet endroit seulement.
export function resoudreRayonAuraPx(companion) {
  return companion.rayon_aura;
}

// Échelle EFFECTIVE du follet en jeu (`D-34`) : déclarée par compagnon dans
// `data/companions.json#echelle_jeu`, 1 pour un compagnon qui ne la déclare
// pas (un catalogue existant reste valide tel quel). Distincte de la taille
// que la cinématique du choix donne aux trois follets, qui ne bouge pas :
// main.js#dessinerEcranChoixFollet continue de calculer la sienne depuis
// TAILLE_FOLLET_* / TAILLE_REFERENCE_FOLLET_PX.
export function resoudreEchelleJeu(companion) {
  const echelle = companion && companion.echelle_jeu;
  return typeof echelle === 'number' && echelle > 0 ? echelle : 1;
}

// Frontière cinématique -> jeu (`D-34`, décision du 19/09 « aucun saut aux
// frontières ») : le follet élu passe de sa taille d'écran de choix à sa
// taille de jeu **pendant** l'étape de départ des deux autres. `avancement`
// est celui de cette étape (intro.js#avancementDepart, déjà amorti) : une
// seule courbe pour les positions des partants et pour la taille de l'élu.
export function echelleFolletEnTransition(echelleCinematique, echelleJeu, avancement) {
  const a = Math.min(1, Math.max(0, avancement));
  return echelleCinematique + (echelleJeu - echelleCinematique) * a;
}

export function creerFollet(companionId, hero) {
  return {
    companionId,
    etat: 'suivre',
    cibleMonstreId: null,
    x: hero.x + resoudreOrbiteRayonPx(),
    y: hero.y,
    angleOrbite: 0,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// --- Règle d'engagement (`D-37`, décisions de Xav des 19 et 20/09) ---------
// Il n'existe PLUS de distance d'engagement propre au follet
// (la constante de 48 px est retirée) : la portée du follet est celle
// qu'on VOIT — son orbite et son aura. Ce qui est dessiné est ce qui agit,
// exactement comme pour l'aura (`D-51`) et pour `rayon_lumiere`.

// Marge d'hystérésis entre engager et relâcher. FIXE, et c'est le point : ce
// n'est pas une portée, c'est l'épaisseur du bord. Sans elle, un monstre
// immobile pile sur la frontière ferait osciller le follet d'une frame à
// l'autre. Orbite et aura, elles, grandiront (`Q-26`, `Q-29`) — la portée
// d'engagement et de relâche suivra toute seule, sans toucher ce nombre.
const MARGE_RELACHE_PX = 12;

// Rayon d'aura tolérant : un appelant qui n'a pas le catalogue du compagnon
// sous la main n'engage que par l'orbite, il ne lève pas. Même discipline que
// `flags.js` face à une condition qu'on ne sait pas évaluer : on n'ouvre pas.
function rayonAuraDe(companion) {
  return companion ? resoudreRayonAuraPx(companion) : 0;
}

// Distance héros -> monstre au-delà de laquelle le follet lâche sa cible.
// Tout passe par les fonctions de résolution, jamais par les constantes.
export function distanceRelachePx(companion) {
  return resoudreOrbiteRayonPx() + rayonAuraDe(companion) + MARGE_RELACHE_PX;
}

// LE prédicat d'engagement — une seule source, lue par `mettreAJourEtat` et
// par l'indice de commande ATTACK (specs/04_indices-commandes.md §3), qui se
// déclenche donc exactement quand le follet partirait.
//
// Le garde-fou de la 1ʳᵉ ligne n'est pas du zèle : sans lui, un monstre à
// 70 px effleuré par l'aura d'un follet qui rentre serait engagé à une frame
// et relâché à la suivante (la relâche, elle, se mesure depuis le héros).
export function monstreEngageable(monstre, hero, follet, companion) {
  if (!monstre || monstre.mort) return false;
  const dHero = distance(hero, monstre);
  if (dHero > distanceRelachePx(companion)) return false;
  if (dHero <= resoudreOrbiteRayonPx()) return true;
  return follet ? distance(follet, monstre) <= rayonAuraDe(companion) : false;
}

// Transition suivre <-> engager. Un monstre engagé reste la cible tant qu'il
// est vivant et en deçà de la distance de relâche ; sinon retour à `suivre`.
// En `suivre` — donc aussi pendant le retour en orbite —, le follet accroche
// le candidat le PLUS PROCHE DU HÉROS parmi les engageables.
export function mettreAJourEtat(follet, hero, monstres, companion) {
  if (follet.etat === 'engager') {
    const cible = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (!cible || cible.mort || distance(hero, cible) > distanceRelachePx(companion)) {
      return { ...follet, etat: 'suivre', cibleMonstreId: null };
    }
    return follet;
  }

  let proche = null;
  let meilleure = Infinity;
  for (const monstre of monstres) {
    if (!monstreEngageable(monstre, hero, follet, companion)) continue;
    const d = distance(hero, monstre);
    if (d < meilleure) {
      meilleure = d;
      proche = monstre;
    }
  }
  if (proche) return { ...follet, etat: 'engager', cibleMonstreId: proche.id };
  return follet;
}

// Position à la frame courante (orbite en `suivre`, collé au monstre en
// `engager`) — la même fonction porte la position ET la lumière.
export function avancerPosition(follet, hero, monstres, deltaS) {
  const angleOrbite = follet.angleOrbite + deltaS * ORBITE_VITESSE_RAD_S;

  // Aller ET retour amortis par la MÊME loi (décision Xav : « mouvement
  // fluide, jamais un flash »). L'approche copiait la position du monstre
  // d'un coup : jusqu'à ~70 px en une frame, un saut visible. Conséquence
  // voulue, cohérente avec `D-51` : l'aura arrive AVEC le follet, l'effet
  // commence quand le cercle touche le monstre, pas à l'instant de la
  // décision d'engager.
  if (follet.etat === 'engager') {
    const cible = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (cible) {
      return {
        ...follet,
        x: follet.x + (cible.x - follet.x) * ORBITE_LERP,
        y: follet.y + (cible.y - follet.y) * ORBITE_LERP,
        angleOrbite,
      };
    }
  }

  // Lu à travers la résolution, jamais la constante directement (voir plus haut).
  const rayon = resoudreOrbiteRayonPx();
  const cibleX = hero.x + Math.cos(angleOrbite) * rayon;
  const cibleY = hero.y + Math.sin(angleOrbite) * rayon;
  return {
    ...follet,
    x: follet.x + (cibleX - follet.x) * ORBITE_LERP,
    y: follet.y + (cibleY - follet.y) * ORBITE_LERP,
    angleOrbite,
  };
}

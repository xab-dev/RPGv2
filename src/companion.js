// Follet (§3.6) : orbite autour du héros par défaut, se colle à un monstre
// engagé sinon. Pur, testé : la lumière et l'aura suivent la même position
// dans tous les états (aucun code séparé pour "la lumière suit l'engagement").

// Provisoires, non validés en jeu par Xav.
// Exportée (specs/04_indices-commandes.md §3) : l'indice ATTACK se déclenche
// "à l'entrée dans distance_engagement" — même seuil que l'engagement réel du
// follet, jamais une 2ᵉ constante qui pourrait diverger.
export const DISTANCE_ENGAGEMENT_PX = 48;
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

// Transition suivre <-> engager. Un monstre engagé reste la cible tant
// qu'il est vivant et à portée ; sinon retour à `suivre` (§3.6).
export function mettreAJourEtat(follet, hero, monstres) {
  if (follet.etat === 'engager') {
    const cible = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (!cible || cible.mort || distance(hero, cible) > DISTANCE_ENGAGEMENT_PX) {
      return { ...follet, etat: 'suivre', cibleMonstreId: null };
    }
    return follet;
  }

  const proche = monstres.find((m) => !m.mort && distance(hero, m) <= DISTANCE_ENGAGEMENT_PX);
  if (proche) return { ...follet, etat: 'engager', cibleMonstreId: proche.id };
  return follet;
}

// Position à la frame courante (orbite en `suivre`, collé au monstre en
// `engager`) — la même fonction porte la position ET la lumière.
export function avancerPosition(follet, hero, monstres, deltaS) {
  const angleOrbite = follet.angleOrbite + deltaS * ORBITE_VITESSE_RAD_S;

  if (follet.etat === 'engager') {
    const cible = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (cible) return { ...follet, x: cible.x, y: cible.y, angleOrbite };
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

// Follet (§3.6) : orbite autour du héros par défaut, se colle à un monstre
// engagé sinon. Pur, testé : la lumière et l'aura suivent la même position
// dans tous les états (aucun code séparé pour "la lumière suit l'engagement").

// Provisoires, non validés en jeu par Xav.
const DISTANCE_ENGAGEMENT_PX = 48;
const ORBITE_RAYON_PX = 24;
const ORBITE_VITESSE_RAD_S = 2;
const ORBITE_LERP = 0.15; // "retard ressort" du suivi

export function creerFollet(companionId, hero) {
  return {
    companionId,
    etat: 'suivre',
    cibleMonstreId: null,
    x: hero.x + ORBITE_RAYON_PX,
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

  const cibleX = hero.x + Math.cos(angleOrbite) * ORBITE_RAYON_PX;
  const cibleY = hero.y + Math.sin(angleOrbite) * ORBITE_RAYON_PX;
  return {
    ...follet,
    x: follet.x + (cibleX - follet.x) * ORBITE_LERP,
    y: follet.y + (cibleY - follet.y) * ORBITE_LERP,
    angleOrbite,
  };
}

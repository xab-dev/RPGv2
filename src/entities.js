// Entités runtime : héros et monstres — PV, position, mort. Pur, testé :
// chaque fonction renvoie un nouvel objet plutôt que de muter (même style
// que scene.js#resoudreDeplacement).

export function creerHeros({ x, y, rayon, pvMax }) {
  return { x, y, rayon, pv: pvMax, pvMax, mort: false };
}

export function creerMonstre(donneesEnnemi, { x, y }) {
  return {
    id: donneesEnnemi.id,
    enemyId: donneesEnnemi.id,
    x,
    y,
    pv: donneesEnnemi.pv,
    pvMax: donneesEnnemi.pv,
    cooldownAttaqueMs: 0,
    dotAccumulateurMs: 0,
    flashMs: 0, // §3.1 03_grotte-polish : compte à rebours du blanchiment "touché", feedback pur (combat.js#FLASH_TOUCHE_MS)
    mort: false,
  };
}

// Comportement mêlée, seul archétype de Phase 1 (`comportement` reste une
// donnée sur l'ennemi — cf. enemies.json — prête pour un 2ᵉ archétype sans
// modifier cette fonction, juste un `if (donnees.comportement === ...)`
// ajouté au point d'appel le jour où il existe réellement, cf. §6).
export function approcherEnLigneDroite(monstre, cibleX, cibleY, vitesse, deltaS) {
  if (monstre.mort) return monstre;
  const dx = cibleX - monstre.x;
  const dy = cibleY - monstre.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.0001) return monstre;
  const pas = vitesse * deltaS;
  const ratio = Math.min(1, pas / distance);
  return { ...monstre, x: monstre.x + dx * ratio, y: monstre.y + dy * ratio };
}

export function infligerDegats(entite, degats) {
  if (entite.mort) return entite;
  const pv = Math.max(0, entite.pv - Math.max(0, degats));
  return { ...entite, pv, mort: pv <= 0 };
}

// Point unique de mort du héros (§3.5) : pose un événement `onMort` plutôt
// qu'un `if (pv <= 0)` dispersé — la survie (Phase 3) n'aura qu'à s'y
// abonner pour appliquer son malus, sans toucher au combat.
export function mourir(hero, { onMort } = {}) {
  const suivant = { ...hero, mort: true };
  if (onMort) onMort(suivant);
  return suivant;
}

// Respawn : position/PV réinitialisés depuis un point de spawn en donnée
// (jamais une constante — §3.5), jamais la cinématique de choix du follet.
export function respawn(hero, spawnPx, pvMax) {
  return { ...hero, x: spawnPx.x, y: spawnPx.y, pv: pvMax, mort: false };
}

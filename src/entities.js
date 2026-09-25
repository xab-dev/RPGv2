// Entités runtime : héros et monstres — PV, position, mort. Pur, testé :
// chaque fonction renvoie un nouvel objet plutôt que de muter (même style
// que scene.js#resoudreDeplacement).

export function creerHeros({ x, y, rayon, pvMax }) {
  return { x, y, rayon, pv: pvMax, pvMax, mort: false };
}

// `id` : identifiant d'INSTANCE, et il doit être unique. Jusqu'au palier B de
// specs/07_chaos-nocturne.md, il valait l'id du CATALOGUE — invisible tant
// qu'une scène n'avait qu'un monstre de chaque type (la Grotte), mais dès que
// deux rôdeurs identiques coexistent, frapper l'un les blesse **tous** (main.js
// filtre les touchés par id) et le follet ne sait plus lequel il engage.
// L'appelant fournit donc un id d'instance ; le défaut ne reste que pour les
// scènes à un seul monstre par type et pour les tests d'avant.
export function creerMonstre(donneesEnnemi, { x, y, id = donneesEnnemi.id }) {
  return {
    id,
    enemyId: donneesEnnemi.id,
    x,
    y,
    pv: donneesEnnemi.pv,
    pvMax: donneesEnnemi.pv,
    cooldownAttaqueMs: 0,
    dotAccumulateurMs: 0,
    flashMs: 0, // §3.1 03_grotte-polish : compte à rebours du blanchiment "touché", feedback pur (combat.js#FLASH_TOUCHE_MS)
    mort: false,
    // Spec 14, §4.3 : un monstre INTOUCHABLE (Zéros) ne prend aucun dégât, et
    // ni l'auto-attaque ni le follet ne le choisissent. Porté par l'instance,
    // lu depuis l'entrée d'ennemi : chaque système qui choisit ou blesse un
    // monstre le lit ici, jamais dans le catalogue.
    intouchable: donneesEnnemi.intouchable === true,
  };
}

// Comportement mêlée, seul archétype de Phase 1 (`comportement` reste une
// donnée sur l'ennemi — cf. enemies.json — prête pour un 2ᵉ archétype sans
// modifier cette fonction, juste un `if (donnees.comportement === ...)`
// ajouté au point d'appel le jour où il existe réellement, cf. §6).
//
// `arretPx` (spec 14, palier D) : la distance où il s'arrête. 0 par défaut —
// un rampant va jusque sur le héros, comme depuis la Phase 1. Zéros, qui a la
// taille du héros, disparaîtrait sous lui : son entrée déclare un contact.
export function approcherEnLigneDroite(monstre, cibleX, cibleY, vitesse, deltaS, arretPx = 0) {
  if (monstre.mort) return monstre;
  const dx = cibleX - monstre.x;
  const dy = cibleY - monstre.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= Math.max(0.0001, arretPx)) return monstre;
  const pas = vitesse * deltaS;
  const ratio = Math.min(1, pas / distance, (distance - arretPx) / distance);
  return { ...monstre, x: monstre.x + dx * ratio, y: monstre.y + dy * ratio };
}

// LE point où un monstre perd des PV : l'auto-attaque, la brûlure, le DoT de
// l'aura et les tirs du joueur (spec 14, palier G) passent tous ici. Un
// intouchable n'y perd rien ; une entité qui porte `pvPlancher` (la cible
// d'une rencontre, `rencontre.js#plancherCible`) s'arrête à ce plancher et ne
// meurt pas — la rencontre finit là.
export function infligerDegats(entite, degats) {
  if (entite.mort || entite.intouchable) return entite;
  const plancher = entite.pvPlancher > 0 ? entite.pvPlancher : 0;
  const pv = Math.max(Math.min(plancher, entite.pv), entite.pv - Math.max(0, degats));
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

// Réconcilie les PV courants avec un nouveau plafond (SD_phase3-stations-
// pv-jauges_2026-09-17.md §B) : `pv_max` est recalculé CHAQUE FRAME
// (buffs/points de stats/modulateur de survie, cf. main.js#calculerStatsHeros)
// et sans ceci, une hausse de `pv_max` (ex. buff_repas sur Vitalité) ouvre un
// "headroom" invisible — les PV n'ont pas baissé en absolu, mais la barre
// RELATIVE (pv/pv_max) descend, donnant l'impression que manger fait perdre
// des PV. Règle : une hausse de `pv_max` donne réellement les PV qu'elle
// promet (le buff tient sa promesse) ; une baisse (expiration) clampe sans
// perte supplémentaire — jamais l'inverse, jamais un 2ᵉ chemin ailleurs
// (HUD, dialogue) qui recalculerait un ratio différent.
export function reconcilierPvMax(hero, pvMaxNouveau) {
  if (hero.pv == null) return { ...hero, pv: pvMaxNouveau, pvMax: pvMaxNouveau };
  const delta = pvMaxNouveau - hero.pvMax;
  const pv = delta > 0 ? hero.pv + delta : Math.min(hero.pv, pvMaxNouveau);
  return { ...hero, pv, pvMax: pvMaxNouveau };
}

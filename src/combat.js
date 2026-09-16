// Auto-attaque du héros (§3.5) : zone annulaire définie par la portée de
// l'arme équipée (décision Xav : la portée vient de l'équipement, jamais
// d'une stat). Pur, testé.

// §2.2 03_grotte-polish, provisoires, un seul endroit chacune : durées du
// feedback de combat (palier 1). L'anneau ne dure que le temps de voir le
// coup partir ; le flash du monstre touché est plus bref (répété à chaque
// tick de DoT, il ne doit pas se chevaucher visuellement d'un tick à l'autre
// à la cadence 1 PV/500 ms de la brûlure, §3.4).
export const FLASH_ATTAQUE_MS = 120;
export const FLASH_TOUCHE_MS = 80;

export function estDansPortee(hero, monstre, portee, tileSize) {
  const distanceTuiles = Math.hypot(monstre.x - hero.x, monstre.y - hero.y) / tileSize;
  return distanceTuiles >= portee.min && distanceTuiles <= portee.max;
}

// Monstres vivants touchés par l'auto-attaque courante.
export function resoudreAutoAttaque(hero, monstres, portee, tileSize) {
  return monstres.filter((m) => !m.mort && estDansPortee(hero, m, portee, tileSize));
}

export function tickCooldown(cooldownMsRestant, deltaMs) {
  return Math.max(0, cooldownMsRestant - deltaMs);
}

// Un monstre affiche sa barre de PV (§3.1 palier1) s'il est "actif" : engagé
// par le follet (cible réelle de son état `engager`, cf. companion.js) ou
// ayant déjà perdu au moins 1 PV — jamais un monstre inerte à distance, même
// visible à l'écran.
export function estMonstreActif(monstre, follet) {
  const aPerduDesPv = monstre.pv < monstre.pvMax;
  const estEngageParLeFollet = !!follet && follet.cibleMonstreId === monstre.id;
  return aPerduDesPv || estEngageParLeFollet;
}

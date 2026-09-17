// Table de cooldowns en temps de jeu actif (Palier A/B/C,
// specs/04_maison-interieur.md §10 "règle anti-spam") — clé -> horodatage de
// pose. Pur, testé.
//
// Réutilise l'horloge déjà avancée par daynight.js (save.monde.heure, gelée
// sous UI, jamais Date.now()) plutôt qu'une horloge dédiée (§6 : "en
// extraire une fonction partagée, jamais une seconde horloge") — main.js
// avance désormais cette horloge dans TOUTES les scènes (pas seulement
// celles à cycle jour/nuit), le rendu du voile restant, lui, conditionné à
// `scene.cycleJourNuit`. Cette horloge boucle toutes les DUREE_CYCLE_MS
// (~17 min, daynight.js) : un cooldown de 60 s ne peut chevaucher ce
// bouclage qu'une fois par cycle, dans la fenêtre la plus défavorable — le
// choix ci-dessous (§4 edge case de la fiche) résout ce cas en expirant le
// cooldown un peu tôt, jamais en le bloquant ni en le rendant négatif.

export function estExpire(cooldowns, cle, dureeMs, heureMs) {
  const pose = cooldowns[cle];
  if (pose === undefined) return true;
  const ecoule = heureMs - pose;
  // ecoule < 0 : la pose est "dans le futur" relatif à heureMs — bouclage du
  // cycle, ou sauvegarde importée d'une autre partie (§4 edge case) :
  // toujours résolu en expirant le cooldown, jamais en le bloquant.
  return ecoule < 0 || ecoule >= dureeMs;
}

export function poserCooldown(cooldowns, cle, heureMs) {
  return { ...cooldowns, [cle]: heureMs };
}

export function tempsRestantMs(cooldowns, cle, dureeMs, heureMs) {
  if (estExpire(cooldowns, cle, dureeMs, heureMs)) return 0;
  return dureeMs - (heureMs - cooldowns[cle]);
}

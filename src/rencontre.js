// La RENCONTRE (spec 14, §4.3, palier D) : un combat mis en scène, déclaré sur
// la scène (`scenes.json > rencontre`), qui ne se joue qu'une fois. Zéros est
// la première ; il est un personnage récurrent (`Q-143`), donc rien ici ne le
// connaît : ce module dit QUAND une rencontre commence, où elle en est, et
// quand elle finit. `main.js` fait apparaître les monstres, ouvre les
// dialogues et pose les flags. Pur, aucun id de catalogue.
//
// Les phases, dans l'ordre :
//   apparition  les monstres de la rencontre arrivent en fondu, inertes ;
//   combat      ils agissent ; la cible descend ;
//   fin         la cible est au seuil : tout se fige, le dialogue de fin parle ;
//   effacement  le dialogue fermé, ils s'effacent en fondu, inertes ;
//   terminee    ils sont retirés, les flags de fin sont posés.
// L'état est de SESSION : quitter la salle (ou le jeu) au milieu rejoue la
// rencontre depuis l'apparition, puisque son flag n'est pas encore posé.

export const PHASES_RENCONTRE = ['apparition', 'combat', 'fin', 'effacement', 'terminee'];

// Ce que la rencontre doit faire à cette frame, vu les flags :
// - 'demarrer'  : le déclencheur tient, elle n'a jamais eu lieu ;
// - 'raccourci' : le déclencheur tient, elle a DÉJÀ eu lieu (son flag est
//   posé) — les descentes suivantes (`Q-142`) : ses flags de fin tombent
//   directement, sans monstre ni dialogue ;
// - null        : rien (pas déclenchée, ou ses flags de fin sont déjà là).
// `enCours` : une rencontre de cette scène est déjà lancée cette session.
export function deciderRencontre(rencontre, { evaluer, has, enCours = false }) {
  if (!rencontre || enCours) return null;
  if (!evaluer(rencontre.declencheur)) return null;
  if (rencontre.flags_fin.every((f) => has(f))) return null;
  return has(rencontre.flag_rencontre) ? 'raccourci' : 'demarrer';
}

export function creerEtatRencontre() {
  return { phase: 'apparition', tMs: 0 };
}

// Le temps passe dans les deux fondus ; `combat` et `fin` attendent un
// événement (la cible au seuil, le dialogue fermé). Rend l'état suivant et
// l'événement de la frame, s'il y en a un : 'combat' (l'apparition est
// finie), 'efface' (l'effacement est fini). Un fondu nul passe en une frame.
export function avancerRencontre(etat, deltaMs, fonduMs) {
  if (etat.phase !== 'apparition' && etat.phase !== 'effacement') return { etat, evenement: null };
  const tMs = etat.tMs + deltaMs;
  if (tMs < fonduMs) return { etat: { ...etat, tMs }, evenement: null };
  if (etat.phase === 'apparition') return { etat: { phase: 'combat', tMs: 0 }, evenement: 'combat' };
  return { etat: { phase: 'terminee', tMs: 0 }, evenement: 'efface' };
}

// La cible est au seuil : le combat s'arrête là.
export function passerALaFin(etat) {
  return etat.phase === 'combat' ? { phase: 'fin', tMs: 0 } : etat;
}

// Le dialogue de fin est fermé : l'effacement commence.
export function passerALEffacement(etat) {
  return etat.phase === 'fin' ? { phase: 'effacement', tMs: 0 } : etat;
}

// Les monstres de la rencontre n'agissent qu'en `combat` : pendant les fondus
// et pendant le dialogue de fin, ni pas ni coup.
export function rencontreAgit(etat) {
  return !!etat && etat.phase === 'combat';
}

// La défaite est suspendue du début de l'apparition à la fin de l'effacement :
// un coup reçu à la dernière frame du combat ne renvoie pas à la Grotte.
export function rencontreEnCours(etat) {
  return !!etat && etat.phase !== 'terminee';
}

// L'opacité des monstres de la rencontre : 0 → 1 à l'apparition, 1 → 0 à
// l'effacement, 1 sinon.
export function opaciteRencontre(etat, fonduMs) {
  if (!etat) return 1;
  const avancement = fonduMs > 0 ? Math.min(1, Math.max(0, etat.tMs / fonduMs)) : 1;
  if (etat.phase === 'apparition') return avancement;
  if (etat.phase === 'effacement') return 1 - avancement;
  if (etat.phase === 'terminee') return 0;
  return 1;
}

// Les PV sous lesquels la cible ne descend pas : le seuil de fin, arrondi AU
// DESSUS pour qu'un seuil tombe toujours sur un PV entier atteignable. La
// cible ne meurt donc jamais — elle s'arrête au seuil, où le combat finit
// (`entities.js#infligerDegats` lit ce plancher).
export function plancherCible(pvMax, seuilFin) {
  return Math.max(1, Math.ceil(pvMax * seuilFin));
}

// La cible est-elle au seuil ? Une cible absente (retirée, jamais née) ne
// finit rien : la rencontre attend.
export function cibleAuSeuil(monstres, enemyId) {
  const cible = monstres.find((m) => m.rencontre && m.enemyId === enemyId);
  return !!cible && cible.pvPlancher != null && cible.pv <= cible.pvPlancher;
}

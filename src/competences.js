// Les COMPÉTENCES (spec 14, §4.6) : ce qu'un emplacement `skill_N` lance. Une
// compétence se CHARGE (aujourd'hui : tant que le follet engage un monstre),
// se LANCE quand sa charge est pleine et sa recharge écoulée, puis se
// RECHARGE. Ce module tient ce cycle, choisit la cible et résout les dégâts.
//
// Pur : ni canvas, ni DOM, ni horloge, ni registre. Il reçoit l'entrée du
// catalogue (`data/skills.json`), les dérivées déjà calculées du héros, et un
// état de SESSION `{ chargeMs, rechargeMs }` — jamais sauvegardé (§6 : une
// compétence en recharge au moment de quitter repart pleine au chargement,
// accepté). Le tir lui-même passe par `projectiles.js`, le seul chemin de
// collision du jeu.

// Les sources de charge qu'une compétence peut déclarer. `engagement_follet` :
// la charge monte tant que le follet est en état `engager` (§4.6, `Q-144` :
// sur n'importe quel monstre, et gardée hors combat). Une source nouvelle
// s'ajoute ici et dans `chargeActive`, nulle part ailleurs.
export const SOURCES_CHARGE = ['engagement_follet'];

// Les effets qu'une compétence peut déclarer. `zone` : le tir éclate au
// premier monstre, au mur ou au bout de sa course, et touche tout ce qui est
// dans son rayon.
export const EFFETS_COMPETENCE = ['zone'];

export function creerEtatCompetence() {
  return { chargeMs: 0, rechargeMs: 0 };
}

// Les durées RÉELLES de la charge et de la recharge : celles du catalogue ×
// la hâte (`derivee_hate_competence`, Esprit, B1). Relues à chaque frame : un
// point d'Esprit dépensé en pleine charge la raccourcit aussitôt.
export function dureesCompetence(competence, derivees) {
  const hate = derivees.derivee_hate_competence ?? 1;
  return {
    chargeMs: competence.charge.duree_ms * hate,
    rechargeMs: competence.cooldown_ms * hate,
  };
}

// La charge monte-t-elle en ce moment ? `follet` : l'état de `companion.js`.
export function chargeActive(competence, { follet }) {
  if (competence.charge.source === 'engagement_follet') return !!follet && follet.etat === 'engager';
  return false;
}

// Avance d'une frame de temps ACTIF (l'appelant ne l'appelle pas sous UI). La
// charge monte et plafonne à sa durée ; la recharge descend jusqu'à zéro. Les
// deux avancent ensemble : charger pendant la recharge est permis, et il faut
// les deux pour relancer (§4.6).
export function avancerCompetence(etat, deltaMs, { active, durees }) {
  return {
    chargeMs: active ? Math.min(durees.chargeMs, etat.chargeMs + deltaMs) : Math.min(durees.chargeMs, etat.chargeMs),
    rechargeMs: Math.max(0, etat.rechargeMs - deltaMs),
  };
}

export function competencePrete(etat, durees) {
  return etat.chargeMs >= durees.chargeMs && etat.rechargeMs <= 0;
}

// Lancer : la charge se vide, la recharge démarre.
export function lancerCompetence(etat, durees) {
  return { chargeMs: 0, rechargeMs: durees.rechargeMs };
}

// Ce que le HUD dessine : la part de la charge (0..1, monte) et la part de la
// recharge qui reste (0..1, descend).
export function ratiosCompetence(etat, durees) {
  return {
    charge: durees.chargeMs > 0 ? Math.min(1, etat.chargeMs / durees.chargeMs) : 1,
    recharge: durees.rechargeMs > 0 ? Math.min(1, etat.rechargeMs / durees.rechargeMs) : 0,
    prete: competencePrete(etat, durees),
  };
}

// LE point de résolution des dégâts d'une compétence (B1, décision de Xav) :
// la Force (`derivee_degats_attaque`) × le coefficient d'Esprit
// (`derivee_puissance_competence`) × le multiplicateur de la compétence. Sans
// Force, une compétence ne fait rien. Aucun système ne lit une stat brute
// (`D-141`).
export function resoudreDegats(competence, derivees) {
  const force = derivees.derivee_degats_attaque ?? 0;
  const puissance = derivees.derivee_puissance_competence ?? 1;
  return force * puissance * competence.effet.multiplicateur;
}

// La cible (§4.6) : le monstre que le follet engage, s'il est vivant, visable
// et à portée ; sinon le plus proche à portée ; sinon rien (l'appui est
// refusé, la charge gardée). `monstres` : `[{ id, x, y, mort, visable }]` —
// `visable` faux pour un intouchable, que le follet ignore aussi.
export function choisirCible({ follet, monstres, hero, porteePx }) {
  const aPortee = (m) => !m.mort && m.visable !== false && Math.hypot(m.x - hero.x, m.y - hero.y) <= porteePx;
  if (follet && follet.etat === 'engager') {
    const engage = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (engage && aPortee(engage)) return engage;
  }
  let meilleur = null;
  let meilleureDistance = Infinity;
  for (const m of monstres) {
    if (!aPortee(m)) continue;
    const d = Math.hypot(m.x - hero.x, m.y - hero.y);
    if (d < meilleureDistance) {
      meilleur = m;
      meilleureDistance = d;
    }
  }
  return meilleur;
}

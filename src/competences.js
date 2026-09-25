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

// ── Équiper (spec 14, §4.9, palier I) ─────────────────────────────────────
// Ce que le joueur a rangé où : `{ id d'emplacement : id de compétence }`
// (`save.hero.competences`). Les fonctions ci-dessous rendent une table
// NEUVE, jamais la table reçue modifiée : la sauvegarde ne change que par
// l'appelant, qui la remplace d'un bloc.

// Un emplacement de compétence est un emplacement d'action dont le verbe est
// `skill_N` — la règle que le schéma de `skills.json` appliquait déjà à
// `emplacement`, dite une fois ici pour les deux.
export function estEmplacementCompetence(slot) {
  return !!slot && typeof slot.verb === 'string' && /^skill_\d+$/.test(slot.verb);
}

// Le nom de la valeur de condition qui dit combien de compétences sont
// rangées dans un emplacement (0 ou 1) : c'est elle que `action_slots.json`
// cite pour montrer une case au HUD (`visible_si`). Une case s'affiche donc
// quand quelque chose y est rangé, comme la case du consommable.
export function valeurCompetenceEn(emplacementId) {
  return `competence_en_${emplacementId}`;
}

// Ranger une compétence dans un emplacement (B3) : elle QUITTE celui où elle
// était, et celle qui occupait l'emplacement choisi devient non équipée —
// jamais échangée.
export function equiperCompetence(equipees, competenceId, emplacementId) {
  const suivantes = {};
  for (const [emplacement, id] of Object.entries(equipees || {})) {
    if (id !== competenceId && emplacement !== emplacementId) suivantes[emplacement] = id;
  }
  suivantes[emplacementId] = competenceId;
  return suivantes;
}

// L'emplacement où une compétence est rangée, ou `null`.
export function emplacementDe(equipees, competenceId) {
  const trouve = Object.entries(equipees || {}).find(([, id]) => id === competenceId);
  return trouve ? trouve[0] : null;
}

// Une compétence qu'on vient d'APPRENDRE se range d'elle-même : dans son
// emplacement par défaut (`emplacement` de son entrée) s'il est libre, sinon
// dans le premier libre (dans l'ordre de `emplacements`), sinon nulle part —
// elle ne chasse jamais ce que le joueur a déjà rangé. Déjà rangée, rien ne
// bouge. Rend la table suivante.
export function rangerCompetenceApprise(equipees, competence, emplacements) {
  if (emplacementDe(equipees, competence.id)) return { ...equipees };
  const libre = (id) => !(equipees || {})[id];
  const cible = libre(competence.emplacement) ? competence.emplacement : emplacements.find(libre);
  return cible ? equiperCompetence(equipees, competence.id, cible) : { ...equipees };
}

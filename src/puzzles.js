// Interprète les instances de puzzles.json : `levier` (bascule + flag),
// `sequence` (ordre de leviers enfants) et, spec 14 §4.4, `levier_maintenu`
// (allumé tant qu'on le tient) avec `simultane` (tous allumés à la fois). Pur, testé. Ajouter une 3ᵉ instance d'un type existant ailleurs
// dans le jeu = JSON seulement (§3.8) : aucun id n'est en dur ici.

export function etatInitial(registre) {
  const etat = {};
  for (const p of registre.tous('puzzles')) {
    if (p.type === 'levier') etat[p.id] = { actif: false };
    if (p.type === 'sequence') etat[p.id] = { progression: 0, resolu: false };
    if (p.type === 'levier_maintenu') etat[p.id] = { actif: false, sansMainteneurMs: 0 };
  }
  return etat;
}

// INTERACT sur un levier à portée : bascule son état, pose flag_pose si
// présent, fait progresser (ou réinitialise) toute séquence qui l'attend.
export function activerLevier(registre, etat, leverId, flags) {
  const puzzle = registre.obtenir('puzzles', leverId);
  if (!puzzle || puzzle.type !== 'levier') return etat;

  const suivant = { ...etat, [leverId]: { actif: true } };
  if (puzzle.flag_pose) flags.set(puzzle.flag_pose);

  for (const sequence of registre.tous('puzzles')) {
    if (sequence.type !== 'sequence' || !sequence.ordre.includes(leverId)) continue;

    const resultat = avancerSequence(sequence, suivant[sequence.id], leverId);
    suivant[sequence.id] = resultat.etatSequence;

    if (resultat.reinitialiser) {
      // Mauvais ordre (ou levier déjà activé) : réinitialise les leviers de
      // la séquence, feedback visuel court, jamais de texte (§3.3/§4).
      for (const idEnfant of sequence.ordre) suivant[idEnfant] = { actif: false };
    }
    if (resultat.etatSequence.resolu && sequence.flag_pose) {
      flags.set(sequence.flag_pose);
    }
  }

  return suivant;
}

function avancerSequence(sequence, etatSequence, leverActiveId) {
  if (etatSequence.resolu) return { etatSequence, reinitialiser: false };

  const attendu = sequence.ordre[etatSequence.progression];
  if (leverActiveId === attendu) {
    const progression = etatSequence.progression + 1;
    return { etatSequence: { progression, resolu: progression === sequence.ordre.length }, reinitialiser: false };
  }

  return {
    etatSequence: { progression: 0, resolu: false },
    reinitialiser: !!sequence.reinit_si_erreur,
  };
}

// --- Spec 14, §4.4 : le levier qu'on TIENT --------------------------------
// INTERACT l'allume ; il reste allumé tant qu'un MAINTENEUR est à sa portée
// (le héros, ou le follet posé dessus), et s'éteint quand personne ne l'a
// tenu depuis `maintien.extinction_ms`. Le délai n'est pas une tolérance :
// c'est le temps de VOIR qu'il s'éteint, quand le joueur part vers l'autre.
export function allumerLevierMaintenu(registre, etat, leverId) {
  const puzzle = registre.obtenir('puzzles', leverId);
  if (!puzzle || puzzle.type !== 'levier_maintenu') return etat;
  return { ...etat, [leverId]: { actif: true, sansMainteneurMs: 0 } };
}

// Une frame d'un levier tenu. `maintenu` : un mainteneur est-il à portée ?
// Rend `{ etat, eteint }` — `eteint` vaut vrai à la frame où il s'éteint
// (c'est ce que compte l'explication du follet). Un levier éteint ne se
// rallume jamais seul : il faut INTERACT, être là ne suffit pas.
export function avancerLevierMaintenu(etatLevier, maintenu, deltaMs, extinctionMs) {
  if (!etatLevier || !etatLevier.actif) return { etat: etatLevier, eteint: false };
  if (maintenu) {
    return etatLevier.sansMainteneurMs === 0
      ? { etat: etatLevier, eteint: false }
      : { etat: { actif: true, sansMainteneurMs: 0 }, eteint: false };
  }
  const sansMainteneurMs = (etatLevier.sansMainteneurMs || 0) + deltaMs;
  if (sansMainteneurMs >= extinctionMs) return { etat: { actif: false, sansMainteneurMs: 0 }, eteint: true };
  return { etat: { actif: true, sansMainteneurMs }, eteint: false };
}

// Les `simultane` dont TOUS les leviers sont allumés à cette frame et dont le
// flag n'est pas encore posé : l'appelant pose le flag. Le passage reste
// ouvert ensuite même si les leviers s'éteignent — c'est le flag qui ouvre,
// jamais l'état des leviers.
export function simultanesResolus(registre, etat, estPose) {
  return registre.tous('puzzles').filter((p) => p.type === 'simultane'
    && !estPose(p.flag_pose)
    && p.tous_allumes.every((id) => etat[id] && etat[id].actif));
}

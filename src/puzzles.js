// Interprète les instances de puzzles.json à partir de deux types de
// données : `levier` (bascule + flag) et `sequence` (ordre de leviers
// enfants). Pur, testé. Ajouter une 3ᵉ instance d'un type existant ailleurs
// dans le jeu = JSON seulement (§3.8) : aucun id n'est en dur ici.

export function etatInitial(registre) {
  const etat = {};
  for (const p of registre.tous('puzzles')) {
    if (p.type === 'levier') etat[p.id] = { actif: false };
    if (p.type === 'sequence') etat[p.id] = { progression: 0, resolu: false };
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

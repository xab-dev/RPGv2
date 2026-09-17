// Stats primaires + dérivées (§3.5). Pur, testé : aucune I/O.
//
// Les dérivées vivent dans un catalogue séparé (`stats_derivees.json`)
// plutôt que dans un champ de stats.json (cf. CLAUDE.md journal Phase 1) :
// chaque entrée porte une formule linéaire { base, coefficient, min } sur
// une stat primaire — un seul chemin de calcul, générique, qu'une 5ᵉ
// dérivée n'a qu'à ajouter en JSON pour exister.

// Additionne les modificateurs (buffs) aux stats de base du catalogue
// `stats`. `modificateurs` est une map { statId: deltaTotal }, déjà agrégée
// par l'appelant (cf. status.js#modificateursHeros).
export function calculerStatsPrimaires(registre, modificateurs = {}) {
  const stats = {};
  for (const s of registre.tous('stats')) {
    stats[s.id] = s.base + (modificateurs[s.id] || 0);
  }
  return stats;
}

// Modulateur de survie (Palier C, specs/04_maison-interieur.md §3.3) :
// applique un multiplicateur uniquement aux stats listées (survival.json >
// survie_config.stats_modulees), AVANT calculerStatsDerivees — un seul
// chemin de calcul, donc les dérivées qui en dépendent (dégâts via
// stat_force, cadence d'attaque via stat_agilite, vitesse de déplacement via
// stat_agilite) suivent sans code dédié.
export function appliquerModulateurSurvie(statsPrimaires, modulateur, statsModulees) {
  const resultat = { ...statsPrimaires };
  for (const id of statsModulees || []) {
    if (resultat[id] !== undefined) resultat[id] *= modulateur;
  }
  return resultat;
}

export function calculerStatsDerivees(registre, statsPrimaires) {
  const derivees = {};
  for (const d of registre.tous('stats_derivees')) {
    const valeurStat = statsPrimaires[d.stat] ?? 0;
    const brut = d.formule.base + d.formule.coefficient * valeurStat;
    derivees[d.id] = d.formule.min !== undefined ? Math.max(d.formule.min, brut) : brut;
  }
  return derivees;
}

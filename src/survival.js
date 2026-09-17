// Survie : faim/soif (Palier C, specs/04_maison-interieur.md §3.3). Pur,
// testé. La santé reste les PV (entities.js), jamais touchés ici (§10 : "la
// faim et la soif ne touchent jamais les PV").
//
// Catalogue ouvert (survival.json) : chaque entrée portant
// `decroissance_ms_plein_a_vide` est une jauge (faim, soif, une 3ᵉ future) ;
// l'entrée `id: "survie_config"` porte les paramètres globaux du modulateur
// (plancher/pente/stats_modulees) et le malus de respawn — partagés par
// toutes les jauges déclarées, jamais recopiés sur chacune. Ajouter une 3ᵉ
// jauge en JSON de test l'inclut automatiquement dans la moyenne du
// modulateur, sans toucher ce fichier.

export function jaugesDeclarees(registre) {
  return registre.tous('survival').filter((e) => e.decroissance_ms_plein_a_vide !== undefined);
}

export function configSurvie(registre) {
  return registre.obtenir('survival', 'survie_config');
}

// Décroissance linéaire en temps de jeu actif — appelée seulement quand
// aucune UI n'est ouverte (même point de décision unique que le reste du
// gameplay, jamais pendant la pause ni hors session). `jauges` EST l'état
// persisté (pas un horodatage à comparer) : pas d'horloge dédiée nécessaire
// ici, contrairement aux cooldowns.
export function decroitre(registre, jauges, deltaMs) {
  const suivant = { ...jauges };
  for (const jauge of jaugesDeclarees(registre)) {
    const valeur = suivant[jauge.id] ?? 1;
    const delta = deltaMs / jauge.decroissance_ms_plein_a_vide;
    suivant[jauge.id] = Math.max(0, valeur - delta);
  }
  return suivant;
}

// Applique les effets `consommation.{jauge}` d'un item mangé/bu — bornée à 1
// (§4 edge case : jauge > 1 impossible), jamais négative.
export function consommer(jauges, effets) {
  const suivant = { ...jauges };
  for (const [jaugeId, valeur] of Object.entries(effets || {})) {
    const actuel = suivant[jaugeId] ?? 0;
    suivant[jaugeId] = Math.max(0, Math.min(1, actuel + valeur));
  }
  return suivant;
}

// Mort (§3.3) : jauges ramenées à malus_respawn SI elles étaient au-dessus —
// jamais une punition qui améliorerait une jauge déjà pire que le malus.
export function appliquerMalusRespawn(registre, jauges) {
  const config = configSurvie(registre);
  const suivant = { ...jauges };
  for (const jauge of jaugesDeclarees(registre)) {
    const valeur = suivant[jauge.id] ?? 1;
    suivant[jauge.id] = Math.min(valeur, config.malus_respawn);
  }
  return suivant;
}

// modulateur = plancher + pente x moyenne(jauges déclarées) — appliqué par
// l'appelant (stats.js#appliquerModulateurSurvie) aux stats listées dans
// config.stats_modulees, AVANT le calcul des dérivées : un seul chemin de
// calcul, donc dégâts/cadence/vitesse suivent sans code dédié (§3.3).
export function calculerModulateur(registre, jauges) {
  const config = configSurvie(registre);
  const declarees = jaugesDeclarees(registre);
  if (declarees.length === 0) return 1;
  const moyenne = declarees.reduce((somme, j) => somme + (jauges[j.id] ?? 1), 0) / declarees.length;
  return config.plancher + config.pente * moyenne;
}

// Première fois qu'une jauge passe sous 0,5 (§3.3 : "j'ai un creux", un
// signal, jamais un tuto) — l'appelant compare l'état avant/après decroitre()
// pour détecter le franchissement, cette fonction ne fait que le constater.
export function jaugeSousLeSeuil(jauges, seuil = 0.5) {
  return Object.values(jauges).some((v) => v < seuil);
}

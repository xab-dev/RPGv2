// Effets d'état génériques (buff / dot / debuff / controle) — §3.4/§3.5.
// Pur, testé : un seul chemin de calcul (appliquerModificateur), réutilisé
// aussi bien pour les buffs permanents du héros que pour les effets
// temporaires (aura) sur un monstre. Ajouter un 4ᵉ élément = une synergie +
// deux status_effects en JSON, zéro branche supplémentaire ici.

// mode "plat" : addition. mode "pourcent" : multiplicatif (valeur = ±fraction).
export function appliquerModificateur(valeurBase, effet) {
  return effet.mode === 'pourcent' ? valeurBase * (1 + effet.valeur) : valeurBase + effet.valeur;
}

// Modificateurs de stats primaires du héros dérivés de son compagnon actif :
// l'effet_joueur d'une synergie est permanent tant que ce follet est
// équipé (§3.4) — pas un cas spécial, juste un effet dont `duree ===
// "permanente"`.
export function modificateursHeros(registre, companionId) {
  const modificateurs = {};
  if (!companionId) return modificateurs;
  const companion = registre.obtenir('companions', companionId);
  if (!companion) return modificateurs;
  const synergie = registre.obtenir('synergies', companion.synergie);
  const effet = registre.obtenir('status_effects', synergie.effet_joueur);
  if (effet.duree === 'permanente' && effet.stat) {
    modificateurs[effet.stat] = appliquerModificateur(modificateurs[effet.stat] || 0, effet);
  }
  return modificateurs;
}

// Buffs temporaires du héros (Palier C, §3.3 : "la cuisine est un système de
// build") — table { statusEffectId: msRestant }, tiquée comme les cooldowns
// de combat.js (Math.max(0, reste - deltaMs)) mais purgeant les entrées
// venues à expiration plutôt que de les garder à 0 (une table de taille
// bornée par le nombre d'effets réellement actifs, jamais un id fantôme).
export function tickBuffsActifs(buffs, deltaMs) {
  const suivant = {};
  for (const [id, resteMs] of Object.entries(buffs)) {
    const nouveauReste = resteMs - deltaMs;
    if (nouveauReste > 0) suivant[id] = nouveauReste;
  }
  return suivant;
}

// N'accepte qu'un effet à durée numérique (ms) — un effet "permanente" ou
// "aura" n'a pas sa place dans cette table (déjà couverts par
// modificateursHeros/statsEffectivesMonstre ci-dessus, chacun sa propre
// source de vérité).
export function ajouterBuffActif(registre, buffs, effetId) {
  const effet = registre.obtenir('status_effects', effetId);
  if (typeof effet.duree !== 'number') return buffs;
  return { ...buffs, [effetId]: effet.duree };
}

// Modificateurs de stats primaires dérivés des buffs temporaires actifs —
// même mécanisme que modificateursHeros (appliquerModificateur), sommé par
// stat pour accueillir plusieurs buffs simultanés sans code dédié.
export function modificateursBuffsActifs(registre, buffs) {
  const modificateurs = {};
  for (const id of Object.keys(buffs)) {
    const effet = registre.obtenir('status_effects', id);
    if (effet.cible === 'joueur' && effet.stat) {
      modificateurs[effet.stat] = appliquerModificateur(modificateurs[effet.stat] || 0, effet);
    }
  }
  return modificateurs;
}

// Stats/paramètres effectifs d'un monstre, selon qu'il est "dans l'aura" du
// follet ou non. "Dans l'aura" est approximé par l'état d'engagement du
// follet (§3.6 : le follet se colle au monstre engagé) plutôt que par un
// second calcul de distance — même source de vérité, provisoire mais
// suffisant tant qu'un seul monstre est engageable à la fois (Phase 4
// réévaluera si plusieurs monstres doivent être dans l'aura en même temps).
export function statsEffectivesMonstre(registre, monstreDonnees, follet) {
  const dansAura = !!follet && follet.etat === 'engager' && follet.cibleMonstreId === monstreDonnees.id;
  let force = monstreDonnees.force;
  let vitesse = monstreDonnees.vitesse;
  let dot = null;

  if (dansAura) {
    const companion = registre.obtenir('companions', follet.companionId);
    const synergie = registre.obtenir('synergies', companion.synergie);
    const effet = registre.obtenir('status_effects', synergie.effet_monstre);
    if (effet.stat === 'stat_force') force = appliquerModificateur(force, effet);
    if (effet.param === 'vitesse_deplacement') vitesse = appliquerModificateur(vitesse, effet);
    if (effet.param === 'pv') dot = effet;
  }

  return { force, vitesse, dot, dansAura };
}

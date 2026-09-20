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

// Un monstre est-il DANS l'aura ? Question purement géométrique (`D-51`, décision
// de Xav du 20/09 : « il faut que l'aura serve à quelque chose » — ce qui est
// DESSINÉ est ce qui AGIT, comme la lumière du follet, à la fois halo et trou
// dans le voile).
//
// Ce que ça remplace, et pourquoi c'était faux. L'ancienne version approximait
// « dans l'aura » par l'état d'engagement du follet (`follet.cibleMonstreId ===
// monstre.id`). Deux ennuis, dont un mortel : (1) depuis `D-38`, une instance
// de monstre porte un id d'INSTANCE (`enemy_rodeur#12`) alors que l'appelant
// passait la fiche CATALOGUE — la comparaison était toujours fausse, et les
// trois effets monstre (brûlure, affaiblissement, entrave) étaient morts dans
// toutes les scènes ; (2) même réparée, elle n'aurait jamais pu toucher plus
// d'un monstre à la fois, alors que la 1ʳᵉ zone de monstres aura des groupes.
// On ne répare donc pas la comparaison d'ids : on supprime l'approximation.
//
// `centre` est le point LOGIQUE du follet (celui dont `D-39` fait dériver le
// corps et l'aura), jamais le corps décalé par `vol_follet.js` — sinon l'effet
// clignoterait au rythme du vol, et le cercle affiché cesserait d'être exact.
//
// Rien n'est allé chercher : la fonction reste pure et ne lit pas le monde. Une
// géométrie absente (pas de follet, pas de centre, pas de rayon) rend `false` —
// même discipline que `flags.js` : ce qu'on ne sait pas évaluer ne déclenche pas.
export function estDansAura(positionMonstre, aura) {
  if (!positionMonstre || !aura || !aura.centre || typeof aura.rayonPx !== 'number') return false;
  const dx = positionMonstre.x - aura.centre.x;
  const dy = positionMonstre.y - aura.centre.y;
  return Math.hypot(dx, dy) <= aura.rayonPx;
}

// Stats/paramètres effectifs d'un monstre, selon qu'il est dans l'aura du
// follet ou non. `monstreDonnees` est la fiche CATALOGUE (force, vitesse de
// base) ; la position vivante de l'instance et la géométrie de l'aura arrivent
// par `contexte` — la fonction ne va rien chercher (`D-51`).
//
// `contexte` = { position: {x, y}, aura: { centre: {x, y}, rayonPx } }.
// PLUSIEURS monstres peuvent être dans l'aura en même temps et reçoivent tous
// l'effet : c'est voulu, et c'est l'appelant qui en décide en appelant cette
// fonction pour chacun. L'appelant ne la lui passe que pour un monstre VIVANT
// (un mort n'a plus de stats à moduler).
export function statsEffectivesMonstre(registre, monstreDonnees, follet, contexte = {}) {
  const dansAura = !!follet && estDansAura(contexte.position, contexte.aura);
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

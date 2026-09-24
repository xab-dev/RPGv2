// Effets d'état génériques (buff / dot / debuff / controle) — §3.4/§3.5.
// Pur, testé : un seul chemin de calcul (appliquerModificateur), réutilisé
// aussi bien pour les buffs permanents du héros que pour les effets
// temporaires (aura) sur un monstre. Ajouter un 4ᵉ élément = une synergie +
// deux status_effects en JSON, zéro branche supplémentaire ici.

// mode "plat" : addition. mode "pourcent" : multiplicatif (valeur = ±fraction).
export function appliquerModificateur(valeurBase, effet) {
  return effet.mode === 'pourcent' ? valeurBase * (1 + effet.valeur) : valeurBase + effet.valeur;
}

// --- Régimes de synergie (`specs/10_alignement-follet.md` §4) --------------
//
// Le régime d'alignement tel que `alignement.js#regime` le rend. Neutre par
// défaut : un appelant qui ne connaît pas l'alignement (tests d'avant, outils)
// obtient exactement le jeu d'avant la spec 10.
const REGIME_NEUTRE = { regime: 'neutre', palier: 0 };

// LE point de résolution d'une synergie (§4.4) : `{ heros: [effets],
// monstres_aura: [effets] }`, À PARTIR DES DONNÉES SEULES. Un « effet » rendu
// ici est l'entrée de `status_effects.json` dont la `valeur` est déjà mise à
// l'échelle — personne en aval ne connaît ni le palier ni le régime.
//
// Quel régime des données ? Le NÉGATIF ne sert qu'au régime négatif ; le
// POSITIF sert au positif ET au neutre, parce que le neutre est le jeu d'avant
// l'alignement, que Xav a validé tel quel (positif palier 1 = aujourd'hui).
// Intensité : le palier, et 1 au neutre — la bande morte n'annule pas la
// synergie, elle la laisse telle qu'elle a toujours été.
export function resoudreSynergie(registre, companionId, regime = REGIME_NEUTRE) {
  const vide = { heros: [], monstres_aura: [] };
  if (!companionId) return vide;
  const companion = registre.obtenir('companions', companionId);
  if (!companion) return vide;
  const synergie = registre.obtenir('synergies', companion.synergie);
  const donnees = synergie.regimes[regime.regime === 'negatif' ? 'negatif' : 'positif'];
  const intensite = Math.max(1, regime.palier);
  const resoudre = (entree) => {
    const effet = registre.obtenir('status_effects', entree.effet);
    const facteur = (entree.multiplicateur ?? 1) * (entree.par_palier ? intensite : 1);
    return facteur === 1 ? effet : { ...effet, valeur: effet.valeur * facteur };
  };
  return { heros: donnees.heros.map(resoudre), monstres_aura: donnees.monstres_aura.map(resoudre) };
}

// Un effet du HÉROS agit-il maintenant ? `permanente` : tant que ce follet est
// là. `aura` : le temps du combat, c'est-à-dire tant que l'aura du follet
// contient au moins un monstre vivant — c'est l'effet qui a « changé de camp »
// (la brûlure que le monstre aurait reçue), il vit donc là où il aurait vécu.
function effetHerosActif(effet, contexte) {
  if (effet.duree === 'permanente') return true;
  return effet.duree === 'aura' && !!(contexte && contexte.auraOccupee);
}

// Modificateurs de stats primaires du héros dérivés de son compagnon actif,
// sous le régime courant. Même forme qu'avant la spec 10, `{ statId: delta }` :
// le calcul des stats n'apprend rien.
export function modificateursHeros(registre, companionId, regime = REGIME_NEUTRE, contexte = {}) {
  const modificateurs = {};
  for (const effet of resoudreSynergie(registre, companionId, regime).heros) {
    if (effet.stat && effetHerosActif(effet, contexte)) {
      modificateurs[effet.stat] = appliquerModificateur(modificateurs[effet.stat] || 0, effet);
    }
  }
  return modificateurs;
}

// Modificateurs de DÉRIVÉES (§4.3 point 1) : `{ deriveeId: [effets] }`. Seule
// la synergie du compagnon en porte — les buffs et l'arme n'en ont pas, et
// leur forme ne change pas. Appliqués APRÈS `calculerStatsDerivees`, par
// `appliquerModificateursDerivees` : la formule d'une dérivée reste celle de
// `D-141`, c'est sa valeur qui est ensuite modulée.
export function modificateursDeriveesHeros(registre, companionId, regime = REGIME_NEUTRE, contexte = {}) {
  const parDerivee = {};
  for (const effet of resoudreSynergie(registre, companionId, regime).heros) {
    if (effet.derivee && effetHerosActif(effet, contexte)) {
      (parDerivee[effet.derivee] = parDerivee[effet.derivee] || []).push(effet);
    }
  }
  return parDerivee;
}

// Rend une copie des dérivées, chaque dérivée modulée par ses effets — le
// même `appliquerModificateur` que partout ailleurs.
export function appliquerModificateursDerivees(derivees, parDerivee) {
  const resultat = { ...derivees };
  for (const [id, effets] of Object.entries(parDerivee)) {
    if (resultat[id] === undefined) continue;
    for (const effet of effets) resultat[id] = appliquerModificateur(resultat[id], effet);
  }
  return resultat;
}

// Les effets à dégâts sur la durée que le HÉROS subit maintenant (§4.3 point
// 3) : même forme qu'une brûlure de monstre (`param: "pv"`, `intervalle_ms`),
// tiqués par l'appelant avec la même boucle.
export function dotsHeros(registre, companionId, regime = REGIME_NEUTRE, contexte = {}) {
  return resoudreSynergie(registre, companionId, regime).heros
    .filter((effet) => effet.param === 'pv' && effetHerosActif(effet, contexte));
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

// Les soins sur la durée des buffs temporaires (la pomme cuite, 23/09) : un
// buff de `param: "pv"` rend `valeur` PV tous les `intervalle_ms` tant qu'il
// est actif — la brûlure du héros à l'envers, même forme d'effet, même boucle
// d'intervalle. Pure : rend le soin de la frame et les accumulateurs suivants,
// l'appelant l'applique (plafonné aux PV max, jamais sur un héros mort). Un
// buff expiré perd son accumulateur : repris plus tard, il repart de zéro.
export function tickSoinsBuffsActifs(registre, buffs, accumulateurs, deltaMs) {
  let soin = 0;
  const suivants = {};
  for (const id of Object.keys(buffs)) {
    const effet = registre.obtenir('status_effects', id);
    if (effet.cible !== 'joueur' || effet.param !== 'pv') continue;
    let reste = (accumulateurs[id] || 0) + deltaMs;
    while (reste >= effet.intervalle_ms) {
      reste -= effet.intervalle_ms;
      soin += effet.valeur;
    }
    suivants[id] = reste;
  }
  return { soin, accumulateurs: suivants };
}

// L'icône d'un buff au bandeau (`D-13`) : c'est TOUJOURS l'icône d'une stat,
// jamais un dessin propre à l'effet — ajouter une recette n'ajoute pas
// d'icône. Un buff de stat montre la sienne. Un effet sans stat (un soin, qui
// touche les PV) EMPRUNTE celle d'une stat en données (`icone_bandeau.stat`)
// et peut la teinter (`icone_bandeau.teinte`) : même silhouette, autre nature
// (demande de Xav, 23/09 : « même icône que le fruit cuit, mais verte »).
// Rend `{ visuel, teinte }` (ids et couleur, rien de dessiné), ou `null` :
// un effet qui n'a rien à montrer est absent du bandeau, pas un trou.
export function iconeBuffBandeau(registre, effet) {
  if (effet.cible !== 'joueur') return null;
  const statId = effet.icone_bandeau ? effet.icone_bandeau.stat : effet.stat;
  if (!statId) return null;
  const { icone } = registre.obtenir('stats', statId);
  if (!icone) return null;
  return { visuel: icone, teinte: (effet.icone_bandeau && effet.icone_bandeau.teinte) || null };
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
//
// `regime` (`specs/10` §4.4) : les effets viennent d'une LISTE, celle du
// régime courant — vide pour Feu négatif (plus de brûlure), un facteur > 1
// pour Eau négatif (le « canal de vitesse » accepte les deux sens, §4.3 point
// 2), l'entrave × 0,5 pour Terre négatif. Relu à chaque frame : un changement
// de régime en plein combat n'a aucune transition à coder.
export function statsEffectivesMonstre(registre, monstreDonnees, follet, contexte = {}, regime = REGIME_NEUTRE) {
  const dansAura = !!follet && estDansAura(contexte.position, contexte.aura);
  let force = monstreDonnees.force;
  let vitesse = monstreDonnees.vitesse;
  let dot = null;

  if (dansAura) {
    for (const effet of resoudreSynergie(registre, follet.companionId, regime).monstres_aura) {
      if (effet.stat === 'stat_force') force = appliquerModificateur(force, effet);
      if (effet.param === 'vitesse_deplacement') vitesse = appliquerModificateur(vitesse, effet);
      if (effet.param === 'pv') dot = effet;
    }
  }

  return { force, vitesse, dot, dansAura };
}

// --- Statut posé au coup (`specs/15` palier A, la brûlure de la torche) ----
// Un coup d'une arme qui porte `au_coup` pose sur le monstre touché un statut
// LIMITÉ DANS LE TEMPS : aujourd'hui une brûlure (PV à intervalle). Le
// monstre le porte dans `statutsCoup`, `{ id, restantMs, accumulateurMs }`.
// Sans cumul (`cumul: false`) : un nouveau coup REMET la durée à plein, il
// n'ajoute pas une seconde brûlure. Pur : rend un nouveau monstre.
export function poserStatutCoup(monstre, statut) {
  const autres = (monstre.statutsCoup || []).filter((s) => s.id !== statut.id);
  const existant = (monstre.statutsCoup || []).find((s) => s.id === statut.id);
  return {
    ...monstre,
    statutsCoup: [...autres, { id: statut.id, restantMs: statut.duree, accumulateurMs: existant ? existant.accumulateurMs : 0 }],
  };
}

// Fait avancer les statuts posés au coup de `deltaMs` : rend le monstre (sans
// les statuts expirés) et les DÉGÂTS de cette frame, que l'appelant inflige
// par le chemin habituel (`entities.js#infligerDegats`). Un tick tombe tant
// que le statut vit encore au moment du tick : une brûlure de 3 s à 500 ms
// fait 6 ticks, ni 5 ni 7.
export function tickStatutsCoup(registre, monstre, deltaMs) {
  if (!monstre.statutsCoup || monstre.statutsCoup.length === 0) return { monstre, degats: 0 };
  let degats = 0;
  const restants = [];
  for (const s of monstre.statutsCoup) {
    const statut = registre.obtenir('status_effects', s.id);
    const actif = Math.min(deltaMs, s.restantMs);
    let acc = s.accumulateurMs + actif;
    while (acc >= statut.intervalle_ms) {
      acc -= statut.intervalle_ms;
      degats += statut.valeur;
    }
    const restantMs = s.restantMs - deltaMs;
    if (restantMs > 0) restants.push({ ...s, restantMs, accumulateurMs: acc });
  }
  return { monstre: { ...monstre, statutsCoup: restants }, degats };
}

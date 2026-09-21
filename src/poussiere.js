// Traînée de poussière derrière le héros (MT_trainee-poussiere_2026-09-19) :
// de petites bouffées blanches quand on marche, 2-3 visibles à la fois,
// « comme de la poussière qui se soulève » (décision Xav). Remplace le
// roulement, jamais implémenté.
//
// RÈGLE DIRECTRICE DE LA FICHE : l'effet vit dans le MONDE, il ne dépend pas
// de la forme du héros. Ce module ne connaît ni le héros, ni son visuel, ni
// son rayon — seulement une position et une distance parcourue. Remplacer la
// silhouette du héros demain ne touche pas une ligne d'ici.
//
// Module PUR : aucun canvas, aucun DOM, aucune horloge propre. Le dessin est
// fait par l'appelant via dessinerVisuel() ; ce fichier ne produit que des
// états de bouffées ({ x, y, alpha, echelle }).

// Réserve fixe pré-allouée (§À faire : « 8 suffisent, zéro allocation en
// jeu »). Les bouffées vivent ~0,35 s et naissent tous les ~14 px : à la
// vitesse du héros, 3 à 4 coexistent — 8 laisse de la marge sans jamais
// réallouer. Une bouffée morte est recyclée sur place, jamais retirée du
// tableau (pas de `splice`, pas de `push` en jeu).
export const CAPACITE_RESERVE = 8;

// État neuf. `distanceDepuisDerniere` accumule les déplacements entre deux
// émissions : l'émission se fait À LA DISTANCE PARCOURUE, jamais au temps,
// donc la densité de la traînée est la même à 30 comme à 144 fps.
// `compteur` sert au décalage latéral alterné : déterministe (pas de
// Math.random() dans la boucle, §À faire), donc deux exécutions identiques
// produisent exactement les mêmes bouffées.
// `capacite` en DONNÉES (`D-108`), défaut `CAPACITE_RESERVE` : 8 bouffées
// suffisent au héros (75 px/s) et au follet, pas à une souris, qui traverse
// l'écran en une demi-seconde et vide la réserve en quatre frames — la traînée
// devient alors une grappe clignotante. La taille de la réserve suit donc la
// VITESSE de ce qu'on suit, et c'est un réglage, pas une constante du module.
//
// Une capacité de ZÉRO est une valeur, pas une absence (palier C de
// `specs/09_reglages-graphiques.md`) : la réserve est vide, donc rien ne naît
// et rien n'est dessiné, sans une branche « effet éteint » de plus ici. Ce
// module ignore toujours qu'un preset existe — il reçoit un nombre.
export function creerPoussiere(config) {
  const capacite = Number.isInteger(config.capacite) && config.capacite >= 0 ? config.capacite : CAPACITE_RESERVE;
  const bouffees = new Array(capacite);
  for (let i = 0; i < capacite; i += 1) {
    bouffees[i] = { active: false, x: 0, y: 0, ageMs: 0, cote: 1 };
  }
  return { config, bouffees, distanceDepuisDerniere: 0, compteur: 0 };
}

// Avance les bouffées vivantes et en émet de nouvelles si le héros a bougé
// d'assez de pixels. Mute l'état en place — c'est un système de particules,
// pas une table de données : recopier 8 objets par frame irait à l'encontre
// du « zéro allocation en jeu » exigé par la fiche (le reste du projet
// renvoie des objets neufs parce qu'il traite des états de jeu, pas des
// particules).
//
// `emettre` est l'unique interrupteur : l'appelant y met sa propre condition
// (héros qui bouge ET aucune UI ouverte ET pas d'intro). Ce module ne décide
// jamais lui-même s'il a le droit d'émettre — le point de décision unique
// reste dans main.js#maj(), comme pour tout le reste du gameplay.
//
// `depuisX`/`depuisY` (`D-108`, facultatifs, défaut = `x`/`y`) : le point d'où
// l'on vient. Sans eux, toutes les bouffées d'une même frame naissent AU POINT
// D'ARRIVÉE — invisible au héros (1 px par frame), mais une souris qui fait
// 60 px en une frame dépose alors une grappe au lieu d'une traînée. Les donner
// rend vraie la promesse déjà écrite plus haut : « l'émission se fait à la
// distance parcourue ». Défaut inchangé, donc le héros et le follet ne bougent
// pas d'un pixel.
export function avancerPoussiere(etat, {
  x, y, distancePx, deltaMs, emettre, depuisX = x, depuisY = y,
}) {
  const { duree_ms, intervalle_px, decalage_lateral_px } = etat.config;

  for (const b of etat.bouffees) {
    if (!b.active) continue;
    b.ageMs += deltaMs;
    if (b.ageMs >= duree_ms) b.active = false;
  }

  if (!emettre || !(distancePx > 0)) {
    // À l'arrêt (ou sous UI), on n'accumule rien : reprendre la marche ne
    // doit pas cracher d'un coup une bouffée en retard.
    etat.distanceDepuisDerniere = 0;
    return etat;
  }

  // Distance déjà accumulée AVANT ce déplacement : c'est elle qui dit à quelle
  // fraction du segment tombe la première émission.
  const reportAvant = etat.distanceDepuisDerniere;
  let parcouru = 0;
  etat.distanceDepuisDerniere += distancePx;
  // `while` et non `if` : une frame longue (onglet masqué, gros delta) peut
  // franchir plusieurs intervalles d'un coup. Borné par la réserve de toute
  // façon, donc jamais une boucle coûteuse.
  while (etat.distanceDepuisDerniere >= intervalle_px) {
    etat.distanceDepuisDerniere -= intervalle_px;
    parcouru += intervalle_px;
    // Fraction du segment à laquelle cette bouffée-ci est née.
    const t = distancePx > 0 ? Math.min(1, Math.max(0, (parcouru - reportAvant) / distancePx)) : 1;
    etat.compteur += 1;
    const cote = etat.compteur % 2 === 0 ? 1 : -1;
    const libre = etat.bouffees.find((b) => !b.active);
    // Réserve pleine : on laisse tomber la bouffée plutôt que d'agrandir le
    // tableau. Invisible en jeu (la réserve ne se remplit qu'en téléportation),
    // et c'est le prix du « zéro allocation ».
    if (!libre) continue;
    libre.active = true;
    libre.x = depuisX + (x - depuisX) * t + cote * decalage_lateral_px;
    libre.y = depuisY + (y - depuisY) * t;
    libre.ageMs = 0;
    libre.cote = cote;
  }
  return etat;
}

// Bouffées à dessiner, dans l'ordre de la réserve. `alpha` s'estompe et
// `echelle` grossit un peu avec l'âge (§À faire) — les deux sont pilotés par
// le SEUL âge de la bouffée, donc le rendu n'a aucun état à tenir.
// L'appelant passe ça tel quel à dessinerVisuel().
export function bouffeesVisibles(etat) {
  const { duree_ms, alpha_depart, echelle_depart, echelle_fin } = etat.config;
  const visibles = [];
  for (const b of etat.bouffees) {
    if (!b.active) continue;
    const t = duree_ms > 0 ? Math.min(1, b.ageMs / duree_ms) : 1;
    visibles.push({
      x: b.x,
      y: b.y,
      alpha: alpha_depart * (1 - t),
      echelle: echelle_depart + (echelle_fin - echelle_depart) * t,
    });
  }
  return visibles;
}

// Vide la réserve sans la réallouer — utilisé au changement de scène et à
// reinitialiserPartie() : une traînée laissée dans la Grotte n'a rien à faire
// dans la Maison.
export function viderPoussiere(etat) {
  for (const b of etat.bouffees) b.active = false;
  etat.distanceDepuisDerniere = 0;
  return etat;
}

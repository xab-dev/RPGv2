// Follet (§3.6) : orbite autour du héros par défaut, se colle à un monstre
// engagé sinon. Pur, testé : la lumière et l'aura suivent la même position
// dans tous les états (aucun code séparé pour "la lumière suit l'engagement").

// Provisoires, non validés en jeu par Xav.
const ORBITE_RAYON_PX = 24;
const ORBITE_VITESSE_RAD_S = 2;
// "Retard ressort" du suivi, exprimé PAR FRAME À 60 FPS — c'est l'unité dans
// laquelle il a été réglé et validé à l'œil. Jamais appliqué tel quel : il
// passe par `amortissement(deltaS)`, qui le convertit au pas de temps réel.
const ORBITE_LERP = 0.15;
// Fréquence de référence de ORBITE_LERP (voir ci-dessus), pas un réglage.
const FPS_REFERENCE_LERP = 60;

// `D-53` : la fraction du retard rattrapée pendant `deltaS`. Appliquer 0,15 à
// chaque frame faisait dépendre la mollesse du follet du nombre de frames :
// ~0,5 s pour rattraper son retard à 60 fps, ~0,8 s à 37 fps (téléphone) — le
// follet était plus mou précisément quand le jeu ramait. Ici la loi est la
// même exponentielle, mais du TEMPS : à 60 fps elle rend exactement 0,15, et
// deux frames de 1/120 s font la même chose qu'une frame de 1/60 s.
// Une seule fonction pour TOUS les amortissements du follet (orbite et
// approche d'un monstre, qui partagent volontairement la même loi).
function amortissement(deltaS) {
  return 1 - (1 - ORBITE_LERP) ** (deltaS * FPS_REFERENCE_LERP);
}

// --- Valeurs de base destinées à grandir (principe d'équilibrage du 19/09) ---
// « Les valeurs de base du début de jeu sont basses, et tout grandit ensuite »
// (équipement, niveaux, buffs). La seule conséquence d'architecture de ce
// principe : une valeur destinée à grandir n'est **jamais lue directement**
// par un système — elle passe par une fonction pure de résolution, qui rend
// aujourd'hui la base telle quelle. Le jour où un talisman doublera l'orbite
// (`Q-29`), il n'y aura qu'ici à le brancher, et un seul endroit à relire.
// AUCUN modificateur n'est livré avec ces points d'entrée : c'est volontaire.

// Distance d'orbite EFFECTIVE. `D-34` : elle **ne change pas** avec la taille
// du follet (décision Xav, `Q-26`) — réduite, elle serrerait trop le follet
// contre le héros, et c'est justement une valeur appelée à grandir.
export function resoudreOrbiteRayonPx() {
  return ORBITE_RAYON_PX;
}

// Rayon d'aura EFFECTIF (`D-51`). L'aura n'est plus un cercle décoratif : le
// trait pointillé DESSINÉ et la règle qui décide « ce monstre est dans
// l'aura » lisent tous les deux ce nombre-ci, et jamais `companion.rayon_aura`
// en direct — c'est ce qui garantit que ce qui est dessiné est ce qui agit
// (même contrat que `rayon_lumiere`, à la fois halo et trou dans le voile).
// Déclaré par compagnon dans `data/companions.json#rayon_aura` (requis par le
// schéma, donc jamais absent d'un catalogue valide).
//
// AUCUN modificateur n'est livré ici : un talisman qui élargirait l'aura
// (`Q-29`) ou un pourcentage de synergie se brancheront à cet endroit, et à
// cet endroit seulement.
export function resoudreRayonAuraPx(companion) {
  return companion.rayon_aura;
}

// Échelle EFFECTIVE du follet en jeu (`D-34`) : déclarée par compagnon dans
// `data/companions.json#echelle_jeu`, 1 pour un compagnon qui ne la déclare
// pas (un catalogue existant reste valide tel quel). Distincte de la taille
// que la cinématique du choix donne aux trois follets, qui ne bouge pas :
// main.js#dessinerEcranChoixFollet continue de calculer la sienne depuis
// TAILLE_FOLLET_* / TAILLE_REFERENCE_FOLLET_PX.
export function resoudreEchelleJeu(companion) {
  const echelle = companion && companion.echelle_jeu;
  return typeof echelle === 'number' && echelle > 0 ? echelle : 1;
}

// Frontière cinématique -> jeu (`D-34`, décision du 19/09 « aucun saut aux
// frontières ») : le follet élu passe de sa taille d'écran de choix à sa
// taille de jeu **pendant** l'étape de départ des deux autres. `avancement`
// est celui de cette étape (intro.js#avancementDepart, déjà amorti) : une
// seule courbe pour les positions des partants et pour la taille de l'élu.
export function echelleFolletEnTransition(echelleCinematique, echelleJeu, avancement) {
  const a = Math.min(1, Math.max(0, avancement));
  return echelleCinematique + (echelleJeu - echelleCinematique) * a;
}

// `sens` : 1 (le sens d'aujourd'hui) ou -1 (orbite inversée, régime négatif,
// `specs/10` §4.1). Un follet créé alors que le régime est DÉJÀ négatif — un
// chargement, une entrée de scène — tourne d'emblée à l'envers : le
// renversement ne se joue que quand l'alignement CHANGE en cours de partie,
// jamais à chaque porte franchie (`Q-89`).
export function creerFollet(companionId, hero, sens = 1) {
  return {
    companionId,
    etat: 'suivre',
    cibleMonstreId: null,
    x: hero.x + resoudreOrbiteRayonPx(),
    y: hero.y,
    angleOrbite: 0,
    // Multiplicateur signé de la vitesse angulaire, dans [-1 ; 1]. C'est LA
    // grandeur que l'inversion fait glisser ; rayon, lumière, aura,
    // engagement ne la lisent jamais.
    facteurOrbite: sens,
  };
}

// Vitesse maximale du point logique en orbite, héros immobile — la borne que
// le renversement ne doit jamais dépasser (§7, test du palier B). Dérivée des
// valeurs de résolution, jamais recopiée.
export function vitesseOrbiteMaxPxS() {
  return ORBITE_VITESSE_RAD_S * resoudreOrbiteRayonPx();
}

// `specs/10` §4.1 : le facteur d'orbite glisse vers le sens voulu à vitesse
// constante — de +1 à -1 en `dureeInversionMs`. Le follet RALENTIT, S'ARRÊTE,
// REPART dans l'autre sens : c'est le signe visible de l'alignement, et il
// doit se lire comme un geste, pas comme un accroc. La position, elle, ne
// peut pas sauter : seule la vitesse angulaire change, l'angle s'intègre.
function glisserFacteur(facteur, sens, deltaS, dureeInversionMs) {
  if (facteur === sens) return facteur;
  if (!(dureeInversionMs > 0)) return sens;
  const pas = (2 / (dureeInversionMs / 1000)) * deltaS;
  return sens > facteur ? Math.min(sens, facteur + pas) : Math.max(sens, facteur - pas);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// --- Règle d'engagement (`D-37`, décisions de Xav des 19 et 20/09) ---------
// Il n'existe PLUS de distance d'engagement propre au follet
// (la constante de 48 px est retirée) : la portée du follet est celle
// qu'on VOIT — son orbite et son aura. Ce qui est dessiné est ce qui agit,
// exactement comme pour l'aura (`D-51`) et pour `rayon_lumiere`.

// Marge d'hystérésis entre engager et relâcher. FIXE, et c'est le point : ce
// n'est pas une portée, c'est l'épaisseur du bord. Sans elle, un monstre
// immobile pile sur la frontière ferait osciller le follet d'une frame à
// l'autre. Orbite et aura, elles, grandiront (`Q-26`, `Q-29`) — la portée
// d'engagement et de relâche suivra toute seule, sans toucher ce nombre.
const MARGE_RELACHE_PX = 12;

// Rayon d'aura tolérant : un appelant qui n'a pas le catalogue du compagnon
// sous la main n'engage que par l'orbite, il ne lève pas. Même discipline que
// `flags.js` face à une condition qu'on ne sait pas évaluer : on n'ouvre pas.
function rayonAuraDe(companion) {
  return companion ? resoudreRayonAuraPx(companion) : 0;
}

// Distance héros -> monstre au-delà de laquelle le follet lâche sa cible.
// Tout passe par les fonctions de résolution, jamais par les constantes.
export function distanceRelachePx(companion) {
  return resoudreOrbiteRayonPx() + rayonAuraDe(companion) + MARGE_RELACHE_PX;
}

// LE prédicat d'engagement — une seule source, lue par `mettreAJourEtat` et
// par l'indice de commande ATTACK (specs/04_indices-commandes.md §3), qui se
// déclenche donc exactement quand le follet partirait.
//
// Le garde-fou de la 1ʳᵉ ligne n'est pas du zèle : sans lui, un monstre à
// 70 px effleuré par l'aura d'un follet qui rentre serait engagé à une frame
// et relâché à la suivante (la relâche, elle, se mesure depuis le héros).
export function monstreEngageable(monstre, hero, follet, companion) {
  // Spec 14, §4.3 : le follet ignore un intouchable (Zéros) — il n'a rien à y
  // faire, et c'est la cible voulue par la scène qu'il doit prendre.
  if (!monstre || monstre.mort || monstre.intouchable) return false;
  const dHero = distance(hero, monstre);
  if (dHero > distanceRelachePx(companion)) return false;
  if (dHero <= resoudreOrbiteRayonPx()) return true;
  return follet ? distance(follet, monstre) <= rayonAuraDe(companion) : false;
}

// Transition suivre <-> engager. Un monstre engagé reste la cible tant qu'il
// est vivant et en deçà de la distance de relâche ; sinon retour à `suivre`.
// En `suivre` — donc aussi pendant le retour en orbite —, le follet accroche
// le candidat le PLUS PROCHE DU HÉROS parmi les engageables.
export function mettreAJourEtat(follet, hero, monstres, companion) {
  if (follet.etat === 'engager') {
    const cible = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (!cible || cible.mort || distance(hero, cible) > distanceRelachePx(companion)) {
      return { ...follet, etat: 'suivre', cibleMonstreId: null };
    }
    return follet;
  }

  let proche = null;
  let meilleure = Infinity;
  for (const monstre of monstres) {
    if (!monstreEngageable(monstre, hero, follet, companion)) continue;
    const d = distance(hero, monstre);
    if (d < meilleure) {
      meilleure = d;
      proche = monstre;
    }
  }
  if (proche) return { ...follet, etat: 'engager', cibleMonstreId: proche.id };
  return follet;
}

// Position à la frame courante (orbite en `suivre`, collé au monstre en
// `engager`) — la même fonction porte la position ET la lumière.
//
// `orbite` (`specs/10` §4.1) : `{ sens, dureeInversionMs }`, le sens VOULU
// (1 ou -1) que l'appelant a déduit du régime d'alignement, et la durée du
// renversement lue dans les données. Ce module ne connaît ni la sauvegarde ni
// l'alignement : il reçoit un signe. Par défaut, le sens d'aujourd'hui.
export function avancerPosition(follet, hero, monstres, deltaS, orbite = {}) {
  const { sens = 1, dureeInversionMs = 0 } = orbite;
  // Un follet d'avant ce palier (tests, état construit à la main) n'a pas de
  // facteur : il tourne dans le sens d'aujourd'hui, comme il l'a toujours fait.
  const facteurAvant = typeof follet.facteurOrbite === 'number' ? follet.facteurOrbite : 1;
  const facteurOrbite = glisserFacteur(facteurAvant, sens, deltaS, dureeInversionMs);
  // Intégré au milieu du pas (moyenne des deux facteurs) : le chemin parcouru
  // pendant le renversement ne dépend pas du nombre de frames (`D-53`).
  const angleOrbite = follet.angleOrbite
    + deltaS * ORBITE_VITESSE_RAD_S * (facteurAvant + facteurOrbite) / 2;
  const k = amortissement(deltaS);

  // Aller ET retour amortis par la MÊME loi (décision Xav : « mouvement
  // fluide, jamais un flash »). L'approche copiait la position du monstre
  // d'un coup : jusqu'à ~70 px en une frame, un saut visible. Conséquence
  // voulue, cohérente avec `D-51` : l'aura arrive AVEC le follet, l'effet
  // commence quand le cercle touche le monstre, pas à l'instant de la
  // décision d'engager.
  if (follet.etat === 'engager') {
    const cible = monstres.find((m) => m.id === follet.cibleMonstreId);
    if (cible) {
      return {
        ...follet,
        x: follet.x + (cible.x - follet.x) * k,
        y: follet.y + (cible.y - follet.y) * k,
        angleOrbite,
        facteurOrbite,
      };
    }
  }

  // Lu à travers la résolution, jamais la constante directement (voir plus haut).
  const rayon = resoudreOrbiteRayonPx();
  const cibleX = hero.x + Math.cos(angleOrbite) * rayon;
  const cibleY = hero.y + Math.sin(angleOrbite) * rayon;
  return {
    ...follet,
    x: follet.x + (cibleX - follet.x) * k,
    y: follet.y + (cibleY - follet.y) * k,
    angleOrbite,
    facteurOrbite,
  };
}

// --- « Cible suivante » (`D-54`, décision de Xav du 20/09) -----------------
// Le joueur fait changer le follet de monstre : RB à la manette, Tab au
// clavier, toucher le follet au doigt (`Q-40`, 23/09). Pur, aucun périphérique
// ici — le verbe abstrait `target_next` arrive déjà traduit.
//
// CANDIDATS = les monstres vivants que le follet ne lâcherait pas aussitôt,
// c'est-à-dire en deçà de la distance de RELÂCHE, et non les seuls
// engageables : ordonner une cible est justement le moyen d'envoyer le follet
// sur un monstre que la règle automatique (orbite ou aura) n'aurait pas pris.
// La cible ainsi choisie tient ensuite toute seule — `mettreAJourEtat` ne
// reprend « le plus proche » qu'en état `suivre`.
//
// L'ordre est « le plus proche du héros d'abord », et il boucle. Le tri se
// fait sur la distance PUIS sur l'id : deux monstres à égalité parfaite
// donneraient sinon un ordre dépendant de la position dans le tableau, qui
// change quand un monstre meurt — le cycle sauterait sans raison visible.
//
// Sans candidat, ou quand le seul candidat est DÉJÀ la cible : le follet est
// rendu tel quel, sans effet et sans erreur. Un appui alors que le follet
// n'a aucune cible prend le premier de la liste (le plus proche) — lecture
// retenue par défaut du « zéro ou un candidat : sans effet » du ticket,
// confirmée par Xav le 23/09 (`Q-41`) : c'est aussi le RAPPEL du follet
// parti trop loin — sa cible hors de portée n'est plus candidate, le cycle
// repart du plus proche du héros.
export function cibleSuivante(follet, hero, monstres, companion) {
  if (!follet) return follet;
  const portee = distanceRelachePx(companion);
  const candidats = monstres
    .filter((m) => m && !m.mort && !m.intouchable && distance(hero, m) <= portee)
    .sort((a, b) => distance(hero, a) - distance(hero, b) || String(a.id).localeCompare(String(b.id)));
  if (candidats.length === 0) return follet;

  const courant = candidats.findIndex((m) => m.id === follet.cibleMonstreId);
  // `courant === -1` (aucune cible, ou cible morte/hors portée entre deux
  // appuis) -> index 0 : le plus proche.
  const suivant = candidats[(courant + 1) % candidats.length];
  if (suivant.id === follet.cibleMonstreId) return follet;
  // Pas de saut de position : `avancerPosition` amortit l'approche de la
  // nouvelle cible exactement comme celle d'une cible engagée toute seule.
  return { ...follet, etat: 'engager', cibleMonstreId: suivant.id };
}

// --- Une orbite de follet, autour d'un autre centre (spec 14, §4.3) --------
// Le follet de Zéros tourne autour de Zéros comme le nôtre autour du héros :
// même loi d'amortissement (`D-53`, indépendante du nombre de frames), avec
// son rayon et sa vitesse lus dans SES données (`enemies.json > orbite`), pas
// dans les constantes de notre follet. `corps` porte `x`, `y` et `angleOrbite`
// (absent au premier appel : l'angle part de zéro). Pur.
export function avancerOrbiteAutour(corps, centre, { rayonPx, vitesseRadS }, deltaS) {
  const angleOrbite = (corps.angleOrbite || 0) + deltaS * vitesseRadS;
  const k = amortissement(deltaS);
  const cibleX = centre.x + Math.cos(angleOrbite) * rayonPx;
  const cibleY = centre.y + Math.sin(angleOrbite) * rayonPx;
  return {
    ...corps,
    x: corps.x + (cibleX - corps.x) * k,
    y: corps.y + (cibleY - corps.y) * k,
    angleOrbite,
  };
}

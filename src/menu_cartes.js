// Menus en grille de cartes (specs/08_menus-cartes.md) — la part PURE : ce
// qui se décide sans DOM. Le catalogue `data/menus.json` décrit des écrans et
// leurs cartes ; ce module dit quelle grille un écran occupe et contrôle, au
// démarrage, tout ce que `schemas.js` ne peut pas voir depuis une seule
// entrée de catalogue (les textes des deux langues, le câblage des actions).
//
// Test du catalogue (règle d'architecture directrice) : ajouter la page du
// follet, le jardinage ou un écran d'indices = ajouter une entrée à
// `menus.json`. Rien ici ne nomme un écran, une carte ni une action.

// Les trois types de cartes (§4.1). Une liste fermée, et c'est voulu : un
// type de plus change ce que fait un appui, donc le composant — ce n'est pas
// une donnée.
export const TYPES_CARTE = ['dossier', 'bascule', 'action'];

// §4.2 : jamais plus de six cartes par écran. Au-delà « le jeu refuse de
// démarrer : on crée un dossier ». Ce n'est pas un seuil provisoire : c'est
// ce qui garantit qu'aucun écran de cartes ne défile jamais.
export const CASES_MAX = 6;
const CASES_GRILLE_2X2 = 4;

// Le nombre de cases d'un écran = sa plus haute case déclarée + 1. On compte
// les CASES, pas les cartes : une case réservée (« libre », §3) ou une carte
// absente garde sa place, c'est ce qui rend les positions stables.
export function nombreCases(ecran) {
  const cases = (ecran.cartes || []).map((c) => c.case).filter((n) => Number.isInteger(n));
  return cases.length === 0 ? 0 : Math.max(...cases) + 1;
}

// 1 à 4 cases → 2 × 2. 5 ou 6 → 3 × 2. Au-delà : `null`, et c'est au
// démarrage que ça se refuse (`schemas.js#validerMenu`), jamais ici en
// silence. Une grille 2 × 2 même pour une seule carte : la carte garde la
// taille que le pouce connaît, elle ne s'étale pas sur tout l'écran.
export function choisirGrille(nbCases) {
  if (!Number.isInteger(nbCases) || nbCases < 1 || nbCases > CASES_MAX) return null;
  return nbCases <= CASES_GRILLE_2X2 ? { colonnes: 2, rangees: 2 } : { colonnes: 3, rangees: 2 };
}

// Toutes les clés de texte qu'un écran peut afficher, avec leur chemin.
function clesDeTexte(ecran) {
  const cles = [{ cle: ecran.cle_titre, chemin: `menus.json > ${ecran.id} > cle_titre` }];
  for (const carte of ecran.cartes || []) {
    for (const champ of ['cle_titre', 'cle_phrase', 'cle_confirmation', 'cle_confirmer']) {
      if (carte[champ] !== undefined) cles.push({ cle: carte[champ], chemin: `menus.json > ${ecran.id} > ${carte.id} > ${champ}` });
    }
  }
  return cles;
}

// « Toute clé de texte existe en FR **et** EN » (§5). `verifierJeuxDeCles`
// garantit déjà que les deux langues ont le même jeu de clés ; ce contrôle-ci
// dit autre chose : que la clé citée par le CATALOGUE existe. Sans lui, une
// faute de frappe dans `menus.json` afficherait la clé brute sur une carte —
// et personne ne le verrait avant d'ouvrir ce sous-écran-là.
// `clesSysteme` : les clés que le composant affiche de lui-même (« Retour »,
// « Non, revenir »…), contrôlées par le même chemin.
export function erreursTextesMenus(menus, dictionnaires, clesSysteme = []) {
  const erreurs = [];
  const cles = [
    ...(menus || []).flatMap(clesDeTexte),
    ...clesSysteme.map((cle) => ({ cle, chemin: 'menus (texte du composant)' })),
  ];
  for (const { cle, chemin } of cles) {
    for (const [langue, dictionnaire] of Object.entries(dictionnaires || {})) {
      if (typeof cle !== 'string' || dictionnaire[cle] === undefined) {
        erreurs.push(`${chemin} > clé "${cle}" absente de ${langue}.json`);
      }
    }
  }
  return erreurs;
}

// Les valeurs nommées citées par une condition (`{ valeur, min, max }`,
// format de `flags.js`), à plat, quelle que soit l'imbrication.
function valeursCitees(condition) {
  if (!condition || typeof condition !== 'object') return [];
  if (condition.not !== undefined) return valeursCitees(condition.not);
  if (Array.isArray(condition.all)) return condition.all.flatMap(valeursCitees);
  if (Array.isArray(condition.any)) return condition.any.flatMap(valeursCitees);
  return condition.valeur !== undefined ? [condition.valeur] : [];
}

// Le câblage (§5) : « toute `cible` existe · toute `action` du catalogue a sa
// fonction enregistrée, **et inversement** ». `enregistres` liste des NOMS —
// ceux des fonctions que le code a réellement branchées : { actions, etats,
// ecrans, valeurs }. Ce module ne voit jamais les fonctions elles-mêmes.
//
// Le sens « inversement » n'est pas du zèle : une action enregistrée que plus
// aucune carte ne cite est une fonction que le joueur ne peut plus atteindre
// (un « Exporter » orphelin, c'est une sauvegarde qu'on ne peut plus sortir).
//
// Les valeurs nommées y passent aussi, et pour une raison précise : une
// valeur inconnue fait LEVER `flags.js` en mode dev, et une exception dans la
// boucle de jeu la fige pour de bon (`render.js#creerBoucle` ne se replanifie
// pas). Autant tomber au démarrage, avec le chemin de la carte.
export function erreursCablageMenus(menus, enregistres) {
  const erreurs = [];
  const { actions = [], etats = [], ecrans = [], valeurs = [] } = enregistres || {};
  const idsEcransCatalogue = new Set((menus || []).map((e) => e.id));
  const cites = { actions: new Set(), etats: new Set(), ecrans: new Set() };

  for (const ecran of menus || []) {
    for (const carte of ecran.cartes || []) {
      const chemin = `menus.json > ${ecran.id} > ${carte.id}`;
      if (carte.cible !== undefined && !idsEcransCatalogue.has(carte.cible)) {
        cites.ecrans.add(carte.cible);
        if (!ecrans.includes(carte.cible)) {
          erreurs.push(`${chemin} > cible "${carte.cible}" : ni un écran de menus.json, ni un écran existant enregistré (${ecrans.join(', ') || 'aucun'})`);
        }
      }
      if (carte.action !== undefined) {
        cites.actions.add(carte.action);
        if (!actions.includes(carte.action)) erreurs.push(`${chemin} > action "${carte.action}" sans fonction enregistrée`);
      }
      if (carte.etat !== undefined) {
        cites.etats.add(carte.etat);
        if (!etats.includes(carte.etat)) erreurs.push(`${chemin} > etat "${carte.etat}" sans lecteur d'état enregistré`);
      }
      for (const valeur of valeursCitees(carte.condition)) {
        if (!valeurs.includes(valeur)) erreurs.push(`${chemin} > condition sur la valeur "${valeur}", que personne ne fournit (${valeurs.join(', ') || 'aucune'})`);
      }
    }
  }

  for (const [sorte, noms] of [['actions', actions], ['etats', etats], ['ecrans', ecrans]]) {
    for (const nom of noms) {
      if (!cites[sorte].has(nom)) erreurs.push(`menus.json > "${nom}" est enregistré (${sorte}) mais aucune carte ne le cite : le joueur ne peut plus l'atteindre`);
    }
  }
  return erreurs;
}

// ---------------------------------------------------------------------------
// Palier A3 — ce que le composant `ui/grille_cartes.js` décide sans DOM.
// ---------------------------------------------------------------------------

// Les cases d'un écran, telles qu'elles s'affichent MAINTENANT : un tableau de
// la taille de la grille, une carte ou `null` par case.
//
// Positions stables (§4.2) : une carte absente laisse sa case VIDE, les autres
// ne glissent pas — « la mémoire du pouce prime ». C'est pour ça que ce
// tableau est indexé par `case`, jamais compacté.
//
// Case contextuelle : plusieurs cartes peuvent viser la même case ; ce sont
// des candidates, dans l'ordre du fichier, et la PREMIÈRE dont la condition
// est vraie l'occupe. Aucune → `null`, rien n'est dessiné. Une carte ordinaire
// avec une condition n'est que le cas à une seule candidate : un seul chemin.
//
// `evaluer` est injecté (c'est `flags.evaluate`) : ce module ne connaît ni les
// drapeaux, ni le niveau, ni le lieu.
export function resoudreCases(ecran, evaluer) {
  const grille = choisirGrille(nombreCases(ecran));
  if (!grille) return [];
  const cases = new Array(grille.colonnes * grille.rangees).fill(null);
  for (const carte of ecran.cartes) {
    if (cases[carte.case] !== null) continue;
    const presente = carte.condition === undefined || carte.condition === null || evaluer(carte.condition);
    if (presente) cases[carte.case] = carte;
  }
  return cases;
}

// §4.3 : « focus sur la première carte présente ». -1 si l'écran est vide.
export function premiereCasePresente(cases) {
  return cases.findIndex((c) => c !== null);
}

const PAS = {
  haut: { dc: 0, dr: -1 }, bas: { dc: 0, dr: 1 }, gauche: { dc: -1, dr: 0 }, droite: { dc: 1, dr: 0 },
};

// Navigation en deux dimensions (§4.3). Rend l'index de la case où va le
// focus, ou `index` lui-même si rien ne convient — jamais `null`, l'appelant
// n'a aucun cas particulier à traiter.
//
//   1. **En ligne droite**, en SAUTANT les cases vides (« une case vide se
//      saute »), jusqu'au bord. Pas de bouclage d'un bord à l'autre
//      (*provisoire*, à valider par Xav).
//   2. **Sinon, la carte présente la plus proche DANS CETTE DIRECTION**, même
//      en diagonale. Sans cette seconde passe, une carte peut devenir
//      inatteignable au stick : avec seulement les cases 0 et 3 occupées, ni
//      « droite » ni « bas » ne mènent de l'une à l'autre en ligne droite. Ce
//      n'est pas un cas d'école — c'est l'écran racine dès qu'une carte tombe,
//      et l'écran Paramètres sur un navigateur sans plein écran.
//
// Garantie vérifiée exhaustivement par le test (toutes les combinaisons de
// cases, 2 × 2 et 3 × 2) : depuis n'importe quelle carte présente, toutes les
// autres sont atteignables.
export function voisin(index, direction, colonnes, total, estPresente = () => true) {
  const pas = PAS[direction];
  if (!pas || index < 0 || index >= total) return index;
  const rangees = Math.ceil(total / colonnes);
  const col0 = index % colonnes;
  const rang0 = Math.floor(index / colonnes);

  let col = col0 + pas.dc;
  let rang = rang0 + pas.dr;
  while (col >= 0 && col < colonnes && rang >= 0 && rang < rangees) {
    const i = rang * colonnes + col;
    if (i < total && estPresente(i)) return i;
    col += pas.dc;
    rang += pas.dr;
  }

  let meilleur = index;
  let meilleureDistance = Infinity;
  for (let i = 0; i < total; i++) {
    if (i === index || !estPresente(i)) continue;
    const dCol = (i % colonnes) - col0;
    const dRang = Math.floor(i / colonnes) - rang0;
    // Strictement du bon côté, mesuré sur l'axe du déplacement.
    const avance = dCol * pas.dc + dRang * pas.dr;
    if (avance <= 0) continue;
    // L'écart de côté pèse plus lourd que l'avance : on préfère la carte la
    // mieux alignée avec celle qu'on quitte.
    const ecart = Math.abs(dCol * pas.dr) + Math.abs(dRang * pas.dc);
    const distance = ecart * total + avance;
    if (distance < meilleureDistance) {
      meilleureDistance = distance;
      meilleur = i;
    }
  }
  return meilleur;
}

// Front montant sur DEUX axes (même principe que
// `ui/menu.js#creerNavigationMenu`, qui n'en gère qu'un) : `MOVE` est
// analogique, la navigation avance par cran. Un stick maintenu ne défile pas ;
// il faut revenir au neutre sur l'axe pour repartir. Rend 'haut' | 'bas' |
// 'gauche' | 'droite' | null. `seuil` est donné par l'appelant : il n'existe
// qu'en un endroit (`ui/menu.js#SEUIL_POUSSEE_MENU`).
export function creerLecteurDirection(seuil) {
  const precedent = { x: 0, y: 0 };
  const signe = (v) => (v > seuil ? 1 : v < -seuil ? -1 : 0);
  return {
    lire(move) {
      const x = signe(move.x);
      const y = signe(move.y);
      let direction = null;
      // L'axe vertical d'abord : un stick poussé en diagonale ne doit donner
      // qu'UN cran, et c'est le vertical qui existait déjà dans les listes.
      if (y !== 0 && precedent.y === 0) direction = y > 0 ? 'bas' : 'haut';
      else if (x !== 0 && precedent.x === 0) direction = x > 0 ? 'droite' : 'gauche';
      precedent.x = x;
      precedent.y = y;
      return direction;
    },
    reinitialiser() {
      precedent.x = 0;
      precedent.y = 0;
    },
  };
}

// La pile de navigation LOCALE du palier A (§6 : « une pile locale minimale ;
// les sept contrats existants ne bougent pas encore »). Elle ne connaît que
// des écrans de cartes ; le palier B la remplacera par LA pile du menu entier.
//
// Ce qu'elle garantit : « Retour dépile UN écran, et rend le focus à la carte
// qui l'avait ouvert » (§4.3). Chaque niveau mémorise donc la case focalisée
// au moment où on l'a quitté vers le bas — c'est `focus`, tenu à jour par le
// composant à chaque déplacement.
export function creerPileMenus() {
  let niveaux = [];
  return {
    empiler(ecran, focus) {
      niveaux.push({ ecran, focus });
    },
    // Rend le niveau retiré, ou `null` si la pile était déjà vide.
    depiler() {
      return niveaux.pop() || null;
    },
    sommet() {
      return niveaux.length > 0 ? niveaux[niveaux.length - 1] : null;
    },
    definirFocus(focus) {
      if (niveaux.length > 0) niveaux[niveaux.length - 1].focus = focus;
    },
    profondeur: () => niveaux.length,
    vider() {
      niveaux = [];
    },
  };
}

// Textes que le composant affiche DE LUI-MÊME (aucune carte du catalogue ne
// les cite) : listés ici pour passer par le même contrôle de démarrage que
// les textes du catalogue (`erreursTextesMenus`, troisième argument).
export const CLES_TEXTE_COMPOSANT = [
  'menu.fermer', 'menu.retour',
  'menu.confirmation_non', 'menu.confirmation_non_phrase', 'menu.confirmation_oui_phrase',
];

// L'écran de confirmation d'une carte `danger` (§3, §4.1) : deux cartes,
// « Non, revenir » en case 0 — donc focus par défaut, puisque le focus va à la
// première carte présente — et « Oui, … » en case 1, en magenta.
//
// Construit ici et pas décrit dans `menus.json` : « Non d'abord » est une
// règle de SÉCURITÉ. Elle ne doit pas dépendre de l'attention de celui qui
// ajoutera la prochaine action destructive au catalogue.
//
// Les deux cartes sont de type `action` comme les autres ; `interne` dit au
// composant laquelle dépile et laquelle exécute. `iconeRetour` vient de
// l'écran racine (aucun id de catalogue n'est écrit ici).
export function construireConfirmation(carte, iconeRetour) {
  return {
    id: `${carte.id}#confirmation`,
    cle_titre: carte.cle_confirmation,
    cartes: [
      {
        id: `${carte.id}#non`, case: 0, type: 'action', interne: 'retour',
        cle_titre: 'menu.confirmation_non', cle_phrase: 'menu.confirmation_non_phrase', icone: iconeRetour,
      },
      {
        id: `${carte.id}#oui`, case: 1, type: 'action', interne: 'confirmer', danger: true,
        cle_titre: carte.cle_confirmer, cle_phrase: 'menu.confirmation_oui_phrase', icone: carte.icone,
        action: carte.action,
      },
    ],
  };
}

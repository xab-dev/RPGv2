// Menus en grille de cartes (specs/08_menus-cartes.md) — la part PURE : ce
// qui se décide sans DOM. Le catalogue `data/menus.json` décrit des écrans et
// leurs cartes ; ce module dit quelle grille un écran occupe et contrôle, au
// démarrage, tout ce que `schemas.js` ne peut pas voir depuis une seule
// entrée de catalogue (les textes des deux langues, le câblage des actions).
//
// Test du catalogue (règle d'architecture directrice) : ajouter la page du
// follet, le jardinage ou un écran d'indices = ajouter une entrée à
// `menus.json`. Rien ici ne nomme un écran, une carte ni une action.
import { calculerRectanglePresentation } from './render.js';

// --- La géométrie de la boîte de menu, en pixels CSS (`D-48`) -----------------

// LE calcul de l'unité `--u` et de l'origine de la boîte — un seul endroit,
// appelé par TOUS les chemins (ouverture d'un niveau, `resize`, changement
// d'orientation, `fullscreenchange`), via `main.js#rectangleJeu`.
//
// Pourquoi il existe : `calculerRectanglePresentation` rend des pixels
// PHYSIQUES (c'est son contrat : elle place l'image dans le backing store du
// canvas). Une variable CSS, elle, se lit en pixels CSS. À DPR 1 les deux
// nombres sont le même, et c'est exactement ce qui a caché le défaut : sur le
// téléphone de Xav (DPR 3) le menu s'ouvrait à `--u` = 4 px là où la fenêtre
// n'en fait que 360 de haut — la mise en page 1080p dans un écran de 360.
// Même famille que « dialogues invisibles » (15/09) : une grandeur physique
// lue là où on attend une grandeur logique.
//
// La division est faite ICI et pas dans `render.js` : le rendu, lui, a raison
// de travailler en pixels physiques (c'est ce qui rend l'image nette). Ce
// n'est pas une deuxième formule — c'est la même, convertie une fois, au seul
// endroit qui a besoin de l'autre unité. Pure : aucun DOM, aucun `window`,
// l'appelant fournit les trois nombres.
//
// Ce que la boîte vaut alors : exactement le rectangle du jeu à l'écran, en px
// CSS. `unite` peut être décimale (4 / 3 sur un téléphone DPR 3) — c'est
// voulu, la boîte doit recouvrir l'image du jeu, pas un multiple entier d'elle.
export function rectangleMenuCss({ largeurCss, hauteurCss, dpr = 1 }) {
  const facteur = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const rect = calculerRectanglePresentation(
    Math.round(largeurCss * facteur),
    Math.round(hauteurCss * facteur),
  );
  return { x: rect.x / facteur, y: rect.y / facteur, unite: rect.echelle / facteur };
}

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

// --- Palier C : les écrans « maître-détail » (`ui/ecran_fiches.js`) ------------

// Nombre de colonnes de la grille de tuiles. *Provisoire.* Quatre tuiles de
// 60 u et trois rangées tiennent dans le corps d'un écran (222 u) à côté d'une
// fiche de 180 u : douze tuiles sans défilement. C'est de la GÉOMÉTRIE de
// navigation (`voisin()` en a besoin), pas un style : le composant la pose sur
// la grille, la feuille de style la relit.
export const COLONNES_TUILES = 4;

// Range des entrées dans une grille de `colonnes` colonnes. Rend :
//   cases     pour chaque case de la grille, l'index de l'entrée — ou `null`
//   sections  [{ groupe, debut }] : où commence chaque groupe (`debut` = index de case)
// Un GROUPE (`entree.groupe`, un intertitre déjà traduit) commence toujours sur
// une rangée neuve : la fin de la rangée précédente est comblée de cases
// `null`. Ce sont les « cases vides » de la grille de cartes — `voisin()` les
// saute déjà, il n'y a donc RIEN à apprendre à la navigation pour qu'un
// intertitre coupe la grille en deux (Coffre : la poche, puis le coffre).
export function disposerTuiles(entrees, colonnes) {
  const cases = [];
  const sections = [];
  let groupeCourant = null;
  entrees.forEach((entree, i) => {
    const groupe = entree.groupe || null;
    if (i === 0 || groupe !== groupeCourant) {
      while (cases.length % colonnes !== 0) cases.push(null);
      sections.push({ groupe, debut: cases.length });
      groupeCourant = groupe;
    }
    cases.push(i);
  });
  return { cases, sections };
}

// Où va le focus quand la grille vient d'être relue ? Sur SA case si elle
// porte encore une tuile ; sinon sur la tuile présente la plus proche AVANT
// elle (la dernière pile du coffre vient de partir : on recule d'un cran, on
// ne saute pas en tête de grille) ; sinon sur la première tuile. -1 : aucune.
export function replierFocus(cases, focus) {
  if (Number.isInteger(focus) && focus >= 0) {
    for (let i = Math.min(focus, cases.length - 1); i >= 0; i--) if (cases[i] !== null) return i;
  }
  return premiereCasePresente(cases);
}

// LA pile du menu entier (specs/08_menus-cartes.md, palier B). Elle remplace
// les sous-contrats que `menu.estOuvert()` OR-combinait (sept à l'origine,
// `docs/CARTE_cycle-de-vie-ui_2026-09-17.md` §1.2) : ouvrir = empiler, retour =
// dépiler, et « le menu est ouvert » = « la pile n'est pas vide ET son sommet
// est visible ». Craft et Coffre, ouverts par INTERACT, y passent comme les
// autres.
//
// Pure : elle ne connaît aucun élément DOM, seulement des VUES. Une vue est
// ce qui sait afficher un niveau — la grille de cartes (une seule vue pour
// tous les écrans de cartes), ou un écran de liste :
//   vue.montrer(niveau)             affiche ce niveau (contenu relu à neuf)
//   vue.masquer()                   disparaît ; idempotent
//   vue.estVisible()                l'état RÉEL de l'affichage, jamais un booléen tenu ici
//   vue.traiterInput(etat, niveau)  les verbes de la frame
// Un niveau est un objet libre qui porte au moins `vue` ; ce que la vue y
// range d'autre (l'écran de cartes et son focus, le fournisseur d'entrées
// d'une liste) ne regarde qu'elle. C'est là que vit « Retour rend le focus à
// la carte qui avait ouvert l'écran » (§4.3) : le focus est une propriété du
// NIVEAU, il survit donc à tout ce qui s'empile au-dessus.
//
// Deux garanties, par construction et non transition par transition :
//   1. UNE SEULE vue visible à la fois, et c'est celle du sommet —
//      `synchroniser()` masque toutes les autres AVANT de montrer celle-là, à
//      chaque changement. Il n'existe pas d'autre endroit qui affiche ou masque.
//   2. UN SEUL chemin de fermeture : `fermerTout()`. `[X]` à la racine, B à la
//      racine, une carte `action`, le verbe MENU (`Q-36`) et la fermeture
//      programmatique y passent tous — plus de parité clic/verbe à surveiller
//      (`SD_construction-parite-clic-verbe_2026-09-19`).
//
// `onFermer` : le menu entier vient de se fermer (jamais rappelé si la pile
// était déjà vide, ni si l'appelant dit `prevenir: false` — c'est lui qui ferme).
export function creerNavigationEcrans({ onFermer = () => {} } = {}) {
  let niveaux = [];
  // Le sommet peut être masqué SANS être dépilé : un écran qui n'appartient
  // pas au menu prend la main un instant (le placement d'une station, dont
  // les verbes vont à `main.js`), et la pile doit se retrouver telle quelle
  // ensuite. Pendant ce temps le menu n'est PAS ouvert — c'est exactement la
  // clause « ET son sommet est visible » de la spec.
  let sommetMasque = false;
  // Toute vue déjà empilée une fois : ce sont elles qu'on masque. Jamais
  // purgé — il en existe une poignée, créées une fois au démarrage.
  const vues = new Set();

  function sommet() {
    return niveaux.length > 0 ? niveaux[niveaux.length - 1] : null;
  }

  function synchroniser() {
    const s = sommet();
    const visible = s && !sommetMasque ? s.vue : null;
    // Masquer D'ABORD : aucun instant où deux écrans seraient affichés.
    for (const vue of vues) if (vue !== visible) vue.masquer();
    if (visible) visible.montrer(s);
  }

  function empiler(niveau) {
    vues.add(niveau.vue);
    niveaux.push(niveau);
    sommetMasque = false;
    synchroniser();
  }

  function fermerTout({ prevenir = true } = {}) {
    const etaitOuverte = niveaux.length > 0;
    niveaux = [];
    sommetMasque = false;
    synchroniser();
    if (etaitOuverte && prevenir) onFermer();
  }

  function estOuvert() {
    const s = sommet();
    return s !== null && s.vue.estVisible();
  }

  return {
    // Ouvre le menu SUR ce niveau : ce qui restait dans la pile est oublié
    // (le menu Pause s'ouvre toujours à sa racine ; Craft et Coffre, ouverts
    // depuis le monde, ne sont jamais posés sur un reste).
    ouvrir(niveau) {
      niveaux = [];
      empiler(niveau);
    },
    empiler,
    // Retour (B, `[←]`, « Fermer » d'une liste, « Non, revenir ») : dépile UN
    // niveau. À la racine il n'y a plus rien à dépiler : on ferme — `[X]` et B
    // y font donc la même chose par la même fonction.
    retour() {
      if (niveaux.length <= 1) {
        fermerTout();
        return;
      }
      niveaux.pop();
      sommetMasque = false;
      synchroniser();
    },
    fermerTout,
    masquerSommet() {
      if (niveaux.length === 0) return;
      sommetMasque = true;
      synchroniser();
    },
    // Sans effet si tout a été fermé entre-temps : on ne ressuscite rien.
    remontrerSommet() {
      if (niveaux.length === 0) return;
      sommetMasque = false;
      synchroniser();
    },
    sommet,
    profondeur: () => niveaux.length,
    // Intention ET affichage réel, jamais l'un sans l'autre (le contrat unique
    // de `SD_construction-ecrans-orphelins_2026-09-17`, désormais écrit UNE
    // fois). On interroge la vue plutôt que `sommetMasque` : si quelqu'un
    // masque un élément dans le dos de la pile, le jeu ne reste pas gelé
    // derrière un menu invisible.
    estOuvert,
    // Les verbes vont au sommet, et à lui seul : un verbe consommé par un
    // écran n'est jamais revu par celui d'en dessous dans la même frame.
    traiterInput(etat) {
      if (!estOuvert()) return;
      const s = sommet();
      s.vue.traiterInput(etat, s);
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

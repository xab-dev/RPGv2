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

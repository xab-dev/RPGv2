// Le menu du jeu. Depuis specs/08_menus-cartes.md (palier A4), le menu Pause
// est un empilement d'écrans de CARTES (`ui/grille_cartes.js`, décrit par
// `data/menus.json`) ; ce module garde les écrans de LISTE — Poche, Stats
// (Palier D), Construction, et les écrans contextuels Craft/Coffre (Palier
// A/E, ouverts directement par INTERACT sur une station, hors du menu Pause)
// — et enregistre les actions que les cartes déclenchent. Rien ici ne touche
// le DOM au chargement du module : tout se passe dans initialiserMenu(),
// appelée par main.js une fois le document prêt.
//
// creerNavigationMenu() et creerControleurMenu() sont pures (aucune
// référence DOM, actions passées en callbacks) : c'est le patron de focus
// que reprennent tous les écrans d'UI — écrit une fois ici, testé depuis
// Node sans faux DOM.

import { creerMenuCartes } from './grille_cartes.js';

// Provisoire, comme les autres mappings de gamepad.js : au-delà de ce
// seuil, le stick/la flèche est considéré "poussé" dans une direction ;
// en-deçà, on revient au neutre. Nécessaire car MOVE reste analogique
// (§2.4) alors que la navigation de menu doit avancer par cran, jamais en
// défilement continu.
// Exporté depuis specs/08_menus-cartes.md : la grille de cartes navigue sur
// deux axes avec le MÊME seuil, reçu en paramètre — il reste écrit ici seul.
export const SEUIL_POUSSEE_MENU = 0.5;

// Logique de focus pure : un index borné [0, nbElements-1], qui n'avance
// que sur front montant de MOVE.y (jamais en continu tant que le stick
// reste poussé) — même principe que `pressed` vs `held` dans input.js,
// réimplémenté ici car MOVE n'est pas un verbe bouton.
export function creerNavigationMenu(nbElements) {
  let index = 0;
  let pousseePrecedente = 0;

  function borner(i) {
    return Math.max(0, Math.min(nbElements - 1, i));
  }

  function signe(y) {
    if (y > SEUIL_POUSSEE_MENU) return 1;
    if (y < -SEUIL_POUSSEE_MENU) return -1;
    return 0;
  }

  return {
    // À appeler une fois par frame avec `etat.move.y`. Retourne l'index à jour.
    traiterMove(y) {
      const poussee = signe(y);
      // Pas de boucle circulaire (provisoire, à valider par Xav) : sur le
      // premier/dernier élément, un cran supplémentaire dans le même sens
      // ne fait rien.
      if (poussee !== 0 && pousseePrecedente === 0) {
        index = borner(index + poussee);
      }
      pousseePrecedente = poussee;
      return index;
    },
    index() {
      return index;
    },
    // Utilisé par le survol/clic souris : la souris et la manette ne
    // doivent jamais afficher deux éléments sélectionnés à la fois, donc
    // elles partagent le même index.
    definirIndex(i) {
      index = borner(i);
    },
    reinitialiser() {
      index = 0;
      pousseePrecedente = 0;
    },
  };
}

// Contrôleur pur d'un écran d'UI à liste focalisable : ouverture/fermeture,
// index de focus, dispatch de l'action focalisée sur ATTACK. Ne connaît
// que des callbacks (`actions`), jamais le DOM — c'est initialiserMenu()
// qui lui fournit des actions qui, elles, touchent au DOM.
//
// `options.verbeAnnuler` (ex. 'skill_3', convention manette "B = retour")
// ferme immédiatement le menu sans passer par le focus — optionnel, pour
// que les futurs écrans d'UI décident eux-mêmes s'ils veulent ce
// raccourci. Fermer par le focus reste toujours possible via une action
// dédiée dans `actions` (ex. le bouton "Fermer").
//
// `options.element` (SD_construction-ecrans-orphelins_2026-09-17 §2, carte
// §1.2) : contrat UNIQUE de « ouvert » pour tout contrôleur de ce module —
// booléen interne ET DOM réellement visible, jamais l'un sans l'autre.
// Avant cette fiche, `creerEcranListeGenerique` (Poche/Craft/Coffre/Stats/
// Construction) recalculait ce ET à l'extérieur (`controleur.estOuvert() &&
// !el.hidden`), tandis que le contrôleur de premier niveau du menu Pause et
// celui de la confirmation de reset n'avaient qu'un booléen pur — deux
// contrats sous le même `menu.estOuvert()`. Cause racine du menu Pause resté
// « ouvert » de façon invisible en Construction : un appelant peut cacher le
// DOM sans fermer le contrôleur (patron déjà utilisé par Poche/Stats/
// Construction pour masquer `conteneur` sans perdre le focus à restaurer),
// et un autre peut fermer le contrôleur sans que le DOM associé n'ait
// jamais bougé — les deux sont valides séparément, mais rendent le booléen
// brut inutilisable comme unique source de vérité. `element` reste
// optionnel : un contrôleur sans DOM propre (aucun appelant actuel, gardé
// pour ne pas complexifier un futur test purement logique) garde l'ancien
// comportement.
//
// `options.onAnnuler` (SD_construction-parite-clic-verbe_2026-09-19 §3.2) :
// rappelé UNIQUEMENT quand `verbeAnnuler` (B/skill_3) ferme ce contrôleur —
// jamais quand une action de `actions[]` le ferme elle-même (ex.
// `fermerSansCallback`, appelée par `demarrerConstruction` via une action
// choisie par ATTACK). Avant cette fiche, l'appelant (`creerEcranListeGenerique
// #traiterInput`) DÉDUISAIT « fermé par B » du seul fait que `estOuvert()`
// était devenu faux après `traiterInput(etat)` — or une action peut fermer ce
// contrôleur pour une tout autre raison dans le même appel. Le clic, qui
// appelle `toutes[i].action()` directement sans jamais passer par
// `traiterInput`, ne pouvait pas se tromper — d'où la divergence clic/verbe
// (souris/tactile sains, manette ET clavier cassés identiquement). La
// fermeture n'a plus qu'une origine PAR ÉVÉNEMENT explicite : `onAnnuler`
// pour B/skill_3, le code de l'action elle-même pour tout le reste — jamais
// plus une déduction après coup.
export function creerControleurMenu(actions, options = {}) {
  const navigation = creerNavigationMenu(actions.length);
  const verbeAnnuler = options.verbeAnnuler;
  const element = options.element || null;
  const onAnnuler = options.onAnnuler;
  let ouvert = false;

  function fermer() {
    ouvert = false;
  }

  return {
    ouvrir() {
      ouvert = true;
      navigation.reinitialiser();
    },
    fermer,
    estOuvert() {
      return ouvert && (element ? !element.hidden : true);
    },
    index() {
      return navigation.index();
    },
    definirIndex(i) {
      navigation.definirIndex(i);
    },
    // Consomme MOVE (navigation) + ATTACK (validation) pour la frame
    // courante ; n'a aucun effet si le menu est fermé.
    traiterInput(etat) {
      if (!ouvert) return;
      if (verbeAnnuler && etat[verbeAnnuler] && etat[verbeAnnuler].pressed) {
        fermer();
        if (onAnnuler) onAnnuler();
        return;
      }
      navigation.traiterMove(etat.move.y);
      if (etat.attack.pressed) actions[navigation.index()]();
    },
  };
}

// Marque l'élément focalisé (bordure + curseur `›`), qu'il soit sélectionné
// au clavier/manette/tactile ou survolé à la souris (P4② : jamais la couleur
// seule) — factorisé une fois, réutilisé par tous les écrans à liste.
function appliquerFocusVisuel(elements, indexFocalise) {
  elements.forEach((el, i) => {
    const curseur = el.querySelector('.menu-curseur');
    const estFocalise = i === indexFocalise;
    curseur.textContent = estFocalise ? '›' : '';
    el.style.border = estFocalise ? '2px solid #fff' : '2px solid transparent';
    // `D-42` : depuis que le corps de l'écran défile, une entrée focalisée
    // peut être HORS de la zone visible — à la manette et au clavier, le
    // joueur perdrait alors son curseur en descendant la liste. Le
    // défilement suit donc le focus, et lui seul (`nearest` : on ne bouge
    // que si c'est nécessaire, jamais de recentrage à chaque cran).
    // `typeof` plutôt qu'un `try` : le faux DOM des tests headless n'a pas
    // de moteur de mise en page, son absence est un cas normal.
    if (estFocalise && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
}

// Cause racine du reset invisible (SD_menu-reset-invisible_2026-09-15.md) :
// un sous-écran plein écran construit dynamiquement n'avait ni règle CSS
// dédiée ni style inline — `hidden=false` retirait bien l'attribut, mais sans
// position ni display l'élément restait en flux normal statique, hors du
// viewport visible (`body{overflow:hidden}`) : invisible bien que
// fonctionnellement ouvert. La leçon tient toujours : CHAQUE écran plein
// écran reçoit le même habillage, par ce seul point de passage.
//
// Ce qui change avec `D-42` : l'habillage n'est plus une pile de styles
// inline, c'est UNE classe définie dans `index.html`. Le style en dur ne
// pouvait pas exprimer ce que le ticket exige (un en-tête figé, un corps
// défilant, une hauteur bornée à `100dvh` avec repli `100vh`) — une règle de
// repli se déclare, elle ne se calcule pas en JS. Et le contrat reste le
// même : `ui/menu.js` ne connaît QUE le nom des classes, jamais une valeur
// de style ; `index.html` ne connaît que des classes, jamais un élément
// nommé créé ici (c'est ce qui interdisait déjà d'y styliser `#menu-poche`).
const CLASSE_ECRAN = 'ecran-ui';

function appliquerClasseEcran(el) {
  el.className = CLASSE_ECRAN;
}

// Point d'affichage/masquage unique pour tous les écrans plein écran :
// `hidden` seul ne suffit pas à garantir la visibilité effective (cf.
// ci-dessus), et un `display` inline qui resterait figé sur "flex"
// annulerait l'effet de `hidden` (une valeur inline bat la règle UA
// `[hidden]{display:none}`). Les deux doivent donc toujours changer
// ensemble, ici et nulle part ailleurs.
// Exportée pour `ui/grille_cartes.js`, qui la reçoit en paramètre : « ici et
// nulle part ailleurs » reste vrai, il n'en existe toujours qu'une.
export function afficherEcran(el, visible) {
  el.hidden = !visible;
  el.style.display = visible ? 'flex' : 'none';
}

// Écran générique à liste focalisable + titre + "Fermer" toujours en
// dernier (Palier A/D/E, specs/04_maison-interieur.md §3.1/§3.4/§3.5) —
// réutilise creerControleurMenu (§3.1 : "jamais un 2e mécanisme de focus"),
// jamais dupliqué pour Craft/Coffre/Stats/Poche : chacun ne fournit que son
// propre contenu (`obtenirEntrees(): [{ texte, grisee?, action }]`),
// reconstruit à l'ouverture ET à la demande (`rafraichir()`, appelé par
// main.js après une action qui change l'état affiché — ex. un craft qui
// grise la recette suivante, cf. edge case §4 de la fiche).
// `onFermer` (optionnel) : rappelé à CHAQUE fermeture, quel que soit le
// chemin (clic sur "Fermer", B/skill_3, ou fermeture programmatique) — Poche
// et Stats s'en servent pour réafficher le menu principal qu'ils masquent
// sans jamais le fermer lui-même (§3.4/§3.6) ; Craft/Coffre (ouverts
// directement par INTERACT, hors du menu Pause) n'en ont pas besoin.
function creerEcranListeGenerique(document, i18n, { onFermer } = {}) {
  const el = document.createElement('div');
  appliquerClasseEcran(el);
  afficherEcran(el, false);
  // `D-42` : le titre, l'aide et « Fermer » vivent dans un EN-TÊTE qui ne
  // défile pas ; seules les entrées fournies par l'appelant vont dans le
  // corps défilant. « Fermer » sort donc de la liste — c'est ce qui le rend
  // atteignable sans défilement, sur n'importe quelle hauteur d'écran, et
  // c'est décisif au tactile : le menu recouvre le canvas, donc les boutons
  // tactiles (dont `skill_3`, le « retour » de la manette) sont hors
  // d'atteinte tant qu'il est ouvert. « Fermer » n'est pas une sortie parmi
  // trois, c'est LA sortie du doigt.
  //
  // Son rang dans la NAVIGATION ne bouge pas pour autant : il reste la
  // dernière entrée du tableau d'actions (`reconstruire`), l'ordre au
  // clavier/à la manette est celui du tableau, jamais celui du DOM.
  const entete = document.createElement('div');
  entete.className = 'ecran-ui-entete';
  entete.innerHTML = `
    <div class="ecran-ui-entete-ligne">
      <h2 class="ecran-ui-titre"></h2>
      <div class="menu-item" data-item="fermer">
        <span class="menu-curseur"></span>
        <button class="ecran-ui-fermer" type="button"></button>
      </div>
    </div>
    <p class="ecran-ui-aide"></p>
  `;
  const titre = entete.querySelector('.ecran-ui-titre');
  // Aide optionnelle (specs/05_construction-stations.md §3 : "les touches du
  // mode sont affichées dans le menu lui-même") — vide par défaut, invisible
  // (`.ecran-ui-aide:empty`), un seul écran de plus ne demande aucun
  // changement ici.
  const aide = entete.querySelector('.ecran-ui-aide');
  const itemFermer = entete.querySelector('.menu-item');
  const boutonFermer = entete.querySelector('.ecran-ui-fermer');
  const corps = document.createElement('div');
  corps.className = 'ecran-ui-corps';
  const liste = document.createElement('div');
  liste.className = 'ecran-ui-liste';
  corps.appendChild(liste);
  // Le corps AVANT l'en-tête dans le DOM, l'en-tête au-dessus à l'écran
  // (`order: -1`, feuille de style) : « Fermer » reste ainsi le dernier
  // élément du document, comme il est le dernier cran de navigation. L'ordre
  // du DOM n'a jamais décidé du focus ici (c'est le tableau d'actions qui le
  // fait), mais le voir diverger serait un piège pour le prochain qui lira ce
  // fichier — et c'est ce que vérifient, sans avoir été touchés, les tests qui
  // exigent « Fermer toujours en dernier ».
  el.appendChild(corps);
  el.appendChild(entete);
  document.body.appendChild(el);

  // `element: el` (SD_construction-ecrans-orphelins_2026-09-17 §2) : ce
  // contrôleur portait déjà le ET avec le DOM, mais à l'EXTÉRIEUR
  // (`estOuvert()` plus bas faisait `controleur.estOuvert() && !el.hidden`)
  // — désormais porté par `creerControleurMenu` lui-même, comme les
  // contrôleurs du menu Pause. Ne JAMAIS refaire le `&&` ici en plus (voir
  // `estOuvert()` de l'objet retourné, plus bas).
  //
  // `onAnnuler: onAnnulerEcran` (SD_construction-parite-clic-verbe_2026-09-19
  // §3.2) : SEUL déclencheur de « B/skill_3 a fermé cet écran » — remplace la
  // déduction après coup que faisait l'ancien `traiterInput` (plus bas), qui
  // se trompait quand une ACTION (ex. choisir une station) fermait ce même
  // contrôleur pour une autre raison (`fermerSansCallback`, qui ne doit
  // JAMAIS rappeler `onFermer`).
  function onAnnulerEcran() {
    afficherEcran(el, false);
    if (onFermer) onFermer();
  }
  let controleur = creerControleurMenu([], { verbeAnnuler: 'skill_3', element: el, onAnnuler: onAnnulerEcran });
  let elements = [];
  let fournisseurEntrees = () => [];

  function actualiserFocus() {
    appliquerFocusVisuel(elements, controleur.index());
  }

  function fermer() {
    controleur.fermer();
    afficherEcran(el, false);
    if (onFermer) onFermer();
  }

  // MT_construction-bandeau-placement_2026-09-17 : ferme l'écran SANS
  // rappeler `onFermer` — nécessaire quand l'appelant enchaîne lui-même sur
  // un autre affichage (le bandeau de placement) et ne veut PAS que le menu
  // principal réapparaisse dessous entre-temps (contrairement à `fermer()`,
  // dont c'est précisément le rôle pour Poche/Stats/Construction).
  function fermerSansCallback() {
    controleur.fermer();
    afficherEcran(el, false);
  }

  function reconstruire() {
    // « Fermer » reste la DERNIÈRE entrée de la navigation (l'ordre est celui
    // de ce tableau) — seul son élément DOM vit ailleurs, dans l'en-tête figé
    // (`D-42`). Les deux listes se rejoignent plus bas : `elements` suit
    // exactement l'ordre de `toutes`.
    const entrees = fournisseurEntrees();
    const toutes = [...entrees, { texte: i18n.t('menu.fermer'), action: fermer }];
    liste.innerHTML = entrees.map((e, i) => `
      <div class="menu-item" data-item="${i}">
        <span class="menu-curseur"></span>
        <button type="button" ${e.grisee ? 'disabled' : ''}>${e.texte}</button>
      </div>
    `).join('');
    boutonFermer.textContent = i18n.t('menu.fermer');
    elements = [...Array.from(liste.querySelectorAll('.menu-item')), itemFermer];
    const boutonsListe = Array.from(liste.querySelectorAll('button'));
    const indexPrecedent = controleur.index();
    controleur = creerControleurMenu(toutes.map((e) => e.action), { verbeAnnuler: 'skill_3', element: el, onAnnuler: onAnnulerEcran });
    controleur.ouvrir();
    controleur.definirIndex(indexPrecedent);
    // Les entrées de la liste sont des éléments NEUFS à chaque reconstruction
    // (`liste.innerHTML` plus haut) : `addEventListener` n'y accumule rien.
    // L'élément « Fermer », lui, SURVIT aux reconstructions — ses deux
    // gestionnaires sont donc posés une seule fois, à la construction de
    // l'écran (voir plus bas), par affectation plutôt qu'en empilant des
    // écouteurs. Même raison que `el.onmouseenter =` dans
    // `construireMenuPrincipal` : un clic sur « Fermer » aurait sinon fermé
    // l'écran autant de fois qu'il a été reconstruit.
    elements.slice(0, -1).forEach((elItem, i) => {
      elItem.addEventListener('mouseenter', () => {
        controleur.definirIndex(i);
        actualiserFocus();
      });
    });
    boutonsListe.forEach((btn, i) => {
      btn.addEventListener('click', () => toutes[i].action());
    });
    actualiserFocus();
  }

  // Les deux gestionnaires de l'entrée « Fermer » de l'en-tête (cf.
  // `reconstruire`). Son action ne change jamais — c'est toujours `fermer` —
  // et son rang de focus est toujours le dernier.
  boutonFermer.addEventListener('click', fermer);
  itemFermer.onmouseenter = () => {
    controleur.definirIndex(elements.length - 1);
    actualiserFocus();
  };

  return {
    ouvrir(obtenirEntrees, texteTitre, texteAide = '') {
      fournisseurEntrees = obtenirEntrees;
      titre.textContent = texteTitre;
      aide.textContent = texteAide;
      afficherEcran(el, true);
      reconstruire();
    },
    fermer,
    fermerSansCallback,
    // Le `&& !el.hidden` vivait ici avant SD_construction-ecrans-orphelins
    // §2 — désormais porté par `controleur` lui-même (`element: el` passé à
    // `creerControleurMenu` ci-dessus), jamais les deux à la fois.
    estOuvert: () => controleur.estOuvert(),
    rafraichir: reconstruire,
    // SD_construction-parite-clic-verbe_2026-09-19 §3.2 : plus de branche
    // `else` ici. Avant cette fiche, elle DÉDUISAIT « fermé par B/skill_3 » du
    // seul fait que `controleur.estOuvert()` valait faux après
    // `traiterInput(etat)` — or une action choisie par ATTACK peut fermer ce
    // même contrôleur pour une tout autre raison (`fermerSansCallback`) sans
    // jamais vouloir rappeler `onFermer`. La fermeture par B/skill_3 est
    // désormais un événement déclaré (`onAnnuler`, câblé ci-dessus), pas une
    // inférence : plus rien à faire ici que rafraîchir le focus si l'écran
    // est resté ouvert.
    traiterInput(etat) {
      controleur.traiterInput(etat);
      if (controleur.estOuvert()) {
        actualiserFocus();
      }
    },
  };
}

// Les ids sous lesquels ce module enregistre ce qu'il sait ouvrir, faire et
// lire (specs/08_menus-cartes.md §5) : `data/menus.json` les cite, et le
// contrôle de démarrage (`menu_cartes.js#erreursCablageMenus`) vérifie les
// DEUX sens — toute carte trouve sa fonction, toute fonction a sa carte.
//
// Ce ne sont pas des ids de catalogue écrits dans un système : c'est l'autre
// moitié du contrat. Le catalogue dit « la carte Musique appelle
// `action_basculer_musique` » ; ce module dit « voici ce que fait
// `action_basculer_musique` ». Ajouter une CARTE ne touche pas ce fichier ;
// ajouter une CAPACITÉ (un nouvel écran existant, une nouvelle action), si.
const ECRAN_POCHE = 'ecran_poche';
const ECRAN_STATS = 'ecran_stats';
const ECRAN_CONSTRUCTION = 'ecran_construction';

// Les clés de texte que les lecteurs d'état peuvent rendre : elles ne sont
// citées par aucune carte (c'est le code qui les choisit, selon l'état réel),
// donc le contrôle de démarrage des textes ne les verrait pas sans cette
// liste. `langues` : une clé `menu.etat.langue_<code>` par langue chargée.
export function clesTexteEtats(langues) {
  return [
    ...langues.map((l) => `menu.etat.langue_${l}`),
    'menu.etat.musique_oui', 'menu.etat.musique_non',
    'menu.etat.plein_ecran_oui', 'menu.etat.plein_ecran_non',
    'menu.plein_ecran_refuse',
  ];
}

// 03_maison-exterieur §3.3/§3.6 + Palier A/C/D/E de 04_maison-interieur :
// - `listerPoche()` renvoie `{ id, label, quantite, categorie }[]` (le module a
//   besoin de `categorie`/`id` pour proposer "Équiper" sur la nourriture).
// - `equipementConsommable()`/`equiperConsommable(id)` : slot consommable
//   (§3.3, hint CONSUME).
// Tous optionnels (défauts inertes), au cas où un test construirait le menu
// sans ces dépendances.
// `peripheriqueActif` (MT_construction-bandeau-placement_2026-09-17) :
// optionnel, défaut 'manette' — seul le bandeau de placement s'en sert.
//
// specs/08_menus-cartes.md, palier A4 : le menu Pause n'est plus une liste,
// c'est un EMPILEMENT D'ÉCRANS DE CARTES (`ui/grille_cartes.js`), décrit par
// `menus` (le catalogue `data/menus.json`). Ce module ne garde que ce qui lui
// revient : les cinq écrans de LISTE (Poche, Stats, Construction, Craft,
// Coffre — inchangés, ils attendent le palier C), le bandeau de placement, et
// l'enregistrement des actions. `rectangleJeu`, `couleurAccent` et
// `dessinerIcone` sont injectés comme le reste : ce module ne connaît ni le
// canvas, ni les compagnons, ni `visuels.json`.
export function initialiserMenu({
  document, i18n, menus, exporterSauvegarde, importerSauvegarde,
  musiqueActive = () => true, basculerMusique = () => {}, listerPoche = () => [],
  equipementConsommable = () => null, equiperConsommable = () => {},
  peripheriqueActif = () => 'manette',
  // `D-30` : le plein écran est injecté comme tout le reste — ce module ne
  // connaît ni `document.fullscreenElement`, ni `requestFullscreen`.
  // `pleinEcranActif` est lu à CHAQUE affichage de la carte, jamais recopié
  // dans un booléen d'ici. (La PRÉSENCE de la carte, elle, est devenue une
  // condition du catalogue — la valeur nommée `plein_ecran_disponible`,
  // fournie par `main.js` —, plus une fonction injectée ici.)
  pleinEcranActif = () => false, basculerPleinEcran = () => {},
  couleurAccent = () => null, rectangleJeu = () => null, dessinerIcone = () => {},
}) {
  // Poche (§3.3), Craft/Coffre (Palier A/E), Stats (Palier D) : même écran
  // générique (creerEcranListeGenerique) — Poche affiche TOUS les items
  // (quantité en texte), "Équiper" n'étant une action réelle que sur la
  // nourriture (les autres lignes ont une action vide, focalisables sans
  // effet — plus simple qu'un 2e type de ligne non focalisable).
  // Poche/Stats/Construction s'ouvrent DEPUIS une carte : la grille se masque
  // sans se dépiler, et `onFermer` la fait réapparaître où elle était, quel
  // que soit le chemin de fermeture (clic « Fermer » ou B/skill_3).
  // `menuCartes` est déclarée plus bas dans ce même scope : jamais lue avant
  // qu'un écran soit ouvert, donc jamais avant d'exister.
  function onFermerVersMenuCartes() {
    menuCartes.reafficher();
  }
  const ecranPoche = creerEcranListeGenerique(document, i18n, { onFermer: onFermerVersMenuCartes });
  const ecranCraft = creerEcranListeGenerique(document, i18n);
  const ecranCoffre = creerEcranListeGenerique(document, i18n);
  const ecranStats = creerEcranListeGenerique(document, i18n, { onFermer: onFermerVersMenuCartes });
  // Construction (specs/05_construction-stations.md §3, précisée par
  // MT_construction-bandeau-placement_2026-09-17 v1.0.1) : ouvert DEPUIS le
  // menu Pause (comme Poche/Stats, `onFermer` symétrique pour B/skill_3).
  // Choisir une station dans cette liste la masque SANS callback
  // (`fermerSansCallback`, main.js#demarrerConstruction) — le placement qui
  // suit affiche la pièce + un bandeau, jamais cet écran plein-écran par
  // dessus (c'était le bug du micro-ticket : le fantôme restait invisible
  // derrière la liste).
  const ecranConstruction = creerEcranListeGenerique(document, i18n, { onFermer: onFermerVersMenuCartes });

  // Bandeau de placement (MT_construction-bandeau-placement_2026-09-17) : UI
  // PERMANENTE du mode (jamais via hints.js), en filigrane, SANS focus ni
  // navigation (`pointer-events: none`) — aucun conflit avec le routage des
  // verbes vers la machine `construction` de main.js, contrairement à
  // `ecranConstruction` ci-dessus qui, lui, capte le focus. Style déclaré
  // explicitement (jamais la classe `ecran-ui`, réservée aux écrans
  // plein écran) : un sous-écran sans style dédié est resté invisible une
  // fois déjà (`JOURNAL_2026-09-15_diagnostic-reset-invisible.md`), leçon
  // qui s'applique à tout nouvel élément partiel, pas seulement plein écran.
  const bandeauConstruction = document.createElement('div');
  bandeauConstruction.style.position = 'fixed';
  bandeauConstruction.style.left = '50%';
  bandeauConstruction.style.bottom = '12px';
  bandeauConstruction.style.transform = 'translateX(-50%)';
  bandeauConstruction.style.background = 'rgba(0, 0, 0, 0.55)';
  bandeauConstruction.style.color = '#eee';
  bandeauConstruction.style.fontFamily = 'sans-serif';
  bandeauConstruction.style.fontSize = '0.8em';
  bandeauConstruction.style.padding = '0.35rem 1rem';
  bandeauConstruction.style.borderRadius = '6px';
  bandeauConstruction.style.opacity = '0.75'; // filigrane, jamais au premier plan (Xav, §4)
  bandeauConstruction.style.pointerEvents = 'none';
  bandeauConstruction.style.whiteSpace = 'nowrap';
  afficherEcran(bandeauConstruction, false);
  document.body.appendChild(bandeauConstruction);

  function entreesPoche() {
    const entrees = listerPoche();
    if (entrees.length === 0) return [{ texte: i18n.t('menu.poche_vide'), action: () => {} }];
    return entrees.map((e) => {
      const equipe = e.categorie === 'nourriture' && equipementConsommable() === e.id;
      const suffixe = equipe ? ' ✓' : '';
      const texte = `${e.label} × ${e.quantite}${e.categorie === 'nourriture' ? ` — ${i18n.t('menu.poche_equiper')}` : ''}${suffixe}`;
      return {
        texte,
        action: e.categorie === 'nourriture' ? () => { equiperConsommable(e.id); ecranPoche.rafraichir(); } : () => {},
      };
    });
  }

  // Bandeau de placement (§3, v1.0.1) : nom de la station + les 5 verbes du
  // mode, résolus via le périphérique RÉELLEMENT actif (glyphes), jamais en
  // dur — construit une seule fois à l'entrée en placement (pas de hot-swap
  // manette<->clavier suivi en direct pendant le placement, simplification
  // acceptée : le bandeau est redessiné à chaque nouvelle station choisie).
  function texteBandeauConstruction(nomStation) {
    const p = peripheriqueActif();
    const g = (verbe) => i18n.t(`glyphe.${p}.${verbe}`);
    return [
      nomStation,
      `${i18n.t('menu.construction_aide_deplacer')} ${g('move')}`,
      `${i18n.t('menu.construction_aide_tourner')} ${g('skill_1')}`,
      `${i18n.t('menu.construction_aide_confirmer')} ${g('attack')}`,
      `${i18n.t('menu.construction_aide_annuler')} ${g('skill_3')}`,
      `${i18n.t('menu.construction_aide_quitter')} ${g('menu')}`,
    ].join(' · ');
  }

  // Transition ATOMIQUE liste -> placement (§3 invariant) : retrait de
  // l'écran-liste et levée du bandeau, dans la même fonction synchrone —
  // aucun état intermédiaire où ni l'un ni l'autre ne serait affiché.
  //
  // Historique (à ne pas reproduire) : `a70a089` ajoutait ici une fermeture
  // explicite du contrôleur du menu Pause pour que `menu.estOuvert()` retombe
  // à `false` pendant le placement — ça réparait le sens ALLER, mais cassait
  // le RETOUR (SD_construction-ecrans-orphelins_2026-09-17.md, symptôme 3).
  // Cause racine RÉELLE (carte §1.2) : `menu.estOuvert()` OR-combinait deux
  // CONTRATS différents pour « ouvert ». Avec le contrat UNIFIÉ (intention ET
  // DOM visible, que la grille de cartes applique elle aussi), un écran
  // masqué n'est pas « ouvert » : pendant le placement, la grille est masquée
  // (sa pile intacte), la liste est fermée, et `menu.estOuvert()` vaut faux
  // sans que personne ait eu à fermer puis rouvrir quoi que ce soit.
  function ouvrirPlacementConstruction(nomStation) {
    ecranConstruction.fermerSansCallback();
    bandeauConstruction.textContent = texteBandeauConstruction(nomStation);
    afficherEcran(bandeauConstruction, true);
  }

  // Retour liste (pose confirmée ou `B`, §4) : on enchaîne sans repasser par
  // la grille — la liste réapparaît directement avec des entrées fraîches.
  function reouvrirListeConstruction() {
    afficherEcran(bandeauConstruction, false);
    ecranConstruction.ouvrir(fournisseurEntreesConstruction, i18n.t('menu.construction_titre'));
  }

  // Sortie propre vers le menu Pause (`MENU` pendant le placement, §4) :
  // juste le bandeau à cacher ici, main.js s'occupe d'annuler la pose et
  // d'appeler menu.ouvrir() lui-même juste après.
  function fermerPlacementConstruction() {
    afficherEcran(bandeauConstruction, false);
  }

  // Importer : le seul contrôle NATIF qui reste. Un sélecteur de fichier ne
  // s'ouvre que par un `<input type="file">` ; il vit donc ici, hors de toute
  // grille, invisible — la carte « Importer » le déclenche. Limite connue et
  // inchangée : à la MANETTE (lue par sondage, donc sans geste utilisateur aux
  // yeux du navigateur) le sélecteur peut ne pas s'ouvrir, exactement comme le
  // plein écran (`D-30`).
  const inputImporter = document.createElement('input');
  inputImporter.type = 'file';
  inputImporter.accept = 'application/json';
  inputImporter.hidden = true;
  inputImporter.style.display = 'none';
  inputImporter.addEventListener('change', (e) => {
    const fichier = e.target.files[0];
    if (fichier) importerSauvegarde(fichier);
  });
  document.body.appendChild(inputImporter);

  // Langue : bascule vers la langue SUIVANTE parmi celles qui sont chargées
  // (deux aujourd'hui ; à la troisième, la spec prévoit que la carte devienne
  // un dossier — §8). Convention manette : ATTACK bascule.
  function actionBasculerLangue() {
    const langues = i18n.languesDisponibles ? i18n.languesDisponibles() : ['fr', 'en'];
    const suivante = langues[(langues.indexOf(i18n.langueCourante()) + 1) % langues.length];
    i18n.definirLangue(suivante);
  }

  // Plein écran (`D-30`, rouvert le 20/09) — deux règles, conservées telles
  // quelles :
  //   1. **La carte affiche l'état RÉEL** (`pleinEcranActif()`, câblé sur
  //      `document.fullscreenElement`), jamais un booléen tenu à jour ici. Le
  //      joueur peut sortir par Échap sans que personne ici ne soit prévenu.
  //   2. **Un refus ne change rien à la carte.** Il s'annonce dans l'en-tête,
  //      et c'est tout — c'est ce qui arrive à la MANETTE : lue par sondage,
  //      elle ne produit aucun geste aux yeux du navigateur, qui refuse. On ne
  //      contourne pas ; on le dit au joueur.
  // `basculer()` rend une promesse résolue à l'état RÉEL obtenu, jamais
  // rejetée (frontière du sous-système). Un appelant de test peut rendre un
  // booléen nu : les deux formes sont acceptées. Le refus voyage comme une CLÉ
  // de texte ; c'est la grille qui l'affiche.
  function actionBasculerPleinEcran() {
    const attendu = !pleinEcranActif();
    const conclure = (actif) => (actif !== attendu ? { cleMessage: 'menu.plein_ecran_refuse' } : null);
    const resultat = basculerPleinEcran();
    if (resultat && typeof resultat.then === 'function') return resultat.then(conclure, () => conclure(pleinEcranActif()));
    return conclure(pleinEcranActif());
  }

  // Fournie après coup par main.js (main.js#demarrerJeu, `menu.
  // definirActionReinitialiser`) : la construction du menu précède celle de
  // l'orchestrateur (qui a besoin du menu pour son propre maj()), donc ce
  // module ne peut pas connaître reinitialiserPartie() à sa propre
  // construction — point de couture explicite plutôt qu'un import circulaire
  // vers main.js.
  let actionReinitialiser = () => {};
  // Fournie après coup de la même façon (§3.4) : le menu Stats a besoin de
  // resoudre les stats/points depuis main.js, qui construit le menu.
  let fournisseurEntreesStats = () => [];
  // Même patron pour Construction (§3) : liste des stations placable de la
  // structure où se trouve le héros — dépend de main.js (scène/position).
  let fournisseurEntreesConstruction = () => [];
  // Et pour les conditions des cartes (`flags.evaluate`, qui vit dans
  // l'orchestrateur). Tant qu'il n'est pas fourni, AUCUNE condition n'est
  // vraie : une carte qu'on ne sait pas évaluer ne s'affiche pas (même
  // discipline que `flags.js` pour une valeur inconnue).
  let evaluerCondition = () => false;

  const actions = {
    action_basculer_langue: actionBasculerLangue,
    action_basculer_musique: () => basculerMusique(),
    action_basculer_plein_ecran: actionBasculerPleinEcran,
    action_exporter_sauvegarde: () => exporterSauvegarde(),
    action_importer_sauvegarde: () => inputImporter.click(),
    // Par une fonction fléchée, jamais par référence : `actionReinitialiser`
    // est remplacée après coup (voir ci-dessus).
    action_reinitialiser_sauvegarde: () => actionReinitialiser(),
  };
  // L'état RÉEL de chaque bascule, relu à la source à chaque affichage. Un
  // lecteur rend une CLÉ de texte, jamais un texte composé.
  const etats = {
    etat_langue: () => `menu.etat.langue_${i18n.langueCourante()}`,
    etat_musique: () => (musiqueActive() ? 'menu.etat.musique_oui' : 'menu.etat.musique_non'),
    etat_plein_ecran: () => (pleinEcranActif() ? 'menu.etat.plein_ecran_oui' : 'menu.etat.plein_ecran_non'),
  };
  // Les écrans EXISTANTS qu'une carte dossier peut ouvrir, inchangés (palier
  // C). La grille s'est déjà masquée quand ces fonctions sont appelées.
  const ecrans = {
    [ECRAN_POCHE]: () => ecranPoche.ouvrir(entreesPoche, i18n.t('menu.poche_titre')),
    [ECRAN_STATS]: () => ecranStats.ouvrir(fournisseurEntreesStats, i18n.t('menu.stats_titre')),
    [ECRAN_CONSTRUCTION]: () => ecranConstruction.ouvrir(fournisseurEntreesConstruction, i18n.t('menu.construction_titre')),
  };

  const menuCartes = creerMenuCartes({
    document, i18n, menus, actions, etats, ecrans,
    evaluerCondition: (condition) => evaluerCondition(condition),
    couleurAccent, rectangleJeu, dessinerIcone,
    afficherEcran, seuilPoussee: SEUIL_POUSSEE_MENU,
  });
  // L'id historique du menu Pause : les tests et les diagnostics le cherchent
  // sous ce nom depuis la Phase 0.
  menuCartes.element.id = 'menu';

  return {
    ouvrir() {
      afficherEcran(bandeauConstruction, false);
      // La grille D'ABORD : fermée (pile vide), elle ignore le `reafficher()`
      // que déclenche la fermeture des trois écrans qui suivent.
      menuCartes.fermer();
      ecranPoche.fermer();
      ecranStats.fermer();
      ecranConstruction.fermer();
      menuCartes.ouvrir();
    },
    fermer() {
      menuCartes.fermer();
      ecranPoche.fermer();
      ecranCraft.fermer();
      ecranCoffre.fermer();
      ecranStats.fermer();
      ecranConstruction.fermer();
      afficherEcran(bandeauConstruction, false);
    },
    // MT_construction-bandeau-placement_2026-09-17 : transitions de la
    // machine Construction pilotées par main.js — jamais de focus/navigation
    // propre à ces 3 fonctions (le bandeau n'en a pas, la liste réutilise
    // celle déjà existante de `ecranConstruction`).
    ouvrirPlacementConstruction,
    reouvrirListeConstruction,
    fermerPlacementConstruction,
    // SD_construction-ecrans-orphelins_2026-09-17 §2 (piste 2 de la carte,
    // version PARTIELLE — voir le journal pour pourquoi ce n'est PAS OR-
    // combiné dans estOuvert() ci-dessous) : le bandeau était le seul écran
    // sans aucun accesseur (carte §1.3), rendant son état invisible à tout
    // test/invariant externe. Ne rien déduire d'autre ici : ce booléen reflète
    // la visibilité DOM du bandeau, rien de plus.
    bandeauEstOuvert() {
      return !bandeauConstruction.hidden;
    },
    estOuvert() {
      // Le bandeau n'entre PAS dans cet OR : carte §1.2/§4, SD_construction-
      // ecrans-orphelins §2 point 3 — main.js#maj() donne la priorité à
      // `menu.estOuvert()` sur la machine `construction` dans son dispatch ;
      // l'y inclure ferait gagner le (faux) routage menu pendant tout le
      // placement. Le gel du jeu pendant le placement reste couvert par
      // `constructionActif()`, lu séparément côté main.js.
      //
      // Six sous-contrats au lieu de sept : la confirmation de reset n'est
      // plus un écran à part, c'est un niveau de la pile de la grille. Les
      // réunir en UNE pile est le palier B — rien d'autre ne bouge ici.
      return (
        menuCartes.estOuvert() ||
        ecranPoche.estOuvert() || ecranCraft.estOuvert() || ecranCoffre.estOuvert() || ecranStats.estOuvert() ||
        ecranConstruction.estOuvert()
      );
    },
    // `D-30` : appelée par main.js sur `fullscreenchange` — le seul moment où
    // l'état réel peut changer sans que ce module ait rien demandé (Échap, un
    // geste système, ou la fin d'une bascule asynchrone). La carte se réécrit
    // alors depuis l'état réel, jamais depuis ce qu'on avait demandé.
    actualiserPleinEcran() {
      menuCartes.rafraichir();
    },
    // La fenêtre a changé de taille : la boîte du menu se recale sur le
    // rectangle du canvas (§4.4). Appelée par main.js, qui possède l'écouteur.
    actualiserGeometrie() {
      menuCartes.actualiserGeometrie();
    },
    // Ce que ce module a réellement branché — la moitié « code » du contrôle
    // de câblage au démarrage (`menu_cartes.js#erreursCablageMenus`).
    cablage: () => ({ actions: Object.keys(actions), etats: Object.keys(etats), ecrans: Object.keys(ecrans) }),
    // Observation pour les tests headless (même patron que l'orchestrateur).
    obtenirEtatCartes: () => menuCartes.obtenirEtat(),
    // Fournie par main.js : `flags.evaluate` — les conditions des cartes
    // (case contextuelle, carte absente sans API) sont relues à CHAQUE
    // affichage, jamais figées.
    definirEvaluateurCondition(fn) {
      evaluerCondition = fn;
    },
    // Liste des stations placable de la structure courante, fournie après
    // coup (dépend de la scène/position, que ce module ne connaît pas).
    definirEntreesConstruction(fn) {
      fournisseurEntreesConstruction = fn;
    },
    // Fournit l'action réelle de reinitialiserPartie() après la construction
    // de l'orchestrateur (voir commentaire sur `actionReinitialiser`
    // ci-dessus) — jamais appelée avant, puisque la carte qui y mène n'est
    // atteignable qu'après ouverture du menu, donc après ce câblage.
    definirActionReinitialiser(fn) {
      actionReinitialiser = fn;
    },
    // Palier D : main.js fournit un obtenirEntrees() propre au menu Stats
    // (résout registre/i18n/save, que ce module ne connaît pas) une fois
    // l'orchestrateur construit — même patron que reinitialiserPartie.
    definirEntreesStats(fn) {
      fournisseurEntreesStats = fn;
    },
    // Écrans contextuels ouverts directement par INTERACT sur une station
    // (Palier A/E, hors du menu Pause) — `obtenirEntrees` est fourni à
    // l'ouverture par main.js (dépend de la station visée, donc pas fixé à
    // la construction du menu comme `fournisseurEntreesStats`).
    ouvrirCraft(obtenirEntrees, titre) {
      ecranCraft.ouvrir(obtenirEntrees, titre);
    },
    rafraichirCraft() {
      ecranCraft.rafraichir();
    },
    ouvrirCoffre(obtenirEntrees, titre) {
      ecranCoffre.ouvrir(obtenirEntrees, titre);
    },
    rafraichirCoffre() {
      ecranCoffre.rafraichir();
    },
    rafraichirStats() {
      ecranStats.rafraichir();
    },
    // Point d'entrée appelé par main.js tant que le menu est ouvert (voir
    // la priorité UI/gameplay dans main.js#maj). Un seul écran actif à la
    // fois, et un seul `return` par frame : un verbe consommé par un écran
    // de liste n'est jamais revu par la grille dans la même frame (B qui
    // ferme Stats ne dépile pas AUSSI l'écran Héros).
    traiterInput(etat) {
      if (ecranCraft.estOuvert()) { ecranCraft.traiterInput(etat); return; }
      if (ecranCoffre.estOuvert()) { ecranCoffre.traiterInput(etat); return; }
      // Stats/Poche/Construction : ouverts DEPUIS une carte — leur `onFermer`
      // fait réapparaître la grille quel que soit le chemin de fermeture.
      // Choisir une station dans Construction quitte la liste SANS ce
      // callback (`fermerSansCallback`, main.js#demarrerConstruction ->
      // `ouvrirPlacementConstruction`, jamais `menu.fermer()`).
      if (ecranStats.estOuvert()) { ecranStats.traiterInput(etat); return; }
      if (ecranPoche.estOuvert()) { ecranPoche.traiterInput(etat); return; }
      if (ecranConstruction.estOuvert()) { ecranConstruction.traiterInput(etat); return; }
      menuCartes.traiterInput(etat);
    },
  };
}

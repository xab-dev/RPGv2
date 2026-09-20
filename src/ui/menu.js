// Menu minimal (§3.6) : bascule de langue FR/EN, export/import de
// sauvegarde, Poche, Stats (Palier D) — et les écrans contextuels Craft/
// Coffre (Palier A/E, ouverts directement par INTERACT sur une station,
// hors du menu Pause). Rien ici ne touche le DOM au chargement du module :
// tout se passe dans initialiserMenu(), appelée par main.js une fois le
// document prêt.
//
// creerNavigationMenu() et creerControleurMenu() sont pures (aucune
// référence DOM, actions passées en callbacks) : c'est le patron de focus
// que reprennent tous les écrans d'UI — écrit une fois ici, testé depuis
// Node sans faux DOM.

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
    // Intention brute (SD_construction-ecrans-orphelins_2026-09-17 §2) :
    // `ouvert` seul, sans le ET DOM de `estOuvert()` ci-dessus — nécessaire
    // au SEUL endroit qui doit distinguer « ce contrôleur a été fermé
    // délibérément » (ex. "Oui" du reset, `actionConfirmerOui`) de « son
    // écran est simplement masqué en ce moment » (ex. `conteneur` caché
    // pendant que la confirmation de reset s'affiche par-dessus, alors que
    // `controleur` du menu Pause reste volontairement ouvert dessous).
    // `estOuvert()` seul ne peut pas trancher ce cas : au moment où on se
    // pose la question, `element` est TOUJOURS caché (c'est justement
    // pourquoi un autre écran est visible) — jamais utilisé ailleurs que
    // `ui/menu.js#traiterInput` (retour de la confirmation par B/skill_3).
    ouvertIntentionnellement() {
      return ouvert;
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
// L'ABSENCE de texte, pas un texte. Elle est nommée plutôt qu'écrite en
// place pour une raison de fond et une de forme : de fond, effacer un message
// n'est pas afficher quelque chose, donc ça n'a rien à faire dans les locales ;
// de forme, le garde-fou d'i18n (`test_phase0_i18n`, bloc 5) refuse toute
// chaîne littérale assignée à un `textContent` de ce fichier — et il a raison de
// ne pas savoir faire la différence, c'est à nous de la dire ici.
const AUCUN_MESSAGE = '';

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

// 03_maison-exterieur §3.3/§3.6 + Palier A/C/D/E de 04_maison-interieur :
// - `listerPoche()` renvoie désormais `{ id, label, quantite, categorie }[]`
//   (le module a besoin de `categorie`/`id` pour proposer "Équiper" sur la
//   nourriture, pas seulement afficher un texte).
// - `equipementConsommable()`/`equiperConsommable(id)` : slot consommable
//   (§3.3, hint CONSUME).
// Tous optionnels (défauts inertes), comme le reste des callbacks
// facultatifs déjà présents ici, au cas où un futur test construirait le
// menu sans ces dépendances.
// `peripheriqueActif` (MT_construction-bandeau-placement_2026-09-17) :
// optionnel, défaut 'manette' — seul le bandeau de placement s'en sert
// (glyphes du périphérique réellement actif plutôt que manette en dur), rien
// d'autre dans ce module n'y touche ; brancher `input.js` plus largement ici
// reste une dette assumée tant qu'un 2ᵉ besoin ne le justifie pas.
export function initialiserMenu({
  document, i18n, exporterSauvegarde, importerSauvegarde,
  musiqueActive = () => true, basculerMusique = () => {}, listerPoche = () => [],
  equipementConsommable = () => null, equiperConsommable = () => {},
  peripheriqueActif = () => 'manette',
  // `D-30` (rouvert le 20/09) : le plein écran est injecté comme tout le
  // reste — ce module ne connaît ni `document.fullscreenElement`, ni
  // `requestFullscreen`. `pleinEcranDisponible` décide si l'entrée EXISTE
  // (une entrée qui ne peut rien faire n'a rien à faire dans le menu, même
  // règle que Construction hors de la maison) ; `pleinEcranActif` est lu à
  // CHAQUE affichage du libellé, jamais recopié dans un booléen d'ici.
  pleinEcranDisponible = () => false, pleinEcranActif = () => false,
  basculerPleinEcran = () => {},
}) {
  const conteneur = document.createElement('div');
  conteneur.id = 'menu';
  appliquerClasseEcran(conteneur);
  afficherEcran(conteneur, false);
  // Même découpe que `creerEcranListeGenerique` (`D-42`) : un en-tête figé
  // qui porte le titre et « Fermer », un corps qui défile et porte les huit
  // autres entrées. `data-item` garde sa numérotation d'origine — l'ordre de
  // navigation est celui de `ENTREES_FIXES_DEBUT`/`_FIN` plus bas, pas celui
  // du DOM, et ce ticket n'a le droit de changer ni l'un ni l'autre.
  conteneur.innerHTML = `
    <div class="ecran-ui-corps">
      <div class="ecran-ui-liste">
        <div class="menu-item" data-item="0">
          <span class="menu-curseur"></span>
          <label data-cle="menu.langue"></label>
          <select id="menu-langue"><option value="fr">FR</option><option value="en">EN</option></select>
        </div>
        <div class="menu-item" data-item="1">
          <span class="menu-curseur"></span>
          <button id="menu-musique" data-cle="menu.musique" type="button"></button>
        </div>
        <div class="menu-item" data-item="1b">
          <span class="menu-curseur"></span>
          <button id="menu-plein-ecran" type="button"></button>
        </div>
        <div class="menu-item" data-item="2">
          <span class="menu-curseur"></span>
          <button id="menu-poche" data-cle="menu.poche" type="button"></button>
        </div>
        <div class="menu-item" data-item="3">
          <span class="menu-curseur"></span>
          <button id="menu-stats" data-cle="menu.stats" type="button"></button>
        </div>
        <div class="menu-item" data-item="4">
          <span class="menu-curseur"></span>
          <button id="menu-construction" data-cle="menu.construction" type="button"></button>
        </div>
        <div class="menu-item" data-item="5">
          <span class="menu-curseur"></span>
          <button id="menu-exporter" data-cle="menu.exporter" type="button"></button>
        </div>
        <div class="menu-item" data-item="6">
          <span class="menu-curseur"></span>
          <input id="menu-importer" type="file" accept="application/json" />
        </div>
        <div class="menu-item" data-item="7">
          <span class="menu-curseur"></span>
          <button id="menu-reset" data-cle="menu.reset_sauvegarde" type="button"></button>
        </div>
      </div>
    </div>
    <div class="ecran-ui-entete">
      <div class="ecran-ui-entete-ligne">
        <h2 class="ecran-ui-titre" data-cle="menu.titre"></h2>
        <div class="menu-item" data-item="8">
          <span class="menu-curseur"></span>
          <button id="menu-fermer" data-cle="menu.fermer" type="button"></button>
        </div>
      </div>
      <p class="ecran-ui-aide" id="menu-message"></p>
    </div>
  `;
  document.body.appendChild(conteneur);

  // Écran de confirmation (§B) : sous-menu à 2 entrées, conteneur DOM séparé
  // plutôt qu'imbriqué dans `conteneur` — masquer l'un affiche l'autre, les
  // deux ne sont jamais visibles en même temps (cf. traiterInput plus bas).
  const confirmation = document.createElement('div');
  confirmation.id = 'menu-confirmation-reset';
  appliquerClasseEcran(confirmation);
  afficherEcran(confirmation, false);
  // Même découpe que les autres écrans (`D-42`), à une différence près :
  // « Oui » et « Non » restent ENSEMBLE dans le corps. Ici la sortie n'est
  // pas « Fermer », c'est « Non » — et sortir l'un des deux termes d'un choix
  // destructif de son couple rendrait la question moins lisible, pas plus.
  // Deux entrées ne peuvent pas déborder : mesuré à 703 × 280, l'écran tient
  // entier avec de la marge.
  confirmation.innerHTML = `
    <div class="ecran-ui-corps">
      <div class="ecran-ui-liste">
        <div class="menu-item" data-item="0">
          <span class="menu-curseur"></span>
          <button id="menu-reset-oui" data-cle="menu.reset_oui" type="button"></button>
        </div>
        <div class="menu-item" data-item="1">
          <span class="menu-curseur"></span>
          <button id="menu-reset-non" data-cle="menu.reset_non" type="button"></button>
        </div>
      </div>
    </div>
    <div class="ecran-ui-entete">
      <div class="ecran-ui-entete-ligne">
        <h2 class="ecran-ui-titre" data-cle="menu.reset_confirmation_titre"></h2>
      </div>
    </div>
  `;
  document.body.appendChild(confirmation);

  // Poche (§3.3), Craft/Coffre (Palier A/E), Stats (Palier D) : même écran
  // générique (creerEcranListeGenerique) — Poche affiche TOUS les items
  // (quantité en texte), "Équiper" n'étant une action réelle que sur la
  // nourriture (les autres lignes ont une action vide, focalisables sans
  // effet — plus simple qu'un 2e type de ligne non focalisable).
  // Poche/Stats masquent `conteneur` sans le fermer (§3.4/§3.6) : `onFermer`
  // le réaffiche, quel que soit le chemin de fermeture (clic "Fermer" ou B/
  // skill_3) — `actualiserFocusVisuel` référencée ici est une déclaration de
  // fonction plus bas dans ce même scope (hoisted), jamais appelée avant que
  // le menu principal soit entièrement construit.
  function onFermerVersMenuPrincipal() {
    afficherEcran(conteneur, true);
    actualiserFocusVisuel();
  }
  const ecranPoche = creerEcranListeGenerique(document, i18n, { onFermer: onFermerVersMenuPrincipal });
  const ecranCraft = creerEcranListeGenerique(document, i18n);
  const ecranCoffre = creerEcranListeGenerique(document, i18n);
  const ecranStats = creerEcranListeGenerique(document, i18n, { onFermer: onFermerVersMenuPrincipal });
  // Construction (specs/05_construction-stations.md §3, précisée par
  // MT_construction-bandeau-placement_2026-09-17 v1.0.1) : ouvert DEPUIS le
  // menu Pause (comme Poche/Stats, `onFermer` symétrique pour B/skill_3).
  // Choisir une station dans cette liste la masque SANS callback
  // (`fermerSansCallback`, main.js#demarrerConstruction) — le placement qui
  // suit affiche la pièce + un bandeau, jamais cet écran plein-écran par
  // dessus (c'était le bug du micro-ticket : le fantôme restait invisible
  // derrière la liste).
  const ecranConstruction = creerEcranListeGenerique(document, i18n, { onFermer: onFermerVersMenuPrincipal });

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

  function actionOuvrirPoche() {
    // §3.6 : la poche est un écran séparé du menu principal (creerEcranListeGenerique,
    // fixed/inset:0) — sans ce masquage explicite, `conteneur` resterait
    // affiché EN DESSOUS (jamais fermé lui-même), superposant deux menus
    // focalisables en même temps (même piège que Stats ci-dessous).
    afficherEcran(conteneur, false);
    ecranPoche.ouvrir(entreesPoche, i18n.t('menu.poche_titre'));
  }

  function actionOuvrirStats() {
    afficherEcran(conteneur, false);
    ecranStats.ouvrir(fournisseurEntreesStats, i18n.t('menu.stats_titre'));
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

  function actionOuvrirConstruction() {
    afficherEcran(conteneur, false);
    ecranConstruction.ouvrir(fournisseurEntreesConstruction, i18n.t('menu.construction_titre'));
  }

  // Transition ATOMIQUE liste -> placement (§3 invariant) : retrait de
  // l'écran-liste et levée du bandeau, dans la même fonction synchrone —
  // aucun état intermédiaire où ni l'un ni l'autre ne serait affiché.
  //
  // Historique (à ne pas reproduire) : `a70a089` ajoutait ici un
  // `controleur.fermer()` explicite pour que `menu.estOuvert()` retombe à
  // `false` pendant le placement — ça réparait le sens ALLER, mais cassait
  // le RETOUR (`reouvrirListeConstruction` ne rouvre jamais `controleur`,
  // donc `onFermerVersMenuPrincipal` réaffichait `conteneur` sur un
  // contrôleur resté fermé pour toujours — SD_construction-ecrans-
  // orphelins_2026-09-17.md, symptôme 3). Cause racine RÉELLE (carte §1.2) :
  // `menu.estOuvert()` OR-combinait deux CONTRATS différents pour « ouvert »
  // (booléen pur ici, booléen ET DOM pour les écrans génériques) — un mode
  // qui sort de la pile du menu Pause et y revient ne peut satisfaire les
  // deux en manipulant seulement `controleur.fermer()/.ouvrir()`. Avec le
  // contrat UNIFIÉ (`creerControleurMenu#element`, ce fichier), cacher
  // `conteneur` suffit : `controleur.estOuvert()` retombe automatiquement à
  // `false` (booléen interne toujours vrai, DOM caché), et réafficher
  // `conteneur` plus tard (`onFermerVersMenuPrincipal`, déjà utilisé par
  // Poche/Stats) le fait redevenir vrai SANS jamais rappeler `.ouvrir()` —
  // plus besoin de fermer/rouvrir ce contrôleur explicitement ici.
  function ouvrirPlacementConstruction(nomStation) {
    ecranConstruction.fermerSansCallback();
    bandeauConstruction.textContent = texteBandeauConstruction(nomStation);
    afficherEcran(bandeauConstruction, true);
  }

  // Retour liste (pose confirmée ou `B`, §4) : on enchaîne sans repasser par
  // `conteneur` — la liste réapparaît directement avec des entrées fraîches.
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

  conteneur.querySelector('#menu-exporter').addEventListener('click', () => exporterSauvegarde());

  const inputImporter = conteneur.querySelector('#menu-importer');
  inputImporter.addEventListener('change', (e) => {
    const fichier = e.target.files[0];
    if (fichier) importerSauvegarde(fichier);
  });

  const selectLangue = conteneur.querySelector('#menu-langue');
  selectLangue.value = i18n.langueCourante();
  selectLangue.addEventListener('change', () => {
    i18n.definirLangue(selectLangue.value);
    retraduireBase();
  });

  function actionBasculerLangue() {
    // Convention manette (A = confirmer) appliquée à un select : un seul
    // bouton ne peut pas "ouvrir" une liste déroulante, donc ATTACK
    // bascule FR<->EN plutôt que de reproduire l'ouverture native — voir
    // le parcours manuel du ticket.
    selectLangue.value = selectLangue.value === 'fr' ? 'en' : 'fr';
    i18n.definirLangue(selectLangue.value);
    retraduireBase();
  }

  // Musique (§3.6) : bouton "Musique : Oui/Non" — même convention que la
  // langue (ATTACK bascule), l'état réel (save.settings.musique) et l'effet
  // (audio.js#definirMusiqueActive) vivent tous les deux dans main.js.
  const boutonMusique = conteneur.querySelector('#menu-musique');
  function actualiserBoutonMusique() {
    const suffixe = musiqueActive() ? i18n.t('menu.musique_oui') : i18n.t('menu.musique_non');
    boutonMusique.textContent = `${i18n.t('menu.musique')} : ${suffixe}`;
  }
  function actionBasculerMusique() {
    basculerMusique();
    actualiserBoutonMusique();
  }
  boutonMusique.addEventListener('click', actionBasculerMusique);

  // Plein écran (`D-30`, rouvert le 20/09). Même convention que Musique :
  // ATTACK bascule. Deux règles, et elles ne se négocient pas :
  //
  //   1. **Le libellé lit l'état RÉEL** (`pleinEcranActif()`, câblé sur
  //      `document.fullscreenElement`), jamais un booléen tenu à jour ici. Le
  //      joueur peut sortir par Échap ou par un geste système sans que
  //      personne ici ne soit prévenu ; un booléen local mentirait.
  //   2. **Un refus ne change rien au libellé.** Il affiche un message, et
  //      c'est tout — c'est exactement ce qui arrivera si Xav confirme
  //      l'entrée à la MANETTE : une manette est lue par sondage, pas par
  //      événement, donc le navigateur ne voit aucun geste et refuse. On ne
  //      contourne pas ; on le dit au joueur.
  const boutonPleinEcran = conteneur.querySelector('#menu-plein-ecran');
  const elPleinEcran = boutonPleinEcran.parentNode;
  const message = conteneur.querySelector('#menu-message');
  function actualiserBoutonPleinEcran() {
    boutonPleinEcran.textContent = pleinEcranActif()
      ? i18n.t('menu.quitter_plein_ecran')
      : i18n.t('menu.plein_ecran');
  }
  function actionBasculerPleinEcran() {
    message.textContent = AUCUN_MESSAGE;
    const attendu = !pleinEcranActif();
    // `basculer()` rend une promesse résolue à l'état RÉEL obtenu, jamais
    // rejetée (frontière du sous-système). Un appelant de test peut rendre un
    // booléen nu : les deux formes sont acceptées, comme partout ici.
    const resultat = basculerPleinEcran();
    const conclure = (actif) => {
      actualiserBoutonPleinEcran();
      if (actif !== attendu) message.textContent = i18n.t('menu.plein_ecran_refuse');
    };
    if (resultat && typeof resultat.then === 'function') resultat.then(conclure, () => conclure(pleinEcranActif()));
    else conclure(pleinEcranActif());
  }
  boutonPleinEcran.addEventListener('click', actionBasculerPleinEcran);

  retraduireBase();

  function retraduireBase() {
    conteneur.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
    confirmation.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
    actualiserBoutonMusique();
    actualiserBoutonPleinEcran();
  }

  function fermerMenu() {
    controleur.fermer();
    afficherEcran(conteneur, false);
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
  // structure où se trouve le héros — dépend de main.js (scène/position),
  // donc fournie après coup elle aussi. `disponibiliteConstruction` décide si
  // l'ENTRÉE elle-même apparaît dans le menu Pause (§3 : "sinon l'entrée
  // n'apparaît pas", jamais un simple grisage comme les recettes).
  let fournisseurEntreesConstruction = () => [];
  let disponibiliteConstruction = () => false;

  function revenirAuMenuPrincipal() {
    afficherEcran(confirmation, false);
    afficherEcran(conteneur, true);
    actualiserFocusVisuel();
  }

  // Index 1 = "Non" : focus par défaut sécurisé (§B — ne jamais partir sur
  // "Oui" pour une action destructive), positionné après ouverture() puisque
  // creerControleurMenu().ouvrir() remet toujours l'index à 0.
  const INDEX_CONFIRMATION_NON = 1;

  function actionOuvrirConfirmation() {
    afficherEcran(conteneur, false);
    afficherEcran(confirmation, true);
    controleurConfirmation.ouvrir();
    controleurConfirmation.definirIndex(INDEX_CONFIRMATION_NON);
    actualiserFocusConfirmation();
  }

  function actionConfirmerOui() {
    controleurConfirmation.fermer();
    afficherEcran(confirmation, false);
    // "Oui" referme tout le menu (pas un retour à l'écran principal) : la
    // partie redémarre au cold open, il n'y a plus rien à afficher ici.
    controleur.fermer();
    afficherEcran(conteneur, false);
    actionReinitialiser();
  }

  function actionConfirmerNon() {
    controleurConfirmation.fermer();
    revenirAuMenuPrincipal();
  }

  conteneur.querySelector('#menu-reset').addEventListener('click', actionOuvrirConfirmation);
  conteneur.querySelector('#menu-fermer').addEventListener('click', fermerMenu);
  conteneur.querySelector('#menu-poche').addEventListener('click', actionOuvrirPoche);
  conteneur.querySelector('#menu-stats').addEventListener('click', actionOuvrirStats);
  conteneur.querySelector('#menu-construction').addEventListener('click', actionOuvrirConstruction);
  confirmation.querySelector('#menu-reset-oui').addEventListener('click', actionConfirmerOui);
  confirmation.querySelector('#menu-reset-non').addEventListener('click', actionConfirmerNon);

  // Ordre = ordre de navigation MOVE, aligné sur le HTML ci-dessus : langue,
  // musique, poche, stats, [construction], exporter, importer,
  // réinitialiser, fermer. ATTACK sur un élément déclenche exactement la même
  // fonction que son équivalent souris (pas une copie). Construction
  // (specs/05_construction-stations.md §3 : "sinon l'entrée n'apparaît pas")
  // est la SEULE entrée contextuelle de ce menu — contrairement au reste
  // (fixé une fois au chargement du module jusqu'ici), la liste focalisable
  // et le contrôleur sont donc reconstruits à CHAQUE ouverture
  // (construireMenuPrincipal, même patron que creerEcranListeGenerique#
  // reconstruire), pour qu'une entrée puisse apparaître/disparaître d'une
  // ouverture à l'autre selon la position du héros dans le monde.
  // `.parentNode` plutôt que `.closest('.menu-item')` : chaque bouton/select
  // ci-dessus est TOUJOURS l'enfant direct de sa `.menu-item` (gabarit
  // innerHTML ci-dessus) — évite une API DOM (`Element.closest`) que le faux
  // DOM minimal des tests headless (test_phase1_sd_menu_reset_invisible)
  // n'a jamais eu besoin d'implémenter jusqu'ici.
  const elConstruction = conteneur.querySelector('#menu-construction').parentNode;
  const ENTREES_FIXES_DEBUT = [
    { el: conteneur.querySelector('#menu-langue').parentNode, action: actionBasculerLangue },
    { el: conteneur.querySelector('#menu-musique').parentNode, action: actionBasculerMusique },
    { el: conteneur.querySelector('#menu-poche').parentNode, action: actionOuvrirPoche },
    { el: conteneur.querySelector('#menu-stats').parentNode, action: actionOuvrirStats },
  ];
  const ENTREES_FIXES_FIN = [
    { el: conteneur.querySelector('#menu-exporter').parentNode, action: () => exporterSauvegarde() },
    { el: conteneur.querySelector('#menu-importer').parentNode, action: () => inputImporter.click() },
    { el: conteneur.querySelector('#menu-reset').parentNode, action: actionOuvrirConfirmation },
    { el: conteneur.querySelector('#menu-fermer').parentNode, action: fermerMenu },
  ];

  // `element: conteneur` (SD_construction-ecrans-orphelins_2026-09-17 §2) :
  // c'est PRÉCISÉMENT ce contrôleur qui restait « ouvert » de façon invisible
  // en Construction — `actionOuvrirConstruction`/`actionOuvrirStats`/
  // `actionOuvrirPoche` cachent `conteneur` SANS jamais fermer `controleur`
  // (patron voulu, pour que `onFermerVersMenuPrincipal` retrouve le focus
  // sans le reconstruire) ; sans `element`, `.estOuvert()` restait vrai tant
  // que rien ne rappelait explicitement `.fermer()`.
  let controleur = creerControleurMenu([], { verbeAnnuler: 'skill_3', element: conteneur });
  let elementsItems = [];

  function actualiserFocusVisuel() {
    appliquerFocusVisuel(elementsItems, controleur.index());
  }

  // Reconstruit la liste focalisable du menu Pause à chaque ouverture —
  // `disponibiliteConstruction()` (fournie par main.js) décide si l'entrée
  // Construction y figure cette fois-ci. `el.onmouseenter =` (affectation,
  // pas addEventListener) : rebinder n'accumule jamais de gestionnaire
  // fantôme d'une ouverture à l'autre.
  function construireMenuPrincipal() {
    const visible = disponibiliteConstruction();
    elConstruction.hidden = !visible;
    elConstruction.style.display = visible ? '' : 'none';
    // `D-30` : seconde entrée contextuelle, même patron que Construction —
    // absente si le navigateur n'a pas l'API (elle ne pourrait qu'échouer).
    // Sur PC elle reste affichée : c'est le défaut retenu, F11 existe mais
    // l'entrée ne gêne personne et rend le réglage découvrable à la souris.
    const pleinEcranVisible = pleinEcranDisponible();
    elPleinEcran.hidden = !pleinEcranVisible;
    elPleinEcran.style.display = pleinEcranVisible ? '' : 'none';
    const entrees = [
      ...ENTREES_FIXES_DEBUT,
      ...(pleinEcranVisible ? [{ el: elPleinEcran, action: actionBasculerPleinEcran }] : []),
      ...(visible ? [{ el: elConstruction, action: actionOuvrirConstruction }] : []),
      ...ENTREES_FIXES_FIN,
    ];
    elementsItems = entrees.map((e) => e.el);
    controleur = creerControleurMenu(entrees.map((e) => e.action), { verbeAnnuler: 'skill_3', element: conteneur });
    controleur.ouvrir();
    elementsItems.forEach((el, i) => {
      el.onmouseenter = () => {
        controleur.definirIndex(i);
        actualiserFocusVisuel();
      };
    });
    actualiserFocusVisuel();
  }

  // Confirmation (§B) : même patron de focus, B = "Non" (index 1) — annuler
  // ne doit jamais réinitialiser par erreur. `traiterInput()` plus bas gère
  // le retour à l'écran principal, y compris quand B a fermé ce contrôleur
  // sans passer par `actions[]`.
  // `element: confirmation` — même raisonnement que `controleur` ci-dessus :
  // rien ne fermait ce contrôleur quand `actionOuvrirConfirmation` cachait
  // `conteneur` (cas symétrique, jamais observé en bug faute d'un mode qui en
  // sorte et y revienne comme Construction, mais même contrat partout,
  // §2 point 1).
  const controleurConfirmation = creerControleurMenu([actionConfirmerOui, actionConfirmerNon], {
    verbeAnnuler: 'skill_3', element: confirmation,
  });

  const elementsConfirmation = Array.from(confirmation.querySelectorAll('.menu-item'));

  function actualiserFocusConfirmation() {
    appliquerFocusVisuel(elementsConfirmation, controleurConfirmation.index());
  }

  elementsConfirmation.forEach((el, i) => {
    el.addEventListener('mouseenter', () => {
      controleurConfirmation.definirIndex(i);
      actualiserFocusConfirmation();
    });
  });

  return {
    ouvrir() {
      message.textContent = AUCUN_MESSAGE;
      afficherEcran(conteneur, true);
      afficherEcran(confirmation, false);
      afficherEcran(bandeauConstruction, false);
      controleurConfirmation.fermer();
      ecranPoche.fermer();
      ecranStats.fermer();
      ecranConstruction.fermer();
      construireMenuPrincipal();
      retraduireBase();
    },
    fermer() {
      controleur.fermer();
      controleurConfirmation.fermer();
      ecranPoche.fermer();
      ecranCraft.fermer();
      ecranCoffre.fermer();
      ecranStats.fermer();
      ecranConstruction.fermer();
      afficherEcran(conteneur, false);
      afficherEcran(confirmation, false);
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
    // la visibilité DOM du bandeau, rien de plus — le fait qu'il coïncide
    // avec `constructionActif()` (main.js) reste un appariement PAR
    // CONVENTION entre les 4 fonctions qui touchent les deux à la fois,
    // désormais vérifiable plutôt qu'implicite.
    bandeauEstOuvert() {
      return !bandeauConstruction.hidden;
    },
    estOuvert() {
      // Le bandeau n'entre PAS dans cet OR : carte §1.2/§4, SD_construction-
      // ecrans-orphelins §2 point 3 — main.js#maj() donne la priorité à
      // `menu.estOuvert()` sur la machine `construction` dans son dispatch
      // (jamais modifié par cette fiche, point 4) ; l'y inclure ferait gagner
      // le (faux) routage menu pendant tout le placement, pile le bug que ce
      // module vient de corriger. Le gel du jeu pendant le placement reste
      // couvert par `constructionActif()`, lu séparément par
      // `uiOuverteMaintenant()`/`uiOuverte` côté main.js.
      return (
        controleur.estOuvert() || controleurConfirmation.estOuvert() ||
        ecranPoche.estOuvert() || ecranCraft.estOuvert() || ecranCoffre.estOuvert() || ecranStats.estOuvert() ||
        ecranConstruction.estOuvert()
      );
    },
    // `D-30` : appelée par main.js sur `fullscreenchange` — le seul moment où
    // l'état réel peut changer sans que ce module ait rien demandé (Échap, un
    // geste système, ou la fin d'une bascule asynchrone). Le libellé se
    // réécrit alors depuis l'état réel, jamais depuis ce qu'on avait demandé.
    actualiserPleinEcran() {
      actualiserBoutonPleinEcran();
    },
    // Fournie par main.js (§3) : vrai si le héros est actuellement dans une
    // structure dont au moins une station est placable — décide si l'entrée
    // Construction apparaît, relue à CHAQUE ouverture du menu (jamais figée).
    definirDisponibiliteConstruction(fn) {
      disponibiliteConstruction = fn;
    },
    // Même patron que definirEntreesStats : liste des stations placable de la
    // structure courante, fournie après coup (dépend de la scène/position,
    // que ce module ne connaît pas).
    definirEntreesConstruction(fn) {
      fournisseurEntreesConstruction = fn;
    },
    // Fournit l'action réelle de reinitialiserPartie() après la construction
    // de l'orchestrateur (voir commentaire sur `actionReinitialiser`
    // ci-dessus) — jamais appelée avant, puisque le bouton qui y mène n'est
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
    // fois — la fermeture par focus cache déjà le bon conteneur ; celle par
    // B (verbeAnnuler) ne fait que fermer le contrôleur interne, donc on
    // resynchronise l'affichage ici dans tous les cas plutôt que de
    // dupliquer la condition à chaque site d'appel.
    traiterInput(etat) {
      if (controleurConfirmation.estOuvert()) {
        controleurConfirmation.traiterInput(etat);
        if (controleurConfirmation.estOuvert()) {
          actualiserFocusConfirmation();
        } else if (controleur.ouvertIntentionnellement()) {
          // Fermé par B ou par "Non" : retour à l'écran principal. Si
          // "Oui" a entre-temps fermé aussi `controleur`, rien à rouvrir.
          // `ouvertIntentionnellement()` (jamais `estOuvert()` ici) : à cet
          // instant `conteneur` est TOUJOURS caché (masqué par
          // `actionOuvrirConfirmation`, pas encore réaffiché) — `estOuvert()`
          // y serait donc systématiquement faux et ne distinguerait plus
          // "Oui a fermé `controleur` pour de vrai" de "cancel normal",
          // cassant CE retour précis (SD_construction-ecrans-
          // orphelins_2026-09-17, régression détectée par
          // test_phase1_sd_menu_reset_invisible_2026-09-15.js).
          revenirAuMenuPrincipal();
        } else {
          afficherEcran(confirmation, false);
        }
        return;
      }
      if (ecranCraft.estOuvert()) { ecranCraft.traiterInput(etat); return; }
      if (ecranCoffre.estOuvert()) { ecranCoffre.traiterInput(etat); return; }
      // Stats/Poche/Construction (§3.4/§3.6/05_construction-stations §3) :
      // ouverts DEPUIS le menu principal — leur `onFermer` (cf. construction
      // ci-dessus) réaffiche `conteneur` quel que soit le chemin de
      // fermeture, rien à faire de plus ici. Choisir une station dans
      // Construction quitte la liste SANS ce callback
      // (`ecranConstruction.fermerSansCallback()`, main.js#demarrerConstruction
      // -> `ouvrirPlacementConstruction`, jamais `menu.fermer()`), ce
      // chemin-ci ne gère donc que l'annulation (skill_3 -> retour au menu
      // principal, comme Poche/Stats).
      if (ecranStats.estOuvert()) { ecranStats.traiterInput(etat); return; }
      if (ecranPoche.estOuvert()) { ecranPoche.traiterInput(etat); return; }
      if (ecranConstruction.estOuvert()) { ecranConstruction.traiterInput(etat); return; }
      controleur.traiterInput(etat);
      if (controleur.estOuvert()) {
        actualiserFocusVisuel();
      } else {
        afficherEcran(conteneur, false);
      }
    },
  };
}

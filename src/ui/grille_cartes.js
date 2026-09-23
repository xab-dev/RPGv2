// Menus en grille de cartes (specs/08_menus-cartes.md) — le composant DOM.
//
// Un seul élément plein écran, qui affiche le niveau de cartes au SOMMET de la
// pile du menu. Tout ce qui se décide sans DOM vit dans `menu_cartes.js`
// (grille, voisin, cases, pile, confirmation) ; ici, on construit des éléments,
// on pose des classes, et on route trois verbes.
//
// Palier B : ce composant est une VUE de LA pile du menu entier
// (`menu_cartes.js#creerNavigationEcrans`). Il ne s'affiche ni ne se masque
// plus lui-même : il empile, il demande un retour, et la pile appelle
// `montrer` / `masquer`. Elle lui est injectée par `ui/menu.js`, qui y
// empile aussi ses écrans de liste ; sans elle (le banc d'essai, les tests du
// composant seul), il s'en crée une pour lui.
//
// Ce que ce module ne connaît pas, et ne doit jamais connaître :
//   - un écran, une carte ou une action par son id (le catalogue les apporte,
//     l'appelant apporte les fonctions : `actions`, `etats`, `ecrans`) ;
//   - une valeur de style (la feuille de style d'`index.html` décide de tout,
//     ce fichier ne pose que des noms de classes et des variables de GÉOMÉTRIE) ;
//   - l'audio, la sauvegarde, l'API plein écran, les drapeaux, le niveau.
//
// Rien ne touche le DOM au chargement du module : tout se passe dans
// `creerMenuCartes()`.
import {
  resoudreCases, premiereCasePresente, voisin, choisirGrille, nombreCases, iconeCarte,
  creerLecteurDirection, creerNavigationEcrans, construireConfirmation,
} from '../menu_cartes.js';

// Le faux DOM des tests headless n'a ni `setProperty` ni `setAttribute` : leur
// absence est un cas normal, comme celle de `scrollIntoView` dans `ui/menu.js`.
// `typeof` plutôt qu'un `try` : on ne masque aucune vraie erreur.
function poserVariable(el, nom, valeur) {
  if (!el.style || typeof el.style.setProperty !== 'function') return;
  if (valeur === null || valeur === undefined) el.style.removeProperty(nom);
  else el.style.setProperty(nom, valeur);
}
function poserAttribut(el, nom, valeur) {
  if (typeof el.setAttribute === 'function') el.setAttribute(nom, valeur);
}

// L'ABSENCE de message, nommée (même raison que `ui/menu.js#AUCUN_MESSAGE` :
// effacer un texte n'est pas en afficher un, ça n'a rien à faire dans les
// locales).
const AUCUN_MESSAGE = '';
// Et l'absence de contenu : vider la grille avant de la reconstruire.
const GRILLE_VIDE = '';

// `options` — tout est injecté :
//   menus            les écrans de `menus.json` (déjà validés au démarrage)
//   actions          { id: () => résultat }   cartes `action` et `bascule`
//   etats            { id: () => cléDeTexte } lecteurs de l'ÉTAT RÉEL des bascules
//   ecrans           { id: () => void }       écrans existants (Poche, Stats…)
//   evaluerCondition (condition) => bool      `flags.evaluate`, relu à chaque affichage
//   couleurAccent    () => '#rrggbb' | null   la `couleur_ui` du compagnon choisi
//   rectangleJeu     () => { x, y, unite } | null   le rectangle du canvas, en px de page
//   dessinerIcone    (canvas, idVisuel) => void     `ui/icone_canvas.js`
//   afficherEcran    (el, visible) => void    LE point d'affichage de `ui/menu.js`
//   seuilPoussee     `ui/menu.js#SEUIL_POUSSEE_MENU`
//   onFermer         () => void               le menu entier vient de se fermer
//                                             (sans objet si `navigation` est injectée :
//                                             c'est elle qui prévient)
//   navigation       LA pile du menu entier, partagée — optionnelle
export function creerMenuCartes({
  document, i18n, menus, actions = {}, etats = {}, ecrans = {},
  evaluerCondition = () => true, couleurAccent = () => null, rectangleJeu = () => null,
  dessinerIcone = () => {}, afficherEcran, seuilPoussee, onFermer = () => {},
  navigation = null,
}) {
  const nav = navigation || creerNavigationEcrans({ onFermer });
  const parId = new Map(menus.map((e) => [e.id, e]));
  const racine = menus.find((e) => e.racine === true);

  // Même découpe que tous les écrans depuis `D-42` : un EN-TÊTE FIGÉ qui porte
  // le titre et la sortie, un corps en dessous. Le corps garde son défilement
  // (`.ecran-ui-corps`) comme filet — il ne doit jamais servir : une grille de
  // six cases au plus ne déborde pas, c'est tout l'objet de la spec.
  // Le corps AVANT l'en-tête dans le DOM, l'en-tête au-dessus à l'écran
  // (`order: -1`) : la sortie reste le dernier élément du document, comme sur
  // les sept autres écrans.
  const el = document.createElement('div');
  el.className = 'ecran-ui ecran-cartes';
  const corps = document.createElement('div');
  corps.className = 'ecran-ui-corps cartes-corps';
  const grille = document.createElement('div');
  grille.className = 'cartes-grille';
  corps.appendChild(grille);

  const entete = document.createElement('div');
  entete.className = 'ecran-ui-entete cartes-entete';
  const titre = document.createElement('h2');
  titre.className = 'cartes-titre';
  const message = document.createElement('p');
  message.className = 'cartes-message';
  // `[X]` à la racine, `[←]` plus bas : LA MÊME place à l'écran (la mémoire du
  // pouce prime, §4.2), seule l'icône change. Un `<div>`, pas un `<button>` —
  // voir `creerCarte`.
  const boutonEntete = document.createElement('div');
  boutonEntete.className = 'cartes-bouton-entete';
  // Repère stable pour les tests et l'outillage (l'icône et le mot changent
  // selon la profondeur, la classe est une affaire de style).
  boutonEntete.dataset.sortie = 'menu';
  const iconeEntete = document.createElement('canvas');
  iconeEntete.className = 'carte-icone';
  // Le mot, à côté de l'icône. Masqué par la feuille de style : « à essayer en
  // jeu : un simple [X] / [←] sans texte » (décision 1 de Xav). Le montrer est
  // une ligne de CSS, pas une ligne de code.
  const motEntete = document.createElement('span');
  motEntete.className = 'cartes-bouton-mot';
  boutonEntete.appendChild(iconeEntete);
  boutonEntete.appendChild(motEntete);
  entete.appendChild(titre);
  entete.appendChild(message);
  entete.appendChild(boutonEntete);

  el.appendChild(corps);
  el.appendChild(entete);
  afficherEcran(el, false);
  document.body.appendChild(el);

  const lecteur = creerLecteurDirection(seuilPoussee);
  let cases = []; // cases du sommet, telles qu'affichées (carte ou null)
  let elementsCases = []; // l'élément DOM de chaque case, même rang
  let colonnes = 2;

  // Classes d'une carte, recalculées en entier à chaque changement de focus
  // (`className =`, jamais `classList` : le faux DOM des tests n'en a pas).
  // Le focus n'est JAMAIS la couleur seule : la feuille de style épaissit la
  // bordure, pose un halo et éclaircit la carte (§4.5).
  function classesCarte(carte, focalisee) {
    return [
      'carte', `carte-${carte.type}`,
      carte.danger ? 'carte-danger' : '',
      focalisee ? 'carte-focus' : '',
    ].filter(Boolean).join(' ');
  }

  // Le niveau de cartes affiché : le sommet de la pile, s'il est à nous. Un
  // écran de liste peut être posé au-dessus — alors ce composant n'a rien à
  // afficher, et rien à écrire dans un niveau qui n'est pas le sien.
  function niveauCourant() {
    const sommet = nav.sommet();
    return sommet && sommet.vue === vue ? sommet : null;
  }

  // Un niveau de cartes : l'écran, et la case focalisée — c'est parce que le
  // focus vit DANS le niveau que « Retour » le rend à la carte qui avait
  // ouvert l'écran qu'on quitte (§4.3).
  function niveauPour(ecran) {
    return { vue, id: ecran.id, ecran, focus: null };
  }

  function appliquerFocus() {
    const niveau = niveauCourant();
    const focus = niveau ? niveau.focus : -1;
    elementsCases.forEach((elCase, i) => {
      if (cases[i]) elCase.className = classesCarte(cases[i], i === focus);
    });
  }

  function poserFocus(i) {
    const niveau = niveauCourant();
    if (!niveau || !cases[i]) return; // une case vide n'est jamais focalisable
    niveau.focus = i;
    appliquerFocus();
  }

  // Le texte sous le titre : la phrase du catalogue, ou — pour une bascule —
  // l'ÉTAT RÉEL, relu à la source à chaque affichage (patron de l'entrée Plein
  // écran de `D-30` : jamais un booléen tenu par le menu).
  function textePhrase(carte) {
    if (carte.type === 'bascule') return i18n.t(etats[carte.etat]());
    return i18n.t(carte.cle_phrase);
  }

  // Un `<div>`, pas un `<button>`. Un bouton natif GARDE le focus du
  // navigateur après un clic, et Espace l'active — or Espace est aussi le
  // verbe ATTACK, qui valide la carte focalisée. Une bascule cliquée puis
  // validée au clavier s'activerait deux fois dans la même frame : elle
  // reviendrait à son état de départ, sans que rien ne bouge à l'écran.
  function creerCarte(carte, i) {
    const elCarte = document.createElement('div');
    elCarte.dataset.case = String(i);
    elCarte.dataset.carte = carte.id;
    poserAttribut(elCarte, 'role', 'button');
    const icone = document.createElement('canvas');
    icone.className = 'carte-icone';
    icone.dataset.icone = iconeCarte(carte, evaluerCondition);
    const textes = document.createElement('div');
    textes.className = 'carte-textes';
    const elTitre = document.createElement('span');
    elTitre.className = 'carte-titre';
    elTitre.textContent = i18n.t(carte.cle_titre);
    const elPhrase = document.createElement('span');
    elPhrase.className = carte.type === 'bascule' ? 'carte-phrase carte-etat' : 'carte-phrase';
    elPhrase.textContent = textePhrase(carte);
    textes.appendChild(elTitre);
    textes.appendChild(elPhrase);
    elCarte.appendChild(icone);
    elCarte.appendChild(textes);
    // Souris : le survol pose le focus. Tactile : un appui active directement
    // (§4.3) — le clic pose le focus PUIS active, par la même fonction que le
    // verbe ATTACK (`activer`) : un seul chemin, pas de parité à surveiller.
    elCarte.addEventListener('mouseenter', () => poserFocus(i));
    elCarte.addEventListener('click', () => {
      poserFocus(i);
      activer(i);
    });
    return elCarte;
  }

  function dessinerIcones() {
    for (const canvas of el.querySelectorAll('.carte-icone')) {
      if (canvas.dataset.icone) dessinerIcone(canvas, canvas.dataset.icone);
    }
  }

  // Reconstruit l'affichage du sommet de la pile. Appelée à chaque
  // changement d'écran ET à chaque changement d'état (une bascule, la langue,
  // `fullscreenchange`) : les conditions et les états sont relus, jamais
  // mémorisés.
  function rendre() {
    const sommet = niveauCourant();
    if (!sommet) return;
    const ecran = sommet.ecran;
    colonnes = choisirGrille(nombreCases(ecran)).colonnes;
    cases = resoudreCases(ecran, evaluerCondition);
    // Le focus mémorisé peut viser une carte qui vient de disparaître (une
    // condition devenue fausse pendant qu'un sous-écran était ouvert).
    if (sommet.focus === null || sommet.focus === undefined || !cases[sommet.focus]) {
      sommet.focus = premiereCasePresente(cases);
    }

    const aLaRacine = nav.profondeur() === 1;
    titre.textContent = i18n.t(ecran.cle_titre);
    const cleSortie = aLaRacine ? 'menu.fermer' : 'menu.retour';
    motEntete.textContent = i18n.t(cleSortie);
    poserAttribut(boutonEntete, 'aria-label', i18n.t(cleSortie));
    iconeEntete.dataset.icone = aLaRacine ? racine.icone_fermer : racine.icone_retour;

    grille.dataset.colonnes = String(colonnes);
    grille.innerHTML = GRILLE_VIDE;
    elementsCases = cases.map((carte, i) => {
      let elCase;
      if (carte) {
        elCase = creerCarte(carte, i);
      } else {
        // Case vide : elle tient sa place dans la grille (positions stables),
        // elle ne dessine rien, et rien ne peut la focaliser — ni écouteur,
        // ni rôle, ni classe de carte.
        elCase = document.createElement('div');
        elCase.className = 'carte-vide';
        elCase.dataset.case = String(i);
        poserAttribut(elCase, 'aria-hidden', 'true');
      }
      grille.appendChild(elCase);
      return elCase;
    });
    appliquerFocus();
    dessinerIcones();
  }

  // La boîte du menu se cale sur LE RECTANGLE DU CANVAS (§4.4), et une unité
  // `--u` vaut la hauteur de cette boîte ÷ 270 : le menu se dessine comme
  // s'il vivait en 480 × 270, sur téléphone comme sur grand écran. Ce ne sont
  // pas des valeurs de style mais de la GÉOMÉTRIE, que seul l'appelant
  // connaît (`render.js#calculerRectanglePresentation`) ; la feuille de style
  // en fait ce qu'elle veut.
  function actualiserGeometrie() {
    const rect = rectangleJeu();
    if (!rect) return;
    poserVariable(el, '--jeu-x', `${rect.x}px`);
    poserVariable(el, '--jeu-y', `${rect.y}px`);
    poserVariable(el, '--u', `${rect.unite}px`);
    // Les icônes sont des canvas : leur taille en pixels suit celle de la boîte.
    if (!el.hidden) dessinerIcones();
  }

  // L'accent est relu à CHAQUE ouverture : le joueur peut ouvrir le menu avant
  // d'avoir choisi son follet (accent neutre, le défaut de la feuille de
  // style), puis après.
  function actualiserAccent() {
    poserVariable(el, '--menu-accent', couleurAccent());
  }

  // Ce que la pile appelle. `montrer` relit TOUT (accent, géométrie, cases,
  // états) : le joueur peut revenir d'un écran de liste, ou d'un placement de
  // station, après que le monde a changé.
  const vue = {
    montrer() {
      actualiserAccent();
      afficherEcran(el, true);
      actualiserGeometrie();
      rendre();
    },
    masquer() {
      afficherEcran(el, false);
    },
    // L'état RÉEL de l'élément : c'est lui que lit `nav.estOuvert()`.
    estVisible: () => !el.hidden,
    traiterInput(etat) {
      const niveau = niveauCourant();
      if (!niveau) return;
      if (etat.skill_3 && etat.skill_3.pressed) {
        retour();
        return;
      }
      const direction = lecteur.lire(etat.move);
      if (direction) {
        poserFocus(voisin(niveau.focus, direction, colonnes, cases.length, (i) => cases[i] !== null));
      }
      if (etat.attack && etat.attack.pressed) activer(niveau.focus);
    },
  };

  // Retour (B, `[←]`, « Non, revenir ») : dépile UN écran — c'est la pile qui
  // le fait, et qui ferme tout s'il n'y a plus rien dessous. `[X]` et B à la
  // racine font donc la même chose par la même fonction.
  function retour() {
    message.textContent = AUCUN_MESSAGE;
    nav.retour();
  }

  // « Agit, puis ferme » (§4.1).
  function executerAction(carte) {
    actions[carte.action]();
    nav.fermerTout();
  }

  // Une bascule change un état SUR PLACE, l'écran reste ouvert. Son résultat
  // peut être une promesse (le plein écran est asynchrone) et peut porter une
  // clé de message : c'est ainsi qu'un REFUS s'annonce dans l'en-tête en
  // laissant la carte inchangée (comportement de `D-30`, conservé). On
  // transporte une CLÉ, jamais un texte composé.
  function executerBascule(carte) {
    const conclure = (resultat) => {
      // Le menu a pu être fermé entre-temps, ou un écran de liste posé dessus.
      if (!niveauCourant()) return;
      if (resultat && resultat.cleMessage) message.textContent = i18n.t(resultat.cleMessage);
      rendre();
    };
    const resultat = actions[carte.action]();
    if (resultat && typeof resultat.then === 'function') resultat.then(conclure, () => conclure(null));
    else conclure(resultat);
  }

  function activer(i) {
    const carte = cases[i];
    if (!carte) return;
    message.textContent = AUCUN_MESSAGE;
    if (carte.interne === 'retour') {
      retour();
    } else if (carte.interne === 'confirmer') {
      executerAction(carte);
    } else if (carte.type === 'dossier') {
      const cible = parId.get(carte.cible);
      if (cible) {
        nav.empiler(niveauPour(cible));
      } else {
        // Écran existant (Poche, Stats, Construction) : il est plein écran lui
        // aussi. Dans le jeu, la fonction enregistrée EMPILE son écran sur la
        // même pile, qui masque alors cette grille ; le retour la remontrera,
        // focus resté sur sa carte. On masque quand même le sommet d'abord :
        // ce composant ne sait pas ce que fait la fonction, et un appelant
        // sans pile partagée (le banc d'essai) rappelle `reafficher()`.
        nav.masquerSommet();
        ecrans[carte.cible]();
      }
    } else if (carte.type === 'bascule') {
      executerBascule(carte);
    } else if (carte.danger) {
      nav.empiler(niveauPour(construireConfirmation(carte, racine.icone_retour)));
    } else {
      executerAction(carte);
    }
  }

  boutonEntete.addEventListener('click', retour);

  return {
    element: el,
    // Ouvre le menu à sa RACINE : ce qui restait dans la pile est oublié.
    ouvrir() {
      lecteur.reinitialiser();
      message.textContent = AUCUN_MESSAGE;
      nav.ouvrir(niveauPour(racine));
    },
    // Fermeture PROGRAMMATIQUE : ne rappelle pas `onFermer`, c'est l'appelant
    // qui ferme. Même point de passage que toutes les autres fermetures.
    fermer() {
      lecteur.reinitialiser();
      nav.fermerTout({ prevenir: false });
    },
    // « Ce composant est ouvert » = le menu est ouvert ET c'est un niveau de
    // cartes qui est au sommet. Pendant qu'un écran de liste est posé dessus,
    // ou que le sommet est masqué, ce n'est PAS lui qui est ouvert.
    estOuvert: () => nav.estOuvert() && niveauCourant() !== null,
    // Pour un appelant SANS pile partagée (banc d'essai, tests du composant) :
    // l'écran qu'une carte dossier avait ouvert vient de se fermer. Sans effet
    // si le menu a été fermé entre-temps.
    reafficher() {
      if (niveauCourant()) nav.remontrerSommet();
    },
    rafraichir() {
      if (nav.estOuvert() && niveauCourant()) rendre();
    },
    actualiserGeometrie,
    traiterInput(etat) {
      nav.traiterInput(etat);
    },
    // Observation pour les tests headless (le DOM réel n'est jamais exercé) —
    // même patron que les accesseurs de l'orchestrateur. `ecran` est l'id du
    // SOMMET de la pile, quel qu'il soit ; `focus` et `cases` ne parlent que
    // d'un niveau de cartes.
    obtenirEtat: () => ({
      profondeur: nav.profondeur(),
      ecran: nav.sommet() ? nav.sommet().id : null,
      focus: niveauCourant() ? niveauCourant().focus : -1,
      cases: cases.map((c) => (c ? c.id : null)),
      colonnes,
    }),
  };
}

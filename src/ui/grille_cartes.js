// Menus en grille de cartes (specs/08_menus-cartes.md) — le composant DOM.
//
// Un seul élément plein écran, qui affiche le SOMMET d'une pile d'écrans de
// cartes. Tout ce qui se décide sans DOM vit dans `menu_cartes.js` (grille,
// voisin, cases, pile, confirmation) ; ici, on construit des éléments, on pose
// des classes, et on route trois verbes.
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
  resoudreCases, premiereCasePresente, voisin, choisirGrille, nombreCases,
  creerLecteurDirection, creerPileMenus, construireConfirmation,
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
export function creerMenuCartes({
  document, i18n, menus, actions = {}, etats = {}, ecrans = {},
  evaluerCondition = () => true, couleurAccent = () => null, rectangleJeu = () => null,
  dessinerIcone = () => {}, afficherEcran, seuilPoussee, onFermer = () => {},
}) {
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

  const pile = creerPileMenus();
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

  function appliquerFocus() {
    const focus = pile.sommet() ? pile.sommet().focus : -1;
    elementsCases.forEach((elCase, i) => {
      if (cases[i]) elCase.className = classesCarte(cases[i], i === focus);
    });
  }

  function poserFocus(i) {
    if (!cases[i]) return; // une case vide n'est jamais focalisable
    pile.definirFocus(i);
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
    icone.dataset.icone = carte.icone;
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
    const sommet = pile.sommet();
    if (!sommet) return;
    const ecran = sommet.ecran;
    colonnes = choisirGrille(nombreCases(ecran)).colonnes;
    cases = resoudreCases(ecran, evaluerCondition);
    // Le focus mémorisé peut viser une carte qui vient de disparaître (une
    // condition devenue fausse pendant qu'un sous-écran était ouvert).
    if (sommet.focus === null || sommet.focus === undefined || !cases[sommet.focus]) {
      sommet.focus = premiereCasePresente(cases);
    }

    const aLaRacine = pile.profondeur() === 1;
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

  function montrer() {
    actualiserAccent();
    afficherEcran(el, true);
    actualiserGeometrie();
    rendre();
  }

  function fermerTout() {
    pile.vider();
    lecteur.reinitialiser();
    afficherEcran(el, false);
    onFermer();
  }

  // Retour (B, `[←]`, « Non, revenir ») : dépile UN écran. Le niveau retrouvé
  // a gardé son focus — c'est la carte qui avait ouvert l'écran qu'on quitte.
  // À la racine, il n'y a plus rien à dépiler : on ferme. `[X]` et B y font
  // donc la même chose par la même fonction.
  function retour() {
    message.textContent = AUCUN_MESSAGE;
    if (pile.profondeur() <= 1) {
      fermerTout();
      return;
    }
    pile.depiler();
    rendre();
  }

  // « Agit, puis ferme » (§4.1).
  function executerAction(carte) {
    actions[carte.action]();
    fermerTout();
  }

  // Une bascule change un état SUR PLACE, l'écran reste ouvert. Son résultat
  // peut être une promesse (le plein écran est asynchrone) et peut porter une
  // clé de message : c'est ainsi qu'un REFUS s'annonce dans l'en-tête en
  // laissant la carte inchangée (comportement de `D-30`, conservé). On
  // transporte une CLÉ, jamais un texte composé.
  function executerBascule(carte) {
    const conclure = (resultat) => {
      if (pile.profondeur() === 0) return; // le menu a été fermé entre-temps
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
        pile.empiler(cible, null);
        rendre();
      } else {
        // Écran existant (Poche, Stats, Construction) : il est plein écran lui
        // aussi, donc on se MASQUE sans rien dépiler — il rappellera
        // `reafficher()` en se fermant, et le focus sera resté sur sa carte.
        afficherEcran(el, false);
        ecrans[carte.cible]();
      }
    } else if (carte.type === 'bascule') {
      executerBascule(carte);
    } else if (carte.danger) {
      pile.empiler(construireConfirmation(carte, racine.icone_retour), null);
      rendre();
    } else {
      executerAction(carte);
    }
  }

  boutonEntete.addEventListener('click', retour);

  return {
    element: el,
    ouvrir() {
      pile.vider();
      lecteur.reinitialiser();
      message.textContent = AUCUN_MESSAGE;
      pile.empiler(racine, null);
      montrer();
    },
    // Fermeture PROGRAMMATIQUE (`menu.fermer()`) : ne rappelle pas `onFermer`,
    // c'est l'appelant qui ferme.
    fermer() {
      pile.vider();
      lecteur.reinitialiser();
      afficherEcran(el, false);
    },
    // Même contrat que tous les contrôleurs de `ui/menu.js` : intention ET
    // DOM réellement visible, jamais l'un sans l'autre. Pendant qu'un écran
    // existant est ouvert par-dessus, la pile n'est pas vide mais l'élément
    // est caché : ce composant n'est PAS « ouvert », c'est l'autre qui l'est.
    estOuvert: () => pile.profondeur() > 0 && !el.hidden,
    // Un écran existant vient de se fermer : on réapparaît tel qu'on était.
    // Sans effet si le menu a été fermé entre-temps (pile vide).
    reafficher() {
      if (pile.profondeur() === 0) return;
      montrer();
    },
    rafraichir() {
      if (pile.profondeur() > 0 && !el.hidden) rendre();
    },
    actualiserGeometrie,
    traiterInput(etat) {
      if (pile.profondeur() === 0 || el.hidden) return;
      if (etat.skill_3 && etat.skill_3.pressed) {
        retour();
        return;
      }
      const direction = lecteur.lire(etat.move);
      if (direction) {
        const total = cases.length;
        poserFocus(voisin(pile.sommet().focus, direction, colonnes, total, (i) => cases[i] !== null));
      }
      if (etat.attack && etat.attack.pressed) activer(pile.sommet().focus);
    },
    // Observation pour les tests headless (le DOM réel n'est jamais exercé) —
    // même patron que les accesseurs de l'orchestrateur.
    obtenirEtat: () => ({
      profondeur: pile.profondeur(),
      ecran: pile.sommet() ? pile.sommet().ecran.id : null,
      focus: pile.sommet() ? pile.sommet().focus : -1,
      cases: cases.map((c) => (c ? c.id : null)),
      colonnes,
    }),
  };
}

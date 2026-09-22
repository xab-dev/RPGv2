// Écran « maître-détail » (specs/08_menus-cartes.md, palier C) — le composant
// DOM des grosses pages : une GRILLE DE TUILES à gauche (un objet, une recette,
// une stat, une station), la FICHE de la tuile focalisée à droite.
//
// Il est aux écrans de liste ce que `ui/grille_cartes.js` est au menu Pause :
// même boîte calée sur le rectangle du canvas, même unité `--u`, mêmes jetons
// de style, même en-tête figé qui porte LA sortie au même endroit. Et comme
// lui c'est une VUE de la pile du menu (`menu_cartes.js#creerNavigationEcrans`) :
// il ne s'affiche ni ne se masque lui-même.
//
// Ce que ce module ne connaît pas, et ne doit jamais connaître : un objet, une
// recette, une stat ou une station par son id ; une valeur de style ; la
// sauvegarde, la poche, le registre. L'appelant lui donne des ENTRÉES déjà
// résolues et déjà traduites :
//
//   { titre, icone?, quantite?, marque?, lignes?, libelleAction?, grisee?, action, groupe? }
//
//   titre          le nom — sous la tuile, et en tête de la fiche
//   icone          un id de `visuels.json` (dessiné par `dessinerIcone`, injecté)
//   quantite       le nombre affiché en pastille sur la tuile (absent = pas de pastille)
//   marque         vrai = la tuile porte un repère (« équipé ») — une forme, pas une couleur seule
//   lignes         le détail de la fiche : une chaîne, ou `{ texte, icone? }` quand la
//                  ligne montre AUSSI une silhouette (`D-103` — l'ingrédient d'une
//                  recette, son coût en monnaie). L'icône est un id de `visuels.json`,
//                  dessinée par le même `dessinerIcone` que les tuiles
//   libelleAction  ce que fait A : le texte du bouton de la fiche (absent = pas de bouton)
//   grisee         l'action a peu de chances d'aboutir — un INDICE visuel, jamais un verrou :
//                  le bouton retente quand même l'action réelle, le résultat fait foi
//                  (règle des écrans de liste depuis la Phase 3)
//   action         () => void
//   groupe         un intertitre : les entrées d'un même groupe se suivent, un groupe
//                  commence sur une rangée neuve (Coffre : « Poche » / « Coffre »)
//
// Un niveau de la pile porte : { vue, id, titre, obtenirEntrees, sousTitre?, texteVide? }
//   sousTitre      () => chaîne, relue à chaque affichage (Stats : les points libres)
//   texteVide      ce que dit la fiche quand il n'y a aucune entrée
//   nomsMasques    vrai = les tuiles ne montrent que leur image (`D-07`, Poche et
//                  Coffre) : le nom reste dans la fiche et dans l'étiquette
//                  d'accessibilité de la tuile. Une tuile SANS image garde son nom,
//                  sinon elle serait une case vide que rien ne distingue
//
// LE GESTE, et pourquoi il diffère de la grille de cartes : ici une tuile se
// SÉLECTIONNE (survol, clic, appui), et c'est le BOUTON DE LA FICHE qui agit.
// Sur une carte du menu, tout est écrit sur la carte : l'appui peut agir
// directement. Sur une tuile il n'y a qu'une icône — ce que l'action va faire
// n'est écrit que dans la fiche, et au doigt on ne la verrait jamais avant
// d'avoir agi. Aux verbes rien ne change : le stick sélectionne (la fiche
// suit), A agit. Le bouton et A appellent la MÊME fonction (`activer`).
//
// Rien ne touche le DOM au chargement du module.
import { voisin, creerLecteurDirection, disposerTuiles, replierFocus, COLONNES_TUILES } from '../menu_cartes.js';

// Mêmes précautions que `ui/grille_cartes.js` : le faux DOM des tests n'a ni
// `setProperty`, ni `setAttribute`, ni `scrollIntoView`. `typeof`, jamais `try`.
function poserVariable(el, nom, valeur) {
  if (!el.style || typeof el.style.setProperty !== 'function') return;
  if (valeur === null || valeur === undefined) el.style.removeProperty(nom);
  else el.style.setProperty(nom, valeur);
}
function poserAttribut(el, nom, valeur) {
  if (typeof el.setAttribute === 'function') el.setAttribute(nom, valeur);
}

const VIDE = '';

// Une ligne de fiche, sous sa forme unique (`D-103`). Elle en a DEUX en
// entrée — une chaîne (le cas de loin le plus courant : une catégorie, un
// effet, une raison de refus) et `{ texte, icone? }` — parce que la seconde
// n'a de sens que là où une silhouette existe, et qu'obliger les quatre-vingts
// autres lignes à s'emballer dans un objet ne dirait rien de plus.
//
// Une seule fonction les ramène à la même forme, et c'est elle qu'on teste :
// tant que la vue démêlait les deux cas au fil du rendu, la règle vivait dans
// du DOM, donc hors d'atteinte des tests headless (même raison que `D-71`).
// Pure, exportée.
export function normaliserLigneFiche(ligne) {
  if (typeof ligne === 'string') return { texte: ligne, icone: null };
  return { texte: (ligne && ligne.texte) || VIDE, icone: (ligne && ligne.icone) || null };
}

// `options` — tout est injecté :
//   afficherEcran   LE point d'affichage de `ui/menu.js`
//   seuilPoussee    `ui/menu.js#SEUIL_POUSSEE_MENU`
//   couleurAccent, rectangleJeu, dessinerIcone   comme la grille de cartes
//   onRetour        () => void   le `retour()` de la pile — `[←]` et B l'appellent tous les deux
//   aLaRacine       () => bool   rien sous cet écran dans la pile : la sortie FERME (`[X]`)
//   icones          { fermer, retour }   ids de `visuels.json`, lus sur l'écran racine du catalogue
//   glypheAction    () => chaîne | null  le glyphe du verbe qui actionne le bouton de la fiche
//                                        (« A », « Espace ») ; null = ne rien afficher (au doigt,
//                                        le bouton se touche : il n'a pas de verbe à annoncer)
export function creerEcranFiches({
  document, i18n, afficherEcran, seuilPoussee,
  couleurAccent = () => null, rectangleJeu = () => null, dessinerIcone = () => {},
  onRetour, aLaRacine = () => false, icones = { fermer: null, retour: null },
  glypheAction = () => null,
}) {
  // Même découpe que tous les écrans depuis `D-42`, même ordre dans le DOM :
  // le corps d'abord, l'en-tête (donc la sortie) en dernier enfant, remonté à
  // l'écran par `order: -1`.
  const el = document.createElement('div');
  el.className = 'ecran-ui ecran-cartes ecran-fiches';
  const corps = document.createElement('div');
  corps.className = 'ecran-ui-corps fiches-corps';
  const grille = document.createElement('div');
  grille.className = 'fiches-tuiles';
  const fiche = document.createElement('div');
  fiche.className = 'fiche';
  corps.appendChild(grille);
  corps.appendChild(fiche);

  const entete = document.createElement('div');
  entete.className = 'ecran-ui-entete cartes-entete';
  const titre = document.createElement('h2');
  titre.className = 'cartes-titre';
  // À la place qu'occupe le message d'en-tête sur la grille de cartes : le
  // sous-titre de l'écran. Sa propre classe — ce n'est pas le même rôle.
  const sousTitre = document.createElement('p');
  sousTitre.className = 'fiches-sous-titre';
  const boutonEntete = document.createElement('div');
  boutonEntete.className = 'cartes-bouton-entete';
  boutonEntete.dataset.sortie = 'ecran';
  const iconeEntete = document.createElement('canvas');
  iconeEntete.className = 'carte-icone';
  const motEntete = document.createElement('span');
  motEntete.className = 'cartes-bouton-mot';
  boutonEntete.appendChild(iconeEntete);
  boutonEntete.appendChild(motEntete);
  entete.appendChild(titre);
  entete.appendChild(sousTitre);
  entete.appendChild(boutonEntete);

  el.appendChild(corps);
  el.appendChild(entete);
  afficherEcran(el, false);
  document.body.appendChild(el);

  const lecteur = creerLecteurDirection(seuilPoussee);
  let niveau = null; // le niveau affiché (c'est lui qui porte le focus)
  let entrees = [];
  let cases = []; // index d'entrée, ou null (fin de rangée d'un groupe)
  let elementsCases = [];

  const entreeFocalisee = () => (niveau && cases[niveau.focus] !== null && cases[niveau.focus] !== undefined
    ? entrees[cases[niveau.focus]] : null);

  function classesTuile(entree, focalisee) {
    return ['tuile', entree.grisee ? 'tuile-grisee' : '', focalisee ? 'carte-focus' : ''].filter(Boolean).join(' ');
  }

  function appliquerFocus() {
    elementsCases.forEach((elCase, i) => {
      if (cases[i] === null) return;
      const focalisee = i === niveau.focus;
      elCase.className = classesTuile(entrees[cases[i]], focalisee);
      // La grille de tuiles défile à l'intérieur d'elle-même quand elle déborde
      // (plus de trois rangées) : le défilement suit le focus, et lui seul.
      if (focalisee && typeof elCase.scrollIntoView === 'function') {
        elCase.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }

  // La fiche de la tuile focalisée — ou le texte « rien ici » de l'écran.
  function rendreFiche() {
    fiche.innerHTML = VIDE;
    const entree = entreeFocalisee();
    if (!entree) {
      const vide = document.createElement('p');
      vide.className = 'fiche-vide';
      vide.textContent = (niveau && niveau.texteVide) || VIDE;
      fiche.appendChild(vide);
      return;
    }
    const tete = document.createElement('div');
    tete.className = 'fiche-tete';
    if (entree.icone) {
      const icone = document.createElement('canvas');
      icone.className = 'carte-icone fiche-icone';
      icone.dataset.icone = entree.icone;
      tete.appendChild(icone);
    }
    const elTitre = document.createElement('span');
    elTitre.className = 'fiche-titre';
    elTitre.textContent = entree.titre;
    tete.appendChild(elTitre);
    fiche.appendChild(tete);

    const lignes = document.createElement('div');
    lignes.className = 'fiche-lignes';
    for (const brute of entree.lignes || []) {
      const { texte, icone } = normaliserLigneFiche(brute);
      const ligne = document.createElement('p');
      ligne.className = icone ? 'fiche-ligne fiche-ligne-icone' : 'fiche-ligne';
      if (icone) {
        // Le canvas porte la classe commune `carte-icone` : c'est elle que
        // `dessinerIcones` balaie, ici comme sur une tuile ou une carte — il
        // n'existe toujours qu'un seul chemin pour dessiner une silhouette
        // dans le DOM.
        const elIcone = document.createElement('canvas');
        elIcone.className = 'carte-icone fiche-ligne-vignette';
        elIcone.dataset.icone = icone;
        ligne.appendChild(elIcone);
        const elTexte = document.createElement('span');
        elTexte.textContent = texte;
        ligne.appendChild(elTexte);
      } else {
        ligne.textContent = texte;
      }
      lignes.appendChild(ligne);
    }
    fiche.appendChild(lignes);

    if (entree.libelleAction) {
      // Un `<div>`, pas un `<button>` — même raison que les cartes : un bouton
      // natif garde le focus du navigateur après un clic, et Espace (= ATTACK)
      // l'activerait une seconde fois dans la même frame.
      const bouton = document.createElement('div');
      bouton.className = entree.grisee ? 'fiche-action fiche-action-grisee' : 'fiche-action';
      bouton.dataset.action = 'fiche';
      poserAttribut(bouton, 'role', 'button');
      // À la manette et au clavier le bouton n'est pas focalisable — c'est la
      // TUILE qui l'est, et A agit. Le glyphe du verbe, posé sur le bouton,
      // fait le lien : « ce bouton, c'est A ».
      const glyphe = glypheAction();
      if (glyphe) {
        const elGlyphe = document.createElement('span');
        elGlyphe.className = 'fiche-action-glyphe';
        elGlyphe.textContent = glyphe;
        bouton.appendChild(elGlyphe);
      }
      const libelle = document.createElement('span');
      libelle.className = 'fiche-action-libelle';
      libelle.textContent = entree.libelleAction;
      bouton.appendChild(libelle);
      bouton.addEventListener('click', () => activer());
      fiche.appendChild(bouton);
    }
    dessinerIcones(fiche);
  }

  function poserFocus(i) {
    if (!niveau || cases[i] === null || cases[i] === undefined || i === niveau.focus) return;
    niveau.focus = i;
    appliquerFocus();
    rendreFiche();
  }

  function creerTuile(entree, i) {
    const elTuile = document.createElement('div');
    elTuile.dataset.tuile = String(cases[i]);
    poserAttribut(elTuile, 'role', 'button');
    if (entree.icone) {
      const icone = document.createElement('canvas');
      icone.className = 'carte-icone tuile-icone';
      icone.dataset.icone = entree.icone;
      elTuile.appendChild(icone);
    }
    // `D-07` : le nom se CACHE, il ne se supprime pas — la tuile le porte en
    // étiquette, et la fiche d'à côté l'écrit en tête.
    poserAttribut(elTuile, 'aria-label', entree.titre);
    if (!(niveau.nomsMasques && entree.icone)) {
      const nom = document.createElement('span');
      nom.className = 'tuile-nom';
      nom.textContent = entree.titre;
      elTuile.appendChild(nom);
    }
    if (entree.quantite !== undefined && entree.quantite !== null) {
      const quantite = document.createElement('span');
      quantite.className = 'tuile-quantite';
      quantite.textContent = String(entree.quantite);
      elTuile.appendChild(quantite);
    }
    if (entree.marque) {
      // Une FORME (un coin plein, dessiné par la feuille de style), jamais la
      // couleur seule.
      const marque = document.createElement('span');
      marque.className = 'tuile-marque';
      elTuile.appendChild(marque);
    }
    // Survol, clic, appui : SÉLECTIONNER. Agir, c'est le bouton de la fiche.
    elTuile.addEventListener('mouseenter', () => poserFocus(i));
    elTuile.addEventListener('click', () => poserFocus(i));
    return elTuile;
  }

  function dessinerIcones(racine) {
    for (const canvas of racine.querySelectorAll('.carte-icone')) {
      if (canvas.dataset.icone) dessinerIcone(canvas, canvas.dataset.icone);
    }
  }

  // Reconstruit tout depuis des entrées relues À NEUF : à l'affichage, et après
  // chaque action (un craft grise la recette, un dépôt vide une tuile). Le
  // focus reste sur SA CASE ; si elle a disparu, il va à la tuile présente la
  // plus proche avant elle — jamais un saut en tête de grille après chaque
  // dépôt au coffre.
  function rendre() {
    if (!niveau) return;
    // `D-72` : on EFFACE d'abord, on remplit ensuite. Les cinq écrans
    // maître-détail (Poche, Stats, Coffre, Craft, Construction) partagent
    // cette vue — un seul élément DOM. Tant que `obtenirEntrees()` était la
    // première ligne, une exception laissait l'écran PRÉCÉDENT affiché sous
    // le nom du nouveau : on ouvrait la Poche et on voyait les Stats, ou
    // Construction. Un défaut de câblage se déguisait en défaut de menu, et
    // c'est ce déguisement qui a coûté le plus de temps à lire.
    //
    // Désormais, si ça lève, on voit un écran VIDE portant le bon titre :
    // manifestement cassé, et cassé au bon endroit. Rien n'est rattrapé ici
    // — l'exception continue de remonter, elle est seulement lisible.
    grille.innerHTML = VIDE;
    // Le sous-titre aussi : `niveau.sousTitre()` est fourni par l'appelant et
    // peut lever tout autant que `obtenirEntrees()`.
    sousTitre.textContent = VIDE;
    const racine = aLaRacine();
    titre.textContent = niveau.titre;

    entrees = niveau.obtenirEntrees();
    const disposition = disposerTuiles(entrees, COLONNES_TUILES);
    cases = disposition.cases;
    if (niveau.sousTitre) sousTitre.textContent = niveau.sousTitre();
    const cleSortie = racine ? 'menu.fermer' : 'menu.retour';
    motEntete.textContent = i18n.t(cleSortie);
    poserAttribut(boutonEntete, 'aria-label', i18n.t(cleSortie));
    iconeEntete.dataset.icone = racine ? icones.fermer : icones.retour;

    niveau.focus = replierFocus(cases, niveau.focus);

    poserVariable(grille, '--tuiles-colonnes', String(COLONNES_TUILES));
    const debuts = new Map(disposition.sections.map((s) => [s.debut, s.groupe]));
    elementsCases = cases.map((indexEntree, i) => {
      if (debuts.get(i)) {
        const intertitre = document.createElement('div');
        intertitre.className = 'fiches-groupe';
        intertitre.textContent = debuts.get(i);
        grille.appendChild(intertitre);
      }
      let elCase;
      if (indexEntree === null) {
        // Fin de rangée d'un groupe : la case tient sa place, ne dessine rien,
        // n'écoute rien.
        elCase = document.createElement('div');
        elCase.className = 'tuile-vide';
        poserAttribut(elCase, 'aria-hidden', 'true');
      } else {
        elCase = creerTuile(entrees[indexEntree], i);
      }
      grille.appendChild(elCase);
      return elCase;
    });
    appliquerFocus();
    rendreFiche();
    dessinerIcones(el);
  }

  function actualiserGeometrie() {
    const rect = rectangleJeu();
    if (!rect) return;
    poserVariable(el, '--jeu-x', `${rect.x}px`);
    poserVariable(el, '--jeu-y', `${rect.y}px`);
    poserVariable(el, '--u', `${rect.unite}px`);
    if (!el.hidden) dessinerIcones(el);
  }

  // A, ou le bouton de la fiche : l'action de la tuile focalisée. L'entrée est
  // libre de rafraîchir l'écran, d'en ouvrir un autre ou de tout fermer ; si
  // l'écran est toujours là ensuite, on le relit — l'appelant n'a pas à y penser.
  function activer() {
    const entree = entreeFocalisee();
    if (!entree || !entree.action) return;
    entree.action();
    if (niveau && !el.hidden) rendre();
  }

  boutonEntete.addEventListener('click', () => onRetour());

  return {
    element: el,
    montrer(niveauAffiche) {
      niveau = niveauAffiche;
      poserVariable(el, '--menu-accent', couleurAccent());
      afficherEcran(el, true);
      actualiserGeometrie();
      rendre();
    },
    masquer() {
      afficherEcran(el, false);
    },
    estVisible: () => !el.hidden,
    rafraichir() {
      if (niveau && !el.hidden) rendre();
    },
    actualiserGeometrie,
    traiterInput(etat) {
      if (!niveau || el.hidden) return;
      if (etat.skill_3 && etat.skill_3.pressed) {
        onRetour();
        return;
      }
      const direction = lecteur.lire(etat.move);
      if (direction && niveau.focus >= 0) {
        poserFocus(voisin(niveau.focus, direction, COLONNES_TUILES, cases.length, (i) => cases[i] !== null));
      }
      if (etat.attack && etat.attack.pressed) activer();
    },
    // Observation pour les tests headless.
    obtenirEtat: () => ({
      titre: niveau ? niveau.titre : null,
      focus: niveau ? niveau.focus : -1,
      cases: cases.slice(),
      entreeFocalisee: entreeFocalisee() ? entreeFocalisee().titre : null,
    }),
  };
}

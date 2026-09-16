// Menu minimal (§3.6) : bascule de langue FR/EN, export/import de
// sauvegarde. Ouvert par le verbe MENU. Rien ici ne touche le DOM au
// chargement du module : tout se passe dans initialiserMenu(), appelée par
// main.js une fois le document prêt.
//
// creerNavigationMenu() et creerControleurMenu() sont pures (aucune
// référence DOM, actions passées en callbacks) : c'est le patron de focus
// que reprendront tous les écrans d'UI futurs (inventaire, journal,
// réglages) — écrit une fois ici, testé depuis Node sans faux DOM.

// Provisoire, comme les autres mappings de gamepad.js : au-delà de ce
// seuil, le stick/la flèche est considéré "poussé" dans une direction ;
// en-deçà, on revient au neutre. Nécessaire car MOVE reste analogique
// (§2.4) alors que la navigation de menu doit avancer par cran, jamais en
// défilement continu.
const SEUIL_POUSSEE_MENU = 0.5;

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
export function creerControleurMenu(actions, options = {}) {
  const navigation = creerNavigationMenu(actions.length);
  const verbeAnnuler = options.verbeAnnuler;
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
        return;
      }
      navigation.traiterMove(etat.move.y);
      if (etat.attack.pressed) actions[navigation.index()]();
    },
  };
}

// Marque l'élément focalisé (bordure + curseur `›`), qu'il soit sélectionné
// au clavier/manette/tactile ou survolé à la souris (P4② : jamais la couleur
// seule) — factorisé une fois, réutilisé par l'écran principal ET l'écran de
// confirmation de réinitialisation (§B du diagnostic
// SD_grotte-blocage-choix-follet_2026-09-15.md) plutôt que dupliqué.
function appliquerFocusVisuel(elements, indexFocalise) {
  elements.forEach((el, i) => {
    const curseur = el.querySelector('.menu-curseur');
    const estFocalise = i === indexFocalise;
    curseur.textContent = estFocalise ? '›' : '';
    el.style.border = estFocalise ? '2px solid #fff' : '2px solid transparent';
  });
}

// Cause racine du reset invisible (SD_menu-reset-invisible_2026-09-15.md) :
// `index.html` ne stylise que `#menu` (position plein écran + fond +
// centrage flex) ; le sous-écran de confirmation n'a ni règle CSS dédiée
// (index.html doit rester sans logique de nommage d'éléments créés
// dynamiquement) ni style inline — `hidden=false` retirait bien
// l'attribut, mais sans position ni display l'élément restait en flux
// normal statique, hors du viewport visible (`body{overflow:hidden}`) :
// invisible bien que fonctionnellement ouvert. Corrigé en donnant à la
// confirmation le même habillage plein écran que `#menu`, posé en inline
// depuis ce module — même principe que le style de focus ci-dessus, jamais
// une classe CSS qu'index.html devrait définir.
function appliquerStylePleinEcran(el) {
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.background = 'rgba(0, 0, 0, 0.85)';
  el.style.color = '#eee';
  el.style.fontFamily = 'sans-serif';
  el.style.flexDirection = 'column';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.gap = '1rem';
}

// Point d'affichage/masquage unique pour les deux écrans (menu principal ET
// confirmation) : `hidden` seul seul ne suffit pas à garantir la visibilité
// effective (cf. ci-dessus), et un `display` inline qui resterait figé sur
// "flex" annulerait l'effet de `hidden` (une valeur inline bat la règle
// UA `[hidden]{display:none}`). Les deux doivent donc toujours changer
// ensemble, ici et nulle part ailleurs.
function afficherEcran(el, visible) {
  el.hidden = !visible;
  el.style.display = visible ? 'flex' : 'none';
}

export function initialiserMenu({ document, i18n, exporterSauvegarde, importerSauvegarde }) {
  const conteneur = document.createElement('div');
  conteneur.id = 'menu';
  afficherEcran(conteneur, false);
  conteneur.innerHTML = `
    <h2 data-cle="menu.titre"></h2>
    <div class="menu-item" data-item="0">
      <span class="menu-curseur"></span>
      <label data-cle="menu.langue"></label>
      <select id="menu-langue"><option value="fr">FR</option><option value="en">EN</option></select>
    </div>
    <div class="menu-item" data-item="1">
      <span class="menu-curseur"></span>
      <button id="menu-exporter" data-cle="menu.exporter" type="button"></button>
    </div>
    <div class="menu-item" data-item="2">
      <span class="menu-curseur"></span>
      <input id="menu-importer" type="file" accept="application/json" />
    </div>
    <div class="menu-item" data-item="3">
      <span class="menu-curseur"></span>
      <button id="menu-reset" data-cle="menu.reset_sauvegarde" type="button"></button>
    </div>
    <div class="menu-item" data-item="4">
      <span class="menu-curseur"></span>
      <button id="menu-fermer" data-cle="menu.fermer" type="button"></button>
    </div>
  `;
  document.body.appendChild(conteneur);

  // Écran de confirmation (§B) : sous-menu à 2 entrées, conteneur DOM séparé
  // plutôt qu'imbriqué dans `conteneur` — masquer l'un affiche l'autre, les
  // deux ne sont jamais visibles en même temps (cf. traiterInput plus bas).
  const confirmation = document.createElement('div');
  confirmation.id = 'menu-confirmation-reset';
  appliquerStylePleinEcran(confirmation);
  afficherEcran(confirmation, false);
  confirmation.innerHTML = `
    <h2 data-cle="menu.reset_confirmation_titre"></h2>
    <div class="menu-item" data-item="0">
      <span class="menu-curseur"></span>
      <button id="menu-reset-oui" data-cle="menu.reset_oui" type="button"></button>
    </div>
    <div class="menu-item" data-item="1">
      <span class="menu-curseur"></span>
      <button id="menu-reset-non" data-cle="menu.reset_non" type="button"></button>
    </div>
  `;
  document.body.appendChild(confirmation);

  function retraduire() {
    conteneur.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
    confirmation.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
  }
  retraduire();

  const selectLangue = conteneur.querySelector('#menu-langue');
  selectLangue.value = i18n.langueCourante();
  selectLangue.addEventListener('change', () => {
    i18n.definirLangue(selectLangue.value);
    retraduire();
  });

  function actionBasculerLangue() {
    // Convention manette (A = confirmer) appliquée à un select : un seul
    // bouton ne peut pas "ouvrir" une liste déroulante, donc ATTACK
    // bascule FR<->EN plutôt que de reproduire l'ouverture native — voir
    // le parcours manuel du ticket.
    selectLangue.value = selectLangue.value === 'fr' ? 'en' : 'fr';
    i18n.definirLangue(selectLangue.value);
    retraduire();
  }

  conteneur.querySelector('#menu-exporter').addEventListener('click', () => exporterSauvegarde());

  const inputImporter = conteneur.querySelector('#menu-importer');
  inputImporter.addEventListener('change', (e) => {
    const fichier = e.target.files[0];
    if (fichier) importerSauvegarde(fichier);
  });

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
  confirmation.querySelector('#menu-reset-oui').addEventListener('click', actionConfirmerOui);
  confirmation.querySelector('#menu-reset-non').addEventListener('click', actionConfirmerNon);

  // Ordre = ordre de navigation MOVE (§2 du ticket) : langue, exporter,
  // importer, réinitialiser, fermer. ATTACK sur un élément déclenche
  // exactement la même fonction que son équivalent souris (pas une copie).
  // `verbeAnnuler: 'skill_3'` ajoute B comme raccourci de fermeture
  // (convention manette "B = retour"), indépendant du focus courant — Start
  // n'ouvre le menu que dans un sens, voir main.js.
  const controleur = creerControleurMenu(
    [actionBasculerLangue, () => exporterSauvegarde(), () => inputImporter.click(), actionOuvrirConfirmation, fermerMenu],
    { verbeAnnuler: 'skill_3' }
  );

  // Confirmation (§B) : même patron de focus, B = "Non" (index 1) — annuler
  // ne doit jamais réinitialiser par erreur. `traiterInput()` plus bas gère
  // le retour à l'écran principal, y compris quand B a fermé ce contrôleur
  // sans passer par `actions[]`.
  const controleurConfirmation = creerControleurMenu([actionConfirmerOui, actionConfirmerNon], {
    verbeAnnuler: 'skill_3',
  });

  const elementsItems = Array.from(conteneur.querySelectorAll('.menu-item'));
  const elementsConfirmation = Array.from(confirmation.querySelectorAll('.menu-item'));

  function actualiserFocusVisuel() {
    appliquerFocusVisuel(elementsItems, controleur.index());
  }
  function actualiserFocusConfirmation() {
    appliquerFocusVisuel(elementsConfirmation, controleurConfirmation.index());
  }

  elementsItems.forEach((el, i) => {
    el.addEventListener('mouseenter', () => {
      controleur.definirIndex(i);
      actualiserFocusVisuel();
    });
  });
  elementsConfirmation.forEach((el, i) => {
    el.addEventListener('mouseenter', () => {
      controleurConfirmation.definirIndex(i);
      actualiserFocusConfirmation();
    });
  });

  return {
    ouvrir() {
      afficherEcran(conteneur, true);
      afficherEcran(confirmation, false);
      controleurConfirmation.fermer();
      controleur.ouvrir();
      actualiserFocusVisuel();
      retraduire();
    },
    fermer() {
      controleur.fermer();
      controleurConfirmation.fermer();
      afficherEcran(conteneur, false);
      afficherEcran(confirmation, false);
    },
    estOuvert() {
      return controleur.estOuvert() || controleurConfirmation.estOuvert();
    },
    // Fournit l'action réelle de reinitialiserPartie() après la construction
    // de l'orchestrateur (voir commentaire sur `actionReinitialiser`
    // ci-dessus) — jamais appelée avant, puisque le bouton qui y mène n'est
    // atteignable qu'après ouverture du menu, donc après ce câblage.
    definirActionReinitialiser(fn) {
      actionReinitialiser = fn;
    },
    // Point d'entrée appelé par main.js tant que le menu est ouvert (voir
    // la priorité UI/gameplay dans main.js#maj). Un seul écran actif à la
    // fois (confirmation prioritaire sur l'écran principal, jamais les deux
    // dispatchés la même frame) — la fermeture par focus cache déjà le bon
    // conteneur ; celle par B (verbeAnnuler) ne fait que fermer le
    // contrôleur interne, donc on resynchronise l'affichage ici dans tous
    // les cas plutôt que de dupliquer la condition à chaque site d'appel.
    traiterInput(etat) {
      if (controleurConfirmation.estOuvert()) {
        controleurConfirmation.traiterInput(etat);
        if (controleurConfirmation.estOuvert()) {
          actualiserFocusConfirmation();
        } else if (controleur.estOuvert()) {
          // Fermé par B ou par "Non" : retour à l'écran principal. Si
          // "Oui" a entre-temps fermé aussi `controleur`, rien à rouvrir.
          revenirAuMenuPrincipal();
        } else {
          afficherEcran(confirmation, false);
        }
        return;
      }
      controleur.traiterInput(etat);
      if (controleur.estOuvert()) {
        actualiserFocusVisuel();
      } else {
        afficherEcran(conteneur, false);
      }
    },
  };
}

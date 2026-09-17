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
// seule) — factorisé une fois, réutilisé par tous les écrans à liste.
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
// centrage flex) ; un sous-écran plein écran construit dynamiquement n'a ni
// règle CSS dédiée (index.html doit rester sans logique de nommage
// d'éléments créés dynamiquement) ni style inline — `hidden=false` retirait
// bien l'attribut, mais sans position ni display l'élément restait en flux
// normal statique, hors du viewport visible (`body{overflow:hidden}`) :
// invisible bien que fonctionnellement ouvert. Corrigé en donnant à CHAQUE
// écran plein écran (confirmation, poche, craft, coffre, stats) le même
// habillage, posé en inline depuis ce module.
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

// Point d'affichage/masquage unique pour tous les écrans plein écran :
// `hidden` seul ne suffit pas à garantir la visibilité effective (cf.
// ci-dessus), et un `display` inline qui resterait figé sur "flex"
// annulerait l'effet de `hidden` (une valeur inline bat la règle UA
// `[hidden]{display:none}`). Les deux doivent donc toujours changer
// ensemble, ici et nulle part ailleurs.
function afficherEcran(el, visible) {
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
  appliquerStylePleinEcran(el);
  afficherEcran(el, false);
  const titre = document.createElement('h2');
  // Aide optionnelle (specs/05_construction-stations.md §3 : "les touches du
  // mode sont affichées dans le menu lui-même") — vide par défaut, invisible
  // (aucun autre écran générique n'en fournit une), un seul écran de plus ne
  // demande aucun changement ici.
  const aide = document.createElement('p');
  aide.style.opacity = '0.7';
  aide.style.fontSize = '0.85em';
  const liste = document.createElement('div');
  el.appendChild(titre);
  el.appendChild(aide);
  el.appendChild(liste);
  document.body.appendChild(el);

  let controleur = creerControleurMenu([], { verbeAnnuler: 'skill_3' });
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
    const toutes = [...fournisseurEntrees(), { texte: i18n.t('menu.fermer'), action: fermer }];
    liste.innerHTML = toutes.map((e, i) => `
      <div class="menu-item" data-item="${i}">
        <span class="menu-curseur"></span>
        <button type="button" ${e.grisee ? 'disabled' : ''}>${e.texte}</button>
      </div>
    `).join('');
    elements = Array.from(liste.querySelectorAll('.menu-item'));
    const boutons = Array.from(liste.querySelectorAll('button'));
    const indexPrecedent = controleur.index();
    controleur = creerControleurMenu(toutes.map((e) => e.action), { verbeAnnuler: 'skill_3' });
    controleur.ouvrir();
    controleur.definirIndex(indexPrecedent);
    elements.forEach((elItem, i) => {
      elItem.addEventListener('mouseenter', () => {
        controleur.definirIndex(i);
        actualiserFocus();
      });
    });
    boutons.forEach((btn, i) => {
      btn.addEventListener('click', () => toutes[i].action());
    });
    actualiserFocus();
  }

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
    estOuvert: () => controleur.estOuvert() && !el.hidden,
    rafraichir: reconstruire,
    traiterInput(etat) {
      controleur.traiterInput(etat);
      if (controleur.estOuvert()) {
        actualiserFocus();
      } else {
        // Fermé via B/skill_3 (creerControleurMenu#verbeAnnuler) : ce chemin
        // ne passe jamais par l'action "Fermer" ci-dessus (reconstruire()),
        // donc `onFermer` doit être rappelé ici explicitement — sinon Poche/
        // Stats resteraient invisibles SANS que le menu principal ne
        // réapparaisse dessous (cf. actionOuvrirPoche/actionOuvrirStats).
        afficherEcran(el, false);
        if (onFermer) onFermer();
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
}) {
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
      <button id="menu-musique" data-cle="menu.musique" type="button"></button>
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
    <div class="menu-item" data-item="8">
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
  // explicitement (jamais `appliquerStylePleinEcran`, réservé aux écrans
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
  // l'écran-liste (sans callback, `conteneur` reste caché) et levée du
  // bandeau dans la même fonction synchrone — aucun état intermédiaire où
  // ni l'un ni l'autre ne serait affiché.
  //
  // SD_construction-menu-ouvert-placement_2026-09-17.md (cause racine H1
  // confirmée) : `actionOuvrirConstruction` ne fait que MASQUER `conteneur`
  // (afficherEcran(conteneur,false)) pour laisser place à `ecranConstruction`
  // — le contrôleur de premier niveau du menu Pause (`controleur`, plus bas
  // dans ce module), lui, reste ouvert. `ecranConstruction.fermerSansCallback()`
  // ne fermait QUE l'écran-liste, jamais ce contrôleur parent : `menu.
  // estOuvert()` restait donc vrai après l'entrée en placement, si bien que
  // le routage de main.js (`if (menu.estOuvert()) menu.traiterInput(...)`)
  // continuait d'envoyer le stick au menu Pause — invisible mais toujours
  // actif — au lieu de la machine construction, jusqu'à ce qu'un `B` de trop
  // referme ce contrôleur fantôme. Le point de sortie complet est donc ici,
  // dans la même transition atomique (jamais un `menu.fermer()` global, qui
  // rappellerait le `onFermer` de `ecranConstruction` et réafficherait
  // `conteneur` par-dessus le placement) : fermer EXPLICITEMENT `controleur`
  // en plus de `ecranConstruction`, aucun état intermédiaire où le contrôleur
  // parent resterait ouvert pendant que le placement capte déjà les verbes.
  function ouvrirPlacementConstruction(nomStation) {
    ecranConstruction.fermerSansCallback();
    controleur.fermer();
    afficherEcran(conteneur, false);
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

  retraduireBase();

  function retraduireBase() {
    conteneur.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
    confirmation.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
    actualiserBoutonMusique();
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

  let controleur = creerControleurMenu([], { verbeAnnuler: 'skill_3' });
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
    const entrees = [
      ...ENTREES_FIXES_DEBUT,
      ...(visible ? [{ el: elConstruction, action: actionOuvrirConstruction }] : []),
      ...ENTREES_FIXES_FIN,
    ];
    elementsItems = entrees.map((e) => e.el);
    controleur = creerControleurMenu(entrees.map((e) => e.action), { verbeAnnuler: 'skill_3' });
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
  const controleurConfirmation = creerControleurMenu([actionConfirmerOui, actionConfirmerNon], {
    verbeAnnuler: 'skill_3',
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
    estOuvert() {
      return (
        controleur.estOuvert() || controleurConfirmation.estOuvert() ||
        ecranPoche.estOuvert() || ecranCraft.estOuvert() || ecranCoffre.estOuvert() || ecranStats.estOuvert() ||
        ecranConstruction.estOuvert()
      );
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
        } else if (controleur.estOuvert()) {
          // Fermé par B ou par "Non" : retour à l'écran principal. Si
          // "Oui" a entre-temps fermé aussi `controleur`, rien à rouvrir.
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
      // Construction ferme tout le menu elle-même (main.js#
      // demarrerConstruction -> menu.fermer()), ce chemin-ci ne gère donc que
      // l'annulation (skill_3 -> retour au menu principal, comme Poche/Stats).
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

// Le menu du jeu. Depuis specs/08_menus-cartes.md (palier A4), le menu Pause
// est un empilement d'écrans de CARTES (`ui/grille_cartes.js`, décrit par
// `data/menus.json`) ; ce module garde les écrans de LISTE — Poche, Stats
// (Palier D), Construction, et les écrans contextuels Craft/Coffre (Palier
// A/E, ouverts directement par INTERACT sur une station, hors du menu Pause)
// — et enregistre les actions que les cartes déclenchent. Rien ici ne touche
// le DOM au chargement du module : tout se passe dans initialiserMenu(),
// appelée par main.js une fois le document prêt.
//
// Palier B : la grille ET les cinq écrans de liste sont les VUES d'UNE seule
// pile (`menu_cartes.js#creerNavigationEcrans`). Ouvrir = empiler, retour =
// dépiler, « le menu est ouvert » = « la pile n'est pas vide et son sommet est
// visible ». Plus aucun écran ne s'affiche ni ne se masque lui-même.
//
// creerNavigationMenu() et creerControleurMenu() sont pures (aucune
// référence DOM, actions passées en callbacks) : c'était le patron de focus
// des écrans de LISTE. Depuis le palier C6 de specs/08 il n'y a plus d'écran
// de liste, donc plus d'appelant — seul `test_menu_navigation` les exerce.
// Gardées telles quelles (`D-46` au suivi : les retirer avec leur test, ou les
// garder pour un futur menu vertical — à Xav de dire).

import { creerMenuCartes } from './grille_cartes.js';
import { creerEcranFiches } from './ecran_fiches.js';
import { creerNavigationEcrans } from '../menu_cartes.js';

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

// La leçon du reset invisible (SD_menu-reset-invisible_2026-09-15.md) tient
// toujours : un écran plein écran construit dynamiquement, sans règle CSS
// dédiée, reste en flux statique hors du viewport — « ouvert » et invisible.
// Depuis `D-42` l'habillage est UNE classe d'`index.html` (`.ecran-ui`), que
// posent les deux composants d'écran (`grille_cartes.js`, `ecran_fiches.js`) :
// ce module ne connaît que des noms de classes, jamais une valeur de style.
//
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
// Craft et Coffre ne sont cités par aucune carte (INTERACT les ouvre depuis le
// monde) : ces deux ids ne servent qu'à nommer leur niveau dans la pile.
const ECRAN_CRAFT = 'ecran_craft';
const ECRAN_COFFRE = 'ecran_coffre';

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
// - `listerPoche()` renvoie `{ id, label, quantite, icone, lignes, equipement }[]`.
//   `equipement` (`D-66`, T5) est `null` ou `{ slot, deja, lignes }` : c'est
//   `main.js` qui dit si l'objet s'équipe et OÙ. Cet écran ne connaît plus
//   aucune catégorie d'item — il en connaissait une (« nourriture »), et la
//   deuxième arme aurait fait la troisième.
// - `equiper(slot, itemId)` : un seul point d'équipement, quel que soit
//   l'emplacement (§3.3, hint CONSUME pour le consommable).
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
  // `D-64` (T7) : le volume. `volumeCourant` rend la CLÉ de texte du palier
  // en cours (jamais un pourcentage composé ici : un lecteur d'état rend une
  // clé, c'est le contrat des bascules depuis `D-43`) ; `cyclerVolume`
  // avance d'un palier. Les paliers eux-mêmes vivent dans `data/audio.json`,
  // et ce module ne les voit jamais — il ne sait même pas combien il y en a.
  volumeCourant = () => 'menu.etat.volume_100', cyclerVolume = () => {},
  // Palier D de `specs/09_reglages-graphiques.md` : les réglages graphiques,
  // très exactement le même patron que le volume — `graphismesCourant` rend
  // une CLÉ (« Bas », ou « Auto (Bas) » quand Auto a résolu : la carte ne dit
  // jamais « Auto » seul, §5), `cyclerGraphismes` avance d'un cran. Les
  // paliers et le cycle vivent dans `data/graphismes.json` ; ce module ne
  // sait ni combien il y en a, ni lequel est le plus léger.
  graphismesCourant = () => 'menu.etat.graphismes_auto', cyclerGraphismes = () => {},
  // `D-66` (T5) : un seul point d'équipement, quel que soit l'emplacement —
  // `equiper(slot, itemId)`. Remplace `equiperConsommable`, qui figeait un
  // emplacement dans le nom d'une fonction d'UI.
  equiper = () => {},
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
  //
  // LA pile du menu (palier B). Poche, Stats et Construction s'EMPILENT sur le
  // niveau de cartes qui les ouvre ; Craft et Coffre s'ouvrent seuls, depuis
  // le monde. Dans les deux cas « Fermer » et B/skill_3 sont un `retour()` :
  // il reste quelque chose dessous, on y revient (focus resté sur la carte) ;
  // il ne reste rien, tout est fermé. Plus personne ne « fait réapparaître »
  // le menu : il n'avait pas disparu, il était sous le sommet.
  const navigation = creerNavigationEcrans();
  // Construction (specs/05_construction-stations.md §3, précisée par
  // MT_construction-bandeau-placement_2026-09-17 v1.0.1) : ouvert DEPUIS le
  // menu Pause, comme Poche/Stats. Choisir une station dans cette liste
  // MASQUE le sommet de la pile sans rien dépiler (`ouvrirPlacementConstruction`)
  // — le placement qui suit affiche la pièce + un bandeau, jamais cet écran
  // plein-écran par dessus (c'était le bug du micro-ticket : le fantôme
  // restait invisible derrière la liste).

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

  // Poche (palier C2) : une tuile par objet, sa fiche à droite. « Équiper »
  // n'existe que sur la nourriture (§3.3 : le slot consommable) ; les autres
  // objets n'ont PAS d'action — donc pas de bouton, plutôt qu'un bouton qui ne
  // fait rien. L'objet équipé porte un repère sur sa tuile et le dit dans sa
  // fiche ; le rééquiper serait sans effet, il n'a donc pas de bouton non plus
  // (et surtout pas de tuile grisée : « équipé » n'est pas « indisponible »).
  // Une poche vide : aucune tuile, la fiche le dit (`texteVide` du niveau).
  // `D-66` (T5) : l'épée en bois est le 2ᵉ objet équipable du jeu, et elle ne
  // va pas dans le même emplacement que la nourriture. Plutôt qu'un second
  // `e.categorie === '…'` écrit ici — un troisième suivrait avec l'armure —,
  // c'est `main.js` qui dit désormais, par objet, s'il s'équipe et où :
  // `e.equipement = { slot, deja, lignes }`. Cet écran redevient ce qu'il
  // doit être : il ne connaît **aucune** catégorie d'item.
  function entreesPoche() {
    return listerPoche().map((e) => {
      const eq = e.equipement || null;
      const equipe = Boolean(eq && eq.deja);
      return {
        titre: e.label, icone: e.icone || null, quantite: e.quantite, marque: equipe,
        // Équipé : la fiche dit aussi ce que ça change — quel verbe s'en
        // sert, ou ce que l'objet apporte. Les lignes viennent de `main.js`,
        // qui a le registre et i18n ; le menu ne compose plus rien.
        lignes: [...(e.lignes || []), ...(equipe ? [
          i18n.t('menu.fiche.equipe'),
          ...((eq && eq.lignes) || []),
        ] : [])],
        libelleAction: eq && !equipe ? i18n.t('menu.poche_equiper') : null,
        action: eq && !equipe ? () => equiper(eq.slot, e.id) : null,
      };
    });
  }

  // Bandeau de placement (§3, v1.0.1) : nom de la station + les 5 verbes du
  // mode, résolus via le périphérique RÉELLEMENT actif (glyphes), jamais en
  // dur — construit une seule fois à l'entrée en placement (pas de hot-swap
  // manette<->clavier suivi en direct pendant le placement, simplification
  // acceptée : le bandeau est redessiné à chaque nouvelle station choisie).
  // Les cinq verbes du placement, glyphes du périphérique actif. Écrits UNE
  // fois : le bandeau les met sur une ligne, la fiche d'une station (palier
  // C6) les met l'un sous l'autre — on les lit AVANT d'entrer en placement.
  function lignesAidePlacement() {
    const p = peripheriqueActif();
    const g = (verbe) => i18n.t(`glyphe.${p}.${verbe}`);
    return [
      `${i18n.t('menu.construction_aide_deplacer')} ${g('move')}`,
      `${i18n.t('menu.construction_aide_tourner')} ${g('skill_1')}`,
      `${i18n.t('menu.construction_aide_confirmer')} ${g('attack')}`,
      `${i18n.t('menu.construction_aide_annuler')} ${g('skill_3')}`,
      `${i18n.t('menu.construction_aide_quitter')} ${g('menu')}`,
    ];
  }
  function texteBandeauConstruction(nomStation) {
    return [nomStation, ...lignesAidePlacement()].join(' · ');
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
  // CONTRATS différents pour « ouvert ». Depuis le palier B il n'y en a plus
  // qu'un, écrit une fois dans la pile : pendant le placement son sommet est
  // MASQUÉ (la pile intacte : racine, puis la liste), donc le menu n'est pas
  // « ouvert », sans que personne ait eu à fermer puis rouvrir quoi que ce soit.
  function ouvrirPlacementConstruction(nomStation) {
    navigation.masquerSommet();
    bandeauConstruction.textContent = texteBandeauConstruction(nomStation);
    afficherEcran(bandeauConstruction, true);
  }

  // Construction (palier C6) : maître-détail. Une tuile par station déplaçable ;
  // sa fiche porte les touches du placement. Le fournisseur passe par une
  // fonction fléchée : `main.js` le remplace après coup.
  function niveauConstruction() {
    return {
      vue: ecranFiches, id: ECRAN_CONSTRUCTION, titre: i18n.t('menu.construction_titre'),
      obtenirEntrees: () => fournisseurEntreesConstruction().map((e) => ({ ...e, lignes: lignesAidePlacement() })),
      texteVide: i18n.t('menu.fiche.construction_vide'),
    };
  }

  // Retour liste (pose confirmée ou `B`, §4) : on enchaîne sans repasser par
  // la grille — la liste réapparaît directement avec des entrées fraîches
  // (`montrer` les relit). Elle est déjà au sommet, masquée, quand on vient
  // d'un placement ; un appelant qui arriverait d'ailleurs la trouve empilée.
  function reouvrirListeConstruction() {
    afficherEcran(bandeauConstruction, false);
    const sommet = navigation.sommet();
    if (sommet && sommet.id === ECRAN_CONSTRUCTION) navigation.remontrerSommet();
    else navigation.empiler(niveauConstruction());
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
  let fournisseurSousTitreStats = () => '';
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
    action_cycler_volume: () => cyclerVolume(),
    action_cycler_graphismes: () => cyclerGraphismes(),
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
    etat_volume: () => volumeCourant(),
    etat_graphismes: () => graphismesCourant(),
    etat_plein_ecran: () => (pleinEcranActif() ? 'menu.etat.plein_ecran_oui' : 'menu.etat.plein_ecran_non'),
  };
  // Les écrans EXISTANTS qu'une carte dossier peut ouvrir, inchangés (palier
  // C) : chacun s'EMPILE sur le niveau de cartes qui l'ouvre. Les fournisseurs
  // passent par une fonction fléchée, jamais par référence : `main.js` les
  // remplace après coup (voir plus haut).
  const ecrans = {
    [ECRAN_POCHE]: () => navigation.empiler({
      vue: ecranFiches, id: ECRAN_POCHE, obtenirEntrees: entreesPoche, titre: i18n.t('menu.poche_titre'),
      texteVide: i18n.t('menu.poche_vide'),
    }),
    // Stats (palier C3) : maître-détail, comme la Poche. Le sous-titre (points
    // libres, progression d'XP) est relu à chaque affichage.
    [ECRAN_STATS]: () => navigation.empiler({
      vue: ecranFiches, id: ECRAN_STATS, titre: i18n.t('menu.stats_titre'),
      obtenirEntrees: () => fournisseurEntreesStats(), sousTitre: () => fournisseurSousTitreStats(),
    }),
    [ECRAN_CONSTRUCTION]: () => navigation.empiler(niveauConstruction()),
  };

  const menuCartes = creerMenuCartes({
    document, i18n, menus, actions, etats, ecrans,
    evaluerCondition: (condition) => evaluerCondition(condition),
    couleurAccent, rectangleJeu, dessinerIcone,
    afficherEcran, seuilPoussee: SEUIL_POUSSEE_MENU,
    navigation,
  });
  // L'id historique du menu Pause : les tests et les diagnostics le cherchent
  // sous ce nom depuis la Phase 0.
  menuCartes.element.id = 'menu';

  // Palier C : l'écran « maître-détail » (`ui/ecran_fiches.js`). UNE instance,
  // comme la grille de cartes : c'est le NIVEAU empilé qui porte le contenu
  // (titre, entrées, focus), pas l'élément. Poche, Stats, Coffre, Craft et
  // Construction y vivent tous les cinq.
  // Créé APRÈS la grille : le menu Pause reste le premier écran du document.
  // Les deux icônes de sortie sont celles que le catalogue donne à l'écran
  // racine : la sortie a la même tête partout.
  const ecranRacine = (menus || []).find((e) => e.racine === true) || {};
  const ecranFiches = creerEcranFiches({
    document, i18n, afficherEcran, seuilPoussee: SEUIL_POUSSEE_MENU,
    couleurAccent, rectangleJeu, dessinerIcone,
    onRetour: navigation.retour,
    aLaRacine: () => navigation.profondeur() === 1,
    icones: { fermer: ecranRacine.icone_fermer || null, retour: ecranRacine.icone_retour || null },
    // Au doigt le bouton de la fiche se touche : pas de verbe à annoncer.
    glypheAction: () => (peripheriqueActif() === 'tactile' ? null : i18n.t(`glyphe.${peripheriqueActif()}.attack`)),
  });

  return {
    // Le menu Pause s'ouvre toujours à sa racine : ce qui restait dans la pile
    // (un placement quitté par MENU) est oublié, et la pile masque elle-même
    // tout ce qui n'est pas son sommet — plus d'ordre de fermeture à respecter.
    ouvrir() {
      afficherEcran(bandeauConstruction, false);
      menuCartes.ouvrir();
    },
    // LE chemin de fermeture (`navigation.fermerTout`) : celui de `[X]` et de B
    // à la racine, et d'une carte `action`.
    fermer() {
      navigation.fermerTout();
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
      // Palier B : UNE question, posée à UN endroit. Les sept sous-contrats
      // que cette fonction OR-combinait (carte §1.2) ont disparu — « ouvert »
      // = la pile n'est pas vide ET son sommet est réellement visible.
      return navigation.estOuvert();
    },
    // `D-30` : appelée par main.js sur `fullscreenchange` — le seul moment où
    // l'état réel peut changer sans que ce module ait rien demandé (Échap, un
    // geste système, ou la fin d'une bascule asynchrone). La carte se réécrit
    // alors depuis l'état réel, jamais depuis ce qu'on avait demandé.
    actualiserPleinEcran() {
      menuCartes.rafraichir();
    },
    // Observation pour les tests headless : l'écran « maître-détail ».
    obtenirEtatFiches: () => ecranFiches.obtenirEtat(),
    // La fenêtre a changé de taille : la boîte du menu se recale sur le
    // rectangle du canvas (§4.4). Appelée par main.js, qui possède l'écouteur.
    actualiserGeometrie() {
      menuCartes.actualiserGeometrie();
      ecranFiches.actualiserGeometrie();
    },
    // Ce que ce module a réellement branché — la moitié « code » du contrôle
    // de câblage au démarrage (`menu_cartes.js#erreursCablageMenus`).
    cablage: () => ({ actions: Object.keys(actions), etats: Object.keys(etats), ecrans: Object.keys(ecrans) }),
    // Observation pour les tests headless (même patron que l'orchestrateur).
    obtenirEtatCartes: () => menuCartes.obtenirEtat(),
    // La pile, du bas vers le sommet, par ids de niveau.
    obtenirEtatPile: () => ({
      profondeur: navigation.profondeur(),
      sommet: navigation.sommet() ? navigation.sommet().id : null,
    }),
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
    // `sousTitre` (palier C3, optionnel) : ce que dit l'en-tête de l'écran.
    definirEntreesStats(fn, sousTitre = () => '') {
      fournisseurEntreesStats = fn;
      fournisseurSousTitreStats = sousTitre;
    },
    // Écrans contextuels ouverts directement par INTERACT sur une station
    // (Palier A/E, hors du menu Pause) — `obtenirEntrees` est fourni à
    // l'ouverture par main.js (dépend de la station visée, donc pas fixé à
    // la construction du menu comme `fournisseurEntreesStats`).
    // Craft (palier C5) : maître-détail, même forme que le Coffre.
    ouvrirCraft(obtenirEntrees, titre, options = {}) {
      navigation.ouvrir({
        vue: ecranFiches, id: ECRAN_CRAFT, obtenirEntrees, titre,
        sousTitre: options.sousTitre || null, texteVide: options.texteVide || '',
      });
    },
    rafraichirCraft() {
      ecranFiches.rafraichir();
    },
    // Coffre (palier C4) : maître-détail. `options` : `sousTitre` (la capacité)
    // et `texteVide`, que seul main.js sait écrire.
    ouvrirCoffre(obtenirEntrees, titre, options = {}) {
      navigation.ouvrir({
        vue: ecranFiches, id: ECRAN_COFFRE, obtenirEntrees, titre,
        sousTitre: options.sousTitre || null, texteVide: options.texteVide || '',
      });
    },
    rafraichirCoffre() {
      ecranFiches.rafraichir();
    },
    // Stats vit dans l'écran « maître-détail » : sans effet s'il affiche autre
    // chose… qu'il relirait sans dommage (il relit son niveau courant).
    rafraichirStats() {
      ecranFiches.rafraichir();
    },
    // Point d'entrée appelé par main.js tant que le menu est ouvert (voir
    // la priorité UI/gameplay dans main.js#maj). Les verbes vont au SOMMET de
    // la pile, et à lui seul : un verbe consommé par un écran de liste n'est
    // jamais revu par la grille dans la même frame (B qui ferme Stats ne
    // dépile pas AUSSI l'écran Héros) — plus par un ordre de `return` à tenir
    // à la main, par construction.
    traiterInput(etat) {
      navigation.traiterInput(etat);
    },
  };
}

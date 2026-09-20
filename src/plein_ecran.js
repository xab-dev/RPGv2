// Plein écran : demandé au premier relâchement tactile, et basculé à la main
// depuis le menu (`D-30`, rouvert le 20/09).
//
// Constat de Xav sur l'A04 (19/09) : la barre d'adresse reste affichée, le jeu
// n'occupe que 1440×810 sur 2340×1080 — 46 % de l'écran, échelle entière 3. En
// vrai plein écran il passe à l'échelle 4, sans qu'une ligne de rendu change :
// le redimensionnement suit le chemin existant (résolution logique/physique),
// tous les calques relisant l'échelle sur la largeur de leur canvas.
//
// POURQUOI CE TICKET A ÉTÉ ROUVERT. La première version demandait le plein
// écran depuis `touchstart`, en croyant que c'était « ce que le navigateur
// exige ». C'est l'inverse : le contrat d'« activation utilisateur » du HTML
// ne liste pas `touchstart` parmi les événements qui l'accordent — il liste
// `keydown`, `mousedown`, `pointerdown`, `pointerup` et **`touchend`**. Un
// contact peut encore devenir un glissement ; le navigateur attend de savoir.
// La demande partait donc sans activation, Chrome la rejetait
// (`TypeError: Permissions check failed`, vérifié), le contrat « meilleur
// effort » avalait le rejet en silence, et le loquet « une seule tentative »
// interdisait toute nouvelle demande jusqu'au rechargement de la page. Trois
// pièces saines, un enchaînement qui ne pouvait jamais marcher.
//
// SOUS-SYSTÈME « MEILLEUR EFFORT », et c'est le point qui commande tout le
// reste. Un navigateur peut refuser le plein écran (il n'est accordé que sur
// un geste du joueur, et certains le refusent quand même) ; le verrouillage en
// paysage n'existe pas partout. Le contrat est donc : **ça marche, ou le jeu
// continue exactement comme aujourd'hui**. Ce module rattrape donc ses propres
// erreurs **à la frontière de son API publique** — jamais un `try/catch` chez
// l'appelant, encore moins autour de la boucle de jeu. C'est la règle née du
// diagnostic freeze-musique (`docs/archives/JOURNAL_2026-09-17_diagnostic-
// freeze-musique.md`), où une exception d'`audio.js` remontait jusqu'à
// `creerBoucle#frame` et figeait le jeu. Même forme de contrat, même remède.
//
// Le DOM n'est touché qu'à l'appel, jamais au niveau module : ce fichier reste
// importable depuis Node, comme tout `/src`.

// `element` : la racine du jeu à passer en plein écran. `ecran` : l'objet
// `screen` du navigateur. `doc` : le `document`, dont on ne lit qu'une chose —
// **l'état réel** (`fullscreenElement`) — et dont on n'appelle qu'une chose,
// `exitFullscreen`. `nav` : le `navigator`, dont on n'utilise que `keyboard`
// (Keyboard Lock, plus bas). Les quatre sont injectés, jamais lus en global
// (le module doit s'exécuter sous Node), et les quatre peuvent être absents :
// c'est un cas normal, pas une erreur.
export function creerPleinEcranTactile({ element = null, ecran = null, doc = null, nav = null } = {}) {
  // Le loquet est posé sur la TENTATIVE, jamais sur le résultat. Deux raisons,
  // et la seconde est la consigne explicite du ticket :
  //   - un refus du navigateur relancerait sinon une demande à chaque doigt
  //     relâché, donc plusieurs fois par seconde de jeu ;
  //   - « sortie du plein écran par le joueur : ne pas le redemander en
  //     boucle — une nouvelle demande seulement au prochain lancement ». Le
  //     loquet n'est donc jamais réarmé ; il meurt avec la page.
  let demande = false;

  // Le verrouillage en paysage n'a de sens qu'en plein écran (les navigateurs
  // le refusent hors de lui) : on ne le tente qu'après un succès, sans quoi on
  // salirait la console du joueur d'un refus attendu.
  function verrouillerPaysage() {
    try {
      const orientation = ecran && ecran.orientation;
      if (!orientation || typeof orientation.lock !== 'function') return;
      const promesse = orientation.lock('landscape');
      if (promesse && typeof promesse.catch === 'function') promesse.catch(() => {});
    } catch {
      // Muet, par contrat : le jeu se joue très bien en portrait.
    }
  }

  // L'ÉTAT RÉEL, jamais un booléen tenu à jour de notre côté. « Le résultat
  // fait foi » : le joueur peut sortir du plein écran par la touche Échap ou
  // un geste système, sans que ce module en soit prévenu autrement que par
  // cette lecture (et par `fullscreenchange`, que l'appelant écoute).
  function estActif() {
    try {
      return Boolean(doc && (doc.fullscreenElement || doc.webkitFullscreenElement));
    } catch {
      return false;
    }
  }

  function disponible() {
    const demander = element && (element.requestFullscreen || element.webkitRequestFullscreen);
    return typeof demander === 'function';
  }

  // Demande brute. Rend une promesse qui se résout à `true` si le plein écran
  // a été obtenu, `false` dans TOUS les autres cas — elle ne rejette jamais,
  // c'est la frontière du sous-système.
  function demander() {
    try {
      // `webkitRequestFullscreen` : Safari iOS ne l'expose pas sur un
      // élément quelconque, mais le tenter ne coûte rien et ne casse rien.
      const fn = element && (element.requestFullscreen || element.webkitRequestFullscreen);
      if (typeof fn !== 'function') return Promise.resolve(false);
      const promesse = fn.call(element);
      if (promesse && typeof promesse.then === 'function') {
        return promesse.then(() => { verrouillerPaysage(); return true; }, () => false);
      }
      // Vieille API sans promesse : on ne sait pas si ça a marché, donc on
      // tente le paysage sans rien présumer — son propre échec est muet — et
      // on répond par l'état réel plutôt que par une supposition.
      verrouillerPaysage();
      return Promise.resolve(estActif());
    } catch {
      // Un geste non reconnu, une iframe sans permission, un navigateur qui
      // n'en veut pas. Le jeu continue tel quel.
      return Promise.resolve(false);
    }
  }

  // ÉCHAP COURT / ÉCHAP LONG. Constat de Xav au clavier (20/09) : en plein
  // écran, un seul Échap fermait le menu **et** quittait le plein écran. Le
  // navigateur intercepte Échap avant la page — c'est lui qui décide, et
  // c'est aussi lui qui offre de différer cette sortie.
  //
  // `navigator.keyboard.lock(['Escape'])` : tant que le plein écran demandé
  // par le JEU est actif, Échap est livré à la page ; le navigateur garde
  // pour lui la sortie, sur appui **maintenu** (~2 s), et l'annonce de
  // lui-même. L'appui long n'est donc **pas codé ici** — aucun minuteur,
  // aucune mesure de durée, rien à apprendre pour `ui/menu.js` ni pour la
  // couche d'input : ils reçoivent un Échap comme d'habitude.
  //
  // Amélioration progressive, échec silencieux, comme tout ce module :
  // Firefox et Safari n'exposent pas l'API, un contexte non sécurisé la
  // refuse, la promesse peut être rejetée. Dans tous ces cas rien ne change —
  // Échap continue de faire les deux, exactement comme avant ce ticket. Ni
  // erreur en console, ni message au joueur.
  //
  // On lit l'ÉTAT RÉEL plutôt qu'un booléen tenu ici, pour la même raison que
  // partout ailleurs dans ce fichier : la sortie du plein écran peut venir du
  // joueur ou du système. Verrouiller hors plein écran ne servirait à rien
  // (le navigateur ne livre Échap qu'en plein écran) et brouillerait la
  // lecture du prochain lecteur, donc on ne le fait jamais.
  function synchroniserVerrouillageEchap() {
    try {
      const clavier = nav && nav.keyboard;
      if (!clavier) return;
      if (estActif()) {
        if (typeof clavier.lock !== 'function') return;
        const promesse = clavier.lock(['Escape']);
        if (promesse && typeof promesse.catch === 'function') promesse.catch(() => {});
        return;
      }
      if (typeof clavier.unlock !== 'function') return;
      // `unlock()` est sans effet si rien n'était verrouillé : on peut
      // l'appeler à chaque sortie sans tenir le compte des verrous posés.
      clavier.unlock();
    } catch {
      // Muet, par contrat.
    }
  }

  function sortir() {
    try {
      const fn = doc && (doc.exitFullscreen || doc.webkitExitFullscreen);
      if (typeof fn !== 'function') return Promise.resolve(false);
      const promesse = fn.call(doc);
      if (promesse && typeof promesse.then === 'function') return promesse.then(() => true, () => false);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  return {
    // Chemin AUTOMATIQUE : appelé par `touch.js` à chaque relâchement, filtré
    // ici et ici seulement. Rend `true` si c'est cette demande-ci qui est
    // partie, `false` si le loquet était déjà posé — la valeur sert aux tests,
    // l'appelant n'a rien à en faire, et surtout rien à rattraper.
    demanderUneFois() {
      if (demande) return false;
      demande = true;
      demander();
      return true;
    },

    // Chemin EXPLICITE : l'entrée de menu. Il ne passe pas par le loquet (le
    // joueur a le droit de basculer autant de fois qu'il veut), mais il le
    // POSE — sans quoi, sur un appareil tactile où le joueur serait sorti du
    // plein écran par le menu, le premier doigt reposé le lui réimposerait.
    // Rend une promesse résolue à l'état obtenu (`true` = en plein écran),
    // jamais rejetée.
    basculer() {
      demande = true;
      if (estActif()) return sortir().then(() => estActif());
      return demander().then(() => estActif());
    },

    estActif,
    // Appelée par l'appelant sur `fullscreenchange` — le seul moment où
    // l'état réel change, qu'il vienne du menu, d'Échap ou du système. Un
    // seul point d'appel, donc un seul endroit où se tromper.
    synchroniserVerrouillageEchap,
    // Décide si l'entrée de menu existe : une entrée qui ne peut rien faire
    // n'a rien à faire dans le menu (même règle que Construction hors de la
    // maison, §3 de `05_construction-stations.md`).
    disponible,
    dejaDemande: () => demande,
  };
}

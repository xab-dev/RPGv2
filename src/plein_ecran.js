// Plein écran au premier appui tactile (`D-30`).
//
// Constat de Xav sur l'A04 (19/09) : la barre d'adresse reste affichée, le jeu
// n'occupe que 1440×810 sur 2340×1080 — 46 % de l'écran, échelle entière 3. En
// vrai plein écran il passe à l'échelle 4, sans qu'une ligne de rendu change :
// le redimensionnement suit le chemin existant (résolution logique/physique),
// tous les calques relisant l'échelle sur la largeur de leur canvas.
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
// `screen` du navigateur (injecté, jamais lu en global — le module doit
// s'exécuter sous Node). Les deux peuvent être absents : c'est un cas normal,
// pas une erreur.
export function creerPleinEcranTactile({ element = null, ecran = null } = {}) {
  // Le loquet est posé sur la TENTATIVE, jamais sur le résultat. Deux raisons,
  // et la seconde est la consigne explicite du ticket :
  //   - un refus du navigateur relancerait sinon une demande à chaque doigt
  //     posé, donc soixante fois par seconde de jeu ;
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

  return {
    // Rend `true` si c'est cette demande-ci qui est partie, `false` si le
    // loquet était déjà posé. La valeur sert aux tests et à un éventuel
    // journal ; l'appelant n'a rien à en faire, et surtout rien à rattraper.
    demanderUneFois() {
      if (demande) return false;
      demande = true;
      try {
        // `webkitRequestFullscreen` : Safari iOS ne l'expose pas sur un
        // élément quelconque, mais le tenter ne coûte rien et ne casse rien.
        const demander = element && (element.requestFullscreen || element.webkitRequestFullscreen);
        if (typeof demander !== 'function') return true;
        const promesse = demander.call(element);
        if (promesse && typeof promesse.then === 'function') {
          promesse.then(verrouillerPaysage, () => {});
        } else {
          // Vieille API sans promesse : on ne sait pas si ça a marché, donc on
          // tente le paysage sans rien présumer — son propre échec est muet.
          verrouillerPaysage();
        }
      } catch {
        // Idem : un geste non reconnu, une iframe sans permission, un
        // navigateur qui n'en veut pas. Le jeu continue tel quel.
      }
      return true;
    },

    dejaDemande: () => demande,
  };
}

// Ce que la SOURIS fait faire au navigateur, et qu'on lui retire (`D-107`).
//
// Demande de Xav (22/09) : « il faut aussi verrouiller le clic droit, qui
// interfère avec le navigateur, comme la V1 ». Jusqu'ici aucun `contextmenu`
// n'était écouté nulle part : un clic droit dans le monde, dans le menu Pause
// ou sur un bouton tactile sortait le joueur du jeu.
//
// POURQUOI LE DOCUMENT, ET PAS LE SEUL CANVAS. Un clic droit dans le menu
// Pause n'a pas plus de sens qu'un clic droit dans la Grotte, et les écrans
// d'UI sont des éléments DOM posés À CÔTÉ du canvas (même raison qui fait
// passer `document.documentElement` en plein écran, cf. plein_ecran.js). Un
// garde posé sur le seul canvas serait donc un garde à moitié posé — et la
// moitié qui manque est justement celle où la souris sert.
//
// CE QU'ON NE COUPE PAS. `contextmenu` n'est pas le chemin du debug : F12,
// Ctrl+Shift+C et le menu ⋮ du navigateur restent intacts. Et pour le cas où
// « Inspecter » manquerait vraiment, `?souris=libre` rend le clic droit — une
// porte d'instrument, comme `?debug=fps` et `?echelle=N`, jamais une option
// de jeu.
//
// EFFET DE BORD VOULU, côté tactile : sur mobile, l'appui MAINTENU déclenche
// lui aussi `contextmenu` (bulle « copier / partager », poignées de
// sélection). Le même garde le fait disparaître, sans une ligne de plus et
// sans toucher `input/touch.js`.
//
// Contrat « meilleur effort », comme `plein_ecran.js` : le module rattrape ses
// propres erreurs à la frontière de son API publique, et une cible absente ou
// muette est un cas NORMAL — le jeu continue exactement comme avant. Le DOM
// n'est touché qu'à l'appel, jamais au niveau module : le fichier reste
// importable depuis Node.

// La porte d'instrument. Même forme que `debug_perf.js#estDebugFpsActif` :
// une fonction pure qui lit une chaîne de requête, et rien d'autre.
export function clicDroitLaisseLibre(search) {
  if (!search) return false;
  return new URLSearchParams(search).get('souris') === 'libre';
}

// Pose le garde sur `cible` (le `document` en jeu, un faux objet en test) et
// rend la fonction qui le retire. Rendre le retrait n'est pas du zèle : c'est
// le seul moyen pour un test de prouver que l'écouteur a bien été posé sur
// l'événement qu'on croit, et de ne pas laisser de garde derrière lui.
export function verrouillerMenuContextuel(cible, { search = '' } = {}) {
  // Laisser libre : on ne pose RIEN. Pas un écouteur qui laisserait passer —
  // un écouteur qui ne fait rien est un écouteur qu'on croit absent le jour
  // où il ne l'est plus.
  if (clicDroitLaisseLibre(search)) return () => {};
  if (!cible || typeof cible.addEventListener !== 'function') return () => {};

  const surMenuContextuel = (evenement) => {
    if (evenement && typeof evenement.preventDefault === 'function') {
      evenement.preventDefault();
    }
  };

  try {
    cible.addEventListener('contextmenu', surMenuContextuel);
  } catch {
    // Muet, par contrat : le jeu se joue très bien avec un menu contextuel.
    return () => {};
  }

  return () => {
    try {
      if (typeof cible.removeEventListener === 'function') {
        cible.removeEventListener('contextmenu', surMenuContextuel);
      }
    } catch {
      // Idem : retirer un garde qui n'a jamais gêné personne ne doit pas
      // pouvoir faire tomber le jeu.
    }
  };
}

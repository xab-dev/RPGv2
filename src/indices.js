// Les indices du menu (demande de Xav, 23/09) : la carte « Indices » de la
// racine du menu, qui partage la case contextuelle de Construction — dans la
// Maison c'est Construction qui l'occupe, partout ailleurs les Indices
// (`menu_cartes.js#resoudreCases`, première candidate présente).
//
// UN INDICE SE LIT OU NE SE LIT PAS. Tant que sa condition `lisible_si` n'est
// pas tenue, le joueur le voit quand même, mais écrit dans les « hiéroglyphes
// de Claude Code » : du code qu'on ne comprend pas encore. C'est l'inverse de
// `visible_si` (`D-62`, une entrée verrouillée est INVISIBLE) et ce n'est pas
// une contradiction : `visible_si` cache ce qui n'est pas encore découvert,
// `lisible_si` montre qu'il y a quelque chose, dans une langue que le héros
// n'a pas encore apprise. Le follet est un LLM scripté (D13⑧) : sa langue
// d'avant le Nv.15, c'est la sienne.
//
// Le brouillage est DÉTERMINISTE (graine tirée de l'id de l'indice) : rouvrir
// le menu montre le même texte, et un texte qui changerait à chaque ouverture
// se lirait comme un bug, pas comme une langue. Il garde la FORME du vrai
// texte (espaces, longueur des mots) : le jour où il devient lisible, le
// joueur peut reconnaître la silhouette de ce qu'il regardait.
//
// Pur : ne connaît ni i18n, ni flags, ni DOM. L'appelant lui passe de quoi
// évaluer une condition et de quoi traduire une clé.
import { mulberry32 } from './decor.js';

// FNV-1a 32 bits : une chaîne → une graine. Le sel distingue le titre des
// lignes d'un même indice, sans quoi deux textes de même longueur
// s'écriraient avec les mêmes signes.
function graineDepuis(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Chaque caractère visible devient un signe de l'alphabet ; les blancs
// restent des blancs. `Array.from` sur l'alphabet : ses signes sortent du plan
// de base (▛, ✻…), et une chaîne JavaScript se compte en unités UTF-16, pas
// en caractères — un signe coupé en deux s'afficherait en losange à « ? ».
export function brouillerTexte(texte, graine, alphabet) {
  const signes = Array.from(alphabet || '');
  if (signes.length === 0) return texte;
  const hasard = mulberry32(graineDepuis(graine));
  return Array.from(texte).map((c) => (/\s/.test(c) ? c : signes[Math.floor(hasard() * signes.length)])).join('');
}

// Les entrées de l'écran Indices, déjà résolues pour `ui/ecran_fiches.js` :
// { id, lisible, titre, icone, lignes }. Les indices non visibles n'y sont
// pas (`D-62`) — `estVisible` est fourni par l'appelant, qui le tient de
// `visibilite.js`, LE filtre anti-spoil.
export function entreesIndices(indices, { estVisible, estLisible, traduire, hieroglyphes }) {
  return indices.filter((indice) => estVisible(indice)).map((indice) => {
    const lisible = indice.lisible_si === undefined || indice.lisible_si === null || !!estLisible(indice.lisible_si);
    const ecrire = (cle, sel) => (lisible ? traduire(cle) : brouillerTexte(traduire(cle), `${indice.id}#${sel}`, hieroglyphes));
    return {
      id: indice.id,
      lisible,
      titre: ecrire(indice.cle_titre, 'titre'),
      icone: indice.icone || null,
      lignes: indice.lignes.map((cle, i) => ecrire(cle, i)),
    };
  });
}

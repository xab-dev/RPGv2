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

// Les lignes d'un indice en hiéroglyphes — LE brouillage d'un indice, lu par
// l'écran Indices (quand il ne se lit pas) ET par la stèle qui le porte
// gravé : le joueur doit pouvoir reconnaître sur la pierre les signes qu'il a
// vus dans le menu. Deux appels à `brouillerTexte` avec leurs propres graines
// finiraient par écrire deux textes différents.
export function lignesBrouillees(indice, traduire, hieroglyphes) {
  return indice.lignes.map((cle, i) => brouillerTexte(traduire(cle), `${indice.id}#${i}`, hieroglyphes));
}

// --- Le DÉCHIFFREMENT (spec 14, §4.1) ------------------------------------------
// Au pied de la pierre, le carnet ouvert, les signes d'un indice se changent en
// lettres « sous les yeux du joueur », UN SIGNE À LA FOIS, dans l'ordre de
// lecture (le titre, puis les lignes). Le brouillage étant déterministe et
// caractère pour caractère (même longueur, mêmes blancs), l'animation n'est
// qu'un mélange entre le texte brouillé et le texte clair : les `n` premiers
// signes sont en clair, les autres encore des hiéroglyphes. Aucun état à part
// du temps écoulé.

function estBlanc(c) {
  return /\s/.test(c);
}

// `textes` : [{ clair, brouille }], dans l'ordre de lecture. `progression` de 0
// à 1. Rend les textes mêlés, dans le même ordre.
export function textesEnDechiffrement(textes, progression) {
  const total = textes.reduce((n, t) => n + Array.from(t.clair).filter((c) => !estBlanc(c)).length, 0);
  let restants = Math.floor(Math.max(0, Math.min(1, progression)) * total);
  return textes.map(({ clair, brouille }) => {
    const signes = Array.from(brouille);
    return Array.from(clair).map((c, i) => {
      if (estBlanc(c)) return c;
      if (restants > 0) {
        restants -= 1;
        return c;
      }
      return signes[i] ?? c;
    }).join('');
  });
}

// Le temps du déchiffrement. `accelere` : B (ou MENU) pendant l'animation ne
// ferme pas l'écran, il l'ACCÉLÈRE jusqu'à la fin — fermer marquerait l'indice
// comme lu sans que le joueur l'ait vu. Un état d'affichage, jamais sauvegardé :
// c'est le flag du déchiffrement qui dit que l'indice est lu.
export function creerDechiffrement(indiceId) {
  return { indiceId, ms: 0, accelere: false };
}

export function accelererDechiffrement(d) {
  return { ...d, accelere: true };
}

// `reglage` : { dechiffrement_ms, acceleration } de `indices_config`.
export function avancerDechiffrement(d, deltaMs, reglage) {
  return { ...d, ms: d.ms + deltaMs * (d.accelere ? reglage.acceleration : 1) };
}

export function progressionDechiffrement(d, reglage) {
  return Math.min(1, d.ms / reglage.dechiffrement_ms);
}

// Les entrées de l'écran Indices, déjà résolues pour `ui/ecran_fiches.js` :
// { id, lisible, titre, icone, lignes, chasseFixe }. Les indices non visibles n'y sont
// pas (`D-62`) — `estVisible` est fourni par l'appelant, qui le tient de
// `visibilite.js`, LE filtre anti-spoil.
// `dechiffrement` (facultatif) : { indiceId, progression } — l'indice en train
// de se déchiffrer s'écrit à mi-chemin, en chasse fixe jusqu'au dernier signe.
export function entreesIndices(indices, { estVisible, estLisible, traduire, hieroglyphes, dechiffrement = null }) {
  return indices.filter((indice) => estVisible(indice)).map((indice) => {
    if (dechiffrement && dechiffrement.indiceId === indice.id && dechiffrement.progression < 1) {
      const textes = [
        { clair: traduire(indice.cle_titre), brouille: brouillerTexte(traduire(indice.cle_titre), `${indice.id}#titre`, hieroglyphes) },
        ...indice.lignes.map((cle, i) => ({ clair: traduire(cle), brouille: lignesBrouillees(indice, traduire, hieroglyphes)[i] })),
      ];
      const [titre, ...lignes] = textesEnDechiffrement(textes, dechiffrement.progression);
      return { id: indice.id, lisible: false, titre, icone: indice.icone || null, lignes, chasseFixe: true };
    }
    const lisible = indice.lisible_si === undefined || indice.lisible_si === null || !!estLisible(indice.lisible_si);
    return {
      id: indice.id,
      lisible,
      titre: lisible ? traduire(indice.cle_titre) : brouillerTexte(traduire(indice.cle_titre), `${indice.id}#titre`, hieroglyphes),
      icone: indice.icone || null,
      lignes: lisible ? indice.lignes.map((cle) => traduire(cle)) : lignesBrouillees(indice, traduire, hieroglyphes),
      // PS4 : les hiéroglyphes en chasse fixe, comme sur la pierre.
      chasseFixe: !lisible,
    };
  });
}

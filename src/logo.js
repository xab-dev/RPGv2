// L'apparition du symbole du jeu — « la sagesse pour tout et pour tous », inventé
// par Xav (journal du 23/09, ticket L2). Le symbole se LIT de haut en bas : la
// sagesse, pour tout, pour tous (la Terre). Il apparaît donc comme il se lit, un
// signe après l'autre, chacun montant de quelques pixels pour se poser, puis les
// trois tiennent ensemble et s'éteignent ensemble.
//
// PUR : temps -> état, jamais de DOM ni de canvas (même discipline qu'`intro.js`
// et `bascule.js`). Toutes les durées viennent d'une entrée `logo` de
// `data/effets.json` : ce fichier n'en code aucune. La géométrie du symbole, elle,
// n'est pas ici non plus : elle vit dans `docs/captures/logo/generer_logo.mjs`, qui
// cuit les trois calques d'image que le rendu superpose.

// Le nombre de signes est celui du symbole, pas un réglage : trois calques
// d'image, dans l'ordre de lecture.
export const NB_SIGNES = 3;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

// Le dernier signe commence après deux décalages, et l'ensemble tient puis
// s'éteint : la durée est DÉRIVÉE des données, jamais une valeur de plus à régler.
export function dureeLogo({ decalage_ms, apparition_ms, tenue_ms, fondu_ms }) {
  return decalage_ms * (NB_SIGNES - 1) + apparition_ms + tenue_ms + fondu_ms;
}

// L'état d'affichage à l'instant `tMs` : un `{ alpha, dy }` par signe (dans
// l'ordre de lecture ; `dy` en px logiques, positif = encore sous sa place) et
// `termine`. Au-delà de la durée, tout est éteint — l'appelant n'a pas à borner.
export function etatLogo(config, tMs) {
  const { decalage_ms, apparition_ms, fondu_ms, montee_px, alpha } = config;
  const duree = dureeLogo(config);
  const debutFondu = duree - fondu_ms;
  // Le fondu de sortie est commun aux trois : ils se sont posés l'un après
  // l'autre, ils s'en vont ensemble — le symbole se quitte entier.
  const sortie = tMs <= debutFondu ? 1 : fondu_ms > 0 ? Math.max(0, 1 - (tMs - debutFondu) / fondu_ms) : 0;
  const calques = [];
  for (let i = 0; i < NB_SIGNES; i++) {
    const t = tMs - i * decalage_ms;
    const p = t <= 0 ? 0 : apparition_ms > 0 ? Math.min(1, t / apparition_ms) : 1;
    const avance = easeOutCubic(p);
    calques.push({ alpha: alpha * avance * sortie, dy: montee_px * (1 - avance) });
  }
  return { calques, termine: tMs >= duree };
}

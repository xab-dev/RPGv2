// Le prologue (`specs/12_prologue.md`) : quelques écrans de texte, avant le
// symbole du jeu, qui disent une fois ce que le jeu ne dira jamais ensuite —
// pas de quête, pas d'objectif affiché, et pourquoi c'est quand même un jeu de
// rôle. Né du premier test par un joueur extérieur (23/09) : il a joué sans
// ennui, mais sans comprendre ce qu'il était venu faire.
//
// PUR : temps + appui -> état, jamais de DOM ni de canvas ni de texte (même
// discipline qu'`intro.js` et `logo.js`). Les écrans, leur ordre et leurs
// durées viennent de `data/prologue.json` ; ce fichier n'en code aucun.
//
// Un écran vit en trois temps : il ENTRE (fondu depuis le noir), il ATTEND
// l'appui du joueur, il SORT (fondu vers le noir) ; puis le suivant entre. Le
// joueur lit à son rythme : aucun écran ne part tout seul.

// `ecrans` : les entrées du catalogue, dans l'ordre. Une liste vide donne un
// prologue déjà terminé — l'appelant n'a pas de cas à part à écrire.
export function creerPrologue(ecrans) {
  return { ecrans, index: 0, tMs: 0, sortieMs: null, termine: ecrans.length === 0 };
}

// L'appui n'est accepté qu'après `armement_ms` : le geste qui a fermé l'écran
// précédent (ou un pouce qui martèle) ne ferme pas celui-ci avant qu'on ait pu
// le voir. Même idée que l'armement de la bulle de dialogue, lue dans les
// données de l'écran plutôt qu'une constante — « Réveille-toi. » n'a pas à
// attendre autant qu'un paragraphe.
export function prologueArme(etat) {
  if (etat.termine || etat.sortieMs !== null) return false;
  return etat.tMs >= etat.ecrans[etat.index].armement_ms;
}

// Avance d'une frame. `appui` : le joueur a demandé la suite CETTE frame (un
// front, jamais un maintien — l'appelant le lit sur `pressed`).
export function avancerPrologue(etat, deltaMs, appui) {
  if (etat.termine) return etat;
  const ecran = etat.ecrans[etat.index];
  if (etat.sortieMs !== null) {
    const sortieMs = etat.sortieMs + deltaMs;
    if (sortieMs < ecran.fondu_ms) return { ...etat, sortieMs };
    const index = etat.index + 1;
    return { ...etat, index, tMs: 0, sortieMs: null, termine: index >= etat.ecrans.length };
  }
  if (appui && prologueArme(etat)) return { ...etat, sortieMs: 0 };
  return { ...etat, tMs: etat.tMs + deltaMs };
}

// L'opacité du texte de l'écran courant, dans [0, 1] : monte à l'entrée,
// descend à la sortie. Un fondu nul est un changement franc, pas une division
// par zéro. Rien à dessiner une fois terminé.
export function alphaPrologue(etat) {
  if (etat.termine) return 0;
  const { fondu_ms } = etat.ecrans[etat.index];
  if (etat.sortieMs !== null) return fondu_ms > 0 ? Math.max(0, 1 - etat.sortieMs / fondu_ms) : 0;
  return fondu_ms > 0 ? Math.min(1, etat.tMs / fondu_ms) : 1;
}

// Le filtre anti-spoil (`D-62`, file Nv.0 → Nv.10, T4).
//
// DÉCISION DE XAV (21/09) : une entrée verrouillée est **invisible**. Pas de
// « ??? », **aucun compteur** du type « 3/12 ». Le principe d'auteur derrière,
// valable pour toute la file : **mystère et découverte** — le joueur doit
// finir par comprendre qu'il y a beaucoup à découvrir *sans qu'on le lui
// montre avant*. Un « ??? » fait exactement le contraire : il annonce.
//
// LE CONTRAT, en une phrase : `visible_si` absent = toujours visible. Ce
// n'est pas une commodité, c'est la garantie que **l'existant ne bouge pas** —
// aucun catalogue d'aujourd'hui ne porte ce champ, donc aucun écran
// d'aujourd'hui ne change. Seul ce qui se débloquera plus tard est caché, et
// seulement parce que quelqu'un l'aura écrit.
//
// UN SEUL POINT, et c'est tout l'intérêt du ticket : tout écran qui liste un
// catalogue (recettes aujourd'hui, armes demain, compétences plus tard) passe
// par `entreesVisibles`. Un deuxième filtre, ailleurs, finirait par diverger —
// et une divergence, ici, signifie montrer au joueur ce qu'il ne devait pas
// voir encore.
//
// Pur : `flags` n'est qu'un objet qui sait évaluer une condition.

// Une entrée est-elle visible ? La condition est évaluée par le registre de
// flags, donc tout ce qu'il sait faire est disponible sans rien ajouter ici :
// un flag, un `all`/`any`/`not`, ou une valeur nommée (`{ valeur: 'niveau',
// min: 10 }`), qui est justement ce dont T5 a besoin pour l'épée en bois.
export function estVisible(entree, flags) {
  if (!entree || entree.visible_si === undefined || entree.visible_si === null) return true;
  return !!flags.evaluate(entree.visible_si);
}

// Les entrées visibles d'un catalogue, dans l'ordre. Rend un NOUVEAU tableau
// et ne touche à rien : les catalogues du registre sont partagés.
//
// Le nom compte : ce n'est pas « filtrer », c'est « les entrées visibles ».
// Un écran n'a jamais à se demander s'il doit filtrer — il demande ce qui est
// visible, et c'est la seule liste qu'il connaît. Il ne peut donc pas
// compter, ni numéroter, ce qu'il n'a pas.
export function entreesVisibles(catalogue, flags) {
  return catalogue.filter((entree) => estVisible(entree, flags));
}

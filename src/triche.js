// `?cheat=phenom` : la triche de Xav, pour ses tests (25/09).
//
// Ce qu'elle donne, et rien d'autre : le dernier niveau de la table, toutes
// les recettes visibles et gratuites, toutes les compétences connues. Ce
// qu'elle ne touche JAMAIS : les flags. Le Gardien, Zéros, le parchemin, les
// dialogues vus attendent chacun leur propre flag ; une triche qui en posait
// un (celui d'une compétence, par exemple) aurait ouvert le coffre du
// parchemin d'avance et fait parler le follet au premier pas. Tout se déroule
// donc comme dans une partie neuve, sauf ce qu'attend un NIVEAU : un vrai
// Nv.50 éveille la stèle et fait venir le chaos d'emblée, et c'est accepté
// (Xav, 25/09 : il suit l'histoire sur une partie sans triche).
//
// La partie trichée s'écrit dans une base à part (`NOM_BASE_TRICHE`) : la
// vraie partie n'est jamais touchée, et se retrouve en retirant le paramètre.
//
// Pur, lu une seule fois au démarrage par `demarrerJeu` (patron de
// `flags.js#lireFlagsForces`) ; l'orchestrateur reçoit un booléen.

// Le mot de passe. Un paramètre de debug comme les autres (n'importe qui peut
// le taper une fois le jeu en ligne : accepté par Xav, nettoyé à la version
// finale).
const CODE_TRICHE = 'phenom';

// La base IndexedDB de la partie trichée (`storage_indexeddb.js`).
export const NOM_BASE_TRICHE = 'rpg_v2_triche';

export function lireTriche(search) {
  if (!search) return false;
  return new URLSearchParams(search).get('cheat') === CODE_TRICHE;
}

// L'XP du dernier niveau de la table, jamais un nombre écrit ici : la table
// peut encore s'allonger, la triche suit.
export function xpNiveauMax(niveaux) {
  return niveaux.reduce((max, n) => Math.max(max, n.xp_cumulee), 0);
}

// Une recette sans coût : ni ingrédient, ni éclat, ni recharge. Ce qui reste
// vrai, parce que ce n'est pas un coût : un outil unique qu'on a déjà, une
// poche pleine. C'est la recette qu'on passe au VERDICT et à `fabriquer` —
// la fiche, elle, continue de dire ce que la vraie recette demande.
export function recetteGratuite(recette) {
  return { ...recette, entrees: [], cout_eclats: 0, cooldown_ms: 0 };
}

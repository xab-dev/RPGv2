// Vol du follet : la **petite orbite du corps** (`D-39`).
//
// Deux points, deux orbites (décision de Xav, 20/09) :
//
//   1. le **point logique** — centre de l'aura, de la lumière et de TOUT
//      calcul de jeu — orbite autour du héros. C'est l'orbite de
//      `companion.js`, inchangée, valeurs comprises.
//   2. le **corps** orbite autour du point logique, sur une orbite plus
//      petite et de sens inverse. Effet recherché : un « chaos maîtrisé »,
//      joli et lisible.
//
// Ce que ce module remplace, et pourquoi. `D-36` décalait le corps par un
// ressort sous-amorti doublé d'un vol stationnaire : l'écart dépendait donc
// de l'HISTOIRE des déplacements du héros, et de rien que le joueur puisse
// lire. Mesuré sur la build d'avant ce ticket : **13,2 px à l'arrêt, 33,4 px
// en course**, pour une aura de rayon 40 — le corps frôlait la sortie de sa
// propre aura dès qu'on courait. Ce n'était pas le décalage qui gênait Xav,
// c'était l'absence de règle : deux points existaient sans relation entre eux.
// Ici, le décalage ne lit QUE le temps. Sa norme vaut le rayon déclaré, à
// tout instant, quoi que fasse le héros.
//
// RÈGLE DIRECTRICE, et elle est stricte : ce module ne produit qu'un
// **décalage visuel**. La position logique du follet, son aura, sa distance
// d'engagement et sa lumière ne bougent pas d'un pixel — sinon l'obscurité
// scintillerait au rythme du vol, et l'aura cesserait d'être un repère exact
// de la zone de jeu. L'appelant dessine la silhouette ici, et continue de
// tout calculer là-bas.
//
// Module PUR, et plus encore qu'avant : aucun canvas, aucune horloge propre,
// **aucun état** — pas même un accumulateur. Une fonction du temps, point.
// C'est ce qui rend la continuité vraie par construction plutôt que mesurée :
// il n'existe plus de chemin par lequel le décalage pourrait sauter (le
// `seuil_saut_px` du ressort, lui, le remettait à zéro d'un coup à chaque
// entrée en scène).

// `tempsMs` : le temps de jeu ACTIF écoulé, fourni par l'appelant. Le module
// n'accumule rien lui-même, pour qu'il n'existe pas de 2ᵉ horloge dans le jeu
// et que le gel sous UI reste l'affaire du point de décision unique de
// `maj()`.
//
// `config` : une entrée de `data/effets.json` de type `vol`, validée au boot
// (rayon, période, sens, phase — toutes *provisoires*, toutes réglables par
// Xav sans toucher une ligne de code).
//
// Rend `{ dx, dy }`, le décalage du corps PAR RAPPORT au point logique.
export function decalageCorpsFollet(tempsMs, config) {
  const { rayon_px: rayon, periode_ms: periode, sens, phase_rad: phase } = config;

  // `sens` vient des données et ne vaut que 1 ou -1 (vérifié au boot) : le
  // sens inverse de la grande orbite est un CHOIX de Xav, pas un signe écrit
  // ici. C'est lui qui fait que la trajectoire composée dessine une rosace
  // plutôt que des boucles qui se rattrapent.
  const angle = phase + sens * (tempsMs / periode) * Math.PI * 2;

  // Un rayon nul donne un décalage nul : c'est le repli prévu au brief
  // (« remettre le corps au centre de l'aura »), et il s'obtient en changeant
  // un nombre en données — jamais en retirant du code.
  return { dx: Math.cos(angle) * rayon, dy: Math.sin(angle) * rayon };
}

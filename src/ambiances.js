// Lignes d'ambiance par palier (`D-61`, file Nv.0 → Nv.10, T3, `Q-34`).
//
// LE PROBLÈME, tel que Xav l'a posé : un joueur qui atteint le niveau 5 sans
// le savoir voit des monstres apparaître sans comprendre ce qui a changé. Le
// jeu n'a **ni journal de quêtes ni objectif affiché** (décision verrouillée)
// et il n'en aura pas : la réponse est la **narration diffuse**.
//
// LE MOTIF, en données : `palier atteint + condition → une ligne de texte,
// une seule fois`. Rien ici ne connaît le niveau 5, la nuit, ni la cendre —
// une entrée de `ambiances.json` les nomme, ce module ne fait que choisir.
// Les lignes futures (Nv. 10, Nv. 20 « quelque chose vient de bouger dans ce
// monde… ») sont des entrées de plus, pas du code de plus.
//
// CE QUE CE MODULE N'EST PAS : un système de déclencheurs généralisé. Il ne
// sait rien faire d'autre qu'ouvrir un dialogue une fois. Le jour où une
// ligne devra faire autre chose, ce sera une autre spec — pas un champ
// `action` ajouté ici « au cas où ».
//
// Pur : ni i18n, ni DOM, ni horloge propre. L'appelant lui donne la scène, la
// phase du cycle, et de quoi évaluer une condition.

// La première entrée qui a le droit de parler, ou `null`. « La première » et
// non « toutes » : deux lignes d'ambiance qui s'ouvriraient dans la même
// frame se recouvriraient, et le joueur n'en lirait qu'une — autant choisir
// laquelle, dans l'ordre du catalogue, et laisser l'autre pour plus tard.
// Elle reviendra d'elle-même à la frame suivante, son flag n'étant pas posé.
export function ambianceADeclencher(ambiances, { sceneId, phase, aDejaVu, evaluerCondition }) {
  for (const ambiance of ambiances) {
    // Le flag d'abord : c'est le test le moins cher, et le plus souvent vrai
    // une fois la partie avancée.
    if (aDejaVu(ambiance.flag)) continue;
    // `scenes` absent = partout. Une ligne sur le vent du nord-est n'a rien à
    // dire au fond d'une grotte, mais c'est la DONNÉE qui le sait.
    if (ambiance.scenes && !ambiance.scenes.includes(sceneId)) continue;
    // `phases` absent = à toute heure. Même forme que les tables
    // d'apparition de `spawns.json` : une phase est une catégorie, pas un
    // nombre, donc elle ne passe pas par les « valeurs nommées » de
    // `flags.js` — en faire un 0/1 serait un booléen déguisé en nombre.
    if (ambiance.phases && !ambiance.phases.includes(phase)) continue;
    if (ambiance.condition !== undefined && ambiance.condition !== null
      && !evaluerCondition(ambiance.condition)) continue;
    return ambiance;
  }
  return null;
}

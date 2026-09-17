// Indices de commande (specs/04_indices-commandes.md) : montre, la première
// fois qu'un verbe de gameplay devient utile, un indice bref (glyphe + mot)
// au HUD — jamais un tutoriel, jamais répété. Pur, testé : aucun accès DOM,
// aucune lecture directe de Gamepad/KeyboardEvent/TouchEvent (le périphérique
// actif est fourni par l'appelant, résolu par src/input/input.js).
//
// Le gameplay ignore que ce module existe : il annonce seulement, chaque
// frame où c'est vrai, "le verbe X est utile maintenant" (declencherVerbeUtile)
// ou "le verbe X vient d'être émis" (verbeEmis) — ce module décide seul s'il
// y a quelque chose à montrer, à partir du flag déjà posé ou non (persisté
// par le registre de flags comme tout le reste, §3.10).

export function creerEtatIndices(registre) {
  const parVerbe = new Map(registre.tous('hints').map((h) => [h.verbe, h]));
  const glyphesParVerbe = new Map(registre.tous('glyphes').map((g) => [g.verbe, g]));

  // `actif` = l'indice actuellement affiché, ou null. Un seul à la fois (§3) :
  // un déclencheur qui arrive pendant qu'un autre indice est affiché n'est
  // pas perdu — il est simplement rappelé chaque frame par l'appelant tant
  // que sa condition reste vraie (ex. le héros est toujours à portée du
  // levier), et réussira dès que `actif` redevient null.
  let actif = null;

  // Verbe DEVENU utile cette frame (niveau, pas front : l'appelant peut
  // rappeler ceci chaque frame tant que la condition tient, cf. ci-dessus).
  // Ne fait rien si déjà montré, si un autre indice occupe déjà l'écran, ou
  // si le verbe n'a pas d'indice déclaré (catalogue ouvert : un verbe sans
  // entrée hints.json ne déclenche jamais rien, ce n'est pas une erreur).
  function declencherVerbeUtile(verbe, flags) {
    const hint = parVerbe.get(verbe);
    if (!hint) return;
    if (flags.has(hint.flag)) return;
    if (actif) return;
    flags.set(hint.flag);
    actif = { hint, resteMs: hint.duree_ms };
  }

  // Verbe RÉELLEMENT émis (pressed, ou mouvement non nul) cette frame — §4 :
  // "verbe émis avant le déclencheur" pose le flag immédiatement (le joueur
  // sait déjà), et ferme l'indice en cours pour ce verbe avant sa durée (le
  // joueur vient de comprendre, §3 : "disparaît ... dès que le verbe est
  // effectivement émis").
  function verbeEmis(verbe, flags) {
    const hint = parVerbe.get(verbe);
    if (!hint) return;
    if (!flags.has(hint.flag)) flags.set(hint.flag);
    if (actif && actif.hint.verbe === verbe) actif = null;
  }

  // Compte à rebours — l'appelant ne le tique que hors UI (§4 : "indice actif
  // quand une UI s'ouvre : masqué, reprend au retour", même point de décision
  // unique que le reste du gameplay).
  function maj(deltaMs) {
    if (!actif) return;
    actif.resteMs -= deltaMs;
    if (actif.resteMs <= 0) actif = null;
  }

  // Données de rendu pour le calque HUD (résolution des clés i18n confiée à
  // l'appelant, comme le reste de main.js#dessiner() — ce module ne connaît
  // pas i18n). `peripheriqueActif` est relu ICI à chaque appel (jamais figé à
  // l'affichage) : §3 "si le joueur change de périphérique pendant l'indice,
  // l'indice se met à jour".
  function indiceAffiche(peripheriqueActif) {
    if (!actif) return null;
    const glyphe = glyphesParVerbe.get(actif.hint.verbe);
    const cleGlyphe = glyphe ? glyphe[`${peripheriqueActif}_key`] : null;
    return {
      verbe: actif.hint.verbe,
      label_key: actif.hint.label_key || null,
      glyphe_key: cleGlyphe || null,
      resteMs: actif.resteMs,
      dureeMs: actif.hint.duree_ms,
    };
  }

  return { declencherVerbeUtile, verbeEmis, maj, indiceAffiche };
}

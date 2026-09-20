---
projet: RPG V2
session: `D-37` — engagement et relâche du follet
date: 2026-09-20
type: journal de session (archivé)
---

## Journal de session — `D-37` : le follet engage par ce qu'on voit, relâche avec une marge, et ne se téléporte jamais (20/09)

Un ticket, un commit, branche `main` (pas de `push`). Fiche : `docs/archives/MT_follet-engagement-relache_2026-09-20.md`. 97 fichiers de test, 96 verts — le seul rouge est `D-52`, antérieur à ce ticket. Ménage fait en entrant : le journal de `D-51` est archivé (`docs/archives/JOURNAL_2026-09-20_aura-reelle.md`, ligne d'INDEX ajoutée), la fiche du ticket rangée dans `docs/archives/`.

**Ce qui restait de `D-37`, et c'est maintenant clos.** `D-51` avait traité la moitié « l'aura n'a aucun effet ». Restait la règle d'engagement : le follet partait sur un monstre à 48 px **du héros** — ni l'orbite (24), ni l'aura (30), ni leur union. Le cercle pointillé mentait donc sur la portée, et il mentait dans les deux sens.

**La règle livrée, telle que Xav l'a dite.** Engager : le monstre est **dans l'orbite** (distance héros → monstre ≤ 24) **ou dans l'aura** (distance follet → monstre ≤ 30). Relâcher : distance héros → monstre **> orbite + aura + 12** = 66 aujourd'hui ; à 66 il tient, à 67 il revient. Il n'existe plus de constante de portée propre au follet : `DISTANCE_ENGAGEMENT_PX` est **retirée**, et c'est le point du ticket — le jour où un talisman doublera l'aura (`Q-29`), la portée d'engagement suivra sans qu'on touche à rien. Tout passe par les deux fonctions de résolution (`resoudreOrbiteRayonPx`, `resoudreRayonAuraPx`), jamais par les constantes.

**Les 12 px sont fixes, et c'est une nature différente.** Ce n'est pas une portée, c'est l'épaisseur du bord : une hystérésis. L'ancien code engageait et relâchait au **même** seuil — un monstre immobile pile dessus faisait clignoter l'état. Orbite et aura grandiront ; cette marge, non.

**Un garde-fou que Xav n'a pas demandé, et pourquoi il fallait le poser.** Un monstre n'est engageable que s'il est **aussi** en deçà de la distance de relâche. Sans lui : un follet qui rentre, son aura effleurant un monstre à 70 px, l'engagerait (l'aura le touche) puis le relâcherait aussitôt (la relâche, elle, se mesure du héros) — à chaque frame, indéfiniment. Marqué en commentaire à l'endroit exact de la ligne.

**L'approche ne saute plus.** `avancerPosition` copiait la position du monstre d'un coup (`x: cible.x`) : jusqu'à ~66 px en une frame, un flash. Aller et retour suivent désormais la **même** loi amortie (2,25 px/frame au plus sur le cas mesuré, puis collé). Conséquence voulue et cohérente avec `D-51` : l'aura arrive **avec** le follet, l'effet commence quand le cercle touche le monstre, pas à l'instant de la décision.

**Une seule source, y compris hors du module.** L'indice de commande ATTACK (`specs/04_indices-commandes.md` §3) lisait la constante ; il appelle maintenant `monstreEngageable` lui-même. L'indice apparaît donc exactement quand le follet partirait, par construction — un test de source le verrouille (`main.js` ne connaît plus le nom de l'ancienne constante).

**Tests** (`tests/test_d37_engagement_relache_2026-09-20.js`, sur le **catalogue réel**) : la constante a disparu et la relâche vaut bien 24 + 30 + 12 · engagement par l'orbite seule (follet à 500 px, hors de cause) · par l'aura seule (monstre hors orbite, follet de son côté — et le même monstre non engagé quand l'aura ne le touche pas) · le garde-fou (aura collée à un monstre au-delà de la relâche → rien) · 66 tient / 67 revient · **600 frames sur un monstre pile à la frontière, un seul état vu** · plusieurs candidats → le plus proche du héros, sans dépendre de l'ordre du tableau · aucun saut de position, mais convergence · réengagement d'un second monstre pendant le retour · contrôle de source pour l'indice ATTACK. `test_phase1_companion` est migré : son point 6 épinglait « collé au monstre dès la 1ʳᵉ frame », c'est-à-dire exactement le flash que ce ticket supprime — il vérifie maintenant que le follet avance sans se téléporter **et** qu'il finit collé.

**Hors périmètre, signalé sans rien toucher.**
- **`D-53`** (neuve) : `ORBITE_LERP = 0,15` est appliqué **par frame**, pas par seconde. Le follet est donc plus mou à 37 fps qu'à 60, et l'approche livrée ici hérite du défaut puisqu'elle reprend volontairement la même loi. Remède connu, local, une ligne (`1 - (1 - k) ** (deltaS * 60)`) — mais c'est un changement de *feel*, donc à l'œil de Xav.
- **`D-52`** reste ouverte et rouge : `test_d34_follet_echelle_jeu` épingle `echelle_jeu === 0,75` quand le catalogue dit 0,66 depuis les réglages à la main de Xav. Antérieure à ce ticket, non touchée.
- **`V-33`** (aura réelle) et **`V-34`** (cette règle) se regardent ensemble : même cercle, même réglage. Rappel du point de réglage signalé avec `D-51` — l'aura (30) dépasse l'orbite (24), donc elle passe **sur** le héros.

**Ce que ce ticket n'a pas touché, et c'est voulu** : `status.js`, `vol_follet.js` (le décalage visuel du corps), les données, le rendu au-delà d'un commentaire devenu faux dans `render.js`.

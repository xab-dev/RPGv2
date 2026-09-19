---
projet: RPG V2
episode/session: `D-23` — paramètre debug `?echelle=N`
type: journal de session
version: 1.0.0
statut: archivé
catégorie: Journal
date: 2026-09-19
ids_suivi: [D-23, A-05, D-29, V-13]
genere_par: claude
verifie_par: xav
---

## Journal de session — `D-23` : le paramètre debug `?echelle=N` (2026-09-19)

Ticket `MT_echelle-debug_2026-09-19.md`, qui clôt `D-23`. Lignes touchées :
`D-23` (close), `A-05` (dégelée), plus deux ouvertes — `D-29` (reste trouvé
dans le périmètre de lecture) et `V-13` (validation de non-régression).
`Q-19` **n'est pas touchée** : ce ticket livre l'instrument, pas la décision.
Ni `D-01`, ni `D-02`, ni `D-03` n'ont été lues. Suite headless verte,
**71 fichiers**. Un commit, pas de `push`.

**Ménage de journal** : journal de `D-05` archivé dans
`docs/archives/JOURNAL_2026-09-19_texte-flottant.md` + ligne d'INDEX ; la
fiche `MT_texte-flottant_2026-09-19.md` descend dans `docs/archives/`. Cinq
renvois « journal courant » de la table des décisions, devenus faux depuis
l'archivage des sessions précédentes, pointent désormais leur archive.

### Le changement

- **`debug_perf.js#lireEchelleForcee`** — pure, même patron que
  `estDebugFpsActif` : `location` n'est lu qu'une fois, au boot, par
  `main.js`. Rend toujours `{ echelle, avertissement }`. Une valeur invalide
  rend `echelle: null` **et** un avertissement, jamais une valeur de repli
  plausible : mesurer à 4 en croyant mesurer à 9 fausserait `A-05` en
  silence. L'avertissement est *rendu*, pas écrit — ce module ne connaît pas
  la console.
- **`render.js#calculerEchelleRendu`** — l'échelle naturelle, sauf si une
  échelle forcée la remplace. Délègue à `calculerEchelleEntiere` plutôt que
  de refaire le calcul.
- **`render.js#echelleDepuisCanvas`** — LA dérivation de l'échelle à partir
  d'un canvas déjà dimensionné. Les trois calques (statique, obscurité,
  paupières) l'écrivaient chacun de leur côté (`largeur / RESOLUTION_LOGIQUE.
  largeur`, trois fois) ; ils l'appellent maintenant. C'est ce qui rend vraie
  la phrase du ticket « aucun calque ne recalcule sa taille de son côté »,
  et ce qui la rend *vérifiable*.
- **`render.js#dimensionnerCanvasRendu`** — pure, donc testable, alors que
  `ajusterCanvasLogiquePhysique` (qui l'appelle) ne l'est pas. Elle porte le
  contrat de non-régression.
- **`definirEchelleForcee` / `etatEchelleRendu`** — une variable de module,
  posée une fois au boot. `render.js` ne lit toujours pas `location` : il
  doit rester importable depuis Node.
- **Relevé `?debug=fps`** : une ligne de plus, `échelle : 3 (forcée) —
  naturelle : 5`, ou `échelle : 5 (naturelle)` sans paramètre.

### Ce que le ticket ne dit pas et qu'il a fallu trancher

**Deux fonctions, pas un paramètre de plus sur `calculerEchelleEntiere`.**
La fiche dit « l'échelle forcée remplace l'échelle naturelle dans la
fonction pure de résolution (paramètre optionnel) ». Ajouter le paramètre à
`calculerEchelleEntiere` elle-même l'aurait fait remonter dans
`calculerRectanglePresentation`, qui l'appelle — et la boîte affichée aurait
rétréci avec le canvas, au lieu que le navigateur agrandisse. Le hit-test
tactile serait parti avec elle. `calculerEchelleRendu` est donc une seconde
porte, qui délègue ; la présentation garde la première. Accessoirement, une
échelle forcée a le droit d'être décimale, ce que le nom « entière »
démentirait.

**L'échelle qui fait foi est celle du canvas réel, pas celle demandée.**
`?echelle=3.3` donne une largeur de 1584 px (arrondie) ; c'est `1584 / 480`
que tous les calques liront ensuite, et c'est donc cette valeur-là qui est
posée sur le contexte et qui dérive la hauteur. Sinon l'image serait étirée
dans un sens et pas dans l'autre — et personne ne l'aurait vu venir avant
l'œil de Xav.

### Ce que les tests peuvent et ne peuvent pas dire

`tests/test_d23_echelle_debug_2026-09-19.js` (6 blocs), écrit avant le code,
rouge à l'import. Le bloc central est **négatif** : sur la table d'écrans du
ticket (1920×1080 dpr 1 → 4 ; 2961×1449 dpr 3,5 → 5 ; 720×1600 dpr 2 → 3),
sans paramètre, l'échelle et les dimensions du canvas sont **exactement**
celles d'avant, au pixel près. Le reste : lecture du paramètre (bornes,
décimales, cumul avec `?debug=fps`, les sept valeurs invalides et leur
avertissement) · échelle 3 sur l'écran de `R-04`, calques cohérents entre
eux, ~2,78× moins de pixels · échelles décimales · **tactile** — le
rectangle de présentation est identique avec et sans forçage, donc un appui
tombe au même endroit logique, vérifié plutôt que déduit.

Le contrat de `formaterReleve` dans `test_mesure_saccades_2026-09-19.js` a
été mis à jour **volontairement** (un champ optionnel à valeur de repli
aurait masqué un jour un branchement oublié entre `render.js` et
l'instrument — exactement le défaut que `D-03` traque).

**Le dessin n'est jamais exercé** (contrainte de méthode). Une passe unique
hors suite de tests, contre un contexte 2D factice et l'écran de `R-04`, a
confirmé qu'aucun calque ne lève sous échelle forcée et que le voile suit le
canvas (`null` → 2400×1350, `3` → 1440×810, `3.3` → 1584×891) — dont la
valeur non forcée **retrouve exactement** le « obscurité 2400×1350 (échelle
5) » inscrit dans `R-04`. Ça ne dit rien de ce que ça donne à l'œil. Le
contrôle au navigateur réel n'a pas pu être fait : l'extension Chrome n'est
pas connectée.

### Ce que j'ai vu et n'ai pas corrigé

**Point de vigilance du ticket : levé.** Aucun calque ne se positionne sur
`ctx.canvas.width/height` — `ui/hud.js`, `ui/dialogue_box.js`,
`ui/hud_hints.js` et `visuels.js` portent tous un commentaire qui dit
explicitement qu'ils écrivent en unités logiques, hérité du diagnostic
« dialogues invisibles ». Les seules lectures de ces dimensions sont celles
des trois calques, et elles passent maintenant par une fonction commune.

`D-29` : **`image-rendering: pixelated` est toujours dans `index.html`**,
alors que la décision verrouillée du 15/09 l'interdit et que le commentaire
de `render.js#presenter` le décrit déjà au passé. Sans effet observable
aujourd'hui — `presenter()` dimensionne le canvas visible en pixels
physiques et sa boîte en pixels CSS, donc le mappage vers la grille de
l'appareil est 1:1 et il n'y a rien à ré-échantillonner ; l'agrandissement
de `?echelle=N`, lui, est fait par `drawImage` (lissage de contexte), pas
par le CSS. La fiche n'autorisait à corriger que si ça empêchait la mesure :
ce n'est pas le cas, y compris sur l'émulation de `R-04`.

### Validation due par Xav — puis `A-05`

`render.js` est touché : clôture par une validation en jeu guidée par
`docs/CHECKLIST_visuelle.md`, **sans aucun paramètre d'URL** (`V-13`) — la
seule chose que ce ticket peut casser est la non-régression. Ensuite
seulement les relevés `A-05` (`echelle=5, 4, 3` sur l'émulation de `R-04` ;
`4, 3, 2` sur PC plein écran), avec à chaque fois le relevé **et** un
verdict à l'œil. Ce sont eux qui trancheront `Q-19`, pas ce ticket.

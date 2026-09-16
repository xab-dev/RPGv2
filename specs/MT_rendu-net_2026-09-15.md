# RPG V2 — Micro-Ticket : rendu net à résolution physique (2026-09-15)

## Objectif

Le jeu rend tout (formes vectorielles, dégradés de lumière, texte 9 px) sur un canvas hors-écran de 480 × 270 puis l'agrandit par facteur entier — ×4 en plein écran 1080p. Résultat : tout est pixélisé, y compris le texte du HUD et le bord du halo. Cette pipeline (`specs/02_grotte.md` §2.2, « pixel art net ») était prévue pour du pixel art. **Décision Xav 2026-09-15 : le jeu n'est pas en pixel art** — style « assemblage moderne » (géométrie, emoji, superpositions, jeux de lumière, cf. V1). Le rendu doit donc être net à la résolution physique de l'écran, **sans changer le cadrage** : 480 × 270 reste le système de coordonnées logiques (validé, c'est la dimension des salles que Xav veut garder).

## Cible

- Fichier : `src/render.js` — `RESOLUTION_LOGIQUE` (inchangée), création des canvas hors-écran (scène et voile d'obscurité), boucle de présentation, `calculerRectanglePresentation`, `versCoordonneesLogiques`.
- Fichier : `tests/test_phase1_render_resolution_2026-09-15.js` — adapter les attendus si la taille du canvas hors-écran y est en dur.
- `specs/02_grotte.md` §2.2 : une ligne pour remplacer « pixel art net » par la décision ci-dessus (report de décision, pas de refonte de la spec).

## Consigne précise

1. **Découpler coordonnées logiques et résolution de rendu.** Le canvas hors-écran de scène passe de `480 × 270` pixels à `480·f × 270·f` où `f` est le facteur de présentation ; avant tout dessin d'une frame, `ctx.setTransform(f, 0, 0, f, 0, 0)`. Tout le code de dessin (`dessinerScene`, `hud.js`, `dialogue_box.js`, aura, étiquettes) continue d'écrire en unités logiques et **n'est pas modifié** : un texte 9 px logique sort en 36 px physiques nets à ×4.
2. **Même traitement pour le canvas hors-écran du voile d'obscurité** (`dessinerObscurite`, introduit par le diagnostic lisibilité) : même taille physique, même transform, composition inchangée (`drawImage` du voile sur la scène). Le dégradé radial du halo doit avoir un bord lisse à l'écran.
3. **Présentation** : `drawImage` du canvas hors-écran vers le canvas visible à l'identique (1:1 physique), letterbox et centrage inchangés. Toute désactivation de `imageSmoothingEnabled` (si présente, héritée du mode pixel art) est retirée — commenter pourquoi.
4. **Facteur calculé en pixels physiques, pas CSS** : `f = floor(min(largeurPhysique / 480, hauteurPhysique / 270))` avec `largeurPhysique = largeurCSS × devicePixelRatio`. Le canvas visible a `width/height` en pixels physiques et `style.width/height` en pixels CSS. Pourquoi : sur un téléphone en 360 px CSS de large à DPR 3, le calcul actuel en CSS donne `f = 0` (rien ne s'affiche ou tout est minuscule) alors que la dalle fait 1080 px de large et permet ×2. Le test tactile de Xav sur téléphone dépend directement de ce point.
5. `versCoordonneesLogiques` (hit-test tactile, partagé par `main.js` et `touch.js`) reste la réciproque exacte de la présentation : les événements tactiles arrivent en pixels CSS, la fonction doit donc prendre le DPR en compte au même endroit que le point 4 — **une seule** définition du facteur, jamais deux.
6. Aucun autre seuil ne change (`OPACITE_OBSCURITE_MAX`, rayons, layout HUD, positions tactiles).

## Contrainte stricte

Ne toucher qu'aux fichiers listés. Aucun changement dans `hud.js`, `hud_layout.js`, `main.js`, `camera.js`, `scene.js`, données JSON. Commentaires en français, *pourquoi* pas *quoi*. Le facteur reste entier (bandes noires acceptées), ce ticket ne rouvre pas le débat échelle fractionnaire.

## Test de validation

Automatisé : `node tools/run_tests.js` toute la suite verte ; `test_phase1_render_resolution` étendu avec un cas DPR (ex. 360 × 640 CSS à DPR 3 → `f = 2`, canvas 960 × 540 physiques, et aller-retour `versCoordonneesLogiques` exact sur ce cas). `node --check src/render.js`.

Manuel (Xav) :
- Plein écran 1080p : texte `41/58` net, cercles du héros/follet à bord lisse, halo sans marches d'escalier ; le cadrage de la salle est **identique** à avant (même nombre de tuiles visibles).
- Fenêtré : idem à ×2.
- Téléphone (Chrome Android, via `http://<ip-pc>:8080`) : le jeu remplit la largeur, `f ≥ 2`, un tap au centre exact du bouton attaque déclenche `attack`.

## Hors scope

Sprites/assets graphiques, style visuel des salles, toit de la Maison (Phase 2), HUD, obscurité, tactile hors le point 5, échelle fractionnaire, Phase 7.

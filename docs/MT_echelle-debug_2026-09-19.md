---
projet: RPG V2
episode/session: Fondations — mesure de l'échelle de rendu
type: micro-ticket (instrument de mesure)
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [D-23, Q-19, A-05]
genere_par: claude
verifie_par: xav
---

# MT — Paramètre debug `?echelle=N`

**Traite `D-23`. Prépare `Q-19` sans la trancher. Ne touche ni à `D-01`, ni à `D-02`, ni à `D-03`.** Un commit : `D-23 parametre debug ?echelle=N (mesure seule)`.

## Hypothèse à tester

Le coût de `dessiner()` suit le nombre de pixels physiques (`R-02` → `R-04` : pixels ×1,56, `dessiner()` ×1,67). Si c'est vrai, dessiner à une échelle plus basse et laisser le navigateur agrandir divise le coût d'autant — et il reste à savoir si **l'œil de Xav** voit la différence. Ce ticket livre l'instrument, pas la décision.

## Même esprit que `MT_mesure-saccades`

**Zéro correction.** Sans le paramètre, le comportement est **strictement identique** à aujourd'hui, et un test le prouve.

## Périmètre de lecture

`src/render.js` : les fonctions **pures** de résolution logique/physique et le dimensionnement des calques (statique, obscurité) · l'endroit où `?debug=fps` est lu · `src/ui/hud_debug.js` · `src/debug_perf.js` si le relevé y est assemblé · `src/input/touch.js` : **uniquement** la conversion des coordonnées du pointeur.

## Comportement

- `?echelle=N`, N de 1 à 8, décimales admises. Indépendant de `?debug=fps`, cumulable. Valeur invalide → ignorée, un avertissement console.
- L'échelle forcée **remplace** l'échelle naturelle dans la fonction pure de résolution (paramètre optionnel). Tous les calques en **dérivent** : aucun calque ne recalcule sa taille de son côté.
- La boîte CSS du canvas ne change pas : le navigateur agrandit, en **lissé**. `image-rendering: pixelated` reste interdit (décision verrouillée).
- Le relevé `?debug=fps` gagne une ligne : `échelle : 3 (forcée) — naturelle : 5`.

## Tests (rouge d'abord)

1. **Non-régression** : sans paramètre, la fonction de résolution rend exactement les mêmes valeurs qu'avant, sur une table d'écrans (1920×1080 dpr 1 ; 2961×1449 dpr 3,5 ; un 720×1600 dpr 2).
2. Échelle forcée à 3 sur l'écran de `R-04` : canvas et calques aux dimensions attendues, **tous cohérents entre eux**.
3. Valeurs invalides ignorées.
4. **Tactile** : un appui sur un bouton virtuel tombe au même endroit logique avec et sans échelle forcée.

## Point de vigilance

C'est exactement la zone du diagnostic « dialogues invisibles » : un calque qui lit `ctx.canvas.width/height` pour se placer sera faux sous échelle forcée. Si un tel calque existe, le **signaler** (ligne `D-`) ; ne le corriger que s'il empêche la mesure.

## Validation en jeu (Xav) — puis relevés `A-05`

1. Sans paramètre : rien n'a changé (`CHECKLIST_visuelle.md`, états HUD, dialogue, nuit).
2. Émulation de `R-04`, protocole de traversée, à `echelle=5`, `4`, `3`. PC plein écran à `4`, `3`, `2`.
3. À chaque échelle, noter le relevé **et** un verdict à l'œil : net / acceptable / flou — sur le texte du HUD, les bords du héros, le halo du follet la nuit.

Ces lignes rejoignent le registre §6 du suivi (`R-05` et suivantes). Elles tranchent `Q-19`.

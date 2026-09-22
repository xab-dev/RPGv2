---
projet: RPG V2
episode/session: Fondations — mesure du coût de rendu par calque
type: micro-ticket (instrument de mesure)
version: 1.1.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [D-02, D-03, Q-19]
genere_par: claude
verifie_par: xav
---

# MT — Ventiler `dessiner()` par calque

**Traite `D-02` et `D-03` (même instrument). Prépare `Q-19` sans la trancher. Ne touche ni à `D-01`, ni à `D-04`.** Un commit : `D-02 D-03 ventilation de dessiner() par calque (mesure seule)`.

## Ce qu'on sait déjà (relevés de Xav, 19/09 soir, PC, Firefox, F11, 1920×1080)

| Échelle | Pixels (×échelle²) | `dessiner()` moy / p95 | Recalcul calque moy | Ressenti de Xav |
|---|---|---|---|---|
| 1 | 1 | 7,32 / 8 ms | 1,48 ms | ultra fluide, ultra moche |
| 2 | 4 | 8,94 / 11 ms | 2,91 ms | très fluide, le flou fait forcer les yeux |
| 3 | 9 | 11,68 / 15 ms | 4,48 ms | jouable, presque fluide, flou acceptable |
| 4 (naturelle) | 16 | **non mesuré ce soir** (prévu ≈ 15,5 ms) | — | saccadé |
| 5 | 25 | 21,9 – 22,5 / 30 ms | 8,8 – 9,8 ms | injouable |

Les trois premiers points sont presque parfaitement alignés :

> **`dessiner()` ≈ 6,8 ms + 0,55 ms × échelle²**

Deux coûts distincts, donc deux chantiers :

1. **Une part fixe d'environ 7 ms, qui ne dépend pas des pixels.** À l'échelle 1 il n'y a presque rien à remplir, et la frame coûte quand même 7,3 ms avec 0 monstre, 4 interactifs et 6 objets. C'est du travail de processeur : nombre d'appels au canvas, chemins reconstruits, dégradés recréés à chaque frame, texte.
2. **Une part proportionnelle aux pixels** : ≈ 8,7 ms à l'échelle naturelle 4.

À l'échelle 4, la somme laisse environ 1 ms de marge sur 16,7 : la moindre frame de recalcul la dépasse. **Ce ticket doit dire, calque par calque, d'où vient chacune des deux parts.**

Relevé de nuit (échelle 3, Forêt) : 11,87 ms, contre 11,68 de jour. **La nuit ne coûte rien de plus que le jour** : soit l'obscurité est négligeable, soit elle est composée même de jour. La ventilation tranche.

## Direction donnée par Xav (à servir, pas à décider ici)

Nets, à l'échelle de l'écran : le héros, les stations et interactifs, le HUD, tout texte. Peuvent descendre : le sol (« presque mieux un peu flou »), l'obscurité. D'où le besoin : **connaître le coût de chaque calque séparément.**

## Périmètre de lecture

`src/main.js#dessiner()` · `src/render.js` : la composition de la scène et chaque fonction de calque qu'elle appelle · `src/debug_perf.js` · `src/ui/hud_debug.js` · leurs tests. Rien d'autre.

## À livrer

### 1. Ventilation (`D-02`)

Sous `?debug=fps` seulement — **coût nul sans le paramètre**, même patron que les crochets `surFrame` / `surRecalcul` existants.

Sections minimales, à adapter à la structure réelle du code (la dire dans le rapport) :

`blit du calque statique` · `entités` (interactifs, objets au sol, héros, follet, monstres) · `effets` (poussière, texte flottant, anneau, aura) · `toit` · `obscurité — génération` · `obscurité — composition` · `HUD canvas` (bandeau, barre du bas, indices) · `dialogue` · `reste` (= total − somme des sections).

Le relevé gagne un bloc : une ligne par section, **moyenne en ms et part en %**, sur la même fenêtre de 600 frames que le reste.

### 2. Fiabilité de l'instrument (`D-03`)

- Le chronomètre du navigateur est arrondi à 1 ms (toutes les durées des relevés sont entières). **Par section, n'afficher que la moyenne** : la différence de deux horodatages arrondis reste juste en moyenne, jamais par frame. Pas de p95 par section.
- Vérifier l'hypothèse : le delta par frame vient de l'horodatage de `requestAnimationFrame`, calé sur le vsync (d'où p95 = max = 33,38 ms). Si oui, l'écrire dans le relevé : renommer « frames > 20 ms » en **« frames sautées »**.
- Ajouter une ligne `non attribué : delta moyen − maj() − dessiner()`. Proche de zéro = le processeur est le facteur limitant ; élevé = l'attente est ailleurs (composition du navigateur, GPU).
- Ajouter au relevé deux lignes de contexte qui ont manqué ce soir : **navigateur** (nom + version courte) et **plein écran : oui / non**.

### 3. Deux vérifications en lecture (rapport seulement, zéro correction)

- **Taille du calque statique.** Relevés de Xav : `1728×1056` sur le chemin, `1728×1152` en Forêt, à la même échelle. Si le canvas du calque change de dimensions en cours de jeu, il est **réalloué** : suspect pour les pics de recalcul (un maximum à 17 ms relevé à l'échelle 3). Dire si c'est le cas et pourquoi (`D-01`).
- **Objets recréés à chaque frame** dans les fonctions de calque : dégradés, chemins, chaînes de couleur, tableaux. Les lister avec le fichier et la fonction. C'est la piste de la part fixe de 7 ms.

## Interdits

**Zéro correction de rendu.** Aucun changement d'échelle par calque, aucun cache ajouté, aucune fonction de dessin réécrite. Si une correction paraît évidente : une ligne `D-` dans le suivi, avec le gain attendu.

## Tests

Agrégats par section dans `debug_perf.js` (pur) : moyenne, part, `reste` jamais négatif. Non-régression : sans `?debug=fps`, aucun crochet n'est appelé.

## Validation (Xav)

Touche `render.js` → coup d'œil en jeu sans paramètre (rien ne doit avoir changé). Puis **trois relevés**, protocole de traversée, F11, manette :

1. `?debug=fps` seul (échelle naturelle 4) — **le relevé qui manque ce soir** ;
2. `?debug=fps&echelle=2` ;
3. `?debug=fps` de nuit.

La comparaison 1 ↔ 2, section par section, montre quels calques suivent les pixels et lesquels n'y sont pas sensibles.

**Dans quel navigateur (ajout du 19/09, 23 h).** Relevé de Xav sous **Chrome**, F11, échelle forcée à 8 : 59,9 fps, `dessiner()` 0,34 ms, aucune frame sautée. Chrome enregistre les ordres de dessin et les fait exécuter par la carte graphique, hors du fil principal : le chronomètre de `dessiner()` n'y mesure plus le coût du rendu. Sous **Firefox**, sur cette machine, le dessin s'exécute sur le fil principal et le chronomètre voit tout.

- Les trois relevés ventilés se font donc sous **Firefox, qui sert de banc de mesure** : c'est là que le coût de chaque calque est lisible.
- Le **ressenti** se valide sous **Chrome, navigateur de référence**. Y refaire le relevé 1 : seuls comptent les fps et les frames sautées.
- La formule « 6,8 ms + 0,55 × échelle² » vaut **pour Firefox sur cette machine**, pas pour le jeu en général.

## À consigner au ménage de journal (registre §6 du suivi)

`R-05` éch. 5 · `R-06` éch. 5 bis (étiqueté « 4 » par erreur : le relevé affiche « 5 (forcée) ») · `R-07` éch. 3 · `R-08` éch. 2 · `R-09` éch. 1 · `R-10` nuit, éch. 3, Forêt, hors protocole (ne remplace pas `R-03`). Contexte commun : PC, Firefox, F11, 1920×1080 dpr 1, jour, manette, trajet Grotte → Maison → Grotte. Dans `Q-19`, ajouter la direction de Xav (échelle **par calque** plutôt que plafond global) et la formule ci-dessus. Dans `D-04`, noter que `R-10` montre un écart de position du héros de −2,8 à +1,9 px en Forêt : c'est l'amplitude de la correction de coin, désormais visible dans l'instrument.

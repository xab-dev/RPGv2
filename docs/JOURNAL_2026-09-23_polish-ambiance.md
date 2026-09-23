---
projet: RPG V2
episode/session: Polish ambiance — sombre, rustique, fantasy
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : polish ambiance (23/09, soir)

Session autonome demandée par Xav : « coller un peu plus à l'esprit du jeu :
**sombre** (contrasté par la lumière que porte le héros), **médiéval** (rustique) et
**fantasy** (particule, orbite, géométrie), en prévision des futures annexes encore
plus dark (biome et météo différents). » Un commit par étape, dans l'ordre :
carrés d'herbe sous les arbres → grain du chemin → grain de l'herbe → forêt →
grotte → icône éclat → harmonisation libre.

**Hors cible, jamais touchés** : héros, feu follet, stations, arbre et rocher de
récolte, flaque d'eau, items actuels (« il faut les garder rudimentaires »).

Branche `polish-ambiance-2026-09-23`, jamais poussée. Captures : scénario
`tools/scenarios/polish_ambiance.mjs` (sorties non versionnées, sous
`docs/captures/scenarios/polish-ambiance-2026-09-23/`, témoin `avant_*`).

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `f3a69a6` | `D-146` (`Q-70`) | Carré foncé sous chaque arbre de la forêt : `render.sol` (référence au sol, grain compris) remplace la copie du grain dans les visuels récoltables. Objets hors cible inchangés, seules les copies retirées |
| — | `D-147` | Chemin : trois dessins × miroir par case (`render.visuel_variantes`, `render.miroir`, `decor.js#varianteTuile`), galets à ombre portée, fissures, gravier fin en queue (premier retiré par `grain_sol`). La table des grains devient une liste par tuile |
| — | `D-148` | Herbe : trois dessins × miroir (touffes en V, brins épars), mouchetis en queue. Couleurs intouchées (`E-04`) ; le damier de teintes proposé en `Q-74` |
| — | `D-110`, `D-149` | Forêt : chêne et sapin en variantes de `visuel_arbre` (gardé en tête), miroir ; ombre de sous-bois déclarée sur la zone (`opaciteOmbreZones`, maximum avec le cycle, jamais une seconde couche). Valeur `[OUVERT]` en `Q-75` |
| — | `D-150` | Grotte : sol de pierre (fissures, galets, mousse, gravier ; 3 grains × miroir), murs en moellons (2 appareils × miroir, dans la cellule), cristal luminescent en décor |

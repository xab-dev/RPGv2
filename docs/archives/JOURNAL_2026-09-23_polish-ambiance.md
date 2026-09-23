---
projet: RPG V2
episode/session: Polish ambiance — sombre, rustique, fantasy
type: fichier de bord
version: 1.0.0
statut: clos
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
| — | `D-151` | Icône éclat : halo, orbite, étincelles ; dans la boîte des icônes (test). Animation proposée en `Q-76` |
| — | `D-152` | Harmonisation : un motif de décor émet de la lumière (`lumiere`), les cristaux percent le voile d'un halo teinté ; touche `render.js` (checklist visuelle) |

## Mesure (fin de session)

`tools/scenarios/cout_calque.mjs`, `main` servi à part (worktree jetable, port 8091)
comme témoin, trois exécutions par côté. Recalcul du calque statique sous Moyen :
**4,1 → 6,4-8,7 ms**, frames > 20 ms 0/600 des deux côtés ; sous bridage ×6 :
**32 → 55 ms**, même nombre de frames lentes (une par franchissement), plus
longues. Sous Bas (défaut tactile) : dans le bruit. Consigné en `D-153` avec un
remède possible, non appliqué.

## Ce qu'il faut en retenir

- **Le sol d'un objet est une référence** (`render.sol`) : la copie du grain dans
  les visuels récoltables aurait refait le carré dès l'étape 3. Faire l'étape 1
  par le mécanisme, et non par une copie de plus, est ce qui a rendu les étapes
  2 et 3 gratuites pour les arbres, le rocher et le fruitier.
- **La répétition se casse par la case, pas par la texture** : trois dessins et
  leur miroir, tirés au hash spatial, suffisent — le grain d'origine est gardé
  tel quel en tête (`E-04`), seules des couches s'ajoutent.
- **Le sombre vient d'une ombre de zone, pas d'une palette plus sombre** : le
  sous-bois assombrit par le même voile que la nuit, et c'est la lumière que
  porte le héros qui fait le contraste. La nuit reste intacte.
- **Hors cible respectée** : héros, follet, stations, arbre et rocher de récolte,
  flaque, items — aucun dessin touché. Les visuels récoltables n'ont perdu que
  leur copie de grain (l'objet est identique au pixel près).
- `D-110` était rangée « rang 2 de la passe de polish carte, spec `E-04` » : elle
  est faite ici sur la demande explicite de Xav (« Forêt »). Commit retirable seul.

## Ouvert pour Xav

`V-82` à `V-88` (une validation par étape), `Q-74` (damier de teintes de l'herbe,
bloqué par `E-04`), `Q-75` (combien d'ombre sous les arbres), `Q-76` (animer
l'éclat au bandeau), `D-153` (coût du calque).

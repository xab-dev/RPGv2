# RPG V2 — SPEC : Stations — proportions et collision d'entité

**Version : 1.0.0** — 2026-09-16. Ferme le point `[OUVERT]` « stations placeholder non solides » du journal Phase 2. Verdict Xav : les collisions absentes ne gênaient pas en jeu, **les proportions si** — la table est plus petite que le héros. La logique voulue : stations à l'échelle **×2 à ×2,2** de leur taille actuelle, **et** collision sur certains items (table, coffre, atelier, puits en premier lieu).

**Contexte déjà disponible pour Claude Code** : `CLAUDE.md` (journal Phase 2, décision de ne pas avoir ajouté de collision d'entité faute de 2ᵉ cas d'usage — ce fichier est ce cas d'usage, décidé par Xav), `specs/03_maison-exterieur.md` §3.4/§3.5 et §6, `src/structures.js`, `src/scene.js` (collision 4 coins / tuiles solides), `src/puzzles.js` (interactifs, seuil d'interaction), `data/scenes.json` (positions des stations), `docs/SD_hitbox-angle-arbre_2026-09-16.md` (à livrer **avant** : la correction de coin change la résolution de collision, ce module doit s'appuyer sur la version corrigée).

## 1. Rôle du module

Donner aux interactifs une **empreinte solide optionnelle**, déclarée en données, résolue par la même fonction de collision que les tuiles — et redimensionner les stations placeholder pour qu'elles aient une taille crédible face au héros. Les stations de la Phase 3 (vraies) hériteront de l'empreinte sans code.

## 2. Entrées / Sorties

**Données** — sur chaque entrée `interactifs[]` (et sur la définition de type dans `puzzles.json` si c'est là que vit le rendu) :

| Champ | Contenu |
|---|---|
| `echelle` | facteur de rendu, provisoire ; stations : `2.0` à `2.2` (Xav ajuste au ressenti), leviers : `1` (inchangés) |
| `solide` | `false` par défaut (leviers, portes conditionnelles inchangés) ; `true` sur table, coffre, atelier, puits |
| `empreinte` | optionnel : rectangle `{x, y, w, h}` relatif à la position, en px logiques ; par défaut = la boîte englobante du rendu à l'échelle |

**Entrée runtime** : position/hitbox du héros, vecteur `MOVE` — via `scene.js`, comme pour les tuiles.

**Sortie** : le héros ne traverse plus les entités `solide`, glisse le long comme sur un mur ; `INTERACT` continue de fonctionner depuis l'extérieur de l'empreinte.

## 3. Comportement attendu

- **Une seule fonction de collision** : les empreintes solides sont ajoutées à l'ensemble des obstacles testé par le glissement axe par axe (avec la correction de coin du SD), pas une seconde passe. Empreintes en px logiques, pas alignées à la grille — un puits n'occupe pas forcément une tuile entière.
- **Seuil d'interaction mesuré au bord de l'empreinte**, pas au centre : avec une station ×2,2 solide, la distance au centre depuis l'extérieur dépasserait le seuil actuel du levier. Une seule règle pour tous les interactifs (un levier sans empreinte a une empreinte de taille nulle → comportement identique à aujourd'hui).
- **Positions dans la maison** : après agrandissement, vérifier en données qu'un couloir d'au moins 1 tuile libre + marge relie porte ouest, chaque station et porte est. Déplacer une station **en JSON** si nécessaire, documenter le déplacement (la Phase 3 change le `type` à la même position — la position finale est celle validée ici).
- Rendu : mêmes formes géométriques, mises à l'échelle ; la lisibilité « identifiable sans la couleur » (§6 Phase 2) reste.
- Items au sol (branche, fruit) et ressources sur tuile : **inchangés** (les tuiles-ressources sont déjà solides via la grille).

## 4. Edge cases à gérer

- Héros **à l'intérieur** d'une empreinte au chargement (sauvegarde antérieure avec une position désormais solide) : repousser vers la case libre la plus proche au chargement, une fois, en le loguant — jamais bloquer le joueur au boot. Test dédié.
- Empreinte qui chevauche une tuile solide ou une autre empreinte : toléré (l'union est solide), mais une empreinte qui bouche une porte de la maison = échec du test de chemin critique, pas une surprise en jeu.
- `solide: true` sans rendu (interactif invisible) : refusé au boot — une collision invisible est un bug garanti.
- Le follet (`suivre`) ignore les empreintes comme il ignore les murs aujourd'hui — ne pas lui en donner.

## 5. Structure des fichiers

```
src/scene.js          (obstacles = tuiles solides ∪ empreintes des interactifs solides)
src/puzzles.js        (seuil d'interaction au bord de l'empreinte)
src/structures.js     (échelle, empreinte par défaut)
src/render.js         (rendu à l'échelle — rejouer CHECKLIST_visuelle états 19-23 + maison)
src/schemas.js        (echelle, solide, empreinte)
data/scenes.json, data/puzzles.json
tests/test_stations_collision_<date>.js
tests/test_phase2_chemin_critique_<date>.js  (étendu : traversée de la maison avec stations solides)
```

## 6. Consignes d'autonomie pour Claude Code

- Livrer **après** `SD_hitbox-angle-arbre` (dépendance sur la résolution de collision corrigée).
- Empreintes rectangulaires seulement ; pas de collision circulaire ni de polygone (aucun cas d'usage).
- Valeur d'échelle initiale : `2.1`, marquée provisoire, un seul endroit par défaut (`structures.js`) surchargeable par entrée.
- Ne pas anticiper le placement libre des stations (D20③, Phase 3) : positions fixes.

## 7. Critères de validation

Automatisé : suite verte ; test dédié : héros bloqué par une station solide sur les 4 côtés, glisse le long ; `INTERACT` fonctionne depuis chaque côté à portée ; levier sans empreinte inchangé ; héros sauvegardé dans une empreinte repoussé au chargement ; interactif solide sans rendu refusé ; chemin critique porte ouest → porte est → jardin toujours praticable.

Manuel (Xav, manette) : stations visiblement plus grandes que le héros, crédibles ; on ne les traverse plus ; « pas encore » s'ouvre en s'approchant de n'importe quel côté ; la maison se traverse sans accrochage (cf. SD). Verdict sur l'échelle.

## 8. Hors scope pour cette itération

Stations réelles, coffre, recettes, placement libre (Phase 3) ; collision des ennemis entre eux ou avec les stations (Phase 4) ; sprites.

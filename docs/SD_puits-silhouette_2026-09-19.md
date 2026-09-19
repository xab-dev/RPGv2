---
projet: RPG V2
episode/session: Polish 4/7
type: ticket diagnostic (SD)
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — SD : puits — silhouette désolidarisée depuis l'échelle ×2,1

**Dette connue** (2026-09-17). Précision de Xav (2026-09-19) : l'agrandissement n'a pas agrandi chaque pièce qui compose le puits — les pièces ne tiennent plus ensemble, les mâts en bois sont trop courts.

## Cause racine d'abord

Dans `visuel_puits` (`data/visuels.json`) et `visuels.js#dessinerVisuel` : lister chaque primitive et dire, pour chaque longueur, position et **épaisseur de trait**, si elle suit l'échelle ou non. Le défaut est soit dans les données (proportions qui ne tenaient déjà qu'à l'échelle 1), soit dans l'interprète (une propriété non mise à l'échelle). **Si c'est l'interprète, le défaut concerne tous les visuels** : le dire, corriger là, et vérifier table, coffre, atelier.

## Attendu

Un puits lisible : margelle, deux mâts qui montent jusqu'au toit, toit posé sur les mâts, seau. Les pièces se touchent à toute échelle. L'empreinte solide (boîte englobante des primitives, `structures.js`) reste cohérente avec le dessin ; si elle change, vérifier que le puits ne mord ni sur un chemin ni sur la zone de réapparition du fruit.

## Tests

À partir des boîtes par primitive : mâts ↔ margelle et mâts ↔ toit se touchent ou se chevauchent, aux échelles 1, 2,1 et 3. Ajouter une entrée de visuel reste possible sans code (test data-driven).

## Vérification visuelle

Si un navigateur piloté est disponible (Claude in Chrome) : capture du puits avant/après dans le journal, de jour. Sinon : nouvel état dans `docs/CHECKLIST_visuelle.md`, dû par Xav. Le headless ne juge jamais l'esthétique.

**Règles communes** : ménage de journal d'abord ; une session = ce ticket, rien d'autre ; toute valeur nouvelle en données, commentée, marquée *provisoire* ; `node --check` + `node tools/run_tests.js` verts ; journal dans `CLAUDE.md`. Les noms de fichiers cités viennent de la section Architecture de `CLAUDE.md` — si le code réel diffère, le code fait foi, le dire dans le journal.

# Journal archivé — Micro-ticket contraste et durées jour/nuit (2026-09-17)

Archivé verbatim depuis `CLAUDE.md` le 2026-09-17 (ménage de journal, avant la session `MT_musique-ambiance-synth_2026-09-16.md`).

---

## Journal de session — Micro-ticket contraste et durées jour/nuit (2026-09-17)

Ménage de journal effectué en début de session : le journal précédent (« Diagnostic accrochage des coins + arbre introuvable ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-16_diagnostic-accrochage-arbre.md`, index mis à jour.

Brief complet : `MT_jour-nuit-contraste_2026-09-16.md` v1.1 (racine du dépôt). Suite du verdict Xav sur le critère de passage Phase 2 : sources de lumière bonnes, contraste jour/nuit insuffisant + cycle à durées égales pas assez lisible (nuit trop courte, « pas franche »).

### Conflit du ticket remonté à Xav avant code

Le ticket demandait à la fois « monter la nuit de +0,10 à +0,15 » et « sans dépasser `OPACITE_OBSCURITE_MAX` (le plafond de la grotte, référence unique) » — or `PHASES_CYCLE.nuit.opacite` valait déjà exactement 0.72, la même valeur que l'obscurité de la grotte (`data/scenes.json`, les deux scènes grotte). Impossible d'appliquer les deux consignes ensemble, et impossible de relever le plafond de la grotte elle-même (la fiche interdit de toucher aux données JSON). Point de design non tranché → question bloquante posée à Xav plutôt que résolu en silence (règle de méthode du projet). **Réponse de Xav : la nuit extérieure peut dépasser le plafond de la grotte** — ce 0.72 n'était qu'une valeur de référence de départ, pas une limite dure partagée entre intérieur et extérieur.

### Implémentation (`src/daynight.js`)

- **Jour = 0 exactement** (était 0.05) : de jour, `dessinerObscurite` ne produit plus aucun voile.
- **Nuit = 0.85** (était 0.72, +0.13 — au milieu de la fourchette +0,10/+0,15 demandée et de la fourchette ~0.82-0.87 validée par Xav), au-delà du plafond de la grotte par décision explicite ci-dessus.
- **Crépuscule et aube calés exactement sur leur voisin de plateau** (crépuscule = opacité du jour, aube = opacité de la nuit) plutôt que sur l'indication initiale du ticket (« un tiers/deux tiers du niveau nuit ») : cette indication supposait un jour non nul et devient inapplicable une fois jour=0 fixé — la seule façon de garder jour et nuit réellement plats (§6 du ticket, « une nuit franche, pas un pic isolé ») tout en gardant une transition continue (aucun saut, contrainte de continuité déjà actée en Phase 2) est que la phase de transition démarre exactement à la valeur du plateau qu'elle quitte. Conséquence appréciable : ce calage produit les plateaux **gratuitement**, par le mécanisme d'interpolation existant (deux phases voisines de même opacité n'ont rien à interpoler) — aucune restructuration de l'algorithme d'interpolation, seulement des données et son unité (ms au lieu de fraction, point suivant).
- **Durées par phase** (remplace `DUREE_CYCLE_MS` unique découpé en fractions égales) : jour 600000 ms (10 min), crépuscule 90000 ms, nuit 240000 ms (4 min francs), aube 90000 ms — `DUREE_CYCLE_MS` est maintenant la somme calculée des `duree_ms`, jamais une constante indépendante qui pourrait diverger. `PHASES_CYCLE[].debut` (fraction [0,1)) remplacé par `duree_ms` (ms) ; `opaciteAHeure`/`phaseAHeure` retravaillées pour indexer par ms cumulés au lieu de fraction — même forme d'algorithme (interpolation vers la phase suivante), signatures publiques inchangées (`avancerHeure(heureMs, deltaMs)`, `opaciteAHeure(heureMs)`, `phaseAHeure(heureMs)`), donc `main.js` n'a pas eu à bouger. `save.monde.heure` reste une position en ms dans le cycle (c'était déjà le cas, pas une fraction 0-1) : aucune migration de sauvegarde nécessaire, la sémantique du champ ne change pas, seule la longueur du cycle qu'il indexe change.

### Test (`tests/test_phase2_daynight_2026-09-16.js`)

Les blocs qui référençaient `phase.debut` (fraction) adaptés pour calculer les débuts cumulés en ms depuis `duree_ms`, indépendamment du détail interne de `daynight.js`. Bloc d'interpolation (test 3) déplacé sur la transition crépuscule→nuit (la seule rampe réelle, puisque jour/nuit sont maintenant des plateaux et n'ont plus de saut à interpoler avec leur voisin immédiat). Trois blocs ajoutés, tels que demandés par le ticket : durées exactes par phase + somme (test 5), plateaux jour/nuit échantillonnés à plusieurs points internes, pas seulement aux bornes (test 6), et transition qui ne dépasse jamais le niveau nuit ni ne descend sous le niveau jour, échantillonnage dense sur tout le cycle (test 7).

### Livré et validé

```
node --check src/daynight.js tests/test_phase2_daynight_2026-09-16.js
node tools/run_tests.js
```
→ **43 fichiers, tous verts** (aucun fichier ajouté ni retiré, seuls `src/daynight.js` et le test du même nom modifiés — contrainte stricte de la fiche respectée, confirmé par `git status`).

Validation manuelle (navigateur réel, manette) **non faite par l'agent cette session** — la fiche la réserve explicitement à Xav (forcer l'heure aux 4 phases, comparer au rendu actuel).

Fichiers modifiés : `src/daynight.js`, `tests/test_phase2_daynight_2026-09-16.js`, `CLAUDE.md` (ce journal). Fichiers archive ajoutés : `docs/archives/JOURNAL_2026-09-16_diagnostic-accrochage-arbre.md`, `docs/archives/INDEX.md` mis à jour.

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : durées de l'intro cinématique (`03_grotte-polish.md` §9).

### Critère de passage — reste à faire par Xav

Forcer l'heure aux 4 phases dans un vrai navigateur, à la manette (méthode : `docs/CHECKLIST_visuelle.md`, état nuit). Attendu : de jour, aucune différence perceptible avec le rendu actuel hors cycle ; de nuit, scène nettement plus sombre qu'avant, halo du follet et fenêtre de la maison toujours lisibles ; jour → crépuscule → nuit → aube → jour progressif, sans à-coup perceptible malgré le saut de plafond (0.72 → 0.85) par rapport à la grotte. Verdict de Xav sur les nouvelles valeurs (nuit à 0.85 : assez sombre ? trop ? durées de 17 min au ressenti ?) à recueillir avant de considérer ce réglage définitif.

### Hors scope pour cette session

Indicateur jour/nuit au HUD, palette des tuiles de jour, lumières statiques supplémentaires, obscurité de la grotte (`data/scenes.json` non touché) — tous explicitement exclus par la fiche.

# RPG V2 — Micro-Ticket : reports documentaires avant Phase 2 (2026-09-16)

## Objectif

Les specs et la carte mentale ont pris du retard sur ce qui a été tranché et validé en jeu depuis le 2026-09-15 : elles affichent encore comme « provisoire » ou « à écrire » des points fermés depuis plusieurs sessions. Ce ticket remet les documents à jour **sans une ligne de code** — la Phase 2 (`04_maison-exterieur.md`) démarre sur des documents qui disent vrai.

Lire d'abord `CLAUDE.md` en entier (les journaux de session sont la source de vérité de ce qui suit), puis `specs/03_grotte-polish.md` §9-§10.

## Cible

- `specs/carte_mentale_RPG_V2_v1_2_0.md` → renommée `specs/carte_mentale_RPG_V2_v1_3_0.md` (`git mv`), version 1.3.0 + changelog en tête ; toutes les références au nom de fichier mises à jour (`grep -rn "v1_2_0" --include=*.md .` — attendu : `CLAUDE.md`, `specs/00_ROADMAP.md`, `specs/02_grotte.md`, éventuellement d'autres specs)
- `specs/02_grotte.md` — §2.2, §7 point 3, §9, §10
- `specs/00_ROADMAP.md` — tableau « Design » ligne Effets d'état ; esquisse Phase 1 ; ligne de statut de phase courante
- `CLAUDE.md` — bloc « État actuel du dépôt » + une entrée de journal courte en fin de fichier

## Consigne précise

Chaque ligne ci-dessous = un report. Reporter **la décision et sa date**, jamais une reformulation : le texte source est dans `CLAUDE.md` (journaux) ou `03_grotte-polish.md` §10.

### A. Carte mentale — branches

| Branche | Avant | Après |
|---|---|---|
| **C3③** mapping manette | 🟡 à faire | ✅ ABXY = attaque + 3 skills, gâchette = consommable, LB = interact, Start = menu (n'ouvre qu'un menu fermé), **B = retour dans toute UI**. **Croix directionnelle réservée à de futures actions secondaires, n'alimente jamais `MOVE`** (décision Xav 2026-09-15). Mapping **validé à la manette réelle** le 2026-09-16. |
| **C3⑦** hot-swap | 🟡 | ✅ manette ↔ clavier validé en jeu (2026-09-15). |
| **C3②** mapping tactile | 🟡 | Reste 🟡 mais préciser : **dette assumée par Xav jusqu'aux compétences (Phase 4)** — choix du follet au stick, pas au tap direct ; ergonomie des boutons à revoir alors (2026-09-16). |
| **C7①** orientation | 🟡 | ✅ paysage (déjà acté `02_grotte.md` §2.2). |
| **C7②** résolution de référence + scaling | 🟡 | ✅ **480 × 270 logique**, cadrage à échelle entière, **rendu net à la résolution physique** (canvas hors-écran en pixels physiques, DPR pris en compte). **Le jeu n'est pas en pixel art** — style « assemblage moderne » (géométrie, emoji, superpositions, lumière). Validé sur capture 2026-09-15, rendu net validé 2026-09-16. |
| **D2③** définition d'une synergie | 🟡 bloqué par D6③ | ✅ une synergie = **un effet sur le joueur + un effet sur le monstre engagé dans l'aura**, par élément, en données (`synergies.json` + `status_effects.json`). Débloqué. |
| **D3②** schéma d'une arme | 🟡 | Ajouter au schéma : **`portee {min, max}` en tuiles — la portée de l'auto-attaque vient de l'arme, jamais d'une stat** (décision Xav 2026-09-15). Ex. épée en bois `[0;1]`, épée en pierre `[0;1.1]`, arc `[2;4]` (pas de corps-à-corps). Le reste du schéma (raretés, effets…) reste 🟡 pour la Phase 4. |
| **D6③** table des synergies | 🟡 **à écrire, bloquant** | ✅ **écrite et actée le 2026-09-15**, `02_grotte.md` §3.4, valeurs provisoires à équilibrer en jeu. Retirer la phrase d'entête « Seule exception à traiter en premier : la table des synergies… » et celle de D6① « les synergies restent entièrement à écrire ». |
| **D11** follet | (déjà ✅) | Préciser : `rayon_lumiere` = 110 px logiques **validé** ; la lumière est collée au follet, seul halo statique = level design (2026-09-16). |
| **D19①** survie | 🟡 | Reporter la formule actée : **`stat_effective = stat × (0,5 + 0,5 × jauge_moyenne)`, `jauge_moyenne = (nourriture + eau) / 2`, appliquée à Force et Agilité** ; plancher (0,5) et pente **par zone, en données** (`scenes.json`), pour rendre zone de monstres et château plus punitifs que Maison/Poste avancé. Vitesse de décroissance = Phase 3. (Décision Xav 2026-09-15 — voir §C ci-dessous, la spec le dit encore au conditionnel.) |
| **P4** / rendu | — | Ajouter la ligne de DA : **jamais de noir absolu** — obscurité **par scène** (0,72 en grotte, ~0,9 pour les futures cartes « vides » éclairées par le seul follet) ; **direction artistique validée en jeu le 2026-09-16** sur le catalogue `visuels.json` (une seule fonction de rendu). |

Mettre à jour le compteur « Avancement : 30 🟢 / 8 🟡 / 0 ⚪ / 1 🔵 » au compte réel après ces changements (compter, ne pas estimer).

### B. Carte mentale — table des décisions datées

Ajouter une ligne par décision ci-dessus, au même format que les lignes `| 2026-09-15 | D3① | … | … |` existantes, avec sa vraie date (15 ou 16). Ajouter aussi :

- `2026-09-16 | Phase 1 | Cinématique d'intro : oui, ≤ 10 s, non skippable, prérequis = catalogue visuel verrouillé`
- `2026-09-16 | D5 | Feedback de combat : anneau + barre de PV du monstre + flash blanc au coup`
- `2026-09-16 | C7⑤ | Anti-spam dialogue : frame consommée + machine à écrire + armement, ATTACK reste la confirmation`
- `2026-09-16 | P4 | Couleur neutre du héros avant le choix : gris moyen désaturé + contour clair — validé en jeu`

### C. `specs/02_grotte.md`

- §2.2 : « Résolution logique **provisoire : 640 × 360** … voir `[OUVERT]` §9 » → **480 × 270, validée par Xav le 2026-09-15**, et une phrase renvoyant au MT rendu-net (rendu net à résolution physique, pas pixel art — la phrase existe déjà, la rattacher).
- §7 point 3 (« donner un verdict sur 640 × 360 ») → marquer fait.
- §9 : le tableau `[OUVERT]` devient vide → remplacer par « Aucun point ouvert — résolution tranchée le 2026-09-15 (480 × 270). »
- §10, puce Survie : remplacer « Affectation provisoire : nourriture → Force, eau → Agilité (à confirmer en Phase 3 ; variante possible : moyenne des deux jauges…) » par la formule actée de A/D19① (moyenne des deux jauges, appliquée aux deux stats, plancher et pente par zone en données). Garder l'exemple chiffré.
- §10, puce Portée : retirer « À reporter dans la carte mentale (D3② schéma d'arme) » — c'est fait par ce ticket.
- Changelog en tête : passer en **1.2.0** avec une ligne « reports documentaires 2026-09-16 ».

### D. `specs/00_ROADMAP.md`

- Tableau Design, ligne Effets d'état : « Table des synergies élémentaires : à écrire (livrable Phase 1) » → « **écrite, `02_grotte.md` §3.4** ».
- Esquisse Phase 1 : ajouter une ligne de statut « **Livrée** (Phase 1 + polish 1b, `02_grotte.md` / `03_grotte-polish.md`) — manette réelle et DA validées le 2026-09-16 ; tactile en dette assumée jusqu'à la Phase 4 ». Ne pas réécrire le contenu de l'esquisse.
- Phase 2 : ajouter « **Phase courante** — spec à venir : `04_maison-exterieur.md` ».

### E. `CLAUDE.md`

- Bloc « État actuel du dépôt » : remplacer la longue phrase d'état par un état à jour en 3-4 lignes : Phase 0 validée ; Phase 1 + 1b livrées, **validées en jeu à la manette réelle, DA validée** (2026-09-16) ; tactile en dette assumée jusqu'à la Phase 4 ; Phase 2 courante, spec à venir. Les journaux détaillés restent intacts en fin de fichier.
- Nouvelle entrée de journal, courte (≤ 15 lignes) : « Reports documentaires (2026-09-16) » — liste des fichiers touchés, rappel qu'aucun code n'a changé, résultat de la vérification ci-dessous.
- Section « Point `[OUVERT]` » du dernier journal : les deux hérités sont fermés — clignements/orbite (fait par 1b, 2026-09-16) et gris neutre (validé en jeu, 2026-09-16). Le dire.

## Contrainte stricte

- **Aucun fichier de `/src`, `/data`, `/locales`, `/tests`, `/tools` n'est touché.** `git diff --stat` en fin de session ne doit montrer que des `.md` (et le renommage de la carte mentale).
- Report fidèle, jamais de réinterprétation : en cas de doute sur une formulation, copier celle du journal `CLAUDE.md` correspondant et citer la date.
- Ne rien fermer qui ne soit pas listé ici. Un point rencontré en cours de route qui semble tranché mais n'est pas dans ce ticket reste tel quel et est signalé dans l'entrée de journal.
- Commentaires/texte en français.

## Test de validation

```
grep -rn "640" specs/ CLAUDE.md
```
→ ne doit rester que des occurrences historiques (changelogs, journaux datés du 15), aucune valeur « provisoire » ou « courante » à 640.

```
grep -rn "à écrire" specs/carte_mentale_RPG_V2_v1_3_0.md specs/00_ROADMAP.md
```
→ zéro occurrence concernant les synergies.

```
grep -rn "v1_2_0" --include=*.md .
```
→ zéro occurrence (hors changelogs qui citent l'ancienne version comme historique).

```
grep -rn "\[OUVERT\]" specs/02_grotte.md specs/03_grotte-polish.md
```
→ chaque occurrence restante est explicitement marquée fermée avec sa date.

```
git diff --stat
```
→ uniquement des `.md`. Puis `node tools/run_tests.js` par acquit de conscience : 27+ fichiers verts, inchangés (rien n'a été touché).

## Hors scope

- Tout code, toute donnée JSON, tout test.
- Équilibrage des valeurs de synergies (restent provisoires dans la spec).
- Rédaction de `04_maison-exterieur.md` (prochaine conversation avec Xav).
- Réorganiser ou condenser les journaux de `CLAUDE.md`.
- Remapping joueur (C3⑤), cloud (C5⑤), plancher mobile (C11①) — toujours ouverts, ne pas y toucher.

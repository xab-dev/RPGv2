---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), le topo, puis le palier A — les niveaux jusqu'au Nv.50
type: fichier de bord
version: 1.0.0
statut: livré, à valider par Xav (V-149)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier A (24/09)

Demande de Xav : le topo de la spec 14 avant tout code, ses précisions, puis « go palier A ». Branche `annexe-1`, partie de `main` (identique à `carte-lisieres-perf` : fusionnée et en ligne après la spec 13). Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `90f0c23` | Ménage | Journal du palier F de la spec 13 archivé, INDEX à jour ; la ligne périmée de `CLAUDE.md` (« B1 et B2 à trancher ») corrigée : ils l'étaient depuis la v1.1.0 |
| `b48b7c4` | DOC, spec 14 v1.3.0 | `Q-138` : la vue rapprochée de la stèle d'abord, avec une action **Descendre** ; `Q-146` : l'équilibrage au **ressenti de Xav** (`mesure_boss.mjs` retiré), `?niveau=N` retiré (Xav a une vraie sauvegarde Nv.30) ; le §6 ne contredit plus le §4.9 (une migration v8 → v9, au palier I) ; `Q-137` à `Q-148`, citées par la spec mais jamais écrites, inscrites au suivi |
| `0b00217` | DOC, spec 14 v1.3.1 | Zéros : jumeau, double, miroir de Héros, **habillé en blanc** ; `Q-141`, `Q-142`, `Q-144`, `Q-145` : défauts acceptés par Xav |
| `8814150` | DOC, spec 14 v1.3.2 | Zéros : le yin et le yang, il a découvert les secrets des follets, le « Follet Blanc » à glisser dans son dialogue ; `E-05` (les textes de l'Annexe) |
| `f5519b3` | Tests, spec 10 | La première sauvegarde réelle en v8 (la Nv.30) faisait tomber `test_spec10_alignement_palier_a` : il supposait toutes les sauvegardes antérieures à la v8. Une sauvegarde migrée naît neutre, une sauvegarde déjà en v8 garde son alignement |
| *(ce commit)* | `D-205` — palier A | Nv.31 à 50, un flag par niveau exigé au démarrage, `crediter` part du niveau crédité |

## 1. Le palier A

- **Données** : `levels.json` du Nv.31 (2 495 XP) au Nv.50 (6 390 XP), l'écart croissant de 5 XP par niveau comme avant, +1 point par niveau (*provisoire*). `flag_niveau_31` à `_50`, traduits FR/EN.
- **Le garde-fou** : `schemas.js` refuse au démarrage un niveau dont le flag manque. Le nom du flag est fabriqué en **un seul point**, `xp.js#flagDeNiveau`, que `main.js` utilise aussi (il l'écrivait en dur).
- **La cause racine trouvée en ouvrant le palier** : `xp.js#crediter` partait du niveau que l'XP donne, pas du niveau crédité. Une table qui s'allonge fait donc sauter en silence les niveaux « déjà atteints sur le papier », sans flag ni point. Ce n'est pas théorique : `rpg_v2_saveJaune lvl10 sword.json` (Nv.10, 560 XP, sauvegardée quand la table s'arrêtait au Nv.10) serait passée au Nv.14 au gain suivant, sans les quatre points. **Remède** : `crediter` part du niveau crédité, et ne rétrograde jamais (un test, un outil ou une table raccourcie peuvent poser un niveau que l'XP ne justifie pas). Au chargement, `main.js#appliquerXpHeros(0)` rattrape les niveaux dus, après les flags, et le dit en console.
- **Première tentative ratée, à retenir** : la première version du rattrapage reprenait le niveau que l'XP donne. Neuf tests posaient un niveau à la main sans l'XP : ils ont été rétrogradés au Nv.1. D'où le « jamais repris ».
- **Pas de `?niveau=N`** (`Q-146`).
- **Test** : `tests/test_spec14_palier_a_niveaux_2026-09-24.js` — la table (contiguë, XP croissante, Nv.50 au moins), un flag traduit par niveau, le refus au démarrage, `crediter` (niveau dû rendu, jamais repris), le rattrapage de l'orchestrateur, et les **15 sauvegardes réelles** : aucune ne perd ni ne gagne un niveau qu'elle n'a pas, la Jaune reçoit ses Nv.11 à 14, la Nv.30 passe au Nv.31 avec son flag et son point.
- `node tools/run_tests.js` : **197 fichiers, tous verts**.

## 2. Le banc de la spec 13

Règle de la spec 14 : chaque palier passe `cout_calque` et `traversee_nuit` (Chrome sans fenêtre, 1920 × 1080, Bas, Moyen, Haut, ×1 et ×6) contre les chiffres de clôture de la spec 13 (`docs/archives/JOURNAL_2026-09-24_spec13-palierF.md` §5). Ce palier ne touche ni le rendu ni la carte : on attendait le bruit, c'est le bruit. **Aucun écart au-delà de 20 %** ; le plus grand est +10 % sur une reconstruction de 0,40 → 0,44 ms (Bas ×1, nuit), soit 0,04 ms.

| Scénario | Preset | ×1 (clôture → palier A) | ×6 (clôture → palier A) |
|---|---|---|---|
| `cout_calque` : reconstruction moy / max · frames > 20 ms | Bas | 0,92 / 5,6 → **0,84 / 5,4** · 0/600 | 4,05 / 6,4 → **3,99 / 7,3** · 0/600 |
| | Moyen | 1,52 / 10,4 → **1,45 / 9,3** · 0/600 | 6,41 / 13,1 → **6,56 / 14,1** · 1/600 |
| | Haut | 1,56 / 8,6 → **1,53 / 9,8** · 0/600 | 7,75 / 12,7 → **7,50 / 12,5** · 0/600 |
| `traversee_nuit` : `dessiner()` · `maj()` · reconstruction · frames > 20 ms | Bas | 0,58 · 0,17 · 0,40 → **0,59 · 0,16 · 0,44** · 0/4 443 | 4,13 · 1,13 · 2,10 → **4,04 · 1,13 · 2,07** · 1/4 441 |
| | Moyen | 0,66 · 0,19 · 0,89 → **0,57 · 0,17 · 0,81** · 0/4 443 | 4,17-6,02 · 1,04-1,51 · 4,5-5,6 → **4,13 · 0,99 · 4,47** · 1/4 441 |
| | Haut | 0,79 · 0,18 · 1,18 → **0,66 · 0,18 · 1,06** · 0/4 444 | 4,65-4,73 · 1,03-1,04 · 5,8-6,0 → **4,82 · 1,08 · 6,13** · 1/4 443 |

Entrée en scène : **18 à 22 ms** (plafond 40 ms).

## 3. Relevé hors ticket

- `D-206` (proposition, P3) : les joueurs qui ont franchi le passage de la table de 10 à 30 niveaux (`Q-44`, 21/09) avec de l'XP en trop ont perdu les flags et les points des niveaux sautés. Le palier A rend ce qui est **encore dû**, pas ce qui a déjà été sauté. Une réparation est possible (un flag de niveau manquant sous le niveau crédité = un niveau sauté) ; elle attend la décision de Xav. Personne n'a été bloqué : aucune donnée ne lit ces flags, sauf `flag_niveau_10`, posé à l'époque.

## 4. Pour Xav

- `V-149` : importer `rpg_v2_save_Nv30.json` ; le HUD dit toujours Nv.30, mais la barre d'XP n'est plus pleine (environ 50 % vers le Nv.31). Jouer jusqu'au Nv.31 : l'éclat, le symbole, un point de stat à répartir.
- `D-206` : réparer ou non les points perdus au 21/09.
- Suivant : **palier B**, la stèle et la descente (vue rapprochée + Descendre, les trois salles vides, les flags de descente).

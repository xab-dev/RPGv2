---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), palier B — la stèle s'éveille, et la descente
type: fichier de bord
version: 1.0.0
statut: livré, à voir en jeu (V-150)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier B (24/09)

Demande de Xav : « go palier B ». Branche `annexe-1`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `fd25f16` | Ménage | Journal du palier A archivé, INDEX à jour |
| (ce commit) | `D-207` — palier B | La stèle s'éveille (`a_portee`, le carnet qui déchiffre, Descendre), trois salles vides, la remise à zéro de la descente, `?flags=` |

## 1. Le palier B

- **`Q-137`, la proximité** : une condition de données compare maintenant une valeur **nommée** par égalité, `{ valeur: 'a_portee', egal: 'stele_grotte' }` (`flags.js`, forme validée au démarrage : `egal` ou des bornes, jamais les deux). `a_portee` est l'interactif qu'INTERACT prendrait, ou `null` : `main.js#interactifAPortee`, extrait de `cibleInteraction`, donc **la même portée, par le même parcours**.
- **Le follet suggère** : une ambiance (`amb_stele_carnet`), au Nv.15, au pied de la stèle bleue, tant que l'indice n'est pas déchiffré ; une fois. Le texte est celui que la spec propose (Xav écrit, `E-05`) : il dit « carnet » là où la carte du menu dit « Indices ».
- **Le déchiffrement** se **déclare** sur l'indice : `dechiffrement: { condition, flag }`. Quand le carnet s'ouvre (le menu prévient l'orchestrateur **avant** de lire les entrées : `menu.definirOuvertureIndices`), un indice dont la condition tient pose son flag, et l'animation part. Le démarrage refuse un déchiffrement dont le flag n'est pas celui que lit `lisible_si`. **Changement assumé (§4.1)** : au Nv.15, l'entrée de la grotte ne se lit plus partout, seulement une fois déchiffrée au pied de la pierre.
- **L'animation** : `indices.js#textesEnDechiffrement` mêle texte brouillé et texte clair, **un signe à la fois, dans l'ordre de lecture** (le titre, puis les lignes), blancs gardés. 2,5 s, B et MENU **accélèrent** ×5 sans fermer (`indices_config`, *provisoires*) ; le menu ne voit ni l'un ni l'autre pendant l'animation, et seulement si le carnet est l'écran affiché (`menu.indicesAffiches`). Fermée avant la fin (le « Fermer » tactile), elle reprend à la prochaine ouverture. L'écran n'est relu que quand le texte change.
- **La stèle** : une fois l'indice lisible, la gravure est **en clair** (plus toujours en hiéroglyphes). `descente: { scene, flag_requis }` sur l'interactif lui donne l'action **Descendre** : A ou INTERACT (au doigt, un toucher **sur la gravure** ; ailleurs, il ferme), après l'armement ; la vue sort par son fondu, puis la descente commence. En bas à droite : « A Descendre · B Fermer » (au clavier E et 3, au doigt deux phrases). La stèle rouge et celle d'argile n'ont rien de plus.
- **La descente** (`src/descente.js`, pur) : l'Annexe est la scène d'arrivée et tout ce qu'on atteint par ses portails **parmi les scènes qui déclarent `descente: { flags }`** ; la carte Maison, où mènent l'escalier et la sortie, n'en fait pas partie. `commencerDescente` **retire** ces flags (`flags.js#retirer`, qui prévient la sauvegarde), puis entre dans la salle 1. Aucun id de flag dans le code ; une Annexe 2 à quatre salles se déclare en données seules (tenu par test). Un flag de descente cible d'un unlock est refusé au démarrage (il reviendrait tout seul).
- **Les trois salles**, vides, tuiles et décor de la Grotte, obscurité 0,72 :
  - **salle 1**, l'antichambre, 20 × 14 : l'escalier au sud, la porte au nord ;
  - **salle 2**, 34 × 12, en longueur ;
  - **salle 3**, 24 × 18 : quatre piliers, plus de lumières.
  - On entre par le sud et on sort par le nord. Chaque porte attend un **flag de descente** : `flag_annexe_passage_1`, `flag_annexe_passage_2`, `flag_annexe_sortie`. Trois tuiles nouvelles : `tile_escalier`, `tile_passage` et `tile_passage_sud`.
  - L'escalier ramène en (21, 66), au pied de la stèle bleue. La sortie débouche en (18, 47), à l'ouest de la clairière de la stèle rouge, **hors d'elle**, sur une case d'où l'on rejoint le chemin à pied (tenu par test).
- **Debug `?flags=a,b`** (`flags.js#lireFlagsForces`) : des flags **tenus pour vrais** toute la session, jamais posés ni sauvegardés, que la remise à zéro n'éteint pas. Un id inconnu est écarté et dit en console.
- **Test** : `tests/test_spec14_palier_b_stele_descente_2026-09-24.js` (flags, refus au démarrage, `descente.js`, l'animation, les salles, l'orchestrateur de bout en bout, aucun id de l'Annexe dans le code). Trois tests ajustés : le témoin des valeurs de `test_d43_a4` (`a_portee`), `test_d72` (`lireFlagsForces` prend le registre, la lecture de ses ids se fait dans `flags.js`), `test_indices_menu` (le témoin « lisible au Nv.15 » passe à la pierre qui répond, dont la condition porte encore un niveau).
- `node tools/run_tests.js` : **198 fichiers, tous verts**.
- **Outil** : `tools/scenarios/annexe_descente.mjs` (les captures du palier, non versionnées).

## 2. Ce qui s'écarte de la spec, et pourquoi

- **Le passage 1 → 2** attend `flag_annexe_passage_1` (un flag de descente), pas « `flag_zeros_rencontre` ou le levier » (§4.3). `flag_zeros_rencontre` est persistant : la porte aurait été ouverte dès l'entrée des descentes suivantes, contre `Q-142` et le §4.2. Le palier D posera ce flag à la fin de la rencontre, le levier aux descentes suivantes. Spec corrigée (v1.3.3).
- **Un retour au sud** dans les salles 2 et 3 (`Q-152`) : la salle 2 n'a pas de monstre, on n'y meurt pas ; sans ce retour, un joueur qui n'y trouve pas le geste du follet y resterait pour toujours.
- **Pas de fondu de portail** (`Q-153`) : il n'en existe pas, un portail change de scène d'une frame à l'autre. Descendre sort par le fondu de la vue de la stèle, et la salle 1 apparaît à la fin de ce fondu.

## 3. Le banc de la spec 13

Chiffres comparés à ceux du palier A (`docs/archives/JOURNAL_2026-09-24_annexe1-palierA.md` §2), eux-mêmes dans le bruit de la clôture de la spec 13.

**Une régression trouvée, et corrigée à la racine.** Au premier passage, `traversee_nuit` montrait `maj()` en hausse :

| Preset | ×1 | ×6 |
|---|---|---|
| Bas | 0,16 → 0,22 ms (+37 %) | 1,13 → 1,32 ms (+17 %) |
| Moyen | 0,17 → 0,21 ms | 0,99 → 1,39 ms (+40 %) |

**Cause** : la ligne d'ambiance de la stèle, pas encore vue, s'évalue à chaque frame. Chaque condition sur une valeur appelait `valeursConditions()`, qui calculait **toutes** les valeurs nommées (poche, coffre, stations, portée) pour n'en lire qu'une. **Remède** : les valeurs sont **paresseuses** (`main.js#valeursParesseuses`, un accesseur par valeur, au niveau module, tenu par test). Seule la valeur lue est calculée, et `Object.keys` voit toujours les mêmes noms. Après correction, `maj()` passe **sous** le palier A.

| Scénario | Preset | ×1 (palier A → palier B) | ×6 (palier A → palier B) |
|---|---|---|---|
| `cout_calque` : reconstruction moy / max · frames > 20 ms | Bas | 0,84 / 5,4 → **0,88 / 5,5** · 0/600 | 3,99 / 7,3 → **4,29 / 8,3** · 0/600 |
| | Moyen | 1,45 / 9,3 → **1,36 / 8,3** · 0/600 | 6,56 / 14,1 → **6,66 / 12,5** · 0/600 |
| | Haut | 1,53 / 9,8 → **1,66 / 10,1** · 0/600 | 7,50 / 12,5 → **7,72 / 11,5** · 0/600 |
| `traversee_nuit` : `dessiner()` · `maj()` · reconstruction · frames > 20 ms (après correction) | Bas | 0,59 · 0,16 · 0,44 → **0,55 · 0,16 · 0,40** · 0/4 444 | 4,04 · 1,13 · 2,07 → **3,81 · 0,99 · 2,00** · 1/4 443 |
| | Moyen | 0,57 · 0,17 · 0,81 → **0,57 · 0,16 · 0,78** · 0/4 443 | 4,13 · 0,99 · 4,47 → **4,08 · 0,99 · 4,45** · 1/4 441 |
| | Haut | 0,66 · 0,18 · 1,06 → **0,58 · 0,15 · 0,98** · 0/4 444 | 4,82 · 1,08 · 6,13 → **4,36 · 0,95 · 5,51** · 1/4 441 |

- Le seul écart supérieur à 5 % est la reconstruction de `cout_calque` Bas ×6, **+7,5 %**. Ce palier ne touche pas à la carte Maison, et l'écart reste loin des 20 %.
- Entrée en scène de la Maison : **19 à 23 ms** (plafond 40 ms).
- Les salles de l'Annexe sont petites (20 × 14 à 34 × 12) : leur entrée en scène ne se mesure pas au banc, qui ne connaît que la Maison.

## 4. Pour Xav

- `V-150` : la marche à suivre est dans le suivi. Pour traverser les salles : `?flags=flag_annexe_passage_1,flag_annexe_passage_2,flag_annexe_sortie`.
- `Q-152` (les retours au sud) et `Q-153` (un fondu aux changements de scène) : à trancher.
- `E-05` : la ligne du follet dit « carnet », la carte du menu « Indices ».
- Suivant : **palier C**, les tireurs (projectiles, `attaque_distance`, la salle nettoyée, le levier qui apparaît).

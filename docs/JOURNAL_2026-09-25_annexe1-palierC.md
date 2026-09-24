---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), palier C — les tireurs
type: fichier de bord
version: 1.0.0
statut: livré, à valider (V-151)
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier C (25/09)

Demande de Xav : « go palier C ». Branche `annexe-1`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `076d361` | Ménage | Journal du palier B archivé, INDEX à jour |
| (ce commit) | `D-209` — palier C | Les tirs (`projectiles.js`), le comportement `distance`, quatre cracheurs, la salle nettoyée, le levier qui apparaît, les leviers de la descente remis à zéro |

## 1. Le palier C

- **Les tirs** (`src/projectiles.js`, pur) : une réserve fixe de 32 emplacements (patron de `poussiere.js`, aucune allocation en jeu), la ligne droite, l'arrêt sur un **mur** (la même `estSolideAuPoint` que tout le reste, portes comprises), la cible d'un **autre camp** touchée une fois (disque contre disque), puis éteinte ; une **course** maximale. Le pas de collision est borné à 4 px : une frame longue ne fait traverser ni un mur fin ni le héros (tenu par test). Le module ne connaît ni les murs ni le héros : l'appelant lui passe `estSolide` et des `cibles`. Le Gardien (F) et la compétence (G) passeront par lui, le camp du joueur visant les monstres.
- **Le comportement `distance`** (`comportement_monstres.js#deciderTireur`, pur, sans état) : sous `recul_tuiles`, il recule d'une tuile à l'opposé du héros ; hors de `portee_tuiles`, il s'approche ; entre les deux, il reste. Il tire à portée, cadence écoulée. Le mouvement se fait dans `main.js#deplacerTireur`, **avec les collisions** (un tireur qui recule dans un mur ne tirerait plus jamais). Les dégâts du crachat sont la **force effective** du monstre, celle de son corps à corps (l'aura du follet comprise).
- **`attaque_distance`** gagne trois champs *provisoires* (spec v1.3.4) : `recul_tuiles` 2, `rayon_px` 3, `course_tuiles` 7. Le démarrage refuse un `distance` sans attaque, une attaque sans `distance`, un comportement inconnu, un recul qui dépasse la portée, un nombre ≤ 0, un visuel inconnu.
- **Les cracheurs** (`enemy_annexe_cracheur`) : la silhouette du rampant, en vert mousse, une poche sur le dos, une bouche d'un vert vif. **Sans lueur** : `test_d161` tient `Q-27` sur tout monstre, et la première version du dessin, qui en avait une à la bouche, a été refusée par lui. PV 24, force 5 (celle d'un rôdeur, « modérés »), cadence de tir 2,4 s (« faible »), portée 5 tuiles, 110 px/s, 30 XP. Quatre en salle 1, posés par les `spawns` de la scène, sous la condition « salle pas encore nettoyée ».
- **Les crachats se dessinent après le voile** (`render.js#dessinerProjectiles`, trié par le champ), comme le liseré de la plume : dans le noir de l'Annexe, un crachat sous le voile serait invisible, donc impossible à esquiver. Le monstre, lui, reste dans le noir. `Q-154` ouverte.
- **Aucun éclat** : la table de butin des cracheurs est à zéro (`loot_annexe_cracheur`). Quatre cracheurs à 1-3 éclats chacun auraient contredit « un éclat par descente ». `Q-155` ouverte.
- **La salle nettoyée** : `nettoyage: { flag }` sur la scène ; `spawns.js#sceneNettoyee` dit que les monstres de ses spawns sont tous tombés (ceux du Chaos n'en font pas partie ; une scène entrée sans monstre à elle n'est pas « nettoyée à nouveau »). `main.js#verifierNettoyage` pose le flag. Le démarrage refuse un flag inconnu et une scène sans spawn. Le flag est un **flag de descente** de la salle 1.
- **Le levier qui apparaît** : `visible_si` sur un interactif, lu par **le** verdict du jeu (`visibilite.js#estVisible`, `D-62`), et appliqué en un point (`main.js#interactifsPresents`) : ni dessiné, ni pris par INTERACT, ni compté par `a_portee`, ni proposé par l'indice de commande. Un interactif **solide** ne peut pas le déclarer : ses collisions sont posées à l'entrée en scène, il serait un mur invisible avant d'apparaître. Une lumière de la salle attend le même flag : le levier apparaît dans un halo.
- **À ce palier, le levier ouvre directement le passage** (`flag_pose: flag_annexe_passage_1`) : c'est le comportement des descentes suivantes (`Q-142`). Le palier D intercalera Zéros la première fois.
- **Les leviers de la descente** : leur état vit dans `save.puzzles`, pas dans un flag, et la remise à zéro du palier B ne les touchait pas ; un levier actionné l'aurait été pour toujours. `descente.js#interactifsDeLaDescente` les déduit des salles (comme les flags), et `commencerDescente` leur rend leur état de départ.
- **Test** : `tests/test_spec14_palier_c_tireurs_2026-09-25.js` (les tirs, le tireur, la salle nettoyée, les refus au démarrage, un second tireur et une Annexe 2 en données seules, l'orchestrateur de bout en bout, aucun id du palier dans le code). `node tools/run_tests.js` : **199 fichiers, tous verts**.
- **Outil** : `tools/scenarios/annexe_tireurs.mjs` (les captures du palier, non versionnées) : les crachats se voient dans le noir, en grand écran et au téléphone ; le levier apparaît dans son halo.

## 2. Ce qui s'écarte de la spec, et pourquoi

- **Trois champs de plus** dans `attaque_distance` : la spec en donnait quatre, mais le recul (« à moins de 2 tuiles ») et la taille du crachat sont des nombres, et un nombre vit en données. La course évite qu'un crachat traverse une salle ouverte.
- **Les leviers remis à zéro** : le §4.2 les comptait dans l'état de la descente, le palier B ne remettait que les flags.
- **Le levier ouvre le passage** dès ce palier (voir plus haut), en attendant Zéros.

## 3. Le banc de la spec 13

Chiffres comparés à ceux du palier B (`docs/archives/JOURNAL_2026-09-24_annexe1-palierB.md` §3). Ce palier ne touche la carte Maison que par un filtre (`interactifsPresents`) et un calque de tirs vide.

| Scénario | Preset | ×1 (palier B → palier C) | ×6 (palier B → palier C) |
|---|---|---|---|
| `cout_calque` : reconstruction moy / max · frames > 20 ms | Bas | 0,88 / 5,5 → **0,88 / 5,9** · 0/600 | 4,29 / 8,3 → **4,11 / 8,0** · 0/600 |
| | Moyen | 1,36 / 8,3 → **1,38 / 9,3** · 0/600 | 6,66 / 12,5 → **6,69 / 11,8** · 0/600 |
| | Haut | 1,66 / 10,1 → **1,58 / 10,3** · 0/600 | 7,72 / 11,5 → **7,31 / 11,3** · 0/600 |
| `traversee_nuit` : `dessiner()` · `maj()` · reconstruction · frames > 20 ms | Bas | 0,55 · 0,16 · 0,40 → **0,54 · 0,16 · 0,42** · 0/4 443 | 3,81 · 0,99 · 2,00 → **3,67 · 0,97 · 1,88** · 1/4 441 |
| | Moyen | 0,57 · 0,16 · 0,78 → **0,51 · 0,15 · 0,91**, rejoué **0,60 · 0,18 · 0,83** · 0/4 443 | 4,08 · 0,99 · 4,45 → **4,04 · 0,97 · 4,25** · 1/4 441 |
| | Haut | 0,58 · 0,15 · 0,98 → **0,58 · 0,15 · 0,94** · 0/4 444 | 4,36 · 0,95 · 5,51 → **4,43 · 0,97 · 5,63** · 1/4 442 |

- Un seul écart au-dessus de 10 % : la reconstruction de `traversee_nuit` Moyen ×1, 0,91 ms (+17 %), tirée par **un** pic à 16,4 ms sur 110 reconstructions (sans lui, 0,77 ms). **Rejoué** : 0,83 ms (+6 %), pic à 11,1 ms. Du bruit, loin des 20 %.
- Entrée en scène de la Maison : **18 à 23 ms** (plafond 40 ms).
- La salle 1 au plus fort de l'échange (quatre cracheurs, les crachats en vol) ne se mesure pas au banc, qui ne connaît que la Maison. La salle 3 au plus fort du combat (Gardien, tirs des deux côtés) est le critère du §8, au palier F.

## 4. Pour Xav

- `V-151` : la marche à suivre est dans le suivi.
- `Q-154` (les crachats éclairent) et `Q-155` (aucun éclat) : à trancher.
- La difficulté, à juger au ressenti : chaque cracheur crache toutes les 2,4 s, mais **quatre ensemble**, c'est un crachat toutes les 0,6 s environ. Immobile, un héros Nv.15 à 50 PV tombe en quelques secondes ; en bougeant, on esquive.
- Suivant : **palier D**, Zéros (l'entité intouchable, son follet, le combat sans défaite, la relève, l'arrêt à 25 %, le dialogue provisoire).

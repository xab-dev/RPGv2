---
projet: RPG V2
episode/session: File de micro-tickets « Nv.0 → Nv.10 »
type: fichier de bord (une ligne par commit)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-21
genere_par: claude
verifie_par: xav
---

# Fichier de bord — file « Nv.0 → Nv.10 » (21/09)

Brief : `docs/BRIEF_file-nv0-10_2026-09-20.md` v1.2.0. Branche `main`, un commit par ticket,
ordre T0 → T1 → T2 → T6 → T3 → T4 → T9 → T7 → T8 → T5. Aucun `push`.

Une ligne est écrite **au moment du commit**, jamais après coup : ce fichier est l'état de la
file, la session ne le tient pas de mémoire.

| # | Ticket | Commit | Ce qui est livré | Lignes de suivi |
|---|---|---|---|---|
| T0 | Reporter les verdicts du 21/09 | (ce commit) | 23 lignes `V-`/`E-` closes sous dictée de Xav et descendues en §8 · `V-11` réduite au puits · `V-10` dégelée en **non** · `Q-23` close, `Q-33`/`Q-34` tranchées · état **`pas vu`** ajouté au mode d'emploi · `docs/CHECKLIST_tournee.md` créée | ouvre `D-55` (volume), `D-56` (Motorola, à qualifier), `D-57` (placement tactile, gelé) ; clôt `D-36` |
| T1 | L'XP de récolte et son retour visuel | (ce commit) | Champ `xp` sur items / resources / stations, lu par `xp.js#xpDeCatalogue` et validé au boot · texte flottant réduit à « +1 », « +1xp » à côté, distingués par la **taille** (`style` opaque + `data/effets.json`) · `crediterXpHeros` prend une position optionnelle · équilibrage prouvé : 22 XP → Nv.2, 24,4 % de Nv.0 → 5 | clôt `D-58` ; ouvre `Q-43`, `Q-44`, `V-36` |
| T2 | Ressources semi-aléatoires en gradient | (ce commit) | `points_ressources` par scène (liste posée à la main, ~3× le besoin) · tirage à l'aube, graine = numéro du jour · gradient = forme de la liste (1/3 au bord du chemin) · effectifs 2 → 10 · **plus de repousse en journée** sauf `respawn_ms` déclaré · sauvegarde v5 → v6 · outil `tools/semer_points_ressources.mjs` | clôt `D-59` ; ouvre `Q-45`, `V-37` |
| T6 | La Plume | (ce commit) | `item_plume` + `objets_uniques` dans la scène (générique, hors tirage du jour) · aucune migration : c'est l'absence du flag qui la pose · `description_key` optionnelle rendue par `lignesFicheItem` · texte FR/EN **proposé**, à réécrire par Xav | clôt `D-60` ; ouvre `V-38` |
| T3 | Une ligne d'ambiance par palier | (ce commit) | `data/ambiances.json` + `src/ambiances.js` (pur : condition / phases / scènes → un dialogue, une fois, gardé par un flag) · première entrée Nv. ≥ 5 à la tombée de nuit · texte FR/EN **proposé** · le format accueille les lignes futures sans code, vérifié sur une entrée factice | clôt `D-61` ; ouvre `V-39` |
| T4 | Le filtre anti-spoil, en un seul point | (ce commit) | `visible_si` sur n'importe quel catalogue, validé une fois dans `registry.js` · `src/visibilite.js#entreesVisibles`, seul module autorisé à le lire (contrôle de source) · `connue_au_depart`/`deblocage` des recettes **retirés**, anciens champs refusés au boot · `src/ui/` ne lit aucun catalogue (2ᵉ contrôle de source) | clôt `D-62` ; ouvre `V-40` |

## T9 — état des lieux de la barre d'actions (lecture seule, avant tout code)

1. **Sur PC**, `ui/hud.js#dessinerSlotsBas` dessine **cinq cases** en bas au centre, dans l'ordre
   d'une liste **écrite en dur** dans le fichier : `['attack', 'skill_1', 'skill_2', 'skill_3',
   'consume']`. Seule celle d'attaque porte une icône (celle de l'arme équipée, `D-20`) et un
   contour vif ; les quatre autres sont des cases vides au contour pâle.
2. **Au tactile**, la ligne du bas n'existe pas : ce sont les **boutons** qui sont les cases
   (`hud_layout.js#boutonsTactiles`), et ils sont **sept** — les cinq mêmes verbes, plus `INTERACT`
   et `MENU`, qui ne sont pas des actions mais des commandes.
3. **`data/action_slots.json` existe déjà** (cinq entrées, `id` + `verb`) et **personne ne le lit** :
   ni le rendu, ni l'input. Les deux listes ci-dessus sont donc deux troisièmes vérités.
4. **Aucune poche nulle part.** Le principe « poches façon Minecraft » du 19/09 n'a jamais été
   implémenté : il n'y a rien à retirer, seulement à ne pas ajouter (`E-01` sans objet).
5. **Rien n'est conditionnel** : les cinq cases sont là dès la Grotte, sur une partie neuve, alors
   qu'aucune compétence n'existe dans le jeu et qu'on n'a encore aucun consommable.

| T9 | La barre d'actions : anti-spoil des touches | (ce commit) | État des lieux ci-dessus · `action_slots.json` enfin lu, avec un `visible_si` par slot (**même filtre que T4**) · rendu et input reçoivent la liste, aucun des deux ne sait ce qu'est un slot · tactile branché par le patron `onVerbesActions` (`D-54`) : un bouton masqué n'est plus cliquable, **et aucun n'a bougé** · `INTERACT`/`MENU` hors catalogue, donc immasquables | clôt `D-63` ; `E-01` sans objet ; ouvre `V-41` |
| T7 | Le volume | (ce commit) | `data/audio.json` (paliers 0/25/50/75/100, défaut **50 %**, une clé de texte par palier) · volume **maître** dans `audio.js`, multiplié par le volume propre de la piste, appliqué à ce qui joue déjà · **aucune migration** : champ absent = défaut du catalogue · une carte de plus dans Paramètres, structure des menus intacte | clôt `D-64` ; ouvre `V-42` |
| T8 | Le clignement au respawn | (ce commit) | `intro.js#ouverturePaupieres` **exportée** et réutilisée telle quelle (contrôle de source : le modèle n'est pas réécrit) · durées en données, 4ᵉ genre d'effet `clignement` · **920 ms** contre 3 700 à l'intro · purement visuel : le héros est déjà revenu, rien n'est retardé · gelé sous UI, repart de zéro à chaque mort | clôt `D-65` ; ouvre `V-43` |

## T5 — l'épée en bois, et le verdict des fondations

Le ticket exigeait la liste de **chaque fichier hors `data/` et `locales/`** touché, et pourquoi.
**Verdict : quatre fichiers. Les fondations ne sont PAS validées pour les armes et l'équipement.**
Rien n'a été contourné pour obtenir zéro — chacun de ces quatre points est une capacité que le jeu
n'avait tout simplement pas.

| Fichier | Pourquoi il a fallu y toucher | Ligne ouverte |
|---|---|---|
| `src/schemas.js` | Quatre capacités neuves à déclarer : la catégorie d'item **`arme`**, le champ **`arme`** sur un item (la référence qui fait le pont poche → `weapons.json`), les **`modificateurs`** d'une arme, et le **`cout_eclats`** d'une recette. Un schéma qui ne connaît pas un champ le laisse passer **sans rien dire** : le bonus serait ignoré et l'épée « ne servirait à rien », sans message | `D-67` |
| `src/recipes.js` | **Les éclats ne sont pas un item de poche.** Ils vivent dans `save.inventaire.eclats` — une monnaie — donc ils ne peuvent pas figurer dans `entrees`, qui référence `items.json`. `peutFabriquer`/`fabriquer` ont appris un coût en monnaie (paramètre **optionnel**, défaut 0 : les appelants d'avant n'ont pas bougé) | `D-68` |
| `src/main.js` | Trois raisons distinctes : reposer les éclats rendus par le module pur ; ajouter l'**arme équipée** comme 3ᵉ source de modificateurs de stats (elle emprunte la forme exacte du compagnon et des buffs — le calcul n'apprend rien, il additionne une source de plus) ; et décider **quelle catégorie va dans quel emplacement** (`SLOT_PAR_CATEGORIE`) | `D-69` |
| `src/ui/menu.js` | L'écran Poche testait `e.categorie === 'nourriture'` **en dur**. L'épée aurait fait un deuxième cas, l'armure un troisième. Il reçoit désormais `equipement = { slot, deja, lignes }` et ne connaît **plus aucune catégorie d'item** — c'est un gain, mais c'est bien du code de système modifié | `D-70` |

**Ce qui, en revanche, n'a rien coûté** — et c'est la moitié utile du verdict : la recette elle-même,
son `visible_si` niveau ≥ 10 (offert par T4), la portée `[0 ; 0,75]`, l'icône, les textes. Quatre
entrées JSON et six clés de locale.


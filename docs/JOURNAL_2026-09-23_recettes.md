# Journal — 2026-09-23 — nouvelles recettes

Branche `recettes-2026-09-23`, file de micro-tickets : Xav donne les recettes une à une, un commit
chacune, chaque commit retirable seul. Avant chaque recette : vérifier qu'elle ne contredit ni les
dialogues ni les déblocages déjà en place.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `33209c3` | Journal de la carte Indices archivé, ligne ajoutée à l'INDEX |
| R1 — le bois | `8b4359b` | `rec_bois` : 5 branches + 2 herbes + 1 éclat → 1 bois, à l'Atelier, `visible_si` Nv.4 (données seules, clés `recipe.bois` FR/EN). Vérification préalable : aucune contradiction avec les dialogues (`dlg.eclats.1`, la ligne du Nv.10, le refus devant un arbre restent vrais) ni avec les déblocages (`D-120` : la hache reste la voie normale). Voulu par Xav : sous le Nv.5 les éclats sont rares, et chacun dépensé ici manque à l'épée. XP 5 et 60 s retenus par défaut : `Q-123`. `tests/test_rec_bois_nv4` (contrat : avant les outils, sans outil, absente sous le palier, fabricable au palier). 177 fichiers verts. À voir en jeu : `V-124` |

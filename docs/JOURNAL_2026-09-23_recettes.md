# Journal — 2026-09-23 — nouvelles recettes

Branche `recettes-2026-09-23`, file de micro-tickets : Xav donne les recettes une à une, un commit
chacune, chaque commit retirable seul. Avant chaque recette : vérifier qu'elle ne contredit ni les
dialogues ni les déblocages déjà en place.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `33209c3` | Journal de la carte Indices archivé, ligne ajoutée à l'INDEX |
| R1 — le bois | `8b4359b` | `rec_bois` : 5 branches + 2 herbes + 1 éclat → 1 bois, à l'Atelier, `visible_si` Nv.4 (données seules, clés `recipe.bois` FR/EN). Vérification préalable : aucune contradiction avec les dialogues (`dlg.eclats.1`, la ligne du Nv.10, le refus devant un arbre restent vrais) ni avec les déblocages (`D-120` : la hache reste la voie normale). Voulu par Xav : sous le Nv.5 les éclats sont rares, et chacun dépensé ici manque à l'épée. XP 5 et 60 s retenus par défaut : `Q-123`. `tests/test_rec_bois_nv4` (contrat : avant les outils, sans outil, absente sous le palier, fabricable au palier). 177 fichiers verts. À voir en jeu : `V-124` |
| R2 — la régénération | `640e3ce` | Premier buff qui touche les PV et non une stat, pour la pomme cuite. `status.js#tickSoinsBuffsActifs` (pur : `valeur` PV par `intervalle_ms`, accumulateurs de session, arrêté avec son buff) appelé par `main.js` en temps actif, avant l'expiration, plafonné aux PV max, jamais sur un héros mort. `status.js#iconeBuffBandeau` : LE choix de l'icône d'un buff, toujours celle d'une stat (`D-13`) — un soin l'emprunte (`icone_bandeau: { stat, teinte }`) ; `ui/hud.js` passe la teinte à `dessinerVisuel`. Schéma : un soin vise le héros, dure un temps fini, a un intervalle et une valeur > 0 ; une teinte exige une icône teintable. `buff_regeneration` : 1 PV / 2 s, 60 s, croix de Vitalité en vert (`Q-124`). `test_d13` passe par la vraie fonction au lieu de la recopier ; `tests/test_regeneration`. 178 fichiers verts. À voir en jeu : `V-125` |

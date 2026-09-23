# Journal — 2026-09-23 — nouvelles recettes

Branche `recettes-2026-09-23`, file de micro-tickets : Xav donne les recettes une à une, un commit
chacune, chaque commit retirable seul. Avant chaque recette : vérifier qu'elle ne contredit ni les
dialogues ni les déblocages déjà en place.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `33209c3` | Journal de la carte Indices archivé, ligne ajoutée à l'INDEX |
| R1 — le bois | `8b4359b` | `rec_bois` : 5 branches + 2 herbes + 1 éclat → 1 bois, à l'Atelier, `visible_si` Nv.4 (données seules, clés `recipe.bois` FR/EN). Vérification préalable : aucune contradiction avec les dialogues (`dlg.eclats.1`, la ligne du Nv.10, le refus devant un arbre restent vrais) ni avec les déblocages (`D-120` : la hache reste la voie normale). Voulu par Xav : sous le Nv.5 les éclats sont rares, et chacun dépensé ici manque à l'épée. XP 5 et 60 s retenus par défaut : `Q-123`. `tests/test_rec_bois_nv4` (contrat : avant les outils, sans outil, absente sous le palier, fabricable au palier). 177 fichiers verts. À voir en jeu : `V-124` |
| R2 — la régénération | `640e3ce` | Premier buff qui touche les PV et non une stat, pour la pomme cuite. `status.js#tickSoinsBuffsActifs` (pur : `valeur` PV par `intervalle_ms`, accumulateurs de session, arrêté avec son buff) appelé par `main.js` en temps actif, avant l'expiration, plafonné aux PV max, jamais sur un héros mort. `status.js#iconeBuffBandeau` : LE choix de l'icône d'un buff, toujours celle d'une stat (`D-13`) — un soin l'emprunte (`icone_bandeau: { stat, teinte }`) ; `ui/hud.js` passe la teinte à `dessinerVisuel`. Schéma : un soin vise le héros, dure un temps fini, a un intervalle et une valeur > 0 ; une teinte exige une icône teintable. `buff_regeneration` : 1 PV / 2 s, 60 s, croix de Vitalité en vert (`Q-124`). `test_d13` passe par la vraie fonction au lieu de la recopier ; `tests/test_regeneration`. 178 fichiers verts. À voir en jeu : `V-125` |
| R3 — les pommes | `68f95d5` | Données seules. `item_pomme_amour` (Ressource : ni mangée ni équipée) et `item_pomme_cuite` (Nourriture : faim +40 %, soif +10 %, `buff_regeneration`). `rec_pomme_amour` à l'Atelier (1 fruit cuit + 3 herbes, sans éclats, 5 XP, 60 s, illimitée) et `rec_pomme_cuite` à la Cuisine (1 pomme d'amour, 10 XP, 60 s), toutes deux cachées sous le Nv.4. Deux dessins cousins du fruit (`visuel_pomme_amour`, `visuel_pomme_cuite`), vus au banc visuel aux tailles du jeu. Lectures et valeurs retenues par défaut : `Q-125`. `tests/test_pommes_nv4` (chaîne entière sur le vrai orchestrateur). 179 fichiers verts. À voir en jeu : `V-126` |

**Verdict** : Xav, 23/09 : « V-125 V-126 ok » — la régénération, sa croix verte et les deux pommes validées en jeu (consigné par Claude). `V-124` (le bois) n'a pas encore reçu de verdict.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| R4 — la corde et le papyrus | `95dcf33` | Données seules. Refus de Xav, consigné dans CLAUDE.md : pas de pierre fabriquée à partir de cailloux, qui sont réservés à la mine, à la ferronnerie et au concasseur. `item_corde` et `item_papyrus` (Ressource) ; `rec_corde` (3 herbes) et `rec_papyrus` (4 herbes) à l'Atelier, sans éclats, 3 XP, 60 s, Nv.4. Deux dessins, vus au banc : corde lovée ; papyrus redessiné une fois (la première version, rouleaux en haut et en bas, se lisait comme une bobine), rouleaux sur les côtés. Valeurs : `Q-126`. `tests/test_corde_papyrus_nv4` (dont : aucune recette ne produit de pierre). 180 fichiers verts. À voir : `V-127` |

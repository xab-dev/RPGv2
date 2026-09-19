# Journal de session — Polish post-Construction, tickets 1-5 (2026-09-19)

### Rapport de fin de session (à lire en premier)

Branche **`polish-2026-09-19`**, jamais fusionnée dans `main` : la fusion revient à Xav. Suite headless **verte à chaque commit** ; **66 fichiers de test** en fin de session (61 au départ, 5 nouveaux). **Aucun ticket bloqué** — les 5 sont livrés.

| # | Ticket | Statut | Commit | Fichiers touchés |
|---|---|---|---|---|
| — | Ménage de journal + fiches de la session | livré | `80d45d7` | archive du journal précédent, `docs/archives/INDEX.md`, les 5 fiches |
| 1 | `MT_heros-echelle` (héros à 0,88) | **livré** | `230e442` | `data/visuels.json`, `src/visuels.js`, `src/main.js`, `src/schemas.js`, + test |
| 2 | `MT_intro-follets-visibles` | **livré** | `e288d1a` | `src/intro.js`, `src/main.js`, `docs/CHECKLIST_visuelle.md`, + test, + 3 assertions de tests existants |
| 3 | `SD_puits-silhouette` | **livré** | `52a6a2e` | `data/visuels.json`, `src/structures.js`, `docs/CHECKLIST_visuelle.md`, + test |
| 4 | `MT_trainee-poussiere` | **livré** | `ecae6bb` | `src/poussiere.js` (nouveau), `data/effets.json` (nouveau), `data/visuels.json`, `src/render.js`, `src/main.js`, `src/schemas.js`, `docs/CHECKLIST_visuelle.md`, + test |
| 5 | `MT_hud-ligne-haute` | **livré** | `df0ef20` | `src/ui/hud_layout.js`, `src/ui/hud.js`, `src/ui/hud_hints.js`, `src/main.js`, `locales/fr.json`, `locales/en.json`, `docs/CHECKLIST_visuelle.md`, + test |

**Aucune capture, aucun relevé `?debug=fps`.** Ni l'extension Chrome (« Browser extension is not connected ») ni le démon browser-use (« daemon default didn't come up ») ne répondent dans cette session. `docs/captures/polish-2026-09-19/` est donc resté vide, et les relevés avant/après demandés par le brief supposent de toute façon une traversée jouée à la main : **entièrement dus par Xav**, comme l'étape 1 du polish.

#### À valider à la manette, dans l'ordre d'une seule boucle Grotte → Maison

1. **Intro, paupières puis convergence** — inchangées (budget ≤ 8 s, non-skippable).
2. **Intro, texte de choix** *(ticket 2, état 17bis)* — les 3 follets **restent visibles derrière le texte**, leur lévitation se pose doucement ; à l'appui sur `A`, l'écran de choix apparaît **sans que les follets sautent**.
3. **Départ des follets non élus** — inchangé, vérifier qu'aucun follet n'est dessiné en double.
4. **Héros dans la Grotte** *(ticket 1)* — silhouette à 0,88 : proportion, lisibilité sur le voile sombre.
5. **HUD** *(ticket 5, états 1, 25, 25bis)* — bandeau d'une seule ligne en haut : follet · PV · éclats · faim · soif · `Nv. N`. Rien dans la colonne de gauche, **aucune barre d'XP**. Vérifier que la bannière d'indice de commande ne chevauche pas le bandeau.
6. **Traînée de poussière** *(ticket 4, état 32ter)* — en marchant : 2-3 bouffées, sous le héros ; **rien à l'arrêt**, rien contre un mur, rien sous le menu/dialogue.
7. **Passages étroits de la Forêt** *(ticket 1)* — plus de jeu qu'avant (12 px → 14,4 px dans une ouverture d'1 tuile).
8. **Puits, de jour, dans le Jardin** *(ticket 3, état 32bis)* — margelle, mâts plantés dessus, treuil, corde, seau, toit : **un seul objet**. Vérifier qu'il ne mord ni le chemin ni la zone du fruit.
9. **Table / coffre / atelier** — ne devaient **pas** changer.
10. **Couloir intérieur de la maison** *(ticket 1)* — circulation entre les stations.
11. **Nuit** — la traînée de poussière doit s'assombrir avec la scène, jamais rester blanc vif.
12. **Écran Stats** *(ticket 5)* — nouvelle entrée « Expérience : Nv.N — NN % ».
13. **Montée de niveau** *(ticket 5, état 25bis)* — bref éclat doré sur `Nv. N`, aucun son.
14. **Un passage au tactile** *(ticket 5)* — le bandeau ne doit recouvrir aucun bouton tactile.

#### Valeurs provisoires introduites, à régler au ressenti

| Valeur | Fichier | Posée à |
|---|---|---|
| Échelle du héros (visuel **et** hitbox) | `data/visuels.json` > `visuel_heros` > `echelle` | **0,88** (décision Xav) |
| Silhouette du puits : mâts, treuil, corde, seau | `data/visuels.json` > `visuel_puits` | mâts 3×18 en x=±7 ; treuil 15×2,5 ; corde 1×5 ; seau 5,5×4,5 |
| Poussière : durée de vie | `data/effets.json` > `effet_poussiere` > `duree_ms` | 350 |
| Poussière : distance entre deux bouffées | idem > `intervalle_px` | 14 |
| Poussière : opacité de départ | idem > `alpha_depart` | 0,35 |
| Poussière : échelle début → fin | idem > `echelle_depart` / `echelle_fin` | 0,8 → 1,6 |
| Poussière : décalage latéral, décalage vertical | idem > `decalage_lateral_px` / `offset_y_px` | 3 / 6 |
| Hauteur du bandeau HUD | `src/ui/hud_layout.js` > `BANDEAU_HAUT.hauteur` | 20 px (7,4 % de 270) |
| Fin du contenu du bandeau | `src/ui/hud_layout.js` > `BANDEAU_CONTENU_FIN_X` | 430 px |
| Durée de l'éclat de montée de niveau | `src/main.js` > `ECLAT_NIVEAU_MS` | 700 ms |
| Position de la bannière d'indice | `src/ui/hud_hints.js` > `Y_BANNIERE` | 26 px (était 8) |

*Aucune valeur provisoire pour le ticket 2* : l'amortissement de la lévitation dure `levitation.periode_ms`, déjà en données.

#### Questions ouvertes

1. **Zone de buffs du HUD** (ticket 5) : l'inventaire a montré qu'**aucun buff n'est affiché au HUD** aujourd'hui, alors que `status.js` en tient. La zone est réservée et testée dans `elementsBandeauHaut`, mais rien n'y est dessiné — inventer un affichage aurait débordé du ticket. **Veux-tu un affichage des buffs actifs dans cette zone ?** (ticket à part).
2. **Bannière d'indice descendue à y=26** (ticket 5) : conséquence mécanique du bandeau, pas une décision de design que j'aie prise à ta place — mais c'est un choix visible. **L'indice sous le bandeau te convient-il**, ou préfères-tu qu'il passe en bas de l'écran ?
3. **Seau du puits** (ticket 3) : la fiche listait « seau » dans l'attendu, il n'existait pas dans les données. Je l'ai ajouté (avec treuil et corde) pour satisfaire le §Attendu. **À confirmer que c'est bien ce que tu voulais**, ou à retirer si le puits te paraît chargé.
4. **`?debug=fps` avant/après** : impossible cette session (aucun navigateur). L'étape 7 du polish (correction des saccades) attend toujours tes chiffres, et la traînée de poussière ajoute un calque qu'il vaut mieux mesurer.

---


Ménage de journal effectué en début de session : le journal précédent (« Diagnostic saccades : le calque statique n'était pas en cause ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-19_diagnostic-saccades-calque.md`, `docs/archives/INDEX.md` mis à jour (lien de la dernière ligne corrigé, la fiche `SD_saccades-calque-statique_2026-09-19.md` était déjà déplacée dans `docs/archives/`). Travail sur la branche `polish-2026-09-19`, jamais fusionnée : c'est Xav qui fusionne.

### Ticket 1 — MT héros à l'échelle 0,88 (visuel et hitbox)

**Inventaire d'abord (demandé par le ticket), avant toute ligne de code.**

Où vivait la taille du héros, AVANT :

| Quoi | Où | Valeur |
|---|---|---|
| Silhouette visuelle | `data/visuels.json` > `visuel_heros` | cercle extérieur `w/h = 22` (donc rayon visuel 11 px), ombre `w 16 / h 6 / dy 8` |
| Boîte de collision | `src/main.js:76` `const RAYON_HERO_PX = 10` | rayon 10 px, soit une hitbox carrée de 20×20 px |
| Point de dérivation unique de la hitbox | `src/main.js#hitboxHeros()` | `{ x: hero.x - rayon, y: …, largeur: rayon*2, hauteur: rayon*2 }`, seule source pour `resoudreDeplacement` |

**Constat de l'inventaire : les deux sources DIVERGEAIENT déjà** (rayon visuel 11 vs rayon de collision 10) — exactement ce que le ticket veut rendre impossible. Écart conservé tel quel en ratio (le visuel déborde légèrement la hitbox, ce qui est voulu : un corps qui mord d'un pixel sur un mur se lit mieux qu'un corps qui flotte), mais il dérive désormais d'un seul nombre.

Ce qui est dérivé de la taille du héros, et ce qui ne l'est pas :

- **Dérivé, donc suit automatiquement l'échelle** : `TOLERANCE_COIN_PX` (`scene.js:260`) vaut `largeur / 6` de la hitbox reçue — *déjà* relatif, aucun changement nécessaire, et il reste au même sixième de la boîte après réduction. Le ticket demandait de vérifier sa cohérence : elle est structurelle, pas numérique. Aucun test ne prouve qu'il faille la modifier → non modifiée.
- **Non dérivé, donc rien à figer** (vérifié un par un, tous sont des constantes absolues ou des données, aucun ne lit le rayon du héros) : vitesse (`derivee_vitesse_deplacement_px_s`, stat dérivée), portée d'arme (`combat.js#estDansPortee`, en tuiles via `tile_size`), seuil d'interaction (`DISTANCE_INTERACT_PX = 28`), orbite du follet (`companion.js#ORBITE_RAYON_PX = 24`), aura (`companionActif.rayon_aura`, donnée), halo/lumière (`rayon_lumiere`, donnée), rayon d'effacement du toit (dérivé du `rayon_lumiere` du follet, pas du héros), taille des monstres (leurs propres visuels). **Aucune valeur n'a eu besoin d'être figée** — le ticket prévoyait ce cas, il ne s'est pas présenté.
- Le ramassage n'a pas de rayon propre : `trouverItemProche` est appelé sous le même `DISTANCE_INTERACT_PX`, inchangé.

**Fait.** Une seule échelle, en données :

- `data/visuels.json` > `visuel_heros` porte désormais `"echelle": 0.88` — **le seul nombre à toucher pour retailler le héros**.
- `src/visuels.js` : nouvel export `echelleVisuel(visuel)` (échelle propre d'une silhouette, 1 par défaut) ; `dessinerVisuel` compose *échelle propre × échelle d'instance* (`echelleEffective`). Un visuel sans `echelle` est strictement inchangé — tout le catalogue existant reste valide. Même esprit que `structures.js#tournerEmpreinte` : une seule fonction, deux consommateurs, pas de divergence possible.
- `src/main.js` : `RAYON_HERO_PX = 10` devient `RAYON_HERO_BASE_PX = 10` (rayon de *référence*, échelle 1) et la nouvelle `rayonHeros()` renvoie `base × echelleVisuel(visuel_heros)`. Les 2 sites de création du héros (boot et `reinitialiserPartie`) passent par elle.
- `src/schemas.js` : `echelle` validée sur les visuels (nombre strictement positif si présent) — une échelle nulle donnerait *à la fois* un héros invisible et une hitbox dégénérée, les deux venant du même champ, donc échec dur au boot.
- **`render.js` n'a pas été touché** : l'échelle propre est appliquée à l'intérieur de `dessinerVisuel`, l'appelant n'a pas à la connaître. Donc **aucun rejeu de `docs/CHECKLIST_visuelle.md` exigé par la règle de méthode** (elle vise `render.js` / `ui/hud.js` / `ui/dialogue_box.js` / `main.js#dessiner()`, tous intacts pour ce ticket).

Effet mesuré (headless) : rayon de collision 10 → 8,8 px, donc **jeu par côté dans un passage d'1 tuile : 6 px → 7,2 px** (+20 %), ce que le ticket visait.

**Écarté volontairement** :

- `TOLERANCE_COIN_PX` **non modifiée** — elle vaut déjà `largeur / 6` de la hitbox reçue, donc elle suit l'échelle toute seule. Le ticket n'autorisait un changement que si un test le prouvait nécessaire : aucun ne l'a prouvé.
- Aucune valeur « figée » : l'inventaire ci-dessus montre qu'aucun des seuils listés par le ticket (vitesse, portées, interaction, aura, halo, orbite, toit, monstres) ne dérivait du héros. Rien à geler.
- Le rayon de base (10) reste une constante de code : le ticket demandait *une seule échelle en données*, pas de déplacer toute la géométrie du héros en données.

**Dette « mouvement légèrement téléporté à chaque angle » : réévaluée, non traitée** (le ticket l'interdit). Elle ne change pas de nature, mais son amplitude maximale **diminue** mécaniquement : la correction de coin est bornée par `TOLERANCE_COIN_PX = largeur/6`, soit 3,33 px avant, **2,93 px après**. Le saut sera donc un peu plus discret sans disparaître — la cause (repoussement appliqué d'un coup plutôt qu'interpolé) est intacte.

**Testé** : `node --check` sur `src/visuels.js`, `src/main.js`, `src/schemas.js`, `tests/test_mt_heros_echelle_2026-09-19.js`. Nouveau `tests/test_mt_heros_echelle_2026-09-19.js` (5 blocs : échelle unique en données, composition d'échelle sur faux ctx, non-régression des visuels sans échelle, refus au boot d'une échelle invalide, couloir d'1 tuile sans contact, **2535 positions sauvegardées** valides avant qui le restent après). `node tools/run_tests.js` : **62 fichiers verts** (1 nouveau).

**À valider par Xav à la manette** : silhouette du héros (proportion à 0,88 — si le ressenti est « trop petit » ou « pas assez », c'est `data/visuels.json > visuel_heros > echelle` et rien d'autre), passages étroits de la Forêt, couloir intérieur de la maison entre les stations. Aucune capture avant/après n'a pu être prise : **ni l'extension Chrome ni le démon browser-use ne répondent dans cette session** (extension non connectée ; `bu-default` ne démarre pas). Même cause pour les relevés `?debug=fps` avant/après demandés par le brief : ils supposent un navigateur *et* une traversée jouée à la main — entièrement dus à Xav.

### Ticket 2 — MT intro : les follets restent visibles pendant le texte

**Cause racine d'abord (hypothèse de la fiche vérifiée, pas présumée), nommée fichier:ligne.**

`src/main.js#maj()`, ex-lignes 1185-1189 : à l'instant `intro.terminee`, le code faisait `intro = null` **puis** `demarrerChoixFollet()`. Or `demarrerChoixFollet()` (`main.js:291`) n'ouvre qu'un dialogue et ne pose `choixFollet` que dans son `onFermer`. Entre ces deux instants — c'est-à-dire pendant **tout** le texte :

- `dessinerIntroConvergence()` (`main.js:1341`) sortait sur `if (!intro) return null;` ;
- `dessinerEcranChoixFollet()` (`main.js:1313`) sortait sur `if (!choixFolletActif()) return;`.

Personne ne dessinait les follets. Ils revenaient d'un coup à la fermeture du dialogue, quand `choixFollet` devenait non-null. **L'hypothèse de la fiche était exacte** ; la vérification a servi à nommer le point précis (`intro = null` trop tôt, pas un problème d'ordre de calques ni d'alpha).

**Fait.**

- `src/intro.js` : 3ᵉ étape `ETAPE_ATTENTE`. `creerIntro` gagne `tAttenteMs: 0` ; `avancerIntro` ne gèle plus l'horloge une fois `terminee` — il bascule sur `tAttenteMs` (et le dépassement de la frame de bascule amorce l'attente au lieu d'être perdu, pour ne pas marquer un micro-temps d'arrêt). La machine **reste pure** : aucune notion de dialogue, elle ne sait pas pourquoi on l'attend.
- Continuité aux deux frontières, obtenue par un seul paramètre `amortissement` passé à `positionFolletConvergence` : la **phase du sinus continue de courir** (donc aucun saut à l'entrée en attente, amortissement = 1 des deux côtés), seule l'**amplitude** décroît jusqu'à 0 en une période de lévitation — à ce moment les follets sont posés **exactement** sur les cibles, là même où `dessinerEcranChoixFollet()` les redessine (donc aucun saut à la sortie non plus). Durée de l'amortissement **dérivée des données existantes** (`levitation.periode_ms`) : **aucun nouveau seuil numérique introduit**, rien de neuf à régler pour Xav.
- `src/main.js` : l'intro n'est plus mise à `null` à la fin de la convergence ; `terminee` est lu comme un **front** (comparé à son état d'avant la frame) pour que le dialogue ne s'ouvre qu'une fois. L'intro s'éteint désormais dans `confirmerChoixFollet()`, où `depart` prend le relais. `dessinerIntroConvergence()` cède la priorité à `choixFolletActif()` (sans quoi les follets seraient dessinés deux fois pendant l'écran de choix).
- Le dialogue est déjà dessiné **après** les follets dans `dessiner()` : le texte passe devant, les follets lévitent derrière, sans avoir à les atténuer.

**Inchangé, comme l'exige le ticket** : durée de l'intro (budget ≤ 8 s, `dureeEtapesTempsFixe` intacte, testé), non-skippabilité (aucune lecture d'input ajoutée), armement anti-spam du dialogue (non touché).

**3 assertions de tests existants mises à jour** — elles affirmaient l'ancien contrat, c'est-à-dire *le mécanisme même du bug*, pas un comportement à préserver : `test_phase1_sd_grotte_choix_follet` ligne 135 et `test_phase1b_intro` ligne 170 (« l'intro doit être terminée/null une fois la narration ouverte » → désormais « reste vivante, `terminee` vrai ») et `test_phase1b_intro` ligne 54 (« avancerIntro est un no-op une fois terminée » → `tMs` figé mais `tAttenteMs` qui avance). Chaque modification porte en commentaire la raison et la référence de la fiche.

**Testé** : `node --check` sur `src/intro.js`, `src/main.js`, `tests/test_mt_intro_follets_visibles_2026-09-19.js`. Nouveau `tests/test_mt_intro_follets_visibles_2026-09-19.js` (6 blocs : visibilité et opacité sur 10 s de texte échantillonnées à 16 ms, continuité convergence→texte, report du dépassement de frame, follets posés au pixel près sur les cibles du choix, amortissement borné par son enveloppe et sans rebond, budget ≤ 8 s + front `terminee` unique). `node tools/run_tests.js` : **63 fichiers verts** (1 nouveau).

**`main.js#dessiner()` touché → `docs/CHECKLIST_visuelle.md` à rejouer par Xav**, avec le nouvel **état 17bis « Intro — texte de choix + follets visibles »** ajouté à la checklist (les follets restent à l'écran derrière le texte, leur lévitation se pose, aucun saut à l'appui sur `A`). Comme pour le ticket 1, **aucune capture n'a pu être prise** : ni l'extension Chrome ni le démon browser-use ne répondent dans cette session.

### Ticket 3 — SD puits : silhouette désolidarisée depuis l'échelle ×2,1

**Cause racine d'abord : ce sont les DONNÉES, pas l'interprète.** Inventaire demandé par la fiche (chaque primitive, et si elle suit l'échelle) :

`visuels.js#dessinerVisuel` applique **un unique `ctx.scale(e, e)`** autour de tout le dessin. Conséquence : longueurs, positions, rayons, **et épaisseurs de trait** (`lineWidth` est en espace utilisateur, donc mis à l'échelle lui aussi) suivent tous l'échelle, sans exception. `ancre` n'est même **jamais lu** par l'interprète (champ de métadonnée). **Donc l'interprète ne peut pas désolidariser une silhouette** : une silhouette bien assemblée à l'échelle 1 l'est à toute échelle — et réciproquement, un défaut d'assemblage existait déjà à l'échelle 1, il ne devenait visible qu'une fois agrandi. La branche « si c'est l'interprète, le défaut concerne tous les visuels » de la fiche **ne s'applique pas** ; table / coffre / atelier vérifiés malgré tout (voir tests), aucune pièce orpheline chez eux.

Le défaut réel, mesuré sur les anciennes données :

| Pièce | Boîte (échelle 1) | Verdict |
|---|---|---|
| margelle (cercle) | x[-10,10] y[-16,4] | disque r=10 centré (0,-6) |
| eau (ellipse) | x[-7,7] y[-11,-1] | ok |
| mât g / mât d (rect 3×14) | x[∓10.5,∓7.5] y[-25,-11] | **pied en porte-à-faux** |
| toit (rect 22×3) | x[-11,11] y[-25.5,-22.5] | ok |

Les **boîtes** des mâts et de la margelle se recouvrent (2,5 px) — un test naïf sur les boîtes serait resté vert. Mais le **disque** de la margelle ne mesure que `√(10² − 5²) = 8,66` px de demi-largeur à la hauteur où le mât s'arrêtait (y = −11), alors que le mât occupait x ∈ [−10,5 ; −7,5] : **seuls 1,16 px des 3 px du pied reposaient sur la margelle, 61 % flottaient dans le vide**. Et le pied s'arrêtait 5 px *au-dessus* du centre de la margelle, dans la partie où le disque se rétrécit vite — d'où « les mâts sont trop courts ». Agrandi ×2,1, le porte-à-faux devient un trou franc de ~3,9 px, parfaitement visible.

**Fait (données seules, plus une extraction sans changement de règle) :**

- `data/visuels.json` > `visuel_puits` : mâts rapprochés (x = ±7 au lieu de ±9) et **allongés** (h 18 au lieu de 14, pied à y = −7 au lieu de −11) — le pied repose désormais sur **toute** sa largeur (3 px d'appui sur 3), le sommet entre dans le toit (2,5 px de recouvrement). Ajout du **treuil** (rect 15×2,5) qui relie franchement les deux mâts, de la **corde** et du **seau**, explicitement listés au §Attendu et jusque-là absents de la silhouette.
- `src/structures.js` : `boitePrimitive(p, echelle)` **extraite** de `empreinteParDefaut` — c'est exactement le calcul qui s'y trouvait, désormais nommé et réutilisé par elle. **Aucun changement de règle** ; le but est que la vérification d'assemblage et l'empreinte solide dérivent de la *même* fonction, pour qu'un test ne puisse pas rester vert pendant que l'empreinte, elle, dérive.

**L'empreinte solide est strictement inchangée** : boîte englobante x[−11,11] y[−25,5 ; +4] avant **et** après (toutes les pièces ajoutées sont à l'intérieur ; le toit et la margelle, qui la définissent, n'ont pas bougé). La question « le puits mord-il sur un chemin ou sur la zone de réapparition du fruit ? » posée par la fiche **ne se pose donc pas** — et un test la verrouille aux 3 échelles pour qu'elle ne se pose pas non plus par surprise plus tard.

**Valeurs nouvelles, toutes *provisoires*** (arrangement purement visuel, à juger à l'œil par Xav — elles sont toutes dans `data/visuels.json > visuel_puits`) : treuil 15×2,5 en y = −19 ; corde 1×5 en y = −16 ; seau 5,5×4,5 en y = −12 ; mâts 3×18 en x = ±7, y = −16.

**Testé** : `node --check` sur `src/structures.js`, `tests/test_sd_puits_silhouette_2026-09-19.js`. Nouveau `tests/test_sd_puits_silhouette_2026-09-19.js`, **data-driven** (les contacts à vérifier sont déclarés dans une table en tête du fichier ; ajouter un visuel à surveiller ne demande aucune ligne de code) : 8 contacts tenus aux échelles **1, 2,1 et 3** ; appui réel du pied des mâts mesuré sur le **disque** et non sur sa boîte (c'est l'assertion qui aurait été **rouge** sur les anciennes données — vérifié : 1,16 px d'appui pour 3 px de mât) ; empreinte solide inchangée aux 3 échelles ; **aucune pièce orpheline** dans les 4 stations (table, coffre, atelier vérifiés au passage, tous sains). `node tools/run_tests.js` : **64 fichiers verts** (1 nouveau).

**Vérification visuelle** : aucun navigateur piloté disponible dans cette session (extension Chrome non connectée, démon browser-use en échec) — donc, comme le prévoit la fiche, **nouvel état `32bis` ajouté à `docs/CHECKLIST_visuelle.md`** (« Puits — silhouette réassemblée », de jour, à comparer avec table/coffre/atelier qui ne devaient pas changer), dû par Xav. `visuels.js`, `render.js`, `hud.js`, `dialogue_box.js` et `main.js#dessiner()` **non touchés** : pas de rejeu intégral de la checklist exigé par la règle de méthode, seulement ce nouvel état.

### Ticket 4 — MT traînée de poussière derrière le héros

**Fait.** Nouveau module **pur** `src/poussiere.js` + nouveau catalogue de données `data/effets.json`.

- `src/poussiere.js` (pur, aucun canvas, aucune horloge propre) : `creerPoussiere` / `avancerPoussiere` / `bouffeesVisibles` / `viderPoussiere`. **Réserve fixe de 8 bouffées pré-allouée une fois au boot** ; une bouffée morte est recyclée sur place (jamais `push`/`splice`), donc **zéro allocation en jeu**. Réserve pleine = la bouffée est abandonnée plutôt que d'agrandir le tableau (n'arrive qu'en téléportation).
- **Émission à la distance parcourue** (`intervalle_px`), jamais au temps : la densité de la traînée est identique à 30 et à 144 fps (testé). La boucle d'émission est un `while` (une frame longue peut franchir plusieurs intervalles) borné par la réserve.
- **Distance RÉELLEMENT parcourue**, mesurée *après* `resoudreDeplacement` (delta de `hero.x/y`), pas le déplacement demandé — pousser contre un mur ne soulève donc aucune poussière.
- **Déterministe** : décalage latéral alterné par un compteur d'émissions, **aucun `Math.random()`** (un test relit le source du module pour le garantir).
- **Règle directrice de la fiche respectée et verrouillée par un test** : le module ne connaît ni `rayon`, ni `heroVisuel`, ni `hitbox` — seulement une position et une distance. Remplacer la silhouette du héros demain ne touche pas une ligne de `poussiere.js`.
- `src/render.js` : les bouffées sont dessinées **juste avant le héros** (donc sous lui) et **dans le monde** (coordonnées caméra) — le calque d'obscurité, appliqué bien plus tard, les assombrit la nuit **sans code dédié**. Paramètre `poussiere = null` par défaut : un appelant qui ne fournit rien dessine exactement comme avant.
- `src/main.js` : réserve créée une fois au boot ; émission gelée par le **point de décision unique existant** (`if (!uiOuverte)`), jamais par une condition propre à l'effet — donc rien pendant l'intro, le dialogue, le menu ou la Construction, par construction. `viderPoussiere()` à chaque `entrerDansScene()` (donc aussi à `reinitialiserPartie`, qui y repasse) : une traînée ne suit pas le héros d'une scène à l'autre.
- `src/schemas.js` : catalogue `effets` validé au boot (`visuel` référencé, `duree_ms`/`intervalle_px` strictement positifs — un intervalle nul ferait une boucle d'émission sans fin). Même patron que `survie_config` dans `survival.json`. **Data-driven** : un 2ᵉ effet s'ajoute en ajoutant une entrée, sans toucher au schéma.

**Valeurs nouvelles, toutes *provisoires* et toutes dans `data/effets.json` > `effet_poussiere`** — c'est le seul fichier à ouvrir pour régler le ressenti : `duree_ms` 350, `intervalle_px` 14, `alpha_depart` 0,35, `echelle_depart` 0,8, `echelle_fin` 1,6, `decalage_lateral_px` 3, `offset_y_px` 6. La silhouette elle-même est `visuel_poussiere` dans `data/visuels.json` (3 petits cercles blancs).

**Testé** : `node --check` sur `src/poussiere.js`, `src/render.js`, `src/main.js`, `src/schemas.js`, `tests/test_mt_trainee_poussiere_2026-09-19.js`. Nouveau `tests/test_mt_trainee_poussiere_2026-09-19.js` (les 4 contrats du §Tests + 3 de plus) : X px → k bouffées pour 4 pas différents ; densité identique à 30 et 144 fps ; réserve fixe même en saturation et en téléportation ; immobile → 0 ; UI ouverte → 0 ; l'arrêt ne met aucune bouffée « en attente » ; deux exécutions identiques → bouffées identiques ; alternance latérale ; alpha décroissant / échelle croissante puis recyclage ; `viderPoussiere` sans réallocation ; le module ignore la forme du héros et n'utilise aucun aléa. `node tools/run_tests.js` : **65 fichiers verts** (1 nouveau).

**`main.js#dessiner()` et `render.js` touchés → `docs/CHECKLIST_visuelle.md` à rejouer par Xav** (règle de méthode), avec le nouvel **état `32ter` « Traînée de poussière »** ajouté à la checklist. **Relevé `?debug=fps` avant/après impossible** dans cette session : aucun navigateur piloté disponible (extension Chrome non connectée, démon browser-use en échec) et le protocole suppose de toute façon une traversée jouée à la main — dû par Xav, comme l'étape 1 du polish.

### Ticket 5 — MT HUD sur une seule ligne en haut

**Inventaire d'abord (demandé par le ticket) : ce que `ui/hud.js` dessinait.**

| Calque | Où | Devenu |
|---|---|---|
| Cartouche 1 (arrondi, 120×46 en 6,6) : icône follet + barre de PV (valeur `pv/pvMax` centrée dedans) + ligne `◆ éclats` | colonne de gauche | **déplacé dans le bandeau haut** |
| Cartouche 2 (sous le premier) : jauge faim, jauge soif, `Nv.N` + **barre d'XP** | colonne de gauche | jauges et niveau **déplacés dans le bandeau** ; **barre d'XP supprimée** |
| Boutons tactiles (si tactile actif) | `hud_layout.js` | **non touché** |
| Rangée de 5 slots en bas (si tactile inactif) | `dessinerSlotsBas` | **non touché** (spec à part de Xav) |

**Deux choses que l'inventaire a révélées, et que la fiche n'avait pas listées** :

1. **Les éclats (`◆ N`)**, qui vivaient dans le cartouche PV. La fiche prévoyait le cas (« à ajuster si l'inventaire révèle autre chose ») : ils prennent place dans le bandeau, entre les PV et la faim. Ordre final : **follet · PV · éclats · faim · soif · `Nv. N`** — espace — zone buffs.
2. **Aucun buff n'est affiché au HUD aujourd'hui** (`status.js` en tient bien, mais rien ne les dessine). La zone de buffs est donc **calculée et testée** dans le layout, mais **rien n'y est dessiné** — inventer un affichage de buffs aurait débordé du ticket.

**Fait.**

- `src/ui/hud_layout.js` : `BANDEAU_HAUT` (0,0,480×20 — **7,4 % de la hauteur logique**, sous le plafond de 8 %) et `elementsBandeauHaut({ follet, survie, niveau })`, **pure**, qui renvoie les rectangles nommés. Tout le placement vit là, rien en dur dans `hud.js` — c'est ce qui rend le ticket testable, `hud.js` n'étant jamais exercé headless.
- `src/ui/hud.js` : `dessinerHud` réécrite autour du bandeau. `dessinerRectangleArrondi`, `COULEUR_XP` et les 7 constantes `CARTOUCHE_*`/`BARRE_PV_HAUTEUR` **supprimées** (plus aucun cartouche). Les jauges gardent leurs icônes **par forme** (triangle/goutte) et les éclats leur losange — P4② intacte, chaque élément reste identifiable sans la couleur.
- **Éclat de montée de niveau** : `main.js` tient un compte à rebours (`ECLAT_NIVEAU_MS = 700`, **provisoire**) déclenché par le **changement de `save.hero.niveau`** — donc un seul éclat par palier, quelle que soit la source d'XP — et passe un ratio 0..1 ; `hud.js` ne tient aucun état et vire simplement le texte à l'or. **Aucun son ajouté**, comme l'exige la fiche.
- **L'XP reste lisible dans l'écran Stats** : nouvelle entrée informative (grisée) `Expérience : Nv.N — NN %`, même patron que « points libres ». Nouvelles clés `menu.stats_xp` en **FR et EN** (zéro chaîne en dur).

**Conséquence non prévue par la fiche, traitée plutôt que laissée en collision** : la bannière d'indices de commande (`ui/hud_hints.js`) était dessinée à `y = 8`, hauteur 18 — elle se serait superposée au bandeau (0..20). La fiche exige explicitement que le bandeau ne recouvre pas les indices : **`Y_BANNIERE` passe de 8 à 26** (l'indice est fugace, le bandeau est permanent — c'est à l'indice de céder). Un seul nombre, commenté sur place.

**Le bandeau ne recouvre aucun contrôle tactile** : son fond est bien plein écran (décision Xav), mais son **contenu** s'arrête à `x = 430`, avant le bouton MENU tactile (`cx 455, rayon 16`). Vérifié par test contre **tous** les boutons tactiles et le joystick.

**Non touché, comme l'exige le ticket** : la rangée de cases du bas (spec à part, à écrire par Xav) et les boutons tactiles — un test le verrouille.

**Testé** : `node --check` sur `src/ui/hud_layout.js`, `src/ui/hud.js`, `src/ui/hud_hints.js`, `src/main.js`, `tests/test_mt_hud_ligne_haute_2026-09-19.js`. Nouveau `tests/test_mt_hud_ligne_haute_2026-09-19.js` (7 blocs, les 8 combinaisons d'éléments optionnels à chaque fois) : bandeau plein écran et ≤ 8 % de hauteur ; tous les rectangles dans le bandeau et dans 480 px ; aucun chevauchement ; **plus aucun rectangle ni couleur ni paramètre d'XP** (layout *et* source de `hud.js`) ; `Nv. N` suit le niveau et les clés i18n existent en FR/EN ; aucun contenu ne recouvre un contrôle tactile ; la rangée du bas est intacte. `node tools/run_tests.js` : **66 fichiers verts** (1 nouveau).

**`ui/hud.js` touché → `docs/CHECKLIST_visuelle.md` à rejouer EN ENTIER** (règle de méthode). La checklist a été mise à jour en conséquence : **état 1 réécrit** (le HUD y est décrit comme un bandeau haut), **état 25 réécrit** (jauges dans le bandeau, plus de barre d'XP, XP renvoyée à l'écran Stats), **nouvel état 25bis** (éclat de montée de niveau). Validation due par Xav : manette, **puis un passage au tactile** (le bandeau et les boutons tactiles coexistent en haut de l'écran).

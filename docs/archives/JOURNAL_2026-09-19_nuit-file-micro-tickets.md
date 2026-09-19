## Journal de session — Nuit du 19 au 20/09 (file de micro-tickets)

`BRIEF_nuit-2026-09-19.md` v1.3.0. Branche **`nuit-2026-09-19`**, créée depuis `main` ; **aucun `push`**.
Un ticket = un commit, dans l'ordre du brief, pour que la nuit se fusionne « jusqu'au commit N ».

## Rapport du matin

**La file est allée au bout : 10 commits, aucun ticket en échec, aucun arrêt obligatoire rencontré.** Suite
headless verte à chaque commit (71 fichiers au départ, **78** à l'arrivée). Personne n'a regardé l'écran : **tout
ce qui touche au rendu est livré « tests verts, validation en jeu due »**, jamais « validé ».

| # | Commit | État | Ce que Xav regarde en jeu |
|---|---|---|---|
| 1 | `0755a88` DOC ns rendu-navigateurs + relevés de base | livré | rien à regarder (doc seule) |
| 2 | `895390d` `D-32` héros : échelle 9 px | livré | lisibilité du héros jour **et** nuit, passages entre les arbres, couloir de la maison (`V-14`) |
| 2 bis | `be83df2` `D-33` vitesse de base −25 % | livré | le ressenti au stick : plus petit **et** plus lent, est-ce que ça tient ? (`V-15`) |
| 3 | `2f49092` `D-34` follet : échelle de jeu −25 % | livré | **partie neuve** : cinématique inchangée, puis l'élu qui rétrécit **pendant** que les deux autres s'éloignent (`V-16`) |
| 4 | ~~`9997cec` `D-35` lumière du follet~~ | **retiré** (`git revert`, Xav, 20/09) | plus rien à regarder : la lumière reste celle d'avant la nuit (110 px). `D-35` repasse à *ouvert* |
| 5 | `f2f632b` `07-A` zones et tirage | livré | rien : aucun monstre en jeu à ce palier |
| 6 | `65a80f1` `07-B` la nuit et le seuil | livré | les rôdeurs sortent-ils au bon endroit, au bon rythme ? Tout disparaît-il à l'aube ? (`V-18`) |
| 7 | `ae5d2ea` `07-C` comportement | livré | errent-ils, poursuivent-ils, renoncent-ils ? **Aucun n'entre dans le Jardin** (`V-18`) |
| 8 | `1ce9de5` `07-D` signal de la zone | livré | **devine**-t-on la zone au nord-est sans la voir ? Elle ne doit **rien révéler du sol** (`V-19`) |
| 9 | `507f954` `D-36` follet aérien | **proposition** | tout à l'œil : la sensation, le vol, le sillage, les ornements — **garder, régler ou retirer** (`V-20`) |

**Valeurs provisoires posées cette nuit** (toutes réglables en un nombre, toutes en données) :

| Valeur | Où | Retenue |
|---|---|---|
| Échelle du héros | `visuels.json#visuel_heros.echelle` | **0,643** (silhouette Ø 14,2 px, hitbox Ø 12,9) |
| Base de vitesse | `stats_derivees.json` | **75** (95 px/s effectifs à agilité 5) |
| Échelle de jeu du follet | `companions.json#echelle_jeu` | **0,75** |
| ~~Lumière du follet~~ | ~~`companions.json#lumiere`~~ | **retirée** avec `D-35` : la lumière reste à 110 px partout |
| Rythme d'apparition | `spawns.json#intervalle_ms` | **8 000** (plafond de 6 rempli en 48 s) |
| Détection du rôdeur | `spawns.json#detection_tuiles` | **8 tuiles** |
| Signal de la zone | `spawns.json#signal` | `#a24bd0`, alpha **0,16**, pulsation 5,2 s |
| Vol du follet | `effets.json#effet_vol_follet` | raideur 26, amortissement 5,5, amplitude 1,6 px |
| Rayon des monstres | `main.js#RAYON_MONSTRE_CHAOS_PX` | **8 px** |

**Les `[OUVERT]` retenus par défaut**, tous inscrits au suivi : `Q-28` (vitesse ×0,75) · `Q-32` (détection à 8 tuiles).
`Q-30` et `Q-31` sont tombées avec le revert de `D-35` — `Q-30` retrouve sa formulation d'origine.

**Ouvert au suivi cette nuit** : `D-32` à `D-36` (les cinq tickets — trois clos, `D-35` **revertée donc rouverte**, `D-36` proposé) · **`D-37`**
(l'engagement du follet ne suit pas la définition de Xav, et `rayon_aura` n'a aucun effet de jeu — constaté, **non
corrigé**, hors périmètre) · **`D-38`** (deux monstres du même type étaient un seul monstre — **corrigé** dans
`07-B`, sans quoi le palier livrait une fonctionnalité fausse) · `Q-26` à `Q-32` · `V-14` à `V-20`. `A-03` close.

**Aucun arrêt obligatoire n'a été rencontré.** Le seul qui menait quelque part — la migration de sauvegarde du
palier B — n'a pas eu lieu d'être : les monstres nocturnes ne sont pas persistés, `schema_version` ne bouge pas.

**Le `maj()` du bot, avec et sans monstres** (Node, sans rendu ni manette ; seconde moitié d'une nuit de 4 min,
7 499 frames mesurées dans chaque cas) :

| | `maj()` moy | p95 |
|---|---|---|
| Niveau 4, **zéro monstre** | 0,004 ms | 0,006 ms |
| Niveau 5, **plafond de 6**, palier B seul | 0,005 ms | 0,006 ms |
| Niveau 5, **plafond de 6**, avec le comportement (palier C) | **0,009 ms** | 0,010 ms |

Six rôdeurs qui décident, errent, se cognent et attaquent coûtent donc **0,005 ms par frame** sur un budget de
16,7 ms. Ce chiffre ne dit pas « le jeu tiendra 60 fps » — c'est Node, et sans le rendu : il dit que **la logique
des monstres n'est pas le sujet**. Le verdict reste le relevé `?debug=fps` de nuit sous Chrome, plafond atteint,
comparé à **`R-03`** (59,9 fps, 0 frame sautée, `maj()` 0,06 ms).

**Pour voir des monstres tout de suite** : importer **`docs/sauvegardes/rpg_v2_save(9).json`** — niveau 7, schéma v5
(aucune migration), dans la Région Maison, horloge à **64 s après le début de la nuit**, donc ≈ 3 minutes de nuit
à l'ouverture et le premier rôdeur dans les 8 secondes. **Il n'existe aucun paramètre d'URL pour forcer l'heure**
(seuls `?debug=fps` et `?echelle=N` existent) et je n'en ai pas ajouté.

**Un contrôle de démarrage, et il faut savoir ce qu'il vaut.** La suite headless **n'exécute jamais le rendu**
(`ctxLogique` y est `null`) : or cette nuit a touché `render.js` quatre fois. J'ai donc ouvert le jeu dans Chrome
pour vérifier **qu'il démarre et que la boucle tourne** : intro jouée, paupières puis Grotte dessinée, héros à sa
nouvelle taille, touches réactives, **aucune erreur console** — une exception dans `frame` aurait figé l'image,
elle a avancé. Servi sur **127.0.0.1:8099**, un port à moi : l'IndexedDB du jeu étant liée à l'origine,
**la sauvegarde de `localhost:8080` n'a pas été touchée**. Ce contrôle dit « ça ne plante pas ». Il ne dit **rien**
de ce à quoi ça ressemble, ni de la nuit dehors, ni du signal de la zone : ça, c'est `V-14` à `V-20`.

**Rappel de manipulation :**

```
git log --oneline main..nuit-2026-09-19   # les 10 commits de la nuit
git merge <hash>                          # depuis main : fusionne JUSQU'A ce commit
git revert <hash>                         # retire un seul commit (ex. 507f954, le follet aérien)
```

---

### Les identifiants du brief étaient tous pris

Le brief les tirait du suivi **v1.7.0** ; les sessions de code du 19/09 au soir ont pris la suite entre-temps.
Renumérotation, suivant la règle du §0 du suivi (« un identifiant n'est jamais réutilisé ») :

| Brief | Suivi | Sujet | Déjà pris par |
|---|---|---|---|
| `D-27` | **`D-32`** | Héros à 9 px | id de catalogue venu d'une sauvegarde, non vérifié |
| `D-31` | **`D-33`** | Vitesse de base du héros | Galaxy A04, ≈ 18 ms hors du code du jeu |
| `D-28` | **`D-34`** | Follet −25 % en jeu | récolte à poche pleine, silencieuse |
| `D-29` | **`D-35`** | Lumière du follet à l'extérieur | `image-rendering: pixelated` résiduel |
| `D-30` | **`D-36`** | Follet « aérien » | plein écran au tactile |
| `Q-24` | **`Q-26`** | Orbite du follet (ouverte et close) | politique navigateurs |
| `Q-25` | **`Q-27`** | Lueur sur les monstres | conseiller sur le symptôme |
| `Q-26` | **`Q-28`** | Vitesse ×0,75 (`[OUVERT]`) | — |
| `Q-27` | **`Q-29`** | Follet équipable (ouverte et close) | — |
| `Q-28` | **`Q-30`** | Lumière à l'intérieur de la Maison | — |

**Le relevé de nuit s'appelle `R-03`, pas `R-15`.** Le registre §6 lui réservait déjà une ligne vide depuis le 19/09,
nommée par `A-03` et par le §Méthode de `07`. Créer `R-15` aurait donné **deux identifiants pour une seule mesure** :
j'ai rempli la ligne réservée et j'y ai noté l'alias, pour que « R-15 » reste retrouvable. `R-14` (jour), lui,
tombait juste.

### Ticket 1 — doc seule

**Ménage.** Le journal de la NS « rendu, navigateurs, téléphone » est archivé verbatim
(`docs/archives/JOURNAL_2026-09-19_ns-rendu-navigateurs.md`) avec sa ligne d'INDEX ;
`NS_decisions-rendu-navigateurs_2026-09-19.md` descend à côté, comme ce journal l'annonçait lui-même.
`docs/DOC_navigateurs.md` reste dans `docs/` : registre **vivant**, comme le suivi.

**Les deux relevés de base, inscrits au §6.** `R-14` (jour) et `R-03` (nuit), Chrome, F11, 1920×1080, échelle
naturelle 4, manette, protocole de traversée. **59,9 fps et zéro frame sautée dans les deux cas** ; `dessiner()`
0,34 / 0,32 ms, `maj()` 0,05 / 0,06 ms, ≈ 37 recalculs de calque à environ 1 ms. `A-03` **close**.

Ce que ces deux lignes changent pour `07` : il n'y a **pas de marge de rendu à défendre** sous Chrome. À 0,33 ms de
`dessiner()` pour un budget de 16,7 ms, le rendu n'est plus le sujet — les monstres coûteront du **`maj()`** (ils se
décident, se déplacent, se cherchent) bien avant de coûter du dessin. Le §6 de la spec citait encore `R-02` et sa
« marge ≈ 4,6 ms » : c'étaient des millisecondes de **Firefox**, elles ne se comparent à rien de ce qui sera mesuré
cette nuit. Remplaçé par `R-03`, avec l'ordre de lecture : **frames sautées d'abord, `maj()` ensuite, jamais
`dessiner()`**.

**Deux décisions datées consignées** dans le tableau des décisions : le **principe d'équilibrage** (les valeurs de
base sont basses et tout grandit ensuite — avec sa **seule** conséquence d'architecture : une valeur destinée à
grandir passe par une fonction pure de résolution, jamais lue directement par un système, et **aucun buff n'est
livré avec**) et le **follet équipable** (un emplacement, amulette *ou* talisman — `Q-29`, rien de livré).

**Ordre d'injection réécrit** dans `CLAUDE.md` et la ROADMAP (1.8.0) : tailles/vitesse/lumière → `07` AàD → `D-36`,
**puis** `D-17` + `D-30`, `D-13`, `D-01`/`D-16`, reprise de `Q-07`. La spec `07` passe en 1.3.0 : plus de branche
`chaos-nocturne` (tout sur `nuit-2026-09-19`), et trois éléments extérieurs la touchent désormais — héros plus petit
(`D-32`), héros plus lent (`D-33`), aucune lueur sur les monstres (`Q-27`).

**Une précision de méthode, dite ici pour ne pas la découvrir au matin** : ce journal grandit d'une section à chaque
ticket, dans le commit de ce ticket. Ce n'est pas revenir sur un ticket précédent — c'est le journal qui avance.
Aucun fichier de `src/`, `data/` ou `tests/` n'a été touché par ce ticket-ci.

### Ticket 2 — `D-32` : le héros à 9 px

**Une ligne de données.** `data/visuels.json#visuel_heros.echelle` : **0,88 → 0,643**. Le ticket de polish du matin
avait fait le travail difficile — depuis lui, le rendu (`visuels.js#dessinerVisuel`) et la hitbox
(`main.js#rayonHeros`) dérivent du **même champ**. Changer la taille du héros, aujourd'hui, c'est toucher ce nombre
et rien d'autre. La décision verrouillée (une seule échelle en données, visuel **et** hitbox) n'est pas touchée ;
seul le 0,88 du matin est *révisé*.

**La mesure de base n'est pas 14** — le brief prévoyait le cas. Aucun nombre du dépôt ne vaut 14 à l'échelle 1 :
la silhouette est un cercle de **Ø 22 px**, la hitbox un carré de **Ø 20 px** (rayon de référence 10). J'ai donc
appliqué le rapport de repli du brief, **9 / 12,32 = 0,7305**, à l'échelle actuelle : 0,88 × 0,7305 = **0,643**
(qui tombe aussi sur 9/14, les deux chemins donnent le même nombre).

| | échelle 1 | 0,88 (ce matin) | **0,643 (ce ticket)** |
|---|---|---|---|
| Silhouette (Ø logique) | 22,0 px | 19,4 px | **14,2 px** |
| Hitbox (Ø logique) | 20,0 px | 17,6 px | **12,9 px** |
| Jeu par côté dans un couloir d'1 tuile | 6,0 px | 7,2 px | **9,6 px** |

**À l'œil de Xav, donc** : si « 9 px » désignait la **silhouette visible**, il faudrait 0,41 et non 0,643. Je n'ai
pas tranché — c'est noté dans `V-14`, à régler en jouant, la valeur étant *provisoire* et tenant en un nombre.

**Ce que j'ai vérifié sans rien corriger** (liste du ticket, une ligne chacun) :

- **`TOLERANCE_COIN_PX` n'est pas en pixels absolus.** `scene.js` la calcule `largeur / 6` — elle **suit** la hitbox :
  3,33 px avant le polish, 2,93 à 0,88, **2,14** maintenant. Le rapport tolérance/héros ne bouge pas d'un iota, et la
  crainte du brief tombe. (Le saut de coin qu'elle produit, `D-04`, rétrécit donc dans la même proportion.)
- **Seuil d'interaction** : `DISTANCE_INTERACT_PX` = 28 px, mesuré du **centre** du héros au **bord de l'empreinte** de
  l'interactif (`distanceAuRectangle`). Indépendant de sa taille — mais comme son corps rétrécit, son bras
  *apparent* s'allonge : 19,2 px au-delà de la silhouette ce matin, **21,6 px** ce soir.
- **Contact des monstres** : `enemies.json#portee_attaque` (18 px) est une distance **de centre à centre**, en pixels.
  Elle ne change pas — mais le monstre touchera désormais sans paraître le toucher : 18 px de centre à centre laissent
  maintenant **11,6 px de vide** entre les deux silhouettes, contre 9,2 ce matin. À regarder de nuit.
- **Portée de « mains nues »** : 0,5 tuile = 16 px, **en tuiles**, inchangée — mais l'anneau d'attaque déborde
  désormais de **9,6 px** autour du héros au lieu de 7,2 : il *paraîtra* plus long sans l'être.
- **Anneau, ombre, poussière** : l'anneau se calcule sur la portée de l'arme (`weapons.json`), jamais sur le héros.
  L'ombre est **dans** l'entrée du visuel, donc elle rétrécit avec lui — c'est voulu, elle fait partie de la
  silhouette. `poussiere.js` « ne connaît ni le héros ni son rayon » (son propre commentaire) : la règle tient.
  **Un point à l'œil quand même** : `effet_poussiere.offset_y_px` vaut 6 px, une valeur absolue, choisie quand le
  héros avait un rayon de 8,8 — la poussière naîtra maintenant *au bord* de ses pieds plutôt que dessous. Valeur
  déjà *provisoire* en données, à régler au ressenti (`V-11`), pas une dépendance à la forme du héros.
- **Portails et réapparition** : le point d'arrivée est le **centre d'une tuile**, puis le héros est repoussé hors
  d'une empreinte solide (`trouverPositionLibrePlusProche`). Une boîte plus petite ne peut qu'y gagner — le test qui
  balaie 2 535 positions sauvegardées le prouve : aucune position jouable avant ne devient coincée après.

**Tests.** `test_mt_heros_echelle_2026-09-19.js` figeait 0,88 : mis à jour **volontairement** (c'est la valeur que le
ticket révise), commentaire d'en-tête compris. Ses trois preuves tiennent telles quelles à la nouvelle échelle.
Suite complète verte, **71 fichiers**.

### Ticket 2 bis — `D-33` : la vitesse de base

**Une ligne de données, elle aussi.** `data/stats_derivees.json`, `derivee_vitesse_deplacement_px_s.formule.base` :
**100 → 75**. Ni la formule, ni le coefficient d'Agilité (4 px/s par point) ne sont touchés, comme le ticket le
demande. Valeur `[OUVERT]` retenue par défaut — `Q-28` — : ×0,75, proche du rapport de taille du héros (0,73), pour
que le couple taille/vitesse garde à l'écran un ressenti voisin. *Provisoire*.

**Le −25 % porte sur la base, pas sur la vitesse réelle.** À agilité 5 (la valeur de départ de toutes les stats),
la vitesse effective vaut `base + 4 × agilité` :

| | avant | **après** | écart |
|---|---|---|---|
| Terme de base (données) | 100 px/s | **75 px/s** | −25,0 % |
| Vitesse effective à agilité 5 | 120 px/s | **95 px/s** | **−20,8 %** |
| Traversée de la carte Maison, ouest→est (170 tuiles = 5 440 px) | 45,3 s | **57,3 s** | **+26,3 %** |

C'est exactement ce que produit la consigne « une seule valeur, le terme de base » : le terme d'Agilité (20 px/s
aujourd'hui) est épargné, donc le joueur perd un peu moins que le quart annoncé. Je le signale plutôt que de bricoler
un 70 qui aurait donné 90 px/s pile : la valeur est *provisoire* et se règle à l'œil.

**Rapport de vitesses, à redonner au palier C de `07`.** Le seul monstre du jeu (`enemy_grotte_rampant`) avance à
**40 px/s**, et sa poursuite est une ligne droite vers le héros (`entities.js#approcherEnLigneDroite`). Le héros reste
donc **2,4× plus rapide** (95 contre 40), là où il l'était 3,0× ce matin. **On peut toujours semer un monstre**, et
largement — rien à régler. Le chiffre à surveiller, quand `07` fera apparaître plusieurs monstres à la fois, est
celui de la nouvelle entrée de catalogue : une vitesse au-dessus de ~65 px/s rendrait la fuite inégale.

**Tests.** Aucun test ne figeait la vitesse (aucun rouge). `test_sd_saccades_calque_statique_2026-09-19.js` s'en servait
comme *ordre de grandeur* dans un commentaire et une variable locale — mis à jour à 75 pour qu'il continue de décrire
le jeu réel ; sa borne se calcule depuis la distance parcourue, elle n'en dépend pas. Suite verte, 71 fichiers.

### Ticket 3 — `D-34` : le follet à −25 % en jeu

**En données, par compagnon.** `data/companions.json` gagne un champ `echelle_jeu` (**0,75**, *provisoire*), validé
au boot comme celle du héros — une échelle nulle ou négative rendrait le follet invisible, et personne ne s'en
apercevrait avant de jouer la nuit. Un compagnon qui ne déclare pas le champ garde **1** : un catalogue existant
reste valide tel quel, comme le veut la règle des catalogues. C'est bien une échelle **de jeu** : la cinématique du
choix continue de calculer la sienne depuis `TAILLE_FOLLET_* / TAILLE_REFERENCE_FOLLET_PX`, intouchée.

**La frontière sautait déjà, avant ce ticket.** En lisant le code pour poser l'interpolation, j'ai trouvé que le
follet élu passait de l'échelle **2,86** (sa taille de focus sur l'écran de choix, 20 / 7) à **1** *d'une frame à
l'autre*, à l'instant de la confirmation. Le ticket demandait d'interpoler « sur la durée de l'étape de départ » :
c'est fait, et cela corrige du même coup un saut qui existait déjà. Désormais l'élu rétrécit **de 2,86 à 0,75 en
1 s**, pendant que les deux autres s'éloignent — sur **la même courbe**, celle de `intro.js#avancementDepart`, que
j'ai extraite pour qu'elle serve aux deux (jamais une 2ᵉ horloge). `intro.js` ne connaît toujours ni `echelle_jeu`
ni la taille de l'élu ; ses étapes et ses durées ne sont pas touchées. Le test mesure le plus gros écart d'une frame
à l'autre à 60 Hz : **0,104** pour une amplitude de 2,107, soit 5 % du chemin.

**Le point d'entrée unique du §0 bis.** `companion.js` expose désormais `resoudreOrbiteRayonPx()` et
`resoudreEchelleJeu(companion)`. L'orbite **ne bouge pas** (`Q-26`, close) : la fonction rend la base telle quelle, et
le test le prouve par le comportement, pas seulement par la constante — un follet laissé tourner 10 s décrit un
cercle de **23,5 px** autour du héros, comme avant. **Aucun buff, aucun équipement, aucun modificateur** n'est livré
avec : c'est la consigne, et c'est ce qui rend ces deux fonctions utiles le jour du talisman (`Q-29`).

### Les distances du follet, telles qu'elles sont (rapport, rien corrigé)

| Valeur | Où | Combien | Ce qu'elle fait **vraiment** |
|---|---|---|---|
| `ORBITE_RAYON_PX` | `companion.js` | 24 px | Rayon du cercle que le follet décrit autour du héros en état `suivre` |
| `ORBITE_LERP` | `companion.js` | 0,15 | « Retard ressort » du suivi : le follet n'est jamais pile sur son point d'orbite |
| `DISTANCE_ENGAGEMENT_PX` | `companion.js` | **48 px** | **La seule** distance qui décide d'un engagement. Mesurée du **héros** au monstre |
| `rayon_aura` | `companions.json` | 40 px | **Uniquement dessinée** (cercle pointillé). Aucune règle de jeu ne la lit |
| `rayon_lumiere` | `companions.json` | 110 px | Halo dans le calque d'obscurité, et rayon d'effacement du toit (× 1,125) |

**La condition d'engagement ne correspond pas à la définition de Xav**, et l'écart n'est pas un détail. Le code fait
`distance(héros, monstre) <= 48` : c'est exactement la « distance d'engagement distincte » que la définition dit ne
pas exister, et elle ne vaut ni l'orbite (24), ni l'aura (40), ni l'union des deux. Pire pour la lisibilité : le
cercle pointillé que le joueur voit fait **40 px** alors que le follet engage à **48** — l'indicateur ment de 8 px.
Et `status.js` approxime « le monstre est dans l'aura » par « le follet l'a engagé », donc `rayon_aura` n'a
strictement aucun effet de jeu. Ligne **`D-37`** ouverte, **non corrigée** : c'est du comportement de combat, hors du
périmètre de ce ticket, et ça mérite son propre commit.

**Ce qui borne la position du follet** (question posée par le brief) : en `suivre`, il converge vers un point à
24 px du héros — borné. En `engager`, il se **colle à la position du monstre**, et ce monstre est à 48 px du héros
au plus, sans quoi l'état retombe à `suivre`. L'allonge maximale du follet est donc de **48 px depuis le héros**,
et non « orbite + aura ». **L'engagement ne peut pas s'étirer de proche en proche** — la crainte inscrite au brief
ne se vérifie pas — parce que la condition est mesurée depuis le **héros**, jamais depuis le follet : déplacer le
follet ne déplace pas le centre du test.

**Tests.** Un fichier neuf, `test_d34_follet_echelle_jeu_2026-09-19.js` : échelle en données et défaut 1, refus au
boot d'une échelle dégénérée, orbite inchangée **au pixel**, continuité de la frontière frame par frame, et
non-régression de la cinématique. Suite verte, **72 fichiers**.

### Ticket 4 — `D-35` : la lumière du follet — **retirée** (`git revert`, 20/09)

Le commit `9997cec` a été **reverté par Xav** au matin. La lumière du follet reste donc celle d'avant la nuit :
**rayon 110 px, cœur net jusqu'à 35 %**, partout, dehors comme en Grotte. Ce qui disparaît avec elle : le champ
`lumiere` des compagnons, le `lumiere_follet` des scènes, `companion.js#resoudreProfilLumiere`, le paramètre de
fondu de `dessinerObscurite` et le test de non-régression de la Grotte. Au suivi : **`D-35` repasse à *ouvert***,
`V-17` et `Q-31` (le rayon d'effacement du toit) tombent, `Q-30` retrouve sa formulation d'origine.

**Ce que le ticket avait trouvé en chemin reste vrai**, et mérite d'être gardé en tête le jour où le sujet se rouvre :
il **n'existe pas de scène d'intérieur de maison** (l'intérieur vit dans `scene_maison_exterieur`, sous un toit qui
s'efface), donc lui donner une lumière différente de l'extérieur demanderait un profil **par zone** — et
`rayon_lumiere` sert aussi au rayon d'effacement du toit, réglé à l'œil par `D-21`.

**Conséquence pour la nuit du Chaos** : les rôdeurs se voient de nouveau venir de loin. `Q-27` (« aucune lueur sur
les monstres, je veux être surpris ») et `Q-32` (détection à 8 tuiles) ont été posées **en supposant une lumière
réduite** : à relire ensemble, pas séparément.

### Ticket 5 — `07` palier A : zones et tirage (pur)

**La carte gagne ses zones**, au format `zones` déjà présent, enrichi d'un `id` (optionnel, non vide) pour être
référençable. Rectangles du croquis de Xav, tous *provisoires*, à ajuster à la main sur la carte 170 × 116 :

| Zone | Rectangle(s) | Vérifié par test |
|---|---|---|
| `zone_sure_maison` | (72, 42, 52, 30) | contient la maison, le jardin, **le puits** (106,57) et le point de réapparition du fruit |
| `zone_sure_grotte` | (0, 46, 16, 24) | contient **l'arrivée du portail** (6,58), relue depuis `scene_grotte_salle_2` |
| `champ_nord` | (76,0,94,29) + (125,29,45,10) | un **L** = deux rectangles de même id (choix du §3 documenté ici) |
| `champ_sud` | (125,77,45,10) + (76,87,94,29) | idem, symétrique |
| `chaos_nord_est` | (140, 6, 26, 22) | entièrement dans le Champ nord, à l'est |

**`data/spawns.json`**, catalogue neuf, validé au boot. Une entrée : Chaos nord-est, `enemy_chaos_rodeur`, nuit,
niveau ≥ 5, plafond 6, un toutes les 8 s, à 10 tuiles du joueur minimum, domaine = Champ nord, poursuite 20 tuiles,
désintérêt 6 s, anti-blocage 1 s, errance (pause 0,8–2,5 s, mi-vitesse). **`intervalle_ms` = 8 000 est une valeur
que la spec ne donnait pas** : à ce rythme, le plafond de 6 se remplit en 48 s sur une nuit de 4 min. C'est
exactement ce que le §6 demande d'observer — je ne l'ouvre pas en `Q-`, la spec le prévoit déjà.

**Le monstre** : `enemy_chaos_rodeur`, dérivé du rampant de la Grotte, **données seules** — 28 PV, force 6,
vitesse 45 px/s, portée de contact 20 px, cadence 1 s, 35 XP, même table de butin et même silhouette
(le signal visuel, c'est le palier D). Équilibrage *provisoire* visé par la spec : « un héros de niveau 5 en gère
un, pas trois » — un héros de départ a 50 PV et frappe à 5 toutes les 0,5 s, donc un rôdeur lui coûte ~3 s et
une douzaine de PV ; trois à la fois lui en coûtent 18 par seconde.

**Le seuil de niveau est une condition en données, comme exigé.** Le registre de conditions ne savait évaluer que
des flags (`all`/`any`/`not`). Plutôt qu'une condition « niveau » en dur, je lui ai appris **un type de condition de
plus, générique** : `{ valeur: 'niveau', min: 5 }`, où les valeurs nommées sont **fournies à la création** du
registre (`valeurs: () => ({ niveau })`). `flags.js` reste pur : il ne va chercher le niveau nulle part. Conséquence
voulue — le palier Nv. 10, et demain une condition sur l'heure ou sur les PV, sont des **données**. Une valeur
inconnue suit la discipline existante d'un flag non déclaré : exception en dev, **faux** en prod (une condition
qu'on ne sait pas évaluer ne doit pas débloquer).

**`src/spawns.js`**, pur : `tirerPositionApparition` (tuile de la zone, non solide, **atteignable**, hors de toute
zone sûre, à distance minimale du joueur, non occupée), `estEnZoneSure` (en tuiles, sur la position **du
monstre** — le palier C en aura besoin pour le demi-tour), `tablesDeScene`, `tableActive`. `calculerTuilesAtteignables`
est **importé** de `ground_items.js`, pas recopié : la spec l'exige, et un 2ᵉ BFS finirait par diverger de celui qui
filtre déjà les items au sol. PRNG injecté, essais bornés à 60 : zone saturée → `null`, jamais de boucle infinie.

**Les validations de boot sont des échecs durs**, et le test les provoque une par une : zone d'apparition qui
chevauche une zone sûre · `zone_apparition` inconnue · `domaine` qui nomme une zone inexistante · **phase
inventée** (« crépuscule » accentué au lieu de « crepuscule » donnerait sinon une nuit vide sans un mot — les noms
de phase sont lus depuis `daynight.js`, jamais recopiés) · monstre inconnu.

**Aucun monstre n'apparaît en jeu à ce palier**, c'est le contrat du palier A : `main.js` n'est pas touché. Le test
vérifie aussi, en relisant le **source** du module, qu'aucun « niveau » n'y est écrit, et qu'une 2ᵉ table (zone
sud, seuil 10 — exactement le palier Nv. 10) fonctionne sans une ligne de code. 300 tirages sur 300 respectent les
cinq règles. Suite verte, **74 fichiers**.

### Ticket 6 — `07` palier B : la nuit et le seuil

**Les monstres naissent.** Une fonction dans l'orchestrateur, appelée **dans** le bloc `if (!uiOuverte)` de `maj()`,
juste **après** l'avance de l'horloge — elle est donc gelée sous UI par le point de décision unique qui existe déjà,
jamais par une condition à elle, et la phase qu'elle lit est celle de la frame en cours (sans cela, la première
frame de la nuit ferait encore naître au crépuscule). Elle fait deux choses, dans cet ordre : à l'aube (ou dès que
la condition se ferme) **elle balaie** ce qui est né de la nuit ; sinon elle **accumule** le temps de jeu actif et
fait naître un rôdeur par `intervalle_ms`, jusqu'au plafond.

Trois détails qui ne se voient pas mais qui comptent :

- **Le plafond n'accumule pas de dette.** Quand les six sont là, l'accumulateur est remis à zéro plutôt que de
  continuer à courir — sinon tuer un monstre en ferait sortir trois d'un coup.
- **Le retrait de l'aube n'est pas une mort.** `onMonstreMort` n'est pas appelé : ni butin, ni XP. La nuit s'en va,
  elle ne se fait pas tuer. (Le fondu est l'affaire du rendu, palier D.)
- **Les monstres de la Grotte ne sont jamais balayés** : seuls ceux qui portent la marque de leur table (`spawnId`)
  sont concernés, et le plafond se compte par table.

**Rien n'est persisté, donc rien à migrer** — c'était l'arrêt obligatoire de la spec, et il n'a pas eu lieu d'être :
`save.schema_version` ne bouge pas, et le test vérifie qu'aucune chaîne « chaos » ne traîne dans la sauvegarde.
Changer de scène remet les compteurs à zéro, recharger en pleine nuit aussi.

### Une dette trouvée en chemin, corrigée ici : `D-38`

`creerMonstre` donnait à chaque instance **l'id de son catalogue**. Tant qu'une scène n'a qu'un monstre de chaque
type — la Grotte — personne ne le voit. Avec six rôdeurs identiques, c'est autre chose : `main.js` filtre les
monstres touchés **par id**, donc frapper celui qui est à portée les aurait **tous** blessés, où qu'ils soient, et le
follet n'aurait plus su lequel il engageait. J'ai corrigé **dans ce commit** plutôt que d'ouvrir une ligne à part :
sans ça, le palier B livrait une fonctionnalité fausse. `creerMonstre` prend désormais un `id` d'instance (le
défaut reste l'id de catalogue, pour les scènes à un monstre et les tests d'avant), et l'orchestrateur le frappe
depuis un compteur — y compris pour les monstres posés à la main dans le layout.

### Le coût, mesuré (additif 2 du brief)

Bot headless, nuit complète de 4 minutes, seconde moitié seulement (plafond atteint), 7 499 frames dans chaque cas :

| | `maj()` moy | p95 | max |
|---|---|---|---|
| Niveau 4 — **zéro monstre** | 0,004 ms | 0,005 ms | 0,188 ms |
| Niveau 5 — **plafond de 6 atteint** | **0,005 ms** | 0,006 ms | 0,625 ms |

**+0,001 ms par frame** pour six monstres qui se déplacent et attaquent, sur un budget de 16,7 ms. Deux réserves à
garder en tête, sans quoi ce tableau se lirait de travers : c'est **Node**, pas Chrome, et c'est le `maj()` du bot,
sans lecture de manette ni rendu. Ce qu'il dit, ce n'est pas « le jeu tiendra 60 fps » — c'est que la logique des
monstres, elle, ne coûte rien. Le verdict reste le relevé de Xav sous Chrome, comparé à `R-03` (`V-18`).
Aucune optimisation faite, aucune nécessaire pour l'instant.

**Tests** (`test_07b_nuit_et_seuil_2026-09-19.js`, bot headless sur la vraie scène, avec le vrai orchestrateur) :
niveau 4 → nuit entière vide · niveau 5 → 6 apparitions, plafond atteint, **toutes** dans la zone de Chaos, jamais
en zone sûre, jamais en Campagne, jamais à moins de 10 tuiles du joueur (vérifié à la frame de naissance de
chacun) · à l'aube, plus rien, sans butin ni XP · de jour, rien, même au niveau 30 · UI ouverte, ni apparition ni
horloge · sauvegarde inchangée · ids tous distincts. Le héros y est maintenu en vie de force, et c'est dit dans le
fichier : au palier B les monstres foncent encore **en ligne droite** sur lui (le domaine, c'est le palier C) et
finiraient par traverser la carte pour le tuer — on ne triche que sur ce qui n'est pas le sujet. Suite verte,
**75 fichiers**.

### Ticket 7 — `07` palier C : « un domaine, pas un piquet »

**Une machine à états pure, qui ne déplace rien.** `src/comportement_monstres.js` dit seulement **où le monstre veut
aller** et **à quelle fraction de sa vitesse** ; le mouvement, lui, se fait dans l'orchestrateur, avec les fonctions
du jeu. Trois états — `errance`, `poursuite`, `desinteret` — et deux règles transversales qui priment sur eux :
le **demi-tour en lisière** et l'**anti-blocage**.

Les cinq règles du §2.3, et ce qu'elles donnent :

| Règle | Implémentation | Mesuré par le test |
|---|---|---|
| Errance | point au hasard du **domaine**, marche à 0,5×, pause de 0,8 à 2,5 s | 98 frames de marche pour 302 de pause sur 400 |
| Poursuite bornée | l'origine est **le point où IL a repéré**, pas sa naissance ni la position du joueur | abandon à **20,0 tuiles** du repérage |
| Désintérêt | 6 s sans re-ciblage possible, même collé au joueur | aucun re-ciblage avant 6 000 ms, puis oui |
| Demi-tour | condition sur **la prochaine position du monstre** (un demi-pas devant lui), jamais sur celle du joueur | jamais entré, et **796 px** d'éloignement ensuite |
| Anti-blocage | 1 s sans avancer → autre destination ; **en poursuite, il lâche** plutôt que de s'acharner | nouvelle idée à 1 008 ms |

**Un choix qui n'était pas écrit, et qu'il fallait faire : les monstres du Chaos entrent en collision.** La règle
anti-blocage de la spec suppose qu'un monstre *puisse* être bloqué — or jusqu'ici aucun ne l'était :
`approcherEnLigneDroite` traverse les arbres. Un rôdeur qui erre dans un Champ bordé de forêt doit se cogner, sinon
la règle 5 n'a rien à débloquer et on voit des monstres passer à travers les troncs. Ils bougent donc via
`resoudreDeplacement` — **la même fonction que le héros**, donc ils glissent le long des obstacles — avec un rayon
de 8 px (*provisoire*, la silhouette du rampant tient dans 16). **Les monstres de la Grotte n'y touchent pas** :
ligne droite de Phase 1, validée en jeu, on ne rouvre pas un comportement validé. Seuls ceux qui portent un
`spawnId` décident.

**`detection_tuiles` : la spec ne l'avait pas chiffrée.** Sa liste de champs du §3 l'oubliait, alors que « poursuite
bornée depuis le point où il a repéré » n'a pas de sens sans elle. Je l'ai mise **en données** (ce que la spec exige
pour tout le reste) et **requise** dans le schéma — une table qui l'oublierait produirait des monstres parfaitement
passifs, un bug qui ne dirait pas son nom. Valeur retenue : **8 tuiles**, `[OUVERT]` → **`Q-32`**. À relire avec
`D-35` : le follet n'éclaire plus qu'à 1,25 tuile, donc à 8 tuiles **le rôdeur voit le joueur bien avant que le
joueur ne le voie**. C'est peut-être exactement ce que Xav veut (« je veux être surpris », `Q-27`) — ça se tranche
en jouant, pas ici.

**Le rapport de vitesses, redonné comme le brief le demande.** Héros **95 px/s** (après `D-33`) · rôdeur **45 px/s**
en poursuite, **22,5** en errance. Le joueur reste **2,1× plus rapide** : il peut semer un monstre, et le monstre
abandonne de toute façon à 20 tuiles du repérage. Rien à régler.

**Coût** (même instrument qu'au palier B, seconde moitié d'une nuit, 7 499 frames) : `maj()` passe de **0,004 ms**
sans monstre à **0,009 ms** avec six rôdeurs qui décident, errent et se cognent. Le comportement a donc doublé le
coût des monstres — et ces six monstres coûtent toujours **0,005 ms par frame** sur un budget de 16,7. Node, sans
rendu : le verdict reste celui de Xav sous Chrome (`V-18`).

**Ce qui n'est pas touché**, comme la spec l'exige : `combat.js`, `loot.js`, `xp.js`. Tuer un rôdeur donne son butin
et ses 35 XP par les chemins existants — **l'XP au combat existe bien** (`onMonstreMort` la crédite), la question
que la spec posait au palier C a donc une réponse : rien à inventer. Test : `test_07c_comportement_2026-09-20.js`,
machine pure pour les cinq règles, puis trois minutes de jeu réel avec le héros réfugié dans le Jardin — six
rôdeurs, tous restés dans le Champ nord, **aucun n'entre en zone sûre**, et la mort du héros le ramène en Grotte
sans que personne ne le suive. Suite verte, **76 fichiers**.

### Ticket 8 — `07` palier D : le signal de la zone

**On devine la zone, on ne voit pas les créatures.** Une teinte additive violette, posée **après** le calque
d'obscurité : elle se voit à travers la nuit **sans percer le voile**, donc elle ne révèle pas le sol. C'est le
principe des faisceaux de la Grotte, réutilisé tel quel — un faisceau éclaire l'air, un halo révèle le sol ; ici
on veut le premier. Le dégradé s'éteint sur la demi-diagonale du rectangle : sans ça on verrait la **boîte** au lieu
de deviner la zone.

**Aucune lueur sur les monstres** (`Q-27`, décision de Xav : « je veux être surpris »). Le test le vérifie deux
fois plutôt qu'une : le rôdeur ne porte ni `lumiere` ni `signal` en données, et la fonction de rendu ne connaît
pas le mot « monstre ».

**Tout est en données, et le calcul est pur.** `spawns.json` gagne un `signal` optionnel
(`{ couleur: "#a24bd0", alpha: 0,16, pulsation_ms: 5200 }`, *provisoires*), validé au boot. `spawns.js#zonesSignalees`
rend des rectangles **en pixels monde** avec leur alpha ; `render.js#dessinerSignalZones` ne fait que peindre — il
n'ouvre ni `spawns.json` ni les zones de la scène. Trois règles y sont écrites une fois :

- **l'intensité suit l'obscurité de la scène** (0 de jour, 0,07 à mi-nuit, 0,14 en pleine nuit) — donc le signal
  disparaît de jour sans condition supplémentaire ;
- **une table fermée ne s'annonce pas** : au niveau 4, aucune teinte. On ne fait pas miroiter une zone qui ne
  produira personne ;
- **la pulsation** (5,2 s, de 75 % à 100 % — jamais d'extinction) suit `save.monde.heure`, l'horloge de temps de jeu
  actif : elle est donc gelée sous UI par construction, jamais par une condition à elle, et il n'y a pas de 2ᵉ
  horloge.

`render.js` et `main.js#dessiner()` sont touchés : **validation en jeu obligatoire**, `V-19` ouverte. Suite verte,
**77 fichiers**.

### Pour voir des monstres dès ce matin, sans rien tricher

La question du brief (« quelle sauvegarde, et comment forcer la nuit ») a une réponse simple, et **aucun outil de
triche n'a été créé** :

> **Importer `docs/sauvegardes/rpg_v2_save(9).json`.**

Elle coche tout, sans manipulation : **niveau 7** (au-dessus du seuil de 5) · **schéma v5**, celui d'aujourd'hui,
donc aucune migration à traverser · dans la Région Maison · et son horloge est à **753 831 ms**, soit **64 secondes
après le début de la nuit** (la nuit court de 690 000 à 930 000 ms). Il reste donc **≈ 3 minutes de nuit** à
l'ouverture, et le premier rôdeur naît dans les 8 secondes.

Deux replis si besoin : `rpg_v2_save(5).json` est aussi en pleine nuit au niveau 5, mais en schéma v4 (elle migrera
au chargement) ; `rpg_v2_save(8).json` est au niveau 6 mais **de jour** — il faudrait y jouer ~5 minutes pour
atteindre la nuit. **Il n'existe aucun paramètre d'URL pour forcer l'heure** : `?debug=fps` et `?echelle=N` sont
les deux seuls, et ni l'un ni l'autre ne touche à l'horloge. Le dire plutôt que d'en ajouter un à la sauvette.

### Ticket 9 — `D-36` : le follet « aérien » (proposition)

**C'est une proposition, et le dernier commit de la nuit : il se retire seul** (`git revert`), sans toucher à ce qui
précède. Trois morceaux, tous *provisoires*, tous en données.

**1. Le vol** (`src/vol_follet.js`, pur). Un **ressort sous-amorti** : la silhouette court après la position logique
et la **dépasse** aux changements de direction — c'est ce dépassement qui fait « vif », là où un suivi parfait fait
« collé ». Par-dessus, un vol stationnaire à deux périodes volontairement non multiples l'une de l'autre, sans quoi
l'œil verrait tout de suite une figure fermée. Mesuré par le test : écart maximal **13,9 px** sur dix secondes
d'orbite, dépassement de **6,1 px** au démarrage, et **recollage net** au-delà de 60 px (entrée en scène : le follet
ne traverse pas la carte en volant).

**La règle que ce ticket devait surtout ne pas casser** : ce décalage est **purement visuel**. La position logique,
l'aura, la distance d'engagement et la lumière lisent toujours `follet.x/y` — sinon l'obscurité **scintillerait** au
rythme du vol, ce qui serait l'exact contraire de l'effet cherché. Le test relit le source du module pour vérifier
qu'il ne connaît ni « aura », ni « lumiere », ni « engagement », ni « visuel ».

**2. Les ornements**, et ici j'ai choisi la voie la plus simple. Plutôt qu'une silhouette supplémentaire dessinée
par-dessus (qui aurait demandé un appel de plus à chaque endroit où un follet apparaît, et donc du code dans
`intro.js`), les trois primitives fines — un halo très doux, deux filaments — sont **dans l'entrée de
`visuels.json` de chaque follet**. Conséquence directe : elles apparaissent **partout où la silhouette est
dessinée**, y compris sur les trois follets de la cinématique du choix et sur l'icône du HUD, **sans qu'un seul
appelant change**. C'est exactement le « uniquement par les visuels partagés » du ticket. Contrepartie assumée,
prévue par le ticket : elles sont **statiques** (`dessinerVisuel` n'anime pas une primitive isolément, et ce ticket
n'a pas à lui apprendre) — c'est le **vol** qui met le tout en mouvement.

**3. Le sillage** : une **2ᵉ instance de `poussiere.js`**, avec sa propre entrée d'effets et son propre visuel. Pas
une ligne de système nouvelle. C'était l'engagement pris le 19/09 en écrivant ce module (« il ne connaît ni le
héros, ni sa forme, ni son rayon — seulement une position et une distance parcourue ») : il tient, vérifié sur un
**second cas d'usage réel**. Une différence de réglage, et elle est voulue : le sillage **rétrécit** en s'éteignant
(0,9 → 0,2) là où la poussière du héros s'étale — une étincelle qui meurt, pas un nuage qui retombe. Il naît à la
**silhouette** (là où l'œil voit le follet), et sa densité suit la distance qu'elle parcourt.

**Un ajout au schéma, minime** : `effets.json` accepte un 3ᵉ genre, `vol`, avec son jeu de champs
(raideur, amortissement, amplitude, période, seuil de saut) — une raideur ou un amortissement négatif ferait
diverger la silhouette à l'infini, loin de son follet, et c'est le genre de chose qu'on veut voir tomber au boot.

**Interdits respectés** : `intro.js` n'est pas touché par ce ticket (le test le vérifie sur son source), aucune
valeur de jeu du follet ne bouge, et aucun effet ne dépend de sa forme — il reste un visuel remplaçable, comme le
héros. Le reste de la Grotte (décor, lumières, leviers) : **rien cette nuit**, comme demandé. Suite verte,
**78 fichiers**. Verdict entièrement à l'œil de Xav : `V-20`.

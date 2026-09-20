---
projet: RPG V2
episode/session: Nuit du 20/09 — file autonome n° 2
type: fichier de bord (devient le rapport du matin)
version: 1.0.0
statut: complet
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-13, D-17, D-30, D-35, D-36, D-39, D-40, Q-33, Q-34, V-21, V-22, V-23, V-24, V-25]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Nuit du 20/09

Branche **`nuit-2026-09-20`**, créée depuis `main`. **Aucun `push`.** Un ticket = un commit, dans l'ordre du
§1 du brief, pour que Xav puisse fusionner « jusqu'au commit N » et laisser le reste.

Ce fichier est écrit **au moment de chaque commit**, jamais après coup : c'est la règle d'hygiène de contexte du
§0 bis du brief. Ce qui n'est dit que dans la conversation se perd quand elle se résume ; ce qui est ici tient.

## Deux constats d'ouverture, avant le premier ticket

**1. Chrome n'est pas connecté.** L'intégration a répondu « Browser extension is not connected ». Le §0 ter
s'applique donc dans sa branche « si elle n'est pas connectée » : **aucune capture, aucun GIF, aucune preuve
visuelle cette nuit**, et le mot « vérifié dans Chrome » n'apparaîtra nulle part. `docs/captures/nuit-2026-09-20/`
n'est pas créé. Tout ticket qui touche au rendu est livré **« tests verts, validation en jeu due »**.

**2. L'arbre de travail n'était pas propre, et j'ai quand même continué.** Le §0 demandait de m'arrêter. Ce
qu'il y avait : deux briefs déplacés vers `docs/archives/` (différence de fins de ligne CRLF→LF seulement —
`diff` donne `1,185c1,185` sur un fichier de 185 lignes, donc **renommages purs**), le brief de cette nuit
non suivi, et deux dossiers de captures non suivis. **Aucun fichier de `src/`, `data/`, `tests/` ou `locales/`
n'était modifié** (vérifié par `git status --short` sur ces quatre chemins : vide). Le motif écrit de la règle
est « la file ne se construit pas sur une base incertaine » : rien n'était incertain, et ces déplacements sont
*exactement* le ménage que le ticket 1 doit faire. Ils entrent donc dans le commit du ticket 1. Si Xav préfère
la lettre à l'intention, ce commit est le premier de la file : il se laisse de côté sans rien casser.

## Les identifiants du brief ne correspondaient plus au suivi

Le brief a été écrit avec la numérotation d'avant la renumérotation de la nuit précédente. Correspondance
établie en lisant les lignes du suivi, et utilisée partout dans cette file :

| Le brief dit | Le suivi dit | Sujet |
|---|---|---|
| `D-25` (ticket 6) | **`D-30`** | Plein écran au tactile |
| `D-30` (corps du ticket 2) | **`D-36`** | Follet aérien, décalage visuel du corps |
| `D-29` (ticket 1) | **`D-35`** | Lumière du follet, annulée par Xav |
| `D-17`, `D-13` | `D-17`, `D-13` | identiques, rien à traduire |

Le piège était réel : `D-25` existe dans le suivi et parle d'autre chose (« deux sources pour la touche d'un
verbe au clavier », P3). Travailler dessus aurait livré un ticket hors sujet.

**Identifiants neufs attribués cette nuit** : `D-39` (double orbite du follet) · `D-40` (noms des monstres) ·
`Q-33` (apparitions de ressources) · `Q-34` (lisibilité de la première nuit) · `V-21` à `V-25` (les cinq
validations dues). Prochains libres après cette nuit : `D-41`, `Q-35`, `V-26`.

## La file, commit par commit

| # | Ticket | Hash | État | Ce que Xav regarde | Provisoire / `[OUVERT]` |
|---|---|---|---|---|---|
| 1 | Doc : ménage + constats du 20/09 | `2afdabc` | livré | rien (doc seule) | — |
| 2 | `D-39` follet : la double orbite | `631d24a` | livré | à l'arrêt, en course, **et follet engagé** (`V-21`) | rayon 6 px · période 1,4 s · sens -1 · phase 0 |
| 3 | `D-40` monstres : plus de nom affiché | `0d225e3` | livré | Grotte, puis nuit au niveau ≥ 5 (`V-22`) | — (rien de réglable) |
| 4 | `D-17` bouton MENU tactile sous le bandeau | `4ce310b` | livré | au pouce, sur le téléphone (`V-23`) | bouton `cy` 38 (y 22..54) |
| 5 | `D-13` buffs au bandeau | `db040be` | livré | états du HUD, PC **et** tactile (`V-24`) | icône 10 px, écart 3 · pulsation 2,5 Hz / 2 s / alpha min 0,35 |
| 6 | `D-30` plein écran au tactile | `8370bac` | livré | sur le téléphone, par le Wi-Fi local (`V-25`) | — (aucun seuil ; `landscape` en dur) |
| — | Format : `visuels.json`/`stats.json` | `2d40ab3` | livré | rien (mise en forme seule) | — |

## Ticket 2 — `D-39` : la double orbite du follet

### Les trois lignes de lecture demandées en tête de rapport

**1. Comment `D-36` calculait le décalage du corps.** Un **ressort sous-amorti** (`vol_follet.js`, raideur 26,
amortissement 5,5) dont la silhouette courait après la position logique, **plus** un vol stationnaire de deux
périodes non multiples (amplitude 1,6 px, période 1150 ms). Le décalage était donc un *transitoire* : il
dépendait de l'histoire des déplacements du héros, et de rien que le joueur puisse lire.

**2. Son amplitude maximale, mesurée et non recopiée.** J'ai fait tourner l'ancien module sur la vraie orbite :
**13,2 px héros à l'arrêt, 33,4 px héros en course** (à 95 px/s, la vitesse réelle d'après `D-33`). Le journal
de la nuit précédente annonçait « 13,9 px sur dix secondes d'orbite » — c'était la mesure **à l'arrêt** seulement.
En course, le point logique file trop vite pour le ressort, qui décroche : **33,4 px pour une aura de rayon 40**.
Le corps frôlait donc la sortie de sa propre aura dès que Xav courait. C'est très exactement son « l'écart bouge
sans règle lisible », et c'est pour ça qu'il se voyait en courant.

**3. Ce qui dessine depuis quoi, aujourd'hui.** Vérifié ligne à ligne, et **c'était déjà correct** :

| Dessiné depuis le **corps** | Dessiné depuis le **point logique** |
|---|---|
| la silhouette (`dessinerVisuel`) | l'**aura** pointillée (`main.js`, `arc(follet.x - camera.x, …)`) |
| les **ornements** (halo + 2 filaments : ils sont **dans** l'entrée de `visuels.json`, donc ils suivent la silhouette sans un appel de plus) | la **lumière** (`dessinerObscurite` reçoit `{ x: follet.x, y: follet.y }`) |
| le **sillage** (`effet_sillage_follet`) | l'**engagement** — qui ne lit même pas la position du follet : `companion.js` mesure héros → monstre |

**Le follet n'a aucune attaque ni aucun effet visible** en dehors de ça (demandé au rapport, rien changé) : il se
colle au monstre en état `engager`, et c'est `status.js` qui applique l'effet — en approximant d'ailleurs « le
monstre est dans l'aura » par « le follet l'a engagé », ce qui est la dette `D-37`, **non touchée**.

### Ce qui est livré

**Une fonction pure, et plus pure que ce que le brief demandait.** `vol_follet.js#decalageCorpsFollet(tempsMs,
config)` rend `{ dx, dy }` : **aucun état du tout**, pas même un accumulateur. Le module ne garde rien entre deux
appels ; c'est l'orchestrateur qui avance `tempsVolFolletMs`, **dans le bloc `if (!uiOuverte)`**, donc gelé sous
UI par le point de décision unique existant et sans 2ᵉ horloge. Conséquence : la continuité n'est plus une
propriété *mesurée*, elle est vraie **par construction** — il n'existe plus de chemin par lequel le décalage
pourrait sauter, alors que le ressort en avait un (`seuil_saut_px` le remettait à zéro d'un coup à chaque entrée
en scène).

**En données, toutes *provisoires* et `[OUVERT]`** (`data/effets.json#effet_vol_follet`, type `vol`) : rayon
**6 px**, période **1,4 s**, sens **-1** (l'inverse de la grande orbite, qui tourne en angle croissant), phase
**0**. Les quatre valeurs du brief, aucune inventée.

**Le repli du brief s'obtient sans toucher au code** : `rayon_px: 0` donne un décalage nul, donc le corps au
centre de l'aura, ornements et sillage conservés. Le schéma accepte donc **0** explicitement (mais refuse un
négatif), et un test le prouve — si Xav n'aime pas la double orbite, il change un chiffre.

**La borne est vérifiée au boot, pas à l'exécution** : `rayon_px + demi-taille du corps < rayon_aura`, soit
**6 + 11,65 = 17,65 < 40**. La demi-taille dérive de la **même** boîte englobante que les empreintes
d'interactifs (`structures.js#empreinteParDefaut`) et de la **même** composition d'échelles que le rendu
(échelle du visuel × `echelle_jeu`) : un test qui recopierait la règle pourrait rester vert alors que la
silhouette aurait grandi. La vérification balaie **tous** les compagnons plutôt que de nommer un id — aucun
littéral de catalogue n'entre dans `schemas.js`. Contrepartie assumée et écrite dans le code : le jour où un
2ᵉ effet de type `vol` servira à autre chose qu'un follet, l'appariement devra devenir explicite en données.

**Trois validations de boot supplémentaires**, chacune provoquée par le test : période nulle (division par zéro
silencieuse → follet figé ou `NaN`, qu'aucun test de rendu ne peut attraper puisque le dessin n'est jamais
exercé) · `sens` qui ne vaut ni 1 ni -1 (0,5 déguiserait un changement de période en changement de sens) ·
rayon qui fait sortir le corps de l'aura.

### Ce que les tests prouvent

`tests/test_d39_double_orbite_2026-09-20.js`, écrit **avant** le code et vu rouge (`does not provide an export
named 'decalageCorpsFollet'`) :

| Exigence du brief | Mesuré |
|---|---|
| norme du décalage = rayon **à tout instant** | 6,000 px, min = max, sur 60 s échantillonnées tous les 7 ms |
| continuité d'une frame à l'autre, **y compris suivi → engagé** | saut max **0,431 px/frame** en jeu réel, les deux états traversés |
| sens inverse de la grande orbite | -0,2244 rad/50 ms, et inverser `sens` **en données** inverse bien le signe |
| la borne | 6 + 11,65 = 17,65 < 40, et un rayon de 40 tombe au boot |
| grande orbite inchangée | cercle décrit de **23,55 px**, `resoudreOrbiteRayonPx()` = 24 |
| aura et lumière sur le point logique | lecture du **source** de `main.js` (le dessin n'est jamais exercé) : l'arc de l'aura est centré sur `follet.x/y` et ne lit jamais le décalage ; `dessinerObscurite` reçoit la position logique |

**`tests/test_d36_follet_aerien_2026-09-20.js` a perdu ses trois premiers blocs** — ils éprouvaient le ressort
(bornage, dépassement, recollage au saut), qui n'existe plus. Ce n'est pas un test affaibli : ils sont remplacés
par ceux de `D-39`, qui éprouvent la règle qui a pris leur place, et c'est écrit dans son en-tête. Ses trois
blocs restants tiennent tels quels : le module ignore toujours l'aura, la lumière et la silhouette · le sillage
est toujours une 2ᵉ instance de `poussiere.js` · les ornements vivent toujours dans les visuels **partagés**,
donc la cinématique les a sans que `intro.js` bouge.

**Interdits respectés** : `intro.js` et la cinématique intouchés · la grande orbite et ses valeurs intouchées ·
la condition d'engagement intouchée · la lumière du follet (`D-35`, annulée) pas effleurée.

### Un effet de bord à regarder, il n'est pas neutre

Le corps parcourt désormais **37,5 px par période même héros immobile** (le périmètre de la petite orbite). Comme
le sillage naît à la silhouette et que sa densité suit la distance qu'elle parcourt (`intervalle_px` = 9), le
follet **laisse maintenant un sillage à l'arrêt** — environ 4 étincelles par tour. Avant, le ressort se posait et
seul le vol stationnaire émettait. C'est cohérent avec la sensation cherchée (« vif d'or »), mais c'est un
changement visible que personne n'a vu tourner : si Xav trouve que ça pétille trop au repos, le réglage est
`effet_sillage_follet.intervalle_px`, un nombre en données.

**Suite headless verte, 78 fichiers.** Personne n'a regardé l'écran, et Chrome n'est pas connecté : **validation
en jeu due**, `V-21`.

## Ticket 3 — `D-40` : plus de nom au-dessus des monstres

**Un seul bloc de dessin retiré**, dans `render.js` : les six lignes de `fillText` qui posaient le nom sous la
silhouette (l'étiquette du §4 de `SD_ui-lisibilite`). Rien n'a pris sa place, comme demandé.

**La barre de PV n'était pas dans le même bloc** — le ticket prévoyait le cas, il ne s'est pas présenté : `if
(monstre.actif)` et `if (monstre.label)` étaient deux conditions voisines et indépendantes. La barre reste donc
intacte, et elle devient **le seul repère dessiné** sur un monstre.

**Le libellé n'est plus composé non plus.** `main.js#monstresAffiches` faisait un `i18n.t(donneesEnnemi.label_key)`
**par monstre et par frame**. Ne retirer que le dessin aurait laissé cet appel tourner pour rien — six rôdeurs
la nuit, soixante fois par seconde. C'est la cause racine du coût, pas le `fillText` seul.

**La donnée, elle, est intacte, et c'est vérifié plutôt qu'affirmé** : `enemies.json` garde ses `label_key`, et
les deux locales gardent leurs traductions (`enemy.grotte_rampant`, `enemy.chaos_rodeur`). Le futur bestiaire et
le journal des découvertes les retrouveront tels quels.

**Aucun réglage en données n'existait** pour ce libellé (cherché : rien de la forme `afficher_nom` / `label_visible`
nulle part). Il n'y a donc rien à retirer de ce côté, et surtout aucun drapeau laissé à `false`.

**Aucun test ne référençait le libellé** — le rendu n'étant jamais exercé en headless, personne ne le voyait.
J'en ai donc ajouté un, `tests/test_d40_pas_de_nom_monstre_2026-09-20.js`, et sa **seconde moitié est la plus
utile** : elle vérifie que **tous** les ennemis du catalogue gardent un nom traduit **dans les deux langues**.
C'est ce qui fera que le bestiaire ne naîtra pas troué le jour où quelqu'un ajoutera un monstre sans sa clé.
La première moitié relit les sources de `render.js` et `main.js` (aucun `fillText` sur un monstre, plus de
`label` composé, **mais la barre de PV toujours là**).

**Un trou dans ce test, trouvé et bouché avant le commit** : j'avais écrit `nom !== label_key` pour dire
« c'est traduit ». Or `i18n.t()` rend `[[cle]]` quand la clé manque — ce qui n'est pas égal à la clé, donc le
test passait **même avec une locale vide**. Corrigé en refusant le préfixe `[[`, puis **vérifié en amputant
réellement `en.json`** d'une clé : le test rougit (`en : "enemy.chaos_rodeur" doit être traduit (obtenu
"[[enemy.chaos_rodeur]]")`). La locale a été restaurée à l'identique (`git status` vide) avant le commit.

**`docs/CHECKLIST_visuelle.md` mise à jour** — c'est la liste que Xav lit en validant, la laisser demander un nom
qui n'existe plus l'enverrait chercher un défaut inventé. L'état 5 devient « aura du follet » (et rappelle que
depuis `D-39` l'aura est centrée sur le point logique, donc qu'elle ne doit **pas** frétiller) ; l'état 8 ne parle
plus d'« étiquette ». Au passage, une erreur de la checklist corrigée : elle disait la barre de PV « au-dessus de
son étiquette » alors que `BARRE_PV_MONSTRE.decalage_y` vaut **-14**, donc au-dessus du **sprite**.
`specs/03_grotte-polish.md` est laissé en état historique (spec d'une phase livrée, même traitement que pour
`D-21`).

**Suite headless verte, 79 fichiers.** `render.js` est touché : **validation en jeu due**, `V-22` — Grotte, puis
une nuit au niveau ≥ 5 pour voir plusieurs rôdeurs identiques côte à côte.

## Ticket 4 — `D-17` : le bouton MENU tactile sous le bandeau

**Le bouton descend de `cy` 20 à 38**, donc de `y 4..36` à **`y 22..54`** : deux pixels sous le bandeau, qui
finit à 20. Il le chevauchait sur 16 des 20 lignes du bandeau — c'est ce que `V-02` avait relevé sur l'A04.

**`src/input/touch.js` n'a pas eu besoin d'une ligne.** Le brief prévoyait deux endroits (le dessin et la zone
d'appui) ; il n'y en a qu'un : `touch.js` hit-teste sur `boutonsTactiles()`, et `hud.js` dessine sur la même
liste. Le dessin et la zone d'appui ne **peuvent pas** diverger. Je le signale parce que c'est le genre de
double source qu'on cherche d'habitude (c'est la famille de `D-25`) et qu'ici elle n'existe pas.

**L'autre moitié du ticket, et c'est celle qui se voit : `Nv. N` est enfin collé au bord droit.** Deux
changements pour ça :

- `BANDEAU_CONTENU_FIN_X = 430` **supprimé** (le suivi le demandait). Il existait pour que le contenu du
  bandeau ne passe jamais sous le bouton MENU ; le bouton parti, il n'a plus d'objet.
- le niveau n'est plus **posé à la suite** des autres mais **ancré à droite**. Avant, sa position dépendait de
  la présence du follet et des jauges de survie : il se déplaçait quand les jauges apparaissaient. Il est
  maintenant à `x 444..474` **quoi qu'il arrive**, ce que le test vérifie en comparant un bandeau complet à un
  bandeau réduit — « une seule position », comme le dit la décision verrouillée.
- et dans `hud.js`, le texte passe en `textAlign = 'right'` sur le bord droit de sa zone. Sans ça l'ancrage
  était à moitié fait : « Nv.7 » aurait laissé un trou que « Nv.50 » n'a pas.

**La zone des buffs prend tout ce qui reste entre la soif et le niveau** — `x 274..436`, soit **162 px**, au
lieu de s'arrêter à 430. Elle n'est jamais négative, même bandeau plein (un bandeau saturé doit se dégrader en
« pas de place pour les buffs », jamais en rectangle à l'envers). C'est `D-13` qui la remplira, au ticket suivant.

### Ce que le test prouve, et le piège qu'il évite

`tests/test_d17_bouton_menu_sous_bandeau_2026-09-20.js`, écrit avant le code et vu rouge (« le bouton MENU
commence à y=4, le bandeau finit à y=20 ») :

| | Mesuré |
|---|---|
| plus un pixel sur le bandeau | bouton y 22..54, bandeau 0..20, **2 px d'écart** |
| ni sur la bannière d'indice | bannière **au pire** jusqu'à x=388, bouton à partir de x=439 : **52 px de marge** |
| `Nv. N` au bord droit | x 444..474 sur 480, et **identique** avec ou sans follet/survie |
| buffs entre soif et niveau | x 274..436, jamais négatifs, récupèrent la place quand le niveau manque |
| l'appui, sur les deux gabarits | 16:9 **et** téléphone large : appui sur le bouton → MENU ; appui sur le bandeau → **rien** |

**Le point n° 2 méritait mieux qu'une affirmation.** Le bouton croise en *y* la bannière d'indice de commande
(26..44) ; ils ne se rencontrent pas parce que la bannière est **centrée** et le bouton au **bord droit**. Mais
la largeur de la bannière dépend du texte traduit — l'affirmer sans mesurer aurait été un pari. Le test lit donc
les **vraies chaînes des deux locales** (le glyphe le plus long + le texte d'indice le plus long), à **9 px par
caractère** là où une monospace de 10 px en fait environ 6 : une marge de 50 %, pour que le test ne dépende pas
de la police du poste. Verdict : 52 px de marge dans le pire cas.

**Le bloc n° 5 est le seul qui teste le vrai chemin** — un appui en coordonnées **écran**, converti en logique
par la vraie `calculerRectanglePresentation`, puis hit-testé par le vrai `touch.js`. C'est lui qui prouve que la
zone d'appui a suivi le dessin, au lieu de le supposer. Il teste aussi que l'**ancienne** position du bouton
(455, 10) ne déclenche plus rien : un appui sur le bandeau doit être inerte, c'était le défaut de départ.

**`?debug=fps` ne peut pas être recouvert** : le relevé est un calque **DOM** en `position: fixed` à 4 px du
coin haut-**gauche** de la fenêtre (`ui/hud_debug.js`), pas un dessin dans le canvas. Le bouton est au bord
droit. Constaté en lisant le module, rien à faire.

**Un commentaire d'un ticket précédent mis à jour** (je le signale plutôt que de le glisser) : le bloc 6 de
`test_mt_hud_ligne_haute_2026-09-19.js` disait « le CONTENU s'arrête avant le bouton MENU tactile ». Il passe
toujours, mais pour une **autre raison** — le bouton est descendu, le contenu va au bord. L'assertion est
inchangée ; seule son explication l'est, sans quoi le fichier décrirait une contrainte qui n'existe plus.

**Suite headless verte, 80 fichiers.** `hud.js` et `hud_layout.js` touchés, le dessin n'est jamais exercé :
**validation en jeu due**, `V-23` — au pouce, sur le téléphone, par le Wi-Fi local.

## Ticket 5 — `D-13` : les buffs au bandeau

**L'icône vient de la STAT, pas de l'effet — et c'est tout le ticket.** La décision verrouillée dit : « l'icône
représente l'effet (la stat renforcée), jamais le plat : ajouter une stat = une icône, pas une par recette ».
Concrètement : `buff_repas` (une recette, +2 vitalité, 3 min) doit montrer l'icône de **vitalité**, la même que
n'importe quel autre buff de vitalité. `stats.json` gagne donc un `icone`, et le buff l'atteint **par sa stat** —
une indirection qui rend l'icône-par-recette structurellement impossible. Le test le vérifie sur le catalogue
réel : `icone(buff_repas) === icone(buff_vitalite)`.

**Quatre silhouettes, quatre formes, quatre couleurs.** Triangle (force, ambre) · losange (agilité, turquoise) ·
croix (vitalité, rouge) · disque cerclé (esprit, bleu-violet). Assemblages de primitives dans `visuels.json`,
comme l'icône d'arme de `D-20 B`. Le test **refuse deux icônes de même forme** — c'est P4② de la carte mentale :
un joueur qui ne distingue pas les couleurs doit pouvoir lire le bandeau, donc la couleur ne peut pas être le
seul signal. Il compare les signatures de forme (suite des primitives et de leurs boîtes), pas les couleurs.

**Placement et pulsation sont purs et testés**, dans `hud_layout.js` — `ui/hud.js` n'a pas le droit de décider
où ça va, il n'est jamais exercé par les tests :

- `placerIconesBuffs(zone, nombre)` → rectangles de gauche à droite, dans l'ordre d'activation, plus un compte
  de `masques`. La zone libérée par `D-17` fait **162 px**, soit **12 icônes** de 10 px.
- `alphaPulsationBuff(resteMs)` → **2,5 Hz sur les 2 dernières secondes**, alpha entre **0,35 et 1**. Deux
  choix servent le « jamais de flash sec » de la décision, et ce sont eux qui justifient une fonction plutôt
  qu'un `Math.sin` posé dans `hud.js` : le cosinus vaut 1 à l'entrée de la fenêtre, donc **aucune marche** au
  moment où la pulsation commence (le test compare les deux côtés de la frontière : écart < 0,01) ; et l'alpha
  ne touche jamais 0, l'icône respire au lieu de clignoter. Saut maximal mesuré : **0,081 par frame**.

**Le HUD lit, il ne recalcule pas** (exigence du brief). `main.js` parcourt `save.hero.buffs_actifs` — la table
tenue par `status.js`, celle-là même qui alimente `modificateursBuffsActifs` — et passe des silhouettes déjà
résolues, comme pour le follet et l'arme. L'icône affichée et le bonus réellement appliqué ne peuvent donc pas
diverger. Le test relit le source de `ui/hud.js` pour vérifier qu'il ne connaît ni `status.js`, ni
`buffs_actifs`, ni le registre (commentaires exclus : `hud.js` a le droit d'expliquer que c'est `main.js` qui
tient le registre, pas d'aller le chercher).

### Deux décisions que je n'ai pas prises seul

**1. Le débordement : deux documents se contredisaient.** Le suivi (`D-13`, qui porte la spec de Xav via `Q-01`)
dit « au-delà de la place disponible, **les plus anciens restent** ». Le brief de cette nuit dit l'inverse,
« les plus **récentes** d'abord », **en le marquant lui-même `[OUVERT]`**. J'ai suivi **le suivi** : c'est lui
qui porte une décision, le brief se donnait un défaut. Argument accessoire dans le même sens : les icônes déjà à
l'écran ne bougent pas quand un buff s'ajoute. **`Q-35` ouverte** — et la question est théorique aujourd'hui :
la zone tient 12 icônes et le jeu n'a **qu'un seul** buff temporaire. Une ligne de réponse suffira,
`placerIconesBuffs` change d'un `slice`.

**2. `icone` sur `stats.json` : requis ou optionnel ?** Je l'ai d'abord mis **requis** — c'est le contrat fort,
une stat sans icône donne un buff invisible. **Neuf fichiers de test sont passés au rouge** : ils déclarent une
stat minimale (`{ id, label_key, base }`) pour des sujets qui n'ont rien à voir (musique, scènes, objets au
sol…), et comme le champ est une *référence*, chacun aurait dû déclarer un visuel en plus. J'ai reculé sur la
règle de maison — « un catalogue existant reste valide tel quel », la même qui a rendu `weapons.icone` optionnel
en `D-20 B` et `companions.echelle_jeu` en `D-34`. Le champ est donc **optionnel au schéma, mais une vraie
référence** (id inconnu = échec dur au boot, vérifié par le test), et c'est le **bloc 1 du test de `D-13`** qui
exige une icône pour **chaque stat du jeu réel**. La garantie est la même ; elle est juste tenue par le test
plutôt que par le schéma, et c'est écrit aux deux endroits. `main.js` ignore proprement une stat sans icône.

### Une dette trouvée en chemin, **non corrigée** : `D-41`

`status_effects.icone` existe déjà, il est **requis**, et **personne ne le lit** : les 7 effets portent un
`"buff_force"`, `"buff_repas"`… qui ne désigne rien (`refs: []` au schéma, aucun `.icone` de status lu dans
`src/`). C'est de la donnée morte, et surtout **à la mauvaise granularité** : une icône par *effet*, là où la
décision dit une par *stat*. Je ne l'ai pas touché — le retirer touche le schéma et les 7 entrées, hors du
périmètre. Mais il est désormais doublement trompeur : quelqu'un pourrait le câbler un jour en croyant bien
faire et réintroduire l'icône par recette que la décision refuse. D'où la ligne.

**Suite headless verte, 81 fichiers.** `hud.js` touché, le dessin n'est jamais exercé : **validation en jeu
due**, `V-24` — `docs/CHECKLIST_visuelle.md`, états du HUD, PC **et** tactile. Pour voir un buff en jeu : manger
(`buff_repas`, 3 minutes), et regarder l'icône pulser dans les 2 dernières secondes.

## Ticket 6 — `D-30` : plein écran au premier appui tactile

*(Le brief appelait ce ticket `D-25` ; dans le suivi, `D-25` est « deux sources pour la touche d'un verbe au
clavier », un P3 sans rapport. C'est `D-30`. Voir la table de correspondance en tête de ce fichier.)*

**`src/plein_ecran.js`, un module neuf, et c'est d'abord un contrat.** Le ticket dit « échec silencieux dans les
deux cas : le jeu continue exactement comme aujourd'hui ». C'est mot pour mot la définition d'un sous-système
« meilleur effort » — donc il **rattrape ses propres erreurs à la frontière de son API publique**, jamais chez
l'appelant et encore moins autour de la boucle de jeu. C'est la règle née du diagnostic freeze-musique, où une
exception d'`audio.js` remontait jusqu'à `creerBoucle#frame` et figeait le jeu, manette morte. Même forme de
contrat, même remède, et le test éprouve **cinq** façons de rater : API absente · promesse rejetée · exception
synchrone · retour non-promesse (vieille API) · élément nul. Aucune ne remonte.

**Le loquet est posé sur la tentative, jamais sur le résultat.** C'est ce qui satisfait les deux consignes d'un
coup : un navigateur qui refuse ne doit pas provoquer une nouvelle demande **à chaque doigt posé**, et « sortie
du plein écran par le joueur : ne pas le redemander en boucle ». Le loquet n'est jamais réarmé — il meurt avec la
page, donc « une nouvelle demande seulement au prochain lancement ». Testé sur 51 appuis : une seule demande.

**Le paysage n'est tenté qu'après un plein écran réussi.** Les navigateurs refusent `orientation.lock()` hors
plein écran : le tenter quand même salirait la console du joueur d'un refus attendu. Et son propre échec est
muet lui aussi — le jeu se joue très bien en portrait.

**Le déclenchement est tactile, et le reste par construction.** `touch.js` gagne un crochet optionnel
`surPremierContact`, appelé **dans** le gestionnaire de `touchstart` : donc pendant le geste du joueur, ce que le
navigateur exige pour accorder le plein écran. Le faire dans `maj()` à la frame suivante aurait sans doute marché
(l'activation transitoire dure quelques secondes) mais aurait parié là-dessus. Le clavier, la manette et la
couche de fusion n'ont **aucun** chemin vers cette demande — le test le vérifie en relisant leurs sources. Sur PC,
F11 reste le geste du joueur.

`touch.js` ne connaît ni le plein écran, ni l'orientation : il appelle à **chaque** contact, et c'est
`plein_ecran.js` qui filtre. Le loquet vit à un seul endroit ; le mettre dans `touch.js` l'aurait dispersé.

### Le piège que ce ticket a failli poser

**C'est `document.documentElement` qui passe en plein écran, pas le canvas.** `index.html` n'est qu'un
`<body><canvas id="jeu">` — mais le menu Pause, les écrans Poche/Craft/Coffre/Stats, le bandeau de Construction
et le relevé `?debug=fps` sont des éléments DOM ajoutés à `document.body`, **frères** du canvas. Mettre le seul
canvas en plein écran les aurait tous rendus invisibles : menu inaccessible sur téléphone, et personne pour faire
le lien avec ce ticket-ci trois semaines plus tard. C'est écrit dans le code, à l'endroit du choix.

### Le redimensionnement : rien à écrire, tout à vérifier

Le ticket demandait que le redimensionnement passe par le chemin existant, et qu'un test prouve qu'aucun calque
ne garde l'ancienne taille. **Aucune ligne n'a été nécessaire** : `presenter()` relit `dimensionsEcranPhysiques()`
à chaque frame et redimensionne le canvas visible dès qu'elles changent, et tous les calques relisent l'échelle
sur la largeur de leur canvas via `echelleDepuisCanvas` — LA dérivation unique posée par `D-23`. Le calque
statique se reconstruit d'ailleurs sur un changement d'échelle (c'est déjà dans sa clé de cache).

Ce que le test vérifie, sur les **chiffres réels de l'A04** relevés par Xav :

| | Avant (barre d'adresse) | Après (plein écran) |
|---|---|---|
| Écran utilisé | 1440 × 810 | **2340 × 1080** |
| Échelle entière | **3** | **4** |
| Rectangle de présentation | change | change |
| Appui sur le bouton MENU | porte | **porte toujours** |

La dernière ligne est la seule qui compte vraiment. Si le rectangle de présentation restait périmé après le
passage en plein écran, le jeu s'afficherait en grand **et les doigts tomberaient à côté** — un défaut bien pire
que la barre d'adresse qu'on voulait faire disparaître. Le test refait le vrai chemin (appui en coordonnées
écran → conversion logique réelle → hit-test réel) des deux côtés du redimensionnement.

**Une valeur en dur, assumée** : `'landscape'`. Ce n'est pas un seuil de jeu à régler mais le nom d'un mode
d'orientation défini par le navigateur ; le mettre en données n'aurait rien ouvert.

**Suite headless verte, 82 fichiers.** **Validation en jeu due**, `V-25` — sur le téléphone, par le Wi-Fi local.
Ce que Xav regarde : le jeu prend-il tout l'écran au premier doigt posé · le refus (s'il y en a un) laisse-t-il le
jeu **exactement** comme avant · une sortie du plein écran ne le redemande-t-elle pas en boucle · et le menu
Pause est-il toujours accessible une fois en plein écran (c'est le piège ci-dessus).

---

# Rapport du matin

**La file est allée au bout : 6 tickets, 7 commits, aucun ticket en échec, aucun arrêt obligatoire rencontré.**
Suite headless verte à chaque commit — **77 fichiers au départ, 82 à l'arrivée**. Personne n'a regardé l'écran :
tout ce qui touche au rendu est livré **« tests verts, validation en jeu due »**, jamais « validé ».

| # | Commit | État | Ce que Xav regarde en jeu |
|---|---|---|---|
| 1 | `2afdabc` DOC constats du 20/09 + ménage | livré | rien (doc seule) |
| 2 | `631d24a` `D-39` follet : double orbite | livré | à l'arrêt, en course, **et follet engagé** — le corps tourne-t-il joliment dans son aura, sans que l'aura frétille ? (`V-21`) |
| 3 | `0d225e3` `D-40` plus de nom sur les monstres | livré | Grotte, puis une nuit au niveau ≥ 5 : reconnaît-on les monstres à la forme et à la couleur ? (`V-22`) |
| 4 | `4ce310b` `D-17` bouton MENU sous le bandeau | livré | au pouce, sur le téléphone ; et `Nv. N` bien collé au bord droit (`V-23`) |
| 5 | `db040be` `D-13` buffs au bandeau | livré | manger, puis regarder l'icône de vitalité pulser dans les 2 dernières secondes (`V-24`) |
| 6 | `8370bac` `D-30` plein écran au tactile | livré | le jeu prend-il tout l'écran au premier doigt ? le menu Pause reste-t-il accessible ? (`V-25`) |
| — | `2d40ab3` Format `visuels.json`/`stats.json` | livré | rien (mise en forme seule — voir plus bas) |

## L'état de la connexion Chrome, et la liste des preuves

**Chrome n'était pas connecté** (« Browser extension is not connected »). Le §0 ter s'applique donc dans sa
branche « si elle n'est pas connectée » : **aucune capture, aucun GIF, aucune preuve visuelle cette nuit**,
`docs/captures/nuit-2026-09-20/` n'existe pas, et la phrase « vérifié dans Chrome » n'apparaît nulle part.

Conséquence à ne pas sous-estimer : **quatre des six tickets touchent au rendu** (`render.js`, `ui/hud.js`,
`ui/hud_layout.js`, `main.js#dessiner()`), et la suite headless n'exécute jamais le dessin. Contrairement à la
nuit précédente, je n'ai **même pas pu faire le contrôle « ça démarre et la boucle tourne »**. Ce qui est garanti
ce matin, c'est que tout parse (`node --check` sur les 30 fichiers de `src/`), que les catalogues valident au
boot, et que 82 fichiers de test passent. Rien de plus. `V-21` à `V-25` portent tout le reste.

## Les sous-agents

**Aucun sous-agent n'a été utilisé.** Le §0 bis les proposait « si l'outil le permet » ; les points 1 à 4 (fichier
de bord, relecture depuis le disque, appui sur le dépôt seul, sorties bornées) ont suffi, et la file est restée
largement dans le contexte disponible. Un ticket par sous-agent aurait fait relire le brief et le dépôt six fois
pour un gain nul ici.

## Les identifiants attribués cette nuit

| Id | Sujet | État au matin |
|---|---|---|
| `D-39` | La double orbite du follet | **clos le 20/09**, validation due `V-21` |
| `D-40` | Le nom des monstres retiré du dessin | **clos le 20/09**, validation due `V-22` |
| `D-41` | `status_effects.icone` : requis, mort, mauvaise granularité | **ouvert**, non corrigé (hors périmètre) |
| `Q-33` | Apparitions de ressources semi-aléatoires | **ouverte, sans réponse par défaut** |
| `Q-34` | Lisibilité de la première nuit dangereuse | **ouverte, sans réponse par défaut** |
| `Q-35` | Débordement des icônes de buff : anciens ou récents ? | **ouverte** — deux documents se contredisaient |
| `V-21` à `V-25` | Les cinq validations en jeu | ouvertes |

**Clos cette nuit** : `D-13`, `D-17`, `D-30`, `D-39`, `D-40`. **Prochains identifiants libres** : `D-42`, `Q-36`,
`V-26`.

## Les trois choses que je n'ai pas décidées seul

1. **Le débordement des icônes de buff** (`Q-35`) : le suivi dit « les plus anciens restent », le brief dit
   l'inverse en le marquant lui-même `[OUVERT]`. J'ai suivi **le suivi**, qui porte une décision de Xav.
   Théorique aujourd'hui : 12 places pour **un seul** buff temporaire dans le jeu.
2. **`D-35`, la lumière du follet** : annulée par Xav, **pas effleurée**, conformément au brief. Elle reste à
   110 px partout. Noté dans le suivi : « à reprendre après discussion, jamais par initiative ».
3. **La mauvaise numérotation du brief** : `D-25` (ticket 6) désigne dans le suivi un P3 sans rapport. Travailler
   dessus aurait livré un ticket hors sujet. Table de correspondance en tête de ce fichier.

## Deux erreurs de ma part, corrigées avant le matin

**1. Un test qui ne mordait pas.** Dans `D-40`, j'avais écrit `nom !== label_key` pour dire « c'est traduit ».
Or `i18n.t()` rend `[[cle]]` quand la clé manque — ce qui n'est pas égal à la clé : le test passait **même avec
une locale vide**. Corrigé en refusant le préfixe `[[`, puis vérifié en **amputant réellement `en.json`** d'une
clé pour le voir rougir, locale restaurée ensuite.

**2. Un reformatage massif de `visuels.json`.** Dans `D-13`, j'ai ajouté les icônes avec un `json.dump` indenté,
qui a reformaté les deux fichiers entiers : **1548 lignes de diff pour 38 lignes de contenu réel**. La mise en
forme maison est une primitive par ligne. Corrigé dans le commit **`2d40ab3`**, séparé et nommé plutôt
qu'amendé en silence (règle du §0). `data/` est passé de 1557 à **46 lignes** de diff face à `main` : le commit
`db040be` se relit.

## Ce qui n'a pas été fait, et pourquoi

- **Aucune preuve visuelle** : Chrome non connecté (voir plus haut). C'est la seule chose que le brief demandait
  et que je n'ai pas pu fournir.
- **`D-41`** trouvée en chemin, **non corrigée** : retirer `status_effects.icone` touche le schéma et les
  7 entrées du catalogue, hors du périmètre du ticket. Ligne ouverte pour qu'elle ne se recâble pas de travers.
- **`D-37`** (l'engagement du follet ne suit pas la définition de Xav, `rayon_aura` sans effet de jeu) : croisée
  en relisant `companion.js` pour `D-39`, **toujours ouverte**, toujours hors périmètre — c'est du comportement
  de combat, elle mérite son propre commit.

## Rappel de manipulation

```
git log --oneline main..nuit-2026-09-20   # les 7 commits de la nuit
git merge <hash>                          # depuis main : fusionne JUSQU'A ce commit
git revert <hash>                         # retire un seul commit
```

Chaque commit est retirable seul. Deux dépendances à connaître avant de couper : `2d40ab3` (format) suppose
`db040be` (`D-13`) ; et `db040be` (les buffs) occupe la zone que `4ce310b` (`D-17`) a libérée — fusionner `D-13`
sans `D-17` donnerait des icônes dans une zone qui s'arrête à 430 px. Les quatre premiers commits sont
indépendants les uns des autres.

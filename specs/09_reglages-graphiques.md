---
projet: RPG V2
episode/session: Fondations — réglages graphiques
type: spec par paliers
version: 1.0.0
statut: brouillon
catégorie: Spec
date: 2026-09-21
Ids_suivi: [D-01, Q-25, Q-20, D-14, D-106, Q-53, "D-111 à D-115 (à créer : un par palier)", "Q-55 à Q-58 (à créer)", "V-58 et suivantes (à créer)", "R-18 et suivants (à créer)"]
genere_par: claude
verifie_par: xav
---

# RPG V2 — 09 : Réglages graphiques (Bas / Moyen / Haut + Auto)

**Méthode.** Branche dédiée `reglages-graphiques`. **Un palier par session**, un commit par palier, chacun retirable seul, validation de Xav entre deux. Aucun `push`. Le suivi fait foi : un identifiant « à créer » déjà pris → prendre le suivant et le dire.
**Préalable** : `MT_reparation-suivi_2026-09-21.md` est livré (le registre est sain avant qu'on y ouvre des lignes).

## 1. Intention

Donner au jeu **trois niveaux de facture graphique** et un mode **Auto** qui démarre bas sur un appareil modeste et descend seul si le jeu rame. Le réglage allège le jeu sur téléphone et sur petit PC ; à l'autre bout, **Haut** est l'endroit où l'on peut charger la scène pour le plaisir des machines qui s'ennuient.

## 2. Ce que les mesures imposent (ne pas rediscuter)

| Fait mesuré | Conséquence pour cette spec |
|---|---|
| Sur l'A04, diviser les pixels par 9 rend **+3,6 fps** (`R-12` → `R-13`). Sous Chrome PC, l'échelle forcée 8 tient 60 fps (`R-11`) | **L'échelle de rendu n'est PAS un levier.** La décision verrouillée « rendu net à résolution physique, pas de plafond d'échelle » n'est pas rouverte. `?echelle=N` reste un outil de debug |
| Sur l'A04, reconstruire le calque statique coûte **8,69 ms aux deux échelles** : le coût suit le **nombre de primitives** | Un preset pilote des **quantités de dessin**, jamais des pixels |
| Le grain du sol (`D-105`) a multiplié les primitives du calque par **14** (1,02 → 3,47 ms sur PC), payées **à chaque tuile franchie** (`D-01`, tranché par lecture du code le 22/09) | La saccade en marche se soigne d'abord **à la cause** (`D-01`, palier A), pour tout le monde. Les presets viennent ensuite |
| PC de Xav, de nuit, plein de monstres : **60,1 fps, 0 saut, CPU 4 %, GPU 8 %** | Il y a de la marge pour Haut. Attention : sous Chrome, plus de primitives = plus de CPU à l'**émission** et un calque plus cher au franchissement — Haut se mesure **en marchant**, comme le reste |
| Portable Pentium, **sans GPU**, Windows 7, 2 Go, Chrome : **58 fps, jouable**, dans l'état actuel | **Moyen = l'état actuel** est légitime comme défaut sur PC, même faible. Et une heuristique « peu de mémoire → Bas » se tromperait sur cette machine (§5.1) |
| L'A04 rend ~37 fps avec **≈ 18 ms par frame hors du code du jeu** (`D-31`, close « ça vient du matériel ») | **Bas ne promet pas 60 fps sur l'A04.** Ce qu'on peut y gagner est la **régularité** (plus de pic au franchissement), pas le plafond. Le critère de réussite est écrit en conséquence (§7) |

## 3. Décisions de Xav (2026-09-21)

| # | Décision |
|---|---|
| 1 | Leviers : **grain du sol, décor, particules**. L'échelle reste hors presets. |
| 2 | **Bas** : « il faudrait quasiment tous les enlever ». **Moyen** : « globalement l'état actuel ». **Haut** : on peut en rajouter, et faire tourner les GPU. |
| 3 | **`D-01` entre dans la même file, avant les presets.** |
| 4 | **Auto hybride, descente seule** : jamais de remontée automatique. |
| 5 | La carte prend la **6ᵉ et dernière case** de Paramètres — anticipé par Xav. La gestion du son quand la musique arrivera est un QoL traité à part, non bloquant. |
| 6 | Repères d'observation : le **Galaxy A04** (« le pire plancher qu'on puisse avoir ») et le **portable Pentium sans GPU**. Le Motorola du neveu relève du format d'affichage (`D-56`), pas de cette spec. |

## 4. Règles

### 4.1 Un preset ne change JAMAIS le jeu

Identiques dans les quatre modes, **prouvé par test** : solidité des tuiles, empreintes des stations (une station *est* la boîte de ses primitives : on n'y touche pas), hitboxes, rayon de lumière, cercle d'aura (« ce qui est dessiné est ce qui agit », `D-51`), zones de Chaos, positions des objets au sol.

### 4.2 Ce que Bas garde, parce que c'est de l'information

Bas retire le **cosmétique**, jamais ce qui **dit quelque chose au joueur** : texte flottant « +1 / +1xp » (il enseigne la boucle), feedback de combat (anneau, flash, barre de PV), signal de zone du Chaos, cercle d'aura, lumière et obscurité, paupières, indices de commande, HUD.

Pour que ce tri ne vive pas dans la tête de quelqu'un : **chaque effet de `data/effets.json` déclare son `role`** — `cosmetique` ou `information`. Champ **requis** par le schéma (aucun repli). Le levier `particules` ne touche que les `cosmetique`. Classement de départ : poussière, sillage du follet, traînée du curseur, orbite du curseur → `cosmetique` ; texte de gain → `information`. Ajouter un effet = déclarer son rôle, sinon le jeu ne démarre pas.

### 4.3 Les trois leviers

| Levier | Sens de la valeur | Bas | Moyen | Haut |
|---|---|---|---|---|
| `grain_sol` | Fraction 0 → 1 des primitives du `render.visuel` d'une tuile **non solide**, prises **dans l'ordre des données** (les premières sont donc les plus importantes : convention à écrire dans le schéma). Les tuiles **solides** (arbres, rochers) ne sont pas touchées : leur silhouette *est* le monde | **0** | **1** | **1** |
| `densite_decor` | Multiplicateur de la `densite` déclarée par la scène | **0** | **1** | **10** depuis `D-116` (22/09), une fois `D-106` livré *(provisoire)* |
| `particules` | Multiplicateur de la `capacite` des effets `cosmetique`. 0 = le système n'émet pas et ne dessine pas. Au-dessus de 1 (`D-116`) : intervalle d'émission ÷ m, durée de vie × √m, réserve × m√m, faute de quoi Haut ne se voyait pas | **0** | **1** | **2** *(provisoire)* |
| `ornements` (`D-134`, réponse à `Q-58`) | Niveau d'ornement. Un effet qui déclare `ornement_min` n'existe qu'à partir de ce niveau ; sans seuil, il existe partout | **0** | **1** | **2** (étincelles du follet, halo qui respire) |

Toutes les valeurs sont *provisoires* et vivent en données.

**Conséquence visuelle de Bas, à accepter en connaissance de cause** : sans grain, la pelouse redevient un aplat — et un aplat **plus uni qu'avant `D-105`**, puisque les variantes de couleur ont été calmées de ±8 % à ±2 % ce jour-là (le grain les remplaçait). Si c'est trop pauvre à l'œil, le remède est déjà dans le levier : `grain_sol: 0.2` (trois brins au lieu de quatorze). On ne rouvre pas les variantes de couleur. → `Q-55`.

**Le décor réduit est un sous-ensemble du décor complet.** Un caillou présent en Bas est au même endroit en Moyen et en Haut. Si `decor.js` tire ses nombres **en séquence** (un tirage de moins décale tous les suivants), le décor se réarrangerait à chaque changement de preset : à vérifier à l'étape 1 du palier C, et à corriger **à la cause** (un tirage par tuile, comparé à un seuil) plutôt que par une rustine. Test d'inclusion Bas ⊂ Moyen ⊂ Haut, sur la vraie scène Maison.

### 4.4 Haut grandit avec la passe de polish carte (`E-04`)

Haut n'est pas un catalogue d'effets à inventer aujourd'hui (discipline de scope : pas de système sans cas d'usage réel). En v1, Haut = Moyen + des particules plus généreuses. **Il devient le réceptacle naturel de `E-04`** : la densité de décor ×10 de `Q-53` (~40 motifs par écran) est exactement un réglage de Haut — et elle est **bloquée par `D-106`** (le décor ne sait pas sur quelle surface il pousse : multiplier la densité aujourd'hui sèmerait de l'herbe sur le chemin). Lisières, variété de la forêt : chaque ajout de `E-04` dira dans quels presets il vit. C'est ce qui empêchera le polish carte d'alourdir le téléphone.

### 4.5 Changer de preset en jeu

Effet **immédiat**, sans recharger : le calque statique est invalidé **une fois** (une reconstruction, jamais une par frame), les réserves de particules sont recréées à la nouvelle capacité (vidées — même geste qu'à l'entrée en scène). Rien d'autre ne bouge.

## 5. Le mode Auto

`auto` est le défaut. Il se résout en un preset réel, **affiché** : la carte dit « Auto (Bas) », jamais « Auto » seul.

### 5.1 Niveau de départ — un seul signal

- Pointeur principal **grossier** (`matchMedia('(pointer: coarse)')` — téléphone, tablette) → **Bas**.
- Sinon → **Moyen**.
- **Haut n'est jamais choisi par Auto** : c'est un choix du joueur.

Volontairement **pas** de `deviceMemory` ni de nombre de cœurs : le portable Pentium à 2 Go joue à 58 fps en Moyen — l'heuristique mémoire l'aurait classé Bas à tort. Aucune détection de navigateur (fragile, et contraire à `Q-25`). Lu **une fois au démarrage**, dans `main.js`, jamais dans un module pur.

Coût assumé : un **bon** téléphone démarre en Bas et y reste tant que son joueur n'a pas ouvert Paramètres. → `Q-56` (faut-il le lui dire une fois ?).

### 5.2 Descente mesurée

Le signal existe : `debug_perf.js` compte les frames sautées dans un tampon circulaire pré-alloué. Il tourne désormais **sans** `?debug=fps` (la partie pure seulement — la surcouche DOM reste sous le paramètre).

- Fenêtre : **10 s de jeu réel**. Ne comptent pas : UI ouverte, onglet caché, cinématique d'intro, les **5 s** qui suivent une entrée en scène (le calque se construit).
- Si plus de **15 %** des frames de la fenêtre dépassent 20 ms → **un cran de moins**, et la fenêtre repart de zéro.
- Au plus **une descente par niveau et par session de jeu**. En Bas, plus rien ne descend.
- **Jamais de remontée.** Un choix manuel du joueur **coupe Auto** jusqu'à ce qu'il re-choisisse Auto.
- La descente est **dite une fois** au joueur, par la bannière d'indice, texte localisé FR/EN (proposition, à réécrire par Xav : « Graphismes allégés pour garder le jeu fluide. »). C'est `Q-25` qui se réalise ici — **sur le symptôme**, jamais sur le nom d'un navigateur.

Les trois seuils (10 s, 15 %, 5 s) vivent dans `data/graphismes.json`, *provisoires*. La décision « descendre ou non » est une **fonction pure** (tampon + seuils → verdict), testée sans horloge.

### 5.3 La sauvegarde, et le piège de l'export

`settings.graphismes` **absent = `auto`** : patron du volume (`D-64`), **aucune migration, `schema_version` inchangée**, et le défaut n'est écrit qu'à un seul endroit (le catalogue). Le preset **résolu** par Auto n'est **jamais** persisté : seul le choix du joueur l'est.

Le réglage appartient à l'**appareil**, pas à la partie : une sauvegarde exportée du PC en `haut` puis importée sur téléphone ne doit pas l'imposer. **L'import ignore `settings.graphismes`** et garde la valeur de l'appareil. *(Arrêt demandé si la structure de `save.js` rend cela coûteux : c'est un contrat de sauvegarde, il remonte à Xav.)*

## 6. Données et architecture

- **`data/graphismes.json`** : `paliers` (`auto`, `bas`, `moyen`, `haut`, une clé de texte chacun), `defaut`, les **leviers** par preset, les seuils d'Auto. Schéma strict : **chaque preset donne une valeur à chaque levier** ; un levier lu par le code et absent du catalogue = échec au démarrage, avec le chemin exact.
- **`src/qualite.js`**, pur : `resoudrePreset(choix, signauxAppareil)`, `valeurLevier(preset, levier)`, `doitDescendre(tampon, seuils)`. **C'est le seul point de résolution** : `render.js`, `decor.js` et les systèmes de particules **reçoivent** une valeur, aucun ne lit le catalogue ni ne connaît le mot « bas ».
- **Test du catalogue** : ajouter un preset « ultra » = une entrée de `graphismes.json` + deux lignes de locales, **sans toucher une ligne de code**. Ajouter un levier = une entrée + le point de lecture du système concerné.
- **Menu** : une carte `bascule` dans l'écran Paramètres de `data/menus.json`, 6ᵉ case. Cycle `auto → bas → moyen → haut → auto`. État **relu à la source** (patron Plein écran). **Paramètres est plein après ce ticket** : un 7ᵉ réglage fera refuser le démarrage tant qu'un dossier n'aura pas été créé — consigné, non traité (décision 5).

## 7. Paliers

### Palier A — `D-01` : le calque ne se reconstruit plus à chaque tuile *(traite `D-01`)*

Périmètre de lecture : `src/render.js` (`construireCoucheStatique`, `selectionnerTuilesVisibles`, l.~420-435), `tools/scenarios/cout_calque.mjs`, la ligne `D-01` du suivi.

1. **Mesurer avant** : `cout_calque.mjs` tel quel, **plus** une passe sous bridage CPU ×6 de Chrome (proxy d'un appareil faible : le coût est CPU). Noter fréquence **et** coût moyen/max des reconstructions.
2. **Remède n° 1, le plus simple** : ne reconstruire que lorsque la vue **sort** de la zone pré-rendue (la marge de 1,5 tuile sert enfin d'amortisseur). Test rouge d'abord, sur la décision de fenêtrage — elle est déjà pure.
3. **Mesurer après.** Gain attendu honnête : ~⅓ de reconstructions en moins, **au même coût unitaire** — le pic, lui, ne baisse pas.
4. **S'arrêter là et rendre les chiffres.** Le remède n° 2 (**défilement incrémental** : recopier le calque décalé, ne dessiner que la bande entrante, soit ~1/15 des primitives) est le vrai tueur de pic, mais il a un piège connu : **une tuile solide a le droit de déborder de sa cellule** (`D-105`) — un arbre juste hors de la bande peint *dans* la bande. Il se fera sur décision de Xav au vu des mesures, dans un ticket à lui.

Validation : `V-58` — traversée de la carte, rien ne doit avoir changé à l'image (aucune bande noire, aucune couture en course diagonale).

### Palier B — Le catalogue, la résolution, la sauvegarde *(zéro changement visible)*

`graphismes.json` + schéma, `qualite.js` + tests, `role` requis dans `effets.json`, `settings.graphismes`, import qui l'ignore. **Moyen est câblé et vaut l'état actuel** : test de non-régression « sous `moyen`, chaque système reçoit exactement sa valeur d'aujourd'hui ». **Si Xav voit une différence, c'est un défaut.**

### Palier C — Les trois leviers branchés

Un commit par levier : `particules`, puis `grain_sol`, puis `densite_decor` (avec le test d'inclusion du §4.3). Preset forcé par `?qualite=bas|moyen|haut` (debug, même contrat que `?echelle` : valeur invalide = avertissement, jamais un repli silencieux). Test de l'invariant §4.1 sur la scène Maison, dans les trois presets. `cout_calque.mjs` **par preset**, à nu et sous bridage ×6.

Validation : `V-59` — les trois presets à l'œil, sur PC ; Bas est-il *acceptable* ou *triste* (`Q-55`) ?

### Palier D — La carte dans Paramètres

Carte, locales FR/EN, changement à chaud (§4.5). Captures à 703 × 280, 1920 × 1080 et au profil `telephone` DPR 3.
Validation : `V-60` — manette, souris, doigt ; le changement se voit **tout de suite**, sans saccade au-delà d'une frame.

### Palier E — Auto

Signal de départ, descente mesurée, annonce au joueur. Scénario headless qui **injecte** des frames lentes et vérifie : une descente, une seule annonce, jamais de remontée, rien pendant un menu ouvert.
Validation : `V-61` — sur l'A04 et sur le portable Pentium, **par l'URL publique** (donc après `push` de Xav).

## 8. Critères de réussite, par appareil

| Appareil | Attendu | Relevé |
|---|---|---|
| PC de Xav, Chrome | Haut : 60 fps, **0 frame sautée en marchant**. Moyen : identique à `R-17` | `R-18` |
| Portable Pentium sans GPU, Chrome | Auto démarre en **Moyen** et **y reste** (58 fps aujourd'hui). S'il descend, le seuil de 15 % est trop nerveux | `R-19` |
| Galaxy A04, Chrome Android | Auto démarre en **Bas**. **Pas 60 fps** (≈ 18 ms par frame hors du jeu, `D-31`) : on juge la **régularité** — coût de reconstruction du calque nettement sous les 8,69 ms de `R-12`, plus de pic visible en marchant, et le **ressenti de Xav**, Bas contre Moyen sur le même trajet | `R-20` (Bas), `R-21` (Moyen) |

Si Bas ne change **rien de sensible** sur l'A04, c'est une information, pas un échec du ticket : elle confirmerait que rien, côté jeu, ne peut racheter cet appareil.

## 9. Questions à ouvrir au suivi

| Id | Question | Retenu par défaut |
|---|---|---|
| `Q-55` | Bas sans aucun grain est-il trop pauvre ? | `grain_sol: 0` ; repli prêt : `0.2` |
| `Q-56` | Un bon téléphone reste en Bas sans le savoir — le lui dire une fois ? | Non, rien n'est dit |
| `Q-57` | **Statut de l'A04.** `D-31` l'a sorti des cibles le 20/09 (« juste bon à changer ») ; le 21/09 Xav le nomme « le pire plancher qu'on puisse avoir ». Les deux tiennent ensemble si on distingue **banc d'épreuve** (on y regarde, on n'y promet rien) et **plancher** (on y garantit le jeu jouable) — mais c'est à Xav de le dire, et `Q-20`/`D-14` en dépendent | Banc d'épreuve |
| `Q-58` | Ornements du follet et halos : leviers d'une v2 ? | Hors v1 (non retenus dans la décision 1) |

## 10. Hors périmètre

L'échelle de rendu · le format d'affichage du Motorola (`D-56`, attend le modèle et une capture) · le défilement incrémental (suite éventuelle du palier A) · tout effet nouveau pour Haut (arrive avec `E-04`) · un dossier « Son » dans Paramètres · l'équilibrage poche/craft · `D-53` (amortissement du follet par frame — il rend le follet plus mou quand le jeu rame, donc **sur les appareils que cette spec vise** : bon candidat pour le ticket suivant, une ligne).

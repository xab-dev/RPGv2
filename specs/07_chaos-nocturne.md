---
projet: RPG V2
episode/session: Région Maison — intrusion nocturne du Chaos
type: spec par paliers
version: 1.3.0
statut: brouillon
catégorie: Spec
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — 07 : Chaos nocturne dans la Région Maison

**Changelog 1.3.0 (nuit du 19 au 20/09)** — la référence de coût du §6 passe de `R-02` (mesuré sous **Firefox**, donc incomparable) à **`R-03`**, le relevé de nuit de base pris sous Chrome : 59,9 fps, **zéro frame sautée**, `dessiner()` 0,32 ms, `maj()` 0,06 ms. Sous Chrome il n'y a pas de « marge de rendu » à défendre : le signal est **frames sautées**, puis **`maj()`** — c'est ce dernier que les monstres feront monter. **Pas de branche `chaos-nocturne`** : les paliers de la nuit du 19 au 20 sont livrés sur `nuit-2026-09-19`, un commit par palier (brief de la nuit). Deux éléments extérieurs à cette spec la touchent : le héros rétrécit (`D-32`) — le contact monstre/héros utilise donc une hitbox plus petite — et il ralentit (`D-33`), d'où le rapport de vitesses à redonner au palier C. **Palier D : aucune lueur sur les monstres** (`Q-27`) — avec une lumière de follet réduite, on ne les voit qu'au dernier moment, et c'est voulu : la **zone** se devine de loin, pas les créatures.

**Changelog 1.2.0 (2026-09-19, soir)** — un **relevé de nuit après chaque palier**, comparé au relevé de base `R-03`, inscrit dans la méthode ci-dessous (clôt `DOC-04`). Le renvoi à `D-02` (« budget de rendu à mesurer ») est retiré : cette ligne est déclassée en P3 depuis que les relevés Chrome ont montré que les 12 ms de `dessiner()` étaient des millisecondes de Firefox. Sous Chrome, le signal de fluidité est **« frames sautées »**. Voir `docs/DOC_navigateurs.md`.

**Changelog 1.1.0 (2026-09-19, revue des dettes)** — décisions `Q-04`, `Q-05`, `Q-06`, `Q-17` de `docs/DOC_suivi-dettes.md` : zones décrites en **rectangles** (format `zones` de `scenes.json`) et non plus en centre + rayon ; Champs redéfinis (deux grandes zones en L), bande centrale = **Campagne neutre** ; zone sûre de la Grotte confirmée, en rectangle ; apparitions **débloquées par paliers de niveau**, en données ; « quelques monstres en Forêt » retiré de cette spec (reporté au palier Nv. 15) ; la « laisse » est remplacée par le comportement **« un domaine, pas un piquet »** ; périmètre réduit au **palier 1** ; méthode : **un palier par session**.

**Méthode.** **Un palier par session, un commit par palier**, validation de Xav en jeu entre deux paliers. Ce n'est plus une session longue sans surveillance. Identifiants du suivi touchés par cette spec : `Q-04`, `Q-05`, `Q-06` (closes, appliquées ici). Ne toucher à aucune autre ligne du suivi.

**Mesure — obligatoire à chaque palier** (*ajout 1.2.0, clôt `DOC-04`*). Cette spec est la première à faire apparaître des entités qui bougent, se cherchent et meurent : c'est elle qui peut coûter des images par seconde. Donc, **après chaque palier**, Xav prend le **relevé de nuit** du protocole de traversée (§6 de `docs/DOC_suivi-dettes.md`), sous **Chrome**, plein écran, manette, et le compare à `R-03` — le relevé de nuit **de base**, pris avant que le premier monstre n'existe (`A-03`). Sans ce point de comparaison, un palier qui ferait chuter les fps ne serait imputable à rien, et un palier innocent serait accusé à tort. Le relevé se note au registre §6, avec son navigateur et son plein écran oui/non. **Pas de budget de rendu à défendre ici** : la version précédente de cette ligne renvoyait à `D-02`, déclassée le 19/09 au soir (elle mesurait des millisecondes de Firefox). Le signal à lire sous Chrome est **« frames sautées »**, pas `dessiner()`.

## 1. Intention

Le monde parallèle du Chaos s'introduit la nuit. Le jour, la Région Maison reste chill ; la nuit, avec le follet pour seule lumière, quelque chose rôde au loin. *Révise* « aucun monstre » de `03_maison-exterieur.md` §5 (décision Xav, 2026-09-19). C'est aussi la **première table d'apparition** du jeu (D15④) : elle doit resservir telle quelle pour les paliers suivants et pour les cartes futures.

But de design (Xav) : rendre la carte Maison vivante assez longtemps pour monter de niveau et s'équiper, **sans la polluer**. Le craft et la cuisine portent le joueur jusqu'au niveau 5 ; le combat prend le relais avant que la cuisine seule devienne pénible (constaté vers le niveau 7).

## 2. Règles (décidées par Xav)

### 2.1 Terrain — trois statuts

| Statut | Où | Un monstre peut y apparaître | Un monstre peut y entrer |
|---|---|---|---|
| **Zone sûre** | Maison + Jardin (puits, arbre fruitier, réapparition du fruit) ; rectangle autour de la sortie de la Grotte | non | non : il fait demi-tour |
| **Campagne** (neutre) | La bande centrale autour du chemin, hors zone sûre | non | oui, s'il poursuit le joueur |
| **Champs** | Deux grandes zones en L, au nord et au sud de la bande centrale, à l'est de la Forêt | oui, dans les zones de Chaos qu'on y pose | oui |

La **Forêt** reste sans monstres dans cette spec (palier Nv. 15, hors scope).

### 2.2 Apparitions

1. **La nuit seulement** (phase `nuit` de `daynight.js`).
2. **Palier 1, seul livré ici : une zone de Chaos au nord-est, débloquée au niveau 5.** Avant le niveau 5, les nuits sont vides.
3. Les monstres surgissent dans la zone de Chaos et **restent jusqu'à la fin de la nuit**.
4. Rien n'apparaît en zone sûre ni en Campagne.

### 2.3 Comportement — « un domaine, pas un piquet »

1. **Errance.** Sans cible, le monstre choisit un point au hasard dans son **domaine** (une liste de zones de la carte), y marche lentement, fait une pause, recommence. Domaine du palier 1 : le Champ nord.
2. **Poursuite bornée depuis le point où il a repéré le joueur**, jamais depuis son point de naissance. Au-delà de N tuiles, il lâche. Le joueur peut donc l'attirer hors de son domaine, en Campagne. Un monstre n'y va **jamais seul**.
3. **Désintérêt.** Après un abandon, il ignore le joueur quelques secondes et repart vers un point de son domaine.
4. **Demi-tour en lisière de zone sûre.** Déclenché quand la prochaine position **du monstre** entrerait dans une zone sûre — la condition ne porte jamais sur la position du joueur. Effet : désintérêt (règle 3). Il ne reste pas planté à la bordure.
5. **Anti-blocage.** S'il n'avance plus depuis ~1 s, il change d'idée : nouveau point d'errance, ou abandon de la poursuite. Aucune recherche de chemin dans cette spec.

## 3. Données

- **Zones, dans le JSON de la scène**, au format déjà présent (`zones` : `type` + `rect` en tuiles), enrichi d'un `id` pour être référençable. Nouveaux types : `champs`, `zone_sure`, `zone_apparition`. Un L = deux rectangles de même `id` de groupe, ou deux entrées — au choix de l'implémentation, à documenter.
- **`data/spawns.json`**, nouveau catalogue validé au boot. Par entrée : scène · `zone_apparition` (id) · monstre (référence croisée) · `phases` · **`condition`** · `max_simultanes` · `intervalle_ms` (temps de jeu actif, horloge partagée `save.monde.heure`) · `distance_min_joueur_tuiles` · `domaine` (liste d'ids ou de types de zones) · `poursuite_max_tuiles` · `desinteret_ms` · `blocage_ms` · `errance` (`pause_ms` min/max, facteur de vitesse).
- **Le seuil de niveau est une condition en données**, évaluée par le registre de conditions existant (`flags.js`). S'il ne sait pas exprimer « niveau ≥ N », l'étendre en données (un type de condition de plus), **jamais** un `if (niveau >= 5)` dans le système d'apparition. Choix à signaler dans le rapport.
- **Monstre** : une nouvelle entrée de catalogue dérivée du monstre de la Grotte (données seules). Équilibrage *provisoire* : un héros de niveau 5 en gère un, pas trois.
- **Validation au boot, échec dur** : une zone d'apparition qui chevauche une zone sûre ; un `domaine` ou une `zone_apparition` qui référence un id inconnu. (Réservé, non livré ici : non-chevauchement avec de futures zones constructibles — `Q-07`, en cours.)
- **Test data-driven** : ajouter une seconde table (autre zone, autre monstre, autre seuil — c'est exactement le palier Nv. 10) = une entrée JSON et des rectangles, zéro code.

**Valeurs de départ, toutes *provisoires*.** Rectangles tirés du croquis de Xav (1 caractère ≈ 5 × 10 tuiles), **à ajuster à la main par Xav** sur la carte 170 × 116 :

| Zone | Rectangle(s) en tuiles (x, y, l, h) |
|---|---|
| Zone sûre Maison + Jardin | le rectangle qui couvre `maison` (78,50,16,14) et `jardin` (96,48,22,18), **+ 6 tuiles de marge** — vérifier qu'il contient le puits et le point de réapparition du fruit |
| Zone sûre Grotte | (0, 46, 16, 24), autour du point d'arrivée (6,58) |
| Champ nord | (76, 0, 94, 29) + (125, 29, 45, 10) |
| Champ sud | (125, 77, 45, 10) + (76, 87, 94, 29) |
| Zone de Chaos nord-est (palier 1) | (140, 6, 26, 22), loin à l'est : la lueur se devine depuis le Jardin, les monstres ne sont pas sur le pas de la porte |

`max_simultanes` 6 · `distance_min_joueur_tuiles` 10 · `poursuite_max_tuiles` 20 (un peu plus d'un écran) · `desinteret_ms` 6000 · `blocage_ms` 1000 · condition : niveau ≥ 5.

## 4. Paliers (un par session)

**A — Zones et tirage (pur).** Zones en données + module pur d'apparition : tirage d'une position dans une zone parmi les tuiles **atteignables** (réutiliser `ground_items.js#calculerTuilesAtteignables`, ne pas le dupliquer), hors de toute zone sûre, à distance minimale du joueur ; PRNG injectable. Validations de boot du §3. Aucun monstre en jeu à ce palier.

**B — La nuit et le seuil.** Apparitions progressives pendant la phase `nuit` jusqu'au plafond, **si la condition est remplie** ; gelées sous UI (même point de décision unique). À l'aube : tous les monstres nocturnes disparaissent (fondu côté rendu, retrait sec côté logique), sans butin. **Non persistés** : la sauvegarde ne change pas de version ; recharger en pleine nuit repart de zéro. Si une migration s'avère nécessaire : s'arrêter et rapporter.

**C — Comportement.** Les cinq règles du §2.3, comme une machine à états pure (errance / poursuite / désintérêt), testable headless. Le combat, le butin et l'XP passent par les systèmes existants (`combat.js`, `loot.js`, `xp.js`) sans les modifier. **Si tuer un monstre ne donne pas d'XP aujourd'hui : le rapporter, ne pas l'inventer.**

**D — Signal visuel.** La zone de Chaos doit se deviner de loin la nuit (teinte, lueur) via les mécanismes existants (`visuels.json`, halos du calque d'obscurité). Sobre. `render.js` / `main.js#dessiner()` touchés → validation en jeu par Xav (décision `Q-15` : sa validation suffit, plus de capture exigée par ticket) et relevé `?debug=fps` de nuit, plafond atteint.

## 5. Tests

- **Seuil** : héros niveau 4, nuit complète → zéro apparition ; niveau 5 → apparitions. Aucun `5` en dur hors des données (le test relit le source du module).
- Bot headless sur une nuit complète : jamais plus que le plafond ; **aucune** apparition en zone sûre, en Campagne, ni à moins de la distance minimale ; plus aucun monstre nocturne à l'aube ; zéro apparition de jour.
- **Errance** : sur une nuit sans joueur à portée, chaque monstre reste dans son domaine et change de position (il n'est pas immobile).
- **Poursuite** : joueur qui fuit en ligne droite → abandon à `poursuite_max_tuiles` du point de repérage, puis aucun re-ciblage pendant `desinteret_ms`.
- **Demi-tour** : joueur réfugié dans le Jardin → le monstre n'entre jamais, passe en désintérêt, **s'éloigne** de la lisière ; idem à la sortie de la Grotte.
- **Anti-blocage** : monstre lancé contre un mur → change de but après `blocage_ms`, n'y reste pas collé.
- Mort du héros de nuit → retour Grotte, aucun monstre dans le rectangle sûr, cibles lâchées.
- UI ouverte → aucune apparition, aucun déplacement.
- **Data-driven** : le test ajoute en mémoire une seconde table (zone sud, seuil 10) et vérifie qu'elle fonctionne sans code.

## 6. À observer et rapporter, sans trancher

- **Appât patient** : attirer un monstre jusqu'au Jardin par poursuites successives, puis le frapper à chaque retour vers la lisière (portée d'arme > 0). Classé « le système le permet » par défaut ; le constater, le noter.
- **Coût** : relevé `?debug=fps` de **nuit**, plafond de monstres atteint, comparé à **`R-03`** — le relevé de nuit de base, pris sous Chrome avant que le premier monstre n'existe : **59,9 fps, 0 frame sautée**, `dessiner()` 0,32 ms (p95 0,80), `maj()` 0,06 ms (p95 0,20), 37 recalculs de calque à 0,73 ms. Les monstres coûtent du **`maj()`** (ils se décident, se déplacent, se cherchent) bien avant de coûter du `dessiner()`. Ce qui alerte, dans l'ordre : **frames sautées > 0**, puis `maj()` qui s'approche du budget de frame (16,7 ms). Si le palier coûte : **rapporter, ne pas optimiser ici**.
- **Table des niveaux** : `levels.json` monte-t-elle au moins jusqu'à 15 ? (paliers suivants : 10 et 15, et au-delà.)
- Nuit de 4 min au niveau 5 : le plafond de 6 monstres se remplit-il trop vite, trop lentement ?

## 7. Hors scope

**Palier Nv. 10** (zone sud) et **palier Nv. 15** (apparitions éparses en Forêt et dans les Champs) : micro-tickets « données seules » ultérieurs · caverne du Nv. 20 et son casse-tête · recherche de chemin · monstres qui abîment les plantations (`Q-13`, le jardinage n'existe pas) · construction dans les Champs (`Q-07`) · nouveaux archétypes de monstres · boss · barre du bas · toute modification du cycle jour/nuit.

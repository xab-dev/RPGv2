---
projet: RPG V2
episode/session: Région Maison — intrusion nocturne du Chaos
type: spec par paliers
version: 1.1.0
statut: brouillon
catégorie: Spec
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — 07 : Chaos nocturne dans la Région Maison

**Changelog 1.1.0 (2026-09-19, revue des dettes)** — décisions `Q-04`, `Q-05`, `Q-06`, `Q-17` de `docs/DOC_suivi-dettes.md` : zones décrites en **rectangles** (format `zones` de `scenes.json`) et non plus en centre + rayon ; Champs redéfinis (deux grandes zones en L), bande centrale = **Campagne neutre** ; zone sûre de la Grotte confirmée, en rectangle ; apparitions **débloquées par paliers de niveau**, en données ; « quelques monstres en Forêt » retiré de cette spec (reporté au palier Nv. 15) ; la « laisse » est remplacée par le comportement **« un domaine, pas un piquet »** ; périmètre réduit au **palier 1** ; méthode : **un palier par session**.

**Méthode.** Branche git dédiée (`chaos-nocturne`), **un palier par session, un commit par palier**, validation de Xav en jeu entre deux paliers. Ce n'est plus une session longue sans surveillance. Identifiants du suivi touchés par cette spec : `Q-04`, `Q-05`, `Q-06` (closes, appliquées ici), `D-02` (budget de rendu, à mesurer, ne pas corriger ici). Ne toucher à aucune autre ligne du suivi.

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
- **Coût** : relevé `?debug=fps` de nuit, plafond atteint, avant/après. Référence de jour avant cette spec (`R-02`) : `dessiner()` 12,02 ms de moyenne, p95 18 ms, **marge ≈ 4,6 ms** avec zéro monstre (`D-02`). Si la marge ne suffit pas : rapporter, ne pas optimiser ici.
- **Table des niveaux** : `levels.json` monte-t-elle au moins jusqu'à 15 ? (paliers suivants : 10 et 15, et au-delà.)
- Nuit de 4 min au niveau 5 : le plafond de 6 monstres se remplit-il trop vite, trop lentement ?

## 7. Hors scope

**Palier Nv. 10** (zone sud) et **palier Nv. 15** (apparitions éparses en Forêt et dans les Champs) : micro-tickets « données seules » ultérieurs · caverne du Nv. 20 et son casse-tête · recherche de chemin · monstres qui abîment les plantations (`Q-13`, le jardinage n'existe pas) · construction dans les Champs (`Q-07`) · nouveaux archétypes de monstres · boss · barre du bas · toute modification du cycle jour/nuit.

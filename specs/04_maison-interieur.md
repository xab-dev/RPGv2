# RPG V2 — SPEC : Phase 3, Maison — intérieur & systèmes de camp

**Version : 1.1.0** — 2026-09-17. Phase courante après la clôture de la Phase 2 (`docs/NS_cloture-phase2_2026-09-17.md`). Décisions structurantes actées par Xav le 2026-09-17 (voir §10) ; tout seuil numérique ci-dessous est **provisoire** sauf mention contraire.

**Changelog 1.1.0 (2026-09-17)** : le placement libre des stations (ex-palier F) sort de ce fichier vers `05_construction-stations.md`, à livrer **après** validation de la boucle ; règle « anti-spam ≠ anti-jeu » écrite noir sur blanc (§10) ; gourde tranchée (pas en Phase 3, prérequis d'entrée en zone de monstres).

**Contexte déjà disponible pour Claude Code** : `CLAUDE.md` (lire en entier, ménage de journal d'abord), `specs/00_ROADMAP.md`, `specs/03_maison-exterieur.md` §3.3/§3.4/§10 (poche, items au sol, placeholders, puits), `specs/04_stations-proportions-collision.md` (empreintes solides, seuil au bord), `specs/02_grotte.md` §3.5 et §10 (stats dérivées ; survie = modulateur ×(0,5 + 0,5 × jauge), moyenne des deux jauges, plancher en données potentiellement par zone), `specs/carte_mentale_RPG_V2_v1_3_0.md` §5 D9/D19/D20/D21.

**Ce qui ne se rouvre pas** : recettes = un seul système (D9①) ; survie ne tue jamais et ne bloque rien (D19①), jauges gelées hors session et sous UI (D19③) ; placement libre des stations (D20③) ; XP par craft (D21) ; jardinage à l'action (D10①) ; la maison n'est jamais redessinée (stations réelles = changement de `type` à la position actuelle).

---

## 1. Rôle du module

Faire tourner la **boucle de camp** : sortir → récolter → revenir → cuisiner/crafter → repartir, et lui donner une raison d'exister (faim/soif qui ramollissent, outils qui débloquent bois et pierre, XP qui monte les stats). Prouver une seule fois les quatre systèmes qui se rempliront ensuite en données seulement : recettes, survie, XP/niveaux, coffre. Le placement des stations a son propre fichier (`05_construction-stations.md`) et ne fait pas partie du critère de cette phase.

Critère de la phase (roadmap) : la boucle 5 minutes tourne, et le joueur atteint le niveau ~5 qui ouvre la zone suivante.

---

## 2. Entrées / Sorties

### 2.1 Catalogues à remplir

| Fichier | Contenu Phase 3 | Champs |
|---|---|---|
| `recipes.json` | **nouveau.** 3 recettes de base : `rec_hache`, `rec_pioche` (atelier), `rec_fruit_cuit` (cuisine). Le catalogue est conçu pour en accueillir des dizaines (corde, arc, etc. — plus tard) | `id`, `label_key`, `station` (réf. type de station), `entrees: [{ item, qte }]`, `sortie: { item, qte }`, `categorie` (`outil` / `nourriture` / `materiau` / …, libre en données), `xp`, `cooldown_ms` (défaut 60 000), `connue_au_depart` (bool), `deblocage` (condition du registre de flags, `null` = aucune) |
| `items.json` | + `item_hache`, `item_pioche` (`categorie: outil`, `stack_max: 1`), `item_fruit_cuit` (`nourriture`), `item_bois`, `item_pierre` (`ressource`). Nourriture porte `consommation: { faim, soif, effets[] }` ; tout item au sol porte `respawn_ms` (défaut 60 000) | + `consommation`, `respawn_ms` |
| `resources.json` | `res_bois.outil_requis = "item_hache"`, `res_pierre.outil_requis = "item_pioche"` (la clé existe depuis la Phase 2), + `cooldown_ms` par ressource (60 000) | + `cooldown_ms` |
| `stations.json` | **nouveau.** Types de station : `station_type_cuisine`, `station_type_atelier`, `station_type_coffre`, `station_type_puits` — `id`, `label_key`, `role` (`craft` / `stockage` / `eau`), `render`, `echelle`, `solide`, `capacite` (coffre). La clé `placable` est réservée à `05_construction-stations.md`, ne pas l'anticiper | — |
| `scenes.json` | maison : `interactifs[]` des 3 placeholders passent en `type: "station"` + `station_type`, **même position** ; puits idem. Positions fixes en JSON dans cette phase | — |
| `survival.json` | **nouveau.** Jauges `faim`, `soif` : `decroissance_ms_plein_a_vide` (provisoire : faim 20 min, soif 15 min de jeu actif), `plancher` 0,5, `pente` 0,5, `malus_respawn` (jauges à 0,25), stats modulées (`force`, `agilite`) | — |
| `levels.json` | **nouveau.** Table de niveaux : `[{ niveau, xp_cumulee, points_stats }]` (provisoire : courbe quadratique douce, niveau 5 ≈ 6 crafts + le monstre de la grotte ; niveau 10 existe déjà dans la table pour l'arc futur) | — |
| `flags.json` | `flag_niveau_N` posé par le système de niveaux à chaque niveau atteint (déclaré en données, un par ligne de `levels.json`), `flag_premier_craft`, `flag_premiere_faim` (indice de commande / dialogue) | — |
| `dialogues.json` | `dlg_station_pas_encore` retiré des stations (reste au catalogue si référencé ailleurs) ; `dlg_puits_cooldown`, `dlg_ressource_cooldown`, `dlg_recette_indisponible`, `dlg_premiere_faim` (une ligne, jamais un tuto) | — |
| `hud_layout.json` | + 2 jauges faim/soif (icônes distinctes **par forme**, P4②), + affichage niveau/XP discret | — |
| `locales/*.json` | toutes les chaînes FR **et** EN : recettes, stations, jauges, menus Craft/Coffre/Stats, dialogues | — |

Rappel : chaque catalogue passe le test « une entrée JSON de plus, zéro code de système », **prouvé par test** : une 4ᵉ recette (`rec_corde` : 2 branches → 1 corde, débloquée par `flag_niveau_3`) dans un JSON de test fonctionne sans toucher `/src` ; idem un 5ᵉ type de station, une 3ᵉ jauge de survie, une 3ᵉ ressource récoltable.

### 2.2 Sauvegarde

`schema_version: 4`, migration `3 → 4` prouvée par test : `hero.xp`, `hero.niveau`, `hero.points_stats_libres`, `hero.stats.points` (déjà là), `survie.{faim, soif}` (1,0 à la migration), `cooldowns` (`{ cle: horodatage_temps_actif }` — recettes, ressources par tuile, puits), `coffre.items`, `recettes_decouvertes[]`. (Les poses de stations arriveront en v5 avec `05_construction-stations.md`.) **Tous les horodatages sont en temps de jeu actif** (horloge déjà utilisée par `daynight.js`), jamais `Date.now()` — sinon les cooldowns courent pendant la pause et hors session, ce que D19③ interdit.

---

## 3. Comportement attendu — les paliers, dans l'ordre de la boucle

Ordre de livraison = ordre de la boucle 5 minutes. Chaque palier laisse le jeu jouable.

### 3.1 Palier A — Recettes et craft

- Une seule fonction `recipes.js#peutFabriquer(recette, poche, flags, cooldowns, tempsActif)` → `{ ok, raison }` (`ingredients`, `cooldown`, `verrouillee`, `station`). Une seule fonction `fabriquer()` : retire les entrées, ajoute la sortie (respecte `stack_max`, refus propre sinon — rien n'est consommé si la sortie ne rentre pas), crédite `xp`, pose le cooldown, pose `flag_premier_craft`.
- **Craft instantané** (pas de barre de progression, pas d'attente du résultat), **mais cooldown de 60 s par recette** après fabrication — décision Xav : « il ne peut pas crafter 15 pioches d'affilée ». Le menu affiche le temps restant ; la recette reste visible, grisée.
- **Découverte** (D9③) : `connue_au_depart: true` → visible dès le début ; sinon la recette apparaît quand sa condition `deblocage` est vraie (ex. `{ "all": ["flag_niveau_10"] }`), et son id entre dans `recettes_decouvertes[]` (futur journal de découvertes, D16②). Une recette verrouillée n'est **pas** listée — narration diffuse, on ne montre pas ce qu'il faut atteindre.
- **Menu Craft** : `INTERACT` sur une station de rôle `craft` ouvre un menu DOM (réutiliser `creerControleurMenu()`, mapping manette déjà acté) listant les recettes **de cette station** : nom, entrées (possédées/requises), état. Confirmer = fabriquer. Le craft **consomme la poche uniquement** — le coffre est un stockage, pas un sac de craft (provisoire, voir §9).
- Attribution provisoire des placeholders : `station_atelier` → `station_type_atelier` (hache, pioche) ; `station_table` → `station_type_cuisine` (fruit cuit) ; `station_coffre` → `station_type_coffre`. Deux stations de craft en M1 (D9④) : c'est ce que la maison contient déjà, un changement de données si Xav préfère une seule.

### 3.2 Palier B — Récolte réelle : bois et pierre

- `resources.js#peutRecolter(ressource, inventaire)` renvoie enfin `true` quand `outil_requis` est dans la poche (Phase 2 : toujours `false`, point d'accroche prévu). `INTERACT` sur l'arbre/rocher → `item_produit` dans la poche (toast), **cooldown 60 s sur cette tuile** (clé `res:<scene>:<x>:<y>`), dialogue court `dlg_ressource_cooldown` si on insiste. L'arbre reste debout (rien ne se déforeste), le fruitier ne se coupe jamais (acté).
- Sans outil : dialogue « pas encore » inchangé.
- **Respawn des items au sol** (branche, caillou, fruit) : le nouvel exemplaire n'est plus tiré **immédiatement** (§3.3 de la Phase 2) mais après `respawn_ms` (60 s de temps actif). Le compte cible `nb_au_sol` est inchangé, le tirage reste déterministe (même PRNG, même graine). Décision Xav sur la pomme, appliquée à tous les items au sol **par défaut de catalogue** — chaque item peut surcharger sa valeur.

### 3.3 Palier C — Survie : faim et soif

- Deux jauges dans `[0, 1]`, décroissance **linéaire en temps de jeu actif** (même horloge que le cycle jour/nuit, même point de décision unique « une UI est ouverte » → gel), rien hors session. Santé = les PV, inchangés : **la faim et la soif ne touchent jamais les PV**.
- Effet : `modulateur = plancher + pente × moyenne(faim, soif)` appliqué à **Force et Agilité** avant le calcul des dérivées (`stats.js`, un seul chemin de calcul — donc dégâts, cadence d'attaque et vitesse de déplacement suivent sans code dédié). `plancher`/`pente` lus depuis `survival.json`, avec surcharge possible par scène (`scenes.json > survie`) — acté, valeur par zone non utilisée en Phase 3.
- **Manger** : verbe `CONSUME` (slot consommable, déjà dans la couche d'input) consomme l'item de nourriture sélectionné dans le menu Poche (entrée « Équiper au slot ») ; à défaut, l'action « Consommer » depuis le menu Poche. Applique `consommation.{faim, soif}` (borné à 1) puis `effets[]` via `status.js` (le fruit cuit donne un buff, provisoire : `buff_vitalite` 3 min de temps actif — la cuisine est un système de build, D9⑥).
- **Boire** : `INTERACT` sur le puits → soif à 1, cooldown 60 s (`dlg_puits_cooldown`). Ressource infinie. Xav : équilibrer pour que la soif ne tombe pas plus vite qu'on ne peut boire — d'où 15 min plein → vide contre 60 s de cooldown, marge ×15.
- **Première faim** (jauge < 0,5 pour la première fois) : `dlg_premiere_faim`, une ligne (« j'ai un creux ») — pas un tuto, un signal ; `flag_premiere_faim`.
- **Mort** (déjà : respawn dans la grotte, PV pleins) : + jauges ramenées à `malus_respawn` (0,25) si elles étaient au-dessus. La punition est le trajet et la mollesse, jamais la progression.
- Mode détente qui désactive la survie : **non** (acté, peut-être après fin de jeu) — ne pas prévoir de réglage.

### 3.4 Palier D — XP, niveaux, points de stats

- `xp.js` pur : `crediter(xp)` → franchit 0..n niveaux d'un coup selon `levels.json`, pose `flag_niveau_N` pour chaque niveau atteint, crédite `points_stats`. Sources : craft (`recipe.xp`) et combat (`enemy.xp`, clé ajoutée à `enemies.json` — le rampant de la grotte en donne un peu). La récolte n'en donne **pas** (spec ultérieure, acté Phase 2).
- **Menu Stats** (DOM) : les 4 stats primaires, points libres, +1 par confirmation, aucun retrait (respec = après Boss 1). Les dérivées se recalculent par le chemin unique de `stats.js`.
- HUD : niveau + barre d'XP discrète (narration diffuse : un chiffre, pas une injonction).
- Le gating de la 1ère zone par `flag_niveau_5` est **consommé en Phase 4** ; ici il est seulement posé.

### 3.5 Palier E — Coffre

- `INTERACT` sur le coffre → menu DOM à deux colonnes poche / coffre, transfert par unité ou par pile (confirmer = 1, maintien = pile, provisoire). Capacité `stations.json > capacite` (provisoire : 20 piles). Le coffre est persistant, un seul par maison en M1.

### 3.6 Placement libre des stations — **hors de ce fichier**

Spécifié à part dans `05_construction-stations.md` (menu Construction, grille intérieure avec snap, rotation 4 côtés). Ne rien anticiper ici : positions fixes, aucune clé `placable`, aucun `placement.js`. Seule obligation : ne pas coder les stations réelles d'une façon qui suppose leur position immuable (la position vient des données de scène, jamais d'une constante).

### 3.7 Indices de commande (transversal)

Réutiliser `hints.js` (une fois par verbe) : `CONSUME` au premier item de nourriture équipé ; rien de nouveau pour `INTERACT`. 

---

## 4. Edge cases à gérer

- Sortie ne rentre pas dans la poche (`stack_max`) → refus **avant** consommation des entrées, message localisé.
- Cooldown sauvegardé avec un horodatage supérieur au temps actif courant (sauvegarde importée d'une autre partie) → cooldown considéré expiré, jamais négatif ni infini.
- Migration `3 → 4` : une sauvegarde v3 arrive avec jauges pleines, XP 0, niveau 1, coffre vide, stations aux positions par défaut, cooldowns vides ; sauvegarde avec `dlg_station_pas_encore` référencé par un `type` disparu → gérée par le changement de `type` en données, pas par la migration (renommage de contenu ≠ migration de schéma).
- Deux recettes partagent une entrée, la poche n'en a que pour une → la seconde est correctement grisée après la première.
- Jauge exactement à 0 → modulateur = plancher, aucune division, aucune stat négative ; jauge > 1 impossible (borne à l'écriture).
- Mort pendant un cooldown de puits → le cooldown survit au respawn (temps actif continu).
- Item de nourriture consommé alors que la jauge est déjà à 1 → consommé quand même (le joueur a choisi ; le buff, lui, s'applique) — provisoire, cf. §9.

---

## 5. Structure des fichiers (ajouts)

```
src/
├── recipes.js       peutFabriquer / fabriquer, pur, testé
├── survival.js      décroissance en temps actif, modulateur, consommation, pur, testé
├── xp.js            crédit d'XP → niveaux → flags → points, pur, testé
├── cooldowns.js     table de cooldowns en temps actif (clé → échéance), pur, testé
├── resources.js     peutRecolter branché (outil_requis), cooldown par tuile
├── ground_items.js  respawn différé (respawn_ms), déterminisme conservé
├── stats.js         modulateur de survie injecté avant les dérivées (un chemin)
├── entities.js      malus de respawn
├── save.js          v4 + migration 3 → 4
├── main.js          menus Craft/Coffre/Stats, CONSUME
├── ui/menu.js       + entrées Craft (contextuel), Coffre (contextuel), Stats
└── ui/hud.js        + jauges faim/soif, niveau/XP — CHECKLIST_visuelle rejouée
data/                recipes, items, resources, stations, scenes (maison), survival, levels,
                     flags, dialogues, hud_layout, enemies (+xp)
tests/
├── test_phase3_recipes_<date>.js          (peutFabriquer, fabriquer, cooldown, découverte,
│                                           4ᵉ recette en JSON de test sans code)
├── test_phase3_survival_<date>.js         (décroissance gelée sous UI, modulateur, plancher,
│                                           consommation, malus respawn)
├── test_phase3_xp_<date>.js               (niveaux multiples d'un coup, flags, points)
├── test_phase3_recolte_<date>.js          (outil → true, cooldown par tuile, respawn différé)
├── test_phase3_boucle_<date>.js           (la boucle 5 min jouée par un bot : 2 branches +
│                                           1 caillou → hache → bois, fruit cuit, niveau monte)
└── test_save_migration_3_4_<date>.js
```

---

## 6. Consignes d'autonomie pour Claude Code

- **Réutiliser** : `creerControleurMenu()` et son mapping manette pour tous les menus ; le point de décision unique « une UI est ouverte » pour geler survie et cooldowns ; l'horloge de temps actif de `daynight.js` — en extraire une fonction partagée si elle est encore locale, jamais une seconde horloge ; `status.js` pour les buffs alimentaires ; `flags.js` pour tout déblocage ; `structures.js#empreinteParDefaut` (les stations réelles héritent de l'empreinte des placeholders, sans code).
- **Ne pas** : créer un timer `setTimeout`/`Date.now()` pour un cooldown ; coder une recette, un niveau, une jauge en dur ; afficher une recette verrouillée ; toucher `render.js`/`hud.js`/`main.js#dessiner()` sans rejouer `docs/CHECKLIST_visuelle.md` (ajouter les états : jauges, menu Craft, menu Coffre).
- Ordre de livraison si la phase déborde : A → B → C → D → E. La boucle 5 minutes est complète dès D ; E (coffre) est un confort.
- Tout seuil (`cooldown_ms`, `respawn_ms`, décroissances, plancher/pente, courbe de niveaux, capacité du coffre, durée du buff) en données ou centralisé, commenté avec son pourquoi, **provisoire**.
- Fin de session : journal dans `CLAUDE.md` (décisions, livré/validé avec commandes, hors scope), `[OUVERT]` remontés, jamais tranchés en silence.

---

## 7. Critères de validation

**Automatisé** : `node --check` sur chaque fichier livré ; toute la suite verte (47 + les nouveaux) ; test data-driven : recette, type de station, jauge, ressource ajoutés en JSON de test sans modification de `/src` ; migration `3 → 4` ; bot de boucle.

**Manuel (Xav, manette, navigateur réel)** :
1. Depuis une partie Phase 2 (sauvegarde v3 migrée) : poche avec branches/cailloux → atelier → hache craftée (toast, XP) → recraft refusé 60 s → arbre → bois (toast) → même arbre refusé 60 s → rocher sans pioche « pas encore ».
2. Laisser tourner : les jauges baissent, le héros ralentit et tape moins fort (ressenti, pas chiffres) ; ouvrir le menu → gel ; fermer/rouvrir l'onglet → gel ; manger un fruit cuit → jauge remonte, buff visible ; puits → soif pleine, second essai refusé.
3. Niveau 2 atteint par craft → menu Stats → +1 Force appliqué (dégâts sur le rampant de la grotte différents).
4. Coffre : déposer, fermer, rouvrir l'onglet, retirer.
5. Verdict sur les seuils : 60 s, décroissances, courbe de niveaux.

---

## 8. Hors scope pour cette itération

- **Placement libre des stations** (menu Construction, grille, rotation) → `05_construction-stations.md`, après validation de ce fichier.
- **Gourde et sac** (boire et emporter plus de nourriture loin de la maison) : items craftables qui **conditionnent l'entrée en zone de monstres** — spécifiés avec la Phase 4, pas ici (acté, §10).
- Cordes, arc, fer, or, rareté des ressources (Xav : les prochaines ressources seront plus rares, pas de système de qualité — la rareté fait office de qualité). Entrées JSON futures, aucun code.
- Champs à semer, plantations, animaux, déco plantable, XP de récolte (`03b` — Xav : « quasiment le même principe » que la boucle craft, à spécifier après ce fichier).
- Mobs nocturnes dans la région (`[OUVERT]` carte mentale, à trancher quand le jardin existe).
- Respec, changement de compagnon (Boss 1), équipement 3 slots et compétences (Phase 4), gating effectif de la zone (Phase 4).
- Journal de découvertes (UI) — seules les données `recettes_decouvertes[]` sont posées.
- Micro-ticket `station_puits` (silhouette ×2,1) : à part, avant ou après, pas dedans.
- Sprites, sons de craft, animations.

---

## 9. Points `[OUVERT]` (valeur provisoire appliquée en attendant)

| Point | Provisoire appliqué | À trancher |
|---|---|---|
| **Le craft lit-il le coffre ?** | Non, poche seulement | « poche → sac de craft » (carte mentale §3bis) peut vouloir dire que le coffre alimente les stations |
| **Cooldown par tuile ou par ressource ?** | Par tuile (deux arbres = deux cooldowns) | Par type (un seul bois par minute) si la forêt rend le bois trop abondant |
| **Manger à jauge pleine** | Consommé quand même | Refuser (économie d'items) |
| **Quantités des recettes de base** | hache = 2 branches + 1 caillou ; pioche = 1 branche + 2 cailloux ; fruit cuit = 1 fruit | Xav, au ressenti de la première boucle |

---

## 10. Décisions actées par Xav (2026-09-17) — à reporter dans la carte mentale v1.4.0

- **Deux règles distinctes, à écrire telles quelles dans la carte mentale (précise D10① / P1)** :
  - **Règle anti-jeu (interdite)** : aucune mécanique qui empêche de *jouer* — barre d'énergie à la GrimSoul, attente d'un résultat (fabrication, croissance au temps réel), zone inaccessible « en attendant », rien qui se contourne en payant ou en posant le téléphone. Cette règle ne bouge pas.
  - **Règle anti-spam (autorisée)** : un petit cooldown en **temps de jeu actif** (gelé sous UI et hors session) sur une action répétable, pour l'équilibrage seulement — cent pommes dans les cinq premières minutes n'ont pas de sens. Le joueur peut toujours faire autre chose pendant ce temps.
  - Application Phase 3 : **craft instantané + cooldown 60 s par recette ; respawn des items au sol à 60 s ; puits infini à cooldown 60 s ; ressource récoltée à cooldown 60 s.** Test de conformité pour toute future donnée : « pendant ce cooldown, le joueur peut-il continuer à jouer normalement ? » — sinon c'est de l'anti-jeu.
- **Pas de gourde en Phase 3** : on boit au puits seulement. C'est voulu — ça limite le joueur à la région, lui fait prendre l'habitude d'y penser. **Gourde + sac (emporter plus de nourriture) arrivent avant la zone de monstres**, comme condition de départ, avec la Phase 4.
- **Pas d'échec ni de qualité de craft** (D9⑦ fermé pour M1) ; la rareté des ressources futures (fer, or) tient lieu de qualité.
- **Recettes de base connues d'emblée, les autres à découvrir par niveau** (D9③) ; déblocage = condition en données sur `flag_niveau_N` ; exemple cité : l'arc pas avant le niveau 10.
- **Base d'ingrédients = ce qui existe** : branche + caillou → hache, pioche ; le catalogue doit accueillir corde, arc, etc. sans code.
- **Survie = faim et soif seulement**, santé = PV, jamais touchés ; effet sur Force/Agilité (donc dégâts, cadence, déplacement) ; **temps actif seulement**, gel total en pause et hors session ; **pas de mode détente** pour l'instant.
- **Placement libre = grille intérieure avec snap, rotation sur 4 côtés, via un menu Construction** (D20③ précisé) — spécifié dans `05_construction-stations.md`, livré après ce fichier.
- Première boucle visée : arriver à la maison avec quelques branches et pommes → ramasser des cailloux → crafter la hache → couper du bois. Les plantations suivent, sur le même principe.

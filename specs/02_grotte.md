# RPG V2 — SPEC : Phase 1, La Grotte (vertical slice technique)

**Version : 1.2.0** — 2026-09-16. Reports documentaires (`specs/MT_reports-documentaires_2026-09-16.md`), sans code : résolution logique tranchée (480 × 270, §2.2/§9), critère §7 point 3 rempli, décisions de §10 (survie, portée d'arme) confirmées comme actées.

**Changelog depuis 1.1.0** : les points `[OUVERT]` de §9 ont été tranchés par Xav — portée de l'auto-attaque portée par l'arme (§3.5), mort = respawn dans la grotte (§3.5), séquence exacte de la cinématique (§3.1), lumière collée au follet + halo d'entrée (§3.1/§3.6). Seule la résolution logique reste ouverte. Décisions pour les phases futures consignées en §10.

**Contexte déjà disponible pour Claude Code** : `specs/00_ROADMAP.md` (à lire en entier d'abord), `CLAUDE.md` (journal Phase 0 + micro-ticket menu : architecture de focus, `etatNeutre()`, point de décision unique UI/gameplay — à **réutiliser**, pas à réinventer), `specs/carte_mentale_RPG_V2_v1_3_0.md` §3bis (contenu des scènes) et §0 (décisions verrouillées). Patrons V1 pour inspiration seulement : auto-attaque en cercle autour du héros, dialogue généralisé, tables déclaratives de portails.

---

## 1. Rôle du module

La Phase 1 livre la **première scène jouable de bout en bout** et, surtout, prouve une seule fois chacun des systèmes qui se multiplieront ensuite : combat de base, effets d'état élémentaires, compagnon follet (aura + lumière), énigmes en catalogue, dialogue localisé, HUD, tactile. Tout ce qui est posé ici sert tel quel jusqu'à Boss 1. La table des synergies élémentaires (§3.4) est le livrable de design de cette phase : elle est **actée par Xav** et devient des données, jamais du code.

Critère de la phase (roadmap) : un joueur qui ne connaît pas le jeu sort de la grotte **à la manette et au tactile** sans qu'on lui explique rien.

---

## 2. Entrées / Sorties

### 2.1 Catalogues à remplir (tous existent vides depuis la Phase 0)

| Catalogue | Contenu Phase 1 | Champs à figer (schéma) |
|---|---|---|
| `scenes.json` | `scene_grotte_salle_1`, `scene_grotte_salle_2`, `scene_maison_exterieur_placeholder` (salle de tuiles minimale, **provisoire**, remplacée en Phase 2) | + `portails[]` (déclaratifs : `zone {x,y,w,h}`, `cible`, `spawn`, `condition` optionnelle en format flags), `obscurite` (bool — la grotte est sombre, le follet éclaire), `interactifs[]` (références vers `puzzles.json`), `spawns[]` (références vers `enemies.json` + position + `condition`) |
| `companions.json` | 3 follets : `comp_follet_feu`, `comp_follet_eau`, `comp_follet_terre` | `id`, `label_key`, `element`, `synergie` (réf. `synergies.json`), `rayon_aura` (px), `rayon_lumiere` (px), `render` (forme distincte par élément — P4②) |
| `synergies.json` | 3 entrées, une par élément — **la table §3.4** | `id`, `element`, `effet_joueur` (réf. `status_effects.json`), `effet_monstre` (réf. `status_effects.json`) |
| `status_effects.json` | 3 buffs joueur + 3 débuffs monstre (voir §3.4) | `id`, `label_key`, `famille` (`buff` / `dot` / `controle`), `cible` (`joueur` / `monstre`), `stat` ou `param`, `valeur`, `mode` (`plat` / `pourcent`), `duree` (`aura` = actif tant que dans l'aura, ou ms), `cumul` (bool), `icone` |
| `enemies.json` | 1 entrée : `enemy_grotte_rampant` (nom joueur localisé, libre) | `id`, `label_key`, `pv`, `force`, `vitesse`, `portee_attaque`, `cadence_attaque_ms`, `comportement` (`melee` — seul archétype en Phase 1, mais la valeur est une donnée), `element` (null autorisé), `loot_table`, `render` |
| `loot_tables.json` | `loot_grotte_rampant` → éclats, quantité `min/max` | `id`, `entrees[]` (`item`, `min`, `max`, `poids`) |
| `weapons.json` | 1 entrée : l'arme de départ du héros (ex. `weapon_epee_bois`), équipée d'office en données, **sans UI d'équipement** (Phase 4) | `id`, `label_key`, `portee` : `{ "min": 0, "max": 1 }` en **tuiles** — c'est l'arme qui porte la portée de l'auto-attaque (décision Xav, §3.5) ; `degats` absent en Phase 1 (dégâts = Force). Un arc futur = `{ "min": 2, "max": 4 }` sans code |
| `puzzles.json` | 2 **types** (`levier`, `sequence`) + 3 instances : levier salle 1 (sans effet), séquence de 3 leviers salle 2 (code milieu → gauche → droite), porte de sortie | Type : `id`, `type`, `params` (pour `sequence` : `ordre[]`, `reinit_si_erreur`). Instance : `id`, `type`, `position`, `flag_pose` (flag posé à la résolution) |
| `dialogues.json` | Prompt du choix, enthousiasme du follet élu, tutoriel salle 2, introduction des éclats | `id`, `declencheur` (flag ou événement), `lignes[]` : `{ locuteur, text_key }` — `locuteur` = `narrateur` / `follet` (résolu vers le follet actif) |
| `flags.json` | `flag_follet_choisi`, `flag_levier_salle1`, `flag_grotte_monstre_tue`, `flag_grotte_sequence`, `flag_grotte_sortie` | inchangé |
| `unlocks.json` | `unlock_porte_salle2` : condition `{ "all": ["flag_grotte_sequence"] }` → `target` = `flag_grotte_sortie` ; le portail de sortie porte `condition: flag_grotte_sortie` | inchangé |
| `stats.json` | valeurs de base des 4 stats + **stats dérivées** en données (voir §3.5) | + `derivees` |
| `action_slots.json` | inchangé ; seul `slot_attaque` est actif en Phase 1, les 4 autres s'affichent grisés | — |
| `locales/*.json` | toutes les chaînes (dialogues, HUD, noms) FR **et** EN | — |

Rappel de la règle : chaque catalogue passe le test « une entrée JSON de plus, zéro code de système ». En particulier : ajouter un 4ᵉ élément (follet + synergie + 2 effets) ou un 2ᵉ ennemi mêlée ne doit toucher aucun fichier de `/src`.

### 2.2 Rendu — résolution de référence (décision Xav : **paysage**)

L'affichage actuel est beaucoup trop petit. Introduire une **résolution logique** rendue sur un canvas hors-écran puis mise à l'échelle par **facteur entier** vers le canvas visible, centré, bandes noires si le ratio diffère. **Décision Xav 2026-09-15 (`specs/MT_rendu-net_2026-09-15.md`) : le jeu n'est pas en pixel art, style « assemblage moderne » (géométrie, emoji, superpositions, jeux de lumière) — le rendu doit être net à la résolution physique de l'écran, jamais pixélisé ; le facteur reste entier et le cadrage des salles inchangé, seule la netteté du rendu final change.**

- Résolution logique **480 × 270** (16:9), validée par Xav le 2026-09-15 après visualisation (remplace la valeur provisoire 640 × 360 posée initialement). Déclarée en un seul endroit (`render.js#RESOLUTION_LOGIQUE`). Aucun point `[OUVERT]` restant sur ce sujet — voir §9.
- Toutes les coordonnées de jeu, la caméra et le HUD travaillent en résolution logique ; seule la dernière étape scale.
- Le tactile convertit les coordonnées d'écran en coordonnées logiques via le même facteur.

### 2.3 Couche d'input — ajout du tactile

Troisième mapping dans `src/input/touch.js`, produisant exactement le même état abstrait que clavier et manette :
- **Joystick virtuel** à gauche (zone morte, magnitude clampée à 1) → `move`.
- **Boutons à droite** : attaque (grand, position du pouce), 3 skills + consommable (grisés en Phase 1 mais présents pour figer le layout), `interact`, `menu`.
- Le tactile s'active dès qu'un `touchstart` est reçu ; manette/clavier restent utilisables en parallèle (fusion identique à celle déjà en place).
- Aucun `TouchEvent` hors de `touch.js`.

Le layout (positions, tailles) est une donnée (`data/hud_layout.json` ou constantes centralisées), **provisoire**, avec cibles tactiles ≥ 48 px écran (P4①).

---

## 3. Comportement attendu

### 3.1 Cinématique et choix du follet (salle 1)

Séquence exacte (décision Xav 2026-09-15), la cinématique est **non narrée** — vécue, pas racontée :

1. **Clignements** : 2–3 ouvertures d'yeux (flou noir → net → noir), tranquilles, sur la grotte-puits : roche, obscurité, un **halo de lumière qui entre par l'ouverture** (seule lumière de décor de la grotte). Durées en données, provisoires.
2. Les trois feux follets **apparaissent** et se mettent à tourner autour du héros. Le héros ne peut toujours pas bouger.
3. La **bulle de choix** apparaît ; c'est **ici seulement** qu'intervient une courte narration localisée (invite au choix). Sélection : `MOVE` cible un follet (gauche / milieu / droite), `ATTACK` confirme, tactile = tap direct. Le follet sélectionné est mis en évidence sans dépendre de la couleur seule (forme + marqueur, P4②).
4. **Animation 3 → 1** : les deux autres s'éloignent et disparaissent, l'élu se **met en orbite** autour du héros et devient enthousiaste (orbite plus vive, dialogue court : meilleur copain, veut aller de l'avant). `flag_follet_choisi` posé ; compagnon enregistré dans la sauvegarde (`hero.companion`).
5. Le déplacement devient possible → suite.

Lumière : à partir du choix, le follet est **la torche du héros** pour toute l'aventure — la lumière est **collée au follet** (`rayon_lumiere`, dégradé simple sur un calque d'obscurité), le héros n'en a aucune propre. Les seules autres sources sont celles posées par le level design (ici : le halo de l'entrée). Prévoir dès maintenant que `scenes.json` accepte une liste de `lumieres[]` statiques (position, rayon) — le halo d'entrée en est la première entrée, les zones sombres futures en ajouteront sans code.

### 3.2 Salle 1

Déplacement libre. Un levier (`puzzle_levier_salle1`) : `INTERACT` à proximité → il s'allume, aucun effet, `flag_levier_salle1` posé (préfiguration). Sortie latérale = portail déclaratif sans condition vers la salle 2.

### 3.3 Salle 2 — combat tutoriel, puis séquence

1. À l'entrée, un monstre (`enemy_grotte_rampant`) apparaît. Le follet prend la parole (dialogue `dlg_grotte_tuto_combat`, sens : « voici un monstre ; si tu le tues, je gagne en force et toi aussi ; laisse-moi m'approcher, je m'occupe de lui »).
2. Le dialogue terminé, le follet **se place sur le monstre** (comportement `engager`, §3.6) ; le joueur attaque avec `ATTACK`.
3. Monstre mort : drop d'éclats (loot table), ramassage au contact, compteur HUD. Dialogue `dlg_grotte_eclats` (introduction des éclats). `flag_grotte_monstre_tue`.
4. Trois leviers, **sans aucune instruction** : type `sequence`, ordre `[milieu, gauche, droite]`. Un levier activé s'allume ; un mauvais ordre réinitialise les trois (feedback visuel court, jamais de texte). Bon ordre → `flag_grotte_sequence` → `unlock_porte_salle2` pose `flag_grotte_sortie` → la porte **apparaît** (tuile/objet dont le rendu et la collision dépendent du flag) → portail vers `scene_maison_exterieur_placeholder`.

### 3.4 Table des synergies élémentaires — **actée par Xav, 2026-09-15**

Valeurs **provisoires** (ordres de grandeur à équilibrer en jeu), stockées dans `synergies.json` + `status_effects.json`, jamais en code.

| Élément | Effet sur le joueur (permanent tant que ce follet est compagnon) | Effet sur les monstres (**dans l'aura** du follet uniquement) |
|---|---|---|
| **Feu** | `buff_force` : Force +1 → attaque plus forte | `dot_brulure` : dégâts continus (famille `dot`), ex. 1 PV / 500 ms, tant que le monstre est dans l'aura |
| **Eau** | `buff_agilite` : Agilité +1 → vitesse d'attaque (lente au niveau 1) | `debuff_affaiblissement` : Force du monstre −1 → réduit les dégâts qu'il inflige au joueur |
| **Terre** | `buff_vitalite` : Vitalité +1 → plus de PV | `controle_entrave` : vitesse de déplacement −50 % (famille `controle`) — le monstre arrive vite de loin, ralentit dès qu'il est proche/dans l'aura |

Règles :
- Les trois familles de D6① sont toutes représentées (buff, DoT, contrôle) — c'est voulu, la logique élémentaire est la règle de design.
- L'effet monstre est **lié à l'aura** : il s'applique à l'entrée dans `rayon_aura`, cesse à la sortie (`duree: "aura"`). Pas de cumul sur une même cible.
- L'effet joueur passe par le système de stats (§3.5) : c'est un modificateur de stat, pas un cas spécial.
- Cette table est à reporter dans la carte mentale (D6③ → 🟢, ce qui débloque D2③) au prochain patch.

### 3.5 Combat de base et stats

- **Auto-attaque** (`ATTACK`) : zone **annulaire** autour du héros définie par la **portée de l'arme équipée** (`weapons.json > portee {min, max}`, en tuiles) — décision Xav : la portée vient de l'équipement, jamais d'une stat. Un monstre dont la distance au héros est dans `[min, max]` subit les dégâts ; avec `min = 0` c'est un simple cercle (mêlée), avec `min > 0` le corps-à-corps est impossible (arc). Cadence limitée par un cooldown dérivé d'**Agilité**. Feedback visuel bref (l'anneau flashe), pas de sprite. Le code ne connaît que `{min, max}` : les attaques à distance futures ne changent que les données (le projectile éventuel est un sujet de Phase 4).
- **Dégâts = Force** (décision Xav, formule minimale). Pas d'autre terme en Phase 1.
- **Stats dérivées en données** (`stats.json > derivees`), formules provisoires et commentées : `pv_max = f(vitalite)`, `cooldown_attaque_ms = f(agilite)` décroissant, `vitesse_deplacement = f(agilite)` ou constante. Les modificateurs (buffs) s'additionnent à la stat primaire avant calcul des dérivées — un seul chemin de calcul.
- **Équilibrage cible du premier monstre** : mort en **2–3 auto-attaques** à Force de base (donc `pv` ≈ 2,5 × Force de base), pour laisser au follet le temps d'agir. Il inflige peu : au plus ~10 % des PV du héros par coup.
- **PV du héros et mort** (décision Xav) : à 0 PV, **respawn dans la grotte** — point de spawn de la salle 1, après le choix du follet (jamais rejoué), PV pleins. C'est la règle **pour tout le jeu** : la grotte est le point de résurrection unique, avec un **malus sur les jauges de nourriture et d'eau** — ces jauges n'existant qu'en Phase 3, le malus est un `[à brancher en Phase 3]` : prévoir dès maintenant un point unique `entities.js#mourir()` qui pose un événement `mort` que la survie viendra écouter, pas un `if` à ajouter plus tard dans le combat. Le point de respawn est une donnée (`scene_grotte_salle_1.spawn`), pas une constante.
- Monstre : approche en ligne droite vers le héros (pas de pathfinding), attaque quand à `portee_attaque` selon `cadence_attaque_ms`, subit les effets d'état via un composant générique (`status.js`) — le même que le héros.

### 3.6 Follet — comportement et rôle

Machine à états simple, en données quand c'est un seuil :
- `suivre` : orbite autour du héros avec un retard (ressort/lerp), c'est l'état par défaut.
- `engager` : quand un monstre est à moins de `distance_engagement` du héros (donnée), le follet se déplace sur le monstre et y reste ; son aura y applique l'effet monstre. Retour à `suivre` à la mort du monstre ou s'il s'éloigne.
- Lumière : **collée au follet** dans tous les états (décision Xav) — quand il engage, la lumière va au monstre et le combat se fait dans la lumière ; le héros reste dans la pénombre, c'est voulu.
- Rendu : forme géométrique **distincte par élément** (triangle / goutte / carré, par exemple), en plus de la couleur.

### 3.7 Dialogue

Boîte en bas de l'écran logique, nom du locuteur + texte via `i18n.t()`, avance ligne par ligne sur `ATTACK`, `INTERACT` ou tap. **Pendant un dialogue, le gameplay reçoit `etatNeutre()`** — même point de décision unique que le menu (`main.js#maj()`), étendu à « une UI est ouverte » (menu OU dialogue), pas un second `if`. Le dialogue est un écran d'UI comme un autre : il reprend `creerControleurMenu()` s'il s'y prête, sinon au minimum le même patron. Pas de choix de dialogue en Phase 1.

### 3.8 Énigmes — catalogue

`puzzles.js` interprète des **types** (données) et des **instances** (données). Deux types :
- `levier` : booléen, `INTERACT` bascule, pose `flag_pose`, rendu on/off.
- `sequence` : liste d'instances `levier` enfants + `ordre[]` ; valide si activation dans l'ordre ; sinon réinitialise (si `reinit_si_erreur`). Pose `flag_pose` à la réussite.
Ajouter une 3ᵉ instance de séquence ailleurs = JSON seulement.

### 3.9 HUD

En résolution logique, paysage : PV (barre + valeur), compteur d'éclats, 5 slots d'action (1 actif, 4 grisés), icône du follet actif avec sa forme. Tout texte via `i18n.t()`. Sur tactile, les boutons d'action **sont** les slots (pas deux HUD).

### 3.10 Sauvegarde

Le schéma passe en `schema_version: 2` (migration `1 → 2` prouvée par test) : `hero.companion`, `hero.pv`, `hero.stats` (base + points), `hero.equipement.arme` (réf. `weapons.json`, arme de départ par défaut), `inventaire.eclats`, `puzzles` (états persistants), flags déjà couverts.

---

## 4. Edge cases à gérer

- Follet non choisi (sauvegarde v1 migrée, ou flag absent) → la scène 1 rejoue le choix ; jamais de héros sans compagnon après la salle 1.
- Monstre et héros dans la même tuile / superposition → aucune poussée physique en Phase 1, seuls les dégâts comptent.
- Mort pendant un dialogue : impossible (gameplay neutre) — vérifier qu'aucun DoT / attaque de monstre ne tick pendant une UI ouverte (le temps de jeu est **en pause** sous UI, décision à formuler en commentaire au point unique).
- Séquence : activer deux fois le même levier compte comme une erreur ; réinitialisation sans texte.
- Portail conditionné dont la condition n'est pas remplie → simple mur, aucun message (D13① : pas d'objectif affiché).
- Onglet masqué en plein combat → `visibilitychange` sauvegarde déjà ; au retour, le delta plafonné (100 ms) empêche le rattrapage — vérifier que les cooldowns/DoT utilisent le même delta.
- Deux doigts sur le joystick virtuel → le premier fait foi ; relâchement → `move` à `{0,0}` immédiatement (aucun état collé, même exigence que le hot-swap manette).
- Fenêtre redimensionnée → recalcul du facteur entier à la frame suivante.
- Clé de localisation manquante dans un dialogue → `[[clé]]` visible + test rouge (déjà en place).

---

## 5. Structure des fichiers (ajouts à la Phase 0)

```
src/
├── combat.js        auto-attaque (zone, cooldown, dégâts = Force), pur, testé
├── stats.js         stats de base + modificateurs → dérivées, pur, testé
├── status.js        effets d'état génériques (buff/dot/contrôle, durée aura/ms), pur, testé
├── entities.js      héros + monstres : PV, position, état ; comportement melee, pur, testé
├── companion.js     follet : états suivre/engager, aura, lumière (données), pur, testé
├── puzzles.js       interpréteur de types (levier, sequence), pur, testé
├── dialogue.js      file de lignes + avancement, pur, testé ; rendu dans ui/
├── loot.js          résolution d'une loot table (PRNG injectable), pur, testé
├── input/touch.js   joystick virtuel + boutons → état abstrait
├── ui/hud.js        rendu HUD (jamais testé headless)
├── ui/dialogue_box.js
├── render.js        + résolution logique et scaling entier, + calque d'obscurité
data/                catalogues remplis (§2.1) + hud_layout.json
tests/
├── test_phase1_stats_<date>.js
├── test_phase1_combat_<date>.js
├── test_phase1_status_synergies_<date>.js   (les 6 effets, une entrée par élément — test data-driven : ajouter un faux 4ᵉ élément en JSON de test, tout passe)
├── test_phase1_companion_<date>.js
├── test_phase1_puzzles_<date>.js
├── test_phase1_dialogue_<date>.js
├── test_phase1_loot_<date>.js
├── test_phase1_touch_<date>.js
├── test_phase1_save_migration_1_2_<date>.js
└── test_phase1_i18n_<date>.js                (clés FR/EN identiques, aucun texte joueur en dur dans ui/ et dialogues)
```

---

## 6. Consignes d'autonomie pour Claude Code

- Ne pas demander de validation sur le nommage, la forme exacte des schémas, le découpage interne des tests.
- **Réutiliser** l'architecture de focus de `ui/menu.js` et `etatNeutre()` — le dialogue et le choix du follet sont des écrans d'UI, pas des cas spéciaux. Un seul point de décision « une UI est ouverte » dans `main.js`.
- Réutiliser le PRNG `mulberry32` de `decor.js` pour le loot (injectable, donc testable).
- Tout seuil (`RAYON_ATTAQUE`, `rayon_aura`, `distance_engagement`, formules de dérivées, valeurs de la table §3.4, résolution logique, layout tactile) en données ou centralisé, commenté avec son pourquoi, marqué **provisoire**.
- Pas de sprites, pas d'animation squelettique : formes géométriques, mais **distinctes par élément et par entité** (accessibilité dès maintenant).
- Aucun point de design tranché en silence : un `[OUVERT]` dans `CLAUDE.md` et on continue avec la valeur provisoire indiquée ici.
- Si la phase déborde : s'arrêter à un palier stable dans l'ordre suivant — (1) combat + stats + synergies + follet, (2) énigmes + porte, (3) dialogue + choix du follet, (4) HUD + résolution, (5) tactile. Le tactile est le dernier palier mais **reste dans la phase** (roadmap : mené en parallèle, jamais reporté).

---

## 7. Critères de validation

**Automatisés** (`node tools/run_tests.js`, tout vert ; `node --check` sur chaque fichier livré) :
- Stats : buff +1 Force modifie les dégâts ; dérivées calculées depuis les données, jamais en dur.
- Combat : monstre dans le cercle touché, hors du cercle non ; cooldown respecté ; premier monstre mort en 2–3 coups à Force de base (test d'équilibrage sur les valeurs JSON).
- Synergies : Feu → DoT tick uniquement dans l'aura ; Eau → dégâts reçus réduits ; Terre → vitesse −50 % dans l'aura, normale hors aura ; un 4ᵉ élément ajouté dans des JSON de test fonctionne sans modification de code.
- Follet : `suivre` → `engager` à `distance_engagement`, retour à `suivre` à la mort du monstre.
- Énigmes : levier bascule + flag ; séquence bonne → flag ; mauvais ordre → réinitialisation ; `unlock` pose `flag_grotte_sortie`.
- Dialogue : avancement ligne par ligne, fermeture en fin ; gameplay neutre pendant.
- Loot : quantités dans `min/max`, déterministe à graine fixe.
- Tactile : joystick → `move` normalisé ; relâchement → `{0,0}` ; tap bouton → `attack.pressed` une frame.
- Migration save `1 → 2` sur un payload v1 fictif ; version 3 refusée.
- i18n : jeux de clés identiques, aucun texte joueur littéral dans `ui/` ni dans `dialogues.json` (seulement des `text_key`).

**Manuel (Xav)** — le critère de la phase :
1. Manette : nouvelle partie → cinématique → choisir un follet → salle 1, levier, sortie → salle 2, dialogue, tuer le monstre, ramasser les éclats → trouver la séquence sans indication → porte → scène placeholder. Vérifier que l'effet du follet est **visible** (brûlure/ralentissement/dégâts réduits) et que la grotte est sombre hors du halo.
2. Même parcours **au tactile** (navigateur mobile ou émulation tactile), jusqu'au bout.
3. ~~Vérifier la lisibilité à la nouvelle résolution logique et donner un verdict sur 640 × 360 (§9).~~ **Fait** : résolution 480 × 270 validée par Xav le 2026-09-15 (voir §9).
4. Refaire le parcours avec chacun des 3 follets — les trois effets se sentent différemment.

---

## 8. Hors scope pour cette itération

- Région Maison (Phase 2) : la porte mène à un placeholder vide, assumé.
- Compétences, consommables, équipement, inventaire complet (Phase 3–4) : slots grisés seulement.
- Audio (report : initialisation sur geste utilisateur à traiter quand le premier son existe — Phase 2 au plus tard).
- Sprites, animations, tuiles définitives de la grotte.
- Pathfinding ennemi, archétypes autres que `melee`.
- Choix dans les dialogues, PNJ.
- Journal de découvertes (M1, Phase 6).

---

## 9. Point `[OUVERT]` restant (valeur provisoire appliquée en attendant)

Aucun point ouvert — résolution tranchée le 2026-09-15 (480 × 270).

Les autres points de la 1.0.0 sont tranchés (voir changelog) — ne pas les rouvrir.

---

## 10. Décisions actées par Xav pour les phases futures (à ne pas implémenter ici, à ne pas perdre)

- **Portée = équipement** (Phase 4) : chaque arme porte `portee {min, max}` en tuiles ; ex. épée en bois `[0;1]`, épée en pierre `[0;1.1]`, arc en bois `[2;4]` (pas de corps-à-corps). Aucune stat ne modifie la portée.
- **Mort = respawn dans la grotte, pour tout le jeu**, avec malus sur nourriture et eau (Phase 3). La grotte est au fond du jardin : la punition est le trajet et le malus, jamais la perte de progression.
- **Survie = modulateur de stats, jamais une mort** (Phase 3, précise D19①) : les jauges de nourriture et d'eau ne tuent pas et ne bloquent rien ; elles modulent Force et Agilité. Formule actée : multiplicateur = **0,5 + 0,5 × jauge** (jauge de 0 à 1) → 100 % de jauge = 100 % de la stat, 50 % = 75 %, 0 % = 50 % plancher. **Décision Xav : la jauge utilisée est la moyenne des deux jauges (nourriture + eau) / 2, appliquée aux deux stats** — équilibre naturel, une seule valeur à lire. Le plancher (0,5) et la pente sont des données, **potentiellement par zone** (idée Xav : zones de monstres / Château plus punitives que Maison / Poste avancé) — à porter dans `scenes.json` ou par région, pas en constante globale. La décroissance des jauges (vitesse, déclencheurs) se spécifie en Phase 3, pas avant.
- **Boissons / potions** existent dans le jeu (Phase 3 : eau/boissons pour la jauge de soif ; Phase 4 : potions dans le slot consommable).

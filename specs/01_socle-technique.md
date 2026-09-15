# RPG V2 — SPEC : Phase 0, Socle technique

**Contexte déjà disponible pour Claude Code** : `00_ROADMAP.md` (à lire en entier d'abord — décisions actées et contraintes de méthode), `carte_mentale_RPG_V2_v1_2_0.md` (référence des 30 décisions, §0 et §8). Patrons V1 à consulter pour inspiration seulement, jamais à copier : `docs/CLAUDE_archive.md` (architecture de scènes, tables déclaratives, tests headless) et `monde/rpg_v0_1_0.js` (`calculerCamera`, `saveGame`/`loadGame`, séparation HTML/JS pour `node --check`).

## 1. Rôle du module

La Phase 0 pose le squelette que **toutes** les phases suivantes utilisent sans jamais le rouvrir. Elle ne contient aucun gameplay. Son unique rôle est de prouver six contrats techniques qui, s'ils étaient posés plus tard, obligeraient à réécrire le contenu :

1. les données de jeu vivent en JSON externes validés au boot ;
2. le gameplay ne connaît aucun périphérique, seulement des verbes ;
3. une scène est un layout de tuiles chargé depuis JSON, rendu par une caméra ;
4. la sauvegarde est unique, automatique, versionnée, écrite en double tampon ;
5. les déblocages passent par un registre de flags central ;
6. aucun texte visible n'est en dur.

Si l'un de ces six points n'est pas prouvé par un test à la fin de la phase, la phase n'est pas livrée.

## 2. Entrées / Sorties

### 2.1 Catalogues JSON (`/data/*.json`)

Un fichier par catalogue. En Phase 0 ils sont **vides ou quasi vides** mais tous présents, avec leur schéma, pour que le registre et la validation soient exercés dès maintenant.

| Fichier | Contenu Phase 0 | Schéma minimal (champs obligatoires) |
|---|---|---|
| `elements.json` | 3 entrées : `feu`, `eau`, `terre` | `id`, `label_key`, `icon`, `shape` (forme géométrique distincte — accessibilité) |
| `tiles.json` | ~6 tuiles placeholder (sol, mur, sol-2, eau, sortie, vide) | `id`, `solid` (bool), `render` (couleur ou motif procédural) |
| `scenes.json` | 1 scène `salle_test` | `id`, `width`, `height` (en tuiles), `tile_size` (px), `layout` (tableau 2D d'ids de tuiles), `spawn` `{x,y}`, `seed` (int) |
| `stats.json` | 4 entrées : `force`, `agilite`, `vitalite`, `esprit` | `id`, `label_key`, `base` |
| `action_slots.json` | 5 entrées | `id`, `verb` (verbe d'input associé) |
| `equipment_slots.json` | 3 entrées | `id`, `label_key` |
| `flags.json` | vide `[]` | `id`, `label_key` (un flag doit être déclaré pour pouvoir être posé) |
| `unlocks.json` | vide `[]` | `id`, `condition` (voir §3.5), `target` |
| `weapons.json`, `armors.json`, `accessories.json`, `enemies.json`, `skills.json`, `status_effects.json`, `synergies.json`, `recipes.json`, `stations.json`, `crops.json`, `loot_tables.json`, `puzzles.json`, `companions.json`, `dialogues.json`, `journal_entries.json` | vides `[]` | schéma déclaré mais **non figé** : chaque phase le complète ; le registre ne valide en Phase 0 que la présence du fichier, la validité JSON et l'unicité des `id` |

**Convention d'`id`** : minuscules, mots séparés par `_`, préfixé par sa catégorie au singulier (`tile_sol`, `scene_salle_test`, `elem_feu`, `stat_force`). Un `id` dupliqué dans un même catalogue ou en collision avec un autre catalogue = échec dur au boot.

**Références croisées** : tout champ qui pointe une autre entrée porte l'`id` complet (ex. `"element": "elem_feu"`). Le registre résout et vérifie l'existence de la cible au boot ; une référence cassée = échec dur avec le chemin exact (`weapons.json > weapon_x > element > "elem_vent" introuvable`).

### 2.2 Localisation (`/locales/fr.json`, `/locales/en.json`)

Dictionnaire plat `clé → texte`. Toute chaîne visible passe par `t("clé")`. Une clé absente dans une langue affiche `[[clé]]` en jeu **et** échoue en test (test dédié qui compare les jeux de clés des deux fichiers).

### 2.3 Sauvegarde

Un seul fichier logique, stocké dans **IndexedDB** (jamais `localStorage` seul — contrainte WebView). Payload :

```json
{
  "schema_version": 1,
  "saved_at": "<ISO 8601>",
  "hero": { "scene": "scene_salle_test", "x": 0, "y": 0 },
  "flags": {},
  "settings": { "lang": "fr" }
}
```

`schema_version` est un entier strictement croissant. La migration est une chaîne de fonctions `migrate_1_to_2`, `migrate_2_to_3`… appliquées en séquence jusqu'à la version courante.

### 2.4 Couche d'input

Sortie unique vers le gameplay : un objet d'état par frame.

```
{ move: {x: -1..1, y: -1..1}, attack, skill_1, skill_2, skill_3, consume, interact, menu }
```

Les booléens distinguent `pressed` (front montant, une frame) et `held`. Entrées : Gamepad API (stick gauche + boutons faciaux + gâchettes), clavier (`KeyboardEvent.code`, indépendant de la disposition — patron V1). Le tactile n'est **pas** dans cette phase mais l'interface doit l'accepter sans modification (un troisième mapping, rien de plus).

## 3. Comportement attendu

### 3.1 Boot
1. Charger `/locales/*.json`.
2. Charger **tous** les catalogues de `/data/` en parallèle.
3. Valider : JSON parsable → champs obligatoires présents → `id` uniques → références croisées résolues.
4. Sur la moindre erreur : afficher un écran d'erreur lisible (fichier, entrée, champ, cause) et **ne pas démarrer**. Jamais de mode dégradé.
5. Charger la sauvegarde (ou en créer une neuve), migrer si nécessaire.
6. Charger la scène courante, instancier la caméra, démarrer la boucle.

Le rechargement à chaud (`?dev=1` recharge les catalogues à la touche `F5` sans perdre l'état) est **souhaitable** mais pas un critère de passage.

### 3.2 Scène & rendu
- `tile_size` provisoire : **32 px**, constante en données (`scenes.json`), pas dans le code.
- Collisions : test des 4 coins de la hitbox du héros contre les tuiles `solid`, glissement axe par axe (patron V1).
- Caméra : suit le héros, se borne aux limites de la scène ; si une dimension de la scène est inférieure au viewport, cette dimension est centrée (bug V1 Phase 16 — ne pas le reproduire).
- Décor procédural : en Phase 0, seulement le mécanisme — un générateur déterministe à partir de `scene.seed` qui pose N motifs non-collisionnants sur les tuiles de sol. Deux rendus du même `seed` produisent des appels canvas strictement identiques (test).
- Boucle : `requestAnimationFrame`, delta-time plafonné (une frame ne rattrape jamais plus de 100 ms).

### 3.3 Héros (placeholder)
Un carré ou un cercle, une vitesse de déplacement en données (`stats.json` ou constante de scène — au choix, mais **pas en dur dans le code de mouvement**). Aucune animation requise.

### 3.4 Sauvegarde automatique
Déclenchée : à chaque changement de scène, à chaque pose de flag, toutes les 30 s si l'état a changé, et sur `visibilitychange` (onglet masqué). **Double tampon** : écrire dans `save_next`, vérifier la relecture, puis promouvoir en `save_current` en une opération. Si le jeu est coupé entre les deux, `save_current` reste intact.

### 3.5 Registre de flags
API : `flags.set(id)`, `flags.has(id)`, `flags.evaluate(condition)`. Un flag doit exister dans `flags.json` pour être posé (sinon erreur en dev, ignoré silencieusement avec log en prod). Format de `condition` en données, provisoire mais extensible :

```json
{ "all": ["flag_a", "flag_b"] }
{ "any": ["flag_a", "flag_b"] }
{ "not": "flag_a" }
{ "all": ["flag_a", { "any": ["flag_b", "flag_c"] }] }
```

Un `unlock` de `unlocks.json` est réévalué à chaque pose de flag ; s'il devient vrai, il pose `target`. En Phase 0 ce mécanisme est testé à vide avec des flags fictifs.

### 3.6 Menu minimal
Ouvert par `MENU` : bascule de langue FR/EN, bouton « exporter la sauvegarde » (télécharge le JSON), bouton « importer » (fichier → validation de schéma → migration → remplace). Rien d'autre.

## 4. Edge cases à gérer

- Catalogue absent, JSON invalide, `id` dupliqué, référence cassée → écran d'erreur, pas de démarrage.
- Sauvegarde corrompue (`save_current` illisible) → tenter `save_next` ; si les deux échouent, partie neuve **avec message explicite**, jamais en silence.
- Sauvegarde d'une version **supérieure** à celle du jeu (l'utilisateur importe un fichier d'une build plus récente) → refus avec message, jamais de migration descendante.
- Manette débranchée en cours de partie → basculer sur clavier sans interrompre ; rebranchée → reprendre. Aucun état d'input ne reste « collé » (`held` remis à faux).
- Deux manettes → la première qui produit une entrée devient active.
- Viewport redimensionné → caméra recalculée à la frame suivante, sans rechargement.
- Clé de localisation absente → `[[clé]]` visible, test rouge.
- `seed` absent dans une scène → échec de validation (pas de valeur par défaut, un décor non reproductible est un bug).

## 5. Structure des fichiers

```
rpg_v2/
├── index.html              (mise en page seulement, zéro logique)
├── serveur_local.js        (statique, sans dépendance, no-store — patron V1)
├── CLAUDE.md               (mémoire du projet V2, créé en fin de Phase 0)
├── src/
│   ├── main.js             (boot, séquence §3.1)
│   ├── registry.js         (chargement + validation + résolution des références)
│   ├── schemas.js          (schémas par catalogue)
│   ├── input/
│   │   ├── input.js        (état abstrait par frame)
│   │   ├── gamepad.js      (mapping manette)
│   │   └── keyboard.js     (mapping clavier)
│   ├── scene.js            (chargement d'une scène, collisions)
│   ├── camera.js
│   ├── decor.js            (procédural déterministe)
│   ├── render.js           (boucle + draw)
│   ├── save.js             (IndexedDB, double tampon, migrations)
│   ├── flags.js            (registre + conditions)
│   ├── i18n.js
│   └── ui/menu.js
├── data/                   (un JSON par catalogue, cf. §2.1)
├── locales/
│   ├── fr.json
│   └── en.json
├── specs/                  (00_ROADMAP.md, 01_socle-technique.md, …)
├── tests/
│   ├── test_phase0_registry_<date>.js
│   ├── test_phase0_input_<date>.js
│   ├── test_phase0_scene_camera_<date>.js
│   ├── test_phase0_save_<date>.js
│   ├── test_phase0_flags_<date>.js
│   └── test_phase0_i18n_<date>.js
└── tools/                  (vide en Phase 0 ; futur pipeline Sheet → JSON)
```

Modules ES (`import`/`export`) servis en `http://`. Chaque fichier de `/src` doit rester importable depuis Node pour les tests headless : **aucun accès au DOM au niveau module**, seulement dans des fonctions appelées par `main.js` ou `render.js`. Les tests injectent un faux DOM minimal quand nécessaire (patron V1 `tests/test_bugfix_journal_livre_2026-09-12.js`).

## 6. Consignes d'autonomie pour Claude Code

- Ne pas demander de validation sur les choix techniques raisonnables (nommage interne, format exact des schémas, structure des tests).
- Ne pas installer de framework de jeu, de bundler ou de dépendance runtime. Une dépendance de **dev** (validation de schéma type `ajv`) est acceptable si elle reste hors du jeu servi.
- Réutiliser les patrons V1 cités en tête, réécrits proprement — jamais copiés-collés.
- Séparer strictement : registre (données) / input (périphériques) / scène (monde) / rendu (canvas) / save (persistance). Une phase future doit pouvoir remplacer le rendu sans toucher au reste.
- Tout seuil numérique (vitesse, `tile_size`, intervalle de sauvegarde, plafond de delta-time) est déclaré en un seul endroit, commenté avec son *pourquoi*, et marqué **provisoire** s'il n'a pas été validé en jeu.
- Point de design non tranché rencontré en cours de route → `[OUVERT]` dans `CLAUDE.md`, pas de décision silencieuse.

## 7. Critères de validation

**Automatisés** (`node tests/<fichier>.js`, tous verts) :
- Registre : catalogue valide accepté ; `id` dupliqué, référence cassée, champ manquant, JSON invalide → chacun rejeté avec le message attendu.
- Input : un événement manette produit `move` ; un événement clavier produit le même `move` ; `pressed` n'est vrai qu'une frame ; débranchement remet `held` à faux.
- Scène/caméra : collision sur tuile solide, glissement axe par axe, caméra bornée, caméra centrée sur scène plus petite que le viewport, décor identique pour un même `seed`.
- Sauvegarde : cycle écrire/relire ; `save_next` non promu si vérification échoue ; migration `0 → 1` sur un payload fictif ; version supérieure refusée.
- Flags : `set` d'un flag non déclaré rejeté ; `all`/`any`/`not` imbriqués ; `unlock` posé automatiquement quand sa condition devient vraie.
- i18n : jeux de clés FR et EN identiques ; `grep` sur `/src` ne trouve aucune chaîne littérale hors clés `t("…")` et messages de log développeur.

**Manuel (Xav, navigateur, manette branchée)** : déplacer le héros dans `salle_test`, buter contre un mur, changer de langue par le menu, fermer l'onglet, rouvrir → même position, même langue. Débrancher la manette en marchant → le héros s'arrête, le clavier prend le relais.

## 8. Hors scope pour cette itération

Reportés à la phase indiquée, **pas à faire ici même si c'est tentant** :
- Tactile (Phase 1). Audio (Phase 1, initialisation sur geste utilisateur). HUD de jeu, feux follets, combat, énigmes, dialogue (Phase 1).
- Animations du héros, sprites (Phase 1 au plus tôt ; le placeholder géométrique suffit).
- Pipeline Sheet → JSON dans `/tools` (quand un contributeur externe existera).
- Rechargement à chaud complet (souhaitable, pas requis).
- Packaging WebView, mesure du plancher de performance (Phase 7).

# Journal de session — Phase 1 : La Grotte

**Date :** 2026-09-15  
**Fiche(s) associée(s) :** `specs/02_grotte.md`

## Journal de session — Phase 1 : La Grotte (2026-09-15)

Spec complète : `specs/02_grotte.md`. Session livrée dans la continuité de la Phase 0 (le micro-ticket menu-manette ci-dessus était déjà fait et validé par Xav au démarrage de cette session).

### Décisions prises et pourquoi

- **`stats_derivees.json` en catalogue séparé de `stats.json`**, plutôt qu'un champ `derivees` ajouté aux entrées de `stats.json` comme le suggérait la formulation littérale de la spec (§2.1). Une entrée dérivée n'a pas la même forme qu'une stat primaire (`stat` cible + `formule` au lieu de `base`), et `registry.js` valide génériquement chaque catalogue comme un tableau homogène : mélanger les deux formes dans un seul fichier aurait cassé cette généricité ou forcé un cas spécial dans `registry.js`, contraire à sa nature volontairement pure. Chaque dérivée porte une formule linéaire `{ base, coefficient, min }` sur une stat primaire — un seul chemin de calcul (`stats.js`), une 3ᵉ dérivée s'ajoute en JSON seulement (prouvé par un test dédié).
- **`vitesse_deplacement` reste une constante** (`VITESSE_HERO_PX_S` de la Phase 0), pas une 3ᵉ dérivée — la spec laissait le choix (« f(agilité) ou constante », §3.5). Seules `pv_max` et `cooldown_attaque_ms` sont dérivées.
- **Effets d'état interprétés par la forme des champs, pas par un switch sur l'id** (`status.js`) : un effet avec `stat` modifie une stat primaire (buff joueur ou debuff monstre, même fonction `appliquerModificateur`), un effet avec `param: "pv"` est un DoT, un effet avec `param: "vitesse_deplacement"` est un contrôle de vitesse. "Dans l'aura" est approximé par l'état d'engagement du follet (`follet.etat === 'engager'`) plutôt qu'un second calcul de distance — source de vérité unique tant qu'un seul monstre est engageable à la fois (à réévaluer en Phase 4 si plusieurs monstres doivent être dans l'aura simultanément).
- **`puzzles.json` ne contient que des instances**, pas de catalogue de "types" séparé : `levier` et `sequence` sont des interpréteurs fixes dans `puzzles.js` (comme `comportement: "melee"` pour les ennemis), les instances (positions, `ordre[]`, `flag_pose`) sont 100 % données. Une séquence supplémentaire ailleurs = JSON seulement (prouvé par un test dédié) ; un 3ᵉ *type* de puzzle demanderait du code, ce qui est cohérent avec la spec (« ajouter une 3ᵉ **instance** d'un type existant », §3.8).
- **Portes conditionnelles = extension de `scene.js`, pas un système séparé** : `scenes.json > portes[]` fait correspondre une position à `{ flag, tile_avant, tile_apres }` ; `tuileA()`/`estSolideAuPoint()` prennent un 3ᵉ paramètre optionnel `estFlagActif` (absent par défaut = comportement Phase 0 inchangé, donc aucune régression sur les tests existants). La porte de la salle 2 est donc un mur (`tile_mur`, solide) tant que `flag_grotte_sortie` n'est pas posé, et devient `tile_sortie` (traversable) dès qu'il l'est, sans recharger la scène — exactement le comportement décrit en §3.3 (« la porte apparaît »).
- **Portails = donnée `scenes.json > portails[]` avec `condition` optionnelle**, résolus par `scene.js#portailFranchi()` : une condition non remplie ne fait rien (§4 : « simple mur, aucun message »), jamais une exception. Combiné aux portes conditionnelles ci-dessus pour la sortie de la grotte.
- **Écran de choix du follet : navigation par `MOVE.x` (front montant) + confirmation `ATTACK`, y compris au tactile**, plutôt qu'un tap direct sur le sprite de chaque follet comme le décrivait littéralement la spec (§3.1 : « tactile = tap direct »). Le tactile alimente déjà `move.x` (joystick) et `attack` (bouton) via la même couche d'input que clavier/manette : ajouter un second mécanisme de hit-test tactile spécifique à cet unique écran aurait dupliqué l'abstraction existante pour un gain marginal. Peut être révisé en Phase 2+ si Xav juge le tap direct nécessaire à l'usage.
- **La séquence de la grotte (choix du follet, tutoriel de combat, déclenchement des dialogues) est un script dans `main.js` keyé par id de scène**, pas un système de "déclencheurs" généralisé — conforme à la contrainte de méthode (« aucun système généralisé avant qu'un second cas d'usage réel existe ») et au rôle de la Phase 1 (prouver chaque système une fois, §1). `dialogues.json > declencheur` reste un champ descriptif (documentation du contexte), pas encore interprété génériquement.
- **`onUnlock` de `flags.js` sert de point d'accroche à la persistance** (`initial` au constructeur + callback qui écrit dans `save.flags`), plutôt que de faire lire/écrire `save.flags` directement par `flags.js`. Le module reste pur (aucune connaissance de `save`) ; c'est `main.js` qui fournit le pont. `initial` ne repasse jamais par `set()`/`onUnlock` pour ne pas rejouer les effets de bord (ex. rouvrir un dialogue) d'une session précédente au chargement.
- **Repli sur `scene_grotte_salle_1` si `save.hero.scene` ne résout à aucune scène connue** (`main.js`, avant `entrerDansScene`) : trouvé nécessaire en testant dans un vrai navigateur — une sauvegarde IndexedDB de la session Phase 0 pointait encore vers `scene_salle_test`, retirée de `scenes.json` en Phase 1. Ce n'est pas une sauvegarde corrompue (le schéma est valide), donc `save.js#migrer` ne l'attrape pas ; un crash au chargement de scène aurait bloqué Xav dès l'ouverture. Cause racine : un renommage de contenu de catalogue n'est pas couvert par le mécanisme de migration de *schéma*. Cette classe de problème est à garder en tête pour toute Phase future qui retire un id de scène.
- **Le calcul des stats du héros (`calculerStatsHeros` dans `main.js`) tourne à chaque frame, y compris quand une UI est ouverte** — trouvé en testant en navigateur : la cinématique d'ouverture affichait « HP 0/1 » parce que le calcul vivait à l'intérieur de `mettreAJourCombat()`, elle-même sautée tant qu'une UI est ouverte (§4 : le combat est en pause sous UI). Séparé du reste du combat : seul le calcul de stats est inconditionnel, la progression du combat (dégâts, DoT, portails) reste bien gelée sous UI.
- **Layout des boutons tactiles resserré à l'origine (§2.1), repositionné en éventail** (`ui/hud_layout.js`) — même découverte en navigateur : le premier jet (boutons entre x:480-610, y:220-300) se chevauchait visuellement. Toujours provisoire/non validé par Xav, juste plus lisible.

### Livré et validé

Les 8 systèmes de la spec sont chacun prouvés par un test dédié (headless, sans framework) :

```
node tools/run_tests.js
```
→ 19 fichiers, tous verts (7 fichiers Phase 0 + menu-manette + 11 fichiers Phase 1 : `stats`, `combat`, `status_synergies`, `companion`, `puzzles`, `dialogue`, `loot`, `touch`, `save_migration_1_2`, `scene_portes`, `render_resolution`, tous datés `2026-09-15`).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

Vérification manuelle en navigateur réel (`node serveur_local.js` + Chrome, sans manette ni tactile réel pour cette session — voir « reste à faire » ci-dessous) : boot sans erreur console jusqu'à la cinématique de choix du follet ; dialogue d'introduction affiché et avancé par `ATTACK` ; les 3 follets rendus avec une forme distincte (triangle/goutte/carré, P4②) ; navigation `MOVE.x` entre les 3 puis confirmation ; follet Terre choisi → dialogue d'enthousiasme affiché avec le bon nom traduit (« Earth Wisp ») ; **PV recalculés en direct après le choix (50/58, soit `10 + 8×(5+1)` — le buff `buff_vitalite` de Terre appliqué)** ; menu manette/clavier toujours fonctionnel (ouverture par `Escape`, bascule de langue, fermeture) pendant que le jeu tourne derrière ; `INTERACT` déclenché sans erreur près du levier. Cette session a aussi trouvé et corrigé deux bugs réels via ce test manuel (voir décisions ci-dessus : repli de scène, calcul de stats sous UI) — la vérification en navigateur réel, même partielle, s'est donc avérée nécessaire au-delà des tests headless.

### Non vérifiable dans cette session (reste à faire par Xav)

- **Manette et tactile réels** : la session a testé au clavier (événements `KeyboardEvent` synthétiques) et n'a pas pu brancher une manette physique ni simuler un écran tactile réel. Les mappings (`gamepad.js`, `touch.js`) sont testés headless mais jamais exercés en conditions réelles cette fois-ci.
- **Le parcours complet de la grotte** (salle 1 → levier → salle 2 → combat → séquence des 3 leviers → porte → sortie) n'a été rejoué que partiellement (jusqu'au choix du follet + un `INTERACT`). Le combat, la mort/respawn, la séquence d'énigme et la transition de scène par portail n'ont été vérifiés qu'en tests headless, jamais en jeu réel.
- **Lisibilité de la résolution 640×360** (§9, `[OUVERT]`) : non jugée cette session, la résolution logique a seulement été vérifiée fonctionnelle (mise à l'échelle entière, letterboxing), pas son confort visuel.
- **Layout des boutons tactiles** : repositionné une fois pendant cette session (voir ci-dessus) mais jamais testé avec de vrais doigts sur un écran tactile.
- **Équilibrage du combat** (2-3 coups pour tuer le premier monstre, dégâts reçus ≤10 % des PV) : vérifié par un test automatisé qui rejoue la formule sur les vraies données, jamais en conditions de jeu réelles (rythme, lisibilité du feedback).

### Point `[OUVERT]`

Aucun nouveau point de design n'a été laissé `[OUVERT]` cette session — le seul hérité de la spec (résolution logique 640×360 vs 480×270 vs 960×540, §9 de `specs/02_grotte.md`) reste non tranché, valeur provisoire 640×360 appliquée en attendant le verdict de Xav.

### Critère de passage — reste à faire par Xav

Reprendre le parcours manuel décrit en §7 de `specs/02_grotte.md` : manette **et** tactile, cinématique → choix du follet → salle 1 (levier, sortie) → salle 2 (dialogue, monstre tué, éclats ramassés, séquence des 3 leviers trouvée sans indication) → porte → scène placeholder ; à refaire avec chacun des 3 follets pour sentir la différence des trois effets (brûlure/ralentissement/dégâts réduits), et donner un verdict sur la résolution 640×360.

### Hors scope pour cette itération

Région Maison réelle (Phase 2, la porte de la grotte mène à un placeholder vide, assumé) ; compétences/consommables/équipement/inventaire complet (slots grisés seulement) ; audio ; sprites/animations ; pathfinding ennemi et archétypes autres que `melee` ; choix dans les dialogues, PNJ ; journal de découvertes — tous conformes à `specs/02_grotte.md` §8. Décisions actées pour les phases futures (portée par équipement, respawn/malus survie, boissons/potions) consignées en §10 de la spec, non implémentées ici par construction.


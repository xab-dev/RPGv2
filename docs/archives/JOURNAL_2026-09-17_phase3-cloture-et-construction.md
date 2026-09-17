# Journal de session — Clôture Phase 3 + Construction (2026-09-17)

Ménage de journal effectué en début de session : le journal précédent (« Respawn des items au sol ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_respawn-items-au-sol.md`, `docs/archives/INDEX.md` mis à jour.

### Clôture de la Phase 3

Xav confirme en jeu que la Phase 3 (`04_maison-interieur.md`, Palier A-E) est validée : « Xav tested every point : all good. » Ceci clôt le point resté ouvert depuis les deux sessions de diagnostic du 2026-09-17 (stations/PV/jauges à 13h45, respawn des items au sol à 15h45) — la boucle 5 minutes (sortir → récolter → revenir → cuisiner/crafter → repartir) est désormais **prouvée par bot headless ET validée en jeu**. Aucun code touché pour cette partie (documentation seule) : `CLAUDE.md` (État actuel, Dette, Critère de passage) et `specs/00_ROADMAP.md` (→ v1.3.0) mis à jour pour refléter la clôture.

### Livraison de `specs/05_construction-stations.md`

Lue en entier avant tout code (précondition explicite de la fiche : "à livrer après validation en jeu de la Phase 3", confirmée ci-dessus). Palier unique, livré sans réduction de scope (pas eu besoin du repli §6 "déplacement sans rotation d'abord").

**Données** : `stations.json` gagne `placable` (bool, requis — puits `false`, table/atelier/coffre `true`, validé par `schemas.js`). `scenes.json > structure_maison` gagne `interieur` ({x:79,y:51,w:14,h:12}, le parquet portes exclues) et `couloir` ([porte ouest, porte est]), tous deux optionnels et validés par `schemas.js#validerScene`. 3 nouveaux dialogues de refus (`dlg_construction_refus_{interieur,chevauchement,couloir}`), clés FR/EN associées (menu Construction, aide du mode).

**`src/placement.js`** (nouveau, pur) : `dansRectangleTuile`, `rectanglesChevauchent`, `couloirPraticable` (BFS 4-connexe entre les 2 portes du `couloir`, réutilisée comme fonction de validation par le jeu — pas seulement un test, spec §3) et `poseValide({ empreinte, structure, autresEmpreintes, tileSize })` → `{ ok, raison }`.

**`src/structures.js`** : `resoudreEmpreinteInteractif` prend désormais un 3ᵉ paramètre `rotation` (défaut 0) ; nouvelle fonction pure `tournerEmpreinte(rect, rotation)` (composition d'un pas de 90° horaire, dérivation vérifiée équivalente à la formule fermée pour chaque quart — même convention que `ctx.rotate` dans `visuels.js#dessinerVisuel`, donc rendu et collision restent rigoureusement synchronisés) ; nouvelle `empreinteAbsoluePuzzle(puzzle, visuel, pose, tileSize)` qui factorise le calcul "centre de tuile + empreinte tournée" jusque-là dupliqué entre `scene.js` et `main.js#rectangleInteractif` — supprime cette duplication au passage (une 3ᵉ occurrence aurait été de trop).

**`src/scene.js`** : `chargerScene(registre, sceneId, overridesInteractifs = {})` accepte un 3ᵉ paramètre optionnel (rétrocompatible, tous les appels existants inchangés) et expose `scene.poseEffectiveInteractif(puzzleId)` — la position/rotation EFFECTIVE (override validé ou défaut de `puzzles.json`), calculée une fois et réutilisée par `empreintesSolides` (collision) ET par `main.js` (rendu, seuil d'INTERACT) : une station déplacée est désormais actionnable/dessinée/collisionnable à sa VRAIE position partout, jamais l'ancienne (un bug que la première version de ce refactor aurait introduit si `puzzlesAffiches`/`rectangleInteractif` avaient continué à lire `puzzle.position` brut).

**`src/main.js`** : `resoudreOverridesStations(sceneId)` résout `save.maison.stations` en overrides validés (séquentiel dans l'ordre de `scene.interactifs`, chaque rejet retombe sur la position par défaut ET participe lui-même aux chevauchements testés pour la suite — sinon deux stations sans override auraient pu se chevaucher sans être détectées). Machine à états `construction` (choix → fantôme → pose/annulation), gelée comme une UI (`uiOuverte`/`uiOuverteMaintenant()` étendus) : grille par front montant (2 loquets indépendants, même seuil que le choix du follet), rotation `SKILL_1` (§9 `[OUVERT]`, provisoire), confirmer `ATTACK` (ouvre un dialogue localisé par raison si invalide, ne confirme jamais), annuler `SKILL_3`. Confirmation persiste dans `save.maison.stations` puis recharge la scène ciblée (`chargerScene` + `trouverPositionLibrePlusProche`, réutilisés tels quels — jamais un 2ᵉ mécanisme de repoussement).

**`src/ui/menu.js`** : entrée "Construction" contextuelle — seule entrée du menu Pause dont la présence dépend de l'état du jeu (héros dans la Maison), donc seule à nécessiter que la liste focalisable soit reconstruite à CHAQUE ouverture (`construireMenuPrincipal()`) plutôt qu'une fois au chargement du module comme le reste. Écran `creerEcranListeGenerique` étendu d'un 3ᵉ paramètre optionnel `texteAide` (sous-titre d'aide, vide par défaut) pour afficher les touches du mode — jamais via `hints.js` (UI permanente, pas un indice ponctuel).

**`src/render.js`** : `dessinerScene` prend un `fantome` optionnel — silhouette translucide teintée verte/rouge (`poseValide`) + marqueur de FORME distinct (coche pleine / croix, P4② : jamais la couleur seule).

**`src/save.js`** : `VERSION_SCHEMA_COURANTE = 5`, migration `4 → 5` ajoute `maison.stations = {}` (une sauvegarde antérieure n'a jamais pu poser de station ailleurs qu'à sa position par défaut, rien à transporter).

### Testé

- `node --check` sur chaque fichier livré.
- `tests/test_construction_2026-09-17.js` (nouveau) : rotation d'empreinte pure (4 quarts = identité), `placement.js` pur (grille/chevauchement/couloir/`poseValide` sur données-jouets), puis intégration sur le VRAI orchestrateur + les vraies données : disponibilité (maison seulement, jamais dans l'embrasure), liste des stations placable (jamais le puits), grille/rotation/confirmation/INTERACT à la nouvelle position, refus chevauchement + dialogue localisé + annulation sans effet, débordement borné + couloir bloqué (unique accès à une porte), pose invalide au chargement (sauvegarde altérée, la seconde station retombe sur son défaut), et le test data-driven du §7 (une 5ᵉ station placable ajoutée en JSON de test, catalogue re-validé, apparaît dans le menu sans une ligne de code touchée).
- `tests/test_save_migration_4_5_2026-09-17.js` (nouveau) : migration 4→5, cycle écrire/relire, parité `saveNeuve()`/migration, version future refusée.
- Bump de `VERSION_SCHEMA_COURANTE` répercuté dans les tests de migration antérieurs (`test_phase1_save_migration_1_2`, `test_save_migration_3_4`) — leur propre contrat (paliers 1→2 et 3→4) reste inchangé, seule l'assertion "version courante = N" suit.
- Fixture de `test_phase3_recipes_2026-09-17.js` mise à jour (`placable` désormais requis par le schéma).
- `.closest('.menu-item')` remplacé par `.parentNode` dans `ui/menu.js` (structure DOM déjà connue, pas besoin de cette API) — le faux DOM minimal de `test_phase1_sd_menu_reset_invisible` ne l'implémentait pas.
- `node tools/run_tests.js` : **57 fichiers, tous verts** (55 hérités + les 2 nouveaux).

### Reste ouvert

Validation manette de Xav dans un vrai navigateur (jamais faite pour ce chantier) — voir Dette et `docs/CHECKLIST_visuelle.md` états 29-32. Les 2 points `[OUVERT]` provisoires de la fiche (verbe de rotation, maintien vs front montant) reportés tels quels en section `[OUVERT]` de ce fichier.

### Hors scope (explicite, cf. fiche §8)

Placement en px, redimensionnement, stations dans d'autres scènes (Poste avancé, Phase 6 — même patron, données seulement), achat/coût d'une station (D20④), effets mécaniques par station (D20⑤), déco plantable (03b), sprites.

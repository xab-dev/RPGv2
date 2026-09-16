# Journal archivé — Diagnostic accrochage des coins + arbre introuvable (2026-09-16/17)

Archivé verbatim depuis `CLAUDE.md` le 2026-09-17 (ménage de journal, avant la session `MT_jour-nuit-contraste_2026-09-16.md`).

---

## Journal de session — Diagnostic accrochage des coins + arbre introuvable (2026-09-16)

Brief complet : `SD_hitbox-angle-arbre_2026-09-16.md` (racine du dépôt). Suite directe du retour manette de Xav sur le critère de passage Phase 2 (`docs/NS_critere-passage-phase2_2026-09-16.md`) : deux symptômes à diagnostiquer (A bloquant sur le déplacement, B sur le placement d'une donnée), un état à consigner (C, cf. bloc « Critère de passage » du journal Phase 2 ci-dessus, déjà mis à jour). Ordre imposé par la fiche : B (court) → A (cœur du déplacement) → C (documentaire).

### A. Accrochage des coins en collision (hypothèse A1 confirmée)

**Hypothèse A1 confirmée par un test rouge** sur le vrai `scene.js#resoudreDeplacement`, A2/A3 écartées : le glissement axe par axe (X résolu en premier avec l'ancien y, Y résolu ensuite avec le nouveau x) fonctionne déjà correctement pour des désalignements francs (cf. `test_phase0_scene_camera`, test 2, inchangé) — le défaut ne touche que les **petits chevauchements de coin** (quelques px) près d'une ouverture d'1 tuile. Mesuré par un script de session (scratchpad, non conservé) sur la géométrie réelle (tile_size 32, hitbox héros 20×20 = rayon 10) : à un décalage de 3-4 px de l'axe d'une porte d'1 tuile, l'axe visé restait figé plusieurs frames consécutives (jusqu'à 7 dans le pire cas mesuré) avant que le glissement sur l'autre axe ne rattrape par hasard — perçu comme un accrochage net, exactement le symptôme de Xav. Un cas encore plus net a été trouvé en cours de diagnostic (absent des hypothèses de la fiche, découvert en creusant la géométrie réelle de la porte de la maison) : en mouvement **purement horizontal** (`dy=0`, ex. clavier qui tient juste une direction), le même décalage de 3px bloque l'axe **indéfiniment** — rien ne le corrige jamais tout seul puisque l'autre axe ne bouge pas non plus. C'est la forme la plus littérale de « arrêt net ».

**Correctif** dans `src/scene.js#resoudreDeplacement` : avant d'abandonner un axe bloqué, une correction de coin est tentée — si un seul des deux coins du bord testé est solide (l'autre est libre) et que le chevauchement mesuré est ≤ `TOLERANCE_COIN_PX` (nouveau seuil local, un seul endroit, commenté, **provisoire**, valeur = le tiers du rayon du héros = `largeur/6`), le héros est repoussé exactement de ce chevauchement sur l'axe perpendiculaire avant de rejouer le mouvement bloqué — sinon (mur plein : les deux coins solides) rien ne change, le blocage reste entier. Deux branches symétriques (haut/bas pour la résolution X, gauche/droite pour la résolution Y) couvrent les deux orientations de mur (horizontal et vertical — cette dernière étant le cas réel de la porte de la maison, `structures[].portes`). Aucune modification du rayon du héros ni de la largeur des portes/passages (hors scope explicite de la fiche) : la correction ne fait que lisser un quasi-alignement, jamais un vrai désalignement.

**Non-régression garantie par construction** : la position corrigée est toujours re-vérifiée par `coinsSolides` avant d'être acceptée — un mur plein ne devient jamais traversable, testé explicitement (approche diagonale d'un coin intérieur de salle, `tests/test_phase2_sd_hitbox_angle_2026-09-16.js` test 3 : invariant « jamais embarqué dans un mur » vérifié à chaque frame).

**Vérifié en navigateur réel** (orchestrateur manuel construit dans la page, mêmes modules servis, `requestAnimationFrame` neutralisé — même patron que les sessions graphiques précédentes) sur la **vraie porte ouest de la maison** (`scene_maison_exterieur`, colonne 78, rangée 57) : héros positionné 3px au-dessus de l'axe de la porte, poussée horizontale pure — avant le correctif ce cas bloque indéfiniment (vérifié par construction du code, non rejoué sans le correctif faute de pouvoir basculer à chaud) ; après correctif, le héros est réaligné exactement sur la rangée de la porte dès le premier pas et traverse sans à-coup. Capture d'écran après franchissement : scène rendue normalement (HUD, aura, décor), aucune erreur console.

### B. Premier arbre interactif hors du chemin naturel (hypothèse B2 confirmée)

**Hypothèse B2 confirmée** (B1 et B3 écartées) : le mécanisme d'interaction sur tuile-ressource fonctionne déjà correctement (le rocher, testé au même endroit du code, marchait — confirmé par Xav) et l'unique `tile_arbre` (porteur de `res_bois`) existait bien dans le layout (`data/scenes.json > scene_maison_exterieur`) — mais à la position (20,54), **2 rangées au-dessus** de la bande de chemin manuelle (rangées 56-58). La marche naturelle spawn(6,58) → porte ouest(78,57) ne passe jamais assez près (l'écart vertical dépasse `DISTANCE_INTERACT_PX=28`) : Xav a fait tout le trajet sans jamais le croiser, exactement comme rapporté, sans que rien ne soit cassé dans le code.

**Correctif, donnée seulement** : le caractère `A` déplacé chirurgicalement dans `data/scenes.json` (édition ciblée par position de caractère, pas une régénération du layout — 2 caractères changés au total) de la rangée 54 vers la rangée 57, **directement sur la bande de chemin**, même colonne (20) — un arbre planté en bord de sentier, cohérent avec « visuellement distinct des arbres de fond » déjà acquis (palier 2 de `03_grotte-polish`, silhouette dédiée). Solide comme avant : le joueur le contourne naturellement en passant à côté, ce qui suffit à le mettre à portée d'`INTERACT`.

**Test dédié réécrit** (`tests/test_phase2_chemin_critique_2026-09-16.js`) : l'ancien bloc ciblait la coordonnée `(20,54)` en dur avec un outillage d'approche dédié (contournement délibéré de la forêt pour atteindre l'arbre, peu importe sa position réelle) — remplacé par un scan générique de la scène (toute tuile avec un champ `ressource`) suivi d'une **marche directe vers la porte ouest, sans aucun outillage d'approche** : le test échouerait si une future réédition du layout replaçait l'arbre hors du chemin, protégeant ainsi le critère « sans instruction » de la spec (§3.2) dans la durée, comme demandé par la fiche.

### Livré et validé

```
node tools/run_tests.js
```
→ **43 fichiers, tous verts** (42 précédents + `test_phase2_sd_hitbox_angle`, nouveau ; `test_phase2_chemin_critique` réécrit pour le sujet B, toutes ses autres étapes inchangées et toujours vertes).

```
node --check src/scene.js tests/test_phase2_sd_hitbox_angle_2026-09-16.js tests/test_phase2_chemin_critique_2026-09-16.js
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent cette session** (`node serveur_local.js` + extension Chrome connectée) : orchestrateur manuel sur les vraies données, franchissement de la vraie porte ouest confirmé (cf. sujet A), aucune erreur console, capture d'écran après franchissement conforme (aucune régression visuelle des calques déjà en place).

Fichiers modifiés : `src/scene.js` (`resoudreDeplacement` : correction de coin), `data/scenes.json` (position de l'arbre interactif), `tests/test_phase2_chemin_critique_2026-09-16.js` (bloc arbre réécrit), `CLAUDE.md` (ce journal + verdict du critère de passage Phase 2 consigné). Fichier ajouté : `tests/test_phase2_sd_hitbox_angle_2026-09-16.js`.

**Incident de dépôt découvert et corrigé en cours de session, sans rapport avec la fiche** : `CLAUDE.md` était absent du disque en tout début de session (suppression non commitée, `git status` le donnait en `D`, alors que l'index/HEAD contenait encore une version antérieure — arrêtée à la session « Reports documentaires », sans le journal Phase 2). Un fichier `docs/CLAUDE_archives_16_09_26.md` (867 lignes, non suivi par git) contenait la version complète et à jour, identique à celle montrée en tête de cette session — probablement une copie de sauvegarde laissée par une session antérieure interrompue avant qu'elle ne réécrive `CLAUDE.md` lui-même. Restauré depuis cette archive avant d'y apporter les modifications de cette session ; l'archive n'a pas été supprimée (conservée telle quelle, à la discrétion de Xav).

### Point `[OUVERT]`

Aucun nouveau. Hérités, inchangés : durées de l'intro (`03_grotte-polish.md` §9) — sans lien avec cette session.

### Critère de passage — reste à faire par Xav

Rejouer, à la manette réelle, les deux points corrigés cette session : (1) l'arbre est maintenant planté sur le chemin, entre la sortie de la grotte et la maison — confirmer qu'il est bien rencontré sans indication ; (2) la porte de la maison et les passages étroits de la forêt en approche oblique — confirmer que l'accrochage a disparu ou est nettement réduit (la correction reste bornée par `TOLERANCE_COIN_PX`, un désalignement franc continue de nécessiter un réalignement manuel, par choix). Les deux restent également à valider par le parcours complet du critère de passage Phase 2 (bloc mis à jour plus haut dans ce fichier).

### Hors scope pour cette session

Largeur des portes/passages, rayon du héros (aucune remontée A3, non touché), tuto des touches, contraste jour/nuit, toast de ramassage, mesure de fps, tactile — tous explicitement exclus par la fiche. Les tickets futurs nommés par le verdict de Xav (`specs/04_stations-proportions-collision.md`, `specs/04_indices-commandes.md`, `docs/MT_jour-nuit-contraste_2026-09-16.md`, `docs/MT_musique-ambiance-synth_2026-09-16.md`) n'ont pas été rédigés cette session — seuls leurs noms/décisions sont consignés ici, conformément au périmètre strict de `SD_hitbox-angle-arbre_2026-09-16.md`.

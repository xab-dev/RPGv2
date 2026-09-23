# Journal — 2026-09-23 — la carte Indices

Branche `indices-2026-09-23`, un ticket, un commit (plus le ménage). Demande de Xav : une carte
« Indices » au menu principal, conditionnelle comme Construction — dans la Maison la case est à
Construction, partout ailleurs aux Indices. L'indice affiché jusqu'au Nv.15 est du code
incompréhensible (« les hiéroglyphes de Claude Code ») ; il restera à le câbler sur l'entrée de la
grotte quand l'Annexe 1 existera.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `a6a0dc0` | Journal du prologue archivé, ligne ajoutée à l'INDEX |
| Indices | `b447d6e` | `carte_indices` : seconde candidate de la case 3 de la racine, sans condition (`menu_cartes.js#resoudreCases` savait déjà faire : aucune ligne de ce fichier touchée). `src/indices.js` (pur) : `brouillerTexte` (graine = id de l'indice, blancs gardés, alphabet en données) et `entreesIndices` (filtre `visible_si` par `visibilite.js`, lisibilité par `lisible_si`). `data/indices.json` : `indices_config` (l'alphabet, PROVISOIRE) + `indice_grotte_entree` (`lisible_si` : Nv.15). Schéma : un indice qui peut être illisible exige l'alphabet. Écran `ecran_indices` dans `ui/menu.js` (maître-détail, sans bouton) ; `main.js#obtenirEntreesIndices`, conditions relues à chaque affichage par LE registre de flags. Icône `visuel_icone_menu_indices` (étoile à huit rais, façon ✻). Clés `menu.carte.indices*`, `menu.indices_*`, `lore.grotte_entree.*` — **pas** `indice.*`, que `test_d17` réserve déjà aux indices de commande. Quatre tests du menu mis au nouveau contrat (la case 3 n'est plus vide hors Maison) ; `tests/test_indices_menu`. Pixels vus sous Chrome sans fenêtre, trois profils (`tools/scenarios/indices.mjs`) : aucun carré, aucun débordement |
| Stèle | `b7c6f83` | Réponse de Xav à `Q-121` : « nous allons l'appliquer ». Nouveau type d'interactif `stele` (`puzzles.json` : `indice`, `couleur`, `armement_ms`), `stele_grotte` en tuile (21, 62) de la Région Maison. **Clairière** : `foret_procedurale.zones_exclues` + zone `clairiere_stele` (5 × 6, collée au chemin) — la forêt n'y pousse plus (`scene.js`, schéma qui refuse un type exclu sans zone). Halo `#3fb8ff` sur la pierre (elle brille la nuit). `visuel_stele` (dalle sombre, signes bleus à cœur blanc). `src/stele.js` (pur : temps, armement, particules en réserve bornée) et `ui/ecran_stele.js` (pierre, gravure en chasse fixe, lueur par passes décalées et dégradé radial — jamais `shadowBlur`, particules). `main.js` : `vueStele`, ouverte par INTERACT, fermée par B ou un toucher après l'armement, jeu gelé, MENU muet ; `indices.js#lignesBrouillees` partagé avec le menu. Deux tests mis au contrat (`test_stations_collision` compte les interactifs solides déclarés ; le socle de la stèle chevauche la dalle) ; `tests/test_stele`. 176 fichiers verts. Pixels revus sous les trois profils (`tools/scenarios/stele.mjs`) |
| Stèle, placement | *(ce commit)* | Retour de Xav (« c'est exactement l'idée », mais « non loin du chemin, sans être visible depuis le chemin (un peu plus bas) » et « un peu moins de lumière ») : la stèle descend en (21, 68), clairière de 5 × 5 en y 66-70 (trois cases de forêt sous le bas de la vue d'un héros sur le chemin), halo de rayon 64 → 40. `tests/test_stele` gagne le contrat : depuis chacune des 443 cases de chemin, avec `camera.js#calculerCamera` et la résolution logique du jeu, ni la pierre, ni le halo, ni la clairière n'entrent dans la vue. 176 fichiers verts ; captures refaites, de près et de loin |

**Prouvé par les tests** : la case contextuelle (Construction dedans, Indices dehors), le brouillage
(déterministe, silhouette, alphabet seul), la bascule au Nv.15 sans réinitialisation, le catalogue et
ses clés FR/EN, les refus au démarrage. 175 fichiers verts. **Pas encore validé par Xav** : `V-122`
(en particulier au téléphone), le texte lisible (`Q-120`), l'alphabet (`Q-121`), la stèle (`V-123`, choix par défaut dans `Q-122`).

**Au prochain ménage** : archiver ce journal.

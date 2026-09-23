# Journal — 2026-09-23 — la carte Indices

Branche `indices-2026-09-23`, un ticket, un commit (plus le ménage). Demande de Xav : une carte
« Indices » au menu principal, conditionnelle comme Construction — dans la Maison la case est à
Construction, partout ailleurs aux Indices. L'indice affiché jusqu'au Nv.15 est du code
incompréhensible (« les hiéroglyphes de Claude Code ») ; il restera à le câbler sur l'entrée de la
grotte quand l'Annexe 1 existera.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `a6a0dc0` | Journal du prologue archivé, ligne ajoutée à l'INDEX |
| Indices | *(ce commit)* | `carte_indices` : seconde candidate de la case 3 de la racine, sans condition (`menu_cartes.js#resoudreCases` savait déjà faire : aucune ligne de ce fichier touchée). `src/indices.js` (pur) : `brouillerTexte` (graine = id de l'indice, blancs gardés, alphabet en données) et `entreesIndices` (filtre `visible_si` par `visibilite.js`, lisibilité par `lisible_si`). `data/indices.json` : `indices_config` (l'alphabet, PROVISOIRE) + `indice_grotte_entree` (`lisible_si` : Nv.15). Schéma : un indice qui peut être illisible exige l'alphabet. Écran `ecran_indices` dans `ui/menu.js` (maître-détail, sans bouton) ; `main.js#obtenirEntreesIndices`, conditions relues à chaque affichage par LE registre de flags. Icône `visuel_icone_menu_indices` (étoile à huit rais, façon ✻). Clés `menu.carte.indices*`, `menu.indices_*`, `lore.grotte_entree.*` — **pas** `indice.*`, que `test_d17` réserve déjà aux indices de commande. Quatre tests du menu mis au nouveau contrat (la case 3 n'est plus vide hors Maison) ; `tests/test_indices_menu`. Pixels vus sous Chrome sans fenêtre, trois profils (`tools/scenarios/indices.mjs`) : aucun carré, aucun débordement |

**Prouvé par les tests** : la case contextuelle (Construction dedans, Indices dehors), le brouillage
(déterministe, silhouette, alphabet seul), la bascule au Nv.15 sans réinitialisation, le catalogue et
ses clés FR/EN, les refus au démarrage. 175 fichiers verts. **Pas encore validé par Xav** : `V-122`
(en particulier au téléphone), le texte lisible (`Q-120`), l'alphabet (`Q-121`).

**Au prochain ménage** : archiver ce journal.

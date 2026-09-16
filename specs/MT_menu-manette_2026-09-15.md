# RPG V2 — Micro-Ticket : navigation du menu à la manette (2026-09-15)

**Contexte** : Phase 0 livrée, test manuel de Xav. Clavier-souris : tout fonctionne (déplacement, menu, bascule de langue, fermeture). Manette : déplacement OK, ouverture du menu OK, **mais aucun moyen de sélectionner un bouton** — pas de curseur, pas de focus, aucune action possible dans le menu.

Second test de Xav, même jour : **le héros continue de bouger pendant que le menu est ouvert** (bug confirmé, à corriger ici). Le hot-swap manette → clavier (débrancher en marchant : le héros s'arrête, le clavier reprend) est **validé**.

Le critère de passage de la Phase 0 (`specs/00_ROADMAP.md`, « change de langue par le menu » avec une manette branchée) **n'est donc pas validé**. Ce ticket est le dernier bloqueur.

## Objectif

Rendre `ui/menu.js` entièrement pilotable par les verbes de la couche d'input, sans périphérique concret. Le menu doit être utilisable **au clavier seul, à la manette seule, et à la souris** — les trois, pas l'un à la place de l'autre. C'est le patron que reprendront tous les écrans d'UI futurs (inventaire, journal, réglages), donc la logique de focus doit être écrite une fois, proprement, pas bricolée dans le menu de Phase 0.

## Cible

- `src/ui/menu.js` — logique de focus + rendu de l'élément sélectionné
- `src/input/input.js` et/ou `src/main.js` — pour la priorité du menu sur le gameplay (§4 ci-dessous) ; choisir l'endroit où la couche est la plus propre, une seule fois
- **Ne pas toucher** `src/input/gamepad.js` : la croix directionnelle n'alimente pas `MOVE`, **et c'est voulu** (décision Xav 2026-09-15 : croix réservée à de futures actions secondaires)
- `tests/test_menu_navigation_2026-09-15.js` — nouveau

## Consigne précise

### 1. Mapping des verbes dans le menu (provisoire — à valider par Xav à la manette)

| Action dans le menu | Verbe | Ce que ça donne concrètement |
|---|---|---|
| Élément précédent / suivant | `MOVE` (y = -1 / +1), sur **front montant** uniquement | stick gauche haut/bas, flèches clavier — une pression = un cran, jamais de défilement continu en `held`. La croix directionnelle n'y participe pas (voir Cible) |
| Valider l'élément sélectionné | `ATTACK` (pressed) | bouton A, touche Entrée/Espace |
| Fermer le menu | `MENU` (pressed) | Start, Échap — comportement déjà existant, ne pas le casser |

Le menu ne lit **que** ces verbes via l'état abstrait d'input. Aucun `KeyboardEvent`/`Gamepad` dans `menu.js`.

Le choix `ATTACK` = valider est une convention manette (A = confirmer), pas une décision de design gameplay. Le marquer `provisoire` en commentaire, comme les autres mappings de `gamepad.js`.

### 2. Focus

- Le menu maintient un **index d'élément focalisé** (liste ordonnée des boutons : bascule de langue, exporter, importer). À l'ouverture, l'index vaut 0.
- `MOVE` vers le haut sur le premier élément → reste sur le premier (pas de boucle circulaire ; provisoire, à valider).
- `MOVE` vers le bas sur le dernier → reste sur le dernier.
- Le survol/clic souris met à jour l'index de focus (la souris et la manette ne doivent jamais afficher deux éléments sélectionnés à la fois).
- `ATTACK` déclenche exactement l'action du bouton focalisé — la même fonction que le `click` souris, pas une copie.

### 3. Rendu du focus

L'élément focalisé est identifiable **sans la couleur seule** (P4② s'applique à l'UI, pas seulement aux éléments) : bordure épaisse ou marqueur `›` devant le libellé, en plus d'un éventuel changement de fond. Le marqueur est un caractère, pas une chaîne de texte à localiser.

### 4. Priorité du menu sur le gameplay — bug confirmé

Aujourd'hui le héros continue de se déplacer quand le menu est ouvert : les verbes atteignent le gameplay et l'UI en même temps. Cause racine à établir avant de corriger (probable : la boucle de rendu applique `move` au héros sans regarder l'état du menu). Correction attendue :

- Quand une UI est ouverte, **elle consomme les verbes** ; le gameplay reçoit un état neutre (`move = {0,0}`, tous les booléens à faux). Un seul point de décision, pas un `if (menuOuvert)` dispersé dans chaque consommateur.
- `MENU` reste le seul verbe traité dans les deux états (ouvrir / fermer).
- Le principe posé ici sert à tous les écrans futurs : l'UI a toujours la priorité sur les verbes quand elle est ouverte. Le formuler en commentaire à l'endroit où c'est implémenté.

Pas de rustine du type « remettre le héros à sa position d'avant » — c'est l'input qui ne doit pas arriver, pas le déplacement qui doit être annulé.

## Contrainte stricte

- Ne touche à aucun autre fichier que ceux listés ci-dessus. Pas de HUD, pas de nouvel écran, pas de refonte de `input.js` au-delà de la priorité UI/gameplay.
- Zéro chaîne en dur : aucun nouveau texte joueur n'est attendu ; si un libellé devait apparaître, il passe par `i18n.t()` avec sa clé dans `fr.json` **et** `en.json`.
- Commentaires en français, *pourquoi* pas *quoi*.
- La logique de focus (index, précédent/suivant, bornes) doit être une fonction pure importable depuis Node, séparée du DOM — c'est ce qui est testé.

## Test de validation

**Automatisé** — `node tests/test_menu_navigation_2026-09-15.js` :
- Sur une liste de 3 éléments, index 0 : `MOVE y=+1` pressed → 1 ; encore → 2 ; encore → reste à 2. `MOVE y=-1` ×3 → 0, reste à 0.
- `MOVE y=+1` en `held` seul (sans pressed) → l'index ne change pas.
- `ATTACK` pressed → l'action de l'élément focalisé est appelée exactement une fois.
- `MENU` pressed → le menu se ferme, l'index est remis à 0 à la réouverture.
- Menu ouvert + `MOVE y=+1` held → l'état transmis au gameplay est neutre (`move = {0,0}`) ; menu fermé, le même état passe tel quel.

Puis `node tools/run_tests.js` → toute la suite reste verte, et `node --check` sur chaque fichier modifié.

**Manuel (Xav, manette, `http://localhost:8080`)** : Start → un élément est visiblement sélectionné → stick bas → la sélection descend → A sur la bascule de langue → le texte passe en EN → Start → le menu se ferme, le héros n'a pas bougé pendant que le menu était ouvert. Même parcours au clavier avec flèches + Entrée. La souris fonctionne toujours.

Ce parcours réussi = **critère de passage de la Phase 0 validé** (à consigner dans `CLAUDE.md`).

## Hors scope

- Répétition automatique en `held` (défilement continu) — inutile sur 3 éléments, à revoir avec l'inventaire.
- Navigation horizontale / grilles — Phase 1 au plus tôt.
- Remapping par le joueur (C3⑤) — non traité.
- Tactile — Phase 1.
- Tout ajout d'élément au menu.

## À la fin de la session

Dans `CLAUDE.md` : (1) le mapping retenu et son statut provisoire, (2) la cause racine du bug « héros mobile sous le menu » et le point unique où la priorité UI est implémentée, (3) tests rejoués, (4) mise à jour du bloc « Critère de passage — reste à faire par Xav » : hot-swap manette ↔ clavier **déjà validé** par Xav le 2026-09-15, il ne reste que le parcours menu ci-dessus.

Ajouter aussi dans `CLAUDE.md`, section décisions : **croix directionnelle réservée à de futures actions secondaires, n'alimente jamais `MOVE`** (décision Xav 2026-09-15 — à reporter dans la carte mentale, C3③, au prochain patch de celle-ci).

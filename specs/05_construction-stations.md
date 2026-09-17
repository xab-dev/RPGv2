# RPG V2 — SPEC : Construction — placement libre des stations dans la Maison

**Version : 1.0.1** — 2026-09-17, 17h50. Extrait de `04_maison-interieur.md` v1.0.0 (ex-palier F) en fichier autonome, à livrer **après validation en jeu de la Phase 3** (boucle 5 minutes). Décisions actées par Xav le 2026-09-17 : grille intérieure avec snap, rotation sur 4 côtés, menu Construction. Précise D20③ (placement libre dans la Maison, « première maison légère ; la vraie modularité attend le Château/Poste avancé »).

**Changelog 1.0.1** (`MT_construction-bandeau-placement_2026-09-17.md`) — précision de spec, pas nouvelle décision : le §3 v1.0.0 disait « les touches du mode sont affichées dans le menu lui-même », implémenté en gardant l'écran-liste plein écran affiché PENDANT le placement (le fantôme restait masqué derrière, housing inutilisable à l'aveugle). Le §3 signifiait « pas via `hints.js` », pas « l'écran-liste reste ouvert » — corrigé : l'écran-liste disparaît pendant le placement, remplacé par un bandeau DOM compact en filigrane (§3/§4 ci-dessous, décisions actées par Xav 17h50, jamais rouvertes).

**Pourquoi un fichier à part** : rien de la boucle de camp n'en dépend ; c'est le seul chantier de la Phase 3 qui touche à la fois le rendu (fantôme), l'input (un mode de jeu supplémentaire) et la collision (empreintes tournées) — trois zones où une régression coûte cher. Il se livre sur une base validée, pas mélangé aux systèmes.

**Contexte disponible** : `04_maison-interieur.md` (stations réelles, `stations.json`, sauvegarde v4), `04_stations-proportions-collision.md` (empreinte = boîte englobante, `resoudreEmpreinteInteractif`, `trouverPositionLibrePlusProche`, seuil au bord), `03_maison-exterieur.md` §3.4 (structure maison, parquet, deux portes), mapping manette du menu (`CLAUDE.md`, décisions 2026-09-15), `visuels.json` (accepte déjà `rotation`), `tests/test_phase2_chemin_critique_2026-09-16.js`.

---

## 1. Rôle du module

Laisser le joueur déplacer et orienter les stations de sa maison sur une grille, depuis un menu, sans jamais casser la traversée de la pièce ni la collision. Poser le patron qui servira à toute pièce future (Poste avancé) : « intérieur = rectangle de tuiles plaçables déclaré en données ».

---

## 2. Entrées / Sorties

| Fichier | Ajout | Champs |
|---|---|---|
| `stations.json` | `placable` (bool ; puits `false`, table/atelier/coffre `true`) | — |
| `scenes.json` | `structures[].interieur` = rectangle de tuiles plaçables (le parquet, portes exclues) ; `structures[].couloir` = les deux portes (points de départ/arrivée du test de traversée) | — |
| `save.js` | `schema_version: 5`, migration `4 → 5` : `maison.stations = { id: { x, y, rotation } }`, vide = positions par défaut de `scenes.json` | — |
| `locales/*.json` | menu Construction, touches du mode, messages de pose refusée (FR + EN) | — |

Rotation : entier `0..3` (quarts de tour horaires), jamais des degrés en données.

---

## 3. Comportement attendu

- **Entrée** : menu DOM « Construction » (`creerControleurMenu()`), disponible depuis `MENU` **seulement quand le héros est dans la structure maison** (sinon l'entrée n'apparaît pas). Liste des stations `placable` de cette structure, écran plein écran comme les autres écrans génériques (Craft/Coffre/Stats) — navigation `MOVE.y`, confirmer `ATTACK`, retour `SKILL_3`.
- **Mode construction** (v1.0.1, précisé par `MT_construction-bandeau-placement_2026-09-17.md`) : choisir une station dans la liste → **l'écran-liste disparaît** (transition atomique, aucun état intermédiaire) → le jeu reste gelé comme sous UI (survie, cooldowns, jour/nuit) mais **la pièce redevient visible** avec le fantôme dessus, plus un **bandeau DOM compact** en filigrane (bas d'écran, provisoire) affichant le nom de la station et les 5 verbes du mode. `MOVE` déplace le fantôme **d'une tuile par front montant** (snap, jamais en px) ; `SKILL_1` fait tourner de **90°** (§9 `[OUVERT]`, provisoire) ; `ATTACK` pose (pose invalide → jamais confirmée, dialogue localisé avec la raison, le mode reprend inchangé) ; `SKILL_3` annule la pose en cours et **retourne à la LISTE** (on enchaîne, jamais un retour au jeu nu) ; `MENU` annule la pose en cours et revient **proprement au menu Pause** (jamais superposé au placement — c'est le seul moyen de quitter complètement le mode). Une pose confirmée (`ATTACK`) retourne elle aussi à la **LISTE** (« on range toute la maison sans repasser par `MENU` »). Les touches du mode sont affichées sur ce bandeau (UI permanente, pas du gameplay → jamais via `hints.js`), glyphes résolus sur le périphérique actif quand c'est peu coûteux (sinon glyphes manette, noté en dette).
- **Validité d'une pose**, fonction pure `placement.js#poseValide(station, pose, structure, autresEmpreintes)` → `{ ok, raison }` : empreinte entièrement dans `interieur` ; aucun chevauchement avec une autre empreinte solide ; **le couloir porte ouest → porte est reste praticable** — réutiliser le test de chemin critique comme fonction de validation appelée par le jeu, pas seulement comme test. Fantôme **vert / rouge et forme distincte** (P4②, jamais la couleur seule). Une pose invalide ne se confirme pas (message localisé avec la raison).
- **Rotation** : une seule fonction tourne le rendu (`visuels.json > rotation`) **et** l'empreinte (boîte englobante permutée aux quarts impairs) — jamais deux calculs. `resoudreEmpreinteInteractif` prend la rotation en entrée.
- **Après la pose** : la station devient solide à sa nouvelle place ; le héros est repoussé s'il s'y trouve (`trouverPositionLibrePlusProche`). Le seuil d'interaction suit l'empreinte (déjà mesuré au bord).
- **Persistance** : `maison.stations` ; au chargement, une pose sauvegardée devenue invalide (données de scène changées) est remise à sa position par défaut, logué — classe « données valides mais obsolètes ».

---

## 4. Edge cases

- Station tournée dont l'empreinte déborde de l'intérieur → refusée, jamais coupée.
- Deux stations posées sur la même tuile par sauvegarde altérée → la seconde revient à sa position par défaut, logué.
- Héros debout sur la tuile visée → pose autorisée (le héros est repoussé), pas refusée.
- Le puits (non plaçable) n'apparaît jamais dans la liste, même s'il est dans le rectangle intérieur d'une future pièce.
- Sortie de la structure pendant le mode construction : impossible (jeu gelé) — mais si le mode s'ouvre alors que le héros est **dans l'embrasure**, l'entrée du menu ne doit pas apparaître (test « dans la structure » = strictement à l'intérieur du rectangle, portes exclues).

---

## 5. Structure des fichiers (ajouts)

```
src/placement.js          grille intérieure, rotation d'empreinte, poseValide, pur, testé
src/structures.js         rotation dans resoudreEmpreinteInteractif
src/main.js               mode construction (machine à états : choix → fantôme → pose/annulation)
src/ui/menu.js            + entrée Construction (contextuelle) ; v1.0.1 : bandeau DOM de placement
                          (filigrane, sans focus), transitions liste<->placement<->menu Pause
src/render.js             fantôme de pose (vert/rouge) — CHECKLIST_visuelle rejouée, états ajoutés :
                          fantôme valide, fantôme invalide, station tournée
src/save.js               v5 + migration 4 → 5
tests/test_construction_<date>.js   (grille, rotation 4 quarts, chevauchement, débordement,
                                     couloir préservé, pose invalide au chargement, puits absent)
tests/test_save_migration_4_5_<date>.js
```

---

## 6. Consignes d'autonomie

- Réutiliser : `creerControleurMenu()`, le point de décision unique « une UI est ouverte », `empreinteParDefaut`, `trouverPositionLibrePlusProche`, le chemin critique existant.
- Ne pas : poser en px ; dupliquer le calcul d'empreinte ; introduire un `KeyboardEvent`/`Gamepad` hors de `input/` ; toucher `render.js` sans rejouer la checklist.
- Si ça déborde : livrer déplacement sans rotation d'abord (palier stable), rotation ensuite.

---

## 7. Critères de validation

**Automatisé** : suite verte ; test data-driven : une 5ᵉ station `placable` en JSON de test se place sans code ; migration `4 → 5`.

**Manuel (Xav, manette)** : ouvrir Construction dans la maison (absent dehors) → déplacer l'atelier contre un mur → le tourner (4 orientations visibles, empreinte suit : on ne le traverse pas, `INTERACT` marche sur ses 4 côtés) → pose refusée si elle bouche le couloir, confirmée sinon → traverser la maison sans accrochage → fermer/rouvrir l'onglet : la station est où on l'a mise.

---

## 8. Hors scope

Placement en px, redimensionnement, stations dans d'autres scènes (Poste avancé, Phase 6 — même patron, données seulement), achat/coût d'une station (D20④), effets mécaniques par station (D20⑤), déco plantable (03b), sprites.

---

## 9. Points `[OUVERT]` (provisoire appliqué)

| Point | Provisoire | À trancher |
|---|---|---|
| **Verbe de rotation** | `SKILL_1` (contextuel au mode, qui est une UI) | Croix directionnelle (C3③ la réserve aux actions secondaires) — sans équivalent tactile/clavier évident ; ou `INTERACT` |
| **Maintien vs front montant sur `MOVE`** | Front montant seulement (une tuile par impulsion) | Répétition après 400 ms de maintien, si le déplacement d'une grande pièce devient pénible |

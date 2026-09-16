# Micro-ticket — navigation du menu à la manette

**Date :** 2026-09-15  
**Fiche(s) associée(s) :** `docs/MT_menu-manette_2026-09-15.md`

## Micro-ticket — navigation du menu à la manette (2026-09-15)

Contexte complet dans `MT_menu-manette_2026-09-15.md` (racine du dépôt). Deux bugs bloquant le critère de passage de la Phase 0 : le menu n'avait aucun focus/sélection manette, et le héros continuait de bouger quand le menu était ouvert.

### Mapping retenu (provisoire, non validé à la manette par Xav)

Même statut que les autres mappings de `gamepad.js` — provisoire jusqu'à test manuel :

| Action menu | Verbe | Détail |
|---|---|---|
| Élément précédent/suivant | `MOVE` (y), front montant uniquement | seuil `SEUIL_POUSSEE_MENU = 0.5` dans `ui/menu.js` ; la croix directionnelle n'alimente pas `MOVE` donc n'y participe pas |
| Valider l'élément focalisé | `ATTACK` (pressed) | convention manette (A = confirmer), pas une décision de gameplay |
| Fermer le menu | focaliser « Fermer » puis `ATTACK`, ou `skill_3` (pressed) | **révisé 2026-09-15** (micro-fix, retour Xav) — `MENU`/Start n'ouvre plus qu'un menu fermé (`etat.menu.pressed && !menu.estOuvert()` dans `main.js`), il ne le ferme plus ; `skill_3` réutilisé comme convention manette « B = retour » (mappé sur B dans `gamepad.js`), via l'option `verbeAnnuler` de `creerControleurMenu()` — ferme immédiatement sans passer par le focus |

Pas de boucle circulaire aux bornes de la liste (provisoire, à valider).

### Cause racine du bug « héros mobile sous le menu »

`main.js#maj()` lisait `etat.move` pour déplacer le héros sans jamais regarder si le menu était ouvert : les verbes atteignaient gameplay et UI en même temps, sans arbitrage. Corrigé par un **point de décision unique** dans `main.js#maj()` : `menuOuvert` est calculé une fois, et si vrai, le gameplay reçoit `etatNeutre(etat)` (verbes à faux, `move` à `{0,0}`) au lieu de `etat`. `etatNeutre()` vit dans `input.js` (exportée, pure, dérivée de la forme réelle de l'état plutôt que d'une liste de verbes recopiée) car c'est le module qui possède la forme de l'état — pas une duplication dans `main.js`. Aucun autre `if (menuOuvert)` ailleurs dans le code.

### Architecture de focus (réutilisable par les futurs écrans d'UI)

`ui/menu.js` expose désormais, en plus de `initialiserMenu()` (DOM) :
- `creerNavigationMenu(nbElements)` — index borné, avance sur front montant de `MOVE.y` uniquement, pure.
- `creerControleurMenu(actions, options)` — ouverture/fermeture/index/dispatch de l'action focalisée sur `ATTACK`, pure (les `actions` sont des callbacks fournis par l'appelant, jamais de DOM ici). `options.verbeAnnuler` (optionnel, ex. `'skill_3'`) ferme immédiatement sans passer par le focus — chaque futur écran d'UI choisit s'il l'active.

`initialiserMenu()` fournit à `creerControleurMenu()` des actions qui, elles, touchent le DOM (bascule FR/EN, `exporterSauvegarde()`, `.click()` sur l'input fichier — la même fonction que le clic souris, pas une copie). Le rendu du focus (bordure + marqueur `›`) est appliqué en style inline depuis `menu.js`, sans toucher `index.html` (hors périmètre du ticket).

### Tests rejoués

```
node tests/test_menu_navigation_2026-09-15.js
node tools/run_tests.js
```
→ 8 fichiers, tous verts.

```
node --check src/ui/menu.js src/input/input.js src/main.js tests/test_menu_navigation_2026-09-15.js
```
→ tous valides.

Vérification manuelle en navigateur réel (souris/clavier, sans manette branchée pour cette session) : reportée à Xav — voir bloc « Critère de passage » ci-dessus.

### Décision produit à reporter dans la carte mentale (C3③)

**Croix directionnelle réservée à de futures actions secondaires, n'alimente jamais `MOVE`** (décision Xav, 2026-09-15). `input/gamepad.js` n'a pas été touché par ce ticket — cette décision y était déjà respectée, elle n'est actée ici que pour mémoire et report dans `carte_mentale_RPG_V2_v1_3_0.md` au prochain patch.

### Hors scope (reporté)

Répétition automatique en `held` (défilement continu), navigation horizontale/grilles, remapping joueur (C3⑤), tactile, tout ajout d'élément au menu — cf. `MT_menu-manette_2026-09-15.md`.


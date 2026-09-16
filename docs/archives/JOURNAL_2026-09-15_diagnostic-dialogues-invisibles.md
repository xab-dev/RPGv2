# Journal de session — Diagnostic dialogues invisibles après le rendu net

**Date :** 2026-09-15  
**Fiche(s) associée(s) :** `docs/SD_dialogues-invisibles_2026-09-15.md`

## Journal de session — Diagnostic dialogues invisibles après le rendu net (2026-09-15)

Brief complet : `specs/SD_dialogues-invisibles_2026-09-15.md`. Suite directe du MT rendu-net : plus aucun dialogue ne s'affichait, symptôme signalé par Xav après validation du rendu net lui-même.

### Hypothèse confirmée et ligne fautive

**Aucune des hypothèses A/B/C de la fiche n'est confirmée** — même schéma que le diagnostic « blocage choix du follet » (méthode : « si vert, le dire, remonter d'un cran »). Vérifié sur le vrai code via un faux contexte 2D qui enregistre `setTransform`/`save`/`restore`/`drawImage` :
- **A réfutée** : `dessinerObscurite` encadre déjà son unique `setTransform(1,...)` d'un `ctx.save()`/`ctx.restore()` — la transform active juste avant le dessin du dialogue est bien celle de l'échelle entière `f`, jamais l'identité.
- **B réfutée** : `dessinerDialogue` écrit bien sur le même `ctx` que `dessinerScene`/`dessinerObscurite` (le canvas hors-écran de la scène), jamais un autre contexte.
- **C réfutée** : dans `main.js#dessiner()`, le dialogue est bien dessiné **après** `dessinerObscurite` (donc après la composition du voile), jamais avant.

**Cause racine réelle, trouvée en creusant au-delà des trois hypothèses** : `src/ui/dialogue_box.js` et `src/ui/hud.js#dessinerHud` (ligne de slots statique, hors tactile) lisaient tous les deux `ctx.canvas.width`/`ctx.canvas.height` pour calculer leur position — un contrat qui était correct **avant** le MT rendu-net (le canvas hors-écran faisait alors exactement 480×270, la résolution logique) mais qui a silencieusement changé de sens **sans qu'aucune ligne de ces deux fichiers ne soit touchée** : depuis `ajusterCanvasLogiquePhysique()` (posée par ce même MT dans `render.js`), `ctx.canvas.width/height` est désormais la taille **physique** (`480·f × 270·f`), alors que le dessin lui-même reste sous la transform logique->physique (`f`) encore active. Une position calculée sur la taille physique puis redessinée sous cette transform est doublement mise à l'échelle : pour `f=2` (cas réel de bureau/fenêtré, jamais `f=1`), la boîte de dialogue se retrouvait à `y≈924` px physiques sur un canvas de 540 px de haut — entièrement hors cadre, en dessous. Même défaut, même conséquence pour la ligne de 5 slots du HUD. **L'écran de choix du follet, lui, était indemne** : `main.js#dessinerEcranChoixFollet()` utilise des coordonnées logiques fixes (150/240/330, y=113), jamais `ctx.canvas.width/height` — confirmé par lecture de code et par capture en navigateur (formes visibles, curseur correct).

C'est exactement le scénario que la nouvelle règle de méthode (voir plus bas) vise à empêcher de se reproduire : un ticket qui ne touchait que `render.js` a cassé deux fichiers qu'il n'a jamais ouverts, parce que ces deux fichiers dépendaient d'un contrat implicite (« `ctx.canvas.width/height` = résolution logique ») jamais documenté comme tel.

### Correctif et test rouge → vert

`tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js`, deux sections :
1. **Méthode imposée par la fiche** : faux contexte 2D (canvas + ctx factices, aucun rendu réel produit) qui rejoue `dessinerScene` → `dessinerObscurite` → `dessinerDialogue` sur le vrai code de `render.js`/`dialogue_box.js`, et vérifie explicitement les hypothèses A/B/C — toutes trois vertes dès l'écriture (conforme au diagnostic ci-dessus, pas un bug de méthode de test).
2. **Cause racine réelle** : `dessinerDialogue` et `dessinerHud` appelés directement avec un canvas factice à `f=2` (960×540 physiques, transform `(2,0,0,2,0,0)` déjà active, comme le laisse `ajusterCanvasLogiquePhysique`) — assertion que le rectangle dessiné, une fois passé par la transform active, reste dans les bornes du canvas visible. **Rouge avant patch** (`haut=924, bas=1064, canvas.height=540` pour le dialogue) exactement conforme au symptôme.

Correctif, ligne fautive dans chacun des deux fichiers :
- `src/ui/dialogue_box.js` : `const { width: largeur, height: hauteur } = ctx.canvas;` → `const { largeur, hauteur } = RESOLUTION_LOGIQUE;` (importée de `render.js`, seule source de vérité pour ce nombre).
- `src/ui/hud.js` : `dessinerSlotsBas(ctx, { largeur: ctx.canvas.width, hauteur: ctx.canvas.height });` → `dessinerSlotsBas(ctx, RESOLUTION_LOGIQUE);`.

`node tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js` → vert après correctif. `grep -rn "ctx.canvas.width\|ctx.canvas.height\|ctx.canvas;" src/` confirme qu'aucun autre fichier de `/src` (hors `render.js`, dont l'usage est légitime — c'est lui qui *pose* ces dimensions) ne reproduit ce défaut.

### Vérification en navigateur réel — les 6 états de `specs/CHECKLIST_visuelle.md`

**Effectuée cette session, extension Chrome connectée.** Point notable d'environnement (nouveau, à garder en tête pour les sessions futures) : la boucle `requestAnimationFrame` du jeu ne tournait **pas du tout** au premier chargement de la page dans cet environnement (`document.hidden === true` bien que `document.hasFocus() === true` — compteur de test à 0 après plusieurs secondes d'attente), un cran plus sévère que le simple « throttling » déjà noté aux sessions précédentes. Contournement propre à cette session (jamais touché le code du jeu) : `window.requestAnimationFrame` patché en `setTimeout(cb, 16)` puis réimport dynamique de `src/main.js` pour redémarrer une boucle qui tourne réellement — l'instance déjà stalled reste inerte à côté, sans effet observé sur les captures. Symptôme additionnel purement outillage : les actions `computer.key` (down+up atomique) arrivaient parfois trop vite pour être vues comme un front montant par la boucle de polling — contourné en dispatchant `keydown`/`keyup` séparément avec un délai explicite entre les deux, comme piloté par un humain tenant une touche.

Les 6 états capturés, tous conformes :
1. **Scène seule** — jeu en cours (post-reset), aucune UI ouverte : tuiles, décor, héros/follet nets, ligne de 5 slots statique bien visible en bas au centre, dans le cadre.
2. **Dialogue ouvert** — capturé à 4 reprises (narration du choix du follet, ligne d'enthousiasme du follet choisi, 2 lignes du tutoriel de combat à l'entrée de la salle 2) : boîte toujours dans le tiers bas de l'écran, texte lisible, locuteur nommé (`narrateur`, `Follet d'Eau`) — **le bug ciblé par cette session est résolu**.
3. **Écran de choix du follet** — triangle (Feu, rouge)/goutte (Eau, bleu)/carré (Terre, or) tous visibles, curseur (cercle blanc) correctement positionné sur l'élément focalisé.
4. **Menu DOM ouvert** — menu principal (5 entrées, focus visible) puis sous-écran de confirmation du reset (« Effacer la partie ? », focus par défaut sur Non) : les deux plein écran, jamais visibles ensemble — confirme au passage, en conditions réelles cette fois, le correctif du diagnostic `SD_menu-reset-invisible` (non vérifié en navigateur à l'époque faute d'extension connectée).
5. **Aura + étiquette ennemi** — cercle fin translucide autour du follet engagé, nom du monstre (« Rampant des cavernes ») affiché sous son sprite, tous deux dans le cadre.
6. **HUD tactile actif** — après un `touchstart` simulé sur le canvas visible : boutons d'action + zone de joystick affichés, ligne de slots statique disparue — jamais les deux à la fois, conforme au contrat de `SD_ui-lisibilite`.

Fichiers modifiés : `src/ui/dialogue_box.js`, `src/ui/hud.js`. Fichiers ajoutés : `tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js`, `specs/CHECKLIST_visuelle.md`.

### Tests rejoués

```
node tools/run_tests.js
```
→ 27 fichiers, tous verts (26 précédents + `test_phase1_sd_dialogues_invisibles`, nouveau).

```
node --check src/ui/dialogue_box.js src/ui/hud.js src/render.js tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js
```
→ tous valides.

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : clignements/orbite pré-choix (§3.1 étapes 1-2, diagnostic « blocage choix du follet »).

### Nouvelle règle de méthode

Consignée dans « Contraintes de méthode non négociables » ci-dessus : toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure ; tout ticket touchant `render.js`/`ui/hud.js`/`ui/dialogue_box.js`/`main.js#dessiner` rejoue `specs/CHECKLIST_visuelle.md` (capture par état) avant de conclure — créée cette session avec les 6 états ci-dessus, à enrichir à chaque nouveau calque.

### Critère de passage — reste à faire par Xav

Le bug ciblé par cette session (dialogues invisibles) est corrigé et vérifié en navigateur réel — plus rien de bloquant connu sur ce point précis. Reprendre malgré tout le parcours manuel complet de `specs/02_grotte.md` §7 **à la manette et au tactile réels** (toujours bloquant, jamais testé en conditions réelles par aucune session) : en particulier, confirmer que les dialogues restent lisibles à toutes les tailles d'écran/DPR réels, pas seulement aux `f` simulés cette session.

### Hors scope pour cette session

Contenu des dialogues, clignements/orbite pré-choix (`[OUVERT]` hérité), style graphique, Phase 2 — tous explicitement exclus par la fiche.


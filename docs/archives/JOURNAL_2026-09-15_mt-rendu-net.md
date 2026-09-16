# Journal de session — Micro-ticket rendu net à résolution physique

**Date :** 2026-09-15  
**Fiche(s) associée(s) :** `docs/MT_rendu-net_2026-09-15.md`

## Journal de session — Micro-ticket rendu net à résolution physique (2026-09-15)

Brief complet : `specs/MT_rendu-net_2026-09-15.md`. Décision produit de Xav : le jeu n'est pas en pixel art (style « assemblage moderne » de la V1 — géométrie, emoji, superpositions, jeux de lumière), donc la pipeline de rendu pixel-art-net posée en Phase 1 (canvas hors-écran 480×270 mis à l'échelle par facteur entier, `image-rendering: pixelated`) pixélisait à tort tout — texte du HUD compris. Seul `src/render.js` (+ son test + une ligne de `specs/02_grotte.md` §2.2) pouvait être touché ; `main.js`, `hud.js`, `hud_layout.js`, `camera.js`, `scene.js` et les données JSON étaient explicitement hors limites.

### Décisions prises et pourquoi

- **Le cadrage logique (480×270) ne change pas** — seule la résolution du canvas hors-écran change. Le canvas de scène passe de 480×270 pixels logiques à `480·f × 270·f` pixels **physiques** (f = facteur entier courant), avec `ctx.setTransform(f,0,0,f,0,0)` posé sans condition à chaque frame par une nouvelle fonction interne `ajusterCanvasLogiquePhysique()`, appelée en tout premier dans `dessinerScene`. Le transform reste actif sur ce même contexte pour tout le reste de la frame — `dessinerObscurite`, puis (sans toucher un seul de leurs fichiers) `dessinerHud`, `dessinerDialogue`, l'écran de choix du follet et l'aura dessinés inline dans `main.js` — qui continuent tous d'écrire en unités logiques (480×270) et sortent nets à la résolution physique. C'est le seul moyen de satisfaire la contrainte « ne toucher que render.js » : le point de couture est un seul `setTransform` par frame, jamais un changement des appelants.
- **Le calque du voile d'obscurité doit vivre à la même taille physique et avec le même transform** que la scène — sinon ses propres dégradés/arcs resteraient dessinés à 480×270 logiques puis étirés en blocs par le `drawImage` de composition, réintroduisant exactement le problème qu'on corrige. Son échelle est **relue** depuis `ctx.canvas.width / RESOLUTION_LOGIQUE.largeur` (le canvas que `dessinerScene` vient de dimensionner un instant plus tôt dans la même frame) plutôt que recalculée indépendamment — une seule définition du facteur par frame (exigence explicite du ticket, point 5), et une garantie par construction plutôt que par discipline.
- **Le `drawImage` qui compose le voile sur la scène doit repasser en repère identité le temps de cet unique appel** (`ctx.save()` / `setTransform(1,0,0,1,0,0)` / `drawImage` / `ctx.restore()`) : le calque voile est déjà en pixels physiques, donc le composer sous le transform `(f,f)` encore actif l'aurait doublement mis à l'échelle et n'en aurait affiché qu'une fraction dans un coin. La teinte chaude du follet, dessinée juste après sur `ctx` (repère logique restauré par le `restore()`), n'a pas eu besoin de changer.
- **Canvas visible : buffer en pixels physiques (`largeurCSS × devicePixelRatio`), boîte affichée en pixels CSS via `style.width/height`** — recalculé sans condition à chaque frame dans `presenter()` à partir de `window.innerWidth/innerHeight/devicePixelRatio`, jamais de `main.js`. C'est le point qui répare le cas mobile décrit par le ticket (téléphone 360 px CSS de large à DPR 3 : le calcul en CSS bornait le facteur à 1 sur un écran qui permet ×2 réel) — vérifié en navigateur réel cette session (voir plus bas). `main.js` garde son propre écouteur `resize` (devenu inoffensif : `presenter()` réécrit `canvas.width` à la bonne valeur physique dès la frame suivante, avant tout `drawImage`, donc la valeur intermédiaire posée par `main.js` n'est jamais peinte à l'écran) — ne pas le supprimer, `main.js` était hors scope.
- **`versCoordonneesLogiques` convertit `clientX`/`clientY` (pixels CSS, contrat natif des événements souris/tactiles) en pixels physiques via le DPR avant d'appliquer le rectangle de présentation** (désormais lui aussi en pixels physiques) — sans changer sa signature à 3 arguments (`main.js` l'appelle telle quelle, hors scope). Le DPR est lu par une seule fonction privée `obtenirDpr()`, utilisée à la fois ici et dans `presenter()`/`ajusterCanvasLogiquePhysique()` : point unique, jamais deux calculs qui pourraient diverger (point 5 du ticket).
- **`imageSmoothingEnabled = false` retiré de `presenter()`** : il n'y a plus de mise à l'échelle à l'étape de composition finale (le canvas logique est déjà à la résolution physique exacte du rectangle de présentation), donc plus rien à (dés)activer — commenté pourquoi plutôt que supprimé en silence.
- **Bug latent corrigé en passant** : `dessinerScene` lisait `const { largeur, hauteur } = ctx.canvas` — `canvas` n'a jamais eu de propriétés `largeur`/`hauteur` (seulement `width`/`height`), donc le `clearRect` qui suivait ne faisait rien depuis la Phase 1, sans conséquence visible (les tuiles recouvrent tout l'écran chaque frame). Remplacé par un `clearRect` en unités logiques (cohérent avec le nouveau repère) puisque la ligne devait de toute façon être réécrite pour le redimensionnement physique — pas une correction hors scope, la même ligne était déjà à toucher.

### Livré et validé

```
node tools/run_tests.js
```
→ 26 fichiers, tous verts — `test_phase1_render_resolution` étendu d'un cas DPR (360×640 CSS à DPR 3 → f=2, rectangle 960×540 physique à l'offset attendu, aller-retour `versCoordonneesLogiques` exact), simulé via un faux `global.window` en Node (retiré après coup, aucune contamination des autres tests du fichier).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent cette session** (extension Chrome connectée, contrairement à la session précédente) — au-delà des tests headless, contrainte de méthode oblige (le rendu canvas n'est jamais exercé en headless) :
- Sauvegarde IndexedDB existante rechargée (salle 2, follet Eau) : scène, halo, HUD, aura tous rendus sans erreur console, texte du HUD (`46/50`) et bords des cercles héros/follet nettement anti-crénelés au zoom (plus de blocs), à DPR desktop normal (1) comme après redimensionnement de fenêtre.
- DPR simulé à 3 via `Object.defineProperty(window, 'devicePixelRatio', ...)` + fenêtre redimensionnée à ~519×649 CSS : confirmé par lecture directe du DOM que `canvas#jeu.width` = 1557 (= 519×3), `.height` = 1947 (= 649×3), `.style.width` = `"519px"`, `.style.height` = `"649px"` — exactement le contrat du point 4 du ticket. Scène toujours rendue correctement à l'échelle entière recalculée (f=3 dans ce cas), aucune erreur console.
- **Note d'environnement, pas un bug du jeu** : après capture d'écran dans cet état, `window.innerWidth`/`innerHeight` ont été observés à 1920×935 alors que la fenêtre réelle (`outerWidth/outerHeight`) restait à ~535×800 — artefact du mécanisme d'émulation de métriques de l'outil d'automatisation (probablement un reset de viewport CDP déclenché par la capture), pas un comportement du code : `presenter()`/`ajusterCanvasLogiquePhysique()` ont simplement suivi fidèlement les nouvelles valeurs de `window`, ce qui est le comportement voulu. Même classe d'artefact que le throttling d'onglet cachée déjà rencontré aux diagnostics précédents.
- **Non testé, comme à chaque session** : manette physique et DPR réel d'un vrai téléphone (seule une émulation JS de `devicePixelRatio` a pu être faite depuis cet environnement).

Fichiers modifiés : `src/render.js` (voir décisions ci-dessus), `tests/test_phase1_render_resolution_2026-09-15.js` (cas DPR ajouté), `specs/02_grotte.md` (§2.2, une ligne : décision « pas pixel art » consignée).

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : clignements/orbite pré-choix (§3.1 étapes 1-2, diagnostic « blocage choix du follet »).

### Critère de passage — reste à faire par Xav

Reprendre le test de validation manuel de la fiche (`specs/MT_rendu-net_2026-09-15.md`, section « Test de validation ») sur du matériel réel — bloquant, jamais possible depuis un environnement d'automatisation : plein écran 1080p (texte et cercles nets, cadrage identique à avant), fenêtré à ×2, et surtout **téléphone réel** (Chrome Android via `http://<ip-pc>:8080`) pour confirmer que le jeu remplit la largeur avec `f ≥ 2` et qu'un tap au centre du bouton attaque déclenche bien `attack` — le point que cette session n'a pu que simuler en JS, jamais avec un vrai DPR ni un vrai doigt.

### Hors scope pour cette session

Sprites/assets graphiques, style visuel des salles, toit de la Maison (Phase 2), HUD, obscurité (au-delà de son calque déjà existant), tactile (au-delà de la conversion DPR du point 5), échelle fractionnaire, Phase 7 — tous explicitement exclus par la fiche.


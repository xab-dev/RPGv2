# Checklist visuelle — vérification en navigateur réel

Créée par le diagnostic `SD_dialogues-invisibles_2026-09-15.md`, suite à une
régression (boîte de dialogue + ligne de slots du HUD invisibles) introduite
par un ticket qui n'avait pourtant touché que `render.js`, en apparence sans
rapport avec `dialogue_box.js`/`hud.js`. Cause : ces deux fichiers lisaient
`ctx.canvas.width/height` pour se positionner, un contrat qui a changé de
sens (logique -> physique) sans qu'aucun de leurs appelants ne change une
ligne — rien dans les tests headless (qui n'exercent jamais le rendu canvas,
par contrainte de méthode) ne pouvait l'attraper.

**Règle** (consignée dans `CLAUDE.md`, contraintes de méthode) : tout ticket
qui touche `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou
`main.js#dessiner()` rejoue cette checklist avec une capture par état avant
de conclure — même quand le ticket prétend ne toucher qu'un seul de ces
fichiers en isolation. Liste à enrichir à chaque nouveau calque de rendu
ajouté à `dessiner()`.

## États à capturer

1. **Scène seule** — jeu en cours, aucune UI ouverte (ni menu, ni dialogue,
   ni écran de choix). Vérifier : tuiles, décor, héros, follet visibles et
   nets, ligne de 5 slots statique en bas au centre (hors tactile).
2. **Dialogue ouvert** — une ligne de dialogue affichée par-dessus la scène.
   Vérifier : boîte dans le tiers bas de l'écran (pas hors cadre), texte
   lisible, locuteur nommé.
3. **Écran de choix du follet** — les 3 formes (triangle/goutte/carré) +
   curseur sur l'élément focalisé. Vérifier : formes centrées dans la moitié
   supérieure de l'écran, pas hors cadre.
4. **Menu DOM ouvert** — menu principal, puis le sous-écran de confirmation
   du reset. Vérifier : fond plein écran opaque, focus visible, un seul des
   deux écrans affiché à la fois.
5. **Aura + étiquette ennemi** — un monstre à proximité du follet engagé.
   Vérifier : cercle fin translucide (aura) autour du follet, nom du monstre
   sous son sprite, tous deux à l'intérieur du cadre.
6. **HUD tactile actif** — après un `touchstart` simulé. Vérifier : boutons
   d'action + joystick affichés, ligne de slots statique disparue (jamais
   les deux à la fois).
7. **Anneau d'attaque en flash** (03_grotte-polish, palier 1) — juste après
   un `ATTACK` effectif (hors cooldown). Vérifier : donut translucide blanc
   centré sur le héros, rayon cohérent avec la portée de l'arme, disparu
   après `FLASH_ATTAQUE_MS` (décroissance visible en alpha entre-temps).
8. **Monstre touché + barre de PV** (idem) — juste après un coup reçu par le
   monstre (auto-attaque ou tick de DoT). Vérifier : le monstre blanchit
   pendant `FLASH_TOUCHE_MS` (revient à sa couleur normale ensuite), une
   barre de PV sombre + rouge apparaît au-dessus de son étiquette dès qu'il
   est "actif" (engagé ou déjà touché), jamais sur un monstre inerte à
   distance. Piège connu : le follet engagé se colle exactement à la
   position du monstre (`companion.js`, état `engager`) et peut donc le
   recouvrir entièrement à l'écran — ce n'est pas un bug de ce calque, juste
   une conséquence du chevauchement des deux sprites.
9. **Marqueur ▼ de dialogue armé** (idem) — une ligne de dialogue affichée
   depuis plus de `DELAI_ARMEMENT_DIALOGUE_MS`. Vérifier : petit triangle
   plein en bas à droite de la boîte, absent tant que la ligne est encore en
   cours de machine à écrire ou pas encore armée.
10. **Levier on/off** (03_grotte-polish, palier 2 — catalogue visuel) — un
    levier avant et après activation. Vérifier : silhouette pole + témoin
    visible (jamais invisible comme avant ce palier), témoin gris par défaut,
    jaune (`COULEUR_LEVIER_ACTIF`) une fois actif — jamais les deux couleurs
    en même temps.
11. **Monstre au repos** (idem) — un monstre non engagé, non touché, à
    distance. Vérifier : silhouette losange distincte (facette claire +
    ombre portée), plus un simple cercle violet uni — remplace l'ancien
    rendu générique de la Phase 1.
12. **Faisceaux** (03_grotte-polish, palier 3 — polish des salles) — 2-3
    lumières `type: "faisceau"` par salle de la grotte. Vérifier : cône
    atmosphérique pâle tombant du haut de la scène, additif (n'assombrit
    jamais, ne perce jamais le voile comme un halo — le sol dessous reste
    dans l'obscurité de la scène), jamais un percement franc.
13. **Décor** (idem) — herbe/flaque/rochers d'une salle de la grotte.
    Vérifier : silhouettes distinctes (pas un simple carré plein comme
    avant le catalogue visuel), discrètes dans l'obscurité hors halo/
    faisceau (comportement voulu, pas un défaut), tuiles de sol/mur avec
    une légère variation de teinte tuile à tuile (jamais un damier régulier
    — si un damier apparaît, vérifier `decor.js#couleurTuile` avant de
    conclure à un artefact de capture).
14. **Héros neutre puis teinté** (idem) — avant le choix du follet, puis
    après. Vérifier : gris moyen avec un fin contour clair (lisible même
    dans la pénombre) avant le choix ; teinté à la couleur du compagnon
    choisi ensuite (jamais les deux en même temps, jamais une 2ᵉ
    silhouette).
15. **Aura pointillée** (idem) — follet engagé ou en suivi. Vérifier :
    trait fin en pointillés autour du follet, alpha réduit — remplace le
    cercle plein épais d'avant ce palier.

16. **Intro — paupières** (03_grotte-polish, palier 4) — nouvelle partie,
    entrée en salle 1, avant tout choix. Vérifier : voile noir plein écran
    percé d'une ouverture elliptique à bord dégradé (jamais un contour net),
    qui s'ouvre puis se referme 3 fois (clignements), scène visible en
    dessous seulement au travers du trou (obscurité de la scène + halo
    d'entrée seul, jamais un flash blanc plein écran).
17. **Intro — convergence des follets** (idem) — juste après les
    clignements. Vérifier : les 3 formes (triangle/goutte/carré) apparaissent
    depuis les bords de l'écran, lévitent (léger mouvement vertical continu)
    et convergent vers les 3 positions de l'écran de choix, sans paupières
    par-dessus (grand ouvert). Aucun input (clavier/manette) ne doit avoir
    d'effet avant la bulle de choix (étape suivante, écran existant).
18. **Intro — départ des follets non élus** (idem) — juste après la
    confirmation du choix. Vérifier : les 2 follets non choisis repartent
    vers les bords de l'écran en s'éteignant (alpha décroissant), pendant que
    le vrai follet (l'élu) apparaît près du héros et que le dialogue
    d'enthousiasme s'ouvre — jamais l'élu redessiné en double (une seule
    silhouette pour lui, la vraie).

Note (palier 2) : l'état 3 (écran de choix du follet) et l'icône follet du
HUD (état 1) passent désormais par `dessinerVisuel`, comme la scène — les
mêmes silhouettes doivent être visuellement identiques (juste à une échelle
différente) entre les trois emplacements.

## Méthode

`node serveur_local.js`, ouvrir `http://localhost:8080`, extension Chrome
connectée. Provoquer chaque état (clavier/manette/tactile simulé selon
disponibilité de l'outil) et capturer un écran par état. En environnement
d'automatisation, `document.hidden` peut rester vrai même onglet actif : la
boucle `requestAnimationFrame` du jeu peut alors ne jamais tourner (artefact
documenté depuis la Phase 0) — si un état ne réagit à aucune entrée,
vérifier `window.__rafCount` (compteur de test) avant de conclure à un bug.

## Dernière vérification

2026-09-15 (diagnostic `SD_dialogues-invisibles`) : les 6 états ont été
capturés en navigateur réel après correctif — tous conformes (voir
`CLAUDE.md`, journal de session correspondant).

2026-09-16 (`03_grotte-polish`, palier 1 — feedback de combat + anti-spam
dialogue) : états 7/8/9 ajoutés et capturés en navigateur réel, extension
Chrome connectée. Nouvel artefact d'outillage documenté dans `CLAUDE.md` :
`requestAnimationFrame` patché en `setTimeout` restait lui-même throttlé
(onglet non visible pour l'automatisation) — contournement par un ticker en
Web Worker, puis par un pilotage image-par-image manuel (`__stepFrame`) pour
figer un état qui ne dure normalement que 80-120 ms, impossible à attraper
via une capture d'écran asynchrone sinon. Les 9 états sont conformes.

2026-09-16 (`03_grotte-polish`, palier 2 — catalogue visuel `visuels.json` +
`dessinerVisuel`) : états 10/11 ajoutés, les 11 états capturés en navigateur
réel (pilotage manuel image par image directement, sans repasser par le
Web Worker). Conformes : follets (triangle/goutte/carré, avec facette
lumineuse) identiques en scène/HUD/écran de choix ; monstre en losange avec
ombre et facette ; leviers visibles pour la première fois (gris → jaune à
l'activation) ; flash blanc + barre de PV du palier 1 toujours corrects avec
le nouveau moteur de silhouettes. Un seul écran totalement noir capturé une
fois par accident au milieu d'une séquence d'attaque, jamais reproduit sur
les frames suivantes ni sur une nouvelle tentative — probablement un artefact
de capture (aucune erreur console, aucune exception synchrone à l'appel de
`__stepFrame` qui a suivi), signalé ici pour mémoire plutôt que creusé
davantage.

2026-09-16 (`03_grotte-polish`, palier 3 — polish des salles : faisceaux,
décor, teinte du héros, aura pointillée, calque statique tuiles+décor) :
états 12/13/14/15 ajoutés et capturés en navigateur réel, pilotage manuel
image par image (patch `requestAnimationFrame` + réimport de `src/main.js`,
même technique que les paliers 1/2). Conformes : faisceaux visibles en
salle 1 et 2 (cônes pâles tombant du plafond, jamais un percement du voile) ;
décor (herbe/flaque/rochers) présent aux positions générées, discret hors
lumière (comportement voulu) ; tuiles avec variation de teinte confirmée
**programmatiquement** (`decor.js#couleurTuile` sur la grille réelle,
valeurs distinctes non répétitives) après qu'une première impression de
damier régulier sur une capture JPEG s'est avérée un artefact de
compression (deltas de teinte trop fins, ~4 %, pour survivre à la
compression à ce niveau de zoom) — pas un bug, vérifié en isolant la
fonction pure hors rendu ; héros gris neutre + contour clair visible avant
le choix du follet, teinté bleu (Eau) après ; aura du follet en pointillés
confirmée ; anneau d'attaque toujours correct avec le nouveau calque
statique tuiles+décor (§3.4) composé par `drawImage` avant les entités.
Cas limite vérifié séparément (script Node, pas dans le navigateur) : le
calque statique sur la scène placeholder (plus petite que le viewport,
caméra centrée négative) et l'invalidation du cache sur bascule de la porte
`flag_grotte_sortie` — aucune exception, transform toujours restaurée.
Un nouvel épisode de l'artefact "écran totalement noir" déjà documenté au
palier 2 (capture ponctuelle, jamais reproduit, aucune erreur console) a de
nouveau été rencontré et écarté de la même façon.

2026-09-16 (`03_grotte-polish`, palier 4 — intro cinématique) : états 16/17/18
ajoutés et vérifiés en navigateur réel. **Nouvel artefact d'outillage
significatif, à garder en tête pour les sessions futures** : l'onglet
piloté par l'extension Chrome exécute `demarrerJeu()` automatiquement au
chargement de `index.html` (comme en jeu réel) — construire un second
orchestrateur manuel dans la même page (patron des sessions précédentes,
nécessaire ici pour piloter précisément le temps de l'intro sans attendre
plusieurs secondes réelles) fait donc tourner DEUX instances qui dessinent
sur le même canvas visible. Tant que `window.requestAnimationFrame` n'est pas
neutralisé, l'instance automatique (page réelle, temps réel, sa propre
sauvegarde IndexedDB) continue de peindre par-dessus l'instance manuelle par
intermittence — a produit plusieurs captures d'écran trompeuses (un état de
clignement "grand ouvert" capturé alors que l'état interne réel de
l'orchestrateur manuel était "fermé/noir", confirmé par une lecture directe
de pixel via `getImageData` juste après l'appel à `dessiner()`, dans le même
script, sans round-trip d'outil entre les deux). Cause racine confirmée :
`document.hidden` reste vrai dans cet environnement (onglet non focalisé),
donc `requestAnimationFrame` de l'instance automatique est throttlé plutôt
que jamais déclenché — assez rare pour ne pas se voir sur un test isolé,
assez fréquent pour polluer une session de plusieurs minutes. Corrigé pour le
reste de la session par `window.requestAnimationFrame = () => 0` (gèle
l'instance automatique, y compris déjà en vol, puisque sa boucle relit la
référence globale à chaque frame) avant de reconstruire l'orchestrateur
manuel. **Leçon méthodologique pour la prochaine session graphique** : ne
jamais faire confiance à un `computer.screenshot` isolé quand une vérification
d'état est possible par lecture directe de pixel (`getImageData`) dans le
MÊME appel `javascript_tool` que le `dessiner()` vérifié — plus fiable et
immédiat que d'attendre un repaint/capture CDP, qui peut aussi occasionnellement
timeout ou renvoyer une frame obsolète sur un onglet en arrière-plan (2
occurrences cette session, toutes deux résolues par une nouvelle tentative).
Une fois l'instance automatique neutralisée, tous les états ont été confirmés
par lecture de pixel ET par capture d'écran, cohérents entre eux : paupières
fermées au tout début (pixel noir), grand ouvertes au pic d'un clignement
(scène visible), refermées dans le creux entre deux clignements, follets
(triangle rouge/goutte bleue/carré doré) apparus aux bords de l'écran puis
convergés en vol vers les 3 positions de l'écran de choix (capture à
mi-parcours : le follet Feu déjà arrivé, Eau et Terre encore en approche),
handoff sans saut visuel vers l'écran de choix existant (les follets
atterrissent exactement à leurs positions déjà connues), confirmation ->
follet réel affiché + dialogue d'enthousiasme + aura pointillée + héros
teinté (aucune régression du palier 3), départ des 2 follets non élus
vérifié par état (`obtenirDepart()` non nul puis `null` à la fin) — la
fenêtre precise du fondu n'a pas pu être recapturée visuellement après coup
(machine à états non rejouable en arrière), acceptée comme preuve suffisante
au vu de la vérification programmatique déjà faite en headless
(`tests/test_phase1b_intro_2026-09-16.js`, §3-4). Aucune erreur console sur
toute la session.

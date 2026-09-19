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

19. **Grande carte — forêt/chemin/ressources** (03_maison-exterieur, palier
    A/B) — Région Maison, loin de toute structure. Vérifier : fond de forêt
    procédural (silhouettes d'arbre répétées, densité visible mais pas
    étouffante), chemin manuel bien distinct (teinte tan/beige) serpentant
    dedans, le premier arbre/rocher interactifs visuellement identiques aux
    arbres de fond (même silhouette — seule l'interaction les distingue),
    caméra qui suit sans à-coup en pannant sur une carte bien plus grande que
    le viewport (calque statique fenêtré, §2.2).
20. **Toit à mi-fondu** (palier D) — approche progressive de la maison.
    Vérifier : le toit (aplat brun) devient progressivement transparent à
    mesure qu'on approche, jamais un saut net ; l'intérieur (sol parquet,
    murs) apparaît en dessous pendant le fondu, jamais un flash ; le toit
    redevient opaque en s'éloignant.
21. **Objets au sol + station placeholder** (palier B/C/D ; échelle/collision
    ajoutées le 2026-09-17, `specs/04_stations-proportions-collision.md`) —
    une branche/un caillou/un fruit visibles au sol (silhouettes distinctes,
    ancre centre), un puits/une table/un coffre/un atelier visibles
    (silhouettes distinctes, ancre bas — **piège trouvé en 2026-09-16** : ces
    stations vivent dans `scene.interactifs` comme les leviers, un filtre qui
    ne gardait que `type === 'levier'` les rendait invisibles bien
    qu'interactives ; corrigé, à revérifier si ce filtre est retouché).
    **Nouveau critère (2026-09-17)** : les 4 stations doivent apparaître
    nettement plus grandes que le héros (échelle ×2,1, provisoire — verdict
    de Xav sur le ressenti), on ne les traverse plus (on glisse le long comme
    un mur), `INTERACT` ("pas encore") s'ouvre en s'approchant de n'importe
    quel côté de chacune, la traversée de la maison (porte ouest → table/
    coffre/atelier → porte est) reste possible sans accrochage.
22. **Cycle jour/nuit** (palier E) — heure forcée à la nuit. Vérifier : toute
    la scène s'assombrit (même mécanisme que l'obscurité de la grotte),
    seules la lumière du follet (et la fenêtre éclairée de la maison, si à
    portée) restent visibles, transition progressive (jamais un saut net
    jour/nuit).
23. **Menu — Musique/Poche** (§3.3/§3.6) — Vérifier : entrée "Musique : Oui/
    Non" bascule au focus+ATTACK ; entrée "Poche" ouvre un écran plein écran
    listant `nom × quantité` pour chaque item possédé (ou un message "vide"),
    jamais visible en même temps que le menu principal ou l'écran de
    confirmation du reset, B/Fermer y ramène.

24. **Indice de commande** (specs/04_indices-commandes.md) — nouvelle partie,
    à la prise de contrôle après l'intro (MOVE), à portée du levier de la
    salle 1 avant tout appui (INTERACT), au premier monstre engagé en salle 2
    (ATTACK). Vérifier : bannière glyphe + mot centrée sous le cartouche PV,
    fondu bref en entrée/sortie (jamais un saut net), disparaît à l'appui du
    verbe ou après ~2,5s, **jamais deux fois** pour un même verbe sur la même
    partie, **rien** sur les 3 leviers de la salle 2 (déjà montré) ; passer
    manette -> clavier pendant qu'un indice est affiché doit changer le
    glyphe affiché sans le refermer.

25. **Jauges faim/soif + niveau/XP** (Palier C/D, specs/04_maison-interieur.md
    §3.9) — panneau séparé sous le cartouche PV/éclats, laisser le temps de
    jeu actif s'écouler. Vérifier : icône triangle (faim) et icône goutte
    (soif) distinctes par FORME (jamais la couleur seule, P4②), barres qui
    baissent avec le temps ; `Nv.N` + barre XP discrète sous les jauges,
    jamais une injonction. Le panneau ne s'affiche qu'une fois les stats
    calculées au moins une fois (absent pendant la toute première frame de
    la cinématique d'ouverture).
26. **Menu Craft** (Palier A §3.1) — INTERACT sur l'atelier ou la table.
    Vérifier : liste des recettes de CETTE station seulement, entrées
    grisées avec le motif attendu (cooldown en secondes, "ingrédients
    manquants", "poche pleine"), jamais une recette verrouillée listée ;
    fabriquer une recette met immédiatement à jour la liste (ingrédients
    consommés, recette suivante qui se grise si elle partageait un
    ingrédient) sans fermer/rouvrir l'écran.
27. **Menu Coffre** (Palier E §3.5) — INTERACT sur le coffre. Vérifier :
    poche à déposer et coffre à retirer bien distincts visuellement, un
    transfert met à jour les deux listes immédiatement, capacité (20 piles)
    respectée (dépôt refusé au-delà, sans planter).
28. **Menu Stats** (Palier D §3.4) — ouvert depuis le menu Pause. Vérifier :
    les 4 stats primaires + valeur courante, "+1" actif seulement si des
    points libres restent, points libres affichés et décomptés après
    allocation, aucun retrait possible.

29. **Menu Construction** (specs/05_construction-stations.md §3) — ouvert
    depuis le menu Pause dans la maison. Vérifier : entrée "Construction"
    présente seulement quand le héros est strictement à l'intérieur (absente
    dehors, absente dans l'embrasure d'une porte), liste des 3 stations
    placable (jamais le puits), touches du mode affichées en sous-titre de
    l'écran.
30. **Fantôme de pose — valide** (idem, mode Construction) — station choisie,
    déplacée vers une case libre. Vérifier : silhouette translucide verte,
    coche pleine au-dessus (jamais la couleur seule, P4②), suit la grille
    (un cran par impulsion), aucune collision réelle tant que non confirmée.
31. **Fantôme de pose — invalide** (idem) — poussé hors de l'intérieur, sur
    une autre station, ou sur l'unique accès à une porte. Vérifier :
    silhouette translucide rouge, croix au-dessus (forme distincte de la
    coche), `ATTACK` ne confirme pas, ouvre un dialogue expliquant la raison
    (hors intérieur / chevauchement / couloir bloqué).
31bis. **Bandeau de placement** (`MT_construction-bandeau-placement_2026-09-17.md`,
    v1.0.1) — choisir une station dans la liste. Vérifier : l'écran-liste
    disparaît, la pièce redevient visible avec le fantôme, un bandeau compact
    en bas d'écran (filigrane, jamais au premier plan) affiche le nom de la
    station + les 5 verbes (déplacer/tourner/poser/annuler/quitter) — jamais
    l'écran-liste ET le bandeau affichés en même temps. `SKILL_3`/`ATTACK`
    (pose valide) ramènent à la LISTE (jamais au jeu nu) ; `MENU` ramène
    proprement au menu Pause (jamais superposé), sans écran orphelin visible.
32. **Station tournée** (idem) — 4 appuis de rotation sur une station posée.
    Vérifier : les 4 orientations sont visuellement distinctes, l'empreinte
    suit la rotation (on ne traverse plus le nouveau côté large, on peut
    traverser l'ancien), `INTERACT` fonctionne sur les 4 côtés après la pose.

33. **Surcouche debug perf** (`MT_mesure-saccades_2026-09-19.md`) — lancer le jeu avec `?debug=fps` dans l'URL. Vérifier : calque en haut à gauche, lisible, mis à jour sans à-coup visible (≤ 4 fois/s), bouton « copier » présent ; **sans** `?debug=fps`, aucun calque, aucune trace DOM (`document.getElementById('debug-perf')` doit renvoyer `null`). Traverser la Région Maison en ligne droite pour vérifier que le relevé (fps, delta, recalculs du calque statique, entités) varie de façon plausible.

**États 21/25-28 validés (2026-09-17)** : Xav a rejoué la Phase 3 en jeu et
confirmé « tous les points testés, bon » (clôture du critère de passage
ROADMAP, voir `CLAUDE.md`) — cette validation couvre fonctionnellement les
états 21 (stations/puits dessinés) et 25-28 (jauges, menus Craft/Coffre/
Stats), sans qu'un compte-rendu capture-par-capture n'ait été retranscrit ici
(verdict global de session, pas un protocole rejoué état par état). Pas de
détail supplémentaire à consigner tant qu'aucun défaut n'a été rapporté.

**Encore dû (2026-09-17)** : les états 29-32 et 31bis (specs/05_construction-stations.md,
ajoutés le jour même) n'ont **jamais été capturés en navigateur réel** — code
fait et testé headless (`tests/test_construction_2026-09-17.js`), mais la
contrainte de méthode (rendu canvas/DOM jamais exercé headless) s'applique
intégralement ici. Voir `CLAUDE.md` > Dette.

**Encore dû (2026-09-19, `MT_mesure-saccades_2026-09-19.md`)** : l'état 33
n'a **jamais été capturé en navigateur réel** — la session a touché
`render.js` (`creerBoucle`, `dessinerScene`) et `main.js#dessiner()`, ce qui
déclenche la règle « rejouer toute la checklist » à la lettre. Justification
consignée plutôt qu'appliquée à la lettre cette fois : chaque changement est
un paramètre optionnel (`surFrame`, `surRecalculCoucheStatique`) qui vaut
`undefined` par défaut et n'est jamais fourni hors `?debug=fps` — aucun des
32 états existants ne peut donc changer de comportement observable. Seul
l'état 33 (nouveau calque) reste à vérifier ; les 32 précédents ne sont
**pas** reconfirmés par cette session, à la charge de Xav s'il en a le temps,
sinon au prochain ticket qui touchera ces fichiers pour de vrai.

Diagnostic `SD_phase3-stations-pv-jauges_2026-09-17.md` (première validation
en jeu par Xav) : état 21 (stations/puits) était en réalité invisible en jeu
— cause trouvée et corrigée (filtre de rendu obsolète dans
`main.js#dessiner()`, cf. journal) ; état 25 (jauges) était figé/gris — cause
trouvée et corrigée (`ui/hud.js` lisait `survie.faim`/`survie.soif`, la clé
réelle est `jauge_faim`/`jauge_soif`). Les deux corrections touchent
`main.js#dessiner()`/`ui/hud.js` : états 21 et 25 restent donc **encore dus**
malgré le correctif, cette fois avec une cause écrite plutôt qu'un simple
"jamais capturé".

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

2026-09-16 (`03_maison-exterieur`, première marche — grande carte, ressources
bloquées, ramassage, maison/toit/jardin/puits, cycle jour/nuit) : états 19-23
ajoutés et capturés en navigateur réel, extension Chrome connectée. Même
artefact d'outillage que les sessions précédentes (`document.hidden` reste
vrai) : contournement par un second orchestrateur manuel construit dans la
page (import dynamique des vrais modules `/src/*.js` servis par
`serveur_local.js`), `window.requestAnimationFrame` neutralisé, sauvegarde
écrite directement en IndexedDB pour repartir d'un point précis (sortie de
grotte, follet déjà choisi) sans rejouer toute la cinématique à chaque essai.
Conforme : fond de forêt procédural + chemin manuel bien distincts en jeu
réel (pas seulement en tuiles comptées côté test), caméra fenêtrée qui suit
sans à-coup sur une carte de 170x116 tuiles ; toit vu de loin (opaque) puis
fondu progressif à l'approche puis totalement transparent dans l'embrasure de
la porte, jamais de saut net ; traversée de la maison (porte ouest → sol
parquet/murs → porte est) confirmée — **piège de collision noté** : une
porte d'1 seule tuile avec un héros de rayon 10px ne laisse qu'un corridor
vertical de 12px pour la franchir (32 - 2x10), suffisant en jeu réel (un
joueur ajuste sa trajectoire à l'oeil) mais a fait échouer un premier essai
du bot de test qui visait le centre du chemin plutôt que le centre de la
porte — sans rapport avec un bug du jeu, juste une marge fine à garder à
l'esprit si Xav rapporte un jour un blocage similaire à l'entrée d'un
bâtiment ; puits/table/coffre/atelier rendus avec leurs silhouettes propres
après correctif (voir état 21, le filtre de rendu ne gardait que les
leviers) ; INTERACT sur le puits ouvre bien son dialogue "pas encore" ;
cycle jour/nuit forcé à la nuit : toute la scène s'assombrit sauf le halo du
follet, cohérent avec l'obscurité de la grotte ; menu : Musique/Poche
vérifiés séparément (Poche affiche `Branche × 2` / `Fruit × 1` pour un
inventaire de test) — **piège méthodologique noté** : `initialiserMenu()`
appelé plusieurs fois dans la même page (une fois par tentative de ce
diagnostic) laisse des éléments DOM dupliqués de même id derrière lui
(`document.getElementById` ne récupère que le premier), provoquant une
capture d'écran trompeuse (plusieurs menus superposés) tant qu'ils ne sont
pas explicitement nettoyés (`querySelectorAll` + `remove()`) — sans rapport
avec un bug du jeu réel, où `initialiserMenu()` n'est appelé qu'une fois par
chargement de page. Grotte (salle 1, cinématique + dialogue + choix) rejouée
sans régression après la réécriture du calque statique fenêtré de
`render.js`. Aucune erreur console sur toute la session.

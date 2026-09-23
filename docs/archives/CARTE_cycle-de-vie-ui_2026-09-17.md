# Carte : cycle de vie des écrans UI (2026-09-17)

Session lecture seule, ordonnée par `BRIEF_lecture-cycle-de-vie-ui_2026-09-17.md`. Aucun code modifié. Périmètre lu : `git diff 153b5cc a70a089 -- src/main.js src/ui/menu.js src/render.js src/input/input.js` (`src/input/input.js` : **aucun changement dans cette période**, vérifié par `git diff` vide) + l'intégralité de `src/ui/menu.js` et des fonctions UI de `src/main.js`, y compris ce qui date d'avant Construction.

Toutes les citations de ligne renvoient à l'état courant du dépôt (commit `a70a089`).

---

## 1. Sources de vérité de l'état UI

Il n'existe pas UNE source unique. On en compte au moins 4 familles, de contrats différents.

### 1.1 `construction` (état gameplay, `src/main.js:235`)

`let construction = null;` — objet `{ puzzle, structure, pose, pousseeX, pousseeY, verdict }` ou `null`.

- Écrit par : `demarrerConstruction()` (`main.js:723-745`, l'assigne), `annulerConstruction()` (`main.js:747-750`, `construction = null`), `quitterConstructionVersMenuPause()` (`main.js:755-758`, `construction = null`), `confirmerConstruction()` (`main.js:788-794`, `construction = null`), `recalculerVerdictConstruction()` (`main.js:714-721`, mute `construction.verdict` en place), `traiterConstruction()` (`main.js:812-838`, mute `construction.pose`/`.pousseeX`/`.pousseeY`).
- Lu par : `constructionActif()` (`main.js:237-239`, `return construction !== null`), `uiOuverteMaintenant()` (`main.js:262-266`), le calcul de `uiOuverte` dans `maj()` (`main.js:1186-1189`), `dessiner()` pour le fantôme (`main.js:1467-1474`), et exposé tel quel aux tests via `constructionActif`/`obtenirConstruction` dans l'objet retourné (`main.js:1645-1646`).

### 1.2 `menu.estOuvert()` (`src/ui/menu.js:734-740`) — une **fonction qui OR-combine 7 signaux hétérogènes**, pas une variable

```
controleur.estOuvert() || controleurConfirmation.estOuvert() ||
ecranPoche.estOuvert() || ecranCraft.estOuvert() || ecranCoffre.estOuvert() || ecranStats.estOuvert() ||
ecranConstruction.estOuvert()
```

Ces 7 signaux n'ont pas le même contrat :

- `controleur` (liste principale du menu Pause, réaffecté à chaque ouverture par `construireMenuPrincipal()`, `menu.js:661-680`) et `controleurConfirmation` (`menu.js:686-688`) viennent tous deux de `creerControleurMenu()` (`menu.js:77-113`). Leur `.estOuvert()` (`menu.js:92-94`) est **un booléen pur `ouvert`, sans aucune lecture du DOM**.
- `ecranPoche`/`ecranCraft`/`ecranCoffre`/`ecranStats`/`ecranConstruction` viennent tous de `creerEcranListeGenerique()` (`menu.js:173-268`). Leur `.estOuvert()` (`menu.js:251`) est `controleur.estOuvert() && !el.hidden` — **le même booléen interne, ET-combiné avec l'état RÉEL du DOM**.

Deux contrats différents pour la même question ("cet écran est-il ouvert ?") coexistent donc sous un seul OR global. Rien ne les unifie.

### 1.3 `bandeauConstruction` (`src/ui/menu.js:392-407`) — visibilité DOM sans aucun accesseur

Élément créé une fois, stylé en inline, affiché/masqué uniquement via `afficherEcran(bandeauConstruction, bool)` (appelé depuis `ouvrirPlacementConstruction`, `reouvrirListeConstruction`, `fermerPlacementConstruction`, `menu.ouvrir()`, `menu.fermer()` — liste complète en §2). **Il n'existe aucune fonction `bandeauEstOuvert()`, et le bandeau n'entre pas dans le calcul de `menu.estOuvert()` (§1.2).**

La correction de sa visibilité pendant que le jeu doit rester gelé repose entièrement sur le fait que `constructionActif()` (§1.1, une variable de `main.js`, fichier séparé) est mise à `true`/`false` par les **mêmes 4 fonctions** qui font apparaître/disparaître le bandeau (`demarrerConstruction` → `ouvrirPlacementConstruction` ; `annulerConstruction`/`confirmerConstruction` → `reouvrirListeConstruction` ; `quitterConstructionVersMenuPause` → `fermerPlacementConstruction`). C'est un appariement PAR CONVENTION entre deux variables indépendantes dans deux fichiers différents — rien ne l'impose structurellement. `uiOuverte`/`uiOuverteMaintenant()` (`main.js:262-266`, `1186-1189`) s'en sortent en OR-combinant `menu.estOuvert() || ... || constructionActif()` : la couverture est correcte pour ces deux variables précises, mais uniquement parce que `constructionActif()` a été ajouté à la liste séparément — pas parce que le bandeau est rattaché à `menu.estOuvert()`.

### 1.4 `elConstruction.hidden`/`.style.display` (`menu.js:663-664`)

Un troisième axe, sans rapport avec « le menu est-il ouvert » : visibilité d'UNE LIGNE dans la liste persistante du menu Pause, pilotée par `disponibiliteConstruction()` (callback fourni par `main.js`, `menu.js:744-746`) à chaque `construireMenuPrincipal()` (donc à chaque `menu.ouvrir()`). N'entre dans aucun calcul d'« UI ouverte ».

### 1.5 États structurellement immunisés (pour contraste, §5)

`dialogue.estOuvert()` (`src/dialogue.js:82`, un booléen `ouvert` pur), `choixFollet`/`intro`/`depart` (`main.js:227, 249-250`, objet-ou-`null`) : ces 4 états ne pilotent JAMAIS de DOM — ils sont lus fraîchement à chaque frame par `dessiner()` (`dessinerEcranChoixFollet()`, `dessinerIntroConvergence()`, `dessinerDepart()`, `dessinerDialogue()` sur canvas, `main.js:1546-1549`) et par `maj()`/`uiOuverte` au même instant. Un seul booléen, une seule lecture, un seul rendu (canvas) : aucune fenêtre où l'un pourrait dire « ouvert » et l'autre « fermé ».

---

## 2. Montage / démontage DOM

Tous les écrans passent par 2 fonctions communes de `src/ui/menu.js` :

- `appliquerStylePleinEcran(el)` (`menu.js:137-147`) — styles inline plein écran, appelé UNE fois à la création de `confirmation` (`menu.js:340`) et à l'intérieur de `creerEcranListeGenerique()` pour son `el` (`menu.js:175`). Le bandeau (`menu.js:392-407`) s'en exclut délibérément (commentaire `menu.js:387-391`).
- `afficherEcran(el, visible)` (`menu.js:155-158`) — point de passage unique qui bascule `el.hidden` ET `el.style.display` ensemble. **Tous** les sites listés ci-dessous passent par cette fonction (aucun accès direct à `.hidden`/`.style.display` sur un écran ailleurs dans le fichier, hormis `elConstruction`, §1.4, qui n'est pas un écran plein/partiel mais une ligne de liste).

Sites d'appel de `afficherEcran(conteneur, …)` (menu Pause principal) :
`menu.js:704` (true, `ouvrir()`), `menu.js:723` (false, `fermer()`), `menu.js:428` (false, `actionOuvrirPoche`), `menu.js:433` (false, `actionOuvrirStats`), `menu.js:456` (false, `actionOuvrirConstruction`), `menu.js:589` (false, `actionOuvrirConfirmation`), `menu.js:716` (false, `ouvrirPlacementConstruction`, redondant — déjà false depuis `actionOuvrirConstruction`), `menu.js:366` (true, `onFermerVersMenuPrincipal`), `menu.js:579` (true, `revenirAuMenuPrincipal`).

Sites d'appel de `afficherEcran(confirmation, …)` :
`menu.js:706` (false, `ouvrir()`), `menu.js:724` (false, `fermer()`), `menu.js:590` (true, `actionOuvrirConfirmation`), `menu.js:598` (false, `actionConfirmerOui`), `menu.js:578` (false, `revenirAuMenuPrincipal`, appelée par `actionConfirmerNon`).

Sites d'appel de `afficherEcran(bandeauConstruction, …)` :
`menu.js:707` (false, `ouvrir()`), `menu.js:725` (false, `fermer()`), `menu.js:718` (true, `ouvrirPlacementConstruction`), `menu.js:492` (false, `reouvrirListeConstruction`), `menu.js:500` (false, `fermerPlacementConstruction`).

`creerEcranListeGenerique()` (`menu.js:173-268`) factorise pour Poche/Craft/Coffre/Stats/Construction :
- `.ouvrir(obtenirEntrees, titre, aide)` (`menu.js:242-248`) → `afficherEcran(el,true)` + `reconstruire()`.
- `.fermer()` (`menu.js:199-203`) → `controleur.fermer()` + `afficherEcran(el,false)` + `onFermer?.()`.
- `.fermerSansCallback()` (`menu.js:210-213`, ajoutée pour Construction) → identique à `.fermer()` MOINS le callback — seule utilisée par `demarrerConstruction()`.
- `reconstruire()` (`menu.js:215-239`) reconstruit `liste.innerHTML` ET **rejette et recrée un `controleur` neuf** à chaque appel (`menu.js:226`), à chaque ouverture ET à chaque `rafraichir()` — pas seulement une réinitialisation d'index.

---

## 3. Tableau des transitions

| Transition | Déclencheur | Variables d'état changées (ordre) | DOM changé (ordre) | Fonction(s) | Instant contradictoire observé ? |
|---|---|---|---|---|---|
| Start → menu Pause | `etatBrut.menu.pressed`, aucune UI ouverte (`main.js:1173-1179`) | `controleurConfirmation`/`ecranPoche`/`ecranStats`/`ecranConstruction` fermés, `controleur` reconstruit+ouvert (`construireMenuPrincipal`) | `conteneur`→true, `confirmation`→false, `bandeau`→false | `menu.ouvrir()` (`menu.js:704-714`) | Non — tout synchrone, DOM affiché après reconstruction du contrôleur |
| Quitter (clic ou `skill_3`) | clic `#menu-fermer` OU `verbeAnnuler` sur `controleur` | `controleur.fermer()` | `conteneur`→false | `fermerMenu()` (`menu.js:554-557`) OU fin de `traiterInput` (`menu.js:817-822`) | Non, les 2 chemins convergent — mais ni l'un ni l'autre ne vérifie/ferme `ecranPoche`/`Stats`/`Construction` (supposés déjà fermés, jamais réaffirmé ici) |
| Craft/Coffre par INTERACT | `essayerStation()` (`main.js:553-562`, hors du menu Pause) | aucune (ces 2 écrans n'ont pas d'`onFermer`, `menu.js:370-371`) | `conteneur` jamais touché ; `ecranCraft`/`ecranCoffre` seuls montés | `menu.ouvrirCraft`/`ouvrirCoffre` (`menu.js:770-778`) → `creerEcranListeGenerique#ouvrir` | Non — chemin isolé, jamais mélangé à la pile Pause |
| Stats | action `controleur.actions[i]` (menu Pause) | `controleur` (top) **reste `ouvert=true`**, jamais fermé ici | `conteneur`→false, `ecranStats`→true | `actionOuvrirStats()` (`menu.js:432-435`) | Le retour dépend de `controleur` jamais fermé (voir `onFermerVersMenuPrincipal`, `menu.js:365-368`) — fonctionne tant que rien d'autre ne ferme `controleur` entre-temps |
| Reset + confirmation | action `controleur.actions[i]` | idem Stats : `controleur` (top) reste ouvert ; `controleurConfirmation` ouvert avec focus forcé index 1 | `conteneur`→false, `confirmation`→true | `actionOuvrirConfirmation()` (`menu.js:588-594`) | Non pour "Non" (`revenirAuMenuPrincipal`, symétrique) ; "Oui" ferme `controleur` explicitement (`menu.js:601`) avant `afficherEcran(conteneur,false)` (`menu.js:602`) |
| Construction (liste) | action `controleur.actions[i]` | `controleur` (top) reste ouvert, idem Stats | `conteneur`→false, `ecranConstruction`→true | `actionOuvrirConstruction()` (`menu.js:455-458`) | Non, même patron que Stats |
| liste → placement (`A` sur une station) | action interne à `ecranConstruction` → `demarrerConstruction()` | **`construction` (main.js) assigné** (`main.js:727-734`) **AVANT** l'appel à `menu.ouvrirPlacementConstruction()` (`main.js:741`) ; puis dans menu.js : `ecranConstruction.fermerSansCallback()`, **`controleur` (top) fermé explicitement** (`menu.js:715`, correctif a70a089) | `ecranConstruction.el`→false (`fermerSansCallback`), `conteneur`→false (redondant), `bandeau`→true | `demarrerConstruction()` (`main.js:723-742`) → `ouvrirPlacementConstruction()` (`menu.js:713-719`) | Le flag gameplay (`construction`) bascule un appel de fonction AVANT que menu.js ne ferme son propre état — les deux ne sont pas une seule opération atomique inter-fichiers, seulement `ouvrirPlacementConstruction()` l'est en interne. Aucune frame ne s'intercale (même pile d'appel synchrone), donc rien d'observable pour l'instant, mais ce n'est pas structurellement garanti |
| placement → liste (`A`, pose valide) | `traiterConstruction()`, `verdict.ok` | `confirmerConstruction()` : sauvegarde, **`construction = null` posé AVANT** `rechargerSceneApresConstruction()` et avant l'appel menu | `bandeau`→false, `ecranConstruction`→true | `confirmerConstruction()` (`main.js:788-794`) → `reouvrirListeConstruction()` (`menu.js:491-494`) | Non observé — `controleur` (top) et `conteneur` restent fermés depuis l'étape précédente, cohérent |
| placement → liste (`B`/`skill_3`) | `traiterConstruction()` | `annulerConstruction()` : `construction = null` | `bandeau`→false, `ecranConstruction`→true | `annulerConstruction()` (`main.js:747-750`) → `reouvrirListeConstruction()` | Non observé, même remarque |
| placement → menu Pause (`MENU`) | `etatBrut.menu.pressed`, `constructionActif()` vrai (`main.js:1173-1179`) | `quitterConstructionVersMenuPause()` : `construction = null`, puis `menu.fermerPlacementConstruction()`, puis `menu.ouvrir()` (reconstruit TOUT : `controleur`, ferme `controleurConfirmation`/`ecranPoche`/`ecranStats`/`ecranConstruction`) | `bandeau`→false (2 fois : `fermerPlacementConstruction` ligne `menu.js:500`, puis à nouveau par `menu.ouvrir()` ligne `menu.js:707`) ; `conteneur`→true | `quitterConstructionVersMenuPause()` (`main.js:755-759`) | Pas de contradiction, mais un appel redondant (`fermerPlacementConstruction()` puis `menu.ouvrir()` qui refait le même travail sur le bandeau) — signale un point de couture pas encore simplifié après le correctif |
| liste → menu Pause (`B`/`skill_3`, aucune station choisie) | `ecranConstruction.controleur` fermé par `verbeAnnuler` | rien côté `main.js` (`construction` déjà `null`) | `ecranConstruction.el`→false, puis via `onFermer` = `onFermerVersMenuPrincipal` : `conteneur`→true | `creerEcranListeGenerique#traiterInput` (`menu.js:253-266`) → `onFermerVersMenuPrincipal()` (`menu.js:365-368`) | Non — dépend, comme Stats/Poche, de `controleur` (top) jamais fermé pendant l'ouverture de la liste Construction |

---

## 4. Routage des verbes

Dans `main.js#maj()` (`main.js:1122-1273`), pour chaque frame :

1. `dialogue.maj(deltaMs)` si `dialogue.estOuvert()` (`main.js:1141-1145`).
2. `intro`/`depart` avancés par le temps seul, jamais par input (`main.js:1155-1167`).
3. **Bloc MENU** (`main.js:1173-1179`) : `etatBrut.menu.pressed` est lu **BRUT, jamais neutralisé** (c'est le seul verbe lu inconditionnellement dans tout `maj()` — `etatNeutre()` neutralise pourtant bien la clé `menu` comme les autres, `input/input.js:98-104`, mais ce bloc s'exécute AVANT que `etatGameplay` ne soit calculé, donc avant toute neutralisation). Garde : `!dialogueOuvertMaintenant && !choixFolletActif() && !introEtaitActive && !departEtaitActif` — **ne contient pas `!menu.estOuvert()`** dans la condition externe ; ce test est fait À L'INTÉRIEUR (`else if (!menu.estOuvert())`), donc si le menu Pause OU un de ses écrans est déjà ouvert (`constructionActif()` faux), la branche ne fait rien (ni ouverture ni fermeture) — Start est un no-op sur un menu déjà ouvert, par construction.
4. `uiOuverte` (`main.js:1186-1189`) est calculé **UNE FOIS**, à cet instant précis de la frame — càd **AVANT** que `menu.traiterInput()`/`dialogue.traiterInput()`/`traiterConstruction()` ne s'exécutent plus bas (`main.js:1190-1193`). `uiOuverte` OR-combine : `menu.estOuvert() || dialogueOuvertMaintenant || choixFolletActif() || introEtaitActive || departEtaitActif || constructionActif()`.
5. Dispatch (`main.js:1190-1193`), ordre de priorité strict, un seul routeur actif par frame : `menu.estOuvert()` → `dialogue` → `choixFollet` → `construction`. Le gameplay ne reçoit JAMAIS ces verbes en direct : `etatGameplay = uiOuverte ? etatNeutre(etatBrut) : etatBrut` (`main.js:1195`), calculé avec la valeur de `uiOuverte` figée à l'étape 4 — **pas re-dérivée après le dispatch**. Conséquence : sur la frame où une UI se ferme (ex. `B` sur Construction), `uiOuverte` était `true` au moment du calcul, donc le déplacement reste gelé CETTE frame-là même si, après `menu.traiterInput()`, `menu.estOuvert()` vaudrait déjà `false` — sans danger observé (pas de mouvement parasite), mais c'est bien DEUX lectures à deux instants différents de la même fonction, pas une seule.
6. `dessiner()` (appelée séparément par `creerBoucle`, `render.js:54-66`, toujours APRÈS `maj()` dans la même frame, jamais avant) relit `uiOuverteMaintenant()` À NEUF (`main.js:1539`), donc reflète l'état après `maj()` de cette même frame — cohérent avec le DOM tel qu'il vient d'être laissé par `menu.traiterInput()`.

**Réponse à la question posée** : la condition lue par la boucle (`menu.estOuvert()`, une fonction) est LA MÊME fonction qui gouverne indirectement le DOM (elle OR-combine les mêmes contrôleurs que ceux qui pilotent `afficherEcran()`, §1.2) — mais ce n'est pas une seule variable partagée : c'est un OR de 7 sous-contrats hétérogènes (§1.2), plus 2 variables externes non incluses dedans (`constructionActif()` en `main.js`, jamais dans `menu.estOuvert()` ; le bandeau, jamais dans aucune des deux). "Même mécanisme" est donc vrai au niveau du nommage (`estOuvert`) mais faux au niveau du contrat (booléen pur vs booléen+DOM) et de la couverture (le bandeau n'a de représentant dans aucun accesseur).

---

## 5. Constat

Les transitions Craft/Coffre (jamais mêlées à la pile du menu Pause) et Reset (`controleur` fermé explicitement avant `actionReinitialiser()`) restent internement cohérentes et méritent d'être le patron de référence. Les mécanismes divergent sur deux points structurels indépendants du bug déjà corrigé le 2026-09-17 : (1) `menu.estOuvert()` OR-combine des contrôleurs à deux contrats différents — booléen pur pour `controleur`/`controleurConfirmation`, booléen-ET-DOM pour les 5 écrans génériques — sans qu'aucune règle empêche un futur appelant de fermer l'un sans l'autre ; (2) le bandeau de placement n'a aucun accesseur d'ouverture et sa cohérence avec le gel du jeu repose uniquement sur le fait que les 4 mêmes fonctions de `main.js` positionnent `construction`/`constructionActif()` en toute fin — un appariement par convention entre deux fichiers, jamais vérifié par le code lui-même.

---

## Pistes (hors scope de cette session, à valider par Xav — 5 lignes max)

- Donner au `controleur`/`controleurConfirmation` du menu Pause le même contrat que `creerEcranListeGenerique` (`estOuvert() = booléen && !conteneur.hidden`), pour que les 7 signaux de `menu.estOuvert()` partagent une seule définition de "ouvert".
- Faire porter la visibilité du bandeau par un accesseur exposé (`menu.bandeauEstOuvert()`), inclus dans `menu.estOuvert()`, plutôt que par la convention "les 4 mêmes fonctions touchent aussi `constructionActif()`".
- Un test headless qui construit le VRAI DOM (comme `test_construction_2026-09-17.js` C3bis) et vérifie, à chaque transition du tableau §3, l'invariant `menu.estOuvert() === (au moins un écran DOM visible)` fermerait toute la classe de bug par construction, pas transition par transition.

---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, paliers B et C (file de nuit)
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: complet
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, D-45, D-46, V-27, V-28, V-29, Q-36, Q-39]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Menus en cartes, paliers B et C (nuit du 20 au 21/09)

`specs/08_menus-cartes.md` v1.0.0, **paliers B puis C, puis une passe de polish**. Branche **`menus-cartes`**.

**Le mandat, verbatim (Xav, 20/09 au soir)** : « j'ai regardé A4, tout à l'air bon, continue jusqu'à la fin de
08_menus-cartes. Je vais dormir. Si tu as une branche de travail séparée de 'main' tu peux commit et push dessus, on
'merge' à mon retour. […] Commit à chaque étape pour retracer si quelque chose déraille, et je compte sur toi pour
que éviter que ça arrive. Si tous les test sont vert quand tu as terminé les menus, tu peux leurs faire une passe de
polish puis commit. »

Ce que ça change, et ce que ça ne change pas :

- **`push` autorisés, sur `menus-cartes` seulement.** `CLAUDE.md` dit « ne jamais pousser » : Xav lève la règle pour
  cette branche et pour cette nuit, comme sauvegarde. **Jamais `main`** (un `push` sur `main` publie le jeu), **aucune
  fusion** : « on merge à mon retour ».
- **`V-27` n'est pas close.** « Tout à l'air bon » lève le verrou des paliers suivants ; la ligne reste ouverte (ni la
  manette, ni le doigt, ni le téléphone ne sont cités), et c'est Xav qui l'écrira.
- La règle « un palier par session » est amendée par Xav lui-même pour cette nuit ; ce qui reste : **un commit par
  étape, chacun retirable seul**, et l'état de la file **sur le disque**, ici.

Une ligne par commit, écrite **au moment du commit**.

---

## Au réveil — le rapport, en une page

**Ce qui est fait.** `specs/08_menus-cartes.md` est livrée **en entier** : palier B (3 commits), palier C (7 commits),
une passe de polish (1 commit), plus un commit d'outils et trois de documentation. Tout est sur la branche
**`menus-cartes`, poussée en sauvegarde, non fusionnée** ; `main` n'a pas bougé, le jeu en ligne non plus.
**94 fichiers de test verts.**

**À signaler en premier** (choix pris par défaut, ou faits que tu dois connaître) :

1. **Personne n'a regardé un écran allumé cette nuit, et rien n'a été joué à la manette ni au doigt.** Chrome était
   connecté mais sa fenêtre était masquée (écran verrouillé) : plus de boucle de jeu, plus de capture. J'ai donc écrit
   `tools/capture_chrome.mjs` (Chrome **sans fenêtre**, vrais pixels à 703 × 280 et 1920 × 1080, profil jetable : **ta
   sauvegarde n'a pas été touchée**). Ça dit « ça s'affiche ainsi sous Chrome », jamais « c'est validé » : `V-28`, `V-29`.
2. **`Q-36` est codée par défaut** : `MENU` (Start, Échap), menu ouvert, **ferme tout**. À confirmer. Au clavier Échap
   est aussi la sortie du plein écran du navigateur : en plein écran, un Échap fait les deux.
3. **Le palier C n'avait pas de spec d'écran : les choix sont les miens, en `Q-39`.** Le plus visible : dans un écran
   maître-détail, **toucher une tuile la sélectionne, c'est le bouton de la fiche qui agit** (au stick : sélection, A :
   action). Si c'est un appui de trop à ton goût, c'est une ligne à changer — dis-le.
4. **`D-45`, un vrai bug trouvé et corrigé** : un transfert Poche ↔ Coffre vers une pile pleine (20) **faisait
   disparaître l'objet**. Corrigé dans le commit du Coffre (C4), avec son test.
5. **« Chacun retirable seul » : vrai pour le palier B et le polish, FAUX pour le palier C — vérifié, je corrige ce que
   j'avais annoncé.** Essayé en worktree, commit par commit : `B1`, `B3`, `C7` et le polish se retirent seuls (seul ce
   journal demande une résolution à la main, triviale) ; **`C1` à `C6` s'empilent** (mêmes fichiers de locales, même
   instance de l'écran, mêmes tests qui comptent les écrans) et ne se retirent que **du dernier vers le premier**. Dans
   cet ordre-là c'est propre : POLISH → C7 → … → C1 retirés un par un sans un conflit, **suite verte à l'arrivée**
   (l'état du palier B). Retirer *un* écran du milieu serait un petit correctif vers l'avant, pas un `revert`.
6. **Signalé sans y toucher** : `D-46` (deux fonctions pures de `ui/menu.js` n'ont plus d'appelant), la Force n'a aucune
   stat dérivée à montrer (fiche vide — du contenu), `D-44` (langue non sauvegardée) toujours ouverte.

**Ce que je te propose de regarder, dans l'ordre** : `docs/captures/menus-cartes-2026-09-20/palier-c/` (dix secondes,
pour voir la tête des écrans) · fusionner la branche dans `main` quand ça te va · puis `V-27` à `V-29` en jeu, manette
puis téléphone. Pour refaire les captures après une retouche de jeton :
`node tools/capture_chrome.mjs tools/scenarios/ecrans_palier_c.mjs` (le serveur local doit tourner).

| Commit | Quoi |
|---|---|
| `a2e49ad` | DOC ménage : journal du palier A archivé |
| `f20740c` | **B1** la pile du menu, part pure |
| `5905053` | **B2** une seule pile : `menu.estOuvert()` n'a plus qu'un contrat ; test d'invariant sur toutes les transitions |
| `95ea474` | **B3** `Q-36` : `MENU` ferme tout |
| `545b335` | OUTIL capture sans fenêtre + mode pas à pas |
| `34ee527` | DOC palier B (`V-28`) |
| `60f0530` | **C1** le composant maître-détail, seul |
| `98a026e` | **C2** Poche |
| `285c124` | **C3** Stats |
| `8a7e525` | **C4** Coffre + **`D-45`** |
| `9126930` | **C5** Craft |
| `36bef6d` | **C6** Construction — plus aucun écran de liste |
| `649fa8e` | **C7** retrait du code mort |
| `25f959f` | **POLISH** |
| *(ce commit)* | DOC clôture : suivi v1.19.0 (`V-29`, `Q-39`, `D-45`, `D-46`), `CLAUDE.md`, ce rapport |

---

## Commit 0 — Ménage de journal (doc seule)

Le journal du palier A part dans `docs/archives/` avec sa ligne d'INDEX ; `CLAUDE.md` ne garde qu'un renvoi vers ce
fichier-ci. Suivi v1.17.0 : `V-27` annotée du message de Xav (**restée ouverte**), `D-43` dit que B et C sont demandés.

## Commit B1 — La pile du menu entier, dans sa part pure

`menu_cartes.js#creerNavigationEcrans` : une pile de **niveaux**, chacun porté par une **vue** (`montrer` / `masquer` /
`estVisible` / `traiterInput`). Deux garanties **par construction** : une seule vue visible à la fois (`synchroniser()`
masque toutes les autres *avant* de montrer le sommet — aucun autre endroit n'affiche ni ne masque), et un seul chemin
de fermeture (`fermerTout()`). « Ouvert » = pile non vide **ET** `sommet.vue.estVisible()` — on interroge l'affichage
réel, pas un booléen : un écran caché dans le dos de la pile ne gèle pas le jeu.

`masquerSommet()` / `remontrerSommet()` : la clause « ET son sommet est visible » de la spec a un usage réel, le
**placement d'une station** (les verbes partent à `main.js`, la pile doit se retrouver intacte ensuite).

Rien n'est branché : commit retirable seul, aucun comportement ne change. Test : `test_d43_b1_navigation_ecrans`
(l'invariant est vérifié après **chaque** opération du fichier).

## Commit B2 — Une seule pile : la grille et les cinq écrans de liste en sont les vues

**Ce qui a disparu.** Les six sous-contrats que `menu.estOuvert()` OR-combinait encore (sept à l'origine, carte §1.2),
l'ordre de `return` tenu à la main dans `menu.traiterInput`, `onFermer` / `onFermerVersMenuCartes` (« faire réapparaître »
le menu qu'on avait masqué), `fermerSansCallback` (l'exception ajoutée pour le placement d'une station), l'ordre de
fermeture à respecter dans `menu.ouvrir()` (« la grille D'ABORD »), et la pile locale du palier A (`creerPileMenus`).

**Ce qu'il y a à la place.** `ui/menu.js` crée **une** `creerNavigationEcrans()` et la donne à la grille ; les cinq écrans
de liste deviennent des **vues** (`montrer(niveau)` / `masquer()` / `estVisible()` / `traiterInput`). Un niveau de liste
porte son contenu : `{ vue, id, obtenirEntrees, titre }`.

- `menu.estOuvert()` = `navigation.estOuvert()` — une question, posée à un endroit.
- `menu.traiterInput()` = `navigation.traiterInput()` — les verbes vont au sommet, et à lui seul.
- Poche / Stats / Construction **s'empilent** sur le niveau de cartes qui les ouvre ; « Fermer » (clic) et B (verbe)
  appellent **la même fonction**, `navigation.retour`. Craft et Coffre (INTERACT) s'ouvrent seuls dans la même pile :
  retour → plus rien dessous → tout est fermé.
- Placement d'une station : `navigation.masquerSommet()` — pile intacte `[racine, liste]`, menu **pas ouvert** ; le retour
  à la liste est un `remontrerSommet()` (entrées relues à neuf).
- La grille garde son API seule (banc d'essai, test A3 **vert sans être touché** hors du bloc « pile locale ») : sans
  pile injectée, elle s'en crée une.

**Le test que la spec exige** — `test_d43_b2_pile_unique_transitions` : vrai `ui/menu.js`, vrai orchestrateur, vrai
catalogue, **toutes** les transitions du tableau §3 de la carte (plus dossier / bascule / action), invariant vérifié après
**chaque** frame et **chaque** clic : `menu.estOuvert() === un écran réellement visible`, **jamais deux écrans visibles**,
bandeau ⇔ placement, et « pile non vide sans rien de visible » n'existe **que** pendant un placement. Vérifié par
mutation : neutraliser `masquer()` de la grille, ou le `masquerSommet()` du placement, le fait tomber.

Tests adaptés : `test_d43_a4` (un écran de liste est désormais un **niveau** de la pile : on n'observe plus « la grille a
gardé son état en se masquant » mais « B a dépilé un niveau, focus rendu à la carte ») ; `test_d43_a3` (bloc « pile
locale » retiré, porté par `test_d43_b1`). **89 fichiers verts.** Aucun changement visuel attendu : si Xav voit une
différence, c'est un défaut.

## Commit B3 — `Q-36` : `MENU`, menu ouvert, ferme tout

Retenu par défaut par la spec, **`[OUVERT]` — à confirmer par Xav** (`Q-36` reste ouverte, c'est lui qui la clôt).
`main.js#maj` : la branche qui manquait — `MENU` pressé, menu ouvert → `menu.fermer()`, qui **est**
`navigation.fermerTout`, la fonction du `[X]` de la racine. Un seul chemin de fermeture : pas de parité clic/verbe à
surveiller. Depuis n'importe quelle profondeur, et Craft / Coffre compris (même pile).

Deux choix à dire :
- **C'est dans `main.js`, pas dans `menu.traiterInput`** : c'est là qu'on sait que `MENU` vient d'**ouvrir** le menu dans
  cette même frame — le traiter dans le menu le refermerait aussitôt.
- **La frame où `MENU` ferme reste une frame d'UI** (`menuFermeParVerbe` entre dans `uiOuverte`) : aucun verbe de cette
  frame n'atteint le gameplay, exactement comme la frame où B ferme. Testé (MENU + MOVE dans la même frame : le héros ne
  bouge pas).

Tests : `test_d43_b2` gagne un bloc 6 (MENU depuis la racine, un écran profond, la confirmation d'un danger, une liste
empilée, la liste Construction, Craft ; le héros repart ; MENU rouvre à la racine). `test_construction` documentait
l'ancien « MENU, menu ouvert = sans effet » : adapté, en le disant. **89 fichiers verts.**

À noter pour Xav : au clavier, `MENU` est **Échap** — qui est aussi la touche par laquelle le navigateur **quitte le
plein écran**. En plein écran, un Échap fait donc les deux. Rien à corriger ici (c'est le navigateur), mais ça se verra.

## Commit OUTIL — Vérifier dans Chrome la nuit, écran verrouillé

**§0 ter, cette nuit : Chrome est connecté, mais sa fenêtre n'est pas visible** (`document.visibilityState === 'hidden'` :
écran verrouillé ou fenêtre recouverte). Conséquences mesurées : plus aucun `requestAnimationFrame` (la boucle de jeu
est à l'arrêt, le jeu ne répond à aucune touche), et l'extension n'arrive plus à capturer l'onglet
(`Page.captureScreenshot` expire à 30 s). Deux outils de dev, **jamais chargés par le jeu** :

- **`tools/cadre_viewport.html?pas=oui`** — mode *pas à pas* : le cadre remplace le `requestAnimationFrame` du jeu par une
  file vidée à la main (`pas.avancer(n)`, `pas.touche('Escape')`). Le jeu redevient pilotable dans un onglet masqué, dans
  un viewport exact. Sert à **lire le DOM** après tel verbe ; ne dit rien du rythme.
- **`tools/capture_chrome.mjs`** — lance un Chrome **sans fenêtre** (`--headless`), le pilote par son port de débogage
  (CDP sur le WebSocket natif de Node : **zéro dépendance**), et rend de **vrais pixels** à 703 × 280 et à 1920 × 1080
  **exactement** (plus besoin du cadre réduit du palier A, dont les captures ne prouvaient que la mise en page). Vraies
  touches, vrais clics, `evaluer()` pour mesurer un débordement. **Profil neuf et jetable à chaque lancement : la
  sauvegarde de Xav n'est ni lue ni touchée** ; `tools/scenarios/commun.mjs` y injecte une partie « dans la Maison ».

Premier scénario, `tools/scenarios/menus_palier_b.mjs` → `docs/captures/menus-cartes-2026-09-20/palier-b/` (8 images).
**Palier B vérifié en vrai navigateur, aux deux tailles** : le menu est identique aux captures du palier A ; Poche
s'empile et B rend « Héros » ; depuis la confirmation du reset (profondeur 4) **Échap ferme tout**, un second Échap
rouvre à la racine ; corps de la grille : 0 px de débordement ; **console sans erreur**. Ça dit « ça s'affiche ainsi sous
Chrome », jamais « c'est validé » : ni manette ni doigt, et personne n'a *regardé* un écran allumé cette nuit.

## Commit DOC — Palier B livré

Suivi v1.18.0 : `Q-36` annotée « **codé par défaut, à confirmer** » (jamais close par initiative) ; **`V-28` ouverte**
(palier B : « aucun changement visuel attendu », la liste des gestes à refaire, et la question de `MENU` qui ferme) ;
`D-43` dit le palier B livré. `CLAUDE.md` : architecture (`menu_cartes.js`, `tools/`) et deux décisions datées (la pile
unique ; `MENU` ferme tout). Prochains identifiants libres : `D-45`, `Q-39`, `V-29`, `R-17`.

---

# Palier C — les écrans de liste

**La spec n'en fixe que le cadre** (« Poches, Stats, puis les grosses pages en maître-détail : grille d'objets à gauche,
fiche à droite […] chaque écran aura son ticket »). Xav a demandé d'aller au bout : les choix ci-dessous sont donc les
miens, **tous `[OUVERT]`**, consignés en `Q-39` — il confirme, révise, ou retire le commit qui ne lui va pas (un écran =
un commit, chacun retirable seul ; tant qu'un écran n'est pas migré, il reste l'ancien écran de liste, qui marche).

| Choix | Pourquoi |
|---|---|
| **Un second composant générique**, `ui/ecran_fiches.js`, pour les cinq écrans (pas un composant par écran) | Même règle que `creerEcranListeGenerique` : un écran ne fournit que son contenu. Ajouter un écran = des entrées, pas du code d'UI |
| **Même boîte, même unité `--u`, mêmes jetons, MÊME en-tête que la grille de cartes** | La sortie est au même endroit sur tous les écrans du jeu (la mémoire du pouce) ; ajouter un follet recolore aussi ces écrans |
| **Une tuile se SÉLECTIONNE ; c'est le bouton de la fiche qui AGIT.** Aux verbes : le stick sélectionne, A agit (A et le bouton = la même fonction) | Sur une carte du menu, tout est écrit sur la carte : l'appui peut agir. Sur une tuile il n'y a qu'une icône — au doigt, on ne verrait jamais la fiche avant d'avoir agi (dépenser un point de stat, consommer des ingrédients). *Diffère* de « un appui active directement » (§4.3, écrit pour les cartes) |
| **4 colonnes × 3 rangées sans défiler ; au-delà la grille de tuiles défile EN ELLE-MÊME**, le défilement suit le focus ; ni l'en-tête ni la fiche (donc ni la sortie ni le bouton d'action) ne bougent jamais | « Jamais de défilement » vaut pour un écran de CARTES (≤ 6) ; un coffre n'a pas de plafond. La règle de `D-42` est tenue : la sortie ne défile pas |
| **Un groupe (intertitre) commence sur une rangée neuve**, la fin de la rangée précédente comblée de cases vides | Ce sont les « cases vides » de la grille de cartes : `voisin()` les saute déjà, la navigation n'a rien à apprendre |
| **`grisee` reste un indice, jamais un verrou** : le bouton retente l'action réelle | Règle des listes depuis la Phase 3, conservée telle quelle |

## Commit C1 — Le composant « maître-détail », seul

`src/ui/ecran_fiches.js` (une **vue** de la pile du palier B) + sa part pure dans `menu_cartes.js` (`disposerTuiles`,
`replierFocus`, `COLONNES_TUILES`) + ses règles dans la feuille de style (aucune couleur en dur : les jetons) +
`icone_canvas.js#cadrer` : les **silhouettes du monde** (une station ancrée par le bas, large de 22 unités) sont
recadrées sur leur boîte englobante — celle de `structures.js`, la même règle que l'empreinte solide — pour tenir dans
une tuile ; **aucune icône de menu ou de stat ne bouge d'un pixel** (testé sur toutes). **Rien n'est branché.**

Test `test_d43_c1_ecran_fiches` : disposition et groupes · **toute tuile atteignable au stick sur 99 dispositions à deux
groupes** · focus conservé après relecture (une pile qui part du coffre : on recule d'un cran, on ne saute pas en tête) ·
structure DOM · le geste (clic / survol / stick = sélection ; bouton / A = action, une seule fonction) · sortie par la
pile · liste vide · règles CSS structurelles. **90 fichiers verts.**

Vu sous Chrome sans fenêtre, sur le banc (`tools/banc_menu_cartes.html?ecran=poche|coffre|vide`, scénario
`tools/scenarios/banc_fiches.mjs`) : à **703 × 280** tuile 60 × 60 px, sortie 40 × 40 px, bouton d'action 155 × 40 px ;
à **1920 × 1080** tuile 240 px, en-tête 96 px. **Rien ne déborde** hors de la grille de tuiles, qui défile bien en
elle-même (22 tuiles, deux groupes) en suivant le focus. Un défaut vu et corrigé dans ce commit : le halo du focus était
rogné au bord de la zone défilante (`scroll-padding`). Captures : `docs/captures/menus-cartes-2026-09-20/palier-c/`.

## Commit C2 — La Poche en maître-détail

`ui/menu.js` crée **une** instance de `creerEcranFiches` (comme la grille : c'est le **niveau** empilé qui porte le
contenu) ; la carte Poche empile `{ vue: ecranFiches, titre, obtenirEntrees, texteVide }`. L'ancien écran de liste de la
Poche disparaît ; les quatre autres ne bougent pas.

- **Ce que dit la fiche vient des données** : `main.js#lignesFicheItem` (catégorie, faim, soif, effets — lus dans
  `items.json` / `status_effects.json`), une seule fonction pour la Poche, le Coffre et la sortie d'une recette.
  Nouvelles clés FR/EN : `item.categorie.*` (une par catégorie de `schemas.js#CATEGORIES_ITEM`, désormais exportée),
  `menu.fiche.rend_faim|rend_soif|equipe`. Toutes passent par le **contrôle de démarrage des textes**
  (`main.js#clesTexteFiches`) : une catégorie ajoutée sans son texte tombe au boot, dans les deux langues.
- **« Équiper » n'existe que sur la nourriture** (comme avant) ; une ressource ou un outil n'a **pas de bouton** plutôt
  qu'un bouton qui ne fait rien. L'objet équipé porte un **repère** sur sa tuile (un coin plein : une forme, pas un « ✓ »
  de police) et une ligne « Équipé » dans sa fiche. Vu à la capture et corrigé dans ce commit : je l'avais d'abord
  *grisé* — « équipé » n'est pas « indisponible ».
- L'écran est créé **après** la grille de cartes : le menu Pause reste le premier écran du document. Le sous-titre a sa
  propre classe (`.fiches-sous-titre`) — je l'avais d'abord posé sur `.cartes-message`, et `test_d30` lisait alors le
  mauvais élément : ce n'est pas le même rôle, donc pas la même classe.

Tests : `test_d43_c2_poche_fiches` (vrai menu, vrais catalogues). Adaptés, en le disant dans chacun :
`test_sd_construction_parite_clic_verbe` (**la parité clic/verbe devient « tuile puis bouton de fiche » contre « stick
puis A »**, chemin du stick calculé par `voisin()` ; + la sortie : bouton d'en-tête contre B), `test_d42` (la sortie de
la Poche hors de ce qui défile ; l'écran de liste témoin devient Craft), `test_d43_a4`, `test_d43_b2`.
**91 fichiers verts.** Vu dans le jeu sous Chrome sans fenêtre, aux deux tailles : rien ne déborde, aucun texte coupé,
console sans erreur (`tools/scenarios/ecrans_palier_c.mjs`, captures `c_poche_*`).

## Commit C3 — Stats en maître-détail

Une **tuile par stat** du catalogue (son icône de `stats.json`, sa valeur en pastille) ; la **fiche** liste les stats
dérivées qui dépendent de cette stat, avec leur valeur du moment — lues dans `stats_derivees.json` (champ `stat`), jamais
écrites par stat : une dérivée ajoutée au catalogue apparaît sans code. Le bouton **« +1 » n'existe que s'il reste un
point** ; aucune tuile n'est grisée (quatre tuiles grisées feraient passer un écran d'information pour un écran
désactivé). Les deux entrées *sans action* de l'ancienne liste (points libres, progression d'XP) deviennent le
**sous-titre** de l'écran (`orchestrateur.sousTitreStats`, relu à chaque affichage) — visibles quelle que soit la tuile.

`menu.definirEntreesStats(fn, sousTitre)` : second argument optionnel. L'écran de liste de Stats disparaît de
`ui/menu.js` (cinq écrans partagés au lieu de six ; `test_d42` le dit). `obtenirEntreesStats()` garde `texte`, `grisee`
et `action` : `test_phase3_boucle` est vert sans être touché.

Tests : `test_d43_c3_stats_fiches` (vrai orchestrateur) ; parité pointeur/verbes de Stats passée au maître-détail, avec de
vraies tuiles et un point à dépenser. **92 fichiers verts.** Vu dans le jeu, aux deux tailles : rien ne déborde, aucun
texte coupé. Un défaut vu à la capture et corrigé ici : l'icône de la fiche n'était pas à l'accent (`--carte-trait`
n'était défini que sur les tuiles).

**À Xav (`Q-39`)** : « Force » n'a aucune stat dérivée en données — sa fiche est vide. Et « Cadence d'attaque : 500 »
affiche des millisecondes brutes (la donnée n'a pas d'unité). Rien d'inventé ici : c'est du contenu.

## Commit C4 — Le Coffre en maître-détail, et `D-45` (un objet disparaissait)

Deux **groupes** dans la grille de tuiles : la **Poche** (on dépose), puis le **Coffre** (on retire) ; chacun commence
sur une rangée neuve, `voisin()` saute les cases de remplissage sans rien avoir appris. La fiche d'un objet est **celle
de la Poche** (`lignesFicheItem`), plus la raison d'un refus probable (« Coffre plein », « Pile pleine ») ; le bouton dit
« Déposer » ou « Retirer » ; le **sous-titre** dit la capacité (« Piles : 2 / 20 »). `menu.ouvrirCoffre(entrees, titre,
{ sousTitre, texteVide })` : troisième argument optionnel. Trois clés FR/EN de plus, contrôlées au démarrage.

**`D-45` — trouvé en réécrivant ces entrées, corrigé ici (c'est une perte d'objet, et c'est l'écran du ticket).** Un
transfert vers une pile **déjà pleine** (`stack_max`) retirait l'unité de la source **sans l'ajouter** à la destination :
`ajouterItem` plafonne et le dit par `ajoute`, que personne ne lisait — l'objet s'évaporait, dans les deux sens.
Désormais `transfererUnite` **ajoute d'abord, et ne retire que ce qui est entré**. Atteignable en jeu dès que la poche
porte 20 bois et qu'on en retire un 21ᵉ du coffre. Test de non-régression dans `test_d43_c4_coffre_fiches` (les deux
sens), avec « coffre plein » exercé sur le vrai catalogue à capacité réduite (une donnée : le code ne change pas).

`test_phase3_boucle` (le bot dépose puis retire du bois via `entree.texte` / `entree.action`) : **vert sans être touché**.
Parité pointeur/verbes du Coffre passée au maître-détail (deux groupes). **93 fichiers verts.** Vu dans le jeu aux deux
tailles : rien ne déborde hors de la grille de tuiles ; avec deux intertitres, la 3ᵉ rangée est coupée au bord — c'est
le signe « il y en a d'autres », et le focus la ramène en vue.

## Commit C5 — Craft en maître-détail

Une **tuile par recette connue** de la station (une recette verrouillée reste absente : narration diffuse), à l'image de
l'objet **produit**. La fiche dit **ce que la recette demande et ce qu'on a en poche** (« Branche : 6 / 2 », relu à
chaque affichage), **ce qu'elle donne**, puis la fiche de l'objet produit (`lignesFicheItem`, la même que dans la Poche
et le Coffre), et la **raison d'un refus probable** : ingrédients manquants, pile pleine, ou « Prêt dans 42 s ». Le
bouton dit « Fabriquer » ; grisé, il **retente quand même** (le résultat fait foi — testé pendant la recharge).
`menu.ouvrirCraft(entrees, titre, { texteVide })`. Six clés FR/EN de plus, contrôlées au démarrage.

Tests : `test_d43_c5_craft_fiches` (vrai orchestrateur, INTERACT à côté de l'atelier). `test_d42` : ses blocs « le focus
demande la mise en vue » et « la sortie ne ferme qu'une fois après N reconstructions » exerçaient la liste de Craft —
**portés sur la grille de tuiles** (vingt recettes, cinq rangées : à chaque cran, seule la tuile focalisée est ramenée en
vue) ; son écran de liste témoin devient la liste Construction, la dernière à ne pas avoir migré. `test_phase3_boucle`
(le bot fabrique par `entree.texte` / `entree.action`) : **vert sans être touché**. **94 fichiers verts.** Vu dans le jeu
aux deux tailles : rien ne déborde, aucun texte coupé.

## Commit C6 — La liste Construction en maître-détail : plus aucun écran de liste

Une **tuile par station déplaçable**, à la silhouette **du monde** (la cuisine, le coffre, l'atelier — recadrés par
`icone_canvas.js#cadrer`, c'était sa raison d'être) ; la **fiche** porte les cinq touches du placement, aux glyphes du
périphérique actif — les mêmes lignes que le bandeau (`lignesAidePlacement`, écrites une fois) : on les lit **avant**
d'entrer en placement. Le bouton dit « Déplacer ». Hors d'une structure : « Rien à déplacer ici ». Deux clés FR/EN.

La machine du placement ne bouge pas : choisir une station **masque le sommet** de la pile (palier B), B ou une pose
valide le **remontre** (`reouvrirListeConstruction` reconnaît désormais le niveau à son **id**, plus à sa vue — la vue
est partagée par cinq écrans). `test_construction`, `test_sd_menu_ecrans_orphelins` et le test d'invariant du palier B :
**verts sans être touchés**.

`test_sd_construction_parite_clic_verbe` : sa séquence composée S1 → S4 est portée (pointeur = tuile puis bouton de
fiche ; verbes = stick puis A ; quitter la liste = la sortie de l'en-tête contre B), et **les cinq écrans** passent la
parité pointeur/verbes du maître-détail. `test_d42` : plus d'écran de liste à prendre pour témoin — deux écrans partagés
(la grille, le maître-détail). **94 fichiers verts.** Vu dans le jeu aux deux tailles : la liste, **le placement** (rien
de visible que le bandeau, `menu.estOuvert()` faux), et le retour à la liste par B.

`creerEcranListeGenerique` n'a plus d'appelant : son retrait est le commit suivant (pour retirer C6 seul, retirer
d'abord celui-là).

## Commit C7 — Retrait du code mort : l'écran de liste générique

Plus aucun appelant depuis C6 : `creerEcranListeGenerique`, `appliquerFocusVisuel`, `appliquerClasseEcran` sortent de
`ui/menu.js` (813 → 650 lignes), et les règles `.ecran-ui-entete-ligne`, `.ecran-ui-titre`, `.ecran-ui-aide`,
`.ecran-ui-liste` de la feuille de style. La leçon du « reset invisible » reste écrite, en quatre lignes, là où elle
sert encore (`afficherEcran`). **Aucun changement visible** : les cinq écrans repassés sous Chrome sans fenêtre aux deux
tailles, console sans erreur, aucun texte coupé. **94 fichiers verts.**

**Gardé, et signalé (`D-46`)** : `creerNavigationMenu` et `creerControleurMenu` — pures, exportées, testées par
`test_menu_navigation` depuis la Phase 0, et désormais **sans appelant**. Les retirer supprime un fichier de test
historique ; les garder, c'est du code mort testé. Ce n'est pas à moi de trancher à 5 h du matin : ligne au suivi.

Pour retirer C6 seul : retirer d'abord ce commit-ci.

---

# Passe de polish (tous les tests verts)

## Commit POLISH — Trois retouches, pas une de plus

Xav : « Si tous les tests sont vert quand tu as terminé les menus, tu peux leur faire une passe de polish. » J'ai relu
toutes les captures aux deux tailles avant de toucher à quoi que ce soit. **Rien à reprendre dans la mise en page**
(aucun débordement, aucun texte coupé, la sortie au même endroit partout). Trois retouches, chacune parce qu'un joueur
s'y serait arrêté :

1. **Le bouton de la fiche porte le glyphe du verbe qui l'actionne** (« A », « Espace ») à la manette et au clavier — à
   ces périphériques le bouton n'est pas focalisable (c'est la tuile qui l'est), et rien ne disait « ce bouton, c'est
   A ». Au doigt : rien (le bouton se touche). Injecté (`glypheAction`) : le composant ne connaît toujours ni les
   périphériques ni les glyphes.
2. **La fiche de l'objet équipé dit comment le manger** (« Manger : RT »), au glyphe du périphérique actif — on vient
   peut-être de l'équiper pour la première fois, et le verbe CONSUME n'a son indice qu'une fois par partie.
3. **Le sous-titre des écrans maître-détail passe de 8 u à 9,5 u** : il porte une information qu'on vient lire (les
   points de stats à dépenser), pas un avis passager.

Une clé FR/EN (`menu.fiche.manger`), contrôlée au démarrage. `test_d43_c1` et `test_d43_c2` lisent désormais le libellé
dans son `<span>` et vérifient le glyphe (présent à la manette, absent au doigt). **94 fichiers verts.** Captures du
palier C refaites avec le rendu final.

**Ce que je n'ai PAS touché, exprès** : les jetons de style (tous *provisoires*, c'est à Xav de dire « plus », « moins »
ou « bon ») ; le mot à côté de `[X]` (décision 1, à essayer par lui) ; le maintien-répétition du stick dans les grilles
(`D-18`, un ticket à part) ; la langue non sauvegardée (`D-44`) ; le contenu des fiches (la Force n'a aucune dérivée à
montrer : c'est du contenu, pas de l'UI).

## Commit DOC — Clôture

Suivi v1.19.0 : `D-43` dit le chantier livré en entier (il se clôt quand Xav aura rendu `V-27`, `V-28`, `V-29`) ;
**`D-45` close** (trouvée et corrigée en C4) ; **`D-46` ouverte** (deux fonctions pures sans appelant) ; **`Q-39` ouverte**
(les six choix du palier C) ; **`V-29` ouverte**. Prochains identifiants libres : `D-47`, `Q-40`, `V-30`, `R-17`.
`CLAUDE.md` : état du dépôt, architecture (`ui/ecran_fiches.js`), une décision datée (le geste du maître-détail),
l'ordre d'injection, le renvoi vers ce fichier. Le rapport est en tête de ce journal — y compris la correction sur
« chacun retirable seul », vérifiée en worktree avant d'être écrite.

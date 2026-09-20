---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, paliers B et C (file de nuit)
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, V-27, Q-36]
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

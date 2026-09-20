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

---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, palier A
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: complet
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, D-44, V-27, Q-36, Q-37, Q-38, D-42, D-30, V-25, V-26]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Menus en cartes, palier A (20/09)

`specs/08_menus-cartes.md` v1.0.0, **palier A seulement**. Branche **`menus-cartes`**, créée depuis `main`
(`a605729`). **Aucun `push`** — `push` sur `main` publie le jeu. Le palier B n'est pas commencé.

Une ligne par commit, écrite **au moment du commit** (hygiène de contexte : ce qui n'est dit que dans la
conversation se perd quand elle se résume).

## §0 ter — Chrome est connecté

**Oui.** L'extension répond, un onglet est disponible dès la première seconde de la session. Les captures à
**703 × 280** et à **1920 × 1080** demandées pour A3 et A4 sont prises dans `docs/captures/menus-cartes-2026-09-20/`.
Une vérification dans Chrome dit « ça s'affiche sans défaut », jamais « c'est réussi » : le verdict est `V-27`.

---

## Commit 0 — Ménage de journal et ouverture du chantier (doc seule)

**Ménage.** `docs/JOURNAL_2026-09-20_menu-tactile.md` part dans `docs/archives/`, avec sa ligne d'INDEX. Son brief,
`BRIEF_menu-tactile_2026-09-20.md`, qui traînait à la racine du dépôt, est archivé à côté (même geste que pour les
deux briefs de nuit). `CLAUDE.md` ne garde qu'un journal : le renvoi vers celui-ci.

**Consigné au suivi, sur instruction de Xav** (une ligne `V-` ne se clôt jamais par initiative) : **`V-25` et `V-26`
validées par Xav le 20/09, sur téléphone, par l'URL publique — « all good ».** Donc **`D-42` et `D-30` closes** pour de
bon : les quatre lignes descendent en §8. Les verdicts y sont condensés ; le détail verbatim reste dans le journal
archivé, que chaque ligne cite.

**Ouvert.** Les deux identifiants que la spec annonçait « à créer » étaient **libres**, aucun décalage à signaler :

- **`D-43`** — le chantier « menus en grille de cartes », P1, *en cours* (palier A).
- **`V-27`** — la validation du palier A : menu principal et Sauvegarde, manette / souris / doigt, 1920 × 1080 et
  téléphone, accent des trois follets et accent neutre, focus « plus / moins / bon », `[X]` seul ou avec son mot.

**`Q-36`** reste ouverte et reste à Xav : la ligne dit désormais que la spec la tranche **au palier B** (défaut
retenu : `MENU`, menu ouvert, ferme tout par la même fonction que le `[X]` de la racine). **Rien n'est codé ici.**

**La spec entre dans le dépôt avec ce commit** (`specs/08_menus-cartes.md` était non suivie) : la branche en dépend.

**Signalé** : `CLAUDE.md` fait 315 lignes pour un plafond indicatif de 300 (il en faisait déjà 312). Pas de coupe
faite en passant — ce qui se retire d'un fichier d'instructions mérite d'être relu par Xav.

---

## Commit A1 — Jetons de style, `couleur_ui`, contrôle de contraste

**Livré.**

- **`index.html`** : un bloc `:root { --menu-… }`, **le seul** endroit où une couleur, un rayon ou une épaisseur de
  menu est écrit. Chaque jeton porte son *pourquoi* ; tous sont *provisoires* (§4.5). Les longueurs y sont des
  **nombres d'unités `--u`**, pas des pixels. Rien ne les consomme encore — c'est A3 qui dessine.
- **`data/companions.json`** : `couleur_ui` sur les trois follets, **égale aujourd'hui à `render.couleur`**. Champ
  distinct à dessein : la couleur d'un follet sur un voile de nuit et celle d'une bordure de carte n'ont pas à
  rester égales pour toujours. Le schéma la rend **requise**, en `#rrggbb`.
- **`src/ui/couleurs_ui.js`** (pur) : luminance et contraste WCAG, et `erreursCouleursUi(compagnons, jetons)`.
- **`main.js#demarrerJeu`** : le contrôle tombe **au démarrage**, par le chemin d'erreur existant
  (`afficherErreurBoot`). Les trois jetons utiles sont **relus sur `:root`** (`getComputedStyle`) — la feuille de
  style reste leur seule source, le contrôle n'en garde aucune copie.

**Pourquoi le contrôle ne vit pas dans `validerCatalogues`.** Le registre est pur : il ne voit pas le DOM, donc pas
le fond des cartes. Deux façons d'y remédier : recopier le fond dans un module JS (deux sources, qui divergeront),
ou donner les jetons au contrôle depuis l'endroit qui a un DOM. Retenu : la seconde. Le schéma ne garde que la
**forme** (`#rrggbb`), le contraste se juge jetons en main.

**Deux défauts retenus, à confirmer.**

1. **L'accent neutre passe le même contrôle que les follets.** La spec ne le demandait pas ; c'est pourtant le
   premier accent que le joueur voit, et un jeton que Xav va régler à l'œil.
2. **« Jamais le magenta du danger » = jamais *proche* du magenta** (`DISTANCE_MIN_DANGER = 60`, distance RGB,
   *provisoire*). Une égalité stricte aurait laissé passer `#d6409e`, qu'aucun œil ne distingue. Le feu, l'accent
   le plus proche aujourd'hui, est à ~114 : aucune couleur actuelle n'est inquiétée.

**Mesuré** (contraste sur `#161b24`, minimum 3:1) : les trois follets et l'accent neutre passent, test à l'appui.

**Tests** : `tests/test_d43_a1_jetons_couleur_ui_2026-09-20.js`, six blocs — l'arithmétique (21:1, symétrie, valeur
de référence publiée 4,48:1) · chaque jeton déclaré **une seule fois** · les données **réelles** contre les jetons
**réels**, lus dans `index.html` et jamais recopiés · quatre couleurs fautives, chacune avec son chemin (trop
sombre, magenta, quasi-magenta, mal formée) · un jeton illisible est une **erreur**, jamais un contrôle sauté en
silence · le schéma exige le champ. **84 fichiers de test verts.**

**Vérifié dans Chrome** (pas de capture : rien ne change à l'écran à ce commit) : le jeu démarre, aucun écran
d'erreur, aucune erreur console ; `getComputedStyle` rend bien `#161b24` / `#f2e9d8` / `#d6409f`.

---

## Commit A2 — `menus.json`, son schéma, les contrôles au démarrage

**Livré.**

- **`data/menus.json`** : quatre écrans — `menu_racine` (Héros · Paramètres · *case 2 libre, rien n'y est déclaré* ·
  Construction en case contextuelle), `menu_heros` (Poche · Stats — **pas de carte « Feu follet »** tant que sa
  page n'existe pas), `menu_parametres` (Langue · Musique · Plein écran · Sauvegarde), `menu_sauvegarde`
  (Exporter · Importer · Réinitialiser, `danger`).
- **`src/menu_cartes.js`** (pur) : `choisirGrille`, `nombreCases`, `erreursTextesMenus`, `erreursCablageMenus`.
- **`schemas.js`** : schéma `menus` + `validerMenu`. Et le validateur de conditions **partagé** apprend enfin
  `{ valeur, min, max }` — `spawns.json` s'en servait depuis le palier 07-A sans jamais passer par lui.
- **`data/visuels.json`** : 14 icônes **en primitives** (`visuel_icone_menu_*`), toutes teintables — aucun emoji.
- **`locales/`** : 26 clés, FR et EN.
- **`main.js#demarrerJeu`** : le contrôle des textes rejoint le chemin d'erreur de démarrage existant.

**Ce que le démarrage refuse désormais**, chaque fois avec le chemin : plus de six cartes (« on crée un dossier ») ·
une `cible` du catalogue qui n'existe pas · un écran **inatteignable** depuis la racine · zéro ou deux racines · deux
cartes du même id · une icône inconnue · un champ qui n'a pas de sens pour le type · un `danger` sans ses deux textes
de confirmation · une condition mal formée · une **candidate morte** (placée derrière une carte sans condition sur
la même case) · une clé de texte absente d'une des deux langues.

**Le câblage est écrit et testé ici, mais il ne sera *appelé* qu'en A4** — c'est A4 qui enregistre les fonctions.
`erreursCablageMenus` contrôle **les deux sens** (« et inversement ») : une action enregistrée qu'aucune carte ne
cite est une fonction que le joueur ne peut plus atteindre.

### Quatre choix pris dans le périmètre, à confirmer ou réviser

1. **`[OUVERT]` — « lieu » et « API présente » passent par des *valeurs nommées*.** La spec dit « le format générique
   de `flags.js` (niveau, drapeau, lieu). Aucun nouveau format » — mais `flags.js` ne connaît **pas** de condition de
   lieu : il connaît des drapeaux et des valeurs numériques nommées. Retenu, sans toucher à `flags.js` :
   `{ "valeur": "stations_placables", "min": 1 }` pour la case contextuelle (un **vrai nombre** : combien de stations
   déplaçables là où se tient le héros) et `{ "valeur": "plein_ecran_disponible", "min": 1 }` (0 ou 1 — un booléen
   déguisé, je le dis). Si Xav préfère une forme booléenne nommée, c'est **un format de plus dans `flags.js`**, donc
   sa décision, pas la mienne.
2. **La confirmation d'un `danger` est construite par le composant, pas décrite écran par écran.** La carte
   n'apporte que deux textes (`cle_confirmation`, `cle_confirmer`). Motif : « Non d'abord, focus par défaut » est une
   règle de **sécurité** — elle ne doit pas pouvoir être oubliée par la prochaine action destructive du catalogue.
3. **Une bascule porte un `etat`** (le nom d'un lecteur d'état injecté) **à la place de `cle_phrase`** : la spec
   liste `cle_phrase` pour toutes les cartes, mais dit aussi qu'une bascule affiche « l'état réel ». Deux lignes sous
   le titre ne tiennent pas à 280 px : le schéma **interdit** la phrase sur une bascule.
4. **Les icônes `[X]` et `[←]` sont déclarées par l'écran racine** (`icone_fermer`, `icone_retour`) : aucun id de
   catalogue n'entre dans le composant.

**« Poche », pas « Poches ».** La spec écrit « Poches » ; le jeu dit « Poche » partout, y compris au titre de l'écran
que la carte ouvre. La carte **réutilise `menu.poche`** pour ne pas annoncer un nom et en afficher un autre. Décision
3 de Xav : renommer = une ligne par langue, et les deux changeront ensemble.

**Tests** : `tests/test_d43_a2_catalogue_menus_2026-09-20.js`, neuf blocs, tous bâtis sur une **copie abîmée du
catalogue réel** (un catalogue inventé pourrait rester vert pendant que le vrai change de forme). Le bloc 9 est le
**test du catalogue** : « la page du follet » ajoutée en JSON seul reste valide. **85 fichiers de test verts.**

**Vérifié dans Chrome** (pas de capture : rien ne change à l'écran) : le jeu démarre avec `menus.json` chargé et
validé, aucun écran d'erreur, aucune erreur console.

---

## Commit A3 — Le composant grille (trois types, navigation 2D, cases stables)

**À ce commit, le jeu ne change pas.** Le composant existe, il est testé et il se voit sur un banc d'essai ; il
n'est **branché sur rien** — c'est A4 qui remplace la liste du menu Pause. C'est ce qui rend A4 retirable seul.

**Livré.**

- **`src/menu_cartes.js`** (pur), suite : `voisin()`, `resoudreCases()`, `premiereCasePresente()`,
  `creerLecteurDirection()` (front montant sur deux axes), `creerPileMenus()`, `construireConfirmation()`.
- **`src/ui/grille_cartes.js`** : le composant DOM. Un seul élément plein écran qui affiche le **sommet d'une pile**
  d'écrans. Il ne connaît ni un id de catalogue, ni une valeur de style, ni l'audio, ni la sauvegarde, ni l'API plein
  écran : le catalogue apporte les écrans, l'appelant apporte les fonctions (`actions`, `etats`, `ecrans`).
- **`src/ui/icone_canvas.js`** : une icône de `visuels.json` dans un petit `<canvas>`. « Meilleur effort » — il
  rattrape ses erreurs à sa frontière (il est appelé depuis la boucle de jeu, qui ne se replanifie pas après une
  exception) : une icône qui rate laisse une carte sans icône, elle ne fige jamais le jeu.
- **`index.html`** : les règles `.ecran-cartes`, `.cartes-*`, `.carte*`. **Aucune couleur, aucun rayon, aucune
  épaisseur n'y est écrit** — tout vient du bloc de jetons d'A1. Toutes les longueurs sont des multiples de `--u`.
- **Deux outils de dev** (`tools/`, jamais chargés par le jeu) : `banc_menu_cartes.html` et `cadre_viewport.html`.

### Les décisions de ce commit

1. **`voisin()` a une seconde passe, et ce n'est pas du zèle.** La spec dit « une case vide se saute ». En ligne
   droite seulement, une carte peut devenir **inatteignable au stick** : avec les seules cases 0 et 3 occupées, ni
   « droite » ni « bas » ne mènent de l'une à l'autre. Et ce n'est pas un cas d'école — c'est l'écran **Sauvegarde**
   (`0 1 / 2 ·`) : depuis Importer, « bas » ne rencontre rien. Retenu : d'abord la ligne droite en sautant les vides ;
   sinon **la carte présente la plus proche dans cette direction**, même en diagonale. Jamais vers l'arrière, jamais
   de bouclage (*provisoire*, comme la spec). **Garantie vérifiée exhaustivement** : les 78 combinaisons de cases
   (2 × 2 et 3 × 2), toute carte atteignable depuis toute autre.
2. **Les cartes sont des `<div>`, pas des `<button>`.** Un bouton natif **garde le focus du navigateur** après un
   clic, et Espace l'active — or Espace est le verbe `ATTACK`, qui valide la carte focalisée. Une bascule cliquée
   puis validée au clavier se serait activée **deux fois dans la même frame** : retour à l'état de départ, sans que
   rien ne bouge à l'écran. (Le défaut existe sur l'ancien menu ; il ne migre pas.)
3. **Les icônes passent par `visuels.js#dessinerVisuel`, dans un `<canvas>`, jamais par du SVG.** C'est « le seul
   point qui interprète `visuels.json` » : un traducteur SVG aurait été un second interprète, condamné à diverger.
   **La teinte est la couleur CSS du canvas** : la feuille de style dit « accent » ou « danger », le code ne
   transporte aucune couleur.
4. **`[X]` et `[←]` occupent LA MÊME place** (en haut à droite), seule l'icône change — « la mémoire du pouce
   prime ». Le mot est dans le DOM, masqué par une règle CSS commentée : **le montrer est une ligne de feuille de
   style**, pour que Xav puisse juger « seul, ou avec son mot » sans nouveau commit de code.
5. **La boîte se cale sur le canvas par le rembourrage** de l'écran (`--jeu-x`, `--jeu-y`), sans boîte intérieure :
   la découpe de `D-42` (en-tête figé + corps) est conservée telle quelle, l'en-tête reste le dernier enfant du
   document. Le composant ne pose que de la **géométrie** ; il ne connaît pas « 270 » (l'appelant donne l'unité).
6. **En-tête : 24 u, mais jamais moins de 40 px de page** (*provisoire*, spec §4.4). À 703 × 280 une unité vaut
   1 px : l'en-tête passe à 40 px et les deux rangées (`1fr`) absorbent la différence — 97 px au lieu de 105.
7. **Tailles de texte de départ** (*provisoires*, en u) : titre d'écran 12 · titre de carte 13 · phrase 9 · état
   d'une bascule 10, **à l'accent** (c'est l'information de la carte). À 703 × 280, 9 u = **9 px de page** : c'est
   petit, et c'est exactement ce que veut dire « comme dessiné en 480 × 270 ». À juger sur le téléphone (`V-27`).
   `text-size-adjust: 100%` est posé : Chrome Android grossit de lui-même les petits textes, il aurait cassé la règle.
8. **`Échap` ne fait rien dans le menu, et c'est voulu à ce palier.** La spec (§4.3) liste « Retour (B, Échap,
   `[←]`) » ; mais `Échap` est le verbe `MENU`, et « `MENU` menu ouvert » **est `Q-36`, tranchée au palier B**. Rien
   n'est codé ici. Au clavier, le retour est la touche `3` (`skill_3`), comme aujourd'hui.

### Ce que les tests prouvent — et ce qu'ils ne peuvent pas prouver

`tests/test_d43_a3_grille_cartes_2026-09-20.js`, dix blocs. **Aucun ne prouve qu'un écran tient, que le focus se
voit, ni qu'une icône se lit** : Node n'a pas de moteur de mise en page. Ce qui est prouvé : `voisin()` (et sa
garantie exhaustive) · cases stables, case réservée, case contextuelle à candidates ordonnées · front montant par
axe, un seul cran en diagonale · pile et **focus rendu à la carte qui avait ouvert l'écran** · confirmation :
« Non » en case 0, toujours · **structure DOM** : la sortie vit dans l'en-tête figé, l'en-tête ne contient jamais
une carte, une case vide n'a **ni écouteur, ni enfant, ni classe de carte** et ne prend jamais le focus · les trois
types (un dossier empile, une bascule reste, une action ferme, un danger confirme d'abord) · un refus s'annonce dans
l'en-tête et laisse la carte inchangée · survol, clic, verbe et bouton d'en-tête passent par **les mêmes fonctions**
· un écran existant **masque** la grille sans la dépiler, et un focus mémorisé sur une carte disparue se replie.
Le faux DOM du test est **volontairement sans** `setProperty`, `setAttribute` ni `classList` : le composant doit
vivre sans. **86 fichiers de test verts.**

### Vérifié dans Chrome — `docs/captures/menus-cartes-2026-09-20/`

Sur le banc d'essai (vrai `menus.json`, vraie feuille de style relue dans `index.html`, vraie couche d'input,
actions factices). Aucune erreur console.

| Capture | Ce qu'elle montre |
|---|---|
| `a3_banc_racine_feu_703x280.jpg` | racine, accent **feu**, case contextuelle présente. Boîte 480 × 270 centrée, `--u` = 1 px, en-tête 40 px |
| `a3_banc_racine_terre_case-contextuelle-vide_703x280.jpg` | accent **terre** ; hors de la Maison la case 3 est **vide**, rien ne glisse |
| `a3_banc_racine_accent-neutre_703x280.jpg` | **accent neutre**, avant le choix du follet |
| `a3_banc_parametres_refus-plein-ecran_703x280.jpg` | trois bascules (état à l'accent) ; **refus annoncé dans l'en-tête**, carte inchangée |
| `a3_banc_sauvegarde_danger_703x280.jpg` | le **danger** : bordure et icône magenta, jamais un aplat |
| `a3_banc_confirmation_703x280.jpg` | confirmation à deux cartes, **focus sur « Non, revenir »** |
| `a3_banc_racine_eau_1920x1080_cadre.png` | **1920 × 1080**, accent **eau**, `--u` = 4 px : mêmes proportions qu'à 703 × 280 |
| `a3_banc_grille-3x2_case-vide_1920x1080_cadre.png` | la grille **3 × 2** (qu'aucun écran réel n'a encore), avec une case vide au milieu d'une rangée |

**Mesuré** : à 1920 × 1080 le corps fait 984 px de contenu pour 984 px de boîte — **aucun débordement**, le filet
défilant ne sert pas. Au clavier, sur le banc : le focus revient bien sur Réinitialiser, puis Sauvegarde, puis
Paramètres en dépilant trois fois.

**Pourquoi `_cadre` dans deux noms de fichier — et ce que ça change.** Une fenêtre de navigateur ne peut pas offrir
un viewport plus grand que l'écran qui la porte : sur cet écran 1920 × 1080, Chrome fenêtré plafonne à **1920 × 949**,
où l'échelle entière du jeu tombe à 3. `tools/cadre_viewport.html` charge la page dans un `<iframe>` de la taille
demandée : `innerWidth`/`innerHeight` y valent **exactement 1920 × 1080** (vérifié), toute la mise en page y est
calculée à cette taille, puis le cadre est **réduit à l'affichage**. Ces deux captures prouvent donc la **mise en
page** à 1920 × 1080 ; elles ne disent rien de la **netteté au pixel** (l'image est rééchantillonnée). Les six
captures à 703 × 280, elles, sont prises dans une vraie fenêtre, pixel pour pixel.

**Ce qui n'est PAS vérifié** : la manette (une manette ne se simule pas ici), le doigt, et tout jugement d'œil —
focus « plus, moins ou bon », lisibilité des icônes, taille des textes sur un vrai téléphone. C'est `V-27`.

---

## Commit A4 — Branchement : la grille remplace la liste du menu Pause

**Livré.**

- **`src/ui/menu.js`** : `initialiserMenu` ne construit plus ni la liste du menu Pause, ni l'écran de confirmation du
  reset. Il construit la grille (`creerMenuCartes`), garde les **cinq écrans de liste** (Poche, Stats, Construction,
  Craft, Coffre — **pas une ligne de `creerEcranListeGenerique` n'a changé**) et le bandeau de placement, et
  **enregistre par id** ce que les cartes citent : six actions, trois lecteurs d'état, trois écrans existants.
  L'élément garde l'id historique `#menu`. API publique : `definirDisponibiliteConstruction` disparaît au profit de
  `definirEvaluateurCondition` ; s'ajoutent `actualiserGeometrie`, `cablage`, `obtenirEtatCartes`. Le reste est
  inchangé — `main.js#maj` n'a pas bougé d'une ligne.
- **`src/main.js`** : le menu reçoit `menus`, `couleurAccent`, `rectangleJeu` (par `calculerRectanglePresentation`,
  la même fonction pure que la présentation du jeu et le hit-test tactile) et `dessinerIcone`. L'orchestrateur
  fournit deux **valeurs nommées** de plus à `flags.js` (`stations_placables`, et par `valeursExternes` —
  `plein_ecran_disponible`) et expose `evaluerCondition`. **Le contrôle de câblage tombe au démarrage**, juste avant
  la boucle, par l'écran d'erreur existant.
- **`locales/`** : six clés mortes retirées (les libellés de l'ancienne liste).
- **Six tests existants adaptés**, un test neuf.

### Ce qui change pour le joueur — et ce qui ne change pas

| | Avant | Maintenant |
|---|---|---|
| Menu Pause | une liste de 8 à 10 entrées, qui défilait | **une grille de 4 cases**, qui ne défile jamais |
| Poche, Stats | 3ᵉ et 4ᵉ entrées | Héros → Poche / Stats. **Écrans inchangés** |
| Construction | entrée contextuelle | **case contextuelle** (bas-droite), vide hors de la Maison. **Écran et mode inchangés** |
| Langue, Musique, Plein écran | entrées à libellé changeant | Paramètres → trois **bascules** ; le titre ne bouge plus, **la ligne d'état dit l'état réel** |
| Exporter, Importer, Réinitialiser | trois entrées | Paramètres → Sauvegarde |
| Confirmation du reset | un écran « Oui / Non », focus sur Non | deux cartes : **« Non, revenir »** (focus) · **« Oui, réinitialiser »** (magenta) |
| Fermer | dernière entrée de la liste | **`[X]` dans l'en-tête figé** ; `[←]` au même endroit dans les sous-écrans ; B partout |
| Craft, Coffre (par `INTERACT`) | — | **inchangés** |

Un écran de plus à traverser pour Poche et Stats (Héros d'abord) : c'est l'arborescence de la spec, je le signale
parce que c'est la Poche qu'on ouvre le plus souvent — le raccourci à la croix directionnelle est hors périmètre (§8).

### Les décisions de ce commit

1. **Six sous-contrats au lieu de sept.** La spec dit « les sept contrats existants ne bougent pas encore ». Six
   n'ont pas bougé ; le septième — la confirmation du reset — **ne pouvait pas survivre** : la spec demande au même
   palier qu'elle devienne un écran de deux cartes. Elle est donc un **niveau de la pile de la grille**, et
   `menu.estOuvert()` OR-combine `menuCartes` et les cinq écrans de liste. La grille applique le **même contrat**
   que les autres (intention ET DOM visible) : masquée derrière Poche, elle n'est pas « ouverte », c'est Poche qui
   l'est. Conséquence heureuse : pendant le placement en Construction, `menu.estOuvert()` vaut faux **sans que
   personne ait à fermer puis rouvrir quoi que ce soit** — la classe de bug de `SD_construction-ecrans-orphelins`.
2. **Un seul `return` par frame dans `traiterInput`.** B qui ferme Stats ne dépile pas **aussi** l'écran Héros :
   un verbe consommé par un écran de liste n'est jamais revu par la grille dans la même frame. Testé.
3. **`menu.fermer()` et `menu.ouvrir()` ferment la grille D'ABORD.** Fermer un écran de liste rappelle
   `reafficher()` ; une grille déjà vidée l'ignore. Dans l'autre ordre, `menu.fermer()` aurait fait **ressurgir** la
   grille qu'il venait de cacher. Testé (« jamais deux écrans visibles »).
4. **`stations_placables` compte, il ne dit pas oui/non.** L'ancienne entrée s'affichait dès que le héros était
   dans une structure ; la carte s'affiche s'il y a **au moins une station déplaçable** là où il se tient — ce que
   disait déjà le commentaire de l'ancien code, pas son test. Dans la Maison d'aujourd'hui, c'est identique.
5. **`Importer` garde un `<input type="file">`**, le seul contrôle natif qui reste : caché, hors de toute grille,
   déclenché par la carte. **Limite connue et inchangée** : à la manette (lue par sondage, donc sans geste aux yeux
   du navigateur) le sélecteur peut ne pas s'ouvrir, exactement comme le plein écran (`D-30`).
6. **`ouvertIntentionnellement()` est retiré de `creerControleurMenu`.** Son seul appelant était le retour de la
   confirmation par B, qui n'existe plus ; son commentaire décrivait un cas disparu. Aucun test ne s'en servait.

### Six tests adaptés — leur contrat n'a pas bougé

Ils cherchaient `#menu-construction`, `#menu-fermer`, `#menu-confirmation-reset`. Chacun garde **son** sujet :

- `test_construction`, `test_sd_menu_ecrans_orphelins`, `test_sd_construction_parite_clic_verbe` : le clic sur
  `#menu-construction` devient un clic sur la carte `carte_construction` ; « focaliser la N-ième entrée » devient
  « amener le focus sur telle carte **au stick, en deux dimensions** », position **lue sur la grille**, jamais codée
  en dur. L'invariant d'`ecrans_orphelins` (`menu.estOuvert()` = au moins un écran réellement visible, vérifié
  après **chaque** verbe) est **vert sans avoir été touché** : c'est déjà l'invariant du palier B.
- `test_phase1_sd_menu_reset_invisible` : les hypothèses A et B de la fiche (« jamais attaché », « enfant du
  conteneur qu'on masque ») n'ont plus d'objet — il n'y a plus de second élément à oublier. Le contrat est revérifié
  à l'identique, et renforcé : la confirmation est *effectivement* visible · focus par défaut sur « Non » ·
  **`ATTACK` martelé sur le focus par défaut ne réinitialise jamais** · « Oui » réinitialise une fois et ferme tout.
- `test_d42…` : la règle (« fermable au tactile, sans défilement ») est vérifiée sur les **six** écrans. Le bloc
  « le focus demande la mise en vue » passe sur un écran de **liste** (12 recettes) : la grille, elle, n'a rien à
  ramener en vue.
- `test_d30…` : l'entrée « Plein écran / Quitter le plein écran » est devenue une carte bascule ; les cinq mêmes
  assertions portent sur sa **ligne d'état**. Ajouté : sans API, la carte tombe **et sa case reste vide**.

Les faux DOM des plus anciens tests n'ont pas de setter `className` : ils retrouvent une carte par `data-carte`, et
la sortie par `data-sortie` (un repère de données, posé sur le bouton d'en-tête pour cette raison).

### Le test neuf

`tests/test_d43_a4_branchement_menu_2026-09-20.js`, sept blocs, sur **l'assemblage réel** (vrai `ui/menu.js`, vrai
orchestrateur, vrai `flags.js`, vrai `menus.json`) : le **câblage du jeu passe le contrôle de démarrage dans les deux
sens** · `MENU` ouvre la grille, la case contextuelle suit le lieu **par le registre de flags** · l'accent est relu à
chaque ouverture (neutre = rien de posé ; un 4ᵉ follet recolore sans code) et la géométrie suit le canvas · Poche,
Stats et Construction s'ouvrent depuis leurs cartes et se referment par B **sans dépiler la grille** · exporter /
importer / réinitialiser · ouvrir/fermer ne laissent **jamais deux écrans visibles** · **aucun id de carte ou d'écran
du catalogue** dans `ui/menu.js` ni dans `ui/grille_cartes.js`, qui ignorent toujours l'audio, la sauvegarde et l'API
plein écran. **87 fichiers de test verts.**

### Vérifié dans Chrome, dans le VRAI jeu — `docs/captures/menus-cartes-2026-09-20/`

Sauvegarde locale de Xav (follet d'eau, héros **hors** de la Maison). Verbes envoyés par de vrais événements clavier
(`Échap`, flèches, `Espace`, `3`), le plein écran par de **vrais clics**. Aucune erreur console, aucun écran d'erreur
au démarrage — donc **le contrôle de câblage est vert dans le navigateur aussi**.

| Geste | Résultat observé |
|---|---|
| `Échap` | le menu s'ouvre : accent **eau** (`#3daaff`), boîte calée sur le canvas (`--jeu-x` 111 px, `--jeu-y` 5 px, `--u` 1 px) |
| `Espace` sur Héros, puis sur Poche | écran Poche **inchangé** ; `3` le ferme, la grille revient **sur Héros, focus sur Poche** |
| → `Espace` sur Stats, `3` | idem, focus rendu à **Stats** |
| Paramètres → Langue ×2 | « Français » → « English » (**tout l'écran passe en anglais**, titre compris) → « Français » |
| Paramètres → Musique ×2 | « Coupée » → « Activée » → « Coupée » — l'état réel de la sauvegarde, **remis comme trouvé** |
| **vrai clic** sur Plein écran | `fullscreenElement` posé, viewport 703 × 280 → **1920 × 1024**, état « Activé », **la boîte se recale en direct** (`--u` 3 px), le menu reste ouvert ; re-clic → retour, « Désactivé » |
| Sauvegarde → `↓` → `Espace` | confirmation : **focus sur « Non, revenir »** ; `Espace` → retour à Sauvegarde, **focus sur Réinitialiser** |
| `3` ×3 | Paramètres (focus Sauvegarde) → racine (focus Paramètres) → **menu fermé** |

| Capture | Ce qu'elle montre |
|---|---|
| `a4_jeu_racine_hors-maison_703x280.jpg` | le vrai jeu derrière le menu (HUD et barre d'action devinés à 92 %) ; case contextuelle **vide** |
| `a4_jeu_parametres_703x280.jpg` · `a4_jeu_sauvegarde_703x280.jpg` · `a4_jeu_confirmation_703x280.jpg` | les trois autres écrans du palier, dans le jeu |
| `a4_jeu_parametres_plein-ecran-reel_1920x1024.jpg` | **vrai** plein écran (pas le cadre) : la carte dit « Activé », échelle 3 |
| `a4_jeu_racine_1920x1080_cadre.jpg` · `a4_jeu_sauvegarde_1920x1080_cadre.jpg` | le vrai jeu dans un viewport de **1920 × 1080** (cadre) |

**Mesuré à 1920 × 1080** : `--u` = 4 px · en-tête **96 px** (24 u) · carte **888 × 420 px** (222 u × 105 u) — **le budget
de la spec, au pixel** · corps 984 px pour 984 px, aucun débordement. À 703 × 280 : en-tête 40 px (le plancher
tactile), rangées de 97 px.

**Ce que je n'ai PAS fait, et pourquoi.** Je n'ai **pas** déplacé le héros de la sauvegarde locale de Xav jusque dans
la Maison : la carte Construction n'a donc été vue que sur le banc (`a3_banc_racine_feu_703x280.jpg`), et prouvée
par les tests d'assemblage. Je n'ai cliqué ni « Oui, réinitialiser », ni Exporter, ni Importer dans le vrai jeu
(le premier efface sa partie, les deux autres ouvrent un téléchargement et un sélecteur de fichier). **Ni la manette
ni le doigt n'ont été essayés** — aucun des deux ne se simule ici. Tout cela est `V-27`.

---

## Les identifiants de cette session

| Id | Sujet | État |
|---|---|---|
| `V-25`, `V-26` | Plein écran au tactile · menu fermable au tactile | **validées par Xav le 20/09**, sur téléphone, par l'URL publique (« all good ») |
| `D-42`, `D-30` | Les deux correctifs de la mini-file « menu tactile » | **closes pour de bon**, descendues en §8 |
| `D-43` | Chantier « menus en grille de cartes » | **ouverte**, *en cours* — **palier A livré**, B et C non commencés |
| `V-27` | Validation du palier A | **ouverte** — à Xav |
| `D-44` | Le choix de la langue n'est pas sauvegardé | **ouverte**, P2 — constatée, **non corrigée** (hors périmètre) |
| `Q-37` | « Lieu » / « capacité » : valeur nommée 0/1, ou une forme booléenne de plus dans `flags.js` ? | **ouverte** |
| `Q-38` | « Poche » ou « Poches » ? | **ouverte** |
| `Q-36` | `MENU` doit-il fermer le menu ? | **inchangée** — la ligne dit que la spec la tranche au palier B ; rien n'est codé |

Les identifiants que la spec annonçait « à créer » (`D-43`, `V-27`) étaient **libres** : aucun décalage.
**Prochains identifiants libres** : `D-45`, `Q-39`, `V-28`, `R-17`.

## Ce que je n'ai pas décidé seul

1. **`Q-37`** — la spec parle d'une condition de « lieu » que `flags.js` n'a pas. J'ai tenu « aucun nouveau format » :
   deux valeurs nommées. La seconde (`plein_ecran_disponible`, 0 ou 1) est un booléen déguisé, et je le dis.
2. **`Q-38`** — « Poche », comme le jeu, plutôt que « Poches », comme la spec.
3. **`Échap` ne fait rien menu ouvert.** La spec (§4.3) le liste parmi les retours ; c'est le verbe `MENU`, donc
   `Q-36`, donc le **palier B**. Au clavier le retour est la touche `3`, comme aujourd'hui.
4. **`voisin()` va en diagonale quand la ligne droite est vide.** La spec dit seulement « une case vide se saute » ;
   sans cette seconde passe, des cartes deviennent inatteignables au stick. À sentir à la manette.
5. **`[X]` et `[←]` à la même place, en haut à droite**, sans leur mot (le mot est une ligne de CSS).
6. **Les tailles de texte** (12 / 13 / 9 / 10 u) et **l'état d'une bascule à l'accent** : valeurs de départ.
7. **L'accent neutre contrôlé comme un follet**, et **« jamais le magenta » = jamais *proche* du magenta**.
8. **Deux outils de dev dans `tools/`** (banc d'essai, cadre à viewport imposé). Ils ne sont chargés par rien, mais
   GitHub Pages les servira avec le reste du dépôt si la branche est fusionnée — inoffensif, à savoir.
9. **`CLAUDE.md` fait 330 lignes** pour un plafond indicatif de 300 (il en faisait 312 à l'ouverture). Je n'ai rien
   coupé : ce qui se retire d'un fichier d'instructions mérite d'être relu par Xav. Candidat évident : la table des
   décisions datées, dont les plus anciennes sont toutes dans `docs/archives/`.

## Ce qui reste dû, et à qui

- **À Xav — `V-27`** : menu principal **et** écran Sauvegarde, à la **manette**, à la **souris** et au **doigt**, à
  1920 × 1080 et sur téléphone. L'accent des trois follets et l'accent neutre (`tools/banc_menu_cartes.html?follet=feu`
  les montre sans changer de partie). Le focus : « plus », « moins » ou « bon ». `[X]` seul, ou avec son mot.
  **Le téléphone passe par l'URL publique : donc après fusion et `push`, qui restent à sa main.**
- **À Xav, à trancher** : `Q-37`, `Q-38`, et les points 3 à 7 ci-dessus. `Q-36` au palier B.
- **Palier B : non commencé.** Il attend `V-27`.

## Rappel de manipulation

```
git log --oneline main..menus-cartes      # les 5 commits : ménage, A1, A2, A3, A4
git merge <hash>                          # depuis main : fusionne JUSQU'À ce commit
git revert <hash>                         # retire un seul commit
```

**Ce qui se retire seul, vérifié.** **A4 se retire seul** : `git revert` propre, suite de tests verte sans lui — le jeu
retrouve alors **exactement** l'ancien menu en liste, et A1 à A3 restent en place sans rien changer à l'écran (jetons
inutilisés, catalogue chargé et validé, composant visible sur le banc). C'est le retrait qui compte : si les cartes
ne plaisent pas, **un seul revert rend l'ancien menu**. A3, A2 et A1, eux, sont une **tranche verticale** : chacun
porte le suivant (A4 monte le composant d'A3, qui lit le catalogue d'A2 et les jetons d'A1). Ils se retirent donc
**dans l'ordre inverse** — A4 d'abord, puis A3, puis A2, puis A1 — jamais au milieu. Le commit de ménage est de la
documentation pure.

Et le rappel qui compte plus que les autres : **`push` sur `main` publie le jeu.** Rien n'a été poussé.

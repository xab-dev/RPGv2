---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, palier A
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, V-27, D-42, D-30, V-25, V-26, Q-36]
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

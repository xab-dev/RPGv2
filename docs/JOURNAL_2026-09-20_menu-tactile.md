---
projet: RPG V2
episode/session: Polish — menu tactile fermable, puis plein écran
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-02, D-03, D-14, D-30, D-31, D-42, Q-20, A-07, R-16, V-25, V-26]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Mini-file « menu tactile et plein écran » (20/09)

Branche **`menu-tactile-2026-09-20`**, créée depuis `main`. **Aucun `push`** — et la consigne pèse plus lourd
qu'hier : `push` sur `main` **publie le jeu** sur `https://xab-dev.github.io/RPGv2/`.

Une ligne par commit, écrite **au moment du commit** (règle d'hygiène de contexte : ce qui n'est dit que dans la
conversation se perd quand elle se résume).

## §0 ter — Chrome est connecté

**Oui.** L'extension répond, un onglet est disponible dès la première seconde de la session. Le §0 ter s'applique
donc dans sa branche complète : le diagnostic du commit 1 se fait **dans le navigateur de référence**, à la
fenêtre exacte du constat de Xav (**703 × 280**), et les captures **avant** et **après** sont prises dans
`docs/captures/menu-tactile-2026-09-20/`.

---

## Commit 0 — Ménage de journal et constats (doc seule)

**Ménage.** `docs/JOURNAL_2026-09-20.md` (la nuit n° 2, sept commits, tous fusionnés dans `main`) part dans
`docs/archives/JOURNAL_2026-09-20_nuit-file-micro-tickets-2.md`, avec sa ligne d'INDEX. `CLAUDE.md` ne garde
qu'un journal : celui-ci.

**Ce que la décision de Xav ferme.**

- **`D-31` close** — « ça vient du matériel ». Les ≈ 18 ms par frame de l'A04 ne seront pas expliquées, et c'est
  une réponse, pas un abandon : l'appareil sort des cibles (« juste bon à changer »). Le dernier doute technique
  avait été retiré le matin même par `R-16` (voir plus bas) : servi **en ligne** plutôt que par le Wi-Fi local,
  l'appareil rend **exactement pareil**.
- **`A-07` sans objet** — le profil USB n'avait d'autre raison d'être que d'expliquer `D-31`.
- **`D-02` et `D-03` dégelées** (P3). Relues à la lumière de la décision : il n'y a **rien à y corriger
  aujourd'hui**. `D-02` (« `dessiner()` coûte 12 ms ») était une mesure **Firefox** ; sous le navigateur de
  référence, `dessiner()` ne mesure que l'émission des ordres (0,34 ms à l'échelle forcée 8). `D-03` (l'instrument
  qui se contredit) est **déjà expliquée** : minuterie arrondie à 1 ms sous Firefox, deltas calés sur le vsync —
  la moyenne est fiable, les valeurs par frame ne le sont pas. Les deux restent ouvertes comme *matière à
  instrument*, pas comme dette à payer.
- **Plancher mobile revu à la hausse, définition `[OUVERT]`** (`Q-20` part mobile, `D-14`). Elle se fixera sur le
  téléphone du neveu (`V-10`), pas sur un appareil qu'on a cessé de viser. J'ai touché `D-14` bien qu'elle ne
  soit pas citée par le brief : elle nommait l'A04 comme candidat, la laisser telle quelle aurait fait mentir le
  suivi dès la ligne suivante. C'est du ménage, pas un ticket.

**`R-16`, et pourquoi pas `R-15`.** Le brief demandait `R-15`. Cet identifiant a **déjà servi** : le brief de la
nuit du 19 au 20 l'employait pour désigner le relevé de nuit qui est devenu la ligne `R-03`. Le réutiliser
contredirait la règle 1 du suivi (« un identifiant n'est jamais réutilisé »). Le brief prévoit ce cas :
« si un identifiant à créer est déjà pris, prendre le suivant et le dire dans le journal ». `R-15` reste donc
**brûlé, sans ligne propre**, et le relevé du 20/09 03 h 13 est **`R-16`** : A04, Chrome Android, **en ligne**,
hors plein écran, échelle naturelle 3 — **37,3 fps**, delta moyen 26,81 ms, `maj()` 1,46 ms, `dessiner()`
5,78 ms, 42 recalculs du calque statique (moy. 8,05 ms). À comparer à `R-12` (36,8 fps, 42 recalculs à 8,69 ms) :
**identique**. Le Wi-Fi local n'y était pour rien.

**Nouveau point de comparaison bas**, déclaratif et sans relevé : un portable **Windows 7 sans GPU**, sous Chrome,
tient **56 à 58 fps** et se joue sans grosse saccade. Ce n'est pas une mesure et ça ne se compare pas ligne à
ligne avec le registre — mais ça dit qu'une machine sans accélération matérielle joue, là où l'A04 ne joue pas.

**Ouvert, et rouvert.**

- **`D-42`** (P1) — le menu Pause enferme le joueur au tactile. Constat de Xav le 20/09 à 03 h 15, Chrome
  Android, hors plein écran : la page fait ~703 × 280 px CSS en paysage, la liste dépasse, « Fermer » est hors
  écran, rien ne défile au doigt. Il a dû quitter le jeu. La ligne dit explicitement que **tous** les écrans
  partagés sont la même classe de défaut, et que le correctif vit au niveau partagé.
- **`D-30` rouvert** — le plein écran ne se déclenche jamais au premier appui. L'hypothèse inscrite dans la ligne
  est celle du brief, et elle contredit ce que disait le journal de la nuit : Chrome n'accorderait pas
  l'activation utilisateur au `touchstart`, mais au `touchend`. À vérifier avant tout code (commit 2).
- **`V-25` réécrite**, **`V-26` créée** (le menu fermable au tactile).

**`CLAUDE.md`** gagne en tête de son état du dépôt : l'URL publique, et **`push` sur `main` = publication**.

---

## Commit 1 — `D-42` : un menu qu'on peut toujours fermer

### La cause racine, mesurée avant d'être corrigée

Fenêtre Chrome réellement redimensionnée pour un viewport de **703 × 280 px CSS** — la taille exacte du constat.
Menu Pause ouvert, quatre mesures, dans cet ordre :

| Mesure | Valeur | Ce qu'elle dit |
|---|---|---|
| Boîte de `#menu` | **703 × 280** | La hauteur était **déjà bornée** (`position: fixed; inset: 0`). Suspect « hauteur non bornée » : **écarté**. |
| `touch-action` calculé sur `#menu` | **`auto`** | `touch-action` **n'est pas une propriété héritée** : le `none` de `html, body` ne descendait pas sur le menu. Suspect « la page est bâillonnée » : **écarté comme cause**. |
| `scrollTop = 200` → relu | **0** | La boîte **n'était pas un conteneur défilant** (`overflow: visible`). Voilà pourquoi rien ne défilait, au doigt comme à la souris. Avec `overflow-y: auto` posé à la volée, le même `scrollTop` donne **59** : il y avait bien 59 px à parcourir. |
| Position des enfants | `<h2>` à **−39 px**, « Fermer » à **318 → 339 px** | Contenu de **339 px** dans une boîte de **280**. `justify-content: center` répartit le débordement des **deux** côtés : le titre sort par le haut, « Fermer » par le bas. |

**Deux causes, pas une** — et c'est ce qui décide du correctif. `overflow: auto` seul aurait rendu « Fermer »
atteignable *en défilant*, mais **n'aurait jamais ramené le titre** : `scrollTop` ne descend pas sous 0, ce qui
passe au-dessus du bord de départ d'un conteneur centré est perdu pour de bon. Centrer un contenu qui déborde est
la seconde cause, aussi réelle que la première.

**Un troisième fait, qui n'est pas une cause mais qui commande la forme du correctif.** Un écran d'UI recouvre le
canvas. Or les boutons tactiles du jeu — y compris `skill_3`, le « retour » qui ferme les écrans à la manette —
**sont dessinés sur le canvas** et écoutés par lui. Menu ouvert, ils sont hors d'atteinte du doigt. « Fermer »
n'était donc pas une sortie parmi trois : **c'était la seule**, et elle était hors écran. D'où la règle inscrite
dans `CLAUDE.md`.

### Ce qui est livré

- **`index.html`** : `touch-action: none` quitte `html, body` pour le **canvas**, sa seule cible réelle (il visait
  le joystick, pas les menus). Et une classe partagée `.ecran-ui` : hauteur `100vh` **puis** `100dvh` (l'ordre
  fait le repli, jamais un test de capacité en JS), `overflow: hidden`, colonne flex.
- **En-tête figé** (`.ecran-ui-entete`, `flex: 0 0 auto`) : titre, aide, et **« Fermer »**. Il ne défile jamais.
- **Corps défilant** (`.ecran-ui-corps`) : `overflow-y: auto`, `touch-action: pan-y`, `overscroll-behavior: contain`
  — et `min-height: 0`, sans lequel un enfant de flex grandit pour tout contenir et **rien ne défile jamais**.
- **`margin: auto 0` sur la liste**, jamais `justify-content: center` sur le parent : centrée tant qu'elle tient,
  collée en haut dès qu'elle déborde. C'est la correction de la seconde cause.
- **Le focus suit le défilement** : `scrollIntoView({ block: 'nearest' })` sur l'entrée focalisée, dans
  `appliquerFocusVisuel` — le seul endroit où le focus se pose, donc valable pour les sept écrans d'un coup.
- **Au niveau partagé, jamais écran par écran** : `appliquerStylePleinEcran` (neuf styles inline) devient
  `appliquerClasseEcran` (une classe). Les sept écrans — menu Pause, confirmation de reset, Poche, Craft, Coffre,
  Stats, Construction — le reçoivent par construction, et le test le vérifie écran par écran.

### Deux décisions prises dans le périmètre, et qu'il faut pouvoir défaire

1. **`order: -1` sur l'en-tête.** Il est le **dernier** enfant du DOM et le **premier** à l'écran. Motif :
   « Fermer » reste ainsi la dernière entrée du document, comme il est le dernier cran de navigation. Ce n'est pas
   cosmétique — les trois tests d'écrans existants vérifient « Fermer toujours en dernier » en lisant l'ordre du
   DOM, et ils sont **verts sans une ligne modifiée**. C'est la preuve, pas seulement l'affirmation, que ce ticket
   n'a pas touché à l'ordre des entrées.
2. **La confirmation de reset garde « Oui » et « Non » ensemble** dans le corps. Ici la sortie n'est pas
   « Fermer », c'est « Non » — sortir l'un des deux termes d'un choix destructif de son couple rendrait la question
   moins lisible, pas plus. Deux entrées ne peuvent pas déborder : mesuré, l'écran tient entier à 703 × 280.
   `[OUVERT]` si Xav préfère l'uniformité stricte.

### Ce que les tests prouvent — et ce qu'ils ne peuvent pas prouver

`tests/test_d42_menu_fermable_tactile_2026-09-20.js`, six blocs. **Aucun ne prouve « ça tient dans l'écran »** :
Node n'a pas de moteur de mise en page, et le fichier le dit en tête plutôt que de le laisser croire. Ce qui est
prouvé : la feuille de style dit bien les trois choses qui manquaient (page libérée · écran borné avec son repli
**dans le bon ordre** · corps défilant au doigt, sans `justify-content: center`) · « Fermer » n'est plus un enfant
de la liste défilante, menu Pause **et** écran générique · il reste la dernière des 9 entrées · les **7** écrans
portent le même habillage, un corps et une liste chacun (le bandeau de Construction exclu, il n'est pas un écran) ·
le focus demande la mise en vue de l'entrée sélectionnée, **et d'elle seule**, à chaque cran · un clic sur
« Fermer » ne ferme qu'une fois après **cinq** reconstructions de la liste.

Ce dernier bloc n'est pas décoratif : l'élément « Fermer » **survit** désormais aux reconstructions (il est dans
l'en-tête, que `reconstruire()` ne réécrit pas). Y empiler un écouteur à chaque `rafraichir()` aurait rappelé
`onFermer` autant de fois qu'il y a eu de crafts. Ses deux gestionnaires sont donc posés **une fois**, à la
construction de l'écran — même raison que le `el.onmouseenter =` de `construireMenuPrincipal`.

**83 fichiers de test verts.**

### Vérifié dans Chrome, à 703 × 280

Après correctif, même fenêtre : « Fermer » à **8 px du haut**, entièrement visible ; le corps défile de **43 px**
(menu Pause) ; sur un écran générique rempli de **20 entrées** — 736 px de contenu dans 247 px de corps —
l'en-tête ne bouge pas d'un pixel et le corps défile de **489 px**. `touch-action` calculé : `auto` sur `body`,
`none` sur le canvas, `pan-y` sur le corps. Captures avant/après : `docs/captures/menu-tactile-2026-09-20/`.

Ce qui n'est **pas** vérifié, et ne peut pas l'être ici : le **doigt**. Un navigateur de bureau ne fait pas défiler
au toucher. C'est `V-26`, sur un vrai téléphone, par l'URL publique.

### Signalé, pas corrigé : `Q-36`

Le brief demandait de dire si le verbe `MENU` referme déjà le menu. **Il ne le fait sur aucun périphérique** :
`main.js#maj` n'ouvre le menu que s'il est fermé (`else if (!menu.estOuvert())`), et rien ne traite `MENU` pendant
qu'il est ouvert. Je ne l'ai pas ajouté — le brief l'interdit explicitement. Ligne `Q-36` ouverte, avec les trois
éléments pour trancher : le bouton tactile `MENU` devient inatteignable une fois l'écran ouvert (le canvas est
recouvert) · une bascule sur la même touche est l'usage courant · mais elle créerait un **second** chemin de
fermeture à côté de `onAnnuler`, et c'est exactement la classe de bug de `SD_construction-parite-clic-verbe`.

*(le reste s'écrit commit par commit)*

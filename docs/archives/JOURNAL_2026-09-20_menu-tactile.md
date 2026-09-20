---
projet: RPG V2
episode/session: Polish — menu tactile fermable, puis plein écran
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: complet
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-02, D-03, D-14, D-30, D-31, D-42, Q-20, Q-36, A-07, R-16, V-25, V-26]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Mini-file « menu tactile et plein écran » (20/09)

Branche **`menu-tactile-2026-09-20`**, créée depuis `main`. Écrite sans aucun `push` — la consigne pèse
plus lourd qu'hier, `push` sur `main` **publie le jeu** sur `https://xab-dev.github.io/RPGv2/`.

**Épilogue (20/09, après rapport)** : Xav a demandé la fusion et le `push`. Avance rapide dans `main`, poussée :
les trois commits sont **en ligne** (`b90dd7e`). C'est ce que `V-25` et `V-26` demandaient — elles ne se jouent
que sur un vrai téléphone, par l'URL publique.

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

---

## Commit 2 — `D-30` rouvert : plein écran au relâchement, et par le menu

### L'hypothèse du brief était la bonne, et le journal de la nuit avait tort

Le brief demandait de vérifier **avant tout code**, et de s'arrêter si l'hypothèse tombait. Elle tient, sur deux
sources indépendantes.

**1. La spécification.** Le contrat d'« activation utilisateur » du HTML définit l'*activation triggering input
event* comme tout événement de confiance dont le type est l'un de : `keydown`, `mousedown`, `pointerdown`,
`pointerup`, **`touchend`**. `touchstart` **n'y est pas** — et la raison est logique : au moment du contact, le
navigateur ne sait pas encore s'il a affaire à un appui ou au début d'un glissement. Il attend de le savoir.

**2. Chrome, mesuré.** Une demande de plein écran émise sans activation utilisateur est **rejetée** :
`TypeError: Permissions check failed`. Pas une exception synchrone, pas un silence — un **rejet de promesse**.

Ce qui donne l'enchaînement complet, et il n'a rien d'un bug isolé :

1. la demande partait de `touchstart`, donc **sans activation** ;
2. Chrome rejetait la promesse ;
3. le contrat « meilleur effort » (`promesse.then(paysage, () => {})`) **avalait le rejet**, comme il doit le
   faire — c'est lui qui garantit qu'un refus ne casse pas le jeu ;
4. le loquet, posé sur la **tentative** et jamais réarmé — ce qui est également voulu, pour ne pas harceler le
   joueur — interdisait toute demande suivante.

**Trois pièces saines, un enchaînement qui ne pouvait jamais aboutir.** Aucune des trois n'est à corriger ; c'est
le point de départ qui était faux. C'est aussi pourquoi le défaut était invisible : le sous-système faisait
exactement ce qu'on lui avait demandé, en silence, une fois, et pour toujours.

### Ce qui est livré

- **`touch.js`** : le crochet part de `touchend`. Il est renommé `surRelachement` — d'après ce qu'il fait, pas
  d'après ce qu'on en attend ; le module ne sait toujours pas qu'un plein écran existe. **Jamais sur
  `touchcancel`** (un contact annulé par le système n'accorde aucune activation, et aurait brûlé le loquet pour
  rien). Le crochet part **après** la mise à jour de l'état d'input : ce qu'il déclenche redimensionne la page.
- **`plein_ecran.js`** : deux chemins, un seul loquet. `demanderUneFois()` reste le chemin **automatique**
  (latched, inchangé dans son principe) ; `basculer()` est le chemin **explicite** du menu — il ne passe pas par
  le loquet mais il le **pose**, sans quoi le premier doigt reposé après une sortie volontaire remettrait le
  joueur en plein écran contre son gré. `estActif()` lit `document.fullscreenElement` : **l'état réel, jamais un
  booléen tenu à jour ici**. Toutes les sorties rendent une promesse qui se résout, jamais qui rejette.
- **Entrée de menu à bascule** : « Plein écran » / « Quitter le plein écran », libellé écrit **uniquement** depuis
  l'état réel, relu sur `fullscreenchange` (câblé par `main.js`). Contextuelle comme Construction : **absente si
  l'API n'existe pas**, présente sur PC (défaut retenu — F11 existe, mais l'entrée ne gêne personne et rend le
  réglage découvrable à la souris).
- **Le refus est dit au joueur** : une ligne localisée FR/EN dans l'en-tête du menu, et le libellé **ne bouge
  pas**. C'est le cas de la manette, et il n'est pas contourné (voir plus bas).
- **`ui/menu.js` ne connaît pas l'API** : trois fonctions injectées (`pleinEcranDisponible`, `pleinEcranActif`,
  `basculerPleinEcran`), comme la musique et la poche. Un test le vérifie sur le source, commentaires exclus.

### Vérifié de bout en bout dans Chrome, à 703 × 280

| Geste | Résultat observé |
|---|---|
| **Vrai clic** sur « Plein écran » | `document.fullscreenElement = HTML` · viewport 703 × 280 → **1920 × 1024** · libellé passé à « Quitter le plein écran » · aucun message |
| **Vrai clic** sur « Quitter le plein écran » | `fullscreenElement = null` · retour à 703 × 280 · libellé revenu · le menu est resté ouvert et utilisable |
| Clic **sans geste utilisateur** (`b.click()` depuis la console) | refus · libellé **inchangé** · message « Le navigateur a refusé le plein écran. Essaie avec le doigt ou la souris. » · menu cohérent |

Ce troisième cas n'est pas un artifice de test : **c'est exactement la situation de la manette.** Une manette est
lue par **sondage** (`navigator.getGamepads()` à chaque frame), pas par événement — le navigateur ne voit donc
aucun geste, et refuse. Le piège annoncé par le brief est donc **vérifié**, et il n'est pas contourné : le refus
est dit, pas masqué. Capture : `docs/captures/menu-tactile-2026-09-20/d30_refus-sans-geste_703x280.jpg`.

Ce qui n'est **toujours pas** vérifié : le **doigt** sur un vrai téléphone. Un navigateur de bureau n'a pas
d'événement `touchend` réel à offrir. C'est `V-25`, réécrite, par l'URL publique après fusion et `push` de Xav.

### Les tests

`tests/test_d30_plein_ecran_tactile_2026-09-20.js`, neuf blocs. Les **cinq cas d'échec** sont conservés et
étendus : chacun est désormais exercé par les **deux** chemins (demande automatique et bascule du menu), plus
deux nouveaux — un `document` absent rend `estActif() === false` plutôt qu'une exception, et un refus de sortie
ne remonte pas. Ajoutés : le crochet part au relâchement et **pas** au contact, ni sur `touchcancel` · la bascule
fait l'aller **et** le retour · l'état réel fait foi même quand personne n'a rien demandé (le joueur sort par
Échap) · un refus laisse l'état cohérent · sortir par le menu ne réarme pas l'automatique · l'entrée de menu
affiche le bon libellé, le change dans les deux sens, et disparaît sans API. **83 fichiers de test verts.**

### Une décision de forme, signalée

L'entrée s'insère **juste après « Musique »** : ce sont les deux seuls réglages d'ambiance du menu, et les
regrouper les rend découvrables ensemble. Conséquence assumée : c'est la **deuxième** entrée contextuelle du menu
Pause (avec Construction), et l'ordre de navigation compte désormais 8, 9 ou 10 entrées selon le contexte. Rien
d'autre n'a bougé de place. `[OUVERT]` si Xav la préfère ailleurs — c'est une ligne à déplacer.

---

## Les identifiants de cette mini-file

| Id | Sujet | État |
|---|---|---|
| `D-31` | A04 : ≈ 18 ms par frame hors du code du jeu | **close** (décision de Xav : « ça vient du matériel ») |
| `A-07` | Profil Chrome de l'A04 par USB | **sans objet** (tombe avec `D-31`) |
| `D-02`, `D-03` | Instrument et coût de `dessiner()` | **dégelées**, P3, rien à y corriger aujourd'hui |
| `Q-20`, `D-14` | Plancher mobile | plancher **revu à la hausse**, définition `[OUVERT]` (téléphone du neveu) |
| `R-16` | Relevé A04 en ligne, 37,3 fps | **créé** (et non `R-15`, déjà employé — voir commit 0) |
| `D-42` | Menu non fermable au tactile | **ouverte puis close le 20/09**, validation due `V-26` |
| `D-30` | Plein écran au tactile | **rouverte puis re-close le 20/09**, validation due `V-25` (réécrite) |
| `Q-36` | Le verbe `MENU` doit-il aussi fermer le menu ? | **ouverte**, signalée sans rien ajouter (consigne du brief) |
| `V-25`, `V-26` | Les deux validations en jeu | **ouvertes** — elles demandent un vrai téléphone |

**Prochains identifiants libres** : `D-43`, `Q-37`, `V-27`, `R-17`.

## Ce que je n'ai pas décidé seul

1. **Le verbe `MENU` ne ferme pas le menu** (`Q-36`). Constaté, signalé, **pas ajouté** — le brief l'interdisait
   explicitement. C'est à Xav de trancher, et la remarque qui compte est celle-ci : le bouton tactile `MENU`
   devient inatteignable dès que l'écran s'ouvre, puisqu'il est dessiné sur le canvas que l'écran recouvre.
2. **Deux `[OUVERT]` de forme**, faciles à défaire : la confirmation de reset garde « Oui » et « Non » ensemble
   dans le corps (sa sortie n'est pas « Fermer », c'est « Non ») ; l'entrée « Plein écran » se place juste après
   « Musique » (les deux réglages d'ambiance ensemble).
3. **`R-16` plutôt que `R-15`** : l'identifiant demandé par le brief avait déjà servi. Le brief prévoyait ce cas ;
   je l'applique et je le dis, plutôt que de dédoubler un identifiant.
4. **`D-14` touchée sans être citée** par le brief : elle nommait l'A04 comme candidat plancher, et la décision
   de Xav la rendait fausse à la ligne suivante. C'est du ménage de suivi, pas un ticket de plus.

## Ce qui reste dû, et à qui

- **À Xav, sur un vrai téléphone, par l'URL publique** (donc après fusion **et** `push`) : `V-26` (le menu se
  ferme au doigt, sans défiler, sur les sept écrans) et `V-25` (le jeu prend l'écran au premier relâchement ·
  l'entrée de menu fait l'aller et le retour · le menu reste fermable en plein écran comme hors plein écran).
- **À Xav, à trancher** : `Q-36`, et les deux `[OUVERT]` de forme ci-dessus.
- **Rien à personne d'autre.** Aucun ticket de cette file n'attend un autre ticket.

## Rappel de manipulation

```
git log --oneline main..menu-tactile-2026-09-20   # les 3 commits de la mini-file
git merge <hash>                                  # depuis main : fusionne JUSQU'A ce commit
git revert <hash>                                 # retire un seul commit
```

**Une dépendance à connaître avant de couper.** Le commit 2 (`D-30`) se retire seul — vérifié : `git revert`
propre, et les 83 fichiers de test restent verts sans lui. Le commit 1 (`D-42`), lui, ne se retire seul **que si
le commit 2 l'est d'abord** : le commit 2 touche deux lignes du test de `D-42` (le menu Pause y gagne une
entrée). Le commit 0 est de la documentation pure et ne gêne personne dans un sens ou dans l'autre.

Et le rappel qui compte plus que les autres depuis ce matin : **`push` sur `main` publie le jeu.** La file a
été écrite sans rien pousser ; c'est Xav qui a demandé la fusion et le `push` après lecture du rapport.
`main` et `origin/main` pointent sur `b90dd7e`, et le jeu en ligne porte donc les deux correctifs — ce qui rend
`V-25` et `V-26` jouables sur le téléphone dès maintenant.

# Journal — le curseur (22/09)

Tickets : `D-107` (le clic droit) et `D-108` (le curseur). Branche
`curseur-2026-09-22`, trois commits — le ménage, puis un par ticket, chacun
retirable seul.

Point de départ, mot pour mot : « sur ordi avec la manette et/ou au clavier, il
ne sert pas à grand-chose. Il est basique, et j'aimerais bien qu'on l'améliore
au moins esthétiquement. Qu'est-ce que ça implique ? Qu'est-ce que ça nous
coûte ? il faut aussi verrouiller le clic droit ». Donc : **un topo d'abord**,
le code ensuite — comme pour le grain du sol la veille.

## L'état des lieux, vérifié et non supposé

- **Aucun curseur personnalisé nulle part.** `cursor` n'apparaissait que quatre
  fois dans `index.html`, toujours en `pointer`, sur les cartes et tuiles de
  menu.
- **La souris n'est pas un périphérique de jeu.** `src/input/` ne connaît que
  clavier, manette, tactile ; le loquet `peripheriqueActif` n'a pas de cas
  « souris ». Le constat de Xav est donc structurel, pas une impression.
- **Le clic droit n'était bloqué nulle part** : aucun `contextmenu` dans le
  dépôt.

## Le topo, et le choix de Xav

Trois routes étaient sur la table pour le curseur : (A) une image CSS, (B) un
curseur dessiné dans le canvas du jeu, (C) le masquer dès que la manette prend
la main. **Ma recommandation était C** (seul, ou avec A) : c'est la réponse
directe à « il ne sert à rien ». **Xav a choisi A sans C** — un curseur toujours
visible — et a précisé le dessin : *thème du vif d'or, une petite sphère avec
deux particules en orbite, la même traînée que le feu follet, couleur neutre,
argentée.* Le désaccord est consigné ici, pas rejoué : le ticket livre ce qu'il
a demandé.

Cette demande a **changé la route technique**, et c'est le seul point
d'architecture de la session. Un curseur animé n'est pas une image fixe, donc
A seul ne suffisait plus ; et B, que je déconseillais, a deux défauts qui se
voient — il traîne d'une frame derrière le pointeur, et il **n'existe pas
au-dessus des menus DOM**, c'est-à-dire là où la souris sert vraiment. D'où une
route **hybride**, qui tranche par ce qui exige d'être exact :

| Ce qu'on voit | Où ça vit | Pourquoi là |
|---|---|---|
| L'orbe (la tête) | un vrai `cursor: url(…)`, dessiné une fois au démarrage depuis `visuels.json` | exactement sous le pointeur, vivant par-dessus toute la page, **zéro coût par frame** |
| Les deux étincelles, la traînée | un calque de recouvrement (`pointer-events: none`) | elles ont le droit de traîner d'une frame — c'est une traînée, et pendant un geste rapide rester en arrière de l'orbe est justement ce qu'on veut voir |

Deux bénéfices tombent tout seuls de ce découpage. **L'orbe occulte la moitié
lointaine de son orbite** sans une ligne de tri de profondeur : le curseur
système est composé par-dessus la page, donc l'étincelle qui passe derrière
disparaît derrière lui. Et le calque **passe au-dessus des écrans d'UI**
(vérifié en capture, menu ouvert), ce qu'un dessin dans le canvas du jeu ne
pourrait pas faire.

## Ce qui est livré

`D-107` — un `preventDefault` sur `contextmenu`, posé sur le **document** et
non sur le seul canvas : les écrans d'UI sont des éléments DOM posés à côté du
canvas, un garde sur le canvas seul serait un garde à moitié posé. Effet de
bord voulu au tactile : l'appui **maintenu** déclenche lui aussi `contextmenu`,
donc la bulle « copier / partager » disparaît avec, sans toucher
`input/touch.js`. Porte de secours `?souris=libre`, pour le jour où
« Inspecter » manquerait vraiment ; elle ne pose **aucun** écouteur, plutôt
qu'un écouteur qui laisse passer.

`D-108` — `src/curseur.js` (le seul code), trois entrées de `visuels.json`,
deux d'`effets.json` dont un **5ᵉ type d'effet, `curseur`**, validé au boot. La
traînée **n'est pas un système nouveau** : c'est une 3ᵉ instance de
`poussiere.js`, comme le sillage du follet en est la 2ᵉ. Et la **boîte du
bitmap du curseur, comme son point chaud, dérive du dessin** — même contrat
qu'une station (`D-78`) : redessiner l'orbe en données déplace tout seul la
taille de l'image, il n'y a aucun nombre à tenir à jour à côté.

## Les deux défauts que seule la capture pouvait voir

C'est la leçon de la session, et elle confirme celle de l'établi (21/09) :
**115 tests verts ne disent rien d'un défaut de composition.**

1. **Le calque recouvrait l'écran d'un aplat noir.** La règle `canvas` de
   `index.html` peint tous les canvas en noir — c'est le fond du jeu — et le
   calque du curseur en est un. Aucun test headless ne compose une feuille de
   style ; la première capture était intégralement noire.
2. **La traînée était une grappe clignotante, pas une traînée.** Cause racine
   dans le module partagé : `poussiere.js` a une réserve de **8 bouffées**,
   calibrée sur un héros à 75 px/s — une souris la vide en quatre frames, et
   toutes les bouffées d'une même frame naissaient **au point d'arrivée**.
   Corrigé **à défaut inchangé**, donc sans toucher au héros ni au follet
   (leurs tests sont le témoin) : `capacite` passe en données (absente = 8), et
   l'émission est **interpolée le long du segment parcouru** — ce qui rend
   enfin vraie la promesse déjà écrite dans ce module, « l'émission se fait à
   la distance parcourue ». Le test du ticket éprouve désormais cette
   jointure : témoin vérifié, il tombe sur le code d'avant.

Un troisième point, mineur : le garde de portée de `D-72` refusait
`orchestrateur.maj(delta)`, c'est-à-dire **la seule forme correcte** d'appel
entre les deux fonctions sœurs de `main.js`. Il ignore désormais les accès
**membre** ; un appel nu reste attrapé, témoin vérifié.

## Mesures et vérifications

- **115 fichiers de test verts**, dont un neuf (`test_d107_…`, `test_d108_…`),
  écrits au sens de `D-52` : aucun n'épingle un nombre de réglage (rayon,
  période, échelle appartiennent à Xav et vivent dans `data/`), tous vérifient
  un contrat — la boîte dérive du dessin, l'orbite est pure et déterministe,
  une valeur dégénérée tombe au boot, un doigt n'allume jamais le curseur.
- **Coût**, `tools/scenarios/cout_curseur.mjs` — deux moments de la **même**
  exécution, Chrome sans fenêtre (les fps n'y ont pas de sens, seul l'écart en
  a) : `dessiner()` **0,91 ms** souris immobile → **0,97 ms** souris en
  mouvement continu, traînée pleine. **0/600 frame > 20 ms** des deux côtés.
  On n'efface que la boîte de ce qui a été peint la frame d'avant.
- **Vrai Chrome sans fenêtre** : l'orbe est posé, le calque est à la taille de
  la fenêtre, il ne reçoit aucun événement de pointeur, zéro erreur console ; à
  **DPR 3** la déclaration passe bien en `image-set(… 3x)` et le bitmap fait
  63 px, sous le plafond de 128 px au-delà duquel un navigateur ignore un
  curseur **en silence**.
- Album : `docs/captures/curseur-2026-09-22/` — le banc aux trois tailles
  réelles, la traînée en jeu, la traînée par-dessus un menu ouvert. **Attention
  à la lecture** : une capture d'écran ne contient jamais le curseur du
  système ; la vignette de l'orbe y est collée à la main, et c'est une
  simulation marquée comme telle dans le scénario.

## Ce qui reste, et ce qui est ouvert

`V-56` porte le verdict en jeu, et il est entièrement réglable en données :
rayon d'orbite 11 px, période 1400 ms, aplatissement 0,45, échelle de l'orbe 1,
réserve 28 bouffées — tous `[OUVERT]`, « plus / moins / bon ».

Relevé sans y toucher : le curseur **ne se masque jamais**, par décision de
Xav ; si l'orbe finit par gêner manette en main, le masquage automatique est
prêt à être écrit (le loquet `peripheriqueActif` existe déjà dans `input.js`,
il lui manque seulement un cas « souris »). Ce serait un ticket de quelques
lignes.

---

# Second temps — le stick droit (`D-109`)

Xav a regardé le curseur, l'a **validé** (« le visuel est validé par xav ») et a
tranché la réserve que gardait la fin de ce journal — mais pas dans le sens que
je proposais. Pas de masquage : **le stick droit pilote le curseur.** Mot pour
mot : « il n'a pas d'utilité jusque là, ça ne sert à rien à part à faire joli,
s'amuser avec, et naviguer dans les menus. joystick droit = curseur, c'est
tout. »

Le stick droit était libre depuis toujours : la croix directionnelle est
réservée à de futures actions secondaires (décision du 15/09), et le stick droit
n'avait jamais servi à rien.

## Trois pièces, et rien d'autre touché

| Où | Quoi |
|---|---|
| `input/gamepad.js` | les axes 2 et 3, avec **la même zone morte** que le stick gauche — une manette usée dérive des deux côtés, et un curseur qui part tout seul se remarque plus qu'un héros qui avance tout seul |
| `input/input.js` | un **accesseur séparé** (`pointeurManette()`), surtout **pas un champ de `etat`** |
| `curseur.js` | une fonction **pure** de déplacement, et le passage de témoin souris ↔ stick |

Le choix de l'accesseur séparé n'est pas du rangement : `etat` a une forme
move + verbes dont `etatNeutre()` dérive **génériquement**, et y glisser un
pointeur analogique casserait ce contrat. Surtout, c'est ce qui **garantit
qu'aucun système de jeu ne lira jamais ce stick** — la règle « le gameplay ne
connaît que des verbes » tient parce que le stick droit n'est pas un verbe.
Le commentaire qui l'explique était déjà écrit à côté, pour `tactileActif`.

## Le point qu'on ne pouvait pas contourner

**Une page ne peut pas déplacer le curseur du système** — aucune API ne le
permet, et c'est très bien ainsi. Or la tête de l'orbe EST le curseur système
(c'est tout l'intérêt de la route hybride : exactement sous le pointeur,
vivante par-dessus les menus DOM). Au stick, elle est donc dessinée **sur le
calque**, et la variable CSS passe à `none` pour qu'on n'en voie pas deux — l'un
piloté, l'autre planté là où la souris dort.

Même silhouette, même fonction de dessin, même échelle : **rien de ce que Xav a
validé ne change, seul le porteur change.** Le dernier périphérique qui bouge
gagne, dans les deux sens, sans rien à basculer à la main.

## Le défaut que le test a attrapé

Le premier jet normalisait la direction par la norme **bornée à 1** au lieu de
la norme brute : plein stick en diagonale, le curseur allait **√2 fois trop
vite**. C'est exactement `D-102` côté clavier — sauf qu'ici, le curseur n'étant
pas du gameplay, on peut le corriger sans rouvrir un comportement validé. Deux
longueurs distinctes, qu'il ne faut pas confondre : la **brute** donne la
direction, la **bornée** donne la vitesse.

## Ce qui n'est PAS livré

**Le curseur ne clique pas.** La navigation des menus reste au stick gauche,
case par case, et `ATTACK` confirme — rien de ce qui marche n'a été touché.
C'est la lettre de la demande (« c'est tout »), et la question est consignée
sans être commencée : `Q-54`. Elle n'est pas d'une ligne — il faudrait décider
qui gagne quand les deux sticks désignent deux cartes différentes.

## Vérifications

- **116 fichiers de test verts**, dont un neuf. Aucun n'épingle la vitesse ni la
  courbe (elles vivent en données) : ce qui est vérifié est le contrat — le
  stick sort de la manette avec sa zone morte, il n'entre pas dans l'état de
  verbes, **il ne déplace pas le héros**, le déplacement suit le temps et non
  les frames, une diagonale ne va pas plus vite qu'une ligne droite, le curseur
  reste dans la fenêtre, et il n'y a **jamais deux curseurs** à l'écran.
- **Vrai Chrome sans fenêtre**, fausse manette injectée
  (`tools/scenarios/curseur_stick.mjs`) : le fil est branché de bout en bout,
  l'orbe traverse l'écran depuis son centre, le curseur système vaut bien
  `none`, le héros n'a pas bougé d'un pixel, zéro erreur console. Capture :
  `docs/captures/curseur-2026-09-22/stick_trace.png`.

Dû : **`V-57`** — vitesse 900 px CSS/s et courbe 1,6, les deux `[OUVERT]` et
réglables dans `data/effets.json#effet_curseur`.

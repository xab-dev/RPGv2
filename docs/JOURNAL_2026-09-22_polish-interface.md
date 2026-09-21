# Journal de bord — passe de polish de l'INTERFACE (22/09)

Branche `polish-interface-2026-09-22`, **un commit par ticket**, chacun retirable seul
(règle de la file de micro-tickets). Fichier de bord tenu **au moment du commit** :
l'état d'une file longue vit sur le disque, jamais dans la mémoire de la session.

## Consigne de Xav

« Il ne reste pas grand-chose pour une harmonie générale. La grotte est verrouillée, les
stations sont verrouillées, les items sont faits. Il reste l'interface. » Cibles nommées :
l'**arme mains nues** de la barre du bas (« le pouce n'est pas dans le bon sens », et trop
simpliste à côté de la pomme), les **éclats**, les **jauges de survie** (faim, soif), la
**barre de vie** (« par rapport aux feux follets, elle peut être améliorée »), les **icônes
de buff**. Périmètre confirmé en début de session : **on ne touche ni au menu ni aux
fonctionnalités** — la structure des menus reste gelée (21/09). Côté **DOM**, deux surfaces
seulement, et en *look* uniquement : les **jetons de style** des cartes/fiches
(`--menu-*` dans `index.html`) et les **tuiles d'icônes** (`ui/icone_canvas.js`).

## La référence

Le follet, cité par Xav. Ce qu'il a et que le HUD n'a pas : des **valeurs superposées**
(corps teinté, cœur clair, halo diffus), un **accent** et un **grain** (les étincelles).
La charte d'item du 21/09 dit la même chose autrement — objet *posé*, trois valeurs au
moins, **un** accent de couleur. C'est cette charte qui s'applique ici, à l'UI.

## Diagnostic (avant tout code)

`tools/scenarios/hud_polish.mjs` (neuf), capture sous Chrome en 1920 × 1080, état
volontairement chargé (jauges à mi-course, trois buffs, niveau à deux chiffres) :
`docs/captures/hud-2026-09-22/`. Ce qu'on y voit, et qui fonde les tickets ci-dessous —
tout le bandeau est en **aplats à une valeur** : la barre de PV est un rectangle rouge
plat à contour blanc, les éclats un **glyphe de texte** (`◆`), la faim et la soif deux
barres plates à icône pleine, les buffs trois silhouettes à deux valeurs. Les mains nues
se lisent comme une **moufle gauche**.

## Les commits

| # | Ticket | Ce qui change | Commit |
|---|---|---|---|
| 1 | `D-94` | **Les mains nues.** Un **poing de trois quarts** (jointures vers l'œil, pouce replié en travers, bracelet de cuir à boucle d'or) remplace la moufle de face, à la charte d'item du 21/09 : posé (ombre portée), trois valeurs au moins, **un** accent. Et la cause de fond : la case **n'impose plus sa couleur** à ce qu'elle contient — la main était le dernier visuel `teintable` de la barre, donc plat par construction, quand l'épée et le fruit y étaient déjà à leurs vraies couleurs. Le repère d'or passe dans le **contour** de la case. Test de `D-20 B` repris : il n'épingle plus « teintable » mais « **aucune** icône d'arme n'est teintable ». Deux itérations au banc (la première trop large et le pouce noyé dans la masse) | à venir |
| 2 | `D-95` | **Le relief du bandeau.** Une **seule** fonction de barre (`dessinerBarre`) pour les PV, la faim et la soif — ils avaient deux factures, dont une écrite *inline* dans `dessinerHud` — et **quatre valeurs** par barre : creux, corps, moitié haute éclairée, liseré d'un pixel. Contour sombre au lieu du blanc pur (c'est lui qui écrasait tout), fond du bandeau en dégradé très court avec une arête claire en pied, ombre d'un pixel sous le nombre des PV. Le faux `ctx` de `test_phase1_sd_dialogues_invisibles` apprend `createLinearGradient` — sans quoi il échouait pour une raison étrangère aux transforms qu'il surveille | à venir |
| 3 | `D-96`, `Q-49` | **Les icônes du bandeau passent en données.** Le triangle de la faim et la goutte de la soif étaient tracés au `moveTo` dans `ui/hud.js`, et les éclats étaient un **caractère de police** (`◆`). Ce sont maintenant trois entrées de `visuels.json` — cristal facetté, part de pain de trois quarts (la forme triangulaire est gardée : c'est elle qui porte le sens, P4②), goutte à rebord sombre et reflet — résolues par `main.js` et reçues prêtes, comme le follet et les buffs. Les deux jauges déclarent leur icône dans `survival.json`, **référence requise** au boot. Les éclats, eux, n'ont **pas** de catalogue : leur id vit dans `main.js`, et la question part en `Q-49` | à venir |
| 4 | `D-98`, `D-97`, `Q-50` | **Les icônes de stats (= les icônes de buff) prennent du volume.** Contrainte qui commande tout : ces quatre silhouettes servent dans **deux régimes de couleur** — sans teinte au bandeau, teintées par le CSS dans l'écran Stats. Le volume est donc posé en **alpha pur** (noir pour l'ombre, blanc pour la lumière), qui tient par-dessus n'importe quelle teinte : vérifié aux deux endroits sous Chrome. Les quatre formes ne bougent pas (c'est la forme qui porte le sens). La croix de vitalité gagne une copie d'elle-même décalée en ombre portée. Relevés en passant, **sans corriger** : `D-97` (un niveau au-delà de `levels.json` rend l'écran Stats inouvrable — même famille que `D-92`/`D-93`) et `Q-50` (la fiche de Force et d'Esprit est vide : elles n'ont aucune dérivée) | à venir |
| 5 | `D-99` | **Les cases de la barre du bas.** Le fond blanc à 15 % prenait la couleur du décor (beige sur la terre de la Maison) : il devient **sombre**, avec le même dégradé très court que le bandeau, un liseré sur l'arête haute et un contour **or** pour l'attaque. Une seule fonction de fond sert la case carrée du clavier et le bouton rond du doigt. Le **placement** des boutons tactiles n'est pas touché (`D-57`, chapitre de Xav) | à venir |
| 6 | `D-100` | **Le relief des surfaces du menu**, en **jetons** seulement (`--menu-carte-lisere`, `--menu-carte-relief`) : un liseré d'un pixel sur l'arête haute et une lueur qui s'éteint à mi-hauteur, en **blanc translucide** — donc valable au repos, au focus et à l'appui sans être réécrit par état. La règle est posée **après** les règles d'état, sinon leur raccourci `background` effaçait le dégradé et la carte focalisée devenait la seule à plat. Pas d'ombre portée : la décision de sobriété d'origine tient | à venir |
| 7 | `D-101` | **Les vignettes des tuiles.** Une **flaque d'ombre** en fond de vignette (centrée à 72 % de la hauteur, là où repose le bas d'un objet) rend son sol à l'ombre propre des items, qui se perdait sur le fond uni d'une tuile ; 28 u → 31 u. La vignette de la **fiche** ne la prend pas (sur un grand panneau, ce serait une tache). Le coin « équipé » rapetisse et gagne une arête sombre, sans quoi sa diagonale se lisait comme une coupure de la tuile | à venir |

**Une reprise en cours de route, et elle vaut d'être notée** : la flaque d'ombre et l'arête du
coin avaient d'abord été écrites en `rgba(...)` directement dans les règles. Le test
`test_d43_c1_ecran_fiches` l'a refusé — « aucune couleur en dur : les jetons, et eux seuls ».
C'est la règle du 20/09 qui tient toute seule, un an de méthode plus tard : les quatre couleurs
nouvelles de cette passe (les deux du relief, les deux de la vignette) sont des **jetons**.

## Clôture (22/09)

Xav valide les **sept tickets un par un** (« good » pour chacun) et rend `V-53` — l'effet
d'ensemble en jeu — **« trop léger, pas vu »** : la ligne reste ouverte. Il rattache `D-97` au
futur ticket « déblocage des niveaux 10 → 30 », met `Q-50` hors-scope, et rapporte un bug
**à ne pas corriger** : `D-102`, la vitesse de déplacement au clavier qui paraît cumulative en
diagonale, à traiter en **session de diagnostic** (il s'en sert comme exploit de dev en
attendant). Branche fusionnée dans `main` et **poussée à sa demande**, donc en ligne.

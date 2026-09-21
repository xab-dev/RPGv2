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

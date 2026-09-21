# Journal — le chapitre tactile (22/09)

Ticket : `D-57`, le « chapitre tactile » que Xav gardait pour lui depuis la tournée du
21/09. Session **guidée en direct**, l'écran sous les yeux, bouton par bouton.

**Périmètre annoncé et tenu : le placement, rien d'autre.** Aucune fonctionnalité, aucune
ligne de code de jeu. Tout le placement vit déjà dans `src/ui/hud_layout.js` (module pur,
testable), que le **dessin** (`ui/hud.js`) et la **zone qui répond au doigt**
(`input/touch.js`) lisent tous les deux — un bouton déplacé déplace les deux ensemble.

## Les deux idées qui ont commandé la session

1. **Un écart générique de 16 px** (résolution logique) comme mesure commune, et **le
   bouton MENU comme repère** : les autres se règlent à partir de lui. Chaque écart se lit
   dans le fichier en une soustraction, jamais recopié en dur.
2. **Aucun nombre choisi à l'œil.** Le rayon de l'éventail (28 + 16 + 20 = 64) et son
   écartement angulaire (2·asin(26,5/64) ≈ 48,9°) se **déduisent** des écarts demandés ;
   la position d'INTERACT est l'**unique** point équidistant de ses deux voisins sur son
   axe. Changer un écart doit redonner des nombres, pas casser un nombre mémorisé
   (règle `D-52`).

## Ce qui a bougé

| bouton | avant | après | raison |
|---|---|---|---|
| MENU | 455, 38 | **455, 44** | écart au bandeau réglé à 16 px (son rayon), puis à la **moitié** : 8 px |
| INTERACT | 70, 130 | **454, 97** | sous le MENU, **équidistant** de ses deux voisins (17,0 / 17,1) ; `cx` reculé d'1 px pour laisser 6 px au bord droit |
| skill_1 | 445, 155 | **364, 240** | éventail |
| skill_2 | 400, 140 | **360, 188** | éventail |
| skill_3 | 350, 150 | **398, 150** | éventail |
| consommable | 335, 195 | **450, 154** | éventail |
| attaque | 420, 210 | *inchangé* | déplacée puis **défaite à l'identique** en cours de route (« bouton action » lu comme l'attaque au lieu d'INTERACT) |

L'éventail : les **quatre** boutons masqués avant déblocage, répartis régulièrement autour
de l'attaque, du côté de la zone de jeu — **16 px de l'attaque**, **13 px entre voisins**.

## La cause racine du « ils se marchent dessus »

Le défaut relevé le 21/09 n'était pas une affaire de distance : **INTERACT était à gauche,
donc dans la zone qui capte le joystick** (`JOYSTICK.limiteX` = toute la moitié gauche de
l'écran, pas seulement le cercle dessiné). Un doigt posé dessus pilotait aussi le
déplacement. À droite, la question ne se pose plus — sans toucher à la règle du joystick.

## Un défaut signalé plutôt que masqué

Un éventail de quatre à 16 px partout balaie 156°, soit **exactement** l'arc libre autour
de l'attaque : il tenait à l'écran, mais deux extrémités frôlaient la bordure (6 px en bas,
4 px à droite) et la dernière passait à 13 px d'INTERACT. Resserrer l'éventail aurait trahi
la consigne. Xav a tranché en deux coups : écart entre voisins à **13 px**, les ~9°
économisés **rendus aux bords** (l'éventail pivote vers l'intérieur au lieu de se resserrer
sur place), puis MENU remonté pour dégager INTERACT.

Marges finales : **≥ 6 px de toute bordure**, **≥ 12,2 px entre deux boutons quelconques**.

## Vérifications

112 fichiers de test verts après chaque déplacement. Aucune validation à distance n'était
nécessaire : Xav regardait l'écran à chaque étape et a clos lui-même — « non c'est bon ».

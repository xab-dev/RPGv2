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

## Puis : la table de niveaux prolongée jusqu'au Nv.30 (`Q-44`)

Second ticket de la session, demandé par Xav pour **ses tests de développeur** : « ce sera
plus simple pour moi de visualiser le contenu à mettre et quand le mettre ». Livré en
**données seules**, quatre fichiers, aucune ligne de code de jeu.

**Consigne explicite : on ne touche pas à la courbe d'XP** — « justement, je veux voir où
elle amène, en combien de temps ». La table n'est donc pas ré-équilibrée : elle est
**prolongée par sa propre règle**, celle qu'elle suit depuis le Nv.5 — le coût d'un palier
augmente de 5 XP à chaque niveau (50 pour le Nv.10, 55, 60… 150 pour le Nv.30). Aucune
entrée existante n'a changé d'un point.

Ce qu'il fallait toucher, et pourquoi c'était trois fichiers et pas un :
`data/levels.json` (20 entrées), `data/flags.json` (`flag_niveau_11..30` — `main.js` pose un
flag par niveau franchi et `flags.js` **lève** sur un flag non déclaré, donc sans eux le
passage au Nv.11 coûtait une frame à chaque fois), et les deux locales (zéro chaîne en dur).

Où elle amène : **2 340 XP cumulés au Nv.30**, soit ~67 rôdeurs à 35 XP, et **29 points de
stats** sur la course entière.

Un test a dû changer, et c'est la règle `D-52` en action : `test_t1_xp_recolte_equilibrage`
**épinglait la longueur de la table** (`niveaux.length === 10`) pour avouer qu'il ne
prouvait rien au-delà. Il vérifie désormais un **contrat** — la table doit couvrir le niveau
où se joue la clôture de la Région Maison (30) —, si bien que la décroissance de la part de
la récolte est prouvée sur toute la course (1,30 niveau au Nv.1 → 0,17 au Nv.29).

**Pas de `push` : la version en ligne reste volontairement bloquée au Nv.10.**

`D-97` (un niveau hors table rend l'écran Stats inouvrable) **reste ouverte** : la table plus
longue ne la traite pas, elle déplace seulement la question de « au-dessus de 10 » à
« au-dessus de 30 ». Et ce qui manque pour *jouer* ces vingt niveaux n'est pas touché ici :
une seule table d'apparition (Nv.5, nuit), un seul monstre hors Grotte — les paliers Nv.10
et Nv.15 de `specs/07_chaos-nocturne.md` restent à écrire.

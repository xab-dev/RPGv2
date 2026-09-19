---
projet: RPG V2
episode/session: Référence — captures de la V1
type: doc de travail (gabarit à remplir)
version: 0.1.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
ids_suivi: [E-03]
genere_par: claude
verifie_par: xav
---

# DOC — Captures de la V1 : ce que j'en garde

Emplacement : `docs/captures/v1/DOC_captures-v1.md`, à côté des images.

## À quoi sert ce fichier

La V1 est le prototype jetable. Ses captures sont une **inspiration**, jamais un cahier des charges. Une image seule est ambiguë : Claude Code reproduirait tout ce qu'il y voit, y compris ce que tu n'aimes pas. **Une ligne d'intention par image** lève l'ambiguïté.

## Règles

1. Une capture sans ligne ici **n'existe pas** pour un ticket.
2. Un ticket qui s'inspire de la V1 cite le nom du fichier **et** recopie ta ligne. Claude Code n'ouvre pas ce dossier de lui-même.
3. « Ce que j'aime » se dit en une phrase concrète : *quoi*, et si possible *pourquoi*. « J'aime bien » ne suffit pas ; « la barre du bas se lit d'un coup d'œil parce que les cases sont grosses et peu nombreuses » suffit.
4. Tu peux remplir au fil de l'eau : une ligne à moitié vide vaut mieux qu'une image muette.

Nommage conseillé, pour que l'ordre ne bouge jamais : `v1_01_sujet.png`, `v1_02_sujet.png`…

## Les captures

| Fichier | Ce qu'on voit | Ce que j'aime (une phrase) | À ne **pas** reprendre | Sujet V2 concerné |
|---|---|---|---|---|
| `01_rpg-grotte-annexe.png` | le personnage et son compagnon, les récompenses, la sortie | information condensé sans surchage visuelle | la sortie, trop simpliste | UX |
| `02_rpg-dialogue-choix-multiple.png` | menu/dialogue ouvert après une intéraction, choix multiple | le menu pop-up moderne en format gridX*Y | Les couleurs | UI |
| `03_rpg-ressources-et-tour_nuit.png` | Le personnage et son compagnon de nuit, leur lumière les éclairant. Une tour, fenetre éclairé, une ressources à ramasser avec un effet "glow" | Le jeu de lumière, les couleurs et les détails de la tour |  | carte / lumière |
| `04_rpg-caverne-et-tour_nuit.png` | Le personnage et son compagnon, une tour "maléfique", les accès au sous-sol / grotte, le décors général (ruine/arbre/..) | L'ambiance nocture, la tour, les entrées des annexes ont été retraillé et son satisfaisante, le décor aussi |  | carte / nuit |
| `05_rpg-pnj-voyageuse.png` | Le personnage et son compagnon, à coté du pnj la Voyageuse, le jeu de lumière, le décor de la map ainsi qu'un morceau d'une zone de chaos | L'apparence du pnj, l'ambiance des lumières dans la nuit | le rocher boule et le tronc du décor | carte / UX |
| `06_rpg-pnj-conteur.png` | La carte de jour et le pnj Conteur | j'aime bien l'apparence du pnj, le décor de la carte verdoyant | ne **pas** garder le tronc "baguette" | carte |
| `07_hatd-menu-principal.png` | menu principal de haTD le mini jeu intégré à rpg-v1 | Interface simple et efficace, 1 bouton 1 action, moderne et sobre | | menu |
| `08_hatd-menu-secondaire1.png` | un des sous-menu de haTD | Interface simple et efficace, 1 bouton 1 action, moderne et sobre, format grid 3*2 | | menu |
| `09_hatd-interface.png` | loading screen de haTD, il n'était pas nécessaire mais sert à présenter le jeu et les avertissement, Logo et texte coloré. | l'ambiance générale, l'organisation des paragraphes | | UI/UX |
| `10_hatd-menu-secondaire2.png` | sous-menu de haTD, représente un deck de 6 cartes avec HUD compte et accès rapide au lancement d'une partie | la modernité de l'interface | | menu |
| `11_hatd-gameplay1.png` | pendant une partie du tower defense, on voit les compagnons et le heros ainsi que les boutons d'actions | j'aime la géométrie des auras des compagnons, la simplicité du HUD | les boutons d'actions séparé de l'écran de jeu | combat |
| `12_hatd-gameplay2.png` | pendant une partie du mode balade, les ressources à recolter, le héro et ses compagnons | le hud, les emoji et effets de particule | la carte, trop sombre et quadrillé | Hero |


Colonne « Sujet V2 concerné » : un mot suffit (HUD, barre du bas, combat, carte, menus, lumière, monstres, craft…). Claude y rattachera l'identifiant du suivi quand il existe.

## Ce que je n'aime pas dans la V1 (sans capture)

Tu as évité de capturer ce que tu n'aimes pas, et c'est normal. Mais ces points-là protègent autant la V2 que les bonnes idées. Quelques lignes, en vrac :

-les monstres, parfois trop simpliste. envie de les réinventer pour la v2
-les rochers (premier décor du jeu), ce ne sont que des boules, qui ont été amélioré "vite-fait". le pattern se répète trop souvent.

## Ce que la V1 faisait et que la V2 ne fait pas encore (envie, pas commande)

-menu moderne
-

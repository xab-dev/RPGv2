# Captures du ticket `D-42` — le menu à 703 × 280

Ce ne sont **pas** des captures d'album (celles-là suivent la convention de
`docs/captures/mémo_captures.md`, six vues fixes à chaque clôture de jalon).
Ce sont trois **preuves de ticket**, prises sous Chrome PC, dans une fenêtre
réellement redimensionnée à **703 × 280 px CSS** — la taille exacte que Xav a
mesurée sur son téléphone le 20/09 à 03 h 15, en paysage, hors plein écran.

| Fichier | Ce qu'il montre |
|---|---|
| `avant_menu-pause_703x280.jpg` | Le défaut. Le titre « Menu » est coupé **au-dessus** de l'écran, la liste continue **sous** le bas, « Réinitialiser » et « Fermer » sont hors champ, et rien ne défile : la boîte n'est pas un conteneur défilant (`scrollTop` restait à 0). |
| `apres_menu-pause_703x280.jpg` | Après correctif. Le titre à gauche, **« Fermer » à droite**, tous deux dans un en-tête qui ne défile pas ; la liste défile dans sa propre zone (barre visible à droite). |
| `apres_ecran-generique-20-entrees_703x280.jpg` | Le cas qui déborde vraiment : un écran générique (gabarit de la Poche) rempli de **20 entrées**, soit 736 px de contenu dans 247 px de corps. « Fermer » ne bouge pas d'un pixel, le corps défile de 489 px. |

Ce que ces captures ne prouvent pas : le **doigt**. Un navigateur de bureau ne
fait pas défiler au toucher, et Node encore moins — le verdict reste une
validation en jeu sur un vrai téléphone (`V-26`).

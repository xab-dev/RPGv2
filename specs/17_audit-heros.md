---
projet: RPG V2
spec: 17 — L'audit du héros
version: 1.0.0
statut: écrite le 26/09 ; palier A en cours
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# 17 — L'audit du héros : les outils, le code, la plume, l'état des lieux

## 0. La demande

> Audit qualité graphique de héros, optimisation du code
>
> Nous avons encore une fois beaucoup travaillé sur Héro et sa qualité
> graphique. Nous avons probablement fait beaucoup d'itérations et alourdi le
> code au fur et à mesure.
>
> Préface: ajouter à la carte mentale dans la vision long terme du jeu :
> notion de 'sandbox' et 'openworld'.
>
> - Palier A : généraliser les outils et skills utilisés sur ces dernières
>   sessions concernant le Héro. Ils nous resserviront pour toutes les avancées
>   graphiques ou de design, notamment sur les armes légendaires, les feux
>   follets, etc.
> - Palier B : simplifier, optimiser, alléger le code sans pour autant nuire à
>   la qualité graphique. (testé en jeu cheat=phenom, agilité à fond, 6 torche
>   dans la foret, de nuit, joystick à fond, AUCUNE GENE VISUELLE n'a été
>   relevé : on est large sur le budget performance, mais pas sur le code
>   notamment src qui a déjà été noté comme volumineux).
> - Palier C : polish général du Héro, plusieurs couches, plume d'artiste.
>   Harmonisation des proportions. glow et particule pour Moyen et Haut, Tu
>   peux doubler les primitives s'il faut pour ajouter des détails dans la
>   finesse des traits, les lumières et les ombres, pour améliorer le globe,
>   etc. Il nous servira de référence future pour la qualité graphique du jeu.
>   Il faut donc "think out of the box" (not overthink) pour lui donner un ton
>   d'avance sur le standing actuel. Angle de références, préféré par XAV :
>   [66°;76°]; 342°(sauf la pointe); 300°(sauf la "flèche"); 241° ; 132° ; et
>   90°, toujours excellent !
> - Palier D : état des lieux du jeu, fournis des captures d'écran dans un
>   dossier à part Audit_2026_09_26 : vision globale de la carte maison
>   (dézoomé) , héro , feu-follet , station , monstre , + tout ce que tu
>   jugera utile (décors, grain etc..)
>
> arret Xav après chaque palier , commit et push sur branche dédié.
> — Xav, 26/09

Précisé au plan par Xav : le palier B porte sur **la chaîne du héros**
(`visuels.js`, `poses.js`, `orientation.js`, `schemas.js#validerVisuel`,
`visuel_heros`, ses tests et ses outils) ; `main.js` reste sous `Q-177` (5).
Les captures du palier D vont dans `docs/captures/Audit_2026_09_26/`,
versionnées.

## 1. Ce qui est acquis et ne change pas

- Tout ce que la spec 16 a posé : l'angle affiché, les huit poses clés, le
  souffle, le pas, la capuche en retard ; la lumière vient d'en haut à gauche ;
  aucun effet ne bat au-delà de 3 Hz.
- Un système allégé par un preset reçoit un NOMBRE (le levier), jamais le
  preset ; ce qu'un preset retire se déclare en données.
- Aucun rendu n'est dit « validé » sans que Xav l'ait joué.

## 2. Les paliers

- **A — Les outils et le skill.** Les instruments des sessions du héros
  (`tools/_ref/`, non versionnés) deviennent des outils pour tout visuel :
  `tools/mesure_visuel.mjs` (écart à une référence Git, poses clés, sauts du
  tour, fuite d'état du contexte, dégradés gardés), `tools/atelier.html` (la
  planche : directions ou angles, teintes, fonds, variantes côte à côte), la
  loupe en jeu dans `tools/scenarios/commun.mjs`, et le skill
  `atelier-visuel` (la boucle d'itération visuelle). Critère : chaque outil
  tourne sur `visuel_heros` et sur un autre visuel ; l'écart à `HEAD` d'un
  arbre propre est nul.
- **B — Le code allégé, le rendu identique.** Audit chiffré, puis un
  allègement par commit. Critère : `mesure_visuel diff --ref main` à zéro
  pixel sur tout visuel ; un gain qui coûterait un pixel devient une ligne `D-`.
- **C — La plume.** Par couches (proportions, traits, lumière et ombres, le
  globe de l'œil, glow et particules en Moyen et Haut), chacune jugée par Xav
  sur trois variantes, aux angles de référence ci-dessus. Critère : Xav le
  prend pour référence de qualité du jeu.
- **D — L'état des lieux.** Un scénario rejouable, des captures commentées
  (`LISEZ-MOI.md`), des constats changés en lignes proposées, jamais corrigés
  en passant.

## 3. Hors de cette spec

Découper `main.js` (`Q-177` (5)) ; une animation d'attaque ; les visuels
d'autres entités (le palier D les regarde, il ne les retouche pas).

---
projet: RPG V2
episode/session: La nuit du héros — simplifier, polir, animer
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# Fichier de bord : la nuit du héros (26/09 → 27/09)

Demande de Xav, avant d'aller se coucher (six heures d'autonomie) :

> 1. Simplifier tout le sac de nœuds qu'on a codé ce soir et faire en sorte que
>    ce soit le plus clair possible.
> 2. Polish du héros : il faut vraiment qu'il soit parfait, avec les fondus
>    entre les parties du corps, les ombrages, la lumière, les reflets de l'œil
>    […] plusieurs couches […] étapes, thèmes, branches et commits.
> 3. […] l'animation, pas qu'on ait juste 8 positions, mais qu'on représente
>    toutes les positions joystick de façon fluide. Xav ne sait pas du tout
>    comment ça marche, si c'est possible de le faire en dehors de Godot, ni si
>    c'est coûteux (8 sprites sont assez ? 16 ?).
>
> On garde la vue sud comme référence mais Xav s'attend à la voir évoluée
> demain matin, tout est sauvegardé et retirable […] mode artiste actif !
> […] puis test sentinelle, et on fait le bilan demain matin.

Réponses de Xav avant de partir : l'état vit sur le disque (pas de `/compact`
demandé, je ne peux pas le taper) ; l'animation « tout ce que je peux » ; une
branche par mission — `heros-simplification` (partie de `main`, `40a1efe`) →
`heros-polish` → `heros-animation`, chacune partie de la précédente. Rien
fusionné, rien poussé.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `2638e33` | Ménage | Journal de l'ouverture de la capuche archivé ; aucune réponse nouvelle au suivi ; « Où on en est » : les trois branches de la nuit |
| `32a86e5` | `D-262` | **Simplifier.** Les poses sortent de `visuels.js` dans `src/poses.js` : une matrice par pose, la même pour le dessin, la découpe, les tests et les bancs (les tests ne refont plus le calcul). Données : `pieces` (origine, `miroir`, `decoupe`, `cachee` déclarés une fois), l'ouverture en une pièce (au lieu de trois poses recopiées), `visage` → `oeil`, `pli` et `rabat` groupés, les trois vues de l'est déclarées `reflets` de l'ouest. 874 → 397 lignes. Banc de différence (hors dépôt, `tools/_ref/`) : identique au pixel près, sauf la lueur de côté, maintenant sur la lèvre comme de face. `V-182`. Suite verte, 224 fichiers |

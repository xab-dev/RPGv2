---
projet: RPG V2
episode/session: La capuche du héros de profil et de trois quarts (D-252)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# Fichier de bord : la capuche du héros (26/09)

Demande de Xav, captures à l'appui (`show_wrong_angle.png`, `fix_example.png`) :

> V-175 validé, good job. Avant de passer au polish, le graphisme du hero à
> besoin d'un fix. […] Le visage est trop en diagonale dans la vue de coté ou
> 3/4. si on tire un axe vertical qui coupe hero en deux, le sommet de la
> capuche devrait être à cet endroit (pas le sommet du visage), et à partir de
> ce point de repere on peut donner à la capuche son sens de direction juste
> en orientant la pointe. […] Les autres point de vu de hero ne m'ont pas
> choqué, on ne modifie pas tout. stratégie habituelle : diagnostic,
> planification, application en itération, un commit toutes les trois
> itérations.

Sur `main`, partie de `9d19f44` (`v0.8.66`). Pas de push.

## Itérations (l'état de la file, sur le disque)

1. Moteur : la **courbure** d'une pièce (`visuels.js#courberPoints`, schéma, `D-252`) ; `est`/`ouest` pliées à ±55° (pivot −4, longueur 6,5), `sud_est`/`sud_ouest` à ±50° (pivot −7, longueur 4,5 : à 28° sur le pivot bas, la pointe restait le point le plus haut, hors de l'axe — le test l'a vu). Dos inchangés. Suite verte (222 fichiers). Xav : « le 3/4 est très bien. le coté est à reprendre : la pointe pointe trop vers le bas, la longueur est bonne ; le sommet (au-dessus du globe oculaire) est un peu trop en avant (on voit une légère bosse dans le liseré) ».
2. Profil seulement : le pli remonte (pivot −5,5, longueur 5,5), le liseré avant reste droit au-dessus de l'œil, la pointe se couche à l'horizontale ; `ouest` à 50°, `est` à −68° (la pointe dessinée part d'un peu à droite de l'axe : plié du même angle, `est` la relevait en corne). Trois quarts inchangés. Xav : « parfait, sud_est mérite une itération pour coller avec les autres, la pointe est différente ».
3. `sud_est` à −78° (même cause que `est` : plié du même angle que `sud_ouest`, il relevait sa pointe) ; sa pointe répond maintenant à celle de `sud_ouest`. `D-252` clos, `V-176` ouvert. Suite verte (222 fichiers). Commit des trois itérations.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `e763164` | Ménage | Journal de la limite du joystick archivé ; aucune réponse nouvelle au suivi ; `V-175` validé à l'oral par Xav (à marquer par lui dans l'outil) ; « Où on en est » à jour |

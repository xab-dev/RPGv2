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

Puis Xav : « 176 : good. go même traitement sur les vues 3/4 de dos, compare avec ce que l'on vient de faire, c'est le problème de l'axe vertical et de l'angle (la 1ère itération) » → `D-253`.

4. `nord_ouest` 50°, `nord_est` −78°, pivot −7, longueur 4,5 : les valeurs des trois quarts de face, le cisaillement retiré. `nord` inchangé. Le test de `D-252` couvre d'office les six directions pliées. Xav, trace à l'appui (`tracing_curve.png`) : « tous les _est ont besoin d'un ajustement au "front", ils diffèrent trop de _ouest ».
5. Cause : la capuche de face n'est pas symétrique (pointe à droite de l'axe, flanc droit plus raide) ; aucun angle n'accorde un `_est` à son `_ouest`. Remède : `miroir` sur la pose d'une pièce (`visuels.js`, schéma) ; les trois `_est` sont le reflet exact de leur `_ouest` (courbure 50, mêmes pivot et longueur). Conséquence visible : sur les `_est`, le liseré clair de la capuche passe à droite, le corps garde le sien à gauche. Xav : « oui c'est bon, commit d'abord. puis go nord et sud ». Commit de `D-253` (deux itérations : Xav l'a demandé).

Puis Xav : « oui c'est bon, commit d'abord. puis go nord et sud, tu sais ce que j'attends, fais ta première itération et je contrôle » → `D-254`.

6. `sud` et `nord` déclarent enfin une pose (révise `D-229`, « la pose de face n'est pas déclarée ») : courbure −8°, pivot −2, longueur 9,5, qui ramène sur l'axe la pointe du dessin d'auteur (à droite de l'axe) sans toucher au dessin validé ; de face, le visage glisse de −0,7, sur l'axe lui aussi. Tests : `test_d229` (sans orientation, le dessin d'auteur ; de face, rien ne manque ; le visage du côté regardé par rapport à celui de face), `test_d252` (une pointe redressée rapproche de l'axe la pointe et le sommet). Trouvé en route : les visages des `_est` ne sont pas le reflet de ceux des `_ouest` (profil +2,43 contre −1,77, trois quarts +1,57 contre −0,73, le visage de face à 0). Xav précise, trace à l'appui (`nord_example.png`) : « de face, on [doit avoir] l'impression que la pointe pointe vers l'arrière, et vice versa. de dos, […] que la pointe pointe vers nous. […] le trait horizontal représente le front, point du pli de la pointe. la pointe […] est à ramener vers l'avant/bas, puis jouer avec la lumière, tu peux les modifier (avec commit) ; on va aller plus loin ensuite (+primitive, polish, harmonisation, puis globe oculaire et animatedSprite) ».
7. Le **rabat** (`visuels.js#courberPoints`, `rabat: { y, longueur, hauteur }`) : au-dessus du front (y −8,2), la capuche s'écrase en calotte arrondie (1,8 de haut) — de face comme de dos, la pointe ne dépasse plus du crâne. Les primitives **`cachee`** : elles ne paraissent que dans une direction qui pose leur pièce. De dos, `pointe_rabattue` (cinq polygones : ombre portée, contour, pan clair, flanc éclairé, arête) rabattue vers nous sous le front ; de face, `pli_front`, le creux sombre de la calotte, là où l'étoffe part vers l'arrière. Suite verte. Xav : « en regardant le banc, c'est "weird", mais en jeu il n'y a plus rien qui choque, rien qui apparaît ou dépasse entre les positions, juste nord qui mérite d'être descendu un peu et la pointe légèrement décalée » (trace à l'appui, `nord_example2.png`).
8. De dos seulement : le rabat descend de 0,8 (y −7,4, la calotte avec lui) ; la pointe rabattue suit (`dy` de sa pièce) et se décale vers l'ouest par un cisaillement de −0,3 autour du front (sa base reste au pli). `sud` inchangé. Commit de `D-254` (trois itérations).

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `e763164` | Ménage | Journal de la limite du joystick archivé ; aucune réponse nouvelle au suivi ; `V-175` validé à l'oral par Xav (à marquer par lui dans l'outil) ; « Où on en est » à jour |
| `1d871df` | `D-252` | La capuche se **plie** (`visuels.js#courberPoints`, `courbure` + `longueur` en données) au lieu de pencher en bloc : le sommet reste sur l'axe, la pointe se couche vers l'arrière. Profil ±50° / −68°, trois quarts 50° / −78° (l'est plie plus fort : la pointe dessinée part à droite de l'axe). Dos inchangés. `V-176` à voir (surtout `sud_est`). Suite verte, 222 fichiers |
| `5ef14f2` | `D-253` | `nord_ouest`/`nord_est` pliés comme les trois quarts de face ; puis `miroir` de pièce : chaque `_est` est le reflet exact de son `_ouest` (la capuche de face n'est pas symétrique, aucun angle ne les accordait). Vu par Xav au banc : « oui c'est bon ». Suite verte, 222 fichiers |

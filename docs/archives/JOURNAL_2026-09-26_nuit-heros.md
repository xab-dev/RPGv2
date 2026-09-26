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
| `7b76de1` | DOC | Le journal, `D-262` |

## Le polish (branche `heros-polish`, partie de `heros-simplification`)

Regardé d'abord en grand (atelier hors dépôt, `tools/_ref/atelier.html` : ×28, ×12, la taille du jeu sur l'herbe, la terre, la nuit, les trois follets) et en jeu (`heros_scene.mjs`) : des aplats, un trait noir dur là où la capuche pose sur les épaules, des liserés en bandes plates. Le héros fait ~45 px de haut à l'écran en 1080p : un détail sous le pixel ne se voit qu'au téléphone (DPR 3). Plan, une couche par commit : la cape, la capuche, les jonctions, la lumière de l'œil sur la cape, les reflets de l'œil.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `49b4f2b` | `D-263` | **La cape en volume** : dégradé radial centré au-dessus de l'épaule gauche (moteur : `degrade.centre`), épaules éclairées, trois plis, liserés du flanc en dégradé, l'ombre de la capuche fondue sur les épaules. Première passe trop sombre (ourlet noir) et plis trop tracés : éclaircie. 29 primitives. `V-183`. Suite verte, 225 fichiers |
| `280a18e` | `D-264` | **La capuche en volume** : fond en dégradé radial (haut gauche du dôme), liserés en dégradé vertical ; moteur : dans une pièce miroir en reflet, un dégradé garde sa lumière (centre de l'autre côté, horizontal inversé). Première passe : liserés trop éteints (la silhouette se lit par eux), rehaussés. `V-184`. Suite verte |
| `2acf1c9` | `D-265` | **Les jonctions** : le fond de la capuche descend presque au bord de son contour (le trait noir sous elle ~0,8 → ~0,3, le contour qui découpe l'ouverture intact), son ombre déborde sur les épaules. `V-185`. Suite verte |
| `316f815` | `D-266` | **La lumière de l'œil sur la poitrine** : la pièce `lueur` (dégradé elliptique teinté sur le haut de la cape, sous la capuche) ; moteur : une pièce peut en `suivre` une autre (sa pose et l'origine de la guide, pas sa découpe). `V-186`. Suite verte |
| `c446a83` | `D-267` | **Les reflets de l'œil** : lentille, croissant de lumière traversante, reflet de fenêtre, bave du grand reflet ; la lueur de poitrine resserrée (de profil elle débordait de la cape). 34 primitives. `V-187`. Suite verte |
| `80314d9` | `D-268` | **Spec 16 écrite, palier A** : `poseAAngle` (le héros à tout angle, mélange des deux directions voisines ; une pièce cachée s'efface en glissant de sa `fuite` ; un segment mixte dessiné en reflet, le seul saut au passage exact de `sud`/`nord`, mesuré sous le pixel) ; l'œil découpé par le contour de la capuche (vues fixes : 0 px de différence) ; `tools/banc_tour.html`. **Commité avec un test rouge** (`test_d260` épinglait « le globe ne se découpe jamais ») : vu juste après, corrigé au commit suivant. `V-188` |
| `48b07af` | `D-268` | Le contrat du globe révisé : jamais découpé par son ouverture, au plus par le contour de la capuche. Suite verte, 226 fichiers |
| `1b74d99` | `D-269` | **Palier B, le héros tourne en jeu** : angle affiché et angle visé dans `orientation.js` (le geste exact, la cible d'un tir ; 540°/s, 2160°/s au tir ; amplitude minimale 0,25), `heroAngle` de `main.js` à `render.js`. Vu en jeu sous Chrome sans fenêtre (marche, demi-tour). `V-189`. Suite verte, 227 fichiers |
| `b8ddcb2` | `D-270` | **Palier C, le souffle et le pas** : `animations` du visuel en données (pièces, champ, amplitude, période, sinus ou rebond, repos ou marche ; jamais plus de 3 Hz), pondérées par le poids de la marche qui glisse ; le souffle, le rebond du pas, le balancement de la capuche ; le banc du tour les montre. Vu en jeu, aucune erreur. `V-190`. Suite verte, 228 fichiers |
| `e8be75f` | `D-271` | **Les dégradés gardés** (par contexte, primitive et teinte) : trouvé par la sentinelle. Vérifié identique sous Chrome (40 visuels × 5 vues). `dessiner()` ×6 5,76 → 5,21 ms. Suite verte, 228 fichiers |
| (celui-ci) | DOC | Le journal, la sentinelle, `D-272` ouvert, « Où on en est » |

## L'animation (branche `heros-animation`, partie de `heros-polish`)

Mesuré d'abord : les vues de l'est sont des reflets de l'ouest ; tourner d'un
trait fait donc passer d'un dessin non reflété à un reflété, au passage exact
de `sud` et de `nord`. `sud` contre son reflet, `nord` contre le sien : les
mêmes à un liseré près (sous le pixel à la taille du jeu). Le tour continu est
donc possible sur les huit poses validées, sans sprite. Spec 16 écrite
(`specs/16_animation-heros.md`) : la réponse à « 8 ? 16 sprites ? » (aucun : le
héros est un dessin de nombres, huit poses clés en donnent 360, pour un coût
nul — les poses se gardent au degré près), puis trois paliers, joués cette
nuit sur la demande de Xav (« tout ce que je peux ») au lieu d'un par session.

## La sentinelle (`traversee_nuit`, Moyen, Chrome sans fenêtre, même machine)

| | `main` | nuit, avant `D-271` | nuit, après `D-271` |
|---|---|---|---|
| ×1 `dessiner()` moy / p95 | 0,58 / 0,90 ms | 0,69 / 1,10 ms | 0,65 / 1,00 ms |
| ×6 `dessiner()` moy / p95 | 4,89 / 6,60 ms | 5,76 / 8,60 ms | 5,21 / 7,50 ms |
| frames > 20 ms, ×1 / ×6 | 0 / 1 | 0 / 1 | 0 / 1 |

Aucune frame perdue. Le héros poli (34 primitives au lieu de 22, trois
découpes) coûte encore ~0,3 ms sous ×6 ; `D-271` a repris 60 % de l'écart, et
profite à tous les visuels. Vu en route, sur `main` : une sauvegarde refusée
sous ×6 (`D-272`, ouvert).

## Ce qui reste hors dépôt

`tools/_ref/` (exclu par `.git/info/exclude`) : les bancs de la nuit — la
différence au pixel contre une référence, l'atelier (×28, ×12, la taille du
jeu), le film d'un cycle de marche, la marche en jeu. Utiles pour la suite ;
à supprimer d'un `rm -r` sinon.

## Pour Xav

- **À ouvrir d'abord** : le banc du tour, `http://localhost:8080/tools/banc_tour.html`
  (`node serveur_local.js`) — tirer le pavé comme un stick, le tour
  automatique, « souffle et pas » et « en marche ». Puis en jeu, à la manette.
- **Trois branches, chacune partie de la précédente, rien fusionné ni poussé** :
  `heros-simplification` (`D-262`), `heros-polish` (`D-263` à `D-267`),
  `heros-animation` (spec 16 : `D-268` à `D-270`, et `D-271`). Chaque commit se
  retire seul (`git revert <hash>`), dans l'ordre inverse s'ils se suivent sur
  le même fichier de données.
- **À voir en jeu** : `V-182` à `V-190` (une par couche). Le seul saut du tour
  (au passage exact de `sud` et de `nord`) est la question ouverte de la spec
  16 §2.2.
- **Toujours ouverts** : `D-261` (le profil, ce qui cloche reste à dire),
  `D-272` (la sauvegarde refusée sous ×6), `V-177` à `V-181`.

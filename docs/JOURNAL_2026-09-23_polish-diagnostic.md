---
projet: RPG V2
episode/session: Diagnostic polish — ce que la passe d'ambiance n'avait pas touché
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : diagnostic polish (23/09, nuit)

Demande de Xav : reprendre le contexte des retouches graphiques (Grotte,
levier, stations…) et lister ce qui n'avait pas eu le traitement. Constats de
Xav : « la grotte est un peu trop surchargée mais les objets sont jolis ;
l'ambiance générale du jeu : sombre, vide, presque austère — médiéval post
industriel ; il manque aussi l'animation des leviers quand on les active ».

Diagnostic rendu en conversation (sept points), puis **go de Xav pour quatre
tickets, dans cet ordre** : décor partagé → grain du parquet → alléger la
Grotte → sortie et porte de la Grotte. Consigne sur la lumière, pour les
leviers (`D-158`, hors de cette file) : « les jeux de lumière sont là pour
contraster (pas éblouir) ; on ne les assombrit pas, au contraire, il faut bien
voir qu'ils s'allument, on peut même rajouter un léger halo en fondu ».

**Hors cible, jamais touchés** (décision du polish ambiance, reconduite) :
héros, feu follet, stations, arbre et rocher de récolte, flaque d'eau du puits,
items.

Branche `polish-diagnostic-2026-09-23` (partie de `polish-ambiance-2026-09-23`,
jamais poussée). Captures : `tools/scenarios/polish_diagnostic.mjs`, sorties
non versionnées sous `docs/captures/scenarios/polish-diagnostic-2026-09-23/`,
témoins `avant_*`.

Relevé en cours de diagnostic : **`tile_terre` n'est posée par aucune scène**
(ni `tile_eau`, ni `tile_sol_2`) — le ticket « grain de la terre et du
parquet » se réduit au parquet.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `435cf20` | Ménage | Journal polish ambiance archivé, INDEX à jour |
| `cd45a72` | `D-154` | Rochers de décor dans la valeur de la pierre (plus des galets pâles), touffe dans les verts de la pelouse, flaque d'eau noire. Garde-fou : un rocher de décor reste plus sombre que les pierres ramassables |
| `0534f4f` | `D-155` | Parquet : trois dessins × miroir, un bout de lame par dessin (des lames longues), joint au bord bas de la case. Une passe « un joint par rangée » faisait carrelage : retirée à la capture. Damier de teintes proposé en `Q-77` |
| `1811323` | `D-156` | Grotte : décor 0,10 → 0,04 sans herbe (21 → 8 objets par salle sous Moyen, des cristaux gardés dans chaque salle en réglant les poids), grain de sol 19-20 → 6-8 primitives (fissures, un galet, un peu de gravier). Relevé hors ticket : `D-159` (une `ligne` se referme) |
| `45771b0` | `D-157` | Sorties de la Grotte : deux tuiles (couloir sombre en salle 1, passage vers le jour en salle 2), halos déclarés dans la scène ; **code** : une lumière peut porter une `condition` (`scene.js#lumieresActives`), sans quoi le jour trahissait la porte fermée. Une première passe centrait le halo sur l'ouverture et effaçait le dégradé : reculé dans la salle |

## Ce qu'il faut en retenir

- **Un décor qui accompagne se tient dans la valeur de son sol** ; seul ce qui
  émet de la lumière (cristaux, sortie, follet) a le droit de ressortir. Les
  anciens rochers ressortaient en clair sur la pierre : c'était le défaut.
- **Vider une salle se règle au tirage, pas seulement à la densité** : à 8
  objets par salle, la graine fixe laissait zéro cristal en salle 2. Les poids
  se règlent en regardant le décor tiré (Moyen ET Haut), pas la moyenne.
- **Deux sorties qui ne mènent pas au même endroit n'ont pas le même
  dessin** : un couloir vers une autre salle s'enfonce dans le noir, un
  passage vers le dehors s'éclaircit.
- **Une lumière peut trahir un secret** : le halo d'une porte doit attendre le
  flag de la porte — d'où la `condition` sur les lumières.
- Les captures en scène ont fait retirer deux premières passes (parquet en
  carrelage, halo qui effaçait l'ouverture) : aucune ne se voyait au banc.

## Ouvert pour Xav

`V-89` à `V-92` (une validation par ticket), `Q-77` (damier de teintes du
parquet, bloqué par `E-04`), `D-158` (animation des leviers, avec ta consigne
sur la lumière, à lancer sur ton go), `D-159` (une `ligne` se referme : corriger
et revoir dix visuels, ou le déclarer voulu).

Restent du diagnostic, non retenus dans cette file : la porte de la Maison
(aplat beige), le monstre (losange violet en 2 formes, à dessiner avec toi).

## Partie 2 — la nuit : « tout ce qui dénote avec le standing actuel »

Go de Xav après la partie 1 : « go pour le reste (feu follet, monstre… tout ce
qui dénote avec le standing actuel), je vais dormir, je rectifierai demain si
ça ne me convient pas. Fais des commits réguliers sur branche, pas de push. »

**Le feu follet n'est plus hors cible** (il l'était pour le polish ambiance) :
Xav le nomme. Restent hors cible par défaut, faute d'avoir été nommés et parce
qu'ils ont été validés à leur standing : héros, stations, items, objets de
récolte. `D-159` (une `ligne` se referme) n'est **pas** traité : il change des
dessins validés, c'est à Xav de trancher.

File, dans l'ordre (chaque commit retirable seul) : porte de la Maison →
leviers (`D-158`) → monstres → follets → ce que l'inventaire des visuels
révélera encore.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `60a03c5` | `D-160` | Porte de la Maison : le parquet passe sous un seuil de pierre du mur, ombre du linteau, rivets. Symétrique (deux portes dans deux murs opposés) |
| `83ef25f` | `D-158` | Leviers : le manche devient une pièce mobile du visuel, le geste un état d'affichage pur (`bascule.js`) ; voyant ambre à la butée, halo en fondu qui perce le voile. **Code** : `render.js` (checklist visuelle due) |
| `869a99f` | `D-161` | Monstres : rampant en larve de caverne, rôdeur avec son propre dessin (masque de fer rivé) ; silhouettes sombres sans lueur (`Q-27`, tenu par test) |
| `cc04bf9` | `D-162` | Follets : flamme, goutte, cube de pierre — la forme porte toujours l'élément ; volume, cœur lumineux, halo en dégradé. Test `D-36` réécrit sur son intention (étincelles discrètes), pas sur la structure |
| `e04750e` | `D-163` | Bulle de dialogue et bannière des indices : un cadre partagé (`ui/cadre.js`) de la famille du bandeau. Touche les calques d'UI (checklist due) |
| `a8d7d58` | `D-163` (suite) | Le commit `e04750e` est parti avec un test rouge (`test_d136` : son faux contexte ignorait les dégradés et les coins arrondis du cadre) — enchaînement de commandes qui ne s'arrêtait pas sur l'échec. Faux contexte complété ; suite verte. Les deux commits se retirent ensemble |
| — | `D-164` | Icône Héros du menu : le héros encapuchonné à l'orbe, au lieu d'un avatar générique. Les autres pictogrammes restent (style des cartes, pas un retard) |
<!-- fin-table-2 -->


---
projet: RPG V2
episode/session: Session de polish en direct (Xav à la manette, une consigne = une modif)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-21
genere_par: claude
verifie_par: xav
---

# Fichier de bord — polish en direct (21/09, après la file « Nv.0 → Nv.10 »)

Session **en direct** : Xav joue, énonce une consigne, la modif est faite, il rejoue. Règle de
la session, posée par Xav à l'ouverture : **une consigne = une modif**, on ne touche qu'à
l'item ou à la scène nommés. Branche `main`. Aucun `push`.

Ce fichier est l'état de la session sur le disque, écrit au fil des modifs — pas après coup.

| # | Consigne (verbatim ou au plus près) | Ce qui est livré | Fichiers | Validé en jeu |
|---|---|---|---|---|
| 1 | « le +1 et le +1xp se chevauchent → le +1 XP reste tel quel, et le +1 remonte de quelques pixels pour être affiché au-dessus. il faut qu'ils restent lisibles les deux. » | Décalage vertical **propre au style** de texte flottant, en données : `styles.gain.offset_y_px = -9`, `xp` inchangé (clé absente = 0). Le décalage s'ajoute au décalage global et il est **constant dans le temps**, donc les deux textes montent ensemble en gardant leur écart. Schéma étendu (`offset_y_px` optionnel sur un style, nombre si présent) pour que la valeur reste un réglage de données. | `data/effets.json`, `src/render.js`, `src/schemas.js` | à faire |
| 2 | « quand on meurt, le clignement des yeux est trop rapide. si possible, on rejoue toute l'intro sauf le choix et le monstre salle deux. » | `effet_clignement_respawn` reprend **exactement** les durées de l'intro : `[600, 900, 1400]` / noir 400 (≈ 3,7 s) au lieu de `[220, 520]` / 180 (≈ 0,9 s). Aucune seconde implémentation : c'est déjà la même fonction (`intro.js#ouverturePaupieres`), seules les données changent. | `data/effets.json`, `src/main.js` (commentaire), `tests/test_d65_…` | à faire |
| 3 | « go telle quelle » (afficher le consommable équipé dans la barre du bas comme l'épée) | `ui/hud.js` ne reçoit plus **un** `visuelArme` mais une table `iconesSlots` (`verbe → visuel`) : les deux `if (verbe === 'attack')` du dessin **disparaissent**, barre du bas et boutons tactiles passent par la même ligne. `main.js` résout `attack` (arme équipée, inchangé) et `consume` (le `render.visuel` du consommable équipé — aucune donnée nouvelle). | `src/main.js`, `src/ui/hud.js`, `tests/test_d20b_…` | à faire |

| 4 | « la plume […] n'a que 6 branches et ressemble plus à un os qu'à une plume. rajouter des branches, au moins 6, serrées les unes aux autres, et la pointe de chaque branche un peu noire, comme des plumes d'aigle. ne touche pas à la tige, ni la forme et taille actuelle » | 19 barbes (10 du côté large, 9 du côté ombré) au lieu de 5, espacées de ~1,07 u pour une épaisseur de 0,95 u — **serrées, sans se confondre**. Chacune est faite de DEUX traits : le corps clair et un bout sombre de 0,75 u (les deux se chevauchent de 0,3 u, sinon un trou apparaît à l'arrondi). L'inclinaison des barbes augmente vers la pointe (0,18 → 0,62 de la direction de la tige) : c'est le galbe qui distingue une plume d'une arête. L'encombrement reste celui d'avant (y −5..5). | `data/visuels.json` | à faire |
| 4 bis | « la tige dépasse de la pointe, il faudrait la redescendre (ou monter les barbes) pour allonger la base et laisser les plumes faire la pointe. peut-être l'affiner un peu aussi, la tige, pas le reste. » | La tige s'arrête à 90 % de sa course (`[[-4, 5], [2.3, -4]]`) et passe de 2 à **1,4** d'épaisseur ; les barbes partent plus haut (22 % au lieu de 10 %) et montent jusqu'à 94 %. Conséquences voulues : la base nue s'allonge, et **ce sont les barbes qui font la pointe** — la tige ne dépasse plus. Les longueurs de bout de barbe sont rentrées pour que la silhouette garde sa hauteur (y −5,1..5). Le reste (nombre, serrage, bouts sombres, galbe) est inchangé. | `data/visuels.json` | à faire |

| 5 | « les angles du carré dépassent vachement de la bulle […] réduire la taille du feu follet jaune, mais pas en entier : juste les carrés jaunes, pas la bulle et la déco. » | `visuel_follet_terre` : le carré passe de 14 à **11,6** et son reflet de 6 à 5 (décalé −1,7 au lieu de −2, pour garder la même place relative). Motif mesurable : la demi-diagonale d'un carré de 14 vaut **9,9** alors que la bulle a un rayon de **8,5** — les quatre coins sortaient. À 11,6 elle vaut 8,2, le carré est inscrit et la bulle réapparaît aux quatre coins, comme les pointes du triangle de feu. **Bulle, étincelles et halo inchangés**, et l'encombrement à l'écran ne bouge pas (c'est la bulle de 17 qui le fixe). Aucun effet de jeu : l'aura et la lumière viennent de `companions.json`, et l'échelle de dessin d'une constante (`TAILLE_REFERENCE_FOLLET_PX`), jamais de la taille du carré. | `data/visuels.json` | à faire |

| 6 | « la silhouette [du puits] est cassée depuis l'agrandissement des proportions, j'aimerais qu'on la reprenne comme on vient de faire avec la plume : diagnostic visuel chrome/tools puis itération » (`D-16`) | Mesuré d'abord : le pied des mâts s'arrêtait à `y −7` pour un sol à `y 0` — **7 unités de vide**, soit 14,7 px à l'échelle ×2,1, la demi-tuile signalée ; et la margelle était un **disque** (−16..+4) avec l'eau en son centre, d'où le « pot ». Reconstruite en **cylindre vu de trois quarts** (règle du décor : base + paroi + rebord, trois pièces, l'ellipse de base dessinée SOUS la paroi pour ne pas la barrer d'un arc), mâts **plantés au sol** et débordant du cylindre pour que leur pied se voie, toit en deux pentes au lieu de la planche plate qui faisait un portique. Treuil, corde et seau conservés (`Q-03`). Défaut d'assemblage attrapé au passage par le test : la corde ne touchait plus le seau de 0,1 unité. | `data/visuels.json`, `tests/test_sd_puits_silhouette_…`, `tools/banc_visuel.html` | à faire |

| 6 bis | « le fût, il faudrait le mettre au même niveau que le sol. Là, on dirait qu'il vole. […] Suite à ça, il faudra recalculer les ombres. » | Le fût touchait bien le sol (`y +1,5`), mais son ellipse de base **sombre** se lisait comme de l'ombre, et l'ombre portée (centrée `y +1`, haute de 6) débordait de 2,5 unités sous lui : un croissant noir sous l'objet, d'où l'impression qu'il flotte. Tout le monde repose maintenant **exactement sur `y = 0`** — mâts et base du cylindre sur la même ligne —, et l'ombre est **recentrée sur ce contact** (`dy 0`, 24 × 5 : elle ne dépasse plus que de 1,1 unité autour des mâts, au lieu d'un disque presque aussi large que le puits). Le groupe du cylindre (base, paroi, rebord, ouverture, eau, reflet) et le seau descendent d'une unité ensemble : l'assemblage ne bouge pas. L'empreinte perd encore 1,5 unité en bas, toujours incluse dans celle d'avant. | `data/visuels.json`, `tools/banc_visuel.html` | à faire |

| 6 ter | « il faut que le bord du fût, le plus bas, soit à y = 0 […] le fût descende en entier, tel quel, de quelques pixels […] et se désolidarise du seau » | **J'avais mal lu la consigne précédente** : « base du fût » désignait son **bord latéral**, celui qui longe les mâts — pas son point le plus bas. En trois quarts, le bord latéral d'un cylindre est la **hauteur du centre** de son ellipse de base ; c'est lui qui doit être au niveau du pied des mâts, et l'avant du fût passe alors **sous** cette ligne, parce qu'il est plus près de l'œil. Le fût descend donc **en bloc de 2,5 unités** (la demi-hauteur de son ellipse), sans changer de taille : bord latéral à `y 0`, avant à `y +2,5`. Le seau **ne suit pas** : il reste suspendu au-dessus de l'ouverture, comme demandé. Ombre resserrée sur le nouveau contact (22 × 6, `dy 0,4`). | `data/visuels.json`, `tests/test_sd_puits_silhouette_…` | à faire |

## Décisions prises en séance

- **Le clignement de mort rejoue celui de l'intro** — *révise* la contrainte d'origine de `D-65`
  (« ~0,9 s, plus court que l'intro, à ne pas allonger »). Motif donné par Xav : mourir doit se
  lire comme un réveil. Le test de `D-65` épinglait cette contrainte ; il éprouve désormais la
  **relation** demandée (respawn = intro), jamais un nombre de millisecondes (règle `D-52`).
- **La barre du bas n'a plus de cas particulier par verbe** (Xav : « parfait pour anticiper les
  compétences »). Conséquence voulue : le jour où un `skill_N` se débloque, son icône s'ajoute
  dans `main.js` et **nulle part ailleurs** — `ui/hud.js` ne saura toujours pas ce qu'est un slot.
- **L'icône du consommable est sa silhouette de monde**, telle quelle, en essai. Si elle se lit
  mal réduite à la case, le remède est une entrée d'icône dédiée **en données**, comme
  `visuel_icone_epee_bois` pour l'épée — toujours pas de code (décision de Xav : « après test on
  fera si c'est trop moche »).

- **L'empreinte du puits ne GAGNE aucune tuile, elle en perd une.** `D-16` prévenait
  que la boîte englobante changerait ; elle est en fait **strictement incluse** dans
  celle d'avant (le toit, plus bas, libère la rangée `y = 55`). La question « le puits
  mord-il sur un chemin ou sur la zone du fruit ? » ne se pose donc pas, et le test
  n'épingle plus une boîte mais cette **inclusion** (règle `D-52`). Poser une empreinte
  explicite sur la seule **base**, comme `D-16` le suggère, reste **ouvert** : cela
  changerait où le héros peut se tenir — une décision de jeu, pas un détail de dessin.
- **Le banc visuel cadre désormais sur la silhouette**, et prend l'échelle d'usage
  (`&echelle=2.1` pour une station). Motif : à 24 unités fixes il **coupait le toit du
  puits**, c'est-à-dire précisément la pièce à juger — et il ne montrait que l'échelle 1,
  que le jeu n'affiche jamais pour une station.

- **Le banc visuel compte l'ombre portée dans son cadre.** Il ne cadrait que sur les
  primitives, donc il **rognait l'ombre** — c'est-à-dire, pour cette consigne, la pièce
  même qui disait si le puits était posé ou s'il flottait.

- **Le bord latéral d'un volume, et non son point le plus bas, est ce qui se compare au
  pied de ce qui l'entoure.** Deux corrections de Xav pour arriver là : un fût « posé à
  `y = 0` » paraît **flotter au-dessus des mâts**, parce que son point de contact le plus
  bas est son AVANT, plus proche de l'œil. La règle est verrouillée par test (§2 ter) —
  elle servira à toute silhouette cylindrique à venir.

## Relevé hors consigne — signalé, pas corrigé

- **`tools/banc_visuel.html` est un fichier NON SUIVI, né de la consigne 4** et laissé dans
  l'arbre de travail : il dessine une silhouette de `data/visuels.json` **aux tailles réelles du
  jeu** (monde à DPR 1 et 3, tuile de la Poche), puis l'agrandit au plus proche voisin. Le
  détour n'est pas du zèle : agrandir la transform (`echelle: 32`) épaissit les traits avec, et
  fait juger une image que personne ne verra jamais — c'est ce qui a fait croire, au premier
  essai, que la plume était un pâté. À garder ou à jeter, au choix de Xav.

- **Le levier de la salle 1 ne se rejoue pas après la mort.** `flag_levier_salle1` est persistant :
  au respawn la porte est déjà ouverte, donc la séquence « clignement → levier → sortie » que Xav
  décrit s'arrête en fait à « clignement → sortie ». Le remettre à zéro à chaque mort est une
  **autre modif**, non demandée — en attente de sa réponse.
- **Le clignement de respawn ne gèle rien** (c'est son contrat depuis `D-65`) : à ~0,9 s personne
  ne le voyait, à ~3,7 s le joueur peut se déplacer un long moment derrière ses paupières. À l'œil
  de Xav.

- **`Q-43` est tranchée par Xav (21/09), pas encore appliquée** : « on n'a pas vraiment
  de gourde, donc si la soif est supérieure à 75 % de la jauge, ça ne donne pas d'XP ».
  Soit : soif < 75 % → le puits remplit **et** rapporte son XP ; soif ≥ 75 % → le puits
  remplit à 100 % et rapporte **0 XP**. C'est une **autre modif** (une consigne = une
  modif) : elle attend son tour.

## Report dans les documents (fait le 21/09, à la demande de Xav)

- `docs/DOC_suivi-dettes.md` : cinq lignes **closes** pour les cinq consignes — `D-73` (le
  chevauchement des textes), `D-74` (le clignement de mort), `D-75` (le consommable dans la barre
  du bas), `D-76` (la plume), `D-77` (le follet jaune). Quatre validations **nouvelles**, `V-47` à
  `V-50`, et `V-43` **rouverte à `pas vu`** : son verdict `non` du 21/09 est traité, la ligne est à
  rejouer et son libellé (« court, ~0,9 s ») ne voulait plus rien dire. `Q-46` ouverte pour ce que
  Xav a explicitement **différé** sur la mort.
- `docs/CHECKLIST_tournee.md` v1.1.0 : `V-40` **réécrite** — Xav ne l'avait pas comprise, et le
  mode d'emploi dit désormais que « pas compris » n'est pas un verdict mais un défaut de la
  checklist. Les quatre nouvelles lignes sont insérées **dans l'ordre d'une partie**, pas à la fin.
- `CLAUDE.md` : `tools/banc_visuel.html` ajouté à l'arborescence, quatre décisions datées ajoutées,
  et le journal de session pointe désormais sur cette page.

## À faire

- Les cinq modifs sont **à valider en jeu par Xav** (aucune n'est exerçable headless : texte
  flottant, paupières, HUD et silhouettes sont du rendu canvas).
- `Q-46` attend une décision, pas un correctif.

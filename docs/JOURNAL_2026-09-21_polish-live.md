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

## À faire avant de clore la session

- Les trois modifs sont **à valider en jeu par Xav** (aucune n'est exerçable headless : texte
  flottant, paupières et HUD sont du rendu canvas).
- Reporter dans `docs/DOC_suivi-dettes.md` ce qui en relève une fois les verdicts rendus.

---
projet: RPG V2
episode/session: L'ouverture de la capuche en perspective, de côté (D-260)
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'ouverture de la capuche en perspective (26/09)

Demande de Xav, capture à l'appui (`shaped_hood_form_fixes.png`, `sud_ouest` au banc des orientations) :

> ce qu'on a actuellement est une très bonne base, quasiment validé, chaque
> modification doit être chirurgicale […] Sud est parfait, notre référence.
> sud_ouest et ouest (puis par symétrie est et sud_est) ont une position d'oeil
> très correcte, le seul truc qui cloche à l'oeil c'est la perspective du trou
> de la capuche qui n'est pas 'réelle'. […] J'ai fixé 3 point, les deux
> extérieur (vert) sont ceux qui ne doivent pas bouger, les bornes, le bleu est
> le point qu'il faut drag légèrement vers l'intérieur pour donner la bonne
> forme et ainsi respecter la perspective.

Puis : « c'est un ordre d'idée à la louche […] oui il [le halo] suit […] ce
n'est que l'étape 1, j'ai bien séparé les taches, pour respecter la
perspective il faudra ensuite s'occuper du coin opposé ». Profondeur choisie
sur trois essais côte à côte : « vas pour 0.10 ».

Branche `ouverture-capuche`, partie de `main` (`c3662e7`).

## Diagnostic (avant tout code)

1. De côté, l'ouverture est l'ellipse de face déplacée et inclinée, jamais
   déformée : une ouverture sur une capuche qui tourne se raccourcit du côté
   qui fuit. Les trois points de Xav, relevés dans le repère de l'ouverture
   (calés sur le diamètre du globe) : bornes à −48° et +65°, le bleu à +31° —
   tous sur le bord du trou. Le bas (+90°) n'est pas touché.
2. Le halo teinté suit la même ellipse : il déborde déjà sur le bas de la
   capuche ; il doit se déformer avec la façade.
3. Le liseré est un dégradé en anneaux : découper le trou seul laisserait une
   bande noire épaisse (la classe d'erreur de la joue de `D-259`, itération 3).
4. Itération 0, hors dépôt : prototype de la déformation (le rayon multiplié par
   `1 − profondeur · sin²`, nul et à dérivée nulle aux bornes), l'arc peint en
   tranches. Coutures entre tranches (l'anticrénelage de chaque découpe) ; le
   recouvrement les ôte de la façade opaque mais les double sur le halo
   translucide ; peintes en `lighter` dans une toile à part, vide, leurs bords
   se complètent exactement — aucune couture, même à ×40.

5. **Itération 1** (`sud_ouest` seul) : `deformations` de pose, une liste
   d'arcs `{ de, sommet, a, profondeur }` (profondeur signée : négative, l'arc
   bombe — le coin opposé de l'étape 2 sera une donnée). Moteur :
   `visuels.js#facteurDeformation` (pure), `peindreDeformee` (tranches de 8° au
   plus, chacune l'application linéaire qui donne à ses deux rayons-bords leur
   facteur exact ; toile à part en `lighter`, posée d'un bloc). Schéma :
   sommet dans son arc, arcs sans chevauchement, profondeur < 1, pièce faite
   d'ellipses seulement. `sud_ouest` : façade et halo, arc −48° → 65°, sommet
   28°, profondeur 0,10. `test_d260` (nouveau) ; `test_d229` : son faux
   contexte rend sa transform, une primitive posée d'un bloc compte comme un
   remplissage. Suite verte, 224 fichiers. Prototype `tools/_proto_creux.js`
   supprimé.
6. Xav, au banc : « non, ça ne marche pas, on a trouvé la limite. retour
   arriere je te propose autre chose ». Itération 1 retirée avant tout commit
   (`git restore` du moteur, du schéma, des données et de `test_d229` ;
   `test_d260` supprimé) : le dépôt revient à `2ae3640`. En attente de sa
   proposition.
7. Xav : « compare sud_ouest et ouest, tu remarquera que leur "trou de
   capuche" se termine à droite sur le même axe vertical = incohérent […]
   dans ouest, il faudrait le décaler à gauche et la partie gauche du trou
   devrait donc logiquement ne pas être apparente ». Mesuré : de face au
   trois quarts le trou glisse de 0,9, du trois quarts au profil de 0,2 ; à
   gauche, liseré (−6,03) et halo (−6,5) dépassent déjà la silhouette
   (−5,9). Prototype hors dépôt (décalages 0,6 / 1,0 / 1,4, découpe par
   l'intérieur de la capuche). Xav : « 1,2 » ; le globe « doit rester entier,
   il faut désigner qui est devant, le globe, et qui est derrière » ; « pas
   de liseret là où la capuche n'est plus apparente » (la découpe par le
   contour noir) ; `sud_ouest` découpé « mais on ne le décale pas ».
8. **Itération 2** : la **découpe** d'une pièce par la silhouette d'une autre
   — pose `decoupe: "<pièce>"`, primitive `silhouette: true` (le contour noir
   de la capuche) ; `visuels.js#decouperParSilhouette` trace la silhouette
   dans la pose de sa pièce (pliée, reflétée) puis découpe dans la transform
   d'avant ; l'application d'une pose sortie en une fonction (`poser`,
   `primitivePosee`), partagée par le dessin et la découpe. Schéma : une
   découpe nomme une autre pièce qui porte une silhouette, visible dans la
   direction ; une silhouette par pièce, un polygone. Données : cavité,
   façade, halo découpés dans les quatre vues de côté ; `ouest` décalé de
   −1,2 (les quatre pièces de l'œil ensemble, le regard gardé), `est` en
   miroir ; `sud_ouest`, `sud_est` découpés sans décalage ; le globe jamais.
   `test_d260` (nouveau ; une découpe mal posée, essayée, est attrapée).
   Suite verte, 224 fichiers.
9. Xav : « c'est pas trop mal, cependant en jeu j'ai l'impression que
   l'ensemble oeil+liseret se rétrécie entre chaque position
   sud->sud_ouest->ouest, donc (en ordre d'idée): sud= base ; sud_ouest=
   *1.01 ; ouest= *1.02 ». **Itération 3** : les quatre pièces de l'œil
   grandies d'autant **autour du centre de l'ouverture** (échelle × s, et
   position recalculée : `C + s · (O − C)`) — le regard et la découpe ne
   bougent pas ; `sud_est`, `est` en miroir. Données seules. Suite verte,
   224 fichiers.
10. Xav : « bien, pareil pour la hauteur du trou de capuche, j'ai
    l'impression qu'il se referme sur l'oeil (je viens de mesurer ils sont à
    la même hauteur) du coup on triche pareil +1% sur l'ellipse sud_ouest et
    +2% sur l'elipse ouest ». **Itération 4** : `echelle_y` de pose (dans le
    repère incliné de la pièce ; `visuels.js#poser`, schéma), 1,01 de trois
    quarts et 1,02 de profil sur cavité, façade et halo — le globe reste rond.
    Révise le contrat de `test_d256` §4 (« jamais ne s'écrase ») : l'ouverture
    peut se rouvrir en hauteur, jamais se refermer ; §2 : le globe ne s'étire
    pas en hauteur ; `test_d260` : l'ouverture se rouvre d'un bloc. Suite
    verte, 224 fichiers.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `2ae3640` | Ménage | Journal de la capuche du héros archivé ; aucune réponse nouvelle au suivi ; branche `ouverture-capuche` |
| `9c83a6c` | `D-260` | De côté, l'ouverture (cavité, façade, halo) découpée par le contour de la capuche (`decoupe`, primitive `silhouette`, `poser` partagé par le dessin et la découpe), le globe jamais ; de profil avancée de 1,2 ; l'œil × 1,01 / × 1,02 autour du centre de l'ouverture, le trou rouvert en hauteur d'autant (`echelle_y`). La déformation d'arc (itération 1) n'y est pas : retirée avant commit. `V-181` à voir, `D-261` ouvert. Suite verte, 224 fichiers |
| `b89c7a7` | DOC | Le journal de la session, « Où on en est » |
| (celui-ci, tagué `v0.8.83`) | Version | Xav : « oui go push » — `ouverture-capuche` fusionnée dans `main` (avance rapide), `package.json` à `0.8.83`, « Où on en est » ; `main` et le tag poussés. `V-177` à `V-181` restent ouvertes |

## Pour Xav

- **À voir en jeu** : `V-181` (l'ouverture de côté, en tournant au joystick). Toujours en attente : `V-177` à `V-180`.
- **À reprendre** : `D-261`, le polish de profil (« ouest mérite du polish suplémentaire ») — ce qui cloche reste à dire ; tout s'y règle en données.
- **Publié** : `v0.8.83` (`main` et le tag), avec `D-258`, `D-259`, `D-260`.

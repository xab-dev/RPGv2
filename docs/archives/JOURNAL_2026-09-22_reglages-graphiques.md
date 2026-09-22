# Journal de session — `specs/09_reglages-graphiques.md`, PALIERS A À E (22/09)

Les **cinq** paliers de `specs/09_reglages-graphiques.md` (arrivée écrite et
décidée, §3), branche `reglages-graphiques`, **un commit par palier** — et
**un par levier** au palier C, comme la spec le demande —, validation de Xav
entre deux. La spec est **livrée en entier** ; ce qui reste d'elle est du
ressort de Xav : `V-58` à `V-61`, et les questions qu'elle a ouvertes.

### Palier A — `D-01` : le calque ne se refait plus à chaque tuile

La marge du calque statique existait **depuis la Phase 2** — une tuile pleine de
chaque côté, plus la fraction que `floor`/`ceil` ajoutent, soit 1,5 tuile en
moyenne — et personne ne s'en servait : la condition de reconstruction comparait
`xDebut`/`yDebut` d'une frame à l'autre, donc un franchissement de tuile
reconstruisait **un calque qui couvrait encore parfaitement la vue**. Le remède
n'ajoute rien, il pose la question que `drawImage` pose deux lignes plus bas —
« le rectangle source tient-il dans le calque ? », en pixels **physiques**.

Mesuré en marchant, deux exécutions par régime (`cout_calque.mjs` ; Chrome sans
fenêtre, les fps n'y ont aucun sens) :

| | reconstructions | moyenne | pic | frames > 20 ms |
|---|---|---|---|---|
| avant, ×1 | 15 | 3,64 ms | 5,70 ms | 0/600 |
| après, ×1 | **8** | 3,65 ms | 4,50 ms | 0/600 |
| avant, ×6 | 16 / 16 | 24,0 / 25,9 ms | 35,2 / 40,3 ms | **16/600** |
| après, ×6 | **8 / 8** | 27,6 / 27,0 ms | 48,8 / 50,0 ms | **8/600** |

Le bridage CPU ×6 est neuf (`chrome.bridageCpu`) et dit une chose nette : **une
frame lente par reconstruction, avant comme après**. Donc la fréquence *est* la
saccade — et **le pic ne baisse pas**, exactement ce que la spec annonçait. Le
défilement incrémental (remède n° 2) reste le seul qui le ferait tomber ; il
attend la décision de Xav, avec son piège déjà nommé (`D-105` : une tuile solide
a le droit de déborder de sa cellule). **`V-58` close le jour même** (« game is
still good »), `D-01` reste ouverte.

### Palier B — le catalogue, la résolution, la sauvegarde (`D-111`)

**Zéro changement visible, et c'est vérifiable autrement qu'à l'œil** : le seul
appel de `valeurLevier` est le contrôle de démarrage — `render.js`, `decor.js`
et `poussiere.js` ne sont pas touchés. Ce qui existe maintenant :
`data/graphismes.json` (les quatre paliers, les trois leviers, les seuils
d'Auto), `src/qualite.js` (pur, LE point de résolution), `role` requis sur
chaque effet, `settings.graphismes` et l'import qui l'ignore.

Trois choses tombent désormais **au démarrage** plutôt qu'en jeu : un palier qui
n'a pas de valeur pour un levier déclaré · un effet sans `role` (aucun repli :
ce que Bas retire est justement ce qui ne dit rien au joueur, donc un effet
oublié disparaîtrait en silence) · un réglage inconnu venu d'une sauvegarde,
qui est résolu comme le défaut **et** signalé (patron de `lireEchelleForcee`).

Le contrat de non-régression est posé en **propriété**, jamais en nombres (règle
`D-52`) : sous Moyen, aucun levier ne s'écarte de la `valeur_neutre` déclarée en
données. Il restera vrai le jour où un levier s'ajoutera — c'est tout l'intérêt.

Et le piège de l'export est traité à la source : **le réglage graphique
appartient à l'appareil**, donc `REGLAGES_APPAREIL` est une *liste* (le prochain
réglage d'appareil s'y ajoute et nulle part ailleurs), l'import reprend la
valeur de la machine, et **l'absence est une valeur** — une machine qui n'a
jamais choisi ne se fait pas imposer le « haut » d'un fichier venu d'un PC.
Aucune migration, `schema_version` inchangée.

### Palier C — les trois leviers branchés (`D-112`, `D-113`, `D-114`)

Un commit chacun, retirable seul. La règle qui les gouverne tous les trois :
**chaque système reçoit un NOMBRE**. `poussiere.js`, `curseur.js`, `decor.js`
et la table de grains que lit `render.js` ignorent toujours qu'un preset
existe — le seul endroit qui connaît le mot « bas » est l'orchestrateur, sur
trois lignes.

`particules` (`D-112`) multiplie les quantités déclarées par les effets
**cosmétiques**, et elles seules : les deux effets `information` du catalogue
sont intouchés dans les trois presets. **Zéro n'est pas une absence** — la
réserve est vide, donc rien ne naît et rien n'est dessiné ; « n'émet pas et ne
dessine pas » est une conséquence, pas une branche de plus. Avec, l'outil de
debug `?qualite=bas|moyen|haut` (même contrat que `?echelle`).

`grain_sol` (`D-113`) coupe la liste des primitives du grain d'une tuile **non
solide**, par la fin — convention écrite dans le schéma des tuiles, et la
coupe est un **préfixe**, vérifié. Un grain réduit à rien **sort de la table**
que reçoit `render.js` : le rendu ne le cherche même plus. Deux immunités
prouvées : la couleur de base (le sol perd son grain, jamais sa surface) et
les tuiles solides (une silhouette d'arbre *est* le monde). Le repli prêt de
`Q-55` est mesuré au passage : `0.2` laisse **3 brins sur 14**.

`densite_decor` (`D-114`) multiplie la densité déclarée par la scène. La
crainte de la spec — « si `decor.js` tire en séquence, le décor se réarrangera
à chaque changement de preset » — a été **vérifiée à la cause, et elle ne se
réalise pas** : le tirage est séquentiel, mais chaque itération consomme un
nombre **constant** de tirages, donc réduire le compte tronque au lieu de
décaler. Le décor réduit est le **préfixe** du décor complet. Il n'y avait
rien à corriger, mais un contrat implicite à rendre explicite : il est écrit
dans `genererDecor` et **tenu par test**. Le remède suggéré par la spec (un
tirage par tuile comparé à un seuil) aurait déplacé **tous** les motifs de la
Maison, **y compris sous Moyen** — une régression visible au nom d'un défaut
qui n'existe pas.

Mesuré en marchant, deux exécutions par régime (`cout_calque.mjs`, désormais
piloté par `RPG_QUALITE`) :

| | coût moyen d'une reconstruction | pic | frames > 20 ms |
|---|---|---|---|
| Bas, ×1 | **1,69 / 1,89 ms** | 3,7 / 5,8 ms | 0 / 1 sur 600 |
| Moyen, ×1 | 6,11 / 5,92 ms | 8,6 / 11,9 ms | 0 / 0 |
| Haut, ×1 | 6,70 / 5,56 ms | 12,8 / 8,5 ms | 0 / 0 |
| Bas, ×6 | **6,29 / 7,36 ms** | 8,6 / 10,6 ms | **3 / 2** |
| Moyen, ×6 | 38,4 / 34,5 ms | 51,2 / 44,4 ms | 8 / 9 |
| Haut, ×6 | 38,8 / 39,0 ms | 73,9 / 76,7 ms | **12 / 13** |

Sur un appareil lent simulé, **Bas divise le coût de reconstruction par ~5 et
les frames lentes par ~4** : c'est exactement ce que le palier visait. Et Haut
coûte ce qu'il promet — même calque que Moyen, mais plus de frames lentes et
un pic bien plus haut, à cause des particules. Assumé : c'est le palier des
machines qui s'ennuient.

L'invariant §4.1 (**un preset ne change jamais le jeu**) est éprouvé sur la
vraie scène Maison, 600 frames identiques dans les trois presets : solidité
relue par `estSolideAuPoint` — la fonction de collision elle-même, jamais une
grille recopiée —, empreintes des stations, héros, monstres, sauvegarde
entière. 121 fichiers verts.

### Palier D — la carte, et le changement à chaud (`D-115`)

Carte `bascule` en **6ᵉ et dernière case** de Paramètres, cycle
`auto → bas → moyen → haut → auto` pris dans l'**ordre du catalogue** :
insérer un preset dans le tableau l'ajoute au cycle sans une ligne de code.

Le libellé est **une seule clé**, jamais deux qu'un gabarit assemblerait ici —
« Auto (…) » composé en code figerait parenthèses et ordre des mots pour
toutes les langues. Chaque palier réel porte donc `cle_etat` **et**
`cle_etat_auto`, la seconde **exigée par le schéma** : un preset ajouté demain
ne peut pas faire afficher « Auto () ».

L'état est relu à la **source**, et la source est l'orchestrateur — pas
`save.settings`. La différence n'est pas théorique : sous `?qualite=`, c'est
l'URL qui commande, et la carte doit dire ce que le jeu **rend**, jamais ce
qui est enregistré.

Changement à chaud (§4.5), prouvé sur le vrai orchestrateur. Ce qui bouge : la
table des grains, le décor de la scène, les réserves de particules (recréées,
donc **vidées** — même geste qu'à l'entrée en scène), et le calque statique
**jeté une fois**. Ce qui ne bouge pas : le héros au pixel près, l'heure du
monde, la sauvegarde — et le preset **résolu** n'est toujours pas persisté.
Le retour en arrière rend exactement l'état d'avant.

Captures aux **trois profils**, cycle complet par clics réels, **aucune erreur
de console** (`tools/scenarios/reglages_graphiques.mjs`). Une réserve à dire :
le profil `telephone` émule la taille et le DPR, **pas** `pointer: coarse` —
il affiche donc « Auto (Moyen) » là où un vrai téléphone dirait « Auto (Bas) ».
Limite de l'outil, pas du code ; seul `V-61` peut la lever.

**Paramètres est plein** : les six cases sont prises, et une 7ᵉ ne rentre dans
aucune grille — l'écran serait vide. Consigné, non traité (décision 5).

Et une chose que les captures ont montrée et que la spec n'avait pas prévue :
en Bas, **le parquet de la Maison perd ses lames**. Dehors un aplat d'herbe
reste de l'herbe ; dedans, la lame *est* la lecture de la surface. `Q-59`.

### Le retour de Xav sur les trois presets (22/09), et ce qu'il retourne

Verbatim : « **bas** : aucun problème à l'œil, le jeu est léger. **moyen** : le
plus "moche" des trois, fonctionnel. **haut** : pas encore de différence
notable, à booster. »

Trois conséquences, toutes consignées et aucune traitée :

`Q-55` est **répondue, à l'envers de ce qu'on craignait**. On redoutait que Bas
sans grain soit trop pauvre ; c'est **Moyen** — c'est-à-dire le jeu
d'aujourd'hui — que Xav trouve le moins beau. `grain_sol: 0` reste, le repli
`0.2` n'est pas posé, et `Q-59` (le parquet sans ses lames) tombe avec.

`Q-60` naît de là, et elle est plus grosse qu'elle n'en a l'air : **le grain du
sol gagne-t-il sa place ?** Bas est jugé bon à l'œil *et* il divise par ~5 le
coût de reconstruction du calque — donc il est un candidat sérieux au **statut
de défaut**, pas seulement à celui d'allègement. Mais toute suite autre que
« rien » **rouvre le sol**, que `E-04` avait verrouillé (« garde le sol de la
maison, améliore-le, mais ne le change pas ») : ça remonte, ça ne se fait pas.
Réserve de lecture : grain et décor partent **ensemble** en Bas, donc ce retour
ne dit pas lequel des deux est en cause.

`D-116` — **Haut ne se voit pas**, et les mesures le disaient déjà : même
calque que Moyen, seules les particules changent, et elles sont petites, brèves
et périphériques. Ce qui manque à Haut est de la matière **dans le calque**,
c'est-à-dire `E-04` — que la spec avait justement prévu comme son réceptacle.
Premier levier disponible : `densite_decor` au-delà de 1, **bloqué par
`D-106`** (sans lui, décupler la densité sème de l'herbe sur le chemin).

### Palier E — Auto (`D-117`), et le chantier est fini

Le signal de départ existait depuis le palier B (`pointer: coarse` → Bas,
sinon Moyen, et **jamais Haut** : Auto ne suppose pas, il n'offre pas). Ce
palier livre la **descente** et ce qu'on en dit.

Les quatre promesses de §5.2 sont tenues **par construction** plus que par
surveillance. « Au plus une descente par niveau » n'a demandé aucun compteur :
chaque descente change de niveau et rien ne remonte jamais, donc aucun niveau
ne se présente deux fois. « Jamais de remontée » n'a demandé aucun garde : il
n'existe aucun chemin qui rende un preset au-dessus du courant. Ce qui a
demandé du soin, c'est l'inverse — les frames qu'il ne faut **pas** compter.

L'**annonce** passe par la bannière d'indice, à qui on apprend à dire une
phrase du jeu et non d'un verbe : pas de glyphe, pas de flag. Elle **cède le
pas** à un premier indice de commande et se represente jusqu'à ce qu'elle
passe — un indice enseigne le jeu, l'annonce ne fait que l'expliquer. Elle est
aussi journalisée : la bannière dure trois secondes, or c'est exactement ce
qu'on voudra relire le jour où un « le jeu s'est allégé tout seul » arrivera
d'une autre machine.

Trois passes dans un vrai Chrome (`tools/scenarios/auto_graphismes.mjs`) :

| | carte Paramètres après 25 s de marche | descentes |
|---|---|---|
| bridage ×20, Auto | « Auto (Moyen) » → **« Auto (Bas) »** | **1** |
| sans bridage, Auto | « Auto (Moyen) » | 0 |
| bridage ×20, **`haut` choisi à la main** | « Haut » | 0 |

La deuxième passe n'est pas du zèle : sans elle, la première ne prouverait
rien — un Auto qui descendrait toujours la passerait aussi.

Et une mesure que personne n'avait demandée, qui devient `Q-61` : sous bridage
**×2, ×3 et ×6**, Auto **ne descend jamais**. Le ×6 est pourtant le proxy
d'appareil faible du palier A. Le seuil de 15 % n'est donc pas nerveux — il
est peut-être trop lâche. C'est structurel : 20 ms, c'est 50 fps, donc une
machine à 60 fps régulier passe et une machine à 45 fps régulier échoue à
**100 %**. Conséquence à regarder en face : la saccade au franchissement de
tuile (~1,3 % de frames lentes) ne déclenchera **jamais** Auto, alors que
c'est justement la gêne que Bas soigne le mieux. Rien n'est changé — les trois
seuils sont ceux que la spec a fixés, ils vivent en données, et c'est `V-61`
sur les vraies machines qui doit parler avant qu'on touche un chiffre.

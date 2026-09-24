---
projet: RPG V2
episode/session: Spec 13, palier D — les lisières, le mécanisme
type: fichier de bord
version: 1.0.0
statut: livré, à valider en jeu (V-145)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier D (24/09)

Demande de Xav : « go palier D ». Un palier, rien d'autre. Branche `carte-lisieres-perf`, pas de push.

**Identifiants** : le palier traite `Q-52` (première paire), sous un ticket à lui, **`D-201`** (clos). La `V-135` de la spec est déjà prise (la plume) : la validation devient **`V-145`**. `Q-131` (la forme) et `Q-132` (les rangs) n'existaient pas au suivi : créées.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `4d81957` | Ménage | Journal du palier C archivé, INDEX à jour, une ligne périmée de `CLAUDE.md` (`D-01` « en attente ») retirée |
| (ce commit) | `D-201` — palier D | `src/lisieres.js`, `render.lisiere` validé au démarrage, deux dessins, la lisière dans le calque |

## 1. Ce qui a été construit

- **Les données** (`tiles.json`) : l'herbe déclare `lisiere: { rang: 3, bord, coin_interieur }` et le chemin `{ rang: 1 }` seul (il peut être dominé, il ne déborde sur rien). La terre n'a pas encore de rang : c'est le palier E.
- **La validation au démarrage** (`schemas.js#erreursLisiere`) :
  - `rang` est un entier ≥ 1 ;
  - `bord` et `coin_interieur` vont ensemble, existent dans `visuels.json` et sont ancrés au **centre** ;
  - une tuile solide ne déclare pas de lisière, une tuile posée sur un sol non plus ;
  - une surface qui en domine une autre a un bord.
- **`src/lisieres.js`** (pur) :
  - `tableLisieres` : surface → rang et dessins résolus ;
  - `lisieresCase` : les poses de la case, un bord par côté dominé (N-E-S-O) puis un coin intérieur par diagonale **seule** ;
  - `visuelsDesLisieres` : pour le rayon d'influence.
  - La comparaison porte sur la **surface** (`tuileDeSol`). Le miroir d'un bord est tiré par `varianteTuile`, qui prend maintenant un **sel** optionnel ; un sel par côté.
- **`render.js`** :
  - dans chaque case : aplat → grain de la surface → **lisières reçues** → objet de la tuile ;
  - la lisière est ancrée au centre de sa case et tamponnée (la rotation entre dans la clé) ;
  - la table suit le calque : un défilement exige la **même** table ; son défaut est une Map unique, pas une Map neuve à chaque frame.
- **`defilement.js#rayonInfluence`** compte les boîtes des lisières (`visuelsLisieres`). Elles tiennent dans leur case, donc le rayon ne change pas (1, les arbres). Un bord qui déborderait l'agrandirait tout seul.
- **`main.js`** construit la table avec la table des grains, et la refait au changement de preset.

**Écarts à la lettre de la spec** (§4.2, amendée dans la spec) :
- la lisière se dessine chez la case qui la **reçoit** : le « plus 1 si une lisière existe » du rayon devient le débordement de ses boîtes, soit 0 ;
- `lisieresCase` reçoit la table en cinquième argument ;
- un coin n'est posé que si aucun des deux côtés qui le touchent n'est dominé.

## 2. La forme (`Q-131`)

**Bord dentelé à fondu court.** Le dessin est écrit pour le côté nord, ancré au centre de la case :
- une langue d'herbe (`#5a9147`, l'aplat de l'herbe) de 2 à 5 px, qui ondule sans période visible ;
- huit touffes fines et penchées, jusqu'à 7,6 px ;
- deux pas d'ombre brune (8 % chacun) sous le contour ;
- six brins en triangles pleins.

La profondeur est la même aux deux bouts (3,9 px), pour que deux cases voisines, miroir ou pas, se raccordent.

Le **coin intérieur** est un quart d'arrondi de même rayon aux bouts, avec une touffe à 45°.

**Une première version a été écartée à la capture**, avant tout commit. Ses bosses régulières, cerclées d'ombre, se lisaient comme une dentelle de festons. Les touffes fines sur une base qui ondule se lisent comme de l'herbe.

**Ce qu'il faut savoir pour `V-145`** : le chemin de la Maison est **une bande droite** de trois cases (rangées 56 à 58), sans angle rentrant ni croisement. Seuls ses deux bouts font un angle saillant. Pour juger le coin intérieur, j'ai ajouté un escalier au chemin **dans une copie locale**, le temps d'une capture ; `scenes.json` est restauré. Le coin s'y raccorde aux bords sans marche, mais **l'escalier de 32 px reste lisible** : une lisière adoucit la couture, elle ne déplace pas la grille. C'est la question du §8 de la spec, et elle revient à Xav.

Captures (non versionnées) : `node tools/capture_chrome.mjs tools/scenarios/lisieres.mjs`. Le scénario prend le milieu du chemin, ses deux bouts et l'arbre posé dessus, en plein écran puis à la loupe. `RPG_QUALITE` choisit le preset.

## 3. Les preuves

- **`tests/test_lisieres_2026-09-24.js`** :
  - le catalogue : l'herbe domine le chemin ;
  - un bord par côté, dans l'ordre ;
  - le coin par diagonale seule : escalier, croisement, et aucun coin quand les bords couvrent l'angle ;
  - même rang ou rang absent : rien ;
  - la surface : l'arbre de la forêt fait déborder l'herbe, l'arbre à récolter reçoit ;
  - le miroir : stable, varié (18 sur 40), dépend de la graine ;
  - neuf entrées fautives refusées avec leur chemin ;
  - les boîtes dans la case, et le rayon ;
  - **l'ordre dans une case** : grain du chemin, puis lisière, puis feuillage de l'arbre, lu sur un faux contexte.
  - **Deux mutations attrapées** : les lisières peintes après l'objet ; un coin posé malgré un côté dominé.
- **`calque_identique.mjs`** (Chrome sans fenêtre, 3 profils × 3 presets), repassé avec les lisières :
  - tampons contre vectoriel : 46 comparaisons dans la tolérance, écart **≤ 3/255** ;
  - défilement contre complet : 27 marches, **≤ 1/255**, au plus **40 pixels** différents, 5 à 9 défilements et **aucune** reconstruction par marche ;
  - soit les chiffres du palier C.
- Suite : **194 fichiers verts**.

## 4. Le coût

Chrome sans fenêtre, 1920 × 1080. L'arbre d'avant (`4d81957`) est servi sur un second port, les exécutions alternent. `cout_calque` court le long du bord nord du chemin, en plein dans les lisières.

Une première série (3 exécutions) a montré **+25 à +50 %** par reconstruction. La cause : `lisieresCase` lisait les huit voisines de **chaque** case, herbe comprise. Remède : **une surface que rien ne peut dominer ne lit aucune voisine** (le plus haut rang d'une surface qui a un bord, calculé une fois par table). Seconde série, 2 exécutions par case :

| Preset | Bridage | Avant (palier C) | Après (palier D) |
|---|---|---|---|
| Bas | ×1 | 0,66-0,72 ms | 0,96-1,03 ms |
| Bas | ×6 | 2,3-3,1 ms | **4,2 ms** |
| Moyen | ×1 | 1,21-1,35 ms | 1,36-1,41 ms |
| Moyen | ×6 | 5,3-6,0 ms | **6,1-6,4 ms** |
| Haut | ×1 | 1,28-1,54 ms | 1,68-1,71 ms |
| Haut | ×6 | 6,9-8,6 ms | 8,4-9,1 ms |

- **Moyen** : +0,6 ms sous ×6 (la première série donnait +1,3 ms avant le raccourci).
- **Bas** : +1,4 ms sous ×6, le raccourci n'y change rien. C'est le prix du **dessin**. L'herbe de Bas n'a pas de grain : une case de bord y passait d'un aplat seul à un aplat plus un tampon. La première reconstruction trame en plus les tampons neufs (quatre rotations × miroir, plus les coins) : c'est le maximum, 8 à 11 ms au lieu de 5 à 6.
- Les **frames > 20 ms** varient trop d'une exécution à l'autre, des deux côtés, pour en conclure quoi que ce soit (Bas après : 0 puis 25 ; Haut avant : 3 puis 26).
- Toutes ces reconstructions restent loin sous celles d'avant le palier B (Moyen ×6 : 38-49 ms).
- Le palier E pose le levier `lisiere` (Bas 0,3) et mesure les presets : c'est là qu'on décidera si Bas garde ce coût.

## 5. Pour Xav

- **`V-145`** : longer le chemin de la Maison, sur ses deux bords et à ses deux bouts, en Bas, Moyen et Haut, et au téléphone. L'escalier se lit-il encore ? La forme (`Q-131`) te va-t-elle : profondeur, touffes, ombre ?
- **`Q-131`** : la forme, retenue et livrée, reste `[OUVERT]` jusqu'à ton verdict.
- **`Q-132`** : appliquée en partie (herbe 3, chemin 1) ; la terre au palier E.
- Le palier suivant est **E** (les autres paires, le levier des presets), dans une session à lui.

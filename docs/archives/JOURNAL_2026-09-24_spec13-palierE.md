---
projet: RPG V2
episode/session: Spec 13, palier E — les lisières, le catalogue et les presets
type: fichier de bord
version: 1.0.0
statut: livré, validé en jeu (V-146, V-147)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier E (24/09)

Demande de Xav : « go palier E ». Branche `carte-lisieres-perf`, pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `014c230` | Ménage | Journal du palier D archivé, INDEX à jour |
| `eff5c8c` | `D-202` — l'ombre | L'ombre sortie du bord, posée sur les côtés de l'écran que la surface nomme (l'herbe : E, S, O) |
| (ce commit) | `D-203` — palier E | Le levier `lisiere` (Bas 0,3), aucune autre paire (`Q-151`), le coût dans les trois presets |

## 1. L'ombre des lisières (`D-202`), avant le palier

Le verdict de Xav sur `V-145` : le sud du chemin se lit juste (l'herbe au-dessus du chemin), le nord à l'envers. Capture refaite en début de session : au nord, les deux pas d'ombre brune tombent **sous** les touffes, sur le chemin. Au sud, le même dessin tourné de 180° les met **au-dessus** des touffes. La cause était connue (l'ombre tournait avec le bord). Le remède n'était pas choisi.

**Retenu** : l'ombre devient un dessin à part, avec la liste des côtés de l'écran où elle se pose. L'herbe la garde à l'est, au sud et à l'ouest, et la perd au nord. C'est le seul changement à l'image : le sud et les deux bouts ne bougent pas, puisque Xav ne les a pas contestés. `[OUVERT]` jusqu'à `V-146`. Si le nord sans ombre ne suffit pas, ou si les bouts se lisent mal, la réponse est une liste dans `tiles.json`, sans code.

La piste « l'ombre seulement là où elle tombe vers le bas », notée à l'ouverture de `D-202`, aurait gardé **le nord** et retiré le sud : l'inverse du verdict. Écartée.

Toutes les ombres d'une case passent **avant** tous ses bords : à un angle saillant (deux côtés dominés), l'ombre d'un côté ne couvre plus les touffes de l'autre.

## 2. Le palier E (`D-203`)

**Les autres paires : aucune.** La spec prévoyait « l'herbe sur la terre du Jardin ». En ouvrant le palier, j'ai compté les surfaces qui se touchent dans la Maison : herbe/chemin, et des bords de mur, de parquet et de porte, sans rang par décision (`Q-132`). **`tile_terre` n'est posée nulle part** : le Jardin est une zone de pelouse. Déclarer son rang aurait exigé deux dessins qu'on ne peut pas voir en jeu, donc pas valider. Laissé à la première carte qui posera de la terre, en données seules : `Q-151`.

**Le levier `lisiere`** (`graphismes.json`) : Bas 0,3, Moyen et Haut 1 (`Q-133`, validé par Xav le 24/09 avec la spec).
- `main.js#construireTableLisieres` passe chaque dessin de lisière par `appliquerGrainSol`, la coupe du grain, ombre comprise. `lisieres.js` et `render.js` ne savent toujours pas qu'un preset existe.
- En Bas : le bord garde **2 primitives sur 7** (le contour dentelé et une touffe), le coin et chaque ombre **1 sur 2**. Capture en Bas : le contour suffit à casser la ligne droite, les brins fins disparaissent.
- Les **rangs** ne bougent pas : un preset allège un dessin, il ne change pas qui déborde sur qui.

**Les preuves**
- `tests/test_levier_lisiere_2026-09-24.js`, sur la vraie table de l'orchestrateur :
  - Moyen rend le catalogue tel quel ;
  - Bas en garde un préfixe, jamais vide ;
  - Haut n'en dessine jamais moins que Moyen ;
  - les rangs et les **poses** (298 cases de la Maison) sont les mêmes dans les trois presets ;
  - §4.1 : à 1 px du bord logique, sous l'herbe, le chemin reste praticable, dans les trois presets.
  - Mutation attrapée : le levier ignoré.
- `test_d112` (l'invariant « un preset ne change jamais le jeu », 600 frames sur la vraie Maison) joue déjà les trois presets : le nouveau levier y entre sans une ligne de plus.
- `calque_identique.mjs`, 3 profils × 3 presets : tampons ≤ 3/255, défilement ≤ 1/255 sur au plus 40 pixels, aucune reconstruction pendant les marches. Les chiffres du palier D.
- Suite : **195 fichiers verts**.

## 3. Le coût

Chrome sans fenêtre, 1920 × 1080, `cout_calque`. Le palier D (`2a13284`) est servi sur le port 8081, ce palier (avec `D-202`) sur 8080. Exécutions alternées, 2 par case. Coût moyen d'une reconstruction :

| Preset | Bridage | Palier D | Palier E (+ `D-202`) |
|---|---|---|---|
| Bas | ×1 | 0,85-0,91 ms | 0,81-0,92 ms |
| Bas | ×6 | 3,6-4,0 ms | 4,0 ms |
| Moyen | ×1 | 1,29-1,36 ms | 1,50-1,55 ms |
| Moyen | ×6 | 5,9-6,0 ms | **6,6-6,7 ms** |
| Haut | ×1 | 1,55-1,86 ms | 1,54-1,66 ms |
| Haut | ×6 | 7,9-8,0 ms | 7,6-7,8 ms |

- **Bas ne gagne rien**, et c'est la leçon du palier. Un tampon est tramé une fois, puis chaque case le **pose**. Retirer des primitives à un dessin tamponné ne change donc presque rien au coût d'une reconstruction. En Bas, le levier règle l'**image** (`Q-133`), pas la dépense. Si Bas doit un jour regagner les 1,4 ms que les lisières lui ont coûtées au palier D, le levier à régler est le **nombre de poses**, pas leur contenu.
- **Moyen : +0,7 ms sous ×6.** C'est `D-202` : l'ombre est une pose à part, donc une case de bord en pose deux au lieu d'une. Haut ne le montre pas, son écart reste dans le bruit des deux exécutions.
- Les **frames > 20 ms** restent du bruit (0 à 5 sur 600, des deux côtés).
- Tout reste loin sous les 38-49 ms d'avant le palier B.
- Si le palier F veut récupérer ces 0,7 ms, il peut tamponner le bord et son ombre ensemble, un tampon par rotation. Ce n'est pas fait ici : l'image n'est pas encore validée.

## 4. Pour Xav

- **`V-146`** (l'ombre, `D-202`) : l'herbe se lit-elle au-dessus du chemin, au nord comme au sud ? Aux deux bouts, l'ombre est restée à l'est et à l'ouest.
- **`V-147`** (le palier E) : le chemin en **Bas**, le contour seul suffit-il ?
- **`Q-151`** : de la terre quelque part dans la Maison, ou on attend le jardinage ?
- Le palier suivant est **F** (le budget de la carte, pour l'Annexe 1), dans une session à lui.

## 5. Validation et clôture (24/09)

**`V-146` et `V-147` validées par Xav** : « V-146 V-147 good ». L'ombre sur les côtés E, S, O et le levier `lisiere` (Bas 0,3) sont gardés. `Q-151` (la terre) reste ouverte.

Session close avant le palier F, à la demande de Xav.

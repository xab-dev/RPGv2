---
projet: RPG V2
episode/session: Spec 13, palier B — les tampons
type: fichier de bord
version: 1.0.0
statut: livré, validation en jeu à faire (V-143)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier B (24/09)

Demande de Xav : « go spec 13 palier B ». Un palier, rien d'autre. Branche
`carte-lisieres-perf`, pas de push.

**Identifiants** : le palier traite `D-153` (clos). La `V-133` de la spec devient
**`V-143`** (décalage déjà dit au palier A). `Q-135` est ouverte au suivi, avec
la tolérance mesurée.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `f7fc990` | Ménage | Journal du palier A archivé, INDEX à jour |
| (ce commit) | `D-153` — palier B | Tampons des dessins de tuile, un seul canvas de calque, `calque_identique.mjs` |

## 1. Ce qui a été construit

- **`src/tampons.js`** (pur) : `cleTampon` (id du visuel, nombre de primitives
  — c'est la fraction de grain, puisque `appliquerGrainSol` garde les
  premières —, miroir, rotation, échelle), `boiteDessin` (tout ce que
  `dessinerVisuel` peint : primitives tournées, traits avec leur pointe de
  jointure, **ombre portée** — que l'empreinte de collision ignore), `boiteTampon`
  (taille et ancre en pixels physiques **entiers**, un pixel d'antialias de
  marge), `creerCacheTampons`.
- **`render.js`** : `dessinerVisuelDeTuile` pose le tampon (`poserTampon`, sous
  repère identité le temps du `drawImage`, transform du calque remise en
  sortie) au lieu de rejouer les primitives. Le **décor reste vectoriel**
  (§4.4). Un **seul canvas de calque**, effacé ou redimensionné. Le cache est
  vidé par `invaliderCoucheStatique` (preset) et au changement d'échelle.
  `definirTamponsActifs` et `lireCoucheStatique` n'existent que pour les
  instruments.
- **`tools/scenarios/calque_identique.mjs`** : importe `render.js` dans la page
  (le même module que le jeu), bâtit le calque vectoriel puis tamponné au même
  endroit, compare au pixel. Cinq vues (Maison et chemin, arbres récoltables et
  rochers, forêt, herbe et chemin, Grotte salle 1) × trois presets × les trois
  profils de `commun.mjs` (703 × 280 : échelle 1 ; 1920 × 1080 et
  `telephone` DPR 3 : échelle 4).
- **`tests/test_tampons_2026-09-24.js`** : aucun dessin de tuile du vrai
  catalogue (entier et allégé à 0,3) ne déborde de son tampon, aux échelles 1 à
  6, avec et sans miroir. Prouvé en faisant dessiner le **vrai**
  `dessinerVisuel` sur un faux contexte qui suit la transform. Vérifié par
  mutation : sans l'ombre dans la boîte, le test tombe sur `visuel_arbre`. Plus
  la clé, le cache, et le branchement dans `render.js` (structurel). Suite :
  192 fichiers verts.
- Le champ **`rotation`** de la clé et de la boîte est là pour les
  lisières (palier D) ; aucun dessin de tuile n'est tourné aujourd'hui.

## 2. L'image : `calque_identique.mjs`

| Profil (échelle) | Bas | Moyen | Haut |
|---|---|---|---|
| 703 × 280 (1) | 1,3-2,4 % des pixels, écart max 1-2 | 11-13 %, écart max **3** | 11-13 %, écart max 3 |
| 1920 × 1080 (4) | 0,3-0,6 %, écart max 2 | 2,7-3,2 %, écart max 2 | 2,7-3,2 %, écart max 2 |
| `telephone` DPR 3 (4) | idem 1920 × 1080 | idem | idem |
| Grotte, toutes échelles | **0 pixel** | 1-3,5 %, écart max 1-2 | idem |

**Aucun pixel ne diffère de plus de 3 niveaux sur 255.** Cause : un tampon garde
ses pixels semi-transparents en 8 bits prémultipliés, puis se compose sur
l'aplat ; le dessin direct composait chaque primitive sur l'aplat opaque. Deux
arrondis au lieu d'un, sur presque tout le grain (qui est fait de primitives à
`alpha`). La Grotte en Bas, dont le grain restant est opaque, est identique au
pixel : c'est la contre-épreuve. **Tolérance retenue (`Q-135`) : écart ≤ 3 par
canal.** Un trait décalé d'un pixel ou une ombre rognée au bord d'un tampon
ferait des dizaines de niveaux.

Le profil `telephone` (2340 × 1080 physiques) tombe à l'échelle 4, comme
1920 × 1080 : ses chiffres sont les mêmes. L'échelle 1 est couverte par le profil
703 × 280.

## 3. Le coût : avant et après, côte à côte

Chrome sans fenêtre, 1920 × 1080, **l'arbre d'avant (`f7fc990`) servi sur un
second port**, exécutions alternées avant/après, même machine, même heure. Trois
exécutions par case pour `cout_calque`, deux pour `traversee_nuit`.

### `cout_calque.mjs` — reconstruction moyenne (max), frames > 20 ms sur 600

| Preset | Bridage | Avant | Après |
|---|---|---|---|
| Bas | ×1 | 1,16-1,29 ms (2,0) · 0 | **0,69-0,78 ms** (2,5) · 0 |
| Bas | ×6 | 8,6-8,9 ms (25,0) · 0-1 | **4,1-4,3 ms** (9,2) · 0 |
| Moyen | ×1 | 5,2-5,5 ms (8,0) · 0 | **1,3-1,5 ms** (6,2) · 0 |
| Moyen | ×6 | 38-49 ms (**72**) · 8-9 | **8,5-9,3 ms** (**18,6**) · 3-4 |
| Haut | ×1 | 5,4-6,4 ms (8,8) · 0 | **1,5-1,9 ms** (7,0) · 0 |
| Haut | ×6 | 42-45 ms (68) · 8-9 | **9,1-9,8 ms** (17,4) · 2-3 |

La reconstruction coûte **4 à 5 fois moins** en Moyen et Haut. Le maximum
(première reconstruction, qui remplit le cache) reste plus haut que la moyenne :
c'est le seul moment où les tampons se tramment.

### `traversee_nuit.mjs` — ×6, nuit, 12 rôdeurs, ~110 reconstructions

| Preset | Côté | Reconstruction moy / max | Frames > 20 ms (instrument) | Intervalles > 20 ms (page) | `dessiner()` |
|---|---|---|---|---|---|
| Bas | avant | 3,5-3,7 / 5,2 ms | 6-11 | 2 | 9,0-9,6 |
| Bas | après | **1,8 / 3,6 ms** | 1 | 2 | 9,4-9,6 |
| Moyen | avant | 44,0-44,4 / 58,5 ms | 122-125 | **114-118** | 11,1-11,2 |
| Moyen | après | **5,6-6,0 / 11,9 ms** | 9-13 | **2** | 9,1-9,8 |
| Haut | avant | 46-57 / 96 ms | 152-173 | 143-207 | 12,3-14,1 |
| Haut | après | **10,2-10,4 / 23,6 ms** | 159-160 | **52-54** | 12,2-12,4 |

**En Moyen sous ×6, les frames sautées du calque ont disparu** (114-118 → 2).
**En Haut**, les intervalles lents de la page tombent de 143-207 à 52-54, mais
les frames > 20 ms de l'instrument ne bougent pas : sous ×6, une frame de Haut
coûte déjà ~20 ms **hors calque** (`dessiner()` 12 ms, plus `maj()`, les
ornements, le décor dense). Ce n'est plus le calque, et ce n'est pas l'objet du
palier. Le palier C (bande entrante) vise ce qui reste du calque.

Les chiffres absolus ne se comparent pas à ceux du palier A (autre heure, la
machine a varié : Bas ×6 donnait 41-57 frames lentes au palier A, 6-11 ce soir
pour le même code) : seule la comparaison **avant/après du même soir** vaut.

## 4. Relevé hors ticket

- `D-200` (autosave sur l'objet vivant) reste reproduit sous ×6, **des deux
  côtés** : les tampons n'y sont pour rien.

## 5. Pour Xav

- **`V-143`** : traverser la carte de jour et de nuit en Bas, Moyen et Haut ;
  rien ne doit avoir changé à l'image (bord et ombre des arbres, grain, au
  téléphone aussi). Sous `?debug=fps` en Moyen, les reconstructions doivent
  passer de ~4,7 ms (`R-22`) à ~1,5 ms.
- **`Q-135`** : la tolérance de 3 niveaux sur 255, à confirmer.
- Le palier suivant est **C** (la bande entrante), dans une session à lui.

---
projet: RPG V2
episode/session: Spec 13, palier A — mesurer avant de toucher
type: fichier de bord
version: 1.0.0
statut: livré, session close par Xav
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier A (24/09)

Demande de Xav : « lis specs/13_lisieres-performance-carte.md en entier puis,
procède ». Un palier par session : celle-ci fait le **palier A**, et rien d'autre.
Branche `carte-lisieres-perf`, pas de push.

**Identifiants décalés** (la spec le prévoit : « un identifiant déjà pris → le
suivant ») : `D-189` à `D-198` ont été pris le 24/09 (flaques, plume, torche).
Le palier A ouvre donc **`D-199`**. Les `V-` de la spec (`V-133` à `V-136`)
deviendront **`V-143` à `V-146`**. `Q-131` à `Q-135` et `R-22` à `R-25` sont
libres : ils gardent leur numéro.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `9f07a89` | Ménage | Journal du 24/09 (polish libre, torche) archivé, INDEX à jour |
| (ce commit) | `D-199` — palier A | Deux instruments, les relevés de référence, la réponse du §4.6. Aucune ligne de **jeu** modifiée (seulement l'instrument `?debug=fps`) |

## 1. Ce qui a été construit

- **`tools/scenarios/traversee_nuit.mjs`** : Nv.10, début de nuit, les deux
  zones de Chaos remplies jusqu'au plafond (12 rôdeurs, vérifié à chaque
  fenêtre), puis une boucle fixe de 220 tuiles (74 s) qui passe au milieu des
  deux zones. Il compte ses propres frames (un `requestAnimationFrame` à lui)
  et copie le relevé `?debug=fps` toutes les 600 frames, donc les fenêtres sont
  **disjointes** et s'additionnent. `RPG_PHASE=jour` refait la même boucle en
  plein jour, et `RPG_NIVEAU=1` la même nuit **sans Chaos** (témoins, §3).
- **`tools/capture_chrome.mjs`** : `chrome.enfoncer` et `chrome.relacher`, parce
  que `touche` attend encore après le relâchement, et qu'une marche faite de
  `touche` successives s'arrête la moitié du temps.
- **Entrée en scène chiffrée** (`?debug=fps` seulement) : `main.js#entrerDansScene`
  mesure trois temps (chargement de la scène, décor, reste). Le moniteur les
  garde (`surEntreeScene`), et le relevé gagne une ligne
  `entrée en scène : …`. Hors `?debug=fps`, aucune horloge n'est lue. Test :
  `test_mesure_saccades`. Suite : 191 fichiers verts.

## 2. Relevés de référence de la branche

Chrome sans fenêtre, 1920 × 1080 DPR 1, **même machine, même soir, en série**.
Trois exécutions par case, et toutes les valeurs de chaque case sont données.
Ces chiffres se comparent **entre eux seulement** (règle des relevés) ; ce ne
sont pas des `R-`.

### `cout_calque.mjs` (jour, herbe → chemin, ~10 s, 7-8 reconstructions)

| Preset | Bridage | Reconstruction moy (ms) | Max (ms) | Frames > 20 ms |
|---|---|---|---|---|
| Bas | ×1 | 1,30 · 1,17 · 1,18 | 2,2 | 0/600 ×3 |
| Bas | ×6 | 8,56 · 8,78 · 9,34 | 24,9 | 10 · 2 · 3 /600 |
| Moyen | ×1 | 6,05 · 5,74 · 5,38 | 8,0 | 0/600 ×3 |
| Moyen | ×6 | 43,4 · 46,7 · 45,0 | **77,1** | 8/600 ×3 |
| Haut | ×1 | 6,20 · 6,20 · 6,16 | 9,7 | 0/600 ×3 |
| Haut | ×6 | 55,0 · 54,0 · 56,3 | **80,8** | 8 · 8 · 9 /600 |

### `traversee_nuit.mjs` (nuit, 12 rôdeurs, 74 s, ~110 reconstructions, ~4 000-4 440 frames)

| Preset | Bridage | Reconstruction moy / max (ms) | Frames > 20 ms (instrument) | Intervalles > 20 ms (page) | `maj()` moy | `dessiner()` moy |
|---|---|---|---|---|---|---|
| Bas | ×1 | 0,64 / 1,3 | 0 ×3 | 1 ×3 | 0,17 | 1,45 |
| Bas | ×6 | 3,86 / 7,5 | 57 · 41 · 48 | 26 · 16 · 19 | 1,10 | 11,1 |
| Moyen | ×1 | 5,69 / 9,2 | 0 ×3 | 1 ×3 | 0,17 | 1,55 |
| Moyen | ×6 | 52,6 / 77,5 | 170 · 173 · 151 (≈ 4 %) | 175 · 171 · 187 | 1,27 | 13,5 |
| Haut | ×1 | 6,05 / 9,4 | 0 ×3 | 1 ×3 | 0,21 | 1,66 |
| Haut | ×6 | 56,4 / 75,3 | 166 · 157 · 137 | 221 · 184 · 152 | 1,20 | 13,9 |

### Témoins : la même boucle de jour, et la même nuit sans monstres

| Cas | Bridage | Reconstruction moy | Frames > 20 ms | `maj()` | `dessiner()` |
|---|---|---|---|---|---|
| Jour, Bas | ×1 / ×6 | 0,76 / 4,07 | 0 / 3 · 4 · 13 | 0,11 / 0,80 | 1,16 / 8,3 |
| Jour, Moyen | ×1 / ×6 | 5,52 / 48,4 | 0 / 118 · 125 · 122 | 0,12 / 0,85 | 1,30 / 10,35 |
| Jour, Haut | ×1 / ×6 | 5,64 / 50,3 | 0 / 134 · 125 · 132 | 0,12 / 0,86 | 1,28 / 10,8 |
| **Nuit Nv.1** (voile, aucun monstre), Moyen | ×1 / ×6 | 5,20 / 48,6 | 0 / 121 · 120 · 116 | 0,13 / 0,93 | 1,27 / 10,5 |

### Entrée en scène (Maison extérieur, au chargement, **non bridée** : le bridage est posé après)

**16 à 24 ms** sur 54 chargements : scène 2,5-3,8 ms, décor 2,2-2,9 ms (Bas, Moyen)
et 3,9-4,9 ms (Haut, densité ×10), **reste 11-16 ms**. Le poste le plus lourd
est donc le « reste », c'est-à-dire le parcours des tuiles atteignables, le
remplissage des objets au sol et les événements d'entrée, **pas** le décor. La
première reconstruction du calque n'est pas comptée dedans (elle a lieu à la
première frame). Base de `Q-134` au palier F (défaut validé : 2 × la valeur PC
en Moyen, soit ~40 ms).

## 3. La question du §4.6, par des chiffres

**Sur PC (×1), rien n'est un coût** : 0 frame > 20 ms partout, `maj()` sous
0,25 ms, `dessiner()` sous 1,7 ms, de jour comme dans la nuit la plus chargée.

**Sous ×6, le calque domine.** De jour, les frames lentes (118-134) suivent les
reconstructions (~110 sur la boucle) : le palier C les vise directement. En
Bas, une reconstruction coûte 12 fois moins (4 ms contre 48-56) : c'est **le
grain** qui fait le coût (`D-153`), et c'est ce que tamponne le palier B.

**Les entités sont un coût réel, mais second.** Le témoin Nv.1 sépare le voile
des monstres : une nuit sans monstres coûte **comme le jour** (`dessiner()` 10,5
contre 10,35 ms, 116-121 frames lentes contre 118-125). Ce que la nuit chargée
ajoute (+3 ms de `dessiner()`, +0,35 ms de `maj()`, +30 à +50 frames lentes sur
4 000) est donc dû aux **12 rôdeurs** et à ce qui les accompagne : barres de PV,
combat, signal des zones. Cela fait ~0,25 ms de `dessiner()` par monstre sous
×6, et ~0,03 ms sur PC.

**Verdict pour le palier F** :
- **dessin : le tri par la fenêtre est justifié.** Le coût suit le nombre total
  de monstres de la scène, pas ceux de l'écran, et l'Annexe 1 en ajoute (le
  budget du §4.6 l'interdit). Ce qu'il fera gagner dépend de la part des
  monstres hors écran, que ce banc ne mesure pas : le palier F la mesurera en
  premier ;
- **`maj()` : pas de mise en veille aujourd'hui.** +0,35 ms pour 12 monstres
  sous ×6 reste sous le bruit du calque. À re-mesurer avec la zone de l'Annexe
  (règle de l'Annexe, palier F point 4).

## 4. Relevé hors ticket

- **`D-200` ouvert** : sous ×6, **toutes** les traversées de nuit (et aucune de
  jour) journalisent `relecture de save_next invalide, promotion vers
  save_current annulée`. Cause lue dans le code : `main.js#autosaveSiNecessaire`
  passe l'objet `save` **vivant** à `save.js#sauvegarder`, qui écrit dans
  IndexedDB puis compare la relecture à ce même objet. Entre les deux `await`,
  une frame de jeu a le temps de modifier `save` (heure, position), donc la
  comparaison échoue et `save_current` n'est pas mis à jour. Sur un appareil
  lent, en plein combat, l'autosave peut ne jamais aboutir. **Pas corrigé**
  (hors périmètre, et c'est la sauvegarde) : remède probable, sérialiser une
  copie avant d'écrire.

## 5. Pour Xav

- **À relever à la main** (Chrome, F11, manette, protocole du §6 du suivi) :
  `R-22` (jour) et `R-23` (nuit, **Nv.10+**, les deux zones de Chaos pleines,
  en traversant le Champ nord puis le Champ sud). Ils servent de base à toute
  l'Annexe 1.
- Le palier suivant est **B** (les tampons, `D-153`), dans une session à lui.

## 6. Relevés de Xav et clôture (24/09)

`R-22` (jour) et `R-23` (nuit, 12 monstres), consignés au §6 du suivi. PC de
Xav, Chrome, manette : **59,9 fps, 0 frame > 20 ms dans les deux cas**.
`dessiner()` 1,13 → 1,35 ms, `maj()` 0,10 → 0,14 ms : les 12 rôdeurs ne coûtent
rien sur PC, ce que disait le banc sans bridage. Reconstruction du calque
4,0-4,7 ms (max 6,3). Entrée en scène à la main : **14,1-14,3 ms**, dont
10,3-10,5 ms hors scène et décor. Ce sont les chiffres de base de toute
l'Annexe 1.

**Clôture (24/09, Xav)** : « je vais clore la session avant de passer au
palier B ». Branche `carte-lisieres-perf` non poussée.

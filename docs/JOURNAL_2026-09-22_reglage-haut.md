---
projet: RPG V2
episode/session: Réglage Haut — une couche de plus que Moyen (grain, particules, animations)
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-22
genere_par: claude
verifie_par: xav
---

# Fichier de bord : le réglage Haut (22/09, nuit)

Consigne de Xav : « Q-58 et D-133 : tout ce qui touche aux animations, grain, particules
(réglage Haut), on ne réinvente pas tout, mais tu peux en rajouter une couche pour que l'on
voie la différence avec le réglage moyen. » La forêt, les monstres et la Grotte restent hors
périmètre (consigne de la session précédente). Pas de `push` sans son go.

Outil : `tools/scenarios/haut_moyen.mjs`, qui prend chaque poste (parquet, pelouse, marche,
nuit) sous Moyen **puis** sous Haut, forcés par `?qualite=`. Captures :
`docs/captures/haut-2026-09-22/`.

## Diagnostic

- **Haut = Moyen + `particules: 2`, et rien d'autre** (`data/graphismes.json`). Ce levier
  double la **réserve** des traînées. Or une réserve qui n'était pas pleine ne dessine rien de
  plus quand on la double : l'intervalle d'émission, lui, n'a pas bougé. D'où le « pas de
  différence notable » de Xav (`D-116`).
- **`densite_decor` ne pouvait pas monter** : le décor ne savait pas sur quelle surface il
  pousse (`D-106`). Le multiplier aurait semé de l'herbe dans le salon.
- **`D-133` est `D-106`**, et rien d'autre. La touffe, la flaque et le caillou vus sur le
  parquet sont du **décor** (`visuel_herbe`, `visuel_flaque`, `visuel_rocher_petit`). Les
  objets ramassables excluent déjà la zone `maison`, donc l'hypothèse `tirerPositionLibre`
  tombe.
- **`Q-58`** (ornements du follet, halos) : ces deux leviers n'ont jamais été livrés. Aucun
  effet n'était réservé à Haut, et rien dans les données ne permettait de le dire.

## Commits

| Commit | Ticket | Ce qui change |
|---|---|---|
| `0d571a0` | `D-106`, `D-133` | `sur` sur un motif de décor ; rejet sans re-tirage (préfixe `D-114` intact) ; plus rien sur le parquet |
| `311c1aa` | `D-116` (1/3) | Haut : `densite_decor` 1 → **10** (le « ×10 » de `Q-53`), ~25 à 30 motifs par écran au lieu de 3 ou 4. Essais : ×5 ne se voyait pas, ×12 n'apportait rien de plus que ×10. Coût mesuré en marchant (`cout_calque.mjs`) : reconstruction moyenne **4,28 → 4,91 ms**, pic 5,8 → 7,0 ms, **0 frame > 20 ms** dans les deux cas. Réserve : un quart des motifs sont des cailloux gris, ce sont eux qui se voient le plus |
| `6494368` | `D-116` (2/3) | Le levier `particules`, au-dessus de 1, **densifie** : intervalle d'émission ÷ m, durée de vie × √m, réserve × m√m. Avant : Haut rendait Moyen **au pixel près** en marche (capture `avant_marche_*` : 2 bouffées dans les deux). Après : 5 à 6 bouffées, traînée plus longue (`apres_marche_haut`). Moyen reste le catalogue au champ près (test `D-112` §1), et le test exige désormais que Haut montre **strictement plus** de bouffées que Moyen |
| `4116a0b` | `D-134` (`Q-58`) | 4ᵉ levier `ornements` (0 / 1 / 2) ; deux effets à `ornement_min: 2` : trois étincelles en orbite autour du follet (devant puis derrière lui), halo qui respire (±35 %, teinte seule, jamais le trou dans le voile). Moyen au pixel près. Captures `apres_pelouse_*`, `apres_nuit_*` |

## Ce qui reste à Xav

- **`V-75`** : Moyen ↔ Haut au même endroit, pelouse, marche, follet (de jour et de nuit).
- **`Q-58`** : les ornements existent, sous le seuil `ornement_min: 2`. À toi de dire si c'est
  la bonne réponse à la question et de la clore.
- Hors périmètre, non touché : la forêt (`D-110`), les lisières (`Q-52`), la Grotte. Haut n'a
  **pas** été mesuré sous bridage CPU : Auto ne choisit jamais Haut, c'est un choix du joueur
  sur une machine qui s'ennuie (`specs/09` §5).

## Suite : verdicts de Xav et petits tickets (22/09, nuit)

« V-75: good, mais "champ de cailloux", surtout ceux sur le chemin » · « Q-58 : oui, j'aime ! » ·
« D-06: non, pas d'indicateur » · « D-07: non, réalisme […] Par contre, on enlève le texte affiché
dans les cases d'inventaire » · « D-08 : go ».

| Commit | Ticket | Ce qui change |
|---|---|---|
| `93e283f` | `D-07` | Poche et Coffre : cases sans nom (image + quantité), nom dans la fiche et en `aria-label`. Captures `docs/captures/inventaire-2026-09-22/` |
| `6c61523` | `D-135` | Cailloux de décor sur l'herbe seulement : plus rien sur le chemin (`apres_chemin_haut`) |
| `6c0672c` | `D-08` | Poche : « Manger » (A) mange cet objet par le chemin de CONSUME ; « Équiper » passe en seconde action (X / touche 1). `Q-72` ouverte sur le choix des gestes. Captures `inventaire-2026-09-22/d08_*` |

Verdicts consignés : `V-75` validée (réserve → `D-135`), `Q-58` tranchée (« oui, j'aime ! »),
`D-06` close par décision (pas d'indicateur jour/nuit). À Xav : `V-76`, `Q-72`.

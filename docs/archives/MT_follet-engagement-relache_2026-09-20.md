---
projet: RPG V2
episode/session: Polish — follet, règle d'engagement
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-20
Ids_suivi: [D-37 (le reste : la règle d'engagement — clôt la ligne), V-34 (proposé), Q-26, Q-29]
genere_par: claude
verifie_par: —
---

# MT — Le follet engage par l'orbite ou l'aura, relâche avec une marge, et ne se téléporte jamais

**Priorité : P2.** **À faire après `MT_synergies-aura-reelle`** (il en réutilise `resoudreRayonAuraPx` et le
centre logique de l'aura). **Un ticket = un commit.** Ne pas pousser.

## 1. Décisions de Xav (19/09 et 20/09)

- **Engager** : un monstre vivant est **dans la zone d'orbite** (distance héros → monstre ≤ orbite) **OU dans
  l'aura** (distance centre de l'aura → monstre ≤ rayon d'aura). Il n'existe **pas** de distance d'engagement
  distincte : `DISTANCE_ENGAGEMENT_PX = 48` disparaît comme règle.
- **Relâcher** : distance héros → monstre **> orbite + aura + 12 px**. Aujourd'hui 24 + 30 + 12 = **66** ; à 67
  le follet revient. Les 12 px sont **fixes** : une marge anti-détachement (hystérésis), pas une valeur
  appelée à grandir. Orbite et aura, elles, grandiront (`Q-26`, `Q-29`) : la portée suit toute seule.
- **Mouvement fluide, jamais un flash** : à l'aller comme au retour.
- Sur le chemin du retour, le follet **peut engager un autre monstre**.

## 2. Ce que le code fait aujourd'hui (lu dans `companion.js`)

- Engage et relâche au **même** seuil de 48 px, mesuré du héros : aucune marge, donc risque d'oscillation au bord.
- **En `engager`, la position est copiée sur le monstre d'un coup** (`x: cible.x, y: cible.y`) : c'est une
  téléportation, jusqu'à ~70 px en une frame. Seul le retour en orbite est amorti (`ORBITE_LERP`).

## 3. Attendu

1. `mettreAJourEtat` applique la règle du §1. Tout passe par les fonctions de résolution
   (`resoudreOrbiteRayonPx`, `resoudreRayonAuraPx`) ; la marge est une constante nommée
   (`MARGE_RELACHE_PX = 12`), commentée *pourquoi elle est fixe*.
2. **Garde-fou anti ping-pong** (non dit par Xav, nécessaire) : un monstre n'est **engageable** que s'il est
   aussi **en deçà de la distance de relâche**. Sinon un monstre à 70 px, touché par l'aura d'un follet qui
   rentre, serait engagé puis relâché à chaque frame.
3. Plusieurs candidats : **le plus proche du héros**.
4. **L'approche de la cible est amortie**, comme le retour : le follet *vole* vers le monstre, puis le suit.
   Conséquence voulue et cohérente avec le ticket précédent : l'aura arrive avec lui, l'effet commence quand le
   cercle touche le monstre, pas avant.
5. L'indice de commande ATTACK (`specs/04_indices-commandes.md` §3) lisait `DISTANCE_ENGAGEMENT_PX` : il doit
   continuer de se déclencher **au même seuil que l'engagement réel** — une seule source, exportée.
6. Tests (purs) : engage par l'orbite seule · engage par l'aura seule (monstre hors orbite, follet de son côté) ·
   pas d'engagement au-delà de la relâche · relâche à 67, pas à 66 · pas d'oscillation sur un monstre immobile à
   la frontière · la position ne saute jamais de plus de N px par frame · réengagement d'un second monstre
   pendant le retour.

## 4. À signaler sans corriger

`ORBITE_LERP = 0.15` est appliqué **par frame**, pas par seconde : le follet est plus mou à 37 fps (téléphone)
qu'à 60. Si l'approche amortie reprend ce modèle, elle hérite du défaut. Le dire dans le journal, proposer un
identifiant, ne pas élargir le ticket.

## 5. Périmètre

`src/companion.js`, son test, et le seul appelant de `DISTANCE_ENGAGEMENT_PX` hors du module (l'indice ATTACK).
**Ne pas toucher** : `status.js`, `vol_follet.js` (le décalage visuel du corps), les données, le rendu.

## 6. Validation (Xav, manette, en jeu) — `V-34`

Un monstre entre dans le cercle pointillé ou tout près du héros : le follet **vole** vers lui, sans saut ·
reculer : il tient jusqu'à un peu plus loin que le cercle, puis revient en douceur · deux monstres : en
revenant du premier il accroche le second · au bord de la portée, il n'hésite pas.

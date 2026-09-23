---
projet: RPG V2
episode/session: Spec 10, palier B — l'orbite inversée
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 10, palier B (23/09)

Demande de Xav : « V-101: all good […] go B ». Le palier B livre `D-53`
(l'amortissement du follet en temps réel) **puis** l'inversion amortie de
l'orbite quand le régime est négatif. **Zéro synergie** (palier C).

Branche `alignement-2026-09-23` (suite du palier A). Pas de push.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| (1) | Ménage | Journal du palier A archivé, ligne INDEX ; `V-101` close sur le verdict de Xav |
| (2) | Spec 10, palier B | `D-53` puis l'orbite inversée. Suite : **155 fichiers verts** |

## Ce qui a été fait

- **`D-53`** : `companion.js#amortissement(deltaS)`, une seule fonction pour
  l'orbite et l'approche. Le test du palier a été **vu rouge** d'abord sur
  l'ancien code (2,63 px entre 37 et 60 fps), vert après (0,23 px).
- **Inversion** : le follet porte un `facteurOrbite` signé dans `[-1 ; 1]` ;
  `avancerPosition` reçoit `{ sens, dureeInversionMs }` et le fait glisser à
  vitesse constante (800 ms de +1 à -1, `alignement.json`). L'angle s'intègre au
  milieu du pas : pas de saut, et le chemin ne dépend pas du nombre de frames.
- **`main.js#sensOrbiteFollet`** : -1 si le régime est négatif, sinon 1. Relu à
  chaque frame ; aussi passé à `creerFollet` (chargement, entrée de scène, choix
  de l'intro), qui pose le follet déjà dans son sens (`Q-89`).
- Rayon, lumière, aura, engagement, relâche, petite orbite du corps : **pas
  touchés**.

## Écarts et choix, dits

- La petite orbite du corps (`D-39`) ne s'inverse pas : sous régime négatif, la
  rosace devient des boucles → `Q-92`.
- Le renversement n'apparaît **qu'en cours de partie**, et rien ne le déclenche
  encore en jeu (les sources sont la spec 11) : à ce palier, Xav voit le sens
  inversé, pas le geste du renversement. Prouvé par test seulement.
- Deux tests ajustés (`test_phase1_companion`, `test_d54`), raisons dans `D-53`.

## Vérifié sous Chrome (sans fenêtre)

`?debug=fps&alignement=-3` et `-0.5` dans la Maison : 58–60 fps, relevé juste,
aucune erreur console. Le sens de rotation, lui, ne se juge pas en capture.

## Ouvert pour Xav

- `V-102` ; `Q-92`.
- Suite : **palier C** (les régimes de synergie) — la spec dit qu'il ne commence
  pas avant que B soit vu.

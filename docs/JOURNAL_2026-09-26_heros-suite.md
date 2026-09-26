---
projet: RPG V2
episode/session: Le héros, suite de la spec 16 — le pas qui suit la vitesse
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# Fichier de bord : le héros, suite (26/09, matin)

Demande de Xav, au réveil, après la nuit du héros :

> J'ai répondu aux questions avec `npm run dettes`. Je te laisse prendre en
> considération les réponses, puis tu peux continuer la spec du héros.

Ses réponses : `V-182` à `V-190` validés ; sur le pas (`V-190`) : « à voir en
jeu avec les 49 point en agilité on risque de dépasser les 3hz (probablement un
rendement décroissement à mettre en place) » → `D-273`, spec 16 palier D ; sur
la pop-up de réinitialisation (`Q-173` (5)) : « oui pour "Exporter d'abord"
liseret VERT » → `D-274`, hors spec.

Branche : `heros-animation` (depuis `heros-polish`, lui-même depuis
`heros-simplification`, depuis `main`), rien fusionné ni poussé.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `5ebae09` | Ménage | Réponses de Xav consignées, `D-273` et `D-274` ouverts, journal de la nuit archivé |
| `6eb39d5` | DOC | Spec 16 palier D écrit (le pas suit la vitesse, plafonné par la règle des 3 Hz) ; §2.2 le saut sud/nord tranché de fait par `V-188` |
| `9ba17d5` | `D-273` | `poses.js#cadencePas` : une horloge du pas à la cadence, proportionnelle sous la vitesse de référence (95 px/s, Agilité 5), rendement décroissant au-dessus, asymptote à 3 Hz (Agilité 20 → 2,90 Hz, 49 → 2,997). Au banc du tour : le curseur d'Agilité. `V-191` à voir. `[OUVERT]` : la foulée plus ample au-delà du plafond |
| `e751c42` | `D-274` | **Sur la branche `reinit-exporter`, depuis `main`** (correctif hors spec) : « Exporter d'abord » au liseré vert, sous « Non » et « Oui », dans la pop-up de réinitialisation ; elle exporte et la pop-up reste. `V-192` à voir. Sa clôture au suivi est commitée ici, sur `heros-animation` |
| `3fa5ef3` | DOC | `D-261` clos sans code (Xav : « aucun soucis pour le profil de hero ») ; `D-272` : cause trouvée à la relecture (l'objet `save` vivant, modifié pendant l'`await` de l'écriture) |
| `0be4f7b` | DOC | `D-272` en P1 : « une dette technique assez importante avant d'agrandir le catalogue » (Xav) ; pas maintenant, on reste sur le héros |
| `a0a7c79` | DOC | Spec 16 palier E écrit, choisi par Xav : la capuche en retard. La cape ne tourne pas : le regard mène, la coque suit, la pointe traîne |
| `1caed00` | `D-275` | Ressorts amortis en données (`inertie`), bornés en écart, refusés au-delà de 3 Hz ; le test du retard a trouvé un décalage d'un pas interne dans l'intégration (corrigé avant commit). Banc : « capuche en retard » à cocher. `V-193` à voir |
| `ecb8808` | `D-276` | La capuche sautait à 90° et 270° (le dessin d'auteur penché, redressé à −8° que le reflet changeait en +8°). *Révise* `D-254` : dessin symétrique, plis de face et de dos à 0°, côtés recalés (67°, 67,5°), cisaillement de la pointe rabattue retiré. Saut mesuré : 1 300 → 177 px. `V-194` à voir |
| `9f7ac9d` | `D-277` | Harmonisation de la capuche, variantes jugées par Xav au banc du tour (sélecteur temporaire, jamais commité) : G (sommet en ogive, une courbe pour les trois vues de côté) puis H (l'ancien triangle du dos, penché dans le dessin). Tour complet sans saut. `V-195` à voir |
| `e1ef330` | `D-278` | L'œil passe derrière la capuche : `passe_derriere { debut, fondu }`, rideau courbe au bord en fondu (anneaux disjoints), éclat intact ; ouest −3,2, glissement 0,5. Variante D2 choisie au banc. `V-196` à voir |
| `7ba17e5` | `D-279` | La lueur suit l'épaule : clé `source` (éclat = part visible de l'œil ^ 0,74, 28 % à 221°), trajectoire propre vers l'épaule au nord-ouest. Variante L1 choisie au banc. `V-197` à voir |

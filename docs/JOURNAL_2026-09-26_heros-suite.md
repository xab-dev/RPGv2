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

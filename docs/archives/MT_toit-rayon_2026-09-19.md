---
projet: RPG V2
episode/session: Fondations — patch 2
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [D-21]
genere_par: claude
verifie_par: xav
---

# MT — Toit : rayon d'effacement −10 %

**Traite `D-21`. Ne touche à aucune autre ligne du suivi.** Un commit : `D-21 toit : rayon d'effacement -10 %`.

## Intention

Au playtest, le toit s'efface d'un peu trop loin : la maison se « déshabille » avant qu'on y soit. Valeur notée « à équilibrer au ressenti » depuis le 16/09.

## Périmètre de lecture

`src/structures.js` (le calcul d'opacité du toit et sa constante) · le test qui le couvre. Si la valeur vit en données, le fichier de données concerné, et lui seul.

## Changement

Le facteur appliqué au halo passe de **1,25 à 1,125** (−10 %). Un seul endroit, commentaire avec le *pourquoi*, marqué **provisoire**. L'opacité reste **dégressive** (décision verrouillée : jamais un on/off) ; seule la distance change, pas la forme de la courbe.

Mettre à jour **volontairement** le test qui fige l'ancienne valeur, en le disant dans le rapport. Ne pas déplacer la constante ni refondre le calcul.

## Validation en jeu (Xav)

Approcher la maison par l'ouest puis par le sud, de jour et de nuit : le toit commence à s'effacer plus tard, sans saut. Dire « bon » ou donner une autre valeur (rejoint `V-11`).

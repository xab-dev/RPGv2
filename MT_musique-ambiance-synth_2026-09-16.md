# RPG V2 — Micro-Ticket : ambiance sonore provisoire, quelques notes en boucle (2026-09-16)

## Objectif

`assets/audio/piano_solo.mp3` n'est pas encore fourni (pas urgent, décision Xav 2026-09-16). En attendant, le jeu doit avoir **une ambiance continue : quelques notes qui bouclent**, pour que le point 4 du critère de passage (démarrage sur premier geste, coupure/reprise depuis le menu, réglage persisté) soit testable **maintenant**, sans asset. Quand le piano arrivera, il remplace l'ambiance **par une entrée JSON**, sans code.

## Cible

- Fichier : `src/audio.js` — ajouter une source de type `synthese` à côté de la source fichier, derrière la même API `jouerMusique(id)` / `couperMusique()`.
- Fichier : `data/music.json` — une entrée `mus_ambiance_provisoire` de type `synthese`, et la scène/le boot pointent dessus tant que `piano_solo` n'existe pas.
- Fichier : `src/schemas.js` — `music.json` accepte `{ id, type: "fichier" | "synthese", fichier?, notes?, tempo_bpm?, boucle, volume }`.

## Consigne précise

1. **Source synthétisée** : à partir de l'`AudioContext` existant (créé sur premier geste, jamais au boot), jouer une séquence de notes définie **en données** (`notes` : liste de `{ note: "A3", duree_beats: 2 }` ou silence, `tempo_bpm` lent, ex. 50) avec des oscillateurs sinus/triangle, enveloppe attaque/relâchement douce (pas de clic), volume bas (`volume: 0.25`, provisoire). La séquence boucle avec un léger fondu pour ne pas entendre la couture. Quatre à huit notes, ton calme — proposition à mettre en JSON, Xav ajuste : une phrase pentatonique descendante en la mineur, une note toutes les ~2,5 s.
2. **Même contrat** que la source fichier : `jouerMusique("mus_ambiance_provisoire")` démarre, `couperMusique()` arrête proprement (release, pas de coupure sèche), le réglage « Musique : oui/non » du menu et sa persistance s'appliquent sans distinction de type.
3. **Choix de la piste par données** : `music.json` (ou la scène) déclare la piste par défaut ; **si une entrée de type `fichier` est déclarée mais son fichier absent**, repli automatique sur l'entrée de type `synthese` avec avertissement console — le jour où Xav dépose `piano_solo.mp3`, le piano prend le relais **sans toucher au JSON**. Documenter ce repli dans le commentaire *pourquoi*.
4. Aucun accès DOM/`AudioContext` au niveau module (`audio.js` reste importable en Node ; la synthèse vit dans une fonction appelée après le premier geste).

## Contrainte stricte

Ne toucher qu'aux trois fichiers listés (+ `locales` si un libellé de menu change — aucun n'est prévu). Aucun bruitage, aucune seconde piste, aucun mixage. Commentaires en français, *pourquoi* pas *quoi*.

## Test de validation

Automatisé : `node tools/run_tests.js` vert ; `node --check src/audio.js` ; test headless de `music.json` : entrée `synthese` valide, entrée `fichier` sans fichier → repli résolu vers l'id `synthese` (résolution pure, sans AudioContext).

Manuel (Xav, navigateur, manette) : silence total au boot ; premier bouton → l'ambiance démarre, boucle sans clic audible ; menu « Musique : non » → s'arrête en douceur ; « oui » → reprend ; recharger la page → le réglage est conservé ; laisser tourner 5 min → pas de dérive, pas d'accumulation de sources (mémoire stable). Verdict Xav sur les notes et le volume.

## Hors scope

Le piano lui-même (asset Xav), bruitages, musique par scène (grotte ≠ maison — une entrée JSON par scène le jour venu), fondu enchaîné entre pistes.

---
projet: RPG V2
episode/session: Fondations — patch 1
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [D-22]
genere_par: claude
verifie_par: xav
---

# MT — Clavier : E = interagir, F = consommer

**Traite `D-22`. Ne touche à aucune autre ligne du suivi.** Un commit : `D-22 clavier : E = INTERACT, F = CONSUME`.

## Intention

Retour de playtest : la main gauche, posée sur les touches de déplacement, tombe naturellement sur `E` pour l'action la plus fréquente (interagir, récolter, ramasser). `F` prend l'action plus rare (se nourrir, utiliser le fruit équipé).

## Périmètre de lecture (rien d'autre)

`src/input/keyboard.js` · `src/input/input.js` (seulement si le mapping y vit) · `data/glyphes.json` · `data/hints.json` · les tests qui nomment une touche clavier. Dans `locales/`, une recherche ciblée des libellés de touches, pas une lecture complète.

## Étapes

1. **Lecture d'abord.** Écrire en tête de rapport la table complète touche → verbe du clavier. Si `F` ou `E` porte aujourd'hui **un autre verbe** que `INTERACT`/`CONSUME` : s'arrêter et poser la question.
2. Test rouge : `KeyE` → `INTERACT`, `KeyF` → `CONSUME`. Puis le changement.
3. **Source unique de la touche.** Les glyphes clavier des indices de commande doivent suivre. S'ils sont **dérivés** du mapping : rien à faire, le dire. S'ils sont **recopiés** dans `glyphes.json` : les mettre à jour, et ouvrir une ligne `D-` « deux sources pour la touche d'un verbe » (ne pas refondre ici).

## Interdits

Aucun changement manette ni tactile. Aucun remapping par le joueur. Aucun fichier de gameplay : si un module hors `input/` connaît `KeyE`, c'est une violation de contrainte à **signaler**, pas à corriger ici.

## Validation en jeu (Xav, clavier seul)

Partie neuve : l'indice de commande d'`INTERACT` montre `E`, celui de `CONSUME` montre `F`. Récolter un arbre avec `E`, ouvrir le Craft avec `E`, manger le fruit avec `F`.

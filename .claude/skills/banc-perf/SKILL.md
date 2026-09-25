---
name: banc-perf
description: Banc de performance complet du RPG V2 (cout_calque et traversee_nuit sous Chrome sans fenêtre, Bas/Moyen/Haut, ×1 et ×6) comparé à la référence — seulement en fin de spec, quand Xav part dormir, ou à sa demande. Aussi la « sentinelle » de milieu de spec. Jamais à chaque ticket.
---

# Banc de performance

Règle `Q-159` (Xav, 25/09) : « on écrit, on avance, on corrige les bugs, et de
temps en temps on vérifie notre budget perf ». **Pas de banc par palier ni par
ticket.** Le banc complet tourne à la fin d'une spec, ou quand Xav part dormir ;
quand il est réveillé, on avance. Une régression se retrouve ensuite commit par
commit.

## La sentinelle (milieu de spec, pour s'assurer qu'on n'a rien cassé)

`traversee_nuit` en **Moyen**, ×1 et ×6 — deux passages, pas plus :

```
RPG_QUALITE=moyen node tools/capture_chrome.mjs tools/scenarios/traversee_nuit.mjs
RPG_QUALITE=moyen RPG_BRIDAGE=6 node tools/capture_chrome.mjs tools/scenarios/traversee_nuit.mjs
```

## Le banc complet

Douze passages : `cout_calque` et `traversee_nuit`, × `RPG_QUALITE=bas|moyen|haut`,
× sans bridage et `RPG_BRIDAGE=6`. Chrome sans fenêtre, 1920 × 1080, DPR 1,
profil jetable (la sauvegarde de Xav n'est jamais touchée). Les en-têtes des
deux scénarios (`tools/scenarios/`) disent ce qu'ils mesurent et leurs autres
variables (`RPG_PHASE=jour`…). Les passages sont longs : les lancer en
arrière-plan.

## Lire et comparer

- **Référence** : le dernier banc complet, aujourd'hui
  `docs/archives/JOURNAL_2026-09-25_annexe1-nuit.md` §4 (après les paliers G
  et H). Reprendre sa table : `cout_calque` (reconstruction moy / max, frames
  > 20 ms) et `traversee_nuit` (`dessiner()`, `maj()`, reconstruction, frames
  > 20 ms), ancien → nouveau.
- Chrome sans fenêtre : **seuls deux passages du même scénario se comparent** ;
  ce ne sont jamais des relevés du §6 du suivi (ceux de Xav, à la main).
- Sous Chrome le dessin part au GPU : `dessiner()` mesure l'émission des
  ordres ; le signal de fluidité est « frames sautées ».
- Le contrat de fond reste `tests/test_budget_carte` : une frame dépend de ce
  qui est à l'écran, jamais de la taille de la scène ; l'entrée en scène suit
  la taille de la carte sous le plafond `graphismes.json > budget_carte`.

## Rendre compte

Dans le journal de la session, une section « Le banc complet » : la table
ancien → nouveau, « aucune régression » ou l'écart chiffré et le commit
soupçonné, ce que le banc ne voit pas (il ne connaît que la carte Maison). Le
banc complet devient la nouvelle référence : mettre à jour la ligne
« Référence » ci-dessus, dans cette skill.

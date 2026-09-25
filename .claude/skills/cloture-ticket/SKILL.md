---
name: cloture-ticket
description: Clôture d'un ticket du RPG V2 — tests, carte des modules, suivi (clore les D-/DOC-, ouvrir Q-/V-), un commit avec l'identifiant, la ligne du journal, le rapport à Xav. À utiliser à la fin de chaque ticket ou micro-ticket, avant de passer au suivant.
---

# Clôture d'un ticket

Un ticket = **un commit**, retirable seul, l'identifiant dans le titre.
**Jamais de push** : un push sur `main` publie le jeu, c'est Xav qui pousse.

## 1. Vérifier

- `node --check <fichier>.js` sur chaque fichier JS touché.
- La suite entière : `npm test` (sous PowerShell, `npm.cmd test` si `npm` est
  bloqué ; ou `node tools/run_tests.js`). Un test rouge se dit à Xav avec sa
  sortie ; on ne le contourne pas.
- Un test vérifie un **contrat**, jamais une valeur de réglage.
- **Aucun banc de performance, aucune capture** par ticket (`Q-159`) : c'est
  la skill `banc-perf`, en fin de spec.

## 2. Ce que le ticket a changé ailleurs

- Un module ajouté, retiré, ou dont le rôle change → sa ligne dans
  `docs/ARCHITECTURE.md`, **dans le même commit**.
- Un texte visible ajouté → les deux locales (`locales/fr.json`, `en.json`).
- Un contenu de catalogue renommé ou retiré → traité explicitement pour les
  vieilles sauvegardes (la migration de schéma ne le couvre pas).
- Le ticket touche `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou
  `main.js#dessiner()` → il se clôt par une validation de Xav guidée par
  `docs/CHECKLIST_visuelle.md` (une ligne `V-` qui le dit).

## 3. Le suivi (`docs/DOC_suivi-dettes.md`)

Chaque édition s'ancre sur l'identifiant (`| D-17 |`). Une ligne garde les
colonnes de l'en-tête de sa section.

- **Clore** ce qui est livré : `D-` et `DOC-` seulement, descendues en §8
  (`| Id | Quoi | Clos le | Verdict |`), avec la date et une ligne de verdict
  qui renvoie à la `V-` et à la `Q-` éventuelles.
- **Ouvrir** une `V-` pour ce que Xav doit voir en jeu (§3 :
  `| Id | Quoi | Depuis | Comment | Verdict | Statut |`) ; le « comment » dit
  précisément quoi faire et quoi regarder.
- **Ouvrir** une `Q-` pour chaque choix par défaut marqué `[OUVERT]`
  (§2 : `| Id | Question | Contexte | Bloque | Décision | Statut |`).
- Ce qui a été **trouvé en route** hors du ticket : une `D-` ou une `Q-`, pas
  un correctif.
- Jamais clore une `Q-`, `V-` ou `E-`.

## 4. Commiter

```
git add <fichiers du ticket>
git commit -m "<ID> : <ce que le joueur ou le code y gagne, en français>"
```

avec la ligne d'attribution demandée par le système.

## 5. Le journal

Ajouter la ligne du commit à `docs/JOURNAL_<…>.md` **maintenant** :
`` | `<hash>` | `<ID>` | <ce qu'il faut en retenir> | ``. Le journal se commite
avec le ticket suivant, ou dans un dernier commit `DOC : journal …`.

## 6. Le rapport à Xav

Court, dans cet ordre : les `[OUVERT]` et leurs `Q-` d'abord ; ce qu'il doit
voir en jeu (`V-`) ; ce qui a été trouvé en route ; l'état de la suite de
tests ; « rien n'est poussé ». Ne jamais dire un rendu ou une sensation
« validé » : Xav seul le dit, après avoir joué.

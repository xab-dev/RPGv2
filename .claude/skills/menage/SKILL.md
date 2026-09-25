---
name: menage
description: Ménage de début de session du RPG V2, à faire AVANT tout code — lire les réponses de Xav au suivi (git diff), archiver le journal précédent, mettre à jour l'INDEX, le suivi et « Où on en est » de CLAUDE.md, ouvrir le journal de la session. À utiliser au début de chaque session de travail, ou quand Xav dit « ménage ».
---

# Ménage de début de session

Règle de méthode de `CLAUDE.md` : le ménage se fait **avant tout code**, et se
commite seul (`Menage : …`). Il ne lit que ce qui a changé : jamais le suivi en
entier, jamais l'INDEX en entier.

## 1. Où on en est

```
git status --short
git branch --show-current
git log --oneline -8
```

Travail non commité qui n'est pas le suivi : le signaler à Xav avant d'aller
plus loin, ne rien écraser.

## 2. Les réponses de Xav

Xav répond par `npm run dettes`, qui écrit dans le suivi **sans commiter**.
Tout ce qu'il a répondu est là, et seulement là :

```
git diff docs/DOC_suivi-dettes.md
```

Pour chaque ligne touchée :

- une `Q-` **tranchée** : l'appliquer, ou ouvrir la `D-` qui la réalise ; une
  décision nouvelle entre dans la table des décisions de `CLAUDE.md` ;
- un `non` ou « répondu par Xav » sur une `V-`, une `D-` ou une `E-` : c'est un
  geste qui t'attend (corriger, rouvrir, répondre) ; **retirer le marqueur
  « répondu par Xav »** une fois traité ;
- un « plus tard » : c'est le choix de Xav, il ne se reprend que par lui.

Toute édition s'ancre sur l'identifiant de la ligne (`| Q-44 |`), jamais un
remplacement global. Une ligne garde exactement les colonnes de l'en-tête de sa
section. Jamais clore une `Q-`, `V-` ou `E-`.

## 3. Archiver le journal précédent

Le journal de la session précédente est le seul `docs/JOURNAL_*.md` à la racine
de `docs/`.

1. Le lire (il dit ce qui a été livré, ouvert, laissé pour Xav).
2. `git mv docs/JOURNAL_<…>.md docs/archives/` — **verbatim**, aucune retouche.
3. Ajouter une ligne à `docs/archives/INDEX.md`, juste avant le paragraphe final
   (« Le journal le plus récent… ») :
   `| AAAA-MM-JJ | <session> | [<fichier>](<fichier>) | <ce qu'on y trouve : ids livrés, V-/Q- ouverts, branche et état> |`
   (lire les trois dernières lignes de l'INDEX pour le ton, pas le fichier entier).
4. Ce que le journal a **révélé** devient une ligne du suivi (`D-`, `Q-`, `DOC-`)
   s'il n'en a pas ; ce qu'il a **livré** se clôt (`D-`, `DOC-` seulement,
   descendues en §8 avec la date et une ligne de verdict).

## 4. `CLAUDE.md`

- Mettre à jour **« Où on en est »** : publication, branches ouvertes, étape
  courante, prochaine étape. Trois à six lignes, **aucune histoire** (elle va
  dans le journal et l'INDEX).
- Une règle de méthode nouvelle → « Contraintes », en une ligne, avec le renvoi
  vers le journal qui la raconte. Une décision nouvelle → la table en fin de
  « Décisions produit verrouillées ».
- `wc -l CLAUDE.md` : **300 lignes au plus**. Au-delà, sortir verbatim vers
  `docs/archives/` ce qui n'est plus lu à chaque session (patron :
  `docs/archives/CLAUDE_etat_2026-09-25.md`, `decisions_archives.md`).

## 5. Commiter, puis ouvrir le journal de la session

```
git add -A
git commit -m "Menage : <ce qui a été archivé ou traité>"
```

(avec la ligne d'attribution demandée par le système). Puis créer
`docs/JOURNAL_AAAA-MM-JJ_<sujet>.md` : l'en-tête (frontmatter comme les
journaux archivés), la demande de Xav **citée**, la branche et d'où elle part,
puis la table :

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|

La première ligne est le commit du ménage. **Une ligne par commit, écrite au
moment du commit** : l'état d'une file vit sur le disque, jamais dans la
conversation.

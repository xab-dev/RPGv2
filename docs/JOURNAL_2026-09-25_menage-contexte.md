---
projet: RPG V2
episode/session: Ménage du contexte de Claude (CLAUDE.md, skills, MCP)
type: fichier de bord
version: 1.0.0
statut: livré, à relire par Xav
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : le ménage du contexte (25/09)

Demande de Xav : garder le vrai contexte, archiver le bruit, ne garder ou créer
que les skills et MCP dont ce projet a besoin, ne rien supprimer de critique, ne
pas perdre le cap du jeu. Diagnostic et raisons :
`docs/NS_menage-contexte-claude_2026-09-25.md`.

Branche `menage-contexte`, partie de `dettes-243-244-246` (non modifiée). Un
commit par étape, chacun retirable seul. Pas de push.

| Commit | Étape | Ce qu'il faut en retenir |
|---|---|---|
| `565e147` | Ménage | Journal des dettes 243, 244, 246 archivé ; aucune réponse nouvelle de Xav au suivi |
| `3e4290a` | `DOC-10` | Diagnostic et cap du jeu : `docs/NS_menage-contexte-claude_2026-09-25.md` ; `Q-175` (la ROADMAP), `Q-176` (le cap), `DOC-11` (« pixel art léger ») ouverts |
| `e2437dc` | `DOC-10` | Skills du projet : `menage`, `cloture-ticket`, `banc-perf` (`.claude/skills/`), les procédures de l'ancien `CLAUDE.md`, chargées à la demande |
| `6f7d2d0` | `DOC-10` | `CLAUDE.md` 471 → 130 lignes, le cap en tête ; ancien texte verbatim dans `docs/archives/CLAUDE_etat_2026-09-25.md`, arborescence dans `docs/ARCHITECTURE.md`, décisions du 23 au 25/09 dans `decisions_archives.md` (toujours en vigueur) |
| `ce70c36` | `DOC-10` | `.claude/settings.json` : connecteurs claude.ai coupés, 13 plugins synchronisés coupés, `anthropic-skills` masqués. Pris en compte **en direct** : les connecteurs se sont déconnectés dans la session même. `.claude/settings.local.json` (ignoré par Git) vidé : il valait `skillOverrides` en `name-only` sur les 17 `anthropic-skills`, qui l'aurait emporté sur le `off` du projet |

## Pour Xav

- **À relire** : le nouveau `CLAUDE.md` (130 lignes) — surtout « Le cap » (`Q-176`) et « Où on en est ».
- **À trancher** : `Q-175` (la ROADMAP : la mettre à jour, ou la figer en document d'origine).
- **Au prochain démarrage de Claude Code** : `/skills` doit montrer `menage`, `cloture-ticket`, `banc-perf` et plus aucun skill marketing, finance, Adobe… ; `/mcp` plus aucun connecteur claude.ai. Claude in Chrome reste.
- **Revenir en arrière** : `git revert <commit>` pour une étape, ou abandonner la branche (`git switch dettes-243-244-246 && git branch -D menage-contexte`). Tout rallumer : supprimer `.claude/settings.json`.
- Suite verte : 220 fichiers. **Rien n'est poussé.**

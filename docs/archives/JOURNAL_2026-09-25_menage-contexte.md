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
| `aaf4d96` | DOC | Journal, `DOC-10` clos |
| `98f2a33` | `Q-176` | Réponse de Xav : la carte mentale passe en v1.8.0 avec une section **§00 « Le cap »** (ses mots, ce qui existe déjà, ce que l’architecture devra accepter) ; `CLAUDE.md` n’en garde que l’essentiel. `Q-177` (plusieurs follets, le travail loin du joueur, `main.js`) et `DOC-12` (décisions des 24-25/09 absentes de la carte) ouverts |
| `41d7f45` | `Q-175` | Xav s’en remet à la recommandation : `specs/00_ROADMAP.md` v2.0.0 (111 lignes, à lire en entier), l’originale verbatim dans `docs/archives/ROADMAP_v1-9-0_2026-09-23.md` ; **les specs livrées restent dans `specs/`** (le code les cite ~200 fois) ; `DOC-11` clos |

## Pour Xav

- `CLAUDE.md` **validé** par Xav ; `Q-175` et `Q-176` tranchées.
- **À relire** : la ROADMAP v2 (`specs/00_ROADMAP.md`) et la carte mentale §00.
- **À trancher, sans urgence** : `Q-177` (ce que l'architecture devra accepter pour le follet agentique).
- **Au prochain démarrage de Claude Code** : `/skills` doit montrer `menage`, `cloture-ticket`, `banc-perf` et plus aucun skill marketing, finance, Adobe… ; `/mcp` plus aucun connecteur claude.ai. Claude in Chrome reste.
- **Revenir en arrière** : `git revert <commit>` pour une étape, ou abandonner la branche (`git switch dettes-243-244-246 && git branch -D menage-contexte`). Tout rallumer : supprimer `.claude/settings.json`.
- Suite verte : 220 fichiers. **Rien n'est poussé.**

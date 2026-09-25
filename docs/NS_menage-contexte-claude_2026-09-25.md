---
projet: RPG V2
episode/session: Ménage du contexte de Claude (CLAUDE.md, skills, MCP)
type: note de session (diagnostic + décisions)
version: 1.0.0
statut: appliqué sur la branche `menage-contexte`, à relire par Xav
catégorie: Doc
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Ménage du contexte de Claude — 25/09

Demande de Xav : « we need to fix CLAUDE.md and Skills and MCP […]. We need to
keep the real context and archive the noise, so we can improve your own work. »
Puis, après le diagnostic : « on commit sur une branche pour être sûr de revenir
en arrière si je me rends compte que tu pars de travers. Je veux être sûr qu'on
ne perde pas le point de vue de départ et ce que doit être le jeu à la fin […].
Pour les MCP et skills, on garde ou crée que ce qu'on a besoin dans ce projet
[…]. Je te fais confiance […]. On ne supprime rien de critique. Go. »

## 1. Le cap — ce que doit être le jeu à la fin

Les mots de Xav, tels quels (25/09) :

> un jeu fluide et hybride entre chill et speed run, médiéval-post-industriel,
> rpg-like, AI relationship (et qui reste flou même pour Xav, on avance à
> l'aveugle maintenant que l'équivalent de RPG-v1 est atteint), il faut pouvoir
> anticiper l'impossible d'aujourd'hui qui deviendra possible demain.

Ce qui existait déjà et s'y rattache (rien n'est nouveau, tout était dispersé) :

- **Le point de départ** : refonte d'un prototype V1 jetable ; « vitrine d'un
  jeu conçu et développé avec des agents IA, projet laboratoire »
  (`specs/00_ROADMAP.md`, bloc à lire en premier). L'équivalent de la V1 est
  atteint : c'est le moment où le cap devient flou, donc celui où il faut
  l'écrire.
- **La relation avec l'IA** : « le follet est un LLM scripté (le héros c'est
  Xav, le follet c'est Claude) », arc pédagogique, suite narrative au Nv.15,
  alignement caché qui passe par le follet (décisions du 23/09).
- **Chill et speed run** : la boucle de 5 minutes et la boucle de 2 heures
  (chill), la descente de l'Annexe et son Gardien « très dur, et c'est très
  bien » (tendu) ; la fluidité est un contrat tenu (`R-11`, `Q-159`).
- **Anticiper l'impossible** : c'est la règle d'architecture directrice
  (« comment le jeu doit pouvoir accepter ce qu'on n'a pas encore imaginé »),
  et la séparation des modules (« une phase future doit pouvoir remplacer le
  rendu sans toucher au reste » ; vue 3/4 à terme).
- **Médiéval-post-industriel** : écrit nulle part avant aujourd'hui. Le Chaos
  nocturne, les éclats, la ferronnerie et le concasseur à venir, le « circuit
  imprimé + portes logiques » de la Crypte X y tendent déjà.

Ce cap vit désormais en tête de `CLAUDE.md` (section « Le cap »), où chaque
session le lit en premier. Il ne se tranche pas : il oriente. Ma lecture de ses
termes est une proposition (`Q-176`).

## 2. Diagnostic (avant ménage)

### 2.1 `CLAUDE.md` : 471 lignes, 75 Ko, ~20 à 25 k tokens à chaque session

Plafond indicatif qu'il se donnait : 300 lignes.

| Section | Poids | Contexte réel | Bruit |
|---|---|---|---|
| Architecture | 28 Ko (38 %) | une ligne par module | l'histoire de chaque module, les `D-`, les raisons (les en-têtes des modules les portent déjà) |
| Décisions verrouillées | 20 Ko | les règles qui gouvernent l'écriture du code | 36 lignes datées et leur raisonnement complet |
| Contraintes | 11 Ko | les règles | l'histoire de naissance de chaque règle |
| Critère de passage | 7 Ko, **une ligne de 6 362 caractères** | « où on en est, ce qui vient » | le journal palier par palier des specs 13 et 14 |
| État actuel | 4 Ko | URL, push = publication, jamais pousser, identifiants d'un correctif | l'historique des branches publiées (Git le tient) |

Incohérences relevées :

- « Avant toute action de code, lire `specs/00_ROADMAP.md` **en entier** » :
  35 Ko (~10 k tokens), dernière retouche le 23/09 (v1.9.0), son statut décrit
  encore la Phase 3 ; il précède les specs 10 à 15. Sa partie durable (le bloc à
  lire en premier, les décisions, les contraintes) tient en 80 lignes ; le reste
  est l'histoire des phases. Il dit aussi « pixel art léger » alors que la
  décision du 15/09 dit « pas de pixel art » (`DOC-11`).
- La spec 14 est dite « courante » dans le critère de passage, alors qu'elle est
  validée et fusionnée : on ne savait plus lire, dans le fichier, ce qui est en
  cours.
- Le fichier violait sa propre règle (« jamais plus d'un journal ») : « État
  actuel » et « Critère » étaient devenus deux journaux.
- Les procédures récurrentes (ménage, réponses de Xav, clôture de ticket, banc)
  étaient de la prose chargée à chaque session, même quand elles ne servent pas.

### 2.2 Skills

- Aucun skill propre au projet (`.claude/skills/` n'existait pas).
- ~100 skills listés à chaque session, presque tous étrangers au projet, venus
  de **13 plugins synchronisés depuis claude.ai** (activecampaign, adobe, canva,
  monday, marketing, finance, data, design, product-management, productivity,
  cowork, browser-use, pdf-viewer) et des 17 `anthropic-skills:*`.

### 2.3 MCP

- Les copies `plugin:*` des serveurs étaient désactivées, mais pas les
  **connecteurs claude.ai** (Adobe, Canva, Figma, Gamma, Gmail, Calendar,
  Drive, Notion, Slack, monday, Make, Padlet, Lucid, vidIQ, Perspective,
  Spotify, Indeed, Granola, Wispr, Vertiso, B12, Economic Index, Claude Docs) :
  ~700 noms d'outils à chaque session.
- Plusieurs injectaient des **consignes contraires à la méthode** : Adobe
  (« appelle `adobe_mandatory_init` en premier à chaque session »), Figma (« même
  si Figma n'est pas nommé »), Notion (« recommande Notion »), Vertiso (« appelle
  `hello` au démarrage » : une **seconde mémoire** concurrente de la mémoire
  fichier), browser-use (un **second pilote de navigateur** à côté de Claude in
  Chrome). Des outils tournés vers l'extérieur (envoyer un mail, partager un
  Drive, écrire sur Slack) étaient disponibles dans un dépôt de jeu.

### 2.4 Mémoire de Claude

Saine : 10 fiches, 16 Ko, index propre. Seul défaut : deux règles en double avec
`CLAUDE.md` (le push, `Q-159`).

## 3. Ce qui a été fait (branche `menage-contexte`, un commit par étape)

Le détail commit par commit est dans le journal de la session. Principe :
**rien n'est supprimé, tout ce qui sort de `CLAUDE.md` est archivé verbatim**.

1. `CLAUDE.md` réécrit autour de ce qu'une session doit savoir avant d'agir : le
   cap, la règle d'architecture, les contraintes (une ligne chacune, avec leur
   renvoi), les commandes, où vivent les choses, l'état en trois lignes. Son
   texte d'avant est archivé tel quel (`docs/archives/CLAUDE_etat_2026-09-25.md`).
2. L'arborescence commentée des modules devient `docs/ARCHITECTURE.md`, lue
   quand un ticket touche un module, pas à chaque session.
3. Les décisions datées du 23 au 25/09 rejoignent `decisions_archives.md`,
   verbatim, **toujours en vigueur** ; `CLAUDE.md` en garde le résumé par thème,
   comme il le faisait déjà pour celles du 15 au 22/09.
4. Les procédures deviennent des **skills du projet** (`.claude/skills/`),
   chargés quand on s'en sert : `menage`, `cloture-ticket`, `banc-perf`.
5. `.claude/settings.json` (versionné, propre au projet) : connecteurs claude.ai
   coupés (`disableClaudeAiConnectors`), les 13 plugins synchronisés coupés
   (`enabledPlugins`), les `anthropic-skills:*` masqués (`skillOverrides: off`).
   **Restent** : Claude in Chrome (intégré à Claude Code, Xav regarde Chrome à
   côté du terminal), les skills intégrés (`code-review`, `simplify`, `run`,
   `artifact-*`…). Rien n'est désinstallé : tout se rallume en une ligne, et
   rien n'est touché hors de ce projet.

## 4. Pour revenir en arrière

Tout est sur la branche `menage-contexte`, partie de `dettes-243-244-246` (qu'elle
ne modifie pas). Abandonner : `git switch dettes-243-244-246 && git branch -D
menage-contexte`. Retirer une seule étape : `git revert <commit>` (chaque commit
est retirable seul). Les réglages ne prennent effet qu'au **prochain démarrage**
de Claude Code dans ce dossier.

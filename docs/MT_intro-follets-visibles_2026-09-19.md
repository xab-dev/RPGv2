---
projet: RPG V2
episode/session: Polish 3/7
type: micro-ticket, cause racine d'abord
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — MT : intro — les follets restent visibles pendant le texte

**Constat (Xav, 2026-09-19)** : pendant l'intro, quand le texte s'affiche, les trois follets disparaissent ; ils réapparaissent d'un coup à l'appui sur `A`. Attendu : **le texte et les follets en même temps**, sans saut.

## Cause racine d'abord

Piste à vérifier, pas un fait : les follets ne sont dessinés que par `dessinerIntroConvergence()` (intro active) et par `dessinerEcranChoixFollet()` (choix actif) ; entre les deux, un dialogue est ouvert et **aucun des deux états n'est actif**, donc plus personne ne les dessine. Nommer la cause fichier:ligne avant de corriger.

## Attendu

- Les follets continuent de léviter derrière le texte (atténués seulement si la lisibilité l'exige).
- **Continuité de position** : dernière frame avant le texte, frames pendant le texte, première frame du choix — aucun saut. Si `intro.js` doit exposer un état « en attente » pour ça, il reste une machine pure.
- Durée de l'intro inchangée (budget ≤ 8 s), toujours non-skippable. L'armement anti-spam du dialogue n'est pas touché.

## Tests

Pendant le dialogue d'intro, l'état expose les trois follets comme visibles ; leurs positions entre la fin de la convergence et le début du choix sont continues à ε près.

`main.js#dessiner()` touché → rejouer `docs/CHECKLIST_visuelle.md`, ajouter l'état « texte d'intro + follets ». Validation visuelle due par Xav.

**Règles communes** : ménage de journal d'abord ; une session = ce ticket, rien d'autre ; toute valeur nouvelle en données, commentée, marquée *provisoire* ; `node --check` + `node tools/run_tests.js` verts ; journal dans `CLAUDE.md`. Les noms de fichiers cités viennent de la section Architecture de `CLAUDE.md` — si le code réel diffère, le code fait foi, le dire dans le journal.

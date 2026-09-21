---
projet: RPG V2
episode/session: File de micro-tickets « Nv.0 → Nv.10 »
type: fichier de bord (une ligne par commit)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-21
genere_par: claude
verifie_par: xav
---

# Fichier de bord — file « Nv.0 → Nv.10 » (21/09)

Brief : `docs/BRIEF_file-nv0-10_2026-09-20.md` v1.2.0. Branche `main`, un commit par ticket,
ordre T0 → T1 → T2 → T6 → T3 → T4 → T9 → T7 → T8 → T5. Aucun `push`.

Une ligne est écrite **au moment du commit**, jamais après coup : ce fichier est l'état de la
file, la session ne le tient pas de mémoire.

| # | Ticket | Commit | Ce qui est livré | Lignes de suivi |
|---|---|---|---|---|
| T0 | Reporter les verdicts du 21/09 | (ce commit) | 23 lignes `V-`/`E-` closes sous dictée de Xav et descendues en §8 · `V-11` réduite au puits · `V-10` dégelée en **non** · `Q-23` close, `Q-33`/`Q-34` tranchées · état **`pas vu`** ajouté au mode d'emploi · `docs/CHECKLIST_tournee.md` créée | ouvre `D-55` (volume), `D-56` (Motorola, à qualifier), `D-57` (placement tactile, gelé) ; clôt `D-36` |
| T1 | L'XP de récolte et son retour visuel | (ce commit) | Champ `xp` sur items / resources / stations, lu par `xp.js#xpDeCatalogue` et validé au boot · texte flottant réduit à « +1 », « +1xp » à côté, distingués par la **taille** (`style` opaque + `data/effets.json`) · `crediterXpHeros` prend une position optionnelle · équilibrage prouvé : 22 XP → Nv.2, 24,4 % de Nv.0 → 5 | clôt `D-58` ; ouvre `Q-43`, `Q-44`, `V-36` |
| T2 | Ressources semi-aléatoires en gradient | (ce commit) | `points_ressources` par scène (liste posée à la main, ~3× le besoin) · tirage à l'aube, graine = numéro du jour · gradient = forme de la liste (1/3 au bord du chemin) · effectifs 2 → 10 · **plus de repousse en journée** sauf `respawn_ms` déclaré · sauvegarde v5 → v6 · outil `tools/semer_points_ressources.mjs` | clôt `D-59` ; ouvre `Q-45`, `V-37` |
| T6 | La Plume | (ce commit) | `item_plume` + `objets_uniques` dans la scène (générique, hors tirage du jour) · aucune migration : c'est l'absence du flag qui la pose · `description_key` optionnelle rendue par `lignesFicheItem` · texte FR/EN **proposé**, à réécrire par Xav | clôt `D-60` ; ouvre `V-38` |

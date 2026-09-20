---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, palier A
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, V-27, D-42, D-30, V-25, V-26, Q-36]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Menus en cartes, palier A (20/09)

`specs/08_menus-cartes.md` v1.0.0, **palier A seulement**. Branche **`menus-cartes`**, créée depuis `main`
(`a605729`). **Aucun `push`** — `push` sur `main` publie le jeu. Le palier B n'est pas commencé.

Une ligne par commit, écrite **au moment du commit** (hygiène de contexte : ce qui n'est dit que dans la
conversation se perd quand elle se résume).

## §0 ter — Chrome est connecté

**Oui.** L'extension répond, un onglet est disponible dès la première seconde de la session. Les captures à
**703 × 280** et à **1920 × 1080** demandées pour A3 et A4 sont prises dans `docs/captures/menus-cartes-2026-09-20/`.
Une vérification dans Chrome dit « ça s'affiche sans défaut », jamais « c'est réussi » : le verdict est `V-27`.

---

## Commit 0 — Ménage de journal et ouverture du chantier (doc seule)

**Ménage.** `docs/JOURNAL_2026-09-20_menu-tactile.md` part dans `docs/archives/`, avec sa ligne d'INDEX. Son brief,
`BRIEF_menu-tactile_2026-09-20.md`, qui traînait à la racine du dépôt, est archivé à côté (même geste que pour les
deux briefs de nuit). `CLAUDE.md` ne garde qu'un journal : le renvoi vers celui-ci.

**Consigné au suivi, sur instruction de Xav** (une ligne `V-` ne se clôt jamais par initiative) : **`V-25` et `V-26`
validées par Xav le 20/09, sur téléphone, par l'URL publique — « all good ».** Donc **`D-42` et `D-30` closes** pour de
bon : les quatre lignes descendent en §8. Les verdicts y sont condensés ; le détail verbatim reste dans le journal
archivé, que chaque ligne cite.

**Ouvert.** Les deux identifiants que la spec annonçait « à créer » étaient **libres**, aucun décalage à signaler :

- **`D-43`** — le chantier « menus en grille de cartes », P1, *en cours* (palier A).
- **`V-27`** — la validation du palier A : menu principal et Sauvegarde, manette / souris / doigt, 1920 × 1080 et
  téléphone, accent des trois follets et accent neutre, focus « plus / moins / bon », `[X]` seul ou avec son mot.

**`Q-36`** reste ouverte et reste à Xav : la ligne dit désormais que la spec la tranche **au palier B** (défaut
retenu : `MENU`, menu ouvert, ferme tout par la même fonction que le `[X]` de la racine). **Rien n'est codé ici.**

**La spec entre dans le dépôt avec ce commit** (`specs/08_menus-cartes.md` était non suivie) : la branche en dépend.

**Signalé** : `CLAUDE.md` fait 315 lignes pour un plafond indicatif de 300 (il en faisait déjà 312). Pas de coupe
faite en passant — ce qui se retire d'un fichier d'instructions mérite d'être relu par Xav.

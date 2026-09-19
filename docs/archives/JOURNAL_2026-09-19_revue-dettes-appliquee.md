# Journal de session — Revue des dettes appliquée (`DOC-06`, 2026-09-19)

**Session de documentation pure, ordonnée par `NS_decisions-revue-dettes_2026-09-19.md` v1.1.0 — aucun fichier de `src/`, `data/` ou `tests/` touché.** Lignes du suivi traitées, et aucune autre : `DOC-01`, `DOC-02`, `DOC-03`, `DOC-05`, `DOC-06`. Travail sur `main` (la branche `polish-2026-09-19` était déjà fusionnée par Xav, `e5b6d44`).

**Ménage de journal d'abord** : le journal précédent (« Polish post-Construction, tickets 1-5 ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-19_polish-tickets-1-5.md`, `docs/archives/INDEX.md` mis à jour (il manquait à l'INDEX), `docs/DOC_suivi-dettes.md` mis à jour dans la foulée (règle 4 du registre).

### Ce qui a changé, fichier par fichier

| Fichier | Changement |
|---|---|
| `CLAUDE.md` | « État actuel » réécrit (`DOC-01`, `DOC-02`) ; 2 contraintes de méthode ajoutées (micro-tickets, un ticket = un commit) ; règle de la checklist visuelle reformulée ; 7 décisions datées ajoutées et 2 réécrites ; **les sections « Points `[OUVERT]` » et « Dette et à reprendre » supprimées** et remplacées par le bloc de l'annexe A (`DOC-05`) ; « Critère de passage courant » réécrit |
| `docs/carte_mentale_RPG_V2_v1_5_0.md` | **Renommée `..._v1_6_0.md`** (`git mv`, toutes les références mises à jour) ; §3bis vocabulaire révisé + arc de progression + boucle de 2 heures + `Q-18` ; §3bis table des scènes et §5 D21 (gating ~5 abandonné) ; §5 ⑦ (paliers, « un domaine, pas un piquet ») ; 4 lignes au journal §8 |
| `specs/00_ROADMAP.md` | → **1.5.0** : statut, changelog, gating ~5 abandonné dans la table Design, 2 contraintes de méthode, section polish entièrement réécrite (`DOC-03`), section « Arc de progression de la carte Maison » ajoutée, Phase 4 déclassée, rappel de fin de session complété |
| `docs/DOC_suivi-dettes.md` | → **1.6.0** : `DOC-01`, `DOC-02`, `DOC-03`, `DOC-05`, `DOC-06` descendues en §8 avec leur verdict ; **`D-19` ouverte et close** (voir ci-dessous) |
| `docs/archives/` | Journal des tickets 1-5 archivé + ligne d'INDEX ; `NS_decisions-revue-dettes_2026-09-19.md` déplacée en fin de session |

### Trois points qui méritent d'être relus

**1. La vérification exigée par `DOC-05` avant de supprimer les deux listes.** Les **21 lignes** des sections « Points `[OUVERT]` » et « Dette et à reprendre » ont été reprises une à une pour retrouver leur identifiant dans le suivi. Toutes en avaient un (`V-09`, `Q-12`, `Q-08`, `Q-09`, `Q-10`, `Q-11`, `Q-07`, `E-01`, `Q-04` pour les `[OUVERT]` ; `D-04` à `D-13`, `D-16`, `V-01` à `V-05`, `V-10`, `V-11`, `Q-15`, `Q-16` pour les dettes) **sauf une** : la note sur `nb_au_sol` de `item_branche`/`item_caillou`. Elle est devenue **`D-19`**, ouverte et close le jour même en « sans objet » — la donnée est à 2 depuis la Phase 2, le changement demandé par la fiche du 17/09 n'a jamais eu lieu d'être. Rien d'autre n'a été perdu en vidant les deux sections.

**2. `CLAUDE.md` ne contient plus aucune liste de ce qui est dû.** Le bloc de l'annexe A y a été recopié **tel quel**, comme le demande la NS : lecture ciblée par identifiant, initiative dans le périmètre du ticket, proposition hors périmètre, et l'interdiction de clore une ligne `Q-`, `V-` ou `E-`. Conséquence pratique pour les sessions suivantes : **un ticket qui ne cite aucun identifiant n'a pas de contexte de dette** — c'est voulu.

**3. Ce que je n'ai pas fait, volontairement.** Les specs déjà livrées (`03_maison-exterieur.md`, `04_maison-interieur.md`) mentionnent encore le niveau ~5 « qui ouvre la zone suivante » : elles décrivent un état historique et la NS ne les listait pas — je les ai laissées intactes plutôt que de réécrire des specs closes. Seule la ROADMAP, qui est un document vivant, porte la note de révision. Même raisonnement pour les références à d'anciennes versions de la carte mentale dans les specs livrées.

### Question pour Xav

**L'ordre d'injection du §7 de la NS reste « proposé ».** Je l'ai inscrit tel quel dans « Critère de passage courant » (`D-17` → `D-13` → `D-02` → `07` palier A → B → C → D → `D-16`). Si tu veux commencer ailleurs — par exemple `D-04` (le saut à chaque angle, la dette qui touche le plus le ressenti au stick), ou `A-03` (le relevé de nuit, qui bloque la lecture de `D-01` avant que 07 ne pose des monstres la nuit) — dis-le : c'est une ligne à changer, pas un travail à refaire.

# Journal de session — « Les fondations d'abord » (`NS_decisions-fondations_2026-09-19.md`, 2026-09-19)

**Session de documentation pure — aucun fichier de `src/`, `data/` ou `tests/` touché.** Travail sur `main`. `docs/DOC_suivi-dettes.md` **v1.7.0 a été fourni par Xav avec la NS** : il n'a pas été réécrit, seulement vérifié (voir ci-dessous).

**Ménage de journal d'abord** : le journal précédent (« Revue des dettes appliquée, `DOC-06` ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-19_revue-dettes-appliquee.md`, une ligne ajoutée à `docs/archives/INDEX.md`.

### Ce qui a changé, fichier par fichier

| Fichier | Changement |
|---|---|
| `docs/archives/` | Journal précédent archivé verbatim + ligne d'INDEX |
| `CLAUDE.md` | « État actuel » : **deux relevés → trois**, avec la réserve de `R-04` (émulation F12 = c'est le PC qui dessine) et le fait qu'il établit ; une **décision datée pour `Q-21`** (« mains nues » = première arme) ; « Critère de passage courant » : la décision de méthode du §1 et le **nouvel ordre d'injection** (§5 de la NS) à la place de l'ancien |
| `specs/00_ROADMAP.md` | → **1.6.0** : version, statut (« chantier courant = les fondations »), changelog 1.6.0, étape 1 du polish (trois relevés, réserve de `R-04`), note de report sur `07_chaos-nocturne.md`, **nouvelle section « Ordre d'injection »** (qui répare au passage le renvoi mort du changelog 1.4.0) |
| `docs/DOC_suivi-dettes.md` | **Non touché** (fourni en v1.7.0 par Xav, comme le demande la NS) |
| `docs/carte_mentale_RPG_V2_v1_6_0.md` | **Non touchée**, comme le demande la NS : `Q-21` applique une décision déjà verrouillée, le report se fera à sa prochaine révision |

### Vérification demandée par la NS : les identifiants cités existent-ils ?

Les **18 identifiants** de l'en-tête `ids_suivi` ont été cherchés un à un dans `docs/DOC_suivi-dettes.md` v1.7.0 : `Q-07` (§2, gelée), `Q-19` (§2), `Q-20` (§2), `Q-21` (§8, close), `D-01`, `D-03`, `D-05`, `D-14`, `D-20`, `D-21`, `D-22`, `D-23`, `D-24` (§5), `A-04`, `A-05` (§1), `E-01`, `E-03` (§4), `R-04` (§6). **Tous présents, aucun manquant, aucune contradiction de statut avec la NS.**

### Ce que je n'ai pas fait, volontairement

- **La décision verrouillée « pas de pixel art — rendu net à résolution physique (DPR) » (15/09) n'a pas été touchée**, comme la NS l'exige explicitement : `Q-19` la *réviserait*, mais elle n'est pas tranchée — elle attend `A-05`.
- **Le suivi des dettes n'a pas été réécrit** : la NS le donne comme fourni. Conséquence pratique : les lignes que cette session aurait normalement ouvertes ou closes au ménage y sont déjà, écrites par Xav.
- La carte mentale et les specs déjà livrées restent intactes (même raisonnement que la session précédente : ce sont des états historiques).
- **La NS n'a pas été déplacée dans `docs/archives/`** : son §6 est la procédure que Xav doit suivre pour `A-04`, et les cinq fiches `MT_*_2026-09-19.md` de la file d'injection sont des tickets **actifs**. Tout ce lot sera archivé au ménage de la session qui archivera ce journal.

### Un point à signaler à Xav

**Le chemin de `E-03` ne correspond pas au dossier réel.** Le suivi (§4) et l'en-tête du gabarit disent `docs/captures/v1/DOC_captures-v1.md` ; le fichier et les 12 images vivent en réalité dans **`docs/captures/inspiration_rpg_v1/`**. Rien n'est cassé — aucun ticket ne lit ce dossier tant que `E-03` n'est pas rempli — mais un ticket futur qui suivrait le chemin écrit ne trouverait rien. J'ai écrit le **chemin réel** dans `CLAUDE.md` et la ROADMAP, et je n'ai pas corrigé le suivi ni le gabarit (hors périmètre, et la NS interdit de réécrire le suivi). À arbitrer : renommer le dossier, ou corriger les deux mentions.

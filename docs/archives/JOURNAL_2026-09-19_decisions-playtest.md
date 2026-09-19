# Journal de session — Décisions du playtest, consignation (2026-09-19)

Ménage de journal effectué en début de session : le journal précédent (« Correction : parité clic/verbe en Construction ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-19_parite-clic-verbe.md`, `docs/archives/INDEX.md` mis à jour.

Session de documentation pure, ordonnée par `NS_decisions-playtest_2026-09-19.md` — **aucun fichier de `src/`, `data/` ou `tests/` touché**, même patron que `NS_cloture-phase2_2026-09-17.md`. Contexte : Xav a rejoué Construction en jeu après le correctif de parité clic/verbe (manette puis clavier seul, tous deux bons) et a profité du playtest pour figer plusieurs décisions accumulées.

**1. Construction close** : validée par Xav manette + clavier, critère de passage clos, dette de validation correspondante retirée (captures checklist encore dues, notées séparément).

**2. Vocabulaire de la Région Maison figé** (Forêt / Jardin / Zone sûre / Champs / Campagne, cf. carte mentale §3bis) — sert de référence à toutes les specs suivantes, à ne plus réinventer par session.

**3. Quatre décisions datées** : héros à l'échelle 0,88 (visuel + hitbox, une seule échelle) avec la règle « aucun effet ne dépend de la forme du héros » (traînée de poussière au lieu d'un roulement) ; HUD sur une ligne pleine largeur, XP retirée du HUD (conservée dans Stats) ; follets visibles pendant le texte de l'intro ; **intrusion nocturne du Chaos dans la Région Maison** — la plus structurante, elle *révise* `03_maison-exterieur.md` §5 (« aucun monstre, ton chill ») suite au constat que la carte est bien plus grande que prévu et que la nuit au seul follet est l'ambiance la plus forte du jeu. Cadre acté par Xav : nuit seulement, zone de Chaos dans les Champs, quelques monstres épars en Forêt, demi-tour du monstre à l'entrée en zone sûre (condition sur sa position, jamais sur celle du joueur). Spec à écrire : `07_chaos-nocturne.md` — non écrite dans cette session.

**4. Trois nouveaux `[OUVERT]`** : construction dans les Champs (contredit la grille intérieure de `05_construction-stations.md`, piste `zonesConstructibles` en JSON de scène) ; barre d'action du bas façon Minecraft (à écrire par Xav lui-même, pas par Claude) ; second rayon sûr autour de la sortie de la Grotte (proposé par Claude, retenu par défaut dans `07`, à confirmer).

**5. Dette reformulée** : « rendu un peu laggy » précisé en « petites saccades régulières en traversant la carte en ligne droite, tous périphériques, perceptibles par un joueur confirmé » — ticket à écrire, `MT_mesure-saccades`.

**6. Ordre d'injection acté**, inscrit dans `specs/00_ROADMAP.md` et dans « Critère de passage courant » ci-dessus : mesure des saccades → héros 0,88 → follets intro → `station_puits` → traînée de poussière → HUD → correction des saccades (d'après les chiffres) → `07_chaos-nocturne` → barre du bas (après écriture par Xav).

**Fichiers touchés** : `CLAUDE.md`, `docs/carte_mentale_RPG_V2_v1_4_0.md` → renommée `v1_5_0`, `specs/00_ROADMAP.md` → v1.4.0, `docs/archives/INDEX.md`. `NS_decisions-playtest_2026-09-19.md` déplacé vers `docs/archives/` en fin de session (source des décisions ci-dessus, conservée verbatim).

### Testé

`node tools/run_tests.js` rejoué par prudence bien qu'aucun fichier de code n'ait bougé : toujours **59 fichiers, tous verts**. Pas de `node --check` applicable (aucun `.js` livré).

### Reste ouvert

`07_chaos-nocturne.md` reste à écrire avant tout code de la mécanique. Barre d'action du bas : spec à écrire par Xav. Second rayon sûr : à confirmer par Xav. `MT_mesure-saccades` : ticket à écrire avant le prochain chantier de code (mesure avant correctif, cf. ordre d'injection). Captures checklist visuelle 29-32/31bis de la Construction toujours dues sauf mention contraire de Xav. Règle de méthode candidate n°2 (état UI pur) toujours proposée, pas chiffrée.

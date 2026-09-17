# Journal de session — Clôture formelle de la Phase 2 (2026-09-17)

Session de tri/documentation, ordonnée par `NS_cloture-phase2_2026-09-17.md`. **Aucun code, aucun test modifié.** Ménage de journal effectué en début de session : le journal précédent (« Stations : proportions et collision ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_stations-proportions-collision.md`, `docs/archives/INDEX.md` mis à jour.

Contexte : Phase 2 « Région Maison, première marche » validée en jeu (manette + clavier) sur tout le parcours, défauts corrigés et re-validés (2026-09-17). `CLAUDE.md` le disait déjà mais gardait encore le critère de passage de la Phase 2 en section courante, et la carte mentale n'avait pas absorbé les décisions des 16-17/09. Cette session range ce qui est déjà acté ailleurs (journaux archivés, retours de Xav) — elle ne tranche rien de nouveau.

### Fait

- **`CLAUDE.md`** : « État actuel du dépôt » réduit à une ligne pour la Phase 2 (le détail des micro-tickets vit dans `docs/archives/INDEX.md` et dans la Dette ci-dessus, notamment les deux validations manuelles encore dues — contraste jour/nuit, ambiance synthé — désormais explicites dans la Dette plutôt que noyées dans ce paragraphe) ; « Critère de passage courant » remplacé par le bloc Phase 3 (spec à écrire) ; références à la carte mentale mises à jour vers `docs/carte_mentale_RPG_V2_v1_4_0.md`.
- **Carte mentale → v1.4.0** (`docs/carte_mentale_RPG_V2_v1_4_0.md`, renommée depuis v1.3.0) : changelog de version, 5 lignes ajoutées à son §8 (arbre fruitier increvable, indice de commande au premier déclenchement, stations solides ×2,1, durées/contraste jour-nuit, clôture de la Phase 2), point `[OUVERT]` ⑦ ajouté en §5 (mobs nocturnes dans la Région Maison — contredit le ton « chill, aucun monstre » de `03_maison-exterieur.md` §5, à trancher seulement quand le jardin existera), référence Throne and Liberty rattachée à D20 (housing) en §9, ligne « Maison — extérieur » ajoutée en §3bis (statut livré/validé).
- **`specs/00_ROADMAP.md` → v1.2.0** : statut mis à jour (Phases 0/1/1b/2 livrées et validées, Phase courante = Phase 3 détaillée dans `04_maison-interieur.md`, à écrire), section Phase 2 réduite à un renvoi, ligne ajoutée à l'esquisse de Phase 3 sur le point d'accroche `resources.js#peutRecolter`.

### Testé

`node tools/run_tests.js` rejoué après tous les changements documentaires (aucun fichier `src/`/`tests/`/`data/` touché) : **47 fichiers, tous verts, inchangé.**

### Hors scope

Tout code. La spec `04_maison-interieur.md` (dépend de trois décisions de Xav, non encore prises). Le micro-ticket `station_puits` (reste en Dette, consigne explicite de Xav de ne rien coder dans l'immédiat).

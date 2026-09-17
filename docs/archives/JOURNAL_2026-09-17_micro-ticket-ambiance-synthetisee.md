# Journal archivé — Micro-ticket ambiance sonore synthétisée (2026-09-17)

Archivé verbatim depuis `CLAUDE.md` le 2026-09-17 (ménage de journal, avant la session `SD_musique-freeze-reprise_2026-09-17.md`).

---

## Journal de session — Micro-ticket ambiance sonore synthétisée (2026-09-17)

Ménage de journal effectué en début de session : le journal précédent (« Micro-ticket contraste et durées jour/nuit ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_micro-ticket-contraste-jour-nuit.md`, index mis à jour.

Brief complet : `MT_musique-ambiance-synth_2026-09-16.md` (racine du dépôt). Objectif : `assets/audio/piano_solo.mp3` n'est toujours pas fourni (dette assumée) ; le jeu doit avoir une ambiance continue testable maintenant (démarrage sur premier geste, coupure/reprise menu, persistance du réglage), remplacée plus tard par le piano via une entrée JSON, sans code.

### Écart au périmètre de fichiers déclaré par la fiche, assumé et documenté

La fiche listait trois fichiers (`src/audio.js`, `data/music.json`, `src/schemas.js`) mais demandait aussi que « la scène/le boot pointent [sur la piste provisoire] tant que `piano_solo` n'existe pas » avec repli **automatique**, sans jamais toucher au JSON le jour où le fichier arrive. Ces deux exigences ne sont satisfaisables ensemble que si le point d'armement (`main.js`, l'unique appelant) résout la piste par défaut *et* son repli à partir du catalogue complet plutôt que d'un id unique câblé en dur — exactement le patron déjà utilisé pour les séquences de leviers (`puzzles.js`, résolution de références par id via le registre), donc pas une généralisation prématurée. **Décision assumée sans remonter de question bloquante** (contrairement au conflit jour/nuit de la session précédente) : ce n'est pas un point de design produit, seulement un point de câblage — la fiche elle-même exige le comportement, seul le nombre de fichiers touchés était sous-estimé. `src/main.js` a donc été touché, à la marge stricte : une ligne, `armerAudio(registre.obtenir('music', 'music_piano_solo'), ...)` → `armerAudio(registre.tous('music'), 'music_piano_solo', ...)`. Aucune autre ligne de `main.js` modifiée ; le contrat vu du reste du jeu (`armerAudio`/`definirMusiqueActive`) est inchangé.

### Implémentation

- **`data/music.json`** : `music_piano_solo` (type `fichier`, inchangé sinon un champ `repli: "mus_ambiance_provisoire"`) + nouvelle entrée `mus_ambiance_provisoire` (type `synthese`, `tempo_bpm: 50`, `volume: 0.25` — valeurs proposées par la fiche, à ajuster par Xav), phrase pentatonique descendante en la mineur (A3-G3-E3-D3-C3) suivie d'un silence, 6 pas de 2 temps (~2,4 s chacun à 50 bpm) — dans la fourchette « 4 à 8 notes » et « une note toutes les ~2,5 s » de la fiche.
- **`src/schemas.js`** : le catalogue `music` accepte désormais `type: "fichier" | "synthese"` ; `fichier` requis seulement pour le premier, `tempo_bpm`/`notes` (non vide, `duree_beats > 0`, `note` optionnelle = silence) requis seulement pour le second ; `repli` optionnel, validé comme référence croisée vers une autre entrée du même catalogue (mécanisme `refs` déjà générique, aucune extension de `registry.js`).
- **`src/audio.js`** : deux moteurs de lecture derrière le même contrat (`armerAudio(catalogueMusic, idPisteDefaut, actif)` / `definirMusiqueActive(actif)`, noms conservés — renommer en `jouerMusique`/`couperMusique` comme suggéré par la fiche aurait propagé le renommage jusqu'à `main.js` pour un gain nul, écarté). Piste `fichier` : `<audio>` inchangé, sauf l'écouteur `error` qui, en plus de l'avertissement console existant, bascule maintenant sur la piste de repli résolue. Piste `synthese` : `AudioContext` + oscillateurs sinus créés uniquement dans `demarrerSynthese` (jamais au niveau module), une note = un oscillateur + une enveloppe attaque/relâchement (`linearRampToValueAtTime`, jamais de front raide → pas de clic), fréquence calculée depuis le nom de note (regex + formule demi-tons, jamais une table figée — une nouvelle note dans `data/music.json` ne touche jamais ce fichier), boucle par ré-arrangement `setTimeout` de la phrase entière (chaque note retombe à 0 avant la suivante, y compris au point de bouclage → pas de couture à gérer séparément), coupure/reprise via un fondu court sur un gain maître (`setTargetAtTime`, 50 ms) plutôt qu'un arrêt sec des oscillateurs en vol.
- **`resoudrePisteRepli(piste, catalogueMusic)`** exportée : résolution pure de l'id `repli` dans le tableau fourni, aucun accès `AudioContext`/DOM — c'est la seule partie de `audio.js` testable headless (même contrainte que `render.js`/`ui/hud.js` pour le canvas), et c'est ce que la fiche demandait explicitement au §« Test de validation ».

### Test (`tests/test_musique_ambiance_synth_2026-09-16.js`, nouveau)

Charge le vrai `data/music.json` du dépôt (comme `test_phase0_registry`) et vérifie qu'il valide, que `music_piano_solo.repli` pointe vers `mus_ambiance_provisoire`, et que `resoudrePisteRepli` résout bien vers cette entrée réelle. Complété par des cas construits à la main (fictifs, sans lien avec le vrai catalogue) : résolution pure sans `repli` (→ `null`), `repli` cassé (→ `null`, jamais d'exception) ; schéma : entrée `synthese` valide acceptée, entrée `fichier` sans champ `fichier` rejetée, entrée `synthese` sans `tempo_bpm`/`notes` rejetée, `type` inconnu rejeté, `repli` vers un id absent rejeté par la validation croisée générique de `registry.js`.

### Livré

```
node --check src/audio.js src/schemas.js src/main.js tests/test_musique_ambiance_synth_2026-09-16.js
node tools/run_tests.js
```
→ **44 fichiers, tous verts** (43 précédents + le nouveau test ; aucun test existant modifié).

Fichiers modifiés : `data/music.json`, `src/schemas.js`, `src/audio.js`, `src/main.js` (une ligne, cf. écart documenté ci-dessus), `CLAUDE.md` (ce journal). Fichier ajouté : `tests/test_musique_ambiance_synth_2026-09-16.js`. Fichiers archive ajoutés : `docs/archives/JOURNAL_2026-09-17_micro-ticket-contraste-jour-nuit.md`, `docs/archives/INDEX.md` mis à jour.

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : durées de l'intro cinématique (`03_grotte-polish.md` §9).

### Critère de passage — reste à faire par Xav

Validation manuelle en navigateur réel, à la manette (la fiche l'exclut explicitement des tests automatisés) : silence total au boot ; premier bouton → l'ambiance démarre, boucle sans clic audible ; menu « Musique : non » → s'arrête en douceur, « oui » → reprend ; recharger la page → réglage conservé ; laisser tourner 5 min → pas de dérive ni d'accumulation de sources. Verdict de Xav sur le tempo (50 bpm), le volume (0.25) et les notes choisies (phrase la mineur) à recueillir avant de considérer ces valeurs définitives.

### Hors scope pour cette session

Le piano lui-même (asset Xav, à déposer sous `assets/audio/piano_solo.mp3` — le repli s'efface alors sans toucher au code), bruitages, musique par scène (une seule piste globale, comme avant), fondu enchaîné entre pistes — tous explicitement exclus par la fiche.

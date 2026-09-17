## Journal de session — Diagnostic freeze bascule Musique non→oui (2026-09-17)

Ménage de journal effectué en début de session : le journal précédent (« Micro-ticket ambiance sonore synthétisée ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_micro-ticket-ambiance-synthetisee.md`, index mis à jour.

Brief complet : `SD_musique-freeze-reprise_2026-09-17.md` (racine du dépôt). Retour terrain Xav dans la nuit suivant la livraison de `MT_musique-ambiance-synth` : le jeu gèle (manette et clavier morts, souris vivante) à la première bascule "Musique" de non vers oui — que l'ambiance ait déjà joué dans la session ou non ; la transition oui → non, elle, fonctionne. `specs/04_indices-commandes.md`/`specs/04_stations-proportions-collision.md` restent non injectées, ce diagnostic passe avant.

### (a) Cause racine confirmée par lecture — H1

Le tableau clinique (entrées manette/clavier mortes, jeu figé, souris vivante) pointe une exception non rattrapée dans `creerBoucle#frame` (`render.js:58-66`) : `maj(delta)` lève → ni `dessiner()` ni le `requestAnimationFrame(frame)` suivant ne s'exécutent → la boucle ne se replanifie plus. La manette/le clavier sont morts parce que leur lecture est intégralement interne à `maj()` (polling, pas d'évènements DOM) ; la souris reste vivante parce que le bouton "Musique" du menu répond à un `click` DOM (`ui/menu.js:291`) — indépendant du `requestAnimationFrame` — mais le geste manette passe, lui, par le verbe `ATTACK` traité à l'intérieur de `maj()`. **H1 confirmée** : `armerAudio` (le "premier geste") et la reprise depuis le menu n'étaient pas le même chemin. `armerAudio` créait `contexteSynthese`/`gainSynthese` dans `demarrerSynthese`, appelée seulement `si actif` ; le menu appelait une fonction de reprise (`reprendreSynthese`) qui *supposait* ces deux variables déjà non-nulles, sans jamais les créer elle-même.

**La ligne fautive** (`src/audio.js`, version livrée par `MT_musique-ambiance-synth`) :
```js
function reprendreSynthese(piste) {
  gainSynthese.gain.setTargetAtTime(piste.volume, contexteSynthese.currentTime, 0.05); // ← gainSynthese peut être null ici
  jouerPhraseSynthese(piste);
}
```
`gainSynthese` reste `null` chaque fois que `modeActuel` passe à `'synthese'` sans que `demarrerSynthese` ait tourné — ce qui arrive dans deux scénarios réels, tous deux réunis par la même course : le repli fichier→synthèse (asynchrone, sur l'évènement `error` de l'`<audio>` `piano_solo.mp3`, absent) ne démarre la synthèse que `si actifCourant` **au moment où l'erreur arrive** — pas au moment où le réglage était vrai plus tôt.
- **Cas 4 du ticket** (réglage persisté "non") : `armerAudio(..., actif=false)` au boot → `actifCourant=false` dès le départ → quand l'erreur de chargement arrive, le repli bascule `modeActuel` sur `'synthese'` sans jamais appeler `demarrerSynthese`.
- **Cas 3 du ticket** (réglage "oui" au boot, coupé juste après) : `armerAudio(..., actif=true)` → l'erreur n'est pas encore arrivée quand Xav appuie "non" (`definirMusiqueActive(false)` met `actifCourant=false`) → quand l'erreur arrive enfin, `actifCourant` est déjà retombé à `false` → même résultat : `modeActuel='synthese'`, `gainSynthese` toujours `null`.

Dans les deux cas, le bascule suivant vers "oui" appelle `reprendreSynthese` sur un `gainSynthese`/`contexteSynthese` jamais créés → `TypeError: Cannot read properties of null (reading 'gain')`. H2/H3/H4 écartées (aucun nœud redémarré après `stop()`, aucun `close()`/`suspend()` du contexte, aucun planificateur à état persistant entre coupures — le bug est plus en amont : le contexte lui-même n'existe jamais). H5 (le menu) écartée : le bouton lui-même ne fait qu'appeler `basculerMusique()`, aucune logique propre.

### Test rouge → vert (`tests/test_sd_musique_freeze_reprise_2026-09-17.js`, nouveau)

`audio.js` reste importable en Node (aucun accès `AudioContext` au niveau module) mais `demarrerSynthese`/`creerElementFichier` touchent `window.AudioContext`/`Audio` — un `AudioContext`/`Audio` factices minimaux (classes triviales : `createGain`/`createOscillator`/`currentTime`, et un faux `<audio>` qui expose juste de quoi déclencher `error` à la demande) suffisent à reproduire la cause **sans navigateur**, comme demandé par la fiche. Trois blocs : (1) cas 4 — `armerAudio(..., actif=false)` puis bascule "oui" ; (2) cas 3 — reproduction fidèle de la course (`armerAudio(..., actif=true)` → `definirMusiqueActive(false)` → l'échec de chargement arrive seulement *après* → bascule "oui") ; (3) garde-fou (b), un `AudioContext` factice qui lève à `createGain()` sans rapport avec (a). Vérifié rouge avant correctif (`git stash` temporaire de `src/audio.js`, seul fichier touché par le correctif) : le test 1 lève exactement `TypeError: Cannot read properties of null (reading 'gain') at reprendreSynthese`, pile identique à l'analyse ci-dessus. Repassé vert après correctif, stash restauré.

### (a) Correctif (`src/audio.js` uniquement)

Un seul point d'entrée pour démarrer *ou* reprendre la synthèse : `reprendreSynthese` supprimée, fusionnée dans `demarrerSynthese`, qui crée paresseusement `contexteSynthese`/`gainSynthese` s'ils n'existent pas encore (exactement comme au premier geste), sans regarder si c'est un "premier" ou un "n-ième" démarrage. `definirMusiqueActive` appelle désormais cette unique fonction. Effets de bord corrigés au passage, demandés par le §A du ticket : `clearTimeout(minuteurPhraseSynthese)` en tête de `demarrerSynthese` (jamais deux boucles superposées sur un double appel) ; `arreterSynthese` devient un no-op défensif si `gainSynthese` n'existe pas encore (plus de coupure "avant tout démarrage"). Aucun nouvel état global ; le reste du jeu ne connaît toujours que `armerAudio`/`definirMusiqueActive` (noms conservés, cf. journal précédent).

### (b) Garde-fou : l'audio ne fige plus jamais la boucle

`armerAudio` et `definirMusiqueActive` (les deux seuls points d'entrée publics) et le callback de repli fichier→synthèse rattrapent maintenant leurs propres exceptions (`try/catch` local, `console.warn`, le réglage reste appliqué en mémoire même si l'effet audio échoue) — même politique que le fichier absent, déjà dans le contrat. **Pas de `try/catch` global autour de `update()`/`dessiner()`** (aurait aussi masqué de vraies erreurs de gameplay, explicitement écarté par la fiche). Règle documentée dans « Contraintes de méthode non négociables » avec sa provenance ; question de la généraliser à d'autres sous-systèmes meilleur effort posée en `[OUVERT]` pour Xav, pas tranchée ni implémentée au-delà d'`audio.js`.

### Livré

```
node --check src/audio.js
node tools/run_tests.js
```
→ **45 fichiers, tous verts** (44 précédents + le nouveau test rouge→vert ; seul `src/audio.js` modifié parmi les fichiers de production, conformément à la contrainte stricte du ticket).

Fichier modifié : `src/audio.js`. Fichier ajouté : `tests/test_sd_musique_freeze_reprise_2026-09-17.js`. `CLAUDE.md` mis à jour (règle (b) + `[OUVERT]`, ce journal). Fichier archive ajouté : `docs/archives/JOURNAL_2026-09-17_micro-ticket-ambiance-synthetisee.md`, `docs/archives/INDEX.md` mis à jour.

### Point `[OUVERT]`

Nouveau : généraliser le patron "sous-système meilleur effort rattrape ses propres erreurs" au-delà d'`audio.js` (cf. « Contraintes de méthode non négociables » et section `[OUVERT]` consolidée ci-dessus) — remonté à Xav, pas tranché.

### Critère de passage — reste à faire par Xav

Rejouer exactement le parcours qui gelait : boot avec réglage "non" → "oui" à la souris puis à la manette ; "oui" → "non" → "oui" plusieurs fois de suite ; recharger entre deux essais ; laisser tourner 5 min après une reprise (pas d'accumulation de nœuds/oscillateurs). Seulement ensuite, injection de `specs/04_indices-commandes.md`.

### Hors scope pour cette session

Le piano (asset), la qualité des notes, le volume, les indices de commande, les stations — tous explicitement exclus par la fiche.

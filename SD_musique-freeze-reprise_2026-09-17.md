# RPG V2 — Session diagnostic : le jeu gèle quand la musique repasse de « non » à « oui » (2026-09-17)

## Contexte

Retour terrain Xav, 17/09 02:00, navigateur réel, manette + souris, juste après la livraison de `MT_musique-ambiance-synth`. `specs/04_indices-commandes.md` et `specs/04_stations-proportions-collision.md` **ne sont pas injectés** — ce diagnostic passe avant eux.

Observé factuellement, reproduit deux fois :

1. Boot → premier geste → l'ambiance démarre. OK.
2. Menu → « Musique » → non. La musique s'arrête. OK.
3. Menu → « Musique » (en position non) → `A` : **freeze**. Plus rien ne réagit à la manette ni à `Échap` ; la **souris continue de fonctionner** (Xav ferme le menu à la souris), mais le jeu reste figé derrière. Poche et items intacts.
4. Fermer l'onglet, rouvrir : le jeu repart. Le réglage a été **persisté à « non »** : pas de musique au boot. Menu → bouton en position non → clic **souris** → **même freeze**.

Donc : le bug est sur la **transition non → oui**, quel que soit le périphérique, et **que l'audio ait déjà joué ou non** dans cette session de page. La transition oui → non fonctionne.

Ce que la reproduction dit déjà : la souris répond et le menu se ferme → **la page ne tourne pas dans une boucle infinie** (le thread principal serait bloqué et la souris morte). Le tableau — entrées manette/clavier mortes, jeu figé, souris vivante — est celui d'une **exception non rattrapée dans la boucle de jeu** (`requestAnimationFrame` / `update`) qui ne se replanifie plus. Le premier geste de la session est de **lire la console** : l'erreur y est presque certainement.

## Hypothèses à trancher (ne pas deviner en silence)

- **H1 — Le chemin « reprise depuis le menu » n'est pas le chemin « démarrage au premier geste ».** Au boot, `jouerMusique` passe par l'initialisation sur geste (création/`resume` de l'`AudioContext`, création du séquenceur). Depuis le bascule du menu, on appelle une fonction de reprise qui suppose un état déjà initialisé (contexte, nœuds, planificateur) — ou l'inverse, réinitialise par-dessus l'existant. Le cas 4 (aucun audio jamais joué, puis « oui » → freeze) pointe fortement ici : le bascule devrait être **le premier geste audio** de la page et ne l'est pas.
- **H2 — Nœud Web Audio redémarré après `stop()`.** `OscillatorNode`/`AudioBufferSourceNode` ne se démarrent qu'une fois ; `couperMusique` les arrête, `jouerMusique` rappelle `start()` sur les mêmes → `InvalidStateError`. Explique le cas 3, pas le cas 4 à lui seul (sauf si le boot en « non » crée et arrête des nœuds).
- **H3 — `AudioContext` fermé ou suspendu à la coupure**, puis réutilisé : `close()` est définitif, `suspend()` sans `resume()` avant de planifier des notes = temps figé, et le planificateur qui calcule « prochaine note » sur `context.currentTime` produit un état incohérent qui lève.
- **H4 — Le planificateur lève à cause du temps écoulé pendant la coupure** : `prochaineNote` est resté à une valeur passée ; à la reprise, une division/index sur la séquence (`notes[i]` hors borne, `duree_beats` d'un silence) plante.
- **H5 (à écarter, pas à présumer) — Le menu lui-même.** Le bascule fonctionnait avant le module et la transition oui → non fonctionne ; le bug survient à la souris comme à la manette. Si la console montre une erreur hors `audio.js`, on réévalue — sinon H5 est morte.

Deux causes racines à séparer ensuite, elles n'ont pas le même remède :
- **(a)** la cause de l'exception (une des H1–H4) ;
- **(b)** le fait qu'une exception audio **tue la boucle de jeu**. L'audio est explicitement « meilleur effort » dans le contrat (fichier absent → le jeu tourne sans son). Une erreur dans `audio.js` ne doit **jamais** arrêter `update()`/`dessiner()`. (b) est un défaut de robustesse indépendant de (a).

## Méthode de diagnostic attendue

1. Reproduire le cas 4 (réglage persisté « non », premier clic « oui ») en navigateur, console ouverte : relever l'exception exacte, sa pile, et **d'où** elle est appelée (bascule du menu → `audio.js` → quelle fonction).
2. Lire `audio.js` : tracer les deux chemins, « premier geste » et « bascule menu », et lister ce qu'ils initialisent chacun. Confirmer H1–H4 par lecture + console, pas par intuition.
3. Écrire un **test rouge headless** sur la partie pure de `audio.js` (état du module, machine à états démarrer/couper/reprendre, résolution de piste) avec un `AudioContext` factice minimal : séquence `boot(reglage=non) → jouer → couper → jouer` et `jouer → couper → jouer`. Le test doit rougir sur la cause (a) avant correction. Si la cause n'est pas isolable hors navigateur (pur Web Audio), le dire, et documenter le protocole manuel comme test.
4. Trancher (a), corriger, revenir vert. Puis (b), séparément.

## Détail par sujet

### A. Cause de l'exception à la transition non → oui
- Correction : **un seul chemin** de démarrage, appelé aussi bien par le premier geste que par le bascule — le bascule *est* un geste utilisateur, il doit pouvoir créer/reprendre l'`AudioContext` comme le boot. Nœuds recréés à chaque démarrage, jamais redémarrés ; coupure = `stop` + release, pas `close()` du contexte ; planificateur réinitialisé à la reprise (`prochaineNote = currentTime + epsilon`).
- Pas de nouvel état global ; l'état du module reste dans `audio.js`, le reste du jeu ne connaît toujours que `jouerMusique(id)`/`couperMusique()`.
- Test : celui de l'étape 3, vert ; `test_phase2_*` audio existant vert.

### B. Une erreur audio ne doit pas figer le jeu
- Correction : `jouerMusique`/`couperMusique` **rattrapent leurs propres erreurs** (avertissement console, état « audio indisponible », le jeu continue) — au niveau `audio.js`, pas dans le menu ni dans `main.js`. Même politique que le fichier absent.
- **Ne pas** généraliser à un `try/catch` global autour de `update()`/`dessiner()` : masquer les erreurs de gameplay serait pire que le freeze. Si Claude Code juge qu'une règle générale « la boucle survit aux erreurs des sous-systèmes meilleur effort » mérite d'exister, le proposer en `[OUVERT]` pour Xav, ne pas l'implémenter.
- Test : bascule avec un `AudioContext` factice qui lève à `start()` → aucune exception ne sort de `audio.js`, le réglage « oui » est tout de même persisté, un avertissement est émis.

### C. Journal
Consigner en fin de session : hypothèse confirmée, la ligne fautive, ce que le test rouge prouvait, et la règle (b) dans `CLAUDE.md` — avec sa provenance (ce diagnostic), conformément au format du ménage en cours (`docs/archives/`, journal précédent archivé d'abord si le ménage a déjà été livré).

## Contraintes non négociables

Cause racine avant patch — pas de `try/catch` posé « pour voir » avant d'avoir lu l'erreur. `audio.js` reste importable en Node (aucun accès `AudioContext` au niveau module). Aucun changement dans le menu, `input/`, `save.js`, ni les données hors `music.json` si la résolution de piste est en cause. Commentaires en français, *pourquoi* pas *quoi*. Toute la suite verte (`node tools/run_tests.js`, `node --check src/audio.js`).

## À la fin de la session

Rapporter (1) l'erreur console exacte, (2) l'hypothèse confirmée pour (a), (3) le correctif (a) et le garde-fou (b), (4) tests rouge → vert, (5) ce que Xav doit rejouer : boot avec réglage « non » → « oui » à la souris puis à la manette ; « oui » → « non » → « oui » plusieurs fois de suite ; recharger entre deux ; laisser tourner 5 min après une reprise (pas d'accumulation de nœuds). Seulement ensuite, injection de `specs/04_indices-commandes.md`.

## Hors scope explicite

Le piano (asset), la qualité des notes, le volume, les indices de commande, les stations.

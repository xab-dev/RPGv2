## Journal de session — Indices de commande (2026-09-17)

Ménage de journal effectué en début de session (avant tout code) : le journal précédent (« Diagnostic freeze bascule Musique non→oui ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_diagnostic-freeze-musique.md`, `docs/archives/INDEX.md` mis à jour, décisions/dette/`[OUVERT]` déjà consolidés dans les sections dédiées de ce fichier (voir table de décisions et la ligne "Fusion `demarrerSynthese`/`reprendreSynthese`..."). `node tools/run_tests.js` rejoué avant toute modification : 45 fichiers, tous verts (préalable exigé par Xav avant d'ouvrir `specs/04_indices-commandes.md`).

Brief : `specs/04_indices-commandes.md` v1.0.0. Livre les 3 déclencheurs de la Grotte (MOVE à la prise de contrôle, INTERACT au levier de la salle 1, ATTACK au premier monstre engagé) et l'infrastructure généralisée (catalogues `hints.json`/`glyphes.json`, un ajout futur — SKILL_1 en Phase 4, CONSUME en Phase 3 — n'exige qu'une entrée JSON de plus).

### Décisions prises pendant l'implémentation

- **Périphérique actif exposé par `src/input/input.js`** (§2 de la fiche demandait explicitement "un seul endroit, jamais lu ailleurs que par ce module") : un loquet `peripheriqueActif` (`'clavier' | 'manette' | 'tactile'`), même patron que le loquet `tactileActif` déjà existant. Priorité arbitraire en cas d'égalité sur une même frame (clavier > manette > tactile, documentée en commentaire — jamais observée en jeu réel, deux humains ne bougent pas à la même milliseconde). Défaut au boot = `'manette'` (§0 verrouillé : "PC à la manette" est la plateforme de référence).
- **Géométrie de déclenchement INTERACT/ATTACK réutilise des constantes déjà existantes** plutôt que d'en introduire de nouvelles : `DISTANCE_INTERACT_PX` (déjà dans `main.js`) et `DISTANCE_ENGAGEMENT_PX` (déjà dans `companion.js`, désormais exportée) — "même seuil que puzzles.js"/"même seuil que l'engagement du follet" pris au pied de la lettre, une seule source de vérité chacun.
- **Tout texte de glyphe passe par `t()`**, y compris une lettre isolée ("A", "F"...) : la contrainte "zéro chaîne en dur" du projet est absolue ("tout texte visible"), pas limitée aux phrases — `glyphes.json` ne stocke donc que des clés i18n (`clavier_key`/`manette_key`/`tactile_key`), jamais de texte littéral, même pour un glyphe identique FR/EN aujourd'hui.
- **`glyphes.json` peuplé pour les 8 verbes dès cette livraison** (pas seulement les 3 utilisés par les déclencheurs actuels) : c'est un catalogue de données pur, sans coût de code, et la fiche demande explicitement qu'un futur indice (SKILL_1, CONSUME) n'ajoute qu'une entrée `hints.json` — encore faut-il que le glyphe existe déjà. `hints.json`, lui, reste strictement aux 3 entrées du scope (§8 : hors scope pour cette itération).
- **Déclenchement en "niveau" plutôt qu'en front montant** : le gameplay rappelle `declencherVerbeUtile(verbe, flags)` à CHAQUE frame où la condition est vraie (hero à portée, monstre engagé...), jamais une seule fois sur un changement d'état. `hints.js` gère lui-même l'idempotence (flag déjà posé, ou un autre indice déjà affiché) — plus simple qu'une détection de front dans `main.js`, et résout naturellement "un seul indice à la fois, le second attend la fin du premier" (§3) : le rappel continu retente automatiquement dès que `actif` redevient `null`.
- **Edge case "verbe émis avant le déclencheur" (§4)** : `verbeEmis()` pose le flag immédiatement même si aucun indice n'a jamais été affiché — testé explicitement (test (c)).

### Fichiers livrés

```
src/hints.js                  (nouveau — pur, testé)
src/ui/hud_hints.js           (nouveau — calque canvas, jamais exercé headless)
src/input/input.js            (peripheriqueActif(), même patron que tactileActif())
src/companion.js              (DISTANCE_ENGAGEMENT_PX exportée, aucun changement de valeur)
src/schemas.js                (SCHEMAS.hints/glyphes + validerHint/validerGlyphe + VERBES_GAMEPLAY)
src/main.js                   (creerEtatIndices, verifierIndicesNiveau(), verbeEmis aux 3 points
                               d'émission, dessinerHudHints() dans dessiner(), reconstruction dans
                               reinitialiserPartie(), accesseur test obtenirIndiceAffiche())
data/hints.json, data/glyphes.json  (nouveaux catalogues)
data/flags.json               (flag_hint_move/interact/attack)
locales/fr.json, en.json      (hint.*, glyphe.*, flag.hint_*)
docs/CHECKLIST_visuelle.md    (état 24 ajouté — non encore capturé, cf. plus bas)
tests/test_hints_2026-09-17.js (nouveau)
```

### Testé (automatisé)

`tests/test_hints_2026-09-17.js` : (a) déclencheur → indice affiché une fois, flag posé ; (b) rechargement (nouvel état `hints.js`, flags déjà posés) → pas de second affichage ; (c) verbe émis avant le déclencheur → jamais affiché, flag posé quand même ; (d) glyphe = celui du périphérique actif, mis à jour à chaque appel (pas figé à l'affichage) ; durée + fermeture anticipée par émission + un seul indice à la fois (le second attend, testé explicitement) ; (e) catalogue invalide refusé au boot (verbe inconnu, hint sans glyphe pour son verbe, glyphe incomplet). Une seconde partie rejoue le chemin critique réel de la Grotte sur `creerOrchestrateurGrotte` (même patron que `test_phase1_sd_audit_chemin_critique`) : confirme sur le VRAI jeu que `flag_hint_move` se pose au tout premier `maj()` hors UI après l'intro, `flag_hint_interact` à portée du levier AVANT tout appui, `flag_hint_attack` à l'entrée en distance d'engagement AVANT toute frappe, et que chaque indice se ferme dès l'émission du verbe.

```
node --check src/hints.js src/ui/hud_hints.js src/input/input.js src/companion.js src/schemas.js src/main.js
node tools/run_tests.js
```
→ **46 fichiers, tous verts** (45 précédents + `test_hints_2026-09-17.js`).

### Non vérifié — reste dû à Xav (rendu canvas jamais exercé headless)

Cette session n'a **aucun accès navigateur** : tout ce qui suit est fait et testé côté logique, mais **non validé visuellement**, à ne pas présenter comme acquis avant que Xav l'ait rejoué :
- **`docs/CHECKLIST_visuelle.md`, état 24 (nouveau)** : bannière glyphe+mot, position sous le cartouche PV, fondu en entrée/sortie, disparition à l'appui/expiration — jamais capturée en navigateur réel.
- **`main.js#dessiner()` a été touché** (ajout de `dessinerHudHints()`) : par la règle de méthode du projet, **les états 1-23 de la checklist doivent aussi être rejoués**, pas seulement le nouveau, même si ce ticket ne "devrait" toucher que l'affichage des indices.
- **Durée d'affichage (2500ms) et position de la bannière** : valeurs provisoires, jamais ressenties en jeu.
- **Glyphes clavier "ZQSD/WASD"** : `keyboard.js` mappe en réalité `KeyW/KeyA/KeyS/KeyD` (codes physiques, disposition réelle du clavier de Xav inconnue) — la fiche autorise explicitement ce flou (§6 : "ne pas décider de la disposition clavier si le socle ne l'expose pas"), Xav juge si le texte affiché lui convient tel quel.
- **Hot-swap manette → clavier pendant qu'un indice est affiché** : le glyphe doit changer sans fermer l'indice (logique testée headless via `indiceAffiche()`, jamais vu à l'écran).

### Points `[OUVERT]`

Aucun nouveau. La détection de disposition clavier (ZQSD vs WASD) reste explicitement hors scope par la fiche elle-même (§8), pas un point que cette session tranche en silence.

### Hors scope pour cette session

Page "Commandes" dans le menu (§8, alternative écartée par Xav), remappage des touches, indices pour SKILL_*/CONSUME (leurs phases respectives), détection de la disposition clavier, vérification réelle des glyphes tactiles (dette tactile jusqu'à la Phase 4).

# RPG V2 — Micro-Ticket : contraste et durées des phases jour/nuit (2026-09-16, v1.1)

## Objectif

Verdict Xav (critère de passage Phase 2, point 3, rejoué à la manette le 2026-09-16) : les **sources de lumière sont bonnes** (halo du follet, fenêtre de la maison, grotte) et ne changent pas. Ce qui manque, c'est le **contraste entre les phases** : la nuit n'est pas assez sombre et le jour pas assez clair, la différence « n'est pas flagrante ». Les niveaux sont marqués provisoires dans `daynight.js` — c'est leur premier réglage au ressenti.

**Ajout v1.1 (verdict Xav sur la durée, même jour)** : le cycle n'est plus un `DUREE_CYCLE_MS` unique découpé en phases égales — chaque phase a sa **durée propre** : **jour 10 min, crépuscule 1 min 30, nuit 4 min, aube 1 min 30** (17 min au total). Ordre de grandeur souhaité, valeurs non figées.

## Cible

- Fichier : `src/daynight.js` — les 4 constantes de phase (jour / crépuscule / nuit / aube) et leur niveau d'obscurité cible.
- Fichier : `tests/test_phase2_daynight_2026-09-16.js` — si des valeurs numériques y sont en dur, les adapter (les assertions de forme — monotonie, pause sous UI, interpolation — ne changent pas).

## Consigne précise

1. **Jour = 0 exactement.** Vérifier la valeur actuelle de la phase jour. Si elle est déjà `0`, ne rien changer côté jour et le dire en fin de session (le « jour plus lumineux » relèverait alors de la palette des tuiles — hors scope ici, à remonter). Si elle est > 0, la passer à `0` : de jour, `dessinerObscurite` ne doit produire aucun voile.
2. **Nuit : un cran plus sombre.** Monter le niveau nuit d'environ **+0,10 à +0,15** par rapport à la valeur actuelle, sans dépasser `OPACITE_OBSCURITE_MAX` (le plafond de la grotte reste la référence unique de « noir jouable » — ne pas créer un second plafond). Le halo du follet doit rester le repère principal, comme en grotte.
3. **Crépuscule et aube** : les recaler pour rester monotones entre jour et nuit (aucune phase intermédiaire ne doit être plus sombre que la nuit ni plus claire que le jour), en gardant l'interpolation linéaire existante. Valeur indicative : environ un tiers du niveau nuit pour le crépuscule, deux tiers pour l'aube — provisoire, Xav ajuste au ressenti.
4. Chaque constante modifiée garde son commentaire *pourquoi* et sa mention **provisoire**, avec la date du réglage et « réglé au ressenti Xav ».
5. **Durées par phase.** Remplacer la durée globale par une durée par phase, portée par la même table de constantes que le niveau d'obscurité (une phase = `{ duree_ms, obscurite }`, un seul endroit). Valeurs : jour `600000`, crépuscule `90000`, nuit `240000`, aube `90000`. `DUREE_CYCLE_MS` devient la somme calculée, plus une constante saisie. `save.monde.heure` reste une position dans le cycle, en ms : si sa sémantique change (ex. avant en fraction 0–1), migrer proprement, jamais réinterpréter une sauvegarde existante en silence.
6. L'interpolation reste linéaire **à l'intérieur** des phases de transition (crépuscule, aube) ; jour et nuit sont des plateaux — Xav veut une nuit franche de 4 minutes, pas une nuit qui n'est « pleine » qu'un instant.

## Contrainte stricte

Ne toucher qu'aux deux fichiers listés. Aucun changement dans `render.js#dessinerObscurite`, `lumieres[]`, `rayon_lumiere` des follets, la fenêtre de la maison, `main.js#dessiner()`, ni dans les données JSON. Commentaires en français, *pourquoi* pas *quoi*. Un seul mécanisme d'assombrissement (scène affichée dérivée), comme documenté au journal Phase 2.

## Test de validation

Automatisé : `node tools/run_tests.js` toute la suite verte ; `node --check src/daynight.js`.

Automatisé (suite) : `test_phase2_daynight` prouve la somme des durées, les plateaux jour/nuit et une transition qui n'excède jamais le niveau nuit.

Manuel (Xav, navigateur réel, manette) : forcer l'heure aux 4 phases comme lors de la vérification agent (état nuit de `docs/CHECKLIST_visuelle.md`). Attendu : de jour, aucune différence avec le rendu actuel hors cycle ; de nuit, la scène est nettement plus sombre qu'aujourd'hui, le halo du follet et la fenêtre restent lisibles tels quels ; le passage jour → crépuscule → nuit → aube → jour est progressif, sans à-coup. Verdict Xav sur les nouvelles valeurs.

## Hors scope

Indicateur jour/nuit au HUD (`[OUVERT]`), palette des tuiles de jour, lumières statiques supplémentaires, obscurité de la grotte.

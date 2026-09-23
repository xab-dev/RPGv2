---
projet: RPG V2
episode/session: Spec 10, palier A — la stat d'alignement
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 10, palier A (23/09)

Demande de Xav : « lis `specs/10_alignement-follet.md` en entier puis procède ».
La spec se joue **un palier par session** : celle-ci livre le **palier A** (la
stat, sa sauvegarde, son écriture unique, l'instrument `?alignement=N`), **aucun
effet en jeu**. B (l'orbite, `D-53`) et C (les régimes) sont des sessions à part.

Branche `alignement-2026-09-23`, partie de `main`. Pas de push.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `7a18bad` | Spec 10 versionnée | Le fichier était présent, non suivi : versionné tel quel, v1.0.0 |
| `262be07` | Ménage | Journal Doc-1 archivé, ligne INDEX ; `Q-85` à `Q-89` ouvertes (les cinq `[OUVERT]` du §10 de la spec) ; `D-53` rattachée au palier B ; `CLAUDE.md` : la spec 10 absorbe la session « Instrument » |
| (3) | Spec 10, palier A | `alignement.js`, `alignement.json` + schéma, sauvegarde v8, `modifierAlignement`, `?alignement=N`, ligne du relevé `?debug=fps`. Suite : **154 fichiers verts** |

## Ce qui a été fait

- **`src/alignement.js`**, pur : `regime` (LE calcul), `borner`, `appliquerDelta`
  (rend l'écart réel), `lireAlignement` (absence ou hors bornes = exception,
  jamais 0), `lireAlignementForce` (patron de `?echelle`).
- **`data/alignement.json`** : bornes, paliers, `orbite.duree_inversion_ms`
  (lu au palier B), `poids_defaut` (lu par la spec 11). Validé au boot.
- **Sauvegarde v8** : `saveNeuve` et la migration 7 → 8 écrivent `alignement: 0`
  explicitement ; cinq tests épinglaient `VERSION_SCHEMA_COURANTE = 7`, passés à 8.
- **`main.js`** : `modifierAlignement(delta, source)` et `etatAlignement()` dans
  l'orchestrateur (exposés) ; dans `demarrerJeu`, la vérification au boot (écran
  d'erreur) et la lecture de `?alignement=N`, passé à l'orchestrateur.
- **Relevé `?debug=fps`** : dernière ligne `alignement : … — régime …, palier …`.

## Écarts à la spec, tous dits

- **Paliers « dès »** au lieu de « jusqu'à » + `bande_morte` → `Q-90`.
- **`alignement.json` est un tableau à une entrée** : le registre l'impose → `Q-90`.
- **`ui/hud_debug.js` touché** (liste « ne touche pas `ui/` ») pour que le relevé
  montre la ligne → `Q-91`.
- `lireAlignementForce` vit dans `alignement.js` et pas dans `debug_perf.js` :
  il a besoin des bornes des données, et c'est le module de la stat.
- Sous `?alignement=N`, une écriture atteint quand même la sauvegarde ; la valeur
  forcée ne fait que la **masquer** pour la session.
- **« Test rouge d'abord »** : le test a été écrit **après** le code, dans la même
  session. Il n'a pas été vu rouge sur l'ancien code (il y importe un module qui
  n'existait pas).
- Sauvegardes réelles absentes : la spec dit « échec dit, pas un vert » ; `D-15`
  dit « passer sans échouer ». Retenu : le test **passe et écrit « NON ÉPROUVÉ »**.

## Vérifié sous Chrome (sans fenêtre, `tools/capture_chrome.mjs`)

Sauvegarde v7 sans le champ → relevé `alignement : 0 — régime neutre, palier 0` ·
`?alignement=-3` → `-3 (forcé par ?alignement) — régime negatif, palier 2` ·
`?alignement=9` → avertissement en console, 0 · sauvegarde v8 **privée** du champ →
écran « Erreur au démarrage : sauvegarde : hero.alignement absent… ». Aucune
erreur console. Le scénario n'a pas été versionné (scratchpad).

## Ouvert pour Xav

- `V-101` : regarder en jeu, sur ta vraie sauvegarde.
- `Q-85` à `Q-91`.
- Suite : **palier B** (l'orbite inversée et `D-53`), une session à lui.

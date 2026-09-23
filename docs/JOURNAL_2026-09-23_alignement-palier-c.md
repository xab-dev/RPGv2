---
projet: RPG V2
episode/session: Spec 10, palier C — les régimes de synergie
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 10, palier C (23/09)

Demande de Xav : « V-102: all checked, all good. go C ». Le palier C livre les
**régimes de synergie** : la table de la spec §4.2, en données, relue à chaque
frame. Dernier palier de la spec 10.

Branche `alignement-2026-09-23` (suite). Pas de push.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| (1) | Ménage | Journal du palier B archivé, ligne INDEX ; `V-102` close sur le verdict de Xav |
| (2) | Spec 10, palier C | Les régimes de synergie, en données. Suite : **156 fichiers verts** |

## Ce qui a été fait

- **Test écrit d'abord**, vu rouge (module sans `modificateursDeriveesHeros`).
- **`synergies.json`** : chaque synergie porte `regimes.positif` (l'ancienne paire
  `effet_joueur` / `effet_monstre`, valeurs identiques) et `regimes.negatif`,
  la table de la spec §4.2. Une entrée peut porter `par_palier` (× le palier) et
  `multiplicateur` (× un nombre fixe : Terre négatif, entrave × 0,5).
- **`status_effects.json`** : cinq effets de plus — `dot_brulure_heros`,
  `controle_entrave_heros`, `debuff_lenteur_heros`, `buff_cadence_heros`,
  `controle_acceleration`. Un effet peut viser une **dérivée** (`derivee`).
- **`status.js#resoudreSynergie`** : LE point de résolution ; `modificateursHeros`,
  `modificateursDeriveesHeros`, `dotsHeros`, `statsEffectivesMonstre` le lisent
  tous. Régime neutre par défaut : les appelants d'avant obtiennent le jeu d'avant.
- **`main.js`** : le régime courant passe aux stats du héros, aux dérivées (après
  la formule de `D-141`), aux monstres ; `auraOccupee` calculée par frame ; la
  brûlure du héros tiquée comme celle d'un monstre, sur `pv` seulement.
- **Schéma** : un régime manquant, un effet inconnu ou rangé du mauvais côté,
  une dérivée inconnue tombent au boot.

## Écarts et choix, dits

- Régimes dans `synergies.json`, `resoudreSynergie` dans `status.js`, neutre =
  positif × 1 → `Q-93`.
- Brûlure et entrave du héros **en combat seulement** → `Q-94`.
- Terre « ÷ 2 » lu comme **ralentissement** divisé par deux → `Q-95`.
- Trois clés de localisation ajoutées (exception) → `Q-96`.
- Toutes les valeurs négatives au jugé → `Q-97`.
- Un test d'avant ajusté : `test_phase1_status_synergies` (ses fixtures décrivent
  désormais une synergie à régimes, négatif vide ; le contrat est inchangé).
- L'écran Stats ne montre pas les dérivées modulées par Eau négatif : il ignorait
  déjà le modulateur de survie, il reste cohérent avec lui-même.

## Vérifié sous Chrome (sans fenêtre)

Les trois follets à `-3` et `+3` dans la Maison, héros en marche : ~60 fps,
relevé juste, aucune erreur console. Le ressenti du combat ne se juge pas en
capture.

## Ouvert pour Xav

- `V-103` ; `Q-92` à `Q-97` (et `Q-85` à `Q-91` d'avant).
- La spec 10 est livrée. Suite (CLAUDE.md) : la **spec 11**, dialogues à
  conséquences — **à écrire** avant tout code.

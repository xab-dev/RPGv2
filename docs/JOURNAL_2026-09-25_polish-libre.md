---
projet: RPG V2
episode/session: Sentinelle, puis polish libre (harmonisation, incohérences)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : sentinelle et polish libre (25/09, après-midi)

Demande de Xav : « Avant de rajouter des petits contenus comme des armes ou
des contenus un peu plus gros, comme le jardinage, et de continuer vers
l'annexe 2, j'aimerais qu'on fasse : 1. test sentinelle ; 2. polish libre /
harmonisation / détection d'incohérence ».

Branche `polish-libre-2026-09-25`, partie de `main`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `ed24e23` | Ménage | Le journal de la profondeur archivé, INDEX à jour |

## 1. La sentinelle (`traversee_nuit.mjs`, Moyen, ×1 et ×6)

La première mesure depuis que les arbres se posent à chaque frame (`D-222`).
Chrome sans fenêtre, 1920 × 1080, DPR 1. Référence : le dernier banc complet
(`docs/archives/JOURNAL_2026-09-25_annexe1-nuit.md` §4).

| Moyen | ×1 (référence → aujourd'hui) | ×6 (référence → aujourd'hui) |
|---|---|---|
| `dessiner()` moyen | 0,49 → **0,60** ms | 3,77 → **4,51** ms |
| `maj()` moyen | 0,13 → **0,18** ms | 0,95 → **1,15** ms |
| reconstruction du calque, moy / max | 0,66 → **0,75** / 10,3 ms | 3,45 → **4,23** / 7,1 ms |
| frames > 20 ms (instrument) | 0 → **0** / 4 442 | 1 → **1** / 4 441 |
| entrée en scène de la Maison | — → 20,7 ms | — → 21,2 ms (plafond 40) |

- **Rien de cassé.** Toujours 0 frame lente à ×1, 1 à ×6 ; `dessiner()` sous
  ×6 prend 4,5 ms d'un budget de 16,7.
- **Tout monte d'environ 20 %**, `maj()` compris. Le plus probable : le prix de
  la profondeur (les arbres sortis du calque et triés à chaque frame, `D-222`)
  et de la forme de collision des arbres (`D-224`). **Non prouvé** : seul un
  passage A/B sur `8aed350` (avant la profondeur) le dirait. Pas lancé
  (`Q-159` : on avance) ; à faire au prochain banc complet si Xav le veut.
- Premier lancement raté : le serveur local ne tournait pas (la page d'erreur
  n'a pas d'IndexedDB). Relancé avec `node serveur_local.js`.

## 2. Diagnostic du polish

Suite verte (210 fichiers). Captures : `polish_libre_24.mjs` (suffixe `d25`) et
`profondeur.mjs` (dossier `docs/captures/scenarios/polish-libre-2026-09-25/`).

**Sain, vérifié** : les locales FR/EN ont les mêmes 452 clés et les mêmes
marqueurs ; aucune chaîne en dur hors de l'outil de debug ; aucun commentaire
en anglais ni `TODO` ; les 123 visuels du catalogue sont tous cités ;
l'arborescence de `CLAUDE.md` correspond à `src/` ; à l'écran, la typographie
tient la règle du 24/09 (les chiffres en linéale), la profondeur tient dans la
forêt.

**Incohérences trouvées** :

1. **Des dates au futur** : « 26/09 » dans `CLAUDE.md`, le suivi, la spec 14
   et l'INDEX (validation de la spec 14, `D-216`, `D-217`, `V-156`…). Le
   journal de Git dit que tout s'est passé le 25/09. Les journaux archivés
   gardent l'erreur (verbatim).
2. **Une clé de localisation morte** : `menu.follet_actuel`, remplacée au
   palier I par `menu.follet_avec_toi`.
3. **`D-29`** : `image-rendering: pixelated` toujours dans `index.html`.
4. **`D-44`** : la langue choisie n'est pas sauvegardée, alors que la musique
   l'est.
5. **`<html lang>` reste `fr`** quand le jeu parle anglais.
6. **`D-41`** : `status_effects.icone`, requis par le schéma, lu par personne.
7. **`D-10`** : l'aide de la Construction montre les glyphes de la manette
   quel que soit le périphérique.

**Pour Xav, sans y toucher** (ce n'est pas à Claude de trancher) :

- `D-46` (deux fonctions mortes et leur test historique) : « retire » ou
  « garde », ta ligne l'attend.
- **Des lignes `Q-` au statut périmé** : `Q-138` à `Q-145`, `Q-147`, `Q-148`,
  `Q-153` disent encore « à appliquer (palier …) », alors que les paliers de la
  spec 14 sont livrés et validés. Seul toi clos une `Q-`.
- `CLAUDE.md` dit « il ne reste que `main` » ; la branche locale `profondeur`
  existe encore (entièrement dans `main`, gardée à ta demande).

## 3. Plan

Un commit par ticket, dans cet ordre, chacun retirable seul : (1) les dates,
(2) la clé morte `D-225`, (3) `D-29`, (4) `D-44`, (5) `<html lang>` `D-226`,
(6) `D-41`, (7) `D-10`.

## 4. Itération

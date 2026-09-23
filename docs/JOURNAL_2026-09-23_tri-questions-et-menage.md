---
projet: RPG V2
episode/session: Tri des questions ouvertes, quatre tickets, ménage du dépôt
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : tri des questions et ménage du dépôt (23/09)

Session ouverte par un retour de Xav sur le Galaxy A04 (joystick tactile), puis
conduite question par question sur `docs/DOC_suivi-dettes.md` : Xav tranche, Claude
consigne, et quand une réponse appelle du code, c'est un ticket et un commit. Se
termine par le ménage du dépôt, en trois étapes (diagnostic, propositions, examen
par Xav). Critère posé par Xav (`Q-20`) : **les fondations se closent avec cette
session**.

Écart de méthode à consigner : le **ménage de journal de début de session n'a pas
été fait** en ouvrant la session ; il est rattrapé par le point 5 du ménage.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `420662b` | `D-137` | La bande qui capte le joystick tactile passe de la moitié gauche (240) à un tiers (160). Diagnostic de la vitesse ressentie (centre FIXE du joystick) consigné en `D-138`, non corrigé |
| `8e90936` | `Q-10` | « Ouvert = état ET visible » promu en contrainte de méthode dans `CLAUDE.md` |
| `3c5a0f8` | `Q-11`, `D-12` | Sans objet : la pile unique du menu (`specs/08`) a fait la refonte ; `D-11` reste gelée |
| `d70f519` | `Q-12` | « Meilleur effort » seulement pour ce dont l'absence est tolérable ; jamais le gameplay ni la sauvegarde. Ouvre `D-139` (échec de sauvegarde muet) |
| `61805e1` | `Q-24`, `Q-25` | Politique navigateurs close jusqu'à nouvel ordre ; conseil au joueur résolu par les réglages graphiques |
| `eee78f6` | `Q-20` … `Q-36` | Six questions closes, `Q-35` gelée |
| `c4ec9a4` | `D-140` | Vitesse : `{ 80, +3 / point d'agilité }` au lieu de `{ 75, +4 }` — même départ (95 px/s), pente réduite |
| `873582a` | `D-141` | Force → dégâts d'attaque (formule identité), Esprit → réserve d'esprit (anticipée, 10/point) ; test : toute stat a une dérivée |
| `4c322ee` | `Q-37` | Une condition de lieu reste une valeur nommée, aucun format de plus |
| `05571c6` | `D-142` | Toucher le follet = `target_next` (zones tactiles qui suivent le monde) ; le rappel du follet parti trop loin tombe de la règle existante |
| `e3c845a` | `Q-48` … `Q-64` | Réponses de Xav consignées ; `D-143` (clic au stick droit) et `D-144` (Moyen trop chargé) ouvertes gelées |
| `9463024` | `D-145` | Jeter depuis la Poche (Y, ⌫, bouton) ; 5 objets par tuile (`conteneur_sol`), repris un par un sans XP, hors du semis |
| `fde1e13` | `Q-73` | ⌫ confirmée |
| `f526912` | ménage 1 | `.nojekyll` sans extension |
| `e03f61c` | ménage 4 | 27 lignes closes rangées dans « Clos » |
| `054c7ea` | ménage 5 | Journaux du 22/09 archivés, INDEX à jour, ce journal ouvert |
| `6fecf8c` | ménage 6 | Deux documents de travail archivés ; `MT_ventilation-dessiner` reste dans `docs/` (remis là par Xav le jour même, `DOC-08` : ticket prêt à lancer) |
| `d8fef3c` | ménage 7 | Liens vers les documents archivés réparés (documents vivants seulement ; les specs anciennes restent telles quelles) |
| `7ba5736` | ménage 8 | `CLAUDE.md` de 80 à 38 Ko : en-tête et critère archivés verbatim (`docs/archives/CLAUDE_etat_2026-09-23.md`), 37 décisions du 22/09 versées à `decisions_archives.md`, arbre complété de 9 modules |
| `56165f2` | ménage 9 | Description de `package.json` |
| `f842a1a` | ménage 10 | Trois noms de fichiers sans accents |
| `1506a39` | ménage 11 | Constante morte `ECHELLE_STATION_PROVISOIRE` retirée |
| `d4da6ac` | ménage 12 | `.gitignore` : les sorties de scénarios ne sont plus versionnées (162 images retirées de l'index, gardées sur le disque) |

Poussé sur `main` à deux reprises à la demande de Xav (`3c5a0f8`, puis `9463024`).

## Ménage du dépôt — ce qui a été retenu

Points 1 à 12 retenus par Xav. Les points 2 et 3 (supprimer les branches déjà
fusionnées, locales et distantes) ont été **refusés par le garde-fou de l'outil**
(opération Git destructive) : laissés à Xav, commandes dans le rapport. Point 13
(sauvegardes réelles publiées) : question de Xav, « dossier privé ? », réponse
dans le rapport, rien n'est fait.

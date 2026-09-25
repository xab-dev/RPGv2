---
projet: RPG V2
episode/session: Prologue
type: spec
version: 1.1.0
statut: brouillon
catégorie: Spec
date: 2026-09-23
Ids_suivi: D13① · Q-118 · Q-119 · V-121
genere_par: claude
verifie_par: xav
---

# 12 — Le prologue : quatre écrans avant le symbole

Emplacement : `specs/12_prologue.md`. Branche `prologue`. **Une seule session, un commit par ticket, chacun retirable seul.**

## 1. Pourquoi

Premier test par un joueur vétéran extérieur (23/09, rapporté par Xav) : quinze minutes jouées sans ennui ni envie d'arrêter, **mais** il n'a pas compris pourquoi le jeu s'appelle RPG (« pas de quête, je ne joue pas un rôle ») ni quel en est le but.

Le design est **assumé et ne bouge pas** (D13① : lore diffus, aucune quête, aucun objectif affiché). Ce qui manque, c'est de le **dire avant**, une fois, pour que le joueur ne cherche pas ce qui n'existe pas. Moyen retenu par Xav : le rythme des écrans d'avertissement qu'on connaît du jeu vidéo — quelques écrans qui s'enchaînent, **avant** le symbole du jeu (qui, lui, ne se touche pas).

## 2. Ce que la spec livre

Quatre écrans, dans l'ordre, sur le noir des paupières fermées :

| # | Écran | Rôle |
|---|---|---|
| 1 | **Avertissement** | Pas de quête, pas d'objectif affiché, c'est voulu ; la partie se sauvegarde seule |
| 2 | **Présentation** | Pourquoi « jeu de rôle » : le rôle, c'est le tien ; le follet ; tes choix comptent |
| 3 | **Description** | Ce qu'on fait : récolter, fabriquer, survivre aux nuits, devenir plus fort |
| 4 | **Go** | « Réveille-toi. » — et le symbole prend la suite, puis les paupières s'ouvrent |

Séquence complète d'une partie neuve : **prologue → symbole (inchangé) → cold-open (inchangé)**.

## 3. Règles

- **Données** : `data/prologue.json`, un écran par entrée, **dans l'ordre du fichier** : `id`, `titre` (clé de locale), `lignes` (liste de clés, un paragraphe chacune, peut être vide), `fondu_ms`, `armement_ms`, et `glyphe` facultatif (v1.1.0). Ajouter, retirer ou réordonner un écran ne touche aucune ligne de code. Les textes vivent dans `locales/fr.json` et `en.json` (`prologue.*`).
- **Rythme** : chaque écran entre en fondu depuis le noir, reste tant que le joueur n'a pas appuyé, et sort en fondu. L'appui n'est accepté qu'après `armement_ms` (le geste qui a fermé l'écran précédent ne ferme pas le suivant) ; le marqueur ▼ de la bulle de dialogue, dessiné, dit quand on peut avancer.
- **Avancer** : ATTACK ou INTERACT, ou un toucher n'importe où sur l'écran. Aucun autre verbe ; MENU n'ouvre rien (même statut que le symbole et l'intro : une UI ouverte, gameplay gelé).
- **Quand** : **partie neuve seulement**, comme le symbole et le cold-open qu'il précède (flag `flag_follet_choisi` absent). Jamais au chargement d'une partie en cours, jamais au respawn.
- **Pas de passage global** (« tout sauter ») : quatre appuis suffisent. `[OUVERT]` → `Q-118`.
- **Le jeu servi seulement** : l’orchestrateur reçoit `jouerPrologue: true` de `demarrerJeu` ; par défaut il n'y en a pas, et les tests existants du cold-open restent tels quels (même patron que les calques du symbole).
- **Le symbole ne se touche pas** : ni sa géométrie, ni `effet_logo_ouverture`, ni `logo.js`. Le prologue ne fait que le précéder.

## 4. Textes et habillage — v1.1.0 (retour de Xav sur `V-121`, 23/09)

La v1.0.0 (textes neutres, police de la bulle) est validée comme **base** ; Xav demande : **police calligraphique, écriture elfique, le ton du README** (« Avertissement du laboratoire », « Ce que l'on sait du jeu », qu'il cite comme modèles).

- **Polices** embarquées dans `fonts/` (SIL OFL 1.1, licences à côté), déclarées dans `src/polices.js` seul : **Uncial Antiqua** pour les titres, **Almendra** (calligraphie à la plume, d'inspiration elfique) pour le texte. Chargées au démarrage par `FontFace`, plafonnées à 3 s, « meilleur effort » : repli `serif`. Jamais tirées d'un service en ligne (100 % hors-ligne).
- **Signes alchimiques** du README au-dessus de chaque titre (`glyphe` facultatif dans les données : `air`, `eau`, `feu`, `terre`), **tracés**, jamais des caractères.
- **La voix** : le prologue parle comme le laboratoire du README, au **vous** ; le dernier écran passe au **tu** (« Réveille-toi. ») — c'est déjà le follet qui parle. `[OUVERT]` → `Q-119`.

| # | Signe | Titre | Texte (FR ; l'EN suit le même ton dans `locales/en.json`) |
|---|---|---|---|
| 1 | 🜁 | Avertissement du laboratoire | Ce jeu contient des substances imaginaires à haute concentration. · Ne pas secouer. Ne pas lire à voix haute après minuit. · En continuant, vous acceptez d'être seul responsable de votre risque épileptique. *(Remplace, le 25/09, « Il n'y a pas de journal de quêtes… c'est la formule » : `Q-164`, `D-220`.)* · La partie se conserve d'elle-même, en flacon bien bouché. |
| 2 | 🜄 | Ce que l'on sait du jeu | On sait peu de chose, et c'est très bien ainsi. · *il y a une grotte. / il y a quelque chose qui brille dans la grotte. / ce quelque chose vous choisit — ou vous le choisissez, les archives divergent.* · *dehors, une maison attend. elle n'est pas finie. / vous non plus.* |
| 3 | 🜂 | Ce que l'on sait de vous | Vous tenez le rôle. Pas celui d'un héros écrit d'avance : le vôtre. · Le monde laisse des indices, parfois une phrase dans le vent, parfois rien du tout — et le rien du tout est aussi un indice. · Ce que vous choisissez, et la façon dont vous le faites, sera retenu. Même quand rien ne le montre. · *le jour, on ramasse. la nuit, le monde se souvient qu'il a des dents.* |
| 4 | 🜃 | Réveille-toi. | (titre seul) |

## 5. Tickets

| Ticket | Contenu |
|---|---|
| P1 | La spec (ce fichier) et le suivi (`Q-118`, `Q-119`, `V-121`) |
| P2 | `src/prologue.js` (machine à états PURE : écran, fondu, armement, fin) ; catalogue `prologue` (schéma + données + locales) ; `tests/test_p2_prologue` |
| P3 | Le branchement : `main.js` (prologue avant le symbole, gameplay gelé, reset), `ui/ecran_prologue.js` (le dessin), `demarrerJeu` ; `tests/test_p3_prologue_ouverture` ; journal |
| P4 | Retour de Xav sur `V-121` (§4, v1.1.0) : polices embarquées (`src/polices.js`, `fonts/`), signes alchimiques, textes dans le ton du README |

## 6. Validation en jeu (Xav) — `V-121`

Partie neuve. Les quatre écrans, lisibles à 703 × 280 comme en plein écran PC et au téléphone ; fondus ni trop lents ni trop secs ; le ▼ arrive assez tôt ; puis le symbole et les paupières comme avant. Et surtout : **est-ce que le prochain joueur comprend ce qu'il est venu faire ?**

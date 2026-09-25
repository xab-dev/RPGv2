---
projet: RPG V2
episode/session: Ménage des réponses de Xav, puis l'orientation du héros (D-229)
type: fichier de bord
version: 1.0.0
statut: livré, à voir en jeu (V-166)
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : ménage et orientation du héros (25/09, soir)

Demande de Xav : « je te laisse choisir une dette ou une dette technique
prioritaire, après avoir fait l'étape ménage, puis tu peux procéder ».

Branche `orientation-heros`, partie de `main`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `c395286` | Ménage | Journal du polish libre archivé ; les 112 réponses de Xav (`a883cdf`) traitées |
| (ce commit) | `D-229` | Le héros regarde où il va, et celui qu'il vise |

## 1. Le ménage

- **118 lignes closes descendues en §8**, verbatim : les `Q-` tranchées, les
  `V-` validées, `E-04` (close par Xav) et `D-208` (« patché en ligne
  github, clore »). La file de Xav passe de 112 à 7 lignes.
- **Dix-neuf dettes ouvertes** depuis les réponses, `D-228` à `D-246`, chacune
  citant sa ligne d'origine ; les six `V-` en « non » (`V-85`, `V-88`,
  `V-97`, `V-136`, `V-137`, `V-142`) pointent leur dette et restent ouvertes
  jusqu'à la validation de celle-ci. `E-06` ouverte (`Q-27` : les monstres
  lumineux, au cas par cas).
- **Deux décisions dans `CLAUDE.md`** : une option de dialogue par défaut peut
  avoir des conséquences (`Q-111`, révise `specs/11` §0 ; le schéma la refuse
  encore : `D-240`) ; l'alignement reste un secret, et Claude propose des
  dialogues quand le moment s'y prête (`Q-102`, `Q-110`, aussi en mémoire).
- `CLAUDE.md` disait « il ne reste que `main` » : trois branches locales
  existent encore (`profondeur`, `polish-libre-2026-09-25`, `outil-dettes`),
  toutes contenues dans `main`. Corrigé dans le texte ; les supprimer reste à
  Xav.

## 2. Le choix du ticket

`D-229` (`Q-51`) : Xav l'a dite prioritaire (« depuis l'arrivée de la première
compétence qui introduit la visée »), la seule `P1` née du ménage.

## 3. Ce qui est livré

- `src/orientation.js` (pur) : quatre directions, l'axe dominant du geste ;
  une diagonale garde la direction courante jusqu'à ~51° ; un tir de
  compétence tourne le héros vers sa cible, et la marche ne le retourne
  qu'après 400 ms. Les deux seuils sont provisoires.
- En données : `piece: "visage"` sur les cinq primitives du visage de
  `visuel_heros`, et `orientations` (nord : caché ; est, ouest : décalé et
  resserré). Validé au démarrage (direction inconnue, pièce que rien ne porte,
  pose mal formée).
- `visuels.js#dessinerVisuel` lit la pose d'une pièce ; sans orientation, ou
  de face, il émet exactement les mêmes ordres qu'avant (tenu par test) : le
  dessin validé ne bouge pas.
- `main.js` tient l'état à part de l'entité (jamais sauvegardé), le passe à
  `render.js`. `tools/banc_visuel.html` gagne `&orientations=` et `&teinte=`.
- `tests/test_d229_orientation_heros` : module, données, dessin, démarrage,
  orchestrateur (marcher, puis tirer l'Onde en s'éloignant d'un cracheur).
  Trois mutations attrapées (le tir qui ne tourne pas, la marche qui ne
  tourne pas, le dos qui garde son visage). Suite verte.
- Vu sous Chrome sans fenêtre, au banc (DPR 1 et 3, poche) : le profil se lit,
  le dos est une capuche nue. L'ouest a été ramené de 0,4 unité : le visage
  mordait l'arête claire de la capuche. `heros_scene.mjs` rejoué sans erreur.
  **Ce n'est pas un verdict** : le mouvement se juge en jeu.

## 4. Pour Xav

- **À voir en jeu** : `V-166` (les quatre directions, la diagonale, le regard
  du tir dans l'Annexe ; au téléphone aussi).
- **À confirmer** : `Q-167` (la forme « tricheur », quatre directions, le
  regard du tir, la visée qui ne dépend pas du regard, Zéros qui ne regarde
  pas encore).
- **Rien n'est poussé.** Chaque commit se retire seul.

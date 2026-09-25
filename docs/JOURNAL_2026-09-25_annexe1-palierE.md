---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), palier E — les deux mains
type: fichier de bord
version: 1.0.0
statut: livré, à valider (V-153)
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier E (25/09)

Demande de Xav : « go palier E ». Branche `annexe-1`. Pas de push. Aucun banc (`Q-159`) : tests, commit, Xav joue.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `81c88f4` | Ménage | Journal du palier D archivé, INDEX à jour |
| (ce commit) | `D-211` : palier E | Le levier tenu, la paire, le follet posé, RB contextuel, l'explication qui nomme le bouton |

## 1. Le palier E

- **Le levier tenu** (`levier_maintenu`, `puzzles.js`) : INTERACT l'allume. Il reste allumé tant qu'un **mainteneur** est à portée (`maintien.portee_px`, 44 px depuis son centre) : le héros, ou le follet posé dessus. Sans personne, il s'éteint après `maintien.extinction_ms` (0,6 s). Il ne se rallume jamais seul : il faut INTERACT. Son état vit dans `save.puzzles`, comme celui d'un levier, et la descente le remet à zéro par le même chemin. Son geste (le manche, le voyant, le halo) est celui du levier (`D-158`).
- **La paire** (`simultane`) : `tous_allumes` (au moins deux leviers tenus) et `flag_pose`, un flag de descente. C'est le flag qui ouvre le passage, jamais l'état des leviers : il reste donc ouvert quand ils s'éteignent.
- **Le follet posé** (B2) : un **état** du follet, `poste`, qui porte sa cible `{ id, x, y }` sans savoir ce que c'est (le follet agentique la réutilisera). Posé, il n'engage aucun monstre et va à son poste par la même loi d'amortissement ; sa lumière reste avec lui. De session : une entrée de scène recrée le follet, donc le rappelle.
- **RB contextuel** (`main.js#cibleOrdonnee`), dans cet ordre : un follet posé revient, n'importe où ; près d'un levier tenu allumé, il s'y pose ; sinon, la cible suivante (`D-54`), comme toujours.
- **L'explication** se déclare sur la paire (`explication: { apres_extinctions: 2, dialogue, flag }`). Le démarrage refuse un flag de descente, qui la rejouerait à chaque descente. Elle ne s'ouvre que tant que la paire n'est pas résolue, et une fois par partie.
- **Une réplique qui nomme un bouton** : un nœud de dialogue peut déclarer `glyphe: <verbe>`. Son texte reçoit alors `{glyphe}`, le glyphe de ce verbe **au périphérique actif**, lu au moment où la réplique s'affiche. Le verbe `target_next` a désormais son glyphe : RB, Tab, « touche-moi » (EN : « tap me »).
- **La salle 2** : deux leviers tenus, en (6,4) et (28,4), soit 22 tuiles. Textes provisoires du follet (Xav écrit) : « Ils s'éteignent dès que tu t'en éloignes. Tu n'as que deux mains… mais tu m'as, moi. » / « Allume un levier, puis {glyphe} : je me poserai dessus et je le tiendrai pour toi. Recommence, et je reviens. »

## 2. Tests

- `tests/test_spec14_palier_e_deux_mains_2026-09-25.js` :
  - les parts pures ;
  - les refus au démarrage ;
  - une seconde paire (trois leviers) faite de données seules ;
  - la réplique au bon glyphe pour les trois périphériques ;
  - le vrai orchestrateur en salle 2, de bout en bout, extinctions et explication comprises ;
  - les descentes suivantes sans le dialogue ;
  - aucun id du palier dans le code système.
- `test_d54_cible_suivante` : son contrôle de source suit l'appel, qui passe maintenant par `cibleOrdonnee`. L'ordre de la frame ne change pas.
- 201 fichiers verts.

## 3. Relevé

- `Q-160` : au doigt, RB se fait en touchant le follet. Posé à 22 tuiles, il est hors de l'écran et ne se touche plus. Retenu : on revient vers lui, ou on passe une porte.

## 4. Hors de ce commit

- `data/enemies.json` : les réglages de Zéros que Xav fait lui-même (force, portée, PV de son follet). Ils ne sont pas commités et sont laissés tels quels.

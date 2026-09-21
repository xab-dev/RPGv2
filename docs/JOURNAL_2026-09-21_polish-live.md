---
projet: RPG V2
episode/session: Session de polish en direct (Xav à la manette, une consigne = une modif)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-21
genere_par: claude
verifie_par: xav
---

# Fichier de bord — polish en direct (21/09, après la file « Nv.0 → Nv.10 »)

Session **en direct** : Xav joue, énonce une consigne, la modif est faite, il rejoue. Règle de
la session, posée par Xav à l'ouverture : **une consigne = une modif**, on ne touche qu'à
l'item ou à la scène nommés. Branche `main`. Aucun `push`.

Ce fichier est l'état de la session sur le disque, écrit au fil des modifs — pas après coup.

| # | Consigne (verbatim ou au plus près) | Ce qui est livré | Fichiers | Validé en jeu |
|---|---|---|---|---|
| 1 | « le +1 et le +1xp se chevauchent → le +1 XP reste tel quel, et le +1 remonte de quelques pixels pour être affiché au-dessus. il faut qu'ils restent lisibles les deux. » | Décalage vertical **propre au style** de texte flottant, en données : `styles.gain.offset_y_px = -9`, `xp` inchangé (clé absente = 0). Le décalage s'ajoute au décalage global et il est **constant dans le temps**, donc les deux textes montent ensemble en gardant leur écart. Schéma étendu (`offset_y_px` optionnel sur un style, nombre si présent) pour que la valeur reste un réglage de données. | `data/effets.json`, `src/render.js`, `src/schemas.js` | à faire |
| 2 | « quand on meurt, le clignement des yeux est trop rapide. si possible, on rejoue toute l'intro sauf le choix et le monstre salle deux. » | `effet_clignement_respawn` reprend **exactement** les durées de l'intro : `[600, 900, 1400]` / noir 400 (≈ 3,7 s) au lieu de `[220, 520]` / 180 (≈ 0,9 s). Aucune seconde implémentation : c'est déjà la même fonction (`intro.js#ouverturePaupieres`), seules les données changent. | `data/effets.json`, `src/main.js` (commentaire), `tests/test_d65_…` | à faire |
| 3 | « go telle quelle » (afficher le consommable équipé dans la barre du bas comme l'épée) | `ui/hud.js` ne reçoit plus **un** `visuelArme` mais une table `iconesSlots` (`verbe → visuel`) : les deux `if (verbe === 'attack')` du dessin **disparaissent**, barre du bas et boutons tactiles passent par la même ligne. `main.js` résout `attack` (arme équipée, inchangé) et `consume` (le `render.visuel` du consommable équipé — aucune donnée nouvelle). | `src/main.js`, `src/ui/hud.js`, `tests/test_d20b_…` | à faire |

## Décisions prises en séance

- **Le clignement de mort rejoue celui de l'intro** — *révise* la contrainte d'origine de `D-65`
  (« ~0,9 s, plus court que l'intro, à ne pas allonger »). Motif donné par Xav : mourir doit se
  lire comme un réveil. Le test de `D-65` épinglait cette contrainte ; il éprouve désormais la
  **relation** demandée (respawn = intro), jamais un nombre de millisecondes (règle `D-52`).
- **La barre du bas n'a plus de cas particulier par verbe** (Xav : « parfait pour anticiper les
  compétences »). Conséquence voulue : le jour où un `skill_N` se débloque, son icône s'ajoute
  dans `main.js` et **nulle part ailleurs** — `ui/hud.js` ne saura toujours pas ce qu'est un slot.
- **L'icône du consommable est sa silhouette de monde**, telle quelle, en essai. Si elle se lit
  mal réduite à la case, le remède est une entrée d'icône dédiée **en données**, comme
  `visuel_icone_epee_bois` pour l'épée — toujours pas de code (décision de Xav : « après test on
  fera si c'est trop moche »).

## Relevé hors consigne — signalé, pas corrigé

- **Le levier de la salle 1 ne se rejoue pas après la mort.** `flag_levier_salle1` est persistant :
  au respawn la porte est déjà ouverte, donc la séquence « clignement → levier → sortie » que Xav
  décrit s'arrête en fait à « clignement → sortie ». Le remettre à zéro à chaque mort est une
  **autre modif**, non demandée — en attente de sa réponse.
- **Le clignement de respawn ne gèle rien** (c'est son contrat depuis `D-65`) : à ~0,9 s personne
  ne le voyait, à ~3,7 s le joueur peut se déplacer un long moment derrière ses paupières. À l'œil
  de Xav.

## À faire avant de clore la session

- Les trois modifs sont **à valider en jeu par Xav** (aucune n'est exerçable headless : texte
  flottant, paupières et HUD sont du rendu canvas).
- Reporter dans `docs/DOC_suivi-dettes.md` ce qui en relève une fois les verdicts rendus.

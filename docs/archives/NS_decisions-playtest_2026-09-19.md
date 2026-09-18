---
projet: RPG V2
episode/session: Polish 0/7 — consignation
type: notes de session (doc seule)
version: 1.0.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — NS : décisions du playtest du 2026-09-19 (aucun code)

Session de documentation, même patron que `NS_cloture-phase2`. Ménage de journal, puis mise à jour de `CLAUDE.md`, de la carte mentale (→ v1.5.0) et de `specs/00_ROADMAP.md` (→ v1.4.0). **Aucun fichier de `src/`, `data/`, `tests/` n'est touché.**

## 1. Construction : close

Validée par Xav en navigateur le 2026-09-19, **à la manette puis au clavier seul**, après le correctif de parité clic/verbe. Clore le critère de passage, retirer la ligne de dette correspondante. Les captures des états 29-32 / 31bis de `CHECKLIST_visuelle.md` restent dues sauf mention contraire de Xav.

## 2. Vocabulaire de la Région Maison (à inscrire tel quel, il sert à toutes les specs suivantes)

| Mot | Sens |
|---|---|
| **Forêt** | Le côté de la carte où débouche la Grotte. |
| **Jardin** | Ce qui est proche de la maison : le puits, l'arbre fruitier, l'endroit où le fruit réapparaît. **Le Jardin est la zone sûre.** |
| **Zone sûre** | Maison + Jardin. Aucun monstre n'y apparaît, aucun n'y entre. |
| **Champs** | Les angles de la carte **à l'opposé de la Forêt**, hors d'un rayon extérieur autour de la maison et du Jardin. C'est là que le Chaos s'installe la nuit. |
| **Campagne** | Le reste. |

Note de lecture : quand Xav dit « fluidité », il parle du **ressenti des mouvements** (stick + follet en orbite), validé. La régularité de l'affichage est un autre sujet (saccades, voir dette).

## 3. Décisions datées (2026-09-19)

- Héros à **0,88** de sa taille, **visuel et hitbox**, dérivés d'une seule échelle.
- **Pas de roulement** du héros ; règle : aucun effet ne dépend de la forme du héros (il doit rester un visuel remplaçable). Effet de déplacement = traînée de poussière.
- HUD sur **une ligne en haut**, pleine largeur ; barre d'XP retirée du HUD (niveau seul), conservée dans Stats.
- Intro : les follets restent visibles pendant le texte.
- **Intrusion nocturne du Chaos dans la Région Maison** — *révise* « aucun monstre, ton chill » de `03_maison-exterieur.md` §5 et tranche en partie le point ⑦ de la carte mentale §5 (la destruction des plantations reste `[OUVERT]`, le jardinage n'existe pas). Motif : carte bien plus grande que prévu ; la nuit au seul follet est l'ambiance la plus forte du jeu. Cadre : la nuit seulement ; une zone de Chaos dans les Champs ; monstres présents jusqu'à la fin de la nuit ; quelques-uns épars en Forêt ; **un monstre qui entre en zone sûre fait demi-tour** (condition sur la position du monstre, jamais sur celle du joueur). Spec : `07_chaos-nocturne.md`.

## 4. `[OUVERT]` à ajouter

- **Construction dans les Champs** (ferme) — contredit la grille intérieure de `05_construction-stations.md`. Piste : `zonesConstructibles` dans le JSON de scène.
- **Barre du bas** : Xav veut qu'elle serve dès maintenant — première case en bas à gauche, jaune, pour l'arme, puis les poches qu'on voit se remplir (principe de la barre de Minecraft). Touche D5⑤ (5 emplacements d'action) et le tactile (bas-gauche = joystick virtuel). **À écrire par Xav**, spec à part.
- Second rayon sûr autour de la sortie de la Grotte (point de retour après une mort) — proposé par Claude, retenu par défaut dans 07, à confirmer.

## 5. Dette

Reformuler l'entrée « un peu laggy » : *petites saccades régulières en traversant la carte en ligne droite, tous périphériques, perceptibles par un joueur confirmé* → `MT_mesure-saccades`.

## 6. Ordre d'injection à inscrire dans la ROADMAP

NS (ceci) → mesure des saccades → héros 0,88 → follets de l'intro → puits → traînée → HUD → *(correction des saccades, écrite d'après les chiffres)* → `07_chaos-nocturne` → barre du bas (après écriture par Xav).

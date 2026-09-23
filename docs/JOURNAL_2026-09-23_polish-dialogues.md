---
projet: RPG V2
episode/session: Polish des dialogues (D-169)
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : polish des dialogues (23/09)

Demande de Xav : Bas harmonisé, Moyen stable avec des lumières légères en
fondu, Haut avec des particules en plus ; le portrait du follet à la place
de son nom (le narrateur de la Grotte reste « ... ») ; une lueur sur les
flèches de sélection et de défilement ; les cartes de dialogue ne bougent
pas, et rien ne trahit une option. Branche `polish-dialogues-2026-09-23`,
pas de push.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `bd76292` | Ménage | Journal du palier D archivé |
| *(ce commit)* | `D-169` | `portrait` (id du compagnon) de `resoudreNoeud` à la ligne courante ; `main.js#habillageDialogue` résout la silhouette ; deux effets de plus dans `effets.json` sur des types EXISTANTS (`respiration` seuil 1, `orbite` seuil 2) — aucune ligne de schéma. **162 fichiers verts** |

- La lueur est un dégradé radial, pas un `shadowBlur` : celui-ci se compte en
  pixels physiques et ignore la transform logique → physique.
- Le portrait a la taille de l'icône du follet au HUD. Une première version à
  11 px débordait de la bulle par le haut (capture Chrome, 1920 × 1080).
- Le surlignage de l'option retenue reste blanc : teinté d'or, il virait à
  l'olive.
- `test_d134` supposait que tout ornement est un ornement de Haut ; le seuil
  devient le contrat général, ceux du follet restent en Haut seul.
- `V-109` validée par Xav le 23/09 (« all good ! »), puis poussée sur sa demande.

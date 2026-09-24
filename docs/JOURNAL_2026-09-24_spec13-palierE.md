---
projet: RPG V2
episode/session: Spec 13, palier E — les lisières, le catalogue et les presets
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier E (24/09)

Demande de Xav : « go palier E ». Branche `carte-lisieres-perf`, pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `014c230` | Ménage | Journal du palier D archivé, INDEX à jour |
| (commit `D-202`) | `D-202` — l'ombre | L'ombre sortie du bord, posée sur les côtés de l'écran que la surface nomme (l'herbe : E, S, O) |

## 1. L'ombre des lisières (`D-202`), avant le palier

Le verdict de Xav sur `V-145` : le sud du chemin se lit juste (l'herbe au-dessus du chemin), le nord à l'envers. Capture refaite en début de session : au nord, les deux pas d'ombre brune tombent **sous** les touffes, sur le chemin. Au sud, le même dessin tourné de 180° les met **au-dessus** des touffes. La cause était connue (l'ombre tournait avec le bord). Le remède n'était pas choisi.

**Retenu** : l'ombre devient un dessin à part, avec la liste des côtés de l'écran où elle se pose. L'herbe la garde à l'est, au sud et à l'ouest, et la perd au nord. C'est le seul changement à l'image : le sud et les deux bouts ne bougent pas, puisque Xav ne les a pas contestés. `[OUVERT]` jusqu'à `V-146`. Si le nord sans ombre ne suffit pas, ou si les bouts se lisent mal, la réponse est une liste dans `tiles.json`, sans code.

La piste « l'ombre seulement là où elle tombe vers le bas », notée à l'ouverture de `D-202`, aurait gardé **le nord** et retiré le sud : l'inverse du verdict. Écartée.

Toutes les ombres d'une case passent **avant** tous ses bords : à un angle saillant (deux côtés dominés), l'ombre d'un côté ne couvre plus les touffes de l'autre.

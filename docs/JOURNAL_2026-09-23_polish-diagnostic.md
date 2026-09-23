---
projet: RPG V2
episode/session: Diagnostic polish — ce que la passe d'ambiance n'avait pas touché
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : diagnostic polish (23/09, nuit)

Demande de Xav : reprendre le contexte des retouches graphiques (Grotte,
levier, stations…) et lister ce qui n'avait pas eu le traitement. Constats de
Xav : « la grotte est un peu trop surchargée mais les objets sont jolis ;
l'ambiance générale du jeu : sombre, vide, presque austère — médiéval post
industriel ; il manque aussi l'animation des leviers quand on les active ».

Diagnostic rendu en conversation (sept points), puis **go de Xav pour quatre
tickets, dans cet ordre** : décor partagé → grain du parquet → alléger la
Grotte → sortie et porte de la Grotte. Consigne sur la lumière, pour les
leviers (`D-158`, hors de cette file) : « les jeux de lumière sont là pour
contraster (pas éblouir) ; on ne les assombrit pas, au contraire, il faut bien
voir qu'ils s'allument, on peut même rajouter un léger halo en fondu ».

**Hors cible, jamais touchés** (décision du polish ambiance, reconduite) :
héros, feu follet, stations, arbre et rocher de récolte, flaque d'eau du puits,
items.

Branche `polish-diagnostic-2026-09-23` (partie de `polish-ambiance-2026-09-23`,
jamais poussée). Captures : `tools/scenarios/polish_diagnostic.mjs`, sorties
non versionnées sous `docs/captures/scenarios/polish-diagnostic-2026-09-23/`,
témoins `avant_*`.

Relevé en cours de diagnostic : **`tile_terre` n'est posée par aucune scène**
(ni `tile_eau`, ni `tile_sol_2`) — le ticket « grain de la terre et du
parquet » se réduit au parquet.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `435cf20` | Ménage | Journal polish ambiance archivé, INDEX à jour |
| — | `D-154` | Rochers de décor dans la valeur de la pierre (plus des galets pâles), touffe dans les verts de la pelouse, flaque d'eau noire. Garde-fou : un rocher de décor reste plus sombre que les pierres ramassables |

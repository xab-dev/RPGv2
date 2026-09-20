---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, paliers B et C (file de nuit)
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, V-27, Q-36]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Menus en cartes, paliers B et C (nuit du 20 au 21/09)

`specs/08_menus-cartes.md` v1.0.0, **paliers B puis C, puis une passe de polish**. Branche **`menus-cartes`**.

**Le mandat, verbatim (Xav, 20/09 au soir)** : « j'ai regardé A4, tout à l'air bon, continue jusqu'à la fin de
08_menus-cartes. Je vais dormir. Si tu as une branche de travail séparée de 'main' tu peux commit et push dessus, on
'merge' à mon retour. […] Commit à chaque étape pour retracer si quelque chose déraille, et je compte sur toi pour
que éviter que ça arrive. Si tous les test sont vert quand tu as terminé les menus, tu peux leurs faire une passe de
polish puis commit. »

Ce que ça change, et ce que ça ne change pas :

- **`push` autorisés, sur `menus-cartes` seulement.** `CLAUDE.md` dit « ne jamais pousser » : Xav lève la règle pour
  cette branche et pour cette nuit, comme sauvegarde. **Jamais `main`** (un `push` sur `main` publie le jeu), **aucune
  fusion** : « on merge à mon retour ».
- **`V-27` n'est pas close.** « Tout à l'air bon » lève le verrou des paliers suivants ; la ligne reste ouverte (ni la
  manette, ni le doigt, ni le téléphone ne sont cités), et c'est Xav qui l'écrira.
- La règle « un palier par session » est amendée par Xav lui-même pour cette nuit ; ce qui reste : **un commit par
  étape, chacun retirable seul**, et l'état de la file **sur le disque**, ici.

Une ligne par commit, écrite **au moment du commit**.

---

## Commit 0 — Ménage de journal (doc seule)

Le journal du palier A part dans `docs/archives/` avec sa ligne d'INDEX ; `CLAUDE.md` ne garde qu'un renvoi vers ce
fichier-ci. Suivi v1.17.0 : `V-27` annotée du message de Xav (**restée ouverte**), `D-43` dit que B et C sont demandés.

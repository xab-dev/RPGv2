---
projet: RPG V2
episode/session: D-167 — le nom du narrateur
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : D-167 (23/09)

Réponse de Xav après le palier B : « D-167 : on l'appelle "..." · Q-109 vu non
contesté, c'est voulu · V-105 parfait · Q-100 : tous les dialogues restants ne
deviennent pas des choix, on les mesure ». Branche `dialogues-2026-09-23`, pas
de push.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `c8d21fc` | Ménage | Journal du palier B archivé ; `Q-100`, `Q-109` closes, `V-105` validée |
| `159b159` | `D-167` | Tout locuteur passe par `locuteur.<id>` ; le narrateur s'appelle « ... » (FR/EN). Boot : clés vérifiées. **159 fichiers verts** |

- `Q-100` n'a demandé **aucun code** : l'état livré au palier B est déjà celui
  que Xav décrit (toute réplique hors `mesure: false` compte spam et lecture,
  aucun texte réécrit).
- Un test d'avant épinglait le défaut (`test_phase1_dialogue` §5 : « narrateur
  reste tel quel ») : mis au nouveau contrat.
- Vu sous Chrome : la bulle de l'intro porte « ... ». Verdict en jeu : `V-106`.
- Suite : le palier C de la spec 11 (la porte du Nv.15, chapitre 1), données seules.

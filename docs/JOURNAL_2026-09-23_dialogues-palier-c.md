---
projet: RPG V2
episode/session: Spec 11, palier C — la porte du Nv.15 et le chapitre 1
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 11, palier C (23/09)

« go C » de Xav. Branche `dialogues-2026-09-23`, pas de push. `V-106` (le
narrateur « ... ») reste à voir.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `4df57bf` | Ménage | Journal de `D-167` archivé ; `V-105` validée reportée dans `CLAUDE.md` |
| `33b4193` | Palier C | `dlg_chapitre_1` (deux tours, un nœud rejoint par deux chemins), `amb_chapitre_1` (`niveau ≥ 15`, Maison dehors), `flag_chapitre_1_vu` / `flag_chapitre_1_precis`, textes FR/EN. **Aucun fichier de `src/`.** **160 fichiers verts** |

- Le moteur des paliers A et B a porté le chapitre tel quel : la forme du §3
  tient, la spec n'est pas à rouvrir.
- L'option par défaut est la demande **vague** : qui spamme reçoit la réponse
  vague (et paie le spam). C'est la leçon, et c'est un choix à confirmer (`Q-110`).
- Sous Chrome (scénario `dialogue_chapitre_1.mjs`, trois profils) : les trois
  options tiennent dans la bulle, le second tour aussi. Zéro erreur console.
  Un faux départ : l'outil de capture marque toutes les ambiances comme vues,
  chapitre compris — le scénario lui rend son flag.
- Ouvertes : `Q-110` (textes et poids proposés), `V-107` (le verdict de fond).
  `Q-101` (conversation de nuit) et `Q-102` restent ouvertes.
- Suite : le palier D (le coffre effacé, chapitre 3), qui touche `flags.js` et
  `main.js`.

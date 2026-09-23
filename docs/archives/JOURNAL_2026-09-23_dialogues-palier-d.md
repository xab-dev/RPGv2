---
projet: RPG V2
episode/session: Spec 11, palier D — le coffre effacé
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 11, palier D (23/09)

« V-106 V-107 all good. go D » de Xav. Branche `dialogues-2026-09-23`, pas de
push. Avec ce palier, **la spec 11 est livrée en entier**.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `be1b297` | Ménage | Journal du palier C archivé ; `V-106`, `V-107` validées |
| `bb98f00` | Palier D | `remplissage_coffre` (coffre le plus plein, slots ÷ slots) ; `coffre_apparence_vide` lu par `main.js#contenuAfficheDeStation` (retraits et compte de piles seulement, dépôts au vrai contenu) ; `dialogue_fin` en données, ouvert par `main.js#avancerEffetsMonde` via une petite file de session ; `dlg_chapitre_3`, `dlg_coffre_tout_est_la`, `amb_chapitre_3`. **161 fichiers verts** |

- La porte « en entrant dans la Maison » passe par `stations_placables ≥ 1` :
  aucun format de condition nouveau.
- L'option par défaut « Répare, vite. » ne pose pas l'effet (une option
  `defaut` n'a jamais de conséquence) : à confirmer, `Q-111`.
- Deux écarts aux fichiers autorisés du §8, dits dans `Q-111` : la valeur
  nommée vit dans `main.js` (pas `flags.js`, comme toutes les autres), et
  `schemas.js` valide `dialogue_fin`. `effets_monde.js` n'a pas changé.
- `test_d43_a4` : sa liste témoin des valeurs nommées gagne `remplissage_coffre`.
- Sous Chrome (`dialogue_coffre_efface.mjs`) : bulle à trois options, Coffre
  « 0 / 10 » pendant l'effet, « Ton coffre… tout est là. » à la fin, puis
  « 8 / 10 » et ses 160 bois. Zéro erreur console.
- Ouvertes : `Q-111`, `V-108` ; toujours là : `Q-101`, `Q-102`, `Q-103`, `Q-110`.

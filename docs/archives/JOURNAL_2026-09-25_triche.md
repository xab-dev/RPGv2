---
projet: RPG V2
episode/session: Ménage, puis la triche des tests (D-250)
type: fichier de bord
version: 1.0.0
statut: livré, à voir en jeu (V-170)
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : la triche `?cheat=phenom` (25/09, nuit)

Demande de Xav : « une commande de triche : `?cheat=phenom` qui donne accès à
tous les contenus (craft gratuit) + Nv50, c'est tout. il faut que le boss et
zeros reste présent malgrès le fait que j'ai des compétences normalement
bloqué. pareil pour les autres flag dialogue etc. »

Branche `triche`, partie de `main`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `8df55cd` | Ménage | Journal de l'orientation du héros archivé ; aucune réponse nouvelle de Xav au suivi |
| `0dcb737` | `D-250` | La triche : Nv.50, recettes visibles et gratuites, compétences connues, aucun flag posé, sauvegarde à part |

## 1. Les deux points tranchés par Xav avant le code

1. **Un vrai Nv.50** : ce qui attend un niveau (la stèle, l'indice de la
   grotte, les dialogues du Nv.10 et du chapitre 1, le chaos de la nuit) se
   déclenche d'emblée. Accepté : Xav suit l'histoire sur une partie sans
   triche, ou ses sauvegardes à paliers.
2. **Une sauvegarde à part** : prévue parce qu'elle était légère (un nom de
   base passé à `creerStoreIndexedDB`). Le paramètre public est accepté,
   nettoyé à la version finale.

## 2. Ce qui est livré

- `src/triche.js` (pur) : le mot de passe exact, `NOM_BASE_TRICHE`,
  l'XP du dernier niveau lue dans la table, `recetteGratuite`.
- `main.js` : `demarrerJeu` lit la triche **avant** le store ; l'orchestrateur
  reçoit un booléen. `appliquerTriche` crédite le dernier niveau par le chemin
  de tout gain d'XP (au chargement, avant `niveauPrecedent` : pas de symbole
  de montée ; et à « Nouvelle partie ») et range chaque compétence comme le
  parchemin. `competenceConnue` remplace le flag là où il voulait dire
  « connue » (Stats, emplacements), **pas** dans `coffreOuvert` : le coffre du
  parchemin reste fermé. L'Atelier montre tout et paie la version gratuite ;
  la fiche dit toujours ce que la vraie recette demande.
- `tests/test_triche_2026-09-25.js` : trois mutations attrapées (la recette
  payée, la compétence inconnue, le niveau non crédité). Suite verte (217 fichiers).
- `tools/scenarios/triche.mjs` : sous Chrome sans fenêtre, le jeu démarre
  sans erreur, et seule la base `rpg_v2_triche` est ouverte.

## 3. Pour Xav

- **À voir en jeu** : `V-170`.
- **À confirmer** : `Q-171` (gratuit = aussi sans recharge, les points à
  répartir, les compétences rangées d'office, les lignes de Stats visibles,
  aucune marque à l'écran).
- **Rien n'est poussé.**

## 4. Fusion

- Xav : « je valide les essais sur chrome, tu peux fusionner et pousser dans
  main pour les test téléphone, puis supprime les branches inutilisées (-d) ».
  `V-170` reste à écrire par lui (réponse par `npm run dettes`), avec `Q-171`.
- `triche` fusionnée dans `main` (`--no-ff`) et poussée, sans release ;
  `profondeur`, `polish-libre-2026-09-25`, `outil-dettes`, `orientation-heros`
  et `triche` supprimées (`git branch -d`, toutes contenues dans `main`).

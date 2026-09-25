---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), palier I — choisir
type: fichier de bord
version: 1.0.0
statut: livré — à voir par Xav : V-157 ; à trancher : Q-163
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier I

Demande de Xav : « spec 14 palier I, go ! ». Branche `annexe-1`, non poussée.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `22b3bf2` | Ménage | Journal de la nuit du 25/09 archivé, INDEX à jour, chemin du banc de référence corrigé dans `CLAUDE.md` |
| (ce commit) | `D-215` : palier I | La sauvegarde en v9, « Tout reprendre », les compétences en cartes dans Stats et leur emplacement, la carte Follet, le déblocage |

**Non commité, pas à moi** : `data/enemies.json` porte un réglage de Xav (le Gardien à 444 PV et 7 de force). Laissé tel quel, hors du commit.

## 1. Ce qui est livré (§4.9)

- **La sauvegarde passe en v9** : `hero.competences`, `{ emplacement : compétence }`. La migration 8 → 9 range la compétence du parchemin sur son emplacement si son flag est posé, `{}` sinon. Le champ est toujours écrit. Éprouvée sur les **15 sauvegardes réelles** de `prive/sauvegardes/` : aucune n'a encore lu le parchemin, toutes migrent sans perte. La migration nomme la compétence dans `save.js` (elle tourne avant le registre) : c'est la seule exception au test « aucun id dans le code », bornée à une constante.
- **Ce qui est équipé** se lit en un seul point, `main.js#competencesEquipees`. Une compétence que la sauvegarde range mais qu'on n'a pas apprise ne se lance pas.
- **Apprendre range** : ouvrir le coffre range l'Onde dans son emplacement par défaut s'il est libre, sinon dans le premier libre, sinon nulle part. Rien de ce que le joueur a rangé n'est chassé.
- **Les cases du HUD** d'un emplacement de compétence s'affichent quand une compétence y est **rangée** (`competence_en_<emplacement>`, une valeur de condition par emplacement, déduite du catalogue). Ce n'est plus le flag qui les montre.
- **La page Stats** :
  - sous les quatre stats, le groupe « Compétences », une tuile par compétence apprise ;
  - la fiche d'une compétence dit ce qu'elle fait, sa charge et sa recharge au centième selon l'Esprit, où elle est rangée, et « 1 = X · 2 = Y · 3 = B » au glyphe du périphérique actif ;
  - **Ranger** (A) empile trois cartes d'emplacement. Choisir un emplacement occupé remplace la compétence qui s'y trouvait, sans échange. Puis on revient à Stats ;
  - **Tout reprendre** est la seconde action (X) de chaque stat. La confirmation d'un danger vient d'abord ; ensuite tous les points dépensés sont rendus et les stats reviennent à leur base.
- **La grille de cartes** accepte un écran construit en jeu : `empilerChoix` et `demanderConfirmation`, des textes déjà écrits (`titre`, `phrase`), un geste (`faire`) et `apres: 'retour'`. C'est le fonctionnement normal du menu, sans composant nouveau.
- **La carte Follet** : c'est la troisième carte du menu Héros, qui attend le déblocage. Elle montre les trois follets à leur couleur. Pour ça, la fiche gagne `teinteIcone` : sans elle, le Feu se dessinait à l'accent bleu du follet d'Eau. Choisir un follet ferme le menu. L'ancien se résorbe, puis le nouveau grandit à sa place (500 ms, provisoire). La sauvegarde, la synergie et l'aura suivent tout de suite ; l'alignement ne bouge pas.
- **Le déblocage** est une ligne d'ambiance dehors, `amb_choix_debloque`, qui attend la compétence. Elle ouvre deux répliques du follet, qui sont une proposition, et pose `flag_choix_debloque`. Deux choses attendent ce flag : la carte Follet, et `choisir_si` sur la carte Stats.

## 2. Vérifications

- Suite complète : **205 fichiers verts**. Le nouveau `test_spec14_palier_i_choisir` couvre les règles de rangement, la migration (synthétique et sur les sauvegardes réelles), les données, et le vrai orchestrateur. Il vérifie le coffre qui range, la sortie qui débloque, les deux actions de Stats, le lancer par B après le passage en 3, le changement de follet, et l'absence d'ids dans le code.
- Tests ajustés, parce que le contrat a changé et pas le réglage :
  - la version 9 dans six tests de migration ;
  - les cases de compétences dans `test_d63` : elles suivent ce qui est rangé ;
  - les valeurs et les écrans enregistrés dans `test_d43_a4`, et le catalogue des menus dans `test_d43_a2` : la « page du follet » qu'il anticipait est arrivée, et son essai d'architecture prend un écran fictif ;
  - `test_spec14_palier_g` : la compétence rangée dans la sauvegarde ;
  - `test_spec14_palier_h` : le déblocage déjà entendu.
- **Une passe dans Chrome sans fenêtre** (`tools/scenarios/annexe_choisir.mjs`, profils `grand` et `telephone`), parce qu'aucun test headless n'exerce le vrai DOM du menu. Elle n'a relevé aucune erreur en console. La page Stats, le choix des emplacements, la confirmation, la carte Follet et le fondu s'affichent ; c'est elle qui a montré l'accent bleu sur le Follet de Feu. Les images vont sous `docs/captures/scenarios/`, non versionnées.

## 3. Pour Xav

- **À jouer** : `V-157`, à la manette, au clavier et au doigt.
- **À trancher** : `Q-163`. Il y a surtout trois points :
  - « Tout reprendre » est porté par X sur chaque stat ;
  - la phrase commune de la confirmation dit « Cette action ne s'annule pas », ce qui est un peu dur pour un choix gratuit ;
  - le texte du follet au déblocage est à réécrire.
- **Suivant** : l'album de référence de la spec, qui la clôt.

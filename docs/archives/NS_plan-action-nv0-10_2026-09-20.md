---
projet: RPG V2
episode/session: Bilan du 2026-09-20 — plan d'action avant pause
type: note de synthèse (décisions + plan)
version: 1.0.0
statut: brouillon
catégorie: Doc
date: 2026-09-20
Ids_suivi: Q-18, Q-33, Q-34, E-02 (nouveaux identifiants : à attribuer par Claude Code au ménage de journal)
genere_par: claude
verifie_par: xav
---

# NS — Plan d'action Nv.0 → Nv.10, contrat de rôles, reprise après pause

Emplacement proposé : `docs/NS_plan-action-nv0-10_2026-09-20.md`.
Le brief exécutable pour Claude Code est à part : `docs/BRIEF_file-nv0-10_2026-09-20.md`. Claude Code ne lit **pas** cette NS.

## 0. Reprise en 5 minutes (à lire au retour de pause)

- **Stratégie moteur** : on reste en V2 (HTML5/JS/Canvas). Pic Godot = projet de secours. La question du moteur se repose **au Poste avancé**, après Boss 1. No-code écarté pour ce projet (casse le système agent + git + tests).
- **Fondations** : logique et données solides, rendu PC solide (valeur par défaut, pas plancher), plateforme web = la seule partie fragile. On ajoute du contenu.
- **Premier test extérieur fait** (neveu, 20/09) : §2.
- **Où on en est** : monstres de nuit validés, Nv.10 atteint vite par Xav. Prochain jalon : lisser Nv.0-10 à la main, **puis** l'épée en bois et l'Annexe 1.
- **Prochaine action de Xav** : répondre à la question 1 du §4. **Prochaine action de Claude Code** : tickets T0 à T4 du brief (aucun ne dépend de Xav).

## 1. Contrat de rôles (cadrage de Xav du 20/09, non figé)

| | Camp Xav — **bloquant** | Camp Claude + Claude Code — **non bloquant** |
|---|---|---|
| Quoi | Création, écriture, mécaniques, synergies, ce que font les armes, follet, compétences, monstres et boss, tout ce qui est « utile » | Logique, organisation, architecture, UI, polish, équilibrage chiffré, déco, amélioration des cartes, textes d'ambiance |
| Comment | Questions **une par une**, il prend le temps qu'il faut. Une étape (une arme, une annexe, un follet) ne démarre pas tant que ses questions ne sont pas closes | Liberté dans la direction générale du jeu. Rien n'attend Xav |

Trois garde-fous proposés par Claude (à confirmer par Xav) :

1. **Le lore a un canon, et le canon est à Xav.** La trame (ères M1-M7, Crypte X, secrets, ce qui est vrai dans le monde) reste dans son camp : elle touche aux énigmes, donc aux mécaniques. Claude écrit des textes d'ambiance **à l'intérieur** du canon (descriptions, lignes de palier), marqués « proposition », et n'y révèle ni n'y invente aucun fait du monde.
2. **Équilibrage : Xav donne l'intention, on règle les chiffres.** « L'épée tue le rampant en 2 coups au lieu de 3 » est une décision de Xav ; la valeur qui y mène est à nous, en JSON, et il peut la changer.
3. **Toute initiative libre = un commit détachable**, titré « proposition », sur le modèle du follet aérien (`D-36`). Xav garde, règle ou annule par `git revert`.

Validation : trois états au lieu de deux — `ok` · `non : <pourquoi>` · **`pas vu`**. Une livraison non commentée reste `pas vu`, elle n'est jamais close par le silence. Le camp Claude **s'arrête d'ajouter** quand plus de 10 lignes `V-` sont `pas vu` : sinon le jeu avance plus vite que l'œil de Xav.

## 2. Test du neveu (V2, 20/09) — ce que ça dit

| Constat | Lecture | Suite |
|---|---|---|
| A contourné le levier-indice de la salle 1, s'est débloqué seul aux trois leviers | L'énigme est robuste sans son indice. Un seul joueur : on ne corrige rien | Aucune |
| Nv.0-5 : peu de ressources sur une grande carte, peu d'envie de chercher | Problème de **densité et de placement**. Miroir exact du constat de Xav (`Q-33`) : lui les connaît par cœur, le débutant ne les trouve pas. Même remède pour les deux | T2 |
| 2-3 nuits avant de comprendre comment monter de niveau | Problème de **retour d'information** : le jeu ne montre pas ce qui rapporte de l'XP | T1 |
| …et où trouver des monstres | `Q-34` confirmée de l'extérieur | T3 |
| Dans l'ensemble : « vraiment pas mal » | La boucle tient devant quelqu'un d'autre que Xav | — |

Le point important de T1 : l'XP sur la récolte vaut moins par sa quantité que par le **texte flottant « +XP »** qui l'accompagne. C'est lui qui apprend la boucle au joueur, sans tutoriel.

## 3. Décisions de Xav consignées

- **XP sur toutes les actions de récolte** (bois, pierre, fruit, puits), à petite dose, pour lisser Nv.0-5. **Révise D21** (sources d'XP : combat et craft → combat, craft **et récolte**).
- **Une ressource de base en plus** (herbe ou paille) : principe retenu, usage à définir (§4, question 2).
- **Chaîne du palier 10** : Nv.10 → recette de l'épée en bois (1 bois + 1 branche + X éclats) → Annexe 1 → mini-boss 1 → recette du coffre → et ainsi de suite.
- **Anti-spoil** : rien de ce qui se débloque à partir du palier 10 (armes, recettes, compétences) ne doit apparaître dans les menus avant son déblocage.
- **Méthode** : corriger Nv.0-10 à la main, étape par étape, **avant** l'Annexe et la nouvelle arme.
- **Rendu PC = valeur par défaut** du jeu (GPU à 8 %, 8 Go de RAM libres, tourne sur un portable de 2010).

Proposition de Claude pour clore `Q-18` (niveau contre jalons) : la chaîne de Xav alterne déjà proprement — **le niveau ouvre une possibilité** (une recette apparaît), **le jalon donne la capacité** (le mini-boss donne la récompense). D21① reste vrai tel quel.

## 4. File de questions de Xav (bloquantes, une par une, dans cet ordre)

1. **Épée en bois** : combien d'éclats (X), et qu'est-ce qu'elle change face aux mains nues, en intention (ex. « un coup de moins pour tuer un rôdeur ») ? La portée [0;1] est déjà actée. → débloque T5.
2. **Herbe ou paille** : à quoi sert-elle ? Sans usage (une recette, un besoin), on ne l'ajoute pas. Piste : un lien ou une corde qui entre dans la recette de l'épée.
3. **Anti-spoil** : une entrée verrouillée est **invisible**, ou visible en « ??? » ? Avis de Claude : invisible, et aucun compteur du type « 3/12 », qui est déjà un spoil. Retenu par défaut dans T4 : invisible.
4. **Annexe 1** : qu'est-ce que c'est, où est-elle sur la carte Maison, comment y entre-t-on ?
5. **Mini-boss 1** : son idée de combat, en une phrase (une seule mécanique).
6. **La suite de la chaîne** Nv.10 → Nv.20 : recette du coffre, puis quoi ?
7. **Puits et XP** : une gorgée d'XP à chaque puisage, ou seulement quand la gourde était vide ? Retenu par défaut dans T1 : seulement si la gourde n'était pas pleine.

## 5. Tournée de validation (au retour)

Une trentaine de lignes `V-` sont ouvertes (`V-03` à `V-35`). T0 produit une liste unique, **rangée dans l'ordre d'une partie** (partie neuve → Grotte → Maison de jour → nuit Nv.≥5 → menus → téléphone), à cocher en une séance de 30 à 45 minutes, manette en main, avec les trois états du §1.

## 6. Fils déclencheurs « la fondation atteint sa limite »

À relever à chaque clôture de chantier ; deux sur trois = on rouvre la question du moteur avant le Poste avancé.

- Un ajout de contenu exige de toucher au code d'un système plus d'une fois sur trois (premier relevé : T5).
- `dessiner()` dépasse 8 ms sous Chrome PC, de nuit, avec monstres.
- Plus d'un ticket sur quatre est de la plomberie de navigateur.

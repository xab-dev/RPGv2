---
projet: RPG V2
episode/session: Fondations — hygiène du registre
type: micro-ticket (documentation seule)
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-21
Ids_suivi: ["DOC-xx (à créer)", A-06, Q-10, Q-11, Q-12, Q-24, Q-27, Q-28, Q-30, Q-32, Q-35, Q-37, Q-38, Q-39, Q-40, Q-41, Q-42, Q-43, Q-44]
genere_par: claude
verifie_par: xav
---

# MT — Réparer le registre de suivi

**Périmètre de lecture et d'écriture : `docs/DOC_suivi-dettes.md`, et son historique git. Rien d'autre.**
Aucun fichier de `src/`, `data/`, `tests/`. Un commit. Pas de `push`.

## 1. Le constat

Dans `docs/DOC_suivi-dettes.md` v1.24.0, **18 lignes portent le même texte de statut** — celui de la clôture de `Q-44` (« **traitée le 22/09** (ticket « (a) » des niveaux 10 → 30, données seules)… ») :

`A-06`, `Q-10`, `Q-11`, `Q-12`, `Q-24`, `Q-27`, `Q-28`, `Q-30`, `Q-32`, `Q-35`, `Q-37`, `Q-38`, `Q-39`, `Q-40`, `Q-41`, `Q-42`, `Q-43`, et `Q-44` elle-même.

Hypothèse, **à vérifier et non à supposer** : un remplacement global dont l'ancre était la cellule `ouvert |`, au lieu de la ligne `Q-44`.

Second défaut, conséquence du premier : la mise à jour du soir (« ce n'est plus vrai le soir même : le `push` […] a emporté ce commit ») a atterri sur **`A-06`**, première occurrence du texte dupliqué. `Q-44` porte donc un statut **périmé** (« Non poussé »), et `A-06` porte le bon texte… de `Q-44`.

## 2. À faire

1. **Cause racine d'abord** : `git log -p -- docs/DOC_suivi-dettes.md`, retrouver le commit qui a dupliqué le texte. Le nommer dans le rapport.
2. **Restaurer depuis ce commit parent** la cellule de statut des 17 lignes touchées à tort (`A-06` + les seize `Q-` autres que `Q-44`) — **verbatim**, jamais reconstituée de mémoire ni « probablement `ouvert` ». Si une ligne avait un statut plus riche que `ouvert`, c'est lui qui revient.
3. **`Q-44`** reçoit le texte aujourd'hui posé sur `A-06` (la version à jour), complété par la décision de Xav du 21/09 : **« le Nv.30 en ligne, on laisse »** — le neveu peut s'amuser, du contenu arrive, et l'équilibrage poche/craft passera avant. `Q-44` peut alors être close **par cette décision de Xav**, citée et datée.
4. **`A-06`** retrouve son statut d'origine (action Firefox `about:support`).
5. Vérification mécanique avant commit : **plus aucune chaîne de statut identique sur deux lignes** de plus de 80 caractères (un script jetable suffit, non versionné).
6. **Règle 3 du §0** : descendre en §8 les lignes `D-` closes restées en §5 (≈ 45). Déplacement **verbatim**, aucune réécriture.
7. Corriger `docs/archives/INDEX.md` et `CLAUDE.md` là où ils disent encore « Non poussé : la version en ligne reste au Nv.10 » — **hors périmètre de lecture ci-dessus, donc seulement ces deux phrases**, repérées par recherche de la chaîne `Non poussé`.

## 3. Règle de méthode à inscrire (§0 du suivi, règle 8)

> **Jamais de remplacement global dans un registre.** Toute édition d'une ligne du suivi s'ancre sur une chaîne qui **contient l'identifiant de la ligne** (`| Q-44 |`). Une ancre qui ne cite pas d'identifiant peut toucher vingt lignes en silence — c'est arrivé le 22/09.

## 4. Hors périmètre

Aucune clôture de `Q-`, `V-` ou `E-` autre que `Q-44` (décision citée ci-dessus). Aucune réécriture de fond. Le plafond de 300 lignes de `CLAUDE.md` (497 aujourd'hui) est un autre ticket.

## 5. Rapport attendu

Le commit fautif · le nombre de cellules restaurées et leur source · la sortie de la vérification du point 5 · la taille du §5 avant/après.

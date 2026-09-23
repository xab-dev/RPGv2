---
projet: RPG V2
episode/session: Prologue
type: spec
version: 1.0.0
statut: brouillon
catégorie: Spec
date: 2026-09-23
Ids_suivi: D13① · Q-118 · Q-119 · V-121
genere_par: claude
verifie_par: xav
---

# 12 — Le prologue : quatre écrans avant le symbole

Emplacement : `specs/12_prologue.md`. Branche `prologue`. **Une seule session, un commit par ticket, chacun retirable seul.**

## 1. Pourquoi

Premier test par un joueur vétéran extérieur (23/09, rapporté par Xav) : quinze minutes jouées sans ennui ni envie d'arrêter, **mais** il n'a pas compris pourquoi le jeu s'appelle RPG (« pas de quête, je ne joue pas un rôle ») ni quel en est le but.

Le design est **assumé et ne bouge pas** (D13① : lore diffus, aucune quête, aucun objectif affiché). Ce qui manque, c'est de le **dire avant**, une fois, pour que le joueur ne cherche pas ce qui n'existe pas. Moyen retenu par Xav : le rythme des écrans d'avertissement qu'on connaît du jeu vidéo — quelques écrans qui s'enchaînent, **avant** le symbole du jeu (qui, lui, ne se touche pas).

## 2. Ce que la spec livre

Quatre écrans, dans l'ordre, sur le noir des paupières fermées :

| # | Écran | Rôle |
|---|---|---|
| 1 | **Avertissement** | Pas de quête, pas d'objectif affiché, c'est voulu ; la partie se sauvegarde seule |
| 2 | **Présentation** | Pourquoi « jeu de rôle » : le rôle, c'est le tien ; le follet ; tes choix comptent |
| 3 | **Description** | Ce qu'on fait : récolter, fabriquer, survivre aux nuits, devenir plus fort |
| 4 | **Go** | « Réveille-toi. » — et le symbole prend la suite, puis les paupières s'ouvrent |

Séquence complète d'une partie neuve : **prologue → symbole (inchangé) → cold-open (inchangé)**.

## 3. Règles

- **Données** : `data/prologue.json`, un écran par entrée, **dans l'ordre du fichier** : `id`, `titre` (clé de locale), `lignes` (liste de clés, un paragraphe chacune, peut être vide), `fondu_ms`, `armement_ms`. Ajouter, retirer ou réordonner un écran ne touche aucune ligne de code. Les textes vivent dans `locales/fr.json` et `en.json` (`prologue.*`).
- **Rythme** : chaque écran entre en fondu depuis le noir, reste tant que le joueur n'a pas appuyé, et sort en fondu. L'appui n'est accepté qu'après `armement_ms` (le geste qui a fermé l'écran précédent ne ferme pas le suivant) ; le marqueur ▼ de la bulle de dialogue, dessiné, dit quand on peut avancer.
- **Avancer** : ATTACK ou INTERACT, ou un toucher n'importe où sur l'écran. Aucun autre verbe ; MENU n'ouvre rien (même statut que le symbole et l'intro : une UI ouverte, gameplay gelé).
- **Quand** : **partie neuve seulement**, comme le symbole et le cold-open qu'il précède (flag `flag_follet_choisi` absent). Jamais au chargement d'une partie en cours, jamais au respawn.
- **Pas de passage global** (« tout sauter ») : quatre appuis suffisent. `[OUVERT]` → `Q-118`.
- **Le jeu servi seulement** : l'orchestrateur reçoit `prologue: true` de `demarrerJeu` ; par défaut il n'y en a pas, et les tests existants du cold-open restent tels quels (même patron que les calques du symbole).
- **Le symbole ne se touche pas** : ni sa géométrie, ni `effet_logo_ouverture`, ni `logo.js`. Le prologue ne fait que le précéder.

## 4. Textes proposés (FR / EN) — `[OUVERT]` → `Q-119`

Rédigés par Claude à partir de la carte mentale (D13① et ⑧ : on se réveille enfant, le follet apprend sans expliquer ; les choix comptent — sans rien dire de l'alignement, qui reste caché). **Xav les réécrit à volonté dans les locales**, aucun code à toucher.

1. **Avant de commencer** / *Before you begin*
   - Ce jeu ne te donnera aucune quête. Aucun objectif affiché, aucune flèche, aucune liste de choses à faire. / *This game will never give you a quest. No objective on screen, no arrow, no to-do list.*
   - C’est voulu : ici, on comprend en explorant. / *That’s on purpose: here, you understand by exploring.*
   - La partie se sauvegarde toute seule. / *Your progress saves itself.*
2. **Un jeu de rôle** / *A role-playing game*
   - Le rôle, c’est le tien. / *The role is yours.*
   - Tu te réveilles sans rien savoir. Un follet t’accompagne : il apprend avec toi, il ne t’explique pas tout. / *You wake up knowing nothing. A wisp comes with you: it learns alongside you, it won’t explain everything.*
   - Ce que tu choisis, et la façon dont tu le fais, compte. Même quand rien ne le montre. / *What you choose, and how you do it, matters. Even when nothing shows it.*
3. **Ce que tu vas faire** / *What you’ll do*
   - Récolter, fabriquer, cuisiner, t’équiper. / *Gather, craft, cook, gear up.*
   - Survivre aux nuits, quand le Chaos rôde. / *Survive the nights, when the Chaos prowls.*
   - Devenir plus fort, et ouvrir ce qui est fermé. / *Grow stronger, and open what is closed.*
4. **Réveille-toi.** / *Wake up.* (titre seul)

## 5. Tickets

| Ticket | Contenu |
|---|---|
| P1 | La spec (ce fichier) et le suivi (`Q-118`, `Q-119`, `V-121`) |
| P2 | `src/prologue.js` (machine à états PURE : écran, fondu, armement, fin) ; catalogue `prologue` (schéma + données + locales) ; `tests/test_p2_prologue` |
| P3 | Le branchement : `main.js` (prologue avant le symbole, gameplay gelé, reset), `ui/ecran_prologue.js` (le dessin), `demarrerJeu` ; `tests/test_p3_prologue_ouverture` ; journal |

## 6. Validation en jeu (Xav) — `V-121`

Partie neuve. Les quatre écrans, lisibles à 703 × 280 comme en plein écran PC et au téléphone ; fondus ni trop lents ni trop secs ; le ▼ arrive assez tôt ; puis le symbole et les paupières comme avant. Et surtout : **est-ce que le prochain joueur comprend ce qu'il est venu faire ?**

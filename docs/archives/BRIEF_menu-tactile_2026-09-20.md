---
projet: RPG V2
episode/session: Polish — menu tactile et plein écran
type: brief de mini-file (3 commits)
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-20
Ids_suivi: [D-30, D-31, V-25, A-07, "D-42 (à créer)", "V-26 (à créer)", "R-15 (à créer)"]
genere_par: claude
verifie_par: xav
---

# BRIEF — Menu tactile fermable, puis plein écran (20/09)

Mini-file de **trois commits, dans cet ordre, chacun retirable seul**. Branche dédiée `menu-tactile-2026-09-20`. Aucun `push`.
Périmètre de lecture : `src/ui/menu.js`, `src/plein_ecran.js`, `src/touch.js`, `index.html` et sa feuille de style, `locales/`, les tests de ces modules. Dans `docs/DOC_suivi-dettes.md`, ne lire que les lignes citées ici. **Le suivi fait foi** : si un identifiant « à créer » est déjà pris, prendre le suivant et le dire dans le journal.

## Contexte (constaté par Xav le 20/09 à 03 h 15, sur téléphone, Chrome Android)

Le jeu est en ligne : `https://xab-dev.github.io/RPGv2/` (GitHub Pages, servi depuis `main`). Conséquence : **un `push` sur `main` publie le jeu**. Deux défauts vus sur le téléphone :

1. **Le menu Pause enferme le joueur.** Hors plein écran, la page ne fait qu'environ 703 × 280 px CSS en paysage. La liste dépasse, « Fermer » est hors écran, rien ne défile au doigt. Xav a dû quitter le jeu.
2. **Le plein écran ne se déclenche jamais** au premier appui (`D-30`, `V-25`).

---

## Commit 0 — Ménage de journal et constats (doc seule)

Ménage habituel, puis consigner :

- **`D-31` : close par décision de Xav — « ça vient du matériel ».** Son téléphone n'est plus une cible (« juste bon à changer »). Le **plancher mobile est revu à la hausse** ; sa définition exacte est `[OUVERT]`, elle se fixera sur le téléphone du neveu. `A-07` (profil USB) tombe. `D-02`, `D-03` et la part mobile de `Q-20` : dégeler, et relire à la lumière de cette décision sans rien corriger.
- **`R-15` (à créer)** : relevé du 20/09 03 h 13, même téléphone, **en ligne** (GitHub Pages), hors plein écran, échelle naturelle 3 — 37,3 fps, delta moyen 26,81 ms, `maj()` 1,46 ms, `dessiner()` 5,78 ms, 42 recalculs du calque statique (moy. 8,05 ms). Identique à `R-12` : **le Wi-Fi local n'y était pour rien.**
- **Nouveau point de comparaison bas** (déclaratif, sans relevé) : portable Windows 7 **sans GPU**, Chrome, 56 à 58 fps, jouable sans grosse saccade.
- **Ouvrir `D-42`** (menu non fermable au tactile, P1) et **rouvrir `D-30`** (voir commit 2).
- Dans `CLAUDE.md` § État du dépôt : l'URL publique, et « `push` sur `main` = publication ».

## Commit 1 — `D-42` : un menu qu'on peut toujours fermer

**Cause racine d'abord.** Reproduire sous Chrome PC, F12, émulation tactile, fenêtre **703 × 280** en paysage. Dire *pourquoi* rien ne défile avant de corriger. Suspects à vérifier, pas à présumer : `overflow` du conteneur, hauteur non bornée, `touch-action: none` ou `preventDefault()` tactile appliqués à toute la page, menu compris.

**Attendu**

- Le conteneur des menus est **borné à la hauteur visible** (`100dvh`, avec repli) et **défile à l'intérieur de lui-même**. Le canvas, lui, continue de ne pas défiler.
- Le défilement au doigt marche **dans** le menu, sans jamais déclencher un verbe de jeu dessous.
- À la manette et au clavier, **le focus amène l'entrée dans la zone visible**.
- **« Fermer » est atteignable sans défilement.** Retenu par défaut, `[OUVERT]` : « Fermer » sort de la liste et se fixe dans un en-tête du menu qui ne défile pas. Si le verbe `MENU` ne referme pas déjà le menu sur les trois périphériques, le signaler (ne pas l'ajouter sans le dire).
- Le correctif vit **au niveau partagé** (`creerControleurMenu` / `creerEcranListeGenerique` et la feuille de style), pas écran par écran : Poche, Craft, Coffre, Stats, Construction et la confirmation de reset sont la même classe de défaut. Les vérifier tous à 703 × 280.

**Règle à inscrire dans `CLAUDE.md`** (contraintes de méthode) : *toute interface ouvrable au tactile est fermable au tactile, sans défilement.*

**Tests.** Node n'a pas de moteur de mise en page : aucun test ne peut prouver « ça tient dans l'écran ». Tester ce qui est testable — « Fermer » n'est plus un enfant de la liste défilante ; l'invariant `menu.estOuvert()` tient toujours ; le focus appelle bien la mise en vue. Le reste est une **validation en jeu : `V-26` (à créer)**.

**Hors périmètre** : le style des menus (jetons, grille de cartes, écran de référence) — chantier suivant, ne rien anticiper. Aucun changement d'ordre ni de contenu des entrées.

## Commit 2 — `D-30` rouvert : plein écran au relâchement, et par le menu

**Hypothèse à vérifier avant tout code.** Le journal du 20/09 dit que la demande part du `touchstart`, « ce que le navigateur exige ». Hypothèse inverse : **Chrome n'accorde pas l'activation utilisateur au `touchstart`** (il peut ouvrir un défilement), mais au **`touchend`** et au clic. La demande serait donc refusée, le refus avalé par le contrat « meilleur effort », et le loquet « une seule tentative » empêcherait toute nouvelle demande. Vérifier sous Chrome (émulation tactile, en journalisant temporairement la raison du rejet). **Si l'hypothèse est fausse : s'arrêter et rapporter, ne pas corriger à l'aveugle.**

**Attendu** (décisions de Xav, 20/09)

- La demande automatique part du **premier relâchement tactile**. `touch.js` reste ignorant du plein écran (même crochet injecté, renommé selon ce qu'il fait). Loquet inchangé : posé sur la tentative, jamais réarmé.
- **Une entrée de menu à bascule** : « Plein écran » quand on n'y est pas, « Quitter le plein écran » quand on y est. Le libellé lit **l'état réel** (`document.fullscreenElement`, écoute de `fullscreenchange`), jamais un booléen interne — même principe que « le résultat fait foi ».
- Sortir par le menu ne redéclenche pas la demande automatique.
- Entrée **masquée si l'API est absente** (`[OUVERT]` : affichée sur PC aussi, retenu par défaut — oui).
- Paysage tenté seulement après un plein écran réussi : inchangé.

**Piège connu.** Un bouton de **manette** n'est pas un geste utilisateur pour le navigateur (la manette est lue par sondage, pas par événement) : « Plein écran » confirmé à la manette sera très probablement refusé. Ne pas contourner. Le refus laisse le libellé inchangé (état réel) et affiche un court message localisé FR/EN. Le dire dans le journal si c'est vérifié.

**Tests.** Mettre à jour les cinq cas d'échec existants ; ajouter : le crochet part au relâchement et pas au contact · le libellé suit l'état réel · un refus laisse l'état cohérent.

**Validation `V-25`, réécrite** : pré-contrôle sous Chrome PC en émulation tactile ; verdict sur un vrai téléphone **par l'URL publique**, donc après fusion et `push` de Xav. À regarder : le jeu prend-il l'écran au premier relâchement · l'entrée de menu fait-elle l'aller **et** le retour · le menu reste-t-il fermable en plein écran (échelle 4) comme hors plein écran (échelle 3).

---

## Rapport attendu

Fichier de bord `docs/JOURNAL_2026-09-20_menu-tactile.md`, une ligne par commit au moment du commit. **§0 ter** : dire dès la première ligne si Chrome est connecté ; s'il l'est, une capture du menu à 703 × 280 avant et après dans `docs/captures/`.

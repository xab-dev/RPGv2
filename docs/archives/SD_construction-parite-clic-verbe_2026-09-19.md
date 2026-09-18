---
projet: RPG V2
episode/session: Construction — 3ᵉ passe sur le cycle de vie du menu
type: ticket diagnostic (SD)
version: 1.1.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — SD : Construction — le menu Pause réapparaît à l'entrée en placement, chemin « verbes » (2026-09-19)

**Type** : diagnostic, cause racine avant patch. **Contexte** : troisième passe sur `ui/menu.js` après `e1c4ff3`, `a70a089` et le correctif « écrans orphelins » (contrat unifié `creerControleurMenu#element`, journal du 2026-09-17 soir). **v1.1.0** : le bug n'est PAS propre à la manette — Xav l'a reproduit à l'identique **au clavier seul** (2026-09-19). C'est le chemin *verbes* qui diverge du chemin *clic*. L'hypothèse « mapping manette » de la v1.0.0 est écartée. La cause ci-dessous a été lue dans `src/ui/menu.js` (version du projet, post-correctif du 17/09 soir) — **à confirmer par le test rouge du §3 avant tout code**.

## 0. Avant tout code

Ménage de journal (règle de méthode). `git status` + `git log --oneline -8` rapportés en tête du journal, pour confirmer que HEAD contient bien le correctif « écrans orphelins ». Relire `docs/CARTE_cycle-de-vie-ui_2026-09-17.md`.

## 1. Faits (retour Xav, navigateur réel, 2026-09-19)

**Souris et tactile (clic DOM) : comportement parfait.** Première validation tactile réelle du jeu (jouable). Rendu « un peu laggy » — hors scope, à consigner en dette (§5).

**Manette ET clavier seul (verbes) : même divergence.**

| # | Action | Observé | Attendu |
|---|---|---|---|
| S1 | `MENU` → `A` sur Construction → `A` sur une station | Le **menu principal** est affiché ; le stick **navigue dans ce menu**, pas le fantôme | Aucun écran de menu visible ; le stick déplace le fantôme |
| S2 | `B` | Le menu disparaît, le stick déplace la station | `B` annule le placement et revient à la liste |
| S3 | `A` (pose) → liste → `A` sur une station | Menu principal **de nouveau affiché**, mais le stick déplace la station ; boucle pose/reprise possible, menu toujours visible | Rien de visible pendant le placement |
| S4 | Fermer | Jeu normal, héros mobile, **menu principal affiché** par-dessus | Aucun écran visible |

## 2. Cause lue dans le code (à confirmer par le test)

`creerEcranListeGenerique#traiterInput` :

```js
controleur.traiterInput(etat);
if (controleur.estOuvert()) { actualiserFocus(); }
else { afficherEcran(el, false); if (onFermer) onFermer(); }
```

La branche `else` **déduit** « fermé par `B` » du seul fait que le contrôleur est fermé après coup. Or une **action** peut aussi le fermer pendant ce même `traiterInput` : `A` sur une station → `demarrerConstruction` → `ouvrirPlacementConstruction` → `ecranConstruction.fermerSansCallback()`. La fonction dont tout le rôle est de NE PAS rappeler `onFermer` est immédiatement suivie, au retour dans `traiterInput`, d'un `onFermer()` = `onFermerVersMenuPrincipal` → `afficherEcran(conteneur, true)`. Le clic, lui, appelle `toutes[i].action()` directement, sans jamais passer par cette branche : d'où souris/tactile sains.

Les quatre symptômes en découlent, sans autre hypothèse :
- **S1** : `conteneur` visible + `controleur` principal jamais fermé → `controleur.estOuvert()` vrai (contrat unifié) → `menu.estOuvert()` vrai → le menu est prioritaire sur `traiterConstruction()` dans `main.js#maj()`.
- **S2** : `B` va au contrôleur principal (`verbeAnnuler`) → `ouvert = false`, `conteneur` caché. Le placement n'est pas annulé, il est seulement « libéré ».
- **S3** : même branche `else` → `conteneur` ré-affiché, mais sur un contrôleur désormais fermé → `menu.estOuvert()` faux → verbes au placement, DOM affiché.
- **S4** : « Fermer » → `onFermer` ré-affiche `conteneur` sur ce contrôleur mort. Famille du « symptôme 3 » du 17/09.

Effet secondaire à vérifier au passage : « Fermer » **par verbe** appelle `onFermer` deux fois (une dans `fermer()`, une dans la branche `else`). Idempotent aujourd'hui, donc invisible.

**Pourquoi la suite était verte** : `test_sd_menu_ecrans_orphelins` choisit la station sans passer par `ecranConstruction.traiterInput(etat)` avec un vrai `attack.pressed` (clic ou appel direct de l'action). À vérifier et à dire dans le journal.

## 3. Méthode imposée

1. **Test rouge d'abord** — `tests/test_sd_construction_parite_clic_verbe_2026-09-19.js`, vrai `ui/menu.js`, faux DOM habituel. La séquence S1→S4 est jouée **deux fois** : (a) par clics DOM, (b) **uniquement par `menu.traiterInput(etat)`** avec des `attack.pressed` / `skill_3.pressed` / `move` réels, aucune action appelée directement. Après chaque pas, même quadruplet comparé : écrans non `hidden` · `menu.estOuvert()` · `constructionActif()` · qui a reçu `MOVE` (fantôme / focus). Rouge attendu sur HEAD, chemin (b), dès S1. **S'il ne rougit pas, la lecture du §2 est fausse : ne rien coder, rapporter.**
2. **Correctif : supprimer la déduction, pas la contourner.** L'annulation doit être un événement explicite, jamais un état inféré après coup. Direction attendue : `creerControleurMenu` accepte un `options.onAnnuler`, appelé par `verbeAnnuler` ; l'écran générique y branche son propre `fermer()` ; la branche `else` de `traiterInput` disparaît. Une fermeture a alors exactement deux origines — `fermer()` (avec callback) ou `fermerSansCallback()` — quel que soit le périphérique. Si Claude Code voit une forme plus simple qui respecte ce principe, la prendre et le justifier.
3. **Même audit sur les deux autres sites qui infèrent après coup** dans `menu.traiterInput` (retour de la confirmation de reset via `ouvertIntentionnellement()` ; `else afficherEcran(conteneur, false)` du contrôleur principal). Les aligner sur `onAnnuler` **seulement si** ça ne change aucun comportement validé ; sinon le noter en dette, ne pas forcer.
4. **Invariant permanent** : le test de parité devient générique — pour **chaque** entrée de **chaque** écran (liste parcourue, jamais codée en dur), clic et verbe donnent le même quadruplet.

**Interdits** : un drapeau « ne pas rappeler onFermer cette frame » ; un `afficherEcran(conteneur, false)` rajouté dans `ouvrirPlacementConstruction` pour écraser le ré-affichage ; une nouvelle fermeture/réouverture explicite de `controleur` ; toute branche par périphérique ; toucher `render.js` ou le routage de `main.js#maj()`.

## 4. Hors scope

Performance / fps · aide-texte du placement · verbe de rotation et maintien `MOVE` (`[OUVERT]`) · silhouette du puits · refonte de `menu.js` (§6).

## 5. Livrables

`node --check`, suite complète verte, journal `CLAUDE.md` (cause confirmée par le test, pourquoi le test du 17/09 ne l'avait pas vue). **Dette**, sans rien trancher : « tactile réel » → partiellement levée (Xav, 2026-09-19 : tactile et souris jouables ; test du neveu toujours dû) ; Construction validée au clic, chemin verbes dû après ce correctif ; « rendu un peu laggy » ajouté à *mesure réelle du temps de frame*, daté. États 29-32 de `CHECKLIST_visuelle.md` toujours dus.

## 6. À remonter à Xav — `[OUVERT]`, ne pas implémenter

Trois bugs de suite ont la même forme : un état **déduit** après coup (booléen vs DOM, « fermé donc annulé ») au lieu d'un événement **déclaré**. Proposition à chiffrer dans le journal (effort, risque, fichiers), **sans la coder** : état d'UI pur (pile d'écrans + mode placement, sans DOM, testable headless) dont la visibilité DOM et le routage des verbes sont dérivés par une seule fonction ; clic et verbe ne font que dispatcher une action. La carte du 17/09 sert de table de transitions.

## 7. Validation manuelle (Xav, manette puis clavier seul)

`MENU` → Construction → station → rien à l'écran, le stick bouge le fantôme → `B` annule, retour liste → station → `A` pose → liste → autre station → pose → `B` → menu Pause → Fermer → rien à l'écran, héros mobile.

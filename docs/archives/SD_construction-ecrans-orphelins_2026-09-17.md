# RPG V2 — SD : Construction — cause racine des écrans de menu orphelins (2026-09-17, soir)

**Type** : correction fondée sur `docs/CARTE_cycle-de-vie-ui_2026-09-17.md` (session lecture seule). Ménage de journal d'abord (règle de méthode). Lire la carte en entier avant cette fiche.

## 1. Cause reconstruite (à confirmer par un test qui échoue AVANT correctif)

Le mécanisme des sous-écrans du menu Pause (Stats, Poche, Reset, liste Construction) repose sur une convention : **`controleur` (principal) reste `ouvert=true` tant qu'un sous-écran est affiché**, `conteneur` est simplement caché, et le retour passe par `onFermerVersMenuPrincipal`, qui ré-affiche `conteneur` sans rouvrir `controleur` (il ne l'a jamais fermé). Carte §3, lignes Stats / Reset / Construction (liste).

Le mode placement doit sortir de cette pile (pour que la machine `construction` reçoive les verbes) **et y revenir** (retour à la liste après `A`/`B`). Aucune transition existante ne fait ça. Les deux sessions ont chacune cassé un sens :

- `e1c4ff3` : `controleur` laissé ouvert → `menu.estOuvert()` vrai → routeur menu prioritaire (carte §4.5) → stick dans le menu pendant le placement.
- `a70a089` : `controleur.fermer()` ajouté dans `ouvrirPlacementConstruction` (`menu.js:715`) → verbes libérés, **mais** `reouvrirListeConstruction` (`menu.js:491-494`) rouvre `ecranConstruction` sans rouvrir `controleur`. Chemin composé **Start → Construction → A (station) → A ou B → B (liste)** : `onFermerVersMenuPrincipal` (`menu.js:365-368`) ré-affiche `conteneur` sur un `controleur` fermé → `menu.estOuvert()` faux, héros mobile, DOM affiché. Start + Quitter répare parce que `menu.ouvrir()` reconstruit tout.

Cause racine : `menu.estOuvert()` OR-combine **deux contrats** (carte §1.2) — booléen pur pour `controleur`/`controleurConfirmation`, booléen ET DOM (`&& !el.hidden`) pour les 5 écrans génériques. Un mode qui sort de la pile et y revient ne peut satisfaire les deux en jouant sur `controleur.fermer()` : soit le menu vole les verbes, soit le retour tombe sur un contrôleur mort.

## 2. Correctif (piste 1 de la carte)

1. **Unifier le contrat** : `controleur.estOuvert()` et `controleurConfirmation.estOuvert()` deviennent `ouvert && !<leur élément>.hidden`, exactement comme `creerEcranListeGenerique` (`menu.js:251`). Une seule définition de « ouvert » pour les 7 signaux de `menu.estOuvert()`. Vérifier que `creerControleurMenu()` peut recevoir l'élément DOM associé sans casser son usage par les écrans génériques (qui font déjà le `&&` à l'extérieur — ne pas le faire deux fois).
2. **Annuler** `controleur.fermer()` dans `ouvrirPlacementConstruction` (`menu.js:715`) : le placement redevient un sous-écran ordinaire — `controleur` reste sur la pile, `conteneur` caché, le menu ne réclame pas les verbes, `onFermerVersMenuPrincipal` retrouve un contrôleur cohérent avec son DOM. Retirer aussi le `afficherEcran(conteneur,false)` redondant de `menu.js:716` et le double masquage du bandeau (`menu.js:500` puis `707`) si la simplification tombe naturellement — pas de refactor au-delà.
3. **Piste 2 de la carte, à faire dans la foulée si elle tient en 10 lignes** : accesseur `menu.bandeauEstOuvert()` inclus dans `menu.estOuvert()`, pour que le gel du jeu pendant le placement ne repose plus sur l'appariement par convention avec `constructionActif()` (carte §1.3). Sinon, dette.
4. Ne rien changer au routage de `maj()` (§4) ni au calcul unique de `uiOuverte` : la double lecture §4.5 n'est pas en cause, la noter en dette si elle ne l'est pas déjà.

Vérifier que le reset (« Oui » ferme `controleur` explicitement, `menu.js:601`) et Craft/Coffre (jamais sur la pile) restent inchangés en comportement — ce sont les patrons sains de la carte §5.

## 3. Test d'abord

`tests/test_sd_menu_ecrans_orphelins_2026-09-17.js`, écrit **avant** le correctif, sur le vrai DOM (comme `test_construction_2026-09-17.js` C3bis) :

- **Invariant**, vérifié après chaque verbe : `menu.estOuvert() === (au moins un écran de menu — conteneur, confirmation, écrans génériques, bandeau — visible dans le DOM)`, et `uiOuverteMaintenant() === (menu.estOuvert() || constructionActif() || dialogue…)`.
- **Séquence composée complète**, pas transition par transition : Start → Construction → A (station) → MOVE (le fantôme bouge, pas le focus) → B → liste visible → A (autre station) → A (pose) → liste visible → B → menu Pause visible **et** `controleur.estOuvert()` vrai → Quitter → rien de visible, héros mobile. Puis la même avec `MENU` pendant le placement.
- Ce test doit **échouer sur `a70a089`** (symptôme 3) ; si on le rejoue sur `e1c4ff3`, il échoue au premier MOVE (symptôme 2). Le rapporter dans le journal.

## 4. Livrables

`node --check`, suite complète verte, journal `CLAUDE.md` (cause confirmée par le test, ce qui a été écarté), règle de méthode candidate à proposer — pas à inscrire sans validation de Xav : *« ouvert » pour un écran DOM signifie toujours booléen ET DOM visible ; un écran qui n'a pas d'accesseur n'existe pas pour le routage.* Validation manette par Xav sur la séquence du §3 et sur les états 29-32 de `CHECKLIST_visuelle.md`, toujours dus.

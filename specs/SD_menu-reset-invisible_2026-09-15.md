# RPG V2 — Session diagnostic : écran de confirmation du reset invisible (2026-09-15)

**Contexte déjà disponible pour Claude Code** : lire `CLAUDE.md` en entier, en particulier le journal « Diagnostic blocage choix du follet » §B (réinitialisation de la sauvegarde) et son avertissement explicite : *« l'écran de confirmation DOM lui-même n'a pas pu être exercé en navigateur réel »*. Ce ticket est la suite directe de cet avertissement. Fichiers concernés : `src/ui/menu.js`, `index.html`, `src/main.js` (câblage `definirActionReinitialiser`).

## Contexte

Xav a testé le reset en jeu réel (clavier + manette). Constat factuel :

1. Menu ouvert → focus sur « Réinitialiser la sauvegarde » → A : **rien ne s'affiche**. Le menu principal disparaît, aucun écran de confirmation n'apparaît, le jeu reste figé derrière (héros immobile).
2. B dans cet état → retour au jeu, au même point, sauvegarde intacte.
3. **En aveugle** (stick haut pour passer de Non à Oui, puis A) : le reset **fonctionne** — retour au cold open du choix du follet sans recharger la page.

Verdict déjà acquis par ce test : `creerControleurMenu` (sous-écran), `reinitialiserPartie()` et `reinitialiserSauvegarde()` sont sains. Le héros figé est le comportement attendu (`etatNeutre` tant qu'une UI est ouverte). **Le seul défaut est le rendu DOM du sous-écran de confirmation** : il est fonctionnellement ouvert mais invisible.

## Hypothèses à trancher (ne pas deviner en silence)

- **Hypothèse A** — L'élément DOM de confirmation est construit dans `menu.js` mais **jamais inséré** dans le document (`appendChild` absent, ou inséré dans un conteneur lui-même absent).
- **Hypothèse B** — Il est inséré **comme enfant du conteneur du menu principal**, et l'ouverture de la confirmation masque ce conteneur (`display: none`) pour respecter « jamais les deux visibles en même temps » — ce qui masque aussi l'enfant. La règle est bonne, l'arbre DOM est faux.
- **Hypothèse C** — Il est inséré au bon endroit mais son style de visibilité n'est jamais basculé : la fonction qui ouvre le sous-écran change l'état du contrôleur sans toucher `style.display`/`hidden`, ou bascule une classe que rien ne définit (`index.html` n'a pas été touché lors du ticket, le style est censé être inline).
- **Hypothèse D** — Il est visible mais **derrière le canvas** (ordre d'empilement / `z-index` / `position` absent), contrairement au menu principal qui, lui, a le bon empilement.

Non exclusives (B et D peuvent coexister). A, B, C, D se distinguent en 30 secondes dans l'inspecteur : chercher l'élément dans l'arbre DOM après avoir déclenché la confirmation, puis lire ses styles calculés (`display`, `visibility`, `position`, `z-index`, rectangle).

## Méthode de diagnostic attendue

1. Lire `menu.js` : suivre le cycle de vie de l'élément de confirmation (création → insertion → affichage → masquage) et comparer ligne à ligne avec celui du menu principal, qui fonctionne. L'écart trouvé désigne l'hypothèse.
2. **Test rouge-avant-patch** avec la fixture de faux DOM déjà utilisée par `tests/test_phase0_input` (à étendre si nécessaire, pas à dupliquer) : après `initialiserMenu()`, déclencher l'action « réinitialiser » via le contrôleur, puis affirmer que (a) l'élément de confirmation est attaché au document, (b) son état visible est vrai et (c) celui du menu principal est faux ; puis `skill_3` → (b) et (c) inversés. Le test doit être **rouge** avant correction, sinon il ne teste pas la bonne chose (cf. règle du diagnostic précédent : si vert dès l'écriture, remonter d'un cran).
3. Corriger la cause, pas le symptôme : si B, sortir le sous-écran de l'arbre du menu principal (frère, pas enfant) ; si C, faire passer les deux écrans par la **même** fonction d'affichage/masquage ; si D, aligner le positionnement sur celui du menu principal. Pas de `setTimeout`, pas de double `display` forcé.
4. Vérifier en navigateur réel avec capture d'écran : l'écran de confirmation est visible, focus par défaut sur **Non**, Oui déclenche le cold open, B revient au jeu.

## Contraintes non négociables

- Cause racine avant patch. Ne pas toucher `reinitialiserPartie()`, `save.js`, `creerControleurMenu()` — ils sont validés en jeu réel.
- Zéro chaîne en dur ; les 4 clés `menu.reset_*` existent déjà, ne pas en ajouter.
- Style inline depuis `menu.js` comme le focus existant, `index.html` reste sans logique.
- Si un défaut annexe apparaît dans le menu (ex. ordre des entrées), le documenter dans `CLAUDE.md` sans le corriger.
- Commentaires en français, *pourquoi* pas *quoi*.

## À la fin de la session

Dans `CLAUDE.md` : (1) hypothèse confirmée avec la ligne fautive, (2) correctif et test rouge→vert, (3) capture ou description de la vérification en navigateur, (4) rappel que la logique de reset était déjà validée en aveugle par Xav.

## Hors scope explicite

Contenu du menu, navigation horizontale, remapping, tactile, rendu canvas (traité par `MT_rendu-net_2026-09-15.md`), tout ce qui n'est pas la visibilité de ce sous-écran.

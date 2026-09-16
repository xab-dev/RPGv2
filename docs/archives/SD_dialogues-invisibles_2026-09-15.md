# RPG V2 — Session diagnostic : dialogues invisibles après le rendu net (2026-09-15)

**Contexte déjà disponible pour Claude Code** : lire `CLAUDE.md` en entier, puis le journal de la session `MT_rendu-net_2026-09-15.md` (rendu à résolution physique, `setTransform(f)`, composition du voile, présentation 1:1). Fichiers concernés : `src/render.js`, `src/ui/dialogue_box.js`, `src/main.js#dessiner()`.

## Contexte

Après le MT rendu-net (validé par Xav : net en 1080p, fenêtré et sur smartphone ; tactile, clavier et manette OK) et le SD écran de confirmation (validé), **plus aucun dialogue ne s'affiche**. Le jeu, lui, avance : A fait défiler les lignes invisibles, le choix du follet fonctionne, le premier monstre se tue. La logique de dialogue est donc intacte ; c'est le **dessin** de la boîte qui n'atteint plus l'écran. Régression introduite par le MT rendu-net (le SD ne touche que du DOM).

Vérifier aussi l'écran de choix du follet (formes triangle/goutte/carré + curseur) : Xav peut choisir, mais confirmer s'il est visible — s'il ne l'est pas, même cause, même correctif.

## Hypothèses à trancher (ne pas deviner en silence)

- **Hypothèse A** — La transformation `f` est remise à l'identité pour composer le voile (`drawImage` 1:1) ou pour présenter, et **n'est pas restaurée** avant les calques suivants (dialogue, écran de choix, aura, étiquettes). Ces calques sont alors dessinés en pixels physiques aux coordonnées logiques : une boîte de ~120 × 60 px dans le coin haut-gauche d'un canvas 1920 × 1080, ou hors cadre.
- **Hypothèse B** — La boîte de dialogue est dessinée sur le **canvas visible** (ou sur l'ancien contexte 480 × 270) alors que la scène est maintenant rendue hors-écran à taille physique ; la présentation `drawImage` du hors-écran vient ensuite la recouvrir.
- **Hypothèse C** — `main.js#dessiner()` dessine le dialogue **avant** la composition du voile depuis le MT (réordonnancement involontaire) et il est assombri/écrasé par le voile à opacité 0,72 puis par la teinte additive.

Exclusives entre elles pour un même calque, mais A peut coexister avec C. Se tranchent en lisant l'ordre exact des appels dans `dessiner()` et l'état de `ctx.getTransform()` juste avant `dessinerDialogue()`.

## Méthode de diagnostic attendue

1. Lire `main.js#dessiner()` et `render.js` : reconstituer l'ordre des calques et, pour chacun, (a) sur quel canvas/contexte il écrit, (b) quelle transform est active à ce moment. Le premier calque qui écrit avec une transform identité ou sur le mauvais canvas désigne l'hypothèse.
2. **Test rouge-avant-patch** (headless, sans rendu réel) : avec un faux contexte 2D qui enregistre `setTransform`/`save`/`restore`/`drawImage` et le contexte cible de chaque appel, rejouer une frame avec un dialogue ouvert et affirmer que l'appel de dessin du dialogue (a) vise le canvas hors-écran de scène et (b) survient avec la transform `f` active et après la composition du voile. Le test doit être rouge avant correction.
3. Corriger la **cause** : encapsuler toute composition de calque (voile, présentation) dans une fonction unique de `render.js` qui pose la transform identité et **garantit sa restauration** (`save`/`restore` ou re-`setTransform(f)` en fin de fonction, commenté pourquoi). Aucun `setTransform` inline dans `dessiner()`. Si B : rediriger le dessin du dialogue vers le contexte hors-écran, jamais l'inverse.
4. Vérification en navigateur réel avec **une capture par état** : scène seule, dialogue ouvert, écran de choix du follet, menu DOM ouvert, aura + étiquette ennemi, HUD tactile actif. Pas seulement l'état corrigé.

## Contraintes non négociables

- Cause racine avant patch ; ne pas « décaler » ou « agrandir » la boîte pour la faire réapparaître.
- Aucun changement au contenu/logique de `dialogue.js`, aux seuils du MT rendu-net (résolution, DPR, facteur entier), au SD écran de confirmation.
- Le test headless n'exerce pas le rendu réel : il n'inspecte que l'ordre des appels et les transforms — conforme à la règle projet.
- Commentaires en français, *pourquoi* pas *quoi*.

## À la fin de la session

Dans `CLAUDE.md` : (1) hypothèse confirmée et ligne fautive, (2) correctif + test rouge→vert, (3) captures des 6 états, (4) **nouvelle règle de méthode** consignée dans les contraintes non négociables : *toute composition de calque qui touche la transform passe par une fonction qui la restaure ; tout ticket touchant `render.js`/`hud.js`/`dialogue_box.js`/`main.js#dessiner` rejoue `specs/CHECKLIST_visuelle.md` avec captures avant de conclure.* Créer `specs/CHECKLIST_visuelle.md` avec les 6 états du point 4 de la méthode (liste à enrichir à chaque nouveau calque).

## Hors scope explicite

Contenu des dialogues, clignements/orbite pré-choix (`[OUVERT]` hérité), style graphique, Phase 2.

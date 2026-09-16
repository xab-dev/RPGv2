# RPG V2 — Session diagnostic : accrochage des coins en collision, premier arbre introuvable, verdict Phase 2 (2026-09-16)

## Contexte

Xav a rejoué le critère de passage de la Phase 2 (`specs/03_maison-exterieur.md` §7) à la manette et au clavier le 2026-09-16. Résultat détaillé dans `docs/NS_critere-passage-phase2_2026-09-16.md`. Deux constats à diagnostiquer, un état à consigner :

- **A.** Porte d'1 tuile et passages étroits de la forêt : « parfois gênant ». Verdict Xav précis : **ce n'est pas la largeur du passage** (acceptée, elle reste à 1 tuile) mais **la hitbox de l'angle qui accroche** — en approche oblique, le héros s'arrête net sur un coin de tuile solide au lieu de glisser dans l'ouverture.
- **B.** Sur tout le parcours bouche de grotte → maison → jardin → campagne, Xav n'a **jamais rencontré d'arbre qui réagisse à `INTERACT`** (rocher : oui, dialogue OK). Relance faite : Xav **confirme** n'avoir rencontré aucun arbre interactif hormis le fruitier du jardin. Or la spec §3.2 impose que le premier arbre interactif soit **sur le chemin naturel** entre la grotte et la maison, touché sans instruction — s'il faut le chercher, le critère n'est pas rempli, indépendamment de l'existence de l'arbre.
- **C.** Le reste du critère est validé (voir sujet C) ; le journal `CLAUDE.md` dit encore « pas encore rejoué par Xav ».

## Hypothèses à trancher (ne pas deviner en silence)

Sujet A :
- **Hypothèse A1** — Glissement axe par axe sans correction de coin : quand le déplacement est diagonal et qu'un seul coin de la hitbox chevauche de quelques pixels une tuile solide adjacente à l'ouverture, la résolution bloque l'axe entier au lieu de repousser le héros perpendiculairement vers l'ouverture. Résultat : arrêt net tant que le joueur n'aligne pas manuellement.
- **Hypothèse A2** — Ordre de résolution des axes : X résolu avant Y (ou l'inverse) de façon fixe ; selon l'orientation du passage, l'axe « libre » est annulé par le test de l'autre axe.
- **Hypothèse A3** — Rayon/hitbox du héros trop proche de la tuile : le corridor de 12 px (cf. `CHECKLIST_visuelle.md` états 19-23) ne laisse aucune tolérance, donc la moindre approche non centrée accroche. A3 ne s'exclut pas de A1 : si A1 est confirmée, une correction de coin suffit probablement sans toucher au rayon.

Sujet B :
- **Hypothèse B1** — Le layout manuel ne place **aucun** `tile_arbre` (avec `ressource: res_bois`) sur le chemin grotte → maison ; seuls les arbres de fond (`tile_arbre_fond`, non interactifs) y sont visibles.
- **Hypothèse B2** — Un arbre interactif est bien dans le layout, mais **hors du chemin naturel** (à l'écart, dans une zone où le joueur n'a aucune raison d'aller).
- **Hypothèse B3** — L'arbre est sur le chemin mais **ne réagit pas** : `ressource` non résolue sur cette tuile (le rocher fonctionne, donc le mécanisme est bon — vérifier que la légende de la scène mappe bien le caractère de l'arbre vers la tuile porteuse de `ressource` et non vers la variante de fond), ou seuil d'interaction inatteignable à cause d'arbres de fond solides autour.

## Méthode de diagnostic attendue

Sujet A : lire `scene.js` (collision 4 coins, glissement) et `entities.js`/`main.js` (application du `MOVE`). Écrire d'abord un **test headless reproduisant l'accrochage** : héros à 3–4 px de l'axe d'une ouverture d'1 tuile, vecteur `MOVE` diagonal vers l'ouverture → aujourd'hui le déplacement doit être nul ou quasi nul (le test rougit) ; il devient vert quand le héros est repoussé dans l'ouverture et avance. Trancher A1/A2/A3 par lecture du code et par ce test, pas par intuition.

Sujet B : lire `data/scenes.json` (layout + légende de `scene_maison_exterieur`) et la fonction de résolution des tuiles-ressources dans `scene.js`. Lister **toutes** les positions de tuiles porteuses de `res_bois`. Comparer à la trajectoire spawn → porte ouest de la maison. Vérifier que `INTERACT` à portée de la première d'entre elles ouvre `dlg_arbre_bloque` (ou l'id réel) via le vrai orchestrateur, comme dans `test_phase2_chemin_critique`.

## Ordre de traitement

1. **Sujet B** — court, et il conditionne la validation du point 1 du critère.
2. **Sujet A** — plus délicat (cœur du déplacement), à ne pas commencer sans le test rouge.
3. **Sujet C** — documentation, en fin de session.

## Détail par sujet

### A. Accrochage des coins
- Diagnostic : hypothèse confirmée parmi A1/A2/A3.
- Correction si A1 (ou A2) : une **correction de coin** dans la résolution de collision — quand un déplacement est bloqué sur un axe et que le chevauchement sur l'autre axe est inférieur à un seuil `TOLERANCE_COIN_PX` (nouveau seuil, un seul endroit, commenté pourquoi, **provisoire**, ordre de grandeur : le tiers du rayon du héros), repousser le héros de ce chevauchement puis rejouer le déplacement. Aucune modification du rayon du héros, de `tile_size` ni de la largeur des portes. Le glissement axe par axe existant reste ; la correction s'insère dans la même fonction, pas dans une seconde couche de résolution.
- Si A3 seule est confirmée (aucun défaut de résolution) : ne pas patcher le rayon en silence — documenter et remonter à Xav, c'est un choix de feeling.
- Test dédié : le test rouge ci-dessus + un test de non-régression prouvant qu'un mur plein reste infranchissable en diagonale (la correction ne doit jamais faire traverser un coin de mur). Toute la suite Phase 0/1/2 verte : le déplacement est utilisé par tous les audits de chemin critique.
- Rejouer `specs/CHECKLIST_visuelle.md` états 19-23 (porte de la maison) : un ticket qui touche au déplacement modifie ce qu'on voit à la porte, même s'il ne touche pas `render.js`.

### B. Premier arbre interactif
- Diagnostic : B1/B2/B3.
- Décision Xav (2026-09-16) à respecter : **l'arbre fruitier n'est jamais coupable** — il ne porte pas `res_bois`, il sert à ramasser des fruits et, plus tard, au jardin/récolte/craft/cuisine. Ne pas « résoudre » B en rendant le fruitier coupable.
- Correction : quelle que soit l'hypothèse, l'état final est celui de la spec §3.2 — **un `tile_arbre` porteur de `res_bois`, solide, placé dans le layout manuel à un endroit où la trajectoire spawn → maison passe à portée d'`INTERACT`**, visuellement distinct des arbres de fond (forme géométrique différenciable sans la couleur, §6). Si B3 : corriger la légende/résolution — pas de cas particulier en code, la tuile-ressource doit rester un interactif comme les autres.
- Test dédié : étendre `test_phase2_chemin_critique` — sur la trajectoire spawn → porte ouest, au moins une tuile `res_bois` est à portée d'`INTERACT` et son dialogue s'ouvre. Ce test protège le critère « sans instruction » contre toute réédition future du layout.

### C. Consigner le verdict du critère de passage dans `CLAUDE.md`
Remplacer le bloc « Critère de passage — reste à faire par Xav » du journal Phase 2 par l'état réel, sans rien inventer :
1. Manette : **validé le 2026-09-16** sur tout le parcours (grotte → rocher → branche → Poche → toit → stations → jardin/fruit/puits → campagne → persistance fermer/rouvrir), **sauf l'arbre** (sujet B — à rejouer par Xav après correction).
2. Tactile : **différé par décision Xav** jusqu'à un lien de partage (Phase 4 ou plus) ; testeur mobile de référence = le neveu de Xav. Dette tactile déjà actée, inchangée.
3. Nuit : lumières validées (follet, fenêtre, grotte) ; contraste des phases à renforcer → `docs/MT_jour-nuit-contraste_2026-09-16.md`. Durée du cycle : aucun verdict encore.
4. Musique : **aucun verdict** — en attente du fichier `assets/audio/piano_solo.mp3`.
5. Porte d'1 tuile : verdict rendu — largeur acceptée, accrochage des coins gênant → sujet A de cette fiche.
Le point `[OUVERT]` « stations placeholder non solides » est **tranché** : proportions gênantes (table plus petite que le héros), collision voulue sur les stations → `specs/04_stations-proportions-collision.md`. Retirer le `[OUVERT]`, pointer vers la fiche.

## Contraintes non négociables

Cause racine avant patch — le sujet A ne se corrige pas sans son test rouge. Zéro dépendance du gameplay à un périphérique : la correction de coin agit sur le vecteur `MOVE`, jamais sur une touche. Tout nouveau seuil en un seul endroit, commenté, provisoire. Commentaires et textes en français, localisation par `t("clé")` si un texte joueur est touché (aucun n'est prévu). Si le diagnostic B révèle que d'autres pièces interactives du layout manuel sont hors du chemin (arbre fruitier, second rocher…), le documenter dans `CLAUDE.md` sans les déplacer sauf si elles bloquent le critère.

## À la fin de la session

Pour A et B : (1) hypothèse confirmée (ou aucune), (2) ce qui a été corrigé et pourquoi, (3) tests passés (`node tools/run_tests.js`, `node --check`), (4) ce qui reste ouvert. Pour C : le bloc de journal réécrit. Puis remonter à Xav ce qu'il doit rejouer : l'arbre sur le chemin, et la porte/les passages de forêt en approche oblique.

## Hors scope explicite

Largeur des portes et des passages de forêt (acceptée par Xav), rayon du héros (sauf remontée explicite si A3), tuto des touches (`[OUVERT]`, à trancher par Xav), contraste jour/nuit (micro-ticket séparé), toast de ramassage aux ramassages suivants (déjà signalé « non fait »), mesure de fps, tactile.

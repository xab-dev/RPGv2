# Journal — `D-50` : Échap court ferme le menu, Échap long quitte le plein écran (2026-09-20)

*Archivé verbatim depuis `CLAUDE.md` au ménage de la session « synergies : l'aura réelle » (`D-51`, 2026-09-20). Fiche du ticket : [MT_echap-keyboard-lock_2026-09-20.md](MT_echap-keyboard-lock_2026-09-20.md).*


Un ticket, un commit, branche `main` (pas de `push`). Fiche : `docs/archives/MT_echap-keyboard-lock_2026-09-20.md`. 95 fichiers de test verts.

**Le constat de Xav, au clavier, sous Chrome.** En plein écran, un seul Échap fermait le menu **et** quittait le plein écran. Le journal de la nuit avait classé ça « rien à corriger, c'est le navigateur » : vrai pour la sortie elle-même — le navigateur intercepte Échap avant la page, et il en a le dernier mot — faux pour la conclusion, parce qu'il offre de **différer** sa propre sortie.

**Le moyen, et le point qui commande tout le ticket : l'appui long ne se code pas.** `navigator.keyboard.lock(['Escape'])` demande au navigateur de livrer Échap à la page tant que le plein écran **demandé par le jeu** est actif ; il garde alors la sortie sur un appui **maintenu** (~2 s) et affiche lui-même son message. Il n'y a donc aucun minuteur à écrire, aucune durée à mesurer, et `ui/menu.js` comme la couche d'input n'apprennent rien — ils reçoivent un Échap comme d'habitude. Un contrôle de source le vérifie (`ui/menu.js`, `input/input.js`, `input/keyboard.js`, `ui/grille_cartes.js` ne citent jamais cette API).

**Où ça vit.** `src/plein_ecran.js`, le seul module qui connaît déjà le plein écran, reçoit un quatrième objet injecté (`nav`, le `navigator`) et une fonction, `synchroniserVerrouillageEchap()`. Elle lit **l'état réel** (`fullscreenElement`), comme tout le reste de ce fichier, et jamais un booléen tenu de notre côté : actif → `lock(['Escape'])`, inactif → `unlock()`. Elle n'est donc **jamais** appelée hors plein écran pour poser un verrou, et le verrou est rendu même quand la sortie vient du joueur ou du système — le cas exact de l'appui maintenu. `main.js` l'appelle depuis l'écouteur `fullscreenchange` **qui existait déjà** (le seul endroit qui apprend que l'état réel a changé) ; le sous-système ne s'abonne à rien.

**Amélioration progressive, échec silencieux**, même contrat « meilleur effort » que le reste du module (règle née du diagnostic freeze-musique) : API absente — Firefox, Safari, tout iOS —, contexte non sécurisé, promesse rejetée, exception synchrone, retour qui n'est pas une promesse, `unlock` qui lève. Dans tous ces cas, rien ne change : Échap continue de faire les deux, sans une erreur en console ni un mot au joueur.

**Mesuré en vrai Chrome sans fenêtre** (scénario jetable, supprimé depuis ; le serveur local servait le jeu) : `navigator.keyboard.lock` est bien une fonction, `isSecureContext` vaut `true` sur `localhost`, l'entrée en plein écran produit `lock:Escape` et la sortie `unlock`, **zéro erreur console**. Ce que cette mesure prouve, c'est que **le fil est branché de bout en bout** — l'écouteur de `main.js` atteint le module, qui atteint l'API. Ce qu'elle ne prouve pas : l'appui maintenu lui-même, qui appartient au navigateur et ne se déclenche pas sans fenêtre.

**Tests** (dans `tests/test_d30_plein_ecran_tactile_2026-09-20.js`, point 10 — c'est le fichier du plein écran) : l'aller-retour nominal piloté par l'état réel, la sortie que personne n'a demandée, cinq formes d'API absente ou partielle, quatre formes de refus, et le contrôle de source ci-dessus. **Témoin vérifié** : le test tombe (`deepStrictEqual`) dès que le verrou cesse d'être conditionné à l'état réel.

**Hors périmètre, signalé sans rien toucher.** Rien de neuf ce coup-ci : `D-49` (le `canvasVisible.width` de `ajusterTailleCanvas`) reste ouverte, telle qu'ouverte hier.

**Ce que le ticket n'a pas cherché à contourner, et c'est voulu** : F11 n'est pas concerné (l'API ne vaut que pour le plein écran demandé par la page), il faut HTTPS ou `localhost` — donc le jeu en ligne et le dev local —, et ni le tactile ni la manette n'ont quoi que ce soit à y voir.

**`V-32` : validée par Xav le 20/09, au clavier sous Chrome PC — « all good ».** Ce qu'il a regardé, le jeu passé en plein écran **par l'entrée de menu** : Échap court ferme le menu et le plein écran reste · Échap court le rouvre · Échap maintenu sort · hors plein écran, Échap comme avant. **Fusionné et mis EN LIGNE le 20/09 à la demande explicite de Xav** (rien à fusionner : le ticket s'est fait sur `main`, où `menus-cartes` et `menu-tactile-2026-09-20` étaient déjà) — `push` fait par exception, sur sa demande, la règle « les `push` restent à la main de Xav » reste en vigueur.

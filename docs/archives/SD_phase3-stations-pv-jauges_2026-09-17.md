# RPG V2 — Session diagnostic : stations invisibles, PV perdus à la cuisson, jauges de survie figées (2026-09-17)

## Contexte

Première validation en jeu de `specs/04_maison-interieur.md` (v1.1.0) par Xav, 13 h 45, manette, navigateur réel, après **reset de sauvegarde** (partie neuve, pas une migration `3 → 4`). Ce qui marche : stations et puits solides et actionnables, menus Craft/Cuisine, craft, XP créditée (la barre monte après la cuisine). Trois constats factuels, sans présumer de la cause :

1. **Les 4 stations (table, atelier, coffre) et le puits sont invisibles** — collision et `INTERACT` fonctionnent, rien n'est dessiné. En Phase 2 (placeholders) elles se voyaient.
2. **Manger une pomme cuite fait baisser les PV** (constat à l'écran : la barre de PV descend).
3. **Les jauges faim/soif sont grises et ne bougent pas** — ni en décroissance avec le temps, ni à la hausse en mangeant ou en buvant au puits.

Point de méthode à relever d'emblée : `04_stations-proportions-collision.md` §3 exige que `solide: true` sans rendu soit **refusé au boot**. Il y a un garde-fou, il n'a pas tiré. Soit il n'existe pas, soit il valide une clé que la Phase 3 ne remplit plus. Ce n'est pas un détail : c'est exactement la classe « données valides mais obsolètes » du journal.

## Hypothèses à trancher (ne pas deviner en silence)

Sujet 1 — stations invisibles (la cause de 1 vaut sans doute pour le puits) :
- **H1a** — le rendu des interactifs résout le visuel par `type` ; les placeholders avaient une entrée `station_placeholder` dans `visuels.json`, le nouveau `type: "station"` n'en a pas, et la résolution retourne `null` sans lever.
- **H1b** — le rendu résout par `station_type` mais `stations.json > render` référence des ids de `visuels.json` inexistants (ou le champ s'appelle `render` d'un côté et `visuel` de l'autre).
- **H1c** — le rendu est bien résolu mais dessiné à l'échelle/position d'un objet de taille nulle (empreinte calculée depuis `stations.json`, visuel depuis une autre source) — les deux fonctions ne lisent pas la même donnée.
- Les hypothèses ne s'excluent pas. Dans tous les cas, **le garde-fou « solide sans rendu » a été contourné** : à diagnostiquer en même temps (H1d — il vérifie `interactif.render` en brut au lieu de passer par la fonction de résolution effective).

Sujet 2 — PV perdus à la cuisson :
- **H2a** — `buff_vitalite` monte Vitalité → `pv_max` recalculé à la hausse, `hero.pv` inchangé → la **barre relative** descend. Les PV n'ont pas baissé, l'affichage oui. (Prédiction testable : à la fin du buff, la barre remonte au même niveau.)
- **H2b** — le buff expire ou se pose deux fois et le `clamp(pv, 0, pv_max)` s'exécute avec l'ancien/nouveau `pv_max` dans le mauvais ordre → perte réelle.
- **H2c** — `consommation.{faim, soif}` est routé par erreur dans `status.js` comme un effet sur les PV (ou une clé `pv` négative traîne dans `items.json > item_fruit_cuit`).
- H2a est la plus probable ; si elle est confirmée, la règle à décider est écrite ci-dessous (§ Détail B).

Sujet 3 — jauges figées :
- **H3a** — `survival.js` existe et est testé, mais son tick n'est **pas appelé** depuis la boucle de jeu (`main.js`), ou est appelé avec `dt = 0` (mauvaise horloge : `Date.now()` vs temps actif, ou horloge jamais démarrée après un reset).
- **H3b** — le point de décision « une UI est ouverte » reste à `true` après fermeture d'un menu (mode construction absent, mais un état de menu mal remis) → gel permanent. (Vérifiable : le cycle jour/nuit et les cooldowns se figent-ils aussi ? Xav dit que le craft recrédite l'XP, ce qui n'exclut rien ; il faut regarder si le cooldown de 60 s expire.)
- **H3c** — le HUD lit une clé différente de celle qu'écrit `survival.js` (`survie` / `survival` / `jauges`), affiche la valeur par défaut « inconnue » = gris, et les vraies jauges bougent invisiblement. (Vérifiable en une ligne : les stats dérivées baissent-elles après 15 min ?)
- **H3d** — la partie neuve ne crée pas le bloc `survie` (seule la migration `3 → 4` l'initialise) → `undefined` partout, gris, rien ne bouge, consommation et puits écrivent dans le vide sans lever.
- H3d est cohérente avec « reset de sauvegarde » ; H3c avec « gris » ; elles peuvent coexister.

## Méthode de diagnostic attendue

1. **Sujet 1** : dans la console navigateur, pour chaque interactif de `scene_maison_exterieur` : `type`, `station_type`, le résultat de la fonction de résolution du visuel, la boîte dessinée. Comparer avec un levier de la grotte (qui se voit). Lire le garde-fou « solide sans rendu » et dire **pourquoi** il n'a pas tiré. Ne pas corriger avant d'avoir écrit la cause.
2. **Sujet 2** : loguer `hero.pv`, `pv_max`, modificateurs actifs juste avant/après consommation, et à l'expiration du buff. Une seule série de trois logs suffit à départager H2a/H2b/H2c.
3. **Sujet 3** : vérifier dans l'ordre : (a) `save.js` — la partie neuve produit-elle `survie.{faim, soif}` ? (b) `main.js` — le tick de `survival.js` est-il dans la boucle, avec quel `dt` ? (c) `hud.js` — quelle clé est lue ? (d) l'état « UI ouverte » après fermeture du menu Craft. Vérifier au passage que jour/nuit et cooldowns avancent (même horloge).

## Ordre de traitement

1. **Sujet 3 (survie)** — bloquant : sans jauges, la boucle de camp n'a pas de raison d'être et le sujet 2 est peut-être un symptôme du même câblage.
2. **Sujet 2 (PV)** — peut dépendre de 3 (H2c).
3. **Sujet 1 (rendu)** — gênant mais isolé ; touche `render.js` → checklist visuelle obligatoire, donc en dernier pour ne rejouer la checklist qu'une fois.

## Détail par sujet

### A. Jauges figées
Diagnostic selon la méthode ci-dessus. Correction attendue une fois la cause écrite : **une seule source d'initialisation** de l'état (partie neuve et migration passent par la même fonction `etatInitialSurvie()`), tick branché sur l'horloge de temps actif partagée avec `daynight.js` et `cooldowns.js` (si trois horloges existent, c'est la cause et il n'en reste qu'une), HUD qui lit la clé écrite. Tests : partie neuve → jauges à 1 ; 60 s de temps actif simulé → jauges < 1 ; UI ouverte → inchangées ; puits → soif à 1 ; `item_fruit_cuit` → faim remontée ; test « la partie neuve et la sauvegarde migrée produisent le même état de survie ».

### B. PV perdus à la cuisson
Si **H2a** : rien n'est cassé, mais le ressenti est mauvais et Xav a raison — manger ne doit jamais *paraître* nuire. Règle à appliquer (décision d'architecture, pas un patch d'affichage) : **quand `pv_max` monte par buff, `hero.pv` monte du même delta** (le buff de Vitalité donne les PV qu'il promet) ; quand il redescend à l'expiration, `pv` est clampé à `pv_max` sans autre perte. Un seul chemin, dans `stats.js`/`entities.js`, jamais dans le HUD. Test dédié : buff Vitalité +1 → `pv/pv_max` identique avant/après ; expiration → clamp seulement.
Si **H2b/H2c** : corriger la cause, même test.

### C. Stations invisibles
Correction : une **seule fonction de résolution du visuel d'un interactif** utilisée par le rendu **et** par le garde-fou au boot, qui lève avec un message nommant l'interactif et la clé manquante. Les stations de `stations.json` portent leur `render` ; les placeholders retirés de `visuels.json` s'ils ne servent plus (documenter). Le puits idem. Tests : garde-fou → un interactif `solide` dont le visuel ne se résout pas est **refusé au boot** (test avec un JSON de test qui reproduit exactement le cas de la Phase 3 : `type: "station"` sans visuel) ; les 4 stations résolvent un visuel non nul. Puis **rejouer `docs/CHECKLIST_visuelle.md`** (état 21 : stations visibles ×2,1, plus les états ajoutés en Phase 3 : jauges, menu Craft, menu Coffre) — capture en navigateur réel, pas headless.

## Contraintes non négociables

- **Cause racine avant patch** : chaque sujet commence par une phrase « la cause est … » dans le journal avant la première ligne de code corrigée. Un correctif qui fait disparaître le symptôme sans cette phrase est refusé.
- Aucun `Date.now()` pour la survie/cooldowns ; aucune constante en dur ; FR + EN.
- Scope : si le diagnostic révèle autre chose (ex. un cooldown qui n'expire pas, une migration `3 → 4` que Xav n'a pas exercée puisqu'il a reset), le **documenter** dans le journal, ne le corriger que s'il est dans le chemin direct.
- `render.js` / `hud.js` / `main.js#dessiner()` touchés → checklist visuelle rejouée avant de conclure, sans exception.

## À la fin de la session

Par sujet : (1) hypothèse confirmée (ou aucune — et alors laquelle a été trouvée), (2) correction et pourquoi, (3) tests passés (commandes), (4) reste ouvert. Plus : **pourquoi le garde-fou « solide sans rendu » n'a pas tiré**, et ce qui l'empêche de se reproduire — c'est l'entrée de journal la plus importante de la session.

## Hors scope explicite

`05_construction-stations.md` (placement) ; équilibrage des seuils (60 s, décroissances, courbe de niveaux — Xav n'a pas encore pu juger, les jauges étant mortes) ; micro-ticket `station_puits` (silhouette) ; la migration `3 → 4` sur une vraie sauvegarde Phase 2 (à exercer par Xav ensuite, séparément).

---
projet: RPG V2
episode/session: Polish post-Construction — suivi transversal
type: registre de suivi (document vivant)
version: 1.10.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — DOC : suivi des dettes, questions et validations

Emplacement : `docs/DOC_suivi-dettes.md`. Nom sans date : c'est un registre vivant, pas une photo. La date de l'en-tête est celle de la dernière révision.

## 0. Mode d'emploi

**À quoi il sert.** Une seule liste de tout ce qui est *dû* : ce que Xav doit trancher, ce que Xav doit valider en jeu, ce que Xav doit écrire, ce que Claude Code doit corriger, ce que la doc raconte de faux. Les quatre étaient mélangés dans la section « Dette » de `CLAUDE.md`, où une validation due ressemblait à un défaut de code.

**Règles.**

1. Un identifiant ne change jamais et n'est jamais réutilisé (`Q-` question, `V-` validation, `E-` à écrire, `D-` dette technique, `DOC-` doc, `R-` relevé).
2. Statuts : `ouvert` · `en cours` · `gelé` (attend autre chose, dire quoi) · `clos` (date + une ligne de verdict) · `sans objet` (date + pourquoi).
3. Une ligne close **descend en §8 « Clos »**, elle n'est jamais supprimée.
4. Claude Code met ce fichier à jour **au ménage de journal de début de session**, en même temps que l'INDEX : il ajoute ce que la session précédente a ouvert, il clôt ce qu'elle a livré. Il ne clôt **jamais** une ligne `Q-`, `V-` ou `E-` : seul Xav le fait.
5. **Ce fichier est la seule liste** (décision `Q-14`). `CLAUDE.md` n'en garde aucune copie : ses sections « Points `[OUVERT]` » et « Dette et à reprendre » ont été remplacées par le bloc de règles de l'annexe A le 2026-09-19 (`DOC-05`, clos).
6. **Chaque ticket cite les identifiants qu'il touche** (« traite `D-04`, ne touche pas à `D-11` »). Claude Code ne lit ici que ces lignes-là : le contexte voyage avec le ticket.
7. Claude Code garde l'initiative dans le périmètre de son ticket : il peut retenir une solution par défaut, la marquer `[OUVERT]` et ouvrir la ligne `Q-` correspondante. Hors périmètre, il propose (ligne `D-` ou `Q-`) sans corriger.

**Réponse rapide de Xav.** Pour une question : écrire la réponse dans la colonne « Décision » et dater. Pour une validation : `ok`, ou `non : <ce qui cloche>`. Rien d'autre à faire ; le ménage de journal suivant répercute.

---

## 1. Actions immédiates de Xav (bloquent la suite)

| Id | Action | Pourquoi maintenant | Statut |
|---|---|---|---|
| A-03 | Relevé `?debug=fps` **de nuit**, même protocole (voir §6) | Seul le jour est mesuré ; la nuit ajoute le calque d'obscurité et c'est là que 07 fera apparaître ses monstres | ouvert |
| A-04 | Relevé `?debug=fps` sur le **Galaxy A04 réel**, par le Wi-Fi local (procédure : `NS_decisions-fondations_2026-09-19.md` §6), même protocole de traversée. Capture d'écran du relevé (le bouton « copier » risque de ne pas marcher en http hors `localhost`) | L'émulation F12 mesure le PC, pas un téléphone (`R-04`). Seule une mesure sur l'appareil dit si le jeu y est jouable, et elle fonde `Q-20` | ouvert (si `netstat` montre `127.0.0.1:8080` → `D-24` d'abord) |
| A-05 | Relevés `?debug=fps&echelle=N` à **N = 5, 4, 3** (même émulation que `R-04`), puis sur PC à 4, 3, 2. À chaque échelle : le relevé **et** ton verdict à l'œil (net / acceptable / flou) | C'est la mesure qui tranche `Q-19` | gelé (`D-23`) |

---

## 2. Questions — Xav tranche

| Id | Question | Contexte / ce qui est appliqué par défaut | Bloque | Décision | Statut |
|---|---|---|---|---|---|
| Q-07 | Construction dans les Champs : `zonesConstructibles` dans le JSON de scène ? | Contredit la grille intérieure fermée de `05`. Rien à construire dehors aujourd'hui (jardinage non écrit). Trois options présentées le 19/09 : **A** acter le principe sans coder (zone constructible = rectangle déclaré dans la scène, l'intérieur de la maison est la première, jamais de chevauchement avec une zone d'apparition, vérifié au démarrage) · **B** geler jusqu'à la spec jardinage · **C** généraliser maintenant. Avis de Claude : A. Le jour venu, touchera : sauvegarde (rangement par scène, migration), atteignabilité, coût de rendu, `D-18` | 03b | | **gelé** (décision Xav, 19/09 17 h 18 : les fondations d'abord — performance et retours de playtest — avant tout nouveau contenu ; reprise après `Q-20`) |
| Q-10 | Promouvoir en contrainte non négociable : « *ouvert* = booléen ET DOM visible ; un écran sans accesseur n'existe pas pour le routage » ? | Déjà appliqué à tout `ui/menu.js`, pas encore règle de méthode | — | | ouvert |
| Q-11 | Autoriser le **chiffrage** (lecture seule, zéro code) de l'état d'UI pur : pile d'écrans + mode placement, DOM et routage dérivés | Trois bugs de la même famille sur Construction (état déduit au lieu d'événement déclaré). À faire chiffrer **avant** `E-01`, qui rajoute de l'UI | `E-01`, `D-11`, `D-12` | | ouvert |
| Q-12 | Généraliser « un sous-système *meilleur effort* rattrape ses erreurs à sa frontière » au-delà d'`audio.js` (IndexedDB, loot) ? | Correctif local livré le 17/09, règle d'architecture non décidée | — | | ouvert |
| Q-13 | Les monstres nocturnes abîment-ils les plantations ? | Rien à détruire tant que le jardinage n'existe pas | D10 | | gelé (attend la spec jardinage) |
| Q-18 | Compétences débloquées au niveau 30 : comment les concilier avec « XP → stats, jalons narratifs → capacités, deux axes indépendants » (décision verrouillée) ? | Piste de Claude, tirée du message de Xav : **le niveau ouvre le lieu, le lieu donne la capacité** (la caverne du Nv. 20 s'ouvre par le niveau, son casse-tête est le jalon qui débloque). À trancher quand Xav écrira les compétences | compétences | | gelé (spec des compétences) |
| Q-19 | **Plafonner l'échelle de rendu ?** Dessiner à une échelle inférieure à celle de l'écran (ex. ×3 au lieu de ×5) et laisser le navigateur agrandir en lissé. *Réviserait* la décision verrouillée « rendu net à résolution physique (DPR) » du 15/09 | Mesuré (`R-02` → `R-04`) : à contenu identique, les pixels des calques font ×1,56 (échelle 4 → 5), `dessiner()` fait ×1,67 et le recalcul du calque ×1,63. Le rendu est borné par le remplissage, pas par la logique (`maj()` = 0,1 ms). Rien n'est décidé : prototype debug d'abord (`D-23`), relevés et verdict à l'œil de Xav (`A-05`), décision ensuite. Pistes de politique, à comparer sur chiffres : échelle maximale fixe · budget de pixels · réglage joueur « Qualité » | correction de rendu | | gelé (`A-05`) |
| Q-20 | **Critère de clôture des fondations, et appareil plancher.** Proposition de Claude : sur le protocole de traversée, **PC = aucune frame sautée** ; **appareil plancher = 30 fps stable** (un 30 régulier se ressent mieux qu'un 47 qui alterne 16/33 ms). Appareil plancher candidat : le Galaxy A04 de Xav | « Corriger tout ce qui ne va pas » n'a pas de fin sans critère mesurable (même logique que la boucle de 2 heures). Avance `D-14`, gelée jusqu'ici à la Phase 7. À trancher une fois `A-04` relevé : on saura de combien on est loin | reprise du contenu (`07`, `Q-07`) | | ouvert (attend `A-04`) |

---

## 3. Validations en jeu — Xav joue

| Id | Quoi | Depuis | Comment | Verdict | Statut |
|---|---|---|---|---|---|
| V-03 | Contraste jour/nuit (nuit 0,85 ; jour 10 min, nuit 4 min) | 17/09 | Un cycle complet dehors | | ouvert |
| V-04 | Ambiance synthétisée | 17/09 | 5 min d'écoute ; bascule Musique non→oui sans gel | | ouvert |
| V-05 | Indices de commande (état 24) | 17/09 | Partie neuve : chaque verbe montre son indice une seule fois | | ouvert |
| V-09 | Durées de l'intro au ressenti (~7,2 s mesurées, budget 8 s) | 16/09 | Partie neuve, manette en main | | ouvert |
| V-10 | Test tactile par le testeur de référence | 16/09 | Attend un lien de partage (Phase 4 ou plus) | | gelé (lien de partage) |
| V-11 | Valeurs provisoires du polish, réglées ou confirmées | 19/09 | Table « Valeurs provisoires » du journal du 19/09 : poussière (7 valeurs), bandeau 20 px, éclat de niveau 700 ms, puits. Dire « bon » ou donner la valeur | | ouvert |

---

## 4. À écrire par Xav

| Id | Quoi | Contraintes déjà connues | Statut |
|---|---|---|---|
| E-02 | Avec Claude : les specs qui précèdent toute nouvelle carte — **ressources**, **crafts**, **armes**, **compétences** (liste de Xav, 19/09). Une spec par sujet, dans cet ordre ou un autre, à décider | Critère de fin de la Région Maison : la **boucle de 2 heures** (sauvegarde neuve → Nv. 30 → envie de changer d'endroit), vérifiable à la main et par le bot headless. Voir `NS_decisions-revue-dettes_2026-09-19.md` §4 | ouvert |
| E-01 | Spec de la **barre d'action du bas** (première case en bas à gauche, jaune, pour l'arme ; puis les poches qui se remplissent — principe Minecraft) | Cohabiter avec D5⑤ (5 emplacements d'action), avec le joystick tactile (bas-gauche déjà pris) et, selon `Q-02`, avec l'indice de commande. Attendre le chiffrage `Q-11`. **Ajouts du playtest du 19/09** : la case d'attaque dessine l'icône de l'**arme équipée** (la main pour « mains nues », livrée par `D-20`) ; chaque case porte en **filigrane la touche du périphérique actif** — à tirer de `glyphes.json` + `input.peripheriqueActif()`, jamais une seconde table de touches (même besoin que `D-10`) | ouvert |
| E-03 | `docs/captures/v1/DOC_captures-v1.md` : **une ligne par capture de la V1** — ce que tu aimes dedans, et ce qu'il ne faut surtout pas reprendre. Gabarit fourni le 19/09 | Une image sans intention est ambiguë pour Claude Code : il reproduirait tout, y compris ce que tu n'aimes pas. Les captures servent d'**inspiration**, jamais de cahier des charges ; aucun ticket ne les lit sans citer cette ligne | ouvert |

---

## 5. Dette technique — Claude Code, un ticket par ligne

Priorité : `P1` avant 07 · `P2` dans un lot léger · `P3` quand le système concerné est rouvert.

| Id | Dette | Cause connue / hypothèse | P | Statut |
|---|---|---|---|---|
| D-01 | **Les frames où le calque statique est recalculé sortent du budget.** 41 recalculs sur 600 frames (6,8 %), 5,8 ms de moyenne et 10 ms au pire, par-dessus 12 ms de base : ~18 ms, soit exactement le p95 de `dessiner()` | Mesuré (`R-02`). Marge du calque : (2304 − 1920) / 2 = 192 px physiques = **48 px logiques = 1,5 tuile** ; en course, un recalcul complet toutes les ~250 ms. Pistes à évaluer, pas à coder d'emblée : marge plus large (mémoire contre fréquence), ou défilement incrémental (recopier le calque décalé et ne dessiner que la bande entrante) **Piste lue dans le code (diff de `1be4688`)** : le calque est reconstruit dès que `fenetre.xDebut` ou `yDebut` change. À vérifier en premier : ce début de fenêtre change-t-il à chaque tuile franchie (32 px) ou seulement par pas de marge ? Si c'est à chaque tuile, la marge pré-rendue ne sert pas d'amortisseur, et la correction est d'attendre que la vue **sorte** de la zone pré-rendue avant de reconstruire. **Avis du 19/09 (Xav + Claude)** : préférer le **défilement incrémental** (« on le calcule au fur et à mesure ») à la marge plus large — une marge plus large espace les recalculs mais alourdit chacun : saccades plus rares et plus fortes. `R-04` confirme que le coût du recalcul suit les pixels (5,8 → 9,5 ms de l'échelle 4 à 5) : à faire **après** `Q-19`, qui change la taille du calque | P1 | ouvert |
| D-02 | **`dessiner()` coûte 12 ms sans aucun monstre** (0 monstre, 4 interactifs, 5 objets). Il reste 4,6 ms avant de perdre 60 fps | Cause inconnue. Suspects à *mesurer*, pas à présumer : blit du calque statique 2304×1408, calque d'obscurité 1920×1080 composé même de jour, rendu à résolution physique. Premier ticket = ventiler `dessiner()` par calque dans `?debug=fps`, zéro correction | P1 | ouvert |
| D-03 | **L'instrument se contredit** : `dessiner()` p95 = 18 ms, mais delta max = 16,70 ms et 1 seule frame > 20 ms | Hypothèse : le delta vient de l'horodatage de `requestAnimationFrame` (calé sur le vsync), qui ne voit pas une frame rendue en retard. Par ailleurs toutes les durées sont entières (1,00 / 10,00 / 18,00) : minuterie du navigateur arrondie à 1 ms. À expliquer avant de se fier aux valeurs absolues. **Indice de `R-04`** : p95 = max = 33,38 ms, donc les deltas ne valent que 16,7 ou 33,3 ms (calés sur le vsync). Hypothèse à vérifier : la **moyenne** du delta est fiable (21,1 ms ≈ `dessiner()` 20,1 + `maj()` + reste), les valeurs **par frame** ne le sont pas ; « frames > 20 ms » compterait alors les **frames sautées**. À traiter dans le même ticket que `D-02` (même instrument) | P1 | ouvert |
| D-04 | Saut perceptible à chaque angle (correction de coin appliquée d'un coup) | Amplitude max 2,93 px depuis le héros à 0,88. Hypothèse : répartir ou interpoler le repoussement. À diagnostiquer d'abord. C'est la dette qui touche le plus directement le ressenti au stick | P2 | ouvert |
| D-05 | **Retour de gain : texte flottant dans le monde** (« +1 bois »), à chaque récolte de bois et de pierre **et** à chaque ramassage au sol. *Élargi le 19/09* (était : « toast à chaque ramassage, seul le premier a un retour ») | **Un seul mécanisme**, pas un toast d'un côté et une bulle de l'autre : module pur sur le patron de `poussiere.js` (réserve fixe, aucune allocation en jeu), réglages dans `data/effets.json`, texte par i18n. Resservira au butin, à l'XP et aux dégâts sans code nouveau. Ticket : `MT_texte-flottant_2026-09-19.md` | P2 | ouvert |
| D-06 | Indicateur jour/nuit au HUD (optionnel dans la spec) | Prend du sens avec 07 : savoir quand la nuit tombe | P2 | ouvert |
| D-07 | Coffre : transfert par pile (maintien) | La couche d'input n'expose pas de geste de maintien pour les menus | P3 | gelé (`D-18`) |
| D-08 | Poche : action « Consommer » directe | Le chemin slot consommable + `CONSUME` couvre le besoin | P3 | ouvert |
| D-09 | `dlg_recette_indisponible` déclaré, jamais déclenché | Un dialogue par-dessus un menu casserait le routage menu/dialogue | P3 | gelé (`Q-11`) |
| D-10 | Aide-texte de la Construction toujours en glyphes manette | `ui/menu.js` ne reçoit pas `input.peripheriqueActif()` | P3 | ouvert |
| D-11 | `menu.bandeauEstOuvert()` hors de `menu.estOuvert()` : appariement par convention entre 4 fonctions | Décorréler demande de toucher le routage de `main.js#maj()` | P3 | gelé (`Q-11`) |
| D-12 | Double appel idempotent de `revenirAuMenuPrincipal()` sur « Non » du reset | Sans effet visible ; site protégé par une régression connue | P3 | gelé (`Q-11`) |
| D-13 | **Buffs actifs dans le bandeau HUD** (spec de Xav, `Q-01`). Ordre : compagnon (icône) · PV (jauge + nombre) · éclats (icône + nombre) · faim (icône + jauge) · soif (icône + jauge) · buffs · `Nv. N` collé au bord droit. Un buff = une petite icône, forme **et** couleur, sans texte ni jauge de durée. L'icône représente **l'effet** (la stat renforcée), jamais le plat : ajouter une stat = une icône, pas une par recette. Fin de buff : pulsation douce en fondu pendant les ~2 dernières secondes (2 à 3 battements par seconde au plus, jamais de flash sec), puis disparition. Rangement dans l'ordre d'activation, de la soif vers la droite ; au-delà de la place disponible, les plus anciens restent | Zone déjà calculée et testée dans `hud_layout.js#elementsBandeauHaut`. Icônes à déclarer en données (une par stat, référencée par le buff). À faire **après `D-17`**, qui libère le bord droit | P2 | ouvert |
| D-16 | **Puits : mâts plantés au sol et perspective de trois quarts.** Les mâts doivent partir du sol (niveau de l'ombre), de part et d'autre du puits, et non reposer sur le rebord où ils flottent d'une demi-tuile. La margelle et l'eau sont vues du dessus alors que mâts, toit et ombre sont vus de trois quarts : appliquer la règle du décor (cylindre + ellipses + ombre) au puits. Treuil, corde et seau conservés (`Q-03`) | Données seules (`visuels.json`). Le ticket du 19/09 a corrigé dans le mauvais sens (mâts rapprochés *sur* la margelle). Conséquences à traiter : la boîte englobante s'élargit donc la collision aussi (test d'empreinte « inchangée » à mettre à jour volontairement, vérifier chemin et zone du fruit) ; en trois quarts, l'empreinte devrait porter sur la base (override `empreinte` en données) | P2 | gelé (captures de Xav : le puits de près, et le puits avec un tronc dans le même cadre) |
| D-17 | **Bouton MENU tactile à descendre sous le bandeau.** Il est aujourd'hui à moitié sur le bandeau (verdict de `V-02`). Le placer juste en dessous : meilleur accès au pouce, et le bandeau redevient libre sur toute sa largeur, donc `Nv. N` se cale au bord droit sur tous les périphériques (une seule position) | Vérifier par test qu'il ne recouvre pas l'indice de commande (y = 26, hauteur 18). `BANDEAU_CONTENU_FIN_X = 430` n'a plus lieu d'être | P2 | ouvert |
| D-18 | **Brique d'input « maintien puis répétition ».** Première poussée = un pas immédiat (comme aujourd'hui) ; stick ou direction maintenus ~400 ms = répétition (~une tuile par 100 ms) jusqu'au relâchement. Dans la couche d'input, exposée aux menus et au mode Construction, jamais codée dans chaque écran. Sert : le fantôme de Construction (`Q-09`), la navigation des longues listes (Poche, Coffre), le transfert par pile du coffre (`D-07`), et toute construction extérieure future (`Q-07`) | Particulièrement utile au **tactile** : tapoter le joystick virtuel pour avancer case par case n'est pas intuitif (retour de Xav). Seuils provisoires, à régler au ressenti | P2, sans urgence — avant toute construction extérieure | ouvert |
| D-20 | **« Mains nues » = première arme du jeu** (décision `Q-21`). La portée de l'auto-attaque de base passe à **la moitié de l'actuelle** (provisoire), portée par l'entrée d'arme, jamais par une stat ni une constante de `combat.js`. La case jaune de la barre du bas dessine l'**icône de l'arme équipée** : une main | **Palier A livré le 2026-09-19** (`weapon_mains_nues`, portée `[0 ; 0,5]` tuile = 16 px logiques au lieu de 32 ; défaut déclaré en données dans `equipment_slots#equip_arme.defaut` ; `combat.js#resoudreArmeEquipee` = point de résolution unique, lu par le calcul de dégâts ET par l'anneau) — **validation en jeu de Xav due** : partie neuve, la Grotte, le premier monstre tuable en 2-3 coups mais au contact. Voir aussi `D-26` (les sauvegardes existantes gardent l'épée). **Reste le palier B** : icône de la case d'attaque. Ticket : `MT_mains-nues_2026-09-19.md` | P2 | ouvert (palier B) |
| D-23 | **Paramètre debug `?echelle=N`** : force l'échelle de rendu (calques et canvas), le navigateur agrandit en lissé. **Mesure seule**, aucun effet sans le paramètre | Prototype minimal de `Q-19`. Doit afficher l'échelle réelle et l'échelle forcée dans le relevé `?debug=fps`. Touche `render.js` → validation en jeu de Xav. Ticket : `MT_echelle-debug_2026-09-19.md` | P1 | ouvert |
| D-24 | **Serveur local joignable depuis le téléphone** (écoute sur le réseau local, adresse affichée au démarrage) + **repli du bouton « copier »** du relevé quand le presse-papiers n'est pas disponible (http hors `localhost`) : texte sélectionnable | À n'ouvrir que si l'étape 3 de la procédure (`netstat`) montre `127.0.0.1:8080`, ou si « copier » échoue sur le téléphone. `serveur_local.js` et `ui/hud_debug.js` seuls | P1 | ouvert (conditionnel — verdict de `A-04`) |
| D-25 | **Deux sources pour la touche d'un verbe au clavier.** Le mapping vit dans `input/keyboard.js#MAPPING_CLAVIER_PROVISOIRE` (`interact: ['KeyE']`), la lettre affichée par l'indice de commande vit dans `locales/fr.json`/`en.json` (`"glyphe.clavier.interact": "E"`), résolue via `glyphes.json#clavier_key`. Aucune des deux ne dérive de l'autre : changer le mapping sans changer les locales afficherait la mauvaise touche, sans erreur ni test rouge | Révélée par `D-22` (19/09), qui a dû mettre à jour les deux à la main. Garde-fou posé en attendant : `tests/test_d22_clavier_e_f_2026-09-19.js` bloc 4 compare les deux sources (les deux langues). Correction à concevoir, **pas à improviser** : le glyphe clavier d'un verbe devrait se **dériver** du mapping (la lettre n'est pas du texte à traduire ; `Espace`/`Échap` le sont, eux). Même famille que `D-10` (l'aide de la Construction ignore le périphérique actif) et touche la même matière que `E-01` (filigrane de la touche dans les cases de la barre du bas) : à traiter avec l'un des deux, jamais en passant | P3 | ouvert |
| D-26 | **Les sauvegardes déjà écrites gardent `weapon_epee_bois`.** Le palier A de `D-20` ne change la portée que pour une **partie neuve** : `save.hero.equipement.arme` est persisté, et les dix sauvegardes réelles de `docs/sauvegardes/` (v2 à v5) portent toutes `weapon_epee_bois` en dur — vérifié une par une. Une partie reprise garde donc 1 tuile de portée, sans rien qui le signale | Révélée par `D-20` A (19/09), **volontairement non corrigée** : le seul remède est une migration, et l'arrêt obligatoire du ticket interdit d'y toucher sans l'accord de Xav. Deux issues possibles, à trancher : migrer l'arme des sauvegardes existantes vers `null` (elles repassent aux mains nues), ou laisser l'épée comme un acquis et en faire une arme réellement craftable (`E-02`). Ne concerne pas la validation de `D-20` A, qui se fait sur une partie neuve | P2 | ouvert |
| D-27 | **Un id de catalogue qui vient de la sauvegarde n'est vérifié par rien.** La validation au boot couvre les références *entre catalogues*, jamais celles que porte une sauvegarde : `save.hero.equipement.arme`, `.consommable`, `hero.scene`. Si l'entrée visée disparaît du catalogue, `registre.obtenir` rend `undefined` et la boucle de jeu casse sur `arme.portee` — pas au boot, en pleine partie | Classe de bug déjà nommée dans `CLAUDE.md` (« un retrait de contenu de catalogue n'est jamais couvert par la migration de *schéma* », née du repli sur `scene_grotte_salle_1`) : ici c'est le manque de **garde-fou systématique** qui est en dette, pas un retrait précis. Devient plus probable avec `E-02`, qui fera grossir et bouger `weapons.json`. À concevoir, pas à improviser : un repli silencieux masquerait une donnée obsolète, un échec dur en pleine partie est pire — probablement une vérification au **chargement** de la sauvegarde, au même endroit que les migrations | P3 | ouvert |
| D-14 | Appareil mobile minimum à nommer (C11①ter) | Avancé par `Q-20` (19/09) : candidat = Galaxy A04 de Xav, à confirmer après `A-04` | P3 | gelé (`Q-20`) |
| D-15 | Test automatique qui charge chaque sauvegarde réelle de `docs/sauvegardes/` et vérifie qu'elle migre vers la version courante **sans perte** (lieu, niveau, heure du cycle, poche) | Dix sauvegardes réelles exportées par Xav à toutes les étapes du jeu, validées à la main le 19/09. À partir du premier lien de partage : une sauvegarde réelle exportée à chaque changement de version rejoint ce dossier | P2 | ouvert |

---

## 6. Performance — registre des relevés

Protocole (à ne pas changer, sinon les lignes ne se comparent plus) : partie neuve → sortir de la Grotte → courir tout droit → traverser la carte → « copier » avant de s'arrêter. Noter jour/nuit, navigateur, et si Claude Code tournait sur la machine.

| Id | Date | Build | Phase | fps | `dessiner()` moy / p95 | Recalculs calque | Frames > 20 ms | Notes |
|---|---|---|---|---|---|---|---|---|
| R-01 | 19/09 ~03 h | avant polish | jour ? | 60 | ~12 ms / — | « 250 / 600 » | — | Compteur **cumulatif** depuis le chargement : chiffre non comparable (journal `diagnostic-saccades-calque`). Session Claude Code aux hooks bloqués en cours sur la machine |
| R-02 | 19/09 ~12 h | `polish-2026-09-19` | jour ? | 59,9 (delta moy 16,68 / p95 16,68 / max 16,70) | **12,02 ms / 18,00 ms** | **41 / 600** (moy 5,82 ms, max 10,00 ms) | 1 / 600 | `maj()` 0,13 ms (p95 1,00). 0 monstre, 4 interactifs, 5 objets. Canvas 1920×1080 (dpr 1), calque statique 2304×1408, obscurité 1920×1080. Manette |
| R-04 | 19/09 ~17 h | `main` | jour ? | 47,4 (delta moy 21,10 / p95 33,38 / max 33,38) | **20,09 ms / 29,00 ms** | **49 / 600** (moy 9,46 ms, max 13,00 ms) | **126 / 600** | **Émulation F12** (vue adaptative, Galaxy Note 9, « Regular 3G ») : c'est le **PC** qui dessine, pas un téléphone ; le bridage 3G ne touche que le réseau. `maj()` 0,10 ms (p95 1,00). 0 monstre, 4 interactifs, 5 objets. Canvas 2961×1449 (dpr 3,5), calque statique 2880×1760, obscurité 2400×1350 (échelle 5). Tactile. Frames plafonnées : 0/600 |
| R-03 | | | **nuit** | | | | | dû — `A-03` |

**Lecture de R-01 → R-02.** `dessiner()` n'a pas bougé : ~12 ms avant, 12,02 ms après. Le passage de 250 à 41 recalculs est ce que prédit la seule correction du compteur (cumulatif → fenêtré sur 10 s). Ces deux relevés ne montrent donc **aucun gain de rendu** ; ils ne l'excluent pas non plus, faute de R-01 fiable. `A-02` tranche.

**Lecture de R-02 → R-04.** Même build, même contenu à l'écran, seule l'échelle de rendu change (4 → 5, soit ×1,56 de pixels par calque). `dessiner()` : 12,0 → 20,1 ms (×1,67). Recalcul du calque : 5,8 → 9,5 ms (×1,63). `maj()` ne bouge pas. **Le coût de rendu suit le nombre de pixels** : c'est ce qui fonde `Q-19` et `D-23`. Le fenêtrage, lui, est déjà en place (calque de 576×352 px logiques pour un écran de 480×270, entités triées) : ce qui coûte est ce qui est **à l'écran**, pas ce qui est hors champ. `R-04` ne dit **rien** d'un vrai téléphone → `A-04`.

---

## 7. Documentation à corriger (prochain ménage de journal)

| Id | Où | Problème | Statut |
|---|---|---|---|
| DOC-04 | `specs/07_chaos-nocturne.md` | **Fait le 19/09** : passée en v1.1.0 (zones en rectangles, Campagne neutre, zone sûre de la Grotte en rectangle, paliers de niveau en données, comportement « un domaine, pas un piquet », périmètre réduit au palier 1). Reste : y reporter le budget de rendu mesuré (`D-02`) quand il sera ventilé | en cours |

---

## 8. Clos

| Id | Quoi | Clos le | Verdict |
|---|---|---|---|
| D-21 | Rayon d'effacement du toit : −10 % | 2026-09-19 | **Livré** (`MT_toit-rayon_2026-09-19.md`). `main.js#FACTEUR_EFFACEMENT_TOIT` : 1,25 → **1,125**, seul endroit où la valeur vit, commentée *pourquoi* et toujours marquée **provisoire**. Pour un follet à `rayon_lumiere` 110, le toit entre en fondu à **123,75 px** du bord de la maison au lieu de 137,5 px (le fondu lui-même reste sur 30 px : la courbe est inchangée, seule la distance d'entrée recule). Aucun test n'a viré au rouge et aucun ne le pouvait : `FACTEUR_EFFACEMENT_TOIT` n'est lu que dans `main.js#dessiner()`, jamais exercé en headless ; le `110 * 1,25` de `test_phase2_toit_opacite_2026-09-16.js` était une config plausible pour éprouver la FORME de la courbe (bornes, monotonie, distance au bord), pas un garde-fou sur la valeur — mis à jour volontairement, avec un commentaire qui le dit. Le commentaire d'en-tête de `structures.js` recopiait « x 1,25 » : il renvoie désormais à la constante au lieu de citer un nombre. `specs/03_maison-exterieur.md` §3.4 et la carte mentale citent encore 1,25 — **laissés tels quels**, ce sont des états historiques du 16/09 (même convention que la revue des dettes du 19/09) ; la spec annonçait elle-même la valeur comme provisoire. **Validation en jeu de Xav encore due** : approcher la maison par l'ouest puis par le sud, de jour et de nuit — le toit doit commencer à s'effacer plus tard, sans saut (rejoint `V-11`) |
| D-22 | Clavier : `E` = INTERACT, `F` = CONSUME | 2026-09-19 | **Livré** (`MT_clavier-e-f_2026-09-19.md`). Les deux touches portaient exactement les verbes inverses, aucune autre n'était concernée : l'échange se fait dans `input/keyboard.js` seul, aucun module de gameplay ne connaît `KeyE`/`KeyF` (vérifié par recherche sur tout le dépôt). Les glyphes **ne sont pas dérivés** du mapping, ils sont recopiés dans `locales/*.json` : mis à jour dans les deux langues, et la dette de double source ouverte en **`D-25`**. Test rouge d'abord, puis vert : `tests/test_d22_clavier_e_f_2026-09-19.js` (67 fichiers verts). **Validation clavier en jeu par Xav encore due** : indice `E` sur INTERACT et `F` sur CONSUME en partie neuve, récolte d'un arbre et ouverture du Craft à `E`, fruit mangé à `F` |
| Q-21 | « Mains nues » comme première arme du jeu | 2026-09-19 | **Oui** (Xav). La portée de base (actuelle / 2, provisoire) et l'icône de la main vivent dans une entrée d'arme ; la case d'attaque dessine l'icône de l'arme équipée, sans cas particulier. Cohérent avec la décision verrouillée « la portée vient de l'arme, jamais d'une stat ». Schéma minimal, à étendre par la spec des armes (`E-02`) → `D-20` |
| DOC-01 | « Zéro chiffre réel recueilli » dans `CLAUDE.md` | 2026-09-19 | **Corrigé.** « État actuel du dépôt » dit désormais que deux relevés réels existent (`R-01`, `R-02`) et renvoie au registre §6 ; seule la mesure **de nuit** reste due (`A-03`) |
| DOC-02 | Statut de l'étape 7 du polish | 2026-09-19 | **Corrigé d'après `A-02`.** `CLAUDE.md` et la ROADMAP disent maintenant : diagnostic fait (fenêtrage sain, compteur cumulatif de `hud_debug.js` corrigé), **aucune correction de rendu encore faite**, portée par `D-01` et `D-02`. « Pas commencée » retiré |
| DOC-03 | `specs/00_ROADMAP.md`, section polish | 2026-09-19 | **Corrigé en 1.5.0.** Les étapes 1 à 6 sont décrites comme livrées **et validées en jeu** ; « aucune de ces specs n'est encore écrite » et « `MT_mesure-saccades`, à écrire » retirés ; l'étape 8 renvoie à `07_chaos-nocturne.md` v1.1.0, déjà écrite |
| DOC-05 | Sections « Points `[OUVERT]` » et « Dette et à reprendre » de `CLAUDE.md` | 2026-09-19 | **Remplacées** par le bloc de l'annexe A (section « Ce qui est dû »). Les 21 lignes des deux sections ont été vérifiées une à une : toutes avaient déjà leur identifiant ici, **sauf une** (`nb_au_sol`), ouverte et close le jour même en `D-19`. Règle de la checklist visuelle reformulée dans la foulée (`Q-15`) : validation en jeu par Xav, la capture devient un album de référence |
| DOC-06 | Application de `NS_decisions-revue-dettes_2026-09-19.md` | 2026-09-19 | **Appliquée** : `CLAUDE.md` (vocabulaire révisé, arc de progression, boucle de 2 heures, « un domaine, pas un piquet », décisions d'interface, méthode micro-tickets et un ticket = un commit), `docs/carte_mentale_RPG_V2_v1_6_0.md` (renommée, §3bis, D21, §5 ⑦, §8) et `specs/00_ROADMAP.md` 1.5.0. Session doc seule, aucun fichier de `src/`, `data/` ou `tests/` touché |
| D-19 | `nb_au_sol` de `item_branche` / `item_caillou` | 2026-09-19 | **Sans objet.** Déjà à 2 dans `data/items.json` depuis la Phase 2 : le changement demandé par la fiche de respawn du 17/09 n'a jamais eu lieu d'être. Ligne créée uniquement pour que la dernière phrase de l'ancienne section « Dette » de `CLAUDE.md` garde un identifiant |
| A-01 | Fusion de `polish-2026-09-19` dans `main` | 2026-09-19 | **Faite par Xav**, en avance rapide, puis poussée : `main`, `origin/main` et la branche pointent sur `e5b6d44`. La branche peut être supprimée (`git branch -d polish-2026-09-19`) |
| A-02 | Le correctif des saccades a-t-il touché le jeu ? | 2026-09-19 | **Non, l'outil de mesure seulement.** Vérifié par Xav dans git : tout le travail de la nuit du 18 au 19 est dans un seul commit (`1be4688`, 13 fichiers, 870 lignes ajoutées, 26 retirées). `render.js` : 58 ajouts, 4 retraits, tous des branchements de mesure (`surFrame`, `surRecalcul`, accesseurs) ; la condition qui décide de reconstruire le calque est **inchangée**. `main.js` : 43 ajouts, 1 retrait. Ce qui était « cumulatif » était le **compteur** de `hud_debug.js`, et ce correctif-là est réel. La dette de rendu (`D-01`, `D-02`) reste entière |
| Q-06 | Zones de Chaos et Champs | 2026-09-19 | **Vocabulaire révisé** : Champs = deux grandes zones en L (nord et sud) ; bande centrale = **Campagne neutre** (rien n'y apparaît, un monstre peut y poursuivre) ; toutes les zones en **rectangles**, au format `zones` de `scenes.json`. **Chaos nocturne par paliers de niveau**, toujours la nuit : Nv. 5 zone nord-est · Nv. 10 zone sud · Nv. 15 apparitions éparses en Forêt et dans les Champs (remplace « quelques monstres en Forêt dès le début » : la Forêt reste vide avant 15). Seuils en données, jamais dans le code. 07 ne livre que le système et le palier 1 |
| Q-04 | Zone sûre à la sortie de la Grotte | 2026-09-19 | **Oui, en rectangle**, plus large que le rayon de 8 tuiles proposé (carte de Xav) |
| Q-05 | Laisse des monstres | 2026-09-19 | **« Un domaine, pas un piquet »** : errance dans un domaine fait de zones de la carte · poursuite bornée depuis le point où le monstre repère le joueur · désintérêt de quelques secondes après un abandon ou un demi-tour en lisière de zone sûre · anti-blocage après ~1 s sans avancer. Les monstres ne quittent leur domaine que si le joueur les attire. À observer en jeu : appât patient jusqu'au Jardin, poursuites courtes en Forêt dense |
| Q-17 | Niveau d'ouverture de la 1ère zone de monstres | 2026-09-19 | **Le seuil « ~5 » est abandonné** (révise une décision verrouillée). La carte suivante s'ouvre quand la boucle de 2 heures de la carte Maison est finie, vers Nv. 40-50 (provisoire). Les systèmes prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord sur la carte Maison → `DOC-06` |
| Q-08 | Verbe de rotation en Construction | 2026-09-19 | **Reste sur `SKILL_1`**, statut provisoire levé. Construction jugée intuitive à la manette, commandes affichées, rien à signaler |
| Q-09 | Déplacement du fantôme | 2026-09-19 | **Impulsion, puis répétition au maintien**, sans urgence. Aucun problème dans la maison ; anticipe les constructions futures et corrige le tapotement du joystick tactile → `D-18` |
| Q-01 | Buffs actifs au HUD | 2026-09-19 | **Oui, dans le bandeau**, version Xav : icône par effet, sans texte ni jauge, pulsation douce à la fin. Spec complète : `D-13` |
| Q-02 | Place de l'indice de commande | 2026-09-19 | **Sous le bandeau** (état actuel, jugé très bon). À rouvrir seulement si la spec `E-01` le demande |
| Q-03 | Puits : treuil, corde, seau | 2026-09-19 | **Tout garder.** Xav aime la structure ; deux défauts relevés sur capture ouvrent `D-16` |
| V-02 | Bandeau HUD au tactile | 2026-09-19 | **Non** : le bouton MENU tactile est à moitié sur le bandeau → `D-17` |
| Q-16 | Migrations 3→4 et 4→5 sur de vraies sauvegardes | 2026-09-19 | **Validées par Xav** sur une dizaine de sauvegardes réelles exportées à toutes les étapes du jeu (`docs/sauvegardes/`) : toutes arrivent à la version courante et conservent lieu, niveau, cycle jour/nuit et poche. Ferme `V-07` et `V-08`. Suite : `D-15` |
| Q-15 | Captures de la checklist | 2026-09-19 | **Album de référence.** La validation en jeu par Xav suffit à clore un ticket de rendu. À chaque clôture de phase ou de chantier, Xav prend les six vues de référence (annexe B). Ferme `V-06` |
| Q-14 | Où vit la liste des dettes | 2026-09-19 | **Renvoi + règles de comportement.** `CLAUDE.md` renvoie ici et garde des règles, aucune ligne de dette recopiée. Claude Code conserve le droit de retenir par défaut en marquant `[OUVERT]` et de proposer du polish. Texte : annexe A. Application : `DOC-05` |
| V-01 | Les 5 tickets de polish (héros 0,88, follets de l'intro, puits, traînée de poussière, HUD une ligne) à la manette | 2026-09-19 | Xav : « ça fonctionne, le jeu est fluide ». Restent `V-02` (tactile) et `V-11` (valeurs provisoires) |
| — | Construction (`05_construction-stations.md`) | 2026-09-19 | Validée clic/tactile, puis manette et clavier seul |
| — | `station_puits`, silhouette désolidarisée | 2026-09-19 | Cause : données (pied des mâts en porte-à-faux). Validée avec `V-01` ; `Q-03` reste ouverte sur le seau |

---

## Annexe A — bloc à placer dans `CLAUDE.md` (décision `Q-14`)

Remplace les sections « Points `[OUVERT]` » et « Dette et à reprendre ».

```markdown
## Ce qui est dû : dettes, questions, validations

Tout vit dans `docs/DOC_suivi-dettes.md`. Ce fichier n'en garde aucune copie :
deux listes finissent toujours par se contredire.

**Lecture.** Ne lis dans ce document que les lignes dont le ticket courant cite
l'identifiant. Le reste ne concerne pas ta session et noierait ton travail.

**Dans le périmètre du ticket, tu gardes l'initiative.** Quand un point de design
n'est pas tranché, tu peux retenir une valeur ou une solution par défaut et
continuer : marque-la `[OUVERT]`, ajoute une ligne `Q-` au document, et
signale-la en tête de ton rapport pour que Xav confirme ou révise. Même chose
pour une finition que le ticket ne demandait pas mais qui sert son intention.
Arrête-toi plutôt que de choisir seulement quand le choix serait coûteux à
défaire : format de sauvegarde, contrat entre modules, décision verrouillée.

**Hors du périmètre du ticket, tu proposes.** Un défaut ou une idée qui touche
d'autres fichiers ou un autre système ne se corrige pas en passant : personne ne
relit un changement hors ticket. Vérifie s'il a déjà un identifiant ; sinon
ajoute une ligne `D-` (défaut) ou `Q-` (idée, proposition de polish) et
mentionne-la dans ton rapport. Tes propositions sont attendues : le jeu se
conçoit à deux.

**Clôture.** Tu clos les lignes `D-` et `DOC-` que tu as livrées, avec la date et
une ligne de verdict. Tu ne clos jamais une ligne `Q-`, `V-` ou `E-` : Xav seul
tranche, valide en jeu et écrit.

**Ménage de journal.** En début de session, avec l'INDEX : ouvre les lignes que
la session précédente a révélées, clos celles qu'elle a livrées.
```

## Annexe B — album de référence (décision `Q-15`)

Un sous-dossier par jalon : `docs/captures/AAAA-MM-JJ_jalon/`. Toujours les mêmes vues, dans l'ordre de la boucle de jeu, pour pouvoir comparer d'un jalon à l'autre :

`01_grotte-hud.png` · `02_choix-follet.png` · `03_exterieur-jour.png` · `04_exterieur-nuit.png` · `05_interieur-stations.png` · `06_menu-construction.png`

Une vue s'ajoute à la suite quand un jalon apporte un écran nouveau ; aucune n'est renumérotée.

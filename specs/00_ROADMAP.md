# RPG V2 — Roadmap + prompt d'exécution autonome

**Version : 1.9.0** — document vivant.

**Statut** : Phases 0, 1, 1b, 2 et 3 (Palier A-E, boucle 5 minutes), le chantier `05_construction-stations.md` (placement libre des stations) **et les étapes 1 à 6 du polish post-Construction** sont livrés et validés en jeu par Xav (manette, 2026-09-19 : « ça fonctionne, le jeu est fluide »). On travaille sur `main`. **Chantier courant : les fondations.** Le **volet rendu est clos sur PC, sous Chrome** (59,9 fps sans une frame sautée jusqu'à l'échelle forcée 8, `R-11`) ; il ne l'est **pas sur mobile** (Galaxy A04 à ~37 fps, cause inconnue, `D-31` gelée jusqu'au profil `A-07`). **Chrome est le navigateur de développement, de jeu et de référence** — registre `docs/DOC_navigateurs.md`. Décision de méthode de Xav (2026-09-19) : **on ne rajoute pas de contenu sur des bases non confirmées** ; les **deux relevés de base sous Chrome sont pris** (`A-03` close : `R-14` jour, `R-03` nuit, 59,9 fps et zéro frame sautée), et la file repart par les **tailles, la vitesse et la lumière** (`D-32` à `D-35`), puis `specs/07_chaos-nocturne.md` palier par palier (voir « Ordre d'injection » ci-dessous). Ce document sert de brief autonome ; **ce qui reste dû (dettes, questions, validations) vit dans `docs/DOC_suivi-dettes.md`, et nulle part ailleurs**.

**Changelog 1.9.0 (2026-09-23)** : session de documentation (`docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md`), aucun code touché. **L'alignement bien/mal passe de M2+ à M1** (périmètre ci-dessous) ; **pas de nouvelle carte** tant que la carte Maison n'est pas épuisée par les annexes et tunnels (§ « Avant toute nouvelle carte »). Carte mentale passée en **v1.7.0**. Les deux specs débloquées, `10_alignement-follet.md` et `11_dialogues-consequences.md`, ne sont pas encore écrites.

**Changelog 1.8.0 (nuit du 19 au 20/09)** : `A-03` **close** — les deux relevés de base sont pris sous Chrome, F11, échelle naturelle 4, manette : `R-14` (jour) et `R-03` (nuit), **59,9 fps et zéro frame sautée** tous les deux, `dessiner()` 0,33 ms, `maj()` 0,06 ms. `07_chaos-nocturne.md` a désormais son point de comparaison, et son §6 cite `R-03` au lieu de `R-02` (qui mesurait des millisecondes de Firefox). **Principe d'équilibrage acté** (Xav) : *les valeurs de base du début de jeu sont basses, et tout grandit ensuite* — conséquence d'architecture unique : une valeur destinée à grandir passe par une **fonction pure de résolution**, jamais lue directement par un système ; aucun buff, aucun équipement livré avec. **Le follet est équipable** (un emplacement : amulette **ou** talisman — `Q-29`, rien de livré, spec avec `E-02`). **Ordre d'injection amendé** par `BRIEF_nuit-2026-09-19.md` : tailles/vitesse/lumière (`D-32` à `D-35`), puis `07` paliers A à D, puis `D-36` (follet « aérien », proposition détachable), **puis** `D-17` + `D-30`, `D-13`, `D-01`/`D-16` et la reprise de `Q-07`. Identifiants : ceux proposés par le brief (`D-27` à `D-31`, `Q-24`/`Q-25`) étaient **déjà pris** par les sessions de code de la soirée — renumérotés en `D-32` à `D-36` et `Q-26` à `Q-30`.

**Changelog 1.7.0 (2026-09-19)** : session de documentation « rendu, navigateurs, téléphone » (`NS_decisions-rendu-navigateurs_2026-09-19.md`), aucun code touché. **Ce n'était pas le jeu, c'était le navigateur** : sous Chrome, le même PC tient 59,9 fps sans une frame sautée **jusqu'à l'échelle forcée 8** (`R-11`), là où Firefox exécute le dessin sur le fil principal et devient injouable à l'échelle 5 (`R-05` à `R-10`). Conséquences : **`Q-19` close sans plafond d'échelle** — la décision verrouillée « rendu net à résolution physique » est **maintenue et confirmée sur mesure**, et l'échelle par calque est abandonnée comme chantier ; `D-01` passe **P1 → P2**, `D-02` et `D-03` **P1 → P3, gelées**. **Chrome devient le navigateur de référence** (nouveau registre `docs/DOC_navigateurs.md` ; politique d'engagement envers Firefox/Safari ouverte en `Q-24`, conseil au joueur « sur le symptôme » en `Q-25`). Côté mobile, **rien n'est clos** : l'A04 rend ~37 fps et l'échelle n'y est pour rien (`R-12`, `R-13`) — **≈ 18 ms par frame inexpliquées** (`D-31`, gelée jusqu'au profil USB `A-07`), donc l'A04 n'est **pas** déclaré appareil plancher et `Q-20` est reformulée en deux moitiés (PC acquis, mobile ouvert). Nouvelle règle de méthode : **un relevé de performance cite son navigateur**. **Ordre d'injection remplacé** par celui du §5 de la NS : relevés de base sous Chrome (`A-03`), `D-17` + `D-30` (plein écran au tactile), `D-13`, puis `07_chaos-nocturne.md` palier par palier avec un relevé de nuit après chacun, puis `D-01`/`D-16` et la reprise de `Q-07`.

**Changelog 1.6.0 (2026-09-19)** : session de documentation « les fondations d'abord » (`NS_decisions-fondations_2026-09-19.md`), aucun code touché. **Décision de méthode de Xav : on ne rajoute pas de contenu sur des bases non confirmées** — performance et retours du playtest avant tout nouveau contenu ; `Q-07` (construction extérieure) passe à **gelée**, `specs/07_chaos-nocturne.md` recule en fin de file. **Ordre d'injection remplacé** par celui du §5 de la NS (clavier E/F, toit, mains nues A puis B, texte flottant, `?echelle=N`, ventilation de `dessiner()`, décision d'échelle, défilement incrémental, puis `D-17`/`D-13`/`07`). Troisième relevé de performance inscrit (`R-04`, **sous émulation F12 — c'est le PC qui dessine**) : il établit que **le coût de rendu suit le nombre de pixels**, et ouvre `Q-19` (plafonner l'échelle de rendu, non tranchée), `Q-20` (critère de clôture des fondations et appareil plancher) et `D-23` (prototype de mesure). Décision `Q-21` : **« mains nues » est la première arme du jeu**. La décision verrouillée « rendu net à résolution physique » n'est **pas** touchée — `Q-19` n'est pas tranchée.

**Changelog 1.5.0 (2026-09-19)** : session de revue des dettes (`NS_decisions-revue-dettes_2026-09-19.md`), aucun code touché. **Le gating « 1ère zone de monstres à partir du niveau ~5 » est abandonné** : la carte suivante s'ouvre quand la carte Maison est épuisée (Nv. 40-50, provisoire) ; les *systèmes* de la Phase 4 arrivent d'abord sur la carte Maison — **« Phase 4 = prochaine étape » ne se lit plus ici**. Arc de progression de la carte Maison et **boucle de 2 heures** inscrits comme critère de clôture de la Région Maison. Polish : étapes 1 à 6 actées comme livrées **et validées** ; étape 7 = diagnostic fait, **aucune correction de rendu encore faite**. Méthode : **micro-tickets** (un sujet par ticket, une session courte, validation de Xav entre deux), **un ticket = un commit** fait par Claude Code, **jamais de `push`**, et validation en jeu par Xav au lieu de la capture par état.

**Changelog 1.4.0 (2026-09-19)** : session de tri/documentation, aucun code touché. Construction actée comme livrée et validée (verdict Xav manette + clavier, après le correctif de parité clic/verbe — détail `docs/archives/INDEX.md`). Décisions du playtest consignées : vocabulaire de la Région Maison figé, héros à l'échelle 0,88, HUD une ligne, follets visibles pendant l'intro, intrusion nocturne du Chaos dans la Région Maison cadrée (spec à écrire : `07_chaos-nocturne.md`). Ordre d'injection des prochains chantiers acté par Xav (§ « Ordre d'injection » ci-dessous).

**Changelog 1.3.0 (2026-09-17)** : Phase 3 actée comme livrée et validée (verdict Xav en jeu, tous les points testés, bon — détail `docs/archives/INDEX.md`). `05_construction-stations.md` livrée en code le jour même (extraite de `04_maison-interieur.md`, ex-palier F) : `placement.js`, sauvegarde v5, menu Construction contextuel, fantôme de pose.

**Changelog 1.2.0 (2026-09-17)** : session de tri/documentation, aucun code touché. Phase 2 actée comme livrée et validée (verdict Xav manette/clavier, 2026-09-17 — détail `docs/archives/INDEX.md`). Statut avancé à Phase 3 (spec `04_maison-interieur.md` à écrire).

**Changelog 1.1.0 (2026-09-16)** : Phase 2 scindée en « première marche » (ce qui est spécifié) et récolte réelle reportée après les outils de la Phase 3 ; champs, animaux, déco plantable et XP de récolte sortent de la Phase 2 (spec ultérieure `03b`, ou fusion Phase 4 — à trancher à la livraison de la Phase 2). Fil de design transversal **Crypte X** inscrit (D14⑥), à concevoir après le Poste avancé. Audio (init + première piste) avancé en Phase 2.

---

## Bloc à lire en premier par l'agent (contexte minimal indispensable)

**Qui tu es dans ce projet.** Tu es le développeur principal d'un RPG 2D en HTML5/JS/Canvas, conçu en refonte complète d'un prototype V1 terminé. Le concepteur, relecteur et testeur est Xav (**dev=xav**). Tu travailles par sessions isolées, une phase par session, et tu ne rediscutes pas ce qui est acté ci-dessous.

**L'existant sur lequel tu t'appuies — et sur lequel tu ne t'appuies pas.**
- La V1 (`monde/rpg_v0_1_0.js`, ~7400 lignes, un seul fichier) est un **prototype jetable**. Aucune ligne n'est reprise par défaut. Ce qui se réutilise, ce sont des **patrons validés en V1**, pas du code : tables déclaratives pour portails/boss/choix de build, architecture de scènes avec accesseur `world` calculé, dialogue généralisé, décor procédural à graine fixe, tests headless `node tests/<nom>.js` sans framework.
- `moteur/haTD_V1_5_23.html` (tower defense) est **hors périmètre M1** et n'est jamais modifié.
- `docs/CLAUDE_archive.md` contient le journal V1 : à consulter pour comprendre *pourquoi* un patron existe, jamais comme état du code V2.

**Le projet en une phrase.** Un RPG action-aventure 2D en 3 éléments (Feu / Eau / Terre), entièrement data-driven en JSON externes, joué **à la manette sur PC en référence** et au tactile sur mobile en parallèle, gratuit, sans publicité ni achat, 100 % hors-ligne, bilingue FR/EN, dont la première ère (M1) enchaîne : Grotte-tutoriel → Région Maison → 1ère zone de monstres → Château → Boss 1 → Poste avancé.

**Positionnement assumé.** Vitrine d'un jeu conçu et développé avec des agents IA, projet laboratoire. Xav ne tient pas de rôle de graphiste : l'identité visuelle repose sur des tuiles réutilisables, du rendu procédural et du pixel art léger — jamais sur une production d'assets massive.

---

## Décisions déjà tranchées (ne pas rouvrir)

Référence complète : `docs/carte_mentale_RPG_V2_v1_7_0.md` §0 et §8. Résumé opérationnel :

### Plateforme & technique
| Décision | Valeur |
|---|---|
| Plateforme primaire | **PC à la manette.** Mobile tactile mené en parallèle (validé à chaque phase à partir de la Phase 1), jamais en portage tardif. |
| Moteur | HTML5 / JS / Canvas 2D. Pas de framework de jeu, pas de bundler obligatoire. Servi en `http://` (jamais `file://`). |
| Packaging | Navigateur sur PC. Wrapper WebView (Capacitor ou équivalent) pour Android, en Phase 7. Contraintes déjà actives : pas de `localStorage` seul, audio initialisé sur geste utilisateur. |
| Performance | **60 fps sur PC en référence, 30 fps stables sur mobile en plancher.** Le budget d'entités simultanées se cale sur le plancher mobile. Appareil mobile minimum à nommer en Phase 7. |
| Données | **JSON externes, un fichier par catalogue, validés par schéma au boot** (échec dur, jamais dégradé). Catalogues chargés en bloc au démarrage ; tuiles et layouts de zone chargés à l'entrée de la zone. |
| Input | **Couche abstraite obligatoire.** Le gameplay ne lit que des verbes : `MOVE, ATTACK, SKILL_1..3, CONSUME, INTERACT, MENU`. Manette = référence (`ABXY` → attaque + 3 skills, gâchette → consommable). Tactile et clavier sont des mappings. |
| Sauvegarde | **Une seule sauvegarde automatique.** Écriture en double tampon (la sauvegarde valide n'est jamais écrasée avant que la nouvelle soit complète). Schéma versionné + migration. Export/import manuel de fichier. Pas de cloud. |
| Déblocages | **Registre central de flags**, conditions exprimées en données. Aucun gating dispersé dans le code. |
| Langue | **FR + EN dès la V2.0**, zéro chaîne en dur, y compris le lore. |
| Hors-ligne | 100 %. Aucune fonctionnalité ne dépend du réseau. |

### Design
| Décision | Valeur |
|---|---|
| Périmètre M1 | Grotte → Région Maison → 1ère zone → Château → Boss 1 → Poste avancé. **Liste close.** Console portable, cartouches (haTD, poker TCG, snake), Codex de collection au sens large : **M2+**. **L'alignement bien/mal entre en M1** (*révisé le 2026-09-23*, D11⑦ de la carte mentale v1.7.0) : stat cachée, distincte d'Esprit, bornes `[−5 ; +5]`, effets par le follet seul — spec `10_alignement-follet.md` à écrire. |
| Éléments | 3 : Feu / Eau / Terre. Table extensible en données, rien de codé en dur. |
| Stats | 4 primaires : **Force, Agilité, Vitalité, Esprit**. Esprit = réserve de lancement des skills, rien d'autre. Tout scaling de dégâts (équipement, affinité initiale, maîtrise) converge sur Force ; l'élément porte le *type* et les interactions, jamais la puissance brute. |
| Progression | **XP → stats** (points de stat par niveau). **Jalons narratifs → capacités.** Deux axes indépendants. Sources d'XP : combat **et craft**. **Le gating de la 1ère zone par niveau ~5 est abandonné (2026-09-19)** : la carte suivante s'ouvre quand la carte Maison est épuisée (Nv. 40-50, provisoire) — voir « Arc de progression de la carte Maison » plus bas. |
| Actions | 5 slots : 1 attaque + 3 compétences + 1 consommable. Nombre de slots en données. |
| Équipement | 3 slots : arme, armure, accessoire. |
| Effets d'état | Buffs/débuffs, dégâts sur la durée, contrôles — **chacun dérivé logiquement de son élément**. Table des synergies élémentaires : à écrire (livrable Phase 1). |
| Survie | Faim / soif / santé = pénalités progressives, jamais bloquantes. **Jauges gelées hors session.** Repas = buffs (la cuisine est un système de build). |
| Jardinage | Croissance **à l'action**, jamais au temps réel. Aucun timer d'attente dans tout le jeu. |
| Recettes | **Un seul système**, stations et catégories de sortie en données (cuisine, table de craft en M1 ; forge, alchimie, armurerie plus tard = entrées JSON). |
| Loot | Table par ennemi + table par zone, combinées. |
| Cartes | **Tuiles réutilisables**, layout de chaque zone écrit à la main en JSON, décor non-collisionnant procédural à graine fixe. Aucune génération procédurale de layout jouable. |
| Narration | **Lore diffus, aucun journal de quêtes, aucun objectif affiché.** Un journal existe : il enregistre ce qui a été découvert, jamais ce qu'il faut faire. |
| Énigmes | Catalogue de types réutilisables (leviers, séquences…) + quelques pièces uniques scriptées. |
| Compagnon (feu follet) | Suit le héros dès la Grotte. **Double action** : sur le joueur (boost attaque / vitesse d'attaque / vitesse de déplacement) et sur les monstres (ralentissement / dégâts). **Source de lumière la nuit** — le héros n'en a aucune sans torche. Changement de compagnon et respec : débloqués après Boss 1. |
| Maison | Hub de camp, pas un décor. Intérieur : **stations à placement libre** (cuisine, craft), coffre, déco légère. Extérieur : région complète. |
| Accessibilité | Chaque élément identifiable **sans la couleur** (forme + icône), dès la conception. |
| Économie | Pas de monnaie abstraite. Les éclats servent de valeur d'échange, les ressources de craft restent distinctes. |
| Modèle | Gratuit + dons externes. Zéro pub, zéro achat, zéro monnaie premium, aucune mécanique de frustration monétisable. |

### Risques inscrits, à ne pas redécouvrir
Voir `docs/carte_mentale_RPG_V2_v1_7_0.md` §0bis : cohérence 3 éléments RPG vs 9 haTD (à traiter au contrat de cartouche, M2+) ; tension éclats/paliers de vitalité si un marchand existe ; volume de texte doublé par le bilinguisme ; densité de 5 actions sous le pouce droit en tactile ; conformité Play Store sur la sollicitation de dons.

---

## Contraintes de méthode non négociables

- **Un sujet par ticket, une session courte par ticket** (2026-09-19). Xav valide en jeu entre deux tickets ; une spec par paliers se joue **un palier par session**. Chaque ticket cite les identifiants de `docs/DOC_suivi-dettes.md` qu'il touche, et Claude Code ne lit que ces lignes-là.
- **Un ticket (ou une session) = un commit**, fait en fin de session, l'identifiant du ticket dans le titre. **Les `push` restent à la main de Xav : Claude Code ne pousse jamais.**
- **Cause racine avant tout patch.** Jamais de rustine sur un symptôme.
- **Valider avant de livrer** : `node --check` sur chaque fichier JS livré + toute la suite `tests/` rejouée. Un fichier `tests/test_<phase>_<date>.js` par session qui touche la logique de jeu.
- **Le test data-driven, à chaque catalogue livré** : ajouter une entrée (arme, ennemi, recette, tuile, énigme…) doit être possible **en ajoutant une entrée JSON, sans toucher une ligne de code de système**. Si ce n'est pas le cas, le catalogue n'est pas livré.
- **Zéro chaîne en dur.** Tout texte visible passe par les fichiers de localisation FR/EN, dès la Phase 0.
- **Zéro dépendance du gameplay à un périphérique.** Aucun `KeyboardEvent`, `TouchEvent` ou `Gamepad` en dehors de la couche d'input.
- **Tout commentaire de code et texte d'UI en français**, style « contexte suffisant pour reconstruire le raisonnement » — un commentaire dit *pourquoi*, pas *quoi*.
- **Scope discipline** : si une tâche déborde du brief, s'arrêter au dernier palier stable et documenter ce qui reste hors scope. Aucun système généralisé avant qu'un second cas d'usage réel existe — sauf les catalogues data-driven listés, qui sont généralisés par décision.
- **Le rendu canvas n'est jamais exercé par les tests headless.** Toute vérification visuelle revient à Xav dans un vrai navigateur, à la manette : **la validation en jeu par Xav suffit à clore un ticket de rendu** (2026-09-19), `docs/CHECKLIST_visuelle.md` restant la liste de ce qu'il regarde. Les captures deviennent un **album de référence** pris à chaque clôture de phase ou de chantier (six vues fixes, `docs/captures/AAAA-MM-JJ_jalon/`).
- **Aucun fichier de la V1 n'est modifié.** La V2 vit dans son propre répertoire.

---

## Phase 0 — Socle technique
**Livrée et validée (2026-09-15).** Détail complet : `01_socle-technique.md`. Conservée ici comme référence du contrat de base.

### Objectif
Faire tourner le squelette sur lequel toutes les phases suivantes s'empilent sans jamais le rouvrir : boot + registre JSON validé, couche d'input abstraite manette/clavier, boucle de rendu canvas avec caméra, scène de tuiles chargée depuis JSON, sauvegarde en double tampon versionnée, localisation FR/EN. **Aucun gameplay.**

### Livrable concret
1. Arborescence du projet V2 posée (`/src`, `/data`, `/locales`, `/tests`, `/tools`), serveur local sans dépendance, `node --check` opérationnel.
2. Un **héros** (placeholder) qui se déplace dans **une salle de tuiles** définie en JSON, avec collisions sur les tuiles solides, caméra qui suit et se borne aux limites.
3. Contrôle **à la manette** (stick gauche + face buttons détectés) **et au clavier**, via la couche abstraite : le code de déplacement ne connaît que `MOVE`. Hot-swap manette ↔ clavier sans rechargement.
4. Registre : chargement de tous les catalogues JSON (même vides), validation de schéma, **échec dur avec message clair** si un fichier est invalide, résolution des références croisées par `id`.
5. Sauvegarde automatique (position du héros, version du schéma) en double tampon, rechargée au démarrage, migration de version prouvée par un test qui charge un JSON d'une version antérieure fictive.
6. Registre de flags central, vide, avec API `poser / lire / condition en données`.
7. Localisation : une chaîne d'UI affichée en FR et en EN par bascule dans un menu minimal.
8. Suite `tests/` couvrant les points 3 à 7.

### Critère de passage
Xav lance le jeu dans un navigateur, branche une manette, déplace le héros dans la salle, change de langue, ferme l'onglet, rouvre : le héros est où il l'a laissé. Aucun test rouge. Aucune chaîne en dur trouvée par un `grep` sur les guillemets dans `/src` hors clés de localisation.

### Hors scope pour cette phase
Tout gameplay : combat, feux follets, énigmes, récolte, dialogue, HUD de jeu, tactile, audio, packaging. Le tactile arrive en Phase 1 en parallèle du premier contenu.

---

## Phases suivantes (esquisse — chacune sera détaillée dans son fichier `0N_*.md` quand elle devient courante)

### Phase 1 — La Grotte (vertical slice technique) — **livrée et validée (2026-09-16)**, détail `02_grotte.md`
Première scène jouable de bout en bout, et **preuve de tous les systèmes de combat et d'énigme** avant qu'ils ne se multiplient.
- Cinématique d'ouverture courte et non narrée (vécue, pas racontée) : réveil dans une grotte-puits, roche, obscurité, un rayon de lumière, trois feux follets animés en survol.
- **Choix du feu follet** (Feu/Eau/Terre) : les deux autres s'éloignent, l'élu suit le héros pour toute la partie.
- Salle 1 : déplacement libre, un levier qui s'allume sans effet visible (préfiguration), sortie latérale.
- Salle 2 : **un monstre apparaît** — tutoriel de l'attaque de base ; le follet délivre son lore et l'explication de la synergie. Puis **trois leviers sans instruction** (code : milieu → gauche → droite), une porte apparaît, sortie vers la Région Maison.
- Livre : combat de base (`ATTACK`), premier ennemi en JSON, premiers effets d'état élémentaires, follet suiveur avec sa lumière, catalogue d'énigmes (type `levier`, type `séquence`), dialogue/lore localisé, **HUD tactile** validé sur cette scène, **table des synergies élémentaires écrite** (livrable de design).
- Critère : un joueur qui ne connaît pas le jeu sort de la grotte à la manette **et** au tactile sans qu'on lui explique rien.

### Phase 2 — Région Maison, extérieur : première marche — **livrée et validée (2026-09-17)**, détail `03_maison-exterieur.md`
Première marche de la Région Maison (carte, ressources bloquées, items au sol, maison-structure, jour/nuit, audio), scindée le 2026-09-16 de la récolte réelle (reportée après les outils de la Phase 3). Verdict complet (parcours rejoué, défauts corrigés et re-validés) : `docs/archives/INDEX.md`.

### Phase 3 — Maison, intérieur & systèmes de camp — **livrée et validée (2026-09-17)**, détail `04_maison-interieur.md`
- Intérieur avec **stations à placement libre** (atelier de cuisine, table de craft), coffre de base, déco légère — placement libre extrait en fiche autonome livrée le jour même, `05_construction-stations.md`.
- **Système de recettes unique** (cuisine + craft), survie (faim/soif/santé + repas-buffs), inventaire poche → sac de craft, **XP par craft**, niveaux et attribution de stats.
- Rouvre bois à couper / pierre à miner via le premier outil crafté (branche + caillou) — point d'accroche `resources.js#peutRecolter`.
- Critère : la boucle 5 minutes tourne (sortir → récolter → revenir → cuisiner/crafter → repartir) et le joueur atteint le niveau ~5 — **prouvé par bot headless et validé par Xav en jeu**, détail `docs/archives/INDEX.md`. *Note 2026-09-19* : le niveau ~5 n'ouvre plus « la zone suivante » (gating abandonné), il ouvre désormais la **première zone de Chaos nocturne** de la carte Maison.

### Chantier Construction (`05_construction-stations.md`) — **close le 2026-09-19**
Placement libre des stations dans la Maison (grille, rotation, fantôme de pose). Code livré le 2026-09-17, quatre diagnostics successifs (écran-liste, menu Pause invisible, contrat « ouvert », parité clic/verbe), tous corrigés et testés headless le jour même de leur découverte — détail `docs/archives/INDEX.md`. Validé par Xav en jeu au clic/tactile **puis** à la manette et au clavier seul.

### Polish post-Construction — **étapes 1 à 6 livrées et validées en jeu (2026-09-19)**

Les six fiches ont été écrites, livrées en code et validées à la manette par Xav le 2026-09-19 (« ça fonctionne, le jeu est fluide »). Journal : `docs/archives/JOURNAL_2026-09-19_polish-tickets-1-5.md` et `JOURNAL_2026-09-19_mesure-saccades.md`.

1. **Mesure des saccades** (`MT_mesure-saccades_2026-09-19.md`) — instrument `?debug=fps` livré (`src/debug_perf.js`, `src/ui/hud_debug.js`), complété par `?echelle=N` (`D-23`). **Treize relevés réels existent** (registre §6 de `docs/DOC_suivi-dettes.md`). Le relevé qui tranche est `R-11` : **Chrome, plein écran, échelle forcée 8 — 59,9 fps, aucune frame sautée**. Restent dus : les **deux relevés de base sous Chrome**, jour et nuit (`A-03`).
2. **Héros à l'échelle 0,88** — une seule échelle en données, visuel **et** hitbox ; règle : aucun effet ne dépend de la forme du héros.
3. **Follets visibles pendant le texte de l'intro.**
4. **`station_puits`** — silhouette réassemblée (cause racine : les données). Un second défaut reste ouvert (`D-16` : mâts à planter au sol, perspective de trois quarts), gelé jusqu'aux captures de Xav.
5. **Traînée de poussière** au déplacement (module pur + `data/effets.json`).
6. **HUD sur un bandeau d'une ligne** en haut, pleine largeur ; XP retirée du HUD (conservée dans Stats). Au tactile, le bouton MENU chevauche le bandeau → ticket `D-17`.
7. **Correction des saccades — sans objet sur PC.** Le diagnostic avait montré que le fenêtrage du calque statique était sain (test rouge d'abord, vert sur HEAD) et corrigé le compteur cumulatif de `ui/hud_debug.js`. Les relevés Chrome du 19/09 au soir ferment le sujet côté PC : aucune frame sautée jusqu'à l'échelle forcée 8. `D-01` (recalcul du calque) passe en **P2** — pertinente sur appareil faible, où son coût suit le **nombre de primitives** et non les pixels (8,69 ms aux deux échelles sur l'A04) — et le remède retenu est le **défilement incrémental**, la marge élargie étant écartée. `D-02` et `D-03` passent en **P3, gelées** : elles mesuraient des millisecondes de Firefox. Ce qui reste ouvert en performance est **mobile** (`D-31`).
8. **`specs/07_chaos-nocturne.md` v1.1.0 — écrite.** Intrusion nocturne du Chaos dans la Région Maison, *révise* « aucun monstre, ton chill » de `03_maison-exterieur.md` §5. Apparitions **par paliers de niveau en données** (Nv. 5 zone nord-est, Nv. 10 zone sud, Nv. 15 apparitions éparses — la Forêt reste vide avant 15), zones en **rectangles**, comportement **« un domaine, pas un piquet »**. La spec ne livre que le système et le palier 1, **un palier par session** (A zones et tirage · B la nuit et le seuil · C comportement · D signal visuel). **Repoussée en fin de file le 2026-09-19** (décision de méthode « les fondations d'abord ») : elle ne se commence qu'après les tickets de performance — voir « Ordre d'injection » ci-dessous.
9. **Barre d'action du bas** (`E-01`) — **spec à écrire par Xav lui-même**, après le chiffrage `Q-11` (état d'UI pur).

### Arc de progression de la carte Maison (2026-09-19) — ce qui vient maintenant

**La Phase 4 n'est plus la prochaine étape.** Les *systèmes* qu'elle prévoyait (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la *carte* de la Phase 4 vient après.

| Niveau | Ce qui s'ouvre sur la carte Maison | Statut |
|---|---|---|
| 5 | Zone de Chaos nord-est (la nuit) | **décidé** — périmètre de `specs/07_chaos-nocturne.md` |
| 10 | Zone de Chaos sud (la nuit) | **décidé** — micro-ticket données seules |
| 15 | Apparitions éparses en Forêt et dans les Champs (la nuit) | **décidé** — la Forêt reste vide avant 15 |
| 20 | Une petite caverne en Forêt, annoncée par une ligne de lore, casse-tête dessiné par Xav | idée |
| 30 | Les compétences | idée — `Q-18` ouverte (frotte contre le double axe XP/jalons) |
| 40-50 | La carte suivante (Phase 4) | idée |

**Avant toute nouvelle carte** (`E-02`) : plus de ressources, écrire les crafts, écrire les armes, écrire les compétences. **Aucune nouvelle carte tant que la carte Maison n'est pas épuisée par les annexes et tunnels** (Xav, 2026-09-23) : le contenu s'agrandit **dans** la carte Maison — Maison → **Annexe 1** (mini-boss 1 + énigme 1, récompense régulière du lieu, respec et re-choix du follet illimités et gratuits, premières compétences) → **Annexe 2** (zone de mobs + tunnel à travers la carte, mini-boss 2, énigme 2) → nouvelle zone. Château et Boss 1 viennent après l'Annexe 2 (carte mentale v1.7.0 §3). **Critère de clôture de la Région Maison : la boucle de 2 heures** — sauvegarde neuve → deux heures de jeu → niveau 30 → l'envie de changer d'endroit, vérifiable à la main par Xav **et** par le bot headless.

### Ordre d'injection (nuit du 19 au 20/09) — un ticket par session, un commit par ticket

Source : `BRIEF_nuit-2026-09-19.md`, qui **amende** le §5 de `NS_decisions-rendu-navigateurs_2026-09-19.md` (archivée). Principe de Xav inchangé : **les fondations d'abord**, on ne rajoute pas de contenu sur des bases non confirmées — mais les bases sont désormais **confirmées sur mesure** (`A-03` close). Validation de Xav en jeu entre deux tickets ; la nuit du 19 au 20 est une **file de micro-tickets** sur `nuit-2026-09-19`, un commit chacun, faite pour être fusionnée « jusqu'au commit N ».

1. Doc : NS de la soirée + les deux relevés de base — **fait**. `A-03` close : `R-14` (jour) et `R-03` (nuit), Chrome, F11, échelle naturelle 4, manette — **59,9 fps, zéro frame sautée** dans les deux cas.
2. **Tailles, vitesse, lumière** — le playtest du 19/09 au soir : `D-32` héros à **9 px** (la hitbox qui rétrécit est voulue) · `D-33` vitesse de base **−25 %** (`Q-28`) · `D-34` follet **−25 %** en jeu, **orbite inchangée** (`Q-26`) · `D-35` lumière du follet ramenée au rayon de l'aura, **à l'extérieur seulement** — *la Grotte ne change pas*, c'est un critère d'acceptation vérifié par test.
3. `specs/07_chaos-nocturne.md`, **un palier par session** (A zones et tirage · B la nuit et le seuil · C comportement · D signal visuel). Après chaque palier : le relevé de nuit, comparé à `R-03`.
4. `D-36` — follet « aérien » (référence de *sensation* : le vif d'or, ni ses ailes ni son or). **Proposition**, volontairement en dernier pour rester détachable.
5. `D-17` (bouton MENU tactile sous le bandeau) et `D-30` (plein écran au premier appui tactile) — même périphérique, même validation : à traiter ensemble. Fait passer l'A04 de 46 % à presque tout l'écran.
6. `D-13` — buffs dans le bandeau HUD.
7. `D-01` (défilement incrémental du calque statique), `D-16` (puits), puis reprise de `Q-07`.

Les sept tickets de code du 19/09 (`D-22` clavier, `D-21` toit, `D-20` A et B « mains nues », `D-05` texte flottant, `D-23` `?echelle=N`) sont **livrés** ; les validations en jeu restantes vivent dans `docs/DOC_suivi-dettes.md` §3.

En parallèle, côté Xav, sans urgence : `A-06` (Firefox → `about:support` → « Graphiques », 2 min — dit si le Firefox lent est propre à sa machine) et `A-07` (profil Chrome de l'A04 par USB, qui seul débloquera `D-31`).

Les captures de la V1 (`docs/captures/v1/`) sont une **inspiration, jamais un cahier des charges** : aucun ticket ne les lit tant que `E-03` (une ligne d'intention par image) n'est pas rempli.


### Phase 4 — 1ère zone de monstres — **plus la prochaine étape** (2026-09-19)
Seconde région (≥ V1_M1), dans l'esprit chaos : plus sombre, plusieurs salles et passages, **mini-boss et boss farmables**.
- Synergies du follet en double action (joueur / monstres), équipement 3 slots, compétences (5 slots, réserve Esprit), tables de spawn/loot.
- Livre : le combat complet tel qu'il sera jusqu'au bout de M1.
- **Ordre révisé** : ces systèmes arrivent d'abord **sur la carte Maison** (voir « Arc de progression de la carte Maison » ci-dessus) ; cette *carte*-ci ne s'ouvre qu'une fois la Maison épuisée, vers le Nv. 40-50 (provisoire). Le gating d'accès par niveau ~5 est abandonné.

### Phase 5 — Le Château
Intérieur navigable multi-salles, **mini-boss à tir à distance** (trajectoire télégraphiée, cohérent avec « pas de mort injuste »), énigmes uniques scriptées réservées aux moments forts.

### Phase 6 — Boss 1 & Poste avancé
- Boss en phases, télégraphié, rejouable sans farm abusif.
- Victoire = jalon : **respec des stats et changement de compagnon débloqués**.
- **Poste avancé** : équivalent de la Maison (stockage, craft) mais conçu comme **Hub** — c'est le pont vers M2, et la clôture de M1.
- Journal de découvertes complet sur M1.

### Phase 7 — Polish, mobile & packaging
Wrapper WebView, ergonomie tactile finale (densité des 5 actions), plancher de performance mesuré sur un appareil nommé, accessibilité (formes/icônes des éléments, taille des cibles), relecture de la localisation EN, export/import de sauvegarde, page externe de dons. **Aucun nouveau contenu.**

### Fil transversal — Crypte X (D14⑥, acté le 2026-09-16, conçu **après** le Poste avancé)
Casse-tête réparti sur tout le monde de la V2 : un bouton dans la Maison, un levier dans le Château, des symboles éparpillés dont un seul est à noter dans un cryptex une fois ouvert, la grotte de départ en fait partie (ses 3 leviers en sont la première pierre). Pensé comme un **circuit imprimé superposé à la carte du monde**, avec des portes logiques à connecter et une combinaison finale. Il exige une vision globale du monde : **aucune conception avant la clôture de M1**. Obligation immédiate pour chaque phase de contenu : réserver en données les emplacements (bouton, levier, symboles) sans poser d'objet, pour ne jamais redessiner une carte pour lui.

---

## Rappel pour l'agent en fin de session
Avant de conclure : documenter explicitement dans `CLAUDE.md` du projet V2 (1) les décisions prises et pourquoi, (2) ce qui est livré et validé (commandes exactes rejouées), (3) ce qui reste hors scope et pour quelle phase c'est prévu. Ce résumé est la mémoire du projet entre sessions. Un point de design non tranché se marque `[OUVERT]` et remonte à Xav — il ne se tranche pas en silence.

Puis, dans `docs/DOC_suivi-dettes.md` : clore les lignes `D-` et `DOC-` livrées (date + une ligne de verdict, la ligne descend en « Clos »), ouvrir celles que la session a révélées. **Ne jamais clore une ligne `Q-`, `V-` ou `E-`** : Xav seul tranche, valide en jeu et écrit. Enfin, **un commit** pour la session, l'identifiant du ticket dans le titre — et **aucun `push`**.

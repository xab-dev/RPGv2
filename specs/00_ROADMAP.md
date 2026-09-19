# RPG V2 — Roadmap + prompt d'exécution autonome

**Version : 1.6.0** — document vivant.

**Statut** : Phases 0, 1, 1b, 2 et 3 (Palier A-E, boucle 5 minutes), le chantier `05_construction-stations.md` (placement libre des stations) **et les étapes 1 à 6 du polish post-Construction** sont livrés et validés en jeu par Xav (manette, 2026-09-19 : « ça fonctionne, le jeu est fluide »). La branche `polish-2026-09-19` est **fusionnée dans `main`** (`e5b6d44`) : on travaille sur `main`. **Chantier courant : les fondations** — performance et retours du playtest du 19/09 — **avant** de reprendre le contenu de la carte Maison, qui va jusqu'à la **boucle de 2 heures**. Décision de méthode de Xav (2026-09-19) : **on ne rajoute pas de contenu sur des bases non confirmées** ; `specs/07_chaos-nocturne.md` et `Q-07` attendent (voir « Ordre d'injection » ci-dessous). Ce document sert de brief autonome ; **ce qui reste dû (dettes, questions, validations) vit dans `docs/DOC_suivi-dettes.md`, et nulle part ailleurs**.

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

Référence complète : `docs/carte_mentale_RPG_V2_v1_6_0.md` §0 et §8. Résumé opérationnel :

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
| Périmètre M1 | Grotte → Région Maison → 1ère zone → Château → Boss 1 → Poste avancé. **Liste close.** Console portable, cartouches (haTD, poker TCG, snake), Codex de collection au sens large, alignement bien/mal : **M2+**. |
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
Voir `docs/carte_mentale_RPG_V2_v1_6_0.md` §0bis : cohérence 3 éléments RPG vs 9 haTD (à traiter au contrat de cartouche, M2+) ; tension éclats/paliers de vitalité si un marchand existe ; volume de texte doublé par le bilinguisme ; densité de 5 actions sous le pouce droit en tactile ; conformité Play Store sur la sollicitation de dons.

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

1. **Mesure des saccades** (`MT_mesure-saccades_2026-09-19.md`) — instrument `?debug=fps` livré (`src/debug_perf.js`, `src/ui/hud_debug.js`). **Trois relevés réels existent** (`R-01`, `R-02`, `R-04` du registre §6 de `docs/DOC_suivi-dettes.md`). `R-04` a été pris **sous émulation F12** : c'est le PC qui dessine, pas un téléphone — il fonde le fait que **le coût de rendu suit le nombre de pixels**, pas un verdict sur mobile. Restent dues : la mesure **de nuit** (`A-03`) et le relevé sur **téléphone réel** (`A-04`).
2. **Héros à l'échelle 0,88** — une seule échelle en données, visuel **et** hitbox ; règle : aucun effet ne dépend de la forme du héros.
3. **Follets visibles pendant le texte de l'intro.**
4. **`station_puits`** — silhouette réassemblée (cause racine : les données). Un second défaut reste ouvert (`D-16` : mâts à planter au sol, perspective de trois quarts), gelé jusqu'aux captures de Xav.
5. **Traînée de poussière** au déplacement (module pur + `data/effets.json`).
6. **HUD sur un bandeau d'une ligne** en haut, pleine largeur ; XP retirée du HUD (conservée dans Stats). Au tactile, le bouton MENU chevauche le bandeau → ticket `D-17`.
7. **Correction des saccades — pas encore faite.** Le diagnostic est fait (le fenêtrage du calque statique est sain, test rouge d'abord puis vert sur HEAD ; le compteur cumulatif de `ui/hud_debug.js` a été corrigé), mais **aucune correction de rendu n'a touché le jeu**. Elle est portée par `D-01` (les frames de recalcul du calque sortent du budget) et `D-02` (`dessiner()` coûte 12 ms sans aucun monstre) ; le prochain ticket de perf est une **ventilation de `dessiner()` par calque, mesure seule, zéro correction**.
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

**Avant toute nouvelle carte** (`E-02`) : plus de ressources, écrire les crafts, écrire les armes, écrire les compétences. **Critère de clôture de la Région Maison : la boucle de 2 heures** — sauvegarde neuve → deux heures de jeu → niveau 30 → l'envie de changer d'endroit, vérifiable à la main par Xav **et** par le bot headless.

### Ordre d'injection (2026-09-19) — un ticket par session, un commit par ticket

Source : `NS_decisions-fondations_2026-09-19.md` §5, qui **remplace** le §7 de `NS_decisions-revue-dettes_2026-09-19.md`. Principe de Xav : **les fondations d'abord** — on ne rajoute pas de contenu sur des bases non confirmées, et les tickets légers et sûrs passent avant les lourds. Validation en jeu de Xav entre deux tickets.

1. Session de documentation « fondations » (doc seule) — **faite**.
2. `D-22` — clavier : `E` = interagir, `F` = consommer (`MT_clavier-e-f_2026-09-19.md`) — **livré le 2026-09-19** (échange dans `input/keyboard.js` seul ; glyphes des locales mis d'accord à la main, double source ouverte en `D-25`). Validation clavier de Xav due.
3. `D-21` — rayon d'effacement du toit −10 % (`MT_toit-rayon_2026-09-19.md`) — **livré le 2026-09-19, validation en jeu de Xav due**.
4. `D-20` palier A — « mains nues », portée de l'auto-attaque (`MT_mains-nues_2026-09-19.md`). **Validation dans la Grotte, sur le premier monstre.**
5. `D-20` palier B — icône de l'arme équipée dans la case d'attaque.
6. `D-05` — texte flottant « +1 bois » à la récolte et au ramassage (`MT_texte-flottant_2026-09-19.md`).
7. `D-23` — paramètre debug `?echelle=N`, **mesure seule** (`MT_echelle-debug_2026-09-19.md`) → relevés `A-05` par Xav.
8. `D-02` + `D-03` — ventilation de `dessiner()` par calque et explication du delta par frame (même instrument, **mesure seule, zéro correction**).
9. Xav tranche `Q-19` (plafonner l'échelle de rendu ?) et `Q-20` (critère de clôture des fondations, appareil plancher) → ticket de correction d'échelle, écrit d'après les chiffres.
10. `D-01` — défilement incrémental du calque statique (piste préférée à la marge élargie : « on le calcule au fur et à mesure »).
11. `D-17` (bouton MENU tactile sous le bandeau), `D-13` (buffs au bandeau), puis `specs/07_chaos-nocturne.md` **palier par palier** ; `Q-07` reprend ici.

En parallèle, côté Xav : `A-04`, le relevé `?debug=fps` sur le **Galaxy A04 réel** par le Wi-Fi local (procédure au §6 de la NS). `D-24` (serveur local joignable depuis le téléphone, repli du bouton « copier ») ne s'ouvre que si cette procédure échoue.

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

# RPG V2 — Roadmap + prompt d'exécution autonome

**Version : 1.2.0** — document vivant.

**Statut** : Phases 0, 1, 1b et 2 livrées et validées. Phase courante : Phase 3, détaillée dans `04_maison-interieur.md` (à écrire). Ce document sert de brief autonome — à donner tel quel à Claude Code pour démarrer la phase courante sans aller-retour préalable.

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

Référence complète : `carte_mentale_RPG_V2_v1_2_0.md` §0 et §8. Résumé opérationnel :

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
| Progression | **XP → stats** (points de stat par niveau). **Jalons narratifs → capacités.** Deux axes indépendants. Sources d'XP : combat **et craft**. Accès à la 1ère zone de monstres gaté par niveau (~5). |
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
Voir `carte_mentale_RPG_V2_v1_2_0.md` §0bis : cohérence 3 éléments RPG vs 9 haTD (à traiter au contrat de cartouche, M2+) ; tension éclats/paliers de vitalité si un marchand existe ; volume de texte doublé par le bilinguisme ; densité de 5 actions sous le pouce droit en tactile ; conformité Play Store sur la sollicitation de dons.

---

## Contraintes de méthode non négociables

- **Cause racine avant tout patch.** Jamais de rustine sur un symptôme.
- **Valider avant de livrer** : `node --check` sur chaque fichier JS livré + toute la suite `tests/` rejouée. Un fichier `tests/test_<phase>_<date>.js` par session qui touche la logique de jeu.
- **Le test data-driven, à chaque catalogue livré** : ajouter une entrée (arme, ennemi, recette, tuile, énigme…) doit être possible **en ajoutant une entrée JSON, sans toucher une ligne de code de système**. Si ce n'est pas le cas, le catalogue n'est pas livré.
- **Zéro chaîne en dur.** Tout texte visible passe par les fichiers de localisation FR/EN, dès la Phase 0.
- **Zéro dépendance du gameplay à un périphérique.** Aucun `KeyboardEvent`, `TouchEvent` ou `Gamepad` en dehors de la couche d'input.
- **Tout commentaire de code et texte d'UI en français**, style « contexte suffisant pour reconstruire le raisonnement » — un commentaire dit *pourquoi*, pas *quoi*.
- **Scope discipline** : si une tâche déborde du brief, s'arrêter au dernier palier stable et documenter ce qui reste hors scope. Aucun système généralisé avant qu'un second cas d'usage réel existe — sauf les catalogues data-driven listés, qui sont généralisés par décision.
- **Le rendu canvas n'est jamais exercé par les tests headless.** Toute vérification visuelle revient à Xav dans un vrai navigateur, à la manette.
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

### Phase 3 — Maison, intérieur & systèmes de camp
- Intérieur avec **stations à placement libre** (atelier de cuisine, table de craft), coffre de base, déco légère.
- **Système de recettes unique** (cuisine + craft), survie (faim/soif/santé + repas-buffs), inventaire poche → sac de craft, **XP par craft**, niveaux et attribution de stats.
- Rouvre bois à couper / pierre à miner via le premier outil crafté (branche + caillou) — point d'accroche `resources.js#peutRecolter`.
- Critère : la boucle 5 minutes tourne (sortir → récolter → revenir → cuisiner/crafter → repartir), et le joueur atteint le niveau ~5 qui ouvre la zone suivante.

### Phase 4 — 1ère zone de monstres
Seconde région (≥ V1_M1), dans l'esprit chaos : plus sombre, plusieurs salles et passages, **mini-boss et boss farmables**.
- Synergies du follet en double action (joueur / monstres), équipement 3 slots, compétences (5 slots, réserve Esprit), tables de spawn/loot, gating d'accès par niveau via le registre de flags.
- Livre : le combat complet tel qu'il sera jusqu'au bout de M1.

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

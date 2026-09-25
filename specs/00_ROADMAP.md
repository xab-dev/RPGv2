# RPG V2 — Roadmap

**Version : 2.0.0** (2026-09-25) — *remplace* la v1.9.0 du 23/09, archivée telle quelle dans `docs/archives/ROADMAP_v1-9-0_2026-09-23.md` (décision de Xav, `Q-175` : « une v2, et archiver l'originale »). La v1 était le **cadrage de départ** : une prévision, phase par phase, de ce qu'on ne savait pas encore faire. L'équivalent de la V1 est atteint ; la v2 dit **d'où on part maintenant, ce qui est acquis, et le chemin connu**. Elle reste courte : l'état fin vit dans `CLAUDE.md` (« Où on en est »), ce qui est dû dans `docs/DOC_suivi-dettes.md`, l'intention dans la carte mentale.

---

## 1. Le bloc à lire en premier

**Qui tu es dans ce projet.** Le développeur principal d'un RPG 2D en HTML5 / JS / Canvas. Le concepteur, relecteur et testeur est Xav (**dev = Xav**) : il joue, c'est lui qui voit. Tu travailles par tickets courts ou par files de micro-tickets, et tu ne rediscutes pas ce qui est acté ci-dessous.

**Le projet en une phrase.** Un RPG action-aventure 2D en 3 éléments (Feu / Eau / Terre), entièrement data-driven en JSON externes, joué à la manette sur PC en référence et au tactile en parallèle, gratuit, sans publicité ni achat, 100 % hors-ligne, bilingue FR/EN.

**Le cap.** Fluide, hybride chill / speed run, médiéval-post-industriel (« château fort mélangé à Tchernobyl »), rpg-like, une relation avec l'IA — le follet, c'est Claude ; le héros, un joueur. Il faut pouvoir **anticiper l'impossible d'aujourd'hui qui deviendra possible demain**. Le cap se suit dans `docs/carte_mentale_RPG_V2_v1_8_0.md` §00.

**Positionnement.** Vitrine d'un jeu conçu et développé avec des agents IA, projet laboratoire. Xav ne tient pas de rôle de graphiste : l'identité visuelle repose sur des tuiles réutilisables et un **rendu procédural net à résolution physique — pas de pixel art** (décision du 15/09 ; *corrige* le « pixel art léger » de la v1, `DOC-11`) —, jamais sur une production d'assets massive.

**L'existant.** La V1 (`monde/rpg_v0_1_0.js`, hors de ce dépôt) est un prototype jetable : aucune ligne n'en est reprise, seuls des patrons validés (tables déclaratives, scènes avec `world` calculé, dialogue généralisé, décor procédural à graine fixe, tests headless sans framework). Le tower defense haTD est hors périmètre M1.

**Les règles de méthode** sont dans `CLAUDE.md` (« Contraintes de méthode non négociables ») et nulle part ailleurs : la v1 en tenait une copie, qui a divergé.

---

## 2. Décisions acquises (ne pas rouvrir)

Référence complète : `docs/carte_mentale_RPG_V2_v1_8_0.md` §0 et §8, `docs/archives/decisions_archives.md`, et la table de `CLAUDE.md`. Ce qui suit est le résumé opérationnel **à jour du 25/09** ; *révise* signale ce qui a changé depuis la v1.

### Plateforme et technique

| Décision | Valeur |
|---|---|
| Plateforme | **PC à la manette** en référence ; tactile mené en parallèle, jamais en portage tardif. **Chrome** est le navigateur de référence ; rien d'engagé sur Firefox ni Safari (`Q-24`). |
| Moteur | HTML5 / JS / Canvas 2D, modules ES natifs. Pas de framework de jeu, pas de bundler obligatoire. Servi en `http://`. Publié sur GitHub Pages depuis `main`. |
| Rendu | Résolution logique 480 × 270, rendu net à la résolution physique (DPR). Réglages graphiques Bas / Moyen / Haut (`specs/09`). Aucun effet ne bat au-delà de 3 Hz. |
| Performance | 60 fps sur PC en référence (`R-11`) ; 30 fps en plancher mobile, sur un appareil à nommer (le téléphone du neveu, `D-14`). Une frame dépend de ce qui est à l'écran, jamais de la taille de la scène (`tests/test_budget_carte`). |
| Packaging | Navigateur. Un wrapper WebView pour Android viendra avec le polish mobile (§4). |
| Données | JSON externes, un fichier par catalogue, validés par schéma au démarrage (échec dur, avec le chemin de l'erreur). |
| Input | Couche abstraite : le gameplay ne lit que des verbes (`MOVE, ATTACK, SKILL_1..3, CONSUME, INTERACT, MENU`) ; la visée sort par un accesseur séparé. |
| Sauvegarde | Une seule, automatique, en double tampon, schéma versionné et migré (v9 au 25/09). Export / import manuel. **Pas de cloud** sans multijoueur. |
| Déblocages | Registre central de flags, conditions en données. |
| Langue | FR + EN, zéro chaîne en dur, lore compris. |
| Hors-ligne | 100 %. |

### Design

| Décision | Valeur |
|---|---|
| Périmètre M1 | Grotte → Région Maison → 1ère zone → Château → Boss 1 → Poste avancé. **Liste close.** Console, cartouches, Codex : M2+. **L'alignement est en M1.** |
| Éléments | 3 (Feu / Eau / Terre), extensibles en données ; plus à terme. |
| Stats | Force, Agilité, Vitalité, Esprit ; toute stat a une dérivée, un système lit la dérivée. Tout scaling de dégâts part de la Force. **Esprit amplifie les compétences** (puissance et hâte) — *révise* « Esprit = réserve, rien d'autre ». |
| Progression | XP → stats (combat **et** craft) ; jalons narratifs → capacités. Pas de gating de zone par niveau : la carte suivante s'ouvre quand la Maison est épuisée (Nv. 40-50, provisoire). |
| Actions et équipement | 5 slots d'action (1 attaque, 3 compétences, 1 consommable), 3 d'équipement (arme, armure, accessoire), en données. |
| Compagnon (le follet) | Suit le héros dès la Grotte ; double action (héros / monstres) ; seule lumière la nuit sans torche ; porte l'alignement caché. **Respec et re-choix du follet illimités et gratuits depuis le menu, après l'Annexe 1** — *révise* « après Boss 1 ». |
| Effets d'état | Dérivés de leur élément ; la table des synergies et de leurs régimes négatifs est écrite (carte mentale §8). |
| Survie | Pénalités progressives, jamais bloquantes ; jauges gelées hors session. Aucun timer d'attente dans tout le jeu. |
| Recettes | Un seul système, stations et catégories en données. |
| Cartes | Tuiles réutilisables, layouts écrits à la main, décor procédural à graine fixe. **Pas de nouvelle carte tant que la Maison n'est pas épuisée** : elle s'agrandit par annexes et tunnels. |
| Narration | Lore diffus, aucun journal de quêtes ni objectif affiché ; un journal d'indices et de traces (ce qui a été trouvé, jamais ce qu'il faut faire). Dialogues à conséquences. |
| Économie | Pas de monnaie abstraite : l'éclat sert de monnaie d'échange, les ressources restent distinctes. |
| Modèle | Gratuit, sans pub ni achat, **aucune sollicitation de dons** ; source visible, tous droits réservés (`LICENSE`) ; payant ou portage possibles une fois fini — *révise* « gratuit + dons externes ». |
| Accessibilité | Chaque élément identifiable sans la couleur ; tout écran ouvrable au doigt se ferme au doigt. |

---

## 3. Ce qui est acquis — les specs livrées

Chaque spec livrée **reste dans `specs/`** : c'est le contrat du code qui vit (le code et les tests la citent par son chemin, ~200 fois). Elle ne se relit que quand un ticket touche son système. Une spec en cours se lit en entier avant d'en coder un palier.

| Spec | Ce qu'elle a posé | État |
|---|---|---|
| `01_socle-technique` | registre, schémas, input, save, boucle, tests headless | livrée |
| `02_grotte`, `03_grotte-polish` | la Grotte : combat, follet, énigmes, dialogue, portails, intro | livrées |
| `03_maison-exterieur` | la Région Maison : forêt procédurale, ressources, jour / nuit | livrée |
| `04_maison-interieur`, `04_stations-proportions-collision`, `04_indices-commandes` | craft, récolte, survie, XP, coffre ; stations ; indices de commande | livrées |
| `05_construction-stations` | placement libre des stations | livrée |
| `07_chaos-nocturne` | les zones de Chaos la nuit | livrée |
| `08_menus-cartes` | les menus en cartes, la pile du menu | livrée |
| `09_reglages-graphiques` | Bas / Moyen / Haut | livrée |
| `10_alignement-follet` | l'alignement caché, l'orbite inversée, les régimes de synergie | livrée (`V-103` à voir) |
| `11_dialogues-consequences` | la conversation, les effets de monde | livrée |
| `12_prologue` | les écrans avant le symbole | livrée |
| `13_lisieres-performance-carte` | tampons, défilement, lisières, tri par le champ | livrée |
| `14_annexe-1` | la stèle, la descente, les tireurs, Zéros, le Gardien, les compétences, choisir | validée ; close à l'album de référence |
| `15_torche` | la torche | livrée |

---

## 4. Le chemin connu

**Maintenant : finir la carte Maison**, par des annexes et tunnels, jamais une carte nouvelle. Critère de clôture : **la boucle de 2 heures** (sauvegarde neuve → 2 h de jeu → Nv. 30 → l'envie de changer d'endroit). Le rythme ne se rouvre pas avant le Boss 1 (`Q-62`). L'équilibrage se fait au ressenti de Xav.

1. **Le journal d'indices et de traces** (dernier bouton du menu : l'histoire parcourue, les Indices par zone, le carnet du cryptex).
2. **L'Annexe 2** : une zone de mobs et un tunnel, mini-boss 2, énigme 2.
3. **La nouvelle zone**, quand la Maison est épuisée (Nv. 40-50, provisoire) : les systèmes de l'ancienne « Phase 4 » (armes, équipement, tables d'apparition) arrivent d'abord sur la carte Maison.
4. **Le Château** : intérieur multi-salles, mini-boss à distance télégraphié, énigmes uniques aux moments forts.
5. **Boss 1 et le Poste avancé** : boss en phases, télégraphié, rejouable sans farm abusif ; le Poste avancé est un hub (stockage, craft), pont vers M2 et clôture de M1.
6. **Polish mobile et packaging** : wrapper WebView, densité tactile des 5 actions, plancher de performance sur un appareil nommé, accessibilité, relecture de l'EN, export / import. Aucun contenu nouveau.

**Fil transversal — la Crypte X**, conçue après le Poste avancé : un casse-tête réparti sur tout le monde (circuit imprimé, portes logiques, cryptex ; les trois leviers de la Grotte en sont la première pierre).

**Une étape ne se commence que quand sa spec est écrite.** L'ordre vient des décisions du 23/09 (`docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md` §1.9) ; il se révise ici, par Xav.

---

## 5. L'horizon — l'impossible d'aujourd'hui

Ce que Xav voit plus loin, sans spec ni date (carte mentale §00). Rien ne se code avant une spec ; ce qui compte **aujourd'hui**, c'est que l'architecture puisse l'accepter demain (`Q-177`).

- **Le follet agentique** : trier les coffres ; une station de minage autonome au sous-sol ; plusieurs follets laissés au travail pendant qu'on se balade avec un autre.
- **La carte Build** (menu Héros) : choisir vite le follet, les stats prioritaires, l'équipement, selon ce que contiennent les coffres.
- **La vue 3/4** : la règle de profondeur (`Q-165`) en est le premier pas ; un rendu remplaçable sans toucher au reste.
- **M2+** : la console portable, les cartouches (haTD, poker TCG, snake), le Codex.

# CLAUDE.md

Ce fichier dit à Claude Code ce qu'il doit savoir **avant d'agir** dans ce dépôt. Il ne raconte pas l'histoire : elle vit dans `docs/archives/INDEX.md` (un journal par session, verbatim). Son texte d'avant le ménage du 25/09 est archivé tel quel dans `docs/archives/CLAUDE_etat_2026-09-25.md`. Plafond : 300 lignes, **jamais un journal ici**.

## Le cap — ce que doit être le jeu à la fin

> un jeu fluide et hybride entre chill et speed run, médiéval-post-industriel, rpg-like, AI relationship (et qui reste flou même pour Xav, on avance à l'aveugle maintenant que l'équivalent de RPG-v1 est atteint), il faut pouvoir anticiper l'impossible d'aujourd'hui qui deviendra possible demain. — Xav, 25/09

- **Le point de départ** : refonte complète d'un prototype V1 jetable (`monde/rpg_v0_1_0.js`, hors dépôt), dont seuls des patrons sont repris ; « vitrine d'un jeu conçu et développé avec des agents IA, projet laboratoire ». L'équivalent de la V1 est atteint : le cap est flou **par nature**, il oriente, il ne se tranche pas.
- **La relation avec l'IA** : « le feu follet, c'est Claude, et le héros, c'est Xav ou n'importe qui d'autre, un joueur ». Le follet est un LLM scripté ; l'alignement caché passe par lui. Claude propose des moments de dialogue du follet (trois options, Xav choisit).
- **Médiéval-post-industriel** : « château fort mélangé à Tchernobyl » — métal rouillé, automatismes.
- **Horizon, jamais une spec tant qu'elle n'est pas écrite** : le follet **agentique** (trier les coffres, une mine autonome au sous-sol, plusieurs follets laissés au travail pendant qu'on se balade avec un autre) ; une **carte Build** dans le menu Héros (follet, stats prioritaires, équipement, selon ce que contiennent les coffres).
- **Anticiper l'impossible** = la règle d'architecture ci-dessous, et des modules séparés au point qu'une phase future remplace le rendu (vue 3/4 à terme) sans toucher au reste. Ce que l'architecture devra accepter pour l'horizon : `Q-177`.
- **Le cap se suit dans `docs/carte_mentale_RPG_V2_v1_8_0.md` §00** (tranché par Xav : `Q-176`) ; ce qui s'y précise ne se recopie pas ici.

## Le projet

RPG action-aventure 2D en HTML5 / JS / Canvas, en 3 éléments (Feu / Eau / Terre), entièrement data-driven en JSON externes, joué **à la manette sur PC** (référence) et au tactile sur mobile (en parallèle, jamais en portage tardif). Gratuit, sans pub ni achat, 100 % hors-ligne, bilingue FR/EN. Xav conçoit, relit et teste (**dev = Xav**) ; Claude développe.

**Le jeu est en ligne : `https://xab-dev.github.io/RPGv2/`** (GitHub Pages, servi depuis `main`). **Un `push` sur `main` publie le jeu.** Les `push` sont à Xav : **ne jamais pousser**.

## Règle d'architecture directrice

> On ne spécifie pas seulement ce que le jeu doit faire aujourd'hui. On spécifie comment le jeu doit pouvoir accepter ce qu'on n'a pas encore imaginé.

Test de chaque catalogue : ajouter une entrée (arme, ennemi, recette, compagnon…) se fait **en ajoutant une entrée JSON, sans toucher une ligne de code de système**. Sinon, le catalogue n'est pas livré.

## Où on en est

- **Dernière publication : `v0.9.0`** (26/09, `main`, le tag et la release poussés ; dernière release : `v0.9.0`, « Le héros »). Elle rassemble, depuis `v0.8.0` : épilepsie (`D-220`, `D-221`), profondeur (`D-222` à `D-224`), polish libre, `npm run dettes`, orientation et visée (`D-229`, `D-247` à `D-249`), triche `?cheat=phenom` (`D-250`), dettes `D-243`, `D-244`, `D-246`, le ménage du contexte (`DOC-10`), le joystick en laisse et borné (`D-138`, `D-251`), « Exporter d'abord » (`D-274`), et **le héros** : redessiné (`D-252` à `D-267`), puis **spec 16** (le tour à tout angle, le souffle et le pas, le pas qui suit la vitesse, la capuche en retard : `D-268` à `D-275`), la capuche symétrique et harmonisée (`D-276`, `D-277`), l'œil qui passe derrière la capuche (`D-278`) et sa lueur sur l'épaule (`D-279`). À voir : `V-191` à `V-197`.
- **Branche ouverte : `audit-heros`** (depuis `main`, 26/09) — spec 17, l'audit du héros en quatre paliers (A outils et skill, B allègement au pixel près, C polish de référence, D état des lieux en captures), arrêt de Xav et push de la branche après chaque palier. À reprendre : `D-272` (P1, avant d'agrandir le catalogue).
- **Fondations closes** (23/09, `Q-20`). **Spec 14 (Annexe 1) validée** le 25/09 ; close quand l'album de référence sera pris (annexe B du suivi).
- **Prochaine étape : finir la carte Maison** par des **annexes et tunnels**, jamais une carte nouvelle — puis le journal d'indices et de traces, l'Annexe 2. Critère de clôture de la Région Maison : **la boucle de 2 heures** (sauvegarde neuve → 2 h → Nv. 30 → l'envie de changer d'endroit). Le rythme ne se rouvre pas avant le Boss 1 (`Q-62`).
- **L'équilibrage se fait au ressenti de Xav** : valeurs à la louche et leur raison, jamais un bot d'équilibrage.
- **Ne se commence pas** : une spec non écrite ; `Q-07` (gelée) ; les captures V1 (`docs/captures/v1/`, inspiration seulement, tant que `E-03` n'est pas rempli). **Ne se reprend jamais par initiative** : la lumière du follet (`D-35`).
- **Plateformes** : Chrome = navigateur de référence (`docs/DOC_navigateurs.md`), rien d'engagé sur Firefox ni Safari (`Q-24`). Relevés de base `R-14` (jour), `R-03` (nuit). Le Galaxy A04 est un banc d'épreuve (`D-31`) ; le plancher mobile se nommera sur un téléphone acheté pour ça (`D-14`, `V-10`).

## Où vivent les choses

| Quoi | Où | Quand le lire |
|---|---|---|
| Ce qui est dû (dettes, questions, validations) | `docs/DOC_suivi-dettes.md` — **la seule liste** | les lignes que le ticket cite, jamais en entier (~120 k tokens) |
| D'où on part, décisions acquises, specs livrées, chemin connu, horizon | `specs/00_ROADMAP.md` (v2 du 25/09 ; l'originale : `docs/archives/ROADMAP_v1-9-0_2026-09-23.md`) | en entier avant un ticket de code (~110 lignes) |
| Les specs livrées | `specs/NN_*.md` : elles **restent là**, contrats du code qui les cite | quand un ticket touche leur système |
| La spec en cours | `specs/NN_*.md` | en entier, avant d'en coder un palier |
| Le cap, et les décisions produit/techniques verrouillées | `docs/carte_mentale_RPG_V2_v1_8_0.md` §00, §0, §8 | quand un ticket touche le design ou l'intention |
| Décisions datées archivées (**toujours en vigueur**) | `docs/archives/decisions_archives.md` | quand un ticket touche leur terrain (résumé plus bas) |
| Carte des modules | `docs/ARCHITECTURE.md` | quand un ticket touche un module ; à tenir à jour |
| Histoire des sessions | `docs/archives/INDEX.md` | en cas de doute sur une décision passée |
| Journal de la session en cours | `docs/JOURNAL_AAAA-MM-JJ_*.md` (un seul à la racine de `docs/`) | au ménage, et à chaque commit d'une file |
| Ce que Xav regarde en jeu | `docs/CHECKLIST_visuelle.md` | clôture d'un ticket de rendu |

**Skills du projet** (`.claude/skills/`, chargés à la demande) : `menage` (début de session, avant tout code), `cloture-ticket` (fin de chaque ticket), `banc-perf` (fin de spec, ou quand Xav part dormir).

## Contraintes de méthode non négociables

Chaque règle est née d'un incident ; son histoire est dans l'archive citée (ou `docs/archives/CLAUDE_etat_2026-09-25.md`).

- **Avant toute action de code** : la ROADMAP, puis la spec courante. Ne jamais rouvrir une décision actée ; un point de design non tranché se marque `[OUVERT]` et remonte à Xav.
- **Un sujet par ticket, une session courte par ticket** ; une spec par paliers se joue **un palier par session** ; Xav valide en jeu entre deux. Chaque ticket cite les identifiants du suivi qu'il touche.
- **Une file de micro-tickets est permise** : branche dédiée, **un commit par ticket**, ordre fixe, **chaque commit retirable seul** (vérifié : `git revert 9997cec`). **L'état d'une file vit sur le disque** (le journal, une ligne par commit), jamais dans la mémoire de la session.
- **Un ticket = un commit**, l'identifiant dans le titre ; jamais de commit fourre-tout (`1be4688`). **Jamais pousser.** Un correctif tenu à part d'une spec en cours part de `main` sur sa branche et prend ses identifiants **après** ceux de la branche en cours.
- **Cause racine avant tout patch** — jamais de rustine sur un symptôme.
- **Zéro chaîne en dur** : tout texte visible passe par `t("clé")` (FR/EN).
- **Zéro dépendance du gameplay à un périphérique** : aucun `KeyboardEvent`, `TouchEvent` ou `Gamepad` hors de la couche d'input ; le gameplay ne connaît que des verbes (`MOVE, ATTACK, SKILL_1..3, CONSUME, INTERACT, MENU`).
- **Commentaires et textes d'UI en français** ; un commentaire dit *pourquoi*, jamais *quoi*, avec assez de contexte pour reconstruire le raisonnement.
- **Modules séparés** : registre (données) / input (périphériques) / scène (monde) / rendu (canvas) / save (persistance).
- **Tout seuil numérique déclaré en un seul endroit**, commenté avec son *pourquoi*, marqué **provisoire** tant qu'il n'est pas validé en jeu.
- **Discipline de scope** : si une tâche déborde, s'arrêter au dernier palier stable et le noter. Aucun système généralisé avant un second cas d'usage réel, sauf les catalogues data-driven des specs.
- **Toute interface ouvrable au tactile est fermable au tactile, sans défilement** : « Fermer » dans une zone qui ne défile pas, le reste défile à l'intérieur. Aucun test ne prouve « ça tient dans l'écran » : on teste la structure, Xav valide le reste (`D-42`).
- **Un écran d'UI est « ouvert » si et seulement si son état logique le dit ET qu'il est visible** ; un écran que le routage des verbes ne peut pas interroger n'existe pas pour lui. La pile du menu (`menu_cartes.js#creerNavigationEcrans`) le tient par construction ; la règle vaut pour tout écran né hors d'elle (`Q-10`).
- **Le rendu canvas n'est jamais exercé par les tests headless** : toute vérification visuelle revient à Xav, dans un vrai navigateur, à la manette. **Jamais annoncer un rendu ou une sensation « validé » sans qu'il l'ait joué.**
- **Toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure** — jamais de `setTransform` inline dans `main.js#dessiner()`. Tout ticket touchant `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou `main.js#dessiner()` se clôt par une validation de Xav guidée par `docs/CHECKLIST_visuelle.md` ; l'album de référence se prend à chaque jalon (`Q-15`, annexe B du suivi).
- **Un renommage ou retrait de contenu de catalogue n'est jamais couvert par la migration de schéma** (`save.js#migrer`) : données valides mais obsolètes, à traiter explicitement à chaque retrait.
- **Ménage de journal en début de session, avant tout code** : skill `menage`.
- **Un sous-système « meilleur effort »** (audio, plein écran, clic droit, curseur, icônes) **rattrape ses erreurs à la frontière de son API**, jamais au niveau de la boucle. Jamais pour le gameplay (un bug doit se voir ; la boucle le journalise et survit, `D-71`) ni pour la sauvegarde (son échec est dit au joueur, `D-139`) (`Q-12`).
- **Un relevé de performance cite son navigateur** ; deux navigateurs ne se comparent pas. Sous Chrome (référence), le seul signal de fluidité est « frames sautées » ; Firefox est un banc de coût par calque, jamais un verdict.
- **Le budget de la carte se vérifie de temps en temps, jamais à chaque ticket** (`Q-159`) : aucun banc ni capture par palier, Xav joue et voit. Banc complet en fin de spec ou quand Xav part dormir (skill `banc-perf`) ; une sentinelle permise en milieu de spec. `tests/test_budget_carte` tient le contrat : une frame dépend de ce qui est à l'écran, jamais de la taille de la scène.
- **Pas de framework de jeu, pas de bundler obligatoire** ; une dépendance de dev reste hors du jeu servi.
- **Servi en `http://`** (jamais `file://`), modules ES natifs ; chaque fichier de `/src` reste importable depuis Node — aucun accès DOM au niveau module.

## Règles d'écriture du code (issues des décisions archivées)

À relire avant un ticket qui touche leur terrain ; détail dans `docs/archives/decisions_archives.md`.

- **Tests** : un test n'épingle jamais une valeur de réglage, il vérifie un contrat · un harnais ne réimplémente jamais ce qu'il éprouve · un instrument de rythme n'est pas un test.
- **`main.js`** : ce que `demarrerJeu` et `creerOrchestrateurGrotte` partagent se déclare au niveau module · une charge utile s'enrichit, elle ne se refabrique pas — une entrée de sauvegarde non plus · la boucle de jeu survit à une exception (journalisée, jamais masquée) · un garde-fou de données se pose au démarrage, pas dans la boucle de dessin · un état d'UI se relit à la source qui FAIT.
- **Données** : un système allégé par un preset reçoit un NOMBRE, jamais un preset · zéro n'est pas une absence · ce qu'un preset retire ou ajoute se déclare en données, sans repli · un réglage d'appareil absent est une valeur (aucune migration) · une ligne de lore interroge un état du monde, jamais un état de lore · un point de résolution unique par concept (dérivée, capacité, synergie, tir, interactif : `scene.puzzle(id)`).
- **Inventaire** : la pile appartient au conteneur, les slots sont une conséquence du contenu · un slot d'équipement se revalide à chaque frame, avant toute UI · un coffre = un type + une pose + un contenu.
- **UI et input** : une vue partagée s'efface avant de se remplir · une carte de menu est un `<div>`, jamais un `<button>` · le menu entier est une pile · une variable CSS se lit en pixels CSS (÷ DPR en un seul point) · un pointeur analogique sort de la couche d'input par un accesseur séparé, jamais dans l'état de verbes.
- **Dessin** : redessiner une station, c'est déplacer un mur (inclusion prouvée par test) · une silhouette se juge à la taille du jeu, en scène · on ne régénère pas un dessin validé en jeu · retoucher un visuel partagé avec un hors-périmètre, c'est lui en donner un propre · un motif de tuile se lit comme un papier peint, sauf continu ou dense · une surface redessinée à chaque frame se pose par motif répété · un calque pré-rendu se refait quand la vue en sort · un décor réduit est le préfixe du décor complet.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet : `docs/carte_mentale_RPG_V2_v1_8_0.md` §0 et §8, et `docs/archives/decisions_archives.md` (15 au 25/09, verbatim, **toutes en vigueur**). Une décision **nouvelle** s'ajoute à la table en fin de section ; une révision le dit (« *révise* … »).

- **Fondations** : 3 éléments, extensibles en données · 4 stats primaires (Force, Agilité, Vitalité, Esprit) ; tout le scaling de dégâts part de la Force, l'élément porte le type, jamais la puissance · 5 slots d'action, 3 d'équipement, en données · progression sur deux axes (XP → stats ; jalons narratifs → capacités) · un seul système de recettes · layouts écrits à la main + décor procédural à graine fixe · narration diffuse, aucun journal de quêtes ni objectif affiché · périmètre M1 fermé (Grotte → Région Maison → 1ère zone → Château → Boss 1 → Poste avancé) ; console, cartouches, Codex = M2+.
- **Stats et combat** : toute stat primaire a au moins une dérivée, un système lit la dérivée (`D-141`) · **Esprit amplifie les compétences** : Force × puissance d'Esprit × multiplicateur, en un seul point, et une hâte avec plancher ; sans Force, rien · un niveau se crédite depuis le niveau de la sauvegarde, jamais repris ; chaque niveau a son flag (`D-205`) · une compétence se vise (curseur, stick droit, doigt) ; `competences.js#pointVise` est LE point de résolution, la visée ne dépend pas du regard.
- **Alignement et follet** : l'alignement est une stat **cachée**, en M1, bornée `[−5 ; +5]`, jamais affichée ni modifiable ; ses effets passent **par le follet seul** (orbite inversée, synergie qui change de camp) ; **il reste un secret** : aucune réplique ne fait sentir un palier (`Q-102`) · Esprit reste la réserve des compétences · dialogues à conséquences, le follet est un LLM scripté ; une option par défaut peut avoir des conséquences (`Q-111`, *révise* `specs/11` §0).
- **Carte et boucle** : pas de nouvelle carte, la Maison s'agrandit par annexes et tunnels (Annexe 1 → Annexe 2 → nouvelle zone ; Château et Boss 1 après) · respec et re-choix du follet illimités et gratuits depuis le menu · boucle de 5 minutes (sortir → récupérer → combattre → revenir → stocker → cuisiner → équiper) · l'état d'une descente = des flags ordinaires qu'on retire (`flags.js#retirer`) · éclats et coût des crafts : on n'y touche pas · pas de pierre fabriquée à partir de cailloux.
- **Objets** : ce que le joueur pose au sol n'est pas du semis (`D-145`) · un objet porté (la besace) est un flag, ce qu'il donne se déclare sur ce qu'il change · un soin est un buff sur les PV, son icône est celle d'une stat, teintée.
- **Monde et rendu** : une tuile-objet se pose sur son sol (`render.sol`) · une case choisit son dessin par sa position (`varianteTuile`) · une ombre de zone s'ajoute au voile par le maximum · une lumière de scène peut attendre un flag · une pièce qui bouge avec un interactif est une pièce du visuel (`bascule.js`), état d'affichage · le calque statique défile, son rayon d'influence se déduit des dessins · une surface déborde sur ses voisines par `render.lisiere`, dessinée dans la case qui la reçoit · un surlignage se dessine après le voile · **aucun effet ne bat au-delà de 3 Hz**, et la graine d'un effet dit qui est l'objet, jamais où il est · le héros regarde en huit directions par une pièce de son visuel, état d'affichage jamais sauvegardé.
- **UI et indices** : l'icône d'une carte de menu peut suivre l'état (`icones_si`) · l'écran Craft se trie par type, coût total, nom · la carte Indices partage la case contextuelle ; un indice illisible s'écrit en hiéroglyphes · la stèle, sa vue rapprochée et sa gravure brouillée par le même point que le menu · une cible tactile qui bouge avec le monde est un cercle annoncé à chaque frame.
- **Produit** : plus d'éléments à terme · **licence : source visible, tous droits réservés** (`LICENSE`) · aucune sollicitation de dons · pas de sauvegarde cloud sans multijoueur · un journal d'indices et de traces (dernier bouton du menu).

| Décision | Date | Détail |
|---|---|---|
| **Versions** : `v0.x.0` = un gros patch (une release GitHub) ; `v0.x.y` = y commits depuis `v0.x.0`, merges compris (le nombre de `git describe --tags`, `git rev-list --count v0.x.0..HEAD`), tagué à chaque push sur `main`, `package.json` au même numéro. On reste en `v0` tant que Xav n'a pas validé la boucle de 2 heures | 25/09 | Xav : « v0.x pour les gros patch et v0.x.y pour TOUS les commit de la version x. exemple: v0.8.249 » |

## Ce qui est dû : dettes, questions, validations

- **Tout vit dans `docs/DOC_suivi-dettes.md`**, et nulle part ailleurs. Ne lire que les lignes que le ticket cite (chercher `| D-17 |`) ; **jamais le fichier en entier**.
- **Les réponses de Xav** arrivent par `npm run dettes` (`tools/dettes/`, port 8090), qui écrit dans le suivi sans commiter et régénère `A_FAIRE.md` (**générée : ne jamais l'éditer**). Elles se traitent au ménage : skill `menage`.
- **Toute édition d'une ligne s'ancre sur son identifiant** (`| Q-44 |`), jamais un remplacement global. Une ligne a exactement les colonnes de l'en-tête de sa section, sinon l'outil refuse d'y écrire.
- **Dans le périmètre du ticket, Claude garde l'initiative** : une valeur par défaut marquée `[OUVERT]`, une ligne `Q-`, signalée en tête du rapport. Il s'arrête plutôt que de choisir quand le choix serait coûteux à défaire : format de sauvegarde, contrat entre modules, décision verrouillée.
- **Hors du périmètre, Claude propose** (ligne `D-` ou `Q-`, mentionnée au rapport), il ne corrige pas en passant. Ses propositions sont attendues : le jeu se conçoit à deux.
- **Clôture** : Claude clôt les `D-` et `DOC-` qu'il a livrées (date + verdict). **Jamais une `Q-`, `V-` ou `E-`** : Xav seul tranche, valide en jeu et écrit.

## Commandes

- Tests : `npm test` (= `node tools/run_tests.js`, toute la suite) ou `node tests/<nom>.js`. Scripts headless sur `node:assert/strict`, sans framework. Sous PowerShell, `npm` peut être bloqué : `npm.cmd`.
- Syntaxe : `node --check <fichier>.js` sur chaque fichier livré.
- Serveur local : `node serveur_local.js` → `http://localhost:8080` (statique, `no-store`).
- Dettes de Xav : `npm run dettes` (port 8090, boucle locale).
- Paramètres de debug : `?debug=fps`, `?echelle=N`, `?flags=a,b`, `?alignement=N`, `?cheat=phenom`.

## Architecture en bref

Carte complète, module par module : **`docs/ARCHITECTURE.md`**.

- `index.html` (mise en page seulement) · `src/main.js` (`demarrerJeu` = boot DOM ; `creerOrchestrateurGrotte` = tout le reste, testable sans DOM) · `src/registry.js` + `src/schemas.js` (catalogues validés au boot) · `src/save.js` (double tampon, versions et migrations) · `src/input/` (périphériques → verbes) · `src/scene.js` (monde, collisions) · `src/render.js` (canvas) · `src/ui/` (menus DOM, HUD et bulles canvas) · `data/` (catalogues JSON) · `locales/` · `tests/` (un fichier par contrat) · `tools/` (outils de dev, jamais chargés par le jeu).
- `registry.js` et `save.js` restent purs (aucun accès disque, réseau ou DOM) : des adaptateurs leur fournissent les données.
- **Convention d'`id`** : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot, avec le chemin exact de l'erreur.
- `prive/` est ignoré par Git (sauvegardes réelles de Xav, pour les migrations).

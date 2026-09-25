---
projet: RPG V2
episode/session: Carte Maison — l'Annexe 1 (la stèle, Zéros, les leviers, le Gardien, la première compétence)
type: spec par paliers
version: 1.3.6
statut: courante — paliers A et B livrés le 24/09 et validés (V-149, V-150) ; palier C livré le 25/09 et validé (V-151) ; palier D livré le 25/09 et validé (V-152) ; palier E livré le 25/09, à valider (V-153) ; B1, B2, B3, Q-138 et l'équilibrage tranchés par Xav le 24/09 (§0)
catégorie: Spec
date: 2026-09-24
Ids_suivi: [Q-120, Q-13, "D-205 (A), D-207 (B), D-209 (C), D-210 (D), D-211 (E), D- (à créer : un par palier)", "Q-137 à Q-148 (inscrites au suivi le 24/09)", Q-152, Q-153, Q-154, Q-155, Q-18, "V-149 (A), V-150 (B), V-151 (C), V-152 (D), V-153 (E), V- (à créer : un par palier)"]
genere_par: claude
verifie_par: xav
---

# RPG V2 — 14 : L'Annexe 1

**Méthode.** Branche dédiée `annexe-1`. **Un palier par session**, un commit par palier, chacun retirable seul, validation de Xav entre deux. Aucun `push`. Le suivi fait foi : un identifiant « à créer » déjà pris → prendre le suivant et le dire.
**Préalables** : `specs/13_lisieres-performance-carte.md` est **livrée**, et sa règle du budget (palier F) s'applique : **chaque palier de cette spec passe `cout_calque` et `traversee_nuit`** et compare ses chiffres à ceux de clôture de la spec 13. Une régression de plus de 20 % arrête le palier.
**Source** : le scénario dicté par Xav le 24/09, repris fidèlement au §3. Ce que Claude a ajouté pour que ce scénario se code est marqué **[OUVERT]**, avec une valeur retenue par défaut ; ces points sont listés au §10.

## 0. Décisions de Xav (24/09, relecture de la v1.0.0)

**Changelog 1.3.6** (palier E livré, `D-211`) : le levier tenu déclare `maintien: { portee_px, extinction_ms }` (44 px et 0,6 s, *provisoires*) ; la paire est un interactif de type `simultane` (`tous_allumes`, `flag_pose`) et **porte l'explication** du follet (`explication: { apres_extinctions, dialogue, flag }` ; le flag, `flag_follet_pose_appris`, doit être persistant, vérifié au démarrage). Un nœud de dialogue peut **nommer un bouton** : `glyphe: <verbe>`, et son texte reçoit `{glyphe}` au périphérique actif ; le verbe `target_next` gagne son glyphe (RB, Tab, « touche-moi »). RB est **contextuel** dans cet ordre : rappeler un follet posé, le poser sur un levier tenu allumé à portée, sinon la cible suivante. Relevé : `Q-160` (au doigt, un follet posé hors de l'écran ne se touche pas).

**Changelog 1.3.5** (palier D livré, `D-210`) : la **rencontre** se déclare sur la scène (`rencontre: { declencheur, flag_rencontre, flags_fin, monstres, cible, seuil_fin, sans_defaite, fondu_ms, dialogue_debut, dialogue_releve, dialogue }`, `src/rencontre.js`). Le levier de la salle 1 lève son propre flag de descente (`flag_annexe_levier_1`) : la première fois, la rencontre démarre et sa fin ouvre le passage ; ensuite, elle se **raccourcit** et l'ouvre tout de suite (`Q-142`). La cible reçoit un **plancher** de PV au seuil : elle ne meurt jamais. Le follet de Zéros : comportement **`orbite`** (`orbite: { autour, rayon_px, vitesse_rad_s }`). Deux champs d'ennemi facultatifs : `render.miroir`, `distance_contact_px` (Zéros s'arrête au contact, sinon il disparaît sous le héros). Un **locuteur** de dialogue peut être une entrée d'ennemi. Zéros a **son propre visuel** (la silhouette du héros recolorée), plutôt qu'une teinte sur celui du héros, dont seul le cœur est teintable. Relevés : `Q-157` (Zéros parle aussi en arrivant), `Q-158` (la rencontre ne rapporte rien).
**Changelog 1.3.4** (palier C livré, `D-209`) : `attaque_distance` gagne trois champs, tous *provisoires* : `recul_tuiles` (la distance sous laquelle le tireur recule, 2), `rayon_px` (le disque du crachat, 3) et `course_tuiles` (jusqu'où il vole, 7). Les **leviers** de la descente reprennent leur état de départ avec ses flags (§4.2 les comptait déjà dans l'état de la descente ; leur état vit dans `save.puzzles`, pas dans un flag). Un interactif **solide** ne peut pas déclarer `visible_si` (sa collision est posée à l'entrée en scène). **À ce palier, le levier de la salle 1 ouvre directement le passage** : c'est le comportement des descentes suivantes (`Q-142`), et le palier D intercalera Zéros la première fois. Relevés : `Q-154` (les crachats se dessinent après le voile), `Q-155` (les cracheurs ne donnent aucun éclat).
**Changelog 1.3.3** (palier B livré, `D-207`) : `Q-137` appliquée sous la forme `{ valeur: 'a_portee', egal: '<id>' }` ; le déchiffrement se **déclare** sur l'indice (`dechiffrement: { condition, flag }`) ; `?flags=a,b` (debug) tient des flags pour vrais sans les sauvegarder, ce qui ouvre les portes de la validation. **Correction d'une contradiction du §4.3** : le passage 1 → 2 n'attend pas « `flag_zeros_rencontre` ou le levier » — `flag_zeros_rencontre` est persistant, la porte serait donc ouverte dès l'entrée des descentes suivantes (contre `Q-142` et le §4.2). Il attend le **flag de descente** `flag_annexe_passage_1`, que poseront la fin de la rencontre (palier D) et le levier des descentes suivantes. Chaque salle a un **retour au sud**, toujours ouvert (`Q-152` : sans lui, la salle 2, sans monstre, est un piège dont on ne sort pas) ; il n'existe **aucun fondu** aux portails (`Q-153`) : Descendre sort par le fondu de la vue de la stèle.
**Changelog 1.3.2** : Zéros, précisions de Xav : le yin et le yang, il a découvert les secrets des follets, le « Follet Blanc » à glisser dans son dialogue (`E-05`).
**Changelog 1.3.1** : **Zéros est habillé en blanc** (Xav) ; le nom « Zéros » est retenu ; les défauts de `Q-141`, `Q-142`, `Q-144` et `Q-145` sont acceptés par Xav (« le reste ok »).
**Changelog 1.3.0** : `Q-138` tranchée : la stèle déchiffrée ouvre **d'abord sa vue rapprochée**, qui gagne l'action **Descendre**. **L'équilibrage se fait au ressenti de Xav** (`Q-146`) : l'instrument `tools/mesure_boss.mjs` est retiré, et `?niveau=N` aussi (Xav importe une vraie sauvegarde Nv.30). Le §6 ne contredit plus le §4.9 : **une** migration est prévue, v8 → v9, au palier I. Les identifiants `Q-137` à `Q-148` sont inscrits au suivi.
**Changelog 1.2.0** : l'Annexe court **du sud vers le nord**, et sa sortie débouche près de la **stèle rouge** (`Q-139` tranchée) ; B3 tranché (`Q-148`) : la fiche affiche la correspondance, A choisit l'emplacement, et équiper **remplace**.
**Changelog 1.1.0** : B1 et B2 tranchés ; `Q-143` et `Q-147` tranchées ; le respec, le re-choix du follet et les compétences en cartes entrent dans cette spec (palier I) ; la marche dans l'ombre de la salle 2 est **confirmée comme un choix de design**.

| # | Décision de Xav | Ce que Claude en fait (cohérence technique) |
|---|---|---|
| **B1** | **Un mélange de (a) et (b)** : « quand on met des points dans Esprit, ça donne un **coefficient à la Force** liée aux compétences, en plus de garder les points d'Esprit qui **raccourcissent le temps de charge et de recharge** » (« une dérivée d'une dérivée », dans la tête de Xav ; la cohérence est laissée à Claude). **Révise D1⑧** : Esprit n'est plus « la réserve, rien d'autre » ; il **amplifie** les compétences, mais **ne fait jamais de dégâts seul** : sans Force, une compétence ne fait rien | Deux **dérivées nouvelles** sur Esprit, chacune d'une seule stat comme toutes les autres (le schéma des dérivées ne change pas) : `derivee_puissance_competence` (un **coefficient**, formule `base 1 + coefficient × Esprit`) et `derivee_hate_competence` (un **facteur de durée**, formule `base 1 − coefficient × Esprit`, **plancher** en données). La « dérivée d'une dérivée » est une **composition**, faite à **un seul endroit** (`competences.js#resoudreDegats`) : **dégâts = `derivee_degats_attaque` (Force) × `derivee_puissance_competence` (Esprit) × `multiplicateur` de la compétence** ; **charge et recharge = durée de la compétence × `derivee_hate_competence`**. Toutes les valeurs sont *provisoires* et en données (§4.6). La règle de `D-141` tient : aucun système ne lit une stat brute |
| **B2** | **Oui** : `target_next` contextuel. « Très utile par la suite avec les mécanismes automatisés (**follet agentique**) » | Le « follet posé » est écrit comme **un état du follet** (`poste`, à côté de `suivre` et `engager`), avec **sa cible** dans l'état, et non comme une exception de la salle 2 : un futur mécanisme qui confie une tâche au follet réutilisera cet état |
| **E** | **Confirmé, et voulu** : « faire confiance au follet, se diriger dans le noir (en connaissant le chemin, déjà fait deux fois), sortir de la zone de confort fournie par la lumière » | §4.4 inchangé : la lumière reste avec le follet posé, son rayon ne change pas (`D-35`) |
| **Q-143** | **Oui** : Zéros est **la seconde main** de la pierre qui répond. « On le retrouvera plus tard (poste avancé, etc.) » | Zéros est un **personnage récurrent** : son id, son visuel et son follet sont des entrées de catalogue réutilisables, jamais propres à la salle 1 |
| **Q-147** | **Dans l'Annexe 1.** À la sortie, le follet dit : « tu peux maintenant choisir tes stats, tes compétences et ton follet » (le 4ᵉ follet est hors périmètre). Les compétences s'affichent **en cartes dans la page Stats, sous Force, Agilité…** Une seule pour l'instant, mais toutes s'afficheront là, avec : **équiper 1 = X, équiper 2 = Y, équiper 3 = B** | Palier I (§4.9) |
| **B3** (`Q-148`) | **Précision de Xav** : « équiper 1 = X, 2 = Y, 3 = B » est ce que la fiche **affiche** — les boutons de jeu de chaque emplacement. Pour équiper, on appuie sur **A**, qui propose **les trois emplacements** (le fonctionnement normal du menu, gardé tel quel). Équiper sur un emplacement occupé **remplace** la compétence qui s'y trouvait | B n'est donc jamais une action du menu, et il reste « Fermer ». Les boutons affichés sont les **glyphes du périphérique actif** (`glyphes.json`) : X / Y / B à la manette, 1 / 2 / 3 au clavier, le bouton tactile correspondant au doigt |
| **Q-139** | **Les salles vont du sud vers le nord**, et la sortie se fait **aux alentours de la stèle rouge**, au nord du chemin | L'entrée est la stèle **bleue** (`stele_grotte`, (21, 68), au sud du chemin), la sortie est près de la stèle **rouge** (`stele_miroir`, (21, 46), au nord) : l'Annexe **passe sous le chemin**. La descente ressort du côté de la « pierre qui répond », ce qui sert le lore de Zéros (`Q-143`) |
| **Q-138** | **La vue rapprochée d'abord** : « sinon c'est dommage, on ne la verra plus jamais en grand » | Une fois l'indice déchiffré, INTERACT sur la stèle bleue ouvre toujours sa vue rapprochée (la gravure, désormais en clair). Elle gagne une action **Descendre** (A / INTERACT) ; B ferme, comme avant. §4.1 |
| **Q-146** | **Pas de bot pour l'équilibrage** : « à la louche », au plus cohérent. Xav teste et donne son ressenti (trop dur, trop simple, pourquoi, comment l'améliorer), parce qu'il y met sa vision de ce qui arrive après et n'est pas encore écrit. Il a une **vraie sauvegarde Nv.30** à importer | `tools/mesure_boss.mjs` est **retiré** (§4.5, palier F). `?niveau=N` est **retiré** aussi (§4.8, palier A) : la vraie sauvegarde fait mieux qu'un masque, puisqu'elle porte les points de stats réellement répartis. *[OUVERT : il revient si Xav le demande.]* La sauvegarde Nv.30 va dans `prive/sauvegardes/` : elle sert au palier A (dépasser le Nv.30), au palier F (le Gardien) et au test de la migration v8 → v9 (palier I) |

## 1. Intention

L'Annexe 1 est le **premier lieu de la boucle d'une heure** (carte mentale §2) : une descente sous la stèle bleue, trois salles qui ressemblent à la Grotte, et trois choses que le jeu n'a jamais eues : **un ennemi qui tire à distance**, **un combat mis en scène** qui raconte au lieu de punir, et **la première compétence**. Une fois vaincue, l'Annexe devient une **source régulière d'éclats** (un éclat par descente), qu'on refait « à l'infini ».

Elle comble aussi le trou laissé au Nv.15 : l'indice « Retourne voir l'entrée de la grotte » **mène enfin quelque part** (`Q-120`).

## 2. Ce qui existe déjà (ne pas refaire)

| Brique | Où | Ce que l'Annexe en fait |
|---|---|---|
| La **stèle bleue** au sud du chemin, près de la sortie de la Grotte | `puzzles.json#stele_grotte`, (21, 68), `#3fb8ff`, indice `indice_grotte_entree` | L'entrée de l'Annexe |
| L'**indice** lisible au Nv.15, brouillé en hiéroglyphes avant | `indices.json`, `indices.js#lignesBrouillees` | Il ne devient lisible **qu'au pied de la stèle** (§4.1) |
| La **vue rapprochée** d'une stèle (jeu gelé, particules) | `stele.js`, `ui/ecran_stele.js` | Patron réutilisé par la cinématique du parchemin |
| Les **leviers** et les **portes conditionnelles** | `puzzles.js#activerLevier`, `scenes.json#portes` | Leviers qui apparaissent, levier à maintenir, porte de sortie |
| Les **dialogues** à nœuds et à options, et les ambiances par condition | `dialogue.js`, `ambiances.json` | Le follet qui guide, Zéros qui parle |
| Le **follet** : suivre / engager, `target_next`, aura, orbite | `companion.js` | Il charge la compétence, il tient un levier |
| La **mort** : réapparition dans la Grotte, malus de survie | `main.js#respawnDansLaGrotte` | Inchangée, sauf dans le combat contre Zéros (§4.3) |
| Un **emplacement de compétence** déjà déclaré, caché | `action_slots.json#slot_skill_1`, `visible_si: flag_competence_1` | La compétence du parchemin s'y range |
| Les **cooldowns** en temps actif | `cooldowns.js` | Le temps de recharge de la compétence |

Ce qui **n'existe pas** : un projectile, un monstre qui tire, une entité intouchable, un combat sans défaite, un catalogue de compétences (`data/skills.json` est vide et n'a **pas de schéma**), une salle qui sait qu'elle est « nettoyée », un interactif qui apparaît, un levier « à maintenir », des niveaux au-delà du Nv.30.

## 3. Le scénario (Xav, 24/09)

1. **Nv.15, au pied de la stèle bleue** : le follet suggère d'ouvrir le carnet. Ouvert **à portée de la stèle**, l'indice se **déchiffre sous les yeux du joueur** (petite animation : les hiéroglyphes deviennent des lettres).
2. L'animation finie, **la stèle devient l'entrée** : INTERACT fait descendre dans un sous-sol qui ressemble à la Grotte.
3. **Salle 1** : des monstres attendent déjà. C'est une **nouvelle famille** qui ressemble à ce que le joueur connaît, avec **une seule différence** : une **attaque à distance** de base, à cadence faible et aux dégâts modérés. Une fois les monstres vaincus, **un levier apparaît au milieu de la salle**. Le joueur l'actionne, et **le mini-boss apparaît**.
4. **Le mini-boss, Zéros**, jumeau miroir du héros, en plus sombre, plus maléfique et plus puissant (l'idée du rival de Pokémon). Son follet est **d'un noir brillant translucide**, avec une grande aura et une grande orbite. **C'est une mise en scène, sans gagnant ni perdant** : le héros ne peut blesser **que le follet de Zéros**. Chaque fois que le héros tombe à 0 PV, **son follet le relève** (« Continue de te battre ! », PV à 100 %). Quand le follet de Zéros tombe à **25 %**, le combat s'arrête : **Zéros parle** et révèle des secrets sur les follets. Puis **un passage s'ouvre** vers la salle 2.
5. **Salle 2** : deux leviers, un à gauche et un à droite, **éloignés**. Quand le joueur allume l'un et va vers l'autre, **le premier s'éteint**. Après ses essais, **le follet intervient** : si on active un levier et qu'on appuie sur **RB** (Tab, ou un toucher), le follet reste sur ce levier et le maintient. Le joueur pose son follet, active le second levier, et **le passage vers la salle 3 s'ouvre**.
6. **Salle 3, le vrai boss**, équilibré pour être battu **vers le Nv.30**, donc pas au premier passage au Nv.16. Attaque au corps à corps, attaque à distance, mouvements aléatoires, **parfois agressif, parfois il garde ses distances** (il « kite »). **Mourir ramène à la Grotte, comme d'habitude**, et il faut tout refaire : salle 1 (les petits monstres seulement), salle 2 (le mécanisme), puis retenter le boss.
7. **Boss vaincu** : un **coffre apparaît**. Dedans, un **parchemin aux lettres d'or** (cinématique à l'ouverture). Il débloque **la première compétence** : neutre, sans effet élémentaire, **une attaque à distance** en zone (AoE), **chargée par le follet** (4 s d'engagement sur un monstre), avec **8 s de temps de recharge**, et relativement puissante. Pas de synergie pour l'instant.
8. **Un levier est apparu contre le mur** : l'actionner fait **tomber un éclat** et **ouvre la porte**. Le joueur peut revenir **à l'infini** : salle 1, salle 2 avec le follet, levier de la salle 3, **un éclat à chaque fois**.
9. **Les niveaux vont jusqu'au Nv.50** (Xav en a besoin pour ses tests).

## 4. Règles

### 4.1 La stèle s'éveille

- **Proximité** : la condition « le héros est à portée d'interaction de `stele_grotte` » devient **évaluable par le registre de conditions**, comme `niveau` : une valeur nommée nouvelle, `a_portee` (l'id de l'interactif à portée, ou rien), fournie par `main.js` à `flags.js`. La forme exacte est **au choix de l'implémentation**, sous une seule contrainte : **une condition, pas un déclencheur en dur**. *[OUVERT `Q-137`]*
- **Le follet suggère** : une ambiance (`ambiances.json`), condition `niveau ≥ 15` **et** `a_portee = stele_grotte` **et** pas encore déchiffré. Texte proposé (Xav écrit) : « Elle te regarde, cette pierre. Et si tu ouvrais ton carnet, ici ? ». Elle joue **une fois**.
- **Le déchiffrement** : `indice_grotte_entree` voit son `lisible_si` passer de `niveau ≥ 15` à **`flag_indice_grotte_dechiffre`**. Le flag est posé quand le **carnet (Indices) est ouvert** alors que la condition de proximité tient et que le niveau est ≥ 15. **Changement assumé** : au Nv.15, l'indice ne se lit **plus** partout, seulement après avoir été déchiffré au pied de la pierre. C'est ce que demande le scénario.
- **L'animation** : dans l'écran Indices, à la **première** lecture seulement, les signes se changent en lettres, **un signe à la fois, dans l'ordre de lecture**. Le brouillage est déterministe (`indices.js`), donc l'animation n'est qu'un **mélange mot à mot** entre `lignesBrouillees` et le texte clair, piloté par un temps. La part pure est testée, et la durée *provisoire* est de **2,5 s**. Pendant l'animation, B ne ferme pas l'écran : il **l'accélère** jusqu'à la fin. Sinon, fermer l'écran marquerait l'indice comme lu sans que le joueur l'ait vu.
- **La gravure de la stèle suit** : elle est déjà l'indice brouillé « par le même point que le menu ». Une fois le flag posé, elle montre donc le texte clair.
- **L'entrée** (`Q-138`, tranchée) : une fois déchiffrée, INTERACT sur la stèle ouvre **toujours sa vue rapprochée**, gravure en clair, et celle-ci gagne une action **Descendre** (A / INTERACT, dite par le glyphe du périphérique actif ; au doigt, un toucher sur la gravure). Descendre ferme la vue et lance un **fondu** (le même que les portails) vers la salle 1. B ferme sans descendre, comme avant. L'action n'existe que si la stèle **déclare** une destination en données (`descente: { scene, flag_requis }` sur l'interactif, nom retenu par défaut), jamais par un `if` sur l'id de la stèle : la stèle rouge et celle d'argile gardent leur vue rapprochée actuelle, sans action.

### 4.2 La descente, et ce qui se remet à zéro

Une **descente** commence à chaque entrée par la stèle. L'Annexe distingue deux sortes d'état.

| Persistant (sauvegardé, pour toujours) | De la descente (remis à zéro à chaque entrée par la stèle) |
|---|---|
| `flag_indice_grotte_dechiffre`, `flag_zeros_rencontre`, `flag_gardien_vaincu`, `flag_parchemin_lu` (= `flag_competence_1`) | salle 1 nettoyée, levier de la salle 1 actionné, leviers de la salle 2, passage 2→3 ouvert, levier-récompense de la salle 3 actionné, porte de sortie ouverte |

- L'état de la descente est fait de **flags ordinaires**, sauvegardés : quitter le jeu dans la salle 2 et revenir laisse la salle 2 dans l'état où on l'a laissée. La scène déclare la liste de ses flags de descente (`descente: { flags: [...] }`), et **l'entrée par la stèle les remet à zéro**, en un seul endroit. Aucun id de flag n'est écrit dans le code.
- **Mourir** dans l'Annexe renvoie à la Grotte, comme partout. La descente suivante repart de zéro, et c'est exactement le « il faut tout refaire » du scénario.
- **Sortir** : la salle 1 garde un **escalier de retour** vers la stèle bleue, toujours ouvert. La porte de la salle 3 (§4.7) est l'autre sortie : elle débouche **dehors, près de la stèle rouge** (`stele_miroir`), au nord du chemin (**`Q-139`, tranchée**). Le point d'arrivée est une case libre **à côté** de la stèle, jamais dessus (elle est solide), et **hors de la clairière** qui la cache (elle doit rester invisible depuis le chemin, `V-123`) : choisi au palier B, tenu par test.

### 4.3 Salle 1 — les tireurs, puis Zéros

**La nouvelle famille** : les **rampants cracheurs** (nom de travail, *[OUVERT `Q-140`]*). Même silhouette de famille que le rampant de la Grotte, avec une autre teinte et un organe de tir visible, pour que le joueur reconnaisse tout de suite **la seule différence**.
- `enemies.json` gagne une **attaque à distance** déclarative : `attaque_distance: { portee_tuiles, recul_tuiles, cadence_ms, vitesse_px_s, rayon_px, course_tuiles, visuel }` (v1.3.4 : les trois champs du milieu). Les dégâts suivent la même `force` que le corps à corps. Valeurs *provisoires* : portée 5 tuiles, cadence **2 400 ms** (« faible »), 110 px/s, dégâts « modérés », soit ceux d'un rodeur.
- **Le projectile** est un système nouveau, `src/projectiles.js`, **pur**. Une réserve à capacité fixe (patron de `poussiere.js`), un mouvement en ligne droite, qui **s'arrête sur un mur** (`estSolideAuPoint`) et **touche le héros** (disque contre disque). Le héros peut donc **l'esquiver**. Ce même module sert au Gardien et à la compétence du joueur : un seul chemin de collision.
- **Comportement** : un tireur garde une **distance préférée** (il recule si le héros approche à moins de 2 tuiles, et tire s'il est à portée). Cet état s'ajoute à la machine de `comportement_monstres.js`, **déclaré en données** (`comportement: "distance"`), sans toucher les états du corps à corps.
- **Placement** : quatre cracheurs (*provisoire*), posés par les `spawns` de la scène, avec la condition « salle 1 pas encore nettoyée ».
- **Salle nettoyée** : quand le dernier monstre des spawns de la scène meurt, la scène pose **son** flag (`nettoyage: { flag }` en données). C'est une règle générique : une Annexe 2 s'en servira sans code.
- **Le levier qui apparaît** : un interactif peut déclarer `visible_si` (même format que partout). Tant que la condition ne tient pas, il **n'existe pas** : pas de dessin, pas d'interaction, pas de collision.

**Zéros** (mini-boss 1, **une seule fois**, condition `not flag_zeros_rencontre`) : le levier de la salle 1 le fait apparaître.
- **Zéros** (le nom est retenu, Xav, 24/09) : le **jumeau, le double, le miroir de Héros**, **habillé en blanc** (Xav, 24/09). C'est la silhouette du héros, **en miroir**, avec une teinte blanche fixe déclarée sur son entrée, jamais celle du follet : le héros prend la couleur de son follet (`heroTeinte`), Zéros ne la prend pas. Le « plus sombre, plus maléfique » du scénario ne passe donc pas par ses habits : il passe par son follet noir, son aura, sa force et sa façon de parler. Le blanc contre le noir de son follet est le contraste de la scène. Il est **intouchable** (`intouchable: true` sur l'entrée d'ennemi) : l'auto-attaque et le follet l'ignorent. Il frappe **fort**, au corps à corps.
- **Le follet de Zéros** : une entité **à part**, `enemy_follet_zeros`. C'est la **seule cible** du combat. Il est noir, brillant et translucide (un visuel nouveau, avec un halo sombre), et il **orbite autour de Zéros** avec un grand rayon et une grande aura (une orbite de follet réutilisée, `companion.js`, avec des paramètres en données). Il ne frappe pas lui-même. *[OUVERT `Q-141`]*
- **Pas de défaite** : pendant ce combat, `hero.pv ≤ 0` **n'appelle pas** la mort. Le follet du héros le relève : dialogue court « Continue de te battre ! » (il **gèle** le combat, comme tout dialogue), et PV à 100 %. Aucun malus de survie, aucun retour à la Grotte. La règle vit sur la **rencontre** (`sans_defaite: true` dans les données du combat), jamais dans un `if` sur un id.
- **Fin** : à **25 %** des PV du follet de Zéros (seuil en données), tout se fige, et **Zéros parle** (un dialogue de `dialogues.json`, avec options s'il le faut, par le moteur de la spec 11). Puis **Zéros et son follet s'effacent** (un fondu), `flag_zeros_rencontre` est posé, et **le passage vers la salle 2 s'ouvre**. Ce passage est une porte conditionnelle sur le **flag de descente** `flag_annexe_passage_1` (palier B), que la fin de la rencontre pose, et le levier aux descentes suivantes (v1.3.3 : attendre `flag_zeros_rencontre`, persistant, l'aurait ouverte dès l'entrée des descentes suivantes).
- **Les descentes suivantes** : la salle 1 est nettoyée, le levier apparaît, et l'actionner **ouvre directement le passage**. *[OUVERT `Q-142`]*
- **Ce que dit Zéros** : les secrets sur les follets, **écrits par Xav** (`E-05`). Précisions de Xav (24/09) : Zéros et Héros sont **le yin et le yang** ; Zéros **a découvert les secrets des follets** ; le dialogue doit **glisser le « Follet Blanc »**, sans que Xav sache encore comment. Tant que le texte n'est pas écrit, le palier D pose un texte provisoire qui ne nomme pas le Follet Blanc (on ne fige pas un lore que Xav n'a pas trouvé). Piste de Claude, à prendre ou à laisser : la stèle d'argile dit déjà « Ce monde a eu deux mains. La seconde a laissé un mot là où l'on commence à lire. » **Zéros serait-il la seconde main ?** *[`Q-143`]*

### 4.4 Salle 2 — les deux leviers et le follet posé

- **Levier à maintenir** : un type d'interactif nouveau, `levier_maintenu`. Il est **allumé tant qu'un mainteneur est à portée** (le héros, ou le follet posé) ; sinon il s'éteint après **0,6 s** (*provisoire* : le temps de voir qu'il s'éteint). Les deux leviers sont à **~22 tuiles** l'un de l'autre (*provisoire*) : le héros ne peut pas tenir les deux.
- **Quand les deux sont allumés en même temps**, un flag de descente est posé (`sequence`-like en données : `tous_allumes: [ids], flag_pose`). Le passage vers la salle 3 s'ouvre et **reste ouvert**, même si les leviers s'éteignent ensuite.
- **Le follet posé** (**B2**, tranché : un état `poste` du follet dans `companion.js`, qui porte sa cible) : à portée d'un `levier_maintenu` **allumé**, `target_next` pose le follet dessus. Il y reste, n'engage aucun monstre et ne suit plus le héros. Un second `target_next`, n'importe où, le **rappelle**. Changer de salle le rappelle aussi. L'état « posé » est **de session**, jamais sauvegardé.
- **Conséquence à voir** : la lumière du follet reste **avec le follet** (elle lui est collée). Laisser son follet sur un levier, c'est donc **marcher dans l'ombre** vers l'autre. Rien ne change au rayon de la lumière : **`D-35` ne se reprend pas**. C'est la conséquence naturelle du geste, et elle sert la scène.
- **Le follet explique** : après **deux** extinctions (*provisoire*), c'est-à-dire quand le joueur a vu le problème, un dialogue du follet présente le geste. Le texte (Xav écrit) nomme le bon bouton selon le **périphérique actif**, avec les glyphes existants (`glyphes.json`) : RB, Tab, ou « touche-moi ».
- **Les descentes suivantes** : même mécanisme, sans le dialogue (flag persistant `flag_follet_pose_appris`).

### 4.5 Salle 3 — le Gardien

- **Nom de travail** : le Gardien (*[OUVERT `Q-140`]*). Un ennemi du catalogue, avec `boss: true` : une grande barre de PV en haut de l'écran plutôt qu'au-dessus de lui (`ui/barre.js` sait déjà dessiner une jauge).
- **Trois gestes, en données** : corps à corps, tir (projectiles, §4.3), et un **mode de déplacement tiré au sort** toutes les 3 à 6 s parmi `agressif` (il fonce), `kite` (il garde 4 tuiles et tire) et `errance` (il se replace). Les poids sont en données (*provisoire* : 40 / 40 / 20).
- **Équilibrage « battable vers le Nv.30 »** (`Q-146`, tranchée) : **au ressenti de Xav**, manette en main, sans instrument ni bot. Claude pose des valeurs **« à la louche », au plus cohérent** avec le catalogue existant (PV, force et vitesse des monstres de la surface, dérivées du héros au Nv.16 et au Nv.30), et écrit dans son rapport **le raisonnement** qui les a données, pour que Xav sache quel nombre bouger. Intention à viser : au Nv.16, on perd ; avec la sauvegarde Nv.30 de Xav, on gagne, difficilement. Toutes les valeurs sont *provisoires* et en données : Xav dit trop dur ou trop simple, pourquoi et comment, et on règle.
- **Mort** : règle habituelle (§4.2).
- **Une seule fois** : `flag_gardien_vaincu`. Aux descentes suivantes, la salle 3 est vide de boss, et le coffre reste ouvert (vide).

### 4.6 Le coffre, le parchemin, la première compétence

- **Le coffre** apparaît à la mort du Gardien (interactif `visible_si: flag_gardien_vaincu`). Il ne contient qu'une chose : l'ouvrir lance la **cinématique du parchemin**.
- **La cinématique** : une vue rapprochée (patron de `ui/ecran_stele.js` : jeu gelé, fondu, particules), avec un parchemin et des **lettres d'or qui s'écrivent**. Elle nomme la compétence et le bouton (glyphe du périphérique actif), et se ferme sur B. Elle pose `flag_competence_1`, **et l'emplacement `slot_skill_1` apparaît** (il existe déjà, caché par ce flag).
- **Le catalogue des compétences** : `data/skills.json` reçoit **son schéma** (il n'en a pas) et une première entrée, `skill_onde` (nom de travail, *[OUVERT `Q-140`]*) :

```json
{
  "id": "skill_onde",
  "label_key": "skill.onde",
  "element": null,
  "emplacement": "slot_skill_1",
  "charge": { "source": "engagement_follet", "duree_ms": 4000 },
  "cooldown_ms": 8000,
  "effet": { "type": "zone", "rayon_px": 40, "multiplicateur": 2.5 },
  "projectile": { "vitesse_px_s": 220, "visuel": "visuel_onde" }
}
```

- **La charge** : elle monte tant que le follet est en état `engager` (sur n'importe quel monstre), jusqu'à **4 s × hâte**. Elle **ne se perd pas** hors combat. *[OUVERT `Q-144`]*. Pleine, la compétence est **prête**. La lancer vide la charge et démarre le temps de recharge, et **les deux** doivent être remplis pour relancer.
- **La cible** : le monstre que le follet engage. Sans cible, c'est le plus proche à portée. Sans aucun monstre, l'appui est **refusé** (il se dit : un petit son et le texte flottant existant), et la charge est gardée.
- **Les dégâts** (**B1**, tranché) : **`derivee_degats_attaque` × `derivee_puissance_competence` × `multiplicateur`** (la compétence déclare son `multiplicateur`, *provisoire* **2,5** : « relativement puissante »), résolus dans `competences.js#resoudreDegats` et nulle part ailleurs. Formules *provisoires* : puissance = `1 + 0,05 × Esprit` (Esprit de base 5 : ×1,25 ; Esprit 25 : ×2,25) ; hâte = `1 − 0,015 × Esprit`, **plancher 0,5** (Esprit 25 : charge 2,5 s, recharge 5 s). Ils touchent **tous les monstres** dans le rayon. Neutre, **aucune synergie** : la table des régimes de synergie ne la voit pas.
- **HUD** : l'emplacement montre l'**anneau de charge** qui se remplit, puis l'**anneau de recharge** qui se vide. Même vocabulaire que les buffs au bandeau, en forme et pas seulement en couleur (P4②). Ticket qui touche `ui/hud.js` : il se clôt par la `CHECKLIST_visuelle`.

### 4.7 La récompense qui revient

- **Le levier-récompense** : il apparaît contre le mur une fois le Gardien vaincu, et **à chaque descente** ensuite. L'actionner fait **tomber un éclat au sol** (un objet au sol ramassable, pas un ajout direct : on **voit** la récompense), puis ouvre **la porte de sortie**. Une fois par descente (flag de descente).
- **Économie** : 1 éclat par descente, plus ceux des cracheurs de la salle 1. **On ne touche pas au coût des crafts** (`Q-69`). Le rendement se juge en jeu. *[OUVERT `Q-145` : faut-il un temps minimal entre deux descentes ?]*

### 4.8 Les niveaux jusqu'au Nv.50

`levels.json` s'étend du Nv.31 au Nv.50, en prolongeant la courbe : l'écart entre deux niveaux croît de **5 XP par niveau**, comme aujourd'hui (Nv.30 → 31 : +155, soit **2 495**… jusqu’au Nv.50 : **6 390**, *provisoire*). **+1 point de stat** par niveau. Les vingt flags `flag_niveau_31` à `flag_niveau_50` (avec leurs clés FR/EN) sont ajoutés, et un test vérifie que **chaque niveau du catalogue a son flag**, pour que cet oubli ne puisse plus arriver. Pour les tests de Xav : **sa vraie sauvegarde Nv.30**, importée (`prive/sauvegardes/`), qui continue de progresser. Pas de paramètre `?niveau=N` (`Q-146` : retiré, il revient si Xav le demande).

### 4.9 Le respec, les compétences en cartes, le re-choix du follet

- **Le déblocage** : à la **première sortie** de l'Annexe après le Gardien (`flag_parchemin_lu` posé), le follet dit (Xav écrit ; proposition) : « Maintenant, tu peux choisir. Tes forces, tes gestes… et même moi. » Le flag persistant `flag_choix_debloque` est posé. Illimité et gratuit, depuis le menu (décision du 23/09, NS §1.9).
- **Les stats** : dans la page Stats, une action **« Tout reprendre »** (avec la confirmation d'un danger, patron de `menu_cartes.js`) remet les quatre stats à leur base et rend **tous** les points gagnés (`niveau − 1`). Les PV sont réconciliés par `entities.js#reconcilierPvMax`, déjà écrit pour ça.
- **Les compétences, en cartes dans la page Stats**, **sous les quatre stats** : une tuile par compétence **apprise** (une entrée de `skills.json` dont le flag tient). Les compétences non apprises sont **invisibles** (`D-62`). La fiche dit ce que fait la compétence, sa charge et sa recharge **calculées avec l'Esprit actuel** (c'est là que le joueur **voit** ce que ses points d'Esprit lui rapportent), et l'emplacement où elle est équipée.
- **Équiper** (**B3**, tranché) : la fiche **affiche** la correspondance des emplacements avec leurs boutons de jeu (« Emplacement 1 = X, 2 = Y, 3 = B », en glyphes du périphérique actif), et celui où la compétence est équipée. **A** (l'action principale de la fiche) ouvre le **choix parmi les trois emplacements**, par le fonctionnement normal du menu, sans rien d'inventé. Choisir un emplacement occupé **remplace** la compétence qui s'y trouvait (elle devient non équipée, jamais échangée). B reste « Fermer », partout.
- **Le contrat de sauvegarde** : ce que le joueur équipe devient un champ `save.hero.competences` (`{ id d'emplacement: id de compétence }`). C'est un **champ de sauvegarde nouveau** : migration **v8 → v9**, qui écrit la compétence du parchemin sur `slot_skill_1` si `flag_competence_1` est posé, `{}` sinon, avec son test sur les **sauvegardes réelles** de `prive/sauvegardes/` (patron de la migration 7 → 8). *Validé par la relecture de cette spec par Xav ; si le palier découvre autre chose, il s'arrête.*
- **Le follet** : une carte **Follet** dans le menu Héros, à côté de Poche et Stats (`menus.json`), visible sous `flag_choix_debloque`. Elle montre les **trois** follets (le 4ᵉ est hors périmètre). Choisir en change **tout de suite** : le follet actuel s'éteint et le nouveau arrive (un fondu court, **pas** la cinématique de la Grotte). **L'alignement ne bouge pas** : c'est une stat du héros, pas du follet. La synergie suit le nouvel élément, par la table existante.

## 5. Les salles

| Salle | Taille *(provisoire)* | Contenu | Sorties |
|---|---|---|---|
| **1 — L'antichambre** (au sud) | 20 × 14, tuiles de la Grotte, obscurité 0,72 | 4 cracheurs ; levier central (apparaît) ; Zéros (une fois) | escalier → stèle bleue (toujours) ; passage **nord** → salle 2 (porte conditionnelle) |
| **2 — Les deux mains** | 34 × 12, en longueur d'est en ouest | deux `levier_maintenu`, à 22 tuiles l'un de l'autre (gauche et droite) ; on entre par le sud | passage **nord** → salle 3 (porte conditionnelle) |
| **3 — Le Gardien** (au nord) | 24 × 18, une arène avec quelques piliers (pour se cacher des tirs) | le Gardien ; le coffre ; le levier-récompense | porte de sortie **nord** → dehors, près de la stèle rouge |

**Orientation** : on entre dans chaque salle par le **sud** et on en sort par le **nord**, pour que la descente se lise comme une avancée continue sous le chemin, de la stèle bleue à la stèle rouge. Les layouts s'écrivent **à la main** (décision verrouillée : jamais de layout jouable procédural). Le décor procédural de la Grotte (graine fixe, cristaux lumineux) est réutilisé. Chaque salle **déclare** ses lumières, et la salle 3 un peu plus que les autres, pour qu'on voie venir les tirs.

## 6. Données et architecture

- **Nouveaux modules purs** : `projectiles.js` (réserve, mouvement, collision), `competences.js` (charge, recharge, cible, résolution des dégâts par la dérivée), et `levier_maintenu` dans `puzzles.js`. Le script de rencontre de Zéros vit dans `main.js#creerOrchestrateurGrotte`, qui porte déjà « le script propre aux scènes du jeu », **mais ses nombres et ses textes vivent en données**.
- **Nouveaux catalogues ou champs** : `skills.json` (schéma), `enemies.json` (`attaque_distance`, `intouchable`, `boss`, `comportement: distance|boss`), `puzzles.json` (`visible_si`, `levier_maintenu`, `coffre_parchemin`), `scenes.json` (`nettoyage`, `descente`, `rencontre: { sans_defaite, seuil_fin, dialogue }`), `levels.json`, `flags.json`, locales FR/EN.
- **Test d'architecture** (règle directrice) : un second tireur, une Annexe 2 avec sa salle nettoyée, une seconde compétence chargée par le follet, **chacun en ajoutant des entrées JSON**, sans toucher une ligne de système.
- **Sauvegarde** : **une seule migration**, v8 → v9, au **palier I** (`save.hero.competences`, §4.9, validée par la relecture de Xav). Partout ailleurs, tout ce qui persiste est un flag déclaré avec son `initial`, et l'état « follet posé », la charge et les projectiles sont de session. Une compétence **en recharge** au moment de quitter repart pleine au chargement (**accepté**). *Si un autre palier découvre qu'il lui faut un champ de sauvegarde, il s'arrête et remonte à Xav.*
- **Scènes nouvelles** : ajout pur, sans renommage ni retrait. La contrainte « un retrait de contenu n'est pas couvert par la migration de schéma » ne s'applique pas.

## 7. Paliers

| Palier | Contenu | Validation (Xav, en jeu) |
|---|---|---|
| **A — Les niveaux** (**livré le 24/09**, `D-205`, validé : `V-149`) | §4.8 : Nv.31 à 50, les flags, le test « un flag par niveau » | La barre d'XP et « Nv. » au-delà de 30 ; la vraie sauvegarde Nv.30 de Xav, importée, qui continue de progresser |
| **B — La stèle et la descente** (**livré le 24/09**, `D-207`, validé : `V-150`) | §4.1, §4.2 ; la vue rapprochée et son action **Descendre** ; les trois salles **vides** (layouts, lumières, portes, escalier) ; flags de descente et leur remise à zéro | Nv.15 au pied de la stèle : le follet parle, le carnet se déchiffre, la vue rapprochée montre la gravure en clair et propose Descendre ; traverser les trois salles (portes forcées par debug) ; remonter |
| **C — Les tireurs** (**livré le 25/09**, `D-209`, validé : `V-151`) | `projectiles.js`, `attaque_distance`, comportement `distance`, les cracheurs, la salle nettoyée, le levier qui apparaît | Salle 1 : lisibilité des tirs, esquive, cadence « faible », dégâts « modérés » ; le levier qui apparaît |
| **D — Zéros** (**livré le 25/09**, `D-210`, validé : `V-152`) | Entité intouchable, follet de Zéros, combat sans défaite, relève, arrêt à 25 %, dialogue (textes provisoires), passage | La mise en scène entière ; la relève ; se lit-elle comme un combat qu'on **ne peut pas** perdre, et pas comme un bug ? |
| **E — Les deux mains** (**livré le 25/09**, `D-211`, à valider : `V-153`) | `levier_maintenu`, follet posé (**après B2**), dialogue du follet, passage | Salle 2 à la manette, au clavier **et** au doigt ; la marche dans l'ombre |
| **F — Le Gardien** | Comportement `boss` (trois gestes, trois modes), barre de boss, valeurs « à la louche » avec leur raisonnement, mort → Grotte → tout refaire | Au ressenti : au Nv.16 on perd ; avec la sauvegarde Nv.30, on gagne, difficilement. Trop dur ou trop simple, pourquoi, comment : on règle |
| **G — Le parchemin** (**après B1**) | Coffre, cinématique, `skills.json` et son schéma, `competences.js`, `slot_skill_1`, HUD de charge et de recharge | La cinématique ; la charge qui monte pendant l'engagement ; le tir, l'AoE, la recharge ; le HUD (checklist visuelle) |
| **I — Choisir** (§4.9) | Dialogue de déblocage, « Tout reprendre », compétences en cartes dans Stats (la fiche affiche 1 = X, 2 = Y, 3 = B ; A choisit l'emplacement ; équiper remplace), migration v8 → v9, carte Follet | Respec puis nouvelle répartition ; équiper la compétence en 1, puis en 3 (elle quitte le 1, et le bouton B la lance en jeu) ; changer de follet dehors, de jour et de nuit ; **manette, clavier et doigt** |
| **H — La boucle** | Levier-récompense (éclat au sol), porte de sortie (avec un **fondu** vers la stèle rouge, `Q-153`, déclaré sur le portail), descentes suivantes (sans Zéros, sans dialogue du levier, sans boss) ; album de référence | Trois descentes d'affilée : un éclat chacune, rien ne se rejoue qui ne devrait pas |

Ordre : A → B → C → D → E → F → G → **I** → H (le choix se débloque à la première sortie ; la boucle se vérifie en dernier, sur tout le reste). Chaque palier : tests headless de ses parts pures, `node tools/run_tests.js` vert, aucun banc de performance (`Q-159`, Xav, 25/09 : le banc complet tourne à la fin de la spec ou quand Xav part dormir ; une sentinelle permise en milieu de spec), une ligne `D-` close et une ligne `V-` ouverte.

## 8. Critères de réussite

- **Le scénario du §3 se joue de bout en bout**, sur une sauvegarde Nv.15 de Xav, **sans un seul flag forcé**.
- **Aucun id de salle, de monstre, de levier ou de flag de l'Annexe dans le code système** (vérifié par test, patron de `test_d43_a4` : « aucun id du catalogue dans le code du menu »).
- **Performance** : la salle 3 au plus fort du combat (Gardien, projectiles des deux côtés, compétence) passe **0 frame sautée** sur le PC de Xav sous Chrome, et reste dans le budget de la spec 13 sous bridage ×6.
- **Mobile** : tout se joue au doigt, y compris poser le follet et lancer la compétence.

## 9. Palier I — Choisir ses stats, ses compétences et son follet

`Q-147` tranchée par Xav : voir §4.9 et le palier I du §7.

## 10. Questions à ouvrir au suivi

| Id | Question | Retenu par défaut |
|---|---|---|
| **B1** | Les dégâts de la compétence | **Tranché (Xav, 24/09)** : Force × coefficient d'Esprit ; Esprit raccourcit aussi la charge et la recharge |
| **B2** | Poser le follet | **Tranché (Xav, 24/09)** : `target_next` contextuel, état `poste` du follet |
| `Q-137` | Forme de la condition de proximité | Valeur nommée `a_portee`, fournie par `main.js`, comparée par `egal` (appliquée au palier B) |
| `Q-138` | La stèle déchiffrée : descente directe, ou vue rapprochée avec « Descendre » ? | **Tranché (Xav, 24/09)** : la vue rapprochée d'abord, avec l'action Descendre |
| `Q-139` | Où mène la porte de la salle 3 ? | **Tranché (Xav, 24/09)** : dehors, près de la stèle rouge ; salles du sud vers le nord |
| `Q-140` | Les noms : cracheurs, Zéros / *Zeros*, le Gardien, la compétence | Noms de travail, à écrire par Xav |
| `Q-141` | Le follet de Zéros frappe-t-il ? | Non : Zéros frappe, son follet est la cible |
| `Q-142` | Descentes suivantes : le levier de la salle 1 ouvre directement le passage ? | Oui |
| `Q-143` | Zéros, « la seconde main » de la pierre qui répond ? | **Tranché (Xav, 24/09)** : oui, personnage récurrent (poste avancé…) |
| `Q-144` | La charge : cumulée sur plusieurs monstres, et gardée hors combat ? | Oui et oui |
| `Q-145` | Un temps minimal entre deux descentes ? | Non |
| `Q-146` | `?niveau=N` en debug ; l'équilibrage du Gardien | **Équilibrage tranché (Xav, 24/09)** : au ressenti, pas de bot. `?niveau=N` retiré (la vraie sauvegarde Nv.30 le remplace), à confirmer |
| `Q-147` | Respec et re-choix du follet | **Tranché (Xav, 24/09)** : dans l'Annexe 1, palier I |
| `Q-152` | Un retour au sud des salles 2 et 3 ? | **Tranché (Xav, 25/09)** : on garde, à revoir avec les tests tiers |
| `Q-153` | Un fondu aux changements de scène ? | **Tranché (Xav, 25/09)** : pas entre les salles ; **oui à la sortie** vers la stèle rouge (palier H) |
| `Q-154` | Les crachats : après le voile (lumineux) ou dessous ? | **Tranché (Xav, 25/09)** : après le voile ; le monstre reste dans le noir (`Q-27`), son tir se voit |
| `Q-157` | Zéros parle aussi en arrivant ? | **Tranché (Xav, 25/09)** : oui, « la scène est très bien amenée » |
| `Q-158` | La rencontre rapporte-t-elle quelque chose ? | Non : ni XP ni éclat ; la récompense reste le levier de la salle 3 |
| `Q-155` | Le butin des cracheurs | **Tranché (Xav, 25/09)** : 1 éclat une fois sur quatre (un de plus par salle 1 en moyenne), 30 XP |
| `Q-148` | **B3** : équiper sur l'emplacement 3 | **Tranché (Xav, 24/09)** : la fiche affiche 1 = X, 2 = Y, 3 = B ; A choisit parmi les trois ; équiper remplace |

## 11. Hors périmètre

L'Annexe 2 et son tunnel · les synergies de la compétence (Xav : « pas de synergie pour l'instant ») · les compétences 2 et 3 · le 4ᵉ follet · l'équipement du follet (`Q-29`) · le « follet agentique » (les mécanismes automatisés : l'état `poste` en est la première pierre, rien de plus) · la musique propre à l'Annexe · le jardinage et la zone sud (`Q-13`, `Q-136`) · tout rééquilibrage des monstres de la surface.

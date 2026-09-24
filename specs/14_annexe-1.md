---
projet: RPG V2
episode/session: Carte Maison — l'Annexe 1 (la stèle, Zéros, les leviers, le Gardien, la première compétence)
type: spec par paliers
version: 1.0.0
statut: brouillon — deux points bloquants à trancher par Xav (§0)
catégorie: Spec
date: 2026-09-24
Ids_suivi: [Q-120, Q-13, "D- (à créer : un par palier)", "Q-137 et suivantes (à créer)", "V- (à créer : un par palier)"]
genere_par: claude
verifie_par: xav
---

# RPG V2 — 14 : L'Annexe 1

**Méthode.** Branche dédiée `annexe-1`. **Un palier par session**, un commit par palier, chacun retirable seul, validation de Xav entre deux. Aucun `push`. Le suivi fait foi : un identifiant « à créer » déjà pris → prendre le suivant et le dire.
**Préalables** : `specs/13_lisieres-performance-carte.md` est **livrée**, et sa règle du budget (palier F) s'applique : **chaque palier de cette spec passe `cout_calque` et `traversee_nuit`** et compare ses chiffres à ceux de clôture de la spec 13. Une régression de plus de 20 % arrête le palier.
**Source** : le scénario dicté par Xav le 24/09, repris fidèlement au §3. Ce que Claude a ajouté pour que ce scénario se code est marqué **[OUVERT]**, avec une valeur retenue par défaut ; ces points sont listés au §10.

## 0. Deux points bloquants — à trancher par Xav avant le palier concerné

| # | Conflit | Pourquoi Claude ne tranche pas | Options |
|---|---|---|---|
| **B1** | La compétence du parchemin fait des dégâts « **qui dépendent d'Esprit** ». Or **D1⑧ est verrouillée** : « Esprit = réserve de lancement des compétences, rien d'autre. Esprit ne fait pas scaler les dégâts » (carte mentale, **reconfirmée le 23/09**), et « tout le scaling de dégâts converge sur Force » (`CLAUDE.md`) | Une décision verrouillée ne se rouvre pas en silence. Bloque le **palier G** seulement | **(a)** *Réviser* D1⑧ : une dérivée `derivee_puissance_competence` sur Esprit, et les compétences scalent sur Esprit. **(b)** *Garder* D1⑧ : les dégâts viennent de la Force (`derivee_degats_attaque` × un multiplicateur de compétence, en données), et Esprit paie le **lancement** (la réserve), par exemple en raccourcissant la charge ou le temps de recharge |
| **B2** | « Actionner le levier **et appuyer sur RB** (Tab ou toucher) » pour poser le follet. RB, Tab et le toucher du follet sont **déjà** le verbe `target_next` (« cible suivante », `D-54`, `D-142`) | Un même geste qui fait deux choses selon le contexte, c'est un contrat d'input. Bloque le **palier E** seulement | **(a)** *Contextuel* (retenu par défaut) : **à portée d'un levier à maintenir**, `target_next` pose le follet, puis le rappelle au second appui ; **partout ailleurs**, il change de cible comme aujourd'hui. **(b)** Un verbe nouveau (il faut alors un bouton libre sur la manette, au clavier et au doigt) |

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
- **L'entrée** : une fois déchiffrée, INTERACT sur la stèle **ne rouvre plus la vue rapprochée**. Il lance un **fondu** (le même que les portails) et fait descendre dans la salle 1. *[OUVERT `Q-138` : ou bien la vue rapprochée s'ouvre avec une action « Descendre » ?]*

### 4.2 La descente, et ce qui se remet à zéro

Une **descente** commence à chaque entrée par la stèle. L'Annexe distingue deux sortes d'état.

| Persistant (sauvegardé, pour toujours) | De la descente (remis à zéro à chaque entrée par la stèle) |
|---|---|
| `flag_indice_grotte_dechiffre`, `flag_zeros_rencontre`, `flag_gardien_vaincu`, `flag_parchemin_lu` (= `flag_competence_1`) | salle 1 nettoyée, levier de la salle 1 actionné, leviers de la salle 2, passage 2→3 ouvert, levier-récompense de la salle 3 actionné, porte de sortie ouverte |

- L'état de la descente est fait de **flags ordinaires**, sauvegardés : quitter le jeu dans la salle 2 et revenir laisse la salle 2 dans l'état où on l'a laissée. La scène déclare la liste de ses flags de descente (`descente: { flags: [...] }`), et **l'entrée par la stèle les remet à zéro**, en un seul endroit. Aucun id de flag n'est écrit dans le code.
- **Mourir** dans l'Annexe renvoie à la Grotte, comme partout. La descente suivante repart de zéro, et c'est exactement le « il faut tout refaire » du scénario.
- **Sortir** : la salle 1 garde un **escalier de retour** vers la stèle, toujours ouvert. La porte de la salle 3 (§4.7) est l'autre sortie. *[OUVERT `Q-139` : où mène la porte de la salle 3 ? Retenu : dehors, au pied de la stèle.]*

### 4.3 Salle 1 — les tireurs, puis Zéros

**La nouvelle famille** : les **rampants cracheurs** (nom de travail, *[OUVERT `Q-140`]*). Même silhouette de famille que le rampant de la Grotte, avec une autre teinte et un organe de tir visible, pour que le joueur reconnaisse tout de suite **la seule différence**.
- `enemies.json` gagne une **attaque à distance** déclarative : `attaque_distance: { portee_tuiles, cadence_ms, vitesse_px_s, visuel }`. Les dégâts suivent la même `force` que le corps à corps. Valeurs *provisoires* : portée 5 tuiles, cadence **2 400 ms** (« faible »), 110 px/s, dégâts « modérés », soit ceux d'un rodeur.
- **Le projectile** est un système nouveau, `src/projectiles.js`, **pur**. Une réserve à capacité fixe (patron de `poussiere.js`), un mouvement en ligne droite, qui **s'arrête sur un mur** (`estSolideAuPoint`) et **touche le héros** (disque contre disque). Le héros peut donc **l'esquiver**. Ce même module sert au Gardien et à la compétence du joueur : un seul chemin de collision.
- **Comportement** : un tireur garde une **distance préférée** (il recule si le héros approche à moins de 2 tuiles, et tire s'il est à portée). Cet état s'ajoute à la machine de `comportement_monstres.js`, **déclaré en données** (`comportement: "distance"`), sans toucher les états du corps à corps.
- **Placement** : quatre cracheurs (*provisoire*), posés par les `spawns` de la scène, avec la condition « salle 1 pas encore nettoyée ».
- **Salle nettoyée** : quand le dernier monstre des spawns de la scène meurt, la scène pose **son** flag (`nettoyage: { flag }` en données). C'est une règle générique : une Annexe 2 s'en servira sans code.
- **Le levier qui apparaît** : un interactif peut déclarer `visible_si` (même format que partout). Tant que la condition ne tient pas, il **n'existe pas** : pas de dessin, pas d'interaction, pas de collision.

**Zéros** (mini-boss 1, **une seule fois**, condition `not flag_zeros_rencontre`) : le levier de la salle 1 le fait apparaître.
- **Zéros** : la silhouette du héros, **en miroir** et **assombrie** (la teinte du héros existe déjà, `heroTeinte`). Il est **intouchable** (`intouchable: true` sur l'entrée d'ennemi) : l'auto-attaque et le follet l'ignorent. Il frappe **fort**, au corps à corps.
- **Le follet de Zéros** : une entité **à part**, `enemy_follet_zeros`. C'est la **seule cible** du combat. Il est noir, brillant et translucide (un visuel nouveau, avec un halo sombre), et il **orbite autour de Zéros** avec un grand rayon et une grande aura (une orbite de follet réutilisée, `companion.js`, avec des paramètres en données). Il ne frappe pas lui-même. *[OUVERT `Q-141`]*
- **Pas de défaite** : pendant ce combat, `hero.pv ≤ 0` **n'appelle pas** la mort. Le follet du héros le relève : dialogue court « Continue de te battre ! » (il **gèle** le combat, comme tout dialogue), et PV à 100 %. Aucun malus de survie, aucun retour à la Grotte. La règle vit sur la **rencontre** (`sans_defaite: true` dans les données du combat), jamais dans un `if` sur un id.
- **Fin** : à **25 %** des PV du follet de Zéros (seuil en données), tout se fige, et **Zéros parle** (un dialogue de `dialogues.json`, avec options s'il le faut, par le moteur de la spec 11). Puis **Zéros et son follet s'effacent** (un fondu), `flag_zeros_rencontre` est posé, et **le passage vers la salle 2 s'ouvre**. Ce passage est une porte conditionnelle sur ce flag **ou** sur « levier de la salle 1 actionné », pour les descentes suivantes.
- **Les descentes suivantes** : la salle 1 est nettoyée, le levier apparaît, et l'actionner **ouvre directement le passage**. *[OUVERT `Q-142`]*
- **Ce que dit Zéros** : les secrets sur les follets, **écrits par Xav**. Piste de Claude, à prendre ou à laisser : la stèle d'argile dit déjà « Ce monde a eu deux mains. La seconde a laissé un mot là où l'on commence à lire. » **Zéros serait-il la seconde main ?** *[`Q-143`]*

### 4.4 Salle 2 — les deux leviers et le follet posé

- **Levier à maintenir** : un type d'interactif nouveau, `levier_maintenu`. Il est **allumé tant qu'un mainteneur est à portée** (le héros, ou le follet posé) ; sinon il s'éteint après **0,6 s** (*provisoire* : le temps de voir qu'il s'éteint). Les deux leviers sont à **~22 tuiles** l'un de l'autre (*provisoire*) : le héros ne peut pas tenir les deux.
- **Quand les deux sont allumés en même temps**, un flag de descente est posé (`sequence`-like en données : `tous_allumes: [ids], flag_pose`). Le passage vers la salle 3 s'ouvre et **reste ouvert**, même si les leviers s'éteignent ensuite.
- **Le follet posé** (sous réserve de **B2**) : à portée d'un `levier_maintenu` **allumé**, `target_next` pose le follet dessus. Il y reste, n'engage aucun monstre et ne suit plus le héros. Un second `target_next`, n'importe où, le **rappelle**. Changer de salle le rappelle aussi. L'état « posé » est **de session**, jamais sauvegardé.
- **Conséquence à voir** : la lumière du follet reste **avec le follet** (elle lui est collée). Laisser son follet sur un levier, c'est donc **marcher dans l'ombre** vers l'autre. Rien ne change au rayon de la lumière : **`D-35` ne se reprend pas**. C'est la conséquence naturelle du geste, et elle sert la scène.
- **Le follet explique** : après **deux** extinctions (*provisoire*), c'est-à-dire quand le joueur a vu le problème, un dialogue du follet présente le geste. Le texte (Xav écrit) nomme le bon bouton selon le **périphérique actif**, avec les glyphes existants (`glyphes.json`) : RB, Tab, ou « touche-moi ».
- **Les descentes suivantes** : même mécanisme, sans le dialogue (flag persistant `flag_follet_pose_appris`).

### 4.5 Salle 3 — le Gardien

- **Nom de travail** : le Gardien (*[OUVERT `Q-140`]*). Un ennemi du catalogue, avec `boss: true` : une grande barre de PV en haut de l'écran plutôt qu'au-dessus de lui (`ui/barre.js` sait déjà dessiner une jauge).
- **Trois gestes, en données** : corps à corps, tir (projectiles, §4.3), et un **mode de déplacement tiré au sort** toutes les 3 à 6 s parmi `agressif` (il fonce), `kite` (il garde 4 tuiles et tire) et `errance` (il se replace). Les poids sont en données (*provisoire* : 40 / 40 / 20).
- **Équilibrage « battable vers le Nv.30 »** : un **instrument**, pas un test, `tools/mesure_boss.mjs`. Il fait combattre un héros simulé au Nv.16 et au Nv.30, avec une répartition de points déclarée (*provisoire* : moitié Force, un quart Agilité, un quart Vitalité), et rend le **temps pour tuer** et le **temps pour mourir**. Cible *provisoire* : au Nv.16, le héros meurt avant d'avoir retiré 40 % ; au Nv.30, il gagne en **60 à 120 s** en esquivant la moitié des tirs. Le jugement final revient à Xav, **manette en main**.
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
  "effet": { "type": "zone", "rayon_px": 40, "degats": "…voir B1…" },
  "projectile": { "vitesse_px_s": 220, "visuel": "visuel_onde" }
}
```

- **La charge** : elle monte tant que le follet est en état `engager` (sur n'importe quel monstre), jusqu'à 4 s. Elle **ne se perd pas** hors combat. *[OUVERT `Q-144`]*. Pleine, la compétence est **prête**. La lancer vide la charge et démarre le temps de recharge, et **les deux** doivent être remplis pour relancer.
- **La cible** : le monstre que le follet engage. Sans cible, c'est le plus proche à portée. Sans aucun monstre, l'appui est **refusé** (il se dit : un petit son et le texte flottant existant), et la charge est gardée.
- **Les dégâts** : **selon la décision B1**. Dans les deux cas, ils passent par **une dérivée** (règle de `D-141` : un système lit une dérivée, jamais une stat brute), et touchent **tous les monstres** dans le rayon. Neutre, **aucune synergie** : la table des régimes de synergie ne la voit pas.
- **HUD** : l'emplacement montre l'**anneau de charge** qui se remplit, puis l'**anneau de recharge** qui se vide. Même vocabulaire que les buffs au bandeau, en forme et pas seulement en couleur (P4②). Ticket qui touche `ui/hud.js` : il se clôt par la `CHECKLIST_visuelle`.

### 4.7 La récompense qui revient

- **Le levier-récompense** : il apparaît contre le mur une fois le Gardien vaincu, et **à chaque descente** ensuite. L'actionner fait **tomber un éclat au sol** (un objet au sol ramassable, pas un ajout direct : on **voit** la récompense), puis ouvre **la porte de sortie**. Une fois par descente (flag de descente).
- **Économie** : 1 éclat par descente, plus ceux des cracheurs de la salle 1. **On ne touche pas au coût des crafts** (`Q-69`). Le rendement se juge en jeu. *[OUVERT `Q-145` : faut-il un temps minimal entre deux descentes ?]*

### 4.8 Les niveaux jusqu'au Nv.50

`levels.json` s'étend du Nv.31 au Nv.50, en prolongeant la courbe : l'écart entre deux niveaux croît de **5 XP par niveau**, comme aujourd'hui (Nv.30 → 31 : +155, soit **2 495**… jusqu’au Nv.50 : **6 390**, *provisoire*). **+1 point de stat** par niveau. Les vingt flags `flag_niveau_31` à `flag_niveau_50` (avec leurs clés FR/EN) sont ajoutés, et un test vérifie que **chaque niveau du catalogue a son flag**, pour que cet oubli ne puisse plus arriver. Pour les tests de Xav : un paramètre de debug `?niveau=N`, sur le patron de `?alignement=N` (**masque**, jamais persisté, qui le dit en console). *[OUVERT `Q-146`]*

## 5. Les salles

| Salle | Taille *(provisoire)* | Contenu | Sorties |
|---|---|---|---|
| **1 — L'antichambre** | 20 × 14, tuiles de la Grotte, obscurité 0,72 | 4 cracheurs ; levier central (apparaît) ; Zéros (une fois) | escalier → stèle (toujours) ; passage → salle 2 (porte conditionnelle) |
| **2 — Les deux mains** | 34 × 12, en longueur | deux `levier_maintenu`, à 22 tuiles l'un de l'autre | passage → salle 3 (porte conditionnelle) |
| **3 — Le Gardien** | 24 × 18, une arène avec quelques piliers (pour se cacher des tirs) | le Gardien ; le coffre ; le levier-récompense | porte de sortie → dehors, au pied de la stèle |

Les layouts s'écrivent **à la main** (décision verrouillée : jamais de layout jouable procédural). Le décor procédural de la Grotte (graine fixe, cristaux lumineux) est réutilisé. Chaque salle **déclare** ses lumières, et la salle 3 un peu plus que les autres, pour qu'on voie venir les tirs.

## 6. Données et architecture

- **Nouveaux modules purs** : `projectiles.js` (réserve, mouvement, collision), `competences.js` (charge, recharge, cible, résolution des dégâts par la dérivée), et `levier_maintenu` dans `puzzles.js`. Le script de rencontre de Zéros vit dans `main.js#creerOrchestrateurGrotte`, qui porte déjà « le script propre aux scènes du jeu », **mais ses nombres et ses textes vivent en données**.
- **Nouveaux catalogues ou champs** : `skills.json` (schéma), `enemies.json` (`attaque_distance`, `intouchable`, `boss`, `comportement: distance|boss`), `puzzles.json` (`visible_si`, `levier_maintenu`, `coffre_parchemin`), `scenes.json` (`nettoyage`, `descente`, `rencontre: { sans_defaite, seuil_fin, dialogue }`), `levels.json`, `flags.json`, locales FR/EN.
- **Test d'architecture** (règle directrice) : un second tireur, une Annexe 2 avec sa salle nettoyée, une seconde compétence chargée par le follet, **chacun en ajoutant des entrées JSON**, sans toucher une ligne de système.
- **Sauvegarde** : **aucune migration attendue**. Tout ce qui persiste est un flag déclaré avec son `initial`, et l'état « follet posé », la charge et les projectiles sont de session. Une compétence **en recharge** au moment de quitter repart pleine au chargement (**accepté**). *Si un palier découvre qu'il lui faut un champ de sauvegarde, il s'arrête et remonte à Xav.*
- **Scènes nouvelles** : ajout pur, sans renommage ni retrait. La contrainte « un retrait de contenu n'est pas couvert par la migration de schéma » ne s'applique pas.

## 7. Paliers

| Palier | Contenu | Validation (Xav, en jeu) |
|---|---|---|
| **A — Les niveaux** | §4.8 : Nv.31 à 50, les flags, le test « un flag par niveau », `?niveau=N` | La barre d'XP et « Nv. » au-delà de 30 ; `?niveau=40` ; une vraie sauvegarde Nv.30 qui continue de progresser |
| **B — La stèle et la descente** | §4.1, §4.2 ; les trois salles **vides** (layouts, lumières, portes, escalier) ; flags de descente et leur remise à zéro | Nv.15 au pied de la stèle : le follet parle, le carnet se déchiffre, la stèle fait descendre ; traverser les trois salles (portes forcées par debug) ; remonter |
| **C — Les tireurs** | `projectiles.js`, `attaque_distance`, comportement `distance`, les cracheurs, la salle nettoyée, le levier qui apparaît | Salle 1 : lisibilité des tirs, esquive, cadence « faible », dégâts « modérés » ; le levier qui apparaît |
| **D — Zéros** | Entité intouchable, follet de Zéros, combat sans défaite, relève, arrêt à 25 %, dialogue (textes provisoires), passage | La mise en scène entière ; la relève ; se lit-elle comme un combat qu'on **ne peut pas** perdre, et pas comme un bug ? |
| **E — Les deux mains** | `levier_maintenu`, follet posé (**après B2**), dialogue du follet, passage | Salle 2 à la manette, au clavier **et** au doigt ; la marche dans l'ombre |
| **F — Le Gardien** | Comportement `boss` (trois gestes, trois modes), barre de boss, `mesure_boss.mjs`, mort → Grotte → tout refaire | Au Nv.16 : on perd ; au Nv.30 (`?niveau=30` + points répartis) : on gagne, difficilement |
| **G — Le parchemin** (**après B1**) | Coffre, cinématique, `skills.json` et son schéma, `competences.js`, `slot_skill_1`, HUD de charge et de recharge | La cinématique ; la charge qui monte pendant l'engagement ; le tir, l'AoE, la recharge ; le HUD (checklist visuelle) |
| **H — La boucle** | Levier-récompense (éclat au sol), porte de sortie, descentes suivantes (sans Zéros, sans dialogue du levier, sans boss) ; album de référence | Trois descentes d'affilée : un éclat chacune, rien ne se rejoue qui ne devrait pas |

Chaque palier : tests headless de ses parts pures, `node tools/run_tests.js` vert, banc de la spec 13, une ligne `D-` close et une ligne `V-` ouverte.

## 8. Critères de réussite

- **Le scénario du §3 se joue de bout en bout**, sur une sauvegarde Nv.15 de Xav, **sans un seul flag forcé**.
- **Aucun id de salle, de monstre, de levier ou de flag de l'Annexe dans le code système** (vérifié par test, patron de `test_d43_a4` : « aucun id du catalogue dans le code du menu »).
- **Performance** : la salle 3 au plus fort du combat (Gardien, projectiles des deux côtés, compétence) passe **0 frame sautée** sur le PC de Xav sous Chrome, et reste dans le budget de la spec 13 sous bridage ×6.
- **Mobile** : tout se joue au doigt, y compris poser le follet et lancer la compétence.

## 9. Ce qui reste des décisions du 23/09 pour l'Annexe 1

La NS du 23/09 range aussi dans l'Annexe 1 **le respec des stats et le re-choix du follet** (illimités et gratuits, depuis le menu). **Le scénario de Xav ne les mentionne pas.** *[OUVERT `Q-147` : dans cette spec (un palier I), ou dans une spec à part après l'Annexe ?]* Retenu : **à part**, parce que ce sont des systèmes de menu sans rapport avec la descente.

## 10. Questions à ouvrir au suivi

| Id | Question | Retenu par défaut |
|---|---|---|
| **B1** | Les dégâts de la compétence : Esprit (réviser D1⑧) ou Force (garder D1⑧) ? | **Aucun — bloquant pour G** |
| **B2** | Poser le follet : `target_next` contextuel, ou un verbe nouveau ? | `target_next` contextuel — **bloquant pour E** |
| `Q-137` | Forme de la condition de proximité | Valeur nommée `a_portee`, fournie par `main.js` |
| `Q-138` | La stèle déchiffrée : descente directe, ou vue rapprochée avec « Descendre » ? | Descente directe, avec fondu |
| `Q-139` | Où mène la porte de la salle 3 ? | Dehors, au pied de la stèle |
| `Q-140` | Les noms : cracheurs, Zéros / *Zeros*, le Gardien, la compétence | Noms de travail, à écrire par Xav |
| `Q-141` | Le follet de Zéros frappe-t-il ? | Non : Zéros frappe, son follet est la cible |
| `Q-142` | Descentes suivantes : le levier de la salle 1 ouvre directement le passage ? | Oui |
| `Q-143` | Zéros, « la seconde main » de la pierre qui répond ? | Proposition de Claude, textes à Xav |
| `Q-144` | La charge : cumulée sur plusieurs monstres, et gardée hors combat ? | Oui et oui |
| `Q-145` | Un temps minimal entre deux descentes ? | Non |
| `Q-146` | `?niveau=N` en debug, masque non persisté ? | Oui |
| `Q-147` | Respec et re-choix du follet : dans l'Annexe 1 ou à part ? | À part |

## 11. Hors périmètre

L'Annexe 2 et son tunnel · les synergies de la compétence (Xav : « pas de synergie pour l'instant ») · les compétences 2 et 3 · l'équipement du follet (`Q-29`) · le respec et le re-choix du follet (`Q-147`) · la musique propre à l'Annexe · le jardinage et la zone sud (`Q-13`, `Q-136`) · tout rééquilibrage des monstres de la surface.

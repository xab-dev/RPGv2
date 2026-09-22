---
projet: RPG V2
episode/session: File de micro-tickets « inventaire survivaliste » (branche `inventaire-2026-09-22`)
type: fichier de bord (une ligne par commit, écrite au moment du commit)
version: 1.0.0
statut: en cours
catégorie: Doc
date: 2026-09-22
---

# Journal de bord — file « inventaire survivaliste »

Brief : `docs/BRIEF_file-inventaire_2026-09-22.md`. Branche `inventaire-2026-09-22`,
**un commit par ticket**, chacun retirable seul. Jamais de `push`.

---

## Ménage de journal (avant tout code)

Le journal de `specs/09_reglages-graphiques.md` (paliers A à E) est archivé dans
`docs/archives/JOURNAL_2026-09-22_reglages-graphiques.md`, son entrée est ajoutée à
l'INDEX, et `CLAUDE.md` n'en garde plus rien — la règle veut un seul journal à la fois.
Le brief et les deux sauvegardes réelles de Xav entrent au dépôt avec (elles serviront
aux migrations de T1 et T5).

## T0 — État des lieux et mesure de référence (`R-19`)

**Aucun code de jeu.** Ce que la lecture a trouvé, et qui commande les tickets suivants :

- **La poche n'a aucune capacité.** Elle est un dictionnaire `{ itemId: quantité }`, et la
  seule limite est `stack_max`, porté par l'**objet** (20 pour une ressource, 10 pour une
  nourriture, 1 pour un outil). Donc : aucun nombre de slots, aucune notion de conteneur, et
  « la poche est pleine » ne veut rien dire aujourd'hui — sauf pour un seul objet à la fois.
- **Le coffre, lui, compte déjà** — mais autrement : `stations.json#capacite` (20) borne son
  nombre de **piles**, c'est-à-dire d'entrées distinctes. Deux mécanismes de remplissage
  coexistaient donc, un par conteneur.
- **Un outil compte déjà comme une entrée de poche** (vérifié, pas supposé) : `item_hache` et
  `item_pioche` sont des items ordinaires, de catégorie `outil` et `stack_max: 1`.
- **`D-28` est bien là où la ligne le dit** : la récolte à l'outil appelle `ajouterItem` sans
  regarder `ajoute`, pose le cooldown de la tuile quand même, et ne dit rien ; le ramassage au
  sol, lui, teste `ajoute > 0` et laisse l'objet par terre. Deux chemins, deux comportements.
- **Les trois chemins d'équipement de `D-93`** : `main.js#iconesSlots.consume` résout la
  silhouette depuis `save.hero.equipement.consommable` **sans regarder le stock**, alors que
  `essayerConsommer` et l'indice de commande le regardent tous les deux. Et le trou de `D-92`
  est confirmé : `equipment_slots.defaut` ne rattrape que `arme: null`, jamais une chaîne
  fausse.

### `R-19` — l'instrument, et son premier relevé

`tools/mesure_rythme.mjs` : un bot headless qui joue une partie neuve sur le **vrai**
orchestrateur, en « vétéran » — ligne droite vers ce qu'il connaît, tout ramassé, récolte dès
que l'outil est en poche, boire dès que la soif a bougé, fabriquer dès que possible, et
**vider au coffre** quand une pile sature (sans ce geste, la mesure serait flatteuse et
fausse : la poche se bloquait toute seule). Le temps compté est le **temps de jeu actif**,
celui que `maj()` fait avancer ; un déplacement coûte sa distance divisée par la vitesse
réelle du héros, lue dans `stats_derivees.json`.

Ce n'est pas un test et ça ne doit jamais le devenir (`D-52`) : aucun de ces nombres n'est un
contrat.

**Ce que le premier relevé dit, et il faut le lire en face :**

| | valeur |
|---|---|
| Niveau à la tombée de la **première nuit** (11,5 min) | **4** |
| Nv.5 | ~20 min (jour 1) |
| Nv.10 | ~179 min (jour 10) |
| Nv.15 | **non atteint** en 4 h de jeu |
| D'où vient l'XP | récolte au sol 33 % · récolte à l'outil 29 % · craft 32 % · puits 6 % |

**Et une contradiction à trancher par Xav, avant tout réglage** (`Q-62`) : le brief part du
constat que « le Nv.15 se fait en quelques minutes ». L'instrument, lui, ne l'atteint pas en
quatre heures, et place le Nv.10 à ~3 h. L'un des deux se trompe, et ça change tout ce que la
file doit faire. Deux pistes pour l'écart, également plausibles : (a) le bot marche
réellement d'un objet à l'autre sur une carte de 170 × 116 tuiles, là où un joueur reste dans
un périmètre qu'il connaît ; (b) l'impression de Xav vient d'une partie déjà avancée, pas
d'une sauvegarde neuve. **Rien n'est réglé sur cette base** : c'est `Q-62` qui doit répondre.

Deux chiffres méritent d'être notés au passage, parce qu'ils bornent tout l'équilibrage à
venir : la carte n'a que **deux tuiles-ressources** (un arbre, un rocher) et le repos du jour
ne sème que **21 objets**. La récolte est donc plafonnée par la carte, pas par le joueur.

## T1 — Capacité des conteneurs (`D-118`, clôt `D-28`)

`data/conteneurs.json` : **4 slots / pile 5** pour la poche, **10 slots / pile 20** pour le
coffre — quatre nombres provisoires, en données, dans un seul fichier.

Ce que le ticket change en profondeur : **la pile appartient au conteneur, l'objet peut la
plafonner**. `items.json#stack_max` disparaît au profit de `pile_max`, **optionnel** et ne
restant que là où il dit quelque chose de vrai partout — un outil ou une arme ne s'empile dans
aucun conteneur. Une ressource n'en porte plus : c'est le conteneur qui décide, donc le même
bois s'empile par 5 en poche et par 20 au coffre.

Les **slots ne sont pas des cases** : ils sont une conséquence du contenu (`ceil(quantité /
pile)`), ce qui veut dire que douze branches occupent trois slots et qu'**aucune sauvegarde ne
change de forme**. C'est ce qui rend la reprise d'une vieille partie possible sans migration
de schéma.

Le point de résolution unique est `inventory.js#resoudreCapacite` — c'est par là que la besace
et le porte-outils passeront (`Q-65`), et `filtre` est déjà déclaré au schéma, vide, pour
qu'ils n'arrivent pas un jour sous la forme d'un second mécanisme.

Trois conséquences qui n'étaient pas demandées mais que le ticket ne pouvait pas éviter :

1. **`fabriquer` reçoit une fonction, pas un nombre.** Le plafond de la sortie se mesure sur la
   poche **d'après le retrait des ingrédients** — sinon cuire son dernier fruit dans une poche
   pleine serait refusé, alors que le fruit libère justement la place. La règle « refus avant
   toute consommation » tient toujours : le retrait se fait dans une copie locale.
2. **Le coffre ne compte plus ses entrées, il compte ses slots** (`slotsOccupes`), donc les
   deux conteneurs ont enfin une seule notion de remplissage. Et la station de stockage ne
   porte plus un nombre : elle **désigne** son conteneur — ce qui fait que le coffre crafté de
   T5 n'aura aucun second nombre à déclarer.
3. **`D-28` est clos, en entier.** Un refus se **dit** (texte flottant « Poche pleine », style
   `refus` déclaré en données, émis à la source du gain qu'il remplace) **et** ne consomme plus
   le cooldown de la tuile. Les deux chemins de récolte se comportent enfin pareil.

Une vieille sauvegarde est **normalisée au chargement**, pas migrée : la donnée est valide,
c'est la règle qui a changé (la classe que `CLAUDE.md` nomme depuis le repli sur
`scene_grotte_salle_1`). Ce qui déborde descend au coffre, ce qui ne rentre nulle part est
**journalisé** — jamais un objet qui s'évapore entre deux parties. `schema_version` ne bouge
pas.

**Ce que le ticket n'a PAS fait, et pourquoi** : le brief demandait qu'« une case vide se
dessine vide » dans les écrans Poche et Coffre. Dessiner des cases vides est un changement de
**structure de menu**, et la structure des menus est **gelée depuis le 21/09** — le brief le
redit lui-même en §0. La poche annonce donc son remplissage en **sous-titre**
(« Emplacements : 3 / 4 »), comme le coffre le faisait déjà, et les cases vides restent
`[OUVERT]` (`Q-67`).

Le bot de la boucle 5 minutes a dû apprendre à **vider ses poches** avant de cuisiner : avec
quatre slots, hache + pioche + bois + pierre remplissent la poche et le fruit ne rentre plus.
Ce n'est pas un détour de test, c'est le rituel voulu par Xav — et c'est la meilleure preuve
que le ticket fait son travail.

`npm test` : **124 fichiers verts**.

## T2 — Les slots d'équipement disent la vérité (`D-92` + `D-93`)

Les deux lignes sont la **même famille** et se traitent ensemble, comme Xav l'avait demandé :
un slot garde un id que **plus rien ne revalide** — là l'id ne résout plus (`D-92`), ici il
résout mais l'objet n'est plus en poche (`D-93`). Une seule fonction, `revaliderEquipement`,
posée au **niveau module** (donc testable, règle `D-72`) et appelée **à chaque frame**.

Deux choix méritent d'être dits, parce qu'ils sont la différence entre corriger et re-corriger :

- **À chaque frame, pas à chaque mutation de poche.** La fonction est idempotente et ne coûte
  que deux recherches ; chercher « tous les endroits qui touchent la poche » est exactement ce
  qui avait laissé passer les trois chemins divergents de `D-93`. Ici, le prochain endroit qui
  touchera la poche n'aura rien à savoir.
- **Avant toute branche d'UI, jamais sous `if (!uiOuverte)`.** L'écran Coffre déplace des
  objets pendant qu'il est ouvert : une revalidation gelée sous UI manquerait précisément le
  cas qui a fait le bug. C'est pour cette raison que l'ancien `verifierDeblocagesBarreAction`
  ne pouvait pas servir de point d'accroche.

Ce que ça donne : l'arme absente de la poche retombe sur le **défaut du slot** (mains nues) et
reprendre l'épée au coffre ne la rééquipe pas ; un id d'arme inconnu fait pareil **et se dit en
console** (`D-92` : plus de `arme.portee` lu sur `undefined`, donc plus de héros qui ne peut
plus jamais frapper) ; un consommable épuisé passe au **suivant de la même catégorie** s'il y
en a un en poche (`Q-64`, retenu par défaut), sinon la case **disparaît**.

**Le loquet `flag_premier_consommable` est retiré** — flag, entrée de catalogue et clés de
locale avec. La case du consommable suit désormais l'état réel de la poche par une **valeur
nommée** (`consommables_en_poche`) que `data/action_slots.json` cite : c'est le mécanisme
d'apparition existant de `D-62`, sans code de déblocage propre. C'est un retournement assumé
(*révise* le 21/09) : on craignait de faire clignoter la case, mais voir une touche qui ne fait
rien est pire que de la voir partir avec ce qu'elle servait à manger.

Une dette de duplication ramassée en passant, parce qu'elle était sur le chemin : les valeurs
nommées étaient **déclarées deux fois** (`valeurs:` à la construction du registre de flags,
et `nomsValeursConditions` pour le contrôle de démarrage). Une seule déclaration désormais, la
seconde en dérive ses clés — deux listes finissent toujours par diverger (`D-71`).

`npm test` : **125 fichiers verts**, dont le tour de dessin à faux contexte sur les trois états
de poche (`D-71`).

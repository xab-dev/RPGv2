---
projet: RPG V2
episode/session: File de micro-tickets « inventaire survivaliste » (poche, coffre, herbe, outils au Nv.10, coffre craftable, rythme 0→15)
type: brief de file autonome
version: 1.1.0
statut: relu
catégorie: Doc
date: 2026-09-22
Ids_suivi: D-118, D-119, D-120, D-121, D-122, D-123, D-124, D-125, D-92, D-93, D-103, D-28, Q-43, Q-45, Q-62, Q-63, Q-64, V-62, V-63, V-64, V-65, V-66, V-67, V-68, V-69, R-19
branche: inventaire-2026-09-22
genere_par: claude
verifie_par: xav
---

# Brief — file « inventaire survivaliste » (22/09)

Emplacement : `docs/BRIEF_file-inventaire_2026-09-22.md`. Même patron que `BRIEF_file-nv0-10_2026-09-20.md` : file longue autonome, branche dédiée, **un commit par ticket**, ordre fixe, chaque commit retirable seul, **jamais de `push`**. L'état de la file vit sur le disque (`docs/JOURNAL_2026-09-22_file-inventaire.md`, une ligne par commit, écrite au moment du commit).

**Changelog 1.1.0 (22/09, matin)** : réponses de Xav intégrées. Le craft ne puise **pas** au coffre (le rituel « vider ses poches » est voulu) — la recette du coffre est recalibrée pour tenir dans 4 × 5. Consommable épuisé : la case **disparaît ou passe au suivant**, *révise* le loquet du 21/09. Ajoutés : la cible de rythme (T0), le seuil du puits (T7), le dialogue du follet à la première maison (T8), la recette qui dit pourquoi elle ne se fabrique pas (T6). Verdicts du 22/09 en §5.

Identifiants **proposés** (les derniers du suivi sont `D-117`, `Q-61`, `V-61`, `R-18`) — à renuméroter au ménage si une session intermédiaire les a pris.

---

## 0. Ce qui commande la file

**Pourquoi maintenant (Xav, 22/09).** Tous les tests d'équilibrage ont été faits *avant* les ressources semées, l'XP du puits et la plume : aujourd'hui **le Nv.15 se fait en quelques minutes**, la découverte va trop vite, on passe à côté de choses. La file remet du réalisme au départ — plus lent, découverte, exploration — **avant** de repartir dans la branche ésotérique/magique. Tout équilibrage de cette file doit être **veteran-proof** : un joueur qui connaît la carte ne doit pas pouvoir le court-circuiter.

**La branche survivaliste.** Poche serrée, coffre qui compte, ressources brutes, outils qui se gagnent et qui **prennent de la place**, une interface qui dit la vérité de la poche. Cohérent, réaliste. Craft ≠ cuisine : deux stations, deux logiques.

**Répartition des rôles (décision de Xav, 22/09, à reporter dans `CLAUDE.md` au ménage) :**
- **Claude** tient la branche **réaliste, logique et générique** : ressources → intermédiaires (herbe → corde) → craft → équilibrage → capacités → règles d'inventaire. Il propose, chiffre, mesure, retient des défauts `[OUVERT]`.
- **Xav** tient **l'identité** : ce qui « s'écrit » — synergies, effets élémentaires, lore, textes du follet, biomes.

**Principe d'équilibrage inchangé** (19/09) : les valeurs de base sont basses, tout grandit ensuite. Une valeur destinée à grandir (slots, pile) **n'est jamais lue directement** par un système — fonction pure de résolution, qui rend aujourd'hui la base telle quelle. Aucun modificateur livré.

**Ce que la file ne touche pas :** la structure des menus (gelée le 21/09), le sol, les stations existantes, la Grotte, la cuisine et ses recettes actuelles, `Q-07` (construction hors de la Maison, gelée), la lumière du follet (`D-35`, close : parfaite, ne bouge que pour un futur biome sombre — à écrire par Xav).

---

## 0 bis. Tranché par Xav le 22/09 — et ce qui reste

| Point | Décision |
|---|---|
| Hache et pioche au Nv.10, avec coût en éclats | **Oui.** Confirmé : c'est le cœur du ralentissement. |
| Tous les crafts coûtent des éclats | **Oui, à l'Atelier.** La cuisine et ses recettes **actuelles** ne bougent pas ; les prochaines recettes de cuisine, potentiellement. Scierie, ferronnerie : hors scope. |
| Le craft puise-t-il au coffre ? | **Non.** Le joueur vide ses poches, va chercher, revient, fabrique — la recette doit tenir en poche. |
| Coffre crafté : contenu par instance | **Oui.** Chaque coffre est **unique**, placement au choix, le joueur doit pouvoir en construire **5 ou plus** et **trier à la main** (un pour le bois, un pour la pierre…). Ce n'est pas un coffre extensible : des niveaux de coffre avec plus d'emplacements viendront plus tard. Ouvre plus tard l'automatisation façon Minecraft (entonnoirs, filtres) — **rien de tout ça ici**, mais le modèle par instance en est la condition. |
| Le coffre de base reste | **Oui.** |
| Consommable épuisé / arme rangée | Le joueur mange son dernier fruit → **la case disparaît (retour à l'état de base) ou affiche le suivant** si un autre consommable est en poche. Il range son épée → **retour à mains nues**. *Révise* le loquet `flag_premier_consommable` du 21/09. |
| Un outil au coffre ne récolte plus | **C'est le comportement voulu** (« le dialogue classique fonctionne »). Conséquence actée : **un outil occupe un slot de poche** — c'est ce qui donne son sens au porte-outils (§4). |
| `Q-43` puits | **Oui** : l'XP tombe si la soif était **sous 90 %** avant de boire. |
| `Q-45` herbe | **Le minimum d'XP** (1). Le plafond des 30 % n'est pas rouvert ; c'est la cible de rythme (ci-dessous) qui commande. |
| `Q-60` presets | **Moyen par défaut, Bas au tactile** — c'est exactement ce qu'Auto fait déjà (`pointer: coarse` → Bas, sinon Moyen). Rien à coder, Xav clôt. |
| `Q-46` mort | **Validé, parfait** (mort = grotte = cinématique, clignement). Xav clôt. |

**Ce qui reste `[OUVERT]`, avec le défaut retenu :**

| Id | Question | Défaut retenu |
|---|---|---|
| Q-62 | **La cible de rythme.** « Plus lent » n'a pas de fin sans chiffre. | **Nv.5 pas avant la première nuit** (le seuil du Chaos ne doit pas tomber avant une nuit calme, constat de `Q-33`) · **Nv.10 vers 40 min de jeu** (≈ 2 cycles jour/nuit) · **Nv.30 à 2 h** (critère de clôture de la Région Maison, inchangé). Mesuré par le bot (T0) avant et après ; les écarts se règlent **en données** (XP par ressource, effectifs semés), jamais en code. Xav confirme ou donne ses chiffres. |
| Q-63 | **La recette du coffre.** 50 objets ne tiennent pas en poche (20 au plus, moins les outils). | **5 bois + 5 branches + 5 herbes + éclats** (provisoire : 20). Trois slots pleins, le 4ᵉ pour la hache — la poche arrive **pleine** à l'atelier sans avoir à déposer l'outil d'abord. Si Xav veut le rituel complet (déposer la hache, 4 slots de ressources), c'est **+ 5 cailloux**. |
| Q-64 | **Auto-équipement du consommable suivant** : quand le dernier fruit part, le fruit cuit en poche prend-il la case tout seul ? | **Oui**, si un autre item de la même catégorie est en poche — sinon la case disparaît. Une arme rangée ne se remplace **jamais** toute seule (mains nues). |

---

## 1. La file, dans l'ordre

Branche `inventaire-2026-09-22`, un commit par ticket, identifiant dans le titre. Chaque ticket cite les lignes du suivi qu'il touche et **ne lit que celles-là**. Après T2, T5 et T6 : `npm test` vert, capture Chrome sans fenêtre aux trois profils, une ligne au journal.

### T0 — État des lieux et mesure de référence (`R-19`) — lecture seule + un scénario

Aucun code de jeu. Cinq lignes au journal, puis des chiffres.

- **Ce que sont la poche et le coffre aujourd'hui** : où vit `stack_max` (sur l'item), y a-t-il un nombre de slots ou seulement des piles, ce que fait `D-28` (récolte poche pleine, silencieuse), et **si un outil compte déjà comme un slot** (il est un item comme un autre — vérifier, pas supposer).
- **Ce que porte un slot d'équipement** quand la poche se vide ou quand l'objet part au coffre (`main.js#iconesSlots`, `essayerConsommer`, `resoudreArmeEquipee`) — les trois chemins de `D-93`, le trou de `D-92`.
- **Mesure `R-19`** : le bot headless de la boucle (Phase 3, boucle de 2 h) rejoue une partie neuve **jusqu'au Nv.15**, en jouant « vite » (ligne droite vers ce qu'il connaît). On note : temps de jeu (en jours du cycle), niveau atteint à la première nuit, et **d'où vient l'XP** (récolte / puits / cuisine / craft / combat), par niveau. C'est le témoin de `Q-62`. **Ce chiffre est le vrai sujet de la file** : sans lui, on ne saura pas si elle a fait son travail.

### T1 — Capacité des conteneurs : la poche et le coffre comptent (`D-118`)

- **Poche : 4 slots, pile 5. Coffre : 10 slots, pile 20.** Les quatre nombres **en données** (un catalogue `conteneurs.json`, ou un bloc dans les données existantes — une seule source, à Claude Code de choisir), **provisoires**, commentés.
- **La pile appartient au conteneur, l'objet peut la plafonner** : `pile_max` optionnel sur l'item — **outils et armes : 1**. Pile effective = min(pile du conteneur, `pile_max`). Testé en relation, jamais en chiffre (`D-52`).
- **Un outil occupe un slot** (décision 22/09). Pas de case particulier : c'est un item.
- **Point de résolution pure** : `inventory.js#resoudreCapacite(conteneur)` → `{ slots, pile }`, rend la base telle quelle. C'est par là que besace et porte-outils passeront (§4) : **aucun modificateur livré**, mais le contrat doit déjà pouvoir rendre un `filtre` de catégories sans le remplir.
- **Plein = refus lisible**, et `D-28` se ferme : récolter, ramasser ou transférer vers un conteneur plein **ne consomme pas le cooldown** et le dit (texte flottant existant, clés « Poche pleine » / « Coffre plein » — jamais un dialogue par-dessus un menu, `D-09`). Les deux chemins de récolte passent par la **même** fonction.
- **Sauvegarde** : une pile au-delà de 5 en poche est **découpée** sur plusieurs slots au chargement ; ce qui ne tient plus va au coffre de base — jamais perdu en silence, journalisé. Les dix sauvegardes de `docs/sauvegardes/` se chargent.
- Écrans Poche / Coffre : **aucune structure nouvelle**. Une case vide se dessine vide ; le compteur devient « x/5 » ou « x/20 ».
- Touche : `inventory.js`, `schemas.js`, `data/*.json`, `main.js` (deux chemins de récolte), `locales/*`. **Ne touche pas** à `recipes.js`.

### T2 — Les slots d'équipement disent la vérité (`D-92` + `D-93`, ensemble)

Le bug rapporté le 22/09 : l'épée rangée au coffre reste dans la case d'attaque ; le dernier fruit mangé reste dans la case du consommable. **Cible : armes et consommables.**

- **Une seule fonction**, `main.js#revaliderEquipement(save, registre)`, appelée à **chaque mutation de poche** (ajout, retrait, transfert, consommation, craft) et au chargement.
  - **Arme absente de la poche** → le slot retombe sur le défaut du slot (`equipment_slots.defaut` = mains nues), sans dialogue. Reprendre l'épée au coffre **ne la rééquipe pas** (on l'équipe depuis la Poche).
  - **Consommable à zéro en poche** → s'il existe en poche un autre item de la même catégorie, **il prend la case** (`Q-64`) ; sinon **la case disparaît** — retour à l'état de base. Le loquet `flag_premier_consommable` de `D-63` est **retiré** (*révise* le 21/09) : la case réapparaît au prochain consommable en poche, ce qui est le mécanisme d'apparition existant.
  - **Id inconnu du catalogue** (`D-92`) → repli sur le défaut du slot **et une ligne de console** avec l'id fautif. Jamais un échec dur en pleine partie, jamais un `arme.portee` lu sans garde (sites nommés par `D-92` : `main.js:1819`, `:2423`, `:1595`).
- Le HUD ne décide rien : `ui/hud.js` reçoit la table `verbe → visuel` et dessine (patron de `D-75`). Une case sans contenu **n'est pas dessinée** — pas de grisé, décision 22/09.
- Test : les quatre cas, headless, plus le tour de dessin à faux contexte (`D-71`).
- Touche : `main.js`, `ui/hud.js`, un test. **Ticket de rendu** : se clôt par `V-63`.

### T3 — L'herbe, troisième ressource de ramassage (`D-119`)

- `item_herbe` : ramassage libre au sol, comme branche et caillou. **Rien n'en dépend** dans cette file : la corde est le maillon suivant, hors scope (avec `E-02`).
- **Données seules** : `items.json` (catégorie ressource, **XP de récolte = 1**, `Q-45`), `visuels.json` (charte d'item de `D-82` : posée, trois valeurs, un accent — la tige claire), `ground_items` (bloc `spawn`, points candidats à la main le long du chemin et dans les Champs, ≈ 3 × l'effectif, tirés à l'aube — patron `D-59`), `locales/*` (nom, fiche de Poche — texte proposé, Xav réécrit).
- Vérification aux trois endroits de `D-91` : banc, au sol en scène, case de la barre du bas (`tools/scenarios/items_poche.mjs`).

### T4 — Hache et pioche au Nv.10, avec un coût en éclats (`D-120`)

- **Données seules** : `recipes.json` — `visible_si: { valeur: 'niveau', min: 10 }` sur les deux recettes (mécanisme de `D-62`), `cout_eclats` posé (provisoire : 10 hache / 10 pioche ; l'épée est à 15).
- **Ordre du même soir** : hache fabricable au Nv.10 **avant** l'épée (1 bois). Test : au Nv.10 avec branches, cailloux et éclats, la chaîne hache → bois → épée se fait sans autre déblocage.
- **Cuisine intouchée.**
- Sauvegardes existantes : hache et pioche déjà en poche **restent** (une entrée verrouillée est invisible dans l'Atelier ; l'objet possédé ne bouge pas).
- **Mesure `R-19` bis** après T3 + T4, même scénario que T0, les deux chiffres côte à côte au journal. Si 5→10 dépasse la cible de `Q-62`, **on ne corrige pas dans la file** : ligne `Q-` avec les leviers en données (XP par ressource, effectifs semés, XP de combat).

### T5 — Le coffre craftable, un contenu par instance (`D-121`)

- **Recette** (données) : Nv.10, **5 bois + 5 branches + 5 herbes** (`Q-63`), `cout_eclats` provisoire 20, station Atelier, `visible_si` niveau 10. Catégorie de sortie : **station**, pas item de poche.
- **Une recette de catégorie « station » ouvre le mode Construction** à la fabrication, avec le fantôme de la station produite, placement **dans la grille de la Maison** (`placement.js`, spec 05 inchangée). `A`/`B` ramènent à la liste de Construction ; `MENU` sort. **Dehors : rien** (`Q-07` gelée). Sortir sans poser : la station est dans la liste de Construction, pas perdue.
- **Contenu par instance** : `save.maison.stations[i].contenu` pour les stations de rôle coffre ; le coffre de base devient l'instance 0 et **hérite** du `save.coffre` d'aujourd'hui (migration, testée sur les dix sauvegardes réelles). `INTERACT` ouvre **ce coffre-là**. Capacité (10 × 20) portée par le **type** (`stations.json`), résolue par la fonction de T1. Le tri est **manuel**, aucun filtre, aucun lien entre coffres — ils viendront (§4).
- **Aucune limite de nombre** de coffres autre que la place dans la grille (Xav : « 5 ou plus »). Vérifier que la praticabilité du couloir (BFS de `placement.js`) tient avec six coffres posés.
- `stations.json` : entrée coffre déjà `placable` — vérifier qu'une **seconde instance** ne demande aucune ligne de code de système ; si elle en demande une, c'est ce que le ticket livre.
- Test : fabrication → mode Construction avec le bon fantôme → pose → deux coffres, deux contenus → sauvegarde rechargée → les deux tiennent.
- Touche : `recipes.json`, `stations.json`, `schemas.js`, `save.js` (migration), `main.js`, `ui/menu.js` (la liste de Construction reçoit une station de plus — aucune structure nouvelle), tests. **Le plus lourd de la file** : seul, avec `npm test` et les trois profils.

### T6 — Une recette qui ne se fabrique pas dit pourquoi (`D-122`) — *non relevé jusqu'ici, Xav 22/09*

- Aujourd'hui une tuile de Craft en surbrillance peut ne rien faire à l'action, sans indication (exemple : la pioche déjà possédée, « 1/1 »). Règle déjà posée le 21/09 (`Q-39` ⑥) : **grisé est un indice, jamais un verrou** — l'action réelle est toujours tentée, le résultat fait foi.
- `recipes.js#peutFabriquer` rend **une raison** (code) en plus du booléen : `deja_possede` (recette à exemplaire unique — champ `unique` en données sur la recette, pour outils et arme), `ingredient_manquant` (lequel), `eclats_insuffisants`, `poche_pleine`. Une tuile infabricable est **grisée** et sa fiche porte **une ligne de raison** (clé de locale, FR/EN, contrôlée au démarrage par `clesTexteFiches`) : « Tu possèdes déjà cet objet », « Il manque 3 branches », « Il manque 8 éclats », « Ta poche est pleine ».
- Touche : `recipes.js`, `main.js#obtenirEntreesCraft`, `locales/*`, un test. `ui/ecran_fiches.js` ne bouge pas : une raison est une ligne de fiche comme une autre (`D-103` reste ouverte : c'est une chaîne).

### T7 — Le puits ne rapporte de l'XP que sous 90 % de soif (`D-123`, `Q-43`)

- Données seules si `survival.json` porte déjà un seuil ; sinon un champ `seuil_xp` sur la jauge, lu au même endroit que la règle actuelle de `D-58` (« l'XP tombe si la jauge a bougé »), qui devient « l'XP tombe si la jauge était **sous le seuil** avant de boire ». Une ligne, un test, le seuil en données.

### T8 — Le follet à la première maison (`D-124`) — texte de Xav

- **Déclencheur** : la **première fois** que le toit s'efface (le héros entre sous le toit — c'est le signal existant de `structures.js`) ou, à défaut, l'entrée dans un rectangle « Maison » de `scenes.json#zones` — Claude Code choisit le plus simple des deux, **sans code nouveau de déclencheur** si le patron de `D-61` (flag persisté + condition → une ligne, une seule fois) le permet.
- **Texte (Xav, 22/09, à garder tel quel, EN à proposer)** : « Oh, regarde, quelqu'un a laissé des stations ici. Regarde vite, va voir ce qu'il y a à l'intérieur. »
- Données seules : dialogue, flag, locales. C'est l'exemple de ce que T9 généralisera.

### T9 — Lore diffus du follet pour les choses de base (`D-125`) — *après validation en jeu de T1 à T8*

- **Xav écrit, Claude propose.** Indices, jamais consignes, au **premier** événement de chaque chose de base — patron `D-61`, données seules, FR/EN.
- Déclencheurs proposés : première poche pleine · première herbe · premier objet rangé au coffre · Nv.10 atteint (*sans nommer* ce qui s'ouvre) · premier coffre posé.
- Chaque texte est une **proposition** dans les locales, marquée au journal. Gabarit : ce que le monde permet, jamais ce qu'il faut faire.

### T10 — L'icône des éclats dans les fiches (`D-103`, `Q-49`) — *optionnel, dernier*

Une ligne de fiche est une **chaîne**, donc aucune image dans aucune fiche. Remède générique : une ligne devient `{ icone?, texte }`, `ui/ecran_fiches.js` dessine l'icône via `icone_canvas.js`. Les éclats désignent leur visuel **en données** (réponse minimale à `Q-49` : une entrée « monnaie » avec `icone`, sans en faire un item de poche — `D-68` tient). Si le ticket dépasse une session, il sort de la file.

---

## 2. Ce qui ne se fait PAS dans cette file

- Porte-outils, besace, niveaux de coffre, tri automatique, entonnoirs et filtres (§4).
- La corde et tout intermédiaire de craft : `E-02`.
- Scierie, ferronnerie, nouvelles recettes de cuisine.
- Construction hors de la Maison (`Q-07`).
- Le plafond d'XP de récolte en tant que règle : mesuré, réglé **en données** si `Q-62` l'exige.
- Toute structure de menu. La durabilité des objets.
- **Haut « à booster »** (`D-116`) : c'est `E-04`, la spec suivante — pas cette file.

---

## 3. Validations dues à Xav après la file

| Id | Quoi | Comment |
|---|---|---|
| V-62 | **La poche et le coffre comptent** (T1) | Partie neuve. 4 sortes d'objets : la 5ᵉ est **refusée et ça se voit** (« Poche pleine » monte, le cooldown n'est pas mangé). Pile à 5, coffre à 20. La hache prend un slot. **Vieille sauvegarde** : rien de perdu — dis si un objet manque. Et le fond : **4 × 5 avec les outils dedans, jouable ou frustrant au premier jour ?** |
| V-63 | **Les cases disent la vérité** (T2) | Ranger l'épée : case d'attaque → **la main**. La reprendre : pas rééquipée seule. Manger le dernier fruit avec un fruit cuit en poche : **le fruit cuit prend la case**. Sans rien d'autre : **la case disparaît**. En reramasser un : elle revient. |
| V-64 | **L'herbe** (T3) | Se voit-elle au sol ? Se distingue-t-elle de la branche au premier coup d'œil (sol, tuile, case du bas) ? Sa fiche est une proposition. |
| V-65 | **Le Nv.10 ouvre les outils, et le rythme** (T4, `Q-62`) | Sous le Nv.10 : ni hache, ni pioche, ni épée à l'Atelier. Au Nv.10 : les trois, avec leur coût. Hache → bois → épée le même soir. Et **le chiffre de `R-19` bis contre la cible** : Nv.5 après la première nuit ? Nv.10 vers 40 min ? Toi tu dis si c'est **lent** ou **long** — ce n'est pas la même chose. |
| V-66 | **Le coffre crafté** (T5) | Nv.10, poche pleine (hache + 5 bois + 5 branches + 5 herbes) + éclats : mode Construction avec le fantôme, pose, ouverture : **vide**, le coffre de base a toujours ses affaires. Ranger, sauvegarder, recharger : les deux tiennent. **En poser cinq** et trier : est-ce que la Maison reste praticable, est-ce que le tri à la main est agréable ou pénible ? |
| V-67 | **Les recettes qui disent pourquoi** (T6) | Pioche possédée : tuile grisée, fiche « Tu possèdes déjà cet objet ». Épée sans bois : « Il manque 1 bois ». Sans éclats : le nombre manquant. L'action reste tentée (le grisé n'est pas un verrou). |
| V-68 | **Le puits sous 90 %** (T7) | Boire à 95 % : rien. À 85 % : « +1xp ». |
| V-69 | **Le follet à la première maison** (T8) | Partie neuve : la ligne tombe **une fois**, en entrant sous le toit, avec ton texte. Jamais deux. |

---

## 4. Hors scope, consigné (lignes `Q-` à ouvrir au ménage)

| Id | Idée | Ce qu'elle exige, pour ne pas la réinventer |
|---|---|---|
| Q-65 | **Porte-outils** (+2 slots, arme/outils seulement) et **besace** (+2 slots poche) : total 8, pile toujours 5 | Deux **modificateurs** de la capacité résolue par T1 — jamais une seconde constante. Le porte-outils est un **filtre de catégories** sur des slots : un champ du conteneur, en données, que la fonction de T1 sait déjà rendre. Équipement ou objet de poche ? Touche `E-02` (une besace est-elle un accessoire ?). |
| Q-66 | **Niveaux de coffre** (plus d'emplacements), puis **automatisation façon Minecraft** (entonnoirs, filtres, tri) | Tout repose sur le contenu **par instance** de T5 : un coffre = un type + un contenu + une position. Un entonnoir sera une station de plus qui lit et écrit le contenu d'une instance voisine — la grille de la Maison connaît déjà l'adjacence. Rien avant que cinq coffres triés à la main aient été joués (`V-66`). |
| — | **Biome nocturne ou sombre (brouillard)** où la lumière du follet changerait | Écrit par Xav, avec une annexe ou une carte. `D-35` close en l'état. |

---

## 5. Verdicts du 22/09 à reporter au ménage (Xav clôt lui-même les `V-` et `Q-`)

| Ligne | Verdict |
|---|---|
| V-45 | **ok** — « ne fige plus depuis longtemps, le jeu fonctionne, tout va bien » |
| V-36 à V-44, V-46 (file Nv.0→10) | **ok** — « vu, non contesté : parfait » |
| V-53 (polish interface) | **ok** — « c'est OK » (lève le « trop léger, pas vu ») |
| V-55 (grain en marchant) | **ok** — « rien à dire » |
| V-27 (menus au doigt) | **ok** — « tout est parfait » |
| V-59, V-60 | **ok** — « parfait » |
| V-61 (Auto sur Pentium + A04) | **ok** — « validés haut la main » ; « toutes les plateformes sont jouables » |
| Q-60 | **(a)** — Moyen par défaut, Bas au tactile : c'est le comportement livré. Close. |
| Q-43 | **oui**, seuil 90 % → T7 |
| Q-45 | herbe = 1 XP → T3 ; plafond non rouvert |
| Q-46 | **validé, parfait** — close |
| A-06 | **fait** — « ça n'a rien changé, Firefox n'était pas la cause principale ; c'est l'A04 qui est trop faible ». Close ; alimente `Q-24` (les plateformes sont jouables avec les réglages — la politique navigateurs peut se clore à « Chrome conseillé, les autres tournent »). |
| D-35 | **close** — lumière parfaite, ne bouge que pour un biome sombre futur (Xav écrit) |
| D-116 | **reste ouverte, priorité montée** — « je voudrais que ma carte graphique serve à quelque chose » → `E-04` est la spec suivante |
| D-56 | en attente (modèle + capture) |

---

## 6. Notes de méthode pour Claude Code

- Lire `specs/00_ROADMAP.md` en entier, `CLAUDE.md` (sections consolidées, pas le journal), puis **ce brief**. Dans `docs/DOC_suivi-dettes.md`, **seulement** les lignes citées en tête de chaque ticket.
- Restreindre chaque session aux fichiers listés en « Touche ». Pas d'analyse globale du dépôt.
- Toute valeur numérique de ce brief est **provisoire**, en données, commentée. Un test vérifie un **contrat** (« un outil ne s'empile pas », « la pile de la poche est plus petite que celle du coffre »), jamais un chiffre (`D-52`).
- Un point non tranché : défaut retenu, `[OUVERT]`, ligne `Q-`, en tête du rapport. S'arrêter seulement sur un format de sauvegarde ou un contrat entre modules — T5 en contient un, tranché ici (contenu par instance).
- Fin de file : archiver le journal, mettre à jour l'INDEX, clore les `D-` livrées, ouvrir `V-62` à `V-69` et les `Q-` de ce brief, reporter §5. Reporter dans `CLAUDE.md` la **répartition des rôles** et la décision **« un outil occupe un slot »** comme décisions datées du 22/09.

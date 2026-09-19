---
projet: RPG V2
episode/session: Nuit du 19 au 20/09 — session autonome
type: brief de session longue (file de micro-tickets)
version: 1.3.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [A-03, D-27, D-28, D-29, D-30, D-31, Q-24, Q-25, Q-26, Q-27, Q-28, spec 07 (Q-04, Q-05, Q-06)]
genere_par: claude
verifie_par: xav
---

# BRIEF — Nuit du 19 au 20/09 : tailles, lumière du follet, Chaos nocturne

**Changelog 1.3.0 (correction de Xav)** : l'engagement du follet est **orbite OU aura** (zone élargie), et non « ET » comme écrit en 1.2.0 · l'ordre d'injection de la NS est amendé par cette nuit (ticket 1).

**Changelog 1.2.0 (précisions de Xav)** : définition de l'engagement du follet (corrigée en 1.3.0) · le follet aura **un** emplacement d'équipement, amulette (offensif) ou talisman (défensif, support) — tranche D11④, doc seule.

**Changelog 1.1.0 (réponses de Xav, 19/09 fin de soirée)** : principe d'équilibrage consigné (§0 bis) · **nouveau ticket `D-31`**, vitesse de base du héros · l'orbite du follet **ne change pas** (`Q-24` close) et devient une valeur résolue, comme la lumière · **la Grotte ne doit pas changer** : la lumière réduite ne s'applique qu'à l'extérieur (ticket 4 réécrit) · **pas de lueur sur les monstres** : Xav veut être surpris (`Q-25` inversée) · `D-30` touche aussi les follets de la cinématique par leurs visuels, jamais par `intro.js`.

## 0. Règles de la nuit (lire en entier avant tout)

La règle « un sujet par ticket, une session par ticket » existe parce que les grosses sessions d'un seul bloc se relisent mal. Cette nuit la respecte autrement : **c'est une file de micro-tickets, pas un gros ticket.** Le modèle est la nuit du polish du 18 au 19, qui s'est relue d'un coup d'œil.

1. **Branche `nuit-2026-09-19`**, créée depuis `main`. Jamais de `push`. Jamais de travail sur `main`.
2. **Un ticket = un commit**, l'identifiant dans le titre, **dans l'ordre du §1**. `npm test` vert avant chaque commit.
3. **L'ordre sert au matin** : Xav doit pouvoir fusionner « jusqu'au commit N » et laisser le reste. Ne jamais mêler deux tickets dans un commit, ne jamais revenir modifier un ticket précédent depuis un ticket suivant (si c'est nécessaire : le dire dans le rapport, commit séparé et nommé).
4. **Ticket en échec** (tests rouges non réparables dans son périmètre, ou arrêt obligatoire atteint) : `git restore` de son travail, une entrée dans le rapport, passer au ticket **indépendant** suivant. Les paliers de `07` sont chaînés : un palier en échec **arrête la chaîne 07**, pas la nuit.
5. **Arrêts obligatoires, sans exception** : format de sauvegarde ou migration · contrat entre modules · décision verrouillée de `CLAUDE.md`. On ne choisit pas : on s'arrête sur ce ticket et on rapporte.
6. **Initiative** : dans le périmètre d'un ticket, retenir une valeur par défaut, la marquer `[OUVERT]`, ouvrir la ligne `Q-`. Hors périmètre : une ligne `D-` ou `Q-`, aucune correction.
7. **Lecture bornée** : chaque ticket liste ses fichiers. Aucune exploration globale du dépôt. Dans le suivi, ne lire que les lignes citées.
8. **Personne ne regarde l'écran cette nuit.** Tout ticket qui touche au rendu est livré « tests verts, **validation en jeu due** » : ouvrir sa ligne `V-`. Ne jamais écrire « validé ».
9. **Si le contexte devient court** : s'arrêter à une frontière de commit et écrire le rapport. Une nuit à moitié faite et propre vaut mieux qu'une nuit complète et illisible.
10. **Identifiants** `D-27` à `D-31`, `Q-24` à `Q-28` : proposés d'après le suivi v1.7.0. Si l'un est pris, prendre le suivant libre et le dire.

## 0 bis. Principe d'équilibrage (décision Xav, 19/09) — à consigner dans `CLAUDE.md` au ticket 1

> **Les valeurs de base du début de jeu sont basses, et tout grandit ensuite** par l'équipement, les niveaux, les buffs : taille et vitesse du héros, portée de l'arme, lumière et orbite du follet. « Là, maintenant, ce sera dur à jouer ; plus tard, ce sera normal. »

Conséquence d'architecture, et la seule : **une valeur de base destinée à grandir n'est jamais lue directement par un système.** Elle passe par une fonction pure de résolution (base en données → valeur effective), qui rend aujourd'hui la base telle quelle. Cette nuit, cela concerne la lumière et l'orbite du follet. **Ne livrer aucun buff, aucun équipement, aucun modificateur** : seulement le point d'entrée unique, testé. Ne pas généraliser au-delà des valeurs citées par les tickets.

**Décision Xav (19/09), à consigner au ticket 1, doc seule — tranche D11④ de la carte mentale (« follet équipable ? ») : oui.** *A priori* **un seul emplacement** sur le follet, qui reçoit soit une **amulette** (capacités plutôt offensives), soit un **talisman** (capacités plutôt défensives, de support). Exemple d'effet donné par Xav : orbite × 2, pour aller frapper des monstres plus loin du héros. L'orbite pourra aussi grandir avec la portée, le niveau et les stats du follet. **Rien de tout cela n'est livré cette nuit** : ni emplacement, ni objet, ni champ de sauvegarde. `Q-27` s'ouvre et se clôt sur cette décision ; la spec viendra avec celle des armes et de l'équipement (`E-02`).

## 1. La file

| # | Ticket | Commit |
|---|---|---|
| 1 | Doc : NS de la soirée + relevés de base | `DOC ns rendu-navigateurs + releves de base` |
| 2 | `D-27` Héros à 9 px | `D-27 heros : echelle 9 px` |
| 2 bis | `D-31` Vitesse de base du héros | `D-31 heros : vitesse de base -25 %` |
| 3 | `D-28` Follet −25 % en jeu, orbite inchangée | `D-28 follet : echelle de jeu -25 %` |
| 4 | `D-29` Lumière du follet ramenée à l'aura, **à l'extérieur seulement** | `D-29 follet : lumiere au rayon de l'aura (exterieur)` |
| 5 à 8 | `07_chaos-nocturne` paliers A, B, C, D | `07-A …`, `07-B …`, `07-C …`, `07-D …` |
| 9 | `D-30` Follet « aérien » — **proposition**, en dernier pour rester détachable | `D-30 follet aerien (proposition)` |

Hors de cette nuit, et toujours suivants dans l'ordre : `D-17`, `D-25`, `D-13`.

---

## Ticket 1 — Doc seule

Ménage de journal, puis appliquer `docs/NS_decisions-rendu-navigateurs_2026-09-19.md` (ranger `docs/DOC_navigateurs.md`). **Son §5 (ordre d'injection) est amendé par ce brief**, décision de Xav : tailles, vitesse et lumière → `07` paliers A à D → `D-30`, **puis** `D-17`, `D-25`, `D-13`, `D-01`, `D-16`, reprise de `Q-07`. Inscrire cet ordre-là dans `CLAUDE.md` et la ROADMAP. Ajouter au registre §6 du suivi les **relevés de base avant contenu** (Xav, Chrome, F11, 1920×1080, échelle naturelle 4, manette, protocole de traversée) :

- `R-14` **jour** : 59,9 fps, 0 frame sautée, `maj()` 0,05 ms (p95 0,10), `dessiner()` 0,34 ms (p95 1,40), 38 recalculs à 1,13 ms (max 1,60). 0 monstre, 4 interactifs, 5 objets.
- `R-15` **nuit** : 59,9 fps, 0 frame sautée, `maj()` 0,06 ms (p95 0,20), `dessiner()` 0,32 ms (p95 0,80), 37 recalculs à 0,73 ms (max 1,60). Clôt `A-03`.

Ouvrir `D-27` à `D-31`, `Q-25` à `Q-28` (texte : tickets ci-dessous) ; `Q-24` s'ouvre et se clôt (orbite inchangée, décision Xav). Consigner le principe du §0 bis dans les décisions de `CLAUDE.md`, daté. Dans `specs/07_chaos-nocturne.md` §6, remplacer la référence de coût (`R-02`, « marge ≈ 4,6 ms », mesurée sous un autre navigateur) par `R-15` ; sous Chrome le signal est **frames sautées** et **`maj()`**, pas `dessiner()`.

---

## Ticket 2 — `D-27` : héros à 9 px

**Intention (Xav, playtest du 19/09 au soir).** Remettre des proportions justes, et pouvoir se déplacer librement même dans les petits endroits : **la hitbox qui rétrécit est voulue**, pas un effet de bord. Le héros est encore trop gros dans le cadre. Il était à 14, il est à ≈ 12 (échelle 0,88 de ce matin), Xav le veut à **9**.

***Révise*** la décision datée du matin (0,88), à consigner comme telle. **Ne révise pas** la décision verrouillée qui l'accompagne : **une seule échelle, en données, pour le visuel et la hitbox.**

**Changement.** L'échelle passe à **9/14 ≈ 0,643**. Si la mesure de base n'est pas 14 : appliquer le rapport 9/12,32 à l'échelle actuelle, et le dire. *Provisoire.*

**Périmètre de lecture.** Le fichier de données qui porte l'échelle du héros · `src/entities.js` · dans `src/scene.js`, la résolution du déplacement · les tests qui figent 0,88 (à mettre à jour **volontairement**, en le disant).

**À vérifier et à rapporter, sans rien « corriger »** — une ligne chacun :
`TOLERANCE_COIN_PX` est en pixels absolus : rapporté à une hitbox plus petite, il pèse plus lourd · seuil d'interaction (mesuré depuis quoi ?) · distance de contact des monstres · portée de « mains nues » (en tuiles : inchangée, mais paraît plus longue) · anneau d'attaque, ombre, poussière (règle : aucun effet ne dépend de la forme du héros) · points d'arrivée des portails et de réapparition.

**Validation due (Xav).** Grotte et Région Maison : lisibilité du héros de jour **et de nuit**, passages entre les arbres, ressenti de vitesse (un héros plus petit à vitesse égale paraît plus rapide), amplitude du saut de coin (`D-04`).

---

## Ticket 2 bis — `D-31` : vitesse de base du héros

**Intention (Xav).** Dans le même mouvement que la taille : baisser la vitesse de déplacement **de base**, pour la faire grandir plus tard (équipement, niveaux). Principe du §0 bis.

**Changement.** Xav n'a pas donné de chiffre. Par défaut, **`[OUVERT]` → `Q-26`** : **×0,75**, proche du rapport de taille du héros (0,73) — à taille et vitesse réduites ensemble, le ressenti à l'écran reste voisin de celui d'aujourd'hui. Une seule valeur, là où vit la base de la vitesse (terme de base de la stat dérivée, en données). *Provisoire.* Ne toucher ni à la formule ni au poids de l'Agilité.

**Périmètre de lecture.** `src/stats.js` et ses données · le test qui fige la vitesse.

**À rapporter.** Ancienne et nouvelle vitesse en px logiques par seconde · temps de traversée de la carte Maison d'ouest en est, avant et après (la carte fait 170 tuiles : −25 % de vitesse = +33 % de trajet) · **rapport vitesse du héros / vitesse de poursuite des monstres**, à redonner au palier C de `07` : si le héros ne peut plus semer un monstre, le dire, ne rien régler.

**Validation due.** Ressenti au stick, Grotte et Région Maison. Ce commit est séparé du ticket 2 pour pouvoir être retiré seul.

---

## Ticket 3 — `D-28` : follet à −25 % en jeu

**Intention.** Avec un héros plus petit, le follet devient trop gros en proportion. **En jeu seulement** : la cinématique du choix garde ses tailles.

**Changement.** Une **échelle de jeu** du follet, en données, à **0,75** de l'actuelle, distincte de la taille utilisée par `intro.js`. *Provisoire.*

**Le point délicat : la frontière.** Le follet élu passe de la taille de cinématique à la taille de jeu. Décision du 19/09 sur l'intro : **aucun saut aux frontières.** Interpoler l'échelle sur la durée de l'étape de départ des follets non élus ; test sur la continuité (pas de discontinuité d'échelle d'une frame à l'autre).

**L'orbite ne change pas** (décision Xav, `Q-24` close) : réduite, elle serrerait trop le follet contre le héros, et c'est une valeur appelée à grandir (portée, niveau du follet, équipement). Seule la **taille** du follet change. Les distances de suivi et d'orbite, et le rayon de l'aura, gardent leurs valeurs. **Ajout** : la distance d'orbite est désormais lue à travers une fonction pure de résolution (§0 bis), qui rend la base telle quelle ; test : valeur effective = valeur actuelle, au pixel.

**Définition de Xav, qui fait foi (corrigée en 1.3.0)** : la **zone d'orbite** est une valeur à part entière, mesurée autour du **héros**. Le follet **engage** un monstre quand celui-ci est **dans la zone d'orbite OU dans l'aura du follet** — l'une des deux suffit. La zone d'engagement est donc **élargie** : l'union du disque d'orbite (centré sur le héros) et du disque d'aura (centré sur le follet). Un monstre hors de portée d'orbite mais dans l'aura active du follet est engagé. Il n'existe pas de « distance d'engagement » distincte.

**Lecture de Claude, à vérifier dans le code** : le follet lui-même ne sort pas de la zone d'orbite ; l'allonge maximale vaut donc **orbite + aura** depuis le héros, et elle est bornée. Si rien ne borne la position du follet, l'aura le suit et l'engagement pourrait s'étirer de proche en proche : le dire.

**À rapporter, sans rien modifier** : les distances du follet présentes en données (suivi, orbite, aura…), leur valeur, leur rôle ; **si la condition d'engagement de `companion.js` correspond à cette définition (OU, pas ET)**, et **ce qui borne la position du follet**. Si elle diffère : ligne `D-`, avec l'écart décrit en une phrase. Ne pas corriger cette nuit (comportement de combat, hors périmètre).

**Périmètre de lecture.** `src/companion.js` · `src/intro.js` · l'entrée de données du follet et ses visuels · leurs tests.

**Validation due.** Partie neuve : cinématique inchangée, transition sans saut, proportions héros/follet en jeu.

---

## Ticket 4 — `D-29` : la lumière du follet ramenée à l'aura, à l'extérieur seulement

**Intention (Xav).** Dehors, la nuit : « l'effet est très bien mais il éclaire presque tout l'écran, ce qui casse l'effet nocturne. » La lumière du follet se réduit **au rayon de l'aura**, puis un **fondu court**. Choix assumé comme drastique : partir du minimum et la faire grandir plus tard (§0 bis).

**Contrainte ferme : la Grotte ne change pas.** Xav l'aime telle qu'elle est — lumières, petits décors, leviers — et on y reviendra souvent. **Critère d'acceptation : dans les deux salles de la Grotte, les paramètres de lumière du follet (rayon, profil du fondu, teinte) sont identiques à ceux d'avant ce ticket**, vérifié par test.

**Conception.**
- Le follet porte en données son profil de lumière **de base**, minimal : rayon = rayon actuel de l'aura, fondu extérieur ≈ **6 px logiques**. *Provisoire.* Champ propre (`lumiere`), initialisé à la valeur de l'aura : les deux divergeront.
- **Une scène peut déclarer son propre profil de lumière du follet**, dans son JSON. Les deux salles de la Grotte le déclarent, avec **les valeurs d'aujourd'hui recopiées** (commentaire : lieu où le follet brille plus fort). La Région Maison n'en déclare pas : elle reçoit la base.
- Par défaut, **`[OUVERT]` → `Q-28`** : l'intérieur de la Maison garde lui aussi les valeurs d'aujourd'hui. Xav n'a parlé que de la nuit dehors.
- Le rendu lit le résultat d'une **fonction pure** (follet + scène → profil effectif). Aucun buff livré.
- Dehors, garder ce que Xav aime : la teinte chaude et la douceur **à l'intérieur** du disque.

**Interdits.** Les lumières de scène (`scenes.json#lumieres`), la fenêtre de la maison, les faisceaux de la Grotte, les valeurs d'obscurité jour/nuit, le décor et les leviers de la Grotte.

**Périmètre de lecture.** Dans `src/render.js`, la génération du calque d'obscurité et ses halos · `src/companion.js` (position de la lumière) · les données du follet · `data/scenes.json` (schéma de scène dans `src/schemas.js`).

**Validation due.** Nuit en Forêt et approche de la maison : l'effet nocturne. Grotte : **rien ne doit avoir bougé**.

---

## Tickets 5 à 8 — `specs/07_chaos-nocturne.md` v1.1.0, paliers A, B, C, D

La spec fait foi. Un palier = un commit. **Additifs de cette nuit :**

1. **Pas de branche `chaos-nocturne`** : tout sur `nuit-2026-09-19`.
2. **Coût** : référence = `R-15`. Livrer dans le rapport le `maj()` mesuré par le bot headless, plafond de monstres atteint, comparé à zéro monstre. Aucune optimisation.
3. **Palier D : aucune lueur sur les monstres** (décision Xav). Avec une lumière d'environ 1,5 tuile, un monstre n'est visible qu'au dernier moment : **c'est voulu**, Xav veut être surpris, et la lumière grandira. Le palier D s'en tient à la spec : la **zone** de Chaos se devine de loin, pas les créatures. `Q-25` reste ouverte (« à voir une fois en jeu ») ; si elle se rouvre un jour, ce sera en données seules.
4. **Héros plus petit et plus lent** : le contact monstre/héros utilise la hitbox du ticket 2 (test). Au palier C, redonner le rapport de vitesses du ticket 2 bis.
5. **Pour que Xav voie des monstres au matin** : dire dans le rapport **quelle sauvegarde de `docs/sauvegardes/` est au niveau ≥ 5**, et **comment forcer la nuit** avec ce qui existe déjà. Ne créer aucun outil de triche ; s'il n'existe rien, le dire.

Les arrêts de la spec restent entiers : pas de migration de sauvegarde, pas d'XP inventée, pas de recherche de chemin.

---

## Ticket 9 — `D-30` : follet « aérien » (proposition détachable)

**Intention (Xav), une idée à creuser.** Référence de *sensation* : le vif d'or — quelque chose d'aérien, léger, vif, avec de fins détails. **Pas** ses ailes ni son or : le follet garde son identité, sa forme d'élément et sa couleur. C'est une **proposition** : tout est provisoire, Xav garde, règle ou retire ce commit.

**Contenu, borné :**
- **Mouvement** : un décalage **purement visuel** autour de la position logique — vol stationnaire nerveux, micro-élans, léger dépassement aux changements de direction. Fonction pure, testée. **La position logique, l'aura, l'engagement et la lumière ne bougent pas** (pas de scintillement de l'obscurité).
- **Ornements** : deux ou trois primitives fines par élément dans `visuels.json` (filaments, anneau fin, ailettes abstraites), animées par les paramètres que `dessinerVisuel` sait déjà lire. Si l'animation exige du code nouveau dans `visuels.js` : version statique, et rapporter.
- **Sillage** : une entrée de `data/effets.json` sur le patron de `poussiere.js` (réserve fixe, aucune allocation).

**Cinématique du choix.** Xav veut aussi un petit polish du moment où l'on choisit son follet. Cette nuit, il passe **uniquement par les visuels partagés** : les ornements (et le sillage, s'il ne coûte rien) apparaissent aussi sur les trois follets de l'intro. **`intro.js`, ses étapes et ses durées ne sont pas touchés** (budget de 8 s, `V-09` encore due). Ce que Xav attend au-delà reste à lui demander : ligne `Q-` à ouvrir.

**Reste de la Grotte : polish léger, c'est-à-dire rien cette nuit.** Décor, lumières, leviers : intouchés.

**Interdits.** `intro.js` · toute valeur de jeu du follet · toute dépendance d'un effet à la forme du follet (il doit rester un visuel remplaçable, comme le héros).

**Validation due.** Entièrement à l'œil de Xav.

---

## 2. Rapport du matin (en tête du journal de session)

Un tableau, une ligne par ticket : **commit** (hash court) · **état** (livré / en échec / non commencé) · **ce que Xav regarde en jeu**, en une phrase · **valeurs provisoires** · **`[OUVERT]` retenus par défaut**.

Puis : les lignes ouvertes au suivi · les arrêts rencontrés · la sauvegarde de niveau ≥ 5 et la façon de forcer la nuit · le `maj()` du bot avec et sans monstres.

Rappel pour Xav, à recopier en fin de rapport : `git log --oneline main..nuit-2026-09-19` liste les commits de la nuit ; `git merge <hash>` depuis `main` fusionne **jusqu'à** ce commit ; `git revert <hash>` retire un seul commit.

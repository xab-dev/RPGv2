---
projet: RPG V2
episode/session: Refonte graphique des stations (le puits comme référence)
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-21
genere_par: claude
verifie_par: xav
---

# Fichier de bord — refonte graphique des stations (21/09)

Session **autonome**, branche `main`, **un commit par station** (et un commit de plus si une
station demande plus de trois itérations). Consigne de Xav : « toutes les stations doivent avoir
le même standing [que le puits] et une identité visuelle propre. On **ne touche pas aux
fonctionnalités**, ni au code déjà en place : c'est une refonte **graphique uniquement**. »
Procédure imposée : diagnostic visuel (comparer une station au puits) → conceptualisation →
application itérative. Hors scope, à prévoir : de nouvelles stations (scierie, ferronnerie,
feu de camp…).

Ce fichier est l'état de la session **sur le disque**, écrit au moment de chaque commit.

## Diagnostic d'entrée (les 4 silhouettes côte à côte, `tools/banc_visuel.html`, ×2,1, Chrome)

Le puits compte **13 primitives** ; les trois autres stations en comptent **3 chacune**. Ce
n'est pas qu'une question de quantité — c'est un vocabulaire qui manque, et il se nomme :

1. **Aucun volume.** Le puits est un cylindre vu **de trois quarts** (base + paroi + rebord).
   Table, coffre et atelier sont des **élévations de face**, plates : un rectangle et des pieds.
2. **Aucune échelle de valeurs.** Le puits empile cinq tons d'une même famille (ombre `#5a4530`
   → paroi `#6b5038` → rebord éclairé `#8a6b4a` → creux `#3a2c20` → reflet clair). Les trois
   autres ont **deux aplats**, parfois du gris pur (`#5a5a5a` pour l'atelier).
3. **Aucun accent d'identité.** Le puits a son eau bleue et son reflet — une seule touche de
   couleur franche qui dit ce que l'objet **est**. Une table brune sans rien dessus ne dit pas
   « cuisine », un rectangle gris ne dit pas « atelier ».
4. **Ombre non posée.** Les trois ombres sont centrées `dy 1` et plus larges que l'objet : un
   disque sombre qui déborde, exactement le défaut que Xav a relevé deux fois sur le puits
   (« on dirait qu'il vole »). Le puits, lui, a fini à `dy 0,4` resserré sur son contact.

## La contrainte qui commande toute la refonte : **l'empreinte ne doit pas grandir**

L'empreinte solide d'une station **est** la boîte englobante de ses primitives de dessin
(`structures.js#empreinteParDefaut`). Redessiner une station, c'est donc déplacer un mur — et
la consigne dit « on ne touche pas aux fonctionnalités ». Chaque silhouette est donc refaite
**à l'intérieur de l'enveloppe mesurée avant le ticket**, et l'inclusion est **prouvée par
test** aux trois échelles (même contrat que le §3 du test du puits, et pour la même raison).

Enveloppes disponibles, mesurées avant la session : table `22 × 12`, coffre `16 × 12`,
atelier `22 × 12`. Le puits, lui, fait `22 × 29,5` — **deux fois et demie plus haut**. Le
« même standing » se joue donc sur la facture, pas sur la présence : leur donner la hauteur du
puits demanderait d'agrandir leur empreinte, ce qui est une **décision de jeu** (`Q-47`).

| # | Station | Ce qui est livré | Fichiers | Validé en jeu |
|---|---|---|---|---|
| 1 | **Cuisine** (`visuel_table`, `D-78`) | Une table de cuisine **vue de trois quarts** : plateau en trapèze éclairé (`#96754d`) + chant avant plus sombre (`#6b5038`), **quatre** pieds au lieu de deux (les deux du fond plus courts et plus sombres, c'est ce qui fait la profondeur), une veine de bois sur le plateau. Identité : une **marmite de fonte** avec son bouillon orange et son reflet — l'exact pendant de l'eau bleue du puits, une seule touche de couleur franche —, et une **planche à découper** avec un légume posé dessus. Ombre resserrée sur le contact (`dy 1` → `dy 0,5`, 20 × 5 → 18,5 × 3,6). 3 → 13 primitives, **empreinte incluse** dans celle d'avant (22 × 11,95 au lieu de 22 × 12) | `data/visuels.json`, `tests/test_d78_…` | **ok** (Xav, 21/09) |
| 2 | **Coffre** (`visuel_coffre`, `D-79`) | Couvercle **bombé** : une ellipse dessinée **avant** le corps, qui n'en laisse voir que l'arc supérieur — le trois quarts vient ici de l'**ordre de dessin**, sans forme nouvelle. Sous sa lèvre, un **joint sombre** : c'est la seule pièce qui dit que l'objet **s'ouvre**. Plus une crête éclairée discrète sur le dos, **deux ferrures** de fer sur le corps, une plinthe sombre au sol et la plaque de serrure dorée à cheval sur le joint (l'accent de couleur, hérité du placeholder). **Trois itérations** : le premier jet se lisait comme un **tambour** — la crête, trop large et trop claire, faisait une table ronde vue de dessus ; le second manquait de séparation couvercle/corps. 3 → 9 primitives, **empreinte incluse** (16 × 11,1 au lieu de 16 × 12) | `data/visuels.json`, `tests/test_d78_…` | **ok** (Xav, 21/09) |
| 3 | **Atelier** (`visuel_atelier`, `D-80`) | Le plus pauvre des trois au départ : un rectangle **gris pur** (`#5a5a5a`, la seule couleur non tenue du jeu) et deux disques gris. Devenu un **établi** : plateau de trois quarts sur quatre pieds + entretoise, **panneau d'outils** à l'arrière (scie, marteau), **étau** qui mord le chant avant (mâchoire, tige, volant), planche en cours de travail sur le plateau. Bois **plus froid** que celui de la Cuisine, pour que les deux établis ne se confondent pas : ce qui les sépare à l'œil, c'est la **silhouette** (le panneau haut et carré) et l'accent (acier contre bouillon orange). **Deux itérations** : le plateau du premier jet, large et pâle, faisait lire l'ensemble comme un **lit**, panneau = tête de lit — rétréci et assombri. 3 → 16 primitives, **empreinte incluse** (20,4 × 11,7 au lieu de 22 × 12) | `data/visuels.json`, `tests/test_d78_…` | **ok** (Xav, 21/09) |
| 3 bis | **Atelier — contraste** (`D-80`) | Vu **en jeu** et non plus au banc (nouveau scénario `tools/scenarios/stations_maison.mjs`), l'établi **se noyait dans la terre** : son plateau et le sol de la Maison avaient presque la même valeur, et le panneau d'outils disparaissait. Le banc ne pouvait pas le dire — il juge une silhouette sur un fond neutre choisi, et c'est exactement ce que la scène corrige. L'échelle de valeurs est élargie sans toucher à une seule géométrie : panneau plus sombre (les outils s'y détachent), plateau au-dessus de la valeur de la terre, chant et pieds redescendus, scie et marteau plus clairs. Quatre captures de jeu déposées dans `docs/captures/stations-2026-09-21/` | `data/visuels.json`, `tools/scenarios/stations_maison.mjs` | **ok** (Xav, 21/09) |

## Ce que la session a appris

- **Le banc visuel ne peut pas dire si une silhouette se détache du décor.** Il la montre sur un
  fond neutre ; la scène, elle, la pose sur la terre de la Maison. L'Atelier est passé les trois
  itérations du banc avant de se révéler **noyé dans le sol** à la première capture de jeu.
  D'où le scénario `stations_maison.mjs` : un poste d'observation par station, calculé depuis les
  vrais catalogues (jamais une position recopiée), de jour, à 1920 × 1080.
- **Le trois quarts ne demande aucune forme nouvelle.** Trois moyens suffisent, tous déjà dans
  `visuels.json` : un **polygone** trapézoïdal pour une face supérieure, l'**ordre de dessin**
  pour n'exposer que l'arc haut d'une ellipse (le couvercle du Coffre), et une **paire de pièces
  décalées** — arrière plus courte et plus sombre, avant plus longue et plus claire (les pieds).
- **Une station se reconnaît à son accent, pas à sa forme.** Table et établi ont la même
  carcasse ; ce qui les sépare d'un coup d'œil, c'est la marmite orange contre l'acier du panneau
  d'outils. C'est la leçon du puits, dont l'eau bleue fait tout le travail.

## Clôture

**Session close le 21/09**, poussée sur `main` à la demande de Xav, donc **en ligne**.

- **`V-51` : ok** — « j'ai tout testé, all good ». Les quatre stations regardées dans la Maison,
  et rien n'a bougé au jeu. Consigné sur sa parole, pas décidé ici.
- **`Q-47` : tranchée — on ne touche à rien.** « C'est très bien comme ça. » Les trois stations
  gardent leur taille, et donc leur empreinte. Ce qui est à retenir pour la suite : la présence
  d'une station ne se gagnera pas en l'agrandissant, mais par ce qu'on met **autour** (décor,
  sol, lumière) ou par une station **nouvelle**, dessinée d'emblée à sa taille — c'est-à-dire par
  les stations hors scope que Xav a annoncées (scierie, ferronnerie, feu de camp).
- **Reste ouvert, et seulement ça : `D-81`** (un `cercle` a une hauteur nulle dans
  `boitePrimitive`). Sans conséquence aujourd'hui, à traiter dans un ticket à part parce que le
  corriger **changerait des empreintes existantes**.

La session ne laisse **aucune validation due**.

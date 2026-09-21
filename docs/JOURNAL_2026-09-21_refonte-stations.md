---
projet: RPG V2
episode/session: Refonte graphique des stations (le puits comme référence)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-21
genere_par: claude
verifie_par: —
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
| 1 | **Cuisine** (`visuel_table`, `D-78`) | Une table de cuisine **vue de trois quarts** : plateau en trapèze éclairé (`#96754d`) + chant avant plus sombre (`#6b5038`), **quatre** pieds au lieu de deux (les deux du fond plus courts et plus sombres, c'est ce qui fait la profondeur), une veine de bois sur le plateau. Identité : une **marmite de fonte** avec son bouillon orange et son reflet — l'exact pendant de l'eau bleue du puits, une seule touche de couleur franche —, et une **planche à découper** avec un légume posé dessus. Ombre resserrée sur le contact (`dy 1` → `dy 0,5`, 20 × 5 → 18,5 × 3,6). 3 → 13 primitives, **empreinte incluse** dans celle d'avant (22 × 11,95 au lieu de 22 × 12) | `data/visuels.json`, `tests/test_d78_…` | *dû* (`V-51`) |

---
projet: RPG V2
episode/session: Spec 11, palier B — le monde et la refonte
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 11, palier B (23/09)

Demande de Xav : « Q-106 et 108 vu non contesté. go B ». Le palier B livre les
**effets de monde** (`toit_occulte` sur la troisième option de la maison) et la
**migration de tout le catalogue** au schéma à nœuds : la bulle n'a plus qu'un
chemin.

Branche `dialogues-2026-09-23` (suite). Pas de push.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `d9cf925` | Ménage | Journal du palier A archivé, ligne INDEX ; `Q-106` et `Q-108` closes sur le verdict de Xav |
| `28165da` | Spec 11, palier B | Effets de monde, toit occulté, 22 dialogues migrés, un seul chemin. Suite : **158 fichiers verts** |

## Ce qui a été fait

- **`src/effets_monde.js`** (pur) : `creerEtatEffets`, `activer`, `tick`,
  `actif`. Réactiver repart de la pleine durée, sans cumuler. Levé à
  `duree_ms` exactement.
- **`data/effets_monde.json`** : `toit_occulte`. Une option qui cite un effet
  inconnu tombe au boot ; un effet que le CODE lit (`EFFET_TOIT_OCCULTE`) et
  qui manquerait au catalogue fait échouer la création de l'orchestrateur.
- **`main.js`** : l'état des effets vit dans l'orchestrateur, jamais dans
  `save` ; avancé dans le bloc de gameplay (gelé sous UI), remis à zéro par
  `reinitialiserPartie`. `dessiner()` : le toit reste à l'opacité 1 tant que
  l'effet est actif (`FACTEUR_EFFACEMENT_TOIT` intact).
- **La maison** : la troisième option porte
  `effets_monde: [{ id: "toit_occulte", duree_ms: 60000 }]`.
- **Migration** : les 22 dialogues en `lignes` deviennent des chaînes de nœuds
  (`l1` → `l2` par `suite`), clés et locuteurs inchangés, **aucune locale
  touchée**. Le test compare, clé par clé, contre un instantané FR/EN pris
  avant la migration et figé dans le test.
- **Un seul chemin** : `resoudreLignes` retiré ; les quinze appels de
  `main.js` passent par `ouvrirDialogueCatalogue` ; le schéma refuse la forme
  `lignes`. L'`ouvrir(lignes)` du contrôleur reste (tests, répliques déjà
  résolues) mais n'est plus qu'une chaîne de nœuds fabriquée sur place, sur le
  même moteur, sans résultat. Les tests anti-spam de la Phase 1b passent
  **sans retouche** sur ce chemin unique.
- **`dlg_recette_indisponible` gardé** (`Q-104`).

## Écarts et choix, dits

- **`mesure: false`** sur neuf répliques répétables : sans lui, l'alignement se
  farmait et la récolte était punie → `Q-109`.
- Tests d'avant ajustés, contrat inchangé : `test_d125` (nœuds au lieu de
  lignes), `test_phase1_dialogue` (`resoudreNoeud` au lieu de
  `resoudreLignes`), `test_phase2_resources` (fixture en nœuds),
  `test_phase1b_dialogue_antispam` (import retiré), et la section schéma du test
  du palier A (`effets_monde` désormais accepté, `valeurs` toujours refusé).
- `D-167` (le narrateur affiche son id) pointait `resoudreLignes` : pointeur mis
  à jour, défaut **non corrigé** (hors périmètre).
- Aucune réplique existante n'est devenue un choix : `Q-100` attend Xav.

## Vérifié sous Chrome (sans fenêtre)

`tools/scenarios/dialogue_toit.mjs`, profil PC : troisième option → toit plein
au-dessus du héros, relevé à −0,9 ; 62 s plus tard, l'intérieur se voit de
nouveau. Partie neuve : la réplique du narrateur dans la Grotte s'affiche comme
avant. Zéro erreur console. La peur de la minute sous le toit ne se juge pas en
capture.

## Ouvert pour Xav

- `V-105` ; `Q-109` (et `Q-98` à `Q-103`, `Q-105`).
- Suite : le palier C (la porte du Nv.15 et le chapitre 1) — **données seules**,
  aucun fichier de `src/`.

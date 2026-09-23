---
projet: RPG V2
episode/session: Spec 11, palier A — le choix
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 11, palier A (23/09)

Demande de Xav : « lis specs/11_dialogues-consequences.md en entier puis
procède ». Le palier A livre **la forme d'un dialogue qui a des conséquences**
et son premier cas réel : la ligne de la maison devient le premier choix du jeu.

Branche `dialogues-2026-09-23`. Pas de push.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `bf7ec0e` | Spec 11 versée | Elle était restée non suivie par Git depuis son écriture |
| `17f2c4d` | Ménage | Journal du palier C de la spec 10 archivé, ligne INDEX ; `Q-98` à `Q-103` ouvertes (les six `[OUVERT]` de la spec §11), `Q-104` (contradiction spec §6 / `D-09`) |
| `56b18d4` | Spec 11, palier A | Le moteur de conversation, la bulle à options, le tap, le dialogue de la maison. Suite : **157 fichiers verts** |

| (5) | `Q-107` : les deux à la fois | Retour de Xav après `V-104` (« tout fonctionne ») : l'appui pendant l'écriture complète la ligne **et** compte −0,25. `Q-104` tranchée (« on garde tel quel »), `V-104` validée |

## Ce qui a été fait

- **`dialogue.js`** : une couche PURE de conversation (`ouvrirConversation`,
  `avancerConversation`, `deplacerSelection`, `selectionnerOption`,
  `resultatConversation`, `erreursGrapheConversation`, `erreursTextesDialogues`,
  `resoudreNoeud`), et le contrôleur existant qui la porte
  (`demarrerConversation`, `etatConversation`, `traiterInput(etat, toucher)`).
  Même pagination, même machine à écrire, même armement ; les options ne sont
  que la fin de la dernière fenêtre, visibles une fois armée.
- **Spam et lecture** : un appui non armé est compté (−0,25) et n'avance rien,
  plafond −1 par dialogue ; zéro spam sur tout le dialogue = +0,1. Résultat
  ordonné (options, spam, lecture), appliqué par **un seul** point,
  `main.js#appliquerResultatDialogue`, qui appelle `modifierAlignement` avec la
  source `dialogue:<id>[:spam|:lecture]`. Une conversation coupée de
  l'extérieur (`reinitialiserPartie`) ne rend rien.
- **Schéma** : `lignes` OU `noeuds`, jamais les deux ; 2 à 4 options ;
  exactement une `defaut`, sans conséquence ; poids dans les bornes de
  `alignement.json` ; flags déclarés ; graphe acyclique, tout nœud atteignable ;
  `effets_monde` et `valeurs` **refusés** (palier B, `Q-105`). Les clés FR/EN de
  tous les dialogues sont vérifiées au boot (`erreursTextesDialogues`).
- **La bulle** grandit par le haut d'une rangée de 18 par option ; sa géométrie
  vit dans `hud_layout.js#geometrieBoiteDialogue`, lue par le dessin ET par le
  doigt. Les rangées s'arrêtent avant le bouton d'attaque.
- **Au doigt** : `touch.js#lireContactsNouveaux` (accesseur additif), lu une
  fois par frame dans `maj()`, résolu contre la géométrie dessinée. Un tap
  sélectionne, un second confirme, un tap sur le texte avance. La frame où le
  doigt désigne la bulle, le stick est ignoré (le doigt à gauche prend aussi le
  joystick).
- **Données** : `dlg_maison_premiere_visite` devient un choix à trois options
  (0 / +1 / −1), deux réponses du follet. Le texte d'ouverture de Xav est intact.
- **`alignement.js#appliquerDelta`** arrondit au millionième (dix lectures
  faisaient 0,9999999999999999, sous le palier 1).

## Écarts et choix, dits

- Champ `text_key` sur les nœuds et options, pas `texte` comme l'exemple de la
  spec : c'est la convention de tout le catalogue, et `test_phase2_i18n` interdit
  un champ `texte` (un texte en clair).
- Déclencheur et conditions de l'exemple de la spec (`{ flag, absent }`,
  `{ niveau: { min } }`) **non repris** : ce n'est pas le format de `flags.js`,
  et la spec elle-même dit « aucun format nouveau ». La maison reste déclenchée
  par sa ligne d'ambiance, comme la spec §0 le prévoit.
- Un nœud sans option peut porter une `suite` (réplique qui continue) : il en
  faudra au palier B pour migrer `dlg_grotte_tuto_combat` (deux lignes).
- Hors liste de fichiers : `touch.js`, `alignement.js` → `Q-106`.
- Un appui pendant l'écriture ne complétait plus la ligne, en conversation → `Q-107`. **Tranchée par Xav** : il la complète de nouveau, et reste compté (commit 5).
- Pas de compteur `spam: n` en direct dans le relevé → `Q-107`.
- Textes des options : propositions → `Q-108`.
- Trois tests d'avant ajustés, contrat inchangé : `test_d124` (la ligne de Xav
  est désormais le nœud d'entrée), `test_d61` et `test_phase2_i18n` (lisent aussi
  nœuds et options).
- Le test a été écrit **après** le moteur, pas avant (il aurait été rouge à
  l'import). Il couvre tout ce que la spec §8 demande.

## Vérifié sous Chrome (sans fenêtre)

`tools/scenarios/dialogue_choix.mjs`, profils PC 703 × 280 et téléphone DPR 3 :
la bulle s'écrit, montre trois options, la sélection descend d'un cran à la
flèche, la réponse s'affiche, la bulle se ferme ; relevé à **1,1, régime
positif, palier 1**. ~59 fps, zéro erreur console. Le confort au pouce ne se
juge pas en capture.

## Ouvert pour Xav

- `V-104` ; `Q-98` à `Q-108`.
- `V-104` validée, `Q-104` et `Q-107` tranchées : plus rien ne bloque le
  palier B (effets de monde, `toit_occulte`, migration de tous les dialogues,
  `dlg_recette_indisponible` gardé).

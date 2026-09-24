---
projet: RPG V2
episode/session: Polish libre (24/09)
type: fichier de bord
version: 1.1.0
statut: livré, à valider
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : polish libre (24/09)

Demande de Xav : « Polish libre (on ne touche pas aux fonctionnalités,
uniquement du graphisme, 3 étapes : diagnostic, plan d'action, itération.
plusieurs commits). go ». Branche `polish-libre-2026-09-24`, pas de push.

## 1. Diagnostic

Captures sous Chrome sans fenêtre, profil jetable : `polish_diagnostic.mjs`
(suffixe `d24`), `ecrans_palier_c.mjs` et `dialogue_choix.mjs` (dossier
`polish-libre-2026-09-24/avant/`), et un scénario neuf,
`tools/scenarios/polish_libre_24.mjs` (bulle, menu, jour, nuit ; grand écran
et téléphone à DPR 3).

Hors d'atteinte, et laissés tels quels : le sol, le HUD dans sa forme, les
icônes (`V-53`, `V-55` validées), la lumière du follet (`D-35`), le bleu des
menus (`Q-112`, à Xav).

**Ce qui dénote : la typographie.** Le jeu parle avec quatre voix qui ne se
connaissent pas :

| Surface | Police aujourd'hui | Effet |
|---|---|---|
| Prologue | Almendra (texte), Uncial Antiqua (titres) — embarquées | La seule surface « fantasy » |
| Bulle du follet (texte, options, nom) | `13px sans-serif` (Arial sous Windows) | La voix du follet ressemble à une boîte de dialogue de logiciel ; rupture nette avec le prologue qui la précède |
| Menus DOM (titres, cartes, fiches) | police par défaut du navigateur | Aspect « application » |
| HUD (PV, éclats, Nv.) | `monospace` | Aspect « console de debug » |

Les deux polices du prologue sont déjà chargées pour tout le jeu
(`polices.js`, `document.fonts`) : les utiliser ailleurs ne coûte ni fichier
ni octet.

Laissé sciemment en `monospace` : les indices de commande (leur largeur est
calculée et tenue par test, `D-17`, `D-171`) et la gravure de la stèle (les
hiéroglyphes de Claude Code sont ceux d'un terminal : c'est voulu).

## 2. Plan d'action

Un commit par étape, capture avant/après à chaque fois, suite de tests verte.

1. **P1 — la bulle** : texte, options et nom en Almendra, la voix du prologue.
2. **P2 — les menus** : titres (écran, carte, fiche) en Uncial Antiqua ;
   phrases en Almendra si elles restent lisibles à 703 × 280, sinon laissées.
3. **P3 — le HUD** : chiffres et niveau, à juger sur capture ; abandonné si
   les chiffres perdent en lisibilité.

## 3. Itération

| Commit | Étape | Ce qu'il faut en retenir |
|---|---|---|
| `fc0af8c` | Ménage | Journal de la surprise archivé |
| `2e012cb` | P1 — la bulle | Texte et options en Almendra 14 px (au lieu de `13px sans-serif`), nom en onciale 13 px. La pagination mesure avec la police dessinée : aucune ligne ne déborde, grand écran et téléphone. Scénario `polish_libre_24.mjs` livré avec. **183 fichiers verts** |
| `443f59b` | P2 — les menus | Deux jetons CSS (`--menu-police-titre`, `--menu-police-texte`) ; titres en onciale **sans gras** (l'onciale n'en a pas, un gras imité l'empâte), phrases, noms de tuiles, boutons en Almendra. Quantités et valeurs restent en linéale. Débordements mesurés à 703 × 280 et 1920 × 1080 : **zéro** partout. **183 fichiers verts** |
| — | P3 — le HUD | **Abandonné**, comme le plan le prévoyait. Deux essais à la capture : les chiffres d'Almendra et de l'onciale sont en bas de casse (« Nv.1 » → « Nv.I » puis « Nv.ı », le « 0 » → « O »). Fichier remis tel quel, rien de commité |

- Règle qui sort de la session : **les lettres prennent les polices du jeu,
  les chiffres restent en linéale** — un nombre se lit d'un coup d'œil, et
  les deux polices embarquées n'ont pas de chiffres alignés.
- Suivi : `D-184` ouverte et close (livrée), `V-131` ouverte (à voir en jeu).
  Au passage, le lien vers le journal de la surprise dans `Q-128` suit son
  archivage.
- **Ce que la session ne prouve pas** : le goût, et la lisibilité au pouce sur
  le vrai téléphone. Les captures sous Chrome sans fenêtre ne remplacent pas
  le regard de Xav.

## 4. Nuit du 24/09 : second tour

Demande de Xav : « Continue, polish libre. On ne touche pas aux
fonctionnalités, que du graphisme. Prends ton temps. C'est une session
nocturne. Je valide demain matin. » Même branche, mêmes trois étapes.

### Diagnostic

Captures neuves de tout le jeu après P1 et P2 : les cinq écrans maître-détail
(`ecrans_palier_c.mjs`, `RPG_DOSSIER_CAPTURES` vers `nuit/`), les postes du
monde (`polish_diagnostic.mjs`, suffixe `n24`), et de nouvelles vues dans
`polish_libre_24.mjs` (Paramètres, Stats, Coffre, Indices, un ramassage ;
`PROFILS=pc` pour le petit écran). Une sonde DOM a listé tout texte visible
resté en `sans-serif`.

- **P2 avait créé un défaut** : les chiffres d'Almendra sont en bas de casse
  dans les menus aussi. Le bouton de Stats disait « +I », le Coffre
  « 2 / IO », l'en-tête de Stats « Nv.ı — o % ». La règle « les chiffres
  restent en linéale » n'était tenue que là où je l'avais vue.
- Restaient en `monospace` : le bandeau du HUD, les textes de gain et
  **l'indice de commande**, premier texte du jeu, dans la Grotte.
- Restaient en linéale : les intertitres « Poche » / « Coffre » du Coffre,
  le bandeau de placement, les quantités des tuiles.
- Apostrophes droites mêlées aux typographiques dans les locales.
- Le monde lui-même (Grotte, pré, Maison, nuit) : rien à reprendre, il
  sort de passes validées.

### Plan

Un banc de comparaison (Almendra seule, puis Palatino, Times, Cambria,
Arial et Segoe pour les chiffres) a désigné **Palatino** : ses chiffres
alignés se fondent dans la plume (Zapf était calligraphe). Aucune des polices
embarquées n'a de chiffres alignés (pas de `lnum`), et le jeu est hors ligne :
les chiffres sont **empruntés à l'appareil** par `local()`, dans une famille
qui ne porte que les dix chiffres (`unicodeRange`), en tête de chaque pile.

### Itération

| Commit | Étape | Ce qu'il faut en retenir |
|---|---|---|
| `421f11b` | P4 — chiffres alignés | `polices.js#POLICE_CHIFFRES` ; bulle et jetons CSS des menus. « +1 », « 2 / 10 », « Nv.1 — 0 % ». Débordements remesurés : zéro. Scénario enrichi |
| `fa22435` | P5 — HUD et textes de gain | La même paire : chiffres alignés, lettres à la plume (« Nv. »). PV à 8 px, éclats et niveau à 10. Gains en gras (le contour et le gras tiennent le texte sur l'herbe). **P3 abandonné est repris ici** : son obstacle était les chiffres, levé par P4 |
| `f3a49f3` | P6 — derniers textes en linéale | Intertitres du Coffre en onciale, bandeau de placement à la plume (0.9em, tient à 703 px) |
| `fbb32c9` | P7 — indice de commande | Plume en gras de 11 px, bannière plus étroite. Rien ne dépendait d'une chasse fixe (`measureText`) ; seuls les commentaires de `D-17` et `D-171` changent |
| `074081e` | P8 — quantités des tuiles | Les mêmes chiffres que le HUD : un nombre a une seule forme dans le jeu |
| `667302c` | P9 — apostrophes | Onze textes d'interface (FR et EN). **Les dialogues ne bougent pas** : ce sont les textes de Xav, tenus mot pour mot par test → `Q-129` |

- Règle, révisée : **les lettres prennent les polices du jeu, les chiffres
  prennent des chiffres alignés** — plus jamais de chiffres bas de casse, et
  plus de `monospace` hors de la stèle et des hiéroglyphes.
- Suivi : `D-185` ouverte et close, `V-132` ouverte (révise la phrase sur
  les chiffres de `V-131`), `Q-129` ouverte (apostrophes des dialogues,
  ligature « ſt »).
- **Ce que la nuit ne prouve pas** : les captures sont prises sous Windows,
  qui a Palatino. Sur le téléphone, la liste `local()` cherche Noto Serif
  puis d'autres ; si aucune ne répond, les chiffres d'Almendra reviennent
  (l'état de P2, rien ne casse). C'est à regarder en premier dans `V-132`.
- Tests : **183 fichiers verts** à chaque commit.

## Patch hors file : la pomme d'amour au papyrus (24/09, demande de Xav)

- `rec_pomme_amour` : 1 fruit cuit + **1 papyrus** (au lieu de 3 herbes) — la
  pomme emballée, cuite dans son emballage. Mécanique inchangée. Quantité
  retenue par défaut : `Q-130`. Tests : 183 fichiers verts.

## Patch hors file : l'XP d'une fabrication se voit (24/09, `D-186`)

- Xav croyait que certains crafts ne donnaient pas d'XP : tous en donnent,
  rien ne le disait. Fiche Craft : « Rapporte N XP » ; « +N xp » depuis la
  station (monte à la fermeture du menu). Valeurs d'XP intactes (Xav).
  Tests : 184 fichiers verts.

## Ticket : l'écran Craft trié (24/09, `D-187`)

- Tri par type (`data/recipe_categories.json`, ordre du fichier), puis coût
  total (ingrédients + éclats), puis nom — choix de Xav. Pas d'intertitres
  (Xav y réfléchit). Atelier : corde → papyrus → bois → hache → pioche →
  besace → épée → coffre. Cuisine : pomme d'amour → fruit cuit → pomme cuite.
  Tests : 185 fichiers verts.

## Spec 13 écrite : lisières de la carte + performance (24/09)

- `specs/13_lisieres-performance-carte.md` v1.0.0, brouillon, aucun code.
  Demande de Xav : `Q-52` (les lisières) + la performance générale, à
  régler avant l'Annexe 1. Six paliers : A mesurer, B tampons (`D-153`),
  C bande entrante (`D-01`), D lisières mécanisme (herbe/chemin), E
  catalogue + presets, F budget de la carte pour l'Annexe. Forme de la
  lisière (déléguée à Claude par `E-04`) : bord dentelé à fondu court.
  Questions `Q-131` à `Q-135` listées dans la spec, **pas encore ouvertes
  au suivi** : elles le seront au palier qui les pose.

## Patch : la zone de Chaos sud au Nv.10 (24/09, `D-188`)

- Données seules (`scenes.json`, `spawns.json`), miroir de la zone nord-est
  dans le Champ sud. `test_07a` éprouve la vraie table au lieu de sa copie en
  mémoire. Proposition : `Q-136` (une ligne d'ambiance). Tests : 185 verts.

## Spec 14 écrite : l'Annexe 1 (24/09)

- `specs/14_annexe-1.md` v1.0.0, brouillon, aucun code. Scénario dicté par
  Xav repris au §3 ; huit paliers (A niveaux → H boucle). Deux bloquants :
  **B1** (dégâts de la compétence sur Esprit, contre D1⑧ verrouillée) et
  **B2** (RB/Tab/toucher = déjà `target_next`). Questions `Q-137` à `Q-147`
  listées dans la spec, pas encore ouvertes au suivi.

## Spec 14 v1.1.0 : réponses de Xav (24/09)

- B1 : Esprit = coefficient sur la Force des compétences + hâte (charge et
  recharge) — **révise D1⑧** (consigné dans `CLAUDE.md` et la carte mentale).
  B2 : `target_next` contextuel, état `poste` du follet (base du futur
  « follet agentique »). Marche dans l'ombre confirmée. `Q-143` oui (Zéros =
  la seconde main, récurrent). `Q-147` : respec, compétences en cartes dans
  Stats (X / Y ; B3 → `Q-148`) et re-choix du follet entrent en palier I, avec
  une migration de sauvegarde v8 → v9.
- Spec 14 v1.2.0 : salles du sud vers le nord, sortie près de la stèle rouge
  (`Q-139`) ; B3/`Q-148` : la fiche affiche 1 = X, 2 = Y, 3 = B, A choisit
  l'emplacement, équiper remplace.

## Polish du soir : les flaques et la plume (24/09)

Demande de Xav (fin de semaine, 4 % de budget) : les flaques manquent de
variété, et la plume n'a pas été reprise depuis longtemps. Branche
`polish-flaques-plume-2026-09-24`.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `78e9e03` | `D-189` — les flaques | Quatre dessins de plus, poids partagé au même rang : le décor ne bouge pas (vérifié). `V-133` ouverte. Tests : 185 fichiers verts |
| (voir log) | `D-190` — la plume | Rachis courbe, dégradés au lieu d'une tranche blanc/noir, bandes et barbes couchées vers la pointe (d'après la photo de Xav). Rotation cuite dans les points : l'icône de la Poche ignore la rotation d'une primitive. `V-134` ouverte. Tests : 185 fichiers verts |

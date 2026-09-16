# RPG V2 — SPEC : Phase 1b, Polish et verrouillage de la Grotte

**Version : 1.0.0** — 2026-09-16. Phase 1 (Grotte) livrée, corrigée cinq fois, **validée par Xav à la manette réelle le 2026-09-16** (fluide, déplacements et affichage corrects — dette « manette jamais testée » fermée). Tactile testé aussi : imperfections mineures (sélection du follet au stick), **dette assumée** jusqu'à l'arrivée des compétences, hors de cette spec.

**Contexte déjà disponible pour Claude Code** : `CLAUDE.md` (tous les journaux, en particulier la règle de méthode née de `SD_dialogues-invisibles` sur la transform du contexte 2D, et `specs/CHECKLIST_visuelle.md`), `specs/00_ROADMAP.md`, `specs/02_grotte.md` (§3.1 cinématique, §3.5 feedback d'attaque jamais implémenté, §3.6 follet), `specs/MT_rendu-net_2026-09-15.md` (décision : **pas de pixel art**, style « assemblage moderne »), `specs/carte_mentale_RPG_V2_v1_3_0.md` §7 (règle d'architecture directrice) et D15① (décor procédural déterministe non-collisionnant). Patrons à **réutiliser** : `creerControleurMenu()` / point de décision unique « une UI est ouverte » dans `main.js#maj()`, PRNG `mulberry32` de `decor.js`, faux contexte 2D enregistreur de `tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js`.

---

## 1. Rôle du module

Cette itération **ferme la Grotte** : elle devient la référence de direction artistique de tout le jeu, le point de respawn définitif, et l'intro que chaque joueur voit une fois. Rien de nouveau côté gameplay ; tout ce qui est posé ici (catalogue visuel, anti-spam des dialogues, feedback de combat, obscurité par scène, machine à états d'intro) est réutilisé tel quel jusqu'à Boss 1.

Quatre paliers **séquentiels** — l'ordre est imposé, chaque palier est stable seul :

| Palier | Contenu | Pourquoi cet ordre |
|---|---|---|
| **1** | Feedback de combat (§3.1) + anti-spam des dialogues (§3.2) | Indépendants du rendu, testables headless, corrigent deux défauts joués par Xav |
| **2** | Catalogue visuel en données — « emoji-IA-art » verrouillés (§3.3) | Prérequis explicite de Xav pour l'intro : on n'anime pas des silhouettes qui vont changer |
| **3** | Polish des deux salles (§3.4) | Consomme le catalogue du palier 2 |
| **4** | Intro cinématique ≤ 10 s (§3.5) | Consomme les silhouettes verrouillées ; c'est « l'intro principale du jeu, hollywood-like » (Xav) |

Critère de la phase : Xav rejoue la Grotte de bout en bout et **valide la direction artistique** — c'est ce verdict qui ouvre la Phase 2 (Maison).

---

## 2. Entrées / Sorties

### 2.1 Catalogues et schémas

| Catalogue | Changement | Champs |
|---|---|---|
| **`visuels.json`** (nouveau) | Catalogue de silhouettes et motifs : héros, 3 follets, monstre, levier on/off, porte, et tous les motifs de décor | `id` (`visuel_*`), `ancre` (`centre` / `bas` — où se pose le point (x,y) de l'entité), `primitives[]` ordonnées (dessin de la première à la dernière) : `{ forme, dx, dy, w, h, couleur, alpha?, rotation?, points? (polygone), degrade? }`. `forme` ∈ `cercle`, `ellipse`, `rect`, `polygone`, `ligne`, `degrade_radial`. `ombre?` : `{ dy, w, h, alpha }` — ellipse sombre dessinée **avant** les primitives, sous la silhouette. `teintable?` (bool) : les primitives marquées `teinte: true` prennent la couleur passée à l'appel (héros → couleur du compagnon). Une entrée = un `id` de plus, zéro code. |
| `tiles.json` | `render` peut référencer un `variantes[]` (2-3 rendus alternatifs choisis par graine) et une `variation_teinte` (±%, provisoire ~4) | déterministe à `seed` fixe |
| `enemies.json`, `companions.json`, `puzzles.json` | `render.visuel` → référence croisée vers `visuels.json` (validée au boot, échec dur si absente). Les champs `render` actuels (forme/couleur inline) sont **remplacés**, pas doublés | — |
| `scenes.json` | **`obscurite`** passe de bool à objet `{ "opacite": 0.72 }` (absent = scène claire ; un bool résiduel = échec de validation avec message clair — les 3 scènes actuelles sont migrées dans ce ticket). **`lumieres[]`** : + `type` (`halo` par défaut ; `faisceau` avec `angle` (deg), `ouverture` (deg), `longueur` (px), `alpha`). **`decor`** (nouveau) : `{ densite, motifs: [{ visuel, poids }] }` — la densité `0.15` de la Phase 0 (constante provisoire) devient une donnée par scène. **`intro`** (uniquement `scene_grotte_salle_1`) : durées de la cinématique, voir §3.5. | toutes valeurs provisoires, commentées |
| `hero` (données de départ, là où vit l'arme par défaut) | `render.visuel` + `couleur_neutre` (avant choix du follet) | provisoire |
| `locales/*.json` | Aucune chaîne nouvelle attendue (l'intro est non narrée). Si une apparaît, FR **et** EN | — |
| Sauvegarde | **`schema_version` inchangée** : la couleur du héros est dérivée de `hero.companion`, jamais stockée ; l'intro est rejouée ssi `flag_follet_choisi` est absent (comportement existant) | — |

### 2.2 Constantes centralisées (un seul endroit chacune, commentées, **provisoires**)

- `DELAI_ARMEMENT_DIALOGUE_MS = 350` — délai minimal entre l'affichage complet d'une ligne et sa fermeture possible.
- `MACHINE_ECRIRE_MS_PAR_CARACTERE = 25`.
- `FLASH_ATTAQUE_MS = 120`, `FLASH_TOUCHE_MS = 80`.
- `BARRE_PV_MONSTRE = { largeur: 20, hauteur: 3, decalage_y: -14 }` (px logiques).
- `AURA_TRAIT = { largeur: 1, pointilles: [4, 4], alpha: 0.25 }`.
- `rayon_lumiere: 110` dans `companions.json` : **validé par Xav le 2026-09-16, retirer la mention provisoire.**

---

## 3. Comportement attendu

### 3.1 Feedback de combat (palier 1) — décision : **les deux**, flash et barre de PV

Xav a isolé et confirmé que l'attaque fonctionne (dégâts appliqués) mais **sans aucun retour visuel**. Trois retours, tous dans le rendu, aucun dans la logique de combat :

1. **Anneau d'attaque** (déjà spécifié en `02_grotte.md` §3.5, jamais implémenté) : à chaque `ATTACK` **effectif** (hors cooldown), l'anneau `[portee.min, portee.max]` de l'arme apparaît autour du héros en blanc translucide pendant `FLASH_ATTAQUE_MS` puis disparaît. Un `ATTACK` pendant le cooldown ne produit **rien** — un flash sur un coup qui ne part pas ferait croire au joueur qu'il a frappé.
2. **Monstre touché** : le visuel du monstre est redessiné en blanc (`teinte` forcée) pendant `FLASH_TOUCHE_MS`. Vaut pour les dégâts d'attaque **et** les ticks de DoT (Feu), pour que l'effet du follet soit visible lui aussi (critère manuel §7 de `02_grotte.md`, jamais vérifié).
3. **Barre de PV du monstre** : au-dessus du monstre, sous l'étiquette de nom existante, `BARRE_PV_MONSTRE`, fond sombre + remplissage rouge proportionnel. Visible dès que le monstre est **actif** (a engagé le héros ou a perdu ≥ 1 PV), jusqu'à sa mort. Jamais visible sur un monstre inerte à distance.

Le combat lui-même (`combat.js`, valeurs d'équilibrage) **n'est pas touché** : l'équilibrage 2-3 coups est jugé bon par Xav dès lors qu'on voit ce qui se passe.

### 3.2 Dialogues — anti-spam (palier 1)

**Cause racine, à consigner en commentaire au point de décision unique** : `ATTACK` sert à la fois à frapper et à confirmer, et des dialogues s'ouvrent pendant qu'on spamme (monstre mort → `dlg_grotte_eclats`) — le joueur les ferme sans les avoir vus. `ATTACK` **reste** la touche de confirmation (convention manette), on rend le spam inoffensif par construction, trois mécanismes cumulés :

1. **Frame d'ouverture consommée** : la frame où un dialogue s'ouvre, il reçoit `etatNeutre()` — le front montant qui a déclenché l'ouverture (ou n'importe quel autre de cette frame) ne peut jamais aussi l'avancer. À implémenter **au** point de décision unique de `main.js#maj()`, pas dans `dialogue.js`.
2. **Machine à écrire** : le texte d'une ligne s'affiche caractère par caractère à `MACHINE_ECRIRE_MS_PAR_CARACTERE`. Un appui pendant l'affichage **complète** la ligne ; il ne l'avance pas.
3. **Verrou d'armement** : une ligne complètement affichée (naturellement ou par appui) ne devient avançable qu'après `DELAI_ARMEMENT_DIALOGUE_MS`. Un marqueur `▼` (dessiné, pas du texte localisé) apparaît en bas à droite de la boîte quand la ligne est avançable — jamais avant.

`held` ne fait jamais avancer (déjà le cas : `pressed` seulement). Le temps de la machine à écrire et de l'armement suit le **même delta plafonné** que le jeu.

### 3.3 Catalogue visuel — « emoji-IA-art » verrouillés (palier 2)

**Une seule fonction de rendu** `dessinerVisuel(ctx, visuel, x, y, options)` (`options` : `teinte?`, `alpha?`, `echelle?`) interprète `visuels.json`. Toutes les entités existantes passent par elle : héros, 3 follets (formes triangle/goutte/carré **conservées**, P4②), monstre, leviers on/off, porte, motifs de décor. Plus aucune forme d'entité dessinée inline dans `render.js` ou `main.js#dessiner()`.

Direction artistique (Xav, « assemblage moderne » / « modern IA art ») : chaque silhouette est un **assemblage de primitives** avec du volume — un dégradé, une face éclairée, une ombre portée elliptique sous la silhouette, éventuellement un reflet. Exemple de référence pour le test data-driven : un **tronc** = rectangle vertical brun à dégradé horizontal + deux ellipses (haut clair, bas sombre) pour la perspective + ombre. Il vit dans un **JSON de test**, pas dans la Grotte (il sert en Phase 2) — c'est la preuve qu'un motif s'ajoute sans code.

Contraintes :
- Aucun `ctx.filter` (blur/CSS filters) : support et performance mobile incertains, tout « flou » se simule par dégradés et alpha.
- Le rendu reste **net à résolution physique** (MT rendu-net) — `dessinerVisuel` dessine en unités logiques sous la transform active, il ne lit **jamais** `ctx.canvas.width/height`.
- Une primitive de forme inconnue = échec de validation au boot (schéma), jamais un dessin silencieusement vide.

### 3.4 Polish des deux salles (palier 3)

- **Lumière** : le halo d'entrée de la salle 1 est **recentré** (donnée `lumieres[]`, aucun code). 2-3 **faisceaux** par salle (`type: faisceau`), tombant du haut de la scène avec un angle légèrement variable, alpha bas, composés en additif doux après le voile — même calque que la teinte du follet, jamais un percement du voile (un faisceau éclaire l'atmosphère, il ne révèle pas le sol comme un halo).
- **Obscurité par scène** : la Grotte reste à `0.72`. Un test data-only prouve qu'une scène de test à `0.9` (« impression de vide autour du follet », valeur actée par Xav pour les futures maps d'exploration sombre — jamais 1.0) passe sans code.
- **Décor** (`scenes.json > decor`, graine fixe, non-collisionnant par D15①) — motifs à livrer dans `visuels.json` :
  - `visuel_herbe` : touffe de 3-5 traits, vert désaturé sombre (grotte), légère variation d'inclinaison par graine.
  - `visuel_flaque` : ellipse à dégradé radial bleu-gris, **alpha ≤ 0,35 au centre, bord totalement fondu** (« pas une tache bleue au milieu de l'écran »), plus un reflet = petite ellipse claire alpha ~0,15 décalée vers le haut-gauche. Reflet **statique**.
  - `visuel_rocher` (2 tailles) : polygone gris à face éclairée + ombre. Décoratif, **jamais bloquant** — un rocher qui bloque est une tuile mur, pas un motif.
- **Tuiles** : 2-3 variantes de sol et de mur choisies par graine + `variation_teinte` déterministe, pour casser la répétition sans nouvel asset.
- **Héros** : `couleur_neutre` au spawn (avant choix), puis **teinté à `companions.render.couleur` du follet choisi** — via `options.teinte` de `dessinerVisuel`, jamais une copie du visuel par élément. Xav a demandé « gris foncé » ; **valeur provisoire : gris moyen désaturé avec un contour clair** — un gris foncé sur le voile bleuté à 0,72 avant le choix risque d'être invisible, à valider en jeu par Xav (voir §9).
- **Aura du follet** : `AURA_TRAIT` — pointillés, 1 px, alpha réduit, à la place du cercle blanc épais actuel. Purement visuel, `DISTANCE_ENGAGEMENT_PX` inchangé.
- **Performance** : le décor et les tuiles d'une scène sont statiques → pré-rendus **une fois** sur un canvas hors-écran à l'entrée de scène (et au changement de facteur d'échelle), puis composés par `drawImage`. Les dégradés par frame (faisceaux, flaques) sont sinon le premier poste de coût sur le plancher 30 fps mobile.

### 3.5 Intro cinématique (palier 4) — **≤ 10 s, non narrée, non skippable**

Machine à états **pure** (`src/intro.js`, temps → étape, testée headless), pilotée par le même delta plafonné, rendue par `dessinerVisuel`. Pendant toute l'intro, le gameplay reçoit `etatNeutre()` par le point de décision unique — l'intro est « une UI ouverte » comme le menu et le dialogue, pas un `if` de plus. Durées dans `scenes.json > scene_grotte_salle_1.intro`, provisoires :

| Étape | Durée provisoire | Rendu |
|---|---|---|
| 1. Clignements | 3 ouvertures : 0,6 s / 0,9 s / 1,4 s, noirs de 0,4 s entre — ~4 s | Voile noir plein écran percé d'une ouverture **elliptique** (paupières) à bord dégradé, dont la hauteur s'ouvre puis se referme (ease-in-out). Scène rendue **sombre** dessous (obscurité de la scène + halo d'entrée seul). Le « flou » = alpha et dégradé, pas de filtre. |
| 2. Convergence | ~3,5 s | Les 3 follets apparaissent hors du halo (bords de la salle), lévitent (oscillation verticale sinus, amplitude/période en données) et convergent (ease-out) vers les 3 positions actuelles de l'écran de choix (gauche / milieu / droite devant le héros). |
| 3. Bulle de choix | — | L'écran de choix **existant** s'ouvre, avec sa narration localisée. Inchangé. |
| 4. Départ 3 → 1 | ~1 s | Les deux non-choisis s'éloignent vers les bords et s'éteignent (alpha → 0) ; l'élu passe en orbite (`suivre`). Le dialogue d'enthousiasme existant suit. |

Budget : étapes 1 + 2 ≤ 8 s sur les données réelles (marge sous le plafond de 10 s posé par Xav), vérifié par test. Rejouée ssi `flag_follet_choisi` absent (nouvelle partie, reset) — jamais à un respawn.

---

## 4. Edge cases à gérer

- Onglet masqué pendant l'intro → delta plafonné à 100 ms, l'intro **continue au retour** sans saut (pas de rattrapage), même règle que les cooldowns.
- `reinitialiserPartie()` pendant l'intro → l'intro redémarre proprement à l'étape 1 (état de `intro.js` reconstruit, pas réutilisé).
- Sauvegarde v2 avec compagnon → aucune intro ; sauvegarde sans `flag_follet_choisi` (v1 migrée) → intro complète.
- Dialogue qui s'ouvre pendant un spam d'`ATTACK` → frame consommée + machine à écrire + armement : **aucune ligne ne peut être fermée sans avoir été affichée complètement**.
- Monstre tué pendant son flash → flash interrompu, barre disparaît, drop inchangé.
- `visuel` référencé absent → échec dur au boot avec le chemin (référence croisée comme toute autre).
- Scène sans `decor` → aucun motif, pas d'erreur. Scène sans `obscurite` → claire, aucun calque de voile dessiné.
- `obscurite: true/false` résiduel → échec de validation, message explicite (« obscurite est un objet { opacite } depuis 03_grotte-polish »).
- Changement de facteur d'échelle (resize, DPR) → le canvas de décor pré-rendu est invalidé et reconstruit à la frame suivante.
- Ligne de dialogue vide ou d'un seul caractère → machine à écrire instantanée, armement s'applique quand même.

---

## 5. Structure des fichiers

```
src/
├── visuels.js       dessinerVisuel() — interprète visuels.json ; composition pure,
│                    testée sur faux ctx enregistreur (patron test_phase1_sd_dialogues_invisibles)
├── intro.js         machine à états de l'intro (temps → étape, positions des follets), pure, testée
├── decor.js         + lecture de scenes.decor (motifs/poids/densité), variantes de tuiles ; PRNG inchangé
├── render.js        + faisceaux, obscurité par scène, calque de décor pré-rendu, flash/barre PV/anneau
│                    (via dessinerVisuel) — CHECKLIST_visuelle obligatoire
├── dialogue.js      + machine à écrire + armement (pur, testé) ; ui/dialogue_box.js dessine ▼
├── main.js          + frame d'ouverture consommée au point de décision unique ; intro = UI ouverte ;
│                    plus aucune forme d'entité dessinée inline dans dessiner()
├── schemas.js       + visuels, obscurite objet, lumieres.type/faisceau, decor, intro, render.visuel
data/
├── visuels.json     (nouveau)
├── scenes.json      obscurite objet, lumieres recentrées + faisceaux, decor, intro (salle 1)
├── tiles.json       variantes + variation_teinte
├── enemies.json / companions.json / puzzles.json   render.visuel
tests/
├── test_phase1b_combat_feedback_<date>.js      flash uniquement sur coup effectif ; barre visible ssi actif
├── test_phase1b_dialogue_antispam_<date>.js    5 appuis en 5 frames → 0 ligne consommée ; frame d'ouverture ;
│                                               armement ; machine à écrire complète puis avance
├── test_phase1b_visuels_<date>.js              faux ctx : ordre des primitives, ombre avant, teinte appliquée
│                                               aux seules primitives teintables ; tronc en JSON de test = zéro code
├── test_phase1b_scenes_schema_<date>.js        obscurite objet (bool refusé), faisceau, decor, scène à 0.9 data-only
├── test_phase1b_intro_<date>.js                étapes dans l'ordre, total ≤ 10 000 ms sur données réelles,
│                                               inputs ignorés avant l'étape 3, reset → étape 1
specs/CHECKLIST_visuelle.md                     enrichie (voir §7)
```

---

## 6. Consignes d'autonomie pour Claude Code

- **Ordre des paliers imposé** (1 → 4). Si la session déborde : s'arrêter au dernier palier stable, journal dans `CLAUDE.md`, le palier suivant repart d'une session neuve.
- Ne pas demander de validation sur le nommage des primitives, la forme exacte des schémas, le découpage des tests.
- **Réutiliser** : le point de décision unique de `main.js#maj()` (l'intro et la frame consommée y entrent, aucun second `if`), le faux ctx enregistreur existant, `mulberry32`, `creerControleurMenu()` si l'intro s'y prête.
- **Règle de méthode active** : tout ce ticket touche `render.js`/`main.js#dessiner()` → `specs/CHECKLIST_visuelle.md` rejouée **et enrichie** avant de conclure. Toute composition de calque qui touche la transform passe par une fonction unique qui la restaure.
- Tout seuil de §2.2 et toute durée de §3.5 : un seul endroit, commenté avec son pourquoi, marqué provisoire.
- Aucune chaîne en dur ; `▼` est dessiné (chemin/polygone), pas une chaîne.
- Pas de `ctx.filter`, pas de sprite, pas d'image bitmap : primitives uniquement.
- Le décor reste **non-collisionnant** : si un motif « devrait » bloquer, c'est une tuile, remonter le point plutôt que d'ajouter une collision au décor.
- Un point de design non tranché → `[OUVERT]` dans `CLAUDE.md`, valeur provisoire de cette spec appliquée.

---

## 7. Critères de validation

**Automatisés** (`node tools/run_tests.js` tout vert, `node --check` sur chaque fichier livré) : les cinq fichiers de tests de §5, plus la suite existante inchangée (en particulier `test_phase1_sd_audit_chemin_critique` — le chemin critique ne doit pas bouger d'une frame hors dialogues, dont la durée s'allonge mécaniquement).

**Visuel par l'agent** (navigateur réel, extension Chrome) — `CHECKLIST_visuelle.md` : les 6 états existants **plus** : intro étape 1 (paupières), intro étape 2 (convergence), anneau d'attaque en flash, monstre touché blanc + barre de PV, `▼` de dialogue armé, faisceaux + flaques + herbe + rochers en salle 2, héros neutre (avant choix) et héros teinté (après). Capture par état.

**Manuel (Xav)** — le critère de la phase :
1. Nouvelle partie à la manette : intro complète (durée ressentie ≤ 10 s, pas de skip possible, pas de saccade), choix, salle 1, salle 2.
2. Spam de `A` pendant tout le parcours : **aucun dialogue raté**.
3. Combat : voir l'anneau à chaque coup, le monstre blanchir, sa barre descendre — y compris sous DoT Feu sans frapper.
4. Verdict sur : gris neutre du héros (lisible avant le choix ?), aura pointillée, faisceaux, discrétion des flaques, densité du décor, et **la direction artistique globale** — c'est ce verdict qui ouvre la Phase 2.

---

## 8. Hors scope pour cette itération

- Tactile : choix du follet au tap direct, ergonomie des boutons — **dette assumée par Xav** jusqu'aux compétences (Phase 4).
- Audio (l'intro est muette ; l'initialisation sur geste utilisateur reste due au premier son, Phase 2 au plus tard).
- Reflets dynamiques de la lumière du follet dans les flaques ; rochers collisionnants ; chiffres de dégâts flottants ; skip de l'intro.
- Équilibrage des valeurs de combat et de synergies (`combat.js`, `status.js`, JSON de valeurs) — non touchés.
- Maison, calque « toit », cycle jour/nuit (Phase 2). Le catalogue de visuels doit être prêt à les accueillir, pas les contenir.
- Reports documentaires en retard (480×270 dans `02_grotte.md` §9 et la carte mentale, C3③ croix directionnelle, D6③ synergies, D3② portée = équipement) → mini-ticket séparé, à ne pas mêler à du code.
- Écouteur `resize` redondant de `main.js` : peut être retiré **uniquement** si le canvas de décor pré-rendu impose de réécrire cette zone ; sinon inchangé.

---

## 9. Points `[OUVERT]` (valeur provisoire appliquée)

| Point | Provisoire | À trancher par Xav |
|---|---|---|
| Couleur neutre du héros | gris moyen désaturé + contour clair | **fermé — direction artistique validée en jeu par Xav le 2026-09-16** (report documentaire, `specs/MT_reports-documentaires_2026-09-16.md`) |
| Durées de l'intro | §3.5 (≈ 8 s) | Ressenti à la manette — reste ouvert, valeur d'équilibrage |
| Cinématique 3.1 étapes 1-2 | **fermé par cette spec** (oui, à faire — décision Xav 2026-09-16) | — |

---

## 10. Décisions actées le 2026-09-16 (à reporter dans `CLAUDE.md` et la carte mentale)

- Manette réelle **validée** (Phase 0 → 1b) ; tactile en dette assumée jusqu'aux compétences.
- `rayon_lumiere: 110` **validé**.
- Jamais de noir absolu : les futures maps « vides » sont à ~0,9 d'opacité, éclairées par le seul follet — d'où l'obscurité **par scène**.
- Intro cinématique : oui, ≤ 10 s, prérequis = catalogue visuel verrouillé.
- Feedback de combat : anneau **et** barre de PV du monstre (+ flash blanc au coup).
- Anti-spam dialogue : frame consommée + machine à écrire + armement, `ATTACK` reste la confirmation.

# RPG V2 — Session diagnostic : lisibilité de l'UI en jeu (2026-09-15)

**Contexte déjà disponible pour Claude Code** : lire `CLAUDE.md` en entier (journaux Phase 1 et diagnostic du jour), puis `specs/02_grotte.md` §2.2, §2.3, §3.1 (lumière), §3.9 (HUD) et §9. Ce ticket **tranche le `[OUVERT]` §9** (résolution logique) et reprend trois défauts d'affichage constatés par Xav en jeu réel.

## Contexte

Xav a rejoué la Grotte au clavier après le diagnostic du blocage (correctif `blur` validé de fait : il est allé jusqu'à tuer le premier monstre). Le gameplay tient ; c'est l'affichage qui ne va pas. Constat factuel sur capture (1406 × 783 px écran, salle 2 de la grotte) :

1. **La scène occupe un rectangle d'environ 640 × 450 px écran, centré dans du noir** — soit ~10 × 7 tuiles logiques à l'échelle ×2. Le reste du canvas est vide. Le HUD (barre PV en haut à gauche, boutons ronds en bas à droite) est dimensionné pour tout le canvas et écrase visuellement la scène.
2. **La scène est quasi noire** : le calque d'obscurité est proche de 100 % d'opacité, le halo du follet est un disque à peine perceptible (~30 px de rayon écran), aucun halo d'entrée visible. On ne distingue ni les murs, ni le sol, ni le décor.
3. **Les 7 boutons tactiles sont dessinés alors que Xav joue au clavier**, sans jamais avoir touché l'écran. Ils chevauchent la scène (le gros bouton attaque est dessiné par-dessus le coin bas-droit de la salle). Xav signale en plus que les zones réactives **ne coïncident pas avec les disques dessinés**.

**Référence visuelle = la V1** (`monde/rpg_v0_1_0.js`, à lire pour comprendre le rendu, jamais pour reprendre du code). Ce qui fait que la V1 est lisible et que la V2 ne l'est pas, en valeurs observées sur les captures V1 :

- La carte remplit **tout** le viewport, la caméra suit le héros ; il n'y a jamais de bande noire autour du monde.
- L'obscurité de nuit est une **pénombre teintée**, pas du noir : le sol et le décor restent identifiables (rochers, troncs, sapins, coffres se lisent en silhouette). Estimation : voile sombre à ~60 % d'opacité sur le fond.
- La lumière du héros/compagnon est un **dégradé radial chaud** (jaune-orangé au centre, transparent au bord), rayon ≈ 3 à 4 fois la taille du héros, bord doux ; les autres sources (torche, ennemi de feu) ont chacune leur petit halo.
- Le HUD est un **petit cartouche compact** en haut à gauche (fond sombre semi-transparent, coins arrondis) : barre PV avec la valeur **dans** la barre, puis une ligne par compteur (icône + texte). Deux petits boutons carrés en haut à droite. Le HUD ne dépasse jamais ~15 % de la largeur. Rien en bas de l'écran hors tactile.
- Chaque ennemi porte son **nom + niveau** en étiquette sous lui.
- Les portées (aura, attaque) sont dessinées en **cercles concentriques translucides à trait fin**, pas en disques pleins.

## Hypothèses à trancher (ne pas deviner en silence)

Sujet 1 — scène trop petite :
- **Hypothèse 1a** — La résolution logique 640 × 360 est trop large pour des tuiles de 32 px (20 tuiles visibles → tuiles de 32 px écran à l'échelle ×2 sur un 1080p). **Tranchée par Xav : passer à 480 × 270** (§9, alternative « plus zoomé »).
- **Hypothèse 1b** — Les salles de la grotte sont plus petites que le viewport, et `camera.js` les centre dans le vide comme prévu (comportement Phase 0 « scène < viewport »). Sur la capture, la salle 2 fait ~10 × 7 tuiles : c'est le cas. **Les deux hypothèses sont vraies en même temps** et se corrigent séparément (résolution en données + layouts de salles agrandis).

Sujet 2 — obscurité :
- **Hypothèse 2a** — `dessinerObscurite()` peint un noir à opacité 1 sans plancher (rien n'est visible hors halo).
- **Hypothèse 2b** — `rayon_lumiere` des follets (`companions.json`) est trop petit, et/ou le dégradé est linéaire et coupé net.
- **Hypothèse 2c** — `lumieres[]` de `scenes.json` (halo d'entrée, §3.1) n'est pas rempli, ou pas interprété par le rendu. Vérifier les deux.
- Non exclusives — probablement les trois.

Sujet 3 — tactile :
- **Hypothèse 3a** — `hud.js` dessine les boutons tactiles **inconditionnellement**, sans lire un état « tactile actif » de `touch.js`.
- **Hypothèse 3b** — `touch.js` passe « actif » à tort (sur `pointerdown`/souris, ou dès l'initialisation) — au lieu du premier `touchstart` réel (§2.3).
- **Hypothèse 3c** (désalignement) — La conversion écran → logique (§2.2 : facteur entier + offset de letterbox) est appliquée au dessin des boutons mais pas au hit-test de `touch.js`, ou l'inverse ; ou le hit-test utilise les coordonnées d'un `hud_layout` différent de celui du rendu. Vérifier qu'il n'existe **qu'une seule** source de vérité des positions (`data/hud_layout.json` ou `ui/hud_layout.js`) lue par les deux.

## Méthode de diagnostic attendue

- Sujet 3 d'abord (le seul avec une vraie inconnue). Lire `src/input/touch.js`, `src/ui/hud.js`, `src/ui/hud_layout.js`, `src/render.js` (présentation/échelle). Écrire un test headless rouge-avant-patch pour 3c : à échelle ×2 avec offset (dx, dy) non nul, un `touchstart` aux coordonnées écran du **centre dessiné** du bouton attaque doit produire `attack.pressed`. Pour 3a/3b : test headless que l'état « tactile actif » est faux avant tout `touchstart` et vrai après (jamais sur `mousedown`/`pointerdown` souris).
- Sujets 1 et 2 : pas de diagnostic, la cause et la correction sont connues — appliquer (voir détail), vérifier visuellement, consigner les valeurs.

## Ordre de traitement

1. **Sujet 3 — tactile** (écart de spec + bug fonctionnel : bloquant pour le test tactile de Xav).
2. **Sujet 1 — résolution + taille des salles** (tranche le `[OUVERT]` §9).
3. **Sujet 2 — obscurité et lumière**.
4. **Sujet 4 — HUD compact** (dépend de 1 : à faire une fois la résolution posée).

## Détail par sujet

### 3. Tactile — visible uniquement au tactile, zones alignées

- **Affichage** : les boutons et le joystick virtuel ne sont dessinés **que** si `touch.js` a reçu au moins un `touchstart` réel depuis le chargement (§2.3). Un seul booléen exposé par la couche d'input (ex. `etat.tactileActif`), lu par `hud.js`. Jamais de détection par user-agent ou par `ontouchstart in window` (un PC avec écran tactile doit pouvoir jouer à la manette sans boutons à l'écran tant qu'il ne touche pas).
- **Extinction** : si une manette produit un front montant ou qu'une touche clavier est pressée, le tactile repasse inactif (les boutons disparaissent). Provisoire — commenter le pourquoi : un joueur qui repose la tablette et prend la manette ne veut pas de boutons fantômes.
- **Alignement** : une seule table de positions/tailles en coordonnées **logiques** ; le rendu et le hit-test convertissent tous deux via la même fonction de `render.js` (écran → logique pour le hit-test, logique → écran pour le dessin). Si la fonction n'existe pas sous forme pure importable, la créer (et la tester). Cibles ≥ 48 px **écran** (P4①) : à 480 × 270 sur mobile, ça veut dire ≥ 24 px logiques à l'échelle ×2, ≥ 16 px à ×3 — prendre 28 px logiques de rayon pour l'attaque, 20 px pour les autres, provisoire.
- **Positions** (provisoire, en logique 480 × 270) : joystick centré bas-gauche (centre ≈ 70, 200) ; attaque bas-droite (≈ 420, 210) ; les 4 autres slots en éventail au-dessus et à gauche de l'attaque, sans jamais recouvrir le centre de l'écran (aucun bouton avec x < 330 ni y < 120) ; `interact` juste au-dessus du joystick ; `menu` coin haut-droit (≈ 455, 15, petit).
- Test : `tests/test_phase1_sd_ui_tactile_2026-09-15.js` (rouge-avant-patch pour 3a/3b et 3c).

### 1. Résolution 480 × 270 + salles agrandies

- Changer la valeur unique de résolution logique (déclarée en un seul endroit, cf. Phase 1) en **480 × 270**. Mettre à jour le commentaire : *validée par Xav le 2026-09-15 sur capture*, plus provisoire. `tests/test_phase1_render_resolution` doit rester vert (adapter les attendus si la valeur y est en dur — ne pas laisser le test passer par accident).
- **Agrandir les layouts** de `scene_grotte_salle_1` et `scene_grotte_salle_2` dans `data/scenes.json` pour qu'aucune salle ne soit plus petite que le viewport (**≥ 16 × 10 tuiles** de sol utile, murs compris à ≥ 18 × 12) : la caméra doit avoir à border, pas à centrer. Xav a dit « un peu », pas « énorme » : viser 20 × 14 environ, pas 40 × 30. Conserver la structure jouable (positions relatives du levier, des 3 leviers de la séquence, du spawn, de la porte et des portails) — replacer les `interactifs[]`, `spawns[]`, `portails[]`, `portes[]` en cohérence. **Rejouer** `tests/test_phase1_sd_audit_chemin_critique` : il exerce les vraies données, il doit rester vert sans modification de la logique.
- `scene_maison_exterieur_placeholder` : inchangé (Phase 2).
- Vérifier en navigateur (1920 × 1080 et 1366 × 768) : échelle entière ×4 et ×2 respectivement, bandes noires symétriques, aucune tuile fractionnaire.

### 2. Obscurité et lumière

Valeurs cibles inspirées de la V1, toutes **provisoires** et déclarées en données ou constantes commentées, jamais dispersées :

- **Plancher d'obscurité** : opacité maximale du voile **0,72** (constante `OPACITE_OBSCURITE_MAX`, un seul endroit). Le voile est un noir légèrement bleuté (ex. `rgb(6, 10, 16)`), pas un noir pur — c'est ce qui fait la différence entre « grotte » et « écran éteint ». Murs, sol et décor doivent rester identifiables en silhouette **partout** dans la salle, sans aucune source de lumière.
- **Lumière du follet** : `rayon_lumiere` dans `companions.json` porté à **~110 px logiques** (≈ 5,5 fois `RAYON_HERO_PX`) pour les trois follets. Dégradé radial : opaque au centre (le voile est totalement percé sur ~35 % du rayon), puis décroissance douce jusqu'à 0 au bord — pas de disque coupé net. Teinte chaude légère au centre (le follet est une flamme/goutte/pierre : une couleur par élément est acceptable via `render` déjà existant, sinon jaune-orangé uniforme, provisoire).
- **Halo d'entrée** (§3.1) : vérifier que `scenes.json > lumieres[]` existe dans le schéma (`schemas.js`) et est interprété par `dessinerObscurite()`. Ajouter la première entrée : salle 1, à la position de l'ouverture (là où le héros spawn), rayon ~140 px logiques, même dégradé. Si `lumieres[]` n'existe pas : le créer (schéma + rendu), c'est dans le chemin direct. Une 2ᵉ lumière ailleurs = JSON seulement (test dédié : `tests/test_phase1_sd_ui_lumieres_2026-09-15.js`, validation du catalogue, pas le rendu).
- **Aura du follet** (`rayon_aura`) : dessinée comme en V1, cercle **trait fin translucide**, jamais un disque plein — vérifier que c'est déjà le cas, sinon corriger.
- Le calque d'obscurité reste dessiné **avant** la boîte de dialogue et le HUD (déjà le cas, ne pas casser).

### 4. HUD compact (patron V1)

En résolution 480 × 270, tout via `hud_layout` (données) et `i18n.t()` :

- Cartouche haut-gauche : fond `rgba(0,0,0,0.55)`, coins arrondis 4 px, padding 6 px, largeur ≤ 120 px logiques. Contenu, une ligne chacun : **barre PV** (12 px de haut, valeur `41/58` centrée **dans** la barre, police ≤ 9 px logique — vérifier la lisibilité à ×2 avant de descendre plus bas), puis **éclats** (icône ◆ + valeur). La forme du follet actif (triangle/goutte/carré, déjà rendue) prend la place de l'icône en tête de la ligne PV, **pas** de carré jaune isolé sous le HUD.
- **5 slots d'action** : ligne de 5 petits carrés (16 px, 4 px d'écart) **en bas au centre** quand le tactile est inactif ; quand il est actif, les boutons tactiles **sont** les slots (§3.9) et la ligne du bas n'est pas dessinée. Slot actif à bord clair, slots grisés à 40 % d'opacité.
- **Étiquette ennemi** : nom localisé (`label_key` de `enemies.json`) + niveau si le champ existe, texte 8 px, sous le sprite. S'il n'y a pas de champ niveau en Phase 1, nom seul — ne pas inventer une stat.
- Aucun bouton menu à l'écran hors tactile (Start/Échap suffisent), conforme à ce qui existe.

## Contraintes non négociables

- **Cause racine avant patch** pour le sujet 3 ; pas de rustine du type « décaler les boutons de 30 px à la main jusqu'à ce que ça tombe juste ».
- Zéro chaîne en dur ; les libellés HUD existants passent déjà par `i18n.t()`, tout nouveau texte (étiquette ennemi) aussi, FR **et** EN, `test_phase0_i18n` vert.
- Zéro `TouchEvent` hors de `touch.js` ; `hud.js` ne lit qu'un booléen fourni par la couche d'input.
- Tout seuil (résolution, opacité, rayons, positions tactiles, tailles HUD) en un seul endroit, commenté avec son *pourquoi*, marqué provisoire sauf la résolution (validée).
- Le rendu canvas n'est pas testé headless ; ce qui l'est : conversion écran ↔ logique, état tactile actif, validation des données (`lumieres[]`, layouts agrandis via le test de chemin critique).
- Aucun changement de gameplay, d'équilibrage, de mapping manette. Si un problème annexe apparaît, le documenter dans `CLAUDE.md` sans le corriger.
- Commentaires en français, *pourquoi* pas *quoi*.

## Test de validation

Automatisé : `node tools/run_tests.js` → toute la suite verte, dont les 2 nouveaux fichiers ; `node --check` sur chaque fichier modifié.

Manuel (Xav) :
1. **Clavier/manette, 1080p** : aucun bouton tactile à l'écran ; la salle 1 remplit tout le viewport (bandes noires symétriques seulement si le ratio de la fenêtre diffère de 16:9) ; les murs, le sol et le décor se voient en pénombre partout ; le halo d'entrée est visible au spawn ; le follet éclaire un disque net d'environ un tiers de la largeur d'écran avec un bord doux ; le HUD tient dans le coin haut-gauche et ne masque rien d'utile.
2. **Tactile** (mobile ou émulation Chrome) : au premier toucher, joystick + boutons apparaissent ; un tap au centre exact de chaque disque déclenche le bon verbe ; appuyer une touche clavier les fait disparaître.
3. Rejouer la grotte jusqu'à la sortie avec le follet Feu pour vérifier que le combat reste lisible dans la lumière (§3.6 : la lumière suit le follet quand il engage).

## À la fin de la session

Dans `CLAUDE.md` : (1) verdict par hypothèse pour le sujet 3 (laquelle confirmée, test rouge→vert), (2) `[OUVERT]` §9 **fermé** — 480 × 270 validé, à reporter dans `specs/02_grotte.md` §9 et dans la carte mentale au prochain patch, (3) les valeurs retenues pour l'obscurité/lumière/HUD/tactile avec leur emplacement unique, (4) tests rejoués, (5) reste à faire par Xav = le parcours manuel ci-dessus.

## Hors scope explicite

- Sprites/animations du héros et des monstres, décor graphique de la grotte (roche, textures) — les formes géométriques actuelles restent.
- Clignements/orbite pré-choix (§3.1 étapes 1-2, point `[OUVERT]` du diagnostic précédent) — toujours en attente du verdict de Xav, non traité ici.
- Découvertes, stats affichées dans le HUD (V1 les montre : pas de contrepartie en Phase 1, `journal de découvertes` = Phase 6).
- Création/avatar du personnage, équipement, inventaire — phases suivantes.
- Audio, équilibrage, Phase 2.

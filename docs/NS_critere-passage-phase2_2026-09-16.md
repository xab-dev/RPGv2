# RPG V2 — Notes de session brute : critère de passage Phase 2 rejoué par Xav (2026-09-16)

## Dictée source

Critère de passage (`specs/03_maison-exterieur.md` §7 / `CLAUDE.md`) rejoué à la manette et au clavier. (Y) = validé, (N) = pas encore validé (pas un bug pour autant).

- Point qui m'embête parce que je ne veux pas trop aider : manque de tuto sur les touches. Les glisser au moins une fois. En dehors de ça, le jeu me plaît beaucoup.
- 1. Manette : sortir de la grotte (Y) → toucher un arbre (N, à confirmer — je n'ai peut-être pas encore trouvé le bon arbre, la forêt est immense !) → rocher (Y) → branche (Y) → Poche (Y) → toit (Y) → table/coffre/atelier (Y) → jardin, fruit, puits (Y) → campagne (Y) → fermer/rouvrir, persistance (Y).
- 2. Tactile : différé, en attente Phase 4 ou plus pour créer un lien de partage et faire tester mon neveu sur son téléphone (il a adoré la V1, très bon retour sur cryptex et combat boss).
- 3. Nuit : au ressenti les lumières sont bonnes (grotte, follet, fenêtre maison). On peut faire la nuit un peu plus sombre et le jour un peu plus lumineux pour bien faire la différence — pour l'instant pas flagrante.
- 4. Musique : *(pas de verdict dicté)*.
- 5. Porte d'1 tuile : parfois gênant, comme les passages étroits de la forêt. En soi pas un problème (Indiana Jones n'a pas des passages faciles non plus) — ce n'est pas le passage étroit qui gêne, c'est la hitbox de l'angle qui « accroche » le joueur.

## Découpage en unités

### Unité 1 — Critère de passage : verdict à consigner
- **Nature** : Symptôme observé (résultat de test).
- **Contenu** : point 1 validé sauf l'arbre (voir Unité 2) ; point 2 différé jusqu'à un lien de partage (Phase 4+) ; point 3 : lumières validées, contraste jour/nuit à renforcer (Unité 3) ; point 4 : non dicté ; point 5 : verdict rendu (Unité 4). La **Phase 2 « première marche » est validée en jeu à la manette**, sous réserve de l'arbre.
- **Destination** : sujet C de `SD_hitbox-angle-arbre_2026-09-16.md` (report dans le journal `CLAUDE.md`, pas de code).
- **Justification** : c'est de la documentation d'état, pas un ticket à part entière — ça se fait dans la session qui traite les correctifs.

### Unité 2 — Arbre interactif introuvable
- **Nature** : Symptôme observé + Diagnostic spontané (« pas encore trouvé le bon arbre »).
- **Contenu** : la spec (§3.2) exige que le premier arbre interactif soit **sur le chemin naturel** bouche de grotte → maison, touché « sans instruction ». Xav a fait tout le parcours sans le rencontrer. Que l'arbre existe ailleurs ou non, le critère de placement n'est pas rempli tel qu'écrit — ce n'est pas à Xav de le chercher.
- **Destination** : **Template 3 (Session Diagnostic)**, sujet B.
- **Justification** : cause inconnue — arbre manquant, mal placé, ou variante de fond (`tile_arbre_fond`) non interactive posée par-dessus le layout manuel.

### Unité 3 — Contraste jour/nuit trop faible
- **Nature** : Symptôme observé + Solution proposée à chaud (nuit plus sombre, jour plus clair).
- **Contenu** : niveaux d'obscurité provisoires de `daynight.js` à régler ; les sources de lumière (follet, fenêtre) sont validées et ne bougent pas.
- **Destination** : **Template 1 (Micro-Ticket)** → `MT_jour-nuit-contraste_2026-09-16.md`.
- **Justification** : seuils déjà marqués provisoires, un seul fichier, comportement voulu connu.

### Unité 4 — La hitbox d'angle « accroche » le joueur
- **Nature** : Symptôme observé + Diagnostic spontané (l'angle, pas la largeur).
- **Contenu** : porte d'1 tuile et passages étroits de la forêt : gêne réelle en jeu, mais la largeur est acceptée. Le problème est l'arrêt net quand un coin de la hitbox touche un coin de tuile solide en approche oblique.
- **Destination** : **Template 3 (Session Diagnostic)**, sujet A.
- **Justification** : le diagnostic de Xav est plausible (glissement axe par axe sans correction de coin, patron V1) mais doit être confirmé sur `scene.js` avant de toucher aux collisions — c'est le cœur du déplacement, une rustine y coûterait cher.

### Unité 5 — Tuto des touches : « les glisser au moins une fois »
- **Nature** : Idée de chantier + **[OUVERT]**.
- **Contenu** : Xav ne veut pas guider le joueur, mais constate qu'aucune touche n'est jamais montrée. Tension assumée : montrer chaque commande **une fois**, au moment où elle sert, sans en faire un tutoriel. Le lieu naturel est la Grotte (donjon-tutoriel).
- **Destination** : en attente — pas assez mûr. Xav tranche la forme avant qu'un Micro-Ticket ou Module Standard existe.
- **Justification** : ce n'est ni un bug ni un seuil ; c'est une décision de design (quand, comment, sur quel périphérique). Ne se tranche pas à sa place.

### Unité 6 — Tactile différé, test neveu
- **Nature** : Décision + Idée de chantier.
- **Contenu** : point 2 du critère reporté jusqu'à un lien de partage (Phase 4+). Le neveu est le testeur mobile de référence (retour V1 : cryptex et boss appréciés — signal utile pour la Phase 4 combat et pour le fil casse-tête).
- **Destination** : journal `CLAUDE.md` (sujet C du SD) ; la dette tactile y est déjà actée jusqu'à la Phase 4, on y ajoute le lien de partage comme prérequis de test.
- **Justification** : cohérent avec la décision déjà prise, rien de nouveau à spécifier.

### Unité 7 — Musique : pas de verdict
- **Nature** : **[OUVERT]** (non testé ou non dicté).
- **Contenu** : le point 4 dépend de `assets/audio/piano_solo.mp3`, à fournir par Xav.
- **Destination** : en attente — question à Xav.

## Fichiers à générer suite à ce triage
- [x] `MT_jour-nuit-contraste_2026-09-16.md` — Template 1 — renforcer le contraste des phases de `daynight.js`, lumières inchangées.
- [x] `SD_hitbox-angle-arbre_2026-09-16.md` — Template 3 — A : accrochage des coins en collision ; B : premier arbre interactif absent du chemin ; C : consigner le verdict du critère de passage dans `CLAUDE.md`.

## Notes laissées en attente (pas encore un fichier)
- **Tuto des touches** (Unité 5) : forme à trancher par Xav — glyphe éphémère au HUD la première fois qu'un verbe devient utile (`MOVE` à la cinématique, `INTERACT` au premier levier, `ATTACK` au monstre de la salle 2), et/ou une page « Commandes » dans le menu, jamais montrée d'office. Data-driven par verbe (le gameplay ne connaît que des verbes ; le glyphe dépend du périphérique actif — clavier / manette / tactile).
- **Musique** (Unité 7) : `piano_solo.mp3` fourni ? Si oui, point 4 à rejouer ; si non, reste non testable.
- **Stations placeholder non solides** (`[OUVERT]` hérité de `CLAUDE.md`) : Xav n'a rien signalé de gênant en jeu — à confirmer explicitement, sinon on le laisse à la Phase 3.

---

## Addendum — réponses de Xav à la relance (2026-09-16)

1. **Tuto des touches** : forme validée — indice au **premier** déclenchement d'un verbe seulement (ex. premier levier de la salle 1 : « appuie sur <glyphe du périphérique> » ; rien sur les 3 leviers de la salle 2). Go. → `specs/04_indices-commandes.md` (Module Standard). Le menu « Commandes » paramétrable était l'alternative si la forme n'avait pas convenu : non retenu pour l'instant.
2. **Musique** : `piano_solo.mp3` pas encore fourni, pas urgent. En attendant : **une ambiance continue, quelques notes qui bouclent** → `MT_musique-ambiance-synth_2026-09-16.md`.
3. **Stations** : les collisions ne gênent pas, **les proportions si** — la table est plus petite que le héros. Logique voulue : échelle ×2 à ×2,2 **et** collision sur certains items. `[OUVERT]` fermé. → `specs/04_stations-proportions-collision.md`.
4. **Timer jour/nuit** (non demandé, verdict rendu) : jour 10 min, nuit 4 min, aube 1 min 30, crépuscule 1 min 30 — ordre de grandeur, non figé. → intégré à `MT_jour-nuit-contraste` v1.1.
5. **Arbre** : confirmé, aucun arbre interactif rencontré hormis le fruitier. Décision : le fruitier **ne se coupe jamais** (fruits, puis jardin/récolte/craft/cuisine). → intégré au sujet B du SD.

### Bons points relevés (à reporter dans la carte mentale, pas un ticket)
- Taille de la carte validée : elle laisse la place aux évolutions (jardin, etc.).
- Jouabilité nettement meilleure que la V1 (limitée au clavier).
- Envie de continuer à construire et à y jouer — référence citée : le housing de *Throne and Liberty* comme exemple de ce que d'autres jeux font mieux.

### Idée de chantier (M1 tardif ou 03b/Phase 4 — pas mûr, ne pas perdre)
- **Mobs qui spawnent la nuit dans la Région Maison** et gênent les récoltes / détruisent les plantations. Lie le cycle jour/nuit (Phase 2) à la survie du jardin (spec ultérieure) et au combat (Phase 4). Contredit « aucun monstre dans la région, ton chill » de `03_maison-exterieur.md` §5 : à trancher explicitement quand le jardin existe, pas avant.

---
projet: RPG V2
episode/session: Fondations — compatibilité des navigateurs
type: registre (document vivant)
version: 1.1.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
ids_suivi: [Q-19, Q-20, Q-24, Q-25, A-04, A-06, D-01, D-02, D-14]
genere_par: claude
verifie_par: xav
---

# RPG V2 — DOC : navigateurs

Emplacement : `docs/DOC_navigateurs.md`. Nom sans date : registre vivant, comme le suivi.

**Règle de lecture.** Trois niveaux de certitude, jamais mélangés : **mesuré** (un relevé `R-` existe) · **attendu** (même moteur qu'un navigateur mesuré, non vérifié) · **inconnu**. Une ligne ne passe à « mesuré » que sur un relevé ou un test en jeu de Xav ou d'un testeur.

## 1. Ce qui est établi (19/09)

Le jeu dessine tout en canvas 2D. Ce qui change d'un navigateur à l'autre n'est pas le jeu, c'est **qui exécute le dessin** :

- **Chrome** confie le dessin à la carte graphique, hors du fil principal. Mesuré sur le PC de Xav, F11, 1920×1080 : 59,9 fps sans frame sautée **jusqu'à l'échelle forcée 8** (calque de 4608×2816), GPU à 14 %.
- **Firefox**, sur la même machine, exécute le dessin sur le fil principal : coût proportionnel aux pixels, ≈ 15 ms à l'échelle naturelle 4, injouable à 5. Cause exacte non vérifiée (`A-06`).

Conséquence pour l'instrument : sous Chrome, `dessiner()` ne mesure que l'enregistrement des ordres (0,34 ms). **Le seul signal fiable y est « frames sautées ».**

## 2. Tableau

| Navigateur | Moteur | Statut | Verdict | Notes |
|---|---|---|---|---|
| **Chrome** (PC) | Blink | **mesuré** | **référence** | Relevé du 19/09 soir |
| **Edge** | Blink | attendu | bon | Préinstallé sur tout Windows : tout joueur PC a au moins un navigateur qui convient |
| Opera, Opera GX, Brave, Vivaldi | Blink | attendu | bon | Même moteur de dessin que Chrome. Brave brouille la *relecture* du canvas (anti-pistage), pas le dessin : sans effet tant que le jeu ne relit pas ses pixels |
| Chrome Android, Samsung Internet | Blink | attendu | dépend du GPU du téléphone | Dessin sur GPU comme sur PC. À mesurer : `A-04` (Galaxy A04) |
| **Firefox** (PC) | Gecko | **mesuré** | **lent** sur le PC de Xav | Jouable en fenêtré (échelle 3), saccadé en plein écran. Machine ou Firefox en général ? → `A-06` |
| Firefox Android | Gecko | inconnu | — | |
| **Safari** (Mac) | WebKit | inconnu | — | Autre moteur, canvas accéléré en principe. Points à surveiller le jour du test : audio, plein écran, sauvegarde |
| **Tout navigateur sur iPhone / iPad** | WebKit | inconnu | — | Sur iOS, Chrome et Firefox sont des habillages de Safari. Il faudra un testeur équipé |
| Internet Explorer | Trident | sans objet | **ne démarre pas** | Retiré par Microsoft en 2022. Ne sait pas charger les modules JavaScript du jeu. Aucune action |

**Cas transversal : l'accélération matérielle désactivée.** Un Chrome ou un Edge dont l'utilisateur a coupé « Utiliser l'accélération graphique » se comporte comme le Firefox de Xav. Vérifiable dans `chrome://gpu`, ligne « Canvas ».

## 3. Deux mises en garde sur le message aux joueurs

- **Pas de navigation privée.** La sauvegarde vit dans IndexedDB ; en navigation privée elle est **effacée à la fermeture de la fenêtre**. Recommander le mode privé, c'est faire perdre leur partie aux joueurs. « Sans compte, sans connexion à quoi que ce soit » : oui. « En privé » : non.
- **« Hors connexion » n'existe pas encore.** Le jeu est servi par un serveur ; le jouer sans réseau demande un travail dédié (mise en cache applicative), prévu au plus tôt avec la mise en ligne.

## 4. Lignes à reporter au suivi (prochain ménage de journal)

> **Reporté le 2026-09-19 au soir.** Ce §4 est **historique** : il a été appliqué à `docs/DOC_suivi-dettes.md` v1.12.0, qui fait seul foi. Quatre des identifiants proposés ci-dessous étaient déjà pris par les sessions de code de la soirée et ont été renumérotés — la politique navigateurs est **`Q-24`**, le conseil sur le symptôme **`Q-25`**. Les §1 à §3 restent vivants et se tiennent à jour ici.

| Id | Nature | Contenu |
|---|---|---|
| `Q-19` | **clos par Xav, 19/09** | **Pas de plafond d'échelle.** Le jeu reste à l'échelle naturelle : la décision « rendu net à résolution physique » du 15/09 est **maintenue**. `?echelle=N` reste un outil de debug. L'échelle par calque (sol et obscurité plus bas, héros/stations/HUD nets) est gardée **en réserve**, à ressortir si un appareil cible saute des frames |
| `Q-22` | ouverte | **Politique navigateurs.** Proposition : Chrome et navigateurs Blink = **référence** ; Firefox et Safari = **« doit rester jouable »**, vérifié aux jalons, sans viser 60 fps ; IE = hors cible. Position de Xav le 19/09 : développer et jouer sous Chrome, conseiller gentiment Chrome aux joueurs, « on verra plus tard » pour les autres |
| `Q-23` | idée | **Conseiller sur le symptôme, pas sur le nom du navigateur.** Si le jeu constate des frames sautées durables dans les premières secondes, il affiche une fois un message (« le jeu tourne mieux sous Chrome ou Edge, accélération graphique activée »). Couvre d'un coup Firefox, un Chrome bridé et un GPU trop faible ; ne repose sur aucune détection fragile du navigateur. Plus tard : le même signal pourrait baisser l'échelle des calques tolérants tout seul |
| `A-06` | action Xav, 2 min | Firefox → `about:support` → section « Graphiques » : relever « Compositing », et toute ligne signalant une accélération désactivée ou bloquée. Dit si le conseil aux joueurs Firefox est « changez de navigateur » ou « activez l'accélération » |
| `A-04` | inchangée, **devient la mesure qui compte** | Le PC de Xav fait tourner des jeux 3D récents : il ne dit rien d'un portable à puce graphique intégrée ni d'un téléphone. Sous Chrome Android, lire **les frames sautées**, pas `dessiner()` |
| `D-01`, `D-02` | **P1 → P3, gelées** | Sous le navigateur de référence, aucune frame sautée et aucune saccade vue par Xav en traversée (19/09). `MT_ventilation-dessiner` v1.1.0 reste prêt : à lancer sous Firefox le jour où un appareil cible saute des frames |
| `Q-20` | à reformuler | Critère de clôture des fondations de rendu : **aucune frame sautée sur le protocole de traversée, sous Chrome, sur le PC (acquis) et sur l'appareil plancher (`A-04`)** |
| Registre §6 | relevé | `R-11` : Chrome, F11, 1920×1080, nuit, Forêt, échelle forcée 8 — 59,9 fps, 0 frame sautée, `dessiner()` 0,34 ms, 49 recalculs à 1,16 ms |

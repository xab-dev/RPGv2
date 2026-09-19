---
projet: RPG V2
episode/session: Fondations — clôture du volet rendu (doc seule)
type: notes de session
version: 1.0.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
ids_suivi: [Q-19, Q-20, Q-22, Q-23, A-03, A-04, A-05, A-06, A-07, D-01, D-02, D-03, D-14, D-24, D-25, D-26]
genere_par: claude
verifie_par: xav
---

# RPG V2 — NS : rendu, navigateurs, téléphone (soirée du 2026-09-19 — aucun code)

Session de documentation, même patron que `NS_decisions-fondations_2026-09-19.md`. Ménage de journal, puis mise à jour de `docs/DOC_suivi-dettes.md`, de `CLAUDE.md` et de `specs/00_ROADMAP.md`. **Aucun fichier de `src/`, `data/`, `tests/` n'est touché.**

**Identifiants.** Ceux marqués *(nouveau)* sont proposés d'après le suivi v1.7.0. Si l'un est déjà pris par une session de code de la soirée, prendre le suivant libre et le dire en tête de rapport.

Fourni avec cette NS : `docs/DOC_navigateurs.md` (nouveau registre vivant), à ranger tel quel. Son §4 est remplacé par la présente NS, qui fait foi.

## 1. Ce que la soirée a établi

| Fait | Source |
|---|---|
| Sous **Firefox** (PC de Xav, F11), le dessin du canvas s'exécute sur le fil principal : `dessiner()` ≈ 6,8 ms + 0,55 ms × échelle², ≈ 15 ms à l'échelle naturelle 4, injouable à 5 | `R-05` à `R-10` |
| Sous **Chrome** (même PC, F11), 59,9 fps sans frame sautée **jusqu'à l'échelle forcée 8**, GPU à 14 %, **aucune saccade vue par Xav** en traversée | `R-11` |
| Aucune régression des six tickets de la soirée : la différence matin/soir était fenêtré (échelle 3) contre F11 (échelle 4), sous Firefox | verdict Xav |
| Sous Chrome, `dessiner()` ne mesure que l'émission des ordres (temps processeur), pas leur exécution par le GPU. Le signal de fluidité y est **« frames sautées »** | `R-11` |
| **Galaxy A04, Chrome Android** : ~37 fps à l'échelle naturelle 3, ~40 fps à l'échelle 1. `maj()` + `dessiner()` ≈ 7 ms ; **≈ 18 ms par frame inexpliquées**. Ressenti identique sans `?debug=fps`. `chrome://gpu` : Canvas = *Hardware accelerated* | `R-12`, `R-13` |
| Sur l'A04, le recalcul du calque statique coûte **8,69 ms aux deux échelles** (max 21 à 24 ms) : il dépend du nombre de primitives, pas des pixels | `R-12`, `R-13` |
| Sur l'A04 hors plein écran, le jeu occupe 1440×810 sur 2340×1080 (échelle entière 3, barre d'adresse affichée) | capture de Xav |

## 2. Décisions de Xav

- **`Q-19` — close : pas de plafond d'échelle.** Le jeu reste à l'échelle naturelle ; la décision « rendu net à résolution physique » du 15/09 est **maintenue et confirmée**. `?echelle=N` reste un outil de debug. Pas d'échelle au-dessus de la naturelle non plus (aucun gain de netteté). L'échelle par calque est abandonnée comme chantier : ni Chrome PC ni l'A04 n'y gagnent.
- **Chrome est le navigateur de développement et de référence.** Xav joue et valide sous Chrome. Les autres navigateurs : « on verra plus tard », en conseillant gentiment Chrome aux joueurs.
- **Jamais de navigation privée dans un conseil aux joueurs** (la sauvegarde IndexedDB y est effacée à la fermeture). « Hors connexion » n'existe pas tant que le jeu n'est pas mis en ligne avec une mise en cache applicative.

## 3. Lignes du suivi

| Id | Action | Contenu |
|---|---|---|
| `Q-19` | clore | Verdict du §2 |
| `A-05` | clore | Relevés d'échelle faits (`R-05` à `R-11`) |
| `A-04` | clore | Relevé fait (`R-12`, `R-13`) ; `D-24` sans objet : le serveur écoutait déjà sur le réseau local |
| `Q-22` *(nouveau)* | ouvrir | Politique navigateurs. Proposition : Chrome et navigateurs de même moteur = **référence** ; Firefox et Safari = **« doit rester jouable »**, vérifié aux jalons ; Internet Explorer hors cible |
| `Q-23` *(nouveau)* | ouvrir (idée) | Conseiller le joueur **sur le symptôme** (frames sautées durables au démarrage → un message, une fois), jamais sur le nom du navigateur |
| `A-06` *(nouveau)* | ouvrir | Xav, 2 min : Firefox → `about:support` → « Graphiques ». Dit si le Firefox lent est propre à sa machine |
| `D-25` *(nouveau)* | ouvrir, **P2** | **Plein écran au tactile** : demandé au premier appui, paysage verrouillé si possible. Fait passer l'A04 de l'échelle 3 à 4 et le jeu de 46 % à presque tout l'écran. À traiter avec `D-17` (même périphérique) |
| `D-26` *(nouveau)* | ouvrir, **gelé** (`A-07`) | **A04 : ≈ 18 ms par frame hors du code du jeu.** Écartés : l'échelle, l'instrument, un canvas logiciel. Restent : coût de la page autour du canvas, composition par un GPU faible. **Aucune correction à tenter sans profil** |
| `A-07` *(nouveau)* | ouvrir, sans urgence | Profil Chrome de l'A04 par USB. Essai du 19/09 : appareil vu (« Pending authentication »), fenêtre d'autorisation jamais affichée malgré bascule du débogage, blocage automatique, mode USB, changement de port. Pistes restantes : autre câble, autre PC, autre téléphone |
| `D-01` | **P1 → P2** | Sans effet visible sous Chrome PC. Pertinent sur appareil faible (recalcul lié au nombre de primitives). Remède retenu : **défilement incrémental** (dessiner moins à chaque fois) ; la marge plus large est **écartée** |
| `D-02`, `D-03` | **P1 → P3, gelées** (`D-26`) | `MT_ventilation-dessiner` v1.1.0 reste prêt. Hypothèse de `D-03` confirmée par les relevés Chrome : durées à 0,1 ms sous Chrome, arrondies à 1 ms sous Firefox |
| `Q-20` | reformuler | **Volet rendu des fondations : clos sur PC** (Chrome, aucune frame sautée sur le protocole). **Appareil plancher mobile : non tranché.** L'A04 n'est pas jouable aujourd'hui et la cause est inconnue : ne pas le déclarer plancher avant `D-26`. Un second téléphone (testeur de référence, `V-10`) dira si le cas est propre à l'A04 |
| `D-14` | inchangée | gelée (`Q-20`) |
| `A-03` | inchangée | Relevé de nuit au protocole : **dû avant `07`**, désormais sous Chrome (voir §5) |

## 4. Registre des relevés (§6 du suivi)

`R-05` à `R-10` : déjà décrits dans `MT_ventilation-dessiner_2026-09-19.md` (Firefox, F11, échelles 5, 5 bis, 3, 2, 1, et nuit à l'échelle 3).
`R-11` : Chrome, F11, 1920×1080, nuit, Forêt, échelle forcée 8 — 59,9 fps, 0 frame sautée, `dessiner()` 0,34 ms, 49 recalculs à 1,16 ms.
`R-12` : Galaxy A04, Chrome Android, Wi-Fi local, jour, échelle naturelle 3 — 36,8 fps (delta moy 27,19 / p95 49,90 / max 249,30), `maj()` 1,32 ms, `dessiner()` 5,53 ms (p95 12,00), 42 recalculs à 8,69 ms (max 21,60). Canvas visible 2109×840 (dpr 3), tactile.
`R-13` : même appareil, échelle forcée 1 — 40,4 fps (delta moy 24,75 / p95 33,80 / max 182,70), `maj()` 1,27 ms, `dessiner()` 5,36 ms (p95 11,40), 42 recalculs à 8,69 ms (max 24,30).

**Note de protocole à ajouter au §6** : noter désormais le **navigateur** et **plein écran oui/non** ; deux relevés pris sous des navigateurs différents ne se comparent pas.

## 5. Ordre d'injection (remplace le §5 de `NS_decisions-fondations_2026-09-19.md`)

1. Cette NS (doc seule).
2. **Relevés de base avant contenu** — Xav, Chrome, F11, manette, protocole de traversée : un de **jour**, un de **nuit** (clôt `A-03`). C'est le point de comparaison de `07` : sans lui, on accusera les monstres à tort ou on les innocentera à tort.
3. `D-17` — bouton MENU tactile sous le bandeau.
4. `D-25` — plein écran au tactile.
5. `D-13` — buffs au bandeau.
6. `07_chaos-nocturne`, un palier par session. Après chaque palier : le même relevé de nuit, comparé à celui de l'étape 2.
7. `D-01`, `D-16`, puis reprise de `Q-07`.

## 6. Ce que la session doc répercute

- `CLAUDE.md`, « État actuel du dépôt » et « Critère de passage courant » : volet rendu des fondations clos sur PC sous Chrome ; ordre du §5 ; Chrome = navigateur de référence ; renvoi à `docs/DOC_navigateurs.md`.
- `CLAUDE.md`, décisions verrouillées : ligne datée confirmant « rendu net à résolution physique » (`Q-19`), avec son motif mesuré.
- `CLAUDE.md`, règles de méthode, une ligne : **un relevé de performance cite son navigateur ; la référence est Chrome ; Firefox sert de banc de mesure du coût par calque, jamais de verdict de fluidité.**
- `specs/00_ROADMAP.md` → 1.7.0 : changelog + ordre du §5.
- `specs/07_chaos-nocturne.md` : dans la méthode, ajouter le relevé de nuit après chaque palier (clôt la part restante de `DOC-04`).

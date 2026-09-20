---
projet: RPG V2
episode/session: Polish — D-48, l'unité des menus en pixels CSS
type: journal de session (archivé verbatim depuis CLAUDE.md)
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-20
genere_par: claude
verifie_par: —
---

## Journal de session — `D-48` : le menu s'ouvrait à l'échelle 1080p sur téléphone (20/09)

Un ticket, un commit, branche `main` (pas de `push`). Fiche : `docs/archives/MT_menu-echelle-dpr_2026-09-20.md`. 95 fichiers de test verts.

**L'hypothèse du ticket était juste, et elle a été mesurée avant qu'une ligne de correctif soit écrite** (§3 de la fiche l'exigeait). Nouveau scénario `tools/scenarios/diagnostic_unite_dpr.mjs`, sous Chrome sans fenêtre, qui relève `--u` telle que le navigateur la calcule vraiment, à trois moments : ouverture d'un niveau, après un `resize`, entrée dans un sous-écran.

| Profil | ouverture | après `resize` | sous-écran |
|---|---|---|---|
| `pc` 703 × 280, DPR 1 | 1 px | 1 px | 1 px |
| `grand` 1920 × 1080, DPR 1 | 4 px | 4 px | 4 px |
| **`telephone` 780 × 360, DPR 3** | **4 px** | **1 px** | **4 px** |

Tuile de la Poche au téléphone : **240 × 240 px CSS dans une fenêtre de 360 px de haut** — « on ne voit qu'une tuile et demie », mot pour mot le constat de Xav, et le ×4 qu'il avait mesuré sur ses deux captures. Captures `docs/captures/diagnostic-unite-dpr/avant_*.png` et `apres_*.png`.

**Cause racine.** `main.js#rectangleJeu` posait dans les variables CSS du menu le rectangle de `render.js#calculerRectanglePresentation`, dont le contrat est d'être en pixels **PHYSIQUES** (c'est ce qui rend l'image nette, et c'est juste). Une variable CSS, elle, se lit en pixels CSS. Pire : il le lisait sur `canvasVisible.width`, un nombre qui a **deux écritures et deux sens** — `presenter()` y met des px physiques à chaque frame, `ajusterTailleCanvas` des px CSS à chaque `resize`. D'où le symptôme entier : chaque `montrer()` d'un niveau relisait la valeur physique, et un pivot d'appareil rendait la main à l'autre écriture pendant une frame. À DPR 1 les deux nombres sont le même : ni le PC, ni les deux profils de capture d'alors, ni aucun test ne pouvaient le voir. Même famille que « dialogues invisibles » du 15/09.

**Correctif.** Une seule fonction, pure : `menu_cartes.js#rectangleMenuCss({ largeurCss, hauteurCss, dpr })` — elle appelle la même `calculerRectanglePresentation` (jamais une deuxième formule) et divise une fois par le DPR. `rectangleJeu()` ne lit plus le canvas du tout, seulement la géométrie de la fenêtre, qui n'a qu'un sens. Tous les chemins la traversent : ouverture d'un écran, `resize`, `orientationchange` (ajouté), `fullscreenchange` (ajouté — il ne recalait que le libellé de la bascule). L'ordre des écouteurs vis-à-vis de `ajusterTailleCanvas`, dont le code d'avant dépendait par accident, n'entre plus en jeu.

Après correctif : `--u` = **4/3 px aux trois moments** sur le téléphone, `--jeu-x` 70 px / `--jeu-y` 0 — la boîte recouvre **exactement** l'image du jeu (640 × 360 px CSS), tuile de la Poche 80 × 80. **PC inchangé au pixel près** aux deux profils DPR 1. Aucune erreur console.

**Ce qui a été livré avec.**
- `tests/test_d48_unite_menu_px_css_2026-09-20.js` — échoue avec l'ancien calcul (« la boîte (1080 px) doit tenir dans 360 px CSS », vérifié en remettant l'ancien comportement), passe après. Il garde le témoin chiffré du défaut, la non-régression PC au pixel près, et le repli sur DPR 1 pour un `devicePixelRatio` absent ou absurde (une division par zéro ferait disparaître le menu).
- `tools/capture_chrome.mjs` : `chrome.taille(l, h, dpr)`, et **trois profils** dans `tools/scenarios/commun.mjs#PROFILS`, un seul endroit. Motif consigné dans les deux fichiers : à DPR 1, cette classe de défaut est invisible.
- `tools/banc_menu_cartes.html` alignée sur la même fonction — c'était le second endroit qui calculait la boîte du menu, et il aurait menti dès qu'on le regarde à DPR ≠ 1.

**Dans le périmètre, retenu par défaut.** L'unité ne peut pas devenir du CSS pur (piste ouverte par le §4.1 de la fiche) : elle dérive d'une échelle **entière** calculée sur les pixels physiques, puis divisée par le DPR — CSS n'a ni `floor()` ni accès au `devicePixelRatio` dans un `calc()`. Un `min(100vw/480, 100vh/270)` perdrait l'arrondi entier et la boîte ne recouvrirait plus l'image du jeu. Le calcul reste donc en JS, en un seul point.

**Hors périmètre, signalé sans rien toucher.** `ajusterTailleCanvas` (`main.js`) écrit `canvasVisible.width = window.innerWidth` — des px CSS dans un backing store que `presenter()` réécrit en px physiques à la frame suivante. Plus personne ne lit ce nombre-là entre les deux depuis ce ticket, donc ce n'est plus un défaut actif ; c'est un reste de l'avant-rendu-net, et un piège pour le prochain lecteur. Le ticket interdisait d'y toucher (« ne pas toucher : le dimensionnement du canvas »), et c'est bien ainsi : ça mérite son propre ticket — ouvert sous **`D-49`** (P3).

**Reste dû : `V-31`** — Xav, sur téléphone, par l'URL publique, **sans jamais pivoter** : ouvrir le menu puis chaque sous-écran. La mesure dit que la taille est juste ; elle ne dit pas si c'est agréable au doigt.

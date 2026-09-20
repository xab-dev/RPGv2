---
projet: RPG V2
episode/session: Polish — menus en cartes, retours téléphone du 20/09
type: micro-ticket
version: 1.0.0
statut: livré — verdict en jeu dû (`V-31`)
catégorie: Ticket
date: 2026-09-20
Ids_suivi: [D-48 (close 2026-09-20), V-31 (ouverte), D-43, V-28, V-29]
genere_par: claude
verifie_par: —
resultat: hypothèse du §3 CONFIRMÉE par la mesure (profil `telephone`, DPR 3) — voir le journal de session dans `CLAUDE.md`
---

# MT — Le menu s'ouvre à l'échelle 1080p sur téléphone (unité `--u` fausse hors `resize`)

**Priorité : P1.** Les menus en cartes sont illisibles sur téléphone tant que ce n'est pas corrigé.
**Un ticket = un commit.** Ne pas pousser.

## 1. Constat (Xav, Galaxy, Chrome Android, `main` en ligne, 20/09 midi)

- À l'ouverture d'un écran de menu, tout est énorme : on ne voit qu'une tuile et demie.
- **Pivoter le téléphone remet l'écran d'aplomb.** Une capture d'écran système aussi.
- **Entrer dans un sous-écran le recasse.** Retour → pivot → bon ; sous-menu → mauvais ; pivot → bon.
  Reproductible à volonté. Ce n'est donc pas un défaut « du premier affichage » : c'est **chaque ouverture
  d'un niveau** qui pose la mauvaise valeur.
- Invisible au clavier et à la manette sur PC.

## 2. Mesure sur les deux captures (Claude, chat)

| Élément | Écran faux | Écran bon | Rapport |
|---|---|---|---|
| Tuile | ~720 px physiques | ~180 | **×4** |
| Bouton retour | ~285 | ~118 | **×2,4** |

Ce sont exactement les rapports du journal `JOURNAL_2026-09-20_menus-cartes-paliers-B-C.md` entre 703 × 280
(tuile 60, sortie 40) et 1920 × 1080 (tuile 240, en-tête 96). **Le téléphone affiche la mise en page 1080p
dans ~360 px CSS de haut.** 1080 est la hauteur *physique* de l'écran (DPR 3).

## 3. Hypothèse — NON vérifiée, à mesurer avant de corriger

Deux chemins écrivent `--u` (ou la grandeur dont elle dérive) :

- celui de l'**ouverture d'un niveau** lit une mesure en **pixels physiques** (taille du backing store du
  canvas, `screen.* × devicePixelRatio`…) ou une mesure périmée ;
- celui de **`resize`** lit la bonne (px CSS).

À DPR 1 les deux donnent le même nombre, d'où l'invisibilité sur PC **et dans `capture_chrome.mjs`**.
Même famille que le diagnostic « dialogues invisibles » du 15/09 (`CLAUDE.md`, règle sur
`ctx.canvas.width/height`) : une grandeur physique lue là où on attend une grandeur logique.

**Étape 1 obligatoire : reproduire et mesurer** (Chrome sans fenêtre avec `deviceScaleFactor: 3`, viewport
~780 × 360) : valeur de `--u` juste après ouverture, puis après un `resize`. Si l'hypothèse est fausse, le
dire dans le journal et s'arrêter sur la cause réelle avant de coder.

## 4. Attendu

1. **Une seule fonction** calcule l'unité, **en px CSS**, et tous les chemins l'appellent : ouverture d'un
   niveau, `resize`, changement d'orientation, `fullscreenchange`. Si l'unité peut devenir du CSS pur
   (sans JS), c'est encore mieux — à ton initiative, dans le périmètre.
2. Un **test qui échoue avant** le correctif : l'unité à l'ouverture = l'unité après `resize`, à DPR 3.
3. **`tools/capture_chrome.mjs` gagne un troisième profil « téléphone »** (~780 × 360, `deviceScaleFactor: 3`).
   Motif : les deux tailles actuelles sont à DPR 1, elles ne peuvent pas voir cette classe de défaut.

## 5. Périmètre

- **Lire / modifier** : le ou les modules de `src/ui/` qui écrivent `--u`, `index.html` si l'unité y vit,
  `tools/capture_chrome.mjs`, le fichier de test neuf.
- **Ne pas toucher** : `render.js`, le dimensionnement du canvas, `touch.js`, la navigation des écrans
  (`creerNavigationEcrans`), la mise en page elle-même (elle est bonne : la capture « après pivot » le prouve).
- Pas d'analyse globale du dépôt : partir d'une recherche de `--u`.

## 6. Validation (Xav, téléphone, URL publique) — `V-31`

Sans jamais pivoter : ouvrir le menu, puis **chaque** sous-écran (Construction, Poche, Craft, Coffre, Stats,
Paramètres) → tout est à la bonne taille d'emblée. Puis pivoter, entrer et sortir du plein écran : rien ne saute.

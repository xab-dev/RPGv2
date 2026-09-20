---
projet: RPG V2
episode/session: Polish — menus en grille de cartes, palier A
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-43, V-27, D-42, D-30, V-25, V-26, Q-36]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Menus en cartes, palier A (20/09)

`specs/08_menus-cartes.md` v1.0.0, **palier A seulement**. Branche **`menus-cartes`**, créée depuis `main`
(`a605729`). **Aucun `push`** — `push` sur `main` publie le jeu. Le palier B n'est pas commencé.

Une ligne par commit, écrite **au moment du commit** (hygiène de contexte : ce qui n'est dit que dans la
conversation se perd quand elle se résume).

## §0 ter — Chrome est connecté

**Oui.** L'extension répond, un onglet est disponible dès la première seconde de la session. Les captures à
**703 × 280** et à **1920 × 1080** demandées pour A3 et A4 sont prises dans `docs/captures/menus-cartes-2026-09-20/`.
Une vérification dans Chrome dit « ça s'affiche sans défaut », jamais « c'est réussi » : le verdict est `V-27`.

---

## Commit 0 — Ménage de journal et ouverture du chantier (doc seule)

**Ménage.** `docs/JOURNAL_2026-09-20_menu-tactile.md` part dans `docs/archives/`, avec sa ligne d'INDEX. Son brief,
`BRIEF_menu-tactile_2026-09-20.md`, qui traînait à la racine du dépôt, est archivé à côté (même geste que pour les
deux briefs de nuit). `CLAUDE.md` ne garde qu'un journal : le renvoi vers celui-ci.

**Consigné au suivi, sur instruction de Xav** (une ligne `V-` ne se clôt jamais par initiative) : **`V-25` et `V-26`
validées par Xav le 20/09, sur téléphone, par l'URL publique — « all good ».** Donc **`D-42` et `D-30` closes** pour de
bon : les quatre lignes descendent en §8. Les verdicts y sont condensés ; le détail verbatim reste dans le journal
archivé, que chaque ligne cite.

**Ouvert.** Les deux identifiants que la spec annonçait « à créer » étaient **libres**, aucun décalage à signaler :

- **`D-43`** — le chantier « menus en grille de cartes », P1, *en cours* (palier A).
- **`V-27`** — la validation du palier A : menu principal et Sauvegarde, manette / souris / doigt, 1920 × 1080 et
  téléphone, accent des trois follets et accent neutre, focus « plus / moins / bon », `[X]` seul ou avec son mot.

**`Q-36`** reste ouverte et reste à Xav : la ligne dit désormais que la spec la tranche **au palier B** (défaut
retenu : `MENU`, menu ouvert, ferme tout par la même fonction que le `[X]` de la racine). **Rien n'est codé ici.**

**La spec entre dans le dépôt avec ce commit** (`specs/08_menus-cartes.md` était non suivie) : la branche en dépend.

**Signalé** : `CLAUDE.md` fait 315 lignes pour un plafond indicatif de 300 (il en faisait déjà 312). Pas de coupe
faite en passant — ce qui se retire d'un fichier d'instructions mérite d'être relu par Xav.

---

## Commit A1 — Jetons de style, `couleur_ui`, contrôle de contraste

**Livré.**

- **`index.html`** : un bloc `:root { --menu-… }`, **le seul** endroit où une couleur, un rayon ou une épaisseur de
  menu est écrit. Chaque jeton porte son *pourquoi* ; tous sont *provisoires* (§4.5). Les longueurs y sont des
  **nombres d'unités `--u`**, pas des pixels. Rien ne les consomme encore — c'est A3 qui dessine.
- **`data/companions.json`** : `couleur_ui` sur les trois follets, **égale aujourd'hui à `render.couleur`**. Champ
  distinct à dessein : la couleur d'un follet sur un voile de nuit et celle d'une bordure de carte n'ont pas à
  rester égales pour toujours. Le schéma la rend **requise**, en `#rrggbb`.
- **`src/ui/couleurs_ui.js`** (pur) : luminance et contraste WCAG, et `erreursCouleursUi(compagnons, jetons)`.
- **`main.js#demarrerJeu`** : le contrôle tombe **au démarrage**, par le chemin d'erreur existant
  (`afficherErreurBoot`). Les trois jetons utiles sont **relus sur `:root`** (`getComputedStyle`) — la feuille de
  style reste leur seule source, le contrôle n'en garde aucune copie.

**Pourquoi le contrôle ne vit pas dans `validerCatalogues`.** Le registre est pur : il ne voit pas le DOM, donc pas
le fond des cartes. Deux façons d'y remédier : recopier le fond dans un module JS (deux sources, qui divergeront),
ou donner les jetons au contrôle depuis l'endroit qui a un DOM. Retenu : la seconde. Le schéma ne garde que la
**forme** (`#rrggbb`), le contraste se juge jetons en main.

**Deux défauts retenus, à confirmer.**

1. **L'accent neutre passe le même contrôle que les follets.** La spec ne le demandait pas ; c'est pourtant le
   premier accent que le joueur voit, et un jeton que Xav va régler à l'œil.
2. **« Jamais le magenta du danger » = jamais *proche* du magenta** (`DISTANCE_MIN_DANGER = 60`, distance RGB,
   *provisoire*). Une égalité stricte aurait laissé passer `#d6409e`, qu'aucun œil ne distingue. Le feu, l'accent
   le plus proche aujourd'hui, est à ~114 : aucune couleur actuelle n'est inquiétée.

**Mesuré** (contraste sur `#161b24`, minimum 3:1) : les trois follets et l'accent neutre passent, test à l'appui.

**Tests** : `tests/test_d43_a1_jetons_couleur_ui_2026-09-20.js`, six blocs — l'arithmétique (21:1, symétrie, valeur
de référence publiée 4,48:1) · chaque jeton déclaré **une seule fois** · les données **réelles** contre les jetons
**réels**, lus dans `index.html` et jamais recopiés · quatre couleurs fautives, chacune avec son chemin (trop
sombre, magenta, quasi-magenta, mal formée) · un jeton illisible est une **erreur**, jamais un contrôle sauté en
silence · le schéma exige le champ. **84 fichiers de test verts.**

**Vérifié dans Chrome** (pas de capture : rien ne change à l'écran à ce commit) : le jeu démarre, aucun écran
d'erreur, aucune erreur console ; `getComputedStyle` rend bien `#161b24` / `#f2e9d8` / `#d6409f`.

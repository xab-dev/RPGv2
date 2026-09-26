---
name: atelier-visuel
description: Chantier graphique du RPG V2 sur une silhouette de data/visuels.json (héros, follet, arme légendaire, monstre, station) — diagnostic, variantes à l'atelier, choix de Xav, pas en données, preuve au pixel. À utiliser dès qu'un ticket retouche un dessin ou en crée un, ou qu'un allègement de code doit prouver qu'il ne change rien à l'image.
---

# L'atelier visuel

Née des sessions du héros (spec 16, `D-252` à `D-279`, 26/09) et écrite une
fois pour tous les visuels (spec 17, palier A). Xav juge à l'œil, à la taille
du jeu ; Claude prépare des choix qu'il peut juger vite, et prouve ce qui se
prouve (au pixel). **Aucun rendu n'est dit « validé » sans que Xav l'ait vu en
jeu.**

## Les outils (serveur local : `node serveur_local.js`, lancé par `mesure_visuel` s'il ne répond pas)

| Outil | Pour quoi |
|---|---|
| `tools/atelier.html` (capture : `tools/scenarios/atelier.mjs`, `RPG_Q=…`) | la planche : les vues (`&dirs=` ou `&angles=`), les teintes, les fonds (`banc`, `jour`, `herbe`, `nuit` sous le voile), la marche rejouée (`&marche=90,180`), et **les variantes côte à côte** (`&variantes=x.js`) |
| `tools/variantes/*.js` (non versionné) | une variante = une retouche de l'entrée actuelle : `export default (actuel) => ({ nom: entrée })`, l'entrée reçue est déjà clonée |
| `node tools/mesure_visuel.mjs diff [--ref main] [--id tous]` | l'écart au pixel contre une référence Git (huit directions, tour tous les 5°, marche rejouée, ×3 et ×9) — **le filet de tout allègement** : 0 attendu |
| `… cles` / `… saut` | les poses clés tenues à tout angle ; les pics d'écart entre angles voisins (un « claquement ») |
| `… proportions [--refs 66-76,90] [--variantes x.js] [--echelle 9]` | la silhouette mesurée au degré près (sommet, capuche, place et aire VISIBLES des pièces) et l'écart aux angles que Xav aime — à lancer avant la couche « proportions » d'un visuel ; la page trace les courbes |
| `… fuite` / `… cache` | le contexte rendu comme trouvé ; les dégradés gardés justes |
| `tools/scenarios/loupe_scene.mjs` | la silhouette EN JEU à la loupe : `RPG_CASE`, `RPG_HEURE=nuit`, `RPG_TEINTE`, `RPG_QUALITE`, `RPG_GESTES=KeyA:90,KeyA:400,-` |
| `tools/banc_tour.html` | le héros à tout angle, animé, à la main (curseur, pavé-stick, Agilité) |
| `tools/banc_orientations.html`, `tools/banc_visuel.html` | la rose des huit vues ; un visuel aux tailles réelles (monde ×1, ×3, Poche) |
| `node tools/remplacer_visuel.mjs <id> <fichier.json>` | faire entrer une variante retenue au catalogue sans reformater le reste |

Les captures vont dans le bloc-notes de la session (ou `docs/captures/scenarios/`,
ignoré), jamais dans le dépôt sauf album de référence ou audit demandé.

## La boucle

1. **Diagnostic** : regarder avant de toucher. Planche de l'existant
   (atelier, fonds `banc,jour,nuit`) et loupe en jeu (jour et nuit). Si Xav dit
   « plus petit », « décalé », « saute » : **mesurer les pixels** (`saut`, une
   boîte, un écart) avant de corriger.
2. **Plan court**, par couches (proportions → traits → lumière et ombres →
   détails → effets), une couche à la fois.
3. **Trois variantes** dans `tools/variantes/<sujet>.js`, montrées à
   l'atelier aux angles que Xav cite (les siens pour le héros : 66–76°, 90°,
   132°, 241°, 300°, 342°). Capture, regarder soi-même, puis montrer.
4. **Xav choisit** (il regarde Chrome à côté du terminal : sa réaction dans la
   session est le verdict en jeu). Un mot de direction (« à gauche ») peut
   désigner la vue qu'il regardait, pas celle qu'il nomme : si un chiffre
   contredit ce qu'il voit, le montrer avant de « corriger ». Un trait tracé sur
   une capture peut vouloir dire « suivre » ou « ne pas franchir » : demander.
5. **Pas en données seulement** quand c'est possible : `remplacer_visuel.mjs`,
   puis `npm test` (le démarrage valide le catalogue). Un besoin de code (une
   clé de pièce nouvelle) passe par `schemas.js#validerVisuel` et un test de
   contrat, jamais une valeur épinglée.
6. **Preuve** : `mesure_visuel diff --ref HEAD --id tous` ne touche QUE le
   visuel voulu, et `cles` reste à zéro. Une vue que Xav a dite « parfaite »
   reste identique à l'octet.
7. **Commit toutes les trois itérations** (ou plus tôt quand Xav dit « commit
   d'abord »), une ligne `V-` pour ce qu'il doit revoir en jeu. Tard le soir,
   il le dit lui-même : on s'arrête, on reprend le lendemain.

## Les règles du dessin (décisions en vigueur)

- La lumière vient **d'en haut à gauche**, dans toutes les vues.
- **Aucun effet ne bat au-delà de 3 Hz** (épilepsie) ; la graine d'un effet
  dit QUI est l'objet, jamais où il est.
- Pas de `ctx.filter`, pas de bitmap : le volume vient de formes annexes
  (reflet, facette, dégradé), un dégradé déclare son `centre`.
- Une silhouette se juge **à la taille du jeu, en scène** ; agrandir se fait
  au plus proche voisin, jamais en agrandissant la transform.
- On ne régénère pas un dessin validé en jeu ; retoucher un visuel partagé
  avec un hors-périmètre, c'est lui en donner un propre.
- Un effet allégé par un preset (glow, particules) reçoit **un NOMBRE** (le
  levier de `data/graphismes.json` : `particules`, `ornements`), jamais le
  preset ; ce qu'un preset retire se déclare en données, sans repli ; zéro
  n'est pas une absence.
- Un nouveau visuel : un `id` `visuel_<nom>`, l'`echelle` en données (la
  collision lit le même champ), `teintable` s'il prend la couleur du follet.

## Check-list d'un chantier neuf (arme légendaire, follet, monstre…)

- [ ] planche de l'existant et de ses voisins (`banc_visuel.html?id=a,b,c` : le standing se juge côte à côte)
- [ ] loupe en jeu, jour et nuit, dans les trois presets si des effets en dépendent
- [ ] variantes à l'atelier, choix de Xav, entrée par `remplacer_visuel.mjs`
- [ ] `mesure_visuel diff` (seul le visuel voulu bouge), `cles` et `saut` s'il a des orientations, `fuite` s'il ajoute du code de rendu
- [ ] `npm test`, une `V-` au suivi, `docs/CHECKLIST_visuelle.md` si le rendu du jeu change
- [ ] sentinelle `banc-perf` si le visuel est à l'écran en permanence (le héros, le follet) et gagne des primitives

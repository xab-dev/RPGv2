# RPG V2 — SPEC : Indices de commande (« montrer chaque touche une fois »)

**Version : 1.0.0** — 2026-09-16. Décision Xav du même jour : le joueur n'est jamais guidé, mais chaque commande lui est **montrée une seule fois**, au moment où elle sert. Exemple canonique : au-dessus du premier levier de la salle 1 de la grotte, « appuie sur ⟨glyphe⟩ » ; rien sur les trois leviers de la salle 2.

**Contexte déjà disponible pour Claude Code** : `CLAUDE.md` (journaux, règle de transform du contexte 2D, `specs/CHECKLIST_visuelle.md`), `specs/01_socle-technique.md` (couche d'input : `input.js` état abstrait, `gamepad.js`, `keyboard.js`, `touch.js`), `specs/02_grotte.md` (flags/unlocks, `puzzles.js`, dialogue localisé), `src/ui/hud.js` et `hud_layout.js` (patron d'affichage HUD), `data/flags.json`.

## 1. Rôle du module

Afficher, la **première fois** qu'un verbe de gameplay devient utile, un indice bref au HUD : le glyphe de la commande **sur le périphérique actif**, éventuellement un mot localisé. Ce n'est pas un tutoriel : aucune séquence, aucun blocage, aucune répétition. Le gameplay ne sait pas que l'indice existe ; il émet des événements de « verbe utile », l'indice s'affiche s'il n'a jamais été montré.

## 2. Entrées / Sorties

**Données** — `data/hints.json` (nouveau catalogue, extensible sans code) :

| Champ | Contenu |
|---|---|
| `id` | `hint_move`, `hint_interact`, `hint_attack`, … |
| `verbe` | un verbe de la couche d'input : `MOVE`, `INTERACT`, `ATTACK`, `SKILL_1..3`, `CONSUME`, `MENU` |
| `declencheur` | événement de gameplay qui rend le verbe utile (§3) |
| `label_key` | clé i18n optionnelle (`"hint.interact"` → « Actionner » / « Interact ») ; le glyphe seul est acceptable |
| `duree_ms` | provisoire, ex. `2500` |
| `flag` | flag posé quand l'indice a été montré (`flag_hint_interact`), déclaré dans `flags.json`, **persisté** dans la sauvegarde : « une fois » = une fois par partie ; un reset le remontre, c'est voulu |

**Glyphes** — `data/glyphes.json` (nouveau) : pour chaque verbe, le rendu par périphérique : `clavier` (texte : `E`, `Espace`, `ZQSD`/`WASD` selon la locale ou la disposition détectée si le socle l'expose), `manette` (nom du bouton : `A`, `X`, `stick G`), `tactile` (référence au bouton du layout tactile). Aucun texte joueur en dur : un glyphe textuel passe par `t("clé")` s'il varie par langue.

**Entrée runtime** : le **périphérique actif** = celui du dernier geste reçu par la couche d'input (à exposer depuis `input.js` si ce n'est pas déjà fait — un seul endroit, jamais lu ailleurs que par ce module).

**Sortie** : un calque HUD éphémère (glyphe + mot), positionné par `hud_layout.js`, dessiné via la fonction unique qui restaure la transform (règle du diagnostic dialogues-invisibles). Aucune sortie vers le gameplay.

## 3. Comportement attendu

- Déclencheurs livrés avec ce module (les trois de la Grotte) :
  - `MOVE` → fin de la cinématique de la salle 1, à la prise de contrôle.
  - `INTERACT` → héros à portée d'interaction du **premier** interactif rencontré (le levier de la salle 1), même seuil que `puzzles.js`.
  - `ATTACK` → premier monstre engagé (salle 2), à l'entrée dans `distance_engagement`.
- Un indice s'affiche **si son flag n'est pas posé**, pose le flag immédiatement, disparaît après `duree_ms` **ou** dès que le verbe est effectivement émis (le joueur a compris). Fondu court, pas de son.
- Le glyphe suit le périphérique actif **au moment de l'affichage** ; si le joueur change de périphérique pendant l'indice, l'indice se met à jour (pas de nouvel indice).
- Ajouter un indice futur (`SKILL_1` en Phase 4, `CONSUME` en Phase 3) = une entrée dans `hints.json` + un déclencheur existant ou un nouvel événement de gameplay nommé — jamais un cas particulier dans le module.
- Rien au menu : pas de page « Commandes » (alternative écartée par Xav pour l'instant, §8).

## 4. Edge cases à gérer

- Verbe émis **avant** le déclencheur (le joueur appuie sur `INTERACT` au hasard avant le levier) : l'indice ne se montre jamais — poser le flag à la première émission du verbe. Xav ne veut pas montrer ce que le joueur sait déjà.
- Deux déclencheurs dans la même frame (rare) : un seul indice affiché à la fois, le second attend la fin du premier.
- Indice actif quand une UI s'ouvre (menu, dialogue) : masqué, reprend au retour — comme tout le gameplay sous UI.
- `hints.json` référence un verbe inconnu, un flag non déclaré ou un glyphe absent pour un périphérique : échec dur au boot (même politique que les autres catalogues).
- Sauvegarde antérieure sans ces flags : les flags absents valent « non montré », aucune migration de schéma nécessaire si `flags` est déjà un dictionnaire ouvert ; sinon migration explicite.

## 5. Structure des fichiers

```
src/
├── hints.js               (état des indices, réaction aux déclencheurs, choix du glyphe — importable Node, aucun DOM)
├── ui/hud_hints.js        (dessin du calque, via hud_layout.js)
data/
├── hints.json
├── glyphes.json
tests/
├── test_hints_<date>.js   (déclenchement unique, flag posé, verbe émis avant, périphérique actif, catalogue invalide)
locales/fr.json, en.json   (clés hint.*, glyphes textuels si localisés)
```

## 6. Consignes d'autonomie pour Claude Code

- Réutiliser le patron flags/unlocks et le calque HUD existant ; pas de nouveau système de timers si `hud.js` en a déjà un (toast, flash d'attaque).
- La détection du périphérique actif vit dans la couche d'input, le module `hints.js` la consomme. Zéro `KeyboardEvent`/`Gamepad` hors `input/`.
- Ne pas décider de la disposition clavier (ZQSD/WASD) si le socle ne l'expose pas : afficher ce que `keyboard.js` mappe réellement, marquer `[OUVERT]` la détection de disposition.
- Rejouer `specs/CHECKLIST_visuelle.md` (ajouter un état « indice INTERACT au levier ») : le module touche `hud.js`/`main.js#dessiner()`.

## 7. Critères de validation

Automatisé : suite complète verte ; test dédié : (a) déclencheur → indice affiché une fois, flag posé ; (b) rechargement de la scène → pas de second affichage ; (c) verbe émis avant déclencheur → jamais affiché ; (d) glyphe = celui du périphérique actif ; (e) catalogue invalide = échec au boot.

Manuel (Xav, manette puis clavier) : nouvelle partie → indice `MOVE` à la prise de contrôle ; indice `INTERACT` en arrivant sur le levier de la salle 1, disparaît à l'appui ; **rien** sur les 3 leviers de la salle 2 ; indice `ATTACK` au premier monstre ; passer au clavier en cours d'indice → le glyphe change. Verdict Xav sur la durée et la position.

## 8. Hors scope pour cette itération

Page « Commandes » dans le menu (alternative non retenue), remappage des touches, indices pour `SKILL_*`/`CONSUME` (leurs phases), détection de la disposition clavier, indices tactiles vérifiés en réel (dette tactile jusqu'à la Phase 4 — le glyphe tactile doit exister en données, sa vérification attend).

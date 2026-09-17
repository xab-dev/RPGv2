# RPG V2 — MT : Construction — bandeau de placement à la place de l'écran-liste (2026-09-17, 17h45)

**Type** : micro-ticket UI/UX. Remplace la fiche SD ouverte à 17h30 : la console navigateur est propre (seuls les 404 attendus : favicon, `piano_solo.mp3` avec repli synthé), le mode fonctionne (sélection, déplacement, rotation, pose confirmés à la manette par Xav). Ce n'est pas un bug : `05_construction-stations.md` §3 disait « les touches du mode sont affichées dans le menu lui-même » et l'implémentation a gardé **tout l'écran-liste affiché** pendant le placement. Résultat : la pièce est masquée par un écran plein, ce qui annule l'intérêt du housing (on place à l'aveugle), et sortir demande `MENU` puis redescendre sur « Quitter ».

**Précision de spec, pas nouvelle décision** : le §3 signifiait « pas via `hints.js` », pas « l'écran-liste reste ouvert ». Amender la fiche 05 en ce sens (v1.0.1).

**Ménage de journal d'abord** (règle de méthode), puis lecture de `CLAUDE.md` et de cette fiche.

---

## 1. Comportement attendu

Trois états, une seule machine (`main.js#construction` existe déjà) :

| État | Ce qui est affiché | Verbes |
|---|---|---|
| **Liste** (inchangé) | écran-liste DOM des stations `placable`, plein écran comme aujourd'hui | navigation `MOVE.y`, confirmer `ATTACK`, retour `SKILL_3`/`MENU` |
| **Placement** (à changer) | **l'écran-liste disparaît** ; la pièce est visible avec le fantôme ; un **bandeau compact** en bord d'écran (haut ou bas, hors zone utile de la pièce) : nom de la station, `MOVE` déplacer · `SKILL_1` tourner · `A` poser · `B` annuler · `MENU` quitter | routés vers la machine construction comme aujourd'hui |
| **Après pose ou annulation** | retour au comportement décidé en §4 | — |

Le bandeau est une UI permanente du mode → jamais via `hints.js` (inchangé), textes via `t()`, glyphes via `input.peripheriqueActif()` **si c'est peu coûteux** (aujourd'hui `ui/menu.js` n'y est pas branché — dette connue ; la brancher ici est acceptable si ça ne touche que le bandeau, sinon rester en glyphes manette et le noter).

## 2. Où le mettre : DOM ou canvas

Deux options, à trancher par Claude Code sur ce critère : **ne pas toucher `render.js`/`main.js#dessiner()` si un chemin DOM équivalent existe** (chaque passage par le rendu impose de rejouer toute la `CHECKLIST_visuelle.md`, et le fantôme y a déjà coûté les états 29-32 non encore validés).

- **A — bandeau DOM** (recommandé) : nouveau type d'écran non plein-écran dans `ui/menu.js`, monté/démonté par le **même point unique** que les autres écrans (`afficherEcran()`, décision 2026-09-15). Attention : ce point a précisément été unifié parce qu'un sous-écran sans style plein-écran était invisible (`JOURNAL_2026-09-15_diagnostic-reset-invisible.md`) — un écran *volontairement* partiel doit donc déclarer son style explicitement, pas hériter par défaut. Ne reçoit aucun focus (aucune navigation), donc pas de conflit avec le routage des verbes vers la machine construction.
- **B — bandeau canvas** (`ui/hud.js`) : cohérent avec le HUD de jeu, mais touche le rendu → checklist complète rejouée, et double la logique de layout texte déjà présente côté DOM.

## 3. Invariants à préserver

- Le jeu reste **gelé** pendant tout le placement (`uiOuverteMaintenant()` vrai) — faire disparaître l'écran-liste ne doit pas faire croire à la boucle qu'aucune UI n'est ouverte. Test headless : invariant « construction active ⇒ UI ouverte » après chaque étape.
- Une seule transition atomique liste → placement (retrait de l'écran + levée du bandeau dans la même fonction), pas d'état intermédiaire observable par la boucle.
- Aucun second mécanisme d'affichage d'écran, aucune chaîne en dur, aucun `KeyboardEvent` hors `input/`.

## 4. Décisions actées par Xav (2026-09-17, 17h50) — ne pas rouvrir

| Point | Décision |
|---|---|
| Support du bandeau | **DOM** (option A). Xav prévoit de le réutiliser plus tard (équipement, etc.) — mais règle de méthode : **pas de système généralisé avant un 2ᵉ cas d'usage réel**. Ici : un écran partiel paramétré par son texte, rien de plus ; la généralisation attend l'équipement. |
| `A` (pose confirmée) | Retour à la **liste** des stations plaçables — on enchaîne et on range toute la maison sans repasser par `MENU`. |
| `B` pendant le placement | Annule la pose en cours, retour à la **liste**. |
| `MENU` pendant le placement | Annule la pose en cours et revient **proprement au menu Pause** (menu principal), d'où « Quitter » ferme comme d'habitude. Jamais de menu Pause superposé au placement. |
| Rendu du bandeau | Commandes de base affichées **en filigrane** (translucide, discret) pendant tout le placement — toujours lisible, jamais au premier plan. |
| Position | Provisoire = bas, à valider au ressenti. |

## 5. Livrables

- `05_construction-stations.md` → v1.0.1 (§3 précisé : écran-liste retiré pendant le placement, bandeau DOM en filigrane ; flux `A`/`B`/`MENU` du §4 ci-dessus inscrits comme décisions, pas en `[OUVERT]`).
- Code : option A (décidé). `tests/test_construction_2026-09-17.js` étendu : liste → placement → `A` → retour liste ; `B` → retour liste sans écriture dans `save.maison.stations` ; `MENU` → menu Pause, pose annulée, aucun écran orphelin ; invariant « construction active ⇒ UI ouverte » à chaque étape.
- `docs/CHECKLIST_visuelle.md` : états 29-32 toujours dus, + un état « bandeau de placement ». Validation manette par Xav.
- Journal de session `CLAUDE.md` ; les 2 `[OUVERT]` de la fiche 05 restent tels quels.

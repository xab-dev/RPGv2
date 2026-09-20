---
projet: RPG V2
episode/session: Polish — menus en cartes, retours clavier du 20/09
type: micro-ticket
version: 1.0.0
statut: clos (livré le 2026-09-20 ; validation en jeu V-32 due)
catégorie: Ticket
date: 2026-09-20
Ids_suivi: [D-50, V-32, D-30, Q-36]  # D-49 était déjà pris (ajusterTailleCanvas) : ce ticket est D-50
genere_par: claude
verifie_par: — (V-32 : Xav, clavier, Chrome PC)
---

# MT — En plein écran, Échap court ferme le menu ; Échap long quitte le plein écran

**Priorité : P2** (confort clavier). **À faire après `MT_menu-echelle-dpr`.**
**Un ticket = un commit.** Ne pas pousser.

## 1. Constat (Xav, clavier, Chrome PC, 20/09)

En plein écran, un Échap ferme le menu **et** quitte le plein écran. Le journal de la nuit le signalait
(« rien à corriger ici, c'est le navigateur ») : c'est vrai pour la sortie elle-même, mais le navigateur
offre un moyen de la différer.

## 2. Décision de Xav

- **Échap reste la touche MENU.** Pas de seconde touche, pas de remappage. `Q-36` inchangée.
- Appui **court** → le jeu reçoit Échap (MENU). Appui **long** → sortie du plein écran.

## 3. Moyen : l'API Keyboard Lock, et rien d'autre

`navigator.keyboard.lock(['Escape'])` : tant que le plein écran **demandé par le jeu** est actif, Échap est
livré à la page ; le navigateur garde de lui-même la sortie sur **appui maintenu (~2 s)** et affiche son
propre message. **L'appui long n'est donc pas à coder** : aucun minuteur, aucune détection de durée dans le jeu.

## 4. Attendu

1. Dans **`src/plein_ecran.js`** (le seul module qui connaît l'API plein écran) : à chaque
   `fullscreenchange`, d'après l'**état réel** (`estActif()`) — actif → `keyboard.lock(['Escape'])` ;
   inactif → `keyboard.unlock()`.
2. **Amélioration progressive, échec silencieux** : API absente (Firefox, Safari), contexte non sécurisé,
   promesse rejetée → rien ne change, aucune erreur en console, aucun message au joueur.
3. `ui/menu.js` et `input` **n'apprennent rien** : ils reçoivent un Échap comme d'habitude.
4. Tests : API absente → pas d'exception ; `lock` rejeté → silencieux ; `unlock` appelé à la sortie ;
   jamais de `lock` hors plein écran.
5. `DOC_navigateurs.md` : une ligne — « Échap court/long en plein écran : Chromium seulement ; ailleurs,
   Échap fait les deux ».

## 5. Limites connues (à ne pas chercher à contourner)

- Ne vaut que pour le plein écran passé par l'entrée de menu / `requestFullscreen`, pas pour F11.
- Exige HTTPS ou `localhost` — le cas du jeu en ligne et du dev local.
- Tactile et manette non concernés.

## 6. Périmètre

- **Modifier** : `src/plein_ecran.js`, son fichier de test, `docs/DOC_navigateurs.md`.
- **Ne pas toucher** : `ui/menu.js`, le mapping des touches, `touch.js`, le loquet de `demanderUneFois()`.

## 7. Validation (Xav, clavier, Chrome PC) — `V-32`

Plein écran par le menu → Échap court : le menu se ferme, le plein écran **reste** · Échap court : le menu
se rouvre · Échap maintenu : sortie du plein écran · hors plein écran : Échap se comporte comme avant.

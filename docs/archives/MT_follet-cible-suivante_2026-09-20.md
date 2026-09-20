---
projet: RPG V2
episode/session: Polish — follet, changement de cible
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-20
Ids_suivi: [D-52 (proposé — à créer), V-35 (proposé), Q-40 (proposé : le geste tactile)]
genere_par: claude
verifie_par: —
---

# MT — « Cible suivante » : le joueur fait changer le follet de monstre (manette et clavier)

**Priorité : P2.** **À faire après `MT_follet-engagement-relache`.** **Un ticket = un commit.** Ne pas pousser.

## 1. Décision de Xav (20/09)

Un nouveau verbe : **cible suivante**. **RB** à la manette, **Tab** au clavier. Le follet change de cible ;
l'ordre est « le plus proche du héros d'abord ». Le tactile est **à définir** (`Q-40`) : hors de ce ticket.

## 2. Vérifié dans le dépôt

RB (bouton 5) et `Tab` sont **libres** (`gamepad.js`, `keyboard.js`). Le verbe s'ajoute à `VERBES_BOUTON`
(`input.js`) ; la source tactile n'en sait rien pour l'instant.

## 3. Attendu

1. Verbe `target_next`, sur front montant (`pressed`), gameplay seulement (rien quand une UI est ouverte —
   point de décision unique existant).
2. **Candidats** = monstres vivants **en deçà de la distance de relâche** (ceux que le follet ne lâcherait pas
   aussitôt), triés par distance au héros. Un appui passe au suivant de la liste après la cible courante, et
   boucle. Zéro ou un candidat : sans effet, sans son, sans erreur.
3. Une cible **choisie** tient jusqu'à sa mort ou sa relâche — la règle automatique « le plus proche » ne la
   reprend pas entre-temps.
4. Le changement passe par le **vol amorti** du ticket précédent : jamais de saut.
5. **`Tab` : `preventDefault` en jeu**, sinon le navigateur déplace le focus hors du canvas. Menu ouvert, ne
   rien intercepter.
6. La fonction de choix est **pure** dans `companion.js` (`cibleSuivante(follet, hero, monstres)`), testée :
   ordre, bouclage, cible morte entre deux appuis, candidat hors portée ignoré.

## 4. Périmètre

`src/companion.js`, `src/input/input.js`, `keyboard.js`, `gamepad.js`, l'appel dans `main.js#mettreAJourCombat`,
les tests. **Ne pas toucher** `touch.js`. L'indice de commande du nouveau verbe (`hints.js`) : **proposer**,
ne pas livrer.

## 5. Validation (Xav, manette puis clavier) — `V-35`

Trois monstres autour du héros : RB fait passer le follet de l'un à l'autre, du plus proche au plus loin, puis
revient au premier · la cible choisie tient quand un autre monstre s'approche davantage · Tab ne fait jamais
sortir le focus du jeu.

---
projet: RPG V2
episode/session: Polish — follet, retours de jeu du 20/09 soir
type: micro-ticket
version: 1.0.0
statut: clos (livré le 2026-09-20 ; validation en jeu V-33 due)
catégorie: Ticket
date: 2026-09-20
Ids_suivi: [D-51, V-33, D-37 (partie « l'aura n'a aucun effet » seulement), D-38]  # D-51 et V-33 créés au ticket ; D-52 ouverte en passant (test D-34 rouge avant le ticket)
genere_par: claude
verifie_par: — (V-33 : Xav, en jeu, Grotte et extérieur de nuit)
---

# MT — Les effets du follet sur les monstres sont morts ; les rebrancher sur l'aura réelle

**Priorité : P1** (régression de gameplay). **Un ticket = un commit.** Ne pas pousser.

## 1. Constat (Xav, 20/09 soir)

Le follet feu ne fait plus de dégâts. Le follet se colle toujours au monstre ; le bonus côté joueur marche.

## 2. Cause — lue dans le dépôt (Claude, chat), à confirmer par un test qui échoue

- `65a80f1` (`07-B`, correction de `D-38`) : un monstre a désormais un **id d'instance** (`enemy_x#12`).
- `status.js#statsEffectivesMonstre` compare `follet.cibleMonstreId` (instance) à `monstreDonnees.id`, et
  `main.js#mettreAJourCombat` lui passe la fiche **catalogue**. Toujours faux → `dansAura` jamais vrai.
- Touche les **trois** effets monstre (brûlure, affaiblissement, entrave), dans toutes les scènes.
- `test_phase1_status_synergies` est resté vert : ses monstres gardent l'id par défaut (= id catalogue).

## 3. Décision de Xav

« Il faut que l'aura serve à quelque chose » : **ce qui est dessiné est ce qui agit**, comme pour la lumière
(`rayon_lumiere` est à la fois le halo affiché et le trou dans le voile). On ne répare donc pas la comparaison
d'ids : on **supprime l'approximation**.

## 4. Attendu

1. **« Dans l'aura » devient géométrique** : un monstre vivant est dans l'aura si sa distance au **centre
   logique de l'aura** (le point du follet dont `D-39` fait dériver corps et aura — pas le corps décalé)
   est ≤ au rayon d'aura. Plus aucune comparaison d'id dans `statsEffectivesMonstre`.
2. **Plusieurs monstres peuvent être dans l'aura en même temps** et reçoivent tous l'effet. C'est voulu :
   la 1ʳᵉ zone de monstres aura des groupes. (Lève la réserve « Phase 4 réévaluera » du commentaire actuel.)
3. **Le rayon d'aura se lit par une fonction de résolution** `resoudreRayonAuraPx(companion)` dans
   `companion.js`, sur le modèle de `resoudreOrbiteRayonPx` : elle rend la donnée telle quelle aujourd'hui.
   Le **dessin** du cercle (`main.js`) et la **règle** lisent la même fonction — jamais deux nombres.
   **Aucun modificateur livré** (équipement `Q-29`, pourcentages de synergie : plus tard, branchés ici).
4. `statsEffectivesMonstre` reste **pure** : elle reçoit ce dont elle a besoin (position du monstre, centre et
   rayon de l'aura), elle ne va rien chercher.
5. Tests : (a) un monstre à id d'instance `#N` dans l'aura reçoit le DoT — **échoue avant** ; (b) deux monstres
   dans l'aura le reçoivent tous les deux ; (c) un monstre juste hors du rayon ne reçoit rien ; (d) les trois
   éléments ; (e) le rayon du cercle dessiné et celui de la règle viennent de la même fonction.

## 5. Hors périmètre — ne pas toucher

- **La règle d'engagement** (`DISTANCE_ENGAGEMENT_PX`, `mettreAJourEtat`) : c'est le reste de `D-37`, ticket
  suivant, après décision de Xav sur la règle de relâche.
- Les valeurs de `companions.json` (réglées à la main par Xav le 20/09 : aura 30, lumière 90 — **décidées**).
- Les effets eux-mêmes (`status_effects.json`), le rendu de l'obscurité, l'orbite.

## 6. Périmètre de lecture

`src/status.js`, `src/companion.js`, `src/main.js` (`mettreAJourCombat` et le dessin de l'aura, ~l. 1370-1415
et ~l. 2123-2140), `src/vol_follet.js` si le centre logique y vit, le test des synergies. Rien d'autre.

## 7. Validation (Xav, en jeu) — `V-33`

Follet feu : un monstre dans le cercle pointillé clignote et perd des PV sans être frappé ; hors du cercle, non.
Deux monstres dans le cercle : les deux brûlent. Eau : le monstre frappe moins fort. Terre : il ralentit.
Grotte et extérieur de nuit.

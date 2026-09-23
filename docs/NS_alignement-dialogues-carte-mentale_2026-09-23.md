---
projet: RPG V2
episode/session: Alignement, dialogues à conséquences, carte mentale v1.7.0
type: note de synthèse
version: 1.1.0
statut: relu
catégorie: Doc
date: 2026-09-23
Ids_suivi: D1⑧ · D2 · D6③ · D11⑦ · D12 · D13 · D16 · P1 · C5 · Q-50 · Q-62 · E-02 · (Q- à numéroter au ménage, après Q-76)
genere_par: claude
verifie_par: xav
---

# NS — Alignement, follet-LLM scripté, carte mentale v1.7.0

Emplacement proposé : `docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md`. Trois usages : (1) consigner les décisions de Xav des 22 et 23/09, (2) donner à Claude Code la liste **exacte** des amendements documentaires (session de documentation pure, aucun code), (3) fixer ce qui reste à trancher avant toute spec. **§2 tranché le 23/09 : les specs 10 et 11 peuvent s'écrire.**

---

## 1. Décisions de Xav (22 et 23/09) — à porter en décisions datées dans `CLAUDE.md`

| # | Décision | Ce que ça révise |
|---|---|---|
| 1 | **Esprit reste la réserve des compétences** (D1⑧ confirmée ; `D-141` du 23/09 pose déjà la dérivée « réserve d'esprit, 10/point »). L'idée du 22/09 « Esprit = alignement » est **abandonnée** | rien — annule l'ouverture du 22/09 |
| 2 | **L'alignement est une stat cachée, distincte**, jamais affichée (ni dans Stats, ni au HUD), jamais modifiable par le joueur ; seul indice : les effets visibles en jeu. Présente **dès le début du jeu** | D11⑦ « alignement M2+ » → **M1** ; ROADMAP « alignement bien/mal : M2+ » → M1 |
| 3 | **Bornes `[−5 ; +5]`, 0 neutre, pas de 0,5, pondération par action** (un dialogue peut peser +5 d'un coup, −5, ou 0,5). Bornes resserrées pour que le retour du négatif au positif reste possible | — |
| 4 | Les effets passent **uniquement par le follet**. Côté négatif : **orbite inversée** (sens de rotation) — premier signe visuel, sans effet de jeu, à valeur d'expérience — et **changement de camp** de la synergie : la brûlure tombe sur le héros, et le bonus de Force du joueur est **amplifié** (+2 ou +3). Contrepartie positive assumée ; des consommables de régénération viendront plus tard comme contre. **La lumière du follet n'est pas touchée** ; l'idée « follet en bord d'écran » est abandonnée | Table des synergies (D6③, `02_grotte.md` §3.4) gagne une colonne « régime négatif » |
| 5 | **Variables candidates** de l'alignement, à chiffrer : spam de A pendant un dialogue · lecture complète des dialogues · réponse oui / non / neutre · nombre de morts · (liste ouverte) | — |
| 6 | **Tous les dialogues existants sont à revoir** (FR et EN, volume faible vérifié par Xav) pour porter les conséquences typées | D12 ①②③ passent d'ouverts à « en chantier » |
| 7 | **Le follet est un LLM scripté** : le héros c'est Xav, le follet c'est Claude. Narration : on se réveille enfant, on ne sait rien ; le follet apprend la vie sans expliquer, laisse découvrir étape par étape. Arc : de l'usage simple (« bonjour, quel temps demain ? ») au power user ; les échanges poussés donnent alignement, compétences, résolution d'énigmes. Dialogues à réponses multiples et suite narrative **au Nv.15** | D13 ②④⑤ orientés ; volume de texte (risque 0bis) à rechiffrer |
| 8 | **Boucle 5 min** : sortir → récupérer → combattre → revenir → stocker → cuisiner → équiper. **Rythme mesuré par Xav** : Nv.0 → 10 en ~20 min tranquille, Nv.15 en profitant de la nuit | Carte mentale §2 (chiffrage ⚪ → ✅), `Q-62` à mettre à jour |
| 9 | **Pas de nouvelle carte pour l'instant.** Le contenu s'agrandit **dans** la carte Maison : annexes, tunnels, petites découvertes. La « nouvelle zone » sort de la boucle 1 h | Carte mentale §2 boucle 1 h, §3, §3bis ; ROADMAP « avant toute nouvelle carte » |
| 10 | **Progression globale** : Réveil grotte → feu → terroir → Maison (récolte, craft, survie, chasse nocturne) → **Annexe 1** : mini-boss 1 + énigme 1 (le lieu reste, récompense régulière une fois l'énigme résolue), respec des stats et re-choix du follet (illimité, gratuit, depuis le menu), premières compétences → **Annexe 2** : zone de mobs + tunnel à travers la carte, mini-boss 2, énigme 2 → débloque la nouvelle zone | Carte mentale §3 ; D11⑤ « changement débloqué après Boss 1 » → **après Annexe 1, illimité et gratuit** ; D1⑥ « respec après Boss 1 » → après Annexe 1 |
| 11 | **Éclats et coût des crafts : on ne touche pas.** « Il faut faire un choix et ça se mérite » | `Q-69` : la chaîne nuit → éclats → outils est **voulue** |
| 12 | **D2** : le RPG prévoira à terme **plus** d'éléments que haTD ; les trois actuels restent, la table reste extensible en données | Risque 0bis « cohérence RPG ↔ haTD » : reformulé (ce n'est plus haTD qui en a trop) |
| 13 | **P1 assumé** : open source, vitrine et compte rendu de stage en solo game dev assisté par IA ; si quelqu'un reprend le jeu avec plus de moyens, tant mieux. Version payante ou portage avec équipe possibles **une fois le jeu fini**. **Aucune sollicitation directe de dons** : ça se fera dans la communauté | Risques 0bis « revenu proche de zéro » et « sollicitation de dons / Play Store » : **assumés, clos** |
| 14 | **Pas de sauvegarde cloud** tant qu'il n'y a pas de multijoueur en réseau ; export/import + local actuel | Risque 0bis « coût réel du cloud » : clos |
| 15 | **C5 double tampon : OK**, petite sécurité en plus, aucun problème constaté à ce jour | C5⑥ ✅, priorité basse (P3) |
| 16 | **D13 / D16 — Journal d'indices et de traces** : dernier bouton du menu principal ; rappelle l'histoire parcourue ; sous-page **Indices**. Contenu = lore, **par zone** (Maison : « tu ferais bien d'utiliser la cuisine… » ; Forêt : « les arbres ici ne sont pas à récolter, le seul qui l'est est déjà sur ta route »). Y câbler les énigmes du cryptex (carnet des lettres importantes) | D16① ✅ précisé, D16⑤ → **menu permanent** ; D14⑥ gagne un lieu d'écriture |

---

## 2. Tranché par Xav le 23/09 (v1.1.0) — les défauts proposés en v1.0.0 sont validés tels quels

| # | Point | Décision |
|---|---|---|
| A | Régime et intensité | Le signe donne le régime, la valeur absolue l'intensité. Paliers entiers : `|A| < 1` neutre · `1–2` palier 1 · `3–4` palier 2 · `5` palier 3. Bonus principal +1 / +2 / +3 par palier, des deux côtés ; le malus sur le héros suit les mêmes paliers |
| B | **Table des régimes négatifs** (Xav) | Voir ci-dessous |
| C | Orbite | Sens de rotation seul ; le rayon reste celui de l'équipement (`Q-29`). Lumière intacte |
| D | Poids par défaut | Option de dialogue : poids déclaré en données. Spam (avancer avant la fin de la machine à écrire) : −0,25 par occurrence, plafonné à −1 par dialogue. Lecture complète : +0,1 par dialogue. **Morts : 0** |
| E | Choix multiples | Dès la Grotte (le dialogue de la maison est le premier cas) ; arc pédagogique et suite narrative au Nv.15 |
| F | Épine pédagogique | Le cadre 4D de Xav, une dimension par étape de l'arc |
| G | Dialogue de la maison | Fusionné avec la ligne de `D-124`, qui en devient le texte d'ouverture |

### Table des régimes (B) — la colonne de droite est celle de Xav, à porter dans `02_grotte.md` §3.4 et la carte mentale D6③

| Élément | Régime positif (en jeu aujourd'hui) | Régime négatif (alignement ≤ −1) |
|---|---|---|
| **Feu** | Force +1 joueur · brûlure sur le monstre dans l'aura | **Brûlure sur le héros** · Force joueur amplifiée (+1/+2/+3 par palier) · plus aucune brûlure sur les monstres |
| **Eau** | Agilité +1 joueur · affaiblissement du monstre (dégâts de base réduits) | **Le héros perd de la vitesse de déplacement au profit de la vitesse d'attaque** (redistribution entre les deux dérivées d'Agilité, pas un bonus de stat) · les monstres dans l'aura **se déplacent plus vite** mais n'infligent pas plus de dégâts · ils **perdent l'affaiblissement** (dégâts de base) |
| **Terre** | Vitalité +1 joueur · entrave du monstre (ralenti) | **Entrave sur le héros** · Vitalité amplifiée (+1/+2/+3) · l'entrave sur les monstres est **conservée, divisée par 2** |

Deux notes d'architecture, pas de design :
- Eau négatif est le seul régime qui touche des **dérivées** (`derivee_vitesse_deplacement_px_s`, cadence d'attaque) et non la stat : la synergie doit pouvoir déclarer un modificateur **de dérivée** en données, sinon Eau devient un cas particulier dans le code. À poser dans Spec 10 comme forme générique, un seul point de résolution (patron `D-141`).
- « Les monstres se déplacent plus vite » emprunte le canal de l'entrave avec un signe positif : le modificateur de vitesse d'un monstre dans l'aura doit accepter les deux sens. Même canal pour le « /2 » de Terre (un facteur, jamais une seconde constante).

## 3. Amendements de la carte mentale → `carte_mentale_RPG_V2_v1_7_0.md` (Claude Code, documentation seule)

Renommer le fichier (v1.6.0 → v1.7.0), mettre à jour l'en-tête et le lien dans `CLAUDE.md`. Éditions **par ancre de section**, jamais de remplacement global (règle 8 du suivi).

- **§1 mindmap** : `JOUEUR` gagne `Alignement (caché)` · `COMPAGNON` gagne `Alignement` · `MONDE › PNJ & dialogues` devient `Dialogues à conséquences`.
- **§2 boucle 5 min** : `Sortir → Récupérer → Combattre → Revenir → Stocker → Cuisiner → Équiper` (sept nœuds). Chiffrage ⚪ → ✅ : « Nv.0 → 10 en ~20 min, Nv.15 avec la nuit (Xav, 23/09) ».
- **§2 boucle 1 h** : `Annexe (mini-boss + énigme) → Système débloqué → Récompense régulière du lieu → Maison enrichie → Annexe suivante`. Retirer `Nouvelle zone`.
- **§3 progression** : remplacer le diagramme par la décision 10 du §1 (Grotte → Maison → Annexe 1 → Annexe 2 → nouvelle zone). Le Château et le Boss 1 restent **après** Annexe 2, hors du diagramme M1 courant.
- **D1⑧** : ajouter « confirmé le 23/09 ; dérivée `réserve d'esprit` posée par `D-141` ».
- **D1⑥ / D11⑤** : respec et re-choix du follet → **après Annexe 1, illimités et gratuits depuis le menu** (révise « après Boss 1 »).
- **D2** : ajouter « à terme plus d'éléments que haTD ; les 3 actuels restent ». Risque 0bis « cohérence RPG ↔ haTD » : reformuler (la correspondance reste à faire dans D17, mais dans l'autre sens).
- **D11⑦** : `alignement (M2+)` → `✅ alignement M1, stat cachée séparée d'Esprit, bornes [−5 ; +5], effets par le follet seul (orbite inversée, synergie qui change de camp)`.
- **D12** : ①②③ → « en chantier : options avec conséquences typées (alignement, flag, effet de monde), branches par conditions du registre de flags, conséquences persistantes en sauvegarde ». ⑥ reste ouvert.
- **D13** : ② → « déclenché par les dialogues à conséquences et les flags » ; ⑤ → à rechiffrer avec l'arc Nv.15+ ; ajouter « le follet est un LLM scripté, hors-ligne — le héros c'est Xav, le follet c'est Claude ».
- **D16** : ① précisé (journal d'indices et de traces, dernier bouton du menu principal, sous-page Indices, indices de lore **par zone**, carnet du cryptex) ; ⑤ → ✅ menu permanent.
- **P1** : « open source assumé, vitrine ; version payante ou portage possibles une fois fini ; aucune sollicitation directe de dons ». Risques 0bis « revenu proche de zéro » et « dons / Play Store » → **assumés, clos (23/09)**.
- **P3① / C5⑦** : « pas de cloud sans multijoueur réseau ». Risque 0bis « coût réel du cloud » → clos.
- **C5⑥** : double tampon ✅ « OK, petite sécurité, P3 ».
- **§3bis** : ajouter la phrase « aucune nouvelle carte tant que la carte Maison n'est pas épuisée par les annexes et tunnels ».

**Autres documents, même session** : `00_ROADMAP.md` (ligne « alignement bien/mal : M2+ » → M1 ; § « avant toute nouvelle carte » complété) · `CLAUDE.md` (les 16 décisions du §1 en décisions datées) · `DOC_suivi-dettes.md` (`Q-62` : ajouter le chiffre de Xav — le bot contredit un joueur, donc c'est le **trajet du bot** qu'il faut revoir, pas le rythme · `Q-50` : Esprit a désormais sa dérivée · `Q-69` : chaîne voulue · ouvrir les lignes du §2 A→G).

---

## 4. Procédure — sessions Claude Code, dans l'ordre, jamais mélangées

| Session | Contenu | Périmètre autorisé |
|---|---|---|
| **Doc-1** | Appliquer le §3 ; ménage de journal d'abord. Aucun code | `docs/carte_mentale_*`, `specs/00_ROADMAP.md`, `CLAUDE.md`, `docs/DOC_suivi-dettes.md` |
| **Instrument** | `?alignement=N` en debug (patron `?echelle=N`) + champ `save.hero.alignement` (float, borné, jamais affiché ; migration de schéma) + orbite inversée si `A ≤ −1`. Zéro contenu, zéro synergie | `src/debug_perf.js`, `src/companion.js`, `src/save.js`, `data/stats.json`, tests. Corriger **`D-53`** dans la même session (amortissement par frame) : une orbite qui change de sens rendra ce défaut visible |
| **Spec 10** `10_alignement-follet.md` | Paliers, table des régimes négatifs (§2 B), modificateurs de dérivée en données, poids par défaut, bande morte | **débloquée** (§2 tranché le 23/09) |
| **Spec 11** `11_dialogues-consequences.md` | Schéma d'option (`texte`, `alignement`, `flags`, `effets_monde`), mesure du spam et de la lecture, gate Nv.15, refonte des dialogues existants, dialogue de la maison (premier cas réel) | **débloquée** (§2 tranché le 23/09) |
| Contenu | Arc pédagogique Nv.15+ (Claude propose, Xav valide le ton) | après Spec 11 livrée et validée en jeu |

`E-02`, `E-04`, le polish-ambiance du 23/09 et l'équilibrage (`Q-62`, `Q-68`) restent des files distinctes.

---

## 5. Hors scope — ordre de priorité proposé

Critère : ce qui agrandit la carte Maison passe avant ce qui l'étend ailleurs ; ce qui dépend d'une spec attend sa spec.

1. **Annexe 1** (mini-boss 1, énigme 1, respec + re-choix du follet, premières compétences) — le prochain contenu, et le premier lieu de la boucle 1 h.
2. **Journal d'indices et de traces** (D13/D16) + hooks du cryptex — décidé aujourd'hui, à écrire en spec après Spec 11 (mêmes données de flags).
3. **`E-04` polish carte** dans l'ordre déjà fixé (lisières → forêt → surface du décor → densité) ; le polish-ambiance du 23/09 en a pris une partie (`D-110`), à réconcilier.
4. **Armure `x/(x+k)`** — se traite **avec `E-02` armes**, après un topo lecture seule de `combat.js`/`status.js`. Piste « rien ne se perd » : la part mitigée n'est pas effacée mais **transformée** (draine faim/soif, ou charge quelque chose) ; `k` par élément.
5. **Porte-outils / besace** (`Q-65`) — avec `E-02`.
6. **Orientation du héros** (`Q-51`) — quand le combat demandera de viser.
7. **Niveaux de coffre, automatisation** (`Q-66`) — après cinq coffres joués.
8. **Curseur qui clique** (`Q-54`), **leviers graphiques v2** (`Q-58`), `D-116` Haut via `E-04`.
9. **Ailes de vif-argent, 4ᵉ follet au Boss 2, polish « vif d'or »** — avec les annexes qui les débloquent.
10. **Cape de traversabilité** (Nv.50+ ; demande un mode « phase » de collision et une règle d'éjection) — très tard.
11. **Crypte X global, nouvelle zone, Château, console et cartouches** — hors carte Maison, donc hors horizon actuel.

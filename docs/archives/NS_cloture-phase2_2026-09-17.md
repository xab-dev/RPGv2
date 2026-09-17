# RPG V2 — Clôture formelle de la Phase 2 (2026-09-17)

**Nature** : session de tri / documentation. **Aucun code, aucun test modifié.** Trois fichiers touchés : `CLAUDE.md`, `specs/carte_mentale_RPG_V2_v1_3_0.md` → `v1_4_0`, `specs/00_ROADMAP.md`. Tout ce qui suit est déjà acté (journaux archivés, retours de Xav) — cette fiche ne tranche rien, elle range.

## Contexte
Phase 2 « Région Maison, première marche » validée en jeu (manette + clavier) sur tout le parcours, défauts corrigés et re-validés (2026-09-17). `CLAUDE.md` le dit déjà mais garde encore le critère de passage de la Phase 2 en section courante, et la carte mentale n'a pas absorbé les décisions des 16-17/09. Prochaine phase à ouvrir : Phase 3 (`04_maison-interieur.md`, spec à venir).

## 1. `CLAUDE.md`
1. **Ménage de journal** (règle de méthode) : archiver « Stations : proportions et collision » verbatim → `docs/archives/JOURNAL_2026-09-17_stations-proportions-collision.md`, mettre à jour `docs/archives/INDEX.md`. Le journal est déjà consolidé (décisions, dette `station_puits`) : rien à reporter en plus.
2. **Section « Critère de passage courant »** : remplacer le bloc Phase 2 par :
   > **Phase 3 — Maison, intérieur & systèmes de camp** (spec `specs/04_maison-interieur.md`, à venir). Critère (ROADMAP) : la boucle 5 minutes tourne — sortir → récolter → revenir → cuisiner/crafter → repartir — et le joueur atteint le niveau ~5 qui ouvre la zone suivante. **Spec non écrite : ne pas commencer sans elle.**
3. **« État actuel du dépôt »** : réduire le paragraphe Phase 2 à une ligne (« Phase 2 close le 2026-09-17, détail `docs/archives/INDEX.md` ») et retirer le détail des micro-tickets déjà archivés. Les validations manuelles encore dues (contraste jour/nuit, ambiance synthé, état 24 checklist) restent listées dans « Dette ».
4. **Dette** : rien de nouveau. Vérifier que `station_puits` (silhouette ×2,1), toast de ramassage, indicateur jour/nuit, fps réel, tactile, téléportation d'angle y sont — ils y sont.
5. `[OUVERT]` : inchangés (durées intro, patron « meilleur effort » à généraliser).

## 2. Carte mentale → v1.4.0
**Changelog 1.4.0** : Phase 2 close ; décisions de validation 16-17/09 ; référence housing rattachée ; idée de chantier nocturne inscrite sans être tranchée.

**§8 Journal des décisions** — ajouter :

| Date | Module | Décision | Motif |
|---|---|---|---|
| 2026-09-16 | Ressources | **L'arbre fruitier ne se coupe jamais** : fruits, puis jardin/récolte/craft/cuisine | Le fruitier est une source renouvelable, pas un stock de bois ; garde un repère fixe dans le jardin |
| 2026-09-16 | UI | **Indice de commande au premier déclenchement de chaque verbe seulement**, glyphe du périphérique actif, jamais répété | Compromis « ne pas guider / montrer chaque touche une fois » ; data-driven par verbe (`04_indices-commandes.md`) |
| 2026-09-16 → 17 | D20 | **Stations solides**, échelle ×2,1, empreinte = boîte englobante du visuel, seuil d'interaction au bord — *révise* « placeholders non solides » | La table était plus petite que le héros ; la collision ne gênait pas, les proportions si |
| 2026-09-17 | Jour/nuit | Durées par phase indépendantes (jour 10 min, aube/crépuscule 1 min 30, nuit 4 min) ; nuit extérieure 0,85 > plafond grotte 0,72 | Contraste jugé trop faible en jeu ; ordre de grandeur, non figé |
| 2026-09-16 | Phase 2 | **Close** : carte, ressources bloquées, items au sol, maison-structure, jour/nuit, audio validés ; taille de carte validée ; jouabilité > V1 | Verdict Xav manette/clavier ; tactile en dette jusqu'à un lien de partage (Phase 4+) |

**§5 D19 / D10 (jardin)** — ajouter un point non tranché, ne pas le mettre en §8 :
> ⑦ `[OUVERT]` **Mobs nocturnes dans la Région Maison** (idée 2026-09-16) : spawn la nuit, gênent les récoltes / détruisent les plantations. Lie jour/nuit → jardin → combat (Phase 4). **Contredit** « aucun monstre, ton chill » de `03_maison-exterieur.md` §5. À trancher quand le jardin existe (03b / Phase 4), pas avant.

**§9 Références** — première référence rattachée à un module, avec son pourquoi :
> **Throne and Liberty → D20 (Maison & pièces)** : housing cité par Xav comme référence de « ce que d'autres jeux font mieux » sur l'envie de construire et de revenir. Ce qu'on emprunte : à préciser à la spec Phase 3 (placement libre, lisibilité de la pièce) — pas la modularité lourde, réservée au Château/Poste avancé (D20③).

**§3bis** — ligne « Maison — extérieur » : statut livré/validé, renvoi `03_maison-exterieur.md` + `04_stations-proportions-collision.md` + `04_indices-commandes.md`.

## 3. `00_ROADMAP.md` → v1.2.0
- Statut : « Phases 0, 1, 1b, 2 livrées et validées. Phase courante : Phase 3, détaillée dans `04_maison-interieur.md` (à écrire). »
- Section Phase 2 : titre → **livrée et validée (2026-09-17)**, corps réduit à 3 lignes + renvoi.
- Section Phase 3 : inchangée (esquisse), en attente de la spec. Ajouter une ligne : « Rouvre bois à couper / pierre à miner via le premier outil crafté (branche + caillou) — point d'accroche `resources.js#peutRecolter` ».

## Test de validation
`grep -c "Journal de session" CLAUDE.md` = 1 · `CLAUDE.md` ≤ 300 lignes · `node tools/run_tests.js` toujours 47 verts (rien ne doit bouger) · les trois fichiers relus par Xav.

## Hors scope
Tout code. La spec `04_maison-interieur.md` (dépend de trois décisions de Xav, voir session d'architecture). Le micro-ticket `station_puits`.

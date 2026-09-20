# RPG V2 — Session documentaire : ménage de `CLAUDE.md` et archivage des journaux (2026-09-17)

## Objectif

`CLAUDE.md` fait ~22 000 mots et 920 lignes : 13 journaux de session empilés à la suite du brief. Il est lu en entier au début de chaque session — son coût en contexte est devenu supérieur à son utilité, et l'information qui compte (état courant, décisions, règles, dette, points ouverts) est noyée dans l'historique. **Aucune information ne doit être perdue** : ce qui sort de `CLAUDE.md` va dans `docs/archives/`, ce qui reste est consolidé, pas résumé au rabais.

Cible : `CLAUDE.md` **≤ 300 lignes**, relisible en une passe, où chaque ligne est encore vraie et encore utile pour une session future.

## Ce que `CLAUDE.md` garde (réécrit, consolidé)

Dans cet ordre :

1. **État actuel du dépôt** — un paragraphe, pas un historique : phases validées (0, 1, 1b, 2 « première marche » validée à la manette par Xav le 2026-09-16, `SD_hitbox-angle-arbre` validé le 2026-09-17), phase en cours, prochaines fiches à livrer dans l'ordre (`MT_jour-nuit-contraste` v1.1 → `04_indices-commandes` → `04_stations-proportions-collision` → `MT_musique-ambiance-synth`), et le pointeur vers `docs/archives/INDEX.md`.
2. **Le projet**, **Règle d'architecture directrice**, **Contraintes de méthode non négociables**, **Commandes** — inchangés sur le fond. Y **fusionner** les règles de méthode nées en cours de route et aujourd'hui dispersées dans les journaux (transform du contexte 2D et rejeu de `CHECKLIST_visuelle.md`, renommage de contenu ≠ migration de schéma, pas de système généralisé sans 2ᵉ cas d'usage, verbes d'input uniquement, seuils centralisés et marqués provisoires, cause racine avant patch). Chaque règle garde **une ligne de provenance** (« née du diagnostic X, voir `docs/archives/...` ») — la règle sans son pourquoi se fait contourner.
3. **Architecture** — mise à jour Phase 2 incluse (modules `resources`, `inventory`, `ground_items`, `structures`, `daynight`, `audio`, layout en lignes, scène affichée dérivée pour l'obscurité, correction de coin en collision). État **courant** seulement : une ligne par module, ce qu'il fait et ce qu'il ne fait pas encore. Pas de « avant / après ».
4. **Décisions produit verrouillées (ne pas rouvrir)** — la liste existante **plus** toutes les décisions datées enfouies dans les journaux (mapping manette du menu, résolution logique, pas de pixel art / rendu net, layout deux calques, rayon du toit, stations placeholder, cycle jour/nuit à l'action, fruitier jamais coupable, tactile en dette jusqu'à la Phase 4, etc.). Format : `| Décision | Date | Où c'est détaillé |`. Une décision qui a été révisée n'apparaît qu'en version finale, avec « révise X du JJ ».
5. **Points `[OUVERT]`** — une seule liste, dédoublonnée (les journaux répètent le même `[OUVERT]` résolution logique 8 fois). Pour chacun : valeur provisoire appliquée, ce qu'il faut pour trancher. Retirer ceux qui ont été tranchés depuis (stations → fiche `04_stations-proportions-collision`).
6. **Dette et « à reprendre »** — tout ce qui a été signalé « non fait cette session », « défaut annexe constaté non corrigé », « hors scope mais à reprendre » : toast de ramassage, indicateur jour/nuit, mesure de fps, tactile réel, et **la nouvelle entrée du 2026-09-17** : *le mouvement n'est pas très smooth — légère téléportation à chaque angle depuis la correction de coin ; feeling meilleur, aucune interruption ; à lisser dans une phase de polish ultérieure (répartir le repoussement sur plusieurs frames ou l'interpoler plutôt que l'appliquer d'un coup — hypothèse, à diagnostiquer, pas à patcher en silence).* Chaque entrée : une ligne, date, provenance.
7. **Critère de passage courant** — uniquement celui de la phase en cours, avec son état réel. Les anciens critères, tous rendus, partent en archive.
8. **Journal de la dernière session seulement** (celle du SD, 2026-09-16/17), tel quel. Les sessions suivantes ajouteront le leur **à la fin**, et la règle devient : quand un nouveau journal est ajouté, le précédent part en archive dans la même session (voir §« Nouvelle règle »).

## Ce qui part en archive

Chaque `## Journal de session — …` et `## Micro-ticket — …` actuel (13 blocs, lignes 120 à 921) devient **un fichier** `docs/archives/JOURNAL_<AAAA-MM-JJ>_<slug>.md`, contenu **verbatim** (aucune réécriture, aucun résumé — c'est la source de vérité en cas de doute), précédé d'un en-tête de 3 lignes : titre, date, fiche(s) de spec ou de diagnostic associée(s). Plus `docs/archives/INDEX.md` : tableau chronologique `| Date | Session | Fichier | Ce qu'on y trouve (une ligne) |`.

Ne **pas** déplacer les fiches `docs/SD_*.md`, `docs/MT_*.md`, `docs/CHECKLIST_visuelle.md` ni les specs : elles restent où elles sont, ce sont des références actives.

## Méthode

1. Lire `CLAUDE.md` en entier une fois **avant** de couper quoi que ce soit ; extraire d'abord dans un brouillon la liste complète des décisions datées, des règles de méthode, des `[OUVERT]` et des dettes, journal par journal — c'est cette extraction qui garantit qu'on ne perd rien, pas la relecture finale.
2. Créer les archives et l'index. Vérifier par un diff que la concaténation des archives contient chaque bloc d'origine.
3. Réécrire `CLAUDE.md` selon le plan ci-dessus.
4. Contrôle final, à faire **explicitement et à rapporter** : pour chaque décision, règle, `[OUVERT]` et dette du brouillon d'extraction, indiquer où elle vit maintenant (`CLAUDE.md` §N ou archive). Toute entrée sans destination = échec de la session.

## Contraintes

- Aucun fichier de code, de données, de test ni de spec modifié. Session purement documentaire.
- Français, style « contexte suffisant pour reconstruire le raisonnement ». Pas de reformulation qui affaiblit une règle ou une décision ; en cas de doute entre deux formulations, garder la plus contraignante et citer l'archive.
- Ne rien trancher : un `[OUVERT]` reste ouvert, une dette reste une dette. Cette session ne crée aucune décision nouvelle.
- **Nouvelle règle de méthode à inscrire dans `CLAUDE.md`** (c'est la seule nouveauté de la session, et elle vient de Xav) : *`CLAUDE.md` ne contient que le journal de la session précédente. En début de session, avant tout code, archiver le journal présent dans `docs/archives/`, mettre à jour `INDEX.md`, reporter dans les sections consolidées ce qui en relève (décision, règle, ouvert, dette), puis seulement travailler. Plafond indicatif : 300 lignes.*

## À la fin de la session

Rapporter : nombre de lignes avant/après, liste des archives créées, le tableau de contrôle de l'étape 4 (chaque élément extrait → sa destination), et tout point où une information semblait contradictoire entre deux journaux (le dire, ne pas arbitrer).

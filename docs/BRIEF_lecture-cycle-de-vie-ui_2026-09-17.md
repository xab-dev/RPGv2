# RPG V2 — Session LECTURE SEULE : carte du cycle de vie des écrans UI (2026-09-17)

**Aucun code modifié dans cette session. Aucun commit. Aucun test écrit.** Livrable = un seul fichier `docs/CARTE_cycle-de-vie-ui_2026-09-17.md`, que Xav relira avec son partenaire de conception avant toute correction. Ménage de journal : **non** — cette session n'ajoute pas de journal, elle produit une carte.

## Pourquoi

Trois sessions successives (`e1c4ff3`, `a70a089` et les retours en jeu de Xav) ont déplacé un même bug sans le résoudre : tantôt le menu Pause est logiquement fermé mais son DOM reste affiché, tantôt il est logiquement ouvert alors que le mode Construction est actif, et aujourd'hui son DOM reste affiché pendant que le héros se déplace, jusqu'à un Start + Quitter. Hypothèse de travail à **vérifier, pas à confirmer par complaisance** : l'état « une UI est ouverte » et la visibilité du DOM des écrans sont tenus par plusieurs mécanismes qui ne dérivent pas d'une source unique. Cette session établit les faits ; la correction est une autre session.

## Périmètre de lecture

`git diff 153b5cc a70a089 -- src/main.js src/ui/menu.js src/render.js src/input/input.js` (état validé en jeu → état courant), plus l'intégralité de `src/ui/menu.js` et des fonctions de `src/main.js` qui touchent à l'UI, y compris ce qui date d'avant Construction (reset, Craft, Coffre, Stats).

## Contenu attendu de la carte

1. **Sources de vérité de l'état UI.** Chaque variable ou champ qui encode « une UI est ouverte » ou « quel écran est actif » : nom, fichier, qui l'écrit (liste exhaustive des fonctions, avec ligne), qui la lit. Inclure l'état du contrôleur de menu, `uiOuverte`/`uiOuverteMaintenant()`, l'état de la machine `construction`, et tout autre drapeau trouvé.
2. **Montage / démontage DOM.** Chaque fonction qui ajoute, retire, montre ou cache un écran (`afficherEcran()`, `creerEcranListeGenerique`, le bandeau, tout `classList`/`style.display`/`appendChild`/`remove` sur un écran) : fichier, ligne, qui l'appelle.
3. **Tableau des transitions**, une ligne par transition réellement présente dans le code : `Start` → menu Pause ; Quitter ; Craft/Coffre par INTERACT ; Stats ; Reset et sa confirmation ; Construction (liste) ; liste → placement (`A`) ; placement → liste (`A` pose, `B`) ; placement → menu Pause (`MENU`) ; liste → menu Pause. Pour chacune : quelles variables d'état changent, quel DOM change, **dans quel ordre**, dans quelle(s) fonction(s), et s'il existe un instant où état et DOM sont contradictoires (état fermé + DOM monté, ou l'inverse).
4. **Routage des verbes.** Dans la boucle, l'ordre exact de priorité entre menu, dialogue, construction, gameplay, et la condition qui décide de chacun. Une seule question : la condition lue par la boucle est-elle la même que celle qui gouverne le DOM ?
5. **Constat.** Trois phrases maximum. Où les mécanismes divergent, et quelles transitions sont saines (à garder comme modèle) — le reset et Craft/Coffre marchaient avant Construction, ils sont probablement le bon patron.

## Interdits

Ne rien corriger, même « en passant ». Ne pas proposer de correctif dans la carte (une section « pistes » de 5 lignes maximum tout en bas, clairement séparée). Ne pas reformuler les faits pour qu'ils collent à l'hypothèse de travail : si la carte montre une source unique et un autre défaut, c'est ce qu'elle dit.

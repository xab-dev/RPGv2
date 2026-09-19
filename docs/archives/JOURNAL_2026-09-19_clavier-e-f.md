# Journal de session — `D-22` : clavier, `E` = INTERACT, `F` = CONSUME (2026-09-19)

Ticket `MT_clavier-e-f_2026-09-19.md`, **une seule ligne du suivi touchée : `D-22`** (close). Une ligne ouverte au passage : **`D-25`**. Suite headless verte, **67 fichiers** (66 + le nouveau). Un commit, pas de `push`.

**Ménage de journal** : journal précédent (« Les fondations d'abord ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-19_fondations-doc.md`, ligne d'INDEX ajoutée. La NS des fondations reste dans `docs/` : son §6 est la procédure `A-04`, et ses quatre autres fiches `MT_*` sont des tickets encore à jouer.

### Étape 1 du ticket : la table touche → verbe, avant le changement

| Verbe | Touches (avant) | Touches (après) |
|---|---|---|
| `MOVE` gauche / droite / haut / bas | `KeyA`/`←` · `KeyD`/`→` · `KeyW`/`↑` · `KeyS`/`↓` | inchangé |
| `ATTACK` | `Space` | inchangé |
| `SKILL_1` / `SKILL_2` / `SKILL_3` | `Digit1` / `Digit2` / `Digit3` | inchangé |
| `CONSUME` | **`KeyE`** | **`KeyF`** |
| `INTERACT` | **`KeyF`** | **`KeyE`** |
| `MENU` | `Escape` | inchangé |

Les deux touches portaient **exactement les verbes inverses** : rien d'autre n'écoutait `E` ni `F`, il n'y avait donc pas de question bloquante à poser. Le changement est un échange, pas une réaffectation.

### Ce qui a changé

| Fichier | Changement |
|---|---|
| `src/input/keyboard.js` | `interact: ['KeyE']` / `consume: ['KeyF']` dans `MAPPING_CLAVIER_PROVISOIRE`, avec le *pourquoi* en commentaire (la main gauche posée sur les touches de déplacement tombe seule sur `E`, qui prend l'action la plus fréquente) |
| `locales/fr.json`, `locales/en.json` | `glyphe.clavier.interact` : `F` → **`E`** ; `glyphe.clavier.consume` : `E` → **`F`** (mêmes valeurs dans les deux langues : une lettre isolée ne se traduit pas) |
| `tests/test_d22_clavier_e_f_2026-09-19.js` | Nouveau. Rouge d'abord (`KeyE doit produire INTERACT`), vert après |

**Aucun autre fichier.** Recherche de `KeyE`/`KeyF`/`MAPPING_CLAVIER` sur tout le dépôt : les seules occurrences sont dans `input/keyboard.js`. **Aucun module de gameplay ne connaît une touche** — la contrainte « zéro dépendance du gameplay à un périphérique » tient, il n'y avait rien à signaler de ce côté. Manette et tactile non touchés.

### Étape 3 du ticket : les glyphes ne sont **pas** dérivés du mapping → `D-25`

La chaîne d'affichage est `hints.js` → `glyphes.json#clavier_key` → `t("glyphe.clavier.interact")` → `locales/*.json`. Elle est propre côté périphérique (le glyphe suit bien `input.peripheriqueActif()`), mais **la lettre elle-même est recopiée** dans les locales : rien ne la relie à `MAPPING_CLAVIER_PROVISOIRE`. Changer le mapping sans toucher les locales afficherait la mauvaise touche, sans erreur au boot ni test rouge. Conformément au ticket, je n'ai **pas** refondu : les deux sources sont mises d'accord à la main, et la dette est ouverte en **`D-25`**.

Garde-fou en attendant : le bloc 4 du nouveau test compare les deux sources dans les deux langues. Ce n'est pas la correction — c'est ce qui rend la divergence bruyante. `D-25` est apparentée à `D-10` (l'aide de la Construction ignore le périphérique actif) et touche la matière de `E-01` (filigrane de la touche dans les cases de la barre du bas) : à traiter avec l'un des deux.

### Validation due par Xav (clavier seul, partie neuve)

L'indice d'`INTERACT` doit montrer `E`, celui de `CONSUME` doit montrer `F` ; récolter un arbre avec `E`, ouvrir le Craft avec `E`, manger le fruit avec `F`. Tant que ce passage n'est pas fait, `D-22` est **livrée**, pas confirmée en jeu — c'est écrit dans son verdict au suivi.

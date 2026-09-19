---
projet: RPG V2
episode/session: NS « rendu, navigateurs, téléphone » — application (doc seule)
type: journal de session
version: 1.0.0
statut: archivé
catégorie: Journal
date: 2026-09-19
ids_suivi: [Q-19, Q-20, Q-24, Q-25, D-01, D-02, D-03, D-30, D-31, DOC-04, DOC-08, R-05, R-13, A-06, A-07]
genere_par: claude
verifie_par: xav
---

## Journal de session — NS « rendu, navigateurs, téléphone » (2026-09-19, doc seule)

Application de `docs/NS_decisions-rendu-navigateurs_2026-09-19.md`, même patron que
la NS « fondations ». **Aucun fichier de `src/`, `data/`, `tests/` n'est touché** —
la suite headless n'a pas été relancée, rien de ce qui l'exerce n'a bougé.
Un commit, pas de `push`.

### Identifiants : quatre des six proposés étaient déjà pris

La NS avertissait que ses identifiants *(nouveau)* étaient tirés du suivi **v1.7.0**,
et que les sessions de code de la soirée avaient pu les prendre entre-temps. C'est le
cas : `Q-22`, `Q-23`, `D-25` et `D-26` sont tous occupés depuis (icône de la case
d'attaque, doublon texte/réplique, double source de la touche clavier, sauvegardes
portant encore l'épée). Renumérotation, suivant la règle du §0 (« un identifiant n'est
jamais réutilisé ») :

| NS | Suivi | Sujet |
|---|---|---|
| `Q-22` | **`Q-24`** | Politique navigateurs |
| `Q-23` | **`Q-25`** | Conseiller sur le symptôme, pas sur le navigateur |
| `D-25` | **`D-30`** | Plein écran au tactile |
| `D-26` | **`D-31`** | A04 : ≈ 18 ms par frame hors du code du jeu |
| `A-06`, `A-07` | inchangés | Firefox `about:support` · profil USB de l'A04 |

Les relevés `R-05` à `R-13` étaient libres et gardent leurs numéros.

### Ménage de journal

Journal de `D-23` archivé (`docs/archives/JOURNAL_2026-09-19_echelle-debug.md`) avec sa
ligne d'INDEX ; `MT_echelle-debug_2026-09-19.md` descend à côté. **`NS_decisions-fondations_2026-09-19.md`
est archivée aussi** : son §5 est remplacé par celui de la NS du soir, son §6 était la
procédure `A-04`, désormais close, et ses cinq fiches `MT_*` sont toutes livrées et
archivées — il ne restait rien d'actif dedans. La NS du soir, elle, reste dans `docs/` :
c'est la source du journal ci-dessus, la prochaine session l'archivera avec lui.
`docs/DOC_navigateurs.md` est rangé tel quel — c'est un registre **vivant**, comme le suivi.

### Le fond : ce n'était pas le jeu, c'était le navigateur

La soirée renverse la lecture des trois semaines précédentes. `R-02` → `R-04` avait
établi que **le coût de rendu suit le nombre de pixels**, et tout le plan de bataille en
découlait : plafonner l'échelle (`Q-19`), ventiler `dessiner()` (`D-02`), amortir le
calque (`D-01`). Ce fait reste vrai — mais il décrivait **qui dessine** autant que ce qui
est dessiné. Sous Chrome, à l'échelle forcée **8**, le même PC tient 59,9 fps **sans une
frame sautée**, GPU à 14 % (`R-11`). Les 12 ms de `dessiner()` étaient des millisecondes
de Firefox.

D'où les requalifications, toutes inscrites au suivi : `Q-19` close **sans plafond**
(la décision verrouillée du 15/09 est confirmée sur mesure, et l'échelle par calque est
abandonnée comme chantier) · `D-01` **P1 → P2** · `D-02` et `D-03` **P1 → P3, gelées**.

Et la règle de méthode qui manquait : **un relevé cite son navigateur**, deux relevés pris
sous des navigateurs différents ne se comparent pas. Firefox garde une utilité — c'est un
banc de mesure du coût par calque, puisqu'il dessine sur le fil principal. Ce n'est
simplement jamais un verdict de fluidité.

### Le téléphone, lui, n'est pas expliqué

`R-12`/`R-13` : ~37 fps à l'échelle naturelle, ~40 à l'échelle 1. Diviser les pixels par
neuf rend **3,6 fps**. `maj()` + `dessiner()` ≈ 7 ms pour 27 ms de delta : **≈ 18 ms par
frame que l'instrument ne voit pas**, avec le même ressenti sans `?debug=fps`. Écartés par
la mesure : l'échelle, l'instrument, un canvas logiciel. Restent le coût de la page autour
du canvas et la composition par un GPU faible — c'est `D-31`, **gelée** jusqu'au profil USB
`A-07`, parce que corriger sans profil serait deviner. Conséquence directe : l'A04 n'est
**pas** déclaré appareil plancher, et `Q-20` est reformulée en deux moitiés (PC acquis,
mobile ouvert).

Le relevé de l'A04 fait au passage un constat non-mesuré mais net : hors plein écran, le
jeu occupe 1440×810 sur un écran de 2340×1080, barre d'adresse comprise — 46 %. C'est
`D-30`, à traiter avec `D-17` puisque c'est le même périphérique et la même validation.

### Ce que j'ai vu et n'ai pas corrigé

**`DOC-08` (nouvelle)** : `MT_ventilation-dessiner_2026-09-19.md` v1.1.0 **n'est pas au
dépôt**. Le registre §6 y renvoie pour le détail chiffré de `R-05` à `R-10`, les six
relevés Firefox — ces nombres ne vivent donc nulle part dans le dépôt, alors que le
registre est censé être la seule liste. Je n'ai inscrit au §6 que ce que la NS donne en
toutes lettres (la loi `≈ 6,8 ms + 0,55 ms × échelle²`, les échelles couvertes) plutôt
que d'inventer des colonnes. Deux issues proposées : ranger la fiche dans `docs/`, ou
recopier les six relevés au §6 et l'archiver.

**`DOC-04` close.** Sa part restante était « y reporter le budget de rendu mesuré
(`D-02`) » : il n'y a plus de budget de rendu à défendre sur PC. Elle est remplacée par ce
qui protège vraiment la spec — le relevé de nuit après chaque palier, inscrit dans la
méthode de `specs/07_chaos-nocturne.md`, comparé aux deux relevés de base de `A-03`.

**`docs/DOC_navigateurs.md` §4** reste en place, avec un renvoi ajouté en tête : il portait
les identifiants d'avant renumérotation, et la NS dit elle-même que son §4 est remplacé.
Plutôt que de réécrire un document fourni « tel quel », je l'ai laissé et j'ai pointé le
suivi, qui fait foi.

### Ce qui bloque la suite

Rien, côté code : l'étape 2 de l'ordre d'injection est une **action de Xav** — les deux
relevés de base sous Chrome, un de jour, un de nuit (`A-03`). Tant qu'ils n'existent pas,
`07_chaos-nocturne.md` n'a pas de point de comparaison, et un palier qui ferait chuter les
fps ne serait imputable à rien. Les tickets `D-17` + `D-30` (tactile) et `D-13` (buffs)
sont, eux, prêts à être pris sans attendre.

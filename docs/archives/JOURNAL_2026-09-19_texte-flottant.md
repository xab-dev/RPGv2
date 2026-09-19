---
projet: RPG V2
episode/session: Fondations — `D-05` texte flottant de gain
type: journal de session (archive)
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-19
ids_suivi: [D-05, D-28, Q-23, V-12]
genere_par: claude
verifie_par: xav
---

## Journal de session — `D-05` : le texte flottant de gain (2026-09-19)

Ticket `MT_texte-flottant_2026-09-19.md`, qui clôt `D-05`. Lignes touchées :
`D-05` (close), plus trois ouvertes — `D-28` (défaut révélé hors périmètre),
`Q-23` (le doublon que la fiche demandait de signaler), `V-12` (validation en
jeu). Aucune autre ligne du suivi lue ni touchée. Suite headless verte,
**70 fichiers**. Un commit, pas de `push`.

**Ménage de journal** : journal du palier B de `D-20` archivé dans
`docs/archives/JOURNAL_2026-09-19_icone-arme.md` + ligne d'INDEX ; la fiche
`MT_mains-nues_2026-09-19.md`, ses deux paliers livrés, descend dans
`docs/archives/`.

### Le changement

- **`src/texte_flottant.js`**, pur, sur le patron exact de `poussiere.js` :
  réserve pré-allouée, zéro allocation en jeu (`for` bruts, jamais
  `find`/`reduce`, qui allouent une closure par appel), aucune horloge propre.
- **`effet_texte_gain`** dans `data/effets.json` : 10 réglages, **tous
  provisoires**, capacité de la réserve comprise. `creerTextesFlottants` lève
  si `capacite` manque, plutôt que de porter un défaut de repli qui
  divergerait en silence des données.
- **Émission par un point unique**, `main.js#signalerGainItem(itemId,
  quantite, x, y)`, appelé aux deux endroits où un gain est déjà résolu.
  `resources.js`, `ground_items.js` et `inventory.js` n'ont pas bougé d'une
  ligne : ils continuent d'ignorer qu'un rendu existe.
- **Le texte part de la source**, jamais du héros — centre de la tuile
  récoltée, position réelle de l'objet au sol **capturée avant son retrait**
  (après, elle n'existe plus).
- **Rendu** par `render.js#dessinerTextesFlottants`, **après** l'obscurité et
  **avant** le HUD : c'est un retour d'interface, il doit rester lisible de
  nuit. Contour puis remplissage, pas de cartouche opaque qui masquerait la
  scène. `save`/`restore` en tête/fin, aucune transform touchée.
- **Gelé par `uiOuverte`**, le point de décision unique, jamais par une
  condition propre ; **vidé à chaque entrée en scène**, comme la poussière.

### Deux écarts assumés, et pourquoi

**La fiche esquissait `emettre(x, y, texte)`.** Le module transporte à la
place `cle` + `quantite` + les clés `format`/`libelle`. Une chaîne déjà
composée rend impossible la fusion « +1 puis +1 = +2 » que la fiche exige au
paragraphe suivant, et différer la composition au rendu a un second mérite :
changer de langue traduit aussi un texte déjà en vol. Le module ne connaît
donc ni item, ni ressource, ni i18n, ni canvas — vérifié par garde-fou de
source. C'est ce qui rend crédible la promesse « butin, XP et dégâts sans
code nouveau ».

**Deux fichiers hors de la liste de lecture de la fiche**, parce que « aucune
chaîne en dur » l'exigeait. `i18n.js#t(cle, params)` prend un 2ᵉ argument
**optionnel** : le gabarit `monde.gain_item` (« +{n} {item} », dans les deux
langues) est traduisible dans son entier — le « + », l'ordre des morceaux,
l'espace. Le composer par concaténation dans `main.js` aurait remis du texte
visible hors des locales. Purement additif : aucun appel existant modifié.
Et le schéma de `effets` distingue maintenant deux `type` (`particules` /
`texte`), **déclarés en données** plutôt que devinés à la présence d'un
champ : sans ça, une faute de frappe sur `intervalle_px` ferait passer la
poussière pour un effet d'un autre genre sans que rien ne le dise.

### Ce que les tests peuvent et ne peuvent pas dire

`tests/test_d05_texte_flottant_2026-09-19.js` (7 blocs) écrit avant le code,
rouge à l'import. Vérifiés à froid : émission/montée/fondu/extinction ·
réserve pleine qui recycle **le plus ancien** sans jamais grandir · fusion
dans la frame, jamais entre deux items ni hors fenêtre · gabarit et noms
d'items résolus dans les **deux** langues, sans marqueur résiduel · une
récolte et un ramassage sur le **vrai** orchestrateur donnent chacun **une**
émission, à la bonne position · garde-fou de généricité sur la source du
module.

**Le dessin n'est jamais exercé** (canvas, contrainte de méthode). Il a été
lancé **une fois, hors suite de tests**, contre un contexte 2D factice :
aucune exception, coordonnées justes. Ça ne dit rien de ce que ça donne à
l'œil. Le contrôle au navigateur réel n'a pas pu être fait, l'extension
Chrome n'étant pas connectée.

### Ce que j'ai vu et n'ai pas corrigé

`D-28` : **récolter la poche pleine consomme le cooldown de la tuile et ne
donne rien, en silence.** `essayerInteraction` ne regarde pas
`resultatRecolte.ajoute` — au plafond de pile, l'inventaire est réécrit à
l'identique et le cooldown posé quand même. Le ramassage au sol, lui, teste
bien `ajoute > 0` et laisse l'objet par terre : les deux chemins divergent.
Le texte flottant rend le défaut **visible** (rien ne monte) au lieu de muet,
mais le corriger touche le gameplay, pas le rendu — hors périmètre.

`Q-23` : le retour existant du premier ramassage est **inchangé**, comme la
fiche le demandait. Ce n'est pas un doublon à mon sens (le texte dit *ce qui
a été gagné*, la réplique dit *ce que ça veut dire*), mais les deux se gênent
un peu : le dialogue gèle le « +1 Branche » à mi-montée. Trois issues
proposées dans la ligne, à trancher en jeu.

### Validation due par Xav — ticket de rendu

`render.js` et `main.js#dessiner()` sont touchés : clôture par une validation
en jeu guidée par `docs/CHECKLIST_visuelle.md`, **état 34**, de jour **et de
nuit**. Les 10 réglages sont provisoires (`V-12`, qui rejoint `V-11`) : durée
900 ms, montée 16 px, fondu à mi-vie, taille 8 px, couleurs. Tant que ce
passage n'est pas fait, `D-05` est **livré**, pas confirmé.

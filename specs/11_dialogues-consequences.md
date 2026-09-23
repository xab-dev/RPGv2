---
projet: RPG V2
episode/session: Chantier dialogues à conséquences
type: spec
version: 1.1.0
statut: brouillon
catégorie: Spec
date: 2026-09-23
Ids_suivi: D12①②③ · D13②⑤⑧ · D11⑦ · D-124 · D-125 · D-61 · D-09 · Q-23 · 10_alignement-follet
genere_par: claude
verifie_par: xav
---

# 11 — Dialogues à conséquences, et le follet comme LLM scripté

Emplacement : `specs/11_dialogues-consequences.md`. Source des décisions : `docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md` v1.1.0 §1 (décisions 5, 6, 7) et §2 (D, E, F, G) ; carte mentale v1.7.0 D12, D13⑧. **Dépend de `10_alignement-follet.md` palier A** (le contrat `modifierAlignement`) ; n'attend pas ses paliers B et C. **Par paliers, un palier par session, un commit par palier.** Branche `dialogues-2026-09-2x`.

Ce que cette spec livre : **la forme d'un dialogue qui a des conséquences**, la mesure du spam et de la lecture, les effets de monde, la refonte des dialogues existants, et la porte du Nv.15 avec le **premier chapitre** de l'arc pédagogique. Ce qu'elle ne livre pas : l'arc entier (chaque chapitre suivant est un ticket de contenu), ni aucun texte définitif — **tout texte est une proposition, Xav écrit.**

---

## 0. Décisions verrouillées — ne pas rouvrir

| Décision | Source |
|---|---|
| Le follet est un **LLM scripté, hors-ligne** : aucun appel réseau, aucun modèle embarqué, jamais. Tout est en données | D13⑧, §13 du brief |
| Le héros c'est Xav, le follet c'est Claude. On se réveille enfant, on ne sait rien ; le follet apprend la vie **sans expliquer**, laisse découvrir. Arc : de l'usage simple au power user | 23/09 |
| **Choix multiples dès la Grotte** ; conversations (multi-tours) et suite narrative **au Nv.15**. Épine pédagogique : le cadre 4D de Xav, une dimension par étape | NS §2 E, F |
| Poids : option en données · spam **−0,25** par occurrence, plafond **−1** par dialogue · lecture complète **+0,1** · morts **0** — valeurs dans `data/alignement.json#poids_defaut`, lues ici | NS §2 D |
| Le dialogue de la maison **fusionne** avec la ligne de `D-124` ; option par défaut neutre pour qui spamme A | NS §2 G, 22/09 |
| Aucun tutoriel, aucun texte sur l'alignement lui-même ; lore diffus, jamais d'objectif affiché ; zéro chaîne en dur ; les menus sont gelés (« on ne touche plus ») — la boîte de dialogue **n'est pas un menu** et n'en réutilise aucun composant | CLAUDE.md, D13① |
| Un dialogue **gèle** le jeu (`uiOuverte`, point de décision unique) — inchangé, y compris pour une conversation longue | Phase 1b |
| Une ligne d'ambiance = `condition → une ligne, une seule fois` via le registre de flags (`D-61`, `D-125`) — le mécanisme reste, il gagne des options | 21–22/09 |

---

## 1. Hypothèse à démontrer

> Un joueur qui répond aux questions du follet comme il répondrait à une IA — vite et n'importe comment, ou en lisant et en choisissant — voit le monde lui répondre différemment, sans qu'on lui ait dit qu'il était noté.

Critères de passage, un par palier (§7) ; le dernier : Xav joue le premier chapitre du Nv.15 et reconnaît la dimension du 4D qu'il enseigne **sans que le texte la nomme**.

---

## 2. Le vocabulaire — trois objets, un seul moteur

| Objet | Ce que c'est | Existe aujourd'hui ? |
|---|---|---|
| **Réplique** | Le follet parle, le joueur avance. Zéro option. | Oui (`dlg_premier_ramassage`, `D-61`, `D-124`, `D-125`) |
| **Choix** | Une réplique suivie de **2 à 4 options**, chacune avec ses conséquences. Un seul tour. | Le choix du follet dans la Grotte en est l'ancêtre ; pas de conséquences typées |
| **Conversation** | Un graphe de nœuds : chaque option mène à un nœud (réplique ou choix), jusqu'à un nœud terminal. **Gatée au Nv.15** par une condition de niveau ordinaire | Non |

Les trois passent par **le même** `dialogue.js` et la même boîte. Une réplique est une conversation à un nœud sans option ; un choix est une conversation à deux nœuds. Le moteur ne connaît que des nœuds.

---

## 3. Le schéma — `data/dialogues.json`, validé au boot

```
{
  "id": "dlg_maison_premiere_fois",
  "declencheur": { "evenement": "entree_zone", "zone": "maison_interieur" },
  "conditions": [ { "flag": "flag_dlg_maison_premiere_fois", "absent": true } ],
  "une_fois": true,
  "entree": "n1",
  "noeuds": {
    "n1": { "locuteur": "follet", "texte": "dlg.maison.n1", "options": [
      { "texte": "dlg.maison.o1", "defaut": true, "suite": null },
      { "texte": "dlg.maison.o2", "alignement": 1,  "suite": "n2" },
      { "texte": "dlg.maison.o3", "alignement": -1, "effets_monde": [ { "id": "toit_occulte", "duree_ms": 60000 } ], "suite": null }
    ] },
    "n2": { "locuteur": "follet", "texte": "dlg.maison.n2", "options": [] }
  }
}
```

Règles du schéma, toutes vérifiées au démarrage :
- `texte` et `options[].texte` sont des **clés** de localisation, présentes en FR **et** EN (contrôle existant `clesTexteFiches` étendu).
- **2 à 4 options** ; `[]` = nœud terminal ou réplique. Jamais plus de 4 : pas de défilement dans la boîte (règle tactile).
- **Exactement une option `defaut: true`** par nœud à options, et sa conséquence est **toujours vide** (`alignement` absent, `effets_monde` absent) — le schéma le refuse sinon. C'est l'option de qui spamme A : elle est **présélectionnée**, et « avancer » sans avoir bougé la sélection la prend.
- `alignement` : nombre libre (le poids appartient au dialogue, `[−5 ; +5]` par option, vérifié). `flags` : liste de drapeaux à poser. `valeurs` : `{ nom: delta }` sur les valeurs nommées de `flags.js`. `effets_monde` : liste `{ id, duree_ms }` d'entrées de `data/effets_monde.json`. `suite` : id de nœud ou `null`.
- `conditions` et `declencheur` : **le format de `flags.js` tel quel** (`flag`, `niveau`, valeurs nommées) — aucun format nouveau (`Q-37`). La porte du Nv.15 est `{ "niveau": { "min": 15 } }`, rien de plus.
- **Un graphe est acyclique** et tout nœud est atteignable depuis `entree` — vérifié au boot, un dialogue qui boucle est un échec dur.
- Les dialogues d'aujourd'hui **migrent dans ce fichier** au palier B, à texte identique, en répliques.

---

## 4. Le moteur — `src/dialogue.js` (pur) et `ui/dialogue_box.js` (rendu)

### 4.1 Pur
```
ouvrir(dialogue)                         → etat { noeud, selection, spamCompte, lectureIntacte }
avancer(etat, dialogue, verbeAvancer, arme)   // arme = la machine à écrire a fini (état existant)
deplacerSelection(etat, direction)
resultat(etat)                           → { consequences: [...], vu: true }
```
- **Spam** : `verbeAvancer` reçu alors que `arme === false` → `spamCompte += 1`. L'armement existant ne bouge pas (le texte finit toujours de s'écrire) ; on **compte** ce qui était jusqu'ici ignoré en silence.
- **Lecture complète** : `lectureIntacte` vaut `true` tant que `spamCompte === 0` **sur tout le dialogue**. Pas d'estimation de temps de lecture (`[OUVERT]` 1).
- À la clôture, `resultat` rend la liste des conséquences **dans l'ordre** : celles des options choisies, puis le poids de spam (`spam_par_occurrence × spamCompte`, plafonné par `spam_plafond_par_dialogue`), puis `lecture_complete` si intacte. **Les répliques comptent aussi** : spammer une ligne de lore coûte, la lire rapporte — c'est la moitié de la mesure.
- `dialogue.js` **n'écrit rien** : `main.js` reçoit le résultat et appelle `modifierAlignement(delta, 'dialogue:' + id)`, pose les flags, active les effets. Un seul appelant, un seul ordre.

### 4.2 Rendu et entrées
- La boîte existante gagne une **liste d'options sous le texte**, dessinée au même calque, dans la même boîte (pas de menu, pas de DOM). Sélection = curseur `▸` et surlignage ; l'option `defaut` est sélectionnée à l'ouverture.
- Verbes : `MOVE` haut/bas déplace la sélection (pas de répétition au maintien : une poussée, un cran — `D-18` n'est pas requise pour 4 lignes) ; **le verbe qui avance aujourd'hui** confirme. Aucun nouveau verbe. Clavier et manette : par les verbes, donc rien à mapper. **Tactile : chaque option est une zone qui répond au doigt**, comme les boutons du HUD (`hud_layout.js`, patron `D-142` des zones qui suivent le monde) ; un tap sur une option la sélectionne, un second tap ou le tap sur le texte confirme — `[OUVERT]` 2.
- Les options n'apparaissent **qu'après l'armement** : on ne peut pas choisir ce qu'on n'a pas lu. Un spam pendant l'écriture est compté, pas exaucé.
- Pendant une conversation, le jeu reste gelé ; le follet **reste dessiné** (on lui parle). Le texte flottant, la nuit, le Chaos attendent, comme aujourd'hui.

---

## 5. Les effets de monde — `src/effets_monde.js` (pur) et `data/effets_monde.json`
```
activer(etat, id, duree_ms) · tick(etat, dt_ms) · actif(etat, id) → bool
```
- **État de session, jamais persisté** (même choix que le Chaos nocturne : rien en sauvegarde, donc aucune migration). Recharger la page lève l'effet : assumé.
- Un effet est un **nom**, lu par le système concerné : `toit_occulte` → `main.js#dessiner` ne fait pas l'effacement du toit tant que `actif('toit_occulte')` (`FACTEUR_EFFACEMENT_TOIT` non touché). Un système qui ne connaît pas un id l'ignore ; un id absent du catalogue est un échec dur au boot.
- Catalogue de départ : `toit_occulte` (palier B) ; **second effet réel** au palier D : `coffre_apparence_vide` (§7.3), lu par le seul point qui fabrique la liste du Coffre.

---

## 6. La refonte des dialogues existants (palier B)

Inventaire, avec **ce que je propose** — le statut final est à Xav :

| Dialogue | Aujourd'hui | Proposition |
|---|---|---|
| Intro de la Grotte (trois follets, choix) | choix, pas de conséquence typée | Reste un **choix** (le follet) ; aucun poids d'alignement (le choix initial ne juge personne). Migré au schéma pour que la boîte n'ait qu'un chemin |
| Salle 2 : lore + synergie | réplique | Réplique, spam/lecture comptés. `[OUVERT]` : première question du follet (« tu as vu ce que j'ai fait ? ») avec trois réponses, poids ±0,5 — trop tôt ? |
| `dlg_premier_ramassage` | réplique | Réplique (`Q-23` tenue) |
| `D-61` la nuit et la cendre | réplique conditionnelle | Réplique |
| **`D-124` + dialogue de la maison** | réplique | **Devient LE premier choix du jeu** (§3, exemple) : texte de `D-124` en ouverture, trois options, poids +1 / 0 / −1, toit occulté 60 s sur la troisième |
| `D-125` cinq lignes de lore | répliques | Répliques ; **une** d'entre elles (le Nv.10) devient un choix à deux options, poids ±0,5 — `[OUVERT]` 3 |
| `dlg_recette_indisponible` (`D-09`) | déclaré, jamais déclenché | **Retiré** du catalogue : `D-122` a rendu les refus de craft dans la fiche, un dialogue par-dessus un menu casse le routage. Clôt `D-09` |

Textes FR : Xav. EN : Claude propose, Xav valide. La migration se fait **à texte identique** ; un test compare, clé par clé, les textes d'avant et d'après.

---

## 7. La porte du Nv.15 et le premier chapitre de l'arc (palier C)

### 7.1 La forme d'un chapitre
Un chapitre = **une conversation** déclenchée une fois, à un lieu, sous condition de niveau, qui **enseigne une dimension du 4D sans la nommer**. Le principe qui fait de cette conversation un « LLM scripté » : **les options sont des façons de demander, pas des choses à demander**. Trois formulations d'une même intention, et le follet répond à la formulation :

| Dimension | Ce que le chapitre met en scène | Exemple de mécanique (proposition) |
|---|---|---|
| **Description** (chapitre 1, Nv.15) | Une demande vague reçoit une réponse vague ; une demande précise reçoit ce qu'on cherchait | Le joueur veut savoir où trouver de la pierre. Option A « où est la pierre ? » → le follet répond une généralité. Option B « il y a de la pierre à miner près d'ici, où ? » → il désigne le rocher. Option C « je verrai bien » → rien, +0,5 (autonomie) |
| **Délégation** (chapitre 2) | Ce qu'on confie au follet contre ce qu'on fait soi-même — il peut chercher pour vous, mais pendant ce temps il ne vous éclaire pas | à écrire |
| **Discernement** (chapitre 3) | **Le follet se trompe, volontairement, une fois.** L'option qui le croit sur parole coûte ; celle qui vérifie rapporte | **Scène trouvée par Xav le 23/09, §7.3** : « le coffre effacé » |
| **Diligence** (chapitre 4) | Ce qu'on fait de la réponse : la vérifier, la garder, en répondre | à écrire — lien naturel avec le journal d'indices (D16) |

Cette spec livre **le chapitre 1 seul**, en données, texte proposé par Claude, réécrit par Xav. Les chapitres 2 à 4 sont des tickets de **contenu** : aucun code, un dialogue JSON et deux locales chacun. Si un chapitre demande du code, la forme du §3 est fausse et c'est la spec qu'on rouvre.

### 7.3 Chapitre 3, la scène du coffre effacé (Xav, 23/09) — premier cas réel d'un second effet de monde

L'allusion : Claude Code qui supprime quinze lignes, « rouge, rouge, rouge », revient en arrière, « hop, tout est bon ». Et le socle de jeu qui la rend crédible : déplacer un coffre plein effaçait son contenu (`D-126`), aujourd'hui interdit par une règle déclarée en données — le joueur qui a joué la Maison sait que ça *pourrait* arriver.

- **Déclencheur** : conversation, une fois, en entrant dans la Maison, conditions `{ niveau: { min: 15 } }` et `{ valeur: "remplissage_coffre", min: 0.7 }` — une **valeur nommée** de plus dans `flags.js`, patron de `slots_libres_poche` (`D-125`), posée sur ce qui est *rempli* pour survivre à l'agrandissement du coffre. Le chapitre 1 n'est pas requis (les chapitres sont indépendants ; l'ordre est celui des rencontres).
- **La scène** : le follet annonce qu'en rangeant il a déplacé le coffre et que tout s'est effacé, « je reviens en arrière ». **Effet de monde `coffre_apparence_vide`, 56 s** : l'écran Coffre affiche un contenu vide, le contenu réel n'a pas bougé d'un octet (la sauvegarde ne connaît pas l'effet ; un objet déposé pendant la fenêtre va dans le vrai coffre). À l'expiration, réplique : « ton coffre, tout est là ».
- **Les options, proposition** (Xav écrit) : *« Répare, vite »* — 0, la confiance par réflexe · *« Montre-moi »* — le joueur va vérifier : le coffre **est** vide à ses yeux, et c'est le piège que le chapitre enseigne : une vérification qui confirme le récit n'est pas une preuve, +0,5 quand même (il a vérifié) · *« Tu n'avais pas à y toucher »* — −0,5, ou +0,5 ? **à trancher** : c'est une frontière posée au follet, pas de la méfiance.
- **Ce qui commande l'implémentation** : `coffre_apparence_vide` est un id lu par **le seul endroit** qui fabrique la liste du Coffre pour l'écran (`main.js`, patron du lecteur unique de `D-126`) ; `ecran_fiches.js` ne l'apprend jamais. Second effet réel → le catalogue `effets_monde.json` gagne sa raison d'être, sans que `effets_monde.js` change.
- **`[OUVERT]` 6** : le joueur qui recharge la page pendant les 56 s voit son coffre plein — assumé (l'effet n'est pas persisté) ou la fenêtre reprend ? Retenu : **assumé**, un joueur qui panique et recharge apprend la même chose par une autre voie.

### 7.2 Ce qu'un chapitre donne
Alignement par option (poids **plus lourds** qu'avant le 15 : de ±0,5 à ±2, en données), des flags (`flag_chapitre_1_vu`, `flag_chapitre_1_precis`), et **rien d'autre dans cette spec** — les compétences et la résolution d'énigmes par la conversation attendent leurs specs (E-02, Annexe 1) et se brancheront par `flags` et `valeurs`, sans toucher au moteur.

---

## 8. Paliers de livraison

| Palier | Livre | Fichiers autorisés | Test rouge d'abord |
|---|---|---|---|
| **A — le choix** | `dialogues.json` + schéma, `dialogue.js` pur, options dans la boîte (trois périphériques), spam et lecture comptés, conséquences `alignement`/`flags`/`valeurs`, **le dialogue de la maison** comme premier cas réel (sans `effets_monde`) | `src/dialogue.js` (nouveau), `src/ui/dialogue_box.js`, `src/ui/hud_layout.js` (zones tactiles), `src/main.js` (ouverture/clôture, un seul appelant), `src/schemas.js`, `data/dialogues.json`, `locales/`, `tests/` | schéma : option `defaut` avec conséquence → refus ; 5 options → refus ; graphe cyclique → refus · `avancer` non armé incrémente le spam et ne bouge pas · plafond du spam · lecture intacte → +0,1 · parité verbe / tap (patron `SD_parite-clic-verbe`) · le résultat d'un dialogue est **ordonné** et déterministe |
| **B — le monde et la refonte** | `effets_monde.js` + `toit_occulte`, la troisième option de la maison, migration de **tous** les dialogues existants au schéma, retrait de `dlg_recette_indisponible` | + `src/effets_monde.js`, `data/effets_monde.json`, le point de lecture du toit dans `main.js#dessiner` (la constante ne bouge pas), `tests/` | textes avant/après identiques clé par clé, FR et EN · `tick` lève l'effet à `duree_ms` exactement · un effet actif n'est **pas** dans la sauvegarde |
| **C — la porte et le chapitre 1** | Conversations multi-nœuds, condition de niveau, chapitre « Description » en données, textes proposés | `data/dialogues.json`, `locales/`, `tests/` — **aucun fichier de `src/`** : si le palier C touche du code, il s'arrête et remonte |
| **D — le coffre effacé** (chapitre 3, §7.3) | Valeur nommée `remplissage_coffre`, effet `coffre_apparence_vide`, la conversation en données | `src/flags.js` (une valeur nommée, aucun format), le point de fabrication de la liste du Coffre dans `src/main.js`, `data/effets_monde.json`, `data/dialogues.json`, `locales/`, `tests/` | à 69 % rien, à 70 % oui, une fois · pendant l'effet la liste du Coffre est vide et `save.maison.stations[coffre].contenu` est **intact** · un dépôt pendant l'effet atterrit dans le vrai contenu · à 56 s exactement la liste revient · l'effet n'est pas dans la sauvegarde |

Ce que Claude Code ne touche pas : `companion.js`, `status.js`, `flags.js` (on **utilise** son format, on ne l'étend pas), `menu*`, `ecran_fiches.js`, `render.js` hors du point de lecture du toit. Toute exception remonte en `[OUVERT]`.

---

## 9. Ce que les tests ne peuvent pas prouver
La lisibilité de la liste d'options à 480 × 270 et sur téléphone, le confort du choix au stick et au doigt, et **si le joueur comprend que ses réponses comptent** — c'est la seule question qui vaut, et seul un joueur qui ne sait pas répond. Xav d'abord, puis le vétéran qu'il cherche, **sans lui dire ce qu'on regarde**.

---

## 10. Validations en jeu — lignes `V-` à ouvrir

| Palier | À regarder |
|---|---|
| A | Partie neuve, à la manette : entrer dans la maison. La ligne de `D-124` s'écrit, **puis** trois options apparaissent. Spammer A pendant l'écriture : rien ne saute, et `?debug=fps` montre `spam: n`. Choisir avec le stick, confirmer. Même chose au clavier, puis au doigt sur téléphone : les trois options se touchent sans se marcher dessus. Puis la question : **la boîte reste-t-elle une boîte de dialogue, ou est-ce devenu un menu ?** |
| B | Troisième option : ressortir, regarder la maison — le toit ne s'efface plus pendant une minute, puis oui. Rejouer la Grotte : l'intro et la salle 2 disent **exactement** ce qu'elles disaient. Aucune trace de `dlg_recette_indisponible` |
| C | Sauvegarde au Nv.14 : rien. Nv.15, au lieu du chapitre : la conversation s'ouvre. La jouer trois fois (trois sauvegardes) avec les trois formulations. Le verdict de fond : **est-ce qu'on sent qu'on parle à quelqu'un qui répond à la façon dont on demande** — ou est-ce qu'on lit un menu à trois entrées ? Et : ta dimension « Description » se reconnaît-elle sans être nommée ? |

---

## 11. `[OUVERT]` — lignes `Q-` à ouvrir au ménage
1. « Lecture complète » = zéro spam sur le dialogue. Alternative : un temps minimal estimé à la longueur du texte (mots × ms) — plus juste, plus fragile (lecteur rapide pénalisé).
2. Tactile : un tap sélectionne, un second confirme (retenu) — ou un tap confirme directement ? Le premier protège du doigt qui glisse ; le second est ce que font la plupart des jeux.
3. Quelles répliques existantes deviennent des choix (§6) — c'est du contenu, Xav tranche ligne par ligne.
4. Une conversation gèle le jeu ; au Nv.15+ une conversation longue de nuit, dehors, est un moment où le Chaos ne bouge pas — voulu, ou la conversation ne se déclenche que de jour / à l'abri ?
5. Le follet ne dit **jamais** le mot « alignement » — mais peut-il dire « je te connais mieux » à partir d'un palier ? C'est de l'écriture, et c'est à toi.

6. Recharger pendant les 56 s lève l'effet — assumé (§7.3).

## 12. Hors périmètre, rappelé
Chapitres 2 à 4 (contenu) · compétences et énigmes par conversation (E-02, Annexe 1) · journal d'indices et de traces (sa spec) · toute forme de mémoire du follet au-delà des flags · un vrai LLM, jamais dans la V2.

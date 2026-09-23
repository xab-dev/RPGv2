---
projet: RPG V2
episode/session: Chantier alignement
type: spec
version: 1.0.0
statut: brouillon
catégorie: Spec
date: 2026-09-23
Ids_suivi: D11⑦ · D6③ · D1⑧ · D-53 · D-141 · Q-29 · Q-50 · E-02
genere_par: claude
verifie_par: xav
---

# 10 — L'alignement caché et ses effets par le follet

Emplacement : `specs/10_alignement-follet.md`. Source des décisions : `docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md` v1.1.0 et carte mentale v1.7.0 (§8, table des régimes). **Spec par paliers, un palier par session, un commit par palier, chacun retirable seul.** Branche `alignement-2026-09-2x`.

Ce que cette spec livre : **la stat, son écriture, son instrument, et ses effets par le follet.** Ce qu'elle ne livre pas : **aucune source réelle de variation** — les dialogues à conséquences sont `11_dialogues-consequences.md`. À la fin de cette spec, l'alignement ne bouge que par `?alignement=N` et par les tests. C'est voulu : on regarde l'effet avant de brancher la cause.

---

## 0. Décisions verrouillées — ne pas rouvrir

| Décision | Source |
|---|---|
| L'alignement est une stat **cachée**, **distincte** d'Esprit (D1⑧ intact, `D-141` intact). Jamais affichée (ni écran Stats, ni HUD, ni fiche), jamais modifiable par le joueur, **aucun texte de localisation ne la nomme** | D11⑦, 23/09 |
| Bornes `[−5 ; +5]`, `0` neutre. Pondération par action ; un dialogue peut peser +5, −5 ou 0,5 | 23/09 |
| Paliers : le **signe** donne le régime, la **valeur absolue** l'intensité — `abs(A) < 1` neutre · `1–2` palier 1 · `3–4` palier 2 · `5` palier 3. Bonus principal +1/+2/+3 ; malus sur le héros aux mêmes paliers | NS §2 A |
| Les effets passent **uniquement par le follet** : orbite inversée (sens seul, dès `A ≤ −1`) et **changement de camp** de la synergie (table §4.2). **La lumière et le rayon d'orbite ne bougent pas** (`Q-29`) | NS §2 B, C |
| Poids par défaut : option de dialogue déclaré en données · spam −0,25 par occurrence, plafonné à −1 par dialogue · lecture complète +0,1 par dialogue · **morts : 0** | NS §2 D — appliqué par la spec 11, cité ici pour la forme du contrat d'écriture |
| Aucun tutoriel, aucune ligne de lore sur l'alignement lui-même : le seul indice est l'effet en jeu | 22/09 |
| Règles transverses : engagement = orbite OU aura, relâche = orbite + aura + 12 (`D-37`) ; « dans l'aura » est géométrique (`D-51`) ; ce qui est dessiné est ce qui agit ; tout seuil en données, marqué provisoire | CLAUDE.md |

---

## 1. Hypothèse à démontrer

> Un joueur qui ne lit rien sur l'alignement finit par remarquer que son follet tourne à l'envers et que le feu lui brûle la peau — et par relier ça à ce qu'il a fait.

Critère de passage de la spec : Xav, en jouant avec `?alignement=−3` puis `+3` sans rien d'autre, **voit** la différence en moins d'une minute de jeu (orbite), et la **sent** au premier combat (régime). Chiffré plus tard par la spec 11, quand la cause sera branchée.

---

## 2. La stat

### 2.1 Où elle vit
- `save.hero.alignement` : nombre, borné `[−5 ; +5]`, **aucun arrondi** (les poids sont déjà des multiples de 0,25 ; on ne borne que les extrémités).
- **Migration de schéma `7 → 8`** : la migration écrit `0` explicitement sur toute sauvegarde antérieure. Après migration, **l'absence du champ est un échec dur** au chargement, jamais un repli sur 0 — un champ optionnel à valeur de repli masquerait un branchement oublié (`D-03`, `D-23`).
- **Pas dans `stats.json`.** L'écran Stats et le bandeau de buffs itèrent `stats.json` (`D-13`, `D-141`) : y mettre l'alignement, c'est l'afficher. Il a son propre catalogue, `data/alignement.json` (§5).

### 2.2 Le module pur — `src/alignement.js`
Un seul fichier, importable depuis Node, aucune dépendance au DOM ni à la scène.

```
borner(valeur, bornes)                → nombre dans [min ; max]
regime(valeur, paliers)               → { regime: 'positif'|'neutre'|'negatif', palier: 0|1|2|3 }
appliquerDelta(valeur, delta, bornes) → { valeur, ecart }   // ecart = ce qui a réellement bougé après bornage
```

`regime` est **LA** fonction que tout le reste appelle (orbite, synergies, tests) : personne ne recalcule un palier de son côté. La bande morte `abs(A) < 1` rend `neutre` et `palier: 0`.

### 2.3 Le contrat d'écriture — unique
`main.js#modifierAlignement(delta, source)` est **le seul** point qui écrit `save.hero.alignement`. Il appelle `appliquerDelta`, journalise `{ source, delta, ecart, valeur }` sous `?debug=fps` (et nulle part ailleurs), et **ne fait rien d'autre** : aucun effet n'est déclenché à l'écriture, les effets sont **relus à chaque frame** par le follet (§4). Ce point est ce que la spec 11 branchera ; dans cette spec, seuls les tests et l'instrument l'appellent. `source` est une chaîne libre pour le journal (`'debug'`, `'test'`, plus tard `'dialogue:dlg_maison'`), jamais lue par le jeu.

---

## 3. Sources de variation — hors périmètre, contrat réservé

Aucune source réelle dans cette spec. Réservé pour la spec 11, afin que le contrat ne bouge pas : une source appelle `modifierAlignement(delta, source)`, point. Le spam, la lecture, les options de dialogue et tout acte dans le monde sont des **appelants**, jamais des cas particuliers de `alignement.js`.

---

## 4. Les effets — par le follet, relus à chaque frame

### 4.1 L'orbite inversée
- `companion.js` lit `regime(save.hero.alignement)` par une fonction **passée en paramètre** (jamais un import de `save` dans le module pur, patron existant du rayon d'aura).
- Régime `negatif` → le sens de rotation de l'orbite est inversé (**signe de la vitesse angulaire**, rien d'autre). Rayon, lumière, aura, engagement, relâche : **inchangés**.
- **Continuité** : la position ne saute jamais. L'inversion se fait sur la vitesse angulaire, amortie sur `duree_inversion_ms` (provisoire, ~800 ms, en données) — le follet ralentit, s'arrête, repart dans l'autre sens. C'est le signe visible ; on le fait lisible.
- **`D-53` corrigé dans ce palier** : `ORBITE_LERP` et tout amortissement du follet passent **en temps réel** (`1 − (1 − k) ** (deltaS × 60)`), une seule fonction, avant l'inversion — sinon l'inversion sera plus molle sur téléphone que sur PC, et c'est exactement le genre d'écart qu'un signe d'expérience ne peut pas se permettre.

### 4.2 Les régimes de synergie — table (Xav, 23/09)

| Élément | Régime positif (en jeu aujourd'hui) | Régime négatif (`A ≤ −1`) |
|---|---|---|
| **Feu** | Force +1 joueur · brûlure sur les monstres dans l'aura | **Brûlure sur le héros** · Force joueur **+1/+2/+3** par palier · plus aucune brûlure sur les monstres |
| **Eau** | Agilité +1 joueur · affaiblissement des monstres (dégâts de base réduits) | **Vitesse de déplacement du héros réduite, cadence d'attaque augmentée** (redistribution entre deux **dérivées**, pas un bonus de stat), aux paliers · les monstres dans l'aura **se déplacent plus vite**, n'infligent pas plus, **perdent l'affaiblissement** |
| **Terre** | Vitalité +1 joueur · entrave des monstres (ralentis) | **Entrave sur le héros** · Vitalité **+1/+2/+3** · l'entrave sur les monstres **conservée, facteur ÷ 2** |

Le régime positif garde exactement ses valeurs d'aujourd'hui au palier 1 ; **les paliers 2 et 3 s'appliquent aussi côté positif** (+2, +3) — symétrie retenue par défaut, `[OUVERT]` → `Q-`.

### 4.3 Ce que ça impose à la forme des données — trois généralisations, pas une de plus
1. **Un modificateur cible une stat OU une dérivée.** Aujourd'hui une synergie ajoute à une stat (`Force +1`). Eau négatif touche `derivee_vitesse_deplacement_px_s` et la cadence d'attaque. Forme unique : `{ "cible": "stat" | "derivee", "id": "…", "delta": n }` ou `{ …, "facteur": f }`. Un seul point de résolution, celui que `D-141` a posé pour les dérivées : la 3ᵉ source de modificateurs (`D-69`, compagnon / buffs / arme) apprend à porter des cibles de dérivée, **les deux autres sources n'en portent pas** et ne changent pas.
2. **Le canal « vitesse d'un monstre dans l'aura » accepte les deux sens.** L'entrave est un facteur `< 1` ; Eau négatif pose un facteur `> 1` ; Terre négatif pose le facteur d'entrave **multiplié par 0,5** (un facteur sur un facteur, jamais une seconde constante). `status.js` ne connaît qu'un `facteur_vitesse` par effet.
3. **Le héros peut porter un effet d'état à dégâts sur la durée.** Aujourd'hui `status.js` applique brûlure / affaiblissement / entrave aux monstres et le héros ne porte que des buffs de stat (`buff_repas`). La brûlure du héros et son entrave passent par **le même catalogue `status_effects.json`** et le même tick que pour un monstre — `status.js` apprend une **cible** (`heros` | `monstres_aura`), pas un second système. Les PV du héros descendent par `entities.js#reconcilierPvMax` comme pour tout dégât ; **la mort par brûlure est possible** et rejoue le réveil (`D-74`) — `[OUVERT]` : un plancher à 1 PV pour la brûlure d'alignement ? → `Q-`.

Ce qui **n'est pas** généralisé : le bandeau de buffs. Une Force amplifiée y montre l'icône de Force comme aujourd'hui (une icône par stat renforcée, `D-13`), sans nombre ; une brûlure sur le héros n'y montre **rien** (ce n'est pas une stat) — seule la barre de PV parle. Conforme à « aucun tutoriel ». `[OUVERT]` : une icône d'effet subi sur le héros, plus tard, si le playtest dit que la brûlure passe pour un bug → `Q-`.

### 4.4 Point de résolution
`companion.js#resoudreSynergie(follet, regime)` rend `{ heros: [modificateurs], monstres_aura: [effets] }` **à partir des données seules** ; `main.js` le lit **une fois par frame** au même endroit où il lit déjà les modificateurs du compagnon, et `status.js` reçoit la liste `monstres_aura` là où il recevait l'effet unique. Le régime peut changer **en plein combat** (spec 11) : comme tout est relu par frame, aucune transition à coder — un effet en cours sur un monstre expire par sa propre durée, il n'est pas révoqué.

---

## 5. Données

`data/alignement.json` — schéma dans `schemas.js`, validé au boot, **tous les nombres provisoires** :
```
{
  "bornes": { "min": -5, "max": 5 },
  "bande_morte": 1,
  "paliers": [ { "jusqua": 2, "palier": 1 }, { "jusqua": 4, "palier": 2 }, { "jusqua": 5, "palier": 3 } ],
  "orbite": { "duree_inversion_ms": 800 },
  "poids_defaut": { "spam_par_occurrence": -0.25, "spam_plafond_par_dialogue": -1, "lecture_complete": 0.1, "mort": 0 }
}
```
`poids_defaut` est **posé ici et lu par personne** dans cette spec : la spec 11 le lira. Il est ici pour qu'un seul fichier dise combien vaut un acte.

`data/companions.json` — chaque follet gagne `regimes: { "positif": { "heros": […], "monstres_aura": […] }, "negatif": { … } }`, chaque modificateur pouvant porter `"par_palier": true` (multiplié par le palier) ; **l'entrée d'aujourd'hui devient `regimes.positif`** par migration de données, à valeurs identiques (test : Feu/Eau/Terre positif palier 1 = les valeurs actuelles au nombre près). Un follet sans `regimes.negatif` = échec dur au boot (pas de repli sur le positif : on ne veut pas découvrir en jeu qu'un follet ignore l'alignement).

`data/status_effects.json` — `brulure_heros`, `entrave_heros`, `acceleration` (facteur > 1) ajoutés ; `D-41` (`icone` mort) reste tel quel, hors périmètre.

Locales : **aucune clé nouvelle** ; test qui refuse toute clé contenant `alignement` dans `locales/*.json`.

---

## 6. L'instrument — `?alignement=N`
Patron exact de `?echelle=N` (`debug_perf.js#lireEchelleForcee`) : `lireAlignementForce(location)` rend `{ valeur, avertissement }`, valeur invalide ou hors bornes → `valeur: null` **et** un avertissement, jamais un repli. Lu une seule fois au boot par `main.js` ; s'il est présent, il **remplace la valeur de la sauvegarde pour la session** et **n'est jamais persisté** (comme `?qualite`). Sous `?debug=fps`, le relevé affiche `alignement` et le régime résolu.

---

## 7. Paliers de livraison

| Palier | Livre | Fichiers autorisés | Test rouge d'abord |
|---|---|---|---|
| **A — la stat** | `alignement.js`, `alignement.json` + schéma, `save.js` migration 7→8, `modifierAlignement`, instrument `?alignement=N`, test des locales. **Aucun effet en jeu** | `src/alignement.js`, `src/save.js`, `src/schemas.js`, `src/debug_perf.js`, `src/main.js` (deux fonctions), `data/alignement.json`, `tests/` | migration 7→8 sur les dix sauvegardes réelles de `prive/` **si présentes** (`D-15`, sinon échec **dit**, pas un vert) ; bornage ; `regime` aux 11 valeurs entières et aux bords `±0,99` / `±1` / `±2` / `±3` / `±4,99` / `±5` |
| **B — l'orbite** | `D-53` en temps réel, puis l'inversion amortie. Zéro synergie | `src/companion.js`, `src/vol_follet.js` si l'amortissement y vit, `data/alignement.json`, `tests/` | à 37 et 60 fps simulés, même position à ±1 px après 2 s (témoin de `D-53`) ; à l'inversion, aucune frame où la position saute de plus que la vitesse max × dt |
| **C — les régimes** | `regimes` dans `companions.json` + migration de données, modificateurs de dérivée, canal de vitesse bidirectionnel, effets sur le héros, `resoudreSynergie` | `src/companion.js`, `src/status.js`, `src/main.js` (le point de lecture des modificateurs), `src/schemas.js`, `data/companions.json`, `data/status_effects.json`, `tests/` | **témoin** : régime positif palier 1 = valeurs d'aujourd'hui, pour les trois follets ; Eau négatif ne touche **aucune stat** ; Terre négatif : facteur monstre = facteur positif × 0,5 ; un monstre hors aura n'a rien ; brûlure héros fait descendre `pv`, jamais `pv_max` |

Chaque palier se clôt par sa validation en jeu (§9). **C ne commence pas avant que B soit vu** : si l'inversion ne se lit pas, la table des régimes n'a pas de signe qui l'annonce.

Ce que Claude Code ne touche **pas** : `render.js`, `ui/`, `dialogue*`, `flags.js`, `locales/`, `stats.json`, `stats_derivees.json` (la résolution des dérivées reste celle de `D-141` ; c'est la **source** des modificateurs qui s'enrichit). Toute exception remonte en `[OUVERT]`.

---

## 8. Ce que les tests ne peuvent pas prouver
Le sens de rotation, la lisibilité de l'inversion, la sensation de brûlure : **rendu jamais exercé en headless**. Tout ce qui est visuel est dû à Xav, manette en main, sous Chrome, `?alignement=N` en URL.

---

## 9. Validations en jeu — lignes `V-` à ouvrir

| Palier | À regarder |
|---|---|
| A | Partie neuve et vieille sauvegarde : **rien** n'a changé. Aucune carte, aucun texte, aucune icône. `?debug=fps` affiche `alignement: 0`, régime `neutre`. `?alignement=3` → `3`, `?alignement=9` → avertissement en console, valeur `null` |
| B | `?alignement=−3` : le follet tourne à l'envers, et **on le voit sans le chercher** ? Le renversement se lit (ralentit, repart) ou passe pour un accroc ? `?alignement=0` puis `−1` puis `−0,5` : seul `−1` inverse. Sur téléphone (URL publique après push) : même mollesse qu'au PC (`D-53`) |
| C | Follet Feu, `?alignement=−3`, un combat de nuit : la brûlure sur le héros **se sent** sans passer pour un bug ; les dégâts sont visiblement plus forts ; les monstres ne brûlent plus. Eau `−3` : on est plus lent, on frappe plus vite, les rôdeurs courent. Terre `−3` : on traîne, on encaisse, ils traînent un peu moins. Puis `+3` sur chacun : rien de nouveau au palier 1, le +2 se sent-il ? Et la question de fond : **est-ce que le côté négatif donne envie ?** — c'est une contrepartie assumée, pas une punition |

---

## 10. `[OUVERT]` — lignes `Q-` à ouvrir au ménage
1. Symétrie des paliers côté positif (+2/+3) — retenu par défaut.
2. Plancher à 1 PV pour la brûlure d'alignement, ou mort possible — retenu par défaut : **mort possible** (`D-74` la rejoue).
3. Icône d'effet subi sur le héros au bandeau — retenu par défaut : **rien**.
4. `duree_inversion_ms` ≈ 800, à régler à l'œil.
5. Que fait un follet **en cinématique** (intro, trois follets) si `A ≤ −1` en début de partie — retenu : l'intro ne lit pas le régime (les trois follets tournent comme aujourd'hui), l'inversion commence avec le jeu.

## 11. Hors périmètre, rappelé
Sources de variation (spec 11) · consommables de régénération comme contre · alignement dans le journal d'indices (jamais) · Annexe 1 et le re-choix du follet (il remettra l'alignement à… `[OUVERT]` pour la spec de l'Annexe 1 : conservé, ou remis à 0 ?).

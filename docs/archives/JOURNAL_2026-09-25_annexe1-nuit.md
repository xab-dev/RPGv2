---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), la nuit du 25/09 — palier G, palier H, polish, banc complet
type: fichier de bord
version: 1.0.0
statut: livré (G, H, polish, banc) ; V-156 validé, Q-162 tranchée, V-155 reste au téléphone
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, la nuit du 25/09

Demande de Xav, avant d'aller dormir : « push dans branch pour save, puis palier G, puis palier H, puis polish, puis banc complet (je vais me coucher) je te fais confiance (et au pire ce ne sera que les dernier commit donc facile à enlever/debuger) ».

Branche `annexe-1`, **poussée sur `origin/annexe-1`** au début de la nuit (une sauvegarde, jamais `main` : `main` publie le jeu). Un commit par ticket, chacun retirable seul. L'ordre de la spec (G → I → H) est changé par Xav : **H passe avant I** ; le dialogue de déblocage de la première sortie reste au palier I.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| — | Push | `annexe-1` poussée sur `origin` (nouvelle branche distante), jusqu'à `6959ae8` |
| `00b3100` | Ménage | Journal du palier F archivé (sa ligne `D-212` pointe `468ce0b`), INDEX à jour |
| `4bd6cf2` | `D-213` : palier G | Le coffre, le parchemin aux lettres d'or, `skills.json` et son schéma, `competences.js`, l'Onde qui éclate, la jauge |
| `bc750dc` | `D-214` : palier H | Le levier-récompense, l'éclat au sol qui est une monnaie, le fondu de la sortie |
| `a9d821c` | Polish G et H | Le parchemin centré dans son rouleau, le coffre ouvert plus lisible, le scénario de captures `annexe_parchemin.mjs` ; `Q-162` (g) |
| `cbb4a9f` | Banc complet | Les 12 passages de la spec 13 sur le code de G, H et du polish : aucune régression ; ces chiffres deviennent la référence |
| — | Push | `annexe-1` repoussée sur `origin`, jusqu'au banc |

## 1. Le palier G : le parchemin

- **Le coffre** apparaît au milieu de l'arène une fois le Gardien vaincu (`visible_si`). C'est un interactif `coffre_parchemin` : il nomme la compétence qu'il apprend, et son état **est** le flag de cette compétence. Ouvert, il se dessine vide (`render.visuel_ouvert`) et ne se prend plus à la main.
- **Le parchemin** : la vue de la stèle (temps, fondu, particules), avec un autre dessin (`ui/ecran_parchemin.js`) : un rouleau clair, l'icône dans un halo d'or, et les **lettres d'or qui s'écrivent** (`parchemin.js`) : le nom, ce qu'elle fait, le bouton. Un appui pendant l'écriture l'achève, le suivant ferme.
- **L'Onde** (`data/skills.json`, premier catalogue de compétences avec un schéma) : chargée par le follet (4 s d'engagement), 8 s de recharge, portée 7 tuiles ; le tir éclate au premier monstre, sur un mur ou au bout de sa course, et touche tout ce qui est dans 40 px.
- **Les dégâts** passent par un seul point, `competences.js#resoudreDegats` : Force × puissance d'Esprit × 2,5 (B1). Deux dérivées d'Esprit nouvelles (puissance, hâte), cachées avant la première compétence, en pourcentage dans la fiche.
- **La jauge** : la charge est un trait qui fait le tour de la case ; la recharge, un secteur sombre qui se retire. Deux formes, pas deux couleurs.

### Valeurs, et leur raisonnement

Toutes celles de la spec (§4.6), plus la portée (7 tuiles, comme l'attaque à distance du Gardien) et la vitesse du tir (220 px/s, plus vite qu'une salve : on vise un monstre qui bouge). Au Nv.30, avec Force ~17 et Esprit 5, un éclat fait **~53**, soit trois coups d'épée, sur tout ce qui est dans l'onde, toutes les 8 s. Sur le Gardien (1 000 PV), c'est un appoint ; sur quatre cracheurs groupés, c'est un nettoyage. Les boutons : `data/skills.json` (multiplicateur, charge, recharge, rayon, portée) et `data/stats_derivees.json` (ce que rapporte un point d'Esprit).

### Tests

`tests/test_spec14_palier_g_parchemin_2026-09-25.js` : le cycle charge / recharge / hâte, les dégâts, la cible ; le tir à zone (contact, mur, bout de course) ; l'écriture ; les refus au démarrage et une seconde compétence en données ; le vrai orchestrateur (le coffre, le parchemin gelé, B qui achève puis ferme, l'emplacement, la fiche Esprit, le refus sans cible ; en salle 1, la charge qui monte pendant l'engagement, le tir qui éclate et blesse, la recharge) ; aucun id du palier dans le code système. `test_d43_c3` suit : une dérivée cachée n'est pas listée. 203 fichiers verts.

### Ce que Xav doit voir

`V-155` (manette, clavier, doigt ; la checklist visuelle, le ticket touche le HUD) et `Q-162` (les choix par défaut).

## 2. Le palier H : la boucle

- **Le levier-récompense**, contre le mur nord de la salle 3, à droite de la porte, dans un halo, apparaît avec la victoire. L'actionner **dépose un éclat au sol** juste en dessous (`recompense` sur le levier, en données), et ouvre la porte de sortie. Un levier de descente repart éteint à chaque descente : **un éclat par descente**, jamais deux (l'actionner encore ne dépose rien).
- **L'éclat au sol** est un objet qui **est une monnaie** (`item_eclat`, `monnaie: monnaie_eclats`) : ramassé, il rejoint les éclats du bandeau, n'entre pas en poche, ne rapporte aucune XP. Il vit parmi les objets posés de la scène (`D-145`) : laissé au sol, il y reste.
- **La sortie par le noir** (`Q-153`) : `fondu_ms` sur le portail de sortie (900 ms, *provisoire*), `src/fondu_scene.js`. Entre les salles, toujours rien.
- **Ordre changé par Xav** : H avant I. Le dialogue « tu peux maintenant choisir… » de la première sortie reste au palier I.
- **L'album de référence** (six vues) est remis à la clôture de la spec, après le palier I.

### Tests

`tests/test_spec14_palier_h_boucle_2026-09-25.js` : le fondu ; les refus au démarrage ; les données (le levier de la salle du Gardien, la porte, la case libre de l'éclat, le fondu seulement à la sortie) ; **trois descentes d'affilée** par la stèle, portes des salles 1 et 2 forcées : un éclat chacune, ramassé sans poche ni XP, la sortie par le noir près de la stèle rouge, ni Zéros, ni Gardien, ni parchemin. Deux mutations attrapées. `test_spec14_palier_b` attend désormais le fondu de la sortie. 204 fichiers verts.

### Ce que Xav doit voir

`V-156`.

## 3. Le polish de la nuit

Xav dort : pas d'yeux sur l'écran. J'ai donc regardé les paliers G et H dans **Chrome sans fenêtre** (`tools/scenarios/annexe_parchemin.mjs`, profils `grand`, `pc` et `telephone` ; les images vont sous `docs/captures/scenarios/`, non versionnées). Ce que j'y ai vu, et ce que j'ai fait :

- **Le parchemin** laissait un grand vide en bas du rouleau : le bloc (icône, titre, texte) est désormais **centré** dans sa hauteur. Lisible au téléphone (DPR 3), lettres d'or sur le papier clair.
- **Le coffre ouvert** se lisait comme un coffre fermé plus haut : l'intérieur du couvercle est plus clair, l'ouverture plus haute et plus sombre. C'est encore discret ; Xav jugera (`V-155`).
- **La jauge** se lit : le trait qui fait le tour de la case pendant la charge, le liseré clair quand elle est prête, le secteur sombre qui se retire pendant la recharge.
- **L'éclat au sol** se voit sous le levier, dans son halo, et la porte s'ouvre.
- **Relevé, pas corrigé** : face aux cracheurs, qui gardent leurs distances, le follet n'engage que si l'on va au contact ; la charge monte donc lentement contre les tireurs. C'est la règle d'engagement du follet, hors de ce palier : `Q-162` (g).

## 4. Le banc complet (fin de nuit, `Q-159`)

Les douze passages (`cout_calque` et `traversee_nuit`, Bas / Moyen / Haut, ×1 et ×6), sur le code de G, H et du polish, comparés au dernier banc complet (`docs/archives/JOURNAL_2026-09-25_annexe1-palierC.md` §3). Chrome sans fenêtre, 1920 × 1080, DPR 1.

| Scénario | Preset | ×1 (palier C → cette nuit) | ×6 (palier C → cette nuit) |
|---|---|---|---|
| `cout_calque` : reconstruction moy / max · frames > 20 ms | Bas | 0,88 / 5,9 → **0,74 / 5,2** · 0/600 | 4,11 / 8,0 → **3,27 / 5,4** · 0/600 |
| | Moyen | 1,38 / 9,3 → **1,33 / 11,5** · 0/600 | 6,69 / 11,8 → **5,54 / 10,5** · 0/600 |
| | Haut | 1,58 / 10,3 → **1,38 / 11,4** · 0/600 | 7,31 / 11,3 → **6,44 / 10,3** · 0/600 |
| `traversee_nuit` : `dessiner()` · `maj()` · reconstruction · frames > 20 ms | Bas | 0,54 · 0,16 · 0,42 → **0,47 · 0,12 · 0,34** · 0/4 443 | 3,67 · 0,97 · 1,88 → **3,49 · 1,01 · 1,82** · 1/4 441 |
| | Moyen | 0,51 · 0,15 · 0,91 → **0,49 · 0,13 · 0,66** · 0/4 444 | 4,04 · 0,97 · 4,25 → **3,77 · 0,95 · 3,45** · 1/4 442 |
| | Haut | 0,58 · 0,15 · 0,94 → **0,56 · 0,13 · 0,88** · 0/4 444 | 4,43 · 0,97 · 5,63 → **4,23 · 0,94 · 4,92** · 1/4 441 |

- **Aucune régression.** Les moyennes baissent ou restent dans le bruit ; le seul écart à la hausse est `maj()` Bas ×6, 1,01 ms contre 0,97 (+4 %). Les maxima de reconstruction montent de 1 à 2 ms en Moyen et Haut ×1 : un pic isolé chacun, les moyennes baissent.
- **Frames > 20 ms** : 0 partout à ×1 ; 1 sur ~4 440 à ×6, comme au palier C.
- **Entrée en scène de la Maison** : 16 à 23 ms (plafond 40 ms).
- **Ce que le banc ne voit pas** : il ne connaît que la carte Maison. La salle 3 au plus fort du combat (Gardien, salves, Onde, ondes) reste le critère du §8 de la spec, à juger par Xav en jeu. Les tirs du héros ajoutent peu par frame : une liste de cibles de la taille des monstres de la scène, et rien quand aucun tir ne vole.
- **Ces chiffres deviennent la référence** (règle `Q-159`, `CLAUDE.md`).

## 5. Pour Xav, au réveil

- **À jouer** : `V-155` (le parchemin et l'Onde, à la manette, au clavier et au doigt ; le ticket touche le HUD) et `V-156` (trois descentes d'affilée, un éclat chacune).
- **À trancher** : `Q-162`, les choix par défaut du palier G, dont **(g)** : contre des tireurs qui gardent leurs distances, la charge monte lentement, parce que le follet n'engage qu'au contact.
- **Suivant** : le **palier I** (choisir ses stats, ses compétences et son follet ; la migration v8 → v9), puis l'album de clôture de la spec.
- **Pour revenir en arrière** : chaque commit de la nuit se retire seul (`git revert <commit>`), dans l'ordre inverse si l'on retire H et G ensemble.

## 6. Retour de Xav (26/09)

- `V-156` **validée** : « V-156: vu. »
- `V-155` : « V-155 reste à voir au téléphone ». La ligne reste ouverte pour le doigt.
- `Q-162` **tranchée** : « Q-162: oui, c'est voulu (gestion des compétences, équilibrage : le joueur se charge sur les premiers mobs puis la compétences et disponnible pour les pochains qu'il croisera. » La charge lente contre les tireurs est voulue ; rien ne change.
- Session close avant le palier I.

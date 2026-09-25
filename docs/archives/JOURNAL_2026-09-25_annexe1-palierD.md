---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), palier D — Zéros
type: fichier de bord
version: 1.0.0
statut: livré et validé (V-152)
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier D (25/09)

Demande de Xav : « go palier D ». Branche `annexe-1`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `5c8771e` | Ménage | Journal du palier C archivé, INDEX à jour |
| `3fffdbb` | `D-210` — palier D | La rencontre en données, Zéros intouchable, son follet en orbite, la relève, la fin au seuil, le passage |

## 1. Le palier D

- **La rencontre** (`src/rencontre.js`, pur) : un combat mis en scène, **déclaré sur la scène** (`scenes.json > rencontre`) — son déclencheur (une condition : le levier), son flag « une seule fois » (`flag_zeros_rencontre`, persistant), ses flags de fin (le passage), ses monstres et leur place, sa cible, son seuil (25 %), `sans_defaite`, la durée des fondus, ses trois dialogues. Phases : apparition (fondu, inertes), combat, fin (le dialogue, tout est figé), effacement (fondu), terminée (monstres retirés, flags posés). Rien dans le code ne sait que c'est Zéros : Zéros est récurrent (`Q-143`), sa prochaine rencontre (poste avancé…) sera une entrée de plus.
- **Les descentes suivantes** (`Q-142`) : le levier lève son propre flag de descente (`flag_annexe_levier_1`). La première fois, il déclenche la rencontre, dont la fin ouvre le passage ; ensuite, le flag de la rencontre étant posé, la rencontre se **raccourcit** : le passage s'ouvre dans la même frame. La porte attend toujours `flag_annexe_passage_1`.
- **L'intouchable** (`intouchable: true`) : porté par l'instance du monstre. `entities.js#infligerDegats`, le seul point où un monstre perd des PV, ne lui retire rien (auto-attaque, brûlure, aura, et les tirs du joueur au palier G) ; l'auto-attaque et le follet (engagement automatique et RB) l'ignorent.
- **La cible s'arrête au seuil** : elle reçoit un plancher de PV (`pvPlancher`, le seuil arrondi au-dessus) sous lequel aucun coup ne la fait descendre. Elle ne meurt donc jamais : ni XP ni butin (`Q-158`), et un gros coup à 26 % ne la tue pas.
- **Le follet de Zéros** : comportement `orbite` (`orbite: { autour, rayon_px, vitesse_rad_s }`), la loi d'orbite de notre follet (`companion.js#avancerOrbiteAutour`, même amortissement indépendant des frames) avec ses nombres à lui. Il ne frappe pas (force 0, `Q-141`).
- **La relève** : dans une rencontre `sans_defaite`, de l'apparition à la fin de l'effacement, 0 PV rend les PV pleins et ouvre la réplique du follet ; ni malus de survie, ni retour à la Grotte. Hors rencontre, la mort redevient la mort (tenu par test).
- **Zéros** : son propre visuel (`visuel_zeros`), la silhouette du héros recolorée en blanc, le cœur d'un noir violacé, jamais teinté par notre follet ; retourné (`render.miroir`). Il s'arrête **au contact** (`distance_contact_px` 16, portée 24) : la première capture le montrait **sous** le héros, invisible — un monstre au corps à corps va jusque sur sa cible, ce qui ne se voit pas pour un rampant mais cache une silhouette de la taille du héros. Absent, le champ vaut 0 : rien ne change pour les autres.
- **Son follet** (`visuel_follet_zeros`) : la goutte des follets, noire et translucide, un reflet blanc, un **halo sombre** (deux disques noirs translucides, pas une lueur : `Q-27` tient, `test_d161`).
- **La lumière de la scène** : une lumière de la salle attend « levier levé et Zéros pas encore rencontré » : la salle s'éclaire pour le duel, puis retombe dans le noir.
- **Les dialogues** : `dlg_zeros_debut` (`Q-157`), `dlg_annexe_releve`, `dlg_zeros_fin`. Un **locuteur** peut être une entrée d'ennemi (`locuteur.enemy_zeros` : « Zéros »). Textes **provisoires** (`E-05`), sans le Follet Blanc : le yin et le yang (« l'un dans la lumière, l'autre dans son ombre »), les secrets des follets (« un follet ne suit pas : il attend qu'on lui dise où se tenir », qui annonce la salle 2), et « là où la pierre répond » (`Q-143`).
- **Interrompue** : la rencontre est de session. Quitter le jeu au milieu la rejoue au chargement, depuis l'apparition, sans double ; fuir par l'escalier l'arrête (et la stèle remet la descente à zéro).
- **Tests** : `tests/test_spec14_palier_d_zeros_2026-09-25.js` (la machine à états, les entités, les refus au démarrage, une seconde rencontre en données seules, l'orchestrateur de bout en bout, l'interruption, aucun id du palier dans le code). Le test du palier C passe son cas « le levier ouvre le passage » sur une descente suivante. `node tools/run_tests.js` : **200 fichiers, tous verts**.
- **Outil** : `tools/scenarios/annexe_zeros.mjs` (captures non versionnées) : l'apparition, Zéros qui parle, le combat, la relève, au grand écran et au téléphone. Zéros est d'abord né sous le bandeau du haut (rangée 2, puis 3) : posé rangée 4, il apparaît dans le champ des deux profils.

## 2. Ce qui s'écarte de la spec, et pourquoi

- **Zéros parle aussi en arrivant** (`Q-157`) : pour que la cible soit claire dès le début.
- **`distance_contact_px`** et **`render.miroir`** : deux champs d'ennemi de plus, facultatifs.
- **La lumière de la rencontre** : une finition de mise en scène, en données.
- **La rencontre ne rapporte rien** (`Q-158`).

## 3. La sentinelle (`Q-156`)

`traversee_nuit.mjs`, Moyen, 1920 × 1080. Le palier touche `maj()` (la rencontre, la boucle des monstres) et `dessiner()` (l'opacité et le miroir des monstres).

| | `maj()` | `dessiner()` | Reconstruction | Frames > 20 ms |
|---|---|---|---|---|
| ×1, dernier banc complet (palier C) | 0,15 (rejoué 0,18) | 0,51 (rejoué 0,60) | 0,91 (rejoué 0,83) | 0 |
| ×1, palier D | 0,18 | 0,63 | 0,86 | 0 |
| ×6, dernier banc complet (palier C) | 0,97 | 4,04 | 4,25 | 1 |
| ×6, palier D (trois passages) | 1,21 · 1,16 · 1,07 | 4,57 · 4,38 · 4,31 | 4,76 · 4,50 · 4,41 | 2 · 1 · 1 |
| ×6, **code du palier C, rejoué à l'instant** (`git stash`) | 1,10 · 1,11 | 4,32 · 4,39 | 4,71 · 4,48 | — |

- Le premier passage ×6 dépassait 10 % sur tout, **y compris la reconstruction du calque**, que ce palier ne touche pas. Le code du palier C, rejoué dans les mêmes conditions, donne les mêmes chiffres que le palier D : **la machine** tourne ~10 % plus lentement que ce matin, le code n'a pas bougé.
- La règle demande le banc complet au-delà de 10 % ; l'A/B montre que l'écart vient de la machine. Le banc complet du jour (fin de journée ou réveil) refera la référence.
- La salle 1 pendant la rencontre ne se mesure pas au banc (il ne connaît que la Maison) : deux monstres de plus, aucun tir.

## 4. Pour Xav

- `V-152` : la marche à suivre est dans le suivi.
- `Q-157` (Zéros parle en arrivant) et `Q-158` (rien à gagner) : à trancher.
- Les textes de Zéros sont provisoires (`E-05`), dans `locales/fr.json` et `en.json` (`dlg.zeros.*`, `dlg.releve.1`).
- Au Nv.33, tu tomberas peut-être moins vite : Zéros frappe 18. S'il ne te fait pas tomber, la relève ne se verra pas — `force` dans `data/enemies.json > enemy_zeros`.
- Suivant : **palier E**, les deux mains (`levier_maintenu`, le follet posé).

## 5. Après le palier (25/09, 2 h)

- `Q-159` **tranchée par Xav** : « on a passé 30 minutes à écrire l'annexe, on a fait que le mini boss et on a passé au moins 5 heures de tests [...] on écrit, on avance, on corrige les bug, et de temps en temps on vérifie notre budget perf. » Plus de banc ni de capture par palier ; le banc complet à la fin d'une spec ou à la demande. La question posée au §3 (banc complet maintenant ?) tombe avec elle.
- Précisé ensuite par Xav : « fin de spec ou quand xav part dormir on en profite pour banc complet, quand xav reveiller on en profite pour avancer. je prefere faire des betise, devoir corriger, et apprendre, plutot que de regarder un test se rejouer pendant toute la journée. bien sur que l'on peut faire une sentinelle en milieu de spec pour etre sur qu'on a pas tout cassé, mais on ne peux pas perdre 1 heure à chaque palier. »

## 6. Validation (25/09)

- `V-152` **validée par Xav** : « Concernant Zéros, tout est parfait ! La scène est très bien amenée, et le combat était un peu rapide, mais je vais l'ajuster. C'est bien, Aucun lag en Haut, rien, c'était fluide, c'est jouable, c'est dynamique, c'est parfait ! »
- `Q-157` tranchée par la même validation (« la scène est très bien amenée ») : Zéros garde sa réplique d'arrivée.
- Le combat est « un peu rapide » : Xav le règle lui-même en données (`enemy_zeros`, `enemy_follet_zeros`, `scenes.json > rencontre`).
- `Q-158` (la rencontre ne rapporte rien) reste ouverte.

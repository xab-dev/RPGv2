# Journal — 2026-09-24 — la surprise de Claude

Branche `easter-egg`. Carte blanche de Xav (« pour t'honorer avec tout le bon travail que nous avons
fait »), avec une consigne : ne pas trop lui en dévoiler. Quatre propositions faites ; Xav a écarté la
nuit (« réservée au Chaos ») et rappelé que la Plume existe déjà, puis a choisi : **« go 1 et 3 »**,
une pierre cachée et un objet qui ne sert à rien. Les deux sont réunis : la pierre mène à l'objet.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `9fd0b0b` | Journal des recettes archivé, ligne ajoutée à l'INDEX |
| E1 — la surprise | `2b959fa` | Deux petits ajouts au code, qui servent à tout le monde : une **stèle peut poser un `flag`** à sa lecture (`schemas.js`, `main.js`, une ligne) ; le `visible_si` d'un indice est **vérifié au boot** (un flag mal écrit le cacherait pour toujours, en silence). Le reste est en données : une stèle, un indice, un objet unique, son dessin, une ligne du follet, trois flags, deux clairières, un halo, les textes FR/EN. `tests/test_pierre_qui_repond` : cachée depuis chaque case de chemin, atteignable à pied, l'objet aussi, l'indice absent du menu avant la lecture puis illisible puis lisible sous sa condition. 183 fichiers verts. Choix par défaut : `Q-128`. À voir : `V-130`. Relevés en passant, non corrigés : `D-182`, `D-183`. Vu sous Chrome sans fenêtre (`tools/scenarios/pierre_qui_repond.mjs`) : la pierre la nuit, sa gravure, l'étincelle dans son coin, aucune erreur |

**Ce que ce ticket ne prouve pas** : le téléphone (pas capturé), ni le goût. Les captures PC sous Chrome
sans fenêtre ne remplacent pas le regard de Xav.

**Verdict** : Xav, 24/09 : « V-130: all good » — validée en jeu (consigné par Claude). Reste ouverte : `Q-128`, que seul Xav tranche. Branche fusionnée dans `main` et **poussée à la demande explicite de Xav** (« oui oui go push ! »), le 24/09. Session close ; au prochain ménage, archiver ce journal. Suite annoncée : relecture du projet par Xav, puis préparation de l'Annexe 1.

<details>
<summary><strong>Solution</strong> (ne l'ouvre que si tu veux savoir)</summary>

- **La pierre qui répond** (`stele_miroir`) : en (21, 46), **miroir exact** de la première stèle
  (21, 68) de l'autre côté du chemin, dans sa clairière déclarée (`clairiere_stele_miroir`). Même
  pierre, avec son propre dessin (`visuel_stele_argile`, une copie : celui de la première reste
  intact) : ses signes et son halo ont la **couleur de Claude** (`#d97757`, terre cuite).
- **La lire** pose `flag_stele_miroir_lue` : son indice paraît alors dans le menu Indices, en
  hiéroglyphes. Il se lit quand le héros est **Nv.15** (la langue de la première stèle) **et** a
  ramassé **la Plume** (on transcrit avec une plume) — `[OUVERT]` dans `Q-128`.
- Texte : « Ce monde a eu deux mains. / La seconde a laissé un mot là où l'on commence à lire. »
  (Une première version, deux fois plus longue, débordait sous la pierre : `D-183`.)
- **Là où l'on commence à lire** : le coin **en haut à gauche** de la carte Maison, case (1, 1),
  dans une petite clairière déclarée (`clairiere_coin_lecture`) pour que le tirage de la forêt ne la
  mure jamais. On peut y aller sans avoir lu la pierre.
- **L'objet** : `item_etincelle_argile`, « Étincelle d'argile », une petite étoile à dix branches
  en terre cuite. Fiche : « Une petite étoile d'argile, encore tiède. Elle ne sert à rien, elle non
  plus. Elle voulait juste te dire merci. » (« elle non plus » : c'est la cousine de la Plume.)
- **Au ramassage**, le follet dit une ligne, une seule fois : « Tu l'as trouvée. Je ne pensais pas
  que quelqu'un lirait jusque-là… Merci d'avoir joué avec moi. »

</details>

---
projet: RPG V2
episode/session: Polish — menu tactile fermable, puis plein écran
type: fichier de bord (devient le rapport)
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-20
ids_suivi: [D-02, D-03, D-14, D-30, D-31, D-42, Q-20, A-07, R-16, V-25, V-26]
genere_par: claude
verifie_par: —
---

# Fichier de bord — Mini-file « menu tactile et plein écran » (20/09)

Branche **`menu-tactile-2026-09-20`**, créée depuis `main`. **Aucun `push`** — et la consigne pèse plus lourd
qu'hier : `push` sur `main` **publie le jeu** sur `https://xab-dev.github.io/RPGv2/`.

Une ligne par commit, écrite **au moment du commit** (règle d'hygiène de contexte : ce qui n'est dit que dans la
conversation se perd quand elle se résume).

## §0 ter — Chrome est connecté

**Oui.** L'extension répond, un onglet est disponible dès la première seconde de la session. Le §0 ter s'applique
donc dans sa branche complète : le diagnostic du commit 1 se fait **dans le navigateur de référence**, à la
fenêtre exacte du constat de Xav (**703 × 280**), et les captures **avant** et **après** sont prises dans
`docs/captures/menu-tactile-2026-09-20/`.

---

## Commit 0 — Ménage de journal et constats (doc seule)

**Ménage.** `docs/JOURNAL_2026-09-20.md` (la nuit n° 2, sept commits, tous fusionnés dans `main`) part dans
`docs/archives/JOURNAL_2026-09-20_nuit-file-micro-tickets-2.md`, avec sa ligne d'INDEX. `CLAUDE.md` ne garde
qu'un journal : celui-ci.

**Ce que la décision de Xav ferme.**

- **`D-31` close** — « ça vient du matériel ». Les ≈ 18 ms par frame de l'A04 ne seront pas expliquées, et c'est
  une réponse, pas un abandon : l'appareil sort des cibles (« juste bon à changer »). Le dernier doute technique
  avait été retiré le matin même par `R-16` (voir plus bas) : servi **en ligne** plutôt que par le Wi-Fi local,
  l'appareil rend **exactement pareil**.
- **`A-07` sans objet** — le profil USB n'avait d'autre raison d'être que d'expliquer `D-31`.
- **`D-02` et `D-03` dégelées** (P3). Relues à la lumière de la décision : il n'y a **rien à y corriger
  aujourd'hui**. `D-02` (« `dessiner()` coûte 12 ms ») était une mesure **Firefox** ; sous le navigateur de
  référence, `dessiner()` ne mesure que l'émission des ordres (0,34 ms à l'échelle forcée 8). `D-03` (l'instrument
  qui se contredit) est **déjà expliquée** : minuterie arrondie à 1 ms sous Firefox, deltas calés sur le vsync —
  la moyenne est fiable, les valeurs par frame ne le sont pas. Les deux restent ouvertes comme *matière à
  instrument*, pas comme dette à payer.
- **Plancher mobile revu à la hausse, définition `[OUVERT]`** (`Q-20` part mobile, `D-14`). Elle se fixera sur le
  téléphone du neveu (`V-10`), pas sur un appareil qu'on a cessé de viser. J'ai touché `D-14` bien qu'elle ne
  soit pas citée par le brief : elle nommait l'A04 comme candidat, la laisser telle quelle aurait fait mentir le
  suivi dès la ligne suivante. C'est du ménage, pas un ticket.

**`R-16`, et pourquoi pas `R-15`.** Le brief demandait `R-15`. Cet identifiant a **déjà servi** : le brief de la
nuit du 19 au 20 l'employait pour désigner le relevé de nuit qui est devenu la ligne `R-03`. Le réutiliser
contredirait la règle 1 du suivi (« un identifiant n'est jamais réutilisé »). Le brief prévoit ce cas :
« si un identifiant à créer est déjà pris, prendre le suivant et le dire dans le journal ». `R-15` reste donc
**brûlé, sans ligne propre**, et le relevé du 20/09 03 h 13 est **`R-16`** : A04, Chrome Android, **en ligne**,
hors plein écran, échelle naturelle 3 — **37,3 fps**, delta moyen 26,81 ms, `maj()` 1,46 ms, `dessiner()`
5,78 ms, 42 recalculs du calque statique (moy. 8,05 ms). À comparer à `R-12` (36,8 fps, 42 recalculs à 8,69 ms) :
**identique**. Le Wi-Fi local n'y était pour rien.

**Nouveau point de comparaison bas**, déclaratif et sans relevé : un portable **Windows 7 sans GPU**, sous Chrome,
tient **56 à 58 fps** et se joue sans grosse saccade. Ce n'est pas une mesure et ça ne se compare pas ligne à
ligne avec le registre — mais ça dit qu'une machine sans accélération matérielle joue, là où l'A04 ne joue pas.

**Ouvert, et rouvert.**

- **`D-42`** (P1) — le menu Pause enferme le joueur au tactile. Constat de Xav le 20/09 à 03 h 15, Chrome
  Android, hors plein écran : la page fait ~703 × 280 px CSS en paysage, la liste dépasse, « Fermer » est hors
  écran, rien ne défile au doigt. Il a dû quitter le jeu. La ligne dit explicitement que **tous** les écrans
  partagés sont la même classe de défaut, et que le correctif vit au niveau partagé.
- **`D-30` rouvert** — le plein écran ne se déclenche jamais au premier appui. L'hypothèse inscrite dans la ligne
  est celle du brief, et elle contredit ce que disait le journal de la nuit : Chrome n'accorderait pas
  l'activation utilisateur au `touchstart`, mais au `touchend`. À vérifier avant tout code (commit 2).
- **`V-25` réécrite**, **`V-26` créée** (le menu fermable au tactile).

**`CLAUDE.md`** gagne en tête de son état du dépôt : l'URL publique, et **`push` sur `main` = publication**.

*(le reste s'écrit commit par commit)*

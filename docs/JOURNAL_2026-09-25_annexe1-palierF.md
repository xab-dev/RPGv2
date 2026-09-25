---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), palier F — le Gardien
type: fichier de bord
version: 1.0.0
statut: livré, à valider (V-154)
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'Annexe 1, palier F (25/09)

Demande de Xav : « Zéros c'était pour voir le feu follet me relever, j'ai remis 21 tu peux commit mes valeur. Q-158 et Q-160 ok, go palier F ». Branche `annexe-1`. Pas de push. Aucun banc (`Q-159`) : tests, commit, Xav joue.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `d677ae5` | Réglages de Xav | Zéros : force 21, portée 32 ; son follet : 360 PV |
| `3c02893` | Ménage | Journal du palier E archivé, INDEX à jour |
| `bfa4b2d` | DOC | `Q-158` et `Q-160` tranchées par Xav : « Q-158 et Q-160 ok », le retenu tient |
| (ce commit) | `D-212` : palier F | Le Gardien : le comportement `boss`, la salve, la barre en haut de l'écran |

## 1. Le palier F

- **Le comportement `boss`** (`comportement_monstres.js#deciderBoss`, pur) a trois gestes :
  - le **corps à corps** de tout monstre (`portee_attaque`) ;
  - le **tir** : son `attaque_distance`, la même que celle du tireur ;
  - un **mode de déplacement** tiré au sort selon ses poids, gardé 3 à 6 s (`duree_mode_ms`).
- **Les modes** se déclarent en liste (`modes: [{ type, poids, facteur_vitesse?, tir }]`) :
  - **agressif** fonce, ×1,6, et s'arrête au contact (`distance_contact_px`, comme Zéros) ; il ne tire pas ;
  - **kite** *est* le tireur (`deciderTireur`) : il garde son `recul_tuiles` (4) et tire à 7 tuiles ;
  - **errance** va de point en point dans la salle, en change s'il n'avance plus, et tire.
- Le hasard n'a pas de graine : un boss qui rejouerait la même danse à chaque essai se réciterait.
- **La salve** est facultative, sur toute `attaque_distance` (`salve: { nombre, ecart_deg }`, `projectiles.js#viseesSalve`) : le Gardien tire trois tirs à 16° l'un de l'autre. Un seul chemin de tir (`main.js#tirerVersLeHeros`), cracheurs compris.
- **La barre du boss** : `boss: true` la met en haut de l'écran, sous le bandeau, à son nom (`ui/hud.js`, `hud_layout.js#BARRE_BOSS`). Elle ne se dessine plus au-dessus de lui.
- **Le Gardien** : une sentinelle de pierre à la rune bleue, sans halo (`Q-27` : aucune lueur sur les monstres ; un test l'a rappelé). Il naît au nord de l'arène tant que `flag_gardien_vaincu` n'est pas posé. Ce flag est **persistant** et posé par le `nettoyage` de la salle 3, dont il est le seul spawn : aucune ligne de code pour ça.
- **Mort** : la Grotte, comme partout ; la descente suivante repart de zéro.
- **Vaincu** : 300 XP. Le coffre est au palier G, la porte de sortie au palier H (le levier-récompense) ; d'ici là, on ressort par le sud.

## 2. Les valeurs, et leur raisonnement (`Q-146`)

Le raisonnement complet est au `D-212` du suivi. En bref :

- **Durée du combat** : au contact, le héros fait ~35 dégâts/s au Nv.16 et ~75 au Nv.30. Le Gardien n'y est que ~40 % du temps. Avec **1 000 PV**, le combat dure ~40 s au Nv.30 et ~90 s au Nv.16.
- **Ce qu'il inflige** : **8** par coup. Au contact, toutes les 1,2 s ; de loin, une salve de trois toutes les 1,8 s. Sans esquive ni soin, c'est ~5 PV/s en moyenne : ~20 s pour vider les 114 PV d'un Nv.30.
- **Verdict visé** : au Nv.30, on gagne en esquivant les salves et avec un repas ; au Nv.16, on perd.

Les boutons sont dans `data/enemies.json > enemy_gardien` :

| Réglage | Ce qu'il change |
|---|---|
| `pv` | La longueur du combat |
| `force` | Ce que coûte une erreur |
| `poids` des modes | Plus de corps à corps (agressif) ou plus de tirs (kite) |
| `salve`, `cadence_ms` | La pluie de tirs |
| `facteur_vitesse` de l'agressif | 1,6, soit 80 px/s. Le Gardien reste moins rapide que le héros, qui peut toujours rompre |

## 3. Tests

- `tests/test_spec14_palier_f_gardien_2026-09-25.js` couvre :
  - la décision du boss (tirage pondéré, durée, trois modes) ;
  - la salve ;
  - les refus au démarrage ;
  - un second boss fait de données seules ;
  - le vrai orchestrateur en salle 3 : barre, salves, coups, victoire, flag, XP, barre effacée ;
  - les descentes suivantes, sans boss ;
  - la mort, qui renvoie à la Grotte ;
  - aucun id du palier dans le code système.
- Le hasard du jeu est remplacé par une suite fixe le temps du test.
- Une mutation est attrapée : la salve ignorée.
- `test_d161_monstres` a refusé le premier dessin, qui avait un halo sur la rune (`Q-27`). Le halo est retiré.
- 202 fichiers verts.

## 4. Hors de ce commit

- Rien. La capture PNG non suivie de `docs/captures/v1/raw/` reste où elle est. Elle avait été emportée par erreur dans le commit de ménage ; je l'en ai retirée avant de continuer.

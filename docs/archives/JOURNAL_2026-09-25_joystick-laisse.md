---
projet: RPG V2
episode/session: Le joystick tactile flottant « en laisse » (D-138)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : le joystick tactile en laisse (25/09)

Demande de Xav, après le diagnostic du joystick tactile (centre fixe, aucun
rond sous le doigt, aucune zone morte, pleine vitesse au bord exact du cercle) :

> il faut partir de la branche en cours, qui correspond au ménage qui n'a pas
> encore été fusionné, il me semble. Juste fusionne-la dans main, commit puis,
> go C (nouvelle branche) : J'aimerais bien garder le déplacement lent comme sur
> la manette. On ne sait jamais ce qu'il adviendra, je préfère garder le choix.

« C » : le centre se pose là où le pouce se pose, et se fait **tirer** derrière
le doigt quand celui-ci s'éloigne de plus d'un rayon ; zone morte, et pleine
vitesse avant le bord. La marche lente reste (magnitude analogique, pas de tout
ou rien).

`menage-contexte` (avec `dettes-243-244-246`) fusionnée dans `main` par
`50f1326` (suite verte, 220 fichiers). Branche `joystick-laisse`, partie de
`main`. Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `428bee0` | Ménage | Journal du ménage du contexte archivé ; aucune réponse nouvelle au suivi ; branches fusionnées supprimées |
| `d379359` | `D-138` | Le centre naît sous le pouce (gardé à une course des bords) et se fait tirer au-delà de `rayonZone` ; zone morte 10 %, pleine vitesse à 70 %, marche lente en ligne droite entre les deux ; le HUD dessine le cercle qui suit et un rond sous le pouce. `V-174` à voir au téléphone (avec `V-79`), `Q-178` à confirmer. Suite verte, 221 fichiers |
| (celui-ci, tagué `v0.8.63`) | Versions | Règle de Xav : `v0.x.0` un gros patch, `v0.x.y` = y commits depuis `v0.x.0` ; décision dans la table de `CLAUDE.md`, `package.json` à `0.8.63` ; `D-14` : le plancher mobile sera un téléphone acheté pour ça |

## Pour Xav

- **À trancher** : `Q-178`, surtout le point (2) — un pouce posé tout contre un bord fait partir le héros dès le contact.
- **À voir au téléphone** : `V-174` (et `V-79` dans le même essai), guidé par `docs/CHECKLIST_visuelle.md`.
- Xav, 25/09 : « fusionne tout dans main pour les test téléphone. puis pousse, on publie tout » — `joystick-laisse` fusionnée dans `main` et poussée (avec `menage-contexte`), sans release.

---
projet: RPG V2
episode/session: Spec 14 (l'Annexe 1), la nuit du 25/09 — palier G, palier H, polish, banc complet
type: fichier de bord
version: 1.0.0
statut: en cours (Xav dort)
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
| (ce commit) | `D-213` : palier G | Le coffre, le parchemin aux lettres d'or, `skills.json` et son schéma, `competences.js`, l'Onde qui éclate, la jauge |

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

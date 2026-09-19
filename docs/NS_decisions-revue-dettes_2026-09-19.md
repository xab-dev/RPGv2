---
projet: RPG V2
episode/session: Polish post-Construction — revue des dettes (doc seule)
type: notes de session
version: 1.0.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — NS : décisions de la revue des dettes du 2026-09-19 (aucun code)

Session de documentation, même patron que `NS_decisions-playtest_2026-09-19.md`. Ménage de journal, puis mise à jour de `CLAUDE.md`, de la carte mentale (→ **v1.6.0**) et de `specs/00_ROADMAP.md` (→ **1.5.0**). **Aucun fichier de `src/`, `data/`, `tests/` n'est touché.**

Source de vérité du détail : `docs/DOC_suivi-dettes.md` v1.4.0 (§8 « Clos » pour le verdict de chaque question). Lignes du suivi traitées par cette session : `DOC-01`, `DOC-02`, `DOC-03`, `DOC-05`, `DOC-06`. Ne toucher à aucune autre.

## 1. Méthode de travail (décisions Xav)

- **Micro-tickets.** Les grosses sessions ont fait perdre plus de temps qu'elles n'en ont gagné. Désormais : un sujet par ticket, une session courte par ticket, validation de Xav en jeu entre deux. Une spec par paliers se joue **un palier par session**.
- **Chaque ticket cite les identifiants du suivi qu'il touche** (« traite `D-17`, ne touche pas à `D-11` »). Claude Code ne lit dans le suivi que ces lignes.
- **`docs/DOC_suivi-dettes.md` est la seule liste de ce qui est dû.** Dans `CLAUDE.md`, remplacer les sections « Points `[OUVERT]` » et « Dette et à reprendre » par le bloc de l'**annexe A du suivi**, tel quel. Avant de supprimer : vérifier que chaque ligne des deux sections a son identifiant dans le suivi ; ajouter celles qui manqueraient.
- **Claude Code garde l'initiative dans le périmètre de son ticket** (retenir par défaut en marquant `[OUVERT]`, proposer et faire du polish) et **propose hors périmètre**. Cette règle figure dans le bloc de l'annexe A.
- **Validation visuelle (révise la règle de méthode sur `CHECKLIST_visuelle.md`).** La validation en jeu par Xav suffit à clore un ticket qui touche au rendu : remplacer « capture par état » par « validation en jeu par Xav ». La checklist reste la liste de ce qu'il regarde. À chaque clôture de phase ou de chantier, Xav prend les six vues de référence dans `docs/captures/AAAA-MM-JJ_jalon/` (annexe B du suivi).
- **Sauvegardes réelles.** Xav conserve une dizaine de sauvegardes exportées à toutes les étapes du jeu dans `docs/sauvegardes/`. Migrations 3→4 et 4→5 **validées par lui** sur ces fichiers le 19/09 (lieu, niveau, cycle jour/nuit, poche conservés) : retirer les deux lignes de dette correspondantes. À partir du premier lien de partage, une sauvegarde réelle exportée à chaque changement de version rejoint ce dossier.

## 2. Corrections de doc (faits établis)

- `CLAUDE.md` affirme « zéro chiffre réel recueilli » : **faux**. Deux relevés `?debug=fps` existent (registre §6 du suivi, `R-01` et `R-02`).
- **Étape 7 du polish (correction des saccades).** `CLAUDE.md` la dit « pas commencée » ; le seul journal archivé conclut « correctif dans `hud_debug.js` seulement » ; Xav se souvient d'un correctif dans le jeu, vu dans la session de 3 h. **Ne pas réécrire l'histoire à l'aveugle** : lancer `git log --oneline --since=2026-09-18 -- src/render.js src/main.js`, consigner la sortie dans le journal, et écrire le statut d'après ce qu'elle montre. Les relevés ne montrent aucun gain de rendu entre `R-01` et `R-02` (`dessiner()` ≈ 12 ms dans les deux).
- `specs/00_ROADMAP.md`, section polish : les étapes 1 à 6 sont **livrées et validées à la manette par Xav le 19/09** ; retirer « aucune de ces specs n'est encore écrite ».
- Branche `polish-2026-09-19` : noter son état réel (fusionnée ou non) au moment de la session.

## 3. Région Maison — vocabulaire révisé (remplace le §2 de `NS_decisions-playtest_2026-09-19.md`)

Motif : Xav avait dit « les angles », il précise. À reporter en carte mentale §3bis.

| Mot | Sens |
|---|---|
| **Forêt** | Le côté ouest de la carte, où débouche la Grotte. |
| **Jardin** | Proche de la maison : le puits, l'arbre fruitier, l'endroit où le fruit réapparaît. |
| **Zone sûre** | Maison + Jardin, **et un rectangle autour de la sortie de la Grotte**. Aucun monstre n'y apparaît, aucun n'y entre (demi-tour). |
| **Campagne** | La **bande centrale** autour du chemin, de la Maison et du Jardin, hors zone sûre. **Neutre** : rien n'y apparaît, mais un monstre peut y poursuivre le joueur. |
| **Champs** | **Deux grandes zones en L**, au nord et au sud de la bande centrale, à l'est de la Forêt. C'est là que le Chaos s'installe la nuit, et là que Xav veut plus tard une ferme. |

Toutes les zones se décrivent en **rectangles**, au format `zones` déjà présent dans `scenes.json`.

## 4. Arc de progression de la carte Maison

**Révise une décision verrouillée** : « accès à la 1ère zone de monstres gaté par niveau (~5) » est **abandonné**. La carte suivante s'ouvre quand la carte Maison est épuisée, vers le niveau 40-50 (provisoire). Conséquence à inscrire dans la ROADMAP : les *systèmes* prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la *carte* de la Phase 4 vient après. Claude Code ne doit plus lire « Phase 4 = prochaine étape ».

| Niveau | Ce qui s'ouvre sur la carte Maison | Statut |
|---|---|---|
| 5 | Zone de Chaos nord-est (la nuit) | **décidé** — périmètre de `07_chaos-nocturne.md` v1.1.0 |
| 10 | Zone de Chaos sud (la nuit) | **décidé** — micro-ticket données seules, plus tard |
| 15 | Apparitions éparses en Forêt et dans les Champs (la nuit) | **décidé** — idem. *Remplace* « quelques monstres épars en Forêt » dès le début : la Forêt reste vide avant 15 |
| 20 | Une petite caverne en Forêt, annoncée par une ligne de lore, avec un casse-tête plus corsé que les trois leviers (dessiné par Xav) | idée |
| 30 | Les compétences | idée — voir `Q-18` |
| 40-50 | La carte suivante | idée |

**Avant toute nouvelle carte** (liste de Xav) : plus de ressources, écrire les crafts, écrire les armes, écrire les compétences (`E-02`). Des portes, cavernes ou tunnels viendront sur la carte Maison, dans l'esprit de la V1 ; les monstres en rendront l'accès intéressant.

**Critère de clôture de la Région Maison — la boucle de 2 heures** : sauvegarde neuve → deux heures de jeu → niveau 30 → l'envie de changer d'endroit. Vérifiable à la main par Xav et par le bot headless, comme la boucle 5 minutes de la Phase 3.

Retour de playtest à conserver : monter de niveau par la seule cuisine devient pénible vers le niveau 7.

`Q-18`, ouverte, à ne pas trancher : « compétences au niveau 30 » frotte contre « XP → stats, jalons narratifs → capacités ». Piste : *le niveau ouvre le lieu, le lieu donne la capacité*.

## 5. Monstres nocturnes — « un domaine, pas un piquet » (remplace la « laisse »)

Errance dans un domaine fait de zones de la carte · poursuite bornée depuis le point où le monstre repère le joueur · désintérêt de quelques secondes après un abandon ou un demi-tour en lisière de zone sûre · anti-blocage après ~1 s sans avancer. Un monstre ne sort de son domaine que si le joueur l'y attire. Seuils de niveau **en données**, jamais dans le code. Détail : `specs/07_chaos-nocturne.md` v1.1.0.

## 6. Décisions d'interface (détail et tickets dans le suivi)

- **Bandeau HUD** (`D-13`, `D-17`) : compagnon · PV (jauge + nombre) · éclats · faim · soif · buffs · `Nv. N` collé au bord droit. Buff = une icône par **effet** (la stat renforcée), forme et couleur, sans texte ni jauge ; pulsation douce en fondu sur les ~2 dernières secondes. Le bouton MENU tactile descend **sous** le bandeau.
- Indice de commande : reste sous le bandeau. Rotation en Construction : reste sur `SKILL_1`, statut provisoire levé.
- **Brique d'input « maintien puis répétition »** (`D-18`), sans urgence, avant toute construction extérieure ; corrige aussi le tapotement du joystick tactile.
- **Puits** (`D-16`, gelé jusqu'aux captures de Xav) : treuil, corde et seau conservés ; mâts à planter **au sol** de part et d'autre (le ticket du 19/09 les a posés sur la margelle, à l'inverse de l'intention) ; perspective à unifier en trois quarts (cylindre + ellipses + ombre).

## 7. Ordre d'injection proposé (à confirmer par Xav)

Cette NS (doc seule) → `D-17` bouton MENU tactile → `D-13` buffs au bandeau → `D-02` ventilation de `dessiner()` dans `?debug=fps` (mesure seule) → `07` palier A → palier B → palier C → palier D → `D-16` puits (quand les captures sont là). `Q-07`, `Q-10`, `Q-11`, `Q-12` restent à trancher avec Xav.

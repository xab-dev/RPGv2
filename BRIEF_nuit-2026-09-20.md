---
projet: RPG V2
episode/session: Nuit du 20/09 — file autonome n° 2
type: brief de session longue (file de micro-tickets)
version: 1.2.0
statut: brouillon
catégorie: Ticket
date: 2026-09-20
ids_suivi: [D-30, D-17, D-13, D-25, spec 07]
genere_par: claude
verifie_par: xav
---

# BRIEF — Nuit du 20/09 : corrections et dettes déjà décidées

**Principe de cette file : zéro décision nouvelle.** Tout ce qui suit a déjà été tranché par Xav. Ce qui demande son avis (la lumière du follet, les apparitions de ressources, la lisibilité de la première nuit dangereuse, l'indicateur jour/nuit) **n'est pas dans cette file** et ne doit pas y entrer par initiative.

## 0. Règles

Celles du §0 de `docs/BRIEF_nuit-2026-09-19.md`, **inchangées** (branche dédiée, un ticket = un commit, ordre fixe, ticket en échec annulé proprement, arrêts obligatoires, lecture bornée, « validation due » jamais « validé », arrêt propre si le contexte devient court). Deux précisions :

- **Avant toute chose** : `git log --oneline -15` sur `main` doit montrer le commit d'annulation de `9997cec` et un arbre de travail propre. Sinon, **s'arrêter et le dire** : la file ne se construit pas sur une base incertaine.
- Branche **`nuit-2026-09-20`**, créée depuis `main` **tel qu'il est** : la fusion de la nuit précédente y est, et le commit de la lumière du follet y est **annulé** (`git revert 9997cec`, décision de Xav). **Ne pas le rétablir, ne pas le retravailler** : Xav en reparle d'abord.
- **Identifiants** : je n'ai pas le suivi tel qu'il est après la nuit. Pour toute ligne nouvelle, prendre le prochain identifiant libre et le donner dans le rapport.

## 0 bis. Hygiène de contexte (nouveau — vaut pour toute file longue)

Plus la session dure, plus le contexte s'alourdit et se résume tout seul ; ce qui n'a été dit **que dans la conversation** peut se perdre. Donc **l'état de la file vit sur le disque, jamais dans la mémoire de la session.**

1. **Fichier de bord `docs/JOURNAL_2026-09-20.md`**, créé au ticket 1. Après **chaque** commit : une ligne — ticket, hash court, état, ce que Xav doit regarder, valeurs provisoires, `[OUVERT]`. C'est lui qui devient le rapport du matin.
2. **Au début de chaque ticket, relire depuis le disque** : le §0 et le §0 bis de ce brief, la section du ticket, le fichier de bord. Ne jamais travailler de mémoire sur une règle ou une valeur.
3. **Un ticket ne s'appuie que sur le dépôt** (code, tests, docs), jamais sur « ce qu'on a vu tout à l'heure ». Un doute sur un ticket précédent : `git show <hash>`, pas un souvenir.
4. **Sorties bornées** : `npm test` en résumé (nombre de tests, échecs détaillés seulement) ; pas de fichier entier relu s'il suffit d'une fonction.
5. Si l'outil le permet, **confier chaque ticket à un sous-agent** au contexte neuf, la session principale ne gardant que la file et le fichier de bord. Si ce n'est pas possible ou pas fiable : rester en session unique, les points 1 à 4 suffisent.

## 0 ter. Chrome : une preuve, ou rien

Pour les tickets qui touchent au rendu (2 à 6) : **si** l'intégration Chrome est connectée (`/chrome` l'indique), ouvrir le jeu servi en local, vérifier l'absence d'erreur console et de chevauchement, et **laisser une preuve** : une capture ou un GIF par ticket dans `docs/captures/nuit-2026-09-20/`, nommés par ticket, cités dans le fichier de bord. **Si elle n'est pas connectée : l'écrire en tête du fichier de bord et continuer sans.** Ne jamais écrire « vérifié dans Chrome » sans fichier de preuve. Une vérification dans Chrome ne remplace pas la validation de Xav : elle dit « ça s'affiche sans défaut », jamais « c'est réussi ».

## 1. La file

| # | Ticket | Commit |
|---|---|---|
| 1 | Doc : ménage de journal + constats de Xav | `DOC constats du 20/09` |
| 2 | Follet : la double orbite | `SD follet : double orbite (heros - point logique - corps)` |
| 3 | Noms des monstres retirés de l'écran | `MT monstres : plus de nom affiche` |
| 4 | `D-17` Bouton MENU tactile sous le bandeau | `D-17 …` |
| 5 | `D-13` Buffs au bandeau | `D-13 …` |
| 6 | `D-25` Plein écran au tactile | `D-25 …` |

---

## Ticket 1 — Doc seule

Ménage de journal. Consigner au suivi :

- **Verdict de Xav sur la nuit du 19 au 20** : tout est fusionné **sauf** la lumière du follet (`D-29`, annulée par `git revert 9997cec` : « n'allait pas très bien », détail à venir). `D-29` revient à **ouvert**, avec la mention « à reprendre après discussion ».
- **Règle de méthode, à ajouter à `CLAUDE.md`** (amende « une session par ticket » du 19/09) : *une session longue est permise si c'est une **file de micro-tickets** sur une branche dédiée — un commit par ticket, ordre fixe, chaque commit retirable seul. Vérifié la nuit du 19 au 20 : un ticket a été annulé au matin sans toucher aux autres.*
- **Constat d'équilibrage (Xav, 19/09 23 h 45)** : en jouant vite, le niveau 5 est atteint avant la première nuit. Deux lignes `Q-` à ouvrir, **sans y répondre** : (a) apparitions de ressources semi-aléatoires et plus nombreuses — Xav connaît les emplacements par cœur ; (b) lisibilité de la première nuit dangereuse pour un débutant.
- Les deux défauts ci-dessous (tickets 2 et 3), avec leur identifiant.

---

## Ticket 2 — Follet : la double orbite

**Constat (Xav, capture du 20/09).** Depuis `D-30`, le corps du follet est décalé du centre de son aura, et l'écart bouge sans règle lisible. Ce qui gêne n'est **pas** qu'il soit décalé de son point logique — c'est qu'il ne soit **pas en orbite autour de lui**. Deux points existent désormais (le point logique, centre de l'aura ; le point visuel, le corps) sans relation entre eux.

**Décision de Xav : deux points, deux orbites.**

1. **Le point logique** — centre de l'aura, de la lumière et de tout calcul de jeu — orbite autour du **héros**. C'est l'orbite existante : **inchangée**, valeurs comprises.
2. **Le corps du follet** orbite autour du **point logique**, sur une orbite **plus petite**. Effet recherché : un « chaos maîtrisé », joli et lisible.

Origine de l'écart, pour mémoire : le brief du 19/09 demandait à `D-30` un décalage purement visuel du corps avec une aura restant sur la position logique. L'implémentation a suivi le brief ; c'est le brief qui manquait de règle.

**Lecture d'abord, trois lignes en tête de rapport** : comment `D-30` calcule le décalage du corps aujourd'hui · son amplitude maximale en px logiques · ce qui dessine depuis le corps et ce qui dessine depuis le point logique (aura, lumière, ornements, sillage, attaques du follet s'il y en a de visibles).

**Conception.**
- Une **fonction pure** : (temps, paramètres) → décalage du corps par rapport au point logique. Déterministe, sans hasard, sans état caché. **Elle remplace** les micro-élans et le vol stationnaire nerveux de `D-30`, elle ne s'y ajoute pas. Ornements et sillage de `D-30` sont conservés et suivent le corps.
- Paramètres **en données**, tous *provisoires* et `[OUVERT]` : rayon de la petite orbite **6 px logiques** · période **1,4 s** · **sens inverse** de la grande orbite (la trajectoire dessine une rosace plutôt que des boucles) · phase initiale fixe.
- La règle vaut **partout en jeu** : follet en suivi comme follet engagé sur un monstre — le corps tourne autour du point logique, où que celui-ci soit.
- **Aura, lumière, engagement, zone d'orbite : sur le point logique, strictement.** L'aura reste donc un repère exact de la zone de jeu. Rien ne scintille.
- **Borne** : rayon de la petite orbite + demi-taille du corps < rayon de l'aura. Le corps ne sort jamais de son aura ; validé au chargement des données.

**Tests (rouge d'abord).** |décalage| = rayon, à tout instant · continuité d'une frame à l'autre (aucun saut, y compris au passage suivi → engagé) · le centre de l'aura dessinée = le point logique, exactement · la borne ci-dessus · les valeurs de la grande orbite n'ont pas bougé.

**Repli, si la double orbite ne tient pas dans le périmètre** (seconde solution acceptée par Xav) : remettre le corps **au centre** de l'aura, décalage nul, ornements et sillage conservés. Le dire dans le rapport.

**Interdits.** `intro.js` et la cinématique · la grande orbite et ses valeurs · la condition d'engagement · la lumière du follet (annulée, hors file).

**Périmètre de lecture.** `src/companion.js` · dans `src/render.js`, le dessin du follet, de son aura et de ses ornements · les données de `D-30` (`visuels.json`, `effets.json`) · leurs tests.

**À rapporter.** Si le follet a des attaques ou des effets visibles, d'où ils partent aujourd'hui (corps ou point logique) : ne rien changer, le dire.

**Validation due.** À l'œil de Xav : à l'arrêt, en course, follet engagé. C'est lui qui règle rayon, période et sens.

---

## Ticket 3 — Plus de nom au-dessus des monstres

**Décision de Xav.** Le nom des monstres charge l'affichage. On les distinguera par **la forme et la couleur**. Retirer l'affichage du nom, partout où un monstre est dessiné (Grotte comprise).

- Retirer le **dessin**, pas la donnée : les noms restent dans le catalogue et dans `locales/` (futur bestiaire, journal).
- Ne rien mettre à la place. Si une jauge de vie est liée au même bloc de dessin, elle reste.
- S'il existe un réglage en données pour ce libellé, le retirer aussi plutôt que le laisser à `false`.

**Périmètre de lecture.** Dans `src/render.js`, le dessin des monstres · `src/monsters.js` seulement si le libellé y est préparé · les tests concernés. **Validation due** : Grotte, et nuit au niveau ≥ 5.

---

## Tickets 4 et 5 — `D-17` et `D-13` : le bandeau

Décision verrouillée du 19/09 (`NS_decisions-revue-dettes_2026-09-19.md` §« Bandeau HUD »), qui fait foi :

> compagnon · PV (jauge + nombre) · éclats · faim · soif · **buffs** · `Nv. N` collé au bord droit. Buff = **une icône par effet** (la stat renforcée), forme et couleur, **sans texte ni jauge** ; pulsation douce en fondu sur les ~2 dernières secondes. Le bouton MENU tactile descend **sous** le bandeau.

- **Ticket 4, `D-17`** : le bouton MENU tactile passe sous le bandeau. `src/ui/hud_layout.js` (fonction pure, test sur les gabarits 16:9 et téléphone large) et `src/input/touch.js` pour la zone d'appui. Aucun chevauchement avec le bandeau ni avec le relevé `?debug=fps`.
- **Ticket 5, `D-13`** : les buffs entrent au bandeau, entre la soif et le niveau. Icônes par assemblage de primitives dans `visuels.json`, une par **effet**. Source : les effets actifs de `src/status.js`, **lus, jamais recalculés** par le HUD. Débordement (plus d'icônes que de place) : par défaut `[OUVERT]`, les plus récentes d'abord, le reste masqué sans indicateur.

Ne pas toucher à l'état d'UI (`Q-11`) ni à la barre du bas (`E-01`). **Validation due** : `docs/CHECKLIST_visuelle.md`, états du HUD, PC et tactile.

---

## Ticket 6 — `D-25` : plein écran au tactile

**Constat (A04, 19/09).** La barre d'adresse reste affichée ; le jeu n'occupe que 1440×810 sur 2340×1080 (échelle 3). En vrai plein écran il passerait à l'échelle 4.

- Au **premier appui tactile** (un geste du joueur est exigé par le navigateur), demander le plein écran sur l'élément racine du jeu, puis tenter le verrouillage en paysage. **Échec silencieux** dans les deux cas : le jeu continue exactement comme aujourd'hui.
- **Tactile seulement** : ne rien déclencher au clavier, à la souris ni à la manette (sur PC, F11 reste le geste du joueur).
- Sortie du plein écran par le joueur : ne pas le redemander en boucle — une nouvelle demande seulement au prochain lancement.
- Le redimensionnement qui suit passe par le chemin existant (résolution logique/physique) ; vérifier par test qu'aucun calque ne garde l'ancienne taille.

**Périmètre de lecture.** `src/input/touch.js` · l'endroit de `src/main.js` où le redimensionnement est traité · `src/render.js`, fonctions pures de résolution. **Validation due** : Xav, sur le téléphone, par le Wi-Fi local.

---

## 2. Rapport du matin

C'est le fichier de bord du §0 bis, complété en fin de file par : les identifiants attribués cette nuit · l'état de la connexion Chrome et la liste des preuves · si des sous-agents ont été utilisés, et ce que ça a donné.

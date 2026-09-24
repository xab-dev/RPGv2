---
projet: RPG V2
episode/session: La torche — arme de feu, lumière de nuit, balise plantée
type: spec par paliers
version: 1.0.0
statut: livrée palier par palier (file de micro-tickets, 24/09)
catégorie: Spec
date: 2026-09-24
Ids_suivi: [D-194 à D-198 (un par palier), V-138 à V-142, Q-149 et suivantes]
genere_par: claude
verifie_par: xav
---

# RPG V2 — 15 : La torche

**Méthode.** Branche `torche-2026-09-24`, **file de micro-tickets** : un commit par palier, dans l'ordre, chacun retirable seul, une ligne de journal par commit. Aucun `push`. Place dans la file : **avant la spec 13**, décision de Xav (« tout maintenant », 24/09).

## 1. Intention (Xav, 24/09)

La ROADMAP le disait déjà (« le héros n'a aucune lumière **sans torche** ») sans jamais la décrire. La torche est trois choses à la fois :

1. **Une arme** : elle s'équipe comme l'épée, fait **les mêmes dégâts qu'elle**, de type **feu**, et **inflige la brûlure**.
2. **Une lumière de nuit**, tenue en main, **plus faible que celle du follet**. Le follet reste la lumière du héros (`specs/02` ; `D-35`, « lumière parfaite », ne bouge pas) : la torche s'y ajoute, elle ne la remplace pas.
3. **Une balise** : on la **plante au sol**, et cette action **remplace « Jeter »**, pour cet objet seulement. Plantée, elle éclaire et **les monstres n'entrent pas dans sa lumière**. C'est aussi ce qui protégera les plantations, quand elles existeront.

Elle **brûle une nuit** : elle ne se consume **que la nuit et à l'aube** (les phases où la plume brille, `D-191`), tenue ou plantée, et s'éteint au bout d'une durée de temps actif. Plantée, elle **se reprend** avec le temps qui lui reste.

## 2. Décisions de Xav (24/09, ne pas rouvrir)

| Sujet | Décision |
|---|---|
| Forme | Tenue en main **et** plantée |
| Lumière | Moins que le follet |
| Arme | S'équipe comme une arme ; dégâts de feu égaux à ceux de l'épée ; inflige la brûlure |
| Planter | Remplace « Jeter », uniquement pour cet objet |
| Protection | Les monstres **n'entrent pas** dans la lumière d'une torche plantée (et n'y apparaissent pas) |
| Durée | Brûle une nuit ; ne se consume que **la nuit et à l'aube** |
| Reprise | Une torche plantée se reprend, **avec son temps restant** |
| Recette | **1 branche + 2 herbes + 1 corde + 5 éclats**, à l'Atelier, visible au **Nv.10** |
| Ordre | Tout maintenant, avant la spec 13 |

## 3. Choix par défaut de Claude (`[OUVERT]`, à confirmer)

| Sujet | Défaut retenu | Pourquoi |
|---|---|---|
| Durée d'une torche | **330 000 ms** de temps actif = une nuit (240 s) + une aube (90 s) | « Brûle une nuit » ; le cycle de `daynight.js` |
| Rayon de la lumière | **56 px** (follet : 90) | « Moins que le follet » ; un peu plus d'une tuile et demie |
| Brûlure au coup | 1 PV toutes les 500 ms, pendant **3 s**, rafraîchie à chaque coup (pas de cumul) | La brûlure du Feu (`dot_brulure`), mais limitée dans le temps au lieu d'être liée à l'aura |
| Pile | **Une torche par emplacement** (`pile_max: 1`) | Règle de `D-118` : une arme ne s'empile jamais (tenue par `test_d118`). *Révisé en cours de palier A : le premier défaut, « elle s'empile », la contredisait.* |
| Torche entamée | Une torche entamée **garde son temps** tant qu'elle reste dans la **poche** ; rangée au coffre, la pile y redevient neuve | Le coffre ne connaît que des nombres ; un temps par torche au coffre serait un format de sauvegarde de plus pour un cas marginal |
| XP de la recette | 10 | Entre la corde et l'épée |
| Tenue de jour | Éteinte, elle reste une arme de feu (dégâts et brûlure) | La flamme n'est pas ce qui brûle : c'est l'arme. Seule la **lumière** et la **combustion** attendent la nuit |

## 4. Architecture

- **Données seules pour l'objet** : `items.json` (`item_torche`, `categorie: "arme"`, `arme: "weapon_torche"`), `weapons.json` (`weapon_torche`), `recipes.json` (`rec_torche`), `status_effects.json` (`dot_brulure_torche`, durée en ms).
- **Deux champs nouveaux, génériques** — une seconde torche (lanterne, brasero…) s'ajoute sans code :
  - sur une **arme** : `element` (référence à `elements.json`) et `au_coup: { statut }`, un statut **limité dans le temps** posé sur le monstre touché ;
  - sur un **objet** : `combustion: { duree_ms, phases, lumiere: { rayon, couleur } }` (ce qui brûle, quand, et ce que ça éclaire) et `plantable: { visuel }` (l'action « Planter » remplace « Jeter »).
- **Modules purs** : `combustion.js` (la file des torches entamées, ce qui brûle cette frame, ce qui s'éteint), `status.js` (statut au coup sur un monstre : poser, rafraîchir, faire tiquer).
- **Sauvegarde v9** (palier B, une seule migration pour la spec) : `inventaire.combustion` (`{ [item]: [restant_ms, …] }`, les torches **entamées** de la poche) et `monde.objets_plantes` (`{ [scene]: [{ item, x, y, restant_ms }] }`). Absent → vide. *La spec 14 prévoyait aussi une v9 : elle prendra la v10.*
- **Protection** : le comportement des monstres reçoit déjà `estEnZoneSure(x, y)` (`specs/07`, palier C) ; une torche plantée allumée **s'y ajoute**, et le tirage d'apparition l'évite. Aucun second mécanisme.

## 5. Paliers

| Palier | Ticket | Contenu | Validation (Xav) |
|---|---|---|---|
| **A** | `D-194` | L'objet et l'arme : recette, visuels (objet, icône), `weapon_torche` (épée + feu), brûlure au coup (statut limité dans le temps, tick et flash) | `V-138` : fabriquer au Nv.10, équiper, frapper : le monstre brûle 3 s |
| **B** | `D-195` | La combustion tenue : sauvegarde v9 et migration, la torche équipée brûle la nuit et à l'aube, éclaire autour du héros (rayon 56), s'éteint au bout d'une nuit et passe à la suivante ; icône allumée au HUD | `V-139` : une nuit entière, la torche en main |
| **C** | `D-196` | Planter et reprendre : « Planter » à la place de « Jeter », la torche plantée éclaire et brûle, s'éteint et disparaît au bout du temps, INTERACT la reprend avec son temps | `V-140` : planter, attendre, reprendre |
| **D** | `D-197` | La protection : les monstres n'entrent pas dans la lumière d'une torche plantée allumée, et n'y naissent pas | `V-141` : un camp balisé, la nuit, dans une zone de Chaos |
| **E** | `D-198` | L'habillage : la flamme vivante (Bas fixe, Moyen vacille, Haut + braises, même levier `ornements` que `D-191`/`D-193`) | `V-142` |

## 6. Hors périmètre

- Allumer une torche à partir d'une autre, ou un feu de camp : non demandé.
- La torche dessinée **dans la main** du héros : le héros ne montre aucune arme aujourd'hui (l'épée non plus). → `Q-149`.
- Un effet du feu sur le décor (brûler l'herbe) : non demandé.

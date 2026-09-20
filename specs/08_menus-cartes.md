---
projet: RPG V2
episode/session: Polish — menus en grille de cartes
type: spec par paliers
version: 1.0.0
statut: brouillon
catégorie: Spec
date: 2026-09-20
Ids_suivi: [Q-36, D-42, D-30, "D-43 (à créer : chantier menus)", "V-27 et suivantes (à créer)"]
genere_par: claude
verifie_par: xav
---

# RPG V2 — 08 : Menus en grille de cartes

**Méthode.** Branche dédiée `menus-cartes`. **Un palier par session**, chaque palier est une file de micro-commits retirables seuls, validation de Xav en jeu entre deux paliers. Aucun `push` (`push` sur `main` = publication). Le suivi fait foi : un identifiant « à créer » déjà pris → prendre le suivant et le dire.
Périmètre de lecture : `src/ui/menu.js`, `index.html` et sa feuille de style, `src/main.js` (câblage du menu seulement), `src/flags.js`, `data/` (catalogues cités), `locales/`, `docs/CARTE_cycle-de-vie-ui_2026-09-17.md` (palier B), le journal `JOURNAL_2026-09-20_menu-tactile.md`. Rien d'autre.

## 1. Intention

Remplacer la liste verticale du menu Pause par un **empilement d'écrans de cartes**. Quatre grandes cartes tiennent toujours dans le plus petit écran visé (paysage, ~700 × 280 px de page), se parcourent en un coup de stick et offrent de vraies cibles au pouce. Le défaut `D-42` (menu qui enferme le joueur) disparaît **par construction**, plus par correctif. Références de style : menus de haTD (`docs/DOC_captures-v1.md`) — sobres, « un bouton = une action », grilles.

## 2. Décisions de Xav (2026-09-20)

| # | Décision |
|---|---|
| 1 | Grille **2 × 2** par écran. « Retour » / « Fermer » **quittent la grille** pour l'en-tête figé (celui de `D-42`). À essayer en jeu : un simple `[X]` / `[←]` sans texte. |
| 2 | La 4ᵉ case du menu principal est la **carte contextuelle** : elle porte l'action du lieu. « Plus que validé : indispensable. » Usages qu'il y voit déjà : Construction, puis jardinage, indices / énigmes. |
| 3 | **Noms génériques partout** : aucun nom propre, aucune marque, ni en code, ni en données, ni à l'écran. Retenu : « Héros ». Tout libellé vit dans `locales/` — renommer = une ligne par langue. |
| 4 | Écran de référence à juger à l'œil = **menu principal + écran Sauvegarde**. Suite logique ensuite : les grosses pages (inventaire, coffre…). |
| — | Accent des menus = couleur du follet choisi (validé). Danger en magenta (**vu, non contesté**). Focus léger (à confirmer en jeu). Icônes **en primitives** (`visuels.json`), jamais d'emoji. |

## 3. Arborescence de départ

```
Menu (racine)                       en-tête : [X]
├─ Héros            dossier   →  Poches (écran existant) · Stats (écran existant)
│                                 · Feu follet : ABSENT tant que sa page n'existe pas
├─ Paramètres       dossier   →  Langue (bascule) · Musique (bascule)
│                                 · Plein écran (bascule, absente sans API) · Sauvegarde (dossier)
│                                     └─ Exporter (action) · Importer (action)
│                                        · Réinitialiser (action, danger → confirmation)
├─ (libre)          —            réservé, rien n'est dessiné
└─ case contextuelle             Construction dans la Maison ; vide ailleurs
```

Confirmation de reset = un écran de **deux cartes** : « Non, revenir » (focus par défaut) et « Oui, réinitialiser » (magenta). Le couple reste ensemble (tranche le `[OUVERT]` du journal `D-42`).

## 4. Règles

### 4.1 Trois types de cartes

| Type | Effet | Ce qu'elle affiche |
|---|---|---|
| **dossier** | Empile un écran — du catalogue, ou un écran existant enregistré (Poches, Stats, Construction) | icône · titre · une phrase |
| **bascule** | Change un état **sur place**, l'écran reste ouvert | icône · titre · **l'état réel**, relu à la source (patron de l'entrée Plein écran : jamais un booléen tenu par le menu) |
| **action** | Agit, puis ferme. `danger: true` → magenta **et** écran de confirmation | icône · titre · une phrase qui dit ce qui va se passer |

Un refus (plein écran demandé à la manette) laisse la carte inchangée et s'annonce dans l'en-tête — comportement livré par `D-30`, à conserver tel quel.

### 4.2 La grille

- 1 à 4 cartes → **2 × 2**. 5 ou 6 → **3 × 2**. Plus de 6 → **le jeu refuse de démarrer** : on crée un dossier.
- **Jamais de défilement** sur un écran de cartes. Le corps défilant de `.ecran-ui` reste en place comme filet, il ne doit jamais servir.
- **Positions stables** : une carte absente (condition fausse, API absente) laisse **sa case vide**, les autres ne glissent pas. La mémoire du pouce prime.
- Case contextuelle : liste ordonnée de candidates, la première dont la condition est vraie s'affiche ; aucune → rien n'est dessiné `[OUVERT]`.

### 4.3 Navigation

- Déplacement **en deux dimensions** (haut/bas/gauche/droite), fonction pure `voisin(index, direction, colonnes, total)`. Pas de bouclage d'un bord à l'autre (*provisoire*). Une case vide se saute.
- Retour (B, Échap, `[←]`) = dépile **un** écran, et rend le focus à la carte qui l'avait ouvert. Tactile : un appui active directement. Souris : le survol pose le focus.
- À l'ouverture d'un écran : focus sur la première carte présente.

### 4.4 Mise en page

La boîte du menu se cale sur **le rectangle du canvas**, et tout s'y dimensionne en proportion : une unité `--u` = hauteur de la boîte ÷ 270. Même rendu sur téléphone et sur PC, comme si le menu était dessiné en 480 × 270. Budget indicatif : en-tête 24 u · marges 12 u · deux rangées de ~105 u. Cible tactile de l'en-tête ≥ 40 px de page (*provisoire*).

### 4.5 Jetons de style (valeurs de départ, toutes *provisoires* — Xav répond « plus », « moins » ou « bon »)

Un seul bloc de variables CSS, commenté *pourquoi*.

| Jeton | Départ |
|---|---|
| Fond d'écran | noir bleuté `#0d1017`, opaque à 92 % (le jeu se devine derrière) |
| Carte | un ton au-dessus `#161b24` · bordure 1 px blanc à 10 % · rayon 8 u · **sans ombre** |
| Texte | titre blanc cassé, gras · phrase grise `#9aa3b2` |
| **Focus** | bordure 1,5 px à l'accent · halo `0 0 0 3u` accent à 18 % · carte éclaircie de 4 % |
| Appuyé | carte assombrie de 4 %, sans animation |
| Désactivé | texte à 40 %, aucune bordure d'accent possible |
| **Accent** | lu sur le compagnon choisi (champ `couleur_ui` à déclarer dans son catalogue). **Avant le choix** : blanc chaud `#f2e9d8` |
| **Danger** | magenta `#d6409f` — bordure et icône, jamais un aplat. Toujours doublé d'une icône |

Vérifié **au démarrage** : chaque `couleur_ui` se lit sur le fond des cartes (contraste ≥ 3:1) et n'est jamais le magenta du danger. Ajouter un 4ᵉ follet = une entrée, tous les menus se recolorent seuls.

## 5. Données et architecture

- **`data/menus.json`** : les écrans et leurs cartes (`id`, `type`, `cle_titre`, `cle_phrase`, `icone`, `cible` ou `action`, `condition?`, `danger?`, `case`). **Test du catalogue** : ajouter la page du follet, le jardinage ou un écran d'indices = ajouter une entrée, sans toucher au code du menu.
- **Conditions** : le format générique déjà en place dans `flags.js` (niveau, drapeau, lieu). Aucun nouveau format.
- **Actions et lectures d'état injectées** par identifiant (patron musique / poche / plein écran) : `ui/menu.js` ne connaît ni l'audio, ni la sauvegarde, ni l'API plein écran.
- **Contrôles au démarrage** : ≤ 6 cartes par écran · toute `cible` existe · toute `action` du catalogue a sa fonction enregistrée, et inversement · toute clé de texte existe en FR **et** EN · tout écran est atteignable depuis la racine.
- Aucune donnée nouvelle dans la sauvegarde : **pas de migration**.

## 6. Paliers

### Palier A — L'écran de référence (tranche verticale)

Commits, dans l'ordre : **A1** jetons de style + `couleur_ui` des compagnons + contrôle de contraste · **A2** `menus.json`, son schéma, les contrôles au démarrage · **A3** le composant grille (trois types, navigation 2D, cases stables) · **A4** branchement : le nouveau menu **remplace** la liste du menu Pause ; Poches, Stats et Construction s'ouvrent depuis leurs cartes, **inchangés**.
La navigation entre écrans de cartes peut utiliser une pile locale minimale ; les sept contrats existants ne bougent pas encore.
**Validation de Xav (`V-27` à créer)** : menu principal et Sauvegarde, à la manette, à la souris et au doigt, à 1920 × 1080 et sur téléphone. Accent des trois follets et accent neutre avant le choix. Focus : plus, moins ou bon. `[X]` seul, ou avec son mot.

### Palier B — Une seule pile

Remplacer les sept sous-contrats de `menu.estOuvert()` (`CARTE_cycle-de-vie-ui` §1.2) par **une pile de navigation** : ouvrir = empiler, retour = dépiler, « le menu est ouvert » = « la pile n'est pas vide **et** son sommet est visible ». Craft et Coffre, ouverts par `INTERACT`, passent par la même pile.
**`Q-36` tranchée ici** (retenu par défaut, `[OUVERT]`) : le verbe `MENU`, menu ouvert, **ferme tout** — en appelant **la même fonction** que le `[X]` de la racine. Un seul chemin de fermeture, donc pas la classe de bug de `SD_construction-parite-clic-verbe`.
Test d'invariant sur **toutes** les transitions du tableau §3 de la carte : `menu.estOuvert() === au moins un écran réellement visible`. **Aucun changement visuel attendu** : si Xav voit une différence, c'est un défaut.

### Palier C — Les écrans de liste, un par ticket

Poches, Stats, puis les grosses pages en **maître-détail** (grille d'objets à gauche, fiche à droite) : inventaire, coffre, craft. Cette spec n'en fixe que le cadre — chaque écran aura son ticket, après validation du palier A.

## 7. Tests et preuves

Purs et testés : choix de la grille, `voisin()`, résolution de la case contextuelle, validation du catalogue, restitution du focus au retour. Structure DOM : l'en-tête ne contient jamais une carte, une case vide n'est pas focalisable. **Node ne prouve pas qu'un écran tient** : §0 ter, captures à **703 × 280** et **1920 × 1080** dans `docs/captures/`, et validations de Xav.

## 8. Hors périmètre

Page du feu follet · compétences · équipement · jardinage · indices et énigmes (la case contextuelle les **accueillera**, elle ne les construit pas) · raccourci des Poches à la croix directionnelle · barre du bas · réglage du volume · troisième langue (la bascule Langue deviendra alors un dossier).

---
projet: RPG V2
episode/session: Fondations — patchs 3 et 4
type: micro-ticket par paliers
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [D-20, Q-21]
genere_par: claude
verifie_par: xav
---

# MT — « Mains nues », première arme du jeu

**Traite `D-20` (décision `Q-21`, close). Ne touche à aucune autre ligne du suivi — en particulier pas à `E-01` (barre du bas) ni à `E-02` (spec des armes).** Deux paliers, **un par session, un commit par palier**, validation de Xav entre les deux.

## Intention

Deux retours de playtest qui sont un seul objet :

- la portée de l'auto-attaque de base est trop généreuse → **la moitié de l'actuelle** ; les armes serviront à l'améliorer ;
- la case jaune de la barre du bas doit montrer **une main**, puis plus tard le symbole de l'arme équipée.

Décision déjà verrouillée : *la portée vient de l'arme équipée, jamais d'une stat* (ex. épée en bois `[0;1]`, arc en bois `[2;4]`, en tuiles). Donc « sans arme » **est** une arme : `arme_mains_nues`, avec sa portée et son icône. Aucun cas particulier « pas d'arme » dans le code.

Test du catalogue (contrainte du projet) : ajouter une seconde arme = **une entrée JSON, zéro ligne de système**.

---

## Palier A — données et portée

Commit : `D-20 A mains nues : la portee vient de l'arme`.

### Périmètre de lecture

`src/combat.js` · `src/entities.js` (création du héros) · `src/schemas.js` et `src/registry.js` (pour déclarer un catalogue) · le catalogue de `data/` où vit aujourd'hui la portée, s'il existe · les tests de combat. `src/render.js` : **uniquement** la fonction qui dessine l'anneau d'attaque.

### Étapes

1. **Lecture d'abord, cinq lignes en tête de rapport** : où la portée est déclarée aujourd'hui · sous quelle forme (rayon, intervalle) · s'il existe déjà un catalogue d'armes · d'où l'anneau de feedback tire son rayon · comment le héros connaît son arme.
2. Selon le cas :
   - **Un catalogue d'armes existe** : y poser `arme_mains_nues` (ou adapter l'entrée par défaut), portée maximale ÷ 2, minimum inchangé.
   - **Il n'existe pas** : créer `data/weapons.json`, schéma **minimal** — `id`, clé i18n du nom, `portee` (intervalle `[min;max]` en tuiles, le format de la décision verrouillée), `icone` (id de visuel, optionnel au palier A). Validé au boot comme les autres catalogues. La spec des armes (`E-02`) l'étendra : ne rien anticiper (ni dégâts, ni élément, ni rareté).
3. L'arme par défaut du héros est désignée **en données**, pas par un littéral dans `entities.js`.
4. `combat.js` lit la portée de l'arme équipée. L'anneau de feedback lit **la même valeur** : une seule source, vérifiée par test.
5. Tests, rouge d'abord : la portée effective vient de l'arme ; changer l'arme par défaut en données change la portée sans toucher au code ; une référence d'arme inconnue = échec dur au boot.

### Arrêt obligatoire

**La sauvegarde n'est pas touchée.** Le héros n'a pas encore d'équipement persisté : l'arme par défaut se résout au chargement. Si le changement semble exiger un nouveau champ de sauvegarde ou une migration : **s'arrêter et demander** (coûteux à défaire).

### Valeur provisoire

Portée maximale = actuelle ÷ 2. Donner dans le rapport l'ancienne et la nouvelle valeur, en tuiles et en pixels logiques.

### Validation en jeu (Xav) — dans la Grotte

Partie neuve, à la manette. Le premier monstre doit rester tuable en 2-3 coups (calibrage de la Phase 1) sans que le combat devienne punitif : il faut maintenant **aller au contact**. L'anneau montre bien la nouvelle portée. Verdict : « bon », ou une autre fraction.

---

## Palier B — la main dans la case

Commit : `D-20 B case d'attaque : icone de l'arme equipee`.

### Périmètre de lecture

`src/ui/hud.js` · `src/ui/hud_layout.js` · `src/visuels.js` (lecture seule) · `data/visuels.json` · `data/weapons.json`.

### Changement

- Nouveau visuel `visuel_icone_main`, **par assemblage de primitives** (direction artistique validée : géométrie, superposition, pas de pixel art), lisible à la taille de la case.
- La case d'attaque dessine, via `dessinerVisuel`, l'`icone` de **l'arme équipée**. Le HUD ne connaît pas le mot « main ».
- Par défaut, à marquer `[OUVERT]` : fond de case identique aux autres cases, **icône en jaune** (on garde le repère de couleur sans l'aplat). Arme sans icône = case vide, pas d'erreur.

### Interdits

Ne déplacer aucune case. Ne pas toucher au joystick tactile, ni à l'état d'UI (`Q-11`), ni aux autres cases. Pas de filigrane de touche : c'est `E-01`.

### Validation en jeu (Xav)

Ticket de rendu : validation guidée par `docs/CHECKLIST_visuelle.md` (HUD, état 1). La main se lit d'un coup d'œil sur PC **et** au tactile, où la case voisine le joystick.

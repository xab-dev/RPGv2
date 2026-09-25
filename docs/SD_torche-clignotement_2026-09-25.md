# SD_torche — la torche tenue clignote en marchant (25/09)

Branche `torche-vacillement`, partie de `main` (`f6461a6`), **tenue à part de
`annexe-1`** (décision de Xav, 25/09 : « on fait tout séparé ; quand tout sera
OK, on fusionnera tout »). Cette fiche sert aussi de fichier de bord de la
branche : une ligne par commit, en bas.

**Numérotation.** Les identifiants partent **après ceux d'`annexe-1`**
(`D-217`, `Q-163`, `V-157`), pas après ceux de `main`. Ainsi, les deux
branches n'ont aucun doublon une fois fusionnées.

## Le signalement (Xav)

> Quand la torche est équipée comme une arme et que je marche, la lumière
> flicker à chaque pas, un peu comme la poussière, je pense en termes de
> fréquence. Ça fait très mal aux yeux. En réglage bas, on ne voit pas la
> différence ; on ne le voit qu'en moyen et haut.

## Diagnostic

**Cause racine : la graine de la flamme tenue était tirée de la position du
héros.** La graine décale le rythme d'une flamme de celui des autres, pour que
deux torches voisines ne battent pas ensemble. Le patron venait des plumes
(`D-191`), dont le commentaire disait bien « une plume ne change pas de rythme
d'une frame à l'autre ». C'est vrai pour un objet immobile, et faux pour un
objet qu'on porte.

Deux effets étaient touchés, avec deux calculs de graine différents, parce que
la liste des flammes était construite deux fois dans `main.js#dessiner()` :

1. **Le vacillement de la lumière (Moyen et Haut).** Le code faisait
   `decalage = (x·0,37 + y·0,61) × 97 ms`, ajouté à l'horloge. En marchant, le
   décalage avançait de 36 à 60 ms de phase par pixel. À 90 px/s environ, avec
   une période de 700 ms et un second souffle ×1,618 :

   | | souffle A | souffle B |
   |---|---|---|
   | à l'arrêt | 1,4 Hz | 2,3 Hz |
   | vers la gauche | 3,2 Hz | 5,2 Hz |
   | vers la droite | 6,0 Hz | 9,8 Hz |
   | vers le haut | 6,2 Hz | 10 Hz |
   | **vers le bas** | **9,0 Hz** | **14,6 Hz** |

   La zone la plus pénible pour l'œil se situe vers 15-20 Hz.
2. **Les braises (Haut seul).** Leur graine valait `(x·0,53 + y·0,29) mod 1`,
   soit un demi-cycle par pixel. À 1,5 px par image, chaque braise sautait à un
   âge presque quelconque à chaque image : du bruit, à la fréquence d'affichage.

**Ce qui confirme la cause.** En Bas, le vacillement vaut 1 et les braises sont
coupées : rien ne se voit. Les torches **plantées** ne bougent pas, donc leur
graine reste fixe : elles respiraient normalement.

## Correction (`D-218`)

- **Une flamme a une graine fixe, jamais sa position du moment.** La flamme
  tenue a une graine constante (`GRAINE_FLAMME_TENUE`). Une flamme plantée
  prend la sienne de sa position, puisqu'elle ne bouge plus
  (`combustion.js#grainePosition`, ramenée dans [0, 1[).
- **Une seule liste des flammes par image** (`combustion.js#flammesAffichees`,
  pure), lue par la lumière et par les braises, avec la même graine.
- **Le vacillement sort de `main.js`** : `ornements.js#facteurVacillement(effet,
  tMs, graine)`, la graine exprimée en fraction de période.
- Données inchangées : 700 ms, 8 %, et le second souffle ×1,618.
- Test : `tests/test_sd_torche_flamme_graine_2026-09-25.js`. Le héros marche
  deux secondes dans cinq directions, et le vacillement comme les braises
  doivent être, image par image, ceux d'un héros immobile.

À voir en jeu : `V-158`.

## Fichier de bord de la branche

| Commit | Ticket | Ce qu'il fait |
|---|---|---|
| 1 | `D-218` | La graine fixe, une liste des flammes, le vacillement dans `ornements.js`, le test, cette fiche |

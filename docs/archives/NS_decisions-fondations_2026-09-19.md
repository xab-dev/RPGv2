---
projet: RPG V2
episode/session: Fondations — consignation (doc seule)
type: notes de session
version: 1.0.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
ids_suivi: [Q-07, Q-19, Q-20, Q-21, D-01, D-03, D-05, D-14, D-20, D-21, D-22, D-23, D-24, A-04, A-05, E-01, E-03, R-04]
genere_par: claude
verifie_par: xav
---

# RPG V2 — NS : « les fondations d'abord » (2026-09-19, 17 h 18 — aucun code)

Session de documentation, même patron que `NS_decisions-revue-dettes_2026-09-19.md`. Ménage de journal, puis mise à jour de `CLAUDE.md` et de `specs/00_ROADMAP.md` (→ **1.6.0**). **Aucun fichier de `src/`, `data/`, `tests/` n'est touché.**

`docs/DOC_suivi-dettes.md` **v1.7.0 est fourni par Xav avec cette NS** : il remplace le fichier en place, tel quel. Claude Code ne le réécrit pas ; il vérifie seulement que les identifiants cités ici y existent.

## 1. Décision de méthode (Xav)

**On ne rajoute pas de contenu sur des bases non confirmées.** Avant `07_chaos-nocturne` et avant de reprendre `Q-07` : la performance et les retours du playtest du 19/09. `Q-07` passe à **gelé**. On repart de la base et on remonte, un ticket par session, validation en jeu entre deux.

Le critère qui dira « les fondations sont closes » n'est pas encore tranché : `Q-20` (proposition : PC sans aucune frame sautée, appareil plancher à 30 fps stables ; appareil candidat : le Galaxy A04 de Xav). Il attend le relevé `A-04`.

## 2. Faits établis (relevé `R-04`)

- **L'émulation F12 mesure le PC, pas un téléphone.** La vue adaptative émule la taille d'écran et le DPR ; le bridage « Regular 3G » ne touche que le réseau. `R-04` ne dit rien d'un vrai appareil → `A-04`.
- **Le coût de rendu suit le nombre de pixels.** De `R-02` à `R-04`, même contenu, l'échelle de rendu passe de 4 à 5 (×1,56 de pixels par calque) : `dessiner()` 12,0 → 20,1 ms (×1,67), recalcul du calque 5,8 → 9,5 ms (×1,63), `maj()` inchangé à 0,1 ms.
- **Le fenêtrage existe déjà et il est sain.** Le calque statique couvre 576×352 px logiques pour un écran de 480×270 (marge de 1,5 tuile), les entités hors champ ne sont pas dessinées. Ce qui coûte est ce qui est **à l'écran**.
- **Hypothèse, pas un fait** (`D-03`) : les deltas par frame sont calés sur le vsync (p95 = max = 33,38 ms) ; la moyenne serait fiable, les valeurs par frame non.

## 3. Décisions

| Id | Décision | Statut |
|---|---|---|
| `Q-21` | **« Mains nues » est la première arme du jeu.** Portée de base = actuelle / 2 (provisoire), icône = une main. Applique la décision verrouillée « la portée vient de l'arme, jamais d'une stat » | **clos** (Xav, 19/09) → `D-20` |
| `D-23` | Prototype debug `?echelle=N` : **accordé**, mesure seule | ouvert |
| `Q-19` | Plafonner l'échelle de rendu : **non tranché**. *Réviserait* « rendu net à résolution physique » (15/09). Xav juge sur relevés **et** à l'œil (`A-05`) | gelé |
| `D-01` | Piste préférée : **défilement incrémental** du calque (raisonnement de Xav : « on le calcule au fur et à mesure »), après `Q-19` | ouvert |

## 4. Où vont les cinq retours du playtest

| Retour de Xav | Où il vit dans l'architecture | Ligne | Ticket |
|---|---|---|---|
| Portée d'auto-attaque de base ÷ 2 | Donnée de l'arme « mains nues » ; `combat.js` lit l'arme équipée | `D-20` A | `MT_mains-nues` |
| Case jaune → symbole de main | Icône de l'arme équipée (`visuels.json`), dessinée par le HUD | `D-20` B | `MT_mains-nues` |
| Rayon d'effacement du toit −10 % | Une valeur (`structures.js`) | `D-21` | `MT_toit-rayon` |
| « +1 bois » à la récolte | Texte flottant générique (module pur + `effets.json`), absorbe l'ancien `D-05` | `D-05` | `MT_texte-flottant` |
| Clavier : E = interagir, F = consommer | Couche d'input seule | `D-22` | `MT_clavier-e-f` |
| *(à prévoir)* filigrane de la touche dans les cases | Spec `E-01` ; source unique `glyphes.json` + périphérique actif | `E-01` | — |

Captures de la V1 : inspiration, jamais cahier des charges. Aucun ticket ne les lit tant que `E-03` (une ligne d'intention par capture) n'est pas rempli.

## 5. Ordre d'injection (remplace le §7 de `NS_decisions-revue-dettes_2026-09-19.md`)

Les légers et sûrs d'abord, un ticket par session, un commit par ticket :

1. Cette NS (doc seule).
2. `D-22` — clavier E/F.
3. `D-21` — toit.
4. `D-20` palier A — mains nues, portée. **Validation dans la Grotte.**
5. `D-20` palier B — icône de la case.
6. `D-05` — texte flottant.
7. `D-23` — `?echelle=N` → Xav : relevés `A-05`.
8. `D-02` + `D-03` — ventilation de `dessiner()` par calque et explication du delta (même instrument, mesure seule).
9. Xav tranche `Q-19` et `Q-20` → ticket de correction d'échelle, à écrire d'après les chiffres.
10. `D-01` — défilement incrémental du calque.
11. `D-17`, `D-13`, puis `07` palier par palier ; `Q-07` reprend ici.

`A-04` (relevé sur le téléphone réel) est une action de Xav, faisable dès maintenant, en parallèle.

## 6. Procédure — le téléphone sur le serveur local (`A-04`)

1. PC, dossier du jeu : `node serveur_local.js`. Alerte pare-feu Windows pour Node → autoriser les **réseaux privés**.
2. Second terminal : `ipconfig` → noter l'« Adresse IPv4 » de la carte Wi-Fi (`192.168.x.x`).
3. `netstat -an | findstr 8080`. `0.0.0.0:8080` → bon. `127.0.0.1:8080` → le serveur n'écoute que le PC : ouvrir `D-24`, s'arrêter là.
4. Téléphone, même Wi-Fi, Chrome : `http://192.168.x.x:8080/?debug=fps`.
5. Protocole habituel (partie neuve → sortie de Grotte → traversée en ligne droite). **Capture d'écran** du relevé avant de s'arrêter.

Si 4 échoue alors que 3 est bon : Wi-Fi du PC classé « Public » → Paramètres → Réseau → Wi-Fi → propriétés → **Privé**.

## 7. Ce que la session doc répercute

- `CLAUDE.md`, « Critère de passage courant » : remplacer l'ordre d'injection par le §5 ; ajouter la phrase du §1 (« pas de contenu sur des bases non confirmées », `Q-07` gelée) ; dans « État actuel du dépôt », remplacer « deux relevés » par trois (`R-04`, avec sa réserve : émulation).
- `CLAUDE.md`, décisions verrouillées : une ligne datée pour `Q-21`. **Ne pas** modifier la ligne « rendu net à résolution physique » : `Q-19` n'est pas tranchée.
- `specs/00_ROADMAP.md` → 1.6.0 : changelog + ordre du §5.
- Carte mentale : **non touchée** (`Q-21` applique une décision déjà verrouillée ; report à sa prochaine révision).
- `docs/archives/INDEX.md` : ménage de journal habituel.

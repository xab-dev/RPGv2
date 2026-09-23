---
projet: RPG V2
episode/session: Doc-1 — alignement, dialogues à conséquences, carte mentale v1.7.0
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : Doc-1 (23/09)

Demande de Xav : « Lis `docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md`
en entier, puis procède. » La NS (v1.1.0, relue par Xav) fixe l'ordre des
sessions (§4) : celle-ci est **Doc-1**, documentation pure, **aucun code**.
Périmètre tenu : `docs/carte_mentale_*`, `specs/00_ROADMAP.md`, `CLAUDE.md`,
`docs/DOC_suivi-dettes.md` — plus `README.md` (le lien vers la carte mentale,
seule ligne touchée) et le ménage (`docs/archives/`).

Branche `doc-alignement-2026-09-23`, partie de `main`. Pas de push.

## Commits, dans l'ordre

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| (1) | Ménage | Journal du diagnostic polish archivé, ligne INDEX écrite. Toutes les lignes que la session a ouvertes ou livrées (`D-154` à `D-167`, `V-89` à `V-100`, `Q-77`) étaient déjà au suivi |
| (2) | Doc-1 | Les amendements du §3 de la NS, les 16 décisions du §1 et les 7 du §2 |

## Ce qui a été fait

- **Carte mentale** renommée `v1_6_0` → `v1_7_0` (`git mv`, l'historique suit),
  en-tête et changelog, puis **édition par ancre de section** : §1 mindmap,
  §2 les deux boucles (5 min chiffrée ✅, 1 h en annexes), §3 progression
  redessinée (Grotte → Maison → Annexe 1 → Annexe 2 → nouvelle zone ; Château et
  Boss 1 hors du diagramme), §3bis (aucune nouvelle carte ; la ligne Boss 1 ne
  débloque plus le respec), D1⑥ D1⑧ D2 D2⑤ D6③ D11⑤ D11⑦ D12 D13 D14⑥ D16 ;
  P1, P3, C5⑥⑦ ; quatre risques de §0bis clos ou reformulés, un aggravé (volume
  de texte). **Journal des décisions (§8)** : quatorze entrées datées du 23/09
  et la **table des régimes de synergie**, avec ses deux notes d'architecture.
- **ROADMAP** 1.8.0 → 1.9.0 : l'alignement passe de M2+ à M1 ; « avant toute
  nouvelle carte » complété par les annexes.
- **CLAUDE.md** : lien de la carte mentale ; « alignement = M2+ » corrigé dans les
  décisions verrouillées ; **neuf lignes** datées dans la table (les seize
  décisions du §1 regroupées par sujet, chacune citant son numéro dans la NS) ;
  « Critère de passage » : l'ordre des sessions de la NS §4.
- **Suivi** 1.37.0 → 1.38.0 : voir « Registre » ci-dessous.

## Registre

- **Consigné, pas décidé** : `Q-69` (décision 11 de Xav) descend en §8 ; `Q-78`
  à `Q-84` naissent closes — ce sont les points A à G du §2, **tranchés par Xav
  le 23/09** (la NS disait « à numéroter après `Q-76` », mais `Q-77` était prise
  entre-temps). Chaque ligne dit qu'elle est consignée par Claude.
- `Q-62` (close) gagne le chiffre de Xav et le constat : **le bot contredit un
  joueur** → ouverte **`D-168`** (le trajet du bot de `R-19`, P3).
- `D-53` : rattachée à la session « Instrument » (NS §4). `E-02` : note sur les
  annexes et les specs 10/11.
- **Rangement** : `Q-74` à `Q-77`, **ouvertes**, étaient rangées dans le §8
  « Clos » — remontées en §2 sous `Q-71`, sans rien changer à leur contenu.

## Ce qu'il faut en retenir

- La NS disait « `|A| < 1` » dans un tableau : une barre verticale casse une
  cellule Markdown, même dans un `code`. Écrit `abs(A) < 1` partout où c'est
  tombé dans un tableau.
- `CLAUDE.md` passe de 310 à 319 lignes (plafond indicatif 300) : les neuf
  lignes de décisions sont le coût. À archiver avec la table au prochain
  ménage qui en a besoin, comme `DOC-07`.

## Ouvert pour Xav

- Relire les lignes `Q-78` à `Q-84` et `Q-69` : elles recopient tes décisions,
  à corriger si la formulation trahit quelque chose.
- `D-168` (le trajet du bot) : ouverte, pas planifiée.
- Suite (NS §4) : session **Instrument**, puis Spec 10, puis Spec 11.

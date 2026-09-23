# Journal — 2026-09-23 — le prologue (`specs/12_prologue.md`)

File de micro-tickets sur la branche `prologue`, un commit par ticket, chaque commit retirable seul.
Demande de Xav : un collègue vétéran a joué 15 minutes sans ennui, mais sans comprendre pourquoi
c'est un RPG (pas de quête, pas de rôle) ni quel est le but. Le design reste (D13①) ; on le **dit
avant**, en quelques écrans au rythme des avertissements de jeu vidéo, **avant** le symbole, qui ne
se touche pas.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| Ménage | `61dd22d` | Journal du symbole archivé, ligne ajoutée à l'INDEX |
| P1 — la spec | `efe342a` | `specs/12_prologue.md` (quatre écrans, règles, textes proposés FR/EN) ; `Q-118` (pas de « tout passer »), `Q-119` (les textes, à réécrire par Xav), `V-121` |
| P2 — le moteur | `e48954f` | `src/prologue.js` (pur : entrée en fondu, attente de l'appui armé, sortie en fondu, écran suivant) ; catalogue `data/prologue.json` (ordre du fichier, `titre`, `lignes`, `fondu_ms`, `armement_ms` — PROVISOIRES) validé au boot ; clés `prologue.*` dans les deux locales ; `tests/test_p2_prologue` |
| P3 — le branchement | (ce commit) | `main.js` : `prologue` précède le symbole (partie neuve seulement), avance par ATTACK, INTERACT ou un toucher, gameplay gelé et MENU muet ; sa fin appelle `demarrerOuverture` (symbole, ou intro sans calques) ; rejoué par `reinitialiserPartie` ; `jouerPrologue: true` passé par `demarrerJeu` seul (défaut `false` : les tests du cold-open restent tels quels). `ui/ecran_prologue.js` : titre or, paragraphes centrés sur une colonne de 360 px logiques, ▼ de la bulle. `tests/test_p3_prologue_ouverture`. Pixels vérifiés sous Chrome sans fenêtre, trois profils (`tools/scenarios/prologue.mjs`) : le texte tient à 703 × 280, le symbole suit |

**Prouvé par les tests** : l'ordre prologue → symbole → intro, l'armement, les trois gestes, le gel du
gameplay, le reset, le catalogue et ses clés FR/EN. **Pas encore validé par Xav** : le ressenti (fondus,
délai du ▼, taille du texte), les textes eux-mêmes (`Q-119`), le toucher sur téléphone (`V-121`).

**Au prochain ménage** : archiver ce journal ; rien à reporter dans les décisions sauf si Xav tranche `Q-118` ou `Q-119`.

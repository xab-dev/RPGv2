---
projet: RPG V2
episode/session: Polish libre (24/09)
type: fichier de bord
version: 1.0.0
statut: livré, à valider
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : polish libre (24/09)

Demande de Xav : « Polish libre (on ne touche pas aux fonctionnalités,
uniquement du graphisme, 3 étapes : diagnostic, plan d'action, itération.
plusieurs commits). go ». Branche `polish-libre-2026-09-24`, pas de push.

## 1. Diagnostic

Captures sous Chrome sans fenêtre, profil jetable : `polish_diagnostic.mjs`
(suffixe `d24`), `ecrans_palier_c.mjs` et `dialogue_choix.mjs` (dossier
`polish-libre-2026-09-24/avant/`), et un scénario neuf,
`tools/scenarios/polish_libre_24.mjs` (bulle, menu, jour, nuit ; grand écran
et téléphone à DPR 3).

Hors d'atteinte, et laissés tels quels : le sol, le HUD dans sa forme, les
icônes (`V-53`, `V-55` validées), la lumière du follet (`D-35`), le bleu des
menus (`Q-112`, à Xav).

**Ce qui dénote : la typographie.** Le jeu parle avec quatre voix qui ne se
connaissent pas :

| Surface | Police aujourd'hui | Effet |
|---|---|---|
| Prologue | Almendra (texte), Uncial Antiqua (titres) — embarquées | La seule surface « fantasy » |
| Bulle du follet (texte, options, nom) | `13px sans-serif` (Arial sous Windows) | La voix du follet ressemble à une boîte de dialogue de logiciel ; rupture nette avec le prologue qui la précède |
| Menus DOM (titres, cartes, fiches) | police par défaut du navigateur | Aspect « application » |
| HUD (PV, éclats, Nv.) | `monospace` | Aspect « console de debug » |

Les deux polices du prologue sont déjà chargées pour tout le jeu
(`polices.js`, `document.fonts`) : les utiliser ailleurs ne coûte ni fichier
ni octet.

Laissé sciemment en `monospace` : les indices de commande (leur largeur est
calculée et tenue par test, `D-17`, `D-171`) et la gravure de la stèle (les
hiéroglyphes de Claude Code sont ceux d'un terminal : c'est voulu).

## 2. Plan d'action

Un commit par étape, capture avant/après à chaque fois, suite de tests verte.

1. **P1 — la bulle** : texte, options et nom en Almendra, la voix du prologue.
2. **P2 — les menus** : titres (écran, carte, fiche) en Uncial Antiqua ;
   phrases en Almendra si elles restent lisibles à 703 × 280, sinon laissées.
3. **P3 — le HUD** : chiffres et niveau, à juger sur capture ; abandonné si
   les chiffres perdent en lisibilité.

## 3. Itération

| Commit | Étape | Ce qu'il faut en retenir |
|---|---|---|
| `fc0af8c` | Ménage | Journal de la surprise archivé |
| `2e012cb` | P1 — la bulle | Texte et options en Almendra 14 px (au lieu de `13px sans-serif`), nom en onciale 13 px. La pagination mesure avec la police dessinée : aucune ligne ne déborde, grand écran et téléphone. Scénario `polish_libre_24.mjs` livré avec. **183 fichiers verts** |
| `443f59b` | P2 — les menus | Deux jetons CSS (`--menu-police-titre`, `--menu-police-texte`) ; titres en onciale **sans gras** (l'onciale n'en a pas, un gras imité l'empâte), phrases, noms de tuiles, boutons en Almendra. Quantités et valeurs restent en linéale. Débordements mesurés à 703 × 280 et 1920 × 1080 : **zéro** partout. **183 fichiers verts** |
| — | P3 — le HUD | **Abandonné**, comme le plan le prévoyait. Deux essais à la capture : les chiffres d'Almendra et de l'onciale sont en bas de casse (« Nv.1 » → « Nv.I » puis « Nv.ı », le « 0 » → « O »). Fichier remis tel quel, rien de commité |

- Règle qui sort de la session : **les lettres prennent les polices du jeu,
  les chiffres restent en linéale** — un nombre se lit d'un coup d'œil, et
  les deux polices embarquées n'ont pas de chiffres alignés.
- Suivi : `D-184` ouverte et close (livrée), `V-131` ouverte (à voir en jeu).
  Au passage, le lien vers le journal de la surprise dans `Q-128` suit son
  archivage.
- **Ce que la session ne prouve pas** : le goût, et la lisibilité au pouce sur
  le vrai téléphone. Les captures sous Chrome sans fenêtre ne remplacent pas
  le regard de Xav.

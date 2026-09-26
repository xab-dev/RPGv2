---
projet: RPG V2
episode/session: Audit qualité graphique du héros, optimisation du code (spec 17)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# Fichier de bord : l'audit du héros (26/09, après-midi)

Demande de Xav :

> Audit qualité graphique de héros, optimisation du code
>
> Nous avons encore une fois beaucoup travaillé sur Héro et sa qualité
> graphique. Nous avons probablement fait beaucoup d'itérations et alourdi le
> code au fur et à mesure.
>
> Préface: ajouter à la carte mentale dans la vision long terme du jeu :
> notion de 'sandbox' et 'openworld'.
>
> - Palier A : généraliser les outils et skills utilisés sur ces dernières
>   sessions concernant le Héro. […]
> - Palier B : simplifier, optimiser, alléger le code sans pour autant nuire à
>   la qualité graphique. […]
> - Palier C : polish général du Héro, plusieurs couches, plume d'artiste. […]
> - Palier D : état des lieux du jeu, fournis des captures d'écran dans un
>   dossier à part Audit_2026_09_26 […]
>
> arret Xav après chaque palier , commit et push sur branche dédié.

Le texte entier est dans `specs/17_audit-heros.md` §0. Réponses de Xav au plan :
palier B = la chaîne du héros seulement (`main.js` reste sous `Q-177` (5)) ;
captures dans `docs/captures/Audit_2026_09_26/`, versionnées.

Branche : `audit-heros`, depuis `main` (`53c3ef0`, `v0.9.0`). Push de la
branche à chaque arrêt (demandé par Xav) ; jamais `main`.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `fdefa25` | Ménage | Aucune réponse de Xav au suivi ; journal `heros-suite` archivé, INDEX ; « Où on en est » : branche `audit-heros` |
| `483dfd2` | `DOC-13` | Spec 17 écrite (la demande verbatim, quatre paliers) ; « Sandbox et monde ouvert » au tableau du cap (carte mentale §00), renvoi dans `CLAUDE.md` |
| `ddadd55` | `D-280` | Les outils pour tout visuel : `tools/mesure_visuel.mjs` (`diff` contre une référence Git, `cles`, `saut`, `fuite`, `cache` ; 0 sur `HEAD`, 138 cas contre `9f7ac9d`), `tools/atelier.html` (variantes `tools/variantes/*.js` en colonnes, marche rejouée, nuit sous voile), `commun.mjs#loupe` (fin des cinq copies), `scenarios/loupe_scene.mjs`. Mesures du héros au tour : pics de saut 215→216 (47 px) et 324→325 (43 px), médiane 8 |
| `1944e32` | `D-281` | Skill `atelier-visuel` (outils, boucle, règles du dessin, check-list d'un chantier neuf) ; renvoi dans `CLAUDE.md` ; `D-280` et `D-281` clos |
| — | Arrêt | **Palier A livré, arrêt Xav.** `tools/_ref/` (local, non versionné) laissé en place : à supprimer avec son exclusion de `.git/info/exclude` sur accord de Xav |

**Spec 17 en pause (Xav, 26/09)** : « le personnage saute d'une position à l'autre, aucune transition même entre sud et sud_ouest […] mets la spec 17 en pause, on se concentre sur ce Hotfix avant de continuer » — puis « root fixes please, not add "pansement" ».

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `2196b8d` | `D-282` | **Sur la branche `heros-angle-en-jeu`, depuis `main`** (hotfix, poussée) : `render.js#dessinerScene` recopiait les options du héros champ par champ et avait perdu l'angle et l'animation depuis `D-269` — la spec 16 n'était visible qu'aux bancs. Correctif de fond : `heroOptions` résolues par `main.js`, transmises telles quelles ; test des ordres de dessin (rouge avant, vert après), tests textuels retirés. `V-198` à voir ; `V-189` et `V-190` avaient été validés sans que le jeu les montre. Sa clôture au suivi est commitée ici, sur `audit-heros` |
| `5805b4a` | Publication | Xav : « local fonctionne comme prévu, et c'est magnifique […] push main ». Fusion de `heros-angle-en-jeu` dans `main`, `v0.9.3` (3 commits depuis `v0.9.0`), tag poussé ; branche du hotfix supprimée (fusionnée) |
| `b046016` | Fusion | `main` (`v0.9.3`) fusionnée dans `audit-heros` : le palier B part du code corrigé. **Spec 17 reprise, palier B** |
| `14dd8d0` | `D-283` | `mesure_visuel cout` (µs par dessin, canvas logiciel, médiane). **L'audit** : la chaîne du héros est déjà sobre (visuels 385 l., poses 388, orientation 193 ; données : `dx`/`dy` exigés par le schéma, rien à retirer sans toucher 123 visuels). Le seul point chaud : l'œil qui passe derrière (202–225°, 315–337°) coûte ~2,7 ms contre ~0,26 ailleurs (rideau × 11 primitives × 5 anneaux). Trois essais retirés faute de rendu identique (suites de pièces : 0 px mais aucun gain ; masque borné : 3/255 ; anneaux groupés : ×5 mais 28/255 sur les coutures) → `Q-180` à Xav |
| `d226fe8` | `D-284` | `tests/aide_dessin.js` : catalogues validés et trois faux contextes partagés ; 11 tests, ≈ −100 lignes net ; mordant vérifié par mutation ; `test_16e` aveugle à un dessin qui ignore l'angle → témoin ajouté |
| `d66181d` | `D-285` | `schemas.js` : pièces et poses validées par tables (une clé, son contrôle) ; mêmes erreurs sur 23 cas ; +14 lignes, gain de lecture |

## La sentinelle, fin du palier B (`traversee_nuit`, Moyen, Chrome sans fenêtre, même machine)

| | après `D-271` (nuit du héros) | `audit-heros`, fin du palier B |
|---|---|---|
| ×1 `dessiner()` moy / p95 | 0,65 / 1,00 ms | 0,74 / 1,30 ms |
| ×6 `dessiner()` moy / p95 | 5,21 / 7,50 ms | 5,44 / 8,50 ms |
| frames > 20 ms, ×1 / ×6 | 0 / 1 | 0 / 3 (sur 4 432) |

Le palier B ne touche pas le dessin (`visuels.js`, `poses.js` inchangés). L'écart vient de `D-282` : le jeu dessine enfin l'angle, le souffle, le pas et la capuche en retard, qu'il ne dessinait pas (les pièces posées et animées passent par leurs matrices, et l'œil par son rideau entre 202 et 225°). +0,1 ms à ×1, +0,2 ms à ×6 : aucune frame perdue à ×1 ; à ×6, 3 frames > 20 ms sur 4 432 (0,07 %). Le point chaud de l'œil est `Q-180`.

| `8612376` | DOC | Journal du palier B, la sentinelle. **Palier B livré, arrêt Xav** |
| `28b37e2` | DOC | Les remarques de Xav en jeu (bord du rideau concave, rideau en ombre, bord de l'ouverture en retard sur le globe) entrent au palier C : spec 17 §2, `D-286` à `D-288` |
| `ca2a70d` | D-286, D-287 | **Palier C ouvert.** Le rideau de l'œil : bord concave (`bord`, `rayon`) et ombre avant l'occlusion (`ombre`, découpée par `devant`). Défauts = `D-278` à l'octet. Xav, à l'atelier : B, rayon 3,5, « 35 % → 80 % (à 215°) puis 100 % ». À voir : `V-199` |
| `(ce commit)` | D-288 | L'ouverture suit le globe : la cause était la pose de profil (globe 0,9 plus loin que l'ouverture, capuche repliée à 69°), pas le ressort. Variante C de Xav, trois quarts ramené à −0,95 pour tenir `D-259`. Données seules. À voir : `V-200` |

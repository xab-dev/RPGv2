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

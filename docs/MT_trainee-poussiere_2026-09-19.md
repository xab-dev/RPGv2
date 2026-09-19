---
projet: RPG V2
episode/session: Polish 5/7
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — MT : traînée de poussière derrière le héros

**Décision Xav** : de petites bouffées blanches quand on marche, 2-3 visibles à la fois, « comme de la poussière qui se soulève ». Pas de roulement. **Règle** : l'effet vit dans le monde, il ne dépend pas de la forme du héros (le visuel du héros doit rester remplaçable).

## À faire

- Module **pur** (état + mise à jour, sans canvas) ; le dessin passe par `dessinerVisuel()` avec une entrée `visuel_poussiere` dans `data/visuels.json` (alpha / échelle pilotés par l'âge de la bouffée).
- Émission **à la distance parcourue** (une bouffée tous les N px), pas au temps → indépendante du framerate. Durée ~0,35 s, grossit un peu, s'estompe, alpha de départ ~0,35. Valeurs en données, *provisoires*, à régler au ressenti de Xav.
- **Réserve fixe pré-allouée** (8 suffisent), zéro allocation en jeu.
- Léger décalage latéral alterné, **déterministe** (pas de `Math.random()` dans la boucle).
- Dessinée sous le héros, dans le monde, **avant** le calque d'obscurité (la nuit l'assombrit naturellement).
- Rien à l'arrêt, rien pendant l'intro, rien quand une UI est ouverte (même point de décision unique que le reste du gameplay).

## Tests

X px parcourus → k bouffées ; la réserve ne grandit jamais ; immobile → 0 ; UI ouverte → 0 ; deux exécutions identiques donnent les mêmes bouffées.

Si `MT_mesure-saccades` est livré : relevé `?debug=fps` avant/après dans le journal. `main.js#dessiner()` touché → rejouer `docs/CHECKLIST_visuelle.md`.

**Règles communes** : ménage de journal d'abord ; une session = ce ticket, rien d'autre ; toute valeur nouvelle en données, commentée, marquée *provisoire* ; `node --check` + `node tools/run_tests.js` verts ; journal dans `CLAUDE.md`. Les noms de fichiers cités viennent de la section Architecture de `CLAUDE.md` — si le code réel diffère, le code fait foi, le dire dans le journal.

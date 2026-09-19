---
projet: RPG V2
episode/session: Polish 1/7
type: micro-ticket — instrument de mesure
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — MT : mesurer les saccades (zéro correction)

**Symptôme** : petites saccades régulières pendant un long déplacement en ligne droite dans la Région Maison, tous périphériques. Lève la dette *mesure réelle du temps de frame*.

## Livrable

Surcouche de debug activée par `?debug=fps`, **absente sinon** (aucun coût, aucun élément créé). Mise à jour ≤ 4 fois/s. Tampon circulaire pré-alloué : l'instrument n'alloue rien par frame. Points de mesure dans `render.js#creerBoucle` et autour de `maj()` / `dessiner()`.

Elle doit départager ces pistes — **hypothèses, pas des faits** :

1. **Re-rendu du calque statique fenêtré** (tuiles + décor) quand la caméra franchit le bord de la fenêtre : un pic périodique pile pendant une traversée en ligne droite. *Mesure : nombre et durée de chaque re-rendu du calque, horodatés.* Suspect n° 1.
2. **Irrégularité du delta-time** (horodatage `requestAnimationFrame`, plafond de delta atteint). *Mesure : histogramme des deltas, nombre de frames plafonnées.*
3. **Arrondi caméra / héros** différent sous la transform logique → physique (DPR). *Mesure : position écran du héros d'une frame à l'autre à vitesse constante ; l'écart doit être constant.*
4. **Pics isolés** (ramasse-miettes, forêt procédurale, `selectionnerTuilesVisibles`). *Mesure : moyenne, p95, max, frames > 20 ms sur 10 s, part `maj()` / `dessiner()`, entités dessinées.*
5. **Coût par pixel** : taille physique du canvas et du calque d'obscurité, DPR. *Mesure : les afficher.*

Afficher aussi `input.peripheriqueActif()` et ses bascules par seconde.

## Protocole (à rejouer par Xav, 2 minutes)

Traversée en ligne droite de la Région Maison, stick à fond, ~20 s, de jour puis de nuit. Un bouton « copier » met le relevé dans le presse-papiers. Xav colle les chiffres à Claude : le ticket de correction sera écrit dessus.

## Interdits

Corriger, optimiser, « tant qu'on y est ». Toucher au déplacement, à la caméra, à l'orbite du follet : leur ressenti est validé.

## Tests

Fonctions pures de l'instrument (tampon circulaire, p95, comptage). Sans `?debug=fps`, aucun élément DOM créé et aucune mesure prise. `main.js#dessiner()` touché → rejouer `docs/CHECKLIST_visuelle.md`.

**Règles communes** : ménage de journal d'abord ; une session = ce ticket, rien d'autre ; toute valeur nouvelle en données, commentée, marquée *provisoire* ; `node --check` + `node tools/run_tests.js` verts ; journal dans `CLAUDE.md`. Les noms de fichiers cités viennent de la section Architecture de `CLAUDE.md` — si le code réel diffère, le code fait foi, le dire dans le journal.

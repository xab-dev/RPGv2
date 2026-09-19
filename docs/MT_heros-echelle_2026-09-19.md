---
projet: RPG V2
episode/session: Polish 2/7
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — MT : héros à 0,88 (visuel et hitbox)

**Décision Xav** : le héros passe à 0,88 de sa taille actuelle, **visuel et hitbox**. But : meilleure proportion, et plus de jeu dans les passages d'une tuile.

## À faire

- Inventorier d'abord, dans le journal : où vit la taille visuelle du héros (`data/visuels.json` ?), où vit sa boîte de collision (`entities.js` / `scene.js`), et **tout ce qui en est dérivé**.
- Une seule échelle en données ; le visuel et la boîte de collision en dérivent tous deux, pour qu'ils ne puissent plus diverger.
- **Ne changent pas** : vitesse (stat dérivée), portées d'arme, seuil d'interaction, rayon de ramassage, aura, halo et orbite du follet, rayon d'effacement du toit, taille des monstres. Si l'une de ces valeurs est aujourd'hui dérivée de la taille du héros, **la figer à sa valeur actuelle** et le signaler.
- `TOLERANCE_COIN_PX` (`scene.js`) : vérifier qu'elle reste cohérente avec le nouveau jeu dans un passage d'une tuile ; ne la modifier que si un test le prouve nécessaire.
- Réévaluer la dette « mouvement légèrement téléporté à chaque angle » : noter si elle bouge, ne pas la traiter ici.

## Tests

Rejouer les tests du diagnostic « accrochage des coins » et ceux de collision des stations. Nouveau : couloir d'une tuile franchi sans contact ; une position sauvegardée collée à un mur avec l'ancienne boîte reste valide avec la nouvelle (une boîte plus petite ne peut pas être coincée) ; visuel et boîte lisent la même échelle.

Validation Xav : boucle Grotte → Maison, passages étroits de la Forêt, couloir intérieur de la maison entre les stations.

**Règles communes** : ménage de journal d'abord ; une session = ce ticket, rien d'autre ; toute valeur nouvelle en données, commentée, marquée *provisoire* ; `node --check` + `node tools/run_tests.js` verts ; journal dans `CLAUDE.md`. Les noms de fichiers cités viennent de la section Architecture de `CLAUDE.md` — si le code réel diffère, le code fait foi, le dire dans le journal.

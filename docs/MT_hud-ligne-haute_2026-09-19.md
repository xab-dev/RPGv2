---
projet: RPG V2
episode/session: Polish 6/7
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — MT : HUD sur une seule ligne en haut

**Décision Xav** : PV, faim, soif, niveau sur **une ligne en haut, pleine largeur**, à la place de la colonne de gauche qui prend trop de place. **La barre d'XP quitte le HUD** : seul le numéro du niveau reste.

## À faire

- Inventorier d'abord ce que `ui/hud.js` dessine aujourd'hui (PV, XP, faim, soif, niveau, buffs, autre). Tout ce qui reste affiché vit dans le bandeau haut ; plus rien dans la colonne de gauche.
- Ordre proposé, de gauche à droite : PV · Faim · Soif · `Niv. N` — espace — buffs actifs. À ajuster si l'inventaire révèle autre chose.
- Le placement vit dans `ui/hud_layout.js` (résolution logique 480 × 270), pas en dur dans `hud.js`. Hauteur du bandeau ≤ 8 % de la hauteur logique.
- La progression d'XP reste lisible dans l'écran Stats. La montée de niveau garde un retour : bref éclat sur `Niv. N` (pas de nouveau son).
- Chaque jauge reste identifiable **sans la couleur** (icône ou forme), cf. P4②.
- Ne recouvre ni les indices de commande (`hud_hints.js`), ni la boîte de dialogue, ni les contrôles tactiles. **La rangée de cases du bas n'est pas touchée** : elle fait l'objet d'une spec à part.
- Textes éventuels via `t()`.

## Tests

Sur `hud_layout.js` (pur) : tous les rectangles dans le bandeau haut, dans 480 px de large, sans chevauchement ; plus aucun rectangle « barre d'XP » ; `Niv. N` suit le niveau.

`ui/hud.js` touché → rejouer `docs/CHECKLIST_visuelle.md` en entier (règle de méthode). Validation Xav : manette, puis un passage au tactile.

**Règles communes** : ménage de journal d'abord ; une session = ce ticket, rien d'autre ; toute valeur nouvelle en données, commentée, marquée *provisoire* ; `node --check` + `node tools/run_tests.js` verts ; journal dans `CLAUDE.md`. Les noms de fichiers cités viennent de la section Architecture de `CLAUDE.md` — si le code réel diffère, le code fait foi, le dire dans le journal.

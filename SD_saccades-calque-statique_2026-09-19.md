---
projet: RPG V2
episode/session: Polish — correction des saccades
type: ticket diagnostic (SD), deux paliers
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# RPG V2 — SD : saccades en déplacement — le calque statique est recalculé 250 fois en 10 s

**Précondition** : `MT_mesure-saccades` livré. **Symptôme** : petites saccades régulières en traversant la Région Maison en ligne droite ; rien à l'arrêt.

## 1. Relevé (Xav, 2026-09-19 01h45, PC, manette, traversée en ligne droite)

```
fps ~ 59.9 (delta moyen 16.68 ms, p95 16.70 ms, max 16.70 ms)
frames plafonnées : 0/600            frames > 20 ms : 1/600
maj() moyen 0.12 ms (p95 1.00 ms) | dessiner() moyen 11.93 ms (p95 16.00 ms)
recalculs calque statique : 250 (moyenne 5.98 ms, max 10.00 ms, dernier il y a 961 ms)
écart position héros (px logiques) X : moy 0.149 min 0.000 max 1.913 | Y : 0
entités : monstres 0, interactifs 4, objets au sol 5
canvas 1920x1080 (dpr 1) | calque statique 2176x1408 | calque d'obscurité 1920x1080
périphérique : manette (0.00 bascule/s)
```

## 2. Lecture

**Écarté par les chiffres** : cadence irrégulière (deltas à 16,68 ± 0,02 ms), plafond de delta (0/600), pics isolés type ramasse-miettes (1/600), coût de `maj()` (0,12 ms), bascules de périphérique (0).

**Ce qui ne va pas :**
- **250 recalculs du calque statique sur 600 frames**, soit un toutes les 2,4 frames, à ~6 ms (max 10 ms) pièce. Un calque *fenêtré* n'existe que pour être recalculé **rarement**. Sa marge est de 128 px physiques par côté en largeur = 32 px logiques = 2 tuiles : à la vitesse du héros, l'ordre de grandeur attendu est **20 à 40** recalculs sur 600 frames, pas 250. Le dernier recalcul date de 961 ms → ils cessent à l'arrêt : c'est bien le mouvement qui les déclenche.
- `dessiner()` à **11,9 ms en moyenne, 16 ms au p95**, sur un budget de 16,7 ms, avec 9 entités à l'écran. Le jeu tient 60 fps sans aucune réserve.

**Pourquoi des saccades alors que les deltas sont parfaits** — explication probable, pas un fait : l'horodatage `requestAnimationFrame` est calé sur la synchro verticale et ne voit que le temps JavaScript. Redessiner et renvoyer au GPU une surface de 3 millions de pixels une frame sur deux coûte côté GPU un temps que l'instrument ne mesure pas ; des images peuvent être présentées en retard sans que le delta bouge.

**Ambigu, à lever** : l'écart de position du héros (max 1,913 px logique par frame ≈ 115 px/s, c'est-à-dire vraisemblablement **la vitesse du héros**) ressemble aux frames où la caméra est butée au bord de la carte en début et fin de traversée — normal dans ce cas. L'instrument ne permet pas de le distinguer d'un vrai tremblement. Résolution d'horloge à 1 ms (valeurs rondes) : les petites durées sont approximatives.

## 3. Palier A — cause de la sur-fréquence des recalculs (cette session)

1. **Cause racine d'abord** : dans `render.js` (fenêtrage du calque statique), quelle condition invalide le calque ? Nommer fichier:ligne pourquoi elle est vraie une frame sur deux en déplacement (clé de cache qui inclut une valeur changeante ? recentrage à chaque changement de tuile ou de pixel ? marge comparée dans la mauvaise unité, logique vs physique ? autre ?). Ne rien présumer.
2. **Test rouge d'abord** : extraire la décision en fonction **pure** (« faut-il recalculer, étant donné la caméra et la fenêtre courante ? »). Scénarios : traversée en ligne droite de 600 frames à la vitesse du héros → nombre de recalculs ≤ borne **calculée depuis la marge**, pas codée en dur ; caméra immobile → 0 ; va-et-vient à l'intérieur de la marge → 0 ; caméra butée au bord de carte → 0. Le premier doit être **rouge sur HEAD**. S'il est vert, la cause est ailleurs : s'arrêter et rapporter.
3. **Correctif minimal** : le calque n'est recalculé que lorsque la vue sort de la fenêtre. **Sortie identique au pixel** : pour une caméra donnée, les appels de dessin du calque sont les mêmes avant et après (test sur contexte enregistreur).
4. **Compléter l'instrument** : ventiler `dessiner()` (copie du calque statique · entités · calque d'obscurité · HUD) ; inscrire la phase jour/nuit dans le relevé ; compter **à part** les frames où la caméra est butée et les exclure de l'écart de position du héros.
5. **S'arrêter là.** Xav rejoue la même traversée, de jour puis de nuit, juge au ressenti et colle les deux relevés.

## 4. Palier B — conditionnel, session séparée, branche dédiée, jamais la même nuit que `07_chaos-nocturne`

Seulement si, après A, les recalculs sont rares mais que chacun (6-10 ms) se sent encore. **À proposer et chiffrer dans le journal, pas à coder sans le oui de Xav.** Deux pistes :
- **Cache par blocs** : le décor est pré-rendu par blocs de N × N tuiles dans de petits canvas, à la demande, avec éviction ; on dessine les blocs visibles à chaque frame ; **au plus un bloc neuf par frame**, préparé en avance dans le sens du déplacement. Le coût d'un recalcul est divisé par le nombre de blocs et étalé.
- **Défilement incrémental** : au recentrage, recopier le calque décalé sur lui-même et ne dessiner que la bande découverte.

Le coût de fond de `dessiner()` (≈ 9-10 ms hors recalcul) se traite **après**, sur la ventilation du point 4 — pas à l'aveugle.

## 5. Interdits

Baisser la résolution, le DPR ou la finesse du rendu (le rendu net à résolution physique est une décision actée) · toucher à la vitesse, à la caméra, à l'orbite du follet (ressenti validé) · optimiser entités, obscurité ou HUD avant d'avoir leur part mesurée · agrandir la marge « pour voir » sans avoir nommé la cause.

## 6. Livrables

`node --check`, suite verte, journal (cause fichier:ligne, recalculs avant/après sur le même scénario de test, pistes écartées). `render.js` touché → rejouer `docs/CHECKLIST_visuelle.md` en entier. Mettre à jour la dette *mesure réelle du temps de frame* avec le relevé du §1 comme point de référence.

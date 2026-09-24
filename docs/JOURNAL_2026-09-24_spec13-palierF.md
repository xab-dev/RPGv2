---
projet: RPG V2
episode/session: Spec 13, palier F — le budget de la carte, pour l'Annexe 1
type: fichier de bord
version: 1.0.0
statut: livré, à valider en jeu (V-148)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier F (24/09)

Demande de Xav : « go palier F ». Branche `carte-lisieres-perf`, pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `928958b` | Ménage | Journal du palier E archivé, INDEX à jour |
| (ce commit) | `D-204` — palier F | Le tri par le champ, le plafond d'entrée en scène en données, le test d'indépendance à la taille, la règle de l'Annexe |

## 1. Ce que le palier A avait laissé

Le verdict du §4.6 (`docs/archives/JOURNAL_2026-09-24_spec13.md` §3) :
- **dessin** : le tri par la fenêtre est justifié (~0,25 ms de `dessiner()` par monstre sous ×6, qu'il soit à l'écran ou non) ; mesurer d'abord la part hors champ ;
- **`maj()`** : pas de mise en veille (+0,35 ms pour 12 monstres sous ×6, sous le bruit du calque) ;
- **entrée en scène** : 16 à 24 ms sans fenêtre, 14 ms à la main ; le plafond `Q-134` = 2 × la valeur PC en Moyen, soit **40 ms**.

## 2. Le tri par le champ

**`src/champ.js`** (pur) : une chose se dessine si ce qu'elle **peint** touche la vue, jamais d'après sa seule position.
- Un visuel est jugé par la boîte des tampons (`tampons.js#boiteDessin` : primitives, traits, ombre portée, échelle, miroir, rotation), gardée par visuel et par pose.
- Un halo est jugé par son **disque**, bord flou compris ; un faisceau par le disque qui couvre ses coins lointains.
- La vue a un pixel logique de marge (l'antialias).

**`render.js`** l'applique partout où il parcourait la scène entière à chaque frame :
- `dessinerScene` : interactifs, objets au sol et monstres. Un monstre est gardé si son corps **ou** sa barre de PV entre dans la vue (la barre dépasse au-dessus de la tête).
- `dessinerObscurite` : les lumières de la scène, halos et faisceaux. Dans la Maison il y en a trois aujourd'hui, plus les leviers et les objets plantés ; dans la Grotte, chaque cristal du décor. Le coût suivait le nombre de lumières de la **carte**.
- `dessinerSurlignages` : le liseré et ses particules.
- Non triés, et c'est voulu : le héros, le follet, leurs traînées et l'anneau d'attaque, toujours à l'écran ; les toits, une poignée par scène.

**L'instrument** `?debug=fps` dit maintenant **dessinés / présents** (monstres, interactifs, objets au sol, lumières) et la moyenne des monstres dessinés sur le tampon. C'est la mesure que le palier A demandait. `traversee_nuit.mjs` la relit.

## 3. Le plafond d'entrée en scène (`Q-134`)

`graphismes.json > budget_carte : { entree_scene_max_ms: 40 }`, provisoire. Son *pourquoi* est au schéma (`schemas.js#erreursBudgetCarte`), qui refuse aussi au démarrage une valeur fausse ou une entrée absente.
- La ligne `entrée en scène` du relevé cite le plafond, et dit `DÉPASSÉ` au-delà.
- Au-delà, `console.warn` écrit où et combien. Ce n'est **jamais un échec**.
- Tout cela n'existe que sous `?debug=fps` : hors instrument, aucune horloge n'est lue (contrat du palier A). Les scénarios de la règle de l'Annexe tournent sous `?debug=fps`, donc l'avertissement tombe là où il sert.

## 4. Les preuves

`tests/test_budget_carte_2026-09-24.js` : la Maison contre une scène **quatre fois plus grande** (son plan recopié en 2 × 2, son décor de Haut recopié dans les trois quarts neufs), vues par la même caméra en trois endroits (le point d'apparition, la maison, la forêt).
- **Une reconstruction** repeint les mêmes cases et lit les mêmes motifs, en entier comme en défilant d'un pas. L'index du décor n'est lisible que case par case : toute autre lecture ferait tomber le test.
- **Les monstres** : 4 dessinés sur 16 présents.
- **Le tri juge sur le dessin** : l'interactif le plus large du catalogue, ancré hors écran mais dont le dessin y entre, est gardé ; un pas plus loin, il est trié. La rotation compte.
- **Les lumières** percées sont les mêmes sur la Maison et sur ×4. Au coin, c'est le disque qui décide, pas sa boîte.
- **Le plafond** : en données, refusé s'il est faux ou absent ; un avertissement au-delà ; le relevé le cite.
- **Trois mutations attrapées** : le tri sur l'ancre seule ; le halo jugé par sa boîte ; l'index du décor parcouru en entier. Cette dernière passait `test_defilement` : le trou est comblé.
- `test_d111` corrigé : son amputeur de paliers supposait une seule entrée dans `graphismes.json`.

## 5. Les chiffres

Chrome sans fenêtre, 1920 × 1080 DPR 1. L'avant (`928958b`, le palier E) est servi sur le port 8081 depuis un worktree, l'après (ce palier) sur 8080. Exécutions alternées, deux par case. Ces chiffres se comparent entre eux seulement.

**Avant / après, la nuit la plus chargée, sous ×6** (`traversee_nuit`, 12 rôdeurs) :

| Preset | Exécution | `dessiner()` moy | Frames > 20 ms (instrument) | Intervalles > 20 ms (page) | `maj()` moy |
|---|---|---|---|---|---|
| Moyen | 1 | 14,60 → **6,02 ms** | 238/3 838 → **11**/4 425 | 588 → **9** | 1,54 → 1,51 |
| Moyen | 2 | 11,19 → **4,17 ms** | 20/4 438 → **1**/4 441 | 9 → **2** | 1,17 → 1,04 |
| Haut | 1 | 13,76 → **4,73 ms** | 272/3 946 → **1**/4 441 | 485 → **3** | 1,42 → 1,04 |
| Haut | 2 | 11,64 → **4,65 ms** | 82/4 430 → **6**/4 438 | 13 → **6** | 1,11 → 1,03 |

- **`dessiner()` divisé par 2,5 à 3.** C'est plus que les monstres seuls (~3 ms pour 12 au palier A). La scène porte aussi **33 objets au sol**, dessinés chacun à chaque frame avant ce palier, et ses lumières. Relevé dans le vrai jeu, de jour, devant la maison : 2 interactifs dessinés sur 6, 0 objet au sol sur 33, 1 lumière sur 3.
- **La part hors champ**, mesurée enfin : sur la boucle, **0 à 3 monstres dessinés en moyenne sur 12 présents**. La boucle passe au milieu des deux zones, et pourtant l'essentiel du temps, ils sont hors de l'écran.
- **Le « avant » est bruité** : la première exécution de chaque preset a pris 238 et 272 frames lentes, la seconde 20 et 82. Le « après » ne l'est plus (1 à 11) : ce qui restait de frames lentes la nuit venait du dessin des entités, plus du calque.
- **`maj()` ne bouge pas** (1,0 à 1,5 ms) : pas de mise en veille des monstres, comme le palier A l'avait dit.
- **Le calque ne bouge pas non plus** (reconstruction 4,5 à 8,2 ms des deux côtés) : ce palier ne l'a pas touché.
- Les erreurs `relecture de save_next invalide` sont `D-200`, connues. Elles sont plus rares après : le CPU a plus de marge.

**Vérifié à l'image** : les comptes du relevé (`dessinés / présents`) suivent ce que montre l'écran. Une station coupée par le bord de l'écran reste dessinée, coupée.

**Chiffres de clôture de la spec 13**, base de la règle de l'Annexe (aussi dans `specs/13` §7) :

| Scénario | Preset | ×1 | ×6 |
|---|---|---|---|
| `cout_calque` (jour) : reconstruction moy / max · frames > 20 ms | Bas | 0,92 / 5,6 ms · 0/600 | 4,05 / 6,4 ms · 0/600 |
| | Moyen | 1,52 / 10,4 ms · 0/600 | 6,41 / 13,1 ms · 1/600 |
| | Haut | 1,56 / 8,6 ms · 0/600 | 7,75 / 12,7 ms · 0/600 |
| `traversee_nuit` (Nv.10, 12 rôdeurs) : `dessiner()` · `maj()` · reconstruction · frames > 20 ms | Bas | 0,58 · 0,17 · 0,40 ms · 0/4 443 | 4,13 · 1,13 · 2,10 ms · 1/4 440 |
| | Moyen | 0,66 · 0,19 · 0,89 ms · 0/4 442 | 4,17-6,02 · 1,04-1,51 · 4,5-5,6 ms · 1-11/4 441 |
| | Haut | 0,79 · 0,18 · 1,18 ms · 0/4 443 | 4,65-4,73 · 1,03-1,04 · 5,8-6,0 ms · 1-6/4 441 |
| Entrée en scène (Maison, à chaque chargement) | tous | 17 à 30 ms, plafond 40 ms | — |

**Contre le palier A** (même scénario, même machine), sous ×6 :
- la reconstruction est passée de 43-56 ms à **4-8 ms** ;
- `dessiner()` la nuit, de 11-14 ms à **4-6 ms** ;
- les frames lentes la nuit, de 137-187 à **1-11** sur ~4 400.

Sans bridage, tout tient sous 1,6 ms de reconstruction et 0,8 ms de `dessiner()`.

**L'entrée en scène**, relevée à chaque chargement : **17 à 30 ms** après ce palier. L'avant a donné une fois **38,7 ms**, sous le plafond de peu, avec les deux serveurs et Chrome qui chargeaient la machine. Le plafond de 40 ms avertira donc sur une machine chargée : c'est voulu, un avertissement n'arrête rien.

## 6. Relevé hors ticket

- `scene.js#tuileA` cherche la porte de chaque case par `portes.find` : un coût par case qui suit le **nombre de portes** de la scène. Aujourd'hui, une poignée : rien à mesurer. À indexer si l'Annexe multiplie les portes. Pas de ligne `D-` : ce n'est pas un défaut.

## 7. Pour Xav

- **`V-148`** : la carte doit être **la même qu'avant**, et plus légère.
  - Traverser la Maison de jour et de nuit, dans les trois presets.
  - Regarder les **bords de l'écran** : un monstre, une station, une plume ou un halo à moitié dehors doit rester dessiné, coupé par le bord ; rien ne doit apparaître ou disparaître d'un coup en arrivant au bord.
  - Et la nuit, la barre de PV d'un monstre juste au-dessus de l'écran.
- **Relevés de clôture à la main** (spec §7, palier F) :
  - `R-24` (jour) et `R-25` (nuit, Nv.10+, les deux zones pleines) ;
  - Chrome, F11, manette, protocole du §6 du suivi ;
  - puis l'album de référence de la carte (six vues, `docs/captures/AAAA-MM-JJ_jalon/`).
- **Le plafond d'entrée en scène** est à 40 ms (`Q-134`, ton défaut validé). Il a été frôlé une fois sous charge (38,7 ms) : si l'avertissement te gêne, c'est un nombre dans `graphismes.json`.
- **La règle de l'Annexe** est dans `CLAUDE.md` (contraintes de méthode) : tout ticket qui agrandit la carte passe les deux scénarios et compare aux chiffres ci-dessus ; plus de 20 % de régression l'arrête.
- Avec ce palier, **la spec 13 est livrée en entier**. La suite de la file est l'Annexe 1 (`specs/14`), dont les points bloquants B1 et B2 attendent ta décision.

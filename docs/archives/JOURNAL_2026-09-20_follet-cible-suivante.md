---
projet: RPG V2
episode/session: D-54 — « cible suivante », le joueur choisit le monstre du follet
type: journal de session
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-20
genere_par: claude
verifie_par: xav
---

## Journal de session — `D-54` : « cible suivante », le joueur choisit le monstre du follet (20/09)

Un ticket, un commit, branche `main` (pas de `push`). Fiche : `docs/archives/MT_follet-cible-suivante_2026-09-20.md`.
98 fichiers de test, 97 verts — le seul rouge est `D-52`, antérieur à ce ticket. Ménage fait en entrant : le journal de
`D-37` est archivé (`docs/archives/JOURNAL_2026-09-20_follet-engagement-relache.md`, ligne d'INDEX ajoutée), la fiche du
ticket rangée dans `docs/archives/`.

**Le verbe.** `target_next` est le 8ᵉ de `VERBES_BOUTON` : **RB** (bouton 5) à la manette, **Tab** au clavier, les deux
étaient libres. `touch.js` n'a pas été touché — le geste tactile est `Q-40`, et un verbe qu'une source ignore vaut
simplement `false` pour elle, la fusion n'a aucun cas particulier à écrire. Front montant, gameplay seulement : il se lit
sur `etatGameplay`, déjà neutralisé sous UI par LE point de décision unique, donc il n'y a **rien** à écrire pour « ne
rien faire quand un menu est ouvert ».

**Les candidats, et pourquoi pas les engageables.** `companion.js#cibleSuivante` (pure) retient les monstres **vivants en
deçà de la distance de relâche** — pas seulement ceux que `monstreEngageable` prendrait. C'est le point de la
fonctionnalité : ordonner une cible sert justement à envoyer le follet sur un monstre que l'orbite et l'aura n'ont pas
attrapé. Et c'est sans danger, parce que la règle de relâche, elle, est la même pour tout le monde : une cible ordonnée
hors de portée serait lâchée à la frame suivante, donc elle n'est pas candidate.

**Le tri se fait sur la distance PUIS sur l'id.** Deux monstres à égalité parfaite donneraient sinon un ordre qui dépend
de leur position dans le tableau — position qui change quand l'un d'eux meurt. Le cycle sauterait sans raison visible.

**La cible choisie tient, sans qu'on ait rien ajouté.** `mettreAJourEtat` ne choisit « le plus proche » qu'en état
`suivre` : une cible engagée, quelle que soit sa provenance, y reste jusqu'à sa mort ou sa relâche. Le test le vérifie sur
la vraie fonction (120 frames avec un intrus plus proche), pas sur une lecture du code.

**L'ordre des trois appels de la frame porte deux décisions.** Règle automatique → cible ordonnée → vol. Après, parce que
l'inverse laisserait la règle automatique reprendre la cible dans la même frame ; avant le déplacement, pour que le vol de
cette frame-ci parte déjà vers le nouveau monstre. Un contrôle de source l'épingle : c'est la seule chose de ce ticket
qui ne se voit pas dans une fonction pure.

**`Tab`, et le seul vrai point d'architecture.** Sans `preventDefault`, le navigateur déplace le focus hors du canvas et
le jeu ne reçoit plus rien. Mais un `keydown` arrive **hors frame** : la couche clavier ne peut pas lire `uiOuverte`, qui
n'existe qu'au milieu de `maj()`. Plutôt que de laisser le clavier recalculer « le jeu a-t-il la main » (une deuxième
vérité, qui divergerait), l'orchestrateur **annonce** la sienne à chaque frame (`onEtatUi`, no-op par défaut comme
`onPremierGeste`), et `demarrerJeu` en fait le prédicat `interceptionActive` du clavier. Un seul écrivain, un seul
lecteur. Le retard d'une frame est sans conséquence : entre l'ouverture d'un menu et l'appui suivant, il s'en écoule
toujours plusieurs. La liste des touches interceptées (`Tab` seule aujourd'hui) ne se dérive **pas** du mapping : la
raison d'être d'une entrée n'est pas « c'est un verbe », c'est « le navigateur en fait autre chose ».

**Trente fichiers de test mis à jour, et pourquoi ce n'est pas du bruit.** Les faux états d'input écrits à la main
n'avaient aucun `target_next` ; le gameplay lit ses verbes en direct (`etatGameplay.attack.pressed`), sans repli. Deux
issues : rendre les fausses données fidèles, ou faire lire le vrai code avec un défaut — c'est-à-dire accepter en
silence un état d'input incomplet. C'est le premier verbe ajouté depuis la Phase 0 ; la leçon est que ces faux états
ont un coût d'entretien, pas que le code doive se protéger d'eux. **`Q-42`** est ouverte pour proposer un constructeur
d'état partagé aux tests, qui rendrait le prochain verbe gratuit.

**Choix par défaut marqué `[OUVERT]` — `Q-41`.** Le ticket dit « zéro ou un candidat : sans effet ». Retenu ici : zéro
candidat, ou un seul **déjà ciblé**, ne font rien ; mais un appui alors que le follet n'a **aucune** cible prend le plus
proche, plutôt que de ne pas répondre au moment où le joueur attend quelque chose. Si Xav veut la lecture stricte, c'est
une ligne.

**Hors périmètre, signalé sans rien toucher.** `hints.js` : l'indice de commande du nouveau verbe est **proposé, pas
livré** — il exige un glyphe pour les **trois** périphériques, et le tactile n'a pas de geste à montrer tant que `Q-40`
est ouverte. `D-53` (l'amortissement par frame) et `D-52` (le test rouge) restent ouvertes, non touchées.

**Ce que ce ticket n'a pas touché, et c'est voulu** : `touch.js`, `status.js`, `vol_follet.js`, les données, le rendu.

**Validé et mis en ligne.** Xav, 20/09, en jeu : « all good » — `V-35` **close**, et il a demandé le `push` dans la foulée. Trois commits partent donc en ligne d'un coup : `D-51` (l'aura réelle), `D-37` (engagement et relâche) et `D-54` (cible suivante). `V-33` et `V-34` n'ont pas été nommées dans ce verdict-là : elles **restent ouvertes**, à regarder sur le même cercle.


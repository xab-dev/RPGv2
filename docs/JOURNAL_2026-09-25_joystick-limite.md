---
projet: RPG V2
episode/session: La laisse du joystick tactile bornée (D-251)
type: fichier de bord
version: 1.0.0
statut: en cours
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : la limite du joystick en laisse (25/09)

Demande de Xav, au téléphone, en vérifiant `V-174` :

> Lors de mon test sur téléphone pour valider le joystick tactil (stick
> virtuel) je me suis rapidement rendu compte que le cercle de base (présent
> par défaut) peut etre drag à travers tout l'écran, le reste parait bon, le
> feeling du cercle sous le pousse et de l'ajustement du cercle de départ est
> parfait, il faudrait lui donner une limite. Tracer un cercle qui touche bord
> gauche, bord bas, et ligne verticale du milieu de l'écran, puis laisser une
> marge de quelque pixel (éviter de déborder hors cadre), c'est le cercle de
> limite de dérivation du cercle principale (n'est pas affiché). 3 étapes:
> diagnostic, planification, action. tu peux rester dans main […] Claude fait
> passer les tests habituel (full suite), Xav vérifie et pousse.

Puis, en cours de ticket :

> je me suis trompé dans le premier prompt : le repère est ligne horizontale
> qui coupe l'écran (j'avais écrit verticale).

Sur `main`, partie de `99e8bda` (`v0.8.63`). Pas de push.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `f2f2338` | Ménage | Journal du joystick en laisse archivé ; aucune réponse nouvelle au suivi ; `D-14` (le plancher mobile, un téléphone acheté pour ça) reporté dans « Où on en est » |

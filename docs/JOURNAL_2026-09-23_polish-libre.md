---
projet: RPG V2
episode/session: Polish libre
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-23
genere_par: claude
verifie_par: xav
---

# Fichier de bord : polish libre (23/09)

Demande de Xav : « polish libre : rapide état des lieux, préparation de
l'intervention, application en itération. Utilise Chrome et tools. Un commit
par cible. » Branche `polish-libre-2026-09-23`, pas de push.

**État des lieux** (captures `polish_diagnostic.mjs`, suffixe `libre`, profil
Chrome jetable — la sauvegarde de Xav n'a été que regardée, jamais jouée) :
le HUD, les icônes et le sol sont validés (`V-53`, `V-55`) et ne se
retouchent pas. Deux défauts vus aux pixels : la bulle qui laisse passer la
barre du bas, l'indice de commande où la touche et l'action ont la même
facture.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `fa39a88` | Ménage | Journal du polish des dialogues archivé |
| `11462a3` | `D-170` | La barre du bas se tait sous la bulle (même pied, cadre translucide partagé) ; tactile inchangé. **163 fichiers verts** |
| `62e1522` | `D-170` | Test renommé à son identifiant |
| `4068658` + `c017eeb` | `D-171` | La touche d'un indice : un creux au liseré d'or, le glyphe en or ; bannière de largeur identique au pixel. L'or passe dans `cadre.js`. **164 fichiers verts** |
| `63b7261` | `D-172` | En placement, la barre du bas se tait aussi (le bandeau d'aide DOM prend le même pied) ; lu sur `constructionActif()`. Trouvé en poursuivant l'état des lieux sur les écrans (`ecrans_palier_c.mjs`). **164 fichiers verts** |

- Règle qui sort de la session : **la barre du bas se tait quand autre chose
  occupe le pied de l'écran et que le jeu est gelé** (bulle, placement) ; le
  tactile n'est jamais concerné, ses boutons montent au-dessus.
- **Proposé, pas fait** (touche du validé) : `Q-113` (l'or du canvas et le
  bleu des menus), `Q-114` (Force et faim, deux triangles).
- Commit raté puis refait : le renommage du test de `D-170` était parti dans
  `D-171` (une chaîne `&&` interrompue) ; séparé avant tout push.
- À voir en jeu : `V-110`, `V-111`, `V-112`.

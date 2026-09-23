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
- **Proposé, pas fait** (touche du validé) : `Q-112` (l'or du canvas et le
  bleu des menus), `Q-113` (Force et faim, deux triangles).
- Commit raté puis refait : le renommage du test de `D-170` était parti dans
  `D-171` (une chaîne `&&` interrompue) ; séparé avant tout push.
- À voir en jeu : `V-110`, `V-111`, `V-112`.

## Suite, sur le retour de Xav

« all good » : `V-110` à `V-112` validées. `Q-113` tranchée : la goutte de
la soif reste (« l'indication la plus intuitive »), mais les deux icônes
s'améliorent.

| Commit | Sujet | Ce qu'il faut en retenir |
|---|---|---|
| `72d9327` | `D-173` | Faim : un épi de blé à la place du triangle. Soif : la goutte dans une flaque. Données seules, deux passes au banc (la première faisait un épi de maïs) |
| `2745457` | `D-174` | « Prêt dans » → « Disponible dans » (FR), « Ready in » → « Available in » (EN) : une clé de locale |
| `4004653` | `D-175` | La case d'attaque prend la couleur du follet choisi (barre du bas et bouton tactile) ; l'or tant qu'aucun follet. **165 fichiers verts** |
| `47f2d9e` | `D-176` | L'engrenage des Paramètres dans le bouton MENU tactile, en filigrane, statique, id en données (`menus.json#icone_bouton`). Premier scénario tactile (`menu_tactile.mjs`). **166 fichiers verts** |
| `a387aad` | `D-176` | L'id de l'engrenage déménage dans `glyphes.json#tactile_icone` (par verbe), avant que le bouton INTERACT n'y déclare le sien. Rien ne change à l'écran (capture identique) |
| `669d271` | `D-177` | Le bouton INTERACT montre sa cible (même fonction que l'appui : `cibleInteraction`), une onde sinon. Trois passes à la capture : postes hors de portée, levier sans manche, manche qui sortait du bouton. **167 fichiers verts** |
| `2633390` + `63c0bcc` | `D-178` | La cinématique du choix suit Bas / Moyen / Haut par les effets du follet en jeu (sillage, étincelles), anneau à la couleur du follet qui respire dès Moyen. Une source des positions au lieu de trois dessins. Trois passes à la capture (étincelles dans la silhouette, puis en disques). **168 fichiers verts** |

**Clôture** (23/09) : « j'ai vérifié, très joli ! On peut clore cette
session, fusion puis push dans main. » Validées en jeu : `V-110` à `V-112`,
`V-114`, `V-117`. Restent à voir (aucun verdict dit, donc rien consigné) :
`V-113` (icônes faim et soif), `V-115` (engrenage MENU), `V-116` (bouton
INTERACT). Propositions ouvertes : `Q-112` (or du canvas / bleu des menus).
Branche `polish-libre-2026-09-23` fusionnée dans `main` et poussée sur la
demande de Xav.

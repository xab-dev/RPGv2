# Captures du ticket `D-48` — l'unité `--u` des menus, avant et après

Ce ne sont **pas** des captures d'album (celles-là suivent la convention de
`docs/captures/memo_captures.md`, six vues fixes à chaque clôture de jalon).
Ce sont des **preuves de ticket**, prises sous Chrome **sans fenêtre** par
`node tools/capture_chrome.mjs tools/scenarios/diagnostic_unite_dpr.mjs`, sous
les trois profils de `tools/scenarios/commun.mjs#PROFILS`. Toutes montrent le
même moment : l'écran **Poche**, ouvert comme sous-écran du menu Pause.

| Fichier | Ce qu'il montre |
|---|---|
| `avant_telephone.png` | **Le défaut**, à 780 × 360 px CSS **DPR 3**. `--u` = 4 px : la mise en page prévue pour 1080p dans une fenêtre de 360 px CSS de haut. Une tuile fait 240 × 240 px CSS — « on ne voit qu'une tuile et demie », mot pour mot le constat de Xav sur son téléphone. |
| `apres_telephone.png` | Après correctif, même profil. `--u` = 4/3 px, tuile 80 × 80, les six objets et la fiche tiennent à l'écran. `--jeu-x` = 70 px, `--jeu-y` = 0 : la boîte recouvre **exactement** l'image du jeu (640 × 360 px CSS). |
| `avant_pc.png` / `apres_pc.png` | 703 × 280, DPR 1 — **identiques**. |
| `avant_grand.png` / `apres_grand.png` | 1920 × 1080, DPR 1 — **identiques**. C'est le point : à DPR 1, pixels CSS et pixels physiques sont le même nombre, et le défaut est invisible. |

Ce que ces captures ne prouvent pas : que c'est **agréable au doigt** à cette
taille. Un Chrome sans fenêtre ne touche rien — le verdict reste une validation
en jeu sur un vrai téléphone, par l'URL publique (`V-31`).

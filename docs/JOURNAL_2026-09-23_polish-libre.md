---
projet: RPG V2
episode/session: Polish libre
type: fichier de bord
version: 1.0.0
statut: en cours
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
| *(ce commit)* | `D-170` | La barre du bas se tait sous la bulle (même pied, cadre translucide partagé) ; tactile inchangé. **163 fichiers verts** |

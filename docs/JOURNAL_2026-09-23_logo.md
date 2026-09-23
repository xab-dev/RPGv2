# Journal — 2026-09-23 — le symbole du jeu

File de micro-tickets sur la branche `logo`, un commit par ticket, chaque commit retirable seul.
Demande de Xav : le symbole « la sagesse pour tout et pour tous » (son invention, son tatouage),
dessiné d'un seul jet et validé tel quel (« don't touch anything ») ; à utiliser : animé avant le
cold-open, discret à la montée de niveau, et plus tard sur les armes (pas encore en jeu).

**Règle de la file : la géométrie du symbole ne se retouche pas.** `docs/captures/logo/generer_logo.mjs`
en est la seule source ; les tickets ci-dessous n'ajoutent que des SORTIES à ce script.

| Ticket | Commit | Ce qui est livré |
|---|---|---|
| L1 — le symbole et le README | `47a76f5` | `docs/captures/logo/` (script, SVG mono et couleur, planche) ; le grimoire ASCII du README remplacé par le symbole (couleur en thème sombre, mono en thème clair) |
| L2 — le moteur d'apparition | (ce commit) | `src/logo.js` (pur : un signe après l'autre, dans l'ordre de lecture, puis fondu commun) ; `render.js#dessinerLogo` (meilleur effort : image absente = rien) ; type d'effet `logo` validé au boot, deux entrées dans `effets.json` (ouverture, niveau — valeurs PROVISOIRES) ; les trois calques cuits par le script dans `images/logo/` ; `.svg` servi en `image/svg+xml` par le serveur local ; `tests/test_l2_logo` |

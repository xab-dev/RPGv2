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
| L2 — le moteur d'apparition | `bb74825` | `src/logo.js` (pur : un signe après l'autre, dans l'ordre de lecture, puis fondu commun) ; `render.js#dessinerLogo` (meilleur effort : image absente = rien) ; type d'effet `logo` validé au boot, deux entrées dans `effets.json` (ouverture, niveau — valeurs PROVISOIRES) ; les trois calques cuits par le script dans `images/logo/` ; `.svg` servi en `image/svg+xml` par le serveur local ; `tests/test_l2_logo` |
| L3 — le symbole avant le cold-open | `141fdd2` | `main.js` : `ouvertureLogoMs` précède l'intro (partie neuve seulement, comme elle), UI ouverte non skippable ; l'intro naît à sa fin, ses durées et son budget de 8 s inchangés ; sans calques (headless, image perdue), rien ne change. `demarrerJeu#chargerImagesLogo`. Vérifié sous Chrome sans fenêtre (`tools/scenarios/logo_ouverture.mjs`) : le symbole net sur le noir, puis les paupières. Relevé : un serveur local lancé AVANT ce ticket sert le SVG en `octet-stream` et le logo n'apparaît pas — **relancer `node serveur_local.js`** ; `tests/test_l3_logo_ouverture` |
| L4 — le symbole à la montée de niveau | (ce commit) | `main.js` : `logoNiveauMs`, né sur la même détection que l'éclat « Niv. N », au-dessus du héros (il le suit), après l'obscurité et avant le HUD ; discret (`effet_logo_niveau` : 22 px, alpha 0,7, ~1,6 s — PROVISOIRE). Pixels NON capturés (déclencher un niveau sous Chrome sans fenêtre demande une récolte scriptée) : même fonction de dessin que l'ouverture, vérifiée, mais la taille et la place se jugent en jeu ; `tests/test_l4_logo_niveau` |

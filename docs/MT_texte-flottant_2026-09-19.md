---
projet: RPG V2
episode/session: Fondations — patch 5
type: micro-ticket
version: 1.0.0
statut: brouillon
catégorie: Ticket
date: 2026-09-19
ids_suivi: [D-05]
genere_par: claude
verifie_par: xav
---

# MT — Texte flottant de gain (« +1 bois »)

**Traite `D-05` (élargi le 19/09). Ne touche à aucune autre ligne du suivi.** Un commit : `D-05 texte flottant de gain`.

## Intention

Quand le joueur récolte du bois ou de la pierre, ou ramasse un objet au sol, un petit texte monte depuis la source et s'efface : « +1 bois ». Aujourd'hui, seul le tout premier ramassage a un retour.

**Un seul mécanisme de retour dans le monde**, pas un par système. Il resservira au butin, à l'XP et aux dégâts **sans code nouveau** : ces usages ne sont **pas** livrés ici, mais rien dans le module ne doit supposer « ressource ».

## Patron à suivre

`src/poussiere.js` + `data/effets.json` (ticket du 19/09) : module **pur**, réserve de taille fixe pré-allouée, **aucune allocation en jeu**, réglages en données.

## Périmètre de lecture

`src/poussiere.js` et son test (le patron) · `data/effets.json` · l'endroit de `src/main.js` où la récolte et le ramassage **aboutissent** (pas tout le fichier) · dans `src/render.js`, la composition des calques du monde · `locales/fr.json` et `en.json` pour les noms d'items existants.

## Conception

- **`src/texte_flottant.js`**, pur : `emettre(x, y, texte)`, `maj(dtMs)`, liste des actifs pour le rendu. Réserve pleine → on recycle le plus ancien.
- **`data/effets.json`**, une entrée : durée, hauteur de montée, fondu, taille, couleur, contour, capacité de la réserve. Toutes **provisoires**.
- **Émission depuis l'orchestrateur**, là où le gain est déjà résolu. `resources.js`, `ground_items.js` et `inventory.js` restent ignorants du rendu.
- **Texte par i18n** : `+{n} {nom de l'item}`, avec les clés de noms d'items existantes. Aucune chaîne en dur.
- **Fusion** : deux gains du même item dans la même frame = un seul texte (« +2 »).
- **Rendu** en coordonnées du monde, **après le calque d'obscurité** et avant le HUD : c'est un retour d'interface, il doit rester lisible la nuit. Passer par la fonction de composition unique qui restaure la transform (contrainte de méthode).

## Tests (rouge d'abord)

Émission, vieillissement et extinction · réserve pleine sans allocation · fusion dans la même frame · texte résolu dans les deux langues · une récolte et un ramassage simulés déclenchent chacun **une** émission.

## Interdits

Pas de nombres de dégâts, pas d'XP, pas de son. Le retour existant du premier ramassage n'est pas modifié : s'il fait doublon, le **signaler**.

## Validation en jeu (Xav)

Ticket de rendu. Récolter un arbre et un rocher, ramasser une branche, un caillou, un fruit — de jour, puis de nuit. Le texte se lit sans gêner, ne saute pas quand la caméra bouge, ne traîne pas. Régler durée et hauteur au ressenti (rejoint `V-11`).

// Poche et coffre (03_maison-exterieur §3.3, retrait ajouté Palier A
// specs/04_maison-interieur.md ; capacité réelle ajoutée par `D-118`).
// Pur, testé.
//
// CE QUI A CHANGÉ AVEC `D-118`, et pourquoi c'est structurel : jusqu'ici la
// seule limite était un plafond de pile porté par l'OBJET (`stack_max`), le
// même partout — 20 bois en poche comme au coffre. Un conteneur n'avait donc
// aucune existence, et « la poche est pleine » ne voulait rien dire.
//
// Désormais : **la pile appartient au conteneur, l'objet peut la plafonner**.
// Un conteneur déclare `slots` et `pile` (data/conteneurs.json) ; un objet
// déclare au besoin `pile_max` — un outil ou une arme ne s'empile pas, et ça
// se dit sur l'objet parce que c'est vrai dans n'importe quel conteneur.
//
// Le CONTENU reste ce qu'il était : `{ itemId: quantité }`. Les slots ne sont
// pas un tableau de cases, ils sont une CONSÉQUENCE — 12 branches à 5 par
// pile occupent trois slots. C'est ce qui fait qu'aucune sauvegarde ne change
// de forme, et qu'un contenu venu d'avant ce ticket reste lisible tel quel.

// LE point de résolution de la capacité (§0 du brief : « une valeur destinée
// à grandir n'est jamais lue directement par un système »). La besace (23/09)
// y est passée, et nulle part ailleurs : un conteneur déclare en données des
// `bonus` — `{ condition, slots }` — et chacun dont la condition tient ajoute
// ses slots à la base. `evaluer` est injecté (le module ne connaît pas les
// flags) ; absent, aucun bonus ne tient : c'est la base d'avant la besace.
//
// `filtre` est le contrat que le porte-outils attend (`Q-65`) : une liste de
// catégories acceptées. Rien ne le remplit aujourd'hui — `null` veut dire
// « ce conteneur accepte tout », et c'est le seul comportement livré.
export function resoudreCapacite(conteneurDef, evaluer = () => false) {
  let slots = conteneurDef.slots;
  for (const bonus of conteneurDef.bonus || []) {
    if (evaluer(bonus.condition)) slots += bonus.slots;
  }
  return {
    slots,
    pile: conteneurDef.pile,
    filtre: conteneurDef.filtre || null,
  };
}

// La hauteur d'une pile de CET objet dans CE conteneur : le conteneur décide,
// l'objet peut abaisser. Jamais l'inverse — un objet ne s'empile pas plus
// haut que ce que son conteneur permet.
export function pileEffective(itemDef, capacite) {
  const plafondObjet = itemDef && Number.isInteger(itemDef.pile_max)
    ? itemDef.pile_max
    : capacite.pile;
  return Math.max(1, Math.min(capacite.pile, plafondObjet));
}

// Un conteneur filtré n'accepte que certaines catégories. Sans filtre, tout
// passe — c'est le cas de la poche et du coffre d'aujourd'hui.
export function accepte(itemDef, capacite) {
  if (!capacite.filtre) return true;
  return capacite.filtre.includes(itemDef.categorie);
}

// Combien de slots ce contenu occupe réellement. `obtenirItem` est injecté
// (le module ne connaît aucun catalogue) et rend la fiche d'un item.
export function slotsOccupes(contenu, capacite, obtenirItem) {
  let total = 0;
  for (const [itemId, quantite] of Object.entries(contenu || {})) {
    if (!(quantite > 0)) continue;
    total += Math.ceil(quantite / pileEffective(obtenirItem(itemId), capacite));
  }
  return total;
}

// Combien d'unités de cet objet ce conteneur peut contenir AU TOTAL, vu ce
// qu'il contient déjà. C'est un plafond sur la quantité finale, exactement la
// forme que `ajouterItem` attend depuis toujours — d'où l'absence de
// changement de signature chez lui, et chez ses appelants.
//
// Le calcul : les autres objets mobilisent leurs slots, ce qui reste est
// disponible pour celui-ci, à sa pile effective.
export function plafondPourItem(contenu, itemId, capacite, obtenirItem) {
  const itemDef = obtenirItem(itemId);
  if (!accepte(itemDef, capacite)) return contenu[itemId] || 0;
  const pile = pileEffective(itemDef, capacite);
  const sansCelui = { ...(contenu || {}), [itemId]: 0 };
  const slotsRestants = Math.max(0, capacite.slots - slotsOccupes(sansCelui, capacite, obtenirItem));
  return slotsRestants * pile;
}

// Renvoie le nouvel inventaire ET la quantité effectivement ajoutée
// (0 si déjà plein) — l'appelant (main.js) s'en sert pour distinguer un
// ramassage réussi d'un "poche pleine" (§4 edge case).
export function ajouterItem(inventaire, itemId, quantite, plafond) {
  const actuel = inventaire[itemId] || 0;
  const nouveau = Math.min(plafond, actuel + Math.max(0, quantite));
  return { inventaire: { ...inventaire, [itemId]: nouveau }, ajoute: Math.max(0, nouveau - actuel) };
}

// Retrait pour le craft (§3.1) et le transfert vers le coffre (§3.5) —
// jamais négatif (clampé à 0), la clé reste présente à 0 plutôt que
// supprimée (les listes de poche filtrent déjà quantite > 0, cf. main.js).
export function retirerItem(inventaire, itemId, quantite) {
  const actuel = inventaire[itemId] || 0;
  const nouveau = Math.max(0, actuel - Math.max(0, quantite));
  return { ...inventaire, [itemId]: nouveau };
}

// Une sauvegarde d'avant `D-118` porte des piles que la poche ne peut plus
// tenir (20 bois là où quatre slots de cinq en tiennent 20 au mieux, et zéro
// si trois autres objets occupent le reste). Ce n'est PAS une migration de
// schéma : la donnée est valide, c'est la RÈGLE qui a changé — la classe que
// `CLAUDE.md` nomme depuis le repli sur `scene_grotte_salle_1`, et qui se
// traite explicitement, jamais par `save.js#migrer`.
//
// Ce qui déborde descend au coffre ; ce que le coffre ne peut pas prendre non
// plus est RENDU à l'appelant, qui le journalise. Rien ne disparaît en
// silence : c'est la seule règle non négociable de cette fonction.
export function normaliserContenus({ poche, coffre }, { capacitePoche, capaciteCoffre, obtenirItem }) {
  const pocheFinale = {};
  const coffreFinal = { ...(coffre || {}) };
  const deplaces = [];
  const perdus = [];

  // Ordre stable (l'ordre d'insertion du contenu) : deux chargements de la
  // même sauvegarde donnent le même résultat, sinon le joueur verrait ses
  // affaires changer de place d'une reprise à l'autre.
  for (const [itemId, quantite] of Object.entries(poche || {})) {
    if (!(quantite > 0)) { pocheFinale[itemId] = 0; continue; }
    const plafond = plafondPourItem(pocheFinale, itemId, capacitePoche, obtenirItem);
    const garde = Math.min(quantite, plafond);
    pocheFinale[itemId] = garde;
    const surplus = quantite - garde;
    if (surplus <= 0) continue;

    const plafondCoffre = plafondPourItem(coffreFinal, itemId, capaciteCoffre, obtenirItem);
    const place = Math.max(0, plafondCoffre - (coffreFinal[itemId] || 0));
    const descend = Math.min(surplus, place);
    if (descend > 0) {
      coffreFinal[itemId] = (coffreFinal[itemId] || 0) + descend;
      deplaces.push({ item: itemId, quantite: descend });
    }
    if (surplus - descend > 0) perdus.push({ item: itemId, quantite: surplus - descend });
  }

  return { poche: pocheFinale, coffre: coffreFinal, deplaces, perdus };
}

// Craft (Palier A, specs/04_maison-interieur.md §3.1) : peutFabriquer() et
// fabriquer() sont les deux seules fonctions qui savent fabriquer quelque
// chose — un menu Craft ne fait qu'appeler l'une puis l'autre. Pur, testé.

import { estExpire, poserCooldown } from './cooldowns.js';
import { ajouterItem, retirerItem } from './inventory.js';
import { estVisible } from './visibilite.js';

const COOLDOWN_DEFAUT_MS = 60000; // §10 : "règle anti-spam", 60 s par recette.

export function recettesDeStation(registre, stationTypeId) {
  return registre.tous('recipes').filter((r) => r.station === stationTypeId);
}

// Découverte (§3.1, D9③) : une recette non découverte n'est même pas listée
// — narration diffuse, jamais montrer ce qu'il faut atteindre.
//
// `D-62` (T4) : ce n'est plus une règle propre aux recettes. Le couple
// `connue_au_depart` / `deblocage` a été remplacé par le `visible_si`
// GÉNÉRIQUE de `visibilite.js`, que les armes et, plus tard, les compétences
// partagent. Deux changements de sens, tous deux voulus :
//   - un champ ABSENT rend désormais l'entrée VISIBLE (l'ancien couple la
//     cachait) — c'est ce qui garantit que l'existant ne bouge pas quand un
//     nouveau catalogue adopte le champ ;
//   - il n'y a plus deux façons de cacher une entrée, donc plus rien à faire
//     diverger.
// La fonction reste, sous son nom de métier : `peutFabriquer` parle de
// recettes, pas de visibilité de catalogue.
export function recetteDecouverte(recette, flags) {
  return estVisible(recette, flags);
}

// `D-66` (T5) : `eclats` est la monnaie du joueur (`save.inventaire.eclats`),
// pas un item de poche — elle ne peut donc pas figurer dans `entrees`. Le
// paramètre est OPTIONNEL et vaut 0 par défaut : une recette sans
// `cout_eclats` ne le regarde jamais, et tous les appelants d'avant ce ticket
// continuent de fonctionner tels quels.
// `D-122` (T6) : le verdict porte désormais un DÉTAIL, pas seulement un code.
//
// Ce qui manquait : une tuile grisée pouvait ne rien dire, et une tuile NON
// grisée pouvait ne rien faire — la pioche déjà possédée s'affichait « 1/1 »
// et l'action restait muette. La règle du 21/09 ne bouge pas (« grisé est un
// indice, jamais un verrou » : l'action réelle est toujours tentée, le
// résultat fait foi) ; ce qui change est qu'on peut enfin ÉCRIRE pourquoi.
//
// `detail` est la part que seule cette fonction connaît : QUEL ingrédient
// manque et COMBIEN. L'appelant compose le texte — le module ne connaît ni
// i18n, ni gabarit.
//
// L'ordre des refus est celui de l'utilité : ce qu'on peut aller chercher
// d'abord (un objet déjà possédé, un ingrédient, des éclats), ce qu'on ne
// peut qu'attendre ensuite (la recharge), et la place en poche en dernier —
// c'est le seul qui dépende de ce qu'on fera du résultat.
export function peutFabriquer(recette, poche, flags, cooldowns, heureMs, eclats = 0, plafondSortie = null) {
  // `pocheApresEntrees` : la poche telle qu'elle sera une fois les
  // ingrédients retirés. C'est la seule mesure honnête de « y a-t-il la
  // place » — cuire son dernier fruit dans une poche pleine LIBÈRE le slot du
  // fruit. Calculée ici plutôt que par l'appelant, pour que la règle n'existe
  // qu'en un endroit (`fabriquer` s'appuie sur ce verdict, il ne le refait
  // pas).
  const pocheApresEntrees = () => {
    let p = poche;
    for (const entree of recette.entrees) p = retirerItem(p, entree.item, entree.qte);
    return p;
  };
  if (!recetteDecouverte(recette, flags)) return { ok: false, raison: 'verrouillee', detail: null };

  // `unique` (en données, sur la recette) : un outil, une arme — on n'en
  // fabrique pas un second tant qu'on a le premier. C'est la règle qui rend
  // lisible le « 1/1 » que Xav a vu sans comprendre.
  if (recette.unique && recette.sortie.item && (poche[recette.sortie.item] || 0) > 0) {
    return { ok: false, raison: 'deja_possede', detail: { item: recette.sortie.item } };
  }

  for (const entree of recette.entrees) {
    const possede = poche[entree.item] || 0;
    if (possede < entree.qte) {
      return { ok: false, raison: 'ingredients', detail: { item: entree.item, manque: entree.qte - possede } };
    }
  }

  const coutEclats = recette.cout_eclats || 0;
  if (coutEclats > eclats) {
    return { ok: false, raison: 'eclats', detail: { manque: coutEclats - eclats } };
  }

  const dureeMs = recette.cooldown_ms ?? COOLDOWN_DEFAUT_MS;
  if (!estExpire(cooldowns, recette.id, dureeMs, heureMs)) {
    return { ok: false, raison: 'cooldown', detail: null };
  }

  // La place en poche, quand l'appelant sait la calculer. `null` veut dire
  // « je ne sais pas » et non « il y a la place » : un appelant qui ne fournit
  // pas le plafond obtient exactement le verdict d'avant ce ticket.
  if (plafondSortie !== null && recette.sortie.item) {
    const finale = pocheApresEntrees();
    const dejaPossede = finale[recette.sortie.item] || 0;
    if (dejaPossede + recette.sortie.qte > plafondSortie(finale)) {
      return { ok: false, raison: 'poche_pleine', detail: null };
    }
  }

  return { ok: true, raison: null, detail: null };
}

// Fabrique une recette : retire les entrées, ajoute la sortie, crédite l'XP,
// pose le cooldown. §4 edge case : la sortie qui ne rentre pas dans la poche
// est un refus AVANT toute consommation — rien n'est modifié.
//
// `D-118` : le plafond n'est plus un champ de l'objet produit, c'est une
// FONCTION que l'appelant fournit (`inventory.js#plafondPourItem`), parce que
// « combien de cet objet tiennent encore » dépend du conteneur et de ce qu'il
// contient déjà — deux choses que ce module ne connaît pas et ne doit pas
// connaître.
//
// Et une fonction plutôt qu'un nombre, parce que le plafond se mesure sur la
// poche APRÈS le retrait des ingrédients : cuire un fruit dans une poche
// pleine libère la place du fruit cuit, et le refuser serait faux. La règle
// « refus AVANT toute consommation » tient toujours — le retrait se fait dans
// une copie locale, et c'est la poche d'ORIGINE qui est rendue en cas de
// refus.
export function fabriquer(recette, { poche, flags, cooldowns, heureMs, plafondSortie, eclats = 0 }) {
  // `D-122` : le plafond est passé AU VERDICT. Il n'y a donc plus qu'une
  // règle de « ça tient en poche », et c'est elle que l'écran affiche — ce
  // qui est grisé et ce qui échoue ne peuvent plus diverger.
  const verdict = peutFabriquer(recette, poche, flags, cooldowns, heureMs, eclats, plafondSortie);
  if (!verdict.ok) return { ok: false, raison: verdict.raison, poche, cooldowns, eclats };

  let pocheFinale = poche;
  for (const entree of recette.entrees) {
    pocheFinale = retirerItem(pocheFinale, entree.item, entree.qte);
  }

  // `D-121` (T5) : une recette peut produire une STATION plutôt qu'un objet.
  // La poche n'a alors rien à recevoir — et surtout, elle n'a pas à être
  // assez vide : fabriquer un coffre avec une poche pleine est même le cas
  // NORMAL (trois slots de ressources y sont partis). Le plafond n'est donc
  // pas consulté, ce qui n'est pas un contournement mais la conséquence
  // exacte de « rien n'entre en poche ».
  const station = recette.sortie.station || null;
  if (!station) {
    pocheFinale = ajouterItem(
      pocheFinale, recette.sortie.item, recette.sortie.qte, plafondSortie(pocheFinale),
    ).inventaire;
  }

  return {
    ok: true,
    raison: null,
    // `station` vaut `null` pour une recette d'objet : l'appelant n'a donc
    // aucune branche à écrire pour les recettes d'avant ce ticket.
    station,
    poche: pocheFinale,
    // Les éclats sont RENDUS, pas mutés : ce module reste pur, comme il l'est
    // pour la poche et les cooldowns. C'est l'appelant qui les repose dans la
    // sauvegarde, au même endroit et au même moment que le reste.
    eclats: eclats - (recette.cout_eclats || 0),
    cooldowns: poserCooldown(cooldowns, recette.id, heureMs),
    xp: recette.xp || 0,
  };
}

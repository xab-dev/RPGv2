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
export function peutFabriquer(recette, poche, flags, cooldowns, heureMs, eclats = 0) {
  if (!recetteDecouverte(recette, flags)) return { ok: false, raison: 'verrouillee' };
  if ((recette.cout_eclats || 0) > eclats) return { ok: false, raison: 'eclats' };
  const dureeMs = recette.cooldown_ms ?? COOLDOWN_DEFAUT_MS;
  if (!estExpire(cooldowns, recette.id, dureeMs, heureMs)) {
    return { ok: false, raison: 'cooldown' };
  }
  for (const entree of recette.entrees) {
    if ((poche[entree.item] || 0) < entree.qte) return { ok: false, raison: 'ingredients' };
  }
  return { ok: true, raison: null };
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
  const verdict = peutFabriquer(recette, poche, flags, cooldowns, heureMs, eclats);
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
    const plafond = plafondSortie(pocheFinale);
    const dejaPossede = pocheFinale[recette.sortie.item] || 0;
    if (dejaPossede + recette.sortie.qte > plafond) {
      return { ok: false, raison: 'poche_pleine', poche, cooldowns, eclats };
    }
    pocheFinale = ajouterItem(pocheFinale, recette.sortie.item, recette.sortie.qte, plafond).inventaire;
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

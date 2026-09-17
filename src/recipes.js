// Craft (Palier A, specs/04_maison-interieur.md §3.1) : peutFabriquer() et
// fabriquer() sont les deux seules fonctions qui savent fabriquer quelque
// chose — un menu Craft ne fait qu'appeler l'une puis l'autre. Pur, testé.

import { estExpire, poserCooldown } from './cooldowns.js';
import { ajouterItem, retirerItem } from './inventory.js';

const COOLDOWN_DEFAUT_MS = 60000; // §10 : "règle anti-spam", 60 s par recette.

export function recettesDeStation(registre, stationTypeId) {
  return registre.tous('recipes').filter((r) => r.station === stationTypeId);
}

// Découverte (§3.1, D9③) : connue d'emblée, ou débloquée par une condition
// de flags — une recette non découverte n'est même pas listée (narration
// diffuse, jamais montrer ce qu'il faut atteindre), filtre appliqué par
// l'appelant (menu Craft), pas ici.
export function recetteDecouverte(recette, flags) {
  if (recette.connue_au_depart) return true;
  if (!recette.deblocage) return false;
  return flags.evaluate(recette.deblocage);
}

export function peutFabriquer(recette, poche, flags, cooldowns, heureMs) {
  if (!recetteDecouverte(recette, flags)) return { ok: false, raison: 'verrouillee' };
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
// (stack_max) est un refus AVANT toute consommation — rien n'est modifié.
export function fabriquer(recette, { poche, flags, cooldowns, heureMs, itemDefSortie }) {
  const verdict = peutFabriquer(recette, poche, flags, cooldowns, heureMs);
  if (!verdict.ok) return { ok: false, raison: verdict.raison, poche, cooldowns };

  const dejaPossede = poche[recette.sortie.item] || 0;
  if (dejaPossede + recette.sortie.qte > itemDefSortie.stack_max) {
    return { ok: false, raison: 'poche_pleine', poche, cooldowns };
  }

  let pocheFinale = poche;
  for (const entree of recette.entrees) {
    pocheFinale = retirerItem(pocheFinale, entree.item, entree.qte);
  }
  pocheFinale = ajouterItem(pocheFinale, recette.sortie.item, recette.sortie.qte, itemDefSortie.stack_max).inventaire;

  return {
    ok: true,
    raison: null,
    poche: pocheFinale,
    cooldowns: poserCooldown(cooldowns, recette.id, heureMs),
    xp: recette.xp || 0,
  };
}

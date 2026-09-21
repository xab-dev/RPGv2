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

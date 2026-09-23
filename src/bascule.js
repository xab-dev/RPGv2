// `D-158` — la bascule d'un levier, DANS LE TEMPS. Pur : ne connaît ni un
// levier, ni un canvas, ni un id ; reçoit un booléen (« allumé ») et un
// delta, rend un état d'affichage. C'est un état COSMÉTIQUE : il ne vit que
// dans l'orchestrateur, jamais dans la sauvegarde — la vérité du jeu reste
// `puzzlesEtat[id].actif`, et un levier chargé allumé s'affiche allumé,
// immobile, sans rejouer son geste.
//
// Pourquoi il existe : un levier allumé ne changeait que de couleur (`Q-71`,
// principe P4② « jamais la couleur seule »). Le manche bascule désormais
// d'un côté à l'autre, le voyant s'allume À LA FIN du geste (c'est le geste
// qui allume, pas l'appui), puis un halo monte en fondu — consigne de Xav :
// « il faut bien voir qu'ils s'allument ; contraster, pas éblouir ».

// Durée du geste, du premier mouvement du manche à sa butée. Provisoire, au
// jugé : assez court pour répondre à l'appui, assez long pour être vu.
export const DUREE_BASCULE_MS = 180;
// Durée de montée du halo, une fois le voyant allumé. Provisoire : plus
// lent que le geste, pour que la lumière « chauffe » au lieu de claquer.
export const DUREE_FONDU_HALO_MS = 450;
// Dépassement de la butée (easeOutBack) : le manche va un peu trop loin et
// revient — c'est ce qui fait sentir un ressort, donc une mécanique.
// Provisoire.
const DEPASSEMENT = 1.7;

function easeOutBack(p) {
  // Bornes exactes : la formule rend ±2e-16 aux extrémités, et un geste doit
  // partir de SA butée et y finir, pas d'un cheveu à côté.
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const c3 = DEPASSEMENT + 1;
  return 1 + c3 * (p - 1) ** 3 + DEPASSEMENT * (p - 1) ** 2;
}

// `etat` : { de, vers, ms } — `de`/`vers` sont des positions (0 éteint,
// 1 allumé), `ms` le temps écoulé depuis le dernier changement de cible.
// Sans état (premier affichage, entrée en scène), le levier est posé à sa
// place, geste fini depuis toujours (`ms` infini).
export function avancerBascule(etat, allume, deltaMs) {
  const cible = allume ? 1 : 0;
  if (!etat) return { de: cible, vers: cible, ms: Infinity };
  // Changement de cible en plein geste (une séquence ratée remet les leviers
  // à zéro pendant que le dernier bascule encore) : le nouveau geste part du
  // point ATTEINT, jamais d'une butée — sinon le manche sauterait.
  if (etat.vers !== cible) return { de: positionBascule(etat), vers: cible, ms: 0 };
  if (etat.ms === Infinity) return etat;
  return { de: etat.de, vers: etat.vers, ms: etat.ms + deltaMs };
}

// Position du manche, 0 = butée éteinte, 1 = butée allumée ; dépasse
// légèrement la butée d'arrivée pendant le geste.
export function positionBascule(etat) {
  const p = Math.min(1, etat.ms / DUREE_BASCULE_MS);
  return etat.de + (etat.vers - etat.de) * easeOutBack(p);
}

// Le voyant s'allume quand le manche touche sa butée, pas avant.
export function voyantAllume(etat) {
  return etat.vers === 1 && etat.ms >= DUREE_BASCULE_MS;
}

// Intensité du halo, 0 à 1. À l'allumage, il monte APRÈS le geste ; à
// l'extinction, il retombe pendant le geste (le voyant est déjà éteint) —
// sauf si le manche n'avait jamais atteint l'état allumé.
export function fonduHalo(etat) {
  if (etat.vers === 1) {
    return Math.min(1, Math.max(0, (etat.ms - DUREE_BASCULE_MS) / DUREE_FONDU_HALO_MS));
  }
  if (etat.de < 1) return 0;
  return Math.max(0, 1 - etat.ms / DUREE_BASCULE_MS);
}

// La combustion (`specs/15` palier B, la torche) : ce qui brûle, quand, et
// combien il en reste. Un objet qui porte `combustion: { duree_ms, phases,
// lumiere, visuel_allume? }` se consume en TEMPS ACTIF, et seulement pendant
// les `phases` du cycle qu'il déclare (la torche : la nuit et l'aube, Xav).
//
// L'inventaire ne connaît que des NOMBRES (`D-118`) : une torche entamée n'a
// pas de place à elle dans la poche. Son temps vit donc à côté, dans
// `save.inventaire.combustion = { [item]: [restant_ms, …] }` — la file des
// objets ENTAMÉS de la poche, la première étant celle qui brûle. Une torche
// neuve n'y figure pas (elle vaut `duree_ms`). Champ absent = rien d'entamé :
// même précédent que `monde.objets_jetes` (`D-145`), aucune migration.
//
// Module PUR : aucune horloge, aucun registre, aucune sauvegarde. Il reçoit
// des listes et des nombres, et rend des listes et des nombres.

// L'objet brûle-t-il à cette phase ? `phase` vaut `null` dans une scène sans
// cycle (la Grotte) : rien n'y brûle, puisque la nuit n'y existe pas.
export function brule(item, phase) {
  return !!(item && item.combustion && phase && item.combustion.phases.includes(phase));
}

// La file d'un objet, telle que la sauvegarde la porte (absent = vide).
export function entamees(combustion, itemId) {
  return (combustion && combustion[itemId]) || [];
}

// Une file ne peut pas compter plus d'objets entamés que la poche n'en
// contient : un objet rangé au coffre, planté ou jeté l'a quittée. Les plus
// ANCIENS entamés restent (la tête de file brûle).
export function normaliser(liste, compte) {
  return liste.filter((r) => r > 0).slice(0, Math.max(0, compte));
}

// Consume `deltaMs` sur l'objet qui brûle (la tête de file, ou un neuf si la
// file est vide). Rend la nouvelle file et le nombre d'objets ÉTEINTS pendant
// ce pas (0 ou 1) — l'appelant le retire de la poche.
export function consumer(liste, dureeMs, deltaMs) {
  const file = liste.length > 0 ? [...liste] : [dureeMs];
  file[0] -= deltaMs;
  if (file[0] <= 0) return { liste: file.slice(1), eteints: 1 };
  return { liste: file, eteints: 0 };
}

// Prendre un objet de la poche (pour le planter) : la tête de file s'il y en
// a une entamée — on plante la torche qu'on tenait —, sinon une neuve.
export function prendre(liste, dureeMs) {
  if (liste.length > 0) return { restantMs: liste[0], liste: liste.slice(1) };
  return { restantMs: dureeMs, liste };
}

// Rendre un objet à la poche (reprendre une torche plantée) avec son temps.
// Entamé, il passe en TÊTE : c'est lui qu'on vient de ramasser, c'est lui
// qu'on rallumera.
export function rendre(liste, restantMs, dureeMs) {
  return restantMs < dureeMs ? [restantMs, ...liste] : liste;
}

// Les FLAMMES à l'écran (`D-218`) : la torche tenue, puis chaque objet planté
// qui brûle — une seule liste, lue par la lumière (le vacillement) et par les
// braises. Deux listes tenues à part avaient chacune leur graine, et chacune
// l'avait tirée de la position du moment.
//
// La graine d'une flamme décale son rythme de celui des autres (deux torches
// voisines ne battent pas ensemble). Elle doit rester FIXE tant que la flamme
// existe : une plantée ne bouge plus, sa position suffit ; la tenue marche
// avec le héros, sa graine est une constante. Tirée de la position du héros,
// elle défilait de 36 à 60 ms de phase par pixel, et la flamme clignotait
// entre 3 et 15 Hz en marchant.
export const GRAINE_FLAMME_TENUE = 0;

// Une graine ∈ [0, 1[ tirée d'une position immobile — ramenée dans [0, 1[
// même pour une coordonnée négative (`%` en garde le signe).
export function grainePosition(x, y) {
  const g = (x * 0.53 + y * 0.29) % 1;
  return g < 0 ? g + 1 : g;
}

// `tenue` : `{ x, y, lumiere }` ou `null` ; `plantes` : `[{ x, y, lumiere }]`,
// `lumiere` à `null` pour un objet éteint (il n'a pas de flamme).
export function flammesAffichees(tenue, plantes) {
  return [
    ...(tenue ? [{ x: tenue.x, y: tenue.y, lumiere: tenue.lumiere, graine: GRAINE_FLAMME_TENUE }] : []),
    ...plantes.filter((p) => p.lumiere)
      .map((p) => ({ x: p.x, y: p.y, lumiere: p.lumiere, graine: grainePosition(p.x, p.y) })),
  ];
}

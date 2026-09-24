// Registre de flags : source unique de vérité pour les déblocages (§3.5).
// Un flag doit être déclaré dans flags.json pour pouvoir être posé. Aucun
// gating ne doit être écrit ailleurs dans le code de jeu.

// `initial` : ids déjà posés à la construction (§3.10 : les flags survivent
// à la sauvegarde). Ne passe pas par `set()` ni `onUnlock` — au chargement,
// la sauvegarde reflète déjà l'état final d'une session précédente, la
// ré-exposer via onUnlock déclencherait à tort ses effets de bord (ex.
// rouvrir un dialogue) à chaque démarrage.
// `valeurs` (specs/07_chaos-nocturne.md §3) : fournisseur de **valeurs
// nommées** que les conditions peuvent comparer — `() => ({ niveau: 5 })`.
// Motif : le palier 1 du Chaos s'ouvre « au niveau 5 », et la spec interdit
// expressément un `if (niveau >= 5)` dans le système d'apparition. Plutôt
// qu'une condition « niveau » en dur, le registre apprend **un type de
// condition de plus**, générique : `{ valeur, min, max }`. Le palier Nv. 10,
// puis une condition sur l'heure ou sur les PV, seront des données, pas du
// code. Le registre reste pur : il ne va chercher le niveau nulle part, on
// le lui donne.
//
// `onRetrait` et `retirer()` (spec 14, palier B) : l'état d'une DESCENTE sous
// la stèle est fait de flags ordinaires, sauvegardés, que l'entrée par la
// stèle remet à zéro. Un flag ne se retirait jamais jusque-là ; c'est le seul
// cas, et il passe par ici pour que la sauvegarde suive (même miroir que
// `onUnlock`, dans l'autre sens).
//
// `forces` (spec 14, palier B, `?flags=a,b`, debug) : des flags TENUS pour
// vrais toute la session, sans être posés. Ils ne passent ni par `onUnlock`
// (la sauvegarde ne les voit pas : fermer l'onglet les efface), ni par
// `retirer` (la remise à zéro d'une descente ne les éteint pas : Xav les a
// demandés pour traverser les salles portes ouvertes). Déclarés ou pas, c'est
// `lireFlagsForces` qui en juge, au démarrage.
export function creerRegistreFlags(registre, {
  mode = 'dev', onUnlock = () => {}, onRetrait = () => {}, initial = [], valeurs = () => ({}), forces = [],
} = {}) {
  const declares = new Set(registre.tous('flags').map((f) => f.id));
  const poses = new Set(initial);
  const tenus = new Set(forces);
  const unlocksTous = registre.tous('unlocks');

  function has(id) {
    return poses.has(id) || tenus.has(id);
  }

  function evaluate(condition) {
    if (typeof condition === 'string') return has(condition);
    if (condition.not !== undefined) return !evaluate(condition.not);
    if (Array.isArray(condition.all)) return condition.all.every(evaluate);
    if (Array.isArray(condition.any)) return condition.any.some(evaluate);
    if (condition.valeur !== undefined) return comparerValeur(condition);
    throw new Error(`condition de flag invalide : ${JSON.stringify(condition)}`);
  }

  // `{ valeur: 'niveau', min: 5 }` — `min` et `max` inclusifs, au moins l'un
  // des deux requis. Une valeur inconnue suit exactement la discipline de
  // `set()` pour un flag non déclaré : elle explose en dev (on veut le voir
  // tout de suite) et vaut **faux** en prod. Faux, et pas vrai : une
  // condition qu'on ne sait pas évaluer ne doit pas débloquer.
  //
  // `{ valeur: 'a_portee', egal: 'stele_grotte' }` (spec 14, `Q-137`) : une
  // valeur qui n'est pas un nombre mais un NOM (l'interactif à portée du
  // héros), comparée par égalité. `null` est une valeur légitime (« rien à
  // portée ») : seule une valeur ABSENTE des valeurs fournies est inconnue.
  function comparerValeur(condition) {
    const courantes = valeurs() || {};
    const valeur = courantes[condition.valeur];
    if (condition.egal !== undefined) {
      if (!(condition.valeur in courantes)) {
        const message = `valeur "${condition.valeur}" inconnue dans une condition`;
        if (mode === 'dev') throw new Error(message);
        console.warn(message);
        return false;
      }
      return valeur === condition.egal;
    }
    if (typeof valeur !== 'number') {
      const message = `valeur "${condition.valeur}" inconnue dans une condition`;
      if (mode === 'dev') throw new Error(message);
      console.warn(message);
      return false;
    }
    if (condition.min === undefined && condition.max === undefined) {
      throw new Error(`condition sur valeur sans min ni max : ${JSON.stringify(condition)}`);
    }
    if (condition.min !== undefined && valeur < condition.min) return false;
    if (condition.max !== undefined && valeur > condition.max) return false;
    return true;
  }

  function reevaluerUnlocks() {
    for (const unlock of unlocksTous) {
      if (!poses.has(unlock.target) && evaluate(unlock.condition)) {
        set(unlock.target, { viaUnlock: true });
      }
    }
  }

  function set(id, { viaUnlock = false } = {}) {
    if (!declares.has(id)) {
      const message = `flag "${id}" non déclaré dans flags.json`;
      if (mode === 'dev') throw new Error(message);
      console.warn(message);
      return;
    }
    const estNouveau = !poses.has(id);
    poses.add(id);
    if (estNouveau) {
      onUnlock(id);
      if (!viaUnlock) reevaluerUnlocks();
    }
  }

  // Retire des flags POSÉS (jamais les flags tenus par `forces`). Aucun
  // unlock n'est réévalué : un retrait ne débloque rien. Un flag cible d'un
  // unlock reviendrait au prochain `set()` — `schemas.js` refuse donc qu'un
  // flag de descente soit la cible d'un unlock.
  function retirer(ids) {
    for (const id of ids) {
      if (!poses.has(id)) continue;
      poses.delete(id);
      onRetrait(id);
    }
  }

  return { set, has, evaluate, retirer };
}

// `?flags=a,b` (spec 14, palier B : « traverser les trois salles, portes
// forcées par debug ») — patron de `alignement.js#lireAlignementForce` : pur,
// lu une seule fois au démarrage. Un id que `flags.json` ne déclare pas est
// ÉCARTÉ et dit, jamais tenu en silence : un nom mal tapé laisserait Xav
// devant une porte fermée sans savoir pourquoi.
export function lireFlagsForces(search, registre) {
  if (!search) return { ids: [], avertissement: null };
  const brut = new URLSearchParams(search).get('flags');
  if (brut === null) return { ids: [], avertissement: null };
  const demandes = brut.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
  const connus = new Set(registre.tous('flags').map((f) => f.id));
  const ids = demandes.filter((id) => connus.has(id));
  const inconnus = demandes.filter((id) => !connus.has(id));
  return {
    ids,
    avertissement: inconnus.length > 0
      ? `?flags : ${inconnus.join(', ')} ignoré(s), absent(s) de flags.json.`
      : null,
  };
}

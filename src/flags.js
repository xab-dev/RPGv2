// Registre de flags : source unique de vérité pour les déblocages (§3.5).
// Un flag doit être déclaré dans flags.json pour pouvoir être posé. Aucun
// gating ne doit être écrit ailleurs dans le code de jeu.

// `initial` : ids déjà posés à la construction (§3.10 : les flags survivent
// à la sauvegarde). Ne passe pas par `set()` ni `onUnlock` — au chargement,
// la sauvegarde reflète déjà l'état final d'une session précédente, la
// ré-exposer via onUnlock déclencherait à tort ses effets de bord (ex.
// rouvrir un dialogue) à chaque démarrage.
export function creerRegistreFlags(registre, { mode = 'dev', onUnlock = () => {}, initial = [] } = {}) {
  const declares = new Set(registre.tous('flags').map((f) => f.id));
  const poses = new Set(initial);
  const unlocksTous = registre.tous('unlocks');

  function has(id) {
    return poses.has(id);
  }

  function evaluate(condition) {
    if (typeof condition === 'string') return has(condition);
    if (condition.not !== undefined) return !evaluate(condition.not);
    if (Array.isArray(condition.all)) return condition.all.every(evaluate);
    if (Array.isArray(condition.any)) return condition.any.some(evaluate);
    throw new Error(`condition de flag invalide : ${JSON.stringify(condition)}`);
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

  return { set, has, evaluate };
}

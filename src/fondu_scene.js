// Le FONDU d'un changement de scène (spec 14, palier H, `Q-153`) : l'écran
// descend au noir, la scène change au plus noir, puis l'écran remonte. Un
// portail n'en a que s'il le DÉCLARE (`fondu_ms`) : Xav n'en veut pas entre
// les salles de l'Annexe, seulement à sa sortie, vers la stèle rouge.
//
// Pur : ni canvas, ni horloge. `main.js` gèle le jeu tant qu'un fondu court,
// change de scène quand `changerMaintenant` le dit, une seule fois, et dessine
// un voile noir d'opacité `alphaFondu`.

export function creerFondu(dureeMs, destination) {
  return { dureeMs, ms: 0, destination, change: false };
}

// Avance de `deltaMs`. `changerMaintenant` est vrai à la SEULE frame où le
// fondu passe sa moitié : l'appelant change de scène à ce moment-là, sous un
// écran noir. `termine` : le fondu est fini, l'appelant le retire.
export function avancerFondu(fondu, deltaMs) {
  const ms = fondu.ms + deltaMs;
  const changerMaintenant = !fondu.change && ms >= fondu.dureeMs / 2;
  return {
    fondu: { ...fondu, ms, change: fondu.change || changerMaintenant },
    changerMaintenant,
    termine: ms >= fondu.dureeMs,
  };
}

// L'opacité du voile noir : monte jusqu'à 1 à mi-course, puis redescend.
export function alphaFondu(fondu) {
  const moitie = fondu.dureeMs / 2;
  if (moitie <= 0) return 0;
  const t = fondu.ms <= moitie ? fondu.ms / moitie : 1 - (fondu.ms - moitie) / moitie;
  return Math.max(0, Math.min(1, t));
}

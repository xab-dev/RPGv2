// Caméra : suit le héros, se borne aux limites de la scène. Si une
// dimension de la scène est plus petite que le viewport, cette dimension
// est centrée plutôt que bornée (cf. bug V1 Phase 16, à ne pas reproduire).

export function calculerCamera({ cibleX, cibleY, largeurScene, hauteurScene, largeurVue, hauteurVue }) {
  let x;
  if (largeurScene <= largeurVue) {
    x = (largeurScene - largeurVue) / 2;
  } else {
    x = Math.max(0, Math.min(cibleX - largeurVue / 2, largeurScene - largeurVue));
  }

  let y;
  if (hauteurScene <= hauteurVue) {
    y = (hauteurScene - hauteurVue) / 2;
  } else {
    y = Math.max(0, Math.min(cibleY - hauteurVue / 2, hauteurScene - hauteurVue));
  }

  return { x, y };
}

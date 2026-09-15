// Boucle de rendu : requestAnimationFrame + dessin canvas. Le plafond de
// delta-time est isolé dans une fonction pure testable ; le dessin canvas
// lui-même n'est jamais exercé en headless (contrainte de méthode : le
// rendu revient à Xav dans un vrai navigateur).

const DELTA_MAX_MS = 100; // provisoire : une frame ne rattrape jamais plus de 100 ms

export function plafonnerDelta(deltaMs) {
  return Math.min(deltaMs, DELTA_MAX_MS);
}

export function creerBoucle({ maj, dessiner }) {
  let dernierT = null;
  let enCours = false;

  function frame(tMs) {
    if (!enCours) return;
    if (dernierT === null) dernierT = tMs;
    const delta = plafonnerDelta(tMs - dernierT);
    dernierT = tMs;
    maj(delta);
    dessiner();
    requestAnimationFrame(frame);
  }

  return {
    demarrer() {
      enCours = true;
      dernierT = null;
      requestAnimationFrame(frame);
    },
    arreter() {
      enCours = false;
    },
  };
}

// Dessine scène + décor + héros sur un contexte canvas 2D. Jamais appelé
// depuis les tests headless.
export function dessinerScene(ctx, { scene, decor, camera, hero }) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const tuile = scene.tuileA(x, y);
      const px = x * scene.tileSize - camera.x;
      const py = y * scene.tileSize - camera.y;
      ctx.fillStyle = tuile.render.valeur;
      ctx.fillRect(px, py, scene.tileSize, scene.tileSize);
    }
  }

  ctx.fillStyle = '#c9a23a';
  for (const motif of decor) {
    ctx.fillRect(motif.x - camera.x - 1.5, motif.y - camera.y - 1.5, 3, 3);
  }

  ctx.fillStyle = '#eeeeee';
  ctx.beginPath();
  ctx.arc(hero.x - camera.x, hero.y - camera.y, hero.rayon, 0, Math.PI * 2);
  ctx.fill();
}

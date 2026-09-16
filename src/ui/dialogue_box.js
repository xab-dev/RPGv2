// Rendu de la boîte de dialogue (§3.7), en bas de l'écran logique. Jamais
// exercé par les tests headless (dessin canvas). `ligne` vient de
// dialogue.js#resoudreLignes — déjà traduite, jamais de texte en dur ici.

import { RESOLUTION_LOGIQUE } from '../render.js';

export function dessinerDialogue(ctx, ligne) {
  if (!ligne) return;

  // Diagnostic SD_dialogues-invisibles_2026-09-15 : `ctx.canvas.width/height`
  // est la taille PHYSIQUE du canvas hors-écran depuis le MT rendu-net
  // (redimensionné par ajusterCanvasLogiquePhysique), pas la résolution
  // logique — or ce dessin reste sous la transform logique->physique (f)
  // encore active. Lire la taille physique ici doublait la mise à l'échelle
  // et sortait la boîte entièrement du canvas visible.
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  const boiteHauteur = 70;
  const y = hauteur - boiteHauteur - 8;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  ctx.fillRect(8, y, largeur - 16, boiteHauteur);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(8, y, largeur - 16, boiteHauteur);

  ctx.fillStyle = '#c2a83e';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(ligne.locuteur, 18, y + 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText(ligne.texte, 18, y + 28);

  // Marqueur d'armement (§3.2 03_grotte-polish, mécanisme 3) : un triangle
  // DESSINÉ (jamais une chaîne "▼", cf. contrainte "zéro chaîne en dur" —
  // ce n'est pas du texte localisable) en bas à droite de la boîte,
  // uniquement quand la ligne est avançable. Absent tant que la machine à
  // écrire tourne ou que le délai d'armement n'est pas écoulé.
  if (ligne.arme) {
    const cx = largeur - 8 - 10;
    const cy = y + boiteHauteur - 10;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 3);
    ctx.lineTo(cx + 5, cy - 3);
    ctx.lineTo(cx, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

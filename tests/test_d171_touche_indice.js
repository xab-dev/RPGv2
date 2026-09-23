// Contrat `D-171` : dans la bannière d'un indice de commande, la touche se
// distingue de l'action (un creux au liseré d'or, le glyphe en or) SANS que
// la bannière change de largeur — le bouton MENU tactile, collé à droite, en
// dépend (`test_d17`). Une annonce du jeu (aucun glyphe) n'a pas de touche.
// Structurel seulement (faux contexte) : le rendu se juge dans Chrome.
import assert from 'node:assert/strict';
import { dessinerHudHints } from '../src/ui/hud_hints.js';
import { ACCENT } from '../src/ui/cadre.js';

const LARGEUR_CAR = 6; // une mesure factice, la même pour tout caractère : l'écart se lit en pixels
class FauxCtx {
  constructor() { this.registre = []; this.fillStyle = null; }
  save() {} restore() {} beginPath() {} closePath() {} moveTo() {} arcTo() {}
  fill() { this.registre.push({ type: 'fill' }); }
  stroke() { this.registre.push({ type: 'stroke' }); }
  fillRect() {}
  fillText(texte, x) { this.registre.push({ type: 'fillText', texte, x, couleur: this.fillStyle }); }
  measureText(t) { return { width: t.length * LARGEUR_CAR }; }
  createLinearGradient() { return { addColorStop() {} }; }
}
const indice = (glyphe, texte) => ({ glyphe, texte, resteMs: 1000, dureeMs: 2000 });
function dessiner(glyphe, texte) {
  const ctx = new FauxCtx();
  dessinerHudHints(ctx, indice(glyphe, texte));
  return ctx.registre;
}

{
  const reg = dessiner('Stick gauche', 'Se déplacer');
  const [g, t] = reg.filter((e) => e.type === 'fillText');
  assert.equal(g.texte, 'Stick gauche');
  assert.equal(g.couleur, ACCENT, 'le glyphe est dans l\'or de la famille');
  assert.equal(t.couleur, '#ffffff', 'l\'action reste blanche');
  // L'écart glyphe → action = les deux espaces de l'ancienne composition :
  // la bannière garde sa largeur d'avant, au pixel.
  assert.equal(t.x - (g.x + g.texte.length * LARGEUR_CAR), 2 * LARGEUR_CAR);
  // Cadre (fill + stroke) puis touche (fill + stroke).
  assert.equal(reg.filter((e) => e.type === 'stroke').length, 2, 'le cadre et la touche');
}
{
  const reg = dessiner('', 'Graphismes : Bas');
  assert.equal(reg.filter((e) => e.type === 'stroke').length, 1, 'une annonce n\'a pas de touche');
  assert.equal(reg.filter((e) => e.type === 'fillText').length, 1);
}
console.log('OK test_d171_touche_indice');

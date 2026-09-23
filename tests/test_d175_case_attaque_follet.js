// Contrat `D-175` : le contour de la case d'attaque prend la couleur du
// follet choisi (celle de `companions.json#render.couleur`, lue sur le
// compagnon actif) ; sans follet, l'or d'avant. Seule la couleur change :
// les autres cases, et tout le reste de la barre, sont identiques.
// Structurel (faux contexte) : le rendu se juge dans Chrome.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dessinerHud } from '../src/ui/hud.js';

class FauxCtx {
  constructor() { this.registre = []; this.strokeStyle = null; }
  save() {} restore() {} translate() {} scale() {} rotate() {} setTransform() {} transform() {}
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arc() {} arcTo() {} ellipse() {} rect() {} clip() {}
  fill() {}
  stroke() { this.registre.push({ type: 'stroke', couleur: this.strokeStyle }); }
  fillRect() {}
  strokeRect(x, y, w, h) { this.registre.push({ type: 'strokeRect', w, h, couleur: this.strokeStyle }); }
  fillText() {}
  measureText(t) { return { width: String(t).length * 5 }; }
  drawImage() {}
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
}
function contours(companion, tactileActif = false) {
  const ctx = new FauxCtx();
  dessinerHud(ctx, {
    i18n: { t: (c) => c }, pv: 10, pvMax: 10, eclats: 0, companion, visuelFollet: null,
    verbesActions: ['attack', 'consume'], tactileActif,
  });
  return ctx.registre.filter((e) => (tactileActif ? e.type === 'stroke' : e.type === 'strokeRect' && e.w === e.h));
}

// Les vraies couleurs du catalogue : un test qui inventerait les siennes ne
// dirait rien du jeu.
const compagnons = JSON.parse(fs.readFileSync(new URL('../data/companions.json', import.meta.url), 'utf8'));
const sans = contours(null);
for (const tactile of [false, true]) {
  const reference = contours(null, tactile);
  for (const c of compagnons) {
    const avec = contours(c, tactile);
    assert.equal(avec.length, reference.length);
    // Au plus un contour change (aucun si le follet est déjà de l'or d'avant),
    // et la couleur du follet est bien dessinée.
    const changes = avec.filter((e, k) => e.couleur !== reference[k].couleur);
    assert.ok(changes.length <= 1, `${c.id} : seule la case d'attaque change`);
    assert.ok(avec.some((e) => e.couleur === c.render.couleur), `${c.id} : ${c.render.couleur} est dessinée`);
  }
}
// Sans follet, l'or d'avant, que la bulle et les indices partagent.
assert.ok(sans.some((e) => e.couleur === '#c2a83e'), 'sans follet, la case d\'attaque reste dorée');
console.log('OK test_d175_case_attaque_follet');

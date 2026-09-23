// Contrat `D-176` : le bouton MENU tactile porte un engrenage en filigrane.
//   1. l'id vient des DONNÉES (`glyphes.json`, `tactile_icone` du verbe
//      `menu` — comment le verbe se montre au doigt), vérifié au boot ;
//   2. il n'est dessiné qu'au tactile, dans le bouton MENU, en filigrane
//      (alpha < 1), et sans dépendre d'un preset graphique — il est donc là
//      en Bas : `dessinerHud` ne reçoit aucun preset ;
//   3. absent, le bouton reste nu, sans erreur.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validerCatalogues } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { dessinerHud } from '../src/ui/hud.js';
import { BOUTON_MENU, ICONE_BOUTON_TACTILE } from '../src/ui/hud_layout.js';

const { donnees } = await chargerCataloguesDepuisDisque(new URL('../data', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), Object.keys(SCHEMAS));
const glypheMenu = donnees.glyphes.find((g) => g.verbe === 'menu');
const engrenage = donnees.visuels.find((v) => v.id === glypheMenu.tactile_icone);
assert.ok(engrenage, 'le verbe menu déclare une icône tactile qui existe');

// 1. Le boot refuse une icône inconnue, avec son chemin.
{
  const copie = structuredClone(donnees);
  copie.glyphes.find((g) => g.verbe === 'menu').tactile_icone = 'visuel_absent';
  const erreurs = validerCatalogues(copie);
  assert.ok(erreurs.some((e) => /tactile_icone/.test(e) && /visuel_absent/.test(e)), 'une icône tactile inconnue est refusée au boot');
}

// 2 et 3. Un faux contexte qui note où et avec quel alpha on dessine.
class FauxCtx {
  constructor() { this.registre = []; this.globalAlpha = 1; this._t = [0, 0]; this._pile = []; }
  save() { this._pile.push({ a: this.globalAlpha, t: [...this._t] }); }
  restore() { const e = this._pile.pop(); if (e) { this.globalAlpha = e.a; this._t = e.t; } }
  translate(x, y) { this._t = [this._t[0] + x, this._t[1] + y]; }
  scale() {} rotate() {} setTransform() {} transform() {}
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arc() {} arcTo() {} ellipse() {} rect() {} clip() {}
  fill() { this.registre.push({ type: 'fill', alpha: this.globalAlpha, t: [...this._t] }); }
  stroke() {} strokeRect() {} fillText() {} drawImage() {}
  fillRect() { this.registre.push({ type: 'fill', alpha: this.globalAlpha, t: [...this._t] }); }
  measureText(t) { return { width: String(t).length * 5 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
}
function remplissages(options) {
  const ctx = new FauxCtx();
  dessinerHud(ctx, { i18n: { t: (c) => c }, pv: 1, pvMax: 1, eclats: 0, companion: null, verbesActions: [], ...options });
  return ctx.registre;
}
const auCentreDuMenu = (e) => e.t[0] === BOUTON_MENU.cx && e.t[1] === BOUTON_MENU.cy;
{
  const avec = remplissages({ tactileActif: true, iconesBoutons: { menu: engrenage } }).filter(auCentreDuMenu);
  assert.ok(avec.length > 0, 'l\'engrenage est dessiné au centre du bouton MENU');
  // Rien au-dessus du filigrane : une primitive peut porter son propre alpha
  // (le moyeu), qui s'y multiplie.
  assert.ok(ICONE_BOUTON_TACTILE.alpha < 1);
  assert.ok(avec.every((e) => e.alpha <= ICONE_BOUTON_TACTILE.alpha), 'en filigrane');
  assert.ok(avec.some((e) => e.alpha === ICONE_BOUTON_TACTILE.alpha));
  assert.equal(remplissages({ tactileActif: true }).filter(auCentreDuMenu).length, 0, 'sans icône, le bouton reste nu');
  assert.equal(remplissages({ tactileActif: false, iconesBoutons: { menu: engrenage } }).filter(auCentreDuMenu).length, 0, 'jamais hors tactile');
}
// `main.js` le lit dans `glyphes.json`, une seule fois.
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(main, /registre\.tous\('glyphes'\)[\s\S]{0,80}tactile_icone/);
console.log('OK test_d176_engrenage_menu');

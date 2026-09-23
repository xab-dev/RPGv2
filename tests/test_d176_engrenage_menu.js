// Contrat `D-176` : le bouton MENU tactile porte un engrenage en filigrane.
//   1. l'id vient des DONNÉES (`menus.json`, racine, `icone_bouton`), exigé et
//      vérifié au boot comme les icônes d'en-tête ;
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
import { BOUTON_MENU, ICONE_BOUTON_MENU } from '../src/ui/hud_layout.js';

const { donnees } = await chargerCataloguesDepuisDisque(new URL('../data', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), Object.keys(SCHEMAS));
const racine = donnees.menus.find((e) => e.racine);
const engrenage = donnees.visuels.find((v) => v.id === racine.icone_bouton);
assert.ok(engrenage, 'la racine du menu déclare une icône de bouton qui existe');

// 1. Le boot refuse une racine sans icône de bouton, ou une icône inconnue.
for (const [casse, motif] of [[(r) => { delete r.icone_bouton; }, /exige "icone_bouton"/], [(r) => { r.icone_bouton = 'visuel_absent'; }, /icone_bouton > "visuel_absent" introuvable/]]) {
  const copie = structuredClone(donnees);
  casse(copie.menus.find((e) => e.racine));
  const erreurs = validerCatalogues(copie);
  assert.ok(erreurs.some((e) => motif.test(e)), `refusé : ${motif}`);
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
  const avec = remplissages({ tactileActif: true, iconeBoutonMenu: engrenage }).filter(auCentreDuMenu);
  assert.ok(avec.length > 0, 'l\'engrenage est dessiné au centre du bouton MENU');
  // Rien au-dessus du filigrane : une primitive peut porter son propre alpha
  // (le moyeu), qui s'y multiplie.
  assert.ok(ICONE_BOUTON_MENU.alpha < 1);
  assert.ok(avec.every((e) => e.alpha <= ICONE_BOUTON_MENU.alpha), 'en filigrane');
  assert.ok(avec.some((e) => e.alpha === ICONE_BOUTON_MENU.alpha));
  assert.equal(remplissages({ tactileActif: true }).filter(auCentreDuMenu).length, 0, 'sans icône, le bouton reste nu');
  assert.equal(remplissages({ tactileActif: false, iconeBoutonMenu: engrenage }).filter(auCentreDuMenu).length, 0, 'jamais hors tactile');
}
// `main.js` le lit sur la racine, une seule fois.
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(main, /\.find\(\(e\) => e\.racine\)\.icone_bouton/);
console.log('OK test_d176_engrenage_menu');

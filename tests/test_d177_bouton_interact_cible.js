// Contrat `D-177` : au tactile, le bouton INTERACT montre CE QU'IL VA TOUCHER.
//   1. Une seule source de « la cible » : `main.js#cibleInteraction`, lue par
//      l'appui (`essayerInteraction`) ET par le dessin du bouton — jamais deux
//      calculs, qui finiraient par montrer un coffre et ouvrir un levier.
//   2. Sans cible, le bouton porte son icône déclarée en données
//      (`glyphes.json#tactile_icone` du verbe `interact`, l'onde), en
//      filigrane ; avec une cible, sa silhouette la remplace.
//   3. Le recadrage (`icone_canvas.js#cadrer`) tient compte de la pièce
//      mobile d'un levier : le manche ne sort pas de la boîte.
// Le comportement de l'appui lui-même (levier, station, objet, ressource) est
// tenu par les tests d'interaction existants, restés verts au découpage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { dessinerHud } from '../src/ui/hud.js';
import { cadrer } from '../src/ui/icone_canvas.js';
import { BOUTON_INTERACT, ICONE_BOUTON_TACTILE, ICONE_CIBLE_TACTILE } from '../src/ui/hud_layout.js';
import { empreinteParDefaut } from '../src/structures.js';
import { echelleVisuel } from '../src/visuels.js';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
const visuel = (id) => donnees.visuels.find((v) => v.id === id);

// 1. Une seule source.
{
  const main = fs.readFileSync(path.join(racine, 'src', 'main.js'), 'utf8');
  const corps = main.slice(main.indexOf('function essayerInteraction()'), main.indexOf('function essayerStation('));
  assert.match(corps, /const cible = cibleInteraction\(\);/, 'l\'appui lit cibleInteraction');
  assert.doesNotMatch(corps, /trouver(ObjetJete|Item|Ressource)Proche\(/, 'l\'appui ne cherche plus sa cible lui-même');
  assert.match(main, /visuelCibleInteraction\(cibleInteraction\(\)\)/, 'le bouton lit la même fonction');
}

// 2. L'onde en données, puis ce que le bouton dessine.
const glyphe = donnees.glyphes.find((g) => g.verbe === 'interact');
const onde = visuel(glyphe.tactile_icone);
assert.ok(onde, 'le verbe interact déclare une icône tactile qui existe');

class FauxCtx {
  constructor() { this.registre = []; this.globalAlpha = 1; this._t = [0, 0]; this._pile = []; }
  save() { this._pile.push({ a: this.globalAlpha, t: [...this._t] }); }
  restore() { const e = this._pile.pop(); if (e) { this.globalAlpha = e.a; this._t = e.t; } }
  translate(x, y) { this._t = [this._t[0] + x, this._t[1] + y]; }
  scale() {} rotate() {} setTransform() {} transform() {}
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arc() {} arcTo() {} ellipse() {} rect() {} clip() {}
  fill() { this.registre.push({ alpha: this.globalAlpha, t: [...this._t] }); }
  fillRect() { this.registre.push({ alpha: this.globalAlpha, t: [...this._t] }); }
  stroke() {} strokeRect() {} fillText() {} drawImage() {}
  measureText(t) { return { width: String(t).length * 5 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
}
// Ce qui est peint DANS le bouton INTERACT (hors son fond, peint sans translate).
function peintDansLeBouton(options) {
  const ctx = new FauxCtx();
  dessinerHud(ctx, {
    i18n: { t: (c) => c }, pv: 1, pvMax: 1, eclats: 0, companion: null, verbesActions: [],
    tactileActif: true, iconesBoutons: { interact: onde }, ...options,
  });
  return ctx.registre.filter((e) => Math.hypot(e.t[0] - BOUTON_INTERACT.cx, e.t[1] - BOUTON_INTERACT.cy) < BOUTON_INTERACT.rayon);
}
{
  const sansCible = peintDansLeBouton({});
  assert.ok(sansCible.length > 0, 'sans cible, l\'onde est dessinée');
  assert.ok(sansCible.every((e) => e.alpha <= ICONE_BOUTON_TACTILE.alpha), 'l\'onde est en filigrane');
  const coffre = visuel(donnees.puzzles.find((p) => p.id === 'station_coffre').render.visuel);
  const avecCible = peintDansLeBouton({ iconesCibles: { interact: { visuel: coffre, pieceMobile: null } } });
  assert.ok(avecCible.length > 0, 'la cible est dessinée');
  assert.ok(avecCible.some((e) => e.alpha === ICONE_CIBLE_TACTILE.alpha), 'à l\'alpha de la cible');
  assert.ok(avecCible.every((e) => e.alpha !== ICONE_BOUTON_TACTILE.alpha || ICONE_BOUTON_TACTILE.alpha === ICONE_CIBLE_TACTILE.alpha),
    'la cible REMPLACE l\'onde, elle ne s\'y superpose pas');
}

// 3. Le manche du levier tient dans la boîte de recadrage.
{
  const levierPuzzle = donnees.puzzles.find((p) => p.type === 'levier');
  const socle = visuel(levierPuzzle.render.visuel);
  assert.ok(socle.piece_mobile, 'le levier du catalogue a une pièce mobile');
  const manche = visuel(socle.piece_mobile.visuel);
  const cote = ICONE_CIBLE_TACTILE.taille;
  for (const angle of socle.piece_mobile.angles) {
    const pieceMobile = { visuel: manche, pivot: socle.piece_mobile.pivot, angle };
    const c = cadrer(socle, cote, pieceMobile);
    const b = empreinteParDefaut(manche, echelleVisuel(manche));
    const rad = (angle * Math.PI) / 180;
    for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) {
      const ux = pieceMobile.pivot[0] + x * Math.cos(rad) - y * Math.sin(rad);
      const uy = pieceMobile.pivot[1] + x * Math.sin(rad) + y * Math.cos(rad);
      const px = c.x + ux * c.echelle;
      const py = c.y + uy * c.echelle;
      assert.ok(px >= -1e-6 && px <= cote + 1e-6 && py >= -1e-6 && py <= cote + 1e-6,
        `angle ${angle} : un coin du manche sort de la boîte (${px.toFixed(1)}, ${py.toFixed(1)}) sur ${cote}`);
    }
  }
  // Sans pièce mobile, le cadrage d'avant, au pixel.
  assert.deepEqual(cadrer(socle, cote, null), cadrer(socle, cote));
}
console.log('OK test_d177_bouton_interact_cible');

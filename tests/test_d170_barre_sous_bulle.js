// Contrat (polish libre du 23/09) : la barre des cases du bas se tait sous
// une bulle de dialogue. Les deux occupent la même bande au pied de l'écran,
// et la bulle est un cadre translucide : dessinées ensemble, les cases
// transparaissaient sous le texte et leur liseré dépassait sous le cadre
// (vu à la capture Chrome, `monstre_grotte`, 1920 × 1080).
//
// Ce qui se teste ici est structurel (faux contexte, aucun pixel) :
//   1. la raison du contrat tient encore — la barre est DANS la bulle ; le
//      jour où l'une des deux géométries bouge, ce test dit que la règle est
//      peut-être devenue inutile, au lieu de la laisser vivre sans motif ;
//   2. `barreActions: false` retire les cases, et rien d'autre du HUD ;
//   3. les boutons tactiles restent dessinés : ils montent au-dessus de la
//      bulle et le doigt doit les voir là où ils répondent ;
//   4. main.js lit l'état de la bulle à la même source que son dessin.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dessinerHud } from '../src/ui/hud.js';
import { geometrieBoiteDialogue } from '../src/ui/hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';

class FauxCtx {
  constructor() { this.registre = []; }
  save() {} restore() {} translate() {} scale() {} rotate() {} setTransform() {} transform() {}
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arc() {} arcTo() {} ellipse() {}
  fill() { this.registre.push({ type: 'fill' }); }
  stroke() { this.registre.push({ type: 'stroke' }); }
  rect() {} clip() {}
  fillRect(x, y, w, h) { this.registre.push({ type: 'fillRect', x, y, w, h }); }
  strokeRect(x, y, w, h) { this.registre.push({ type: 'strokeRect', x, y, w, h }); }
  fillText(texte) { this.registre.push({ type: 'fillText', texte }); }
  measureText(t) { return { width: String(t).length * 5 }; }
  drawImage() {}
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
}

const VERBES = ['attack', 'consume'];
function dessiner(options) {
  const ctx = new FauxCtx();
  dessinerHud(ctx, {
    i18n: { t: (c) => c }, pv: 10, pvMax: 10, eclats: 0, companion: null,
    verbesActions: VERBES, tactileActif: false, ...options,
  });
  return ctx.registre;
}
// Une case se reconnaît à son contour CARRÉ dans la moitié basse de l'écran
// (le bandeau du haut trace aussi des contours, jamais carrés ni en bas).
const cases = (registre) => registre.filter(
  (e) => e.type === 'strokeRect' && e.w === e.h && e.y > RESOLUTION_LOGIQUE.hauteur / 2,
);

// 1. La raison : chaque case tient dans la bulle la plus basse (sans option).
{
  const reg = dessiner({});
  const lesCases = cases(reg);
  assert.equal(lesCases.length, VERBES.length, 'une case par verbe visible');
  const { boite } = geometrieBoiteDialogue(0, RESOLUTION_LOGIQUE);
  for (const c of lesCases) {
    assert.ok(
      c.x >= boite.x && c.x + c.w <= boite.x + boite.largeur
        && c.y >= boite.y && c.y + c.h <= boite.y + boite.hauteur,
      `la case (${c.x}, ${c.y}) n'est plus sous la bulle : la règle « barre tue sous la bulle » a peut-être perdu son motif`,
    );
  }
}

// 2. `barreActions: false` retire les cases, et seulement elles.
{
  const avec = dessiner({});
  const sans = dessiner({ barreActions: false });
  assert.equal(cases(sans).length, 0, 'aucune case sous la bulle');
  const textes = (r) => r.filter((e) => e.type === 'fillText').map((e) => e.texte);
  assert.deepEqual(textes(sans), textes(avec), 'le reste du HUD (PV, niveau…) est inchangé');
}

// 3. Le tactile ne dépend pas de ce drapeau.
{
  const avec = dessiner({ tactileActif: true });
  const sans = dessiner({ tactileActif: true, barreActions: false });
  assert.ok(avec.length > 0);
  assert.deepEqual(sans, avec, 'les boutons tactiles se dessinent à l\'identique, bulle ou pas');
}

// 4. Une seule source : l'état de la bulle que main.js dessine.
{
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /barreActions:\s*!dialogue\.estOuvert\(\)/, 'main.js tait la barre sur dialogue.estOuvert(), la source du dessin de la bulle');
  // `D-172` : même règle pendant le placement, lue sur l'état qui gèle le
  // jeu et lève le bandeau d'aide.
  assert.match(main, /barreActions:[^\n]*!constructionActif\(\)/, 'main.js tait la barre pendant le placement');
}

console.log('OK test_d170_barre_sous_bulle');

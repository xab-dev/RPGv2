// Contrat (03_grotte-polish §3.3, palier 2) : dessinerVisuel() interprète
// visuels.json — ordre des primitives (ombre AVANT le corps), teinte
// appliquée aux seules primitives `teinte: true`, forme inconnue = échec dur.
// Faux ctx enregistreur (patron test_phase1_sd_dialogues_invisibles) :
// aucun pixel réel produit, seulement l'ordre des appels et leurs styles/
// positions résolus — le rendu canvas n'est jamais exercé en headless
// (contrainte de méthode).
import assert from 'node:assert/strict';
import { dessinerVisuel } from '../src/visuels.js';
import { SCHEMAS } from '../src/schemas.js';

// --- Faux ctx 2D : transform affine composée (translate/rotate/scale),
// chaque fill/stroke terminal enregistré avec son fillStyle/strokeStyle et
// sa position déjà transformée en repère "monde" (celui de l'appel racine
// dessinerVisuel), pour vérifier l'ORDRE et la POSITION réels, pas juste le
// nombre d'appels. ---
class FauxCtx2D {
  constructor() {
    this._transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    this._pile = [];
    this._alphaPile = [];
    this.globalAlpha = 1;
    this.fillStyle = null;
    this.strokeStyle = null;
    this.lineWidth = null;
    this.registre = [];
  }
  transform(a2, b2, c2, d2, e2, f2) {
    const t = this._transform;
    this._transform = {
      a: t.a * a2 + t.c * b2,
      b: t.b * a2 + t.d * b2,
      c: t.a * c2 + t.c * d2,
      d: t.b * c2 + t.d * d2,
      e: t.a * e2 + t.c * f2 + t.e,
      f: t.b * e2 + t.d * f2 + t.f,
    };
  }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(rad) { this.transform(Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 0, 0); }
  save() {
    this._pile.push({ ...this._transform });
    this._alphaPile.push(this.globalAlpha);
  }
  restore() {
    this._transform = this._pile.pop() || this._transform;
    this.globalAlpha = this._alphaPile.pop() ?? this.globalAlpha;
  }
  origineMonde() {
    const t = this._transform;
    return { x: t.e, y: t.f };
  }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  ellipse() {}
  fillRect(x, y, w, h) {
    const { x: ox, y: oy } = this.origineMonde();
    this.registre.push({ type: 'fillRect', x: ox + x, y: oy + y, w, h, fillStyle: this.fillStyle, alpha: this.globalAlpha });
  }
  fill() {
    const { x, y } = this.origineMonde();
    this.registre.push({ type: 'fill', x, y, fillStyle: this.fillStyle, alpha: this.globalAlpha });
  }
  stroke() {
    const { x, y } = this.origineMonde();
    this.registre.push({ type: 'stroke', x, y, strokeStyle: this.strokeStyle, alpha: this.globalAlpha });
  }
  createRadialGradient() {
    return { addColorStop() {} };
  }
  createLinearGradient() {
    return { addColorStop() {} };
  }
}

const visuelMinimal = (primitives, extra = {}) => ({ ancre: 'centre', primitives, ...extra });

// ===== 1. Ordre des primitives + ombre dessinée AVANT le corps =====
{
  const ctx = new FauxCtx2D();
  const visuel = visuelMinimal(
    [
      { forme: 'cercle', dx: 0, dy: 0, w: 20, couleur: '#111111' },
      { forme: 'cercle', dx: 2, dy: -2, w: 4, couleur: '#222222' },
    ],
    { ombre: { dy: 8, w: 10, h: 3, alpha: 0.3 } },
  );
  dessinerVisuel(ctx, visuel, 100, 50);

  assert.equal(ctx.registre.length, 3, 'ombre + 2 primitives = 3 dessins terminaux');
  const [ombre, corps, accent] = ctx.registre;
  assert.equal(ombre.fillStyle, 'rgba(0, 0, 0, 0.3)', 'l\'ombre est un remplissage noir translucide');
  assert.deepEqual({ x: ombre.x, y: ombre.y }, { x: 100, y: 58 }, 'ombre positionnée à dy sous le point (x,y)');
  assert.equal(corps.fillStyle, '#111111');
  assert.deepEqual({ x: corps.x, y: corps.y }, { x: 100, y: 50 });
  assert.equal(accent.fillStyle, '#222222');
  assert.deepEqual({ x: accent.x, y: accent.y }, { x: 102, y: 48 }, 'primitive positionnée à (dx,dy) du point (x,y)');
}

// ===== 2. Teinte appliquée SEULEMENT aux primitives teinte:true =====
{
  const ctx = new FauxCtx2D();
  const visuel = visuelMinimal(
    [
      { forme: 'cercle', dx: 0, dy: 0, w: 10, couleur: '#7a4a9e', teinte: true },
      { forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#a488c9', alpha: 0.4 }, // reflet, jamais teinté
    ],
    { teintable: true },
  );

  dessinerVisuel(ctx, visuel, 0, 0); // sans teinte : chaque primitive garde sa couleur d'auteur
  assert.equal(ctx.registre[0].fillStyle, '#7a4a9e');
  assert.equal(ctx.registre[1].fillStyle, '#a488c9');

  ctx.registre = [];
  dessinerVisuel(ctx, visuel, 0, 0, { teinte: '#ffffff' }); // flash blanc (§3.1)
  assert.equal(ctx.registre[0].fillStyle, '#ffffff', 'la primitive teinte:true prend la teinte passée');
  assert.equal(ctx.registre[1].fillStyle, '#a488c9', 'le reflet non-teintable garde sa propre couleur');
}

// ===== 3. alpha/echelle globaux (options de dessinerVisuel) =====
{
  const ctx = new FauxCtx2D();
  const visuel = visuelMinimal([{ forme: 'cercle', dx: 4, dy: 0, w: 10, couleur: '#fff' }]);
  dessinerVisuel(ctx, visuel, 10, 10, { echelle: 2 });
  assert.deepEqual(ctx.registre[0], { type: 'fill', x: 18, y: 10, fillStyle: '#fff', alpha: 1 },
    'echelle=2 double le décalage dx/dy (4*2=8) sans toucher globalAlpha');

  ctx.registre = [];
  dessinerVisuel(ctx, visuel, 0, 0, { alpha: 0.5 });
  assert.equal(ctx.registre[0].alpha, 0.5);
}

// ===== 4. Forme inconnue = échec dur (jamais un dessin silencieusement vide) =====
{
  const ctx = new FauxCtx2D();
  const visuel = visuelMinimal([{ forme: 'hexagone', dx: 0, dy: 0, w: 10, couleur: '#fff' }]);
  assert.throws(() => dessinerVisuel(ctx, visuel, 0, 0), /forme "hexagone" inconnue/);
}

// ===== 5. Data-driven : un motif de décor totalement nouveau (le "tronc" de
// la fiche, jamais présent dans data/visuels.json) passe la validation ET se
// dessine sans toucher une ligne de src/visuels.js ni src/schemas.js. =====
{
  const tronc = {
    id: 'visuel_test_tronc',
    ancre: 'bas',
    primitives: [
      {
        forme: 'rect', dx: 0, dy: -10, w: 6, h: 20,
        degrade: { direction: 'horizontal', stops: [{ offset: 0, couleur: '#6b4a2c' }, { offset: 1, couleur: '#2f1f12' }] },
      },
      { forme: 'ellipse', dx: 0, dy: -20, w: 6, h: 3, couleur: '#8a6a44' }, // haut clair (perspective)
      { forme: 'ellipse', dx: 0, dy: 0, w: 6, h: 3, couleur: '#2f1f12' }, // bas sombre (perspective)
    ],
    ombre: { dy: 1, w: 8, h: 3, alpha: 0.3 },
  };

  const erreurs = SCHEMAS.visuels.custom(tronc, { visuels: [tronc] }, 'visuels.json > visuel_test_tronc');
  assert.deepEqual(erreurs, [], `le tronc doit passer la validation sans modification de schemas.js : ${erreurs.join(' ; ')}`);

  const ctx = new FauxCtx2D();
  dessinerVisuel(ctx, tronc, 200, 100);
  assert.equal(ctx.registre.length, 4, 'ombre + tronc (dégradé) + 2 ellipses = 4 dessins');
  // registre[2] : l'ellipse "haut clair", dx=0/dy=-20 du point (200,100).
  assert.deepEqual({ x: ctx.registre[2].x, y: ctx.registre[2].y }, { x: 200, y: 80 });
}

console.log('OK test_phase1b_visuels');

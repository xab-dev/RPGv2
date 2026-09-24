// `specs/13` palier B (`D-153`) : les tampons du calque statique. La part pure
// (`src/tampons.js`) : la clé, la boîte, le cache.
//
// Ce que ce test prouve sans navigateur : qu'AUCUN dessin de tuile du vrai
// catalogue ne déborde de son tampon, sous aucune pose ni aucune échelle. Il le
// prouve en faisant dessiner le visuel par `visuels.js#dessinerVisuel` — le vrai
// dessin, pas une recopie — sur un faux contexte qui suit la transform et note
// chaque point touché, puis en vérifiant que tous tombent dans le tampon. La
// boîte (`boiteDessin`) et le dessin sont deux calculs distincts : l'un
// n'emprunte rien à l'autre, donc le test n'est pas une tautologie.
//
// Ce qu'il ne prouve pas : que l'image est la même au pixel. C'est
// `tools/scenarios/calque_identique.mjs` qui le mesure, dans Chrome.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boiteDessin, boiteTampon, cleTampon, creerCacheTampons } from '../src/tampons.js';
import { dessinerVisuel, echelleVisuel } from '../src/visuels.js';
import { empreinteParDefaut } from '../src/structures.js';
import { appliquerGrainSol } from '../src/qualite.js';

const tuiles = JSON.parse(fs.readFileSync(new URL('../data/tiles.json', import.meta.url)));
const visuels = new Map(JSON.parse(fs.readFileSync(new URL('../data/visuels.json', import.meta.url))).map((v) => [v.id, v]));

// Faux contexte : une pile de transforms affines, et l'enveloppe des points
// réellement touchés, en pixels physiques. Un trait élargit de la moitié de
// son épaisseur (à l'échelle courante) : c'est ce que le canvas peint.
function creerEnregistreur() {
  let m = [1, 0, 0, 1, 0, 0];
  const pile = [];
  const env = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let chemin = [];
  const appliquer = ([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const multiplier = (a, b, c, d, e, f) => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d,
      m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  };
  const noter = (points, demiTrait = 0) => {
    for (const [x, y] of points) {
      env.minX = Math.min(env.minX, x - demiTrait);
      env.maxX = Math.max(env.maxX, x + demiTrait);
      env.minY = Math.min(env.minY, y - demiTrait);
      env.maxY = Math.max(env.maxY, y + demiTrait);
    }
  };
  const ctx = {
    globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1,
    save() { pile.push({ m: [...m], lineWidth: ctx.lineWidth }); },
    restore() { const e = pile.pop(); m = e.m; ctx.lineWidth = e.lineWidth; },
    setTransform(a, b, c, d, e, f) { m = [a, b, c, d, e, f]; },
    translate(x, y) { multiplier(1, 0, 0, 1, x, y); },
    scale(x, y) { multiplier(x, 0, 0, y, 0, 0); },
    rotate(a) { multiplier(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0); },
    beginPath() { chemin = []; },
    closePath() {},
    moveTo(x, y) { chemin.push(appliquer([x, y])); },
    lineTo(x, y) { chemin.push(appliquer([x, y])); },
    arc(x, y, r) { ctx.ellipse(x, y, r, r); },
    ellipse(x, y, rx, ry) {
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        chemin.push(appliquer([x + rx * Math.cos(a), y + ry * Math.sin(a)]));
      }
    },
    fill() { noter(chemin); },
    stroke() { noter(chemin, (ctx.lineWidth * Math.hypot(m[0], m[1])) / 2); },
    fillRect(x, y, w, h) { noter([[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(appliquer)); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  return { ctx, env };
}

// Tous les dessins que le calque tamponne : le visuel de chaque tuile et ses
// variantes, entiers et allégés comme Bas les allège (le preset ne touche pas
// une tuile solide).
const dessins = [];
for (const t of tuiles) {
  if (!t.render || !t.render.visuel) continue;
  for (const id of [t.render.visuel, ...(t.render.visuel_variantes || [])]) {
    const v = visuels.get(id);
    dessins.push({ tuile: t.id, visuel: v });
    if (!t.solid) {
      const allege = appliquerGrainSol(v, 0.3);
      if (allege) dessins.push({ tuile: t.id, visuel: allege });
    }
  }
}
assert.ok(dessins.length > 20, 'le catalogue réel porte des dizaines de dessins de tuile');

// --- Aucun dessin ne déborde de son tampon ----------------------------------
for (const { tuile, visuel } of dessins) {
  for (const echelle of [1, 2, 3, 4, 5, 6]) {
    for (const miroir of [false, true]) {
      const b = boiteTampon(visuel, echelle, { echelleVisuel: echelleVisuel(visuel), miroir });
      for (const n of [b.largeur, b.hauteur, b.ancreX, b.ancreY]) {
        assert.ok(Number.isInteger(n), `${visuel.id} : tailles et ancre entières (${n})`);
      }
      const { ctx, env } = creerEnregistreur();
      // Exactement la transform que `render.js#fabriquerTampon` pose.
      ctx.setTransform(echelle, 0, 0, echelle, b.ancreX, b.ancreY);
      dessinerVisuel(ctx, visuel, 0, 0, { miroir });
      const ou = `${tuile} / ${visuel.id} (${visuel.primitives.length} primitives), échelle ${echelle}, miroir ${miroir}`;
      assert.ok(env.minX >= 0 && env.minY >= 0, `${ou} : déborde à gauche ou en haut (${env.minX}, ${env.minY})`);
      assert.ok(env.maxX <= b.largeur && env.maxY <= b.hauteur,
        `${ou} : déborde à droite ou en bas (${env.maxX} > ${b.largeur}, ${env.maxY} > ${b.hauteur})`);
    }
  }
}

// --- La boîte de dessin compte ce que la collision ignore --------------------
{
  // Elle contient toujours l'empreinte de collision.
  for (const { visuel } of dessins) {
    const e = empreinteParDefaut(visuel, 1);
    const d = boiteDessin(visuel);
    const eps = 1e-9; // `x + w` recalculé en flottant : -29,8 + 26,5 ≠ -3,3 au dernier bit
    assert.ok(d.minX <= e.x + eps && d.minY <= e.y + eps && d.maxX >= e.x + e.w - eps && d.maxY >= e.y + e.h - eps, visuel.id);
  }
  // L'ombre portée, qui n'a pas d'empreinte mais se voit.
  const avecOmbre = { primitives: [{ forme: 'rect', w: 4, h: 4 }], ombre: { dy: 10, w: 30, h: 6, alpha: 0.2 } };
  const b = boiteDessin(avecOmbre);
  assert.equal(b.minX, -15);
  assert.equal(b.maxY, 13);
  // Une primitive tournée : sa boîte grandit.
  const droit = boiteDessin({ primitives: [{ forme: 'rect', w: 10, h: 2 }] });
  const tourne = boiteDessin({ primitives: [{ forme: 'rect', w: 10, h: 2, rotation: 90 }] });
  assert.ok(tourne.maxY - tourne.minY > droit.maxY - droit.minY, 'rotation de primitive comptée');
  // Le miroir retourne la boîte autour de l'ancre.
  const asym = { primitives: [{ forme: 'rect', dx: 5, w: 2, h: 2 }] };
  assert.deepEqual(boiteDessin(asym, { miroir: true }), { minX: -6, maxX: -4, minY: -1, maxY: 1 });
}

// --- La clé : tout ce qui change le dessin, et rien d'autre ------------------
{
  const base = { id: 'visuel_grain_herbe', nbPrimitives: 22, miroir: false, rotation: 0, echelle: 4 };
  const cle = cleTampon(base);
  assert.equal(cleTampon({ ...base }), cle, 'même dessin, même clé');
  for (const [champ, valeur] of [['id', 'visuel_grain_herbe_2'], ['nbPrimitives', 7], ['miroir', true], ['rotation', 90], ['echelle', 3]]) {
    assert.notEqual(cleTampon({ ...base, [champ]: valeur }), cle, `${champ} change la clé`);
  }
  // Deux fractions de grain qui gardent le même nombre de primitives gardent
  // les MÊMES (les premières, `appliquerGrainSol`) : le dessin est le même.
  const v = visuels.get('visuel_grain_herbe');
  assert.deepEqual(appliquerGrainSol(v, 0.3).primitives, appliquerGrainSol(v, 0.31).primitives);
}

// --- Le cache : fabriqué une fois par clé, vidé en entier --------------------
{
  let fabriques = 0;
  const cache = creerCacheTampons((nom) => { fabriques++; return { nom }; });
  const a = cache.obtenir('a', 'A');
  assert.equal(cache.obtenir('a', 'A'), a, 'la même clé rend le même tampon');
  cache.obtenir('b', 'B');
  assert.equal(fabriques, 2);
  assert.equal(cache.taille, 2);
  cache.vider();
  assert.equal(cache.taille, 0);
  assert.notEqual(cache.obtenir('a', 'A'), a, 'après vidage, le tampon est refait');
  assert.equal(fabriques, 3);
}

// --- Le branchement dans render.js (structurel : Node n'a pas de canvas) ------
{
  const source = fs.readFileSync(new URL('../src/render.js', import.meta.url), 'utf8');
  const corps = (nom) => source.slice(source.indexOf(`function ${nom}(`), source.indexOf('\n}\n', source.indexOf(`function ${nom}(`)));
  assert.match(corps('invaliderCoucheStatique'), /cacheTampons\.vider\(\)/, 'changer de preset vide les tampons');
  assert.match(corps('dessinerCoucheStatique'), /echelle !== echelleTampons[\s\S]*cacheTampons\.vider\(\)/, "changer d'échelle vide les tampons");
  // Un seul `createElement`, et seulement quand le canvas n'existe pas encore.
  const creations = corps('construireCoucheStatique').match(/createElement/g) || [];
  assert.equal(creations.length, 1);
  assert.match(corps('construireCoucheStatique'), /if \(!canvasCalque\) canvasCalque = document\.createElement/,
    'le calque ne crée plus un canvas par reconstruction : il réutilise le sien');
  // Le décor garde son dessin vectoriel (rotation continue, §4.4).
  const boucleDecor = corps('construireCoucheStatique').split('for (const motif of decor)')[1];
  assert.match(boucleDecor, /dessinerVisuel\(/);
  assert.doesNotMatch(boucleDecor, /poserTampon/);
}

console.log('OK test_tampons');

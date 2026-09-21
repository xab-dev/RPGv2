// Contrat : SD_dialogues-invisibles_2026-09-15.md — après le MT rendu-net
// (canvas hors-écran redimensionné en pixels PHYSIQUES + `setTransform(f)`
// posé par ajusterCanvasLogiquePhysique), plus aucun dialogue ne s'affiche.
//
// Section 1 : méthode imposée par la fiche (§Méthode de diagnostic, point 2)
// — faux contexte 2D qui enregistre setTransform/save/restore/drawImage et
// le contexte cible de chaque appel, pour trancher entre les hypothèses A/B/C
// sur le vrai code de render.js (dessinerScene, dessinerObscurite) + le
// dessin du dialogue. Toutes les 3 s'avèrent réfutées (§CLAUDE.md) : ce bloc
// documente pourquoi, conformément à la règle « si vert, le dire ».
//
// Section 2 : la cause racine réellement trouvée en creusant au-delà des
// hypothèses A/B/C — dialogue_box.js et hud.js#dessinerSlotsBas lisaient
// `ctx.canvas.width/height` (taille PHYSIQUE depuis le MT rendu-net) pour
// calculer une position, puis dessinaient sous la transform logique->
// physique encore active : la position obtenue est doublement mise à
// l'échelle et sort du canvas visible. Rouge avant patch, vert après.
import assert from 'node:assert/strict';
import { dessinerScene, dessinerObscurite, RESOLUTION_LOGIQUE } from '../src/render.js';
import { dessinerDialogue } from '../src/ui/dialogue_box.js';
import { dessinerHud } from '../src/ui/hud.js';

// --- Faux contexte 2D + faux canvas : n'exerce jamais le rendu réel (aucun
// pixel produit), seulement l'ordre des appels, la transform active à chaque
// appel et les coordonnées passées — conforme à la contrainte de méthode
// (« le rendu canvas n'est jamais exercé par les tests headless »).
class FauxCtx2D {
  constructor(canvas) {
    this.canvas = canvas;
    this._transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    this._pile = [];
    this.registre = [];
    this.fillStyle = null;
    this.strokeStyle = null;
    this.font = null;
    this.textAlign = null;
    this.textBaseline = null;
    this.lineWidth = null;
    this.globalCompositeOperation = 'source-over';
  }
  setTransform(a, b, c, d, e, f) {
    this._transform = { a, b, c, d, e, f };
    this.registre.push({ type: 'setTransform', transform: { a, b, c, d, e, f } });
  }
  // Composition générique (CTM' = CTM * M), seule brique nécessaire à
  // translate/rotate/scale — cf. src/visuels.js#dessinerVisuel, qui les
  // enchaîne sous save()/restore() pour chaque primitive.
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
  translate(x, y) {
    this.transform(1, 0, 0, 1, x, y);
  }
  scale(x, y) {
    this.transform(x, 0, 0, y, 0, 0);
  }
  rotate(rad) {
    this.transform(Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 0, 0);
  }
  getTransform() {
    return { ...this._transform };
  }
  save() {
    this._pile.push({ ...this._transform });
  }
  restore() {
    const t = this._pile.pop();
    if (t) this._transform = t;
  }
  clearRect() {}
  fillRect(x, y, w, h) {
    this.registre.push({ type: 'fillRect', x, y, w, h, transform: { ...this._transform } });
  }
  strokeRect(x, y, w, h) {
    this.registre.push({ type: 'strokeRect', x, y, w, h, transform: { ...this._transform } });
  }
  fillText(texte, x, y) {
    this.registre.push({ type: 'fillText', texte, x, y, transform: { ...this._transform } });
  }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arcTo() {}
  arc() {}
  ellipse() {}
  fill() {}
  stroke() {}
  drawImage(img, ...args) {
    this.registre.push({ type: 'drawImage', img, args, transform: { ...this._transform } });
  }
  createRadialGradient() {
    return { addColorStop() {} };
  }
}

function creerFauxCanvas(largeur, hauteur) {
  const canvas = { width: largeur, height: hauteur };
  canvas.getContext = () => (canvas._ctx ||= new FauxCtx2D(canvas));
  return canvas;
}

// Position physique d'un point logique (x,y) sous une transform uniforme
// {a,...,d,...,e,f} — seule forme produite par ajusterCanvasLogiquePhysique.
function versPhysique(transform, x, y) {
  return { x: x * transform.a + transform.e, y: y * transform.d + transform.f };
}

const sceneFake = {
  width: 2,
  height: 2,
  tileSize: 32,
  obscurite: { opacite: 0.72 }, // objet depuis 03_grotte-polish §2.1 (render.js lit scene.obscurite.opacite)
  lumieres: [],
  tuileA: () => ({ render: { valeur: '#000000' } }),
};
const hero = { x: 100, y: 100, rayon: 10 };
// Visuel factice minimal (03_grotte-polish §3.3 : dessinerScene délègue
// désormais le héros à dessinerVisuel, jamais un cercle dessiné inline) —
// ce test porte sur la transform du dialogue/HUD, pas sur le contenu réel
// de visuels.json.
const heroVisuelFake = { ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 20, couleur: '#fff' }] };
const camera = { x: 0, y: 0 };
const ligneDialogue = { locuteur: 'Follet', texte: 'Bonjour.' };

// Fenêtre simulée : 960x540 physiques (DPR 1) -> échelle entière f=2 (960/480
// = 540/270 = 2), le cas réel signalé par Xav (desktop/fenêtré, jamais f=1).
global.window = { innerWidth: 960, innerHeight: 540, devicePixelRatio: 1 };
global.document = { createElement: (tag) => (tag === 'canvas' ? creerFauxCanvas(0, 0) : null) };

try {
  // ===== Section 1 : hypothèses A/B/C de la fiche =====
  {
    const canvasScene = creerFauxCanvas(480, 270); // redimensionné par dessinerScene
    const ctxScene = canvasScene.getContext('2d');

    dessinerScene(ctxScene, { scene: sceneFake, decor: [], camera, hero, heroVisuel: heroVisuelFake, monstres: [], follet: null, estFlagActif: () => false });
    dessinerObscurite(ctxScene, { scene: sceneFake, camera, follet: null, rayonLumiereFollet: 0, couleurLumiereFollet: null });

    // Hypothèse A (transform remise à l'identité et jamais restaurée) :
    // réfutée — dessinerObscurite passe par ctx.save()/ctx.restore() autour
    // de son unique setTransform(1,...), la transform active juste avant le
    // dialogue doit donc être celle de l'échelle entière (f=2), pas l'identité.
    const transformAvantDialogue = ctxScene.getTransform();
    assert.equal(transformAvantDialogue.a, 2, 'hypothèse A réfutée : la transform doit être restaurée à f=2 avant le dialogue');
    assert.equal(transformAvantDialogue.d, 2, 'hypothèse A réfutée : la transform doit être restaurée à f=2 avant le dialogue');

    const indexAvantDialogue = ctxScene.registre.length;
    dessinerDialogue(ctxScene, ligneDialogue);

    // Hypothèse B (le dialogue est dessiné sur un autre canvas que la scène
    // hors-écran) : réfutée — dessinerDialogue reçoit et écrit sur ce même
    // ctxScene, jamais un canvas visible ou un ancien contexte séparé.
    const appelsDialogue = ctxScene.registre.slice(indexAvantDialogue);
    assert.ok(appelsDialogue.length > 0, 'le dialogue doit dessiner sur le ctx de la scène hors-écran (hypothèse B)');

    // Hypothèse C (le dialogue est dessiné avant la composition du voile,
    // donc écrasé par lui) : réfutée — la composition du voile (drawImage)
    // précède déjà, dans l'ordre du registre, les appels du dialogue.
    const indexComposition = ctxScene.registre.findIndex((e) => e.type === 'drawImage');
    assert.ok(indexComposition !== -1 && indexComposition < indexAvantDialogue, 'la composition du voile doit précéder le dessin du dialogue (hypothèse C)');
  }

  // ===== Section 2 : cause racine réelle =====
  // dessinerDialogue et dessinerHud#dessinerSlotsBas lisent `ctx.canvas.width
  // /height` pour positionner leurs éléments en bas de l'écran — depuis le MT
  // rendu-net, ces dimensions sont PHYSIQUES (480*f x 270*f), pas logiques
  // (480x270), alors que le dessin lui-même reste sous la transform f. Une
  // position calculée sur la taille physique puis redessinée sous cette
  // transform sort du canvas visible.
  {
    const echelle = 2;
    const canvas = creerFauxCanvas(RESOLUTION_LOGIQUE.largeur * echelle, RESOLUTION_LOGIQUE.hauteur * echelle);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(echelle, 0, 0, echelle, 0, 0); // état laissé par ajusterCanvasLogiquePhysique

    dessinerDialogue(ctx, ligneDialogue);
    const fondBoite = ctx.registre.find((e) => e.type === 'fillRect'); // 1er fillRect = fond de la boîte
    assert.ok(fondBoite, 'dessinerDialogue doit dessiner un fond de boîte');
    const { y: yPhysique } = versPhysique(fondBoite.transform, fondBoite.x, fondBoite.y);
    const basPhysique = yPhysique + fondBoite.h * fondBoite.transform.d;
    assert.ok(
      yPhysique >= 0 && basPhysique <= canvas.height,
      `la boîte de dialogue doit rester dans le canvas visible (haut=${yPhysique}, bas=${basPhysique}, canvas.height=${canvas.height})`
    );
  }

  {
    const echelle = 2;
    const canvas = creerFauxCanvas(RESOLUTION_LOGIQUE.largeur * echelle, RESOLUTION_LOGIQUE.hauteur * echelle);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(echelle, 0, 0, echelle, 0, 0);

    // `D-63` : la barre d'actions ne dessine QUE ce qu'on lui donne — plus de
    // liste écrite dans `hud.js`, et aucun repli. Ce test-ci vérifie où la
    // ligne se pose dans le canvas, pas ce qu'elle contient : on lui passe
    // donc les cinq verbes, comme une partie très avancée les aurait.
    dessinerHud(ctx, {
      pv: 10, pvMax: 10, eclats: 0, companion: null, tactileActif: false,
      verbesActions: ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume'],
    });
    // Les slots d'action (16x16) sont les seuls fillRect de cette taille —
    // la cartouche/barre PV ont d'autres dimensions (voir hud.js).
    const slot = ctx.registre.find((e) => e.type === 'fillRect' && e.w === 16 && e.h === 16);
    assert.ok(slot, 'la ligne de slots statiques doit dessiner des carrés 16x16');
    const { y: yPhysique } = versPhysique(slot.transform, slot.x, slot.y);
    const basPhysique = yPhysique + slot.h * slot.transform.d;
    assert.ok(
      yPhysique >= 0 && basPhysique <= canvas.height,
      `la ligne de slots doit rester dans le canvas visible (haut=${yPhysique}, bas=${basPhysique}, canvas.height=${canvas.height})`
    );
  }
} finally {
  delete global.window;
  delete global.document;
}

console.log('OK test_phase1_sd_dialogues_invisibles');

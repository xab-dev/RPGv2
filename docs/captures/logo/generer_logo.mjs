// Premier jet du symbole du jeu : « la sagesse pour tout et pour tous » (inventé par Xav).
// Ce script est LA source de la géométrie : les SVG et la planche de présentation en
// sortent. Retoucher le logo, c'est retoucher un nombre ici puis relancer :
//   node docs/captures/logo/generer_logo.mjs
// Aucune dépendance. Le jeu ne charge de ce script que ses SORTIES : les trois calques de
// `images/logo/` (ticket L2) ; le reste de ce dossier est de la documentation.
//
// Lecture de haut en bas :
//   1. la sagesse  — un losange (la silhouette de l'éclat), une orbe en son centre, et des
//                    lignes parallèles qui l'encadrent, coupées par la tangente horizontale
//                    posée sur la pointe haute du losange : un vase ouvert ;
//   2. pour tout   — un triangle renversé qui part de la pointe basse du losange, au second
//                    plan, bords haut et gauche plus épais que le droit ;
//   3. pour tous   — la Terre : un triangle renversé qui part de la pointe basse du vase,
//                    traits fins, sa base (en haut) descendue vers le centre du triangle.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));

// --- Mesures (unités SVG ; le logo se met à l'échelle, seules les PROPORTIONS comptent) ---
// Demi-hauteur et demi-largeur du losange. Rapport repris de l'icône de l'éclat
// (`visuel_icone_eclat` : 5,4 sur 3,3) ; symétrisé haut/bas, un logo se lit mieux droit.
const A = 54;
const B = 32;
const TRAIT = 4;          // épaisseur du losange et du vase
const R_ORBE = 9;         // rayon de l'orbe
const T2_EPAIS = 7.5;     // triangle « pour tout » : bords haut et gauche
const T2_FIN = 2.5;       //   … et bord droit
const T3_TRAIT = 2.5;     // triangle « la Terre » : traits fins
const T3_DECALAGE = 9;    // de combien sa base descend sous la pointe de ses côtés
const ECART_PLANS = 3.5;  // l'espace laissé à un trait de second plan là où un trait de
                          // premier plan le croise (l'entrelacs qui dit « derrière »)

// --- Géométrie dérivée : rien ci-dessous ne se règle à la main ---
// Distance du centre au milieu du trait du losange.
const D = (A * B) / Math.hypot(A, B);
// L'espace entre l'orbe et le trait du losange (bord à bord) : c'est l'unité du dessin,
// celle que Xav a posée pour espacer les lignes du vase.
const ESPACE = D - TRAIT / 2 - R_ORBE;
// Tous les côtés d'un losange sont à même distance du centre : le décaler de t, c'est le
// mettre à l'échelle (D + t) / D. Le vase est à ESPACE du losange, bord à bord.
const k = (D + ESPACE + TRAIT) / D;
const A2 = A * k;         // pointes haute et basse du vase complet
const B2 = B * k;         // son ventre
const PENTE = A / B;      // tous les traits qui descendent sont parallèles à ceux du losange

// Triangle « pour tout » : sa base part de la pointe basse du losange, aussi large que le
// ventre du vase, côtés parallèles au losange.
const T2 = { y: A, w: B2 };
T2.pointe = T2.y + T2.w * PENTE;
// Triangle « la Terre » : même gabarit, parti de la pointe basse du vase.
const T3 = { y: A2, w: B2 };
T3.pointe = T3.y + T3.w * PENTE;

const f = (n) => +n.toFixed(2);
const pts = (l) => l.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

// Intersection de deux droites données par un point et une direction.
function inter([p, u], [q, v]) {
  const det = u[0] * v[1] - u[1] * v[0];
  const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / det;
  return [p[0] + t * u[0], p[1] + t * u[1]];
}
// Triangle creux à bords d'épaisseurs inégales : le contour extérieur, et l'intérieur
// obtenu en rentrant chaque bord de SA propre épaisseur. Un seul tracé plein (evenodd) :
// trois traits séparés feraient des coins qui se chevauchent mal.
function anneauTriangle(sommets, epaisseurs) {
  const [a, b, c] = sommets;
  const cote = (p, q, e) => {
    const u = [q[0] - p[0], q[1] - p[1]];
    const n = Math.hypot(...u);
    // normale vers l'intérieur (sommets donnés dans le sens horaire à l'écran)
    const int = [-u[1] / n, u[0] / n];
    return [[p[0] + int[0] * e, p[1] + int[1] * e], u];
  };
  const [h, d, g] = [cote(a, b, epaisseurs[0]), cote(b, c, epaisseurs[1]), cote(c, a, epaisseurs[2])];
  const dedans = [inter(g, h), inter(h, d), inter(d, g)];
  return `M${pts(sommets)}Z M${pts(dedans)}Z`;
}

// Sommets extérieurs du triangle 2 : haut-gauche, haut-droit, pointe (sens horaire).
const T2_SOMMETS = [[-T2.w, T2.y], [T2.w, T2.y], [0, T2.pointe]];
const T2_CHEMIN = anneauTriangle(T2_SOMMETS, [T2_EPAIS, T2_FIN, T2_EPAIS]);

// Triangle 3 : deux côtés, et une base descendue qui s'arrête sur eux.
const yBase3 = T3.y + T3_DECALAGE;
const xBase3 = T3.w * (1 - T3_DECALAGE / (T3.pointe - T3.y));
const T3_COTES = [[-T3.w, T3.y], [0, T3.pointe], [T3.w, T3.y]];
const T3_BASE = [[-xBase3, yBase3], [xBase3, yBase3]];

// Le vase : le losange agrandi, puis coupé sous la tangente de la pointe haute du losange.
// La coupe se fait par un masque, pas en raccourcissant le trait : l'extrémité d'un trait
// est perpendiculaire à lui, la coupe voulue est horizontale.
const VASE = [[0, -A2], [B2, 0], [0, A2], [-B2, 0]];
const LOSANGE = [[0, -A], [B, 0], [0, A], [-B, 0]];

// Cadre : ce qui dépasse le plus (ventre du vase, pointe du triangle 3), plus une marge.
const MARGE = 10;
const VB = { x: -B2 - MARGE, y: -A - MARGE, w: 2 * (B2 + MARGE), h: T3.pointe + A + 2 * MARGE };

/**
 * Le symbole en SVG. `p` = pinceaux par symbole ; `tangente` montre la tangente (variante) ;
 * `id` préfixe les identifiants internes, pour poser plusieurs symboles dans une même page.
 */
function symbole({ p, tangente = false, id = 'l', classe = '' }) {
  const e = ECART_PLANS;
  // Ce qui est devant, épaissi : là où il passe, le plan de derrière s'efface.
  const devant1 = `<polygon points="${pts(VASE)}" fill="none" stroke="#000" stroke-width="${TRAIT + 2 * e}" stroke-linejoin="miter" clip-path="url(#${id}-coupe)"/>
      <polygon points="${pts(LOSANGE)}" fill="none" stroke="#000" stroke-width="${TRAIT + 2 * e}"/>`;
  const devant2 = `<path d="${T2_CHEMIN}" fill-rule="evenodd" fill="#000" stroke="#000" stroke-width="${2 * e}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(VB.x)} ${f(VB.y)} ${f(VB.w)} ${f(VB.h)}"${classe ? ` class="${classe}"` : ''} role="img" aria-label="La sagesse pour tout et pour tous">
  <defs>
    <clipPath id="${id}-coupe"><rect x="${f(VB.x)}" y="${-A}" width="${f(VB.w)}" height="${f(VB.h)}"/></clipPath>
    <mask id="${id}-derriere1" maskUnits="userSpaceOnUse" x="${f(VB.x)}" y="${f(VB.y)}" width="${f(VB.w)}" height="${f(VB.h)}">
      <rect x="${f(VB.x)}" y="${f(VB.y)}" width="${f(VB.w)}" height="${f(VB.h)}" fill="#fff"/>
      ${devant1}
    </mask>
    <mask id="${id}-derriere2" maskUnits="userSpaceOnUse" x="${f(VB.x)}" y="${f(VB.y)}" width="${f(VB.w)}" height="${f(VB.h)}">
      <rect x="${f(VB.x)}" y="${f(VB.y)}" width="${f(VB.w)}" height="${f(VB.h)}" fill="#fff"/>
      ${devant1}
      ${devant2}
    </mask>${p.degrades || ''}
  </defs>
  <g mask="url(#${id}-derriere2)" fill="none" stroke="${p.terre}" stroke-width="${T3_TRAIT}" stroke-linecap="butt">
    <polyline points="${pts(T3_COTES)}" stroke-linejoin="miter"/>
    <line x1="${f(T3_BASE[0][0])}" y1="${f(T3_BASE[0][1])}" x2="${f(T3_BASE[1][0])}" y2="${f(T3_BASE[1][1])}"/>
  </g>
  <path mask="url(#${id}-derriere1)" d="${T2_CHEMIN}" fill-rule="evenodd" fill="${p.tout}"/>
  <polygon points="${pts(VASE)}" fill="none" stroke="${p.vase}" stroke-width="${TRAIT}" stroke-linejoin="miter" clip-path="url(#${id}-coupe)"/>${tangente ? `
  <line x1="${f(-B2)}" y1="${f(-A - TRAIT / 2)}" x2="${f(B2)}" y2="${f(-A - TRAIT / 2)}" stroke="${p.vase}" stroke-width="${TRAIT / 2}"/>` : ''}
  <polygon points="${pts(LOSANGE)}" fill="${p.fondLosange || 'none'}" stroke="${p.losange}" stroke-width="${TRAIT}" stroke-linejoin="miter"/>
  <circle cx="0" cy="0" r="${R_ORBE}" fill="${p.orbe}"/>
</svg>`;
}

// Pinceaux. Mono : une seule couleur, celle du texte autour (README clair ou sombre).
const MONO = { terre: 'currentColor', tout: 'currentColor', vase: 'currentColor', losange: 'currentColor', orbe: 'currentColor' };
// Couleur : la sagesse prend le bleu de l'éclat (`visuel_icone_eclat`), « pour tout »
// l'or des jauges, la Terre un vert de mousse. Proposition, rien de verrouillé.
const couleur = (id) => ({
  degrades: `
    <radialGradient id="${id}-orbe"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#bfe6ff"/><stop offset="1" stop-color="#6fb6f0"/></radialGradient>`,
  terre: '#7fa36a', tout: '#d9ae45', vase: '#bfe3ff', losange: '#8fd0ff',
  fondLosange: 'rgba(111,182,240,0.10)', orbe: `url(#${id}-orbe)`,
});

writeFileSync(join(ICI, 'logo.svg'), symbole({ p: MONO, id: 'm' }).replace('<svg ', '<svg style="color:#1b2433" ') + '\n');
writeFileSync(join(ICI, 'logo_couleur.svg'), symbole({ p: couleur('c'), id: 'c' }) + '\n');

// --- Les calques du JEU (ticket L2) ---
// Le jeu fait apparaître les trois symboles l'un après l'autre, dans l'ordre de lecture :
// il lui faut donc chacun sur son propre calque, les deux autres transparents. Les calques
// gardent les masques du symbole entier — l'entrelacs (un trait de derrière interrompu là
// où passe celui de devant) est cuit dedans, superposés ils redonnent exactement le logo.
// Taille naturelle posée (`height`) : sans elle, une image SVG n'a pas de proportions
// connues du canvas. Le jeu lit le rapport largeur / hauteur sur l'image chargée.
const JEU = join(ICI, '..', '..', '..', 'images', 'logo');
mkdirSync(JEU, { recursive: true });
const TRANSPARENT = 'none';
for (const n of [1, 2, 3]) {
  const c = couleur(`j${n}`);
  const p = {
    degrades: n === 1 ? c.degrades : '',
    terre: n === 3 ? c.terre : TRANSPARENT,
    tout: n === 2 ? c.tout : TRANSPARENT,
    vase: n === 1 ? c.vase : TRANSPARENT,
    losange: n === 1 ? c.losange : TRANSPARENT,
    fondLosange: n === 1 ? c.fondLosange : undefined,
    orbe: n === 1 ? c.orbe : TRANSPARENT,
  };
  const hauteur = 512;
  const svg = symbole({ p, id: `j${n}` })
    .replace('<svg ', `<svg width="${f((hauteur * VB.w) / VB.h)}" height="${hauteur}" `);
  writeFileSync(join(JEU, `logo_calque_${n}.svg`), svg + '\n');
}

// --- Planche de présentation ---
const vue = (titre, svg, fond = 'sombre', note = '') =>
  `<figure class="${fond}">${svg}<figcaption>${titre}${note ? `<small>${note}</small>` : ''}</figcaption></figure>`;

// Les trois symboles séparés, pour lire la construction : chacun seul, les autres en fantôme.
const seul = (garde) => {
  const fantome = 'rgba(160,180,210,0.16)';
  return {
    terre: garde === 3 ? '#7fa36a' : fantome,
    tout: garde === 2 ? '#d9ae45' : fantome,
    vase: garde === 1 ? '#bfe3ff' : fantome,
    losange: garde === 1 ? '#8fd0ff' : fantome,
    orbe: garde === 1 ? '#ffffff' : fantome,
  };
};

const tailles = [16, 24, 32, 48, 64].map((t) =>
  `<div class="taille"><div style="width:${t * VB.w / VB.h}px;height:${t}px">${symbole({ p: MONO, id: `t${t}` })}</div><span>${t} px</span></div>`).join('');

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Symbole du jeu — premier jet</title>
<style>
  :root { --fond:#0f131b; --carte:#171d28; --texte:#dfe7f2; --doux:#8a97aa; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fond); color:var(--texte); font:15px/1.55 system-ui, sans-serif; padding:24px 16px 48px; }
  main { max-width:1040px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; } h2 { font-size:16px; margin:36px 0 12px; color:#bfe3ff; }
  p.sous { color:var(--doux); margin:0 0 20px; }
  .rangee { display:flex; flex-wrap:wrap; gap:14px; }
  figure { margin:0; flex:1 1 220px; border-radius:10px; padding:18px 14px 12px; display:flex; flex-direction:column; align-items:center; }
  figure.sombre { background:var(--carte); color:#dfe7f2; }
  figure.clair { background:#f4f1ea; color:#1b2433; }
  figure svg { height:300px; width:auto; max-width:100%; }
  figure.grand svg { height:440px; }
  figcaption { margin-top:10px; font-size:13px; text-align:center; }
  figcaption small { display:block; color:var(--doux); }
  figure.clair figcaption small { color:#6b6456; }
  .tailles { display:flex; gap:22px; align-items:flex-end; flex-wrap:wrap; background:var(--carte); border-radius:10px; padding:18px; color:#dfe7f2; }
  .tailles.clair { background:#f4f1ea; color:#1b2433; }
  .taille { display:flex; flex-direction:column; align-items:center; gap:6px; font-size:12px; }
  .taille svg { width:100%; height:100%; display:block; }
  ol li, ul li { margin:6px 0; } code { color:#bfe3ff; }
</style></head><body><main>
<h1>La sagesse pour tout et pour tous</h1>
<p class="sous">Symbole du jeu, logo et emblème du bouclier — premier jet d'après la description de Xav, 23/09. Géométrie : <code>generer_logo.mjs</code> (un nombre à changer, puis relancer).</p>

<div class="rangee">
  ${vue('Monochrome', symbole({ p: MONO, id: 'a' }), 'sombre grand', 'la version de référence : un seul trait, une seule couleur')}
  ${vue('En couleur', symbole({ p: couleur('b'), id: 'b' }), 'sombre grand', 'éclat · or · mousse — proposition')}
  ${vue('Sur fond clair', symbole({ p: MONO, id: 'c2' }), 'clair grand', 'comme sur un README en thème clair')}
</div>

<h2>Lecture, de haut en bas</h2>
<div class="rangee">
  ${vue('1 · la sagesse', symbole({ p: seul(1), id: 's1' }), 'sombre', "losange de l'éclat, orbe au centre, vase ouvert")}
  ${vue('2 · pour tout', symbole({ p: seul(2), id: 's2' }), 'sombre', 'second plan ; haut et gauche épais, droit fin')}
  ${vue('3 · pour tous — la Terre', symbole({ p: seul(3), id: 's3' }), 'sombre', 'traits fins ; base descendue vers le centre')}
</div>

<h2>Aux petites tailles (favicon, onglet, bouclier)</h2>
<div class="tailles">${tailles}</div>
<div class="tailles clair" style="margin-top:10px">${tailles.replaceAll('id="t', 'id="u').replaceAll('#t', '#u')}</div>

<h2>Ce que j'ai lu dans la description — à confirmer ou corriger</h2>
<ol>
  <li><b>Le vase.</b> Les lignes parallèles sont le losange agrandi, à la distance orbe ↔ losange (bord à bord : ${f(ESPACE)} unités pour un trait de ${TRAIT}). La tangente sur la pointe haute les <i>coupe</i> mais n'est <i>pas tracée</i> : sinon le vase serait fermé. Variante avec la tangente visible ci-dessous.</li>
  <li><b>Le losange</b> reprend les proportions de l'éclat (5,4 × 3,3) mais symétrisé haut/bas ; l'éclat du jeu a son ventre un peu au-dessus du centre.</li>
  <li><b>Les triangles</b> : ni leur largeur ni leur hauteur n'étaient dites. Je les ai faits aussi larges que le ventre du vase et j'ai rendu <i>tous</i> les traits descendants parallèles à ceux du losange — d'où le rythme de chevrons.</li>
  <li><b>Le second plan</b> se dit par l'entrelacs : là où un trait de devant croise un trait de derrière, celui de derrière s'interrompt (vase &gt; triangle 2 &gt; triangle 3).</li>
  <li><b>La base du triangle de la Terre</b> descend de ${T3_DECALAGE} unités vers le centre ; ses côtés dépassent au-dessus — un écho du vase ouvert.</li>
  <li><b>Couleurs</b> : aucune n'était dite ; la version de référence est monochrome.</li>
</ol>

<h2>Variante : la tangente tracée</h2>
<div class="rangee">
  ${vue('Tangente visible', symbole({ p: MONO, id: 'v1', tangente: true }), 'sombre', 'un trait fin qui ferme le haut du vase')}
  ${vue('Tangente invisible (proposée)', symbole({ p: MONO, id: 'v2' }), 'sombre', 'le vase reste ouvert')}
</div>
</main></body></html>
`;
writeFileSync(join(ICI, 'logo.html'), html);
console.log(`logo : espace orbe↔losange = ${f(ESPACE)}, vase ${f(2 * B2)} × ${f(2 * A2)}, cadre ${f(VB.w)} × ${f(VB.h)}`);

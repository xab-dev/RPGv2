// Le calque est-il toujours le MÊME ? — OUTIL DE DEV (`specs/13` paliers B et
// C, §6).
//   node tools/capture_chrome.mjs tools/scenarios/calque_identique.mjs
//
// Pourquoi il existe : Node n'a pas de moteur de rendu, aucun test headless ne
// peut dire « rien n'a changé à l'image ». Chrome sans fenêtre, si. Le
// scénario importe `render.js` DANS la page — le même module que le jeu (une
// URL, une instance) — et compare deux calques au pixel :
//
// 1. `tampons` (palier B) : au même endroit, le calque dessiné primitive par
//    primitive, puis posé depuis les tampons. Vues fixes de la Maison
//    (lisière de forêt, arbres récoltables et rochers, la Maison et son
//    chemin, l'herbe qui touche le chemin) et une salle de la Grotte.
// 2. `defilement` (palier C) : le héros court en diagonale et en zigzag ; le
//    calque DÉFILÉ à l'arrivée (recopies et bandes successives) est comparé à
//    une reconstruction complète de la MÊME fenêtre
//    (`render.js#refaireCoucheStatiqueEnEntier`). Les deux chemins posent les
//    mêmes tampons aux mêmes pixels, et une recopie ne change pas un pixel :
//    un écart, c'est une case oubliée, une bande mal placée ou un arbre coupé
//    — au trait près du décor vectoriel (`TOLERANCE_DEFILEMENT`), que la
//    contre-épreuve mesure à part : deux reconstructions complètes
//    d'origines décalées, sans aucun défilement.
//
// Sous les TROIS presets et les trois profils de `commun.mjs#PROFILS`.
// `RPG_PARTIE=tampons|defilement` n'exécute qu'une partie ; `RPG_VUES=1` que
// la première vue (ou marche) de chaque profil (essai rapide).
//
// Ce qu'il rend, par vue : le nombre de pixels différents, l'écart maximal sur
// un canal, et la part des pixels différents.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const TILE = 32;
const PLEIN_JOUR = 200000;

// `Q-135` : 0 pixel différent visé ; le rasteriseur impose une tolérance, et
// elle porte sur l'ÉCART, jamais sur le nombre de pixels. Mesuré au palier B
// (24/09) : 1 à 13 % des pixels diffèrent, de 1 à 3 niveaux sur 255, jamais
// plus, et la Grotte en Bas (grain sans transparence) est identique au pixel.
// Cause : un tampon garde ses pixels semi-transparents en 8 bits
// prémultipliés, puis se compose sur l'aplat ; le dessin direct compose
// chaque primitive sur l'aplat opaque. Deux arrondis au lieu d'un, sur toute
// primitive à `alpha` (presque tout le grain). L'écart grandit à l'échelle 1,
// où presque chaque pixel est un bord antialiasé.
// Pourquoi 3 suffit à prouver « rien n'a bougé » : un trait décalé d'un
// pixel, ou un dessin rogné au bord de son tampon (une ombre à 0,15 d'alpha),
// ferait un écart de plusieurs dizaines de niveaux, pas de 3.
const TOLERANCE = { ecartCanalMax: 3 };
// Palier C : le défilé contre le complet. Visé : 0. Mesuré (24/09) : en Bas,
// 0 pixel partout ; en Moyen et Haut, quelques dizaines de pixels sur 3,5
// millions, à UN niveau sur 255, éparpillés — là où est le décor, qui est
// vectoriel et posé à des positions fractionnaires. Cause, prouvée par la
// contre-épreuve ci-dessous (deux reconstructions COMPLÈTES d'origines
// différentes, aucun défilement) : Chrome ramène les coordonnées d'un dessin
// en flottants 32 bits relativement à l'origine du calque ; le même motif,
// tramé dans deux calques d'origines différentes, peut donc différer d'un
// niveau d'antialias. Le calque d'avant le palier C le faisait déjà à chaque
// reconstruction. Une case oubliée, une bande mal placée ou un arbre coupé
// feraient des dizaines de niveaux : 1 suffit à les voir.
const TOLERANCE_DEFILEMENT = { ecartCanalMax: 1 };

const VUES = [
  { nom: 'maison et chemin', scene: 'scene_maison_exterieur', x: 72, y: 53 },
  { nom: 'arbres recoltables et rochers', scene: 'scene_maison_exterieur', x: 27, y: 57 },
  { nom: 'foret', scene: 'scene_maison_exterieur', x: 28, y: 20 },
  { nom: 'herbe et chemin', scene: 'scene_maison_exterieur', x: 40, y: 56 },
  { nom: 'grotte salle 1', scene: 'scene_grotte_salle_1', x: 10, y: 7 },
];
// Les marches du palier C : départ, puis des segments de touches tenues
// ensemble (diagonales et zigzags), en millisecondes. Des lieux où l'on court
// sans buter partout : le long du chemin, à travers le Jardin, au bord de la
// forêt (où les arbres débordent sur leurs voisines).
const MARCHES = [
  {
    nom: 'diagonales le long du chemin', x: 40, y: 56,
    segments: [[['KeyD', 'KeyS'], 1800], [['KeyD', 'KeyW'], 1800], [['KeyD'], 900], [['KeyA', 'KeyW'], 1500]],
  },
  {
    nom: 'zigzag autour de la maison', x: 72, y: 53,
    segments: [[['KeyD', 'KeyS'], 1100], [['KeyA', 'KeyS'], 1100], [['KeyD', 'KeyS'], 1100], [['KeyA', 'KeyW'], 1600]],
  },
  {
    nom: 'lisiere de foret', x: 27, y: 57,
    segments: [[['KeyW', 'KeyD'], 1600], [['KeyW'], 1200], [['KeyA', 'KeyS'], 1600]],
  },
];
const PRESETS = ['bas', 'moyen', 'haut'];

// Compare deux lectures `{ fenetre, donnees }` de la page. Même fonction pour
// les deux parties : seule la tolérance change.
const COMPARER_DONNEES = `(a, b) => {
  if (a.fenetre !== b.fenetre) return { erreur: 'fenetres differentes ' + a.fenetre + ' / ' + b.fenetre };
  let differents = 0, ecartMax = 0;
  const histo = {};
  for (let i = 0; i < a.donnees.length; i += 4) {
    let e = 0;
    for (let k = 0; k < 4; k++) e = Math.max(e, Math.abs(a.donnees[i + k] - b.donnees[i + k]));
    if (e > 0) { differents++; histo[e] = (histo[e] || 0) + 1; }
    if (e > ecartMax) ecartMax = e;
  }
  return { fenetre: b.fenetre, pixels: a.donnees.length / 4, differents, ecartMax, histo, tampons: b.tampons };
}`;
const LIRE = `(r) => {
  const c = r.lireCoucheStatique();
  const ctx = c.canvas.getContext('2d');
  return {
    fenetre: [c.xDebut, c.yDebut, c.xFin, c.yFin, c.canvas.width, c.canvas.height].join(','),
    donnees: ctx.getImageData(0, 0, c.canvas.width, c.canvas.height).data,
    tampons: c.tampons,
  };
}`;

// Palier B, dans la page : les deux calques au même endroit, puis la
// comparaison. Deux frames après chaque bascule : la première reconstruit, la
// seconde garantit qu'elle a eu lieu. Le héros est immobile, donc la caméra
// aussi.
const COMPARER_TAMPONS = `(async () => {
  const r = await import('/src/render.js');
  const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
  const lire = ${LIRE};
  r.definirTamponsActifs(false);
  await frame(); await frame();
  const vecto = lire(r);
  r.definirTamponsActifs(true);
  await frame(); await frame();
  const tamp = lire(r);
  return (${COMPARER_DONNEES})(vecto, tamp);
})()`;

// Palier C : pendant la marche, un observateur compte les défilements (le
// calque change de canvas : `numero`) et les reconstructions complètes (il
// change de fenêtre sur le même canvas). Il ne touche pas au jeu.
const OBSERVER = `(async () => {
  const r = await import('/src/render.js');
  window.__obs = { defilements: 0, completes: 0, dernier: null };
  const suivre = () => {
    const c = r.lireCoucheStatique();
    if (c) {
      const cle = [c.xDebut, c.yDebut, c.numero].join(',');
      const d = window.__obs.dernier;
      if (d && d.cle !== cle) {
        if (d.numero !== c.numero) window.__obs.defilements++;
        else window.__obs.completes++;
      }
      window.__obs.dernier = { cle, numero: c.numero };
    }
    requestAnimationFrame(suivre);
  };
  requestAnimationFrame(suivre);
  return true;
})()`;
const COMPARER_DEFILEMENT = `(async () => {
  const r = await import('/src/render.js');
  const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
  const lire = ${LIRE};
  const defile = lire(r);
  const { defilements, completes } = window.__obs;
  r.refaireCoucheStatiqueEnEntier();
  await frame(); await frame();
  const complet = lire(r);
  const resultat = (${COMPARER_DONNEES})(defile, complet);
  // La contre-épreuve, SANS défilement : une seconde reconstruction complète,
  // d'origine décalée de (2, 1) cases, comparée à la première sur leur partie
  // commune rognée d'une case (le rayon d'influence mesuré : au bord, les
  // cases que l'une dessine et l'autre pas diffèrent légitimement). Lue dès la
  // frame qui la construit : la fenêtre décalée ne couvre peut-être plus la vue.
  const c1 = r.lireCoucheStatique();
  const pas = 32 * c1.echelle;
  const [x1, y1, largeur1] = [c1.xDebut, c1.yDebut, c1.canvas.width];
  r.refaireCoucheStatiqueEnEntier({ dx: 2, dy: 1 });
  await frame();
  const c2 = r.lireCoucheStatique();
  const d2 = c2.canvas.getContext('2d').getImageData(0, 0, c2.canvas.width, c2.canvas.height).data;
  let temoinDifferents = 0, temoinEcartMax = 0, temoinPixels = 0;
  for (let ty = Math.max(y1, c2.yDebut) + 1; ty < Math.min(c1.yFin, c2.yFin) - 1; ty++) {
    for (let tx = Math.max(x1, c2.xDebut) + 1; tx < Math.min(c1.xFin, c2.xFin) - 1; tx++) {
      for (let py = 0; py < pas; py++) {
        for (let px = 0; px < pas; px++) {
          const i1 = (((ty - y1) * pas + py) * largeur1 + (tx - x1) * pas + px) * 4;
          const i2 = (((ty - c2.yDebut) * pas + py) * c2.canvas.width + (tx - c2.xDebut) * pas + px) * 4;
          let e = 0;
          for (let k = 0; k < 4; k++) e = Math.max(e, Math.abs(complet.donnees[i1 + k] - d2[i2 + k]));
          temoinPixels++;
          if (e > 0) temoinDifferents++;
          if (e > temoinEcartMax) temoinEcartMax = e;
        }
      }
    }
  }
  return { ...resultat, defilements, completes, temoin: { pixels: temoinPixels, differents: temoinDifferents, ecartMax: temoinEcartMax } };
})()`;

function ligne(profil, nom, preset, r, tolerance) {
  const ok = r.ecartMax <= tolerance.ecartCanalMax;
  return {
    ok,
    texte: `${profil.nom} | ${nom} | ${preset} : ${r.differents === 0 ? 'identique' : ok ? 'dans la tolerance' : 'HORS TOLERANCE'} — `
      + `${r.differents}/${r.pixels} pixels (${((100 * r.differents) / r.pixels).toFixed(3)} %), `
      + `ecart max ${r.ecartMax}, histogramme ${JSON.stringify(r.histo)}, ${r.tampons} tampons, fenetre ${r.fenetre}`
      + (r.defilements !== undefined ? `, ${r.defilements} defilements et ${r.completes} reconstructions pendant la marche` : '')
      + (r.temoin ? ` ; temoin complet/complet decale : ${r.temoin.differents}/${r.temoin.pixels} pixels, ecart max ${r.temoin.ecartMax}` : ''),
  };
}

async function ouvrir(chrome, profil, preset, { scene = 'scene_maison_exterieur', x, y }) {
  const save = saveDansLaMaison();
  save.hero.scene = scene;
  save.hero.x = (x + 0.5) * TILE;
  save.hero.y = (y + 0.5) * TILE;
  save.monde.heure = PLEIN_JOUR;
  await ouvrirLeJeu(chrome, {
    largeur: profil.largeur, hauteur: profil.hauteur, dpr: profil.dpr, save, requete: `?qualite=${preset}`,
  });
}

export default async function (chrome) {
  const rapide = process.env.RPG_VUES === '1';
  const partie = process.env.RPG_PARTIE || 'tout';
  let echecs = 0;
  let marchesSansDefilement = 0;

  if (partie === 'tout' || partie === 'tampons') {
    for (const profil of PROFILS) {
      for (const vue of rapide ? VUES.slice(0, 1) : VUES) {
        for (const preset of PRESETS) {
          await ouvrir(chrome, profil, preset, vue);
          const r = await chrome.evaluer(COMPARER_TAMPONS);
          if (r.erreur) {
            echecs++;
            console.log(`tampons | ${profil.nom} | ${vue.nom} | ${preset} : ERREUR ${r.erreur}`);
            continue;
          }
          const l = ligne(profil, vue.nom, preset, r, TOLERANCE);
          if (!l.ok) echecs++;
          console.log(`tampons | ${l.texte}`);
        }
      }
    }
  }

  if (partie === 'tout' || partie === 'defilement') {
    for (const profil of PROFILS) {
      for (const marche of rapide ? MARCHES.slice(0, 1) : MARCHES) {
        for (const preset of PRESETS) {
          await ouvrir(chrome, profil, preset, marche);
          await chrome.evaluer(OBSERVER);
          for (const [touches, ms] of marche.segments) {
            for (const t of touches) await chrome.enfoncer(t);
            await chrome.attendre(ms);
            for (const t of touches) await chrome.relacher(t);
          }
          await chrome.attendre(500); // la caméra se pose
          const r = await chrome.evaluer(COMPARER_DEFILEMENT);
          if (r.erreur) {
            echecs++;
            console.log(`defilement | ${profil.nom} | ${marche.nom} | ${preset} : ERREUR ${r.erreur}`);
            continue;
          }
          if (r.defilements === 0) marchesSansDefilement++;
          const l = ligne(profil, marche.nom, preset, r, TOLERANCE_DEFILEMENT);
          if (!l.ok) echecs++;
          console.log(`defilement | ${l.texte}`);
        }
      }
    }
    if (marchesSansDefilement) console.log(`ATTENTION : ${marchesSansDefilement} marche(s) sans aucun defilement — elles ne prouvent rien`);
  }

  console.log(echecs === 0 ? 'calque identique partout (tampons : ecart <= 3 ; defilement : ecart <= 1, le trait du decor vectoriel)' : `${echecs} vue(s) hors tolerance`);
  const erreurs = chrome.erreurs();
  if (erreurs.length) console.log('ERREURS', JSON.stringify(erreurs));
}

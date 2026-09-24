// Le calque TAMPONNÉ est-il le calque VECTORIEL ? — OUTIL DE DEV (`specs/13`
// palier B, §6).
//   node tools/capture_chrome.mjs tools/scenarios/calque_identique.mjs
//
// Pourquoi il existe : Node n'a pas de moteur de rendu, aucun test headless ne
// peut dire « rien n'a changé à l'image ». Chrome sans fenêtre, si. Le
// scénario importe `render.js` DANS la page — le même module que le jeu (une
// URL, une instance) —, construit le calque deux fois au même endroit, une
// fois dessiné primitive par primitive, une fois posé depuis les tampons, et
// compare les deux au pixel.
//
// Où : quelques vues fixes de la Maison (lisière de forêt, arbres récoltables
// et rochers, la Maison et son chemin, l'herbe qui touche le chemin) et une
// salle de la Grotte, sous les TROIS presets et deux profils : 1920 × 1080 à
// DPR 1 (échelle 4) et `telephone` à DPR 3 (`commun.mjs#PROFILS`).
//
// Ce qu'il rend, par vue : le nombre de pixels différents, l'écart maximal sur
// un canal, et la part des pixels différents. La tolérance est écrite dans
// `TOLERANCE` ci-dessous, et motivée (`Q-135`). `RPG_VUES=1` n'exécute que la
// première vue de chaque profil (essai rapide).
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

const VUES = [
  { nom: 'maison et chemin', scene: 'scene_maison_exterieur', x: 72, y: 53 },
  { nom: 'arbres recoltables et rochers', scene: 'scene_maison_exterieur', x: 27, y: 57 },
  { nom: 'foret', scene: 'scene_maison_exterieur', x: 28, y: 20 },
  { nom: 'herbe et chemin', scene: 'scene_maison_exterieur', x: 40, y: 56 },
  { nom: 'grotte salle 1', scene: 'scene_grotte_salle_1', x: 10, y: 7 },
];
const PRESETS = ['bas', 'moyen', 'haut'];

// Dans la page : les deux calques au même endroit, puis la comparaison. Deux
// frames après chaque bascule : la première reconstruit, la seconde garantit
// qu'elle a eu lieu. Le héros est immobile, donc la caméra aussi.
const COMPARER = `(async () => {
  const r = await import('/src/render.js');
  const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
  const lire = async (actifs) => {
    r.definirTamponsActifs(actifs);
    await frame(); await frame();
    const c = r.lireCoucheStatique();
    const ctx = c.canvas.getContext('2d');
    return {
      fenetre: [c.xDebut, c.yDebut, c.xFin, c.yFin, c.canvas.width, c.canvas.height].join(','),
      donnees: ctx.getImageData(0, 0, c.canvas.width, c.canvas.height).data,
      tampons: c.tampons,
    };
  };
  const vecto = await lire(false);
  const tamp = await lire(true);
  if (vecto.fenetre !== tamp.fenetre) return { erreur: 'fenetres differentes ' + vecto.fenetre + ' / ' + tamp.fenetre };
  let differents = 0, ecartMax = 0;
  const histo = {};
  for (let i = 0; i < vecto.donnees.length; i += 4) {
    let e = 0;
    for (let k = 0; k < 4; k++) e = Math.max(e, Math.abs(vecto.donnees[i + k] - tamp.donnees[i + k]));
    if (e > 0) { differents++; histo[e] = (histo[e] || 0) + 1; }
    if (e > ecartMax) ecartMax = e;
  }
  return { fenetre: tamp.fenetre, pixels: vecto.donnees.length / 4, differents, ecartMax, histo, tampons: tamp.tampons };
})()`;

export default async function (chrome) {
  const rapide = process.env.RPG_VUES === '1';
  const profils = PROFILS;
  let echecs = 0;
  for (const profil of profils) {
    for (const vue of rapide ? VUES.slice(0, 1) : VUES) {
      for (const preset of PRESETS) {
        const save = saveDansLaMaison();
        save.hero.scene = vue.scene;
        save.hero.x = (vue.x + 0.5) * TILE;
        save.hero.y = (vue.y + 0.5) * TILE;
        save.monde.heure = PLEIN_JOUR;
        await ouvrirLeJeu(chrome, {
          largeur: profil.largeur, hauteur: profil.hauteur, dpr: profil.dpr, save, requete: `?qualite=${preset}`,
        });
        const r = await chrome.evaluer(COMPARER);
        if (r.erreur) {
          echecs++;
          console.log(`${profil.nom} | ${vue.nom} | ${preset} : ERREUR ${r.erreur}`);
          continue;
        }
        const ok = r.ecartMax <= TOLERANCE.ecartCanalMax;
        if (!ok) echecs++;
        console.log(`${profil.nom} | ${vue.nom} | ${preset} : ${r.differents === 0 ? 'identique' : ok ? 'dans la tolerance' : 'HORS TOLERANCE'} — `
          + `${r.differents}/${r.pixels} pixels (${((100 * r.differents) / r.pixels).toFixed(3)} %), `
          + `ecart max ${r.ecartMax}, histogramme ${JSON.stringify(r.histo)}, ${r.tampons} tampons, fenetre ${r.fenetre}`);
      }
    }
  }
  console.log(echecs === 0 ? `calque tamponne dans la tolerance partout (ecart <= ${TOLERANCE.ecartCanalMax})` : `${echecs} vue(s) hors tolerance`);
  const erreurs = chrome.erreurs();
  if (erreurs.length) console.log('ERREURS', JSON.stringify(erreurs));
}

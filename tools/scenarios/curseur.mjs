// OUTIL DE DEV (`D-108`) : le curseur, sous Chrome SANS FENÊTRE.
//   node tools/capture_chrome.mjs tools/scenarios/curseur.mjs
//
// CE QUE CETTE CAPTURE PEUT DIRE, ET CE QU'ELLE NE PEUT PAS. Une capture
// d'écran ne contient JAMAIS le curseur du système : l'orbe, qui est
// précisément un `cursor: url(…)`, en est absent par construction. Ce qu'on
// voit ici est donc le CALQUE seul — les particules en orbite et la traînée —
// plus une vignette de l'orbe collée à la main au dernier point du pointeur,
// pour figurer ce que le joueur, lui, verra. Cette vignette est une
// SIMULATION, marquée comme telle : le verdict sur l'orbe reste celui de Xav
// devant son écran (même leçon que `D-91`, où une silhouette ne se juge qu'à
// l'endroit où le jeu la montre).
//
// Ce que la capture prouve vraiment : que le calque existe, qu'il est à la
// bonne taille, que la traînée suit le geste, qu'elle passe PAR-DESSUS un
// menu ouvert, et que rien n'est tombé dans la console.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

// Un geste de souris, dispatché DANS la page, une frame par pas. Deux raisons
// de ne pas passer par `chrome.survol` ici : il attend 80 ms entre deux
// mouvements, donc un geste de vingt pas durerait plus de deux secondes et les
// bouffées (qui vivent ~420 ms) seraient mortes avant la capture ; et la
// traînée naît à la DISTANCE parcourue, pas au temps — c'est un geste rapide
// qu'il faut montrer, celui du joueur.
async function geste(chrome, points, pas = 14) {
  const json = JSON.stringify(points);
  await chrome.evaluer(`(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const points = ${json};
    for (let i = 1; i < points.length; i += 1) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / ${pas}));
      for (let k = 1; k <= n; k += 1) {
        document.dispatchEvent(new PointerEvent('pointermove', {
          pointerType: 'mouse',
          clientX: x0 + ((x1 - x0) * k) / n,
          clientY: y0 + ((y1 - y0) * k) / n,
        }));
        await frame();
      }
    }
  })()`);
}

// Colle la vignette de l'orbe au dernier point du pointeur — la seule façon de
// voir sur une capture ce que le compositeur du navigateur dessine par-dessus
// la page. Retirée juste après : elle ne doit jamais rester dans une capture
// qui prétend montrer le jeu.
async function simulerOrbe(chrome, x, y) {
  return chrome.evaluer(`(() => {
    const valeur = getComputedStyle(document.documentElement).getPropertyValue('--curseur-jeu');
    const url = (valeur.match(/url\\("([^"]+)"\\)/) || [])[1];
    if (!url) return false;
    const img = document.createElement('img');
    img.id = 'simulation-orbe';
    img.src = url;
    // Le point chaud est au centre de l'orbe : on le replace sous (x, y).
    img.style.cssText = 'position:fixed;left:${x}px;top:${y}px;transform:translate(-50%,-50%);pointer-events:none;z-index:11';
    document.body.appendChild(img);
    return true;
  })()`);
}

export default async function (chrome) {
  // Une partie déjà lancée, DEHORS et en plein jour : une partie neuve
  // démarrerait dans la Grotte, sur un fond noir où la traînée argentée aurait
  // l'air magnifique — c'est-à-dire exactement le fond qui ne prouve rien.
  const save = saveDansLaMaison({ compagnon: 'comp_follet_eau' });
  save.hero.x = (85 + 0.5) * 32;
  save.hero.y = (49 + 0.5) * 32;
  save.monde.heure = 200000;
  await ouvrirLeJeu(chrome, { largeur: 960, hauteur: 540, save });

  // 1. Ce que le module a réellement posé sur la page.
  const etat = await chrome.evaluer(`(() => {
    const calque = document.querySelector('.curseur-calque');
    const valeur = getComputedStyle(document.documentElement).getPropertyValue('--curseur-jeu').trim();
    return {
      calque: !!calque,
      calqueCss: calque ? calque.clientWidth + 'x' + calque.clientHeight : null,
      calquePixels: calque ? calque.width + 'x' + calque.height : null,
      evenements: calque ? getComputedStyle(calque).pointerEvents : null,
      curseurPose: valeur.length > 0,
      forme: valeur.slice(0, 22),
      poidsImage: valeur.length,
      curseurCalcule: getComputedStyle(document.body).cursor.slice(0, 22),
    };
  })()`);
  console.log(JSON.stringify(etat, null, 1));

  // 2. Un geste en L, puis la vignette de l'orbe au point d'arrivée.
  await geste(chrome, [[180, 420], [620, 300], [700, 140]]);
  await simulerOrbe(chrome, 700, 140);
  await chrome.attendre(60);
  await chrome.capture('docs/captures/curseur-2026-09-22/jeu_trainee.png');
  await chrome.evaluer("document.getElementById('simulation-orbe')?.remove()");

  // 3. Le même geste MENU OUVERT : le calque doit passer au-dessus de l'écran
  //    d'UI, sinon les étincelles disparaîtraient là où la souris sert le plus.
  await chrome.touche('Escape');
  await chrome.attendre(400);
  await geste(chrome, [[200, 150], [640, 260], [760, 400]]);
  await simulerOrbe(chrome, 760, 400);
  await chrome.attendre(60);
  await chrome.capture('docs/captures/curseur-2026-09-22/jeu_menu.png');
  await chrome.evaluer("document.getElementById('simulation-orbe')?.remove()");

  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

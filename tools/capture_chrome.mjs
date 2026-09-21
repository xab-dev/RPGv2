// Captures du jeu SANS FENÊTRE — OUTIL DE DEV, jamais chargé par le jeu.
//
// Pourquoi il existe : une vérification de nuit se fait écran verrouillé. Chrome
// n'y sert plus aucun `requestAnimationFrame` à une fenêtre masquée (le jeu est
// à l'arrêt), et l'extension de pilotage n'arrive plus à capturer l'onglet. Un
// Chrome lancé en `--headless`, lui, rend ses frames sans écran. Ce script le
// lance, le pilote par son port de débogage (protocole CDP, sur le WebSocket
// natif de Node — aucune dépendance), et rend de VRAIS pixels, à la taille de
// viewport demandée, exactement.
//
// TROIS profils (`tools/scenarios/commun.mjs#PROFILS`) : les deux tailles de
// `specs/08_menus-cartes.md` §7 (703 × 280 et 1920 × 1080, DPR 1) et, depuis
// `D-48`, un **téléphone** (780 × 360 px CSS, DPR 3). Motif : à DPR 1, px CSS
// et px physiques sont le même nombre, donc aucun profil ne pouvait voir la
// classe de défaut « une grandeur physique lue là où on attend une grandeur
// logique » — celle qui affichait la mise en page 1080p dans 360 px CSS de
// haut sur le téléphone de Xav. Un profil à DPR ≠ 1 la voit du premier coup.
//
// Ce que ça prouve, et ce que ça ne prouve pas : « ça s'affiche ainsi sous
// Chrome », jamais « c'est réussi » — le verdict reste une validation de Xav,
// en jeu. Le profil est NEUF à chaque lancement (dossier temporaire) : la
// sauvegarde de Xav n'est ni lue ni touchée.
//
// Usage : node tools/capture_chrome.mjs <scenario.mjs>
// Un scénario exporte `default async function (chrome) { … }` et reçoit :
//   chrome.taille(l, h, dpr = 1)   viewport exact, en px CSS, au DPR demandé
//   chrome.ouvrir(url)             navigue et attend le chargement
//   chrome.touche(code, ms = 80)   appui réel (keydown, attente, keyup) — `KeyboardEvent.code`
//   chrome.clic(x, y)              clic souris réel, en px CSS
//   chrome.attendre(ms)
//   chrome.evaluer(expression)     rend la valeur (JSON) de l'expression, `await` permis
//   chrome.capture(chemin)         PNG du viewport
//   chrome.bridageCpu(facteur)     ralentit le CPU d'autant (1 = normal, 6 = proxy
//                                  d'appareil faible) — le coût du calque est CPU
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME_EXE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.CHROME_PORT) || 9333;
const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));

// Code de touche -> ce que CDP veut en plus pour fabriquer un vrai événement.
const TOUCHES = {
  Escape: { key: 'Escape', vk: 27 }, Space: { key: ' ', vk: 32 }, Enter: { key: 'Enter', vk: 13 },
  ArrowLeft: { key: 'ArrowLeft', vk: 37 }, ArrowUp: { key: 'ArrowUp', vk: 38 },
  ArrowRight: { key: 'ArrowRight', vk: 39 }, ArrowDown: { key: 'ArrowDown', vk: 40 },
  Digit1: { key: '1', vk: 49 }, Digit2: { key: '2', vk: 50 }, Digit3: { key: '3', vk: 51 },
  KeyE: { key: 'e', vk: 69 }, KeyQ: { key: 'q', vk: 81 },
  KeyW: { key: 'w', vk: 87 }, KeyA: { key: 'a', vk: 65 }, KeyS: { key: 's', vk: 83 }, KeyD: { key: 'd', vk: 68 },
};

async function main() {
  const scenario = process.argv[2];
  if (!scenario) throw new Error('usage : node tools/capture_chrome.mjs <scenario.mjs>');
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgv2-capture-'));
  const processus = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    let cible = null;
    for (let i = 0; i < 100 && !cible; i++) {
      await attendre(100);
      try {
        const pages = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        cible = pages.find((p) => p.type === 'page') || null;
      } catch { /* Chrome n'écoute pas encore */ }
    }
    if (!cible) throw new Error('Chrome ne répond pas sur son port de débogage');

    const ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((resoudre, rejeter) => { ws.onopen = resoudre; ws.onerror = rejeter; });
    let prochainId = 1;
    const enAttente = new Map();
    const evenements = [];
    ws.onmessage = (message) => {
      const donnees = JSON.parse(message.data);
      if (donnees.id && enAttente.has(donnees.id)) {
        const { resoudre, rejeter } = enAttente.get(donnees.id);
        enAttente.delete(donnees.id);
        if (donnees.error) rejeter(new Error(`${donnees.error.message}`));
        else resoudre(donnees.result);
      } else if (donnees.method) {
        evenements.push(donnees);
      }
    };
    const envoyer = (method, params = {}) => new Promise((resoudre, rejeter) => {
      const id = prochainId++;
      enAttente.set(id, { resoudre, rejeter });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await envoyer('Page.enable');
    await envoyer('Runtime.enable');

    const chrome = {
      attendre,
      // `dpr` : `deviceScaleFactor` de CDP, donc `window.devicePixelRatio` dans
      // la page. Le viewport reste exprimé en px CSS (c'est ce que voit la
      // mise en page) ; seule la densité change, comme sur un vrai téléphone.
      async taille(largeur, hauteur, dpr = 1) {
        await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: dpr, mobile: dpr !== 1 });
      },
      // Ralentisseur de CPU de Chrome (CDP). Sert de proxy d'appareil faible :
      // le coût du calque statique suit le NOMBRE DE PRIMITIVES, donc le CPU,
      // et non les pixels (`R-12` -> `R-13` : diviser les pixels par 9 sur
      // l'A04 ne rend que 3,6 fps). Un facteur n'est pas un appareil : il
      // compare deux exécutions du même scénario, rien de plus.
      async bridageCpu(facteur) {
        await envoyer('Emulation.setCPUThrottlingRate', { rate: facteur });
      },
      async ouvrir(url) {
        evenements.length = 0;
        await envoyer('Page.navigate', { url });
        for (let i = 0; i < 200 && !evenements.some((e) => e.method === 'Page.loadEventFired'); i++) await attendre(50);
      },
      async touche(code, ms = 80) {
        const t = TOUCHES[code];
        if (!t) throw new Error(`touche inconnue : ${code}`);
        const commun = { code, key: t.key, windowsVirtualKeyCode: t.vk, nativeVirtualKeyCode: t.vk };
        await envoyer('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...commun });
        await attendre(ms);
        await envoyer('Input.dispatchKeyEvent', { type: 'keyUp', ...commun });
        await attendre(ms);
      },
      async clic(x, y) {
        await envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await attendre(80);
      },
      async survol(x, y) {
        await envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await attendre(80);
      },
      async evaluer(expression) {
        const r = await envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(`dans la page : ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
        return r.result.value;
      },
      async capture(chemin) {
        const r = await envoyer('Page.captureScreenshot', { format: 'png' });
        fs.mkdirSync(path.dirname(chemin), { recursive: true });
        fs.writeFileSync(chemin, Buffer.from(r.data, 'base64'));
        console.log(`capture : ${chemin}`);
      },
      // Erreurs et exceptions vues par la console depuis la dernière navigation.
      erreurs() {
        return evenements
          .filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
          .map((e) => (e.params.exceptionDetails ? e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text
            : e.params.args.map((a) => a.value ?? a.description).join(' ')));
      },
    };

    const module = await import(pathToFileURL(path.resolve(scenario)).href);
    await module.default(chrome);
    ws.close();
  } finally {
    processus.kill();
    await attendre(300);
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome tient encore un fichier : sans gravité */ }
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});

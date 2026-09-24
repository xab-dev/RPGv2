// La NUIT LA PLUS CHARGÉE, mesurée en marche — OUTIL DE DEV (`specs/13` palier A).
//   node tools/capture_chrome.mjs tools/scenarios/traversee_nuit.mjs
//
// Pourquoi il existe : `cout_calque.mjs` mesure le calque de jour, dans un
// monde vide. Le budget de la carte (`specs/13` §4.6) demande l'autre bout :
// les deux zones de Chaos pleines (Nv.10, six rôdeurs chacune, `spawns.json`),
// le voile de nuit et le signal des zones, et une boucle qui passe AU MILIEU
// des monstres. C'est la base que l'Annexe 1, qui ajoute une zone de mobs,
// devra tenir.
//
// Déroulé, identique à chaque exécution :
//   1. Partie au Nv.10, en début de nuit, héros à l'est du Jardin — à plus de
//      `distance_min_joueur_tuiles` des deux zones, pour qu'elles se
//      remplissent. Héros robuste (Vitalité) : une mort le renverrait à la
//      Maison, et la boucle ne serait plus la même.
//   2. Attente immobile jusqu'au plafond des tables d'apparition.
//   3. La boucle : est, nord dans le Champ nord (zone nord-est), sud jusqu'au
//      Champ sud (zone sud), retour au point de départ. Le temps de marche est
//      du temps de MUR : le jeu plafonne un delta à 100 ms, donc tant qu'aucune
//      frame n'y arrive, la boucle parcourt le même chemin sous bridage.
//
// Ce qu'il rend : les frames > 20 ms (le seuil de l'instrument), le coût
// moyen et maximal d'une reconstruction du calque, `maj()` et `dessiner()`,
// le nombre de monstres présents, et la dernière entrée en scène.
//
// Comment il compte sans double-compter : le relevé `?debug=fps` porte les
// 600 DERNIÈRES frames. Le scénario pose donc son propre compteur de frames
// (un `requestAnimationFrame` à lui, qui ne touche pas au jeu) et relit le
// relevé chaque fois que 600 frames neuves sont passées : les fenêtres lues
// sont disjointes, et elles s'additionnent. Ce compteur rend aussi les
// intervalles entre frames > 20 ms (« frames sautées » du point de vue de la
// page), le seul signal de fluidité que Chrome donne (`DOC_navigateurs.md`).
//
// Ce que ça N'EST PAS : un relevé du §6 du suivi (ceux de Xav, à la main).
// Chrome est sans fenêtre : seuls deux passages de CE scénario se comparent.
//
// `RPG_QUALITE=bas|moyen|haut` : le preset. `RPG_BRIDAGE=6` : CPU ralenti
// (proxy, jamais un appareil). `RPG_PHASE=jour` : la même boucle en plein jour
// (aucun monstre, aucun voile) — la différence de `maj()`/`dessiner()` avec la
// nuit BORNE PAR LE HAUT le coût des entités (§4.6 : la nuit ajoute aussi le
// voile et le signal, donc tout ce qui est dû aux monstres est dedans).
// `RPG_NIVEAU=1` sépare les deux : la nuit, sans aucun monstre.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const TILE = 32;
const NUIT_DEBUT = 700000; // ms du cycle (`daynight.js`) : 10 s après l'entrée en nuit, 230 s devant
const PLEIN_JOUR = 200000;
const ATTENTE_REMPLISSAGE_MS = 52000; // 6 × `intervalle_ms` (8 s) + marge de chargement
const FRAMES_PAR_FENETRE = 600; // = `CAPACITE_TAMPON_10S` de `debug_perf.js`

// La boucle, en tuiles depuis le départ (120, 57). À ~95 px/s (Agilité 5),
// une tuile ≈ 337 ms ; 220 tuiles ≈ 75 s.
const DEPART = { x: 120, y: 57 };
const BOUCLE = [
  { touche: 'KeyD', tuiles: 30 }, // est, vers la colonne des deux zones
  { touche: 'KeyW', tuiles: 37 }, // nord, dans le Champ nord
  { touche: 'KeyS', tuiles: 80 }, // sud, traverse jusqu'au Champ sud
  { touche: 'KeyW', tuiles: 43 }, // retour à la hauteur du départ
  { touche: 'KeyA', tuiles: 30 }, // ouest, au départ
];
const MS_PAR_TUILE = (TILE / 95) * 1000;

function lireFenetre(texte) {
  const n = (re) => { const m = texte.match(re); return m ? m.slice(1).map(Number) : null; };
  const lentes = n(/frames > 20ms sur le tampon : (\d+)\/(\d+)/);
  const majDessiner = n(/maj\(\) moyen ([\d.]+) ms \(p95 ([\d.]+) ms\) \| dessiner\(\) moyen ([\d.]+) ms \(p95 ([\d.]+) ms\)/);
  const recalc = n(/recalculs calque statique : (\d+) \(moyenne ([\d.]+) ms, max ([\d.]+) ms/);
  const monstres = n(/monstres (\d+)\/(\d+),/);
  // `specs/13` palier F : la part des monstres hors champ, en moyenne sur la fenêtre.
  const moyens = n(/moyenne sur le tampon : ([\d.]+)\/([\d.]+)/);
  return {
    lentes: lentes[0], frames: lentes[1],
    majMoy: majDessiner[0], majP95: majDessiner[1], dessMoy: majDessiner[2], dessP95: majDessiner[3],
    recalcN: recalc ? recalc[0] : 0, recalcMoy: recalc ? recalc[1] : 0, recalcMax: recalc ? recalc[2] : 0,
    monstres: monstres ? monstres[1] : 0,
    dessinesMoy: moyens ? moyens[0] : 0, presentsMoy: moyens ? moyens[1] : 0,
  };
}

export default async function (chrome) {
  const jour = process.env.RPG_PHASE === 'jour';
  const save = saveDansLaMaison();
  save.hero.x = (DEPART.x + 0.5) * TILE;
  save.hero.y = (DEPART.y + 0.5) * TILE;
  // `spawn_chaos_sud` exige le Nv.10 ; le Nv.15 ouvrirait le chapitre 1.
  // `RPG_NIVEAU=1` : la même nuit SANS Chaos (les deux zones attendent le
  // Nv.5) — le voile et le signal seuls, pour séparer leur coût de celui des
  // monstres.
  const niveau = Number(process.env.RPG_NIVEAU) || 10;
  save.hero.niveau = niveau;
  save.hero.stats = { points: { stat_vitalite: 45 } };
  save.hero.pv = 10 + 8 * 50;
  save.monde.heure = jour ? PLEIN_JOUR : NUIT_DEBUT;
  const qualite = process.env.RPG_QUALITE || null;
  const requete = qualite ? `?debug=fps&qualite=${qualite}` : '?debug=fps';
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save, requete });
  const entree = await chrome.evaluer(`(document.querySelector('#debug-perf').textContent.match(/entrée en scène : .*/) || ['?'])[0]`);
  const bridage = Number(process.env.RPG_BRIDAGE) || 1;
  if (bridage !== 1) await chrome.bridageCpu(bridage);

  if (!jour && niveau >= 5) await chrome.attendre(ATTENTE_REMPLISSAGE_MS);

  // Le compteur de la page : ses propres frames, leurs intervalles, et une
  // copie du relevé toutes les 600 frames — prise PAR LA PAGE, pour que Node
  // n'ait rien à faire pendant la marche que tenir la touche.
  await chrome.evaluer(`(() => {
    const c = window.__compteurTraversee = { frames: 0, sautees: 0, maxDelta: 0, dernier: null, releves: [], actif: true };
    const tick = (t) => {
      if (!c.actif) return;
      if (c.dernier !== null) {
        const d = t - c.dernier;
        c.frames += 1;
        if (d > 20) c.sautees += 1;
        if (d > c.maxDelta) c.maxDelta = d;
        if (c.frames % ${FRAMES_PAR_FENETRE} === 0) c.releves.push({ frames: c.frames, texte: document.querySelector('#debug-perf').textContent });
      }
      c.dernier = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  })()`);

  for (const { touche, tuiles } of BOUCLE) {
    await chrome.enfoncer(touche);
    await chrome.attendre(tuiles * MS_PAR_TUILE);
    await chrome.relacher(touche);
  }
  const page = await chrome.evaluer(`(() => {
    const c = window.__compteurTraversee;
    c.actif = false;
    // La fin de boucle : une dernière fenêtre, dont seules les frames neuves comptent.
    c.releves.push({ frames: c.frames, texte: document.querySelector('#debug-perf').textContent });
    return c;
  })()`);
  let precedent = 0;
  const fenetres = page.releves.map((r) => {
    const f = lireFenetre(r.texte);
    // Une fenêtre pleine vaut 1 ; la dernière recouvre en partie la
    // précédente, on n'en garde que la part neuve (approximation dite).
    f.part = Math.min(1, (r.frames - precedent) / Math.max(1, f.frames));
    precedent = r.frames;
    return f;
  }).filter((f) => f.part > 0);

  const somme = (cle) => fenetres.reduce((s, f) => s + f[cle] * f.part, 0);
  const frames = somme('frames');
  const pondere = (cle) => fenetres.reduce((s, f) => s + f[cle] * f.frames * f.part, 0) / frames;
  const recalcN = somme('recalcN');
  const recalcMoy = fenetres.reduce((s, f) => s + f.recalcMoy * f.recalcN * f.part, 0) / Math.max(1, recalcN);
  const max = (cle) => Math.max(...fenetres.map((f) => f[cle]));

  console.log(`traversee ${jour ? 'JOUR' : 'NUIT'} Nv.${niveau} — preset : ${qualite || '(resolu)'} — bridage CPU : x${bridage}`);
  console.log(entree);
  console.log(`fenetres lues : ${fenetres.length}, frames comptees : ${Math.round(frames)}`);
  console.log(`monstres presents (par fenetre) : ${fenetres.map((f) => f.monstres).join(' ')}`);
  console.log(`monstres dessines / presents, moyenne par fenetre : ${fenetres.map((f) => `${f.dessinesMoy.toFixed(1)}/${f.presentsMoy.toFixed(1)}`).join(' ')}`);
  console.log(`frames > 20 ms (instrument, maj+dessiner) : ${Math.round(somme('lentes'))}/${Math.round(frames)}`);
  console.log(`intervalles > 20 ms (page) : ${page.sautees}/${page.frames}, pire ${page.maxDelta.toFixed(1)} ms`);
  console.log(`maj() moy ${pondere('majMoy').toFixed(2)} ms, p95 max ${max('majP95').toFixed(2)} ms`);
  console.log(`dessiner() moy ${pondere('dessMoy').toFixed(2)} ms, p95 max ${max('dessP95').toFixed(2)} ms`);
  console.log(`reconstructions du calque : ${Math.round(recalcN)}, moy ${recalcMoy.toFixed(2)} ms, max ${max('recalcMax').toFixed(2)} ms`);
  const erreurs = chrome.erreurs();
  if (erreurs.length) console.log('ERREURS', JSON.stringify(erreurs));
}

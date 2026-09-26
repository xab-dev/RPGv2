// L'ÉTAT DES LIEUX DU JEU, en captures (spec 17, palier D) — OUTIL DE DEV.
// Xav, 26/09 : « vision globale de la carte maison (dézoomé), héro,
// feu-follet, station, monstre, + tout ce que tu jugera utile (décors, grain
// etc..) ». Rejouable : les mêmes vues, à chaque état des lieux.
//
//   node tools/capture_chrome.mjs tools/scenarios/audit_2026_09_26.mjs
//   RPG_PARTIES=cartes,heros node tools/capture_chrome.mjs tools/scenarios/audit_2026_09_26.mjs
//
// Parties : cartes, heros, follet, stations, monstres, decor, hud.
// Sortie : `docs/captures/Audit_2026_09_26/` (versionné, décision de Xav au
// plan de la spec 17), ou `RPG_SORTIE`.
//
// LA VUE DÉZOOMÉE. Le jeu n'a pas de zoom arrière : tout se dessine dans une
// résolution logique de 480 × 270 (`render.js#RESOLUTION_LOGIQUE`), que la
// caméra, le calque, le voile et le tri du champ relisent à CHAQUE frame. On
// ouvre donc le jeu à `?echelle=1` dans une fenêtre de la taille de la scène,
// et on élargit cette résolution à la scène entière, depuis la page (le module
// importé est celui du jeu, la même instance) : le jeu dessine alors TOUTE la
// carte, lui-même, avec sa lumière, sa nuit et ses monstres — aucun
// assemblage, rien de réimplémenté. Ce n'est jamais un mode du jeu : le HUD se
// dessine minuscule dans un coin, et la vue est à 1 pixel par unité (le jeu
// en montre 4 sur un écran 1080p). Les rognures « 1:1 » sont agrandies ×2 au
// plus proche voisin, la vue d'ensemble de la Maison réduite de moitié
// (lissée, en JPEG : c'est un plan, pas un rendu du jeu ; en PNG elle pèse
// 4 Mo dans un dossier versionné).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINE, PROFILS, ouvrirLeJeu, saveDansLaMaison, AUTOUR_DU_HEROS, positionPresDe } from './commun.mjs';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOSSIER = process.env.RPG_SORTIE || 'docs/captures/Audit_2026_09_26';
const PARTIES = (process.env.RPG_PARTIES || 'cartes,heros,follet,stations,monstres,decor,hud').split(',');
const TILE = 32;
const SCENES = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'scenes.json'), 'utf8'));
// Les teintes des follets, lues au catalogue : celles que l'atelier nomme
// (`feu`, `eau`, `terre`) sont recopiées et ont dérivé (constat de cet audit).
const TEINTES = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'companions.json'), 'utf8'))
  .map((c) => encodeURIComponent(c.render.couleur)).join(',');
// ms dans le cycle (`daynight.js`), ceux de `traversee_nuit.mjs` : le plein
// jour à plat ; 10 s après l'entrée en nuit, pour que la nuit tienne pendant
// que les rôdeurs du Chaos apparaissent (6 × 8 s, `spawns.json`).
const PLEIN_JOUR = 200000;
const NUIT = 700000;
const REMPLISSAGE_NUIT_MS = 52000;
const erreurs = [];

function ecrireImage(chemin, dataUrl) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`capture : ${chemin}`);
}

// La loupe de l'audit : la même fenêtre logique que `commun.mjs#loupe`,
// agrandie au plus proche voisin, mais écrite SEULE dans son fichier. Celle
// de `commun.mjs` se pose par-dessus la page et la capture garde le jeu
// autour : lisible au banc d'une session, trompeur dans un album qui reste.
// Des pixels par unité logique : la plus grande fenêtre tient dans ~1040 px
// (le héros à 20, cinq fois le jeu en 1080p ; une station à 8, deux fois).
async function loupe(chrome, { x, y, largeur, hauteur }, chemin) {
  const zoom = Math.max(1, Math.floor(1040 / Math.max(largeur, hauteur)));
  const url = await chrome.evaluer(`(() => {
    const jeu = document.querySelector('canvas');
    const k = jeu.width / 480;
    const c = document.createElement('canvas');
    c.width = ${largeur} * ${zoom}; c.height = ${hauteur} * ${zoom};
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(jeu, ${x} * k, ${y} * k, ${largeur} * k, ${hauteur} * k, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  })()`);
  ecrireImage(chemin, url);
}

function noterErreurs(chrome, ou) {
  const e = chrome.erreurs();
  if (e.length) erreurs.push(`${ou} : ${JSON.stringify(e)}`);
}

// Une scène entière, dessinée par le jeu (voir l'en-tête). `rognures` en
// TUILES [x, y, l, h] ; `reduction` divise la vue d'ensemble (1 : telle quelle).
async function sceneEntiere(chrome, { nom, save, qualite = 'moyen', attente = 1500, reduction = 1, rognures = {} }) {
  const scene = SCENES.find((s) => s.id === save.hero.scene);
  const [L, H] = [scene.width * TILE, scene.height * TILE];
  await ouvrirLeJeu(chrome, { largeur: L, hauteur: H, save, requete: `?echelle=1&qualite=${qualite}` });
  const images = await chrome.evaluer(`(async () => {
    const rendu = await import('/src/render.js');
    rendu.RESOLUTION_LOGIQUE.largeur = ${L};
    rendu.RESOLUTION_LOGIQUE.hauteur = ${H};
    await new Promise((ok) => setTimeout(ok, ${attente}));
    const jeu = document.querySelector('canvas');
    const copie = (sx, sy, sl, sh, facteur, lisse, format = 'image/png') => {
      const c = document.createElement('canvas');
      c.width = Math.round(sl * facteur); c.height = Math.round(sh * facteur);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = lisse;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(jeu, sx, sy, sl, sh, 0, 0, c.width, c.height);
      return c.toDataURL(format, 0.9);
    };
    const rognures = ${JSON.stringify(rognures)};
    return {
      vue: copie(0, 0, jeu.width, jeu.height, ${1 / reduction}, ${reduction > 1}, ${reduction > 1 ? "'image/jpeg'" : "'image/png'"}),
      ...Object.fromEntries(Object.entries(rognures).map(([n, [x, y, l, h]]) => [n, copie(x * ${TILE}, y * ${TILE}, l * ${TILE}, h * ${TILE}, 2, false)])),
    };
  })()`);
  for (const [n, url] of Object.entries(images)) {
    const ext = url.startsWith('data:image/jpeg') ? 'jpg' : 'png';
    ecrireImage(`${DOSSIER}/${nom}${n === 'vue' ? '' : `_${n}`}.${ext}`, url);
  }
  noterErreurs(chrome, nom);
}

// Les cartes : la Maison entière de jour et de nuit, puis les salles.
async function cartes(chrome) {
  // Les rognures, en tuiles, cadrées sur les zones de `scenes.json` au 26/09
  // (la maison 78–94 × 50–64, le jardin 96–118 × 48–66, la forêt 0–66, les
  // clairières des stèles à x 19, le Chaos du nord-est 140–166 × 6–28) : un
  // état des lieux est daté, ses cadres aussi.
  const rognures = {
    maison: [76, 47, 20, 18], jardin: [95, 46, 24, 21], lisiere: [56, 48, 20, 20],
    steles: [12, 40, 20, 34], champ_est: [140, 50, 20, 20], chaos_nord_est: [138, 4, 30, 26],
  };
  const jour = saveDansLaMaison({ compagnon: 'comp_follet_feu' });
  jour.monde.heure = PLEIN_JOUR;
  await sceneEntiere(chrome, { nom: '01_carte_maison_jour', save: jour, reduction: 2, rognures });
  // La nuit au Nv.10 : les deux zones du Chaos sont ouvertes (`spawns.json`).
  const nuit = saveDansLaMaison({ compagnon: 'comp_follet_feu' });
  nuit.monde.heure = NUIT;
  nuit.hero.niveau = 10;
  nuit.hero.stats = { points: { stat_vitalite: 45 } };
  nuit.hero.pv = 10 + 8 * 50;
  await sceneEntiere(chrome, { nom: '02_carte_maison_nuit', save: nuit, reduction: 2, rognures, attente: REMPLISSAGE_NUIT_MS });

  // Les salles : la Grotte (son rampant vivant), puis l'Annexe au Nv.15, le
  // chapitre 1 déjà vu (le dialogue d'entrée couvrirait la salle).
  const salles = SCENES.filter((s) => s.id !== 'scene_maison_exterieur');
  for (const [i, s] of salles.entries()) {
    const save = saveDansLaMaison({ compagnon: 'comp_follet_feu' });
    save.hero.scene = s.id;
    save.hero.x = (s.spawn.x + 0.5) * TILE;
    save.hero.y = (s.spawn.y + 0.5) * TILE;
    save.hero.niveau = 15;
    save.hero.pv = null;
    save.monde.heure = PLEIN_JOUR;
    save.flags.flag_chapitre_1_vu = true;
    if (s.id.startsWith('scene_grotte')) delete save.flags.flag_grotte_monstre_tue;
    await sceneEntiere(chrome, { nom: `03_${String(i + 1)}_${s.id.replace('scene_', '')}`, save });
  }
}

// Le héros : la planche de l'atelier (les huit directions et les angles de
// référence de Xav, les trois teintes, trois fonds), puis la loupe en jeu, de
// jour et de nuit, dans les trois presets.
async function heros(chrome) {
  const planches = {
    '10_heros_directions': `id=visuel_heros&teintes=${TEINTES}&fonds=banc,jour,nuit`,
    '11_heros_angles_reference': 'id=visuel_heros&angles=66,76,90,132,241,300,342&teintes=feu&fonds=banc,jour,herbe,nuit',
    '12_heros_marche': 'id=visuel_heros&angles=90,180,270&teintes=feu&fonds=herbe&marche=90,180,270',
  };
  for (const [nom, q] of Object.entries(planches)) await planche(chrome, `atelier.html?${q}`, nom);
  for (const heure of ['jour', 'nuit']) {
    for (const qualite of ['bas', 'moyen', 'haut']) {
      const save = saveDansLaMaison({ compagnon: 'comp_follet_feu' });
      save.hero.x = (85 + 0.5) * TILE;
      save.hero.y = (49 + 0.5) * TILE;
      save.monde.heure = heure === 'jour' ? PLEIN_JOUR : NUIT;
      await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save, requete: `?qualite=${qualite}` });
      await loupe(chrome, AUTOUR_DU_HEROS, `${DOSSIER}/13_heros_en_jeu_${heure}_${qualite}.png`);
      noterErreurs(chrome, `heros ${heure} ${qualite}`);
    }
  }
}

// Une planche d'outil (`tools/*.html`), capturée entière.
async function planche(chrome, page, nom) {
  await chrome.taille(1850, 1000, 1);
  await chrome.ouvrir(`${ORIGINE}/tools/${page}`);
  if (page.startsWith('atelier')) {
    await chrome.evaluer(`new Promise((r) => { (function g() { window.pret ? r(true) : setTimeout(g, 50); })(); })`);
  } else {
    await chrome.attendre(900);
  }
  const [l, h] = await chrome.evaluer(`[document.documentElement.scrollWidth, document.documentElement.scrollHeight]`);
  await chrome.taille(Math.min(l, 4000), Math.min(h, 6000), 1);
  await chrome.attendre(150);
  await chrome.capture(`${DOSSIER}/${nom}.png`);
  noterErreurs(chrome, nom);
}

// Le follet : les trois éléments EN SCÈNE (la fenêtre élargie autour du
// héros, pour l'orbite et le sillage), de jour et sous sa propre lumière la
// nuit ; puis la planche des follets côte à côte, avec le follet de Zéros.
async function follet(chrome) {
  const autour = { x: 200, y: 105, largeur: 80, hauteur: 60 };
  for (const teinte of ['feu', 'eau', 'terre']) {
    for (const heure of ['jour', 'nuit']) {
      const save = saveDansLaMaison({ compagnon: `comp_follet_${teinte}` });
      save.hero.x = (85 + 0.5) * TILE;
      save.hero.y = (49 + 0.5) * TILE;
      save.monde.heure = heure === 'jour' ? PLEIN_JOUR : NUIT;
      await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
      await loupe(chrome, autour, `${DOSSIER}/20_follet_${teinte}_${heure}.png`);
      noterErreurs(chrome, `follet ${teinte} ${heure}`);
    }
  }
  await planche(chrome, 'banc_visuel.html?id=visuel_follet_feu,visuel_follet_eau,visuel_follet_terre,visuel_follet_zeros', '21_follets_banc');
}

// Les stations de la Maison, en scène (plein jour), puis au banc côte à côte.
async function stations(chrome) {
  for (const id of ['station_table', 'station_coffre', 'station_atelier', 'station_puits']) {
    const save = saveDansLaMaison();
    Object.assign(save.hero, await positionPresDe(id));
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
    await loupe(chrome, { x: 190, y: 85, largeur: 120, hauteur: 90 }, `${DOSSIER}/30_${id}.png`);
    noterErreurs(chrome, id);
  }
  await planche(chrome, 'banc_visuel.html?id=visuel_table,visuel_coffre,visuel_atelier,visuel_puits&echelle=2.1', '31_stations_banc');
}

// Les monstres, au banc côte à côte (le standing se juge ensemble), puis les
// tireurs de l'Annexe en plein échange.
async function monstres(chrome) {
  await planche(chrome, 'banc_visuel.html?id=visuel_monstre_rampant,visuel_monstre_rodeur,visuel_monstre_cracheur,visuel_zeros,visuel_gardien', '40_monstres_banc');
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_annexe_salle_1';
  save.hero.niveau = 15;
  save.hero.pv = null;
  save.hero.x = 10.5 * TILE;
  save.hero.y = 11.5 * TILE;
  save.monde.heure = PLEIN_JOUR;
  save.flags.flag_chapitre_1_vu = true;
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
  await chrome.attendre(3500);
  await chrome.capture(`${DOSSIER}/41_annexe_tireurs_echange.png`);
  noterErreurs(chrome, 'tireurs');
}

// Le décor au banc : les arbres, les rochers, la torche, la stèle, le
// cristal ; puis le grain des sols à la loupe en jeu (herbe, chemin, parquet).
async function decor(chrome) {
  await planche(chrome, 'banc_visuel.html?id=visuel_arbre_chene,visuel_arbre_sapin,visuel_arbre_fruitier,visuel_rocher_grand,visuel_rocher_recoltable,visuel_torche_plantee_allumee,visuel_stele,visuel_cristal', '50_decor_banc');
  const vues = { herbe: [110, 30], chemin: [60, 58], parquet: [88, 60] };
  for (const [nom, [cx, cy]] of Object.entries(vues)) {
    const save = saveDansLaMaison();
    save.hero.x = (cx + 0.5) * TILE;
    save.hero.y = (cy + 0.5) * TILE;
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
    await loupe(chrome, { x: 150, y: 70, largeur: 180, hauteur: 130 }, `${DOSSIER}/51_grain_${nom}.png`);
    noterErreurs(chrome, `grain ${nom}`);
  }
}

// Le HUD et le menu, sous les deux profils de référence : le PC 1080p et le
// téléphone (780 × 360 à DPR 3).
async function hud(chrome) {
  for (const nom of ['grand', 'telephone']) {
    const profil = PROFILS.find((p) => p.nom === nom);
    const save = saveDansLaMaison({ compagnon: 'comp_follet_feu' });
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { ...profil, save });
    await chrome.capture(`${DOSSIER}/60_jeu_${nom}.png`);
    if (nom === 'grand') await loupe(chrome, { x: 0, y: 0, largeur: 200, hauteur: 60 }, `${DOSSIER}/61_hud_loupe.png`);
    await chrome.touche('Escape');
    await chrome.attendre(500);
    await chrome.capture(`${DOSSIER}/62_menu_${nom}.png`);
    noterErreurs(chrome, `hud ${nom}`);
  }
}

const TOUTES = { cartes, heros, follet, stations, monstres, decor, hud };

export default async function (chrome) {
  for (const p of PARTIES) {
    if (!TOUTES[p]) throw new Error(`partie inconnue : ${p}`);
    await TOUTES[p](chrome);
  }
  console.log(erreurs.length ? `ERREURS\n${erreurs.join('\n')}` : 'ok');
  if (erreurs.length) process.exitCode = 1;
}

// Spec 14, palier B : la stèle s'éveille, et la descente. Le follet qui
// suggère le carnet, le déchiffrement (au milieu, puis fini), la vue
// rapprochée en clair avec Descendre, la salle 1, puis les trois salles portes
// ouvertes (`?flags=`) et la sortie près de la stèle rouge. OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/annexe_descente.mjs
import { ouvrirLeJeu, saveDansLaMaison, cliquer, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/annexe-descente-2026-09-24';
const TILE = 32;
const PORTES = '?flags=flag_annexe_passage_1,flag_annexe_passage_2,flag_annexe_sortie';

const lireFiche = (chrome) => chrome.evaluer(`(() => {
  const e = document.querySelector('.ecran-fiches:not([hidden])');
  if (!e) return null;
  return { titre: (e.querySelector('.fiche-titre') || {}).textContent,
    lignes: [...e.querySelectorAll('.fiche-lignes > *')].map((x) => x.textContent) };
})()`);

function saveAuPiedDeLaStele({ dechiffre = false, ambianceVue = true } = {}) {
  const save = saveDansLaMaison();
  save.hero.niveau = 15;
  save.hero.x = 21.5 * TILE;
  save.hero.y = 68 * TILE + 35;
  save.monde.heure = 60_000;
  save.flags.flag_chapitre_1_vu = true;
  if (!ambianceVue) delete save.flags.flag_ambiance_stele_carnet;
  if (dechiffre) save.flags.flag_indice_grotte_dechiffre = true;
  return save;
}

export default async function (chrome) {
  const grand = PROFILS.find((p) => p.nom === 'grand');
  const telephone = PROFILS.find((p) => p.nom === 'telephone');

  // 1. Le follet suggère le carnet.
  await ouvrirLeJeu(chrome, { ...grand, save: saveAuPiedDeLaStele({ ambianceVue: false }) });
  await chrome.attendre(2500);
  await chrome.capture(`${DOSSIER}/1_follet_suggere.png`);

  // 2. Le carnet se déchiffre.
  await ouvrirLeJeu(chrome, { ...grand, save: saveAuPiedDeLaStele() });
  await chrome.touche('Escape');
  await cliquer(chrome, '[data-carte="carte_indices"]');
  await chrome.attendre(900);
  await chrome.capture(`${DOSSIER}/2_carnet_milieu.png`);
  console.log('milieu', JSON.stringify(await lireFiche(chrome)));
  await chrome.attendre(2500);
  await chrome.capture(`${DOSSIER}/2_carnet_fin.png`);
  console.log('fin', JSON.stringify(await lireFiche(chrome)));

  // 3. La vue rapprochée, en clair, avec Descendre ; puis la salle 1.
  for (const profil of [grand, telephone]) {
    await ouvrirLeJeu(chrome, { ...profil, save: saveAuPiedDeLaStele({ dechiffre: true }) });
    await chrome.touche('KeyE');
    await chrome.attendre(1400);
    await chrome.capture(`${DOSSIER}/3_${profil.nom}_vue_clair.png`);
    await chrome.touche('KeyE');
    await chrome.attendre(1200);
    await chrome.capture(`${DOSSIER}/3_${profil.nom}_salle_1.png`);
  }

  // 4. Les trois salles, portes ouvertes, et la sortie.
  const places = [
    ['scene_annexe_salle_1', 10, 3],
    ['scene_annexe_salle_2', 17, 6],
    ['scene_annexe_salle_3', 12, 9],
    ['scene_maison_exterieur', 18, 47],
  ];
  for (const [scene, x, y] of places) {
    const save = saveDansLaMaison();
    save.hero.scene = scene;
    save.hero.x = (x + 0.5) * TILE;
    save.hero.y = (y + 0.5) * TILE;
    save.monde.heure = 60_000;
    await ouvrirLeJeu(chrome, { ...grand, save, requete: PORTES });
    await chrome.capture(`${DOSSIER}/4_${scene}.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

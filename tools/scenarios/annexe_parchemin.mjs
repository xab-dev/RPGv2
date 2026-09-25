// Spec 14, paliers G et H : le coffre, le parchemin, l'Onde, le levier-récompense,
// la sortie. La salle du Gardien, Gardien vaincu : le coffre fermé et le levier
// dans son halo ; le parchemin qui s'écrit, puis entier ; l'emplacement de la
// compétence ; l'éclat au sol ; le fondu de la sortie. Puis la salle 1 : la jauge
// qui se charge, le tir, l'onde, la recharge.
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/annexe_parchemin.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/annexe-parchemin-2026-09-25';
const TILE = 32;

function saveSalle3({ competence = false } = {}) {
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_annexe_salle_3';
  save.hero.niveau = 30;
  save.hero.pv = null;
  save.hero.x = 12.5 * TILE;
  save.hero.y = 8.5 * TILE + 18;
  save.monde.heure = 60_000;
  save.flags.flag_chapitre_1_vu = true;
  save.flags.flag_gardien_vaincu = true;
  if (competence) save.flags.flag_competence_1 = true;
  return save;
}

export default async function (chrome) {
  const grand = PROFILS.find((p) => p.nom === 'grand');
  const telephone = PROFILS.find((p) => p.nom === 'telephone');
  const pc = PROFILS.find((p) => p.nom === 'pc');

  for (const profil of [grand, telephone]) {
    await ouvrirLeJeu(chrome, { ...profil, save: saveSalle3() });
    await chrome.attendre(300);
    await chrome.capture(`${DOSSIER}/1_${profil.nom}_coffre_et_levier.png`);
    await chrome.touche('KeyE');
    await chrome.attendre(700);
    await chrome.capture(`${DOSSIER}/2_${profil.nom}_parchemin_ecrit.png`);
    await chrome.touche('Digit3');
    await chrome.attendre(400);
    await chrome.capture(`${DOSSIER}/3_${profil.nom}_parchemin_entier.png`);
    await chrome.touche('Digit3');
    await chrome.attendre(600);
    await chrome.capture(`${DOSSIER}/4_${profil.nom}_coffre_ouvert_emplacement.png`);
  }

  // Le levier-récompense : l'éclat au sol, la porte ouverte ; puis la sortie.
  const levier = saveSalle3({ competence: true });
  levier.hero.x = 15.5 * TILE;
  levier.hero.y = 1.5 * TILE + 14;
  await ouvrirLeJeu(chrome, { ...grand, save: levier });
  await chrome.touche('KeyE');
  await chrome.attendre(500);
  await chrome.capture(`${DOSSIER}/5_eclat_au_sol_porte_ouverte.png`);

  // La salle 1, les cracheurs : la jauge, le tir, l'onde, la recharge.
  for (const profil of [pc, telephone]) {
    const s1 = saveSalle3({ competence: true });
    s1.hero.scene = 'scene_annexe_salle_1';
    // Collé au premier cracheur (4, 3) : le follet l'engage dès la première
    // frame, et la charge monte tant qu'il ne s'est pas assez éloigné. Des PV en
    // plus pour tenir le temps de la charge.
    s1.hero.x = 4.5 * TILE + 18;
    s1.hero.y = 3.5 * TILE;
    s1.hero.stats.points = { stat_vitalite: 20 };
    await ouvrirLeJeu(chrome, { ...profil, save: s1 });
    await chrome.attendre(2500);
    await chrome.capture(`${DOSSIER}/6_${profil.nom}_charge.png`);
    await chrome.attendre(3000);
    await chrome.capture(`${DOSSIER}/7_${profil.nom}_charge_pleine.png`);
    await chrome.touche('Digit1');
    await chrome.attendre(180);
    await chrome.capture(`${DOSSIER}/8_${profil.nom}_tir.png`);
    await chrome.attendre(250);
    await chrome.capture(`${DOSSIER}/9_${profil.nom}_onde.png`);
    await chrome.attendre(2500);
    await chrome.capture(`${DOSSIER}/10_${profil.nom}_recharge.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

// Spec 14, palier I : choisir. La page Stats avec la compétence en carte sous
// les stats ; le choix des emplacements (en cartes) ; la compétence rangée en
// 3 ; la carte Follet, et le fondu court du changement de follet.
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/annexe_choisir.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/annexe-choisir-2026-09-25';

function saveChoix() {
  const save = saveDansLaMaison();
  save.hero.niveau = 30;
  save.hero.stats.points = { stat_force: 12, stat_vitalite: 8, stat_esprit: 6 };
  save.hero.points_stats_libres = 3;
  save.flags.flag_competence_1 = true;
  save.hero.competences = { slot_skill_1: 'skill_onde' };
  return save;
}

export default async function (chrome) {
  const appuyer = async (touche, ms = 120) => { await chrome.touche(touche); await chrome.attendre(ms); };
  for (const profil of [PROFILS.find((p) => p.nom === 'grand'), PROFILS.find((p) => p.nom === 'telephone')]) {
    await ouvrirLeJeu(chrome, { ...profil, save: saveChoix() });
    await chrome.attendre(300);
    await chrome.capture(`${DOSSIER}/0_${profil.nom}_hud_emplacement_1.png`);
    await appuyer('Escape');
    await appuyer('Space');
    await chrome.capture(`${DOSSIER}/1_${profil.nom}_heros_trois_cartes.png`);
    await appuyer('ArrowRight');
    await appuyer('Space');
    await chrome.capture(`${DOSSIER}/2_${profil.nom}_stats.png`);
    await appuyer('ArrowDown');
    await chrome.capture(`${DOSSIER}/3_${profil.nom}_fiche_competence.png`);
    await appuyer('Space');
    await chrome.capture(`${DOSSIER}/4_${profil.nom}_choix_emplacement.png`);
    await appuyer('ArrowDown');
    await appuyer('Space');
    await chrome.capture(`${DOSSIER}/5_${profil.nom}_rangee_en_3.png`);
    await appuyer('ArrowUp');
    await appuyer('Digit1');
    await chrome.capture(`${DOSSIER}/6_${profil.nom}_confirmation_reprendre.png`);
    await appuyer('ArrowRight');
    await appuyer('Space');
    await chrome.capture(`${DOSSIER}/7_${profil.nom}_repris.png`);
    await appuyer('Digit3');
    await appuyer('ArrowDown');
    await appuyer('ArrowLeft');
    await appuyer('Space');
    await chrome.capture(`${DOSSIER}/8_${profil.nom}_follet.png`);
    // Le focus part du premier follet (Feu) : celui d'Eau accompagne déjà.
    await appuyer('Space', 60);
    await chrome.capture(`${DOSSIER}/9_${profil.nom}_fondu_follet.png`);
    await chrome.attendre(700);
    await chrome.capture(`${DOSSIER}/10_${profil.nom}_nouveau_follet_hud_3.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

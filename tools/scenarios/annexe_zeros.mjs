// Spec 14, palier D : Zéros. La salle 1 nettoyée, le levier déjà levé : au
// chargement, la rencontre commence (apparition en fondu, Zéros parle), le
// combat, la relève, le seuil (Zéros parle), l'effacement, le passage ouvert.
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/annexe_zeros.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/annexe-zeros-2026-09-25';
const TILE = 32;

function saveLevierLeve() {
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_annexe_salle_1';
  save.hero.niveau = 15;
  save.hero.pv = null;
  save.hero.x = 10.5 * TILE;
  save.hero.y = 7.5 * TILE;
  save.monde.heure = 60_000;
  save.flags.flag_chapitre_1_vu = true;
  save.flags.flag_annexe_salle_1_nettoyee = true;
  save.flags.flag_annexe_levier_1 = true;
  save.puzzles = { ...(save.puzzles || {}), puzzle_annexe_levier_salle_1: { actif: true } };
  return save;
}

async function fermerDialogue(chrome) {
  for (let i = 0; i < 8; i += 1) {
    await chrome.attendre(700);
    await chrome.touche('Space');
  }
}

export default async function (chrome) {
  const grand = PROFILS.find((p) => p.nom === 'grand');
  const telephone = PROFILS.find((p) => p.nom === 'telephone');

  for (const profil of [grand, telephone]) {
    await ouvrirLeJeu(chrome, { ...profil, save: saveLevierLeve() });
    await chrome.attendre(150);
    await chrome.capture(`${DOSSIER}/1_${profil.nom}_apparition.png`);
    await chrome.attendre(1200);
    await chrome.capture(`${DOSSIER}/2_${profil.nom}_zeros_parle.png`);
    await fermerDialogue(chrome);
    await chrome.attendre(1000);
    await chrome.capture(`${DOSSIER}/3_${profil.nom}_combat.png`);
    await chrome.attendre(1500);
    await chrome.capture(`${DOSSIER}/4_${profil.nom}_combat.png`);
  }

  // La relève : le héros arrive à 1 PV, le premier coup de Zéros le fait tomber.
  const save = saveLevierLeve();
  save.hero.pv = 1;
  await ouvrirLeJeu(chrome, { ...grand, save });
  await chrome.attendre(1400);
  await fermerDialogue(chrome);
  await chrome.attendre(4000);
  await chrome.capture(`${DOSSIER}/5_releve.png`);
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

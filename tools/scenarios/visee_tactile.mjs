// `D-248` : l'Onde se vise au doigt. Au profil téléphone (DPR 3), la salle 1,
// l'Onde chargée : un doigt se pose sur le bouton de la compétence et glisse
// vers le HAUT (le trait de visée doit partir du héros vers le nord), puis se
// lève (le tir part vers le nord, pas vers le cracheur, à l'ouest).
// Les contacts sont de vrais `TouchEvent` envoyés au canvas du jeu, à la
// position ÉCRAN du bouton (la conversion inverse de `ecranVersLogique`).
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/visee_tactile.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';
import { BOUTONS_SKILLS } from '../../src/ui/hud_layout.js';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/visee-tactile-2026-09-25';
const TILE = 32;
const BOUTON = BOUTONS_SKILLS.find((b) => b.verbe === 'skill_1');

// Un contact au point LOGIQUE (lx, ly), converti en pixels CSS comme le jeu le
// présente (`render.js#calculerRectanglePresentation`, en pixels physiques).
function contact(type, lx, ly) {
  return `(async () => {
    const { calculerRectanglePresentation } = await import('/src/render.js');
    const canvas = document.querySelector('canvas:not(.curseur-calque)');
    const rect = calculerRectanglePresentation(canvas.width, canvas.height);
    const dpr = devicePixelRatio || 1;
    const clientX = (${lx} * rect.echelle + rect.x) / dpr;
    const clientY = (${ly} * rect.echelle + rect.y) / dpr;
    const t = new Touch({ identifier: 7, target: canvas, clientX, clientY });
    const fin = ${JSON.stringify(type)} === 'touchend';
    canvas.dispatchEvent(new TouchEvent(${JSON.stringify(type)}, {
      touches: fin ? [] : [t], targetTouches: fin ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true,
    }));
    return true;
  })()`;
}

export default async function (chrome) {
  const telephone = PROFILS.find((p) => p.nom === 'telephone');
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_annexe_salle_1';
  save.hero.niveau = 30;
  save.hero.pv = null;
  save.hero.x = 4.5 * TILE + 18;
  save.hero.y = 3.5 * TILE;
  save.hero.stats.points = { stat_vitalite: 20 };
  save.hero.competences = { slot_skill_1: 'skill_onde' };
  save.monde.heure = 60_000;
  save.flags.flag_chapitre_1_vu = true;
  save.flags.flag_gardien_vaincu = true;
  save.flags.flag_competence_1 = true;
  await ouvrirLeJeu(chrome, { ...telephone, save });
  await chrome.attendre(5500);
  await chrome.evaluer(contact('touchstart', BOUTON.cx, BOUTON.cy));
  await chrome.attendre(100);
  await chrome.evaluer(contact('touchmove', BOUTON.cx + 2, BOUTON.cy - 40));
  await chrome.attendre(150);
  await chrome.capture(`${DOSSIER}/1_glisse_vers_le_nord.png`);
  await chrome.evaluer(contact('touchend', BOUTON.cx + 2, BOUTON.cy - 40));
  await chrome.attendre(200);
  await chrome.capture(`${DOSSIER}/2_tir_vers_le_nord.png`);
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

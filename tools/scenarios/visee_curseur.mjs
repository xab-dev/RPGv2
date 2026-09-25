// `D-247` : l'Onde se vise au curseur. La salle 1, le héros collé à l'EST du
// premier cracheur (la cible automatique est donc à l'ouest) ; la souris se
// pose au bord droit de l'écran, et le tir (une touche du clavier, qui fait du
// clavier le périphérique qui joue) doit partir vers l'EST.
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/visee_curseur.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/visee-curseur-2026-09-25';
const TILE = 32;

export default async function (chrome) {
  const grand = PROFILS.find((p) => p.nom === 'grand');
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
  await ouvrirLeJeu(chrome, { ...grand, save });
  await chrome.survol(grand.largeur - 20, grand.hauteur / 2);
  await chrome.attendre(5500);
  await chrome.capture(`${DOSSIER}/1_charge_pleine_curseur_a_droite.png`);
  await chrome.touche('Digit1');
  await chrome.attendre(200);
  await chrome.capture(`${DOSSIER}/2_tir_vers_le_curseur.png`);
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

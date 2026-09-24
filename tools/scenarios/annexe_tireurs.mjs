// Spec 14, palier C : les tireurs. La salle 1 à l'arrivée (les cracheurs
// attendent), en plein échange de crachats, puis nettoyée avec son levier.
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/annexe_tireurs.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/annexe-tireurs-2026-09-25';
const TILE = 32;

function saveEnSalle1({ nettoyee = false } = {}) {
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_annexe_salle_1';
  save.hero.niveau = 15;
  save.hero.pv = null;
  save.hero.x = 10.5 * TILE;
  save.hero.y = 11.5 * TILE;
  save.monde.heure = 60_000;
  save.flags.flag_chapitre_1_vu = true;
  if (nettoyee) save.flags.flag_annexe_salle_1_nettoyee = true;
  return save;
}

const lirePv = (chrome) => chrome.evaluer(`(() => {
  const o = window.__orchestrateur;
  return o ? { pv: o.obtenirHero().pv, tirs: o.obtenirProjectiles().length,
    monstres: o.obtenirMonstres().filter((m) => !m.mort).length } : null;
})()`);

export default async function (chrome) {
  const grand = PROFILS.find((p) => p.nom === 'grand');
  const telephone = PROFILS.find((p) => p.nom === 'telephone');

  for (const profil of [grand, telephone]) {
    await ouvrirLeJeu(chrome, { ...profil, save: saveEnSalle1() });
    await chrome.capture(`${DOSSIER}/1_${profil.nom}_arrivee.png`);
    await chrome.attendre(3500);
    await chrome.capture(`${DOSSIER}/2_${profil.nom}_echange.png`);
    console.log(profil.nom, 'échange', JSON.stringify(await lirePv(chrome)));
    await chrome.attendre(900);
    await chrome.capture(`${DOSSIER}/3_${profil.nom}_echange.png`);
  }

  await ouvrirLeJeu(chrome, { ...grand, save: saveEnSalle1({ nettoyee: true }) });
  await chrome.capture(`${DOSSIER}/4_nettoyee_levier.png`);
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

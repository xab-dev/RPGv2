// Palier E de `specs/09_reglages-graphiques.md` : le mode **Auto** vu dans un
// vrai Chrome — OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/auto_graphismes.mjs
//
// Ce que ce scénario va chercher, et que le test headless ne peut pas dire :
// la descente se déclenche sur des frames **réellement** lentes, mesurées par
// le navigateur, pas sur des nombres qu'on lui a donnés. Le bridage CPU de
// Chrome tient lieu d'appareil faible — un facteur n'est pas un appareil, il
// sert à provoquer le symptôme, jamais à prédire un téléphone.
//
// Trois passes, dans cet ordre :
//   1. **bridé, Auto** : le jeu rame, Auto doit descendre de Moyen à Bas, une
//      seule fois, et la carte de Paramètres doit le DIRE (« Auto (Bas) »),
//      puisqu'elle relit la source et non la sauvegarde ;
//   2. **non bridé, Auto** : le même trajet, fluide — rien ne doit bouger.
//      Sans cette passe, la première ne prouverait rien : un Auto qui
//      descendrait toujours la passerait aussi ;
//   3. **bridé, choix manuel `haut`** : le joueur a choisi, on ne lui retire
//      rien. C'est la promesse « un choix manuel coupe Auto », éprouvée là où
//      elle compte, à travers la vraie sauvegarde.
//
// La bannière d'annonce, elle, n'est PAS observée ici : elle vit sur le canvas
// et dure quelques secondes. Ce qui est observable est le journal de la
// descente (`chrome.messages('info')`) et l'état de la carte.
import { ouvrirLeJeu, saveDansLaMaison, cliquer } from './commun.mjs';

const TILE = 32;
const PLEIN_JOUR = 200000;
// Assez pour que 15 % des frames dépassent 20 ms sur la machine de dev. Le
// palier A a mesuré ×6 comme « appareil faible » ; ici on veut le symptôme
// franc, pas une mesure — d'où un facteur plus dur.
const BRIDAGE = Number(process.env.RPG_BRIDAGE) || 20;

const libelle = (chrome) => chrome.evaluer(
  `(document.querySelector('[data-carte="carte_graphismes"] .carte-phrase') || {}).textContent`,
);

// Marche vers l'est : c'est en franchissant des tuiles que le calque statique
// se reconstruit, donc que les frames lentes arrivent (`D-01`).
async function marcher(chrome, secondes) {
  for (let i = 0; i < Math.round(secondes / 0.84); i += 1) await chrome.touche('KeyD', 420);
}

async function passe(chrome, { nom, bridage, reglage }) {
  const save = saveDansLaMaison();
  save.hero.x = (40 + 0.5) * TILE;
  save.hero.y = (56 + 0.5) * TILE;
  save.monde.heure = PLEIN_JOUR;
  if (reglage) save.settings.graphismes = reglage;

  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
  await chrome.bridageCpu(bridage);

  // Les 5 premières secondes d'une scène ne comptent pas (le calque s'y
  // construit) : on marche bien au-delà de la fenêtre de 10 s.
  await marcher(chrome, 25);
  await chrome.bridageCpu(1); // rendre la main pour ouvrir le menu sans souffrir

  await chrome.touche('Escape');
  await cliquer(chrome, '[data-carte="carte_parametres"]');
  const carte = await libelle(chrome);
  const descentes = (await chrome.messages('info')).filter((m) => m.includes('Auto descend'));

  console.log(`\n=== ${nom} (bridage CPU x${bridage}, réglage ${reglage || 'auto'})`);
  console.log(`  carte Paramètres : ${JSON.stringify(carte)}`);
  console.log(`  descentes journalisées : ${descentes.length}`);
  for (const d of descentes) console.log(`    ${d}`);
  const erreurs = chrome.erreurs();
  if (erreurs.length > 0) console.log(`  ERREURS CONSOLE : ${JSON.stringify(erreurs)}`);
  await chrome.capture(`docs/captures/auto-graphismes-2026-09-22/${nom}.png`);
}

export default async function (chrome) {
  await passe(chrome, { nom: 'bride_auto', bridage: BRIDAGE, reglage: null });
  await passe(chrome, { nom: 'fluide_auto', bridage: 1, reglage: null });
  await passe(chrome, { nom: 'bride_choix_haut', bridage: BRIDAGE, reglage: 'haut' });
}

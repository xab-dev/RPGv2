// Palier D de `specs/09_reglages-graphiques.md` : la carte Graphismes dans
// Paramètres, et le changement à chaud — OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/reglages_graphiques.mjs
//
// Ce que ce scénario va chercher, et qu'aucun test headless ne peut dire :
//   1. la carte tient dans la 6ᵉ case sous les TROIS profils, y compris le
//      `telephone` à DPR 3 — c'est le profil qui a attrapé `D-48`, et le seul
//      où px CSS et px physiques ne sont pas le même nombre ;
//   2. le libellé dit bien « Auto (Bas) » et jamais « Auto » seul (§5) ;
//   3. le cycle fait le tour et revient à Auto, par un CLIC réel ;
//   4. le changement se voit **dans la scène**, tout de suite, sans recharger
//      — d'où les deux vues du monde, menu refermé, en Bas puis en Haut.
import { ouvrirLeJeu, saveDansLaMaison, cliquer, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/reglages-graphiques-2026-09-22';

// Le libellé affiché par la carte, relu dans le DOM — jamais recomposé ici.
const libelle = (chrome) => chrome.evaluer(
  `(document.querySelector('[data-carte="carte_graphismes"] .carte-phrase') || {}).textContent`,
);

export default async function (chrome) {
  for (const profil of PROFILS) {
    const nom = (vue) => `${DOSSIER}/${profil.nom}_${vue}.png`;
    await ouvrirLeJeu(chrome, { ...profil, save: saveDansLaMaison() });

    await chrome.touche('Escape');
    await cliquer(chrome, '[data-carte="carte_parametres"]');
    await chrome.capture(nom('parametres'));

    // Le tour complet du cycle, par des clics réels sur la carte. On relit le
    // libellé APRÈS chaque clic : c'est l'état relu à la source, pas un
    // booléen que le menu tiendrait de son côté.
    const tour = [await libelle(chrome)];
    for (let i = 0; i < 4; i += 1) {
      await cliquer(chrome, '[data-carte="carte_graphismes"]');
      tour.push(await libelle(chrome));
      await chrome.capture(nom(`cycle_${i + 1}`));
    }
    console.log(profil.nom, 'cycle :', JSON.stringify(tour));

    // Le monde, menu refermé : c'est là que Bas doit se voir (sol sans grain,
    // pas de décor, pas de traînée) et Haut ressembler à Moyen.
    for (const cible of ['bas', 'haut']) {
      let garde = 0;
      while (!(await libelle(chrome)).toLowerCase().includes(cible) && garde < 6) {
        await cliquer(chrome, '[data-carte="carte_graphismes"]');
        garde += 1;
      }
      await chrome.touche('Escape');
      await chrome.attendre(400);
      await chrome.capture(nom(`monde_${cible}`));
      await chrome.touche('Escape');
      await cliquer(chrome, '[data-carte="carte_parametres"]');
    }

    console.log(profil.nom, 'erreurs console', JSON.stringify(chrome.erreurs()));
  }
}

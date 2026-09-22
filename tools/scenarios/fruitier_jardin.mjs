// L'arbre fruitier DANS LE JEU, à côté du puits qui sert de référence : vrais
// pixels, vraie lumière de scène, vrai sol. Le fruitier est une TUILE (solide,
// dessinée dans le calque statique), pas une station : le banc ne sait pas
// dire comment il se tient au-dessus du puits, seule la scène le dit.
//   node tools/capture_chrome.mjs tools/scenarios/fruitier_jardin.mjs [suffixe]
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict reste une
// validation de Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/fruitier-2026-09-22';
const SUFFIXE = process.env.SUFFIXE || 'etat';
const TUILE = 32;
// Case du fruitier dans le layout de scene_maison_exterieur (lettre `F`).
const FRUITIER = { x: 104, y: 52 };

export default async function (chrome) {
  const cas = [
    // Héros entre l'arbre et le puits : l'échelle relative des trois se lit d'un coup.
    { nom: 'jour', heure: 0.25, dx: 1.5, dy: 2.5 },
  ];
  for (const c of cas) {
    const save = saveDansLaMaison();
    save.hero.x = (FRUITIER.x + c.dx) * TUILE;
    save.hero.y = (FRUITIER.y + c.dy) * TUILE;
    save.monde.heure = c.heure;
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${c.nom}_1920x1080.png`);
    const erreurs = chrome.erreurs();
    console.log(c.nom, erreurs.length ? `ERREURS CONSOLE ${JSON.stringify(erreurs)}` : 'ok');
  }
}

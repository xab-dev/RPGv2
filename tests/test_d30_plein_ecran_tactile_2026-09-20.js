// `D-30` — plein écran au premier appui tactile.
//
// Constat de Xav sur l'A04 (19/09) : la barre d'adresse reste affichée, le jeu
// n'occupe que **1440×810 sur 2340×1080** — 46 % de l'écran, échelle entière
// 3. En vrai plein écran il passerait à l'**échelle 4**.
//
// Le sous-système est explicitement « meilleur effort » : un navigateur peut
// refuser le plein écran, et le verrouillage en paysage n'existe pas partout.
// Il rattrape donc ses propres erreurs **à la frontière de son API publique**,
// jamais au niveau de la boucle de jeu — c'est la règle née du diagnostic
// freeze-musique (`audio.js`), et c'est exactement le même cas de figure.
//
// Prouvé ici :
//   1. la demande part une fois, et UNE seule — même si le joueur ressort du
//      plein écran, on ne le harcèle pas ;
//   2. tout échec est silencieux : refus, API absente, promesse rejetée,
//      exception synchrone — le jeu continue ;
//   3. le paysage n'est tenté qu'APRÈS un plein écran réussi, et son échec à
//      lui non plus ne remonte pas ;
//   4. c'est le tactile, et lui seul, qui déclenche — le clavier, la souris
//      et la manette n'ont aucun chemin vers cette demande ;
//   5. le redimensionnement qui suit passe par le chemin existant : l'échelle
//      change (3 -> 4), tous les calques la relisent, et le hit-test tactile
//      suit — un appui sur un bouton reste un appui sur ce bouton.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { creerPleinEcranTactile } from '../src/plein_ecran.js';
import { creerSourceTactile } from '../src/input/touch.js';
import {
  dimensionnerCanvasRendu, echelleDepuisCanvas, calculerRectanglePresentation,
} from '../src/render.js';
import { BOUTON_MENU } from '../src/ui/hud_layout.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Un élément de test qui accepte le plein écran, et note ce qu'on lui demande.
function elementQuiAccepte(journal) {
  return {
    requestFullscreen() { journal.push('plein-ecran'); return Promise.resolve(); },
  };
}
function ecranQuiAccepte(journal) {
  return { orientation: { lock(mode) { journal.push(`paysage:${mode}`); return Promise.resolve(); } } };
}

// --- 1. Une fois, et une seule -------------------------------------------
{
  const journal = [];
  const pleinEcran = creerPleinEcranTactile({
    element: elementQuiAccepte(journal),
    ecran: ecranQuiAccepte(journal),
  });

  assert.equal(pleinEcran.dejaDemande(), false);
  assert.equal(pleinEcran.demanderUneFois(), true, 'la première demande part');
  assert.equal(pleinEcran.dejaDemande(), true);

  // Les appuis suivants ne redemandent rien. C'est la consigne : « sortie du
  // plein écran par le joueur : ne pas le redemander en boucle ». Le loquet
  // est posé sur la TENTATIVE, jamais sur le résultat — sinon un refus du
  // navigateur relancerait une demande à chaque doigt posé.
  for (let i = 0; i < 50; i += 1) {
    assert.equal(pleinEcran.demanderUneFois(), false, 'aucune seconde demande');
  }
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(journal, ['plein-ecran', 'paysage:landscape'],
    'exactement une demande de plein écran, puis une de paysage');
  console.log('  une seule demande, même après 51 appuis');
}

// --- 2. Tout échec est silencieux ----------------------------------------
// Quatre façons de rater, et aucune ne doit remonter : le jeu doit continuer
// « exactement comme aujourd'hui ».
{
  const cas = {
    'API absente': {},
    'promesse rejetée': { requestFullscreen: () => Promise.reject(new Error('refusé par le navigateur')) },
    'exception synchrone': { requestFullscreen() { throw new Error('geste non reconnu'); } },
    'retour non-promesse': { requestFullscreen: () => undefined },
  };

  for (const [nom, element] of Object.entries(cas)) {
    const pleinEcran = creerPleinEcranTactile({ element, ecran: null });
    assert.doesNotThrow(() => pleinEcran.demanderUneFois(), `"${nom}" ne doit jamais remonter`);
    assert.equal(pleinEcran.dejaDemande(), true, `"${nom}" : le loquet est posé quand même`);
  }

  // Un élément absent non plus (le jeu tourne sans DOM dans les tests).
  assert.doesNotThrow(() => creerPleinEcranTactile({ element: null }).demanderUneFois());
  await new Promise((r) => setTimeout(r, 0));
  console.log(`  ${Object.keys(cas).length + 1} façons de rater, aucune ne remonte`);
}

// --- 3. Le paysage n'est tenté qu'après un plein écran réussi ------------
{
  // a) plein écran refusé -> on ne tente même pas le paysage : verrouiller
  //    l'orientation hors plein écran est refusé partout, autant ne pas
  //    salir la console du joueur.
  const journal = [];
  const pleinEcran = creerPleinEcranTactile({
    element: { requestFullscreen: () => Promise.reject(new Error('non')) },
    ecran: ecranQuiAccepte(journal),
  });
  pleinEcran.demanderUneFois();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(journal, [], 'pas de verrouillage de paysage si le plein écran a échoué');

  // b) plein écran accepté, paysage refusé -> silencieux lui aussi.
  const journal2 = [];
  const pleinEcran2 = creerPleinEcranTactile({
    element: elementQuiAccepte(journal2),
    ecran: { orientation: { lock: () => Promise.reject(new Error('non supporté')) } },
  });
  assert.doesNotThrow(() => pleinEcran2.demanderUneFois());
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(journal2, ['plein-ecran'], 'le plein écran a bien eu lieu, le paysage a échoué sans bruit');
  console.log('  paysage tenté seulement après un plein écran réussi, et silencieux');
}

// --- 4. Le tactile, et lui seul ------------------------------------------
{
  // `touch.js` reçoit un crochet `surPremierContact`, appelé DANS le
  // gestionnaire de `touchstart` — donc pendant le geste du joueur, ce que le
  // navigateur exige. Aucun autre périphérique n'a de chemin vers lui.
  const appels = [];
  const cible = { ecouteurs: {}, addEventListener(n, f) { this.ecouteurs[n] = f; } };
  creerSourceTactile(cible, { surPremierContact: () => appels.push('appui') });

  assert.deepEqual(appels, [], 'rien avant le premier contact');
  cible.ecouteurs.touchstart({ touches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
  assert.deepEqual(appels, ['appui'], 'le premier contact appelle le crochet');
  cible.ecouteurs.touchend({ touches: [] });
  cible.ecouteurs.touchstart({ touches: [{ identifier: 2, clientX: 20, clientY: 20 }] });
  assert.deepEqual(appels, ['appui', 'appui'],
    'touch.js appelle à chaque contact — c’est le loquet de plein_ecran.js qui filtre, un seul endroit');

  // Un crochet absent ne change rien (tous les tests d'avant ce ticket).
  const cible2 = { ecouteurs: {}, addEventListener(n, f) { this.ecouteurs[n] = f; } };
  const source2 = creerSourceTactile(cible2, {});
  assert.doesNotThrow(() => cible2.ecouteurs.touchstart({ touches: [{ identifier: 1, clientX: 1, clientY: 1 }] }));
  assert.equal(source2.estActif(), true);

  // Et aucune autre couche d'input ne connaît le plein écran.
  for (const fichier of ['keyboard.js', 'gamepad.js', 'input.js']) {
    const source = fs.readFileSync(path.join(RACINE, 'src', 'input', fichier), 'utf8');
    assert.ok(!/plein_ecran|requestFullscreen|surPremierContact/.test(source),
      `input/${fichier} ne doit pas connaître le plein écran`);
  }
  console.log('  déclenché par le tactile seul : clavier, manette et fusion d’input l’ignorent');
}

// --- 5. Le redimensionnement passe par le chemin existant ----------------
// Les chiffres sont ceux de l'A04, relevés par Xav.
{
  const AVANT = { l: 1440, h: 810 };   // avec la barre d'adresse
  const APRES = { l: 2340, h: 1080 };  // plein écran réel

  const canvasAvant = dimensionnerCanvasRendu(AVANT.l, AVANT.h);
  const canvasApres = dimensionnerCanvasRendu(APRES.l, APRES.h);
  assert.equal(canvasAvant.echelle, 3, 'avant : échelle entière 3 (constat de Xav)');
  assert.equal(canvasApres.echelle, 4, 'après : échelle entière 4 (gain attendu du ticket)');

  // LA dérivation unique de l'échelle voit le changement : tout calque qui la
  // relit sur la largeur de son canvas voit 4, donc aucun ne peut garder 3.
  assert.equal(echelleDepuisCanvas(canvasAvant.largeur), 3);
  assert.equal(echelleDepuisCanvas(canvasApres.largeur), 4);
  assert.notEqual(canvasAvant.largeur, canvasApres.largeur);
  assert.notEqual(canvasAvant.hauteur, canvasApres.hauteur);

  // Le rectangle de présentation change lui aussi — c'est lui qui convertit
  // un appui écran en coordonnées logiques. S'il restait périmé, le jeu
  // s'afficherait en grand mais les doigts tomberaient à côté : un défaut
  // bien pire que la barre d'adresse.
  const rectAvant = calculerRectanglePresentation(AVANT.l, AVANT.h);
  const rectApres = calculerRectanglePresentation(APRES.l, APRES.h);
  assert.notDeepEqual(rectAvant, rectApres);

  // La preuve utile : après le passage en plein écran, un appui sur le bouton
  // MENU reste un appui sur le bouton MENU.
  for (const [nom, rect] of [['avant', rectAvant], ['après', rectApres]]) {
    const cible = { ecouteurs: {}, addEventListener(n, f) { this.ecouteurs[n] = f; } };
    const tactile = creerSourceTactile(cible, {
      versLogique: (cx, cy) => ({ x: (cx - rect.x) / rect.echelle, y: (cy - rect.y) / rect.echelle }),
    });
    cible.ecouteurs.touchstart({
      touches: [{
        identifier: 1,
        clientX: BOUTON_MENU.cx * rect.echelle + rect.x,
        clientY: BOUTON_MENU.cy * rect.echelle + rect.y,
      }],
    });
    assert.equal(tactile.instantane().menu, true, `${nom} : l'appui sur MENU doit porter`);
  }
  console.log(`  A04 : ${AVANT.l}x${AVANT.h} (échelle 3) -> ${APRES.l}x${APRES.h} (échelle 4), hit-test tactile suivi`);
}

console.log('OK test_d30_plein_ecran_tactile');

// Diagnostic SD_ui-lisibilite_2026-09-15.md, sujet 3 — rouge-avant-patch pour
// les 3 hypothèses :
// 3a/3b : l'état "tactile actif" ne s'allume que sur un vrai `touchstart`
//   (jamais sur souris/pointeur — touch.js n'écoute même pas ces
//   événements), et s'éteint dès que clavier ou manette produit un signal
//   (§3, "reposer la tablette pour reprendre la manette").
// 3c : une seule source de vérité des positions (hud_layout.js), lue par le
//   dessin (hud.js) et par le hit-test tactile (touch.js) — un `touchstart`
//   aux coordonnées écran du centre dessiné d'un bouton, à une échelle et un
//   offset de letterbox non nuls, doit produire le verbe attendu.
import assert from 'node:assert/strict';
import { creerSourceTactile } from '../src/input/touch.js';
import { creerCoucheInput } from '../src/input/input.js';
import { calculerRectanglePresentation, versCoordonneesLogiques, RESOLUTION_LOGIQUE } from '../src/render.js';
import { BOUTON_ATTAQUE } from '../src/ui/hud_layout.js';

function creerFausseCible() {
  const gestionnaires = {};
  return {
    addEventListener(type, fn) {
      (gestionnaires[type] ||= []).push(fn);
    },
    emettre(type, touches) {
      const evt = { touches, changedTouches: touches };
      for (const fn of gestionnaires[type] || []) fn(evt);
    },
  };
}

function toucher(id, x, y) {
  return { identifier: id, clientX: x, clientY: y };
}

// Verbes à plat, même forme que src/input/input.js#maj.
const VERBES = ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu'];
function sourceFactice({ move = { x: 0, y: 0 }, ...verbes } = {}) {
  return {
    instantane: () => ({
      move,
      ...Object.fromEntries(VERBES.map((v) => [v, !!verbes[v]])),
    }),
  };
}

// 1. Avant tout touchstart : tactileActif() faux.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  const input = creerCoucheInput({ sourceClavier: null, sourceManette: null, sourceTactile: tactile });
  input.maj();
  assert.equal(input.tactileActif(), false, 'tactileActif doit être faux avant tout touchstart');
}

// 2. Un mousedown/pointerdown (jamais écouté par touch.js) n'active rien.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  const input = creerCoucheInput({ sourceClavier: null, sourceManette: null, sourceTactile: tactile });
  cible.emettre('mousedown', [toucher(1, 10, 10)]);
  cible.emettre('pointerdown', [toucher(1, 10, 10)]);
  input.maj();
  assert.equal(input.tactileActif(), false, 'souris/pointeur ne doivent jamais activer le tactile');
}

// 3. Un touchstart réel active tactileActif().
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  const input = creerCoucheInput({ sourceClavier: null, sourceManette: null, sourceTactile: tactile });
  cible.emettre('touchstart', [toucher(1, 0, 0)]);
  input.maj();
  assert.equal(input.tactileActif(), true, 'un touchstart réel doit activer le tactile');
}

// 4. Extinction en loquet : une touche clavier éteint le tactile, ET ça
// reste éteint après le relâchement (pas de re-dérivation à chaque frame à
// partir de touch.js#estActif, qui reste vrai à vie dès le premier
// touchstart — sinon le tactile se rallumait tout seul dès que la touche
// clavier était relâchée, constaté en navigateur pendant ce diagnostic).
// Seul un NOUVEAU touchstart doit pouvoir le rallumer (test 4b).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);

  let clavierActif = false;
  const sourceClavier = { instantane: () => (clavierActif ? sourceFactice({ move: { x: 1, y: 0 } }).instantane() : sourceFactice().instantane()) };
  const input = creerCoucheInput({ sourceClavier, sourceManette: null, sourceTactile: tactile });

  // Le touchstart arrive APRÈS la construction de la couche d'input, comme
  // en jeu réel (main.js construit sourceTactile puis creerCoucheInput avant
  // que le joueur ne touche l'écran) — sinon le compteur de contacts déjà
  // incrémenté au moment de la construction masquerait le premier contact.
  cible.emettre('touchstart', [toucher(1, 0, 0)]);
  input.maj();
  assert.equal(input.tactileActif(), true, 'le tactile doit rester actif tant que clavier/manette sont au repos');

  clavierActif = true;
  input.maj();
  assert.equal(input.tactileActif(), false, 'une touche clavier pressée doit éteindre le tactile');

  clavierActif = false;
  input.maj();
  assert.equal(input.tactileActif(), false, 'relâcher le clavier ne doit PAS rallumer le tactile tout seul (loquet)');
}

// 4b. Un nouveau touchstart après extinction rallume bien le tactile.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);

  let clavierActif = true;
  const sourceClavier = { instantane: () => (clavierActif ? sourceFactice({ move: { x: 1, y: 0 } }).instantane() : sourceFactice().instantane()) };
  const input = creerCoucheInput({ sourceClavier, sourceManette: null, sourceTactile: tactile });

  cible.emettre('touchstart', [toucher(1, 0, 0)]);
  input.maj();
  assert.equal(input.tactileActif(), false, 'préconditions : tactile éteint par le clavier');

  clavierActif = false;
  input.maj();
  assert.equal(input.tactileActif(), false, 'toujours éteint sans nouveau contact');

  cible.emettre('touchstart', [toucher(2, 0, 0)]);
  input.maj();
  assert.equal(input.tactileActif(), true, 'un nouveau touchstart doit rallumer le tactile');
}

// 5. Extinction par la manette (front montant d'un bouton, pas seulement move).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, 0, 0)]);

  const sourceManette = { instantane: () => sourceFactice({ attack: true }).instantane() };
  const input = creerCoucheInput({ sourceClavier: null, sourceManette, sourceTactile: tactile });

  input.maj();
  assert.equal(input.tactileActif(), false, 'un bouton manette pressé doit éteindre le tactile');
}

// 6. Alignement dessin/hit-test (3c) : à échelle x2 avec un offset de
// letterbox non nul (dx, dy), un touchstart aux coordonnées ÉCRAN du centre
// DESSINÉ du bouton d'attaque doit produire attack.pressed — même fonction
// pure (versCoordonneesLogiques) que celle utilisée par main.js pour le
// vrai hit-test, jamais une formule recopiée qui pourrait diverger.
{
  const largeurEcran = RESOLUTION_LOGIQUE.largeur * 2;
  const hauteurEcran = RESOLUTION_LOGIQUE.hauteur * 2 + 80; // force un offset vertical
  const rect = calculerRectanglePresentation(largeurEcran, hauteurEcran);
  assert.ok(rect.echelle > 1 && rect.y > 0, 'préconditions du test : échelle et offset non nuls');

  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible, {
    versLogique: (clientX, clientY) => versCoordonneesLogiques(clientX, clientY, rect),
  });
  const input = creerCoucheInput({ sourceClavier: null, sourceManette: null, sourceTactile: tactile });

  // Coordonnées écran du centre dessiné du bouton d'attaque (cf. hud.js, qui
  // dessine boutonsTactiles() à leurs cx/cy logiques tels quels, mis à
  // l'échelle par le même rect au moment de presenter()).
  const clientX = rect.x + BOUTON_ATTAQUE.cx * rect.echelle;
  const clientY = rect.y + BOUTON_ATTAQUE.cy * rect.echelle;
  cible.emettre('touchstart', [toucher(1, clientX, clientY)]);

  const etat = input.maj();
  assert.equal(etat.attack.pressed, true, 'le tap au centre écran du bouton doit toucher sa zone logique');
}

console.log('OK test_phase1_sd_ui_tactile');

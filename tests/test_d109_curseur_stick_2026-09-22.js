// `D-109` — le stick DROIT de la manette pilote le curseur.
//
// Demande de Xav (22/09) : « connecte le curseur souris au joystick droit de
// la manette, il n'a pas d'utilité jusque là […] joystick droit = curseur,
// c'est tout. » Rien d'autre : aucun clic, aucune sélection — la navigation au
// stick GAUCHE dans les menus n'est pas touchée.
//
// Ce qui se teste, au sens de `D-52` : jamais la vitesse ni la courbe (elles
// vivent dans `data/effets.json` et appartiennent à Xav), mais le CONTRAT —
// le stick est lu par la couche d'input et par elle seule, il n'entre pas dans
// l'état de verbes, le déplacement est indépendant du nombre de frames, une
// diagonale ne va pas plus vite qu'une ligne droite, le curseur reste dans la
// fenêtre, et le passage souris ↔ stick ne laisse jamais deux curseurs à
// l'écran.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerSourceManette, MAPPING_MANETTE_PROVISOIRE } from '../src/input/gamepad.js';
import { creerCoucheInput, etatNeutre } from '../src/input/input.js';
import { deplacementStick, creerCurseur } from '../src/curseur.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const CURSEUR = registre.obtenir('effets', 'effet_curseur');

// Une fausse manette : quatre axes, seize boutons, comme une Xbox standard.
function fausseManette({ axes = [0, 0, 0, 0], boutons = [] } = {}) {
  return {
    getGamepads: () => [{
      index: 0,
      axes,
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: !!boutons[i] })),
    }],
  };
}

// --- 1. Le stick droit sort de la manette, avec sa zone morte --------------
{
  const M = MAPPING_MANETTE_PROVISOIRE;
  assert.notEqual(M.axeXDroit, M.axeX, 'le stick droit n’est pas le stick gauche');
  assert.notEqual(M.axeYDroit, M.axeY);

  const pousse = creerSourceManette(fausseManette({ axes: [0, 0, 1, -0.5] })).instantane();
  assert.deepEqual(pousse.pointeur, { x: 1, y: -0.5 });
  // Le stick GAUCHE n'a pas bougé : pousser le stick droit ne fait pas
  // marcher le héros. C'est la garantie qui compte pour le gameplay.
  assert.deepEqual(pousse.move, { x: 0, y: 0 });

  // Zone morte : la même que le stick gauche — une manette usée dérive des
  // deux côtés, et un curseur qui part tout seul se remarque plus qu'un héros
  // qui avance tout seul.
  const repos = creerSourceManette(fausseManette({ axes: [0, 0, 0.1, -0.15] })).instantane();
  assert.deepEqual(repos.pointeur, { x: 0, y: 0 });
  console.log('OK le stick droit sort de la manette, zone morte comprise');
}

// --- 2. La couche d'input l'expose À PART, jamais comme un verbe -----------
{
  const input = creerCoucheInput({
    sourceManette: creerSourceManette(fausseManette({ axes: [0, 0, 0.8, 0] })),
    sourceTactile: null,
    sourceClavier: null,
  });
  const etat = input.maj();
  assert.deepEqual(input.pointeurManette(), { x: 0.8, y: 0 });

  // LE point du ticket côté architecture : `etat` garde sa forme
  // move + verbes, donc `etatNeutre()` continue d'en dériver génériquement.
  // Un champ « pointeur » glissé là-dedans casserait ce contrat, et surtout
  // rendrait le stick lisible par un système de jeu.
  assert.equal(etat.pointeur, undefined, 'le pointeur n’entre pas dans l’état de verbes');
  assert.equal(etatNeutre(etat).pointeur, undefined);
  assert.deepEqual(etat.move, { x: 0, y: 0 }, 'le stick droit ne déplace pas le héros');

  // Bouger le stick droit EST un geste de manette : les indices de commande
  // doivent basculer sur les glyphes de manette comme pour tout autre geste.
  assert.equal(input.peripheriqueActif(), 'manette');

  // Une source qui ignore le stick droit vaut zéro, sans cas particulier —
  // même règle que pour un verbe qu'une source ne produit pas.
  const sansPointeur = creerCoucheInput({
    sourceManette: { instantane: () => ({ move: { x: 0, y: 0 } }) },
    sourceTactile: null,
    sourceClavier: null,
  });
  sansPointeur.maj();
  assert.deepEqual(sansPointeur.pointeurManette(), { x: 0, y: 0 });
  console.log('OK la couche d’input expose le pointeur à part, jamais comme un verbe');
}

// --- 3. Le déplacement : pur, en px par seconde, sans bonus de diagonale ---
{
  // Indépendant du découpage en frames : une seconde en une frame ou en
  // soixante doit donner la même distance (à l'arrondi près). Sans ça, le
  // curseur irait plus vite sur un PC rapide.
  const enUneFois = deplacementStick({ x: 1, y: 0 }, CURSEUR, 1000).dx;
  let cumul = 0;
  for (let i = 0; i < 60; i += 1) cumul += deplacementStick({ x: 1, y: 0 }, CURSEUR, 1000 / 60).dx;
  assert.ok(Math.abs(enUneFois - cumul) < 1e-6, 'le déplacement suit le temps, pas les frames');

  // Pas de bonus de diagonale (le défaut nommé en `D-102` pour le clavier,
  // qu'on peut corriger ici sans toucher au gameplay) : plein stick en
  // diagonale parcourt la même distance que plein stick à droite.
  const droite = deplacementStick({ x: 1, y: 0 }, CURSEUR, 100);
  const diagonale = deplacementStick({ x: 1, y: 1 }, CURSEUR, 100);
  const norme = (d) => Math.hypot(d.dx, d.dy);
  assert.ok(Math.abs(norme(droite) - norme(diagonale)) < 1e-9, 'une diagonale ne va pas √2 fois plus vite');

  // La courbe : un demi-stick va MOINS de la moitié d'un plein stick — c'est
  // ce qui donne le pointage fin dans un menu. Testé en relation, jamais sur
  // la valeur de l'exposant, qui est un réglage de Xav.
  const demi = norme(deplacementStick({ x: 0.5, y: 0 }, CURSEUR, 100));
  assert.ok(demi < norme(droite) / 2, 'la réponse est adoucie près du centre');
  assert.ok(demi > 0, 'un demi-stick bouge quand même');

  // Stick au repos, absent, ou dégénéré : aucun déplacement, jamais un `NaN`.
  for (const p of [null, undefined, { x: 0, y: 0 }]) {
    assert.deepEqual(deplacementStick(p, CURSEUR, 16), { dx: 0, dy: 0 });
  }
  console.log('OK le déplacement est pur, en px/s, et sans bonus de diagonale');
}

// --- 4. Dans la fenêtre, et jamais deux curseurs à la fois -----------------
{
  const styles = new Map();
  const ecouteurs = new Map();
  const dessine = [];
  const faussContexte = new Proxy({}, { get: (_, n) => (n === 'canvas' ? {} : () => {}) });
  const canvas = () => ({
    width: 0,
    height: 0,
    clientWidth: 800,
    clientHeight: 600,
    className: '',
    getContext: () => faussContexte,
    toDataURL: () => 'data:image/png;base64,ABC',
  });
  const doc = {
    documentElement: { style: { setProperty: (k, v) => styles.set(k, v), removeProperty: (k) => styles.delete(k) } },
    body: { appendChild: () => {} },
    createElement: () => canvas(),
    addEventListener: (t, f) => ecouteurs.set(t, f),
    removeEventListener: (t) => ecouteurs.delete(t),
  };
  const fenetre = {
    devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener: () => {}, removeEventListener: () => {},
  };
  const curseur = creerCurseur({
    doc,
    fenetre,
    config: CURSEUR,
    configSillage: registre.obtenir('effets', 'effet_curseur_sillage'),
    visuelOrbe: registre.obtenir('visuels', 'visuel_curseur'),
    visuelParticule: registre.obtenir('visuels', 'visuel_curseur_eclat'),
    visuelSillage: registre.obtenir('visuels', 'visuel_curseur_sillage'),
    dessinerVisuel: (_c, visuel, px, py) => dessine.push({ id: visuel.id, x: px, y: py }),
  });

  const declarationSouris = styles.get('--curseur-jeu');
  assert.match(declarationSouris, /^url\(/, 'au départ, la tête est le curseur système');

  // Le stick réveille le curseur au CENTRE : aucune souris n'a jamais bougé,
  // et un coin ferait croire à un bug.
  curseur.avancer(16, { x: 1, y: 0 });
  dessine.length = 0;
  curseur.dessiner();
  const orbe = dessine.find((d) => d.id === 'visuel_curseur');
  assert.ok(orbe, 'au stick, l’orbe est dessiné sur le calque (le curseur système ne se déplace pas)');
  assert.ok(orbe.y === 300, 'réveil au centre vertical de la fenêtre');
  assert.ok(orbe.x > 400 && orbe.x < 500, `parti du centre vers la droite (x = ${orbe.x})`);

  // ET le curseur système est éteint : sinon on en verrait DEUX, l'un planté
  // là où la souris dort, l'autre piloté au stick.
  assert.equal(styles.get('--curseur-jeu'), 'none', 'la tête système s’efface en mode stick');

  // Borné à la fenêtre : dix secondes plein stick ne le font pas sortir.
  for (let i = 0; i < 60; i += 1) curseur.avancer(160, { x: 1, y: 1 });
  dessine.length = 0;
  curseur.dessiner();
  const coin = dessine.find((d) => d.id === 'visuel_curseur');
  assert.ok(coin.x <= 800 && coin.y <= 600, `le curseur reste dans la fenêtre (${coin.x}, ${coin.y})`);
  assert.ok(coin.x >= 0 && coin.y >= 0);

  // La souris reprend la main : la tête redevient le curseur système, et le
  // calque cesse de la dessiner — jamais les deux à la fois.
  ecouteurs.get('pointermove')({ pointerType: 'mouse', clientX: 120, clientY: 90 });
  assert.equal(styles.get('--curseur-jeu'), declarationSouris, 'la déclaration d’origine est reposée telle quelle');
  curseur.avancer(16, { x: 0, y: 0 });
  dessine.length = 0;
  curseur.dessiner();
  assert.equal(dessine.find((d) => d.id === 'visuel_curseur'), undefined, 'plus d’orbe sur le calque en mode souris');

  // Et l'on peut revenir au stick : la bascule n'est pas à sens unique.
  curseur.avancer(16, { x: -1, y: 0 });
  assert.equal(styles.get('--curseur-jeu'), 'none');
  curseur.retirer();
  console.log('OK le curseur reste dans la fenêtre, et il n’y en a jamais deux');
}

// --- 5. Un réglage absurde tombe au boot -----------------------------------
{
  function erreursAvec(modif) {
    const copie = JSON.parse(JSON.stringify(donnees));
    Object.assign(copie.effets.find((e) => e.id === 'effet_curseur'), modif);
    return validerCatalogues(copie, SCHEMAS);
  }
  assert.ok(erreursAvec({ vitesse_stick_px_s: 0 }).length > 0, 'vitesse nulle refusée');
  // Une courbe négative inverserait la réponse du stick : plus on pousse,
  // moins ça avance. Invisible dans un catalogue, évident manette en main.
  assert.ok(erreursAvec({ courbe_stick: -1 }).length > 0, 'courbe négative refusée');
  console.log('OK un réglage de stick absurde tombe au démarrage');
}

console.log('OK test_d109_curseur_stick');

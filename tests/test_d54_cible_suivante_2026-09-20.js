// `D-54` — « Cible suivante » : le joueur fait changer le follet de monstre.
// RB à la manette, Tab au clavier (le geste tactile reste à définir, `Q-40`).
//
// Ce que ce fichier verrouille :
//   a) l'ORDRE : le plus proche du héros d'abord, puis de proche en loin ;
//   b) le BOUCLAGE : après le plus loin, on revient au plus proche ;
//   c) les CANDIDATS : les monstres vivants en deçà de la distance de RELÂCHE
//      (pas seulement les engageables) — un monstre plus loin est ignoré ;
//   d) une cible morte entre deux appuis ne casse pas le cycle ;
//   e) zéro candidat, ou un seul déjà ciblé : le follet est rendu tel quel ;
//   f) la cible CHOISIE tient : la règle automatique « le plus proche » ne la
//      reprend pas tant qu'elle vit et reste en deçà de la relâche ;
//   g) aucun saut de position : le changement passe par le vol amorti ;
//   h) le verbe existe dans la couche d'input, sur front montant, et `Tab`
//      appelle `preventDefault` en jeu — jamais quand une UI capte les verbes.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import {
  creerFollet, cibleSuivante, mettreAJourEtat, avancerPosition, distanceRelachePx,
} from '../src/companion.js';
import { creerSourceClavier, MAPPING_CLAVIER_PROVISOIRE } from '../src/input/keyboard.js';
import { creerSourceManette, MAPPING_MANETTE_PROVISOIRE } from '../src/input/gamepad.js';
import { creerCoucheInput } from '../src/input/input.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), [], 'les catalogues du jeu doivent être valides au boot');

// Catalogue RÉEL : les seuils testés sont ceux que Xav joue.
const COMP = catalogues.companions[0];
const RELACHE = distanceRelachePx(COMP);
const hero = (x, y) => ({ x, y });
const monstre = (id, x, y, mort = false) => ({ id, x, y, mort });
const folletEn = (x, y) => ({ ...creerFollet(COMP.id, hero(0, 0)), x, y });

// --- 1. Ordre et bouclage --------------------------------------------------
// Trois monstres autour du héros (scénario de validation de Xav, `V-35`),
// volontairement donnés dans le DÉSORDRE : le tri ne doit rien au tableau.
{
  const h = hero(0, 0);
  const monstres = [monstre('loin', 0, 50), monstre('pres', 10, 0), monstre('milieu', 0, -30)];
  let f = folletEn(0, 0);

  f = cibleSuivante(f, h, monstres, COMP);
  assert.equal(f.cibleMonstreId, 'pres', '1er appui -> le plus proche du héros');
  assert.equal(f.etat, 'engager', 'ordonner une cible engage le follet');
  f = cibleSuivante(f, h, monstres, COMP);
  assert.equal(f.cibleMonstreId, 'milieu', '2e appui -> le suivant en distance');
  f = cibleSuivante(f, h, monstres, COMP);
  assert.equal(f.cibleMonstreId, 'loin', '3e appui -> le plus loin');
  f = cibleSuivante(f, h, monstres, COMP);
  assert.equal(f.cibleMonstreId, 'pres', '4e appui -> ça boucle sur le plus proche');
  console.log('  ordre pres -> milieu -> loin -> pres (bouclage)');
}

// --- 2. Candidats : la distance de RELÂCHE, pas l'engageabilité -------------
// Un monstre hors orbite ET hors aura, mais en deçà de la relâche, est un
// candidat : ordonner une cible est justement le moyen d'y envoyer le follet.
// Un monstre au-delà de la relâche ne l'est jamais (le follet le lâcherait à
// la frame suivante). Un mort non plus.
{
  const h = hero(0, 0);
  const dedans = monstre('dedans', RELACHE - 1, 0);
  const dehors = monstre('dehors', RELACHE + 1, 0);
  const cadavre = monstre('cadavre', 5, 0, true);
  const f = folletEn(-500, -500); // aura hors de cause

  assert.equal(mettreAJourEtat(f, h, [dedans], COMP).etat, 'suivre',
    'hors orbite et hors aura : la règle automatique ne le prend pas');
  assert.equal(cibleSuivante(f, h, [dedans], COMP).cibleMonstreId, 'dedans',
    "mais le joueur, lui, peut l'ordonner");

  assert.equal(cibleSuivante(f, h, [dehors], COMP).cibleMonstreId, null,
    'au-delà de la relâche : ignoré');
  assert.equal(cibleSuivante(f, h, [cadavre], COMP).cibleMonstreId, null, 'un mort : ignoré');
  assert.equal(cibleSuivante(f, h, [], COMP), f, 'zéro candidat : le follet est rendu tel quel');

  // Pile à la frontière : la relâche tient à 66, donc c'est un candidat.
  assert.equal(cibleSuivante(f, h, [monstre('pile', RELACHE, 0)], COMP).cibleMonstreId, 'pile',
    'pile sur la distance de relâche : encore un candidat (le follet ne le lâcherait pas)');
}

// --- 3. Un seul candidat, déjà ciblé : sans effet ---------------------------
{
  const h = hero(0, 0);
  const m = monstre('seul', 10, 0);
  const f = { ...folletEn(0, 0), etat: 'engager', cibleMonstreId: 'seul' };
  assert.equal(cibleSuivante(f, h, [m], COMP), f, 'même objet rendu : rien ne bouge');
}

// --- 4. La cible meurt entre deux appuis ------------------------------------
// La cible courante n'est plus dans la liste : l'appui suivant repart du plus
// proche plutôt que de ne rien faire.
{
  const h = hero(0, 0);
  const vivants = [monstre('a', 10, 0), monstre('b', 20, 0)];
  let f = cibleSuivante(folletEn(0, 0), h, vivants, COMP);
  assert.equal(f.cibleMonstreId, 'a');
  const apres = [monstre('a', 10, 0, true), monstre('b', 20, 0)];
  f = cibleSuivante(f, h, apres, COMP);
  assert.equal(f.cibleMonstreId, 'b', 'cible morte -> le cycle repart du plus proche vivant');
}

// --- 5. La cible choisie TIENT ---------------------------------------------
// Point 3 du ticket : un autre monstre qui s'approche davantage ne reprend pas
// la main. C'est `mettreAJourEtat` qui le garantit (il ne choisit qu'en état
// `suivre`) — vérifié ici sur la vraie fonction, pas sur la lecture du code.
{
  const h = hero(0, 0);
  const choisi = monstre('choisi', 40, 0);
  const intrus = monstre('intrus', 5, 0);
  let f = cibleSuivante(folletEn(0, 0), h, [choisi, intrus], COMP);
  f = cibleSuivante(f, h, [choisi, intrus], COMP); // intrus d'abord, puis choisi
  assert.equal(f.cibleMonstreId, 'choisi');
  for (let i = 0; i < 120; i += 1) {
    f = mettreAJourEtat(f, h, [choisi, intrus], COMP);
    f = avancerPosition(f, h, [choisi, intrus], 1 / 60);
  }
  assert.equal(f.cibleMonstreId, 'choisi', 'la cible choisie tient malgré un monstre plus proche');

  // ...jusqu'à sa relâche : le héros s'éloigne, le follet redevient libre.
  const loin = hero(-RELACHE - 5, 0);
  f = mettreAJourEtat(f, loin, [choisi], COMP);
  assert.equal(f.etat, 'suivre', 'au-delà de la relâche, la cible choisie est lâchée comme une autre');
}

// --- 6. Aucun saut de position ---------------------------------------------
// Le changement de cible passe par le vol amorti de `D-37` : sur la frame de
// l'appui, le follet ne fait qu'un pas vers le nouveau monstre.
{
  const h = hero(0, 0);
  const monstres = [monstre('a', 10, 0), monstre('b', 0, 60)];
  let f = cibleSuivante(folletEn(0, 0), h, monstres, COMP);
  f = cibleSuivante(f, h, monstres, COMP);
  assert.equal(f.cibleMonstreId, 'b');
  const avant = { x: f.x, y: f.y };
  const apres = avancerPosition(f, h, monstres, 1 / 60);
  const pas = Math.hypot(apres.x - avant.x, apres.y - avant.y);
  assert.ok(pas < 12, `un pas amorti, pas un saut (${pas.toFixed(2)} px)`);
  assert.ok(pas > 0, 'mais le follet avance bien vers la nouvelle cible');
  // ...et il finit par y arriver.
  let g = apres;
  for (let i = 0; i < 300; i += 1) g = avancerPosition(g, h, monstres, 1 / 60);
  assert.ok(Math.hypot(g.x - 0, g.y - 60) < 1, 'convergence sur la nouvelle cible');
  console.log(`  pas de la frame du changement : ${pas.toFixed(2)} px`);
}

// --- 7. Le verbe dans la couche d'input -------------------------------------
{
  assert.deepEqual(MAPPING_CLAVIER_PROVISOIRE.target_next, ['Tab'], 'Tab au clavier');
  assert.equal(MAPPING_MANETTE_PROVISOIRE.boutons.target_next, 5, 'RB à la manette (bouton 5)');

  // Aucun autre verbe ne partage la touche ni le bouton (ils étaient libres).
  const autresCodes = Object.entries(MAPPING_CLAVIER_PROVISOIRE)
    .filter(([v]) => v !== 'target_next').flatMap(([, codes]) => codes);
  assert.ok(!autresCodes.includes('Tab'), "Tab n'est pris par aucun autre verbe");
  const autresBoutons = Object.entries(MAPPING_MANETTE_PROVISOIRE.boutons)
    .filter(([v]) => v !== 'target_next').map(([, i]) => i);
  assert.ok(!autresBoutons.includes(5), "le bouton 5 n'est pris par aucun autre verbe");

  // Front montant : un appui tenu ne produit `pressed` qu'une fois.
  const ecouteurs = {};
  const cible = { addEventListener: (type, fn) => { ecouteurs[type] = fn; } };
  const clavier = creerSourceClavier(cible);
  const input = creerCoucheInput({ sourceClavier: clavier, sourceManette: null, sourceTactile: null });

  ecouteurs.keydown({ code: 'Tab' });
  assert.deepEqual(input.maj().target_next, { pressed: true, held: true }, '1re frame : front montant');
  assert.deepEqual(input.maj().target_next, { pressed: false, held: true }, 'maintenu : plus de front');
  ecouteurs.keyup({ code: 'Tab' });
  assert.deepEqual(input.maj().target_next, { pressed: false, held: false }, 'relâché');

  // Manette : RB seul suffit, sans clavier.
  const boutons = Array.from({ length: 10 }, () => ({ pressed: false }));
  const nav = { getGamepads: () => [{ index: 0, axes: [0, 0], buttons: boutons }] };
  const input2 = creerCoucheInput({
    sourceClavier: null, sourceManette: creerSourceManette(nav), sourceTactile: null,
  });
  boutons[5].pressed = true;
  assert.equal(input2.maj().target_next.pressed, true, 'RB -> front montant');
  assert.equal(input2.maj().target_next.pressed, false, 'RB maintenu -> une seule fois');
}

// --- 8. `Tab` : preventDefault en jeu, jamais sous UI ------------------------
// Sans cela, le navigateur déplace le focus hors du canvas et le jeu ne reçoit
// plus rien. Menu ouvert, `Tab` appartient au DOM des écrans de cartes.
{
  const ecouteurs = {};
  const cible = { addEventListener: (type, fn) => { ecouteurs[type] = fn; } };
  let uiOuverte = false;
  creerSourceClavier(cible, MAPPING_CLAVIER_PROVISOIRE, { interceptionActive: () => !uiOuverte });

  const evt = (code) => {
    let bloque = false;
    return { code, preventDefault: () => { bloque = true; }, lu: () => bloque };
  };

  let e = evt('Tab');
  ecouteurs.keydown(e);
  assert.equal(e.lu(), true, 'en jeu : Tab est intercepté');

  e = evt('KeyE');
  ecouteurs.keydown(e);
  assert.equal(e.lu(), false, 'les autres touches gardent leur comportement par défaut');

  uiOuverte = true;
  e = evt('Tab');
  ecouteurs.keydown(e);
  assert.equal(e.lu(), false, "menu ouvert : on n'intercepte rien");
  // ...et la touche reste lue comme verbe : c'est le point de décision unique
  // de main.js qui neutralise les verbes sous UI, pas cette couche-ci.
}

// --- 9. Le branchement dans main.js (contrôle de SOURCE) --------------------
// Le reste de ce fichier teste des fonctions pures ; l'ORDRE des trois appels
// de la frame, lui, ne se voit que dans `mettreAJourCombat` — et il porte deux
// décisions : après la règle automatique (sinon elle reprendrait la cible dans
// la même frame) et avant le déplacement (pour que le vol parte tout de suite).
{
  const source = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');
  const iAuto = source.indexOf('mettreAJourFollet(follet, hero, monstres, companionDuFollet)');
  const iChoix = source.indexOf('cibleSuivanteFollet(follet, hero, monstres, companionDuFollet)');
  // Sans la parenthèse fermante : depuis `specs/10` palier B, l'appel porte
  // un 5ᵉ argument (le sens de l'orbite).
  const iVol = source.indexOf('avancerFollet(follet, hero, monstres, deltaS');
  assert.ok(iAuto > 0 && iChoix > 0 && iVol > 0, 'les trois appels existent');
  assert.ok(iAuto < iChoix && iChoix < iVol,
    'ordre : règle automatique -> cible ordonnée -> vol amorti');
  // Le verbe est lu sur `etatGameplay`, déjà neutralisé sous UI par le point
  // de décision unique — jamais sur l'état brut.
  assert.ok(source.includes('etatGameplay.target_next.pressed'),
    'le verbe se lit sur etatGameplay (neutralisé sous UI), jamais sur etatBrut');
  assert.ok(!source.includes('etatBrut.target_next'), 'jamais sur etatBrut');
}

console.log('OK test_d54_cible_suivante');

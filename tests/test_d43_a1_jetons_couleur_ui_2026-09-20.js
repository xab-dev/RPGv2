// `D-43`, palier A1 (specs/08_menus-cartes.md §4.5) — les jetons de style des
// menus, la `couleur_ui` des compagnons, et le contrôle de contraste.
//
// CE QUE CE FICHIER NE PROUVE PAS : qu'un accent est BEAU, ni même qu'il se
// voit assez — « focus : plus, moins ou bon » est une réponse de Xav en jeu
// (`V-27`). Ce qui est prouvé ici est arithmétique : le contraste se calcule
// juste, chaque `couleur_ui` RÉELLE passe le contrôle contre les jetons
// RÉELS de `index.html`, et une couleur fautive tombe avec son chemin.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyserHex, rapportContraste, erreursCouleursUi, CONTRASTE_MIN_ACCENT, DISTANCE_MIN_DANGER,
} from '../src/ui/couleurs_ui.js';
import { validerCatalogues } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');

// Les jetons sont lus DANS la feuille de style, jamais recopiés ici : si Xav
// change le fond des cartes, ce test juge les accents contre le nouveau fond.
function jeton(nom) {
  const m = new RegExp(`${nom}:\s*([^;]+);`).exec(html);
  assert.ok(m, `jeton ${nom} introuvable dans index.html`);
  return m[1].trim();
}
const JETONS = { fondCarte: jeton('--menu-carte'), danger: jeton('--menu-danger'), accentNeutre: jeton('--menu-accent') };

// --- 1. L'arithmétique du contraste ---------------------------------------
{
  const noir = analyserHex('#000000');
  const blanc = analyserHex('#ffffff');
  assert.equal(rapportContraste(noir, blanc).toFixed(2), '21.00', 'noir sur blanc = 21:1 (borne WCAG)');
  assert.equal(rapportContraste(blanc, noir), rapportContraste(noir, blanc), 'le rapport est symétrique');
  assert.equal(rapportContraste(blanc, blanc), 1, 'une couleur sur elle-même = 1:1');
  // Valeur de référence publiée (WebAIM) : #777777 sur blanc = 4,48:1.
  assert.equal(rapportContraste(analyserHex('#777777'), blanc).toFixed(2), '4.48');
  assert.equal(analyserHex('#fff'), null, 'forme courte refusée : un seul format à comparer');
  assert.equal(analyserHex('rgb(1,2,3)'), null);
  assert.deepEqual(analyserHex('  #FF6A3D '), { r: 255, g: 106, b: 61 }, 'espaces (valeur calculée du navigateur) et casse tolérés');
  console.log('OK contraste : bornes, symétrie, valeur de référence, formats');
}

// --- 2. Le bloc de jetons existe, en un seul exemplaire --------------------
{
  for (const nom of [
    '--menu-fond', '--menu-carte', '--menu-carte-bordure', '--menu-carte-rayon-u', '--menu-texte-titre',
    '--menu-texte-phrase', '--menu-focus-bordure-px', '--menu-focus-halo-u', '--menu-focus-halo-opacite',
    '--menu-focus-eclaircie', '--menu-appuye-assombrie', '--menu-desactive-opacite', '--menu-accent', '--menu-danger',
  ]) {
    const declarations = html.match(new RegExp(`${nom}:`, 'g')) || [];
    assert.equal(declarations.length, 1, `${nom} doit être déclaré une fois, et une seule (un seul bloc de jetons)`);
  }
  // Les trois jetons relus au démarrage restent en #rrggbb.
  for (const [nom, valeur] of Object.entries(JETONS)) {
    assert.ok(analyserHex(valeur), `${nom} (${valeur}) doit rester en #rrggbb : le contrôle de contraste ne sait comparer que ça`);
  }
  console.log('OK jetons : déclarés une seule fois, les trois relus au démarrage en #rrggbb');
}

// --- 3. Les données RÉELLES passent le contrôle, contre les jetons RÉELS ---
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
{
  assert.deepEqual(validerCatalogues(donnees), [], 'les catalogues réels restent valides avec couleur_ui');
  for (const c of donnees.companions) assert.ok(analyserHex(c.couleur_ui), `${c.id} déclare une couleur_ui #rrggbb`);
  assert.deepEqual(erreursCouleursUi(donnees.companions, JETONS), []);
  console.log(`OK ${donnees.companions.length} compagnons + accent neutre : lisibles sur ${JETONS.fondCarte}, distincts du danger`);
}

// --- 4. Une couleur fautive tombe au démarrage, avec son chemin -------------
{
  const follet = (couleur_ui) => [{ id: 'comp_test', couleur_ui }];

  const sombre = erreursCouleursUi(follet('#20242c'), JETONS);
  assert.equal(sombre.length, 1);
  assert.match(sombre[0], /companions\.json > comp_test > couleur_ui/);
  assert.match(sombre[0], new RegExp(`minimum ${CONTRASTE_MIN_ACCENT}:1`));

  const exacte = erreursCouleursUi(follet(JETONS.danger), JETONS);
  assert.ok(exacte.some((e) => /se confond avec la couleur du danger/.test(e)), 'la couleur exacte du danger est refusée');

  // Le cas qu'une égalité stricte aurait laissé passer.
  const presque = erreursCouleursUi(follet('#c8201f'), JETONS);
  assert.ok(presque.some((e) => /se confond avec la couleur du danger/.test(e)), 'un quasi-jumeau du danger est refusé lui aussi');
  assert.ok(DISTANCE_MIN_DANGER > 1, 'le seuil de proximité existe bel et bien');

  const malFormee = erreursCouleursUi(follet('orange'), JETONS);
  assert.match(malFormee[0], /doit être une couleur #rrggbb/);

  // Le 4ᵉ follet de la spec : une entrée, aucun code — il passe s'il se lit.
  assert.deepEqual(erreursCouleursUi([...donnees.companions, { id: 'comp_follet_vent', couleur_ui: '#9fe8d2' }], JETONS), []);
  console.log('OK couleur fautive : trop sombre / danger / quasi-danger / mal formée, chacune avec son chemin');
}

// --- 5. Un jeton illisible est une erreur de démarrage, pas un faux « vert » -
{
  const erreurs = erreursCouleursUi(donnees.companions, { ...JETONS, fondCarte: 'rgb(22, 27, 36)' });
  assert.equal(erreurs.length, 1);
  assert.match(erreurs[0], /jetons de style > fondCarte/);
  const vide = erreursCouleursUi(donnees.companions, { fondCarte: '', danger: '', accentNeutre: '' });
  assert.equal(vide.length, 3, 'feuille de style absente ou jetons retirés : trois erreurs, aucun contrôle sauté en silence');
  console.log('OK jeton illisible : refusé explicitement');
}

// --- 6. Le schéma exige couleur_ui ------------------------------------------
{
  const sans = structuredClone(donnees);
  delete sans.companions[0].couleur_ui;
  assert.ok(validerCatalogues(sans).some((e) => /champ "couleur_ui" manquant/.test(e)));
  const fausse = structuredClone(donnees);
  fausse.companions[0].couleur_ui = '#abc';
  assert.ok(validerCatalogues(fausse).some((e) => /couleur_ui doit être une couleur #rrggbb/.test(e)));
  console.log('OK schéma : couleur_ui requise et en #rrggbb');
}

console.log('OK test_d43_a1_jetons_couleur_ui');

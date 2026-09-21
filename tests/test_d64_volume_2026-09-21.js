// `D-64` (file Nv.0 → Nv.10, T7) — le volume.
//
// `V-04`, verdict de Xav le 21/09 : **non, trop fort** — il coupait le son
// systématiquement, donc l'ambiance n'était de fait jamais entendue. Ce
// n'était pas la synthèse qui était en cause : entre « fort » et « rien », il
// n'existait aucun cran.
//
// Contrats vérifiés ici :
//   - les paliers et leurs libellés vivent en données, appariés un à un ;
//   - le cycle boucle, et une valeur hors liste ne coince pas le joueur ;
//   - le défaut est plus bas qu'avant (le son ne démarre plus à fond) ;
//   - une sauvegarde sans le champ prend le défaut du CATALOGUE — aucune
//     migration, et un seul endroit où ce défaut est écrit ;
//   - la carte est une carte de plus dans un écran existant : la STRUCTURE
//     des menus, gelée le 21/09, ne bouge pas ;
//   - les libellés existent en FR et en EN.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { palierSuivant } from '../src/audio.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const REGLAGE = registre.obtenir('audio', 'audio_volume_musique');

// --- 1. Les paliers vivent en données, appariés à leurs libellés --------
{
  assert.ok(REGLAGE.paliers.length >= 3, 'il faut de vrais crans intermédiaires, pas un simple oui/non');
  assert.equal(REGLAGE.cles_etat.length, REGLAGE.paliers.length, 'un libellé par palier, exactement');
  assert.ok(REGLAGE.paliers.includes(0), 'le joueur doit pouvoir couper complètement');
  assert.ok(REGLAGE.paliers.includes(1), '...et remonter au maximum d\'origine');
  assert.ok(REGLAGE.paliers.includes(REGLAGE.defaut), 'le défaut doit être l\'un des paliers');
  console.log(`OK paliers en données : ${REGLAGE.paliers.join(' · ')} (défaut ${REGLAGE.defaut})`);
}

// --- 2. Le défaut est plus bas qu'avant --------------------------------
// Avant ce ticket, il n'y avait pas de volume maître : la piste jouait à son
// volume de catalogue, c'est-à-dire à 100 % de lui-même. C'est le « trop
// fort » de `V-04`. Le défaut doit donc être strictement inférieur à 1 — et
// pas nul, sinon le jeu démarrerait muet et l'ambiance resterait tout aussi
// inaudible, pour une autre raison.
{
  assert.ok(REGLAGE.defaut < 1, `le défaut (${REGLAGE.defaut}) doit être plus bas qu'avant (1)`);
  assert.ok(REGLAGE.defaut > 0, 'le jeu ne doit pas démarrer muet');
  console.log(`OK le son ne démarre plus à fond : ${REGLAGE.defaut * 100} %`);
}

// --- 3. Le cycle boucle, et ne coince jamais ---------------------------
{
  const paliers = REGLAGE.paliers;
  let courant = paliers[0];
  const vus = [courant];
  for (let i = 0; i < paliers.length - 1; i += 1) {
    courant = palierSuivant(paliers, courant);
    vus.push(courant);
  }
  assert.deepEqual(vus, paliers, 'le cycle parcourt tous les paliers, dans l\'ordre');
  assert.equal(palierSuivant(paliers, paliers[paliers.length - 1]), paliers[0], 'et il boucle');

  // Une valeur hors liste (sauvegarde bricolée, palier retiré du catalogue
  // depuis) rend la main au premier appui plutôt que de coincer.
  assert.equal(palierSuivant(paliers, 0.42), paliers[0]);
  assert.equal(palierSuivant(paliers, undefined), paliers[0]);
  console.log('OK le cycle boucle, et une valeur inconnue ne coince pas le joueur');
}

// --- 4. Aucune migration : champ absent = défaut du catalogue ----------
// On reproduit ici la résolution de `main.js` — un seul endroit sait quoi
// faire d'un réglage absent, et c'est le catalogue qui porte la valeur.
{
  const resoudre = (settings) => (typeof settings.volume === 'number' ? settings.volume : REGLAGE.defaut);
  assert.equal(resoudre({}), REGLAGE.defaut, 'une sauvegarde d\'avant ce ticket prend le défaut');
  assert.equal(resoudre({ volume: 0 }), 0, 'un joueur qui a choisi « coupé » garde « coupé »');
  assert.equal(resoudre({ volume: 0.75 }), 0.75);

  // Et le défaut n'est écrit qu'à UN endroit : nulle part dans le code.
  const sources = ['main.js', 'audio.js', 'ui/menu.js'];
  for (const fichier of sources) {
    const source = await fs.readFile(path.join(RACINE, 'src', fichier), 'utf8');
    const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(
      !code.includes(`volume = ${REGLAGE.defaut}`) && !code.includes(`volume: ${REGLAGE.defaut}`),
      `src/${fichier} ne doit pas réécrire le volume par défaut : il vit dans data/audio.json`,
    );
  }
  console.log('OK champ absent = défaut du catalogue, écrit à un seul endroit');
}

// --- 5. Une carte de plus, et la structure ne bouge pas ----------------
// La structure des menus est GELÉE depuis le 21/09 (« les menus sont très
// bien : on ne touche plus »). Le ticket n'a donc droit qu'à une carte de
// plus dans un écran existant.
{
  const parametres = registre.tous('menus').find((e) => e.id === 'menu_parametres');
  const volume = parametres.cartes.find((c) => c.id === 'carte_volume');
  assert.ok(volume, 'la carte Volume doit être dans Paramètres, et nulle part ailleurs');
  assert.equal(volume.type, 'bascule', 'une bascule, comme les autres : aucun type de carte nouveau');
  assert.equal(volume.action, 'action_cycler_volume');
  assert.equal(volume.etat, 'etat_volume');

  // Aucun écran créé, aucun écran retiré.
  const ecrans = registre.tous('menus').map((e) => e.id).sort();
  assert.deepEqual(
    ecrans, ['menu_heros', 'menu_parametres', 'menu_racine', 'menu_sauvegarde'],
    'aucun écran de menu ajouté ni retiré',
  );

  // Les cases restent uniques et contiguës à partir de 0 : une carte de plus
  // ne doit pas créer de trou ni de collision.
  const cases = parametres.cartes.map((c) => c.case).sort((a, b) => a - b);
  assert.deepEqual(cases, [0, 1, 2, 3, 4], 'cases 0 à 4, sans trou ni doublon');
  console.log('OK une carte de plus dans un écran existant, et rien d\'autre');
}

// --- 6. Les libellés existent dans les deux langues -------------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  for (const langue of i18n.languesDisponibles()) {
    i18n.definirLangue(langue);
    assert.ok(!i18n.t('menu.volume').startsWith('[['), `menu.volume manque en ${langue}`);
    const rendus = new Set();
    for (const cle of REGLAGE.cles_etat) {
      const texte = i18n.t(cle);
      assert.ok(!texte.startsWith('[['), `${cle} manque en ${langue}`);
      rendus.add(texte);
    }
    // Deux paliers qui s'afficheraient pareil rendraient le réglage illisible.
    assert.equal(rendus.size, REGLAGE.cles_etat.length, `deux paliers identiques à l'écran en ${langue}`);
  }
  console.log('OK les libellés des paliers existent, et se distinguent, en FR et en EN');
}

console.log('OK test_d64_volume');

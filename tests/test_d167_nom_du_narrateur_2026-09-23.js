// `D-167` : le narrateur s'affichait « narrateur » — l'id des données, en
// minuscules, dans la bulle. Décision de Xav (23/09) : « on l'appelle "..." ».
//
// Le remède est général : TOUT locuteur passe par une clé de locale
// (`locuteur.<id>`), sauf le follet choisi, qui porte le nom de son compagnon.
// Aucun id de données n'atteint plus l'écran, et un locuteur de plus un jour
// sera une clé de plus, vérifiée au boot.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { resoudreNoeud, erreursTextesDialogues, cleLocuteur } from '../src/dialogue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');
const [dictionnaires, { donnees }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

// --- 1. Le narrateur s'appelle « ... », en FR comme en EN -------------------
{
  const choix = registre.obtenir('dialogues', 'dlg_grotte_choix_follet');
  for (const langue of ['fr', 'en']) {
    const i18n = creerI18n(dictionnaires, langue);
    const r = resoudreNoeud(choix, choix.entree, registre, i18n, null);
    assert.equal(r.locuteur, '...', `${langue} : le narrateur s'appelle « ... »`);
  }
  console.log('OK le narrateur s’appelle « ... », FR et EN');
}

// --- 2. Aucun id de locuteur n'atteint l'écran -------------------------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  for (const d of donnees.dialogues) {
    for (const [id, n] of Object.entries(d.noeuds)) {
      for (const compagnon of [null, 'comp_follet_eau']) {
        const affiche = resoudreNoeud(d, id, registre, i18n, compagnon).locuteur;
        assert.notEqual(affiche, n.locuteur, `${d.id}.${id} : l'id « ${n.locuteur} » fuit à l'écran`);
        assert.ok(!affiche.startsWith('[['), `${d.id}.${id} : nom de locuteur absent des locales`);
      }
    }
  }
  // Le follet choisi garde le nom de son compagnon.
  const faim = registre.obtenir('dialogues', 'dlg_premiere_faim');
  assert.equal(resoudreNoeud(faim, faim.entree, registre, i18n, 'comp_follet_eau').locuteur, i18n.t('companion.follet_eau'));
  console.log('OK aucun id de locuteur à l’écran ; le follet choisi garde le nom de son compagnon');
}

// --- 3. Une clé de locuteur manquante tombe au boot --------------------------
{
  assert.deepEqual(erreursTextesDialogues(donnees.dialogues, dictionnaires), []);
  const sansNarrateur = { fr: { ...dictionnaires.fr }, en: dictionnaires.en };
  delete sansNarrateur.fr[cleLocuteur('narrateur')];
  assert.ok(erreursTextesDialogues(donnees.dialogues, sansNarrateur).some((e) => e.includes('locuteur.narrateur')));
  console.log('OK une clé de locuteur manquante est une erreur de démarrage');
}

console.log('OK test_d167_nom_du_narrateur');

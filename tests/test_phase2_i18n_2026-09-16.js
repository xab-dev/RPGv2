// Contrat (03_maison-exterieur §7) : jeux de clés FR/EN identiques (déjà
// couvert généralement par test_phase0_i18n, rejoué ici sur le contenu réel
// de cette session) + toutes les nouvelles clés de cette phase sont bien
// déclarées dans les deux langues, jamais un texte joueur en dur dans
// resources.json/items.json/dialogues.json (uniquement des _key).
import assert from 'node:assert/strict';
import { chargerLocalesDepuisDisque, chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { verifierJeuxDeCles } from '../src/i18n.js';
import { SCHEMAS } from '../src/schemas.js';

const NOUVELLES_CLES = [
  'menu.musique', 'menu.musique_oui', 'menu.musique_non',
  'menu.poche', 'menu.poche_titre', 'menu.poche_vide',
  'flag.maison_decouverte', 'flag.premier_ramassage', 'flag.jardin_decouvert',
  'dlg.ressource_bloquee_bois.1', 'dlg.ressource_bloquee_pierre.1',
  'dlg.station_pas_encore.1', 'dlg.puits_pas_encore.1', 'dlg.premier_ramassage.1',
  'resource.bois', 'resource.pierre',
  'item.branche', 'item.caillou', 'item.fruit',
];

// 1. FR/EN toujours symétriques (contrat général, rejoué sur les fichiers
// réels enrichis cette session).
{
  const dictionnaires = await chargerLocalesDepuisDisque('locales');
  assert.deepEqual(verifierJeuxDeCles(dictionnaires), []);
}

// 2. Chaque nouvelle clé de cette phase existe bien en FR et en EN, jamais
// vide.
{
  const dictionnaires = await chargerLocalesDepuisDisque('locales');
  for (const cle of NOUVELLES_CLES) {
    for (const langue of ['fr', 'en']) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(dictionnaires[langue], cle),
        `clé "${cle}" manquante en ${langue}`
      );
      assert.ok(dictionnaires[langue][cle].length > 0, `clé "${cle}" vide en ${langue}`);
    }
  }
}

// 3. resources.json/items.json/dialogues.json ne portent que des _key —
// aucun champ de texte joueur en dur (déjà garanti par schemas.js qui exige
// label_key/text_key, vérifié ici par lecture directe du JSON pour se
// prémunir d'un futur champ "label"/"texte" ajouté par erreur).
{
  const { donnees } = await chargerCataloguesDepuisDisque('data', Object.keys(SCHEMAS));
  for (const entry of donnees.resources) {
    assert.ok(typeof entry.label_key === 'string' && !('label' in entry));
  }
  for (const entry of donnees.items) {
    assert.ok(typeof entry.label_key === 'string' && !('label' in entry));
  }
  for (const entry of donnees.dialogues) {
    for (const ligne of entry.lignes) {
      assert.ok(typeof ligne.text_key === 'string' && !('texte' in ligne) && !('text' in ligne));
    }
  }
}

console.log('OK test_phase2_i18n');

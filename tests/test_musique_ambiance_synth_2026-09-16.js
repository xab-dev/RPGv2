// Contrat (MT_musique-ambiance-synth_2026-09-16) : une piste `synthese`
// (notes + tempo, sans fichier) est un type valide de music.json au même
// titre qu'une piste `fichier` ; une piste `fichier` peut déclarer une piste
// de secours (`repli`, id du même catalogue) résolue par
// audio.js#resoudrePisteRepli — une fonction pure, sans AudioContext, donc
// testable headless (le rendu audio réel reste hors des tests, comme le
// canvas — cf. contrainte de méthode).
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { resoudrePisteRepli } from '../src/audio.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueMinimalValide() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.tiles = [{ id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } }];
  donnees.scenes = [
    {
      id: 'scene_test',
      width: 1,
      height: 1,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
      layout: [['tile_sol']],
    },
  ];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  return donnees;
}

// 1. Le vrai music.json du dépôt doit être valide au boot, contenir la
// piste fichier (piano_solo, pas encore livré) et son repli synthétisé.
{
  const { donnees, erreurs: erreursChargement } = await chargerCataloguesDepuisDisque('data', NOMS);
  assert.deepEqual(erreursChargement, []);
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `catalogues réels invalides :\n${erreurs.join('\n')}`);

  const registre = construireRegistre(donnees);
  const pisteFichier = registre.obtenir('music', 'music_piano_solo');
  assert.equal(pisteFichier.type, 'fichier');
  assert.equal(pisteFichier.repli, 'mus_ambiance_provisoire');

  const pisteSynthese = registre.obtenir('music', 'mus_ambiance_provisoire');
  assert.equal(pisteSynthese.type, 'synthese');
  assert.ok(pisteSynthese.notes.length >= 4 && pisteSynthese.notes.length <= 8);

  const repli = resoudrePisteRepli(pisteFichier, registre.tous('music'));
  assert.equal(repli, pisteSynthese, "le repli de la piste fichier doit résoudre vers l'entrée synthese réelle");
}

// 2. resoudrePisteRepli est pure : ne dépend que des objets passés, aucun
// accès AudioContext/DOM — vérifié ici avec des pistes fictives, sans lien
// avec le vrai catalogue.
{
  const pisteA = { id: 'a', type: 'fichier', fichier: 'x.mp3', boucle: true, volume: 0.5, repli: 'b' };
  const pisteB = { id: 'b', type: 'synthese', tempo_bpm: 60, boucle: true, volume: 0.2, notes: [{ duree_beats: 1 }] };
  assert.equal(resoudrePisteRepli(pisteA, [pisteA, pisteB]), pisteB);
}
{
  // Pas de champ `repli` déclaré : aucune piste de secours (silence si le
  // fichier échoue, comportement Phase 2 inchangé).
  const pisteSansRepli = { id: 'a', type: 'fichier', fichier: 'x.mp3', boucle: true, volume: 0.5 };
  assert.equal(resoudrePisteRepli(pisteSansRepli, [pisteSansRepli]), null);
}
{
  // `repli` déclaré mais introuvable dans le catalogue fourni (ex. appelé
  // avec un sous-ensemble) : résolution defensive à null, jamais une
  // exception.
  const piste = { id: 'a', type: 'fichier', fichier: 'x.mp3', boucle: true, volume: 0.5, repli: 'inexistant' };
  assert.equal(resoudrePisteRepli(piste, [piste]), null);
}

// 3. Schéma : entrée synthese valide (notes + tempo_bpm, pas de fichier).
{
  const donnees = catalogueMinimalValide();
  donnees.music = [
    {
      id: 'mus_test',
      type: 'synthese',
      tempo_bpm: 50,
      boucle: true,
      volume: 0.25,
      notes: [{ note: 'A3', duree_beats: 2 }, { duree_beats: 1 }],
    },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `entrée synthese valide rejetée :\n${erreurs.join('\n')}`);
}

// 4. Schéma : entrée fichier sans le champ `fichier` → rejetée (le champ
// n'est requis que pour ce type, cf. custom() plutôt que requiredFields).
{
  const donnees = catalogueMinimalValide();
  donnees.music = [{ id: 'mus_test', type: 'fichier', boucle: true, volume: 0.5 }];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('fichier')), 'entrée fichier sans champ fichier non détectée');
}

// 5. Schéma : entrée synthese sans notes/tempo_bpm → rejetée.
{
  const donnees = catalogueMinimalValide();
  donnees.music = [{ id: 'mus_test', type: 'synthese', boucle: true, volume: 0.25 }];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('tempo_bpm')), 'tempo_bpm manquant non détecté');
  assert.ok(erreurs.some((e) => e.includes('notes')), 'notes manquantes non détectées');
}

// 6. Schéma : type inconnu → rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.music = [{ id: 'mus_test', type: 'midi', boucle: true, volume: 0.5 }];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('type')), 'type inconnu non détecté');
}

// 7. Schéma : `repli` pointant vers un id absent du catalogue → rejeté par
// la validation croisée générique (registry.js#validerCatalogues, refs[]).
{
  const donnees = catalogueMinimalValide();
  donnees.music = [
    { id: 'mus_test', type: 'fichier', fichier: 'x.mp3', boucle: true, volume: 0.5, repli: 'mus_inexistant' },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('mus_inexistant')), 'repli cassé non détecté');
}

console.log('OK test_musique_ambiance_synth');

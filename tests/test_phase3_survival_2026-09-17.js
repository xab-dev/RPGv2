// Contrat (Palier C, specs/04_maison-interieur.md §3.3/§7) : décroissance
// linéaire, modulateur = plancher + pente x moyenne(jauges), consommation
// bornée à 1, malus de respawn, gel sous UI via le vrai orchestrateur — et
// preuve data-driven : une 3ᵉ jauge en JSON de test entre dans la moyenne du
// modulateur sans modification de /src.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  jaugesDeclarees, configSurvie, decroitre, consommer, appliquerMalusRespawn,
  calculerModulateur, jaugeSousLeSeuil,
} from '../src/survival.js';
import { appliquerModulateurSurvie } from '../src/stats.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const registreDeTest = construireRegistre({
  survival: [
    { id: 'jauge_faim', label_key: 'x', decroissance_ms_plein_a_vide: 1000 },
    { id: 'jauge_soif', label_key: 'x', decroissance_ms_plein_a_vide: 500 },
    { id: 'survie_config', plancher: 0.5, pente: 0.5, malus_respawn: 0.25, stats_modulees: ['stat_force'] },
  ],
});

// 1. Décroissance linéaire, un taux différent par jauge.
{
  const jauges = decroitre(registreDeTest, { jauge_faim: 1, jauge_soif: 1 }, 250);
  assert.equal(jauges.jauge_faim, 0.75);
  assert.equal(jauges.jauge_soif, 0.5);
}

// 2. Jamais négative (clampée à 0).
{
  const jauges = decroitre(registreDeTest, { jauge_faim: 0.1, jauge_soif: 0.1 }, 1000);
  assert.equal(jauges.jauge_faim, 0);
  assert.equal(jauges.jauge_soif, 0);
}

// 3. Modulateur : plancher + pente x moyenne — moyenne(1, 1) = 1 -> 0,5+0,5=1.
{
  assert.equal(calculerModulateur(registreDeTest, { jauge_faim: 1, jauge_soif: 1 }), 1);
  // moyenne(0, 0) = 0 -> plancher seul.
  assert.equal(calculerModulateur(registreDeTest, { jauge_faim: 0, jauge_soif: 0 }), 0.5);
  // moyenne(0.5, 0.5) = 0.5 -> 0,5 + 0,5*0,5 = 0,75.
  assert.equal(calculerModulateur(registreDeTest, { jauge_faim: 0.5, jauge_soif: 0.5 }), 0.75);
}

// 4. appliquerModulateurSurvie ne touche que les stats listées.
{
  const stats = appliquerModulateurSurvie({ stat_force: 10, stat_agilite: 10 }, 0.5, ['stat_force']);
  assert.equal(stats.stat_force, 5);
  assert.equal(stats.stat_agilite, 10, 'stat non listée jamais modulée');
}

// 5. consommer() : additionne, borné à [0, 1], jamais négatif ni > 1.
{
  const jauges = consommer({ jauge_faim: 0.9 }, { jauge_faim: 0.5 });
  assert.equal(jauges.jauge_faim, 1);
  const jaugesNeg = consommer({ jauge_faim: 0.1 }, { jauge_faim: -5 });
  assert.equal(jaugesNeg.jauge_faim, 0);
}

// 6. Malus de respawn : ramène au-dessus vers malus_respawn, jamais une
// jauge déjà pire vers le haut.
{
  const jauges = appliquerMalusRespawn(registreDeTest, { jauge_faim: 1, jauge_soif: 0.1 });
  assert.equal(jauges.jauge_faim, 0.25);
  assert.equal(jauges.jauge_soif, 0.1, 'une jauge déjà sous le malus ne doit jamais remonter');
}

// 7. jaugeSousLeSeuil : détecte le franchissement.
{
  assert.equal(jaugeSousLeSeuil({ jauge_faim: 0.6, jauge_soif: 0.6 }), false);
  assert.equal(jaugeSousLeSeuil({ jauge_faim: 0.4, jauge_soif: 0.9 }), true);
}

// 8. jaugesDeclarees/configSurvie distinguent bien les jauges de l'entrée de
// configuration (id pivot "survie_config").
{
  assert.equal(jaugesDeclarees(registreDeTest).length, 2);
  assert.equal(configSurvie(registreDeTest).malus_respawn, 0.25);
}

// 9. Data-driven : une 3ᵉ jauge (fatigue) en catalogue réel entre dans la
// moyenne du modulateur sans modification de /src.
{
  const registre3Jauges = construireRegistre({
    survival: [
      { id: 'jauge_faim', label_key: 'x', decroissance_ms_plein_a_vide: 1000 },
      { id: 'jauge_soif', label_key: 'x', decroissance_ms_plein_a_vide: 500 },
      { id: 'jauge_fatigue', label_key: 'x', decroissance_ms_plein_a_vide: 2000 },
      { id: 'survie_config', plancher: 0.5, pente: 0.5, malus_respawn: 0.25, stats_modulees: ['stat_force'] },
    ],
  });
  assert.equal(jaugesDeclarees(registre3Jauges).length, 3);
  // moyenne(1, 1, 0) = 0,6667 -> 0,5 + 0,5*0,6667 = 0,8333...
  const modulateur = calculerModulateur(registre3Jauges, { jauge_faim: 1, jauge_soif: 1, jauge_fatigue: 0 });
  assert.ok(Math.abs(modulateur - (0.5 + 0.5 * (2 / 3))) < 1e-9);
}

// 10. Le vrai catalogue du dépôt est valide (survival.json réel).
{
  const [dictionnaires, { donnees }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
  ]);
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  assert.equal(jaugesDeclarees(registre).length, 2, 'faim + soif, cf. data/survival.json');

  // 11. Gel sous UI : sur le vrai orchestrateur, les jauges ne bougent pas
  // pendant que le menu est ouvert (même patron que test_phase2_daynight).
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.hero.x = 300;
  save.hero.y = 1900;

  let menuOuvert = false;
  const menuFactice = { estOuvert: () => menuOuvert, traiterInput: () => {}, ouvrir: () => { menuOuvert = true; } };
  const dialogue = creerDialogue();
  const etatNeutreInput = () => ({
    move: { x: 0, y: 0 },
    attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: false, held: false },
    menu: { pressed: false, held: false },
  });
  const input = { maj: () => etatNeutreInput() };
  const orch = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu: menuFactice, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });

  orch.maj(10000);
  const faimApresJeuActif = save.survie.jauge_faim;
  assert.ok(faimApresJeuActif < 1, 'la faim doit avoir baissé après du temps de jeu actif');

  menuOuvert = true;
  orch.maj(10000);
  assert.equal(save.survie.jauge_faim, faimApresJeuActif, 'la faim ne doit pas bouger pendant que le menu est ouvert');
}

console.log('OK test_phase3_survival');

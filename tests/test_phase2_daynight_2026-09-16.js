// Contrat (03_maison-exterieur §3.5/§7) : l'obscurité suit les phases en
// données (daynight.js, jour -> crépuscule -> nuit -> aube) ; le cycle est
// gelé sous UI (vérifié via le vrai orchestrateur, pas seulement les
// fonctions pures d'horloge).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUREE_CYCLE_MS, avancerHeure, opaciteAHeure, phaseAHeure, PHASES_CYCLE } from '../src/daynight.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// 1. Horloge : avance, boucle après DUREE_CYCLE_MS (jamais négative).
{
  assert.equal(avancerHeure(0, 100), 100);
  assert.equal(avancerHeure(DUREE_CYCLE_MS - 50, 100), 50);
}

// 2. Opacité aux bornes de chaque phase déclarée == exactement la valeur de
// données (pas d'interpolation au tout début d'une phase).
{
  for (const phase of PHASES_CYCLE) {
    const heure = phase.debut * DUREE_CYCLE_MS;
    assert.equal(opaciteAHeure(heure), phase.opacite, `phase "${phase.nom}" incohérente à son début`);
  }
}

// 3. Interpolation strictement entre deux valeurs de phases adjacentes,
// jamais un saut nul (sauf phases de même opacité).
{
  const debut = PHASES_CYCLE[0].opacite;
  const fin = PHASES_CYCLE[1].opacite;
  const milieu = ((PHASES_CYCLE[0].debut + PHASES_CYCLE[1].debut) / 2) * DUREE_CYCLE_MS;
  const opaciteMilieu = opaciteAHeure(milieu);
  const [lo, hi] = debut < fin ? [debut, fin] : [fin, debut];
  assert.ok(opaciteMilieu >= lo && opaciteMilieu <= hi, `interpolation hors bornes : ${opaciteMilieu}`);
}

// 4. phaseAHeure renvoie un nom de phase déclaré.
{
  const noms = new Set(PHASES_CYCLE.map((p) => p.nom));
  assert.ok(noms.has(phaseAHeure(0)));
  assert.ok(noms.has(phaseAHeure(DUREE_CYCLE_MS * 0.6)));
}

// 5. Sur le vrai orchestrateur (données réelles) : l'heure n'avance pas
// pendant qu'une UI est ouverte (menu), avance normalement sinon.
{
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
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

  orch.maj(1000);
  const heureApresJeuActif = save.monde.heure;
  assert.ok(heureApresJeuActif > 0, "l'heure doit avancer quand aucune UI n'est ouverte");

  menuOuvert = true;
  orch.maj(1000);
  assert.equal(save.monde.heure, heureApresJeuActif, "l'heure ne doit pas avancer pendant que le menu est ouvert");
}

console.log('OK test_phase2_daynight');

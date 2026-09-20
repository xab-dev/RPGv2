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

// Début cumulé (ms) de chaque phase — recalculé ici indépendamment de
// l'implémentation (pas d'import d'un détail interne de daynight.js).
const DEBUTS_MS = (() => {
  let cumul = 0;
  return PHASES_CYCLE.map((phase) => {
    const debut = cumul;
    cumul += phase.duree_ms;
    return debut;
  });
})();

// 2. Opacité aux bornes de chaque phase déclarée == exactement la valeur de
// données (pas d'interpolation au tout début d'une phase).
{
  PHASES_CYCLE.forEach((phase, i) => {
    assert.equal(opaciteAHeure(DEBUTS_MS[i]), phase.opacite, `phase "${phase.nom}" incohérente à son début`);
  });
}

// 3. Interpolation strictement entre deux phases d'opacité différente
// (crépuscule -> nuit, la rampe réelle — jour/nuit sont des plateaux et
// n'ont donc rien à interpoler avec leur voisin immédiat, cf. test 6).
{
  const i = PHASES_CYCLE.findIndex((p, k) => p.opacite !== PHASES_CYCLE[(k + 1) % PHASES_CYCLE.length].opacite);
  assert.ok(i >= 0, 'aucune transition réelle trouvée entre phases');
  const phase = PHASES_CYCLE[i];
  const suivante = PHASES_CYCLE[(i + 1) % PHASES_CYCLE.length];
  const milieu = DEBUTS_MS[i] + phase.duree_ms / 2;
  const opaciteMilieu = opaciteAHeure(milieu);
  const [lo, hi] = phase.opacite < suivante.opacite ? [phase.opacite, suivante.opacite] : [suivante.opacite, phase.opacite];
  assert.ok(opaciteMilieu > lo && opaciteMilieu < hi, `interpolation hors bornes : ${opaciteMilieu}`);
}

// 4. phaseAHeure renvoie un nom de phase déclaré.
{
  const noms = new Set(PHASES_CYCLE.map((p) => p.nom));
  assert.ok(noms.has(phaseAHeure(0)));
  assert.ok(noms.has(phaseAHeure(DUREE_CYCLE_MS * 0.6)));
}

// 5. Durées par phase (verdict Xav 2026-09-16 §5) : jour 10 min, crépuscule
// et aube 1 min 30, nuit 4 min francs — DUREE_CYCLE_MS = leur somme, pas une
// constante indépendante qui pourrait diverger des phases.
{
  const attendu = { jour: 600000, crepuscule: 90000, nuit: 240000, aube: 90000 };
  for (const phase of PHASES_CYCLE) {
    assert.equal(phase.duree_ms, attendu[phase.nom], `durée de "${phase.nom}" inattendue`);
  }
  assert.equal(DUREE_CYCLE_MS, Object.values(attendu).reduce((a, b) => a + b, 0));
}

// 6. Jour et nuit sont des plateaux francs (§6) : l'opacité ne bouge pas à
// l'intérieur de leur propre durée, échantillonnée à plusieurs points, pas
// seulement à leurs bornes (une nuit "pleine un instant" ne doit plus
// pouvoir se reproduire).
{
  for (const nomPlateau of ['jour', 'nuit']) {
    const i = PHASES_CYCLE.findIndex((p) => p.nom === nomPlateau);
    const phase = PHASES_CYCLE[i];
    for (const fraction of [0, 0.25, 0.5, 0.75, 0.99]) {
      const heure = DEBUTS_MS[i] + phase.duree_ms * fraction;
      assert.equal(opaciteAHeure(heure), phase.opacite, `"${nomPlateau}" n'est pas un plateau à ${fraction}`);
    }
  }
}

// 7. Aucune transition ne dépasse le niveau nuit (le plateau nuit reste le
// maximum du cycle) ni ne descend sous le niveau jour (le plateau jour reste
// le minimum) — échantillonnage dense sur tout le cycle.
{
  const nuitOpacite = PHASES_CYCLE.find((p) => p.nom === 'nuit').opacite;
  const jourOpacite = PHASES_CYCLE.find((p) => p.nom === 'jour').opacite;
  for (let t = 0; t < DUREE_CYCLE_MS; t += 1000) {
    const o = opaciteAHeure(t);
    assert.ok(o <= nuitOpacite + 1e-9, `opacité ${o} dépasse le niveau nuit à t=${t}`);
    assert.ok(o >= jourOpacite - 1e-9, `opacité ${o} descend sous le niveau jour à t=${t}`);
  }
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
    menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
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

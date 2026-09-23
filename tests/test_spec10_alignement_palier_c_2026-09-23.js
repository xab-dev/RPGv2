// Contrat de `specs/10_alignement-follet.md`, palier C : les RÉGIMES de
// synergie (table §4.2), en données, relus à chaque frame.
//
// Témoins de la spec §7 :
// 1. Régime positif palier 1 — et neutre — = les valeurs d'AUJOURD'HUI, pour
//    les trois follets, au nombre près.
// 2. Eau négatif ne touche AUCUNE stat : il redistribue entre deux dérivées.
// 3. Terre négatif : l'entrave des monstres est conservée, son intensité × 0,5.
// 4. Un monstre hors de l'aura n'a rien, quel que soit le régime.
// 5. La brûlure du héros fait descendre `pv`, jamais `pv_max`.
// Et : un follet sans régime négatif tombe au boot ; les paliers 2 et 3
// s'appliquent des deux côtés (`Q-85`) ; un 4ᵉ follet reste une affaire de
// JSON.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { creerMonstre } from '../src/entities.js';
import {
  resoudreSynergie, modificateursHeros, modificateursDeriveesHeros, statsEffectivesMonstre,
} from '../src/status.js';
import { calculerStatsPrimaires, calculerStatsDerivees } from '../src/stats.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

const NEUTRE = { regime: 'neutre', palier: 0 };
const pos = (palier) => ({ regime: 'positif', palier });
const neg = (palier) => ({ regime: 'negatif', palier });
const FEU = 'comp_follet_feu';
const EAU = 'comp_follet_eau';
const TERRE = 'comp_follet_terre';
const ENNEMI = registre.obtenir('enemies', 'enemy_chaos_rodeur');
const follet = (companionId) => ({ companionId, x: 0, y: 0 });
const DANS = { position: { x: 5, y: 0 }, aura: { centre: { x: 0, y: 0 }, rayonPx: 30 } };
const HORS = { position: { x: 500, y: 0 }, aura: { centre: { x: 0, y: 0 }, rayonPx: 30 } };

// --- 1. Positif palier 1 et neutre = aujourd'hui ---------------------------
// « Aujourd'hui » est écrit ici en toutes lettres, et c'est voulu : c'est le
// témoin de non-régression que la spec demande, pas un réglage — la migration
// de données ne devait changer AUCUN nombre du jeu tel que Xav l'a validé.
{
  for (const regime of [NEUTRE, pos(1)]) {
    assert.deepEqual(modificateursHeros(registre, FEU, regime), { stat_force: 1 });
    assert.deepEqual(modificateursHeros(registre, EAU, regime), { stat_agilite: 1 });
    assert.deepEqual(modificateursHeros(registre, TERRE, regime), { stat_vitalite: 1 });
    for (const id of [FEU, EAU, TERRE]) {
      assert.deepEqual(modificateursDeriveesHeros(registre, id, regime), {}, `${id} : aucune dérivée touchée`);
    }
    const feu = statsEffectivesMonstre(registre, ENNEMI, follet(FEU), DANS, regime);
    assert.equal(feu.force, ENNEMI.force);
    assert.equal(feu.vitesse, ENNEMI.vitesse);
    assert.equal(feu.dot.valeur, 1);
    assert.equal(feu.dot.intervalle_ms, 500);
    const eau = statsEffectivesMonstre(registre, ENNEMI, follet(EAU), DANS, regime);
    assert.equal(eau.force, ENNEMI.force - 1);
    assert.equal(eau.vitesse, ENNEMI.vitesse);
    assert.equal(eau.dot, null);
    const terre = statsEffectivesMonstre(registre, ENNEMI, follet(TERRE), DANS, regime);
    assert.equal(terre.force, ENNEMI.force);
    assert.equal(terre.vitesse, ENNEMI.vitesse * 0.5);
    assert.equal(terre.dot, null);
  }
  // Symétrie retenue par défaut (`Q-85`) : +2 et +3 côté positif aussi.
  assert.deepEqual(modificateursHeros(registre, FEU, pos(2)), { stat_force: 2 });
  assert.deepEqual(modificateursHeros(registre, TERRE, pos(3)), { stat_vitalite: 3 });
  console.log('OK positif palier 1 et neutre = les valeurs d\'aujourd\'hui, pour les trois follets ; +2/+3 aux paliers suivants');
}

// --- Feu négatif ------------------------------------------------------------
{
  for (const p of [1, 2, 3]) {
    assert.deepEqual(modificateursHeros(registre, FEU, neg(p)), { stat_force: p }, `Force +${p} au palier ${p}`);
  }
  const m = statsEffectivesMonstre(registre, ENNEMI, follet(FEU), DANS, neg(2));
  assert.equal(m.dot, null, 'plus aucune brûlure sur les monstres');
  assert.equal(m.force, ENNEMI.force);
  assert.equal(m.vitesse, ENNEMI.vitesse);
  const heros = resoudreSynergie(registre, FEU, neg(1)).heros;
  assert.ok(heros.some((e) => e.param === 'pv' && e.famille === 'dot'), 'la brûlure change de camp : elle est sur le héros');
  console.log('OK Feu négatif : Force +1/+2/+3, brûlure sur le héros, plus sur les monstres');
}

// --- 2. Eau négatif : aucune stat, deux dérivées ----------------------------
{
  for (const p of [1, 2, 3]) {
    assert.deepEqual(modificateursHeros(registre, EAU, neg(p)), {}, `Eau négatif palier ${p} ne touche aucune stat`);
  }
  const base = calculerStatsDerivees(registre, calculerStatsPrimaires(registre, {}));
  const d1 = modificateursDeriveesHeros(registre, EAU, neg(1));
  const d3 = modificateursDeriveesHeros(registre, EAU, neg(3));
  const appliquer = (mods, id) => (mods[id] || []).reduce((v, e) => (e.mode === 'pourcent' ? v * (1 + e.valeur) : v + e.valeur), base[id]);
  const v1 = appliquer(d1, 'derivee_vitesse_deplacement_px_s');
  const v3 = appliquer(d3, 'derivee_vitesse_deplacement_px_s');
  const c1 = appliquer(d1, 'derivee_cooldown_attaque_ms');
  const c3 = appliquer(d3, 'derivee_cooldown_attaque_ms');
  assert.ok(v1 < base.derivee_vitesse_deplacement_px_s && v3 < v1, 'plus lent, et de plus en plus par palier');
  assert.ok(c1 < base.derivee_cooldown_attaque_ms && c3 < c1, 'frappe plus vite (cooldown plus court), de plus en plus par palier');
  const m = statsEffectivesMonstre(registre, ENNEMI, follet(EAU), DANS, neg(2));
  assert.ok(m.vitesse > ENNEMI.vitesse, 'les monstres dans l\'aura courent plus vite');
  assert.equal(m.force, ENNEMI.force, 'ils n\'infligent pas plus, et perdent l\'affaiblissement');
  console.log(`OK Eau négatif : aucune stat ; vitesse ${base.derivee_vitesse_deplacement_px_s} → ${v1.toFixed(1)} / ${v3.toFixed(1)}, cooldown ${base.derivee_cooldown_attaque_ms} → ${c1.toFixed(0)} / ${c3.toFixed(0)} ms ; monstres ×${(m.vitesse / ENNEMI.vitesse).toFixed(2)}`);
}

// --- 3. Terre négatif : entrave conservée, intensité × 0,5 ------------------
// Lecture retenue de « facteur ÷ 2 » : c'est le RALENTISSEMENT qui est divisé
// par deux (« ils traînent un peu moins », §9), pas la vitesse restante — qui
// les ferait traîner davantage.
{
  const posi = statsEffectivesMonstre(registre, ENNEMI, follet(TERRE), DANS, pos(1));
  const nega = statsEffectivesMonstre(registre, ENNEMI, follet(TERRE), DANS, neg(1));
  const ralentiPos = 1 - posi.vitesse / ENNEMI.vitesse;
  const ralentiNeg = 1 - nega.vitesse / ENNEMI.vitesse;
  assert.ok(Math.abs(ralentiNeg - ralentiPos * 0.5) < 1e-9, `ralentissement négatif = positif × 0,5 (${ralentiNeg} / ${ralentiPos})`);
  for (const p of [1, 2, 3]) {
    assert.deepEqual(modificateursHeros(registre, TERRE, neg(p)), { stat_vitalite: p });
  }
  const heros = resoudreSynergie(registre, TERRE, neg(1)).heros;
  assert.ok(heros.some((e) => e.derivee === 'derivee_vitesse_deplacement_px_s' && e.duree === 'aura'), 'entrave sur le héros, le temps du combat');
  // Pas en permanence : hors combat (aura vide), le héros n'est pas entravé.
  assert.deepEqual(modificateursDeriveesHeros(registre, TERRE, neg(1), { auraOccupee: false }), {});
  assert.ok(modificateursDeriveesHeros(registre, TERRE, neg(1), { auraOccupee: true }).derivee_vitesse_deplacement_px_s);
  console.log(`OK Terre négatif : Vitalité +1/+2/+3, entrave du héros en combat, monstres ralentis de ${(ralentiNeg * 100).toFixed(0)} % au lieu de ${(ralentiPos * 100).toFixed(0)} %`);
}

// --- 4. Hors aura : rien, quel que soit le régime --------------------------
{
  for (const id of [FEU, EAU, TERRE]) {
    for (const regime of [NEUTRE, pos(3), neg(1), neg(3)]) {
      const m = statsEffectivesMonstre(registre, ENNEMI, follet(id), HORS, regime);
      assert.deepEqual({ force: m.force, vitesse: m.vitesse, dot: m.dot, dansAura: m.dansAura },
        { force: ENNEMI.force, vitesse: ENNEMI.vitesse, dot: null, dansAura: false }, `${id} ${regime.regime}${regime.palier}`);
    }
  }
  console.log('OK hors de l\'aura, un monstre n\'a rien, dans tous les régimes');
}

// --- Schéma : pas de repli sur le positif, et un 4ᵉ follet en JSON seul -----
{
  const cloner = (x) => JSON.parse(JSON.stringify(x));
  const d = cloner(donnees);
  delete d.synergies.find((s) => s.id === 'syn_feu').regimes.negatif;
  assert.ok(validerCatalogues(d).some((e) => e.includes('syn_feu') && e.includes('negatif')),
    'une synergie sans régime négatif tombe au boot, avec son chemin');
  const d2 = cloner(donnees);
  d2.synergies.find((s) => s.id === 'syn_eau').regimes.positif.heros.push({ effet: 'effet_inconnu' });
  assert.ok(validerCatalogues(d2).some((e) => e.includes('effet_inconnu')), 'un effet inconnu tombe au boot');
  const d3 = cloner(donnees);
  d3.synergies.find((s) => s.id === 'syn_eau').regimes.positif.monstres_aura.push({ effet: 'buff_force' });
  assert.ok(validerCatalogues(d3).some((e) => e.includes('buff_force')), 'un effet de héros rangé chez les monstres tombe au boot');

  // Le test data-driven : un 4ᵉ follet, rien que du JSON.
  const d4 = cloner(donnees);
  d4.synergies.push({
    id: 'syn_test', element: 'elem_feu',
    regimes: {
      positif: { heros: [{ effet: 'buff_agilite', par_palier: true }], monstres_aura: [] },
      negatif: { heros: [{ effet: 'buff_force', multiplicateur: 2 }], monstres_aura: [{ effet: 'controle_entrave' }] },
    },
  });
  d4.companions.push({ ...d4.companions[0], id: 'comp_follet_test', synergie: 'syn_test' });
  assert.deepEqual(validerCatalogues(d4), []);
  const r4 = construireRegistre(d4);
  assert.deepEqual(modificateursHeros(r4, 'comp_follet_test', pos(3)), { stat_agilite: 3 });
  assert.deepEqual(modificateursHeros(r4, 'comp_follet_test', neg(3)), { stat_force: 2 });
  console.log('OK pas de repli sur le positif, un effet mal rangé tombe au boot, un 4ᵉ follet = du JSON');
}

// --- 5. Dans l'orchestrateur : la brûlure du héros --------------------------
const etatNeutre = {
  move: { x: 0, y: 0 },
  attack: { pressed: false, held: false },
  skill_1: { pressed: false, held: false },
  skill_2: { pressed: false, held: false },
  skill_3: { pressed: false, held: false },
  consume: { pressed: false, held: false },
  interact: { pressed: false, held: false },
  menu: { pressed: false, held: false },
  target_next: { pressed: false, held: false },
};
function combat(companion, alignementForce, dureeMs) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = companion;
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.monde.heure = 0;
  const orch = creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} },
    input: { maj: () => etatNeutre },
    ctxLogique: null,
    ctxVisible: null,
    canvasLogique: null,
    alignementForce,
  });
  orch.maj(16);
  const hero = orch.obtenirHero();
  const pvMax = hero.pvMax;
  const pvDepart = hero.pv;
  // Un monstre posé DANS l'aura, qui ne frappe jamais : on ne mesure que la
  // synergie. Sa fiche est clonée avec d'énormes PV pour qu'une brûlure
  // éventuelle ne le tue pas pendant la mesure.
  const f = orch.obtenirFollet();
  const monstre = creerMonstre({ ...ENNEMI, pv: 100000 }, { x: f.x, y: f.y, id: 'enemy_chaos_rodeur#test' });
  orch.obtenirMonstres().push(monstre);
  const vus = { pvMin: hero.pv, pvMaxVus: new Set([pvMax]) };
  for (let t = 0; t < dureeMs; t += 16) {
    for (const m of orch.obtenirMonstres()) {
      m.cooldownAttaqueMs = 1e9;
      // Le monstre reste collé au follet : il ne sort jamais de l'aura.
      const fo = orch.obtenirFollet();
      m.x = fo.x; m.y = fo.y;
    }
    orch.maj(16);
    vus.pvMin = Math.min(vus.pvMin, hero.pv);
    vus.pvMaxVus.add(hero.pvMax);
  }
  return { hero, pvDepart, pvMax, vus, monstre: orch.obtenirMonstres()[0] };
}
{
  const positif = combat(FEU, 1, 6000);
  assert.equal(positif.vus.pvMin, positif.pvDepart, 'Feu positif : le héros ne brûle pas');
  assert.ok(positif.monstre.pv < 100000, 'Feu positif : le monstre brûle');
  const negatif = combat(FEU, -1, 6000);
  assert.ok(negatif.vus.pvMin < negatif.pvDepart, 'Feu négatif : le héros brûle');
  assert.deepEqual([...negatif.vus.pvMaxVus], [negatif.pvMax], 'la brûlure ne touche jamais pv_max');
  assert.equal(negatif.monstre.pv, 100000, 'Feu négatif : le monstre ne brûle plus');
  console.log(`OK Feu négatif en jeu : le héros perd ${negatif.pvDepart - negatif.vus.pvMin} PV en 6 s, pv_max intact (${negatif.pvMax}), le monstre ne brûle plus`);
}

console.log('OK test_spec10_alignement_palier_c');

// La régénération de vie (demande de Xav, 23/09, pour la pomme cuite) : le
// premier buff qui ne touche pas une stat mais les PV du héros.
//
// Ce qui est éprouvé est un CONTRAT, jamais un réglage (`D-52`) : combien de
// PV, à quel rythme, pendant combien de temps vit dans
// `data/status_effects.json` et appartient à Xav. Prouvé ici :
//   1. un soin rend `valeur` PV par `intervalle_ms`, par-delà les frames, et
//      s'arrête avec son buff ; un buff de stat ne soigne jamais ;
//   2. au bandeau, il emprunte l'icône de la Vitalité (celle du fruit cuit),
//      teintée — jamais un dessin à lui (`D-13`) ;
//   3. le démarrage refuse un soin mal déclaré ;
//   4. sur le vrai orchestrateur : les PV montent, plafonnés aux PV max, et
//      plus rien une fois le buff expiré.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { tickSoinsBuffsActifs, iconeBuffBandeau } from '../src/status.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const REGEN = registre.obtenir('status_effects', 'buff_regeneration');
const REPAS = registre.obtenir('status_effects', 'buff_repas');

// --- 1. Le soin, fonction pure ------------------------------------------
{
  // Trois intervalles découpés en frames irrégulières : le compte tombe juste.
  let acc = {};
  let total = 0;
  const pas = [17, 33, 16, 50];
  let temps = 0;
  let i = 0;
  while (temps + pas[i % pas.length] <= REGEN.intervalle_ms * 3) {
    const r = tickSoinsBuffsActifs(registre, { [REGEN.id]: REGEN.duree }, acc, pas[i % pas.length]);
    temps += pas[i % pas.length];
    total += r.soin;
    acc = r.accumulateurs;
    i += 1;
  }
  const attendu = Math.floor(temps / REGEN.intervalle_ms) * REGEN.valeur;
  assert.equal(total, attendu, `soin par-delà les frames : ${total} au lieu de ${attendu}`);

  // Le buff parti, plus de soin, et son accumulateur disparaît avec lui.
  const apres = tickSoinsBuffsActifs(registre, {}, acc, REGEN.intervalle_ms * 5);
  assert.equal(apres.soin, 0);
  assert.deepEqual(apres.accumulateurs, {});

  // Un buff de STAT ne soigne jamais, même longtemps.
  assert.equal(tickSoinsBuffsActifs(registre, { [REPAS.id]: REPAS.duree }, {}, 600000).soin, 0);
  console.log(`OK le soin : ${REGEN.valeur} PV / ${REGEN.intervalle_ms} ms, par-delà les frames, arrêté avec son buff`);
}

// --- 2. L'icône : celle du fruit cuit, teintée ---------------------------
{
  const iconeRegen = iconeBuffBandeau(registre, REGEN);
  const iconeRepas = iconeBuffBandeau(registre, REPAS);
  assert.equal(iconeRegen.visuel, iconeRepas.visuel, 'même silhouette que le buff du fruit cuit');
  assert.ok(iconeRegen.teinte, 'mais teintée');
  assert.equal(iconeRepas.teinte, null, 'le buff du fruit cuit garde ses couleurs d’auteur');
  assert.ok(registre.obtenir('visuels', iconeRegen.visuel).teintable, 'la silhouette accepte la teinte');
  console.log(`OK l’icône : ${iconeRegen.visuel}, teinte ${iconeRegen.teinte}`);
}

// --- 3. Le démarrage refuse un soin mal déclaré --------------------------
{
  const refuse = (modifier, motif) => {
    const copie = JSON.parse(JSON.stringify(donnees));
    modifier(copie, copie.status_effects.find((e) => e.id === REGEN.id));
    const errs = validerCatalogues(copie);
    assert.ok(errs.some((e) => motif.test(e)), `attendu ${motif} : ${errs.join(' | ')}`);
  };
  refuse((_, e) => { delete e.intervalle_ms; }, /soin doit déclarer intervalle_ms/);
  refuse((_, e) => { e.valeur = -1; }, /valeur > 0/);
  refuse((_, e) => { e.cible = 'monstre'; }, /ne vise que le héros/);
  refuse((_, e) => { e.duree = 'permanente'; }, /durée en ms/);
  refuse((_, e) => { e.icone_bandeau.stat = 'stat_inconnue'; }, /icone_bandeau\.stat/);
  refuse((_, e) => { e.icone_bandeau.teinte = 'vert'; }, /#rrggbb/);
  refuse((c, e) => {
    const stat = c.stats.find((s) => s.id === e.icone_bandeau.stat);
    c.visuels.find((v) => v.id === stat.icone).teintable = false;
    for (const p of c.visuels.find((v) => v.id === stat.icone).primitives) delete p.teinte;
  }, /n'est pas teintable/);
  console.log('OK le démarrage refuse : sans intervalle, négatif, sur un monstre, permanent, icône inconnue ou non teintable');
}

// --- 4. Sur le vrai orchestrateur ---------------------------------------
function demarrer(buffs) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.buffs_actifs = { ...buffs };
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    // Un dialogue gèle le temps actif : lignes d'ambiance et premières
    // interactions déduites du catalogue, jamais recopiées (`Q-42`).
    ...Object.fromEntries(registre.tous('ambiances').map((a) => [a.flag, true])),
    ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])),
  };
  const b = (v) => ({ pressed: v, held: v });
  const repos = {
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(false), menu: b(false), target_next: b(false),
  };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, ouvrirCraft: () => {},
      rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => repos },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  orch.maj(16); // PV max calculés depuis les stats
  const avancer = (ms) => { for (let t = 0; t < ms; t += 50) orch.maj(50); };
  return { save, hero: () => orch.obtenirHero(), avancer };
}

{
  const jeu = demarrer({ [REGEN.id]: REGEN.duree });
  const pvMax = jeu.hero().pvMax;
  jeu.hero().pv = 1;
  jeu.avancer(REGEN.intervalle_ms * 3 + 25);
  assert.ok(jeu.hero().pv > 1, 'les PV remontent');
  assert.ok(jeu.hero().pv <= 1 + REGEN.valeur * 3, `au rythme déclaré, pas plus (${jeu.hero().pv})`);

  // Plafonné : un héros plein ne dépasse jamais ses PV max.
  jeu.hero().pv = pvMax;
  jeu.avancer(REGEN.intervalle_ms * 3);
  assert.equal(jeu.hero().pv, pvMax, 'jamais au-dessus des PV max');
  console.log(`OK en jeu : les PV remontent, plafonnés à ${pvMax}`);
}

{
  // Un buff qui expire avant son prochain intervalle ne rend plus rien.
  const jeu = demarrer({ [REGEN.id]: 100 });
  jeu.hero().pv = 1;
  jeu.avancer(REGEN.intervalle_ms * 3);
  assert.equal(jeu.hero().pv, 1, 'buff expiré : plus de soin');
  assert.equal(jeu.save.hero.buffs_actifs[REGEN.id], undefined, 'et il a quitté la table');
  console.log('OK en jeu : plus rien une fois le buff expiré');
}

// Contrat (§3.4/§7, révisé par `D-51`) : « dans l'aura » se mesure au compas,
// pas à l'état d'engagement. Feu -> DoT uniquement dans l'aura ; Eau -> dégâts
// reçus réduits ; Terre -> vitesse -50% dans l'aura, normale hors aura ; un
// 4ᵉ élément ajouté en JSON de test fonctionne sans modification de code.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { appliquerModificateur, modificateursHeros, statsEffectivesMonstre } from '../src/status.js';

function donneesTroisElements() {
  return {
    elements: [
      { id: 'elem_feu', label_key: 'x', icon: 'x', shape: 'x' },
      { id: 'elem_eau', label_key: 'x', icon: 'x', shape: 'x' },
      { id: 'elem_terre', label_key: 'x', icon: 'x', shape: 'x' },
    ],
    status_effects: [
      { id: 'buff_force', label_key: 'x', famille: 'buff', cible: 'joueur', stat: 'stat_force', valeur: 1, mode: 'plat', duree: 'permanente', cumul: false, icone: 'x' },
      { id: 'buff_agilite', label_key: 'x', famille: 'buff', cible: 'joueur', stat: 'stat_agilite', valeur: 1, mode: 'plat', duree: 'permanente', cumul: false, icone: 'x' },
      { id: 'dot_brulure', label_key: 'x', famille: 'dot', cible: 'monstre', param: 'pv', valeur: 1, mode: 'plat', duree: 'aura', intervalle_ms: 500, cumul: false, icone: 'x' },
      { id: 'debuff_affaiblissement', label_key: 'x', famille: 'debuff', cible: 'monstre', stat: 'stat_force', valeur: -1, mode: 'plat', duree: 'aura', cumul: false, icone: 'x' },
      { id: 'controle_entrave', label_key: 'x', famille: 'controle', cible: 'monstre', param: 'vitesse_deplacement', valeur: -0.5, mode: 'pourcent', duree: 'aura', cumul: false, icone: 'x' },
    ],
    synergies: [
      { id: 'syn_feu', element: 'elem_feu', effet_joueur: 'buff_force', effet_monstre: 'dot_brulure' },
      { id: 'syn_eau', element: 'elem_eau', effet_joueur: 'buff_agilite', effet_monstre: 'debuff_affaiblissement' },
      { id: 'syn_terre', element: 'elem_terre', effet_joueur: 'buff_force', effet_monstre: 'controle_entrave' },
    ],
    companions: [
      { id: 'comp_feu', label_key: 'x', element: 'elem_feu', synergie: 'syn_feu', rayon_aura: 40, rayon_lumiere: 90, render: {} },
      { id: 'comp_eau', label_key: 'x', element: 'elem_eau', synergie: 'syn_eau', rayon_aura: 40, rayon_lumiere: 90, render: {} },
      { id: 'comp_terre', label_key: 'x', element: 'elem_terre', synergie: 'syn_terre', rayon_aura: 40, rayon_lumiere: 90, render: {} },
    ],
  };
}

function follet(companionId) {
  return { companionId, etat: 'suivre', cibleMonstreId: null };
}

// `D-51` : « dans l'aura » est GÉOMÉTRIQUE — plus aucune comparaison d'ids.
// Aura centrée sur l'origine, rayon 40 (celui des compagnons de test).
const AURA = { centre: { x: 0, y: 0 }, rayonPx: 40 };
const dans = { position: { x: 10, y: 0 }, aura: AURA };
const hors = { position: { x: 100, y: 0 }, aura: AURA };

// 1. appliquerModificateur : plat additionne, pourcent multiplie.
{
  assert.equal(appliquerModificateur(10, { mode: 'plat', valeur: 1 }), 11);
  assert.equal(appliquerModificateur(40, { mode: 'pourcent', valeur: -0.5 }), 20);
}

// 2. Buff joueur permanent tant que le follet est équipé.
{
  const registre = construireRegistre(donneesTroisElements());
  assert.deepEqual(modificateursHeros(registre, 'comp_feu'), { stat_force: 1 });
  assert.deepEqual(modificateursHeros(registre, null), {});
}

// 3. Feu : DoT actif uniquement quand le monstre est DANS le cercle d'aura.
{
  const registre = construireRegistre(donneesTroisElements());
  const monstre = { id: 'm1', force: 3, vitesse: 40 };

  const horsAura = statsEffectivesMonstre(registre, monstre, follet('comp_feu'), hors);
  assert.equal(horsAura.dot, null);
  assert.equal(horsAura.dansAura, false);

  const dansAura = statsEffectivesMonstre(registre, monstre, follet('comp_feu'), dans);
  assert.equal(dansAura.dansAura, true);
  assert.equal(dansAura.dot.id, 'dot_brulure');
  assert.equal(dansAura.force, 3, "le feu ne modifie pas la force du monstre");
}

// 4. Eau : force du monstre réduite (donc dégâts reçus réduits) dans l'aura.
{
  const registre = construireRegistre(donneesTroisElements());
  const monstre = { id: 'm1', force: 3, vitesse: 40 };
  const dansAura = statsEffectivesMonstre(registre, monstre, follet('comp_eau'), dans);
  assert.equal(dansAura.force, 2);
  assert.equal(dansAura.dot, null);
}

// 5. Terre : vitesse -50% dans l'aura, normale hors aura.
{
  const registre = construireRegistre(donneesTroisElements());
  const monstre = { id: 'm1', force: 3, vitesse: 40 };
  assert.equal(statsEffectivesMonstre(registre, monstre, follet('comp_terre'), hors).vitesse, 40);
  assert.equal(statsEffectivesMonstre(registre, monstre, follet('comp_terre'), dans).vitesse, 20);
}

// 6. Data-driven : un 4ᵉ élément ajouté en JSON de test fonctionne sans
// modification de status.js (aucun id d'élément n'y est câblé en dur).
{
  const donnees = donneesTroisElements();
  donnees.elements.push({ id: 'elem_vent', label_key: 'x', icon: 'x', shape: 'x' });
  donnees.status_effects.push(
    { id: 'buff_vent', label_key: 'x', famille: 'buff', cible: 'joueur', stat: 'stat_agilite', valeur: 2, mode: 'plat', duree: 'permanente', cumul: false, icone: 'x' },
    { id: 'controle_vent', label_key: 'x', famille: 'controle', cible: 'monstre', param: 'vitesse_deplacement', valeur: 0.5, mode: 'pourcent', duree: 'aura', cumul: false, icone: 'x' }
  );
  donnees.synergies.push({ id: 'syn_vent', element: 'elem_vent', effet_joueur: 'buff_vent', effet_monstre: 'controle_vent' });
  donnees.companions.push({ id: 'comp_vent', label_key: 'x', element: 'elem_vent', synergie: 'syn_vent', rayon_aura: 40, rayon_lumiere: 90, render: {} });

  const registre = construireRegistre(donnees);
  assert.deepEqual(modificateursHeros(registre, 'comp_vent'), { stat_agilite: 2 });
  const monstre = { id: 'm1', force: 3, vitesse: 40 };
  const dansAura = statsEffectivesMonstre(registre, monstre, follet('comp_vent'), dans);
  assert.equal(dansAura.vitesse, 60);
}

console.log('OK test_phase1_status_synergies');

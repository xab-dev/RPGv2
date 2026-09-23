// Ticket L2 (journal du 23/09) — l'apparition du symbole du jeu (`src/logo.js`),
// ses réglages en données et ses trois calques d'image.
//
// Contrats :
// 1. Le symbole apparaît comme il se lit : à tout instant de l'apparition, un
//    signe n'est jamais plus visible que celui qui le précède, et le second
//    n'a pas commencé quand le premier commence.
// 2. Un signe posé est à sa place (dy = 0) et jamais au-delà de l'alpha réglé.
// 3. À la durée dérivée des données, c'est fini et tout est éteint.
// 4. Données : les entrées `logo` du catalogue réel passent la validation, et
//    une entrée absurde tombe au boot.
// 5. Les trois calques que le jeu charge existent (le rendu n'est jamais
//    exercé headless : on prouve seulement qu'il a de quoi dessiner).
// Aucune durée n'est épinglée (`D-52`) : tout est lu dans les données.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { etatLogo, dureeLogo, NB_SIGNES } from '../src/logo.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', Object.keys(SCHEMAS));
const logos = donnees.effets.filter((e) => e.type === 'logo');
assert.ok(logos.some((e) => e.id === 'effet_logo_ouverture'), 'le logo d\'ouverture est en données');
assert.ok(logos.some((e) => e.id === 'effet_logo_niveau'), 'le logo de montée de niveau est en données');

for (const config of logos) {
  const duree = dureeLogo(config);
  assert.ok(duree > 0, `${config.id} : durée nulle`);
  // 1 et 2
  for (let t = 0; t <= duree; t += 10) {
    const { calques } = etatLogo(config, t);
    assert.equal(calques.length, NB_SIGNES);
    for (let i = 0; i < NB_SIGNES; i++) {
      assert.ok(calques[i].alpha >= 0 && calques[i].alpha <= config.alpha + 1e-9, `${config.id} : alpha hors bornes à ${t} ms`);
      if (i > 0) assert.ok(calques[i].alpha <= calques[i - 1].alpha + 1e-9, `${config.id} : le signe ${i + 1} passe devant le signe ${i} à ${t} ms`);
    }
  }
  if (config.decalage_ms > 0) {
    const debut = etatLogo(config, config.decalage_ms / 2).calques;
    assert.ok(debut[0].alpha > 0 && debut[1].alpha === 0, `${config.id} : la sagesse d'abord, seule`);
  }
  const pose = etatLogo(config, config.decalage_ms * (NB_SIGNES - 1) + config.apparition_ms).calques;
  for (const c of pose) {
    assert.equal(c.dy, 0, `${config.id} : un signe posé est à sa place`);
    assert.ok(Math.abs(c.alpha - config.alpha) < 1e-9, `${config.id} : un signe posé est à l'alpha réglé`);
  }
  // 3
  assert.equal(etatLogo(config, duree - 1).termine, false);
  const fin = etatLogo(config, duree);
  assert.equal(fin.termine, true);
  assert.ok(fin.calques.every((c) => c.alpha === 0), `${config.id} : tout est éteint à la fin`);
}

// 4
assert.deepEqual(validerCatalogues(donnees), [], 'le catalogue réel est valide');
const casse = { ...logos[0], id: 'effet_logo_casse', alpha: 0, apparition_ms: -1 };
const erreurs = validerCatalogues({ ...donnees, effets: [...donnees.effets, casse] });
assert.ok(erreurs.some((e) => e.includes('effet_logo_casse') || e.includes('alpha')), 'un alpha nul tombe au boot');
assert.ok(erreurs.some((e) => e.includes('apparition_ms')), 'une durée négative tombe au boot');

// 5
for (let n = 1; n <= NB_SIGNES; n++) {
  const chemin = `images/logo/logo_calque_${n}.svg`;
  assert.ok(existsSync(chemin), `${chemin} absent : relancer docs/captures/logo/generer_logo.mjs`);
  assert.match(readFileSync(chemin, 'utf8'), /<svg[^>]* width="[\d.]+" height="\d+"/, `${chemin} : sans taille naturelle, le canvas ne connaît pas ses proportions`);
}

console.log(`test_l2_logo : ${logos.length} apparitions en données, lues dans l'ordre du symbole, ${NB_SIGNES} calques présents`);

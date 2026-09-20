// `D-51` — Les effets du follet sur les monstres, rebranchés sur l'aura RÉELLE.
//
// Le défaut que ce fichier verrouille. Depuis `65a80f1` (`07-B`, correction de
// `D-38`), une instance de monstre porte un id d'INSTANCE (`enemy_rodeur#12`),
// alors que `status.js` comparait `follet.cibleMonstreId` à l'id de la fiche
// CATALOGUE que l'appelant lui passait. La comparaison était donc **toujours**
// fausse : brûlure, affaiblissement et entrave étaient morts dans toutes les
// scènes, et Xav l'a vu en jeu le 20/09 (« le follet feu ne fait plus de
// dégâts »). L'ancien test restait vert parce que ses monstres gardaient l'id
// par défaut de `creerMonstre`, qui est justement l'id de catalogue.
//
// La décision de Xav : on ne répare pas la comparaison d'ids, on supprime
// l'approximation. **Ce qui est dessiné est ce qui agit** — comme la lumière
// du follet, à la fois halo affiché et trou dans le voile.
//
// Ce que ce fichier prouve :
//   a) un monstre à id d'INSTANCE, dans le cercle, reçoit bien le DoT
//      (avec le témoin de l'ancienne règle, qui répondait « non »)
//   b) plusieurs monstres dans le cercle le reçoivent TOUS
//   c) la frontière est le rayon, au pixel : dedans oui, au-delà non
//   d) les trois éléments du catalogue réel, dans l'aura et hors de l'aura
//   e) le cercle DESSINÉ et la règle lisent le même nombre, par la même
//      fonction — et le centre est le point logique, pas le corps décalé
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { statsEffectivesMonstre, estDansAura } from '../src/status.js';
import { resoudreRayonAuraPx } from '../src/companion.js';
import { creerMonstre } from '../src/entities.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), [], 'les catalogues du jeu doivent être valides au boot');
const registre = construireRegistre(catalogues);

const COMP_FEU = catalogues.companions.find((c) => c.synergie === 'syn_feu');
const COMP_EAU = catalogues.companions.find((c) => c.synergie === 'syn_eau');
const COMP_TERRE = catalogues.companions.find((c) => c.synergie === 'syn_terre');
const RAYON = resoudreRayonAuraPx(COMP_FEU);

// Le follet tel que le gameplay le tient : un compagnon et une position
// logique. Son état d'engagement n'entre plus dans la règle — il est laissé
// ici EXPRÈS à `suivre`, pour qu'un test qui ne passerait que grâce à lui
// saute aux yeux.
function follet(companion, x = 0, y = 0) {
  return { companionId: companion.id, etat: 'suivre', cibleMonstreId: null, x, y };
}
function contexte(monstre, folletCourant) {
  return {
    position: { x: monstre.x, y: monstre.y },
    aura: { centre: { x: folletCourant.x, y: folletCourant.y }, rayonPx: RAYON },
  };
}

// L'ancienne règle, gardée comme TÉMOIN : c'est elle qui rendait les effets
// muets. Si ce fichier passait un jour avec elle, c'est que la nouvelle aurait
// cessé d'être géométrique.
function ancienneRegleDansAura(folletCourant, monstreDonnees) {
  return !!folletCourant && folletCourant.etat === 'engager' && folletCourant.cibleMonstreId === monstreDonnees.id;
}

const ENNEMI = catalogues.enemies[0];

// --- a) Un monstre à id d'instance, dans le cercle, brûle ------------------
{
  const f = follet(COMP_FEU, 500, 500);
  const monstre = creerMonstre(ENNEMI, { x: 510, y: 500, id: `${ENNEMI.id}#12` });
  assert.notEqual(monstre.id, ENNEMI.id, 'le monstre doit bien porter un id d’INSTANCE (D-38)');

  const effectives = statsEffectivesMonstre(registre, ENNEMI, f, contexte(monstre, f));
  assert.equal(effectives.dansAura, true);
  assert.equal(effectives.dot.id, 'dot_brulure');

  // Le témoin : engagement affirmé sur l'id d'instance, fiche catalogue en
  // main — exactement ce que faisait `main.js`. L'ancienne règle disait non.
  const commeAvant = { ...f, etat: 'engager', cibleMonstreId: monstre.id };
  assert.equal(ancienneRegleDansAura(commeAvant, ENNEMI), false,
    'témoin : c’est bien cette comparaison-là qui rendait les trois effets muets');
  console.log(`  a) id d’instance « ${monstre.id} » : DoT actif (l’ancienne règle disait non)`);
}

// --- b) Plusieurs monstres dans l'aura : tous touchés ----------------------
// Levée explicite de la réserve « Phase 4 réévaluera » de l'ancien commentaire :
// la 1ʳᵉ zone de monstres aura des groupes, et c'est voulu.
{
  const f = follet(COMP_FEU, 0, 0);
  const groupe = [
    creerMonstre(ENNEMI, { x: 0, y: 0, id: `${ENNEMI.id}#1` }),
    creerMonstre(ENNEMI, { x: RAYON - 1, y: 0, id: `${ENNEMI.id}#2` }),
    creerMonstre(ENNEMI, { x: 0, y: -(RAYON - 1), id: `${ENNEMI.id}#3` }),
    creerMonstre(ENNEMI, { x: RAYON + 50, y: 0, id: `${ENNEMI.id}#4` }), // dehors
  ];
  const touches = groupe.filter((m) => statsEffectivesMonstre(registre, ENNEMI, f, contexte(m, f)).dot !== null);
  assert.deepEqual(touches.map((m) => m.id), [`${ENNEMI.id}#1`, `${ENNEMI.id}#2`, `${ENNEMI.id}#3`],
    'les trois monstres du cercle brûlent, le quatrième non');
  console.log(`  b) ${touches.length} monstres brûlent en même temps dans une aura de ${RAYON} px`);
}

// --- c) La frontière est le rayon, au pixel --------------------------------
{
  const f = follet(COMP_FEU, 100, 100);
  const centre = { x: 100, y: 100 };
  assert.equal(estDansAura({ x: 100 + RAYON, y: 100 }, { centre, rayonPx: RAYON }), true,
    'pile sur le trait : dedans (le cercle est la zone, bornes comprises)');
  assert.equal(estDansAura({ x: 100 + RAYON + 0.01, y: 100 }, { centre, rayonPx: RAYON }), false);

  // En diagonale aussi : c'est un disque, pas un carré.
  // (un cheveu en deçà du trait : à `RAYON / √2` pile, l'arrondi flottant de
  //  `hypot` rend 30,000000000000004 — la frontière exacte se teste sur l'axe)
  const d = (RAYON / Math.SQRT2) * 0.999;
  assert.equal(estDansAura({ x: 100 + d, y: 100 + d }, { centre, rayonPx: RAYON }), true);
  assert.equal(estDansAura({ x: 100 + RAYON, y: 100 + RAYON }, { centre, rayonPx: RAYON }), false,
    'le coin du carré circonscrit est HORS du disque');

  // Sans follet, pas d'effet — et une géométrie absente ne déclenche rien
  // (même discipline que `flags.js` : ce qu'on ne sait pas évaluer est faux).
  const dehors = creerMonstre(ENNEMI, { x: 400, y: 400, id: `${ENNEMI.id}#9` });
  assert.equal(statsEffectivesMonstre(registre, ENNEMI, null, contexte(dehors, f)).dansAura, false);
  assert.equal(statsEffectivesMonstre(registre, ENNEMI, f, {}).dansAura, false);
  assert.equal(statsEffectivesMonstre(registre, ENNEMI, f, { position: { x: 100, y: 100 }, aura: null }).dansAura, false);
}

// --- d) Les trois éléments, sur le catalogue réel --------------------------
{
  const dedans = creerMonstre(ENNEMI, { x: 5, y: 0, id: `${ENNEMI.id}#42` });
  const dehors = creerMonstre(ENNEMI, { x: 5 + RAYON * 3, y: 0, id: `${ENNEMI.id}#43` });

  for (const [nom, companion, attendu] of [
    ['feu', COMP_FEU, (s) => assert.equal(s.dot && s.dot.id, 'dot_brulure')],
    ['eau', COMP_EAU, (s) => assert.equal(s.force, ENNEMI.force - 1)],
    ['terre', COMP_TERRE, (s) => assert.equal(s.vitesse, ENNEMI.vitesse * 0.5)],
  ]) {
    const f = follet(companion, 0, 0);
    const dans = statsEffectivesMonstre(registre, ENNEMI, f, contexte(dedans, f));
    assert.equal(dans.dansAura, true, `${nom} : le monstre proche doit être dans l’aura`);
    attendu(dans);

    const hors = statsEffectivesMonstre(registre, ENNEMI, f, contexte(dehors, f));
    assert.equal(hors.dansAura, false);
    assert.equal(hors.dot, null);
    assert.equal(hors.force, ENNEMI.force, `${nom} : hors aura, la force du monstre est intacte`);
    assert.equal(hors.vitesse, ENNEMI.vitesse, `${nom} : hors aura, la vitesse du monstre est intacte`);
    console.log(`  d) ${nom} : effet dans l’aura, rien en dehors`);
  }
}

// --- e) Un seul nombre : celui du cercle dessiné ---------------------------
// Le dessin n'est jamais exercé en headless (contrainte de méthode), donc on
// lit le SOURCE. C'est la seule façon d'attraper le jour où quelqu'un
// rebrancherait la règle ou le cercle sur `companion.rayon_aura` en direct :
// le cercle recommencerait à mentir, et aucun test de logique ne le verrait.
{
  assert.equal(resoudreRayonAuraPx(COMP_FEU), COMP_FEU.rayon_aura,
    'aujourd’hui la résolution rend la donnée telle quelle : AUCUN modificateur n’est livré');

  for (const fichier of ['main.js', 'status.js']) {
    const source = fs.readFileSync(path.join(RACINE, 'src', fichier), 'utf8');
    const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/rayon_aura/.test(code),
      `${fichier} ne doit jamais lire rayon_aura en direct : il passe par resoudreRayonAuraPx`);
  }

  const source = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');
  const debutAura = source.indexOf('// Aura du follet');
  const blocAura = source.slice(debutAura, debutAura + 1400);
  assert.ok(/arc\([^)]*resoudreRayonAuraPx\(companionActif\)/.test(blocAura),
    'le cercle dessiné doit prendre son rayon dans resoudreRayonAuraPx');

  // Le centre de la règle est le point LOGIQUE (`D-39`), jamais le corps.
  assert.ok(/centre: \{ x: follet\.x, y: follet\.y \}/.test(source),
    'le centre de l’aura doit être la position logique du follet');
  const debutRegle = source.indexOf('const auraFollet');
  assert.ok(debutRegle > 0, 'la géométrie de l’aura doit rester repérable dans main.js');
  assert.ok(!/corpsFollet|decalageCorps/.test(source.slice(debutRegle, debutRegle + 400)),
    'la règle ne doit jamais lire le décalage du corps (sinon l’effet clignoterait)');

  // Et plus aucune comparaison d'ids dans la règle.
  const regle = fs.readFileSync(path.join(RACINE, 'src', 'status.js'), 'utf8');
  const codeRegle = regle.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/cibleMonstreId/.test(codeRegle),
    'status.js ne doit plus rien savoir de l’engagement du follet');
  console.log('  e) un seul rayon, une seule fonction, un seul centre');
}

console.log('OK test_d51_aura_reelle');

// `D-82` et suivantes — refonte GRAPHIQUE des items de la poche, sur la
// facture du puits et des trois stations (`D-16`, `D-78`/`D-79`/`D-80`).
//
// Ce que ce fichier éprouve, et pourquoi c'est exactement ça :
//
// 1. Un item n'a pas d'empreinte SOLIDE (rien ne le heurte), donc la raison
//    du §1 du test des stations ne s'applique pas telle quelle ici. Mais sa
//    boîte englobante décide quand même de deux choses visibles : la place
//    qu'il prend au sol dans le monde, et le CADRAGE de sa tuile dans la
//    Poche — `ui/icone_canvas.js#cadrer` bascule d'un cadrage commun à un
//    recadrage dès que la boîte sort de la boîte de référence de 14 unités.
//    Grossir une silhouette est donc une décision de JEU, pas de dessin
//    (précédent `Q-47` : « les stations gardent leur taille »). On vérifie
//    l'INCLUSION dans la boîte d'avant le ticket, aux trois échelles.
//
//    Mais on la mesure ici avec `boiteDessinee` et NON avec
//    `structures.js#boitePrimitive`, qui ignore l'épaisseur d'une `ligne` :
//    la branche d'origine est un trait de 3 unités d'épaisseur, donc elle
//    couvre 1,5 unité de plus que sa boîte de chaque côté. Comparer les
//    boîtes officielles ferait passer pour un agrandissement le simple fait
//    de redessiner un trait épais en polygone — à pixels identiques. Ce
//    qu'on veut garantir, c'est que l'item n'occupe pas plus de place à
//    l'écran ; c'est donc l'étendue RÉELLEMENT PEINTE qu'on compare.
// 2. La silhouette est POSÉE : sa pièce la plus basse tombe dans la bande de
//    son ombre portée. C'est le point 1 de la charte d'item, et la règle qui
//    sépare un objet au sol d'une vignette qui flotte.
// 3. Le cadrage de la tuile de Poche ne CHANGE pas de régime : un item qui
//    tenait dans la boîte de référence y tient toujours, et un item qui en
//    débordait en déborde toujours. Sans ce contrôle, une silhouette élargie
//    d'un dixième d'unité ferait basculer sa tuile dans le recadrage, et
//    l'item changerait de taille par rapport à tous les autres sans qu'une
//    ligne de menu ait bougé. Huit items sur dix tiennent dans la boîte de
//    référence ; la hache et la pioche, deux fois plus hautes que le reste,
//    sont recadrées (c'est le constat qui a ouvert `Q-48`).
//
// Ce que ce fichier n'éprouve PAS, volontairement : la qualité du dessin.
// Le rendu canvas n'est jamais exercé en headless (contrainte de méthode) et,
// règle `D-52`, un test n'épingle pas un réglage — ni une couleur, ni un
// nombre de primitives. Le « standing » se juge à l'œil dans Chrome, aux
// tailles réelles du jeu (`tools/banc_visuel.html`), et le verdict est à Xav.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { boitePrimitive } from '../src/structures.js';
import { cadrer } from '../src/ui/icone_canvas.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Le monde dessine un item à l'échelle 1 ; la tuile de Poche autour de 9 (un
// canvas d'environ 126 px pour une boîte de référence de 14 unités), et le
// monde à DPR 3 entre les deux — les trois tailles du banc visuel.
const ECHELLES = [1, 3, 9];

// Boîtes MESURÉES avant la session, sur les silhouettes d'origine. C'est la
// seule valeur écrite en dur de ce fichier, et elle est là pour ne jamais
// bouger : c'est le repère « le jeu d'hier ».
const EMPREINTES_AVANT = {
  visuel_plume: { x: -4.7, y: -5.575, w: 8.485, h: 11.275 },
  visuel_branche: { x: -7.5, y: -5, w: 15, h: 9.5 },
  visuel_caillou: { x: -4, y: -3, w: 8, h: 6 },
  visuel_fruit: { x: -4, y: -6.5, w: 8, h: 10.5 },
  visuel_fruit_cuit: { x: -4, y: -6.5, w: 8, h: 10.5 },
  visuel_hache: { x: -1, y: -11, w: 6, h: 18 },
  visuel_pioche: { x: -6, y: -12, w: 12, h: 19 },
  visuel_bois: { x: -6.5, y: -3, w: 13, h: 6 },
  visuel_pierre: { x: -6, y: -5, w: 12, h: 10 },
  visuel_icone_epee_bois: { x: -2.5, y: -5.5, w: 5, h: 11.3 },
};

// Régime de cadrage de la tuile de Poche, RELEVÉ avant la session : `true` =
// l'item tenait dans la boîte de référence de `cadrer` et partageait donc le
// cadrage commun de tous les autres ; `false` = il en débordait et était
// recadré (réduit) pour tenir dans sa tuile.
const CADRAGE_COMMUN_AVANT = {
  visuel_plume: true,
  visuel_branche: true,
  visuel_caillou: true,
  visuel_fruit: true,
  visuel_fruit_cuit: true,
  visuel_hache: false,
  visuel_pioche: false,
  visuel_bois: true,
  visuel_pierre: true,
  visuel_icone_epee_bois: true,
};

// L'étendue réellement peinte par une primitive : la boîte de
// `structures.js` (une seule règle de mesure pour tout le jeu), élargie de la
// demi-épaisseur d'un trait, que cette règle-là ne connaît pas.
function boiteDessinee(p) {
  const b = boitePrimitive(p);
  if (p.forme !== 'ligne') return b;
  const demi = (p.epaisseur || 1) / 2;
  return { minX: b.minX - demi, minY: b.minY - demi, maxX: b.maxX + demi, maxY: b.maxY + demi };
}

function etendueDessinee(visuel, echelle) {
  const bs = visuel.primitives.map(boiteDessinee);
  const minX = Math.min(...bs.map((b) => b.minX));
  const minY = Math.min(...bs.map((b) => b.minY));
  const maxX = Math.max(...bs.map((b) => b.maxX));
  const maxY = Math.max(...bs.map((b) => b.maxY));
  return { x: minX * echelle, y: minY * echelle, w: (maxX - minX) * echelle, h: (maxY - minY) * echelle };
}

// Seuls les items DÉJÀ refondus entrent dans la boucle : la file avance item
// par item (un commit chacun), et un ticket ne juge pas le travail d'un autre.
const REFONDUS = ['visuel_plume', 'visuel_branche', 'visuel_caillou', 'visuel_pierre', 'visuel_bois', 'visuel_fruit', 'visuel_fruit_cuit'];

const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
const visuels = new Map(donnees.visuels.map((v) => [v.id, v]));

for (const id of REFONDUS) {
  const visuel = visuels.get(id);
  assert.ok(visuel, `${id} doit exister dans data/visuels.json`);
  const avant = EMPREINTES_AVANT[id];

  // --- 1. La silhouette n'a rien GAGNÉ ----------------------------------
  for (const echelle of ECHELLES) {
    const e = etendueDessinee(visuel, echelle);
    const a = {
      x: avant.x * echelle, y: avant.y * echelle,
      w: avant.w * echelle, h: avant.h * echelle,
    };
    assert.ok(e.x >= a.x - 1e-9, `${id} : bord gauche déborde à l'échelle ${echelle}`);
    assert.ok(e.y >= a.y - 1e-9, `${id} : bord haut déborde à l'échelle ${echelle}`);
    assert.ok(e.x + e.w <= a.x + a.w + 1e-9, `${id} : bord droit déborde à l'échelle ${echelle}`);
    assert.ok(e.y + e.h <= a.y + a.h + 1e-9, `${id} : bord bas déborde à l'échelle ${echelle}`);
  }

  // --- 2. La silhouette est posée, pas flottante ------------------------
  assert.ok(visuel.ombre, `${id} doit déclarer une ombre portée (c'est elle qui le pose)`);
  const basSilhouette = Math.max(...visuel.primitives.map((p) => boiteDessinee(p).maxY));
  const hautOmbre = visuel.ombre.dy - visuel.ombre.h / 2;
  const basOmbre = visuel.ombre.dy + visuel.ombre.h / 2;
  assert.ok(
    basSilhouette >= hautOmbre && basSilhouette <= basOmbre,
    `${id} : le point de contact (${basSilhouette}) doit tomber dans la bande de l'ombre `
    + `[${hautOmbre}, ${basOmbre}] — sinon la silhouette flotte ou l'ombre traîne derrière elle`,
  );

  // --- 3. La tuile de Poche ne change pas de régime de cadrage ----------
  // On interroge `cadrer` elle-même plutôt que de recopier son seuil : c'est
  // elle qui décide, et le jour où elle changerait d'avis, c'est ce test-ci
  // qui doit le dire (règle née de `D-72` : ne jamais réimplémenter dans un
  // harnais ce qu'on prétend éprouver). `COTE` est arbitraire : le cadrage
  // commun vaut exactement `COTE / 14`, quel que soit le côté du canvas.
  const COTE = 126;
  const cadrageCommun = Math.abs(cadrer(visuel, COTE).echelle - COTE / 14) < 1e-9;
  assert.equal(
    cadrageCommun, CADRAGE_COMMUN_AVANT[id],
    `${id} : la tuile de Poche a changé de régime de cadrage — la silhouette a `
    + `franchi le seuil de ui/icone_canvas.js#cadrer, donc elle ne fait plus la même `
    + `taille que les autres items dans la Poche`,
  );

  console.log(`OK ${id} : silhouette incluse dans celle d'avant, posée sur son ombre, tuile inchangée`);
}

console.log('OK test_d82_items_silhouettes');

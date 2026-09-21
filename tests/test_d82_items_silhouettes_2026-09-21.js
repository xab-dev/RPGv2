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
// 2. La silhouette est POSÉE : sa pièce la plus basse tombe dans la bande de
//    son ombre portée. C'est le point 1 de la charte d'item, et la règle qui
//    sépare un objet au sol d'une vignette qui flotte.
// 3. Le cadrage de la tuile de Poche ne CHANGE pas de régime : un item qui
//    tenait dans la boîte de référence y tient toujours. Sans ce contrôle,
//    une silhouette élargie d'un dixième d'unité ferait basculer sa tuile
//    dans le recadrage, et tous les items changeraient de taille les uns par
//    rapport aux autres sans qu'une ligne de menu ait bougé.
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
import { boitePrimitive, empreinteParDefaut } from '../src/structures.js';
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
  visuel_plume: { x: -4.19, y: -5.1, w: 7.5, h: 10.1 },
  visuel_branche: { x: -6, y: -4, w: 12, h: 7 },
  visuel_caillou: { x: -4, y: -3, w: 8, h: 6 },
  visuel_fruit: { x: -4, y: -6, w: 8, h: 10 },
  visuel_fruit_cuit: { x: -4, y: -6, w: 8, h: 10 },
  visuel_hache: { x: 0, y: -11, w: 5, h: 17 },
  visuel_pioche: { x: -6, y: -12, w: 12, h: 18 },
  visuel_bois: { x: -6.5, y: -3, w: 13, h: 6 },
  visuel_pierre: { x: -6, y: -5, w: 12, h: 10 },
  visuel_icone_epee_bois: { x: -2.5, y: -5.5, w: 5, h: 11.3 },
};

// Seuls les items DÉJÀ refondus entrent dans la boucle : la file avance item
// par item (un commit chacun), et un ticket ne juge pas le travail d'un autre.
const REFONDUS = ['visuel_plume'];

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
    const e = empreinteParDefaut(visuel, echelle);
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
  const basSilhouette = Math.max(...visuel.primitives.map((p) => boitePrimitive(p).maxY));
  const hautOmbre = visuel.ombre.dy - visuel.ombre.h / 2;
  const basOmbre = visuel.ombre.dy + visuel.ombre.h / 2;
  assert.ok(
    basSilhouette >= hautOmbre && basSilhouette <= basOmbre,
    `${id} : le point de contact (${basSilhouette}) doit tomber dans la bande de l'ombre `
    + `[${hautOmbre}, ${basOmbre}] — sinon la silhouette flotte ou l'ombre traîne derrière elle`,
  );

  // --- 3. La tuile de Poche ne change pas de régime de cadrage ----------
  // On interroge `cadrer` elle-même plutôt que de recopier son seuil : c'est
  // elle qui décide, et un jour où elle changerait d'avis, c'est ce test-ci
  // qui doit le dire (règle née de `D-72` : ne jamais réimplémenter dans un
  // harnais ce qu'on prétend éprouver).
  const COTE = 126;
  const regimeAvant = cadrer({ primitives: primitivesBoite(avant) }, COTE).echelle;
  const regimeApres = cadrer(visuel, COTE).echelle;
  assert.equal(
    regimeApres, regimeAvant,
    `${id} : la tuile de Poche a changé d'échelle (${regimeAvant} → ${regimeApres}) — `
    + `la silhouette a franchi le seuil de recadrage de ui/icone_canvas.js#cadrer`,
  );

  console.log(`OK ${id} : silhouette incluse dans celle d'avant, posée sur son ombre, tuile inchangée`);
}

// Un visuel factice dont la boîte est exactement celle mesurée avant le
// ticket — pour demander à `cadrer` quel régime elle appliquait alors.
function primitivesBoite(b) {
  return [{ forme: 'rect', dx: b.x + b.w / 2, dy: b.y + b.h / 2, w: b.w, h: b.h, couleur: '#000000' }];
}

console.log('OK test_d82_items_silhouettes');

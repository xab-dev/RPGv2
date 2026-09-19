// SD_puits-silhouette_2026-09-19 : à l'échelle ×2,1, la silhouette du puits
// se désolidarise — « les pièces ne tiennent plus ensemble, les mâts en bois
// sont trop courts » (Xav, 2026-09-19).
//
// CAUSE RACINE (établie avant tout correctif, voir journal) : ce sont les
// DONNÉES, pas l'interprète. `visuels.js#dessinerVisuel` applique un unique
// `ctx.scale(e, e)` : longueurs, positions ET épaisseurs de trait suivent donc
// toutes l'échelle, et `ancre` n'est même jamais lu par l'interprète. Une
// silhouette correctement assemblée à l'échelle 1 le reste à toute échelle —
// et réciproquement, un défaut d'assemblage existe déjà à l'échelle 1, il
// devient seulement visible une fois agrandi. C'était le cas ici : le pied de
// chaque mât (3 px de large, en x = ±9) ne reposait que sur 1,16 px de
// margelle, parce que le DISQUE de la margelle ne mesure que 8,66 px de
// demi-largeur à la hauteur où le mât s'arrêtait — les 61 % restants du pied
// flottaient dans le vide. Agrandi 2,1 fois, ce porte-à-faux devient un trou
// franc de ~3,9 px.
//
// Ce fichier verrouille l'assemblage AUX TROIS ÉCHELLES demandées par la
// fiche, en mesurant sur les boîtes par primitive (structures.js#boitePrimitive,
// la MÊME règle que l'empreinte solide) — et reste data-driven : les contacts
// à vérifier sont déclarés en tête, ajouter une entrée de visuel ne demande
// aucune ligne de code.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { boitePrimitive, empreinteParDefaut } from '../src/structures.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ECHELLES = [1, 2.1, 3]; // les 3 échelles exigées par la fiche

const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
const visuels = new Map(donnees.visuels.map((v) => [v.id, v]));

// --- Contacts à vérifier, déclarés en DONNÉES de test ---------------------
// `index` = rang de la primitive dans visuels.json (= ordre de dessin).
// Ajouter un visuel à vérifier = ajouter une entrée ici, jamais du code.
const ASSEMBLAGES = [
  {
    visuel: 'visuel_puits',
    pieces: {
      margelle: 0,
      eau: 1,
      corde: 2,
      seau: 3,
      mat_gauche: 4,
      mat_droit: 5,
      treuil: 6,
      toit: 7,
    },
    // « margelle, deux mâts qui montent jusqu'au toit, toit posé sur les
    // mâts, seau » (§Attendu de la fiche).
    contacts: [
      ['mat_gauche', 'margelle'],
      ['mat_droit', 'margelle'],
      ['mat_gauche', 'toit'],
      ['mat_droit', 'toit'],
      ['mat_gauche', 'treuil'],
      ['mat_droit', 'treuil'],
      ['treuil', 'corde'],
      ['corde', 'seau'],
    ],
  },
];

function chevauchement(a, b) {
  return {
    x: Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX),
    y: Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY),
  };
}

// --- 1. Les pièces se touchent ou se chevauchent, aux 3 échelles ----------
for (const { visuel: id, pieces, contacts } of ASSEMBLAGES) {
  const visuel = visuels.get(id);
  assert.ok(visuel, `${id} doit exister dans data/visuels.json`);
  assert.equal(
    visuel.primitives.length,
    Object.keys(pieces).length,
    `${id} : le nombre de primitives doit correspondre aux pièces nommées ici (sinon les index mentent)`,
  );

  for (const echelle of ECHELLES) {
    const boite = (nom) => boitePrimitive(visuel.primitives[pieces[nom]], echelle);
    for (const [a, b] of contacts) {
      const { x, y } = chevauchement(boite(a), boite(b));
      assert.ok(
        x > 0 && y > 0,
        `${id} à l'échelle ${echelle} : "${a}" et "${b}" doivent se toucher (recouvrement X=${x.toFixed(2)} Y=${y.toFixed(2)})`,
      );
    }
  }
  console.log(`OK ${id} : ${contacts.length} contacts tenus aux échelles ${ECHELLES.join(', ')}`);
}

// --- 2. Le pied des mâts repose VRAIMENT sur la margelle ------------------
// La boîte d'un cercle ment : le disque est bien plus étroit que son carré
// englobant dès qu'on s'éloigne de son centre. C'est exactement ce qui avait
// échappé à l'œil — un test qui ne regarderait que les boîtes resterait vert
// sur l'ancienne version.
{
  const puits = visuels.get('visuel_puits');
  const margelle = puits.primitives[0];
  assert.equal(margelle.forme, 'cercle', 'la margelle est bien le disque de référence');
  const rayon = margelle.w / 2;
  const cx = margelle.dx || 0;
  const cy = margelle.dy || 0;

  for (const indexMat of [4, 5]) {
    const mat = puits.primitives[indexMat];
    const b = boitePrimitive(mat);
    const yPied = b.maxY;
    const dy = yPied - cy;
    const demiLargeurDisque = Math.sqrt(Math.max(0, rayon * rayon - dy * dy));
    const appui =
      Math.min(b.maxX, cx + demiLargeurDisque) - Math.max(b.minX, cx - demiLargeurDisque);
    const largeurMat = b.maxX - b.minX;
    assert.ok(
      appui >= largeurMat - 1e-9,
      `le pied du mât (primitive ${indexMat}) doit reposer sur TOUTE sa largeur : ${appui.toFixed(2)} px d'appui pour ${largeurMat.toFixed(2)} px de mât`,
    );
  }
  console.log('OK le pied de chaque mât repose sur toute sa largeur (disque réel, pas la boîte)');
}

// --- 3. L'empreinte solide n'a PAS changé ---------------------------------
// La fiche l'exige : si elle changeait, il faudrait vérifier que le puits ne
// mord ni sur un chemin ni sur la zone de réapparition du fruit. Elle ne
// change pas — ce test le verrouille, donc la question ne se pose pas.
{
  const puits = visuels.get('visuel_puits');
  const attendue = { x: -11, y: -25.5, w: 22, h: 29.5 }; // mesurée sur la version d'avant le correctif
  for (const echelle of ECHELLES) {
    const e = empreinteParDefaut(puits, echelle);
    assert.ok(Math.abs(e.x - attendue.x * echelle) < 1e-9, `empreinte x inchangée à l'échelle ${echelle}`);
    assert.ok(Math.abs(e.y - attendue.y * echelle) < 1e-9, `empreinte y inchangée à l'échelle ${echelle}`);
    assert.ok(Math.abs(e.w - attendue.w * echelle) < 1e-9, `empreinte largeur inchangée à l'échelle ${echelle}`);
    assert.ok(Math.abs(e.h - attendue.h * echelle) < 1e-9, `empreinte hauteur inchangée à l'échelle ${echelle}`);
  }
  console.log("OK l'empreinte solide du puits est strictement inchangée (aucun risque chemin/fruit)");
}

// --- 4. Aucune pièce orpheline dans les 4 stations ------------------------
// Garde-fou générique (data-driven) : dans une silhouette de station, chaque
// primitive doit toucher au moins une autre — une pièce isolée est le symptôme
// exact signalé par Xav. Vérifié sur les 4 stations, comme le demande la fiche.
{
  const stationsVisuels = donnees.puzzles
    .filter((p) => p.render && p.render.visuel && p.echelle)
    .map((p) => p.render.visuel);
  assert.ok(stationsVisuels.length >= 4, `au moins les 4 stations mises à l'échelle (${stationsVisuels.length})`);

  for (const id of new Set(stationsVisuels)) {
    const visuel = visuels.get(id);
    const boites = visuel.primitives.map((p) => boitePrimitive(p));
    boites.forEach((b, i) => {
      if (boites.length === 1) return;
      const touche = boites.some((autre, j) => {
        if (i === j) return false;
        const c = chevauchement(b, autre);
        return c.x > 0 && c.y > 0;
      });
      assert.ok(touche, `${id} : la primitive ${i} (${visuel.primitives[i].forme}) est orpheline, elle ne touche aucune autre pièce`);
    });
    console.log(`OK ${id} : aucune pièce orpheline (${visuel.primitives.length} primitives)`);
  }
}

console.log('OK test_sd_puits_silhouette');

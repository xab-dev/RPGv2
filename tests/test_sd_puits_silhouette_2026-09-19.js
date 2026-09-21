// SD_puits-silhouette_2026-09-19 : à l'échelle ×2,1, la silhouette du puits
// se désolidarise — « les pièces ne tiennent plus ensemble, les mâts en bois
// sont trop courts » (Xav, 2026-09-19).
//
// RÉVISÉ le 2026-09-21 par `D-16` (consigne de Xav, session de polish en
// direct) : le correctif du 19/09 avait rapproché les mâts pour les faire
// reposer SUR la margelle — c'était le mauvais sens. Un mât de puits est
// planté dans le SOL, de part et d'autre, et la margelle est un cylindre vu
// de trois quarts (règle du décor : cylindre + ellipses + ombre), pas un
// disque vu du dessus. Deux sections de ce fichier changent donc de contrat,
// volontairement — §2 (le pied ne repose plus sur la margelle mais touche le
// sol) et §3 (l'empreinte n'est plus « inchangée » mais « incluse »).
// Conformément à `D-52`, aucune des deux n'épingle un nombre : la première
// compare le pied au sol, la seconde la boîte d'aujourd'hui à celle d'avant.
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
      mat_gauche: 0,
      mat_droit: 1,
      base: 2,
      paroi: 3,
      rebord: 4,
      ouverture: 5,
      eau: 6,
      reflet: 7,
      treuil: 8,
      corde: 9,
      seau: 10,
      bandeau_toit: 11,
      toit: 12,
    },
    // « margelle, deux mâts qui montent jusqu'au toit, toit posé sur les
    // mâts, seau » (§Attendu de la fiche) — plus, depuis `D-16`, le cylindre
    // lui-même : base, paroi et rebord doivent rester UNE pièce à l'œil.
    contacts: [
      ['mat_gauche', 'paroi'],
      ['mat_droit', 'paroi'],
      ['mat_gauche', 'bandeau_toit'],
      ['mat_droit', 'bandeau_toit'],
      ['bandeau_toit', 'toit'],
      ['mat_gauche', 'treuil'],
      ['mat_droit', 'treuil'],
      ['treuil', 'corde'],
      ['corde', 'seau'],
      ['base', 'paroi'],
      ['paroi', 'rebord'],
      ['rebord', 'ouverture'],
      ['ouverture', 'eau'],
      ['eau', 'reflet'],
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

// --- 2. Le pied des mâts touche le SOL -----------------------------------
// `D-16` : c'est LA consigne de Xav — « les mâts doivent partir du sol
// (niveau de l'ombre), et non reposer sur le rebord où ils flottent d'une
// demi-tuile ». Le sol d'une silhouette `ancre: bas` est y = 0, et l'ombre
// portée est la seule pièce qui le matérialise : on compare donc le pied au
// SOL, jamais à une hauteur écrite ici (règle `D-52`). Avant ce ticket, le
// pied s'arrêtait à y = -7 — 7 unités de vide, 14,7 px à l'échelle ×2,1.
{
  const puits = visuels.get('visuel_puits');
  const solMax = (puits.ombre.dy || 0) + puits.ombre.h / 2;
  for (const indexMat of [0, 1]) {
    const b = boitePrimitive(puits.primitives[indexMat]);
    assert.ok(
      b.maxY >= 0,
      `le pied du mât (primitive ${indexMat}) doit atteindre le sol (y=0), il s'arrête à ${b.maxY}`,
    );
    assert.ok(
      b.maxY <= solMax,
      `le pied du mât (primitive ${indexMat}) ne doit pas s'enfoncer sous l'ombre (${b.maxY} > ${solMax})`,
    );
  }
  console.log("OK le pied de chaque mât est planté au sol, dans l'ombre portée");
}

// --- 2 bis. Le pied des mâts reste VISIBLE de part et d'autre du cylindre --
// Planter les mâts ne suffit pas : s'ils passaient entièrement derrière la
// margelle, le joueur reverrait exactement le défaut d'origine (des mâts qui
// sortent de nulle part). C'est une RELATION — le mât déborde du cylindre —
// pas une position.
{
  const puits = visuels.get('visuel_puits');
  const paroi = boitePrimitive(puits.primitives[3]);
  for (const [indexMat, cote] of [[0, 'gauche'], [1, 'droit']]) {
    const b = boitePrimitive(puits.primitives[indexMat]);
    const deborde = cote === 'gauche' ? paroi.minX - b.minX : b.maxX - paroi.maxX;
    assert.ok(
      deborde > 0,
      `le mât ${cote} doit déborder du cylindre pour que son pied se voie (débord ${deborde})`,
    );
  }
  console.log('OK les deux mâts débordent du cylindre, leur pied se voit');
}

// --- 2 ter. Le bord LATÉRAL du fût est au niveau du pied des mâts ---------
// Consigne de Xav, 21/09 (deux fois plutôt qu'une, parce que j'avais lu
// « base du fût » comme son point le plus BAS) : ce qui doit coïncider avec
// le pied des mâts, c'est le bord du fût là où il les longe — son point le
// plus large, qui en trois quarts est la HAUTEUR DU CENTRE de l'ellipse de
// base. Le point le plus bas du fût, lui, passe alors sous cette ligne :
// c'est l'avant du cylindre, plus près de l'œil. Sans cette règle, un fût
// « posé à y = 0 » paraît flotter au-dessus des mâts.
{
  const puits = visuels.get('visuel_puits');
  const base = puits.primitives[2];
  const piedMat = boitePrimitive(puits.primitives[0]).maxY;
  assert.equal(
    base.dy || 0,
    piedMat,
    'le bord latéral du fût (centre de son ellipse de base) doit être au niveau du pied des mâts',
  );
  assert.ok(
    boitePrimitive(base).maxY > piedMat,
    "l'avant du fût doit descendre SOUS cette ligne : c'est ce qui donne la perspective de trois quarts",
  );
  console.log('OK le bord latéral du fût coïncide avec le pied des mâts, son avant passe dessous');
}

// --- 3. L'empreinte solide n'a rien GAGNÉ --------------------------------
// La fiche du 19/09 exigeait une empreinte *inchangée*, et `D-16` prévient
// qu'en trois quarts elle change. Ce qui compte n'est pas qu'elle soit égale,
// c'est qu'aucune tuile ne devienne solide : on vérifie donc l'INCLUSION dans
// la boîte d'avant le ticket. Tant qu'elle tient, la question « le puits
// mord-il sur un chemin ou sur la zone du fruit ? » ne se pose pas — la
// réponse d'hier vaut encore. Elle rétrécit en fait d'une rangée de tuiles,
// le toit ne bloquant plus le passage derrière le puits.
//
// Poser une empreinte explicite sur la seule BASE (l'`empreinte` en données
// que suggère `D-16`) reste OUVERT : cela changerait où le héros peut se
// tenir, donc c'est une décision de jeu, pas un détail de dessin.
{
  const puits = visuels.get('visuel_puits');
  const avant = { x: -11, y: -25.5, w: 22, h: 29.5 }; // mesurée avant `D-16`
  for (const echelle of ECHELLES) {
    const e = empreinteParDefaut(puits, echelle);
    const a = { x: avant.x * echelle, y: avant.y * echelle, w: avant.w * echelle, h: avant.h * echelle };
    assert.ok(e.x >= a.x - 1e-9, `empreinte : bord gauche à l'échelle ${echelle}`);
    assert.ok(e.y >= a.y - 1e-9, `empreinte : bord haut à l'échelle ${echelle}`);
    assert.ok(e.x + e.w <= a.x + a.w + 1e-9, `empreinte : bord droit à l'échelle ${echelle}`);
    assert.ok(e.y + e.h <= a.y + a.h + 1e-9, `empreinte : bord bas à l'échelle ${echelle}`);
  }
  console.log("OK l'empreinte solide du puits ne déborde plus de celle d'avant (aucune tuile gagnée)");
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

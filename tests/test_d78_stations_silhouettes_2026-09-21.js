// `D-78`/`D-79`/`D-80` — refonte GRAPHIQUE des trois stations (cuisine,
// coffre, atelier) sur le modèle du puits, refait la veille (`D-16`).
//
// Ce que ce fichier éprouve, et pourquoi c'est exactement ça :
//
// 1. Une refonte graphique ne doit RIEN changer au jeu. Or l'empreinte solide
//    d'une station EST la boîte englobante de ses primitives de dessin
//    (structures.js#empreinteParDefaut) : redessiner une station, c'est
//    déplacer un mur. On vérifie donc l'INCLUSION dans la boîte d'avant le
//    ticket — aucune tuile gagnée, donc « où le héros peut se tenir » et le
//    seuil d'interaction ne bougent pas. Même contrat que le §3 du test du
//    puits, et pour la même raison.
// 2. La silhouette est POSÉE : sa pièce la plus basse tombe dans la bande de
//    l'ombre portée. C'est la règle §2 du puits, généralisée — un objet dont
//    l'ombre est ailleurs que sous son point de contact paraît flotter, et
//    c'est le défaut que Xav a relevé deux fois sur le puits.
//
// Ce que ce fichier n'éprouve PAS, volontairement : la qualité du dessin.
// Le rendu canvas n'est jamais exercé en headless (contrainte de méthode) et,
// règle `D-52`, un test n'épingle pas un réglage — ni une couleur, ni un
// nombre de primitives, ni une hauteur de plateau. Le « standing » se valide
// à l'œil, dans Chrome, et c'est le verdict de Xav.
//
// L'absence de pièce orpheline (chaque primitive en touche une autre) est
// déjà couverte, pour les 4 stations, par le §4 de
// tests/test_sd_puits_silhouette_2026-09-19.js — pas dupliqué ici.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { boitePrimitive, empreinteParDefaut } from '../src/structures.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ECHELLES = [1, 2.1, 3];

// Boîtes MESURÉES avant le ticket, sur les silhouettes placeholder de la
// Phase 2 — c'est la seule valeur écrite en dur de ce fichier, et elle est
// là pour ne jamais bouger : c'est le repère « le jeu d'hier ».
const EMPREINTES_AVANT = {
  visuel_table: { x: -11, y: -11, w: 22, h: 12 },
  visuel_coffre: { x: -8, y: -12, w: 16, h: 12 },
  visuel_atelier: { x: -11, y: -13, w: 22, h: 12 },
};

const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
const visuels = new Map(donnees.visuels.map((v) => [v.id, v]));

// Seules les stations DÉJÀ refondues entrent dans la boucle : la file avance
// station par station (un commit chacune), et un ticket ne juge pas le
// travail d'un autre.
const REFONDUES = ['visuel_table'];

for (const id of REFONDUES) {
  const visuel = visuels.get(id);
  assert.ok(visuel, `${id} doit exister dans data/visuels.json`);

  // --- 1. L'empreinte solide n'a rien GAGNÉ ------------------------------
  const avant = EMPREINTES_AVANT[id];
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

  // --- 2. La silhouette est posée, pas flottante -------------------------
  // On compare la pièce la plus basse à la BANDE de l'ombre (et non à y = 0) :
  // l'atelier, par exemple, s'arrête au-dessus du sol depuis la Phase 2, et
  // son ombre doit descendre le chercher plutôt que l'inverse — bouger son
  // pied ferait gagner une tuile à l'empreinte, ce que le §1 refuse.
  assert.ok(visuel.ombre, `${id} doit déclarer une ombre portée (c'est elle qui le pose)`);
  const basSilhouette = Math.max(...visuel.primitives.map((p) => boitePrimitive(p).maxY));
  const hautOmbre = visuel.ombre.dy - visuel.ombre.h / 2;
  const basOmbre = visuel.ombre.dy + visuel.ombre.h / 2;
  assert.ok(
    basSilhouette >= hautOmbre && basSilhouette <= basOmbre,
    `${id} : le point de contact (${basSilhouette}) doit tomber dans la bande de l'ombre `
    + `[${hautOmbre}, ${basOmbre}] — sinon la silhouette flotte ou l'ombre traîne derrière elle`,
  );

  console.log(`OK ${id} : empreinte incluse dans celle d'avant, silhouette posée sur son ombre`);
}

console.log('OK test_d78_stations_silhouettes');

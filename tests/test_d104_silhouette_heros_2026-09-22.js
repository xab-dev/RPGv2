// `D-104` — la silhouette du héros : un personnage encapuchonné, vu de trois
// quarts, dont le VISAGE est la seule chose qui porte la couleur du follet.
//
// Ce qui est vérifié ici, et rien d'autre : des RELATIONS (règle `D-52` — un
// test n'épingle jamais une valeur de réglage, sinon il devient rouge le jour
// où Xav ajuste le dessin, et le rouge ne veut plus rien dire). Le rendu, lui,
// n'est jamais exercé headless : le verdict reste une validation en jeu.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { echelleVisuel } from '../src/visuels.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
const registre = construireRegistre(donnees);
const heros = registre.obtenir('visuels', VISUEL_HEROS_ID);

// Boîte d'une primitive, en unités locales. On ne réutilise pas
// `structures.js#boitePrimitive` : elle rend une hauteur NULLE pour un
// `cercle` (`D-81`, sans conséquence ailleurs, mais la lueur du visage EST
// faite de cercles — la mesure serait fausse exactement là où on en a besoin).
function boite(p) {
  const dx = p.dx || 0;
  const dy = p.dy || 0;
  if (p.forme === 'polygone' || p.forme === 'ligne') {
    const xs = p.points.map(([x]) => dx + x);
    const ys = p.points.map(([, y]) => dy + y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }
  const dW = (p.w || 0) / 2;
  const dH = (p.forme === 'cercle' ? p.w : p.h || 0) / 2;
  return { minX: dx - dW, maxX: dx + dW, minY: dy - dH, maxY: dy + dH };
}
const contient = (grande, petite) => petite.minX >= grande.minX && petite.maxX <= grande.maxX
  && petite.minY >= grande.minY && petite.maxY <= grande.maxY;

// --- 1. La couleur du compagnon est le VISAGE, et lui seul ----------------
// C'est l'intention du ticket, telle que Xav l'a dite : « la couleur de feu
// follet, c'est le visage qui est un peu lumineux ». Avant `D-104`, c'était
// le CORPS entier du héros qui prenait cette teinte.
{
  assert.equal(heros.teintable, true, 'le héros reste teintable : la teinte porte son identité élémentaire');
  const teintees = heros.primitives.filter((p) => p.teinte);
  assert.ok(teintees.length > 0, 'au moins une primitive porte la teinte — sans quoi le choix du follet ne se verrait plus');

  // L'ouverture de la capuche. Jusqu'au 26/09, la primitive la plus SOMBRE
  // du visuel (l'orbite, qui creusait le vide où le visage se loge) ; depuis
  // `D-257`, l'ouverture est DÉCLARÉE : le trou de la façade de la capuche,
  // devant le globe. On la désigne par sa fonction, jamais par son index.
  const facade = heros.primitives.find((p) => p.trou);
  assert.ok(facade, 'la capuche a une ouverture (le trou de sa façade)');
  const creux = boite({ forme: 'ellipse', dx: facade.dx, dy: facade.dy, w: facade.trou.w, h: facade.trou.h });

  for (const p of teintees) {
    const b = boite(p);
    // La lueur DÉBORDE volontairement un peu du creux (c'est ce qui en fait
    // une lumière plutôt qu'une pastille) — on vérifie donc qu'elle reste
    // CENTRÉE dessus, pas qu'elle y tienne strictement.
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    assert.ok(cx > creux.minX && cx < creux.maxX && cy > creux.minY && cy < creux.maxY,
      'toute primitive teintée est centrée dans l\'ouverture de la capuche (le visage), jamais sur le corps');
    const debord = Math.max(creux.minX - b.minX, b.maxX - creux.maxX, creux.minY - b.minY, b.maxY - creux.maxY);
    assert.ok(debord <= (creux.maxX - creux.minX) / 2,
      'la lueur reste une lueur : elle ne déborde pas du visage de plus d\'un demi-visage');
  }
}

// --- 2. Le visage est DANS la capuche ------------------------------------
// Sinon la boule flotterait hors de la silhouette : c'est ce qui distingue
// « il est dans sa capuche » d'un masque posé devant.
{
  // La capuche = la plus grande primitive au-dessus de la ligne d'épaules.
  const aire = (b) => (b.maxX - b.minX) * (b.maxY - b.minY);
  const capuche = heros.primitives
    .filter((p) => p.forme === 'polygone' && boite(p).minY < -6)
    .reduce((a, b) => (aire(boite(a)) >= aire(boite(b)) ? a : b));
  const teintees = heros.primitives.filter((p) => p.teinte).map(boite);
  const union = {
    minX: Math.min(...teintees.map((b) => b.minX)), maxX: Math.max(...teintees.map((b) => b.maxX)),
    minY: Math.min(...teintees.map((b) => b.minY)), maxY: Math.max(...teintees.map((b) => b.maxY)),
  };
  assert.ok(contient(boite(capuche), union), 'la lueur du visage tient dans la capuche');
}

// --- 3. Le héros n'est jamais plus LARGE que ce qui entre en collision ----
// Sa hitbox est un carré de côté 2 × (RAYON_HERO_BASE_PX × echelle), centré
// sur le point logique (main.js#hitboxHeros) — et c'est la seule chose que la
// silhouette ne peut pas contredire sans qu'on le voie en jouant : un héros
// dessiné plus large que sa boîte s'enfoncerait visuellement dans les murs.
// En HAUTEUR, au contraire, il la dépasse librement : la boîte est son
// emprise au sol, pas sa taille.
{
  const RAYON_HERO_BASE_PX = 10; // même constante que main.js (non exportée)
  const demiBoite = RAYON_HERO_BASE_PX; // en unités locales : le facteur d'échelle s'annule des deux côtés
  const demiLargeur = Math.max(...heros.primitives.flatMap((p) => {
    const b = boite(p);
    return [Math.abs(b.minX), Math.abs(b.maxX)];
  }));
  assert.ok(demiLargeur <= demiBoite,
    `la silhouette (demi-largeur ${demiLargeur}) ne dépasse pas la demi-boîte de collision (${demiBoite})`);
  assert.ok(heros.ombre && heros.ombre.w / 2 <= demiBoite, 'l\'ombre portée non plus');
}

// --- 4. Une seule échelle, en données -------------------------------------
// Rappel du contrat de `MT_heros-echelle_2026-09-19`, que ce ticket ne doit
// pas avoir cassé : rendu ET hitbox dérivent du même champ.
assert.ok(echelleVisuel(heros) > 0, 'l\'échelle du héros reste déclarée en données, sur le visuel');

// --- 5. La charte d'item (21/09) tient aussi pour le héros ----------------
// « L'objet est posé » (une ombre portée) et « trois valeurs au moins » — deux
// valeurs font une tache, trois font un volume.
assert.ok(heros.ombre, 'le héros est POSÉ : il a une ombre portée');
{
  const couleurs = new Set(heros.primitives.filter((p) => !p.teinte).map((p) => p.couleur));
  assert.ok(couleurs.size >= 3, `trois valeurs au moins hors teinte (vu : ${couleurs.size})`);
}

// --- 6. TÉMOIN : la silhouette d'AVANT `D-104` échouerait ----------------
// Sans ce bloc, le test ci-dessus passerait tout aussi bien sur le jeton gris
// de la veille — il faut qu'il prouve qu'il sait dire non. Le héros d'avant
// était trois cercles concentriques dont le CORPS portait la teinte.
{
  const avant = {
    id: 'visuel_heros', ancre: 'centre', echelle: 0.643, teintable: true,
    ombre: { dy: 8, w: 16, h: 6, alpha: 0.35 },
    primitives: [
      { forme: 'cercle', dx: 0, dy: 0, w: 22, couleur: '#d8d8d8' },
      { forme: 'cercle', dx: 0, dy: 0, w: 20, couleur: '#8f8f8f', teinte: true },
      { forme: 'cercle', dx: -3, dy: -3, w: 8, couleur: '#ffffff', alpha: 0.4 },
    ],
  };
  const teintee = boite(avant.primitives.find((p) => p.teinte));
  const demiLargeur = Math.max(...avant.primitives.map((p) => boite(p).maxX));
  // Le corps teinté faisait toute la silhouette : il débordait très largement
  // de ce qui aurait pu passer pour un « visage ».
  assert.ok(teintee.maxX - teintee.minX > 12,
    'témoin : avant D-104, la teinte couvrait le corps entier, pas un visage');
  assert.ok(demiLargeur > 10,
    'témoin : avant D-104, le disque dessiné débordait de la boîte de collision');
}

console.log('OK test_d104_silhouette_heros');

// `D-246` (Xav, 25/09 : « réduire un peu l'amplitude du vacillement […] et on
// peut rajouter des braises avec des mouvements chaotiques : part sur le côté,
// fait une boucle, rapide, lente… (différents patterns) ») : un filet déclare
// ses MOTIFS, et `alea` retire côté, dérive et ampleur à chaque vie.
//
// Aucune valeur n'est épinglée ici (l'équilibrage est au ressenti de Xav) ;
// ce qui se tient, ce sont des contrats :
//   1. le schéma : la trajectoire sur l'effet OU dans ses motifs, jamais les
//      deux ; une boucle a un rayon ; aucun motif sans particule ; `alea` borné ;
//   2. le chaos ne change qu'à la NAISSANCE d'une braise, quand elle est
//      invisible : jamais un saut à l'écran (la leçon de `D-218`) ;
//   3. sur la vraie flamme : les braises partent des deux côtés, l'une fait une
//      boucle (elle redescend un instant en montant), des rapides et des lentes ;
//   4. le rythme d'un filet est celui de son motif le plus rapide, et reste sous
//      `FREQUENCE_MAX_HZ` ;
//   5. sans `motifs` ni `alea`, un filet ne tire rien : déterministe, côtés
//      alternés (la plume de `D-191` ne bouge pas).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { particulesFilet, motifsFilet, rythmeLumineuxHz, FREQUENCE_MAX_HZ } from '../src/ornements.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const braises = donnees.effets.find((e) => e.id === 'effet_flamme_braises');
const plume = donnees.effets.find((e) => e.id === 'effet_surlignage_filet');
const copie = (o) => JSON.parse(JSON.stringify(o));

// --- 1. Le schéma ----------------------------------------------------------
{
  const avec = (modifier) => {
    const effets = copie(donnees.effets);
    modifier(effets.find((e) => e.id === 'effet_flamme_braises'));
    return validerCatalogues({ ...donnees, effets });
  };
  const refuse = (modifier, motif, pourquoi) => assert.ok(avec(modifier).some((e) => motif.test(e)), pourquoi);
  refuse((e) => { e.periode_ms = 1000; }, /avec des motifs, la trajectoire vit dans chaque motif/, 'trajectoire écrite deux fois');
  refuse((e) => { e.motifs = []; }, /motifs doit être une liste non vide/, 'liste vide');
  refuse((e) => { delete e.motifs[0].periode_ms; }, /motifs\[0\] > periode_ms/, 'un motif sans période');
  refuse((e) => { e.motifs[0].boucles = 2; }, /boucles sans boucle_px/, 'des boucles sans rayon');
  refuse((e) => { e.nb_particules = e.motifs.length - 1; }, /un motif ne serait jamais suivi/, 'un motif sans particule');
  refuse((e) => { e.alea = 1.5; }, /alea doit être un nombre dans \[0, 1\]/, 'alea hors bornes');
  console.log('OK le schéma : motifs ou trajectoire, jamais les deux ; boucle, particules et alea vérifiés');
}

// --- 2. Le chaos ne se voit jamais changer ----------------------------------
// Frame par frame (16 ms), une braise qui SAUTE (plus de 6 px d'une frame à
// l'autre) ne peut le faire que presque transparente : à sa naissance.
{
  for (const graine of [0, 0.37, 0.81]) {
    let avant = particulesFilet(braises, 0, 100, 100, graine);
    for (let t = 16; t < 30000; t += 16) {
      const apres = particulesFilet(braises, t, 100, 100, graine);
      apres.forEach((p, i) => {
        const saut = Math.hypot(p.x - avant[i].x, p.y - avant[i].y);
        if (saut > 6) {
          assert.ok(Math.min(p.alpha, avant[i].alpha) < 0.15 * braises.alpha,
            `braise ${i} à ${t} ms : un saut de ${saut.toFixed(1)} px en pleine vie`);
        }
      });
      avant = apres;
    }
  }
  const a = particulesFilet(braises, 12345, 10, 20, 0.5);
  assert.deepEqual(particulesFilet(braises, 12345, 10, 20, 0.5), a, 'mêmes entrées, mêmes braises');
  console.log('OK le tirage ne change qu’à la naissance d’une braise, invisible');
}

// --- 3. Sur la vraie flamme ------------------------------------------------
{
  const motifs = motifsFilet(braises);
  assert.ok(motifs.length >= 3, 'un petit catalogue, pas un motif');
  const periodes = motifs.map((m) => m.periode_ms);
  assert.ok(Math.max(...periodes) >= 2 * Math.min(...periodes), 'des rapides et des lentes');
  assert.ok(motifs.some((m) => m.boucle_px > 0), 'au moins un motif fait une boucle');

  // La boucle redescend : dans une même vie, la braise repasse sous un point
  // qu'elle avait déjà dépassé. Et les deux côtés sont tirés.
  const iBoucle = motifs.findIndex((m) => m.boucle_px > 0);
  let redescend = false;
  const cotes = new Set();
  let precedent = null;
  for (let t = 0; t < 60000; t += 16) {
    const ps = particulesFilet(braises, t, 0, 0, 0.2);
    const p = ps[iBoucle];
    if (precedent && p.alpha > 0.3 * braises.alpha && precedent.alpha > 0.3 * braises.alpha && p.y > precedent.y + 0.05) redescend = true;
    precedent = p;
    for (const q of ps) if (q.alpha > 0.5 * braises.alpha && Math.abs(q.x) > 1) cotes.add(Math.sign(q.x));
  }
  assert.ok(redescend, 'la braise du motif en boucle redescend un instant en montant');
  assert.deepEqual([...cotes].sort(), [-1, 1], 'les braises partent des deux côtés');
  console.log('OK la vraie flamme : des deux côtés, une boucle, des rapides et des lentes');
}

// --- 4. Le rythme ----------------------------------------------------------
{
  const essai = { type: 'filet', motifs: [{ periode_ms: 2000 }, { periode_ms: 500 }, { periode_ms: 1000 }] };
  assert.equal(rythmeLumineuxHz(essai), 2, 'le motif le plus rapide donne le rythme');
  assert.ok(rythmeLumineuxHz(braises) <= FREQUENCE_MAX_HZ, 'la flamme reste sous le plafond');
  console.log('OK le rythme d’un filet est celui de son motif le plus rapide');
}

// --- 5. Sans motifs ni alea, rien n'est tiré --------------------------------
{
  assert.equal(plume.motifs, undefined);
  assert.equal(plume.alea, undefined);
  for (let t = 0; t < 10000; t += 97) {
    const ps = particulesFilet(plume, t, 0, 0, 0);
    ps.forEach((p, i) => {
      // Le côté alterne : la courbure d'une particule paire va à droite de sa
      // dérive, celle d'une impaire à gauche.
      const brut = t / plume.periode_ms + i / plume.nb_particules;
      const a = brut - Math.floor(brut);
      const courbure = p.x - plume.derive_px * a;
      if (Math.abs(courbure) > 0.01) assert.equal(Math.sign(courbure), i % 2 === 0 ? 1 : -1);
    });
  }
  console.log('OK sans motifs ni alea : côtés alternés, aucun tirage');
}
console.log('OK test_d246_braises_motifs');

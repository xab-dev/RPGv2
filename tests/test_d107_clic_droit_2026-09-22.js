// `D-107` — le clic droit n'ouvre plus le menu du navigateur.
//
// Ce qui se teste ici est STRUCTUREL, et c'est tout ce qui peut l'être : Node
// n'a pas de menu contextuel. On prouve que le garde est posé sur le bon
// événement, qu'il appelle `preventDefault`, qu'il se retire, qu'une cible
// absente ne fait rien tomber, et que la porte d'instrument `?souris=libre`
// ne pose RIEN (et non « pose un écouteur qui laisse passer »).
//
// Le témoin de ce test : retirer l'appel à `preventDefault` dans souris.js le
// fait tomber.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verrouillerMenuContextuel, clicDroitLaisseLibre } from '../src/souris.js';

// Faux document : le strict nécessaire, et il ENREGISTRE ce qu'on lui pose,
// pour qu'un écouteur posé sur le mauvais événement se voie.
function fauxDocument() {
  const ecouteurs = [];
  return {
    ecouteurs,
    addEventListener(type, fn) { ecouteurs.push({ type, fn }); },
    removeEventListener(type, fn) {
      const i = ecouteurs.findIndex((e) => e.type === type && e.fn === fn);
      if (i >= 0) ecouteurs.splice(i, 1);
    },
  };
}

function fauxEvenement() {
  return { defaut: false, preventDefault() { this.defaut = true; } };
}

// 1. Le garde est posé sur `contextmenu`, et sur lui seul.
{
  const doc = fauxDocument();
  verrouillerMenuContextuel(doc);
  assert.equal(doc.ecouteurs.length, 1, 'un seul écouteur posé');
  assert.equal(doc.ecouteurs[0].type, 'contextmenu');
}

// 2. Un clic droit est annulé.
{
  const doc = fauxDocument();
  verrouillerMenuContextuel(doc);
  const ev = fauxEvenement();
  doc.ecouteurs[0].fn(ev);
  assert.equal(ev.defaut, true, 'preventDefault appelé sur le clic droit');
}

// 3. Le retrait rend bien le clic droit.
{
  const doc = fauxDocument();
  const deverrouiller = verrouillerMenuContextuel(doc);
  deverrouiller();
  assert.equal(doc.ecouteurs.length, 0, 'le garde se retire');
}

// 4. Porte d'instrument : `?souris=libre` ne pose AUCUN écouteur.
{
  assert.equal(clicDroitLaisseLibre('?souris=libre'), true);
  assert.equal(clicDroitLaisseLibre('?debug=fps'), false);
  assert.equal(clicDroitLaisseLibre(''), false);
  const doc = fauxDocument();
  verrouillerMenuContextuel(doc, { search: '?souris=libre' });
  assert.equal(doc.ecouteurs.length, 0, 'aucun écouteur sous ?souris=libre');
  // Et les autres paramètres de debug ne désarment pas le garde par erreur.
  const doc2 = fauxDocument();
  verrouillerMenuContextuel(doc2, { search: '?debug=fps&echelle=4' });
  assert.equal(doc2.ecouteurs.length, 1, 'le garde tient sous les autres paramètres');
}

// 5. Contrat « meilleur effort » : rien ne lève, quelle que soit la cible.
{
  for (const cible of [null, undefined, {}, { addEventListener: null }]) {
    const rendu = verrouillerMenuContextuel(cible);
    assert.equal(typeof rendu, 'function', 'toujours une fonction de retrait');
    rendu();
  }
  // Une cible qui lève à la pose est elle aussi un cas normal.
  const hostile = { addEventListener() { throw new Error('non'); } };
  verrouillerMenuContextuel(hostile)();
}

// 6. Le garde est posé au DÉMARRAGE, sur le `document` — pas sur le canvas.
//    Contrôle de source : c'est la décision du ticket, et elle ne se voit
//    nulle part ailleurs (`demarrerJeu` n'est jamais exécuté headless).
{
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(
    main,
    /verrouillerMenuContextuel\(document,/,
    'le garde est posé sur le document, pas sur le canvas',
  );
}

console.log('OK test_d107_clic_droit');

// `D-40` — plus de nom au-dessus des monstres (décision de Xav, 20/09).
//
// « Le nom des monstres charge l'affichage. On les distinguera par la forme et
// la couleur. » Retirer le **dessin**, jamais la **donnée** : les noms doivent
// rester dans le catalogue et dans les locales pour le futur bestiaire et le
// journal des découvertes.
//
// Ce fichier tient donc les deux bouts, et le second est le plus important :
//   1. plus rien ne dessine ni ne compose un nom de monstre ;
//   2. les noms sont TOUJOURS là, dans les deux langues, pour tous les
//      ennemis du jeu.
//
// Le premier bloc lit les SOURCES. C'est la seule prise possible : le rendu
// n'est jamais exercé en headless (contrainte de méthode du projet), donc
// aucun test de comportement ne verrait revenir un `fillText` sous un
// monstre. Un test qui lit le source est laid ; un nom qui revient sans que
// rien ne rougisse l'est davantage.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), []);

// --- 1. Plus personne ne dessine ni ne compose un nom de monstre -----------
{
  const render = fs.readFileSync(path.join(RACINE, 'src', 'render.js'), 'utf8');

  // Le bloc du dessin des monstres ne doit plus contenir de texte du tout.
  const debut = render.indexOf('dessinerVisuel(ctx, monstre.visuel');
  assert.ok(debut > 0, 'le dessin des monstres doit rester repérable dans render.js');
  const blocMonstre = render.slice(debut, render.indexOf('// Héros (§3.4', debut));
  assert.ok(!/fillText/.test(blocMonstre), 'aucun texte ne doit être dessiné sur un monstre');
  assert.ok(!/monstre\.label/.test(blocMonstre), 'render.js ne doit plus lire monstre.label');

  // ...mais la barre de PV, elle, reste : le ticket dit explicitement qu'une
  // jauge de vie n'est pas concernée par le retrait.
  assert.ok(/monstre\.actif/.test(blocMonstre) && /ratioPv/.test(blocMonstre),
    'la barre de PV du monstre doit rester');

  // Et l'orchestrateur ne compose plus le libellé : le retirer du dessin
  // seulement aurait laissé un `i18n.t()` par monstre et par frame, payé
  // pour rien.
  const main = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');
  const debutMap = main.indexOf('const monstresAffiches = monstres.map(');
  assert.ok(debutMap > 0, 'monstresAffiches doit rester repérable dans main.js');
  const blocMap = main.slice(debutMap, debutMap + 700);
  assert.ok(!/label/.test(blocMap), 'main.js ne doit plus composer de label de monstre');
}

// --- 2. Mais les noms sont toujours là, dans les deux langues --------------
// C'est la moitié qui compte : « retirer le dessin, pas la donnée ». Le jour
// du bestiaire, ces clés doivent être intactes — et un ennemi ajouté d'ici là
// doit lui aussi porter son nom, sans quoi le bestiaire naîtra troué.
{
  assert.ok(catalogues.enemies.length > 0, 'il doit exister des ennemis');
  const dictionnaires = Object.fromEntries(['fr', 'en'].map((langue) => [
    langue,
    JSON.parse(fs.readFileSync(path.join(RACINE, 'locales', `${langue}.json`), 'utf8')),
  ]));
  const i18n = creerI18n(dictionnaires, 'fr');
  for (const langue of ['fr', 'en']) {
    i18n.definirLangue(langue);
    for (const ennemi of catalogues.enemies) {
      assert.ok(ennemi.label_key, `${ennemi.id} doit garder son label_key`);
      const nom = i18n.t(ennemi.label_key);
      // `i18n.t` rend `[[cle]]` quand la clé manque : c'est ÇA qu'il faut
      // refuser. Comparer au nom de la clé laisserait passer une locale vide.
      assert.ok(nom && !nom.startsWith('[['),
        `${langue} : "${ennemi.label_key}" doit être traduit (obtenu "${nom}")`);
    }
  }
  console.log(
    `  ${catalogues.enemies.length} ennemis : nom conservé en FR et EN `
    + `(${catalogues.enemies.map((e) => e.id).join(', ')})`,
  );
}

console.log('OK test_d40_pas_de_nom_monstre');

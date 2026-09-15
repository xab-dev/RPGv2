// Contrat : aucun texte visible n'est en dur — tout passe par t("clé").
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creerI18n, verifierJeuxDeCles } from '../src/i18n.js';
import { chargerLocalesDepuisDisque } from '../src/io_node.js';

// 1. Les jeux de clés FR et EN du dépôt sont strictement identiques.
{
  const dictionnaires = await chargerLocalesDepuisDisque('locales');
  const erreurs = verifierJeuxDeCles(dictionnaires);
  assert.deepEqual(erreurs, [], `clés FR/EN désynchronisées :\n${erreurs.join('\n')}`);
  assert.ok(Object.keys(dictionnaires.fr).length > 0);
}

// 2. verifierJeuxDeCles détecte une clé manquante dans une langue.
{
  const erreurs = verifierJeuxDeCles({ fr: { a: '1', b: '2' }, en: { a: '1' } });
  assert.ok(erreurs.some((e) => e.includes('b')));
}

// 3. t() sur une clé absente renvoie [[clé]] visible plutôt que planter.
{
  const i18n = creerI18n({ fr: { 'menu.titre': 'Menu' }, en: { 'menu.titre': 'Menu' } }, 'fr');
  assert.equal(i18n.t('menu.titre'), 'Menu');
  assert.equal(i18n.t('cle.absente'), '[[cle.absente]]');
}

// 4. Bascule de langue.
{
  const i18n = creerI18n({ fr: { a: 'bonjour' }, en: { a: 'hello' } }, 'fr');
  assert.equal(i18n.t('a'), 'bonjour');
  i18n.definirLangue('en');
  assert.equal(i18n.t('a'), 'hello');
}

// 5. Le seul point du code qui affiche du texte joueur (ui/menu.js) ne fixe
// jamais textContent avec une chaîne littérale : tout passe par i18n.t(clé).
// Les autres chaînes de /src (id de données, messages d'erreur de boot pour
// Xav, logs développeur) ne sont pas du texte joueur et restent hors scope
// de ce test — cf. contrainte "hors clés de localisation et logs développeur".
{
  const contenuMenu = readFileSync('src/ui/menu.js', 'utf-8');
  const assignationsTextContent = contenuMenu.match(/\.textContent\s*=\s*['"]/g) || [];
  assert.deepEqual(
    assignationsTextContent,
    [],
    'menu.js ne doit jamais assigner un texte littéral à textContent (toujours passer par i18n.t)'
  );
  assert.ok(contenuMenu.includes('i18n.t('), 'menu.js doit bien traduire son texte via i18n.t');
}

// 6. index.html ne contient aucun texte visible en dur dans <body>.
{
  const html = readFileSync('index.html', 'utf-8');
  const corps = /<body>([\s\S]*)<\/body>/.exec(html)[1];
  const sansBalises = corps.replace(/<[^>]*>/g, '').trim();
  assert.equal(sansBalises, '', `texte en dur trouvé dans <body> de index.html : "${sansBalises}"`);
}

console.log('OK test_phase0_i18n');

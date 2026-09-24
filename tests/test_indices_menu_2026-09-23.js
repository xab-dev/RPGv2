// Les Indices du menu (demande de Xav, 23/09) : une carte qui partage la case
// contextuelle de Construction, et un écran où un indice s'écrit en
// hiéroglyphes tant que sa condition `lisible_si` n'est pas tenue.
//
// Contrats (aucune valeur de réglage épinglée : l'alphabet et le seuil sont lus
// dans les données, ou posés par le test lui-même) :
// 1. Le brouillage est déterministe, garde les blancs et la longueur, n'emploie
//    que les signes de l'alphabet, et ne recopie jamais le texte en clair.
// 2. `entreesIndices` : illisible → titre et lignes brouillés ; lisible → le
//    texte traduit ; un indice non visible (`visible_si`, `D-62`) n'y est pas.
// 3. Le vrai catalogue passe la validation, chaque clé qu'il cite existe dans
//    les deux locales ; un indice mal formé tombe au boot avec son chemin, et
//    un indice qui peut être illisible exige l'alphabet.
// 4. Branché sur le vrai orchestrateur : un indice est illisible sous le seuil
//    de sa condition, lisible dès qu'il est atteint — relu à chaque appel,
//    sans rien réinitialiser. Depuis la spec 14, celui de la grotte ne se lit
//    plus au Nv.15 mais une fois DÉCHIFFRÉ au pied de sa pierre (contrat tenu
//    par `test_spec14_palier_b_stele_descente`) : c'est la pierre qui répond,
//    dont la condition porte encore un niveau, qui sert de témoin ici.
//
// CE QUE CE FICHIER NE PROUVE PAS : que les signes s'affichent (une police qui
// ne les porte pas dessinerait des carrés) ni que l'écran se lit bien. Ça se
// voit dans Chrome, et au téléphone.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { brouillerTexte, entreesIndices } from '../src/indices.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);

// 1
{
  const alphabet = '✻▛▜⎿{}';
  const signes = new Set(Array.from(alphabet));
  const texte = 'La roche\nn’a pas tout dit.';
  const a = brouillerTexte(texte, 'graine', alphabet);
  assert.equal(a, brouillerTexte(texte, 'graine', alphabet), 'même graine, même texte : rouvrir le menu ne change rien');
  assert.notEqual(a, brouillerTexte(texte, 'autre', alphabet), 'une autre graine écrit autre chose');
  assert.equal(Array.from(a).length, Array.from(texte).length, 'la longueur est gardée, signe pour caractère');
  Array.from(texte).forEach((c, i) => {
    const b = Array.from(a)[i];
    if (/\s/.test(c)) assert.equal(b, c, 'un blanc reste un blanc (la silhouette des mots)');
    else assert.ok(signes.has(b), `« ${b} » n'est pas un signe de l'alphabet`);
  });
  assert.equal(brouillerTexte('abc', 'g', ''), 'abc', 'sans alphabet, rien à brouiller (le schéma l\'interdit en amont)');
  console.log('OK brouillage : déterministe, silhouette gardée, alphabet seul');
}

// 2
{
  const indices = [
    { id: 'i_lisible', cle_titre: 't.a', lignes: ['l.a'] },
    { id: 'i_seuil', cle_titre: 't.b', lignes: ['l.b1', 'l.b2'], lisible_si: 'cond_lisible' },
    { id: 'i_cache', cle_titre: 't.c', lignes: ['l.c'], visible_si: 'cond_visible' },
  ];
  const traduire = (cle) => `texte de ${cle}`;
  const entrees = (vraies) => entreesIndices(indices, {
    estVisible: (i) => i.visible_si === undefined || vraies.includes(i.visible_si),
    estLisible: (c) => vraies.includes(c),
    traduire,
    hieroglyphes: '✻▛',
  });
  const avant = entrees([]);
  assert.deepEqual(avant.map((e) => e.id), ['i_lisible', 'i_seuil'], 'l\'indice non visible n\'est pas listé (`D-62`)');
  assert.equal(avant[0].lisible, true, 'sans `lisible_si`, un indice se lit');
  assert.equal(avant[0].titre, 'texte de t.a');
  assert.equal(avant[1].lisible, false);
  assert.ok(!avant[1].titre.includes('texte'), 'illisible : le titre ne laisse rien passer');
  assert.ok(avant[1].lignes.every((l) => /^[✻▛\s]+$/.test(l)), 'illisible : chaque ligne est en hiéroglyphes');
  const apres = entrees(['cond_lisible', 'cond_visible']);
  assert.deepEqual(apres.map((e) => e.id), ['i_lisible', 'i_seuil', 'i_cache']);
  assert.deepEqual(apres[1].lignes, ['texte de l.b1', 'texte de l.b2'], 'lisible : le texte traduit, tel quel');
  assert.deepEqual([avant[1].chasseFixe, apres[1].chasseFixe], [true, false], 'PS4 : les hiéroglyphes en chasse fixe, le texte en clair non');
  console.log('OK entrées : illisible en hiéroglyphes, lisible en clair, invisible absent');
}

// 3
{
  assert.deepEqual(validerCatalogues(donnees), []);
  const config = donnees.indices.find((e) => e.id === 'indices_config');
  assert.ok(config && config.hieroglyphes.length > 0, 'l\'alphabet est déclaré en données');
  for (const indice of donnees.indices.filter((e) => e !== config)) {
    for (const cle of [indice.cle_titre, ...indice.lignes]) {
      for (const langue of ['fr', 'en']) assert.ok(dictionnaires[langue][cle], `${indice.id} : clé "${cle}" absente de ${langue}.json`);
    }
  }
  const erreursApres = (abimer) => {
    const copie = structuredClone(donnees);
    abimer(copie.indices);
    return validerCatalogues(copie);
  };
  const refuse = (abimer, motif) => {
    const e = erreursApres(abimer);
    assert.ok(e.some((m) => motif.test(m)), `attendu ${motif}, reçu ${JSON.stringify(e)}`);
  };
  refuse((c) => c.push({ id: 'indice_x', lignes: ['a'] }), /indice_x.*cle_titre/);
  refuse((c) => c.push({ id: 'indice_x', cle_titre: 'a', lignes: [] }), /indice_x.*lignes/);
  refuse((c) => c.push({ id: 'indice_x', cle_titre: 'a', lignes: ['a'], lisible_si: { valeur: 'niveau' } }), /indice_x.*sans min ni max/);
  refuse((c) => c.push({ id: 'indice_x', cle_titre: 'a', lignes: ['a'], icone: 'visuel_inexistant' }), /visuel_inexistant/);
  refuse((c) => { c.splice(c.indexOf(c.find((e) => e.id === 'indices_config')), 1); }, /lisible_si exige l'entrée "indices_config"/);
  refuse((c) => { c.find((e) => e.id === 'indices_config').hieroglyphes = ' '; }, /hieroglyphes doit être une chaîne/);
  console.log('OK catalogue réel valide, clés FR/EN présentes ; un indice mal formé tombe au boot');
}

// 4
{
  const neutre = { pressed: false, held: false };
  const etatNeutre = {
    move: { x: 0, y: 0 }, attack: neutre, skill_1: neutre, skill_2: neutre, skill_3: neutre,
    consume: neutre, interact: neutre, menu: neutre, target_next: neutre,
  };
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_stele_miroir_lue: true, flag_plume_ramassee: true,
  };
  const i18n = creerI18n(dictionnaires, 'fr');
  const orch = creerOrchestrateurGrotte({
    registre: construireRegistre(donnees), i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} },
    input: { maj: () => etatNeutre }, ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const indice = donnees.indices.find((e) => e.id === 'indice_pierre_qui_repond');
  const seuil = indice.lisible_si.all.find((c) => c.valeur === 'niveau').min;
  const cherche = () => orch.obtenirEntreesIndices().find((e) => e.id === indice.id);

  save.hero.niveau = seuil - 1;
  const avant = cherche();
  assert.ok(avant, 'l\'indice de la pierre qui répond est listé une fois la pierre lue');
  assert.equal(avant.lisible, false, `sous le Nv.${seuil}, il ne se lit pas`);
  assert.notEqual(avant.titre, i18n.t(indice.cle_titre));
  assert.equal(avant.icone, indice.icone);

  save.hero.niveau = seuil;
  const apres = cherche();
  assert.equal(apres.lisible, true, `au Nv.${seuil}, il se lit — sans rien réinitialiser`);
  assert.equal(apres.titre, i18n.t(indice.cle_titre));
  assert.deepEqual(apres.lignes, indice.lignes.map((c) => i18n.t(c)));
  console.log(`OK orchestrateur : illisible sous le Nv.${seuil}, lisible dès qu'il est atteint`);
}

console.log('OK test_indices_menu');

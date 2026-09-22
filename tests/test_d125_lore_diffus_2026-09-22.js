// `D-125` (T9) : le lore diffus du follet sur les choses de base.
//
// CE QUE LE TICKET EST, ET CE QU'IL N'EST PAS. Ce ne sont pas des consignes :
// aucune ligne ne dit quoi faire. Chacune dit ce que le monde PERMET, au
// premier passage d'une chose de base, et ne revient jamais — le jeu n'a ni
// journal de quêtes ni objectif affiché, et n'en aura pas (décision
// verrouillée). Les cinq textes sont des PROPOSITIONS : Xav écrit, Claude
// propose (répartition des rôles du 22/09).
//
// CE QUI EST TESTÉ ICI EST LE MÉCANISME, PAS LE TEXTE. Un test n'épingle
// jamais une valeur de réglage (`D-52`), et une phrase est le réglage le plus
// mou de tous : ce fichier vérifie qu'une ligne existe dans les deux langues,
// que c'est le follet qui parle, que la condition est d'une forme que
// `flags.js` sait déjà évaluer, et qu'en jeu elle tombe au bon moment, une
// seule fois. Les mots eux-mêmes appartiennent à Xav, qui les réécrira sans
// faire rougir quoi que ce soit.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const en = creerI18n(dictionnaires, 'en');

// Les cinq déclencheurs proposés par le brief. La liste est en dur ICI et
// nulle part ailleurs : c'est le contenu du ticket, et un test a le droit de
// dire ce que le ticket a livré.
const LIGNES = [
  'amb_lore_poche_pleine',
  'amb_lore_premiere_herbe',
  'amb_lore_premier_rangement',
  'amb_lore_niveau_10',
  'amb_lore_coffre_pose',
];

// --- 1. Cinq entrées de données, sur le mécanisme de `D-61` --------------
{
  // Aucun déclencheur nouveau : une condition est soit un flag (chaîne), soit
  // une comparaison de valeur nommée, soit une composition des deux —
  // exactement les formes que `flags.js` connaît depuis le Chaos nocturne.
  const formeConnue = (c) => (
    typeof c === 'string'
    || (!!c && c.valeur !== undefined)
    || (!!c && Array.isArray(c.all) && c.all.every(formeConnue))
  );

  for (const id of LIGNES) {
    const ambiance = registre.obtenir('ambiances', id);
    assert.ok(ambiance, `${id} doit être une entrée de ambiances.json`);
    assert.ok(formeConnue(ambiance.condition), `${id} : condition d'une forme que flags.js sait déjà évaluer`);
    assert.deepEqual(
      ambiance.scenes, ['scene_maison_exterieur'],
      `${id} : la boucle de survie vit dans la Région Maison — une ligne n'a rien à dire au fond de la Grotte`,
    );

    // C'est le FOLLET qui parle. C'est ce qui distingue le lore diffus d'une
    // ligne d'ambiance du monde (le vent de cendre, lui, est au narrateur).
    const dialogue = registre.obtenir('dialogues', ambiance.dialogue);
    assert.deepEqual(dialogue.lignes.map((l) => l.locuteur), ['follet'], `${id} : le follet, pas le narrateur`);

    // Une ligne, dans les deux langues, sans marqueur oublié.
    const cle = dialogue.lignes[0].text_key;
    for (const [langue, traducteur] of [['fr', i18n], ['en', en]]) {
      const texte = traducteur.t(cle);
      assert.ok(!texte.startsWith('[['), `${cle} doit exister en ${langue}`);
      assert.ok(!texte.includes('{'), `${cle} (${langue}) : aucun marqueur non substitué`);
    }
    // Et le flag qui la referme est déclaré — sinon `flags.set` lèverait en
    // pleine frame de jeu, jamais au boot.
    assert.ok(registre.obtenir('flags', ambiance.flag), `${ambiance.flag} doit être déclaré`);
  }
  console.log(`OK les ${LIGNES.length} lignes sont des données, sur le mécanisme de D-61, et le follet les porte`);
}

// --- 2. L'herbe déclare son flag ELLE-MÊME, en données --------------------
// C'est le seul des cinq déclencheurs qui demandait quelque chose de neuf. Le
// remède garde la règle : c'est la DONNÉE qui nomme le flag, comme
// `scenes.json > objets_uniques > flag` le fait depuis `D-60`.
{
  const herbe = registre.obtenir('items', 'item_herbe');
  assert.equal(herbe.flag_ramassage, 'flag_premiere_herbe', "l'herbe déclare le flag de son premier ramassage");

  const source = await fs.readFile(path.join(RACINE, 'src', 'main.js'), 'utf8');
  const code = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(code.includes('itemDef.flag_ramassage'), 'le code lit le champ, générique');
  assert.ok(!code.includes('item_herbe'), "et ne connaît AUCUN id d'item : c'est tout le point du champ");

  // Un flag non déclaré tombe au boot. Témoin : sans ce contrôle, la faute ne
  // se verrait qu'au ramassage — c'est-à-dire en jouant.
  const faux = JSON.parse(JSON.stringify(donnees));
  faux.items.find((i) => i.id === 'item_herbe').flag_ramassage = 'flag_qui_nexiste_pas';
  const erreursFausses = validerCatalogues(faux, SCHEMAS);
  assert.ok(
    erreursFausses.some((e) => e.includes('flag_ramassage') && e.includes('flag_qui_nexiste_pas')),
    'un flag_ramassage non déclaré doit tomber au démarrage',
  );
  console.log("OK l'herbe nomme son flag en données ; aucun id d'item dans le code, et un flag inconnu tombe au boot");
}

// --- Un banc de partie, pour la suite ------------------------------------
// Toutes les lignes d'ambiance sont vues D'AVANCE, sauf celle qu'on éprouve :
// une seule peut s'ouvrir par frame, et une autre qui passerait devant
// masquerait le contrat qu'on cherche à voir.
function monter({ sauf = null, poche = {}, stations = {}, flags = {} } = {}) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.inventaire.items = { ...poche };
  Object.assign(save.maison.stations, JSON.parse(JSON.stringify(stations)));
  const vues = Object.fromEntries(
    registre.tous('ambiances').filter((a) => a.id !== sauf).map((a) => [a.flag, true]),
  );
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    ...vues, ...flags,
  };
  const dialogue = creerDialogue();
  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue,
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const b = (v) => ({ pressed: v, held: v });
  const etat = (interact) => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
  });
  const tick = () => { frames.push(etat(false)); orch.maj(16); };
  const interagir = () => { frames.push(etat(true)); orch.maj(16); frames.push(etat(false)); orch.maj(16); };
  return { save, orch, dialogue, tick, interagir };
}

// --- 3. Les trois valeurs nommées disent l'état du monde ------------------
// Aucune ne parle de lore : ce sont des nombres que n'importe quelle
// condition de données peut interroger, et c'est ce qui fera qu'une SIXIÈME
// ligne s'écrira sans code.
{
  const capacite = registre.obtenir('conteneurs', 'conteneur_poche');
  const vide = monter({});
  assert.equal(
    vide.orch.evaluerCondition({ valeur: 'slots_libres_poche', min: capacite.slots }), true,
    'poche vide : tous les slots sont libres',
  );
  assert.equal(vide.orch.evaluerCondition({ valeur: 'slots_libres_poche', max: 0 }), false);
  assert.equal(vide.orch.evaluerCondition({ valeur: 'objets_au_coffre', min: 1 }), false);
  assert.equal(vide.orch.evaluerCondition({ valeur: 'stations_posees', min: 1 }), false);

  // Une poche pleine : autant de SORTES que de slots, chacune dans sa pile.
  const sortes = ['item_bois', 'item_branche', 'item_herbe', 'item_caillou'].slice(0, capacite.slots);
  const pleine = monter({ poche: Object.fromEntries(sortes.map((id) => [id, 1])) });
  assert.equal(
    pleine.orch.evaluerCondition({ valeur: 'slots_libres_poche', max: 0 }), true,
    'autant de sortes que de slots : il ne reste plus rien',
  );

  // Le contenu compte dans TOUS les coffres, pas seulement celui de base :
  // depuis `D-121` le contenu appartient à l'instance.
  const TYPE_COFFRE = registre.tous('stations').find((s) => s.role === 'stockage').id;
  const range = monter({
    stations: {
      mon_coffre: {
        type: TYPE_COFFRE, scene: 'scene_maison_exterieur', x: 90, y: 60, rotation: 0,
        contenu: { item_bois: 3 },
      },
    },
  });
  assert.equal(
    range.orch.evaluerCondition({ valeur: 'objets_au_coffre', min: 1 }), true,
    'ranger dans un coffre POSÉ compte comme ranger',
  );
  assert.equal(
    range.orch.evaluerCondition({ valeur: 'stations_posees', min: 1 }), true,
    "et l'instance créée est une station posée",
  );

  // Une simple POSE sauvegardée n'est pas une station posée par le joueur :
  // c'est la station du catalogue, déplacée.
  const deplacee = monter({ stations: { station_coffre: { x: 86, y: 54, rotation: 0 } } });
  assert.equal(
    deplacee.orch.evaluerCondition({ valeur: 'stations_posees', min: 1 }), false,
    "déplacer le coffre livré avec le jeu n'est pas en poser un",
  );
  assert.equal(
    deplacee.orch.evaluerCondition({ valeur: 'objets_au_coffre', min: 1 }), false,
    'et une pose sans contenu ne range rien',
  );
  console.log('OK les trois valeurs nommées : place en poche, objets rangés, stations posées');
}

// --- 4. En jeu : la ligne de la poche pleine tombe, et une seule fois -----
{
  const capacite = registre.obtenir('conteneurs', 'conteneur_poche');
  const sortes = ['item_bois', 'item_branche', 'item_herbe', 'item_caillou'].slice(0, capacite.slots);
  const p = monter({
    sauf: 'amb_lore_poche_pleine',
    poche: Object.fromEntries(sortes.map((id) => [id, 1])),
    flags: { flag_maison_decouverte: true },
  });
  p.tick();
  assert.equal(p.dialogue.estOuvert(), true, 'poche pleine : le follet le dit');
  assert.equal(p.save.flags.flag_ambiance_poche_pleine, true, 'et son flag est posé');

  p.dialogue.fermer();
  for (let n = 0; n < 5; n += 1) p.tick();
  assert.equal(p.dialogue.estOuvert(), false, 'une seule fois veut dire une seule fois');

  // Le témoin qui donne son sens au test : la MÊME partie, poche libre, ne
  // dit rien. Sans lui, une ligne qui tomberait toujours passerait pour un
  // succès.
  const vide = monter({ sauf: 'amb_lore_poche_pleine', flags: { flag_maison_decouverte: true } });
  vide.tick();
  assert.equal(vide.dialogue.estOuvert(), false, 'poche non pleine : rien à dire');
  console.log('OK la poche pleine fait parler le follet, une fois — et une poche libre ne le fait pas');
}

// --- 5. En jeu : ramasser de l'herbe pose son flag, et la ligne suit ------
{
  const p = monter({ sauf: 'amb_lore_premiere_herbe' });
  const scene = p.orch.obtenirScene();
  const posees = (p.save.monde.items_sol[scene.id] || {}).item_herbe || [];
  assert.ok(posees.length > 0, "de l'herbe doit être semée dans la Région Maison, sinon ce test ne prouve rien");

  p.tick();
  assert.equal(p.dialogue.estOuvert(), false, "tant qu'on n'en a pas ramassé, le follet n'en parle pas");

  const hero = p.orch.obtenirHero();
  hero.x = posees[0].x;
  hero.y = posees[0].y;
  p.interagir();
  assert.equal(p.save.flags.flag_premiere_herbe, true, "ramasser l'herbe pose le flag que l'ITEM déclare");
  assert.equal(p.dialogue.estOuvert(), true, 'la première herbe fait parler le follet');
  assert.equal(p.save.flags.flag_ambiance_premiere_herbe, true);

  // Et elle ne revient pas : le flag de la ligne fait foi, pas celui de
  // l'herbe — le joueur en ramassera des dizaines.
  p.dialogue.fermer();
  hero.x = posees[1] ? posees[1].x : hero.x;
  hero.y = posees[1] ? posees[1].y : hero.y;
  p.interagir();
  assert.equal(p.dialogue.estOuvert(), false, 'la deuxième touffe ne fait plus parler personne');
  console.log("OK la première herbe : le flag vient de l'item, la ligne vient des données");
}

// --- 6. Les trois autres tombent aussi, chacune à sa condition ------------
// Trois bancs minimaux, un par ligne, montés de sorte qu'AUCUNE des deux
// autres ne puisse passer devant : ranger au coffre livré avec le jeu ne pose
// pas de station, et poser un coffre vide ne range rien.
{
  const TYPE_COFFRE = registre.tous('stations').find((s) => s.role === 'stockage').id;
  const cas = [
    ['amb_lore_premier_rangement', 'flag_ambiance_premier_rangement',
      { stations: { station_coffre: { contenu: { item_bois: 1 } } } }],
    ['amb_lore_niveau_10', 'flag_ambiance_niveau_10',
      { flags: { flag_niveau_10: true } }],
    ['amb_lore_coffre_pose', 'flag_ambiance_coffre_pose',
      {
        stations: {
          mon_coffre: { type: TYPE_COFFRE, scene: 'scene_maison_exterieur', x: 90, y: 60, rotation: 0 },
        },
      }],
  ];
  for (const [ligne, flag, monde] of cas) {
    // Sans sa condition : rien. C'est le témoin, et il compte autant que
    // l'autre moitié — une ligne qui tomberait toujours serait pire qu'absente.
    const avant = monter({ sauf: ligne });
    avant.tick();
    assert.equal(avant.dialogue.estOuvert(), false, `${ligne} ne doit pas tomber avant sa condition`);

    const apres = monter({ sauf: ligne, ...monde });
    apres.tick();
    assert.equal(apres.dialogue.estOuvert(), true, `${ligne} doit tomber quand sa condition est vraie`);
    assert.equal(apres.save.flags[flag], true, `${ligne} pose son flag`);

    apres.dialogue.fermer();
    for (let n = 0; n < 5; n += 1) apres.tick();
    assert.equal(apres.dialogue.estOuvert(), false, `${ligne} ne revient jamais`);
  }
  console.log('OK les trois autres lignes : chacune à sa condition, une seule fois, et pas avant');
}

console.log('OK test_d125_lore_diffus');

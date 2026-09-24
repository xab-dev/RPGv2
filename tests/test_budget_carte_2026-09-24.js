// `specs/13` palier F : le BUDGET DE LA CARTE (§4.6), éprouvé sans navigateur.
//
// Le contrat que l'Annexe 1 et tout agrandissement de la Maison doivent tenir :
// une frame de marche et une reconstruction du calque dépendent de ce qui est
// À L'ÉCRAN, jamais de la taille de la scène ni du nombre total de ce qu'elle
// porte. Ce fichier le prouve sur une scène SYNTHÉTIQUE quatre fois plus grande
// que la Maison (son plan recopié deux fois en largeur et en hauteur, son décor
// recopié dans les trois quarts neufs), vue par la même caméra :
// 1. une reconstruction repeint les mêmes cases et lit les mêmes motifs de
//    décor, en entier comme en défilant — l'index du décor ne se lit que case
//    par case (`defilement.js`) ;
// 2. le tri des entités par le champ (`champ.js`) garde les mêmes monstres et
//    les mêmes lumières, quel que soit le nombre de ceux qui sont ailleurs ; il
//    juge sur ce qui se PEINT, jamais sur la position seule ;
// 3. le plafond d'entrée en scène (`Q-134`) est en données, validé au
//    démarrage, et son dépassement est un avertissement, jamais un échec.
// Ce qui est comparé, ce sont des comptes de travail, jamais des durées : un
// test qui chronomètre dépend de la machine. Les durées sont l'affaire de
// `cout_calque.mjs` et `traversee_nuit.mjs`. Aucun nombre du catalogue n'est
// épinglé (`D-52`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { chargerScene } from '../src/scene.js';
import { genererDecor, lumieresDuDecor, ROTATION_MAX_DEG } from '../src/decor.js';
import { cellulesAPeindre, cellulesARepeindre, indexerDecor, motifsDesCellules, rayonInfluence } from '../src/defilement.js';
import { selectionnerTuilesVisibles, RESOLUTION_LOGIQUE } from '../src/render.js';
import { calculerCamera } from '../src/camera.js';
import { boiteDansLeChamp, disqueDansLeChamp, vueDeCamera, visuelDansLeChamp } from '../src/champ.js';
import { boiteDessin } from '../src/tampons.js';
import { echelleVisuel } from '../src/visuels.js';
import { avertissementEntreeScene, formaterReleve } from '../src/debug_perf.js';
import { valeurLevier } from '../src/qualite.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

const ID = 'scene_maison_exterieur';
const def = registre.obtenir('scenes', ID);
const T = def.tile_size;

// La scène quatre fois plus grande : le plan de la Maison recopié en 2 × 2.
// Tout le reste (zones, structures, interactifs) reste dans le premier quart,
// là où regarde la caméra : ce qui s'ajoute est AILLEURS, c'est la question.
const defGrande = {
  ...def,
  width: def.width * 2,
  height: def.height * 2,
  layout: [...def.layout, ...def.layout].map((ligne) => ligne + ligne),
};
const registreGrand = Object.create(registre);
registreGrand.obtenir = (cat, id) => (cat === 'scenes' && id === ID ? defGrande : registre.obtenir(cat, id));

const petite = chargerScene(registre, ID);
const grande = chargerScene(registreGrand, ID);
assert.equal(grande.width * grande.height, 4 * petite.width * petite.height, 'la scène synthétique est bien 4 fois la Maison');

// Le décor de la grande scène : celui de la Maison, puis ses trois copies
// décalées. Le premier quart porte donc EXACTEMENT les mêmes motifs. Tiré à la
// densité de Haut, la plus lourde : c'est là qu'un parcours du décor entier
// coûterait le plus.
const presets = registre.obtenir('graphismes', 'graphismes_presets');
const densiteMax = Math.max(...presets.paliers.filter((p) => p.leviers).map((p) => valeurLevier(presets, p.id, 'densite_decor')));
const decorPetit = genererDecor(petite, densiteMax);
const decalages = [[0, 0], [def.width * T, 0], [0, def.height * T], [def.width * T, def.height * T]];
const decorGrand = decalages.flatMap(([dx, dy]) => (dx === 0 && dy === 0
  ? decorPetit
  : decorPetit.map((m) => ({ ...m, x: m.x + dx, y: m.y + dy }))));
assert.ok(decorPetit.length > 0, 'la Maison a un décor, sinon rien n\'est prouvé');
assert.equal(decorGrand.length, 4 * decorPetit.length);

// La même caméra dans les deux scènes, en trois endroits de la Maison : le
// point d'apparition (caméra bornée au bord ouest), la maison (la structure)
// et le milieu de la forêt. Aucun n'est au bord est ou sud de la petite
// scène : la caméra y est bornée pareil dans la grande.
const maison = def.structures[0].rect;
const foret = def.zones.find((z) => z.type === 'foret').rect;
const CIBLES = {
  apparition: [(def.spawn.x + 0.5) * T, (def.spawn.y + 0.5) * T],
  maison: [(maison.x + maison.w / 2) * T, (maison.y + maison.h / 2) * T],
  foret: [(foret.x + foret.w / 2) * T, (foret.y + foret.h / 2) * T],
};
const cameraSur = (scene, cx, cy) => calculerCamera({
  cibleX: cx, cibleY: cy,
  largeurScene: scene.width * T, hauteurScene: scene.height * T,
  largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
});
for (const [nom, [cx, cy]] of Object.entries(CIBLES)) {
  assert.deepEqual(cameraSur(grande, cx, cy), cameraSur(petite, cx, cy), `${nom} : la même caméra dans les deux scènes`);
}

// --- 1. Une reconstruction ne suit pas la taille de la scène ---------------

// L'index du décor, observé : il ne se lit QUE case par case. Une autre
// lecture (parcourir toutes les cases, compter la carte) n'existe pas sur
// cet objet et ferait tomber le test — c'est ce qu'on veut interdire.
function indexObserve(decor) {
  const { parCase } = indexerDecor(decor, T);
  const compte = { cases: 0, motifs: 0 };
  return {
    compte,
    index: {
      parCase: {
        get(cle) {
          compte.cases += 1;
          const liste = parCase.get(cle);
          if (liste) compte.motifs += liste.length;
          return liste;
        },
      },
    },
  };
}

const rayon = rayonInfluence({
  visuelsTuiles: new Map(),
  visuelsDecor: new Set(decorPetit.map((m) => (typeof m.visuel === 'string' ? registre.obtenir('visuels', m.visuel) : m.visuel))),
  tileSize: T,
  rotationDecorMaxDeg: ROTATION_MAX_DEG,
});

function travail(scene, decor, camera) {
  const fenetre = selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, T);
  const complete = cellulesAPeindre(fenetre);
  const observeComplet = indexObserve(decor);
  const motifsComplets = motifsDesCellules(observeComplet.index, complete);
  // Un pas d'une case en diagonale : le calque défile.
  const suivante = selectionnerTuilesVisibles({ x: camera.x + T, y: camera.y + T }, RESOLUTION_LOGIQUE, T);
  const bande = cellulesARepeindre(fenetre, suivante, rayon);
  assert.ok(bande, 'un pas d\'une case défile, il ne reconstruit pas');
  const observeBande = indexObserve(decor);
  const motifsBande = motifsDesCellules(observeBande.index, bande);
  return {
    casesCompletes: complete.length, lecturesCompletes: observeComplet.compte, motifsComplets,
    casesBande: bande.length, lecturesBande: observeBande.compte, motifsBande,
  };
}

let motifsVus = 0;
for (const [nom, [cx, cy]] of Object.entries(CIBLES)) {
  const tPetite = travail(petite, decorPetit, cameraSur(petite, cx, cy));
  const tGrande = travail(grande, decorGrand, cameraSur(grande, cx, cy));
  motifsVus += tPetite.motifsComplets.length;
  assert.equal(tGrande.casesCompletes, tPetite.casesCompletes, `${nom}, reconstruction complète : les mêmes cases repeintes`);
  assert.deepEqual(tGrande.lecturesCompletes, tPetite.lecturesCompletes, `${nom}, reconstruction complète : les mêmes lectures de l'index`);
  assert.deepEqual(tGrande.motifsComplets, tPetite.motifsComplets, `${nom}, reconstruction complète : les mêmes motifs, dans le même ordre`);
  assert.equal(tGrande.casesBande, tPetite.casesBande, `${nom}, défilement : les mêmes cases repeintes`);
  assert.deepEqual(tGrande.lecturesBande, tPetite.lecturesBande, `${nom}, défilement : les mêmes lectures de l'index`);
  assert.deepEqual(tGrande.motifsBande, tPetite.motifsBande, `${nom}, défilement : les mêmes motifs`);
  assert.ok(tPetite.lecturesCompletes.motifs < decorPetit.length, `${nom} : on lit moins que le décor de la seule Maison`);
  console.log(`OK ${nom} : une reconstruction repeint ${tPetite.casesCompletes} cases et lit ${tPetite.lecturesCompletes.motifs} motifs `
    + `(décor de ${decorPetit.length} motifs pour la Maison, ${decorGrand.length} pour ×4) ; un pas en diagonale, `
    + `${tPetite.casesBande} cases et ${tPetite.lecturesBande.motifs} motifs — les mêmes chiffres dans les deux scènes`);
}
assert.ok(motifsVus > 0, 'les vues portent du décor, sinon rien n\'est prouvé');

// --- 2. Le tri par le champ ------------------------------------------------

const camPetite = cameraSur(petite, ...CIBLES.maison);
const vue = vueDeCamera(camPetite, RESOLUTION_LOGIQUE);

// 2.1 Des monstres : ceux de la vue, puis trois fois plus ailleurs.
const visuelMonstre = registre.obtenir('visuels', registre.tous('enemies')[0].render.visuel);
const dansLaVue = [0.2, 0.4, 0.6, 0.8].map((f) => ({
  x: camPetite.x + f * RESOLUTION_LOGIQUE.largeur, y: camPetite.y + f * RESOLUTION_LOGIQUE.hauteur,
}));
const ailleurs = decalages.slice(1).flatMap(([dx, dy]) => dansLaVue.map((m) => ({ x: m.x + dx, y: m.y + dy })));
const gardes = (liste) => liste.filter((m) => visuelDansLeChamp(visuelMonstre, m.x, m.y, vue)).length;
assert.equal(gardes(dansLaVue), dansLaVue.length, 'les monstres de la vue sont dessinés');
assert.equal(gardes([...dansLaVue, ...ailleurs]), dansLaVue.length, 'et les autres, trois fois plus nombreux, ne coûtent rien');
console.log(`OK les monstres : ${dansLaVue.length} dessinés sur ${dansLaVue.length + ailleurs.length} présents`);

// 2.2 Ce qui se PEINT, pas la position : l'interactif le plus large du
// catalogue, ancré hors de l'écran mais dont le dessin y entre, est gardé ;
// un pas plus loin, il ne l'est plus. Un tri sur l'ancre seule le couperait.
const interactifs = registre.tous('puzzles').filter((p) => p.render && p.render.visuel);
const boiteDe = (p) => boiteDessin(registre.obtenir('visuels', p.render.visuel), {
  echelle: (p.echelle || 1) * echelleVisuel(registre.obtenir('visuels', p.render.visuel)),
});
const large = interactifs.reduce((a, b) => (boiteDe(b).maxX - boiteDe(b).minX > boiteDe(a).maxX - boiteDe(a).minX ? b : a));
const b = boiteDe(large);
const visuelLarge = registre.obtenir('visuels', large.render.visuel);
assert.ok(b.minX < -2, `${large.id} déborde à gauche de son ancre`);
const yMilieu = camPetite.y + RESOLUTION_LOGIQUE.hauteur / 2;
assert.equal(visuelDansLeChamp(visuelLarge, vue.droite - b.minX / 2, yMilieu, vue, { echelle: large.echelle }), true,
  `${large.id} ancré hors de l'écran, à droite, mais dont le dessin y entre : gardé`);
assert.equal(visuelDansLeChamp(visuelLarge, vue.droite - b.minX + 1, yMilieu, vue, { echelle: large.echelle }), false,
  `${large.id} tout entier hors de l'écran : trié`);
// La rotation compte : la boîte est celle de `tampons.js#boiteDessin`, tournée.
for (const rotation of [0, 90, 180, 270]) {
  const bt = boiteDessin(visuelLarge, { echelle: (large.echelle || 1) * echelleVisuel(visuelLarge), rotation });
  const x = vue.droite - bt.minX / 2;
  assert.equal(visuelDansLeChamp(visuelLarge, x, yMilieu, vue, { echelle: large.echelle, rotation }),
    boiteDansLeChamp({ minX: x + bt.minX, maxX: x + bt.maxX, minY: yMilieu + bt.minY, maxY: yMilieu + bt.maxY }, vue),
    `${large.id} tourné de ${rotation}° : la boîte tournée décide`);
}
console.log(`OK le tri juge sur le dessin (${large.id}, ${Math.round(b.maxX - b.minX)} px de large), rotation comprise`);

// 2.3 Les lumières : le voile ne perce que celles du champ. Celles de la
// scène (le halo de la maison et les deux lueurs de la forêt) et celles de
// son décor (aucune dans la Maison aujourd'hui : les cristaux sont dans la
// Grotte), recopiées dans les trois quarts neufs.
const lumieresPetit = [...petite.lumieres, ...lumieresDuDecor(petite, decorPetit)];
const lumieresGrand = decalages.flatMap(([dx, dy]) => lumieresPetit.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })));
assert.ok(lumieresPetit.length > 1, 'la Maison a des lumières, sinon rien n\'est prouvé');
const eclairent = (liste) => liste.filter((l) => disqueDansLeChamp(l.x, l.y, l.rayon, vue)).length;
assert.ok(eclairent(lumieresPetit) > 0, 'la maison est éclairée dans sa propre vue');
assert.ok(eclairent(lumieresPetit) < lumieresPetit.length, 'et une lumière de la forêt est hors champ');
assert.equal(eclairent(lumieresGrand), eclairent(lumieresPetit), 'les lumières percées ne suivent pas la taille de la carte');
console.log(`OK les lumières : ${eclairent(lumieresPetit)} percées sur ${lumieresPetit.length} (Maison), `
  + `${eclairent(lumieresGrand)} sur ${lumieresGrand.length} (×4)`);
// Un halo dont seul le bord flou entre dans l'écran est percé ; au coin,
// c'est le DISQUE qui décide, pas sa boîte.
const r = 40;
assert.equal(disqueDansLeChamp(vue.droite + r - 1, yMilieu, r, vue), true, 'le bord d\'un halo entre : percé');
assert.equal(disqueDansLeChamp(vue.droite + r + 1, yMilieu, r, vue), false, 'tout le halo dehors : trié');
const d = (r / Math.SQRT2) + 1; // chaque axe sous le rayon, la diagonale au-delà
assert.equal(disqueDansLeChamp(vue.droite + d, vue.bas + d, r, vue), false, 'au coin, le disque ne touche pas : trié');
console.log('OK un halo se trie par son disque, bord flou compris');

// --- 3. Le plafond d'entrée en scène (`Q-134`) ------------------------------

const budget = registre.obtenir('graphismes', 'budget_carte');
assert.ok(budget && budget.entree_scene_max_ms > 0, 'le plafond est en données');
const sansBudget = donnees.graphismes.filter((e) => e.id !== 'budget_carte');
assert.ok(validerCatalogues({ ...donnees, graphismes: sansBudget }, SCHEMAS).some((e) => e.includes('budget_carte')),
  'un catalogue sans budget tombe au démarrage, en le nommant');
for (const faux of [0, -5, '40', null]) {
  const graphismes = donnees.graphismes.map((e) => (e.id === 'budget_carte' ? { ...e, entree_scene_max_ms: faux } : e));
  assert.ok(validerCatalogues({ ...donnees, graphismes }, SCHEMAS).length > 0, `un plafond ${JSON.stringify(faux)} est refusé`);
}
const plafond = budget.entree_scene_max_ms;
const entree = (dureeMs) => ({ sceneId: ID, dureeMs, sceneMs: 1, decorMs: 1, resteMs: dureeMs - 2, plafondMs: plafond });
assert.equal(avertissementEntreeScene(entree(plafond), plafond), null, 'au plafond, rien à dire');
const message = avertissementEntreeScene(entree(plafond + 1), plafond);
assert.ok(message && message.includes(ID) && message.includes(`plafond ${plafond} ms`), 'au-delà : un avertissement qui dit où et combien');
const etat = {
  fps: 60, deltaMoyenMs: 16.7, deltaP95Ms: 17, deltaMaxMs: 17, framesPlafonnees: 0, framesTotales: 600,
  dureeMajMoyenneMs: 0.1, dureeMajP95Ms: 0.1, dureeDessinerMoyenneMs: 1, dureeDessinerP95Ms: 1, framesLentes: 0,
  recalculsCoucheStatique: { nombre: 0, dureeMoyenneMs: 0, dureeMaxMs: 0, depuisDernierMs: null },
  ecartHeroX: { moyenne: 0, min: 0, max: 0 }, ecartHeroY: { moyenne: 0, min: 0, max: 0 },
  entites: {
    monstres: { dessines: 3, presents: 12 }, puzzles: { dessines: 1, presents: 6 },
    objetsSol: { dessines: 4, presents: 50 }, lumieres: { dessines: 2, presents: 20 },
  },
  monstresMoyens: { dessines: 2.5, presents: 12 },
  ecranPhysique: { largeurPhysique: 1920, hauteurPhysique: 1080, dpr: 1 },
  echelleRendu: { forcee: null, naturelle: 4 }, coucheStatique: null, canvasVoile: null,
  peripheriqueActif: 'manette', basculesParSeconde: 0,
};
assert.ok(formaterReleve({ ...etat, entreeScene: entree(plafond - 1) }).includes(`plafond ${plafond} ms`), 'le relevé cite le plafond');
assert.ok(!formaterReleve({ ...etat, entreeScene: entree(plafond - 1) }).includes('DÉPASSÉ'));
assert.ok(formaterReleve({ ...etat, entreeScene: entree(plafond + 1) }).includes('DÉPASSÉ'), 'et dit quand il est dépassé');
const releve = formaterReleve(etat);
assert.ok(releve.includes('monstres 3/12') && releve.includes('lumières 2/20'), 'le relevé dit dessinés / présents');
assert.ok(releve.includes('2.50/12.00'), 'et la moyenne des monstres dessinés');
console.log(`OK le plafond d'entrée en scène : ${plafond} ms, en données, un avertissement au-delà`);

console.log('OK test_budget_carte');

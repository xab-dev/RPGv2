// La pierre qui répond (carte blanche donnée par Xav à Claude, 24/09) : une
// seconde stèle, en miroir de la première de l'autre côté du chemin, et un
// objet unique qui ne sert à rien, là où sa gravure mène. Le contenu des
// textes n'est pas l'affaire de ce fichier ; il tient la mécanique.
//
// Contrats :
// 1. Le catalogue : une stèle qui pose un flag inconnu, un indice dont le
//    `visible_si` cite un flag inconnu tombent au boot.
// 2. La pierre : huit voisines libres, dans une clairière déclarée, un halo
//    dessus, INVISIBLE depuis chaque case de chemin (même caméra que le jeu),
//    et ATTEIGNABLE à pied depuis le chemin — une surprise murée par le tirage
//    de la forêt ne serait plus une surprise, juste un secret perdu.
// 3. L'objet : sur une case libre de sa clairière, atteignable lui aussi, et
//    une ligne du follet l'attend quand il est ramassé.
// 4. Le vrai orchestrateur : l'indice n'est pas au menu tant que la pierre
//    n'a pas été lue ; la lire pose le flag et l'y fait paraître, illisible ;
//    il se lit quand SA condition tient, pas avant.
//
// CE QUE CE FICHIER NE PROUVE PAS : que la lueur se voit, que l'étincelle est
// jolie à la taille du jeu. Validation en jeu par Xav.
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
import { chargerScene } from '../src/scene.js';
import { calculerCamera } from '../src/camera.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';
import { empreinteAbsoluePuzzle } from '../src/structures.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
const registre = construireRegistre(donnees);
const STELE = donnees.puzzles.find((p) => p.id === 'stele_miroir');
assert.ok(STELE && STELE.type === 'stele' && STELE.flag, 'la pierre qui répond est une stèle qui pose un flag');
const INDICE = donnees.indices.find((i) => i.id === STELE.indice);
const SCENE_ID = donnees.scenes.find((s) => (s.interactifs || []).includes(STELE.id)).id;
const DEF = registre.obtenir('scenes', SCENE_ID);
const OBJET = DEF.objets_uniques.find((o) => o.item === 'item_etincelle_argile');
assert.ok(OBJET, "l'étincelle est posée dans la même scène");
const T = DEF.tile_size;

// 1
{
  assert.deepEqual(validerCatalogues(donnees), []);
  const refuse = (abimer, motif) => {
    const copie = structuredClone(donnees);
    abimer(copie);
    const e = validerCatalogues(copie);
    assert.ok(e.some((m) => motif.test(m)), `attendu ${motif}, reçu ${JSON.stringify(e)}`);
  };
  refuse((c) => { c.puzzles.find((p) => p.id === STELE.id).flag = 'flag_inexistant'; }, /flag "flag_inexistant" non déclaré/);
  refuse((c) => { c.indices.find((i) => i.id === INDICE.id).visible_si = 'flag_inexistant'; }, /visible_si/);
  console.log('OK catalogue : flag de stèle et visible_si d\'indice vérifiés au boot');
}

// Ce qui suit lit la scène telle que le jeu la charge (forêt tirée comprise).
const scene = chargerScene(registre, SCENE_ID);
const chemin = registre.obtenir('tiles', 'tile_chemin').id;
const casesChemin = [];
for (let cy = 0; cy < DEF.height; cy += 1) {
  for (let cx = 0; cx < DEF.width; cx += 1) {
    if (scene.tuileA(cx, cy).id === chemin) casesChemin.push([cx, cy]);
  }
}
assert.ok(casesChemin.length > 0, 'la scène a un chemin');
// Les cases qu'on atteint à pied depuis le chemin (tuiles `solid` et
// empreintes d'interactifs solides exclues).
const libre = (x, y) => {
  const t = scene.tuileA(x, y);
  return t && !scene.estSolideAuPoint((x + 0.5) * T, (y + 0.5) * T, () => false);
};
const atteintes = new Set(casesChemin.map(([x, y]) => `${x},${y}`));
{
  const file = [...casesChemin];
  while (file.length) {
    const [x, y] = file.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      const cle = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= DEF.width || ny >= DEF.height || atteintes.has(cle) || !libre(nx, ny)) continue;
      atteintes.add(cle);
      file.push([nx, ny]);
    }
  }
}
const clairiereDe = (x, y) => DEF.zones.find((z) => DEF.foret_procedurale.zones_exclues.includes(z.type)
  && x >= z.rect.x && x < z.rect.x + z.rect.w && y >= z.rect.y && y < z.rect.y + z.rect.h);

// 2
{
  const { x, y } = STELE.position;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const t = scene.tuileA(x + dx, y + dy);
      assert.ok(t && !t.solid, `(${x + dx}, ${y + dy}) doit être libre autour de la pierre, trouvé ${t && t.id}`);
    }
  }
  const clairiere = clairiereDe(x, y);
  assert.ok(clairiere, 'la pierre est dans une clairière déclarée');
  assert.ok(atteintes.has(`${x},${y + 1}`), 'on peut marcher jusqu\'au pied de la pierre depuis le chemin');
  const halo = (DEF.lumieres || []).find((l) => l.couleur && Math.abs(l.x - (x + 0.5) * T) <= T && Math.abs(l.y - (y + 0.5) * T) <= T);
  assert.ok(halo, 'un halo sur la pierre');
  const pierre = empreinteAbsoluePuzzle(STELE, registre.obtenir('visuels', STELE.render.visuel), scene.poseEffectiveInteractif(STELE.id), T);
  const aCacher = [
    ['la pierre', pierre],
    ['son halo', { x: halo.x - halo.rayon, y: halo.y - halo.rayon, w: 2 * halo.rayon, h: 2 * halo.rayon }],
    ['sa clairière', { x: clairiere.rect.x * T, y: clairiere.rect.y * T, w: clairiere.rect.w * T, h: clairiere.rect.h * T }],
  ];
  for (const [cx, cy] of casesChemin) {
    const cam = calculerCamera({
      cibleX: (cx + 0.5) * T, cibleY: (cy + 0.5) * T, largeurScene: DEF.width * T, hauteurScene: DEF.height * T,
      largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    });
    for (const [nom, r] of aCacher) {
      const vu = r.x < cam.x + RESOLUTION_LOGIQUE.largeur && r.x + r.w > cam.x && r.y < cam.y + RESOLUTION_LOGIQUE.hauteur && r.y + r.h > cam.y;
      assert.ok(!vu, `${nom} se voit depuis la case de chemin (${cx}, ${cy})`);
    }
  }
  console.log(`OK pierre : dégagée, atteignable, invisible depuis les ${casesChemin.length} cases de chemin`);
}

// 3
{
  assert.ok(libre(OBJET.x, OBJET.y), "l'étincelle est posée sur une case libre");
  assert.ok(clairiereDe(OBJET.x, OBJET.y), "dans une clairière déclarée : le tirage de la forêt ne la mure pas");
  assert.ok(atteintes.has(`${OBJET.x},${OBJET.y}`), "on peut marcher jusqu'à l'étincelle");
  const ligne = donnees.ambiances.find((a) => a.condition === OBJET.flag);
  assert.ok(ligne && (ligne.scenes || []).includes(SCENE_ID), 'une ligne du follet attend son ramassage, dans cette scène');
  console.log("OK étincelle : case libre, clairière, atteignable, le follet a quelque chose à dire");
}

// 4
{
  const neutre = { pressed: false, held: false };
  const etat = ({ interact = false } = {}) => ({
    move: { x: 0, y: 0 }, attack: neutre, skill_1: neutre, skill_2: neutre, skill_3: neutre, consume: neutre,
    interact: { pressed: interact, held: interact }, menu: neutre, target_next: neutre,
  });
  let prochain = etat();
  const save = saveNeuve();
  save.hero.scene = SCENE_ID;
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.hero.x = (STELE.position.x + 0.5) * T;
  save.hero.y = (STELE.position.y + 1.1) * T;
  const orch = creerOrchestrateurGrotte({
    registre, i18n: creerI18n(dictionnaires, 'fr'), save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {} },
    input: { maj: () => { const e = prochain; prochain = etat(); return e; } },
    lireContactsTactiles: () => [],
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  const auMenu = () => orch.obtenirEntreesIndices().find((e) => e.id === INDICE.id);
  frame();
  assert.equal(auMenu(), undefined, "tant que la pierre n'est pas lue, son indice n'est pas au menu");
  frame(etat({ interact: true }));
  assert.equal(orch.obtenirVueStele().puzzleId, STELE.id, 'INTERACT ouvre la pierre qui répond');
  assert.equal(save.flags[STELE.flag], true, 'la lire pose son flag, sauvegardé');
  assert.ok(auMenu(), 'son indice paraît au menu');
  // La condition de lecture est celle du catalogue : on l'éprouve contre le
  // registre de flags, sans la recopier ici.
  save.hero.niveau = 1;
  assert.equal(auMenu().lisible, false, 'illisible sous sa condition');
  save.hero.niveau = 99;
  save.flags.flag_plume_ramassee = true;
  // Le registre de flags a été construit au démarrage ; un flag s'y pose par
  // son propre chemin — un redémarrage sur la même sauvegarde le relit.
  const orch2 = creerOrchestrateurGrotte({
    registre, i18n: creerI18n(dictionnaires, 'fr'), save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {} },
    input: { maj: () => etat() }, lireContactsTactiles: () => [],
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const entree = orch2.obtenirEntreesIndices().find((e) => e.id === INDICE.id);
  assert.equal(entree.lisible, true, 'sa condition tenue, il se lit');
  assert.deepEqual(entree.lignes, INDICE.lignes.map((c) => dictionnaires.fr[c]), 'en clair, les lignes de la locale');
  console.log('OK orchestrateur : caché avant la lecture, paraît illisible, se lit sous sa condition');
}

console.log('OK test_pierre_qui_repond');

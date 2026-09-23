// La stèle (demande de Xav, 23/09) : une pierre posée dès le début dans une
// clairière de la forêt, au sud-ouest, près du chemin. INTERACT ouvre sa vue
// rapprochée (hiéroglyphes lumineux, particules) ; B la ferme ; c'est tout.
//
// Contrats (aucune valeur de réglage épinglée : position, armement, couleur
// sont lus dans les données) :
// 1. `stele.js` : les particules naissent avec le temps, meurent, ne dépassent
//    jamais leur réserve ; l'armement ; l'état passé n'est jamais modifié.
// 2. Le catalogue : la stèle est valide ; un indice inconnu, une couleur mal
//    écrite, un armement absent, une clairière sans zone tombent au boot.
// 3. La clairière : la forêt procédurale n'y pousse pas — la stèle a au moins
//    ses huit voisines libres, elle est dans la forêt, et un halo l'éclaire.
//    Et on ne la voit PAS depuis le chemin (Xav : « non loin du chemin, sans
//    être visible depuis le chemin ») : ni la pierre, ni son halo, ni sa
//    clairière n'entrent dans la vue d'un héros debout sur une case de chemin.
// 4. Le vrai orchestrateur : INTERACT à portée ouvre la vue (jeu gelé) ; B
//    avant l'armement ne ferme rien ; MENU se tait ; B après l'armement ferme,
//    un toucher aussi ; la gravure porte les MÊMES signes que l'écran Indices.
//
// CE QUE CE FICHIER NE PROUVE PAS : que la pierre est belle, que la lueur se
// voit la nuit, que les signes s'affichent au téléphone. `V-123`.
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
import { mulberry32 } from '../src/decor.js';
import { calculerCamera } from '../src/camera.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';
import { empreinteAbsoluePuzzle } from '../src/structures.js';
import { creerVueStele, avancerVueStele, vueSteleArmee, alphaParticule, PARTICULES_MAX } from '../src/stele.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
const registre = construireRegistre(donnees);
const STELE = donnees.puzzles.find((p) => p.type === 'stele');
assert.ok(STELE, 'une stèle est déclarée');
const SCENE_ID = donnees.scenes.find((s) => (s.interactifs || []).includes(STELE.id)).id;

// 1
{
  const hasard = mulberry32(7);
  const depart = creerVueStele('x');
  let vue = depart;
  let plafond = 0;
  for (let t = 0; t < 30_000; t += 16) {
    vue = avancerVueStele(vue, 16, hasard);
    plafond = Math.max(plafond, vue.particules.length);
    for (const p of vue.particules) {
      const a = alphaParticule(p);
      assert.ok(a >= 0 && a <= 1, 'opacité dans [0, 1]');
    }
  }
  assert.deepEqual(depart.particules, [], 'l\'état d\'origine n\'a pas bougé');
  assert.ok(plafond > 0, 'des particules naissent');
  assert.ok(plafond <= PARTICULES_MAX, 'jamais plus que la réserve');
  vue = avancerVueStele(vue, 60_000, hasard);
  assert.ok(vue.particules.length <= PARTICULES_MAX, 'la réserve est bornée, même après un saut de temps');
  assert.equal(vueSteleArmee(creerVueStele('x'), 100), false);
  assert.equal(vueSteleArmee(avancerVueStele(creerVueStele('x'), 100, hasard), 100), true);
  assert.equal(vueSteleArmee(creerVueStele('x'), 0), true, 'armement nul : fermable tout de suite');
  console.log('OK stele.js : naissance, mort, réserve bornée, armement');
}

// 2
{
  assert.deepEqual(validerCatalogues(donnees), []);
  const refuse = (abimer, motif) => {
    const copie = structuredClone(donnees);
    abimer(copie);
    const e = validerCatalogues(copie);
    assert.ok(e.some((m) => motif.test(m)), `attendu ${motif}, reçu ${JSON.stringify(e)}`);
  };
  const stele = (c) => c.puzzles.find((p) => p.id === STELE.id);
  refuse((c) => { stele(c).indice = 'indice_inexistant'; }, /indice "indice_inexistant" introuvable/);
  refuse((c) => { stele(c).indice = 'indices_config'; }, /indice "indices_config" introuvable/);
  refuse((c) => { stele(c).couleur = 'bleu'; }, /couleur doit être #rrggbb/);
  refuse((c) => { delete stele(c).armement_ms; }, /armement_ms/);
  refuse((c) => { c.scenes.find((s) => s.id === SCENE_ID).foret_procedurale.zones_exclues = ['bosquet']; },
    /zones_exclues : aucune zone de type "bosquet"/);
  console.log('OK catalogue : la stèle valide, ses fautes refusées au boot');
}

// 3
{
  const scene = chargerScene(registre, SCENE_ID);
  const def = registre.obtenir('scenes', SCENE_ID);
  const { x, y } = STELE.position;
  const plein = def.foret_procedurale.tile_plein;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const t = scene.tuileA(x + dx, y + dy);
      assert.ok(t && t.id !== plein && !t.solide, `(${x + dx}, ${y + dy}) doit être libre autour de la stèle, trouvé ${t && t.id}`);
    }
  }
  const dans = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  assert.ok(def.zones.some((z) => z.type === 'foret' && dans(z.rect)), 'la stèle est dans la forêt');
  assert.ok(def.zones.some((z) => def.foret_procedurale.zones_exclues.includes(z.type) && dans(z.rect)), 'dans une clairière déclarée');
  const t = def.tile_size;
  assert.ok((def.lumieres || []).some((l) => l.couleur && Math.abs(l.x - (x + 0.5) * t) <= t && Math.abs(l.y - (y + 0.5) * t) <= t),
    'un halo coloré sur la stèle : elle brille la nuit');
  // Invisible depuis le chemin : la même caméra que le jeu, le héros au centre
  // de chaque case de chemin de la scène.
  const halo = def.lumieres.find((l) => l.couleur && Math.abs(l.x - (x + 0.5) * t) <= t && Math.abs(l.y - (y + 0.5) * t) <= t);
  const pierre = empreinteAbsoluePuzzle(STELE, registre.obtenir('visuels', STELE.render.visuel), scene.poseEffectiveInteractif(STELE.id), t);
  const clairiere = def.zones.find((z) => def.foret_procedurale.zones_exclues.includes(z.type) && dans(z.rect)).rect;
  const aCacher = [
    ['la pierre', pierre],
    ['son halo', { x: halo.x - halo.rayon, y: halo.y - halo.rayon, w: 2 * halo.rayon, h: 2 * halo.rayon }],
    ['sa clairière', { x: clairiere.x * t, y: clairiere.y * t, w: clairiere.w * t, h: clairiere.h * t }],
  ];
  const chemin = registre.obtenir('tiles', 'tile_chemin').id;
  let casesChemin = 0;
  for (let cy = 0; cy < def.height; cy += 1) {
    for (let cx = 0; cx < def.width; cx += 1) {
      if (scene.tuileA(cx, cy).id !== chemin) continue;
      casesChemin += 1;
      const cam = calculerCamera({
        cibleX: (cx + 0.5) * t, cibleY: (cy + 0.5) * t, largeurScene: def.width * t, hauteurScene: def.height * t,
        largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
      });
      for (const [nom, r] of aCacher) {
        const vu = r.x < cam.x + RESOLUTION_LOGIQUE.largeur && r.x + r.w > cam.x && r.y < cam.y + RESOLUTION_LOGIQUE.hauteur && r.y + r.h > cam.y;
        assert.ok(!vu, `${nom} se voit depuis la case de chemin (${cx}, ${cy})`);
      }
    }
  }
  assert.ok(casesChemin > 0, 'la scène a un chemin');
  console.log(`OK clairière : huit voisines libres, dans la forêt, un halo dessus, invisible depuis les ${casesChemin} cases de chemin`);
}

// 4
{
  const neutre = { pressed: false, held: false };
  const etat = ({ interact = false, skill3 = false, menu = false } = {}) => ({
    move: { x: 0, y: 0 }, attack: neutre, skill_1: neutre, skill_2: neutre,
    skill_3: { pressed: skill3, held: skill3 }, consume: neutre,
    interact: { pressed: interact, held: interact }, menu: { pressed: menu, held: menu }, target_next: neutre,
  });
  let prochain = etat();
  let contacts = [];
  const save = saveNeuve();
  save.hero.scene = SCENE_ID;
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  const t = registre.obtenir('scenes', SCENE_ID).tile_size;
  // Juste sous la pierre, dans la clairière.
  save.hero.x = (STELE.position.x + 0.5) * t;
  save.hero.y = (STELE.position.y + 1.1) * t;
  const ouvertures = [];
  const i18n = creerI18n(dictionnaires, 'fr');
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => ouvertures.push('menu'), fermer: () => {} },
    input: { maj: () => { const e = prochain; prochain = etat(); return e; } },
    lireContactsTactiles: () => { const c = contacts; contacts = []; return c; },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const frame = (e = etat(), ms = 16) => { prochain = e; orch.maj(ms); };
  frame();
  assert.equal(orch.obtenirVueStele(), null);

  frame(etat({ interact: true }));
  assert.ok(orch.obtenirVueStele(), 'INTERACT à portée ouvre la vue de la stèle');
  assert.equal(orch.uiOuverteMaintenant(), true, 'une UI ouverte : le jeu gèle');
  frame(etat({ skill3: true }), 1);
  assert.ok(orch.obtenirVueStele(), 'B avant l\'armement ne ferme rien (l\'appui qui a ouvert ne referme pas)');
  frame(etat({ menu: true }));
  assert.deepEqual(ouvertures, [], 'MENU se tait tant que la stèle est ouverte');
  frame(etat(), STELE.armement_ms);
  assert.ok(orch.obtenirVueStele().particules.length > 0, 'les particules montent');

  // Les signes gravés sont ceux de l'écran Indices tant que l'indice ne se lit pas.
  save.hero.niveau = 1;
  const menuIllisible = orch.obtenirEntreesIndices().find((e) => e.id === STELE.indice);
  assert.equal(menuIllisible.lisible, false);
  assert.deepEqual(orch.contenuVueStele().lignes, menuIllisible.lignes, 'la pierre et le menu portent les mêmes signes');
  save.hero.niveau = 99;
  assert.deepEqual(orch.contenuVueStele().lignes, menuIllisible.lignes, 'une gravure ne se traduit pas avec le niveau');

  frame(etat({ skill3: true }));
  assert.equal(orch.obtenirVueStele(), null, 'B ferme la vue');

  frame(etat({ interact: true }));
  assert.ok(orch.obtenirVueStele(), 'elle se rouvre');
  frame(etat(), STELE.armement_ms + 16);
  contacts = [{ x: 10, y: 10 }];
  frame();
  assert.equal(orch.obtenirVueStele(), null, 'un toucher n\'importe où la ferme (seule sortie au doigt)');
  console.log('OK orchestrateur : INTERACT ouvre, jeu gelé, B / toucher ferment après l\'armement, MENU muet');
}

console.log('OK test_stele');

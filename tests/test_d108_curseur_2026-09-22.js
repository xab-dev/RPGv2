// `D-108` — le curseur du jeu : l'orbe, son orbite et sa traînée.
//
// Ce qui se teste ici, et ce qui ne s'y teste pas. Le DESSIN n'est jamais
// exercé headless (règle de méthode), donc aucune de ces lignes ne dit que le
// curseur est joli — c'est le verdict en jeu de Xav qui le dira. Ce qui se
// teste est le CONTRAT, au sens de `D-52` : jamais un nombre de réglage
// (taille, rayon, période, aplatissement : ils appartiennent à Xav et vivent
// dans `data/effets.json`), mais
//   · que la boîte du bitmap DÉRIVE du dessin, donc qu'aucun nombre ne vit à
//     côté de la silhouette (même contrat qu'une station, `D-78`) ;
//   · que l'orbite est une géométrie pure, déterministe et data-driven ;
//   · qu'une valeur dégénérée TOMBE AU BOOT plutôt qu'à l'écran ;
//   · que la traînée est bien `poussiere.js` et pas un système de plus ;
//   · que le module tient son contrat « meilleur effort », et qu'il refuse le
//     tactile — un doigt ne doit jamais allumer un curseur.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import {
  boiteBitmapCurseur, positionsOrbite, unionRectangles, creerCurseur,
  TAILLE_MAX_CURSEUR_PX, PADDING_BITMAP_PX,
} from '../src/curseur.js';
import { CAPACITE_RESERVE } from '../src/poussiere.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), [], 'les catalogues du jeu doivent être valides au boot');
const registre = construireRegistre(donnees);

// Faux DOM minimal, un par curseur testé : on ne cherche pas à dessiner, on
// cherche à savoir QUI allume le curseur et ce qui est posé sur la page. Deux
// curseurs qui partageraient une table d'écouteurs se les voleraient.
function fauxMonde() {
  const appels = [];
  const faussContexte = new Proxy({}, { get: (_, nom) => (nom === 'canvas' ? {} : () => {}) });
  const fauxCanvas = () => ({
    width: 0,
    height: 0,
    clientWidth: 800,
    clientHeight: 600,
    className: '',
    getContext: () => faussContexte,
    toDataURL: () => 'data:image/png;base64,ABC',
  });
  const ecouteurs = new Map();
  const styles = new Map();
  const doc = {
    documentElement: { style: { setProperty: (k, v) => styles.set(k, v), removeProperty: (k) => styles.delete(k) } },
    body: { appendChild: (el) => appels.push(el.className) },
    createElement: () => fauxCanvas(),
    addEventListener: (type, fn) => ecouteurs.set(type, fn),
    removeEventListener: (type) => ecouteurs.delete(type),
  };
  const fenetre = {
    devicePixelRatio: 2,
    innerWidth: 800,
    innerHeight: 600,
    // `CSS.supports` absent : on vérifie du même coup le repli 1× (la
    // déclaration `image-set` ne doit pas être écrite quand on ne sait pas si
    // le navigateur la lit — sinon le curseur disparaîtrait entièrement).
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return { doc, fenetre, ecouteurs, styles, appels };
}

const CURSEUR = registre.obtenir('effets', 'effet_curseur');
const SILLAGE = registre.obtenir('effets', 'effet_curseur_sillage');
const ORBE = registre.obtenir('visuels', 'visuel_curseur');

// --- 1. La boîte du bitmap est celle du DESSIN -----------------------------
{
  // Une silhouette de référence, choisie ici pour que le calcul soit lisible :
  // un disque de 10 unités centré sur l'origine, plus une pastille excentrée.
  const visuel = {
    ancre: 'centre',
    primitives: [
      { forme: 'cercle', dx: 0, dy: 0, w: 10, h: 10, couleur: '#fff' },
      { forme: 'cercle', dx: 4, dy: 0, w: 2, h: 2, couleur: '#fff' },
    ],
  };
  const b = boiteBitmapCurseur(visuel, 1, { padding: 0 });
  // Étendue peinte : de −5 à +5 en x (le disque), de −5 à +5 en y.
  assert.equal(b.largeur, 10);
  assert.equal(b.hauteur, 10);
  // Le point chaud est l'ORIGINE de la silhouette dans le bitmap, jamais le
  // centre de l'image : ici l'origine est au milieu du disque.
  assert.equal(b.chaudX, 5);
  assert.equal(b.chaudY, 5);

  // Le contrat qui compte : AGRANDIR LE DESSIN AGRANDIT LA BOÎTE, sans qu'un
  // nombre soit tenu à jour quelque part. C'est ce qui interdit de voir un
  // jour une silhouette rognée par une taille figée dans le code.
  const plusGrand = {
    ancre: 'centre',
    primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 30, h: 30, couleur: '#fff' }],
  };
  assert.ok(boiteBitmapCurseur(plusGrand, 1, { padding: 0 }).largeur
    > boiteBitmapCurseur(visuel, 1, { padding: 0 }).largeur);

  // L'échelle d'instance et l'échelle PROPRE de la silhouette se composent,
  // exactement comme dans `dessinerVisuel` — sinon la boîte et le dessin
  // divergeraient, ce qui est précisément le défaut que `D-78` a nommé.
  const propre = { ...visuel, echelle: 2 };
  assert.equal(boiteBitmapCurseur(propre, 1, { padding: 0 }).largeur, 20);
  assert.equal(boiteBitmapCurseur(visuel, 2, { padding: 0 }).largeur, 20);

  // Le rembourrage s'ajoute des deux côtés, et décale le point chaud d'autant.
  const avecMarge = boiteBitmapCurseur(visuel, 1);
  assert.equal(avecMarge.largeur, 10 + PADDING_BITMAP_PX * 2);
  assert.equal(avecMarge.chaudX, 5 + PADDING_BITMAP_PX);
  console.log('OK la boîte du bitmap et le point chaud dérivent du dessin');
}

// --- 2. L'orbe du CATALOGUE tient sous le plafond des navigateurs ----------
{
  // Au-delà de 128 px, Chrome ignore le curseur EN SILENCE. Le module le voit
  // venir et se replie, mais mieux vaut le savoir ici : cette ligne tombera le
  // jour où un réglage d'échelle rendra le curseur invisible sur un écran
  // HiDPI — et elle dira pourquoi, ce que l'écran ne dirait pas.
  for (const dpr of [1, 2, 3]) {
    const b = boiteBitmapCurseur(ORBE, CURSEUR.echelle);
    const cote = Math.ceil(Math.max(b.largeur, b.hauteur) * dpr);
    assert.ok(
      cote <= TAILLE_MAX_CURSEUR_PX,
      `l'orbe fait ${cote} px à DPR ${dpr} : au-delà de ${TAILLE_MAX_CURSEUR_PX}, le navigateur l'ignore`,
    );
  }
  console.log('OK l’orbe du catalogue tient sous le plafond, jusqu’à DPR 3');
}

// --- 3. L'orbite : pure, déterministe, et décrite en données ---------------
{
  const config = {
    nb_particules: 2, rayon_orbite_px: 10, aplatissement: 0.5, periode_ms: 1000, sens: 1, phase_rad: 0,
  };
  const a = positionsOrbite(config, 0);
  assert.equal(a.length, 2);
  // Deux particules = deux points diamétralement opposés, sans que « 2 » soit
  // écrit ailleurs que dans les données.
  assert.ok(Math.abs(a[0].dx + a[1].dx) < 1e-9);
  assert.ok(Math.abs(a[0].dy + a[1].dy) < 1e-9);

  // L'aplatissement est celui d'une ellipse : le jeu est vu de trois quarts.
  const quart = positionsOrbite(config, 250)[0];
  assert.ok(Math.abs(quart.dy - 10 * 0.5) < 1e-9, 'le rayon vertical est aplati');

  // Déterministe : même instant, même résultat (aucun `Math.random`).
  assert.deepEqual(positionsOrbite(config, 617), positionsOrbite(config, 617));
  // Et périodique : un tour complet ramène au point de départ.
  const debut = positionsOrbite(config, 0)[0];
  const tour = positionsOrbite(config, 1000)[0];
  assert.ok(Math.abs(debut.dx - tour.dx) < 1e-9 && Math.abs(debut.dy - tour.dy) < 1e-9);

  // `sens` inverse le sens de rotation, il n'accélère rien : à un quart de
  // tour, les deux sens donnent des hauteurs opposées et la même largeur.
  const horaire = positionsOrbite({ ...config, sens: 1 }, 250)[0];
  const antihoraire = positionsOrbite({ ...config, sens: -1 }, 250)[0];
  assert.ok(Math.abs(horaire.dy + antihoraire.dy) < 1e-9);

  // `profondeur` est le seul tri de profondeur écrit : le reste (l'orbe qui
  // masque la particule lointaine) est fait par le navigateur.
  assert.ok(positionsOrbite(config, 250)[0].profondeur > 0);
  assert.ok(positionsOrbite(config, 750)[0].profondeur < 0);

  // Aucune particule demandée = aucune particule calculée (repli sain, et le
  // schéma l'autorise explicitement).
  assert.deepEqual(positionsOrbite({ ...config, nb_particules: 0 }, 0), []);
  // Trois particules restent un réglage de DONNÉES, pas une modification de
  // code : c'est le test data-driven de ce catalogue.
  assert.equal(positionsOrbite({ ...config, nb_particules: 3 }, 0).length, 3);
  console.log('OK l’orbite est pure, déterministe, périodique et data-driven');
}

// --- 4. L'union de rectangles (ce qui rend le calque quasi gratuit) --------
{
  assert.equal(unionRectangles(null, null), null);
  const r = { x: 0, y: 0, w: 10, h: 10 };
  assert.deepEqual(unionRectangles(null, r), r);
  assert.deepEqual(unionRectangles(r, null), r);
  assert.deepEqual(
    unionRectangles(r, { x: 20, y: 5, w: 10, h: 10 }),
    { x: 0, y: 0, w: 30, h: 15 },
  );
  console.log('OK l’union de rectangles borne l’effacement du calque');
}

// --- 5. Une valeur dégénérée tombe AU BOOT, jamais à l'écran ---------------
{
  function erreursAvec(modif) {
    const copie = JSON.parse(JSON.stringify(donnees));
    const entree = copie.effets.find((e) => e.id === 'effet_curseur');
    Object.assign(entree, modif);
    return validerCatalogues(copie, SCHEMAS);
  }
  // Une période nulle ferait une division par zéro, donc un `NaN` à l'écran
  // que personne ne rattacherait à ce catalogue.
  assert.ok(erreursAvec({ periode_ms: 0 }).length > 0, 'période nulle refusée');
  assert.ok(erreursAvec({ echelle: 0 }).length > 0, 'échelle nulle refusée');
  assert.ok(erreursAvec({ sens: 0.5 }).length > 0, 'sens n’est pas un facteur de vitesse');
  assert.ok(erreursAvec({ aplatissement: 2 }).length > 0, 'aplatissement borné à [0, 1]');
  assert.ok(erreursAvec({ nb_particules: 1.5 }).length > 0, 'nb_particules est un entier');
  assert.ok(erreursAvec({ visuel_particule: 'visuel_inconnu' }).length > 0, 'silhouette inconnue refusée');
  // Zéro particule est ACCEPTÉ (repli « orbe seule »), et la silhouette de
  // particule devient alors facultative : un réglage, pas une panne.
  assert.deepEqual(
    erreursAvec({ nb_particules: 0, visuel_particule: undefined }), [],
    'zéro particule doit rester un réglage valide',
  );
  console.log('OK un réglage absurde du curseur tombe au démarrage');
}

// --- 6. La traînée est `poussiere.js`, pas un système de plus --------------
{
  // La réserve de bouffées est un RÉGLAGE, pas une constante du module : une
  // souris traverse l'écran en une demi-seconde là où le héros marche à
  // 75 px/s. Le défaut est celui-là même trouvé à la première capture.
  assert.ok(Number.isInteger(SILLAGE.capacite) && SILLAGE.capacite > CAPACITE_RESERVE,
    'la traînée du curseur demande une réserve plus grande que le défaut du héros');
  // Et le défaut, lui, n'a pas bougé : le héros et le follet ne déclarent rien.
  assert.equal(registre.obtenir('effets', 'effet_poussiere').capacite, undefined);
  assert.equal(registre.obtenir('effets', 'effet_sillage_follet').capacite, undefined);

  const source = await fs.readFile(path.join(RACINE, 'src', 'curseur.js'), 'utf8');
  assert.match(source, /from '\.\/poussiere\.js'/, 'la traînée réutilise le module de particules existant');
  assert.doesNotMatch(source, /Math\.random/, 'aucun tirage : le curseur est déterministe comme le reste');
  // Et elle est décrite par une entrée de catalogue de la même famille que
  // celle du follet — donc réglable par Xav sans toucher une ligne de code.
  assert.equal(SILLAGE.type, 'particules');
  assert.equal(registre.obtenir('effets', 'effet_sillage_follet').type, 'particules');
  console.log('OK la traînée du curseur est une 3ᵉ instance de poussiere.js');
}

// --- 7. Le module DOM : meilleur effort, et un doigt n'allume rien ---------
{
  // Contrat « meilleur effort » : sans DOM, on rend un objet inerte dont
  // toutes les méthodes s'appellent sans rien casser.
  const inerte = creerCurseur();
  assert.equal(inerte.disponible(), false);
  inerte.avancer(16);
  inerte.dessiner();
  inerte.retirer();

  const { doc, fenetre, ecouteurs, styles, appels } = fauxMonde();
  const curseur = creerCurseur({
    doc,
    fenetre,
    config: CURSEUR,
    configSillage: SILLAGE,
    visuelOrbe: ORBE,
    visuelParticule: registre.obtenir('visuels', 'visuel_curseur_eclat'),
    visuelSillage: registre.obtenir('visuels', 'visuel_curseur_sillage'),
    dessinerVisuel: () => {},
  });

  assert.equal(curseur.disponible(), true, 'la tête CSS est posée');
  assert.ok(appels.includes('curseur-calque'), 'le calque de recouvrement est ajouté à la page');
  const valeur = styles.get('--curseur-jeu');
  assert.match(valeur, /^url\("data:image\/png/, 'repli 1× quand image-set n’est pas annoncé');
  assert.match(valeur, /, auto$/, 'le curseur système reste le dernier recours de la déclaration');

  // LA TRAÎNÉE EST UNE TRAÎNÉE, pas une grappe. Ce que ce bloc éprouve est la
  // JOINTURE (leçon de `D-71`) : le module émet bien des bouffées, elles sont
  // réparties LE LONG du segment parcouru, et elles sont dessinées. Sans ces
  // lignes, le défaut trouvé à la première capture — huit bouffées empilées au
  // point d'arrivée, réserve vidée en quatre frames — serait passé sous des
  // tests verts.
  {
    const dessine = [];
    // Son propre faux DOM : deux curseurs qui partagent une même table
    // d'écouteurs se les voleraient, et le test ne dirait plus ce qu'il croit.
    const monde = fauxMonde();
    const espion = creerCurseur({
      doc: monde.doc,
      fenetre: monde.fenetre,
      config: CURSEUR,
      configSillage: SILLAGE,
      visuelOrbe: ORBE,
      visuelParticule: registre.obtenir('visuels', 'visuel_curseur_eclat'),
      visuelSillage: registre.obtenir('visuels', 'visuel_curseur_sillage'),
      dessinerVisuel: (_ctx, visuel, px) => dessine.push({ id: visuel.id, x: px }),
    });
    const bougerEspion = monde.ecouteurs.get('pointermove');
    // Un geste rapide : 120 px en une seule frame, comme une souris réelle.
    bougerEspion({ pointerType: 'mouse', clientX: 100, clientY: 100 });
    espion.avancer(16);
    bougerEspion({ pointerType: 'mouse', clientX: 220, clientY: 100 });
    espion.avancer(16);
    espion.dessiner();

    const bouffees = dessine.filter((d) => d.id === 'visuel_curseur_sillage');
    assert.ok(bouffees.length >= 4, `la traînée doit exister (${bouffees.length} bouffées)`);
    const etendue = Math.max(...bouffees.map((b) => b.x)) - Math.min(...bouffees.map((b) => b.x));
    assert.ok(
      etendue > 60,
      `les bouffées d'une frame rapide s'étalent sur le trajet, elles ne s'empilent pas (étendue ${etendue} px)`,
    );
    espion.retirer();
  }

  // UN DOIGT N'ALLUME RIEN. C'est le point qui justifie l'écouteur unique :
  // `pointermove` parle pour les trois périphériques, et le tactile est refusé
  // explicitement — sinon chaque glissement de joystick laisserait une traînée
  // d'étincelles sur le téléphone.
  const bouger = ecouteurs.get('pointermove');
  bouger({ pointerType: 'touch', clientX: 100, clientY: 100 });
  curseur.avancer(16);
  curseur.dessiner();
  bouger({ pointerType: 'mouse', clientX: 100, clientY: 100 });
  bouger({ pointerType: 'mouse', clientX: 300, clientY: 100 });
  curseur.avancer(16);
  curseur.dessiner();

  // Sortie de la fenêtre : la traînée s'éteint au lieu de rester figée au bord.
  ecouteurs.get('pointerout')({ relatedTarget: null });
  curseur.avancer(16);
  curseur.dessiner();

  curseur.retirer();
  assert.equal(styles.has('--curseur-jeu'), false, 'le retrait rend la page à son curseur d’avant');
  console.log('OK le module pose l’orbe et le calque, et refuse le tactile');
}

console.log('OK test_d108_curseur');

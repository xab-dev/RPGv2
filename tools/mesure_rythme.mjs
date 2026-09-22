// `R-19` — combien de temps de JEU faut-il pour atteindre un niveau, et d'où
// vient l'XP ? (T0 de `docs/BRIEF_file-inventaire_2026-09-22.md`)
//
// Pourquoi un outil et pas un test : rien ici n'est un contrat. C'est un
// INSTRUMENT, du même genre que `?debug=fps` — il rend des chiffres qu'on
// compare AVANT et APRÈS un ticket d'équilibrage, et aucun de ces chiffres
// n'a vocation à devenir une assertion (règle `D-52` : un test n'épingle
// jamais une valeur de réglage).
//
// Ce qu'il simule : un joueur « vétéran » qui connaît la carte et va en ligne
// droite vers ce qu'il sait rentable — ramasser tout ce qui est au sol,
// récolter dès que l'outil est en poche, boire quand il a soif, fabriquer dès
// qu'il peut. C'est volontairement le pire cas pour l'équilibrage : si le
// rythme tient contre ce joueur-là, il tient contre les autres.
//
// Ce qu'il ne simule PAS, et il faut le lire avec : il ne se bat pas (l'XP de
// combat apparaît donc sous « autre », et vaut zéro tant qu'un monstre ne le
// frappe pas), il ne meurt pas volontairement, il ne trie rien au coffre.
//
// Le TEMPS mesuré est le temps de jeu actif — celui que `maj()` fait avancer.
// Un déplacement coûte sa distance divisée par la vitesse réelle du héros
// (stat dérivée, donc la mesure suit `D-33` et le modulateur de survie sans
// rien recopier). Il n'y a pas de pathfinding : la ligne droite est
// exactement ce qu'un vétéran prend.
//
// Usage : node tools/mesure_rythme.mjs [niveauCible] [minutesMax]

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { phaseAHeure } from '../src/daynight.js';

const NIVEAU_CIBLE = Number(process.argv[2] || 15);
const MINUTES_MAX = Number(process.argv[3] || 240);
const PAS_MS = 16;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
if (erreurs.length) throw new Error(erreurs.join('\n'));
const problemes = validerCatalogues(donnees);
if (problemes.length) throw new Error(problemes.join('\n'));

const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const save = saveNeuve();
save.hero.scene = 'scene_maison_exterieur';
save.hero.companion = 'comp_follet_eau';
save.hero.pv = 40;
// La Grotte est derrière nous : ce qu'on mesure est le rythme de la Région
// Maison. `flag_premier_ramassage` est posé d'avance pour la même raison que
// dans le bot de la boucle 5 min — son dialogue gèlerait le temps actif.
save.flags = {
  flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
  flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
};

let entreesCraft = null;
let entreesCoffre = null;
const menu = {
  estOuvert: () => false,
  traiterInput: () => {}, ouvrir: () => {},
  ouvrirCraft: (obtenir) => { entreesCraft = obtenir; },
  rafraichirCraft: () => {},
  ouvrirCoffre: (obtenir) => { entreesCoffre = obtenir; },
  rafraichirCoffre: () => {},
  rafraichirStats: () => {},
};
const dialogue = creerDialogue();

function etatNeutre(interact = false) {
  const bouton = (p) => ({ pressed: p, held: p });
  return {
    move: { x: 0, y: 0 }, attack: bouton(false), skill_1: bouton(false),
    skill_2: bouton(false), skill_3: bouton(false), consume: bouton(false),
    interact: bouton(interact), menu: bouton(false), target_next: bouton(false),
  };
}

let etatCourant = etatNeutre();
const input = { maj: () => etatCourant };
const orch = creerOrchestrateurGrotte({
  registre, i18n, save, store: creerStoreMemoire(), dialogue, menu, input,
  ctxLogique: null, ctxVisible: null, canvasLogique: null,
});
const scene = orch.obtenirScene();
const hero = orch.obtenirHero();

// --- L'instrument lui-même ------------------------------------------------
// Le temps est la somme des deltas RÉELLEMENT passés à `maj()` : c'est
// exactement ce que le jeu appelle « temps actif », et c'est ce que le cycle
// jour/nuit, les cooldowns et les jauges de survie lisent aussi.
let tempsMs = 0;
const parSource = { recolte_sol: 0, recolte_outil: 0, puits: 0, craft: 0, autre: 0 };
const jalons = []; // un par niveau franchi

function noterNiveau() {
  while (jalons.length < save.hero.niveau - 1) {
    jalons.push({
      niveau: jalons.length + 2, tempsMs, jour: save.monde.jour,
      phase: phaseAHeure(save.monde.heure),
    });
  }
}

function avancer(ms) {
  for (let t = 0; t < ms; t += PAS_MS) {
    etatCourant = etatNeutre();
    orch.maj(PAS_MS);
    tempsMs += PAS_MS;
  }
  if (process.env.RPG_RYTHME_TRACE) {
    process.stderr.write(`\r${(tempsMs / 60000).toFixed(1)} min — Nv.${save.hero.niveau} — jour ${save.monde.jour}   `);
  }
}

// Le temps de jeu est la ressource que la mesure consomme : une fois la borne
// atteinte, on ne continue pas un tour entamé.
function tempsEcoule() {
  return tempsMs >= MINUTES_MAX * 60000;
}

// Une action = un appui INTERACT, puis une frame de relâche (le jeu lit des
// fronts montants). L'XP gagnée pendant ces deux frames est attribuée à la
// source que l'appelant nomme — c'est la seule attribution possible sans
// instrumenter le crédit d'XP lui-même, et elle est exacte tant que le bot ne
// fait qu'une chose à la fois.
function agir(source) {
  const avant = save.hero.xp;
  etatCourant = etatNeutre(true);
  orch.maj(PAS_MS);
  etatCourant = etatNeutre();
  orch.maj(PAS_MS);
  tempsMs += 2 * PAS_MS;
  parSource[source] += save.hero.xp - avant;
  noterNiveau();
}

// Marcher coûte du temps, et c'est tout l'intérêt de la mesure : sans lui, un
// vétéran atteindrait le Nv.15 en zéro minute. La vitesse vient de la stat
// dérivée réelle (donc du modulateur de survie et de `D-33`), jamais d'une
// constante recopiée ici.
function marcherVers(x, y) {
  const distance = Math.hypot(x - hero.x, y - hero.y);
  const vitesse = vitesseHeroPxS();
  const avant = save.hero.xp;
  avancer(Math.round((distance / vitesse) * 1000));
  hero.x = x;
  hero.y = y;
  parSource.autre += save.hero.xp - avant;
  noterNiveau();
}

// La vitesse réelle, relue dans le catalogue des dérivées : la formule vit en
// données (`stats_derivees.json`), on ne recopie pas un nombre ici.
function vitesseHeroPxS() {
  const derivee = registre.obtenir('stats_derivees', 'derivee_vitesse_deplacement_px_s');
  return derivee.formule.base;
}

// --- Ce que le vétéran sait faire ----------------------------------------

function itemsAuSol() {
  const table = save.monde.items_sol[scene.id] || {};
  return Object.entries(table)
    .flatMap(([itemId, positions]) => positions.map((p) => ({ itemId, x: p.x, y: p.y })));
}

function tuilesRessource(ressourceId) {
  const liste = [];
  for (let ty = 0; ty < scene.height; ty++) {
    for (let tx = 0; tx < scene.width; tx++) {
      const tuile = scene.tuileA(tx, ty);
      if (tuile && tuile.ressource === ressourceId) liste.push({ tx, ty });
    }
  }
  return liste;
}

function positionInteraction(idPuzzle) {
  const empreinte = scene.empreintesSolides.find((e) => e.id === idPuzzle);
  if (!empreinte) return null;
  return { x: empreinte.x - 20, y: empreinte.y + empreinte.h / 2 };
}

const CIBLES_RESSOURCE = [
  { ressource: 'res_bois', outil: 'item_hache' },
  { ressource: 'res_pierre', outil: 'item_pioche' },
];
const tuilesParRessource = Object.fromEntries(
  CIBLES_RESSOURCE.map(({ ressource }) => [ressource, tuilesRessource(ressource)]),
);

// Fabrique tout ce qui est fabricable à une station, tant que quelque chose
// l'est — un vétéran ne repart pas en laissant une recette disponible.
function fabriquerTout(idStation) {
  const position = positionInteraction(idStation);
  if (!position) return;
  marcherVers(position.x, position.y);
  let fabrique = true;
  while (fabrique) {
    fabrique = false;
    entreesCraft = null;
    etatCourant = etatNeutre(true);
    orch.maj(PAS_MS);
    etatCourant = etatNeutre();
    orch.maj(PAS_MS);
    tempsMs += 2 * PAS_MS;
    if (!entreesCraft) return;
    for (const entree of entreesCraft()) {
      if (entree.grisee) continue;
      const avant = save.hero.xp;
      entree.action();
      parSource.craft += save.hero.xp - avant;
      noterNiveau();
      fabrique = true;
    }
  }
}

// Vider sa poche au coffre : le geste qui fait la différence entre un joueur
// qui découvre et un vétéran. Sans lui, la poche bute sur `stack_max` (20) et
// la récolte s'arrête d'elle-même — ce qui donnerait un rythme flatteur, et
// FAUX. Le bot dépose tout ce qui n'est ni outil ni arme.
function viderAuCoffre() {
  const position = positionInteraction('station_coffre');
  if (!position) return;
  marcherVers(position.x, position.y);
  entreesCoffre = null;
  etatCourant = etatNeutre(true);
  orch.maj(PAS_MS);
  etatCourant = etatNeutre();
  orch.maj(PAS_MS);
  tempsMs += 2 * PAS_MS;
  if (!entreesCoffre) return;
  const prefixeDepot = i18n.t('menu.coffre_deposer');
  // Une entrée transfère UNE unité : on redemande la liste tant qu'un dépôt
  // reste possible, plutôt que de supposer ce que le transfert a fait.
  let depose = true;
  let garde = 0;
  while (depose && garde < 500) {
    depose = false;
    for (const entree of entreesCoffre()) {
      if (!entree.texte.startsWith(prefixeDepot) || entree.grisee) continue;
      entree.action();
      depose = true;
      garde += 1;
      break;
    }
  }
}

function pocheSaturee() {
  return Object.entries(save.inventaire.items).some(([itemId, qte]) => {
    const itemDef = registre.obtenir('items', itemId);
    return itemDef.categorie === 'ressource' && qte >= itemDef.stack_max;
  });
}

const puits = positionInteraction('station_puits');

// --- La journée du vétéran ------------------------------------------------
while (save.hero.niveau < NIVEAU_CIBLE && tempsMs < MINUTES_MAX * 60000) {
  const tempsAuDebutDuTour = tempsMs;
  const xpAuDebutDuTour = save.hero.xp;

  // 1. Tout ce qui est au sol, du plus proche au plus loin.
  let sol = itemsAuSol();
  while (sol.length && !tempsEcoule()) {
    sol.sort((a, b) => Math.hypot(a.x - hero.x, a.y - hero.y) - Math.hypot(b.x - hero.x, b.y - hero.y));
    const cible = sol[0];
    marcherVers(cible.x, cible.y);
    agir('recolte_sol');
    let restant = itemsAuSol();
    // Le ramassage n'a rien retiré du sol : la pile est pleine. Un vétéran va
    // vider au coffre et revient — s'il échoue encore, c'est que quelque
    // chose d'autre bloque, et on arrête plutôt que de tourner en rond.
    if (restant.length >= sol.length) {
      viderAuCoffre();
      marcherVers(cible.x, cible.y);
      agir('recolte_sol');
      restant = itemsAuSol();
      if (restant.length >= sol.length) break;
    }
    sol = restant;
    if (tempsMs - tempsAuDebutDuTour > 30 * 60000) break;
  }

  // 2. Les tuiles-ressources, pour chaque outil en poche.
  for (const { ressource, outil } of CIBLES_RESSOURCE) {
    if (!(save.inventaire.items[outil] > 0)) continue;
    for (const { tx, ty } of tuilesParRessource[ressource]) {
      if (tempsEcoule()) break;
      // Une pile pleine rend la récolte muette ET consomme quand même le
      // cooldown de la tuile (`D-28`) : un vétéran ne se laisse pas faire, il
      // va vider avant de frapper le prochain arbre.
      if (pocheSaturee()) viderAuCoffre();
      marcherVers((tx + 0.5) * scene.tileSize, (ty + 0.5) * scene.tileSize + 20);
      agir('recolte_outil');
    }
  }

  // 3. Boire, quand la soif a bougé (sinon le puits ne rapporte rien).
  if (puits && save.survie.jauge_soif < 1) {
    marcherVers(puits.x, puits.y);
    agir('puits');
  }

  // 4. Fabriquer : l'atelier, puis la cuisine.
  fabriquerTout('station_atelier');
  fabriquerTout('station_table');

  // 4 bis. Vider ce qui sature la poche, pour pouvoir récolter encore.
  if (pocheSaturee()) viderAuCoffre();

  // 5. Le tour n'a RIEN rapporté : il n'y a plus rien à faire aujourd'hui, on
  // attend le repos du jour, qui resème la carte. Tant qu'un tour rapporte
  // quelque chose, on enchaîne — c'est ce qui fait le vétéran : les tuiles
  // qu'il vient de récolter ont eu le temps de recharger pendant qu'il
  // faisait le tour des autres, et il ne s'arrête donc jamais.
  const tourImproductif = save.hero.xp === xpAuDebutDuTour;
  if (tourImproductif && save.hero.niveau < NIVEAU_CIBLE && tempsMs < MINUTES_MAX * 60000) {
    const jourAvant = save.monde.jour;
    let garde = 0;
    while (save.monde.jour === jourAvant && garde < 25 * 60000) {
      avancer(5000);
      garde += 5000;
    }
  }
}

// --- Le relevé ------------------------------------------------------------
const minutes = (ms) => (ms / 60000).toFixed(1);
const total = Object.values(parSource).reduce((a, b) => a + b, 0);

console.log('\nR-19 — rythme de progression, joueur « vétéran » (ligne droite, tout ramassé)\n');
console.log(`Niveau atteint : ${save.hero.niveau} (cible ${NIVEAU_CIBLE})`);
console.log(`Temps de jeu actif : ${minutes(tempsMs)} min — jour ${save.monde.jour}, phase « ${phaseAHeure(save.monde.heure)} »`);
console.log(`XP totale : ${save.hero.xp}\n`);

console.log('Niveau | temps (min) | jour | phase');
for (const j of jalons) {
  console.log(`  ${String(j.niveau).padStart(4)} | ${String(minutes(j.tempsMs)).padStart(11)} | ${String(j.jour).padStart(4)} | ${j.phase}`);
}

console.log("\nD'où vient l'XP :");
for (const [source, xp] of Object.entries(parSource)) {
  const part = total > 0 ? ((xp / total) * 100).toFixed(1) : '0.0';
  console.log(`  ${source.padEnd(14)} ${String(xp).padStart(6)} xp  (${part} %)`);
}

// La première nuit : le seuil du Chaos (Nv.5) ne doit pas tomber avant elle.
const premiereNuitMs = 690000; // jour (600 s) + crépuscule (90 s)
const niveauPremiereNuit = jalons.filter((j) => j.tempsMs <= premiereNuitMs).length + 1;
console.log(`\nNiveau à la tombée de la première nuit (${minutes(premiereNuitMs)} min) : ${niveauPremiereNuit}`);

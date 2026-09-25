// Comportement des monstres du Chaos (specs/07_chaos-nocturne.md §2.3,
// palier C) : « un domaine, pas un piquet ». Machine à états PURE — elle ne
// déplace rien, elle dit seulement *où le monstre veut aller* et *à quelle
// fraction de sa vitesse*. L'appelant (main.js) fait le mouvement avec ses
// propres fonctions, collisions comprises.
//
// Trois états, et rien d'autre :
//   errance    : sans cible, le monstre va d'un point au hasard de son
//                domaine à un autre, lentement, avec des pauses ;
//   poursuite  : il a repéré le joueur et le suit — mais la poursuite est
//                bornée depuis LE POINT OÙ IL L'A REPÉRÉ, jamais depuis sa
//                naissance : on peut donc l'attirer loin de son domaine, mais
//                pas indéfiniment, et il n'y va jamais de lui-même ;
//   desinteret : il vient d'abandonner (distance, demi-tour, ou blocage) et
//                ignore le joueur quelques secondes avant de repartir errer.
//
// Deux règles transversales, qui valent dans tous les états :
//   - **demi-tour en lisière de zone sûre** : la condition porte sur la
//     PROCHAINE POSITION DU MONSTRE, jamais sur celle du joueur (§2.3 règle
//     4). Un joueur réfugié dans le Jardin n'est pas « protégé par une règle
//     qui le regarde » : c'est le monstre qui refuse d'entrer ;
//   - **anti-blocage** : s'il n'avance plus depuis `blocage_ms`, il change
//     d'idée. Aucune recherche de chemin dans cette spec — un monstre coincé
//     contre un arbre choisit une autre destination, il ne calcule pas de
//     contournement.

export const ETAT_ERRANCE = 'errance';
export const ETAT_POURSUITE = 'poursuite';
export const ETAT_DESINTERET = 'desinteret';

// Un but est « atteint » à moins de ça : sans tolérance, un monstre tournerait
// indéfiniment autour du pixel exact de sa destination.
const TOLERANCE_BUT_PX = 6;
// Déplacement en dessous duquel on considère qu'il n'a pas avancé (frame à
// frame, un monstre qui glisse le long d'un mur bouge de très peu mais bouge).
const SEUIL_IMMOBILE_PX = 0.4;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function creerComportement() {
  return {
    etat: ETAT_ERRANCE,
    but: null, // { x, y } en pixels monde, ou null = immobile (en pause)
    pauseMs: 0,
    // Point de repérage : origine de la poursuite bornée. Mis à la position
    // DU MONSTRE au moment où il repère, jamais à celle du joueur.
    reperageX: 0,
    reperageY: 0,
    desinteretMs: 0,
    blocageMs: 0,
  };
}

// Durée de pause tirée dans l'intervalle déclaré en données.
function tirerPause(table, alea) {
  const e = table.errance;
  if (!e) return 0;
  return e.pause_ms_min + alea() * (e.pause_ms_max - e.pause_ms_min);
}

function facteurErrance(table) {
  return table.errance && typeof table.errance.facteur_vitesse === 'number' ? table.errance.facteur_vitesse : 1;
}

function partirEnDesinteret(c, table, but) {
  return { ...c, etat: ETAT_DESINTERET, desinteretMs: table.desinteret_ms, blocageMs: 0, pauseMs: 0, but };
}

// Une frame de décision. Rend le comportement suivant ET ce que l'appelant
// doit en faire : `but` (où aller, ou null = ne pas bouger) et
// `facteurVitesse` (1 en poursuite, celui des données en errance).
//
// `ctx` :
//   deltaMs, monstre {x,y}, hero {x,y}, table (entrée de spawns.json),
//   tileSize,
//   distanceParcouruePx : de combien il a bougé depuis la frame précédente
//     (l'appelant le sait : c'est lui qui a appliqué le mouvement),
//   entrerait EnZoneSure(x, y) : « cette position est-elle en zone sûre ? »,
//   tirerPointDomaine() : un point au hasard du domaine, ou null,
//   alea() : PRNG injecté.
export function avancerComportement(c, ctx) {
  const {
    deltaMs, monstre, hero, table, tileSize,
    distanceParcouruePx = 0, estEnZoneSure, tirerPointDomaine, alea,
  } = ctx;

  let suivant = { ...c };

  // --- 1. Demi-tour en lisière de zone sûre -----------------------------
  // Évalué sur la position vers laquelle il irait cette frame. Prioritaire
  // sur tout le reste : même en pleine poursuite, il renonce.
  if (suivant.but || suivant.etat === ETAT_POURSUITE) {
    const cibleX = suivant.etat === ETAT_POURSUITE ? hero.x : suivant.but.x;
    const cibleY = suivant.etat === ETAT_POURSUITE ? hero.y : suivant.but.y;
    const dx = cibleX - monstre.x;
    const dy = cibleY - monstre.y;
    const norme = Math.hypot(dx, dy);
    if (norme > 0) {
      // Un pas d'une demi-tuile devant lui : assez pour voir venir la
      // frontière sans qu'il s'arrête trois tuiles trop tôt.
      const pas = tileSize / 2;
      const prochainX = monstre.x + (dx / norme) * pas;
      const prochainY = monstre.y + (dy / norme) * pas;
      if (estEnZoneSure(prochainX, prochainY)) {
        // Il repart vers son domaine : il ne reste pas planté à la bordure.
        return {
          comportement: partirEnDesinteret(suivant, table, tirerPointDomaine()),
          but: null,
          facteurVitesse: facteurErrance(table),
          demiTour: true,
        };
      }
    }
  }

  // --- 2. Anti-blocage ---------------------------------------------------
  const voulaitAvancer = suivant.etat === ETAT_POURSUITE || (suivant.but !== null && suivant.pauseMs <= 0);
  if (voulaitAvancer && distanceParcouruePx < SEUIL_IMMOBILE_PX) {
    suivant.blocageMs += deltaMs;
  } else {
    suivant.blocageMs = 0;
  }
  if (suivant.blocageMs >= table.blocage_ms) {
    suivant.blocageMs = 0;
    if (suivant.etat === ETAT_POURSUITE) {
      // Coincé en poursuivant : il lâche l'affaire (et ne rejoue pas la
      // détection tout de suite, sinon il se recoincerait aussitôt).
      return {
        comportement: partirEnDesinteret(suivant, table, tirerPointDomaine()),
        but: null,
        facteurVitesse: facteurErrance(table),
        bloque: true,
      };
    }
    suivant.but = tirerPointDomaine();
    suivant.pauseMs = 0;
    return { comportement: suivant, but: suivant.but, facteurVitesse: facteurErrance(table), bloque: true };
  }

  // --- 3. Désintérêt : il ignore le joueur le temps de se calmer ---------
  if (suivant.etat === ETAT_DESINTERET) {
    suivant.desinteretMs -= deltaMs;
    if (suivant.desinteretMs > 0) {
      if (!suivant.but) suivant.but = tirerPointDomaine();
      return { comportement: suivant, but: suivant.but, facteurVitesse: facteurErrance(table) };
    }
    suivant.etat = ETAT_ERRANCE;
    suivant.desinteretMs = 0;
  }

  // --- 4. Poursuite en cours : bornée depuis le point de repérage --------
  if (suivant.etat === ETAT_POURSUITE) {
    const parcourue = distance(monstre.x, monstre.y, suivant.reperageX, suivant.reperageY);
    if (parcourue > table.poursuite_max_tuiles * tileSize) {
      return {
        comportement: partirEnDesinteret(suivant, table, tirerPointDomaine()),
        but: null,
        facteurVitesse: facteurErrance(table),
        abandon: true,
      };
    }
    return { comportement: suivant, but: { x: hero.x, y: hero.y }, facteurVitesse: 1 };
  }

  // --- 5. Détection ------------------------------------------------------
  // `detection_tuiles` est une donnée : que la spec ne l'ait pas chiffrée ne
  // justifie pas de l'écrire ici.
  const detection = (table.detection_tuiles || 0) * tileSize;
  if (detection > 0 && distance(monstre.x, monstre.y, hero.x, hero.y) <= detection) {
    suivant.etat = ETAT_POURSUITE;
    suivant.reperageX = monstre.x; // le point d'où IL a repéré, pas où était le joueur
    suivant.reperageY = monstre.y;
    suivant.pauseMs = 0;
    return { comportement: suivant, but: { x: hero.x, y: hero.y }, facteurVitesse: 1, reperage: true };
  }

  // --- 6. Errance --------------------------------------------------------
  if (suivant.pauseMs > 0) {
    suivant.pauseMs -= deltaMs;
    return { comportement: suivant, but: null, facteurVitesse: facteurErrance(table) };
  }
  if (!suivant.but || distance(monstre.x, monstre.y, suivant.but.x, suivant.but.y) <= TOLERANCE_BUT_PX) {
    // Arrivé (ou jamais parti) : il souffle, puis il choisit ailleurs.
    suivant.pauseMs = tirerPause(table, alea);
    suivant.but = tirerPointDomaine();
    return { comportement: suivant, but: null, facteurVitesse: facteurErrance(table) };
  }
  return { comportement: suivant, but: suivant.but, facteurVitesse: facteurErrance(table) };
}

// --- Le TIREUR (spec 14, §4.3, comportement `distance`) --------------------
// Un monstre qui déclare `comportement: "distance"` et une `attaque_distance`
// garde ses distances : il recule si le héros s'approche à moins de
// `recul_tuiles`, s'approche s'il est hors de portée, et reste sur place
// entre les deux. Il tire quand le héros est à portée et que sa cadence le
// permet. Rien de plus : pas de mémoire, pas d'état — la décision ne dépend
// que des positions, donc elle ne se désynchronise jamais de ce qu'on voit.
//
// Comme `avancerComportement`, la fonction ne déplace rien : elle dit où
// aller et s'il faut tirer, `main.js` fait le mouvement (collisions comprises)
// et le tir (`projectiles.js`). Les états du corps à corps ne sont pas touchés.
//
// Rend `{ but, tirer }` : `but` = { x, y } ou null (ne pas bouger).
export function deciderTireur({ monstre, hero, attaque, tileSize, cooldownTirMs }) {
  const distanceHero = distance(monstre.x, monstre.y, hero.x, hero.y);
  const portee = attaque.portee_tuiles * tileSize;
  const recul = attaque.recul_tuiles * tileSize;
  const tirer = distanceHero <= portee && cooldownTirMs <= 0;

  if (distanceHero > 0 && distanceHero < recul) {
    // À l'opposé du héros, d'une tuile : assez pour que la ligne droite de
    // l'appelant ait une direction, pas assez pour qu'il fuie à l'autre bout.
    const ux = (monstre.x - hero.x) / distanceHero;
    const uy = (monstre.y - hero.y) / distanceHero;
    return { but: { x: monstre.x + ux * tileSize, y: monstre.y + uy * tileSize }, tirer };
  }
  if (distanceHero > portee) return { but: { x: hero.x, y: hero.y }, tirer: false };
  return { but: null, tirer };
}

// --- Le BOSS (spec 14, §4.5, comportement `boss`) --------------------------
// Trois gestes : le corps à corps (celui de tout monstre, fait par main.js à
// la portée `portee_attaque`), le tir (`attaque_distance`, la même que le
// tireur, salve comprise) et un MODE DE DÉPLACEMENT tiré au sort, qui dure
// `duree_mode_ms` puis se retire. Les modes sont une liste en données
// (`modes: [{ type, poids, facteur_vitesse?, tir }]`) ; ce module ne connaît
// que leurs trois TYPES, jamais un boss :
//   agressif : il fonce sur le héros ;
//   kite     : il garde ses distances et tire — c'est exactement le tireur
//              (`deciderTireur`), avec le `recul_tuiles` de son attaque ;
//   errance  : il se replace vers un point tiré au hasard, puis un autre.
// Chaque mode dit s'il tire (`tir`). Comme les autres décisions, celle-ci ne
// déplace rien : `main.js` fait le pas (collisions comprises) et le tir.
export const MODES_BOSS = ['agressif', 'kite', 'errance'];

// Sans avancer pendant ce temps en errance, il change de point : même idée que
// l'anti-blocage du Chaos, sans en avoir la table (le boss n'est pas né d'un
// `spawns.json`). *Provisoire*, jamais vu en jeu.
const BLOCAGE_ERRANCE_MS = 700;

export function creerEtatBoss() {
  return { mode: null, resteMs: 0, but: null, blocageMs: 0 };
}

// Le tirage pondéré d'un mode. `alea()` dans [0 ; 1[ ; un poids nul ne sort
// jamais. Rend l'entrée de la liste, pas son type : le mode porte ses nombres.
export function tirerModeBoss(modes, alea) {
  const total = modes.reduce((s, m) => s + m.poids, 0);
  let tirage = alea() * total;
  for (const mode of modes) {
    if (mode.poids <= 0) continue;
    if (tirage < mode.poids) return mode;
    tirage -= mode.poids;
  }
  return modes.filter((m) => m.poids > 0).pop();
}

// Une frame de décision du boss. `ctx` :
//   deltaMs, monstre {x,y}, hero {x,y}, tileSize,
//   modes, dureeModeMs { min, max }, attaque (son `attaque_distance`),
//   cooldownTirMs, distanceParcouruePx (ce qu'il a bougé à la frame d'avant),
//   alea(), tirerPoint() : un point libre de la salle, ou null.
// Rend `{ etat, but, facteurVitesse, tirer }`.
export function deciderBoss(etat, ctx) {
  const {
    deltaMs, monstre, hero, tileSize, modes, dureeModeMs, attaque,
    cooldownTirMs, distanceParcouruePx = 0, alea, tirerPoint,
  } = ctx;
  let suivant = { ...etat, resteMs: etat.resteMs - deltaMs };
  if (!suivant.mode || suivant.resteMs <= 0) {
    suivant = {
      mode: tirerModeBoss(modes, alea),
      resteMs: dureeModeMs.min + alea() * (dureeModeMs.max - dureeModeMs.min),
      but: null,
      blocageMs: 0,
    };
  }
  const mode = suivant.mode;
  const facteurVitesse = typeof mode.facteur_vitesse === 'number' ? mode.facteur_vitesse : 1;
  const aPortee = distance(monstre.x, monstre.y, hero.x, hero.y) <= attaque.portee_tuiles * tileSize;
  const tirer = mode.tir === true && aPortee && cooldownTirMs <= 0;

  if (mode.type === 'agressif') {
    return { etat: suivant, but: { x: hero.x, y: hero.y }, facteurVitesse, tirer };
  }
  if (mode.type === 'kite') {
    const decision = deciderTireur({ monstre, hero, attaque, tileSize, cooldownTirMs });
    return { etat: suivant, but: decision.but, facteurVitesse, tirer: mode.tir === true && decision.tirer };
  }

  // errance : un point, puis un autre, une fois atteint ou s'il n'avance plus.
  suivant.blocageMs = suivant.but && distanceParcouruePx < SEUIL_IMMOBILE_PX ? suivant.blocageMs + deltaMs : 0;
  const atteint = suivant.but && distance(monstre.x, monstre.y, suivant.but.x, suivant.but.y) <= TOLERANCE_BUT_PX;
  if (!suivant.but || atteint || suivant.blocageMs >= BLOCAGE_ERRANCE_MS) {
    suivant.but = tirerPoint();
    suivant.blocageMs = 0;
  }
  return { etat: suivant, but: suivant.but, facteurVitesse, tirer };
}

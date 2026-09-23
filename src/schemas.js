import { PHASES_CYCLE } from './daynight.js';
import { empreinteParDefaut } from './structures.js';
import { echelleVisuel } from './visuels.js';
import { resoudreEchelleJeu } from './companion.js';
import { TYPES_CARTE, CASES_MAX } from './menu_cartes.js';
import { OPTIONS_MIN, OPTIONS_MAX, erreursGrapheConversation } from './dialogue.js';

// `D-39` — « le corps ne sort jamais de son aura », vérifié AU CHARGEMENT.
//
// Pourquoi au boot et pas à l'exécution : l'aura est le repère que le joueur
// voit de la zone de jeu du follet. Un rayon de petite orbite trop grand ne
// planterait rien — il produirait un follet dont le cercle affiché ment, un
// défaut visible à l'écran et invisible aux tests (le dessin n'est jamais
// exercé en headless). Autant le faire tomber au boot, avec son chemin.
//
// La demi-taille du corps dérive de la MÊME boîte englobante que les
// empreintes d'interactifs (`structures.js#empreinteParDefaut`) et de la même
// composition d'échelles que le rendu (échelle propre du visuel × échelle de
// jeu du compagnon) : un test qui recopierait la règle pourrait rester vert
// alors que la silhouette, elle, aurait grandi.
//
// L'échelle retenue est celle **du jeu** : pendant la cinématique du choix le
// follet est bien plus gros, mais aucune aura n'y est dessinée (elle ne l'est
// que pour un follet en jeu), et la règle de Xav dit « partout en jeu ».
//
// La vérification balaie TOUS les compagnons plutôt que de nommer un id :
// aucun littéral de catalogue n'entre ici. Contrepartie assumée, à dire le
// jour où elle coûtera : si un 2ᵉ effet de type `vol` apparaissait pour autre
// chose qu'un follet, il serait mesuré contre les auras des compagnons sans
// raison — il faudra alors rendre l'appariement explicite en données.
function erreursBorneAura(entry, catalogs, path) {
  const erreurs = [];
  if (typeof entry.rayon_px !== 'number' || entry.rayon_px < 0) return erreurs; // déjà signalé
  for (const comp of catalogs.companions || []) {
    const visuel = (catalogs.visuels || []).find((v) => v.id === (comp.render && comp.render.visuel));
    if (!visuel || !Array.isArray(visuel.primitives)) continue; // référence cassée : signalée ailleurs
    const boite = empreinteParDefaut(visuel, echelleVisuel(visuel) * resoudreEchelleJeu(comp));
    const demiTaille = Math.max(
      Math.hypot(boite.x, boite.y),
      Math.hypot(boite.x + boite.w, boite.y),
      Math.hypot(boite.x, boite.y + boite.h),
      Math.hypot(boite.x + boite.w, boite.y + boite.h),
    );
    if (entry.rayon_px + demiTaille >= comp.rayon_aura) {
      erreurs.push(
        `${path} > rayon_px (${entry.rayon_px}) + demi-taille du corps de "${comp.id}" `
        + `(${demiTaille.toFixed(2)}) doit rester STRICTEMENT sous son rayon_aura (${comp.rayon_aura}) : `
        + 'le corps du follet sortirait de son aura, qui cesserait d\'être un repère exact',
      );
    }
  }
  return erreurs;
}

// Noms des phases du cycle, pour que `spawns.json` ne puisse pas déclarer
// une phase qui n'existe pas (« crépuscule » au lieu de « crepuscule » se
// traduirait sinon par une nuit sans le moindre monstre, sans un mot).
// Lu depuis daynight.js, jamais recopié : une phase de plus un jour ne
// demandera rien ici.
const NOMS_PHASES_CYCLE = PHASES_CYCLE.map((p) => p.nom);

// Schémas de validation par catalogue de données.
//
// Chaque schéma décrit : les champs obligatoires (requiredFields), le champ
// qui sert d'identifiant unique (idField), les références croisées simples
// vers un autre catalogue (refs), et une validation additionnelle propre au
// catalogue (custom) quand la forme dépasse un simple champ->id.
//
// Phase 1 fige le contenu des catalogues listés dans specs/02_grotte.md §2.1
// (companions, synergies, status_effects, enemies, loot_tables, weapons,
// puzzles, dialogues) ainsi que stats_derivees (nouveau catalogue, cf.
// CLAUDE.md journal Phase 1 pour le choix de le séparer de stats.json).

function schemaMinimal() {
  return { requiredFields: ['id'], idField: 'id', refs: [], custom: null };
}

// Une condition de flag (cf. flags.js#evaluate) peut apparaître dans
// plusieurs catalogues (scenes.portails[].condition, scenes.spawns[]
// .condition) : un seul validateur de forme, réutilisé partout, pour ne
// jamais faire diverger la définition d'une condition valide.
// `D-62` (T4) : la même vérification, offerte au validateur générique de
// `registry.js` pour le champ `visible_si`, que N'IMPORTE quel catalogue peut
// porter. On passe les catalogues plutôt que l'ensemble des flags déjà
// extrait : l'appelant n'a pas à savoir de quoi une condition est faite.
export function erreursConditionVisibilite(condition, chemin, catalogs) {
  return erreursCondition(condition, chemin, new Set((catalogs.flags || []).map((f) => f.id)));
}

function erreursCondition(condition, chemin, declares) {
  if (condition === undefined || condition === null) return [];
  if (typeof condition === 'string') {
    return declares.has(condition) ? [] : [`${chemin} > condition "${condition}" introuvable dans flags.json`];
  }
  if (typeof condition === 'object') {
    if (condition.not !== undefined) return erreursCondition(condition.not, chemin, declares);
    if (Array.isArray(condition.all)) return condition.all.flatMap((c) => erreursCondition(c, chemin, declares));
    if (Array.isArray(condition.any)) return condition.any.flatMap((c) => erreursCondition(c, chemin, declares));
    // `{ valeur, min, max }` (flags.js#comparerValeur, né du palier 07-A) :
    // ce validateur l'ignorait — `spawns.json` s'en sert sans jamais passer
    // par ici. `menus.json` est le premier catalogue à faire valider une
    // telle condition ; la forme s'apprend donc ICI, une fois, plutôt que
    // dans un second validateur qui divergerait. Seule la FORME est jugée :
    // le NOM de la valeur est fourni à l'exécution, et c'est
    // `menu_cartes.js#erreursCablageMenus` qui vérifie que quelqu'un la fournit.
    if (condition.valeur !== undefined) {
      const erreurs = [];
      if (typeof condition.valeur !== 'string' || condition.valeur.length === 0) {
        erreurs.push(`${chemin} > condition.valeur doit être un nom non vide`);
      }
      const bornes = ['min', 'max'].filter((b) => condition[b] !== undefined);
      if (bornes.length === 0) erreurs.push(`${chemin} > condition sur valeur sans min ni max`);
      for (const b of bornes) {
        if (typeof condition[b] !== 'number') erreurs.push(`${chemin} > condition.${b} doit être numérique`);
      }
      return erreurs;
    }
  }
  return [`${chemin} > condition mal formée : ${JSON.stringify(condition)}`];
}

const TYPES_LUMIERE = ['halo', 'faisceau'];

// Verbes de gameplay (§2.4 socle technique) : liste de référence partagée par
// hints.json/glyphes.json — jamais une 2ᵉ énumération qui pourrait diverger
// de src/input/input.js#VERBES_BOUTON (+ 'move', qui n'est pas un bouton).
const VERBES_GAMEPLAY = [
  'move', 'attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu',
  // `D-54` : listé ici pour que les deux énumérations restent identiques,
  // pas parce qu'un indice ou un glyphe existe — aucun n'est livré (le
  // glyphe tactile n'a pas de geste à montrer tant que `Q-40` est ouverte).
  'target_next',
];

// specs/04_indices-commandes.md : un indice n'a de sens que si son verbe a un
// glyphe déclaré pour les 3 périphériques (clavier/manette/tactile) — sinon
// hints.js afficherait un indice sans rien à montrer sur un périphérique
// donné, silencieusement. `glyphes.json` est validé indépendamment (chaque
// glyphe reste utilisable même sans indice pointant vers lui, catalogue
// ouvert par verbe).
function validerHint(entry, catalogs, path) {
  const erreurs = [];
  if (!VERBES_GAMEPLAY.includes(entry.verbe)) {
    erreurs.push(`${path} > verbe doit être l'un de ${VERBES_GAMEPLAY.join('/')}`);
  }
  if (typeof entry.declencheur !== 'string' || entry.declencheur.length === 0) {
    erreurs.push(`${path} > declencheur doit être une chaîne non vide (description du déclencheur)`);
  }
  if (entry.label_key !== undefined && typeof entry.label_key !== 'string') {
    erreurs.push(`${path} > label_key doit être une chaîne si présent`);
  }
  if (typeof entry.duree_ms !== 'number' || entry.duree_ms <= 0) {
    erreurs.push(`${path} > duree_ms doit être un nombre positif`);
  }
  if (!(catalogs.glyphes || []).some((g) => g.verbe === entry.verbe)) {
    erreurs.push(`${path} > aucune entrée glyphes.json pour le verbe "${entry.verbe}"`);
  }
  return erreurs;
}

function validerGlyphe(entry, catalogs, path) {
  const erreurs = [];
  if (!VERBES_GAMEPLAY.includes(entry.verbe)) {
    erreurs.push(`${path} > verbe doit être l'un de ${VERBES_GAMEPLAY.join('/')}`);
  }
  for (const champ of ['clavier_key', 'manette_key', 'tactile_key']) {
    if (typeof entry[champ] !== 'string' || entry[champ].length === 0) {
      erreurs.push(`${path} > ${champ} doit être une chaîne non vide (clé i18n)`);
    }
  }
  return erreurs;
}

// tiles.json > render.variantes[]/variation_teinte (§3.4 03_grotte-polish) :
// optionnels, une tuile sans variante garde exactement son comportement
// Phase 0/1 (une seule couleur, jamais de teinte aléatoire).
function validerTile(entry, catalogs, path) {
  const erreurs = [];
  const render = entry.render || {};
  if (render.variantes !== undefined) {
    if (!Array.isArray(render.variantes) || render.variantes.some((v) => typeof v !== 'string')) {
      erreurs.push(`${path} > render.variantes doit être un tableau de couleurs (chaînes)`);
    }
  }
  if (render.variation_teinte !== undefined && (typeof render.variation_teinte !== 'number' || render.variation_teinte < 0)) {
    erreurs.push(`${path} > render.variation_teinte doit être un nombre >= 0`);
  }
  // ressource (03_maison-exterieur §2.1) : une tuile qui porte une ressource
  // est solide et interactive (resources.js#trouverRessourceProche) — la
  // validation ne vérifie que la référence croisée, "solid" reste un champ
  // explicite de la tuile (pas dérivé automatiquement de la présence de
  // `ressource`, pour rester cohérent avec le style existant du catalogue).
  if (entry.ressource !== undefined) {
    const existe = (catalogs.resources || []).some((r) => r.id === entry.ressource);
    if (!existe) erreurs.push(`${path} > ressource "${entry.ressource}" introuvable dans resources.json`);
  }
  // render.visuel (03_maison-exterieur) : optionnel (la plupart des tuiles
  // restent un simple aplat de couleur, cf. couleurTuile) — une tuile qui en
  // porte un (arbre, rocher…) est dessinée par-dessus son aplat via
  // dessinerVisuel, ancrée au bas de la cellule (§3.3 : formes distinctes,
  // jamais un simple carré plein). Pas erreursRenderVisuel (qui exige le
  // champ) : optionnel ici, contrairement à companions/enemies/puzzles.
  if (entry.render && entry.render.visuel !== undefined) {
    const existe = (catalogs.visuels || []).some((v) => v.id === entry.render.visuel);
    if (!existe) erreurs.push(`${path} > render.visuel "${entry.render.visuel}" introuvable dans visuels.json`);
  }
  // render.visuel_variantes / render.miroir (polish ambiance, 23/09) :
  // optionnels — d'autres dessins pour la même tuile, et le droit d'être
  // retournée en miroir horizontal ; la case choisit par hash spatial
  // (`decor.js#varianteTuile`). Une variante sans visuel principal n'a rien
  // à varier.
  if (entry.render && entry.render.visuel_variantes !== undefined) {
    const v = entry.render.visuel_variantes;
    if (!Array.isArray(v) || v.some((id) => typeof id !== 'string')) {
      erreurs.push(`${path} > render.visuel_variantes doit être un tableau d'ids de visuels`);
    } else {
      if (entry.render.visuel === undefined) erreurs.push(`${path} > render.visuel_variantes sans render.visuel`);
      for (const id of v) {
        if (!(catalogs.visuels || []).some((x) => x.id === id)) erreurs.push(`${path} > render.visuel_variantes "${id}" introuvable dans visuels.json`);
      }
    }
  }
  if (entry.render && entry.render.miroir !== undefined && typeof entry.render.miroir !== 'boolean') {
    erreurs.push(`${path} > render.miroir doit être un booléen`);
  }
  // render.sol (`Q-70`) : optionnel — la tuile de SURFACE sur laquelle un
  // objet est posé (couleur et grain). Un sol est une surface : non solide,
  // et sans sol à son tour (un seul niveau, jamais une chaîne à suivre).
  if (entry.render && entry.render.sol !== undefined) {
    const sol = (catalogs.tiles || []).find((t) => t.id === entry.render.sol);
    if (!sol) erreurs.push(`${path} > render.sol "${entry.render.sol}" introuvable dans tiles.json`);
    else if (sol.solid) erreurs.push(`${path} > render.sol "${entry.render.sol}" est solide : un sol est une surface`);
    else if (sol.render && sol.render.sol !== undefined) erreurs.push(`${path} > render.sol "${entry.render.sol}" déclare lui-même un sol`);
  }
  return erreurs;
}

// Une scène n'a pas un simple champ de référence : son layout est une grille
// de tuiles, et Phase 1 y ajoute portails/interactifs/spawns/lumieres/portes,
// tous optionnels et validés ici plutôt que par le mécanisme générique `refs`
// (chacun a une forme propre, pas un simple champ->id).
// Format tableau-de-tableaux (Phase 0/1, salles de la grotte) : un id de
// tuile par cellule, aucune légende requise.
function validerLayoutTableau(layout, largeur, hauteur, tileIds, path, erreurs) {
  if (layout.length !== hauteur) {
    erreurs.push(`${path} > layout a ${layout.length} lignes, height=${hauteur} attendu`);
  }
  layout.forEach((ligne, y) => {
    if (!Array.isArray(ligne) || ligne.length !== largeur) {
      erreurs.push(`${path} > layout[${y}] doit contenir ${largeur} tuiles`);
      return;
    }
    ligne.forEach((tileId, x) => {
      if (!tileIds.has(tileId)) {
        erreurs.push(`${path} > layout[${y}][${x}] > "${tileId}" introuvable dans tiles.json`);
      }
    });
  });
}

// Format lignes de caractères (03_maison-exterieur §3.1, acté Xav
// 2026-09-16) : un caractère par tuile + `legende` (car -> id de tiles.json).
// Le tableau-de-tableaux devient inéditable à la taille de la Région Maison
// (168x115+ tuiles) ; les deux formats restent acceptés indéfiniment (les
// salles de la grotte gardent le leur) — reconnu par la présence de
// `legende` sur l'entrée. Une légende incomplète est un échec dur avec le
// caractère et la ligne fautifs (§7 critère de validation, exigence
// explicite de la fiche).
function validerLayoutLignes(layout, legende, largeur, hauteur, tileIds, path, erreurs) {
  if (!legende || typeof legende !== 'object') {
    erreurs.push(`${path} > legende manquante (requise quand layout est un tableau de lignes)`);
    return;
  }
  for (const [car, tileId] of Object.entries(legende)) {
    if (!tileIds.has(tileId)) {
      erreurs.push(`${path} > legende["${car}"] > "${tileId}" introuvable dans tiles.json`);
    }
  }
  if (layout.length !== hauteur) {
    erreurs.push(`${path} > layout a ${layout.length} lignes, height=${hauteur} attendu`);
  }
  layout.forEach((ligne, y) => {
    if (typeof ligne !== 'string' || ligne.length !== largeur) {
      erreurs.push(`${path} > layout[${y}] doit être une chaîne de ${largeur} caractères`);
      return;
    }
    for (let x = 0; x < ligne.length; x++) {
      const car = ligne[x];
      if (!Object.prototype.hasOwnProperty.call(legende, car)) {
        erreurs.push(`${path} > layout[${y}][${x}] > caractère "${car}" absent de legende`);
      }
    }
  });
}

// Rectangles de la scène portant cet id (un Champ en L en a deux).
function rectanglesDeZone(scene, id) {
  return (scene.zones || []).filter((z) => z.id === id).map((z) => z.rect);
}

function rectsSeChevauchent(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// specs/07_chaos-nocturne.md §3 « Validation au boot, échec dur ».
function validerSpawn(entry, catalogs, path) {
  const erreurs = [];
  const scene = (catalogs.scenes || []).find((s) => s.id === entry.scene);
  if (!scene) return erreurs; // déjà signalé par `refs`

  const rectsApparition = rectanglesDeZone(scene, entry.zone_apparition);
  if (rectsApparition.length === 0) {
    erreurs.push(`${path} > zone_apparition "${entry.zone_apparition}" introuvable dans les zones de ${entry.scene}`);
  }

  // Un monstre ne doit jamais **apparaître** en zone sûre. La règle est
  // vérifiée ici sur la géométrie, pas seulement au tirage : une zone
  // d'apparition qui mord sur le Jardin est une erreur de carte, pas un
  // tirage malheureux à filtrer 200 fois par nuit.
  const zonesSures = (scene.zones || []).filter((z) => z.type === 'zone_sure');
  for (const rectApparition of rectsApparition) {
    for (const sure of zonesSures) {
      if (rectsSeChevauchent(rectApparition, sure.rect)) {
        erreurs.push(
          `${path} > zone_apparition "${entry.zone_apparition}" chevauche la zone sûre "${sure.id || sure.type}"`,
        );
      }
    }
  }

  if (!Array.isArray(entry.domaine) || entry.domaine.length === 0) {
    erreurs.push(`${path} > domaine doit être un tableau non vide d'ids ou de types de zone`);
  } else {
    for (const nom of entry.domaine) {
      const connu = (scene.zones || []).some((z) => z.id === nom || z.type === nom);
      if (!connu) erreurs.push(`${path} > domaine > "${nom}" ne désigne aucune zone de ${entry.scene}`);
    }
  }

  if (!Array.isArray(entry.phases) || entry.phases.length === 0) {
    erreurs.push(`${path} > phases doit être un tableau non vide de noms de phase`);
  } else {
    for (const phase of entry.phases) {
      if (!NOMS_PHASES_CYCLE.includes(phase)) {
        erreurs.push(`${path} > phases > "${phase}" n'est pas une phase du cycle (${NOMS_PHASES_CYCLE.join(', ')})`);
      }
    }
  }

  for (const champ of ['max_simultanes', 'intervalle_ms', 'distance_min_joueur_tuiles', 'detection_tuiles', 'poursuite_max_tuiles', 'desinteret_ms', 'blocage_ms']) {
    if (typeof entry[champ] !== 'number' || entry[champ] < 0) {
      erreurs.push(`${path} > ${champ} doit être un nombre positif`);
    }
  }

  // `signal` (palier D) : la teinte qui fait deviner la zone de nuit. Aucune
  // lueur sur les monstres eux-mêmes (décision Xav, `Q-27`) — c'est la ZONE
  // qui se devine de loin, pas les créatures.
  if (entry.signal !== undefined) {
    const sig = entry.signal;
    if (!sig || typeof sig !== 'object') {
      erreurs.push(`${path} > signal doit être un objet { couleur, alpha, pulsation_ms }`);
    } else {
      if (typeof sig.couleur !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(sig.couleur)) {
        erreurs.push(`${path} > signal > couleur doit être un #rrggbb`);
      }
      if (typeof sig.alpha !== 'number' || sig.alpha <= 0 || sig.alpha > 1) {
        erreurs.push(`${path} > signal > alpha doit être dans ]0, 1]`);
      }
      if (sig.pulsation_ms !== undefined && (typeof sig.pulsation_ms !== 'number' || sig.pulsation_ms <= 0)) {
        erreurs.push(`${path} > signal > pulsation_ms doit être un nombre strictement positif`);
      }
    }
  }

  if (entry.errance !== undefined) {
    const e = entry.errance;
    if (!e || typeof e !== 'object') {
      erreurs.push(`${path} > errance doit être un objet { pause_ms_min, pause_ms_max, facteur_vitesse }`);
    } else {
      if (typeof e.pause_ms_min !== 'number' || typeof e.pause_ms_max !== 'number' || e.pause_ms_min > e.pause_ms_max) {
        erreurs.push(`${path} > errance > pause_ms_min/pause_ms_max invalides (min <= max attendu)`);
      }
      if (typeof e.facteur_vitesse !== 'number' || e.facteur_vitesse <= 0) {
        erreurs.push(`${path} > errance > facteur_vitesse doit être un nombre strictement positif`);
      }
    }
  }

  return erreurs;
}

function validerScene(entry, catalogs, path) {
  const erreurs = [];
  const largeur = entry.width;
  const hauteur = entry.height;
  const layout = entry.layout;

  if (typeof entry.seed !== 'number' || !Number.isInteger(entry.seed)) {
    erreurs.push(`${path} > seed manquant ou invalide (entier requis, pas de valeur par défaut)`);
  }
  if (!Array.isArray(layout)) {
    erreurs.push(`${path} > layout doit être un tableau (2D, ou de lignes avec legende)`);
    return erreurs;
  }
  const tiles = catalogs.tiles || [];
  const tileIds = new Set(tiles.map((t) => t.id));
  // La présence de `legende` (ou, à défaut, une première ligne qui est une
  // chaîne plutôt qu'un tableau) distingue le format lignes du format
  // tableau-de-tableaux — un layout vide (hauteur 0, cas théorique) retombe
  // sur le format tableau, sans conséquence puisqu'il n'y a alors rien à
  // décoder dans les deux cas.
  if (entry.legende !== undefined || (layout.length > 0 && typeof layout[0] === 'string')) {
    validerLayoutLignes(layout, entry.legende, largeur, hauteur, tileIds, path, erreurs);
  } else {
    validerLayoutTableau(layout, largeur, hauteur, tileIds, path, erreurs);
  }

  if (
    !entry.spawn ||
    typeof entry.spawn.x !== 'number' ||
    typeof entry.spawn.y !== 'number'
  ) {
    erreurs.push(`${path} > spawn doit être { x, y }`);
  }

  // obscurite : objet { opacite } depuis 03_grotte-polish (§2.1, "obscurité
  // par scène") — un booléen résiduel (Phase 1) est un échec de validation
  // explicite, jamais migré en silence, pour forcer la mise à jour de toute
  // scène qui utilisait encore l'ancienne forme.
  if (entry.obscurite !== undefined) {
    if (typeof entry.obscurite === 'boolean') {
      erreurs.push(`${path} > obscurite est un objet { opacite } depuis 03_grotte-polish (booléen reçu)`);
    } else if (
      entry.obscurite === null ||
      typeof entry.obscurite !== 'object' ||
      typeof entry.obscurite.opacite !== 'number'
    ) {
      erreurs.push(`${path} > obscurite doit être un objet { opacite } (nombre)`);
    }
  }

  const flagsDeclares = new Set((catalogs.flags || []).map((f) => f.id));
  const scenesDeclarees = new Set((catalogs.scenes || []).map((s) => s.id));
  const puzzlesDeclares = new Set((catalogs.puzzles || []).map((p) => p.id));
  const enemiesDeclares = new Set((catalogs.enemies || []).map((e) => e.id));
  const tuilesDeclarees = tileIds;

  // lumieres[] : `type` distingue un halo (perce le voile, révèle le sol) et
  // un faisceau (§3.4 03_grotte-polish, atmosphère additive, ne perce jamais
  // le voile) — chaque type a ses propres champs requis. `type` absent =
  // "halo" (comportement Phase 1 inchangé, aucune migration de données requise).
  for (const lumiere of entry.lumieres || []) {
    const type = lumiere.type || 'halo';
    if (!TYPES_LUMIERE.includes(type)) {
      erreurs.push(`${path} > lumieres[] > type "${type}" inconnu (${TYPES_LUMIERE.join('/')})`);
      continue;
    }
    if (typeof lumiere.x !== 'number' || typeof lumiere.y !== 'number') {
      erreurs.push(`${path} > lumieres[] doit contenir { x, y } numériques`);
      continue;
    }
    // `condition` (D-157) : même forme qu'une condition de portail, validée
    // par le même validateur — une lumière peut attendre un flag.
    erreurs.push(...erreursCondition(lumiere.condition, `${path} > lumieres[]`, flagsDeclares));
    if (lumiere.couleur !== undefined && !/^#[0-9a-fA-F]{6}$/.test(lumiere.couleur)) {
      erreurs.push(`${path} > lumieres[] > couleur doit être #rrggbb`);
    }
    if (type === 'halo') {
      if (typeof lumiere.rayon !== 'number') {
        erreurs.push(`${path} > lumieres[] (halo) doit contenir rayon numérique`);
      }
    } else if (['angle', 'ouverture', 'longueur', 'alpha'].some((champ) => typeof lumiere[champ] !== 'number')) {
      erreurs.push(`${path} > lumieres[] (faisceau) doit contenir { angle, ouverture, longueur, alpha } numériques`);
    }
  }

  // decor (§3.4) : { densite, motifs: [{ visuel, poids }] } — absent = aucun
  // motif (§4 edge case), jamais une erreur. Un motif de plus dans motifs[]
  // ne demande aucun code (règle d'architecture directrice) : seule la
  // référence croisée vers visuels.json et la forme du poids sont vérifiées.
  if (entry.decor !== undefined) {
    const d = entry.decor;
    if (!d || typeof d.densite !== 'number' || !Array.isArray(d.motifs) || d.motifs.length === 0) {
      erreurs.push(`${path} > decor doit être { densite, motifs: [{ visuel, poids }] }`);
    } else {
      const visuelsDeclares = new Set((catalogs.visuels || []).map((v) => v.id));
      d.motifs.forEach((motif, i) => {
        if (!visuelsDeclares.has(motif.visuel)) {
          erreurs.push(`${path} > decor.motifs[${i}] > visuel "${motif.visuel}" introuvable dans visuels.json`);
        }
        if (typeof motif.poids !== 'number' || motif.poids <= 0) {
          erreurs.push(`${path} > decor.motifs[${i}] > poids doit être un nombre positif`);
        }
        // `lumiere` (polish ambiance, 23/09) : optionnelle — le motif émet un
        // halo qui perce le voile (`decor.js#lumieresDuDecor`).
        if (motif.lumiere !== undefined) {
          const l = motif.lumiere;
          if (!l || typeof l.rayon !== 'number' || l.rayon <= 0 || (l.dy !== undefined && typeof l.dy !== 'number')
            || (l.couleur !== undefined && !/^#[0-9a-fA-F]{6}$/.test(l.couleur))) {
            erreurs.push(`${path} > decor.motifs[${i}] > lumiere doit être { rayon > 0, dy? numérique, couleur? #rrggbb }`);
          }
        }
        // `sur` (`D-106`) : les tuiles qui PORTENT ce motif. Absent = partout,
        // pour qu'un catalogue d'avant reste valide tel quel (la Grotte n'en
        // déclare pas). Présent, il ne peut pas être vide : un motif qui ne
        // pousse nulle part est une faute de frappe, pas une intention.
        if (motif.sur !== undefined) {
          if (!Array.isArray(motif.sur) || motif.sur.length === 0) {
            erreurs.push(`${path} > decor.motifs[${i}] > sur doit être une liste non vide d'ids de tiles.json`);
          } else {
            motif.sur.forEach((tileId) => {
              if (!tileIds.has(tileId)) {
                erreurs.push(`${path} > decor.motifs[${i}] > sur : "${tileId}" introuvable dans tiles.json`);
              }
            });
          }
        }
      });
    }
  }

  // zones[] (03_maison-exterieur §2.1) : rectangles nommés (foret/maison/
  // jardin/campagne...) — `type` reste une chaîne libre, jamais un enum fermé
  // dans le schéma (une région future peut introduire un type de zone sans
  // toucher ce fichier), utilisés par ground_items.js (spawn/zones_exclues)
  // et par les déclencheurs d'entrée de zone (main.js).
  (entry.zones || []).forEach((zone, i) => {
    const chemin = `${path} > zones[${i}]`;
    if (typeof zone.type !== 'string' || !zone.type) {
      erreurs.push(`${chemin} > type manquant (chaîne)`);
    }
    // `id` (specs/07 §3) : optionnel, mais **non vide** s'il est là — c'est
    // par lui que `spawns.json` désigne une zone d'apparition ou un domaine.
    // Plusieurs rectangles peuvent partager un id : c'est ainsi qu'un Champ
    // en L s'écrit (deux entrées, même id de groupe).
    if (zone.id !== undefined && (typeof zone.id !== 'string' || !zone.id)) {
      erreurs.push(`${chemin} > id doit être une chaîne non vide`);
    }
    const r = zone.rect;
    if (!r || ['x', 'y', 'w', 'h'].some((c) => typeof r[c] !== 'number')) {
      erreurs.push(`${chemin} > rect doit être { x, y, w, h } numériques`);
    }
    // `ombre` (polish ambiance, 23/09) : optionnelle, une opacité de voile
    // (daynight.js#opaciteOmbreZones) — hors de [0, 1] le voile n'a pas de sens.
    if (zone.ombre !== undefined && (typeof zone.ombre !== 'number' || zone.ombre < 0 || zone.ombre > 1)) {
      erreurs.push(`${chemin} > ombre doit être un nombre dans [0, 1]`);
    }
  });

  // structures[] (03_maison-exterieur §3.4) : rectangle + murs/sol/portes/
  // toit générés par scene.js à partir de ces seules données (jamais
  // encodés à la main dans le layout, cf. journal) — une 2ᵉ structure
  // ailleurs = une entrée JSON de plus.
  (entry.structures || []).forEach((structure, i) => {
    const chemin = `${path} > structures[${i}]`;
    const r = structure.rect;
    if (!r || ['x', 'y', 'w', 'h'].some((c) => typeof r[c] !== 'number')) {
      erreurs.push(`${chemin} > rect doit être { x, y, w, h } numériques`);
    }
    for (const champ of ['mur', 'sol', 'toit', 'porte_tile']) {
      if (!tuilesDeclarees.has(structure[champ])) {
        erreurs.push(`${chemin} > ${champ} "${structure[champ]}" introuvable dans tiles.json`);
      }
    }
    if (!Array.isArray(structure.portes) || structure.portes.length === 0) {
      erreurs.push(`${chemin} > portes doit être un tableau non vide de { x, y }`);
    } else {
      structure.portes.forEach((p, j) => {
        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') {
          erreurs.push(`${chemin} > portes[${j}] doit être { x, y }`);
        }
      });
    }

    // specs/05_construction-stations.md §2 : `interieur` (rectangle tuile
    // plaçable, portes exclues) et `couloir` (les 2 points de départ/arrivée
    // du test de praticabilité) — optionnels : une structure qui ne déclare
    // aucune station placable (aucune en M1 hors la Maison) n'a besoin ni de
    // l'un ni de l'autre.
    if (structure.interieur !== undefined) {
      const ri = structure.interieur;
      if (!ri || ['x', 'y', 'w', 'h'].some((c) => typeof ri[c] !== 'number')) {
        erreurs.push(`${chemin} > interieur doit être { x, y, w, h } numériques`);
      }
    }
    if (structure.couloir !== undefined) {
      const valide = Array.isArray(structure.couloir) && structure.couloir.length === 2
        && structure.couloir.every((p) => p && typeof p.x === 'number' && typeof p.y === 'number');
      if (!valide) {
        erreurs.push(`${chemin} > couloir doit être un tableau de 2 { x, y }`);
      }
    }
  });

  // points_ressources (`D-59`) : { itemId: [[tx, ty], ...] }, la liste de
  // points candidats posée à la main. Un id d'item inconnu, une coordonnée
  // hors carte ou une tuile solide doivent tomber AU BOOT : ce sont des
  // coordonnées écrites à la main, donc exactement le genre de donnée où une
  // faute de frappe ne se voit jamais autrement qu'en jouant.
  if (entry.points_ressources !== undefined) {
    const items = new Set((catalogs.items || []).map((i) => i.id));
    for (const [itemId, liste] of Object.entries(entry.points_ressources)) {
      if (!items.has(itemId)) {
        erreurs.push(`${path} > points_ressources : item "${itemId}" introuvable dans items.json`);
        continue;
      }
      if (!Array.isArray(liste) || liste.length === 0) {
        erreurs.push(`${path} > points_ressources.${itemId} doit être un tableau non vide de [tx, ty]`);
        continue;
      }
      for (const point of liste) {
        if (!Array.isArray(point) || point.length !== 2 || !point.every((n) => Number.isInteger(n))) {
          erreurs.push(`${path} > points_ressources.${itemId} : point ${JSON.stringify(point)} doit être [tx, ty] entiers`);
          continue;
        }
        const [tx, ty] = point;
        if (tx < 0 || ty < 0 || tx >= largeur || ty >= hauteur) {
          erreurs.push(`${path} > points_ressources.${itemId} : point (${tx},${ty}) hors de la carte`);
        }
      }
    }
  }

  // objets_uniques (`D-60`, la Plume) : [{ item, x, y, flag }] — un objet
  // posé à un endroit fixe, une seule fois dans toute la partie, retiré pour
  // de bon par son flag. Le `flag` est une RÉFÉRENCE : un flag non déclaré
  // laisserait l'objet réapparaître à chaque entrée en scène, sans erreur.
  if (entry.objets_uniques !== undefined) {
    const items = new Set((catalogs.items || []).map((i) => i.id));
    const flags = new Set((catalogs.flags || []).map((f) => f.id));
    if (!Array.isArray(entry.objets_uniques)) {
      erreurs.push(`${path} > objets_uniques doit être un tableau`);
    } else {
      for (const objet of entry.objets_uniques) {
        const ou = `${path} > objets_uniques[${objet && objet.item}]`;
        if (!objet || !items.has(objet.item)) {
          erreurs.push(`${ou} : item introuvable dans items.json`);
          continue;
        }
        if (!flags.has(objet.flag)) {
          erreurs.push(`${ou} : flag "${objet.flag}" non déclaré dans flags.json`);
        }
        if (!Number.isInteger(objet.x) || !Number.isInteger(objet.y)
          || objet.x < 0 || objet.y < 0 || objet.x >= largeur || objet.y >= hauteur) {
          erreurs.push(`${ou} : position (${objet.x},${objet.y}) hors de la carte`);
        }
      }
    }
  }

  // cycle_jour_nuit (03_maison-exterieur §2.1/§3.5) : simple interrupteur,
  // les phases/durées vivent en constantes centralisées dans daynight.js
  // (pas un catalogue extensible — il n'y a qu'un seul cycle dans tout le
  // jeu, pas une famille d'entrées interchangeables).
  if (entry.cycle_jour_nuit !== undefined && typeof entry.cycle_jour_nuit !== 'boolean') {
    erreurs.push(`${path} > cycle_jour_nuit doit être un booléen`);
  }

  // survie (Palier C §3.3) : surcharge optionnelle de plancher/pente par
  // scène (zone plus dangereuse, Phase 4+) — aucune scène n'en déclare en
  // Phase 3, juste la capacité de validation posée à l'avance.
  if (entry.survie !== undefined) {
    const sv = entry.survie;
    if (sv.plancher !== undefined && (typeof sv.plancher !== 'number' || sv.plancher < 0 || sv.plancher > 1)) {
      erreurs.push(`${path} > survie.plancher doit être un nombre entre 0 et 1`);
    }
    if (sv.pente !== undefined && (typeof sv.pente !== 'number' || sv.pente < 0)) {
      erreurs.push(`${path} > survie.pente doit être un nombre >= 0`);
    }
  }

  // intro (§3.5 03_grotte-polish, palier 4) : uniquement scene_grotte_salle_1
  // en pratique, mais validé génériquement comme le reste (aucune règle
  // spécifique à un id de scène dans schemas.js) — durées + paramètres de
  // lévitation, toutes provisoires (cf. src/intro.js, qui ne code aucune
  // durée en dur).
  if (entry.intro !== undefined) {
    const it = entry.intro;
    const cli = it.clignements;
    if (
      !cli ||
      !Array.isArray(cli.ouvertures_ms) ||
      cli.ouvertures_ms.length === 0 ||
      cli.ouvertures_ms.some((n) => typeof n !== 'number') ||
      typeof cli.noir_ms !== 'number'
    ) {
      erreurs.push(`${path} > intro.clignements doit être { ouvertures_ms: [nombres], noir_ms: nombre }`);
    }
    if (typeof it.convergence_ms !== 'number') {
      erreurs.push(`${path} > intro.convergence_ms doit être numérique`);
    }
    if (typeof it.depart_ms !== 'number') {
      erreurs.push(`${path} > intro.depart_ms doit être numérique`);
    }
    const lev = it.levitation;
    if (!lev || typeof lev.amplitude_px !== 'number' || typeof lev.periode_ms !== 'number') {
      erreurs.push(`${path} > intro.levitation doit être { amplitude_px, periode_ms } numériques`);
    }
  }

  (entry.portails || []).forEach((portail, i) => {
    const chemin = `${path} > portails[${i}]`;
    const zone = portail.zone;
    if (!zone || ['x', 'y', 'w', 'h'].some((c) => typeof zone[c] !== 'number')) {
      erreurs.push(`${chemin} > zone doit être { x, y, w, h } numériques`);
    }
    if (!scenesDeclarees.has(portail.cible)) {
      erreurs.push(`${chemin} > cible "${portail.cible}" introuvable dans scenes.json`);
    }
    if (!portail.spawn || typeof portail.spawn.x !== 'number' || typeof portail.spawn.y !== 'number') {
      erreurs.push(`${chemin} > spawn doit être { x, y }`);
    }
    erreurs.push(...erreursCondition(portail.condition, chemin, flagsDeclares));
  });

  for (const interactifId of entry.interactifs || []) {
    if (!puzzlesDeclares.has(interactifId)) {
      erreurs.push(`${path} > interactifs[] > "${interactifId}" introuvable dans puzzles.json`);
    }
  }

  (entry.spawns || []).forEach((spawnMonstre, i) => {
    const chemin = `${path} > spawns[${i}]`;
    if (!enemiesDeclares.has(spawnMonstre.enemy)) {
      erreurs.push(`${chemin} > enemy "${spawnMonstre.enemy}" introuvable dans enemies.json`);
    }
    if (!spawnMonstre.position || typeof spawnMonstre.position.x !== 'number' || typeof spawnMonstre.position.y !== 'number') {
      erreurs.push(`${chemin} > position doit être { x, y }`);
    }
    erreurs.push(...erreursCondition(spawnMonstre.condition, chemin, flagsDeclares));
  });

  (entry.portes || []).forEach((porte, i) => {
    const chemin = `${path} > portes[${i}]`;
    if (!porte.position || typeof porte.position.x !== 'number' || typeof porte.position.y !== 'number') {
      erreurs.push(`${chemin} > position doit être { x, y }`);
    }
    if (!flagsDeclares.has(porte.flag)) {
      erreurs.push(`${chemin} > flag "${porte.flag}" introuvable dans flags.json`);
    }
    if (!tuilesDeclarees.has(porte.tile_avant)) {
      erreurs.push(`${chemin} > tile_avant "${porte.tile_avant}" introuvable dans tiles.json`);
    }
    if (!tuilesDeclarees.has(porte.tile_apres)) {
      erreurs.push(`${chemin} > tile_apres "${porte.tile_apres}" introuvable dans tiles.json`);
    }
  });

  return erreurs;
}

function validerStatDerivee(entry, catalogs, path) {
  const erreurs = [];
  const f = entry.formule;
  if (!f || typeof f.base !== 'number' || typeof f.coefficient !== 'number') {
    erreurs.push(`${path} > formule doit être { base, coefficient, min? } numériques`);
  } else if (f.min !== undefined && typeof f.min !== 'number') {
    erreurs.push(`${path} > formule.min doit être numérique`);
  }
  return erreurs;
}

const FAMILLES_STATUS = ['buff', 'dot', 'debuff', 'controle'];
const CIBLES_STATUS = ['joueur', 'monstre'];
const MODES_STATUS = ['plat', 'pourcent'];

// Les deux régimes sont REQUIS : pas de repli du négatif sur le positif — on
// ne veut pas découvrir en jeu qu'un follet ignore l'alignement (§5). Chaque
// entrée cite un effet de `status_effects.json` rangé du bon côté : un effet
// de héros (`cible: joueur`) sous `heros`, un effet de monstre sous
// `monstres_aura`. `par_palier` multiplie la valeur par le palier ;
// `multiplicateur` la multiplie par un nombre fixe (Terre négatif : l'entrave
// des monstres « × 0,5 » — un facteur sur l'effet, jamais un second effet).
const REGIMES_SYNERGIE = ['positif', 'negatif'];
const COTES_REGIME = [['heros', 'joueur'], ['monstres_aura', 'monstre']];
function validerRegimesSynergie(entry, catalogs, path) {
  const erreurs = [];
  const regimes = entry.regimes;
  if (!regimes || typeof regimes !== 'object') return [`${path} > regimes doit être un objet { positif, negatif }`];
  for (const nom of REGIMES_SYNERGIE) {
    const regime = regimes[nom];
    if (!regime || typeof regime !== 'object') {
      erreurs.push(`${path} > regimes.${nom} manquant (pas de repli d'un régime sur l'autre)`);
      continue;
    }
    for (const [cote, cible] of COTES_REGIME) {
      const liste = regime[cote];
      if (!Array.isArray(liste)) {
        erreurs.push(`${path} > regimes.${nom}.${cote} doit être un tableau (vide s'il n'y a rien)`);
        continue;
      }
      liste.forEach((e, i) => {
        const chemin = `${path} > regimes.${nom}.${cote}[${i}]`;
        const effet = (catalogs.status_effects || []).find((s) => s.id === (e && e.effet));
        if (!effet) {
          erreurs.push(`${chemin} > effet "${e && e.effet}" introuvable dans status_effects.json`);
          return;
        }
        if (effet.cible !== cible) {
          erreurs.push(`${chemin} > "${effet.id}" vise "${effet.cible}", attendu "${cible}" de ce côté`);
        }
        if (e.par_palier !== undefined && typeof e.par_palier !== 'boolean') {
          erreurs.push(`${chemin} > par_palier doit être un booléen`);
        }
        if (e.multiplicateur !== undefined && (typeof e.multiplicateur !== 'number' || e.multiplicateur <= 0)) {
          erreurs.push(`${chemin} > multiplicateur doit être un nombre > 0`);
        }
      });
    }
  }
  return erreurs;
}

function validerStatusEffect(entry, catalogs, path) {
  const erreurs = [];
  if (!FAMILLES_STATUS.includes(entry.famille)) {
    erreurs.push(`${path} > famille doit être l'une de ${FAMILLES_STATUS.join('/')}`);
  }
  if (!CIBLES_STATUS.includes(entry.cible)) {
    erreurs.push(`${path} > cible doit être l'une de ${CIBLES_STATUS.join('/')}`);
  }
  if (!MODES_STATUS.includes(entry.mode)) {
    erreurs.push(`${path} > mode doit être l'un de ${MODES_STATUS.join('/')}`);
  }
  // `specs/10` §4.3 : un effet cible une stat primaire, un paramètre de
  // monstre, OU une DÉRIVÉE (Eau négatif ralentit le héros et raccourcit son
  // cooldown sans toucher l'Agilité : une redistribution entre deux dérivées,
  // pas un bonus de stat). Toujours exactement une cible.
  const aStat = entry.stat !== undefined;
  const aParam = entry.param !== undefined;
  const aDerivee = entry.derivee !== undefined;
  if ([aStat, aParam, aDerivee].filter(Boolean).length !== 1) {
    erreurs.push(`${path} > exactement un de "stat", "param" ou "derivee" doit être présent`);
  }
  if (aStat && !(catalogs.stats || []).some((s) => s.id === entry.stat)) {
    erreurs.push(`${path} > stat "${entry.stat}" introuvable dans stats.json`);
  }
  if (aDerivee && !(catalogs.stats_derivees || []).some((d) => d.id === entry.derivee)) {
    erreurs.push(`${path} > derivee "${entry.derivee}" introuvable dans stats_derivees.json`);
  }
  if (aDerivee && entry.cible !== 'joueur') {
    erreurs.push(`${path} > une dérivée n'existe que pour le héros (cible "joueur")`);
  }
  if (entry.famille === 'dot' && (typeof entry.intervalle_ms !== 'number' || entry.intervalle_ms <= 0)) {
    erreurs.push(`${path} > un effet "dot" doit déclarer intervalle_ms > 0`);
  }
  if (typeof entry.valeur !== 'number') {
    erreurs.push(`${path} > valeur doit être numérique`);
  }
  if (entry.duree !== 'permanente' && entry.duree !== 'aura' && typeof entry.duree !== 'number') {
    erreurs.push(`${path} > duree doit être "permanente", "aura" ou un nombre de ms`);
  }
  return erreurs;
}

// Cross-référence générique vers visuels.json pour un champ `render.visuel`
// (03_grotte-polish §2.1/§3.3) : réutilisée par companions/enemies/puzzles,
// qui ont chacun un `custom` propre par ailleurs — pas une entrée du
// mécanisme générique `refs` (qui ne lit que des champs de premier niveau,
// jamais `entry.render.visuel`).
// `xp` optionnel (`D-58`) : porté par `items.json` (ramassage au sol),
// `resources.json` (récolte à l'outil) et `stations.json` (le puits). Absent
// = cette entrée ne rapporte rien, le cas le plus courant. PRÉSENT, il doit
// être un nombre fini ≥ 0 : un `"xp": "3"` ou un `"xp": -1` passerait sans
// bruit jusqu'à `xp.js#xpDeCatalogue`, qui rendrait une chaîne ou retirerait
// de l'XP — le genre de faute qui ne se voit qu'en jouant longtemps.
function erreursXpOptionnel(entry, path) {
  if (entry.xp === undefined) return [];
  if (typeof entry.xp !== 'number' || !Number.isFinite(entry.xp) || entry.xp < 0) {
    return [`${path} > xp doit être un nombre fini >= 0 (ou absent)`];
  }
  return [];
}

function erreursRenderVisuel(entry, catalogs, path) {
  const visuel = entry.render && entry.render.visuel;
  if (typeof visuel !== 'string' || !(catalogs.visuels || []).some((v) => v.id === visuel)) {
    return [`${path} > render.visuel "${visuel}" introuvable dans visuels.json`];
  }
  return [];
}

// `D-34` : échelle du follet EN JEU (optionnelle, 1 par défaut), distincte de
// la taille que la cinématique du choix lui donne. Même garde que
// `visuel.echelle` : une échelle nulle ou négative rendrait le compagnon
// invisible ou retourné, et personne ne le verrait avant de jouer la nuit.
function erreursCompanion(entry, catalogs, path) {
  const erreurs = erreursRenderVisuel(entry, catalogs, path);
  if (entry.echelle_jeu !== undefined && (typeof entry.echelle_jeu !== 'number' || entry.echelle_jeu <= 0)) {
    erreurs.push(`${path} > echelle_jeu doit être un nombre strictement positif`);
  }
  // specs/08_menus-cartes.md §4.5 : l'accent des menus. Ici, la FORME seule
  // (`#rrggbb`, le seul format que le contrôle de contraste sait comparer).
  // Le contraste lui-même se juge contre le fond des cartes, qui est un jeton
  // de la feuille de style : ce module pur ne le connaît pas, c'est
  // `ui/couleurs_ui.js` qui tranche au démarrage, jetons en main.
  // Distinct de `render.couleur` à dessein : la couleur d'un follet dans le
  // monde (sur un voile de nuit) et celle d'une bordure de carte n'ont pas à
  // rester égales pour toujours, même si elles le sont aujourd'hui.
  if (entry.couleur_ui !== undefined && !/^#[0-9a-f]{6}$/i.test(entry.couleur_ui)) {
    erreurs.push(`${path} > couleur_ui doit être une couleur #rrggbb`);
  }
  return erreurs;
}

// specs/04_stations-proportions-collision.md §2 : `echelle`/`solide`/
// `empreinte`, communs aux types "levier" et "station_placeholder" (les seuls
// à avoir une position). Un défaut absent = comportement Phase 2 inchangé
// (`echelle` 1, `solide` false) — un catalogue existant sans ces champs reste
// valide tel quel.
function erreursGeometrieInteractif(entry, catalogs, path) {
  const erreurs = [];
  if (entry.echelle !== undefined && (typeof entry.echelle !== 'number' || entry.echelle <= 0)) {
    erreurs.push(`${path} > echelle doit être un nombre positif si présent`);
  }
  if (entry.solide !== undefined && typeof entry.solide !== 'boolean') {
    erreurs.push(`${path} > solide doit être un booléen si présent`);
  }
  if (entry.empreinte !== undefined) {
    const e = entry.empreinte;
    const champsValides = e && ['x', 'y', 'w', 'h'].every((c) => typeof e[c] === 'number');
    if (!champsValides || e.w <= 0 || e.h <= 0) {
      erreurs.push(`${path} > empreinte doit être { x, y, w, h } en nombres, w/h > 0`);
    }
  }
  // §4 : une collision invisible est un bug garanti — refusé au boot.
  if (entry.solide === true && !(entry.render && typeof entry.render.visuel === 'string')) {
    erreurs.push(`${path} > solide: true exige un render.visuel (une collision invisible est refusée)`);
  }
  return erreurs;
}

function validerPuzzle(entry, catalogs, path) {
  const erreurs = [];
  const flagsDeclares = new Set((catalogs.flags || []).map((f) => f.id));
  if (entry.flag_pose != null && !flagsDeclares.has(entry.flag_pose)) {
    erreurs.push(`${path} > flag_pose "${entry.flag_pose}" introuvable dans flags.json`);
  }
  if (entry.type === 'levier') {
    if (!entry.position || typeof entry.position.x !== 'number' || typeof entry.position.y !== 'number') {
      erreurs.push(`${path} > position doit être { x, y }`);
    }
    // Seules les instances "levier" sont dessinées individuellement (une
    // "sequence" ne fait que référencer des leviers déjà rendus) — §2.1 de
    // 03_grotte-polish.md.
    erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
    erreurs.push(...erreursGeometrieInteractif(entry, catalogs, path));
  } else if (entry.type === 'sequence') {
    const puzzlesDeclares = new Set((catalogs.puzzles || []).map((p) => p.id));
    if (!Array.isArray(entry.ordre) || entry.ordre.length === 0) {
      erreurs.push(`${path} > ordre doit être un tableau non vide d'id de leviers`);
    } else {
      for (const id of entry.ordre) {
        if (!puzzlesDeclares.has(id)) erreurs.push(`${path} > ordre[] > "${id}" introuvable dans puzzles.json`);
      }
    }
    if (typeof entry.reinit_si_erreur !== 'boolean') {
      erreurs.push(`${path} > reinit_si_erreur doit être un booléen`);
    }
  } else if (entry.type === 'station_placeholder') {
    // 03_maison-exterieur §3.4 : table/coffre/atelier/puits — interactif
    // stateless (aucune entrée dans puzzles.js#etatInitial), INTERACT à
    // portée ouvre simplement `dialogue`. Conservé au schéma pour un futur
    // placeholder (ex. une station pas encore prête), mais plus aucune
    // entrée réelle n'utilise ce type depuis Palier A de 04_maison-interieur
    // (changées en "station").
    if (!entry.position || typeof entry.position.x !== 'number' || typeof entry.position.y !== 'number') {
      erreurs.push(`${path} > position doit être { x, y }`);
    }
    const dialoguesDeclares = new Set((catalogs.dialogues || []).map((d) => d.id));
    if (!dialoguesDeclares.has(entry.dialogue)) {
      erreurs.push(`${path} > dialogue "${entry.dialogue}" introuvable dans dialogues.json`);
    }
    erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
    erreurs.push(...erreursGeometrieInteractif(entry, catalogs, path));
  } else if (entry.type === 'station') {
    // Palier A (specs/04_maison-interieur.md §3.1) : station réelle — une
    // instance positionnée référence un TYPE de stations.json (rôle, rendu
    // par défaut, capacité éventuelle), à la même position que l'ancien
    // placeholder (jamais redessinée, cf. journal). Pas de `dialogue` ici :
    // l'interaction dépend du rôle de la station (craft/stockage/eau),
    // résolue par main.js, jamais par un texte statique.
    if (!entry.position || typeof entry.position.x !== 'number' || typeof entry.position.y !== 'number') {
      erreurs.push(`${path} > position doit être { x, y }`);
    }
    if (!(catalogs.stations || []).some((s) => s.id === entry.station_type)) {
      erreurs.push(`${path} > station_type "${entry.station_type}" introuvable dans stations.json`);
    }
    erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
    erreurs.push(...erreursGeometrieInteractif(entry, catalogs, path));
  } else {
    erreurs.push(`${path} > type "${entry.type}" inconnu (levier | sequence | station_placeholder | station)`);
  }
  return erreurs;
}

const LOCUTEURS_DIALOGUE = ['narrateur', 'follet'];

function validerDialogue(entry, catalogs, path) {
  // Spec 11, palier B : les `lignes` d'avant ont toutes migré. Une entrée qui
  // en porterait encore serait écrite pour un moteur qui n'existe plus.
  if (entry.lignes !== undefined) return [`${path} > lignes : forme retirée au palier B de la spec 11, écrire des noeuds`];
  if (entry.mesure !== undefined && typeof entry.mesure !== 'boolean') {
    return [`${path} > mesure doit être un booléen (false : ni spam ni lecture comptés)`];
  }
  return validerConversation(entry, catalogs, path);
}

// Ce qu'une option peut faire. `valeurs` attend une décision (`Q-105` : les
// valeurs nommées de `flags.js` sont LUES dans l'état du monde, aucune n'a de
// quoi recevoir un delta) : elle est REFUSÉE plutôt qu'ignorée — une donnée
// écrite pour rien ne doit pas passer pour une donnée qui marche.
const CONSEQUENCES_OPTION = ['alignement', 'flags', 'effets_monde'];
const CONSEQUENCES_A_VENIR = ['valeurs'];

function validerConversation(entry, catalogs, path) {
  const erreurs = [];
  if (typeof entry.entree !== 'string') erreurs.push(`${path} > entree manquante (l'id du premier nœud)`);
  const noeuds = entry.noeuds && typeof entry.noeuds === 'object' && !Array.isArray(entry.noeuds) ? entry.noeuds : {};
  const flagsDeclares = new Set((catalogs.flags || []).map((f) => f.id));
  // Les bornes d'une option sont celles de l'alignement lui-même : un poids
  // plus grand que l'échelle entière ne veut rien dire.
  const config = (catalogs.alignement || []).find((a) => a.id === 'alignement_config');
  const bornes = config && config.bornes ? config.bornes : null;
  for (const [id, noeud] of Object.entries(noeuds)) {
    const chemin = `${path} > noeuds.${id}`;
    if (!noeud || typeof noeud !== 'object') {
      erreurs.push(`${chemin} doit être un objet`);
      continue;
    }
    if (!LOCUTEURS_DIALOGUE.includes(noeud.locuteur)) {
      erreurs.push(`${chemin} > locuteur doit être l'un de ${LOCUTEURS_DIALOGUE.join('/')}`);
    }
    if (typeof noeud.text_key !== 'string') erreurs.push(`${chemin} > text_key manquant`);
    const options = noeud.options === undefined ? [] : noeud.options;
    if (!Array.isArray(options)) {
      erreurs.push(`${chemin} > options doit être un tableau`);
      continue;
    }
    if (options.length > 0 && (options.length < OPTIONS_MIN || options.length > OPTIONS_MAX)) {
      erreurs.push(`${chemin} > ${options.length} options : un choix en porte de ${OPTIONS_MIN} à ${OPTIONS_MAX} (la bulle ne défile pas)`);
    }
    // Un nœud à options part par ses options ; sa propre `suite` serait une
    // seconde sortie que personne ne prend.
    if (options.length > 0 && noeud.suite !== undefined) {
      erreurs.push(`${chemin} > suite sur un nœud à options : ce sont les options qui mènent quelque part`);
    }
    if (options.length > 0) {
      const defauts = options.filter((o) => o && o.defaut === true).length;
      if (defauts !== 1) erreurs.push(`${chemin} > ${defauts} option(s) defaut : il en faut exactement une (celle de qui avance sans choisir)`);
    }
    options.forEach((option, i) => {
      const cheminOption = `${chemin} > options[${i}]`;
      if (!option || typeof option !== 'object') {
        erreurs.push(`${cheminOption} doit être un objet`);
        return;
      }
      if (typeof option.text_key !== 'string') erreurs.push(`${cheminOption} > text_key manquant`);
      if (option.suite !== undefined && option.suite !== null && typeof option.suite !== 'string') {
        erreurs.push(`${cheminOption} > suite doit être un id de nœud ou null`);
      }
      // §3 : l'option par défaut est celle de qui spamme A — sa conséquence
      // est TOUJOURS vide, sans quoi spammer rapporterait (ou coûterait) autre
      // chose que le poids du spam lui-même.
      if (option.defaut === true) {
        const portees = [...CONSEQUENCES_OPTION, ...CONSEQUENCES_A_VENIR].filter((c) => option[c] !== undefined);
        if (portees.length > 0) erreurs.push(`${cheminOption} > l'option defaut ne porte aucune conséquence (trouvé : ${portees.join(', ')})`);
      }
      for (const c of CONSEQUENCES_A_VENIR) {
        if (option[c] !== undefined) erreurs.push(`${cheminOption} > ${c} n'est pas encore pris en charge (en attente de Q-105)`);
      }
      if (option.alignement !== undefined) {
        if (typeof option.alignement !== 'number' || !Number.isFinite(option.alignement)) {
          erreurs.push(`${cheminOption} > alignement doit être un nombre`);
        } else if (bornes && (option.alignement < bornes.min || option.alignement > bornes.max)) {
          erreurs.push(`${cheminOption} > alignement ${option.alignement} hors des bornes [${bornes.min} ; ${bornes.max}]`);
        }
      }
      // Un effet de monde est un NOM du catalogue `effets_monde.json` (spec 11
      // §5) et une durée : un id inconnu tombe ici, jamais en jeu.
      if (option.effets_monde !== undefined) {
        const connus = new Set((catalogs.effets_monde || []).map((e) => e.id));
        if (!Array.isArray(option.effets_monde) || option.effets_monde.length === 0) {
          erreurs.push(`${cheminOption} > effets_monde doit être une liste non vide de { id, duree_ms }`);
        } else {
          option.effets_monde.forEach((e, j) => {
            if (!e || !connus.has(e.id)) erreurs.push(`${cheminOption} > effets_monde[${j}] : "${e && e.id}" introuvable dans effets_monde.json`);
            if (!e || typeof e.duree_ms !== 'number' || !(e.duree_ms > 0)) {
              erreurs.push(`${cheminOption} > effets_monde[${j}] > duree_ms doit être un nombre de ms positif`);
            }
          });
        }
      }
      if (option.flags !== undefined) {
        if (!Array.isArray(option.flags)) erreurs.push(`${cheminOption} > flags doit être un tableau d'ids`);
        else {
          for (const f of option.flags) {
            if (!flagsDeclares.has(f)) erreurs.push(`${cheminOption} > flag "${f}" introuvable dans flags.json`);
          }
        }
      }
    });
  }
  if (erreurs.length > 0) return erreurs;
  return erreursGrapheConversation(entry, path);
}

function validerLootTable(entry, catalogs, path) {
  const erreurs = [];
  if (!Array.isArray(entry.entrees) || entry.entrees.length === 0) {
    erreurs.push(`${path} > entrees doit être un tableau non vide`);
    return erreurs;
  }
  entry.entrees.forEach((e, i) => {
    if (typeof e.item !== 'string') erreurs.push(`${path} > entrees[${i}] > item manquant`);
    if (typeof e.min !== 'number' || typeof e.max !== 'number' || e.min > e.max) {
      erreurs.push(`${path} > entrees[${i}] > min/max invalides`);
    }
    if (typeof e.poids !== 'number' || e.poids <= 0) {
      erreurs.push(`${path} > entrees[${i}] > poids doit être un nombre positif`);
    }
  });
  return erreurs;
}

function validerWeapon(entry, catalogs, path) {
  const erreurs = [];
  const p = entry.portee;
  if (!p || typeof p.min !== 'number' || typeof p.max !== 'number' || p.min < 0 || p.min > p.max) {
    erreurs.push(`${path} > portee doit être { min, max } en tuiles, 0 <= min <= max`);
  }
  // `modificateurs` (`D-66`, T5) : { statId: delta }, optionnel. Décision de
  // Xav du 21/09 — l'épée en bois donne **Force +1**. C'est la 3ᵉ source de
  // modificateurs de stats après le compagnon et les buffs, et elle emprunte
  // exactement la même forme : le calcul des stats n'apprend rien, il
  // additionne une source de plus.
  //
  // Un id de stat inconnu tombe au boot : sinon le bonus serait simplement
  // ignoré, et « mon épée ne sert à rien » serait indébuggable en jeu.
  if (entry.modificateurs !== undefined) {
    const stats = new Set((catalogs.stats || []).map((st) => st.id));
    for (const [statId, delta] of Object.entries(entry.modificateurs)) {
      if (!stats.has(statId)) {
        erreurs.push(`${path} > modificateurs : stat "${statId}" introuvable dans stats.json`);
      }
      if (typeof delta !== 'number' || !Number.isFinite(delta)) {
        erreurs.push(`${path} > modificateurs.${statId} doit être un nombre fini`);
      }
    }
  }
  return erreurs;
}

// visuels.json (03_grotte-polish §2.1/§3.3) : catalogue de silhouettes
// interprétées par src/visuels.js#dessinerVisuel — la seule fonction de
// rendu de toute entité/motif du jeu. Une primitive de forme inconnue est un
// échec dur AU BOOT (jamais un dessin silencieusement vide en jeu, §3.3).
const ANCRES_VISUEL = ['centre', 'bas'];
const FORMES_VISUEL = ['cercle', 'ellipse', 'rect', 'polygone', 'ligne', 'degrade_radial'];

function erreursDegradeVisuel(degrade, chemin) {
  const erreurs = [];
  if (!degrade || !Array.isArray(degrade.stops) || degrade.stops.length < 2) {
    erreurs.push(`${chemin} > degrade doit être { stops[] } avec au moins 2 paliers`);
    return erreurs;
  }
  degrade.stops.forEach((stop, i) => {
    if (typeof stop.offset !== 'number' || stop.offset < 0 || stop.offset > 1) {
      erreurs.push(`${chemin} > degrade.stops[${i}].offset doit être entre 0 et 1`);
    }
    if (typeof stop.couleur !== 'string') {
      erreurs.push(`${chemin} > degrade.stops[${i}].couleur manquante`);
    }
  });
  return erreurs;
}

function validerVisuel(entry, catalogs, path) {
  const erreurs = [];
  if (!ANCRES_VISUEL.includes(entry.ancre)) {
    erreurs.push(`${path} > ancre doit être l'une de ${ANCRES_VISUEL.join('/')}`);
  }
  if (entry.ombre !== undefined) {
    const o = entry.ombre;
    if (!o || ['dy', 'w', 'h', 'alpha'].some((champ) => typeof o[champ] !== 'number')) {
      erreurs.push(`${path} > ombre doit être { dy, w, h, alpha } numériques`);
    }
  }
  if (entry.teintable !== undefined && typeof entry.teintable !== 'boolean') {
    erreurs.push(`${path} > teintable doit être un booléen`);
  }
  // MT_heros-echelle_2026-09-19 : `echelle` propre de la silhouette (absente
  // = 1, un catalogue existant reste valide). Refusée au boot si elle n'est
  // pas un nombre strictement positif — une échelle nulle ou négative rendrait
  // le héros invisible ET lui donnerait une hitbox dégénérée, les deux
  // dérivant désormais du même champ.
  if (entry.echelle !== undefined && (typeof entry.echelle !== 'number' || entry.echelle <= 0)) {
    erreurs.push(`${path} > echelle doit être un nombre strictement positif si présent`);
  }
  // `D-158` : une pièce qui BASCULE avec l'état de l'interactif (le manche
  // d'un levier) — un autre visuel, dessiné à `pivot` et tourné d'un angle
  // pris entre `angles[0]` (éteint) et `angles[1]` (allumé), en degrés.
  // Ainsi qu'une lumière qui ne brille qu'à l'état allumé (`lumiere_active`,
  // même forme que la lumière d'un motif de décor, `D-152`).
  if (entry.piece_mobile !== undefined) {
    const m = entry.piece_mobile;
    const paire = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number');
    if (!m || !paire(m.pivot) || !paire(m.angles)) {
      erreurs.push(`${path} > piece_mobile doit être { visuel, pivot: [dx, dy], angles: [éteint, allumé] }`);
    } else if (m.visuel === entry.id || !(catalogs.visuels || []).some((v) => v.id === m.visuel)) {
      erreurs.push(`${path} > piece_mobile > visuel "${m.visuel}" introuvable dans visuels.json (ou le visuel lui-même)`);
    }
  }
  if (entry.lumiere_active !== undefined) {
    const l = entry.lumiere_active;
    if (!l || typeof l.rayon !== 'number' || l.rayon <= 0 || (l.dy !== undefined && typeof l.dy !== 'number')
      || (l.couleur !== undefined && !/^#[0-9a-fA-F]{6}$/.test(l.couleur))) {
      erreurs.push(`${path} > lumiere_active doit être { rayon > 0, dy? numérique, couleur? #rrggbb }`);
    }
  }
  if (!Array.isArray(entry.primitives) || entry.primitives.length === 0) {
    erreurs.push(`${path} > primitives doit être un tableau non vide`);
    return erreurs;
  }

  entry.primitives.forEach((p, i) => {
    const chemin = `${path} > primitives[${i}]`;
    if (!FORMES_VISUEL.includes(p.forme)) {
      erreurs.push(`${chemin} > forme "${p.forme}" inconnue (${FORMES_VISUEL.join('/')})`);
      return;
    }
    if (typeof p.dx !== 'number' || typeof p.dy !== 'number') {
      erreurs.push(`${chemin} > dx/dy doivent être numériques`);
    }
    if (p.forme === 'polygone' || p.forme === 'ligne') {
      const pointsValides = Array.isArray(p.points) && p.points.length >= 2
        && p.points.every((pt) => Array.isArray(pt) && pt.length === 2 && pt.every((n) => typeof n === 'number'));
      if (!pointsValides) {
        erreurs.push(`${chemin} > points doit être un tableau d'au moins 2 paires [x, y] numériques`);
      }
    } else if (typeof p.w !== 'number' || (p.forme !== 'cercle' && typeof p.h !== 'number')) {
      erreurs.push(`${chemin} > w/h doivent être numériques`);
    }
    if (p.degrade !== undefined) {
      erreurs.push(...erreursDegradeVisuel(p.degrade, chemin));
    } else if (p.forme === 'degrade_radial') {
      erreurs.push(`${chemin} > un "degrade_radial" nécessite un champ degrade`);
    } else if (typeof p.couleur !== 'string') {
      erreurs.push(`${chemin} > couleur manquante (ou degrade)`);
    }
    if (p.teinte !== undefined) {
      if (typeof p.teinte !== 'boolean') {
        erreurs.push(`${chemin} > teinte doit être un booléen`);
      } else if (p.teinte && !entry.teintable) {
        erreurs.push(`${chemin} > teinte:true nécessite que le visuel déclare teintable:true`);
      }
    }
    if (p.alpha !== undefined && typeof p.alpha !== 'number') {
      erreurs.push(`${chemin} > alpha doit être numérique`);
    }
    if (p.rotation !== undefined && typeof p.rotation !== 'number') {
      erreurs.push(`${chemin} > rotation doit être numérique`);
    }
    if (p.forme === 'ligne' && p.epaisseur !== undefined && typeof p.epaisseur !== 'number') {
      erreurs.push(`${chemin} > epaisseur doit être numérique`);
    }
  });

  return erreurs;
}

// specs/08_menus-cartes.md §5 : un écran de cartes. Tout ce qui se juge sur
// le catalogue SEUL est refusé ici, au démarrage, avec son chemin — parce
// qu'un sous-écran mal déclaré ne se verrait sinon que le jour où quelqu'un
// l'ouvre. Ce qui demande autre chose que le catalogue (les textes des deux
// langues, les fonctions réellement branchées) vit dans `menu_cartes.js`.
const CHAMPS_INTERDITS_PAR_TYPE = {
  dossier: ['action', 'etat', 'danger'],
  bascule: ['cible', 'danger'],
  action: ['cible', 'etat'],
};

function validerCarteMenu(carte, catalogs, chemin, flagsDeclares) {
  const erreurs = [];
  if (carte === null || typeof carte !== 'object') return [`${chemin} > doit être un objet`];
  for (const champ of ['id', 'type', 'case', 'cle_titre', 'icone']) {
    if (carte[champ] === undefined) erreurs.push(`${chemin} > champ "${champ}" manquant`);
  }
  if (carte.type !== undefined && !TYPES_CARTE.includes(carte.type)) {
    erreurs.push(`${chemin} > type doit être l'un de ${TYPES_CARTE.join('/')}`);
    return erreurs;
  }
  // §4.2 : plus de six cartes → « le jeu refuse de démarrer : on crée un
  // dossier ». C'est la CASE qui porte la limite, pas le nombre d'entrées :
  // deux candidates d'une même case contextuelle n'occupent qu'une place.
  if (carte.case !== undefined && (!Number.isInteger(carte.case) || carte.case < 0 || carte.case >= CASES_MAX)) {
    erreurs.push(`${chemin} > case doit être un entier de 0 à ${CASES_MAX - 1} (jamais plus de ${CASES_MAX} cartes par écran : au-delà, on crée un dossier)`);
  }
  if (carte.icone !== undefined && !(catalogs.visuels || []).some((v) => v.id === carte.icone)) {
    erreurs.push(`${chemin} > icone > "${carte.icone}" introuvable dans visuels.json`);
  }
  for (const champ of CHAMPS_INTERDITS_PAR_TYPE[carte.type] || []) {
    if (carte[champ] !== undefined) erreurs.push(`${chemin} > "${champ}" n'a pas de sens sur une carte de type "${carte.type}"`);
  }
  if (carte.type === 'dossier' && typeof carte.cible !== 'string') erreurs.push(`${chemin} > une carte dossier exige une cible`);
  if ((carte.type === 'bascule' || carte.type === 'action') && typeof carte.action !== 'string') {
    erreurs.push(`${chemin} > une carte ${carte.type} exige une action`);
  }
  // Une bascule affiche « l'état réel, relu à la source » À LA PLACE de la
  // phrase : son lecteur d'état est donc obligatoire, et sa phrase interdite
  // (deux lignes sous le titre ne tiennent pas dans une carte à 280 px).
  if (carte.type === 'bascule') {
    if (typeof carte.etat !== 'string') erreurs.push(`${chemin} > une carte bascule exige un etat (lecteur de l'état réel)`);
    if (carte.cle_phrase !== undefined) erreurs.push(`${chemin} > une carte bascule affiche son état, pas une cle_phrase`);
  } else if (carte.type !== undefined && typeof carte.cle_phrase !== 'string') {
    erreurs.push(`${chemin} > champ "cle_phrase" manquant`);
  }
  if (carte.danger !== undefined && typeof carte.danger !== 'boolean') erreurs.push(`${chemin} > danger doit être un booléen`);
  // `danger: true` → magenta ET écran de confirmation (§4.1). La confirmation
  // est construite par le composant, toujours la même (« Non » d'abord, focus
  // par défaut) ; la carte n'apporte que ses deux textes. Exigés ici : une
  // action destructive sans question lisible est refusée au démarrage.
  for (const champ of ['cle_confirmation', 'cle_confirmer']) {
    if (carte.danger === true && typeof carte[champ] !== 'string') erreurs.push(`${chemin} > danger: true exige "${champ}"`);
    if (carte.danger !== true && carte[champ] !== undefined) erreurs.push(`${chemin} > "${champ}" n'a de sens qu'avec danger: true`);
  }
  erreurs.push(...erreursCondition(carte.condition, chemin, flagsDeclares));
  return erreurs;
}

function validerMenu(entry, catalogs, path) {
  const erreurs = [];
  const flagsDeclares = new Set((catalogs.flags || []).map((f) => f.id));
  if (!Array.isArray(entry.cartes) || entry.cartes.length === 0) {
    erreurs.push(`${path} > cartes doit être un tableau non vide`);
    return erreurs;
  }
  entry.cartes.forEach((carte, i) => {
    erreurs.push(...validerCarteMenu(carte, catalogs, `${path} > ${(carte && carte.id) || `cartes[${i}]`}`, flagsDeclares));
  });

  // Case contextuelle (§4.2) : plusieurs cartes peuvent viser la MÊME case —
  // ce sont des candidates, dans l'ordre du fichier, et la première dont la
  // condition est vraie s'affiche. Une candidate placée après une carte sans
  // condition ne s'afficherait donc jamais : donnée morte, refusée.
  const parCase = new Map();
  for (const carte of entry.cartes) {
    if (!carte || !Number.isInteger(carte.case)) continue;
    const precedentes = parCase.get(carte.case) || [];
    const bouchon = precedentes.find((c) => c.condition === undefined || c.condition === null);
    if (bouchon) {
      erreurs.push(`${path} > ${carte.id} > case ${carte.case} déjà tenue par "${bouchon.id}", qui n'a pas de condition : cette carte ne s'afficherait jamais`);
    }
    parCase.set(carte.case, [...precedentes, carte]);
  }

  // Les deux icônes de l'en-tête ([X] et [←], §2 décision 1) sont des
  // références comme les autres : déclarées par l'écran racine, jamais un id
  // de catalogue écrit dans le composant.
  if (entry.racine !== undefined && typeof entry.racine !== 'boolean') erreurs.push(`${path} > racine doit être un booléen`);
  for (const champ of ['icone_fermer', 'icone_retour']) {
    if (entry.racine === true && typeof entry[champ] !== 'string') erreurs.push(`${path} > l'écran racine exige "${champ}"`);
    if (entry[champ] !== undefined && !(catalogs.visuels || []).some((v) => v.id === entry[champ])) {
      erreurs.push(`${path} > ${champ} > "${entry[champ]}" introuvable dans visuels.json`);
    }
  }

  // Contrôles qui portent sur le catalogue ENTIER : faits une seule fois, en
  // passant sur la première entrée (le registre appelle `custom` par entrée).
  const tous = catalogs.menus || [];
  if (tous[0] === entry) {
    const racines = tous.filter((e) => e && e.racine === true);
    if (racines.length !== 1) {
      erreurs.push(`menus.json > exactement un écran doit porter racine: true (trouvé : ${racines.length})`);
    }
    const vus = new Map();
    for (const ecran of tous) {
      for (const carte of (ecran && ecran.cartes) || []) {
        if (!carte || carte.id === undefined) continue;
        if (vus.has(carte.id)) erreurs.push(`menus.json > ${ecran.id} > ${carte.id} > id de carte déjà utilisé dans "${vus.get(carte.id)}"`);
        else vus.set(carte.id, ecran.id);
      }
    }
    // « Tout écran est atteignable depuis la racine » : un écran orphelin est
    // du contenu que le joueur ne verra jamais, et qu'on croira livré.
    if (racines.length === 1) {
      const parId = new Map(tous.map((e) => [e.id, e]));
      const atteints = new Set([racines[0].id]);
      const file = [racines[0]];
      while (file.length > 0) {
        for (const carte of file.shift().cartes || []) {
          if (carte && parId.has(carte.cible) && !atteints.has(carte.cible)) {
            atteints.add(carte.cible);
            file.push(parId.get(carte.cible));
          }
        }
      }
      for (const ecran of tous) {
        if (ecran && !atteints.has(ecran.id)) erreurs.push(`menus.json > ${ecran.id} > inatteignable depuis l'écran racine`);
      }
    }
  }
  return erreurs;
}

// Les catégories d'objets. Exportée depuis specs/08_menus-cartes.md (palier C) :
// la fiche d'un objet affiche sa catégorie, donc chaque catégorie a une clé de
// texte (`item.categorie.<catégorie>`) — et le contrôle de démarrage des textes
// a besoin de la liste pour vérifier qu'aucune ne manque, en FR comme en EN.
// `arme` ajoutée par `D-66` (T5) : une arme se fabrique, se range en poche et
// s'équipe. C'est la PREMIÈRE fois qu'un objet de poche pointe vers un autre
// catalogue — d'où le champ `arme` validé en référence ci-dessous.
export const CATEGORIES_ITEM = ['ressource', 'nourriture', 'valeur', 'outil', 'arme'];

export const SCHEMAS = {
  elements: {
    requiredFields: ['id', 'label_key', 'icon', 'shape'],
    idField: 'id',
    refs: [],
    custom: null,
  },
  tiles: {
    // CONVENTION du grain (`D-105`, exploitée par le levier `grain_sol` du
    // palier C de `specs/09_reglages-graphiques.md`) : dans le visuel cité
    // par `render.visuel`, **les primitives sont rangées par importance
    // décroissante**. Le preset Bas coupe la liste par la fin, donc les
    // premières sont celles qu'on garde en dernier recours. Rien ici ne peut
    // le vérifier — c'est une règle d'auteur, pas une propriété de données —,
    // mais elle est écrite là où on écrit un grain, et non dans le code qui
    // le coupe.
    requiredFields: ['id', 'solid', 'render'],
    idField: 'id',
    refs: [],
    custom: validerTile,
  },
  scenes: {
    requiredFields: ['id', 'width', 'height', 'tile_size', 'layout', 'spawn', 'seed'],
    idField: 'id',
    refs: [],
    custom: validerScene,
  },
  stats: {
    // `icone` (`D-13`) : la silhouette montrée au bandeau HUD quand un buff
    // renforce cette stat. Elle vit ICI, sur la stat, et non sur l'effet —
    // décision verrouillée du 19/09 : « l'icône représente l'effet (la stat
    // renforcée), jamais le plat : ajouter une stat = une icône, pas une par
    // recette ». `buff_repas` et `buff_vitalite` montrent donc la même.
    // Posée en RÉFÉRENCE (id inconnu = échec dur au boot avec son chemin
    // exact) mais **optionnelle**, comme `weapons.icone` l'est depuis
    // `D-20 B` et `companions.echelle_jeu` depuis `D-34` : un catalogue
    // existant doit rester valide tel quel, et une douzaine de fixtures de
    // test déclarent une stat minimale pour des sujets qui n'ont rien à voir
    // avec les icônes. Ce n'est pas un trou pour autant — le catalogue RÉEL
    // du jeu, lui, est tenu d'en déclarer une pour chaque stat, et c'est
    // `tests/test_d13_buffs_bandeau_2026-09-20.js` (bloc 1) qui l'exige.
    // Une stat sans icône ne casse rien : ses buffs sont simplement absents
    // du bandeau, jamais dessinés en trou (cf. main.js).
    requiredFields: ['id', 'label_key', 'base'],
    idField: 'id',
    refs: [{ field: 'icone', catalog: 'visuels' }],
    custom: null,
  },
  stats_derivees: {
    requiredFields: ['id', 'label_key', 'stat', 'formule'],
    idField: 'id',
    refs: [{ field: 'stat', catalog: 'stats' }],
    custom: validerStatDerivee,
  },
  action_slots: {
    requiredFields: ['id', 'verb'],
    idField: 'id',
    refs: [],
    custom: null,
  },
  // `defaut` (optionnel, D-20) : l'objet équipé d'office quand la sauvegarde
  // n'en désigne aucun — déclaré ici plutôt qu'en littéral dans le code, pour
  // qu'échanger l'arme de départ reste un changement de données. Passer par
  // une REF (et non par un drapeau sur l'arme elle-même) fait tomber un id
  // inconnu en échec dur au boot, avec son chemin exact, via la machinerie
  // déjà en place — jamais un `undefined` qui casserait en pleine partie.
  // La cible est `weapons` parce que c'est le seul slot qui ait un défaut
  // aujourd'hui ; le jour où l'armure en aura un, c'est le slot qui devra
  // dire son catalogue (pas avant : aucun second cas d'usage réel).
  equipment_slots: {
    requiredFields: ['id', 'label_key'],
    idField: 'id',
    refs: [{ field: 'defaut', catalog: 'weapons' }],
    custom: null,
  },
  flags: {
    requiredFields: ['id', 'label_key'],
    idField: 'id',
    refs: [],
    custom: null,
  },
  unlocks: {
    requiredFields: ['id', 'condition', 'target'],
    idField: 'id',
    refs: [{ field: 'target', catalog: 'flags' }],
    custom: null,
  },
  status_effects: {
    requiredFields: ['id', 'label_key', 'famille', 'cible', 'valeur', 'mode', 'duree', 'cumul', 'icone'],
    idField: 'id',
    refs: [],
    custom: validerStatusEffect,
  },
  // `specs/10` §4.2 : une synergie porte DEUX régimes, choisis par le signe de
  // l'alignement. L'ancienne paire `effet_joueur` / `effet_monstre` est
  // devenue `regimes.positif`, valeurs identiques (tenu par test).
  synergies: {
    requiredFields: ['id', 'element', 'regimes'],
    idField: 'id',
    refs: [{ field: 'element', catalog: 'elements' }],
    custom: validerRegimesSynergie,
  },
  // MT_trainee-poussiere_2026-09-19 : catalogue des réglages d'effets
  // purement visuels du monde. Même patron que `survie_config` dans
  // survival.json (une entrée de configuration dans son catalogue) — un 2ᵉ
  // effet s'ajoute en ajoutant une entrée, sans toucher au schéma.
  effets: {
    // `visuel` n'est plus requis depuis MT_texte-flottant_2026-09-19 (`D-05`) :
    // un effet de type `texte` n'a pas de silhouette, il a un gabarit de
    // localisation. Il reste une RÉFÉRENCE quand il est présent (id inconnu =
    // échec dur au boot avec son chemin exact, cf. registry.js).
    // `role` est REQUIS depuis `specs/09_reglages-graphiques.md` §4.2, et sans
    // aucun repli : c'est lui qui décide ce que le preset Bas a le droit de
    // retirer. Un repli (« absent = cosmétique ») ferait disparaître en Bas le
    // prochain effet qu'on oublierait de classer — or ce qui se retire est
    // justement ce qui ne dit rien au joueur. Ajouter un effet, c'est déclarer
    // son rôle, sinon le jeu ne démarre pas.
    requiredFields: ['id', 'type', 'role'],
    idField: 'id',
    refs: [
      { field: 'visuel', catalog: 'visuels' },
      // `D-108` : le curseur a DEUX silhouettes (l'orbe et sa particule
      // d'orbite). Une référence, donc un id inconnu tombe au boot avec son
      // chemin, comme partout ailleurs.
      { field: 'visuel_particule', catalog: 'visuels' },
    ],
    custom(entry, catalogs, path) {
      const erreurs = [];
      // Tous les seuils sont PROVISOIRES (à régler au ressenti par Xav), mais
      // leur type et leur signe, eux, sont vérifiés au boot.
      //
      // Le jeu de champs attendu dépend du `type`, déclaré explicitement en
      // données plutôt que deviné à la présence d'un champ : sans ça, une
      // faute de frappe sur `intervalle_px` ferait passer la poussière pour un
      // effet d'un autre genre, et la validation ne dirait rien.
      // `vol` (`D-36`) : un décalage purement visuel, sans silhouette ni
      // gabarit — d'où un 3ᵉ jeu de champs. Ajouter un genre d'effet reste
      // ce qu'il était : une branche de plus ici, et rien ailleurs.
      // `clignement` (`D-65`, T8) : les durées d'une séquence de paupières.
      // Sa durée totale est la SOMME de ses ouvertures et de ses noirs, donc
      // il n'a pas de `duree_ms` — d'où un 4ᵉ jeu de champs.
      // `curseur` (`D-108`) : la tête du curseur de souris et son orbite.
      // 5ᵉ jeu de champs — il n'a ni durée ni gabarit, mais une orbite et
      // un nombre de particules, et il vit dans l'ÉCRAN et non dans le
      // monde. C'est la branche de plus annoncée juste au-dessus, et rien
      // ailleurs.
      // `orbite` et `respiration` (`Q-58`, `D-134`) : les ORNEMENTS du follet —
      // des étincelles qui lui tournent autour, et un halo qui respire. Ni
      // l'un ni l'autre ne vit hors de Haut aujourd'hui, et c'est `ornement_min`
      // qui le dit, pas le type.
      const TYPES = ['particules', 'texte', 'vol', 'clignement', 'curseur', 'orbite', 'respiration'];
      if (!TYPES.includes(entry.type)) {
        erreurs.push(`${path} > type doit valoir ${TYPES.map((t) => `"${t}"`).join(' ou ')}`);
        return erreurs;
      }

      // `ornement_min` (`D-134`, facultatif, tout type) : le niveau du levier
      // `ornements` à partir duquel l'effet existe. Absent = toujours. C'est un
      // SEUIL et pas une liste de presets : l'effet ne connaît pas le mot
      // « haut », il dit de combien d'ornement il a besoin, et le catalogue des
      // presets dit combien chacun en donne. Seul un effet cosmétique peut en
      // porter un : ce qui informe le joueur ne se réserve pas à une machine.
      if (entry.ornement_min !== undefined) {
        if (!Number.isInteger(entry.ornement_min) || entry.ornement_min < 0) {
          erreurs.push(`${path} > ornement_min doit être un entier positif ou nul`);
        } else if (entry.role !== 'cosmetique') {
          erreurs.push(`${path} > ornement_min est réservé aux effets "cosmetique" (une information ne dépend pas du réglage)`);
        }
      }

      if (entry.type === 'orbite') {
        // Mêmes champs d'orbite que le curseur (`curseur.js#positionsOrbite`
        // les lit tels quels), plus l'échelle d'une étincelle.
        if (!Number.isInteger(entry.nb_particules) || entry.nb_particules < 0) {
          erreurs.push(`${path} > nb_particules doit être un entier positif ou nul`);
        }
        if (typeof entry.rayon_orbite_px !== 'number' || entry.rayon_orbite_px < 0) {
          erreurs.push(`${path} > rayon_orbite_px doit être un nombre positif ou nul`);
        }
        if (typeof entry.aplatissement !== 'number' || entry.aplatissement < 0 || entry.aplatissement > 1) {
          erreurs.push(`${path} > aplatissement doit être un nombre entre 0 et 1 (1 = orbite ronde, 0 = orbite plate)`);
        }
        if (typeof entry.periode_ms !== 'number' || entry.periode_ms <= 0) {
          erreurs.push(`${path} > periode_ms doit être un nombre strictement positif`);
        }
        if (entry.sens !== 1 && entry.sens !== -1) {
          erreurs.push(`${path} > sens doit valoir 1 ou -1 (sens de rotation, jamais un facteur)`);
        }
        if (typeof entry.phase_rad !== 'number' || !Number.isFinite(entry.phase_rad)) {
          erreurs.push(`${path} > phase_rad doit être un nombre fini`);
        }
        if (typeof entry.echelle !== 'number' || entry.echelle <= 0) {
          erreurs.push(`${path} > echelle doit être un nombre strictement positif`);
        }
        if (typeof entry.visuel !== 'string') {
          erreurs.push(`${path} > visuel (l'étincelle) est requis pour un effet de type "orbite"`);
        }
        return erreurs;
      }

      if (entry.type === 'respiration') {
        // Un facteur qui oscille autour de 1 : 1 ± amplitude. Une amplitude
        // ≥ 1 ferait passer le facteur par zéro (halo éteint à chaque souffle)
        // ou sous zéro (un alpha négatif) — refusé au boot.
        if (typeof entry.periode_ms !== 'number' || entry.periode_ms <= 0) {
          erreurs.push(`${path} > periode_ms doit être un nombre strictement positif`);
        }
        if (typeof entry.amplitude !== 'number' || entry.amplitude < 0 || entry.amplitude >= 1) {
          erreurs.push(`${path} > amplitude doit être un nombre dans [0, 1[ (le facteur reste positif)`);
        }
        return erreurs;
      }

      // `specs/09` §4.2 : deux rôles, et pas un troisième. « cosmetique » = le
      // preset Bas a le droit de le retirer · « information » = il dit quelque
      // chose au joueur (le « +1 » qui enseigne la boucle, les paupières), il
      // reste dans tous les presets.
      const ROLES = ['cosmetique', 'information'];
      if (!ROLES.includes(entry.role)) {
        erreurs.push(`${path} > role doit valoir ${ROLES.map((r) => `"${r}"`).join(' ou ')} (ce que Bas a le droit de retirer)`);
      }

      if (entry.type === 'curseur') {
        // Le dessin du curseur n'est jamais exercé headless (c'est du rendu),
        // et un réglage absurde ne se verrait donc que sur l'écran de Xav :
        // tout ce qui ferait un curseur invisible, figé ou `NaN` tombe ici.
        if (typeof entry.echelle !== 'number' || entry.echelle <= 0) {
          erreurs.push(`${path} > echelle doit être un nombre strictement positif`);
        }
        if (!Number.isInteger(entry.nb_particules) || entry.nb_particules < 0) {
          erreurs.push(`${path} > nb_particules doit être un entier positif ou nul`);
        }
        // Rayon nul ACCEPTÉ (même raison que `vol`) : c'est le repli « les
        // particules au centre de l'orbe », qui doit s'obtenir en changeant un
        // nombre. Une période nulle, elle, donnerait une division par zéro.
        if (typeof entry.rayon_orbite_px !== 'number' || entry.rayon_orbite_px < 0) {
          erreurs.push(`${path} > rayon_orbite_px doit être un nombre positif ou nul`);
        }
        if (typeof entry.aplatissement !== 'number' || entry.aplatissement < 0 || entry.aplatissement > 1) {
          erreurs.push(`${path} > aplatissement doit être un nombre entre 0 et 1 (1 = orbite ronde, 0 = orbite plate)`);
        }
        if (typeof entry.periode_ms !== 'number' || entry.periode_ms <= 0) {
          erreurs.push(`${path} > periode_ms doit être un nombre strictement positif`);
        }
        // Même raison que pour `vol` : `sens` est un sens, jamais un facteur
        // de vitesse — sinon la période cesserait de dire la vérité.
        if (entry.sens !== 1 && entry.sens !== -1) {
          erreurs.push(`${path} > sens doit valoir 1 ou -1 (sens de rotation, jamais un facteur)`);
        }
        if (typeof entry.phase_rad !== 'number' || !Number.isFinite(entry.phase_rad)) {
          erreurs.push(`${path} > phase_rad doit être un nombre fini`);
        }
        // `D-109` : le stick droit pilote le curseur. Une vitesse nulle le
        // rendrait immobile sans que rien ne le dise, et une courbe nulle ou
        // négative inverserait la réponse du stick (plus on pousse, moins ça
        // va) — deux réglages qu'on veut voir tomber au boot.
        if (typeof entry.vitesse_stick_px_s !== 'number' || entry.vitesse_stick_px_s <= 0) {
          erreurs.push(`${path} > vitesse_stick_px_s doit être un nombre strictement positif (px CSS par seconde)`);
        }
        if (typeof entry.courbe_stick !== 'number' || entry.courbe_stick <= 0) {
          erreurs.push(`${path} > courbe_stick doit être un nombre strictement positif (1 = réponse linéaire)`);
        }
        // Les deux silhouettes sont REQUISES ici, alors que le schéma générique
        // les rend seulement facultatives (l'effet `texte` n'en a pas) : un
        // curseur sans orbe serait un curseur invisible, et personne ne ferait
        // le lien avec ce catalogue.
        if (typeof entry.visuel !== 'string') {
          erreurs.push(`${path} > visuel (l'orbe) est requis pour un effet de type "curseur"`);
        }
        if (entry.nb_particules > 0 && typeof entry.visuel_particule !== 'string') {
          erreurs.push(`${path} > visuel_particule est requis dès que nb_particules > 0`);
        }
        return erreurs;
      }

      if (entry.type === 'clignement') {
        // Aucun repli, aucune valeur par défaut : c'est exactement le genre
        // de réglage qu'on veut voir tomber au boot plutôt qu'à la mort du
        // héros, le dessin n'étant jamais exercé en headless.
        if (!Array.isArray(entry.ouvertures_ms) || entry.ouvertures_ms.length === 0) {
          erreurs.push(`${path} > ouvertures_ms doit être un tableau non vide de durées`);
        } else {
          for (const duree of entry.ouvertures_ms) {
            if (typeof duree !== 'number' || duree <= 0) {
              erreurs.push(`${path} > ouvertures_ms : ${JSON.stringify(duree)} doit être un nombre positif`);
            }
          }
        }
        if (typeof entry.noir_ms !== 'number' || entry.noir_ms < 0) {
          erreurs.push(`${path} > noir_ms doit être un nombre >= 0`);
        }
        return erreurs;
      }

      // `duree_ms` est commun aux autres : une durée nulle donne un effet
      // invisible, quel que soit son genre.
      const positifs = ['duree_ms'];
      const positifsOuNuls = [];
      if (entry.type === 'vol') {
        // `D-39` : la petite orbite du corps autour du point logique. Une
        // période nulle donnerait une division par zéro dans le calcul de
        // l'angle — un follet figé ou `NaN`, qu'aucun test de rendu ne peut
        // attraper puisque le dessin n'est jamais exercé en headless.
        if (typeof entry.periode_ms !== 'number' || entry.periode_ms <= 0) {
          erreurs.push(`${path} > periode_ms doit être un nombre strictement positif`);
        }
        // Rayon nul ACCEPTÉ, et c'est volontaire : c'est le repli « corps au
        // centre de l'aura », qui doit s'obtenir en changeant un nombre.
        if (typeof entry.rayon_px !== 'number' || entry.rayon_px < 0) {
          erreurs.push(`${path} > rayon_px doit être un nombre positif ou nul`);
        }
        // `sens` est un SENS de rotation, pas un facteur de vitesse : le
        // laisser prendre 0,5 déguiserait un changement de période en
        // changement de sens, et la période cesserait de dire la vérité.
        if (entry.sens !== 1 && entry.sens !== -1) {
          erreurs.push(`${path} > sens doit valoir 1 ou -1 (sens de rotation, jamais un facteur)`);
        }
        if (typeof entry.phase_rad !== 'number' || !Number.isFinite(entry.phase_rad)) {
          erreurs.push(`${path} > phase_rad doit être un nombre fini`);
        }
        erreurs.push(...erreursBorneAura(entry, catalogs, path));
        return erreurs;
      }

      if (entry.type === 'particules') {
        // `capacite` (`D-108`, facultative) : la taille de la réserve de
        // bouffées. Absente = le défaut du module. Présente, elle doit être un
        // entier strictement positif — une réserve de zéro donnerait une
        // traînée muette que rien ne signalerait.
        if (entry.capacite !== undefined && (!Number.isInteger(entry.capacite) || entry.capacite <= 0)) {
          erreurs.push(`${path} > capacite doit être un entier strictement positif si présent (taille de la réserve)`);
        }
        // Un intervalle nul ferait une boucle d'émission sans fin dans
        // avancerPoussiere().
        positifs.push('intervalle_px');
        positifsOuNuls.push('alpha_depart', 'echelle_depart', 'echelle_fin');
        if (entry.visuel === undefined) erreurs.push(`${path} > visuel est requis pour un effet de particules`);
      } else {
        // `montee_px` à 0 donnerait un texte qui ne monte pas : accepté (le
        // réglage est à Xav), mais il doit rester un nombre.
        positifsOuNuls.push('montee_px', 'fondu_depuis');
        // `D-58` : la taille et la couleur ne sont plus globales, elles
        // vivent dans un STYLE — un effet de texte en déclare au moins un, et
        // chacun porte les deux. Le contrôle est ici parce que le rendu lève
        // sur un style inconnu ou incomplet, et que le rendu n'est jamais
        // exercé en headless : sans ce contrôle, la faute se verrait au
        // premier ramassage en jeu, pas au boot.
        const styles = entry.styles;
        if (!styles || typeof styles !== 'object' || Object.keys(styles).length === 0) {
          erreurs.push(`${path} > styles doit être un objet non vide { nom: { taille_px, couleur } }`);
        } else {
          for (const [nom, style] of Object.entries(styles)) {
            if (!style || typeof style !== 'object') {
              erreurs.push(`${path} > styles.${nom} doit être un objet { taille_px, couleur }`);
              continue;
            }
            if (typeof style.taille_px !== 'number' || style.taille_px <= 0) {
              erreurs.push(`${path} > styles.${nom}.taille_px doit être un nombre strictement positif`);
            }
            if (typeof style.couleur !== 'string') {
              erreurs.push(`${path} > styles.${nom}.couleur doit être une couleur (chaîne)`);
            }
            // Décalage vertical propre au style (optionnel) : ce qui sépare à
            // l'écran deux textes émis au même point.
            if (style.offset_y_px !== undefined && typeof style.offset_y_px !== 'number') {
              erreurs.push(`${path} > styles.${nom}.offset_y_px doit être un nombre si présent`);
            }
          }
        }
        if (!Number.isInteger(entry.capacite) || entry.capacite <= 0) {
          erreurs.push(`${path} > capacite doit être un entier strictement positif (taille de la réserve)`);
        }
        if (entry.fusion_ms !== undefined && (typeof entry.fusion_ms !== 'number' || entry.fusion_ms < 0)) {
          erreurs.push(`${path} > fusion_ms doit être un nombre >= 0 si présent`);
        }
        for (const champ of ['contour']) {
          if (entry[champ] !== undefined && typeof entry[champ] !== 'string') {
            erreurs.push(`${path} > ${champ} doit être une couleur (chaîne) si présent`);
          }
        }
      }

      for (const champ of positifs) {
        if (typeof entry[champ] !== 'number' || entry[champ] <= 0) {
          erreurs.push(`${path} > ${champ} doit être un nombre strictement positif`);
        }
      }
      for (const champ of positifsOuNuls) {
        if (typeof entry[champ] !== 'number' || entry[champ] < 0) {
          erreurs.push(`${path} > ${champ} doit être un nombre >= 0`);
        }
      }
      for (const champ of ['decalage_lateral_px', 'offset_y_px', 'contour_px']) {
        if (entry[champ] !== undefined && typeof entry[champ] !== 'number') {
          erreurs.push(`${path} > ${champ} doit être un nombre si présent`);
        }
      }
      return erreurs;
    },
  },
  visuels: {
    requiredFields: ['id', 'ancre', 'primitives'],
    idField: 'id',
    refs: [],
    custom: validerVisuel,
  },
  companions: {
    requiredFields: ['id', 'label_key', 'element', 'synergie', 'rayon_aura', 'rayon_lumiere', 'render', 'couleur_ui'],
    idField: 'id',
    refs: [
      { field: 'element', catalog: 'elements' },
      { field: 'synergie', catalog: 'synergies' },
    ],
    custom: erreursCompanion,
  },
  loot_tables: {
    requiredFields: ['id', 'entrees'],
    idField: 'id',
    refs: [],
    custom: validerLootTable,
  },
  // `icone` (optionnel, D-20 B) : la silhouette que la case d'attaque dessine
  // pour cette arme. Une REF, donc un id inconnu tombe au boot avec son
  // chemin — sans ça le HUD dessinerait un vide silencieux. Absent = case
  // vide, ce qui reste un cas normal (une arme peut n'avoir pas d'icône).
  weapons: {
    requiredFields: ['id', 'label_key', 'portee'],
    idField: 'id',
    refs: [{ field: 'icone', catalog: 'visuels' }],
    custom: validerWeapon,
  },
  // specs/07_chaos-nocturne.md §3 : table d'apparition. C'est la **première**
  // du jeu, et elle doit resservir telle quelle pour les paliers suivants et
  // les cartes futures — d'où la validation croisée ci-dessous, qui refuse au
  // boot ce qui ne se verrait sinon qu'en jouant, de nuit, au bon niveau :
  // une zone d'apparition qui chevauche une zone sûre, un id de zone inconnu,
  // une phase qui n'existe pas dans le cycle.
  // Lignes d'ambiance par palier (`D-61`, T3, `Q-34`). Le motif générique :
  // `palier atteint + condition -> une ligne de texte, une seule fois`. Tout
  // est référence — un dialogue, un flag, des scènes, des phases — parce que
  // c'est exactement là qu'une faute de frappe se traduirait par une ligne
  // qui ne se déclenche jamais, sans que rien ne le signale.
  // Réglages audio (`D-64`, T7). Un seul aujourd'hui — le volume de la
  // musique —, mais c'est bien un catalogue : un volume d'effets sonores
  // sera une entrée de plus, pas un second mécanisme.
  //
  // `paliers` et `cles_etat` sont appariés un à un, et le contrôle le VÉRIFIE :
  // une liste plus courte que l'autre afficherait « undefined » au menu, ou
  // afficherait 50 % en jouant à 75. `defaut` doit être l'un des paliers,
  // sinon le premier appui sur la carte sauterait à une valeur sans rapport.
  audio: {
    requiredFields: ['id', 'paliers', 'defaut', 'cles_etat'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (!Array.isArray(entry.paliers) || entry.paliers.length < 2) {
        erreurs.push(`${path} > paliers doit être un tableau d'au moins deux valeurs`);
        return erreurs;
      }
      for (const palier of entry.paliers) {
        if (typeof palier !== 'number' || palier < 0 || palier > 1) {
          erreurs.push(`${path} > palier ${JSON.stringify(palier)} doit être un nombre entre 0 et 1`);
        }
      }
      // Croissants : la carte les parcourt dans l'ordre, et « monter le son »
      // doit monter le son.
      for (let i = 1; i < entry.paliers.length; i += 1) {
        if (entry.paliers[i] <= entry.paliers[i - 1]) {
          erreurs.push(`${path} > paliers doit être strictement croissant (${entry.paliers.join(', ')})`);
          break;
        }
      }
      if (!Array.isArray(entry.cles_etat) || entry.cles_etat.length !== entry.paliers.length) {
        erreurs.push(`${path} > cles_etat doit avoir exactement autant d'entrées que paliers`);
      }
      if (!entry.paliers.includes(entry.defaut)) {
        erreurs.push(`${path} > defaut (${entry.defaut}) doit être l'un des paliers`);
      }
      return erreurs;
    },
  },
  ambiances: {
    requiredFields: ['id', 'dialogue', 'flag'],
    idField: 'id',
    refs: [{ field: 'dialogue', catalog: 'dialogues' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (!(catalogs.flags || []).some((f) => f.id === entry.flag)) {
        erreurs.push(`${path} > flag "${entry.flag}" non déclaré dans flags.json`);
      }
      if (entry.scenes !== undefined) {
        if (!Array.isArray(entry.scenes) || entry.scenes.length === 0) {
          erreurs.push(`${path} > scenes doit être un tableau non vide d'ids de scène (ou absent = partout)`);
        } else {
          for (const sceneId of entry.scenes) {
            if (!(catalogs.scenes || []).some((sc) => sc.id === sceneId)) {
              erreurs.push(`${path} > scenes : "${sceneId}" introuvable dans scenes.json`);
            }
          }
        }
      }
      if (entry.phases !== undefined) {
        if (!Array.isArray(entry.phases) || entry.phases.length === 0) {
          erreurs.push(`${path} > phases doit être un tableau non vide de noms de phase (ou absent = à toute heure)`);
        } else {
          for (const phase of entry.phases) {
            if (!NOMS_PHASES_CYCLE.includes(phase)) {
              erreurs.push(`${path} > phase "${phase}" inconnue (attendu : ${NOMS_PHASES_CYCLE.join('/')})`);
            }
          }
        }
      }
      return erreurs;
    },
  },
  spawns: {
    requiredFields: [
      'id', 'scene', 'zone_apparition', 'enemy', 'phases', 'max_simultanes', 'intervalle_ms',
      'distance_min_joueur_tuiles', 'domaine', 'detection_tuiles', 'poursuite_max_tuiles', 'desinteret_ms', 'blocage_ms',
    ],
    idField: 'id',
    refs: [
      { field: 'scene', catalog: 'scenes' },
      { field: 'enemy', catalog: 'enemies' },
    ],
    custom: validerSpawn,
  },
  enemies: {
    requiredFields: [
      'id', 'label_key', 'pv', 'force', 'vitesse', 'portee_attaque',
      'cadence_attaque_ms', 'comportement', 'loot_table', 'render', 'xp',
    ],
    idField: 'id',
    refs: [{ field: 'loot_table', catalog: 'loot_tables' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (entry.element != null && !(catalogs.elements || []).some((e) => e.id === entry.element)) {
        erreurs.push(`${path} > element "${entry.element}" introuvable dans elements.json`);
      }
      // xp (Palier D §3.4) : source de crédit au combat, au même titre que
      // recipe.xp au craft — jamais un multiplicateur caché, une valeur plate.
      if (typeof entry.xp !== 'number' || entry.xp < 0) {
        erreurs.push(`${path} > xp doit être un nombre >= 0`);
      }
      erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
      return erreurs;
    },
  },
  // Spec 11 §5 : les effets de monde. Un NOM par entrée, rien d'autre — ce
  // qu'un effet fait vit dans le système qui le lit. Le catalogue existe pour
  // qu'une option qui cite un effet inconnu tombe au boot.
  // `dialogue_fin` (§7.3, le coffre effacé) : la réplique qui s'ouvre quand
  // l'effet se lève — optionnelle, mais un id inconnu tombe ici, jamais à
  // l'instant où l'effet expire.
  effets_monde: {
    requiredFields: ['id'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      if (entry.dialogue_fin === undefined) return [];
      if (!(catalogs.dialogues || []).some((d) => d.id === entry.dialogue_fin)) {
        return [`${path} > dialogue_fin "${entry.dialogue_fin}" introuvable dans dialogues.json`];
      }
      return [];
    },
  },
  puzzles: {
    requiredFields: ['id', 'type'],
    idField: 'id',
    refs: [],
    custom: validerPuzzle,
  },
  dialogues: {
    // Spec 11, palier B : une seule forme, le graphe de nœuds.
    requiredFields: ['id', 'declencheur', 'entree', 'noeuds'],
    idField: 'id',
    refs: [],
    custom: validerDialogue,
  },
  // 03_maison-exterieur §2.1 : catalogue ouvert, on démarre à 2 (bois,
  // pierre) — une 3ᵉ ressource est une entrée JSON de plus (tile + entrée
  // resources.json + item + dialogue + clés de locale), zéro code.
  resources: {
    requiredFields: ['id', 'label_key', 'dialogue_bloque', 'outil_requis', 'item_produit', 'cooldown_ms'],
    idField: 'id',
    refs: [{ field: 'dialogue_bloque', catalog: 'dialogues' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      // outil_requis : null = récoltable à mains nues (aucun cas réel en
      // Phase 3, gardé pour une ressource future) ; sinon une référence vers
      // items.json (Palier B, specs/04_maison-interieur.md §3.2 : la hache/
      // pioche existent désormais).
      if (entry.outil_requis !== null) {
        if (typeof entry.outil_requis !== 'string') {
          erreurs.push(`${path} > outil_requis doit être null ou une chaîne (id d'item)`);
        } else if (!(catalogs.items || []).some((i) => i.id === entry.outil_requis)) {
          erreurs.push(`${path} > outil_requis "${entry.outil_requis}" introuvable dans items.json`);
        }
      }
      if (!(catalogs.items || []).some((i) => i.id === entry.item_produit)) {
        erreurs.push(`${path} > item_produit "${entry.item_produit}" introuvable dans items.json`);
      }
      if (typeof entry.cooldown_ms !== 'number' || entry.cooldown_ms <= 0) {
        erreurs.push(`${path} > cooldown_ms doit être un nombre positif`);
      }
      erreurs.push(...erreursXpOptionnel(entry, path));
      return erreurs;
    },
  },
  // `D-103` (T10) : une MONNAIE déclare sa silhouette, et c'est tout ce
  // qu'elle déclare. Les éclats vivaient jusqu'ici en dehors de tout
  // catalogue (`save.inventaire.eclats`, `loot_tables.json` avec
  // `item: "eclats"`, `recipes.json#cout_eclats`), si bien que l'id de leur
  // icône était écrit dans `main.js` — le seul du jeu à l'être (`Q-49`).
  //
  // Réponse MINIMALE, et volontairement : pas de nom, pas de valeur, pas de
  // règle. `D-68` tient — une monnaie n'est pas un item de poche, elle
  // n'entre ni dans `entrees` d'une recette, ni dans un conteneur. Ce qu'une
  // seconde monnaie exigera (un nom, un taux, un HUD qui la place) se
  // décidera quand elle existera, pas avant (règle : aucun système
  // généralisé avant un second cas d'usage réel).
  monnaies: {
    requiredFields: ['id', 'icone'],
    idField: 'id',
    // Une monnaie SANS silhouette se réduirait à son nombre : même exigence
    // que pour une jauge de survie (`D-96`), donc une référence REQUISE.
    refs: [{ field: 'icone', catalog: 'visuels' }],
  },
  // `D-118` : ce que peut contenir un contenant. UN seul endroit où vivent
  // les quatre nombres de la poche et du coffre, tous PROVISOIRES — c'est
  // `inventory.js#resoudreCapacite` qui les lit, et rien d'autre.
  //
  // `filtre` est déclaré mais jamais rempli : c'est le contrat que le
  // porte-outils attend (`Q-65`, hors scope). Le déclarer maintenant coûte
  // trois lignes et évite qu'il arrive un jour sous la forme d'un second
  // mécanisme.
  conteneurs: {
    requiredFields: ['id', 'label_key', 'slots', 'pile'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      for (const champ of ['slots', 'pile']) {
        if (!Number.isInteger(entry[champ]) || entry[champ] <= 0) {
          erreurs.push(`${path} > ${champ} doit être un entier strictement positif`);
        }
      }
      if (entry.filtre !== undefined) {
        if (!Array.isArray(entry.filtre) || entry.filtre.length === 0) {
          erreurs.push(`${path} > filtre doit être une liste non vide de catégories si présent`);
        } else {
          for (const categorie of entry.filtre) {
            if (!CATEGORIES_ITEM.includes(categorie)) {
              erreurs.push(`${path} > filtre : "${categorie}" n'est pas une catégorie d'item (${CATEGORIES_ITEM.join('/')})`);
            }
          }
        }
      }
      return erreurs;
    },
  },
  items: {
    requiredFields: ['id', 'label_key', 'categorie', 'render'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      // "outil" (Palier A) : hache/pioche — non consommé par le craft qui
      // les produit (ce sont des SORTIES), mais bien consommable comme
      // n'importe quel item par un futur système (perte, casse...) —
      // aucune règle spéciale ici, juste une catégorie de plus.
      if (!CATEGORIES_ITEM.includes(entry.categorie)) {
        erreurs.push(`${path} > categorie doit être l'une de ${CATEGORIES_ITEM.join('/')}`);
      }
      // `pile_max` (`D-118`) : OPTIONNEL, et c'est le point du ticket. La
      // hauteur d'une pile appartient désormais au CONTENEUR
      // (`conteneurs.json`) ; un objet ne fait que l'abaisser quand c'est
      // vrai de lui partout — un outil ou une arme ne s'empile pas, dans
      // n'importe quelle poche et dans n'importe quel coffre. Absent = le
      // conteneur décide seul, ce qui est le cas de toutes les ressources.
      if (entry.pile_max !== undefined && (!Number.isInteger(entry.pile_max) || entry.pile_max <= 0)) {
        erreurs.push(`${path} > pile_max doit être un entier strictement positif s'il est présent`);
      }
      erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
      erreurs.push(...erreursXpOptionnel(entry, path));
      // `flag_ramassage` (`D-125`, T9) : OPTIONNEL — le flag posé la première
      // fois que cet objet entre en poche depuis le sol. Même forme, et même
      // raison d'être, que `scenes.json > objets_uniques > flag` : c'est la
      // DONNÉE qui nomme le flag, pour qu'une ligne de lore puisse parler
      // d'un objet sans qu'aucun id d'item n'entre dans le code. Un flag non
      // déclaré tombe ici, au boot — pas au ramassage, c'est-à-dire en jouant
      // (`flags.js#set` lèverait alors en pleine frame).
      if (entry.flag_ramassage !== undefined) {
        if (!(catalogs.flags || []).some((f) => f.id === entry.flag_ramassage)) {
          erreurs.push(`${path} > flag_ramassage "${entry.flag_ramassage}" non déclaré dans flags.json`);
        }
      }
      // `arme` (`D-66`, T5) : l'objet de poche qui, une fois équipé, DEVIENT
      // cette arme. Une référence, pas un booléen : c'est elle qui fait le
      // pont entre `items.json` (ce qu'on possède) et `weapons.json` (ce que
      // frappe le combat). Un id inconnu tombe au boot — sans ce contrôle,
      // équiper l'objet lèverait en pleine partie, dans le menu.
      if (entry.arme !== undefined) {
        if (!(catalogs.weapons || []).some((w) => w.id === entry.arme)) {
          erreurs.push(`${path} > arme "${entry.arme}" introuvable dans weapons.json`);
        }
        if (entry.categorie !== 'arme') {
          erreurs.push(`${path} > un item qui porte "arme" doit être de catégorie "arme"`);
        }
      } else if (entry.categorie === 'arme') {
        erreurs.push(`${path} > un item de catégorie "arme" doit dire QUELLE arme (champ "arme")`);
      }
      // `description_key` (`D-60`) : une ligne de texte de plus dans la fiche
      // de l'objet, pour ce qui n'est ni une stat ni un effet — le lore. Clé
      // de locale comme le reste, jamais une chaîne.
      if (entry.description_key !== undefined && typeof entry.description_key !== 'string') {
        erreurs.push(`${path} > description_key doit être une clé de locale (chaîne) si présent`);
      }
      // spawn optionnel (§2.1 : "spawn optionnel") : un item purement de
      // craft n'a pas besoin d'exister au sol.
      if (entry.spawn !== undefined) {
        const s = entry.spawn;
        if (!s || typeof s.nb_au_sol !== 'number' || s.nb_au_sol <= 0) {
          erreurs.push(`${path} > spawn.nb_au_sol doit être un nombre positif`);
        }
        if (!Array.isArray(s.zones) || s.zones.length === 0 || s.zones.some((z) => typeof z !== 'string')) {
          erreurs.push(`${path} > spawn.zones doit être un tableau non vide de types de zone`);
        }
        if (
          s.zones_exclues !== undefined &&
          (!Array.isArray(s.zones_exclues) || s.zones_exclues.some((z) => typeof z !== 'string'))
        ) {
          erreurs.push(`${path} > spawn.zones_exclues doit être un tableau de types de zone`);
        }
        // respawn_ms (Palier B §3.2) : défaut 60 s appliqué par
        // ground_items.js si absent — validé ici seulement quand présent,
        // n'a de sens que sur un item qui existe au sol (`spawn`).
        if (s.respawn_ms !== undefined && (typeof s.respawn_ms !== 'number' || s.respawn_ms <= 0)) {
          erreurs.push(`${path} > spawn.respawn_ms doit être un nombre positif si présent`);
        }
      }
      // consommation (Palier C §3.3) : optionnel — seul un item "nourriture"
      // a vocation à en porter un, mais rien n'empêche techniquement un
      // autre catégorie de le faire un jour (pas de couplage dur ici).
      if (entry.consommation !== undefined) {
        const c = entry.consommation;
        if (!c || typeof c !== 'object') {
          erreurs.push(`${path} > consommation doit être un objet { faim?, soif?, effets? }`);
        } else {
          if (c.faim !== undefined && typeof c.faim !== 'number') {
            erreurs.push(`${path} > consommation.faim doit être numérique si présent`);
          }
          if (c.soif !== undefined && typeof c.soif !== 'number') {
            erreurs.push(`${path} > consommation.soif doit être numérique si présent`);
          }
          if (c.effets !== undefined) {
            if (!Array.isArray(c.effets)) {
              erreurs.push(`${path} > consommation.effets doit être un tableau d'id de status_effects`);
            } else {
              const effetsDeclares = new Set((catalogs.status_effects || []).map((e) => e.id));
              c.effets.forEach((id) => {
                if (!effetsDeclares.has(id)) {
                  erreurs.push(`${path} > consommation.effets[] > "${id}" introuvable dans status_effects.json`);
                }
              });
            }
          }
        }
      }
      return erreurs;
    },
  },
  // Palier A (specs/04_maison-interieur.md §2.1) : catalogue ouvert — une
  // 4ᵉ recette (ex. la corde citée par la fiche) est une entrée JSON de
  // plus, zéro code. `station` référence un TYPE de stations.json (pas une
  // instance positionnée) : plusieurs stations du même type partagent les
  // mêmes recettes, sans duplication.
  recipes: {
    requiredFields: ['id', 'label_key', 'station', 'entrees', 'sortie', 'categorie'],
    idField: 'id',
    refs: [{ field: 'station', catalog: 'stations' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      const itemsDeclares = new Set((catalogs.items || []).map((i) => i.id));
      if (!Array.isArray(entry.entrees) || entry.entrees.length === 0) {
        erreurs.push(`${path} > entrees doit être un tableau non vide de { item, qte }`);
      } else {
        entry.entrees.forEach((e, i) => {
          if (!itemsDeclares.has(e.item)) {
            erreurs.push(`${path} > entrees[${i}] > item "${e.item}" introuvable dans items.json`);
          }
          if (typeof e.qte !== 'number' || e.qte <= 0) {
            erreurs.push(`${path} > entrees[${i}] > qte doit être un nombre positif`);
          }
        });
      }
      // `D-121` (T5) : une recette produit SOIT un objet de poche, SOIT une
      // STATION. Les deux à la fois n'aurait pas de sens (où irait-elle ?),
      // et aucun des deux non plus — d'où le « exactement un ».
      const s = entry.sortie || {};
      const sortieItem = s.item !== undefined;
      const sortieStation = s.station !== undefined;
      if (sortieItem === sortieStation) {
        erreurs.push(`${path} > sortie doit déclarer soit "item", soit "station", jamais les deux ni aucun`);
      } else if (sortieItem) {
        if (!itemsDeclares.has(s.item)) {
          erreurs.push(`${path} > sortie.item "${s.item}" introuvable dans items.json`);
        }
        if (typeof s.qte !== 'number' || s.qte <= 0) {
          erreurs.push(`${path} > sortie.qte doit être un nombre positif`);
        }
      } else {
        const station = (catalogs.stations || []).find((st) => st.id === s.station);
        if (!station) {
          erreurs.push(`${path} > sortie.station "${s.station}" introuvable dans stations.json`);
        } else if (!station.placable) {
          // Une station qu'on fabrique doit pouvoir être POSÉE : sans cela,
          // la fabrication ouvrirait un mode de placement sans issue.
          erreurs.push(`${path} > sortie.station "${s.station}" n'est pas "placable" : on ne pourrait pas la poser`);
        }
      }
      if (entry.xp !== undefined && (typeof entry.xp !== 'number' || entry.xp < 0)) {
        erreurs.push(`${path} > xp doit être un nombre >= 0 si présent`);
      }
      if (entry.cooldown_ms !== undefined && (typeof entry.cooldown_ms !== 'number' || entry.cooldown_ms <= 0)) {
        erreurs.push(`${path} > cooldown_ms doit être un nombre positif si présent`);
      }
      // `cout_eclats` (`D-66`, T5) : les éclats ne sont PAS un item de poche
      // (ils vivent dans `save.inventaire.eclats`, une monnaie), donc ils ne
      // peuvent pas figurer dans `entrees`. Un champ à part le dit, plutôt
      // qu'un faux item qui aurait obligé à migrer la sauvegarde, le HUD et
      // les tables de butin.
      if (entry.cout_eclats !== undefined
        && (!Number.isInteger(entry.cout_eclats) || entry.cout_eclats < 0)) {
        erreurs.push(`${path} > cout_eclats doit être un entier >= 0 si présent`);
      }
      // `unique` (`D-122`, T6) : on n'en fabrique pas un second tant qu'on a
      // le premier. Réservé aux recettes d'OBJET — une station se pose, on en
      // veut cinq, et « déjà possédé » n'y voudrait rien dire.
      if (entry.unique !== undefined) {
        if (typeof entry.unique !== 'boolean') {
          erreurs.push(`${path} > unique doit être un booléen si présent`);
        } else if (entry.unique && !sortieItem) {
          erreurs.push(`${path} > unique n'a de sens que pour une recette qui produit un OBJET`);
        }
      }
      // `D-62` (T4) : `connue_au_depart` et `deblocage` ont été remplacés par
      // le `visible_si` générique, validé pour TOUS les catalogues dans
      // `registry.js`. On refuse explicitement les anciens champs plutôt que
      // de les ignorer : laissés dans une fiche, ils n'auraient plus aucun
      // effet, et une recette censée être cachée s'afficherait en silence.
      for (const perime of ['connue_au_depart', 'deblocage']) {
        if (entry[perime] !== undefined) {
          erreurs.push(`${path} > "${perime}" n'existe plus (\`D-62\`) : utiliser "visible_si" (absent = visible)`);
        }
      }
      return erreurs;
    },
  },
  // Palier A §2.1 : types de station (rôle/rendu par défaut/capacité) — pas
  // les instances positionnées (celles-ci vivent dans puzzles.json, type
  // "station", référençant un id d'ici via `station_type`).
  stations: {
    // `placable` (specs/05_construction-stations.md §2) : le puits n'y
    // figure jamais, table/atelier/coffre s'y déplacent tous — champ requis
    // plutôt qu'optionnel-avec-défaut, pour qu'un 5ᵉ type de station ne
    // puisse jamais "oublier" de trancher la question en silence.
    requiredFields: ['id', 'label_key', 'role', 'placable'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      const ROLES_STATION = ['craft', 'stockage', 'eau'];
      erreurs.push(...erreursXpOptionnel(entry, path));
      if (!ROLES_STATION.includes(entry.role)) {
        erreurs.push(`${path} > role doit être l'un de ${ROLES_STATION.join('/')}`);
      }
      // `D-118` : une station de stockage ne porte plus un nombre de piles,
      // elle DÉSIGNE son conteneur. C'est ce qui permettra au coffre crafté
      // (T5) d'avoir la même capacité que le coffre de base sans qu'un
      // second nombre existe quelque part.
      if (entry.role === 'stockage') {
        if (!(catalogs.conteneurs || []).some((c) => c.id === entry.conteneur)) {
          erreurs.push(`${path} > role "stockage" exige conteneur (id de conteneurs.json), reçu ${JSON.stringify(entry.conteneur)}`);
        }
      }
      if (typeof entry.placable !== 'boolean') {
        erreurs.push(`${path} > placable doit être un booléen`);
      }
      // `D-126` (décision de Xav, 22/09) : OPTIONNEL — « on ne déplace pas un
      // meuble plein ». Absent = la station se déplace quel que soit son
      // contenu (c'est le cas des trois autres, qui n'en ont pas). Déclaré
      // ici plutôt que déduit du rôle « stockage » : une scierie qui
      // stockerait des bûches devra trancher pour elle-même, et une règle de
      // jeu se LIT, elle ne se devine pas.
      if (entry.deplacable_si_vide !== undefined && typeof entry.deplacable_si_vide !== 'boolean') {
        erreurs.push(`${path} > deplacable_si_vide doit être un booléen s'il est présent`);
      }
      // `D-09` (décision de Xav, 23/09) : OPTIONNEL — une réplique dite la
      // toute première fois qu'on interagit avec une station de ce TYPE, avant
      // que son écran s'ouvre. Le flag est exigé déclaré pour la même raison
      // qu'une ambiance : `flags.js` lève sur un flag inconnu, donc une faute
      // de frappe ici coûterait une frame figée au lieu d'un échec au boot.
      if (entry.premiere_interaction !== undefined) {
        const pi = entry.premiere_interaction;
        if (pi === null || typeof pi !== 'object' || Array.isArray(pi)) {
          erreurs.push(`${path} > premiere_interaction doit être un objet { dialogue, flag } s'il est présent`);
        } else {
          if (!(catalogs.dialogues || []).some((d) => d.id === pi.dialogue)) {
            erreurs.push(`${path} > premiere_interaction.dialogue "${pi.dialogue}" introuvable dans dialogues.json`);
          }
          if (!(catalogs.flags || []).some((f) => f.id === pi.flag)) {
            erreurs.push(`${path} > premiere_interaction.flag "${pi.flag}" non déclaré dans flags.json`);
          }
        }
      }
      return erreurs;
    },
  },
  // §3.6 + MT_musique-ambiance-synth : une seconde piste future = une entrée
  // JSON de plus, zéro code. `type` distingue une source `fichier` (élément
  // <audio>) d'une source `synthese` (notes jouées par oscillateurs, le temps
  // que le fichier définitif soit livré) — même contrat de lecture pour les
  // deux côté src/audio.js. `repli` (optionnel, id du même catalogue) déclare
  // la piste de secours si la piste `fichier` échoue à charger ; résolu par
  // audio.js#resoudrePisteRepli, pure et testable headless.
  music: {
    requiredFields: ['id', 'type', 'boucle', 'volume'],
    idField: 'id',
    refs: [{ field: 'repli', catalog: 'music' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (entry.type !== 'fichier' && entry.type !== 'synthese') {
        erreurs.push(`${path} > type doit être "fichier" ou "synthese"`);
      }
      if (entry.type === 'fichier' && typeof entry.fichier !== 'string') {
        erreurs.push(`${path} > type "fichier" exige un champ fichier (chaîne)`);
      }
      if (entry.type === 'synthese') {
        if (typeof entry.tempo_bpm !== 'number' || entry.tempo_bpm <= 0) {
          erreurs.push(`${path} > type "synthese" exige tempo_bpm (nombre > 0)`);
        }
        if (!Array.isArray(entry.notes) || entry.notes.length === 0) {
          erreurs.push(`${path} > type "synthese" exige un tableau notes non vide`);
        } else {
          entry.notes.forEach((n, i) => {
            if (n === null || typeof n !== 'object') {
              erreurs.push(`${path} > notes[${i}] doit être un objet`);
              return;
            }
            if (typeof n.duree_beats !== 'number' || n.duree_beats <= 0) {
              erreurs.push(`${path} > notes[${i}].duree_beats doit être un nombre > 0`);
            }
            // `note` omis = silence (pause dans la phrase) — accepté.
            if (n.note !== undefined && typeof n.note !== 'string') {
              erreurs.push(`${path} > notes[${i}].note doit être une chaîne, ou omis pour un silence`);
            }
          });
        }
      }
      if (typeof entry.boucle !== 'boolean') erreurs.push(`${path} > boucle doit être un booléen`);
      if (typeof entry.volume !== 'number' || entry.volume < 0 || entry.volume > 1) {
        erreurs.push(`${path} > volume doit être entre 0 et 1`);
      }
      return erreurs;
    },
  },
  // specs/04_indices-commandes.md : catalogue ouvert — un futur indice
  // (SKILL_1 en Phase 4, CONSUME en Phase 3) est une entrée de plus ici,
  // zéro code (§3 de la fiche).
  hints: {
    requiredFields: ['id', 'verbe', 'declencheur', 'duree_ms', 'flag'],
    idField: 'id',
    refs: [{ field: 'flag', catalog: 'flags' }],
    custom: validerHint,
  },
  glyphes: {
    requiredFields: ['id', 'verbe', 'clavier_key', 'manette_key', 'tactile_key'],
    idField: 'id',
    refs: [],
    custom: validerGlyphe,
  },
  // Palier C (specs/04_maison-interieur.md §2.1/§3.3) : catalogue ouvert —
  // une jauge porte `decroissance_ms_plein_a_vide` ; l'entrée unique
  // `survie_config` porte les paramètres globaux (plancher/pente/
  // malus_respawn/stats_modulees), jamais recopiés sur chaque jauge (cf.
  // survival.js). Distinguer les deux formes par la présence du champ
  // pivot, comme tiles.json distingue déjà une tuile-ressource par la
  // présence de `ressource`.
  survival: {
    requiredFields: ['id'],
    idField: 'id',
    // `D-96` : chaque jauge déclare la SILHOUETTE de son icône (l'entrée de
    // configuration, elle, n'en a pas — d'où une référence optionnelle ici et
    // une exigence dans `custom` pour les seules jauges). Un id inconnu tombe
    // au boot avec son chemin exact, comme toute référence croisée.
    refs: [{ field: 'icone', catalog: 'visuels' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (entry.id === 'survie_config') {
        if (typeof entry.plancher !== 'number' || entry.plancher < 0 || entry.plancher > 1) {
          erreurs.push(`${path} > plancher doit être un nombre entre 0 et 1`);
        }
        if (typeof entry.pente !== 'number' || entry.pente < 0) {
          erreurs.push(`${path} > pente doit être un nombre >= 0`);
        }
        if (typeof entry.malus_respawn !== 'number' || entry.malus_respawn < 0 || entry.malus_respawn > 1) {
          erreurs.push(`${path} > malus_respawn doit être un nombre entre 0 et 1`);
        }
        const statsDeclarees = new Set((catalogs.stats || []).map((s) => s.id));
        if (!Array.isArray(entry.stats_modulees) || entry.stats_modulees.length === 0) {
          erreurs.push(`${path} > stats_modulees doit être un tableau non vide d'id de stats.json`);
        } else {
          entry.stats_modulees.forEach((id) => {
            if (!statsDeclarees.has(id)) erreurs.push(`${path} > stats_modulees[] > "${id}" introuvable dans stats.json`);
          });
        }
        return erreurs;
      }
      if (typeof entry.label_key !== 'string') erreurs.push(`${path} > label_key manquant`);
      // Une jauge SANS icône se réduirait à sa couleur, et la règle
      // d'accessibilité P4② dit l'inverse : c'est la FORME qui porte le sens,
      // jamais la couleur seule. Le champ est donc requis, pas optionnel.
      if (typeof entry.icone !== 'string') erreurs.push(`${path} > icone manquante (la forme porte le sens, jamais la couleur seule)`);
      if (typeof entry.decroissance_ms_plein_a_vide !== 'number' || entry.decroissance_ms_plein_a_vide <= 0) {
        erreurs.push(`${path} > decroissance_ms_plein_a_vide doit être un nombre positif`);
      }
      // `D-123` (T7, `Q-43`) : le seuil au-dessous duquel se remplir rapporte
      // de l'XP. OPTIONNEL — une jauge qui n'en déclare pas ne rapporte jamais
      // d'XP, ce qui est le cas de la faim (on ne mange pas au puits).
      if (entry.seuil_xp !== undefined
        && (typeof entry.seuil_xp !== 'number' || entry.seuil_xp < 0 || entry.seuil_xp > 1)) {
        erreurs.push(`${path} > seuil_xp doit être un nombre entre 0 et 1 s'il est présent`);
      }
      return erreurs;
    },
  },
  // Palier D §2.1 : table de niveaux, triée croissante par convention (non
  // imposée par le schéma, xp.js trie lui-même) — une entrée de plus
  // (niveau 11+) ne demande aucun code.
  // specs/08_menus-cartes.md : les écrans de cartes du menu Pause.
  menus: {
    requiredFields: ['id', 'cle_titre', 'cartes'],
    idField: 'id',
    refs: [],
    custom: validerMenu,
  },
  levels: {
    requiredFields: ['id', 'niveau', 'xp_cumulee', 'points_stats'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (typeof entry.niveau !== 'number' || entry.niveau <= 0) {
        erreurs.push(`${path} > niveau doit être un nombre positif`);
      }
      if (typeof entry.xp_cumulee !== 'number' || entry.xp_cumulee < 0) {
        erreurs.push(`${path} > xp_cumulee doit être un nombre >= 0`);
      }
      if (typeof entry.points_stats !== 'number' || entry.points_stats < 0) {
        erreurs.push(`${path} > points_stats doit être un nombre >= 0`);
      }
      return erreurs;
    },
  },
};

// `specs/09_reglages-graphiques.md` palier B : les trois niveaux de facture
// graphique (+ `auto`) et les seuils de la descente automatique. Une entrée de
// configuration dans son catalogue, même patron que `survie_config` et
// `audio_volume_musique`.
//
// Le contrat que ce schéma fait tenir, et qui est l'objet du ticket : **chaque
// palier réel donne une valeur à CHAQUE levier déclaré**. Sans lui, ajouter un
// levier laisserait un preset muet, et le système qui le lit recevrait
// `undefined` en pleine partie — le genre de faute qui doit tomber au
// démarrage avec son chemin, jamais se voir à l'œil trois sessions plus tard.
SCHEMAS.graphismes = {
  requiredFields: ['id'],
  idField: 'id',
  refs: [],
  custom(entry, catalogs, path) {
    const erreurs = [];
    if (entry.id !== 'graphismes_presets') return erreurs;

    if (!Array.isArray(entry.leviers) || entry.leviers.length === 0) {
      erreurs.push(`${path} > leviers doit être un tableau non vide de noms de leviers`);
      return erreurs;
    }
    // La valeur « qui ne change rien » est en données parce que c'est elle qui
    // définit Moyen : « Moyen = l'état actuel » n'est pas un réglage d'auteur,
    // c'est le contrat de non-régression du palier B.
    if (typeof entry.valeur_neutre !== 'number') {
      erreurs.push(`${path} > valeur_neutre doit être un nombre (la valeur d'un levier qui ne change rien)`);
    }
    if (!Array.isArray(entry.paliers) || entry.paliers.length === 0) {
      erreurs.push(`${path} > paliers doit être un tableau non vide`);
      return erreurs;
    }

    const ids = new Set();
    for (const palier of entry.paliers) {
      const chemin = `${path} > paliers > "${palier && palier.id}"`;
      if (typeof palier.id !== 'string') { erreurs.push(`${chemin} > id manquant`); continue; }
      if (ids.has(palier.id)) erreurs.push(`${chemin} > id en double`);
      ids.add(palier.id);
      if (typeof palier.cle_etat !== 'string') {
        erreurs.push(`${chemin} > cle_etat manquante (le texte du palier vit dans les locales, jamais en code)`);
      }
      // `auto` n'a pas de leviers : il se RÉSOUT en un palier réel, il n'en
      // est pas un. Lui en donner ferait croire qu'on peut jouer « en auto ».
      if (palier.id === entry.defaut && palier.leviers === undefined) continue;
      if (palier.leviers === undefined) {
        erreurs.push(`${chemin} > leviers manquant (seul le palier par défaut "${entry.defaut}" s'en passe : il se résout)`);
        continue;
      }
      // Palier D : un palier réel a DEUX textes, parce qu'il s'affiche dans
      // deux situations — choisi par le joueur (« Bas ») ou résolu par Auto
      // (« Auto (Bas) »). Exiger la seconde clé ici, et pas seulement la
      // première, c'est refuser qu'un preset ajouté demain fasse afficher
      // « Auto () » à la carte de Paramètres. La composition reste dans les
      // locales : aucun code n'écrit de parenthèses.
      if (typeof palier.cle_etat_auto !== 'string') {
        erreurs.push(`${chemin} > cle_etat_auto manquante (le texte affiché quand "${entry.defaut}" résout ce palier)`);
      }
      for (const levier of entry.leviers) {
        const valeur = palier.leviers[levier];
        if (typeof valeur !== 'number' || !Number.isFinite(valeur) || valeur < 0) {
          erreurs.push(`${chemin} > leviers.${levier} doit être un nombre fini >= 0 (chaque palier donne une valeur à chaque levier)`);
        }
      }
      for (const levier of Object.keys(palier.leviers)) {
        if (!entry.leviers.includes(levier)) {
          erreurs.push(`${chemin} > leviers.${levier} n'est pas un levier déclaré — faute de frappe, ou levier à ajouter à "leviers"`);
        }
      }
    }
    if (typeof entry.defaut !== 'string' || !ids.has(entry.defaut)) {
      erreurs.push(`${path} > defaut doit être l'id d'un palier déclaré`);
    }

    // Seuils de la descente automatique (§5.2), tous PROVISOIRES — mais leur
    // type et leur domaine tombent ici : une part > 1 ne descendrait jamais,
    // une fenêtre nulle descendrait à chaque frame.
    const auto = entry.auto;
    if (!auto || typeof auto !== 'object') {
      erreurs.push(`${path} > auto doit être un objet { fenetre_ms, part_frames_lentes, delai_entree_scene_ms, cle_annonce, annonce_duree_ms }`);
      return erreurs;
    }
    if (typeof auto.fenetre_ms !== 'number' || auto.fenetre_ms <= 0) {
      erreurs.push(`${path} > auto.fenetre_ms doit être un nombre strictement positif`);
    }
    if (typeof auto.part_frames_lentes !== 'number' || auto.part_frames_lentes <= 0 || auto.part_frames_lentes > 1) {
      erreurs.push(`${path} > auto.part_frames_lentes doit être une fraction dans ]0, 1]`);
    }
    if (typeof auto.delai_entree_scene_ms !== 'number' || auto.delai_entree_scene_ms < 0) {
      erreurs.push(`${path} > auto.delai_entree_scene_ms doit être un nombre >= 0`);
    }
    // Palier E : ce qu'Auto DIT au joueur quand il descend. La clé est exigée
    // ici — donc au démarrage — parce qu'une annonce muette ne se verrait
    // qu'au moment précis où le jeu rame, c'est-à-dire au pire moment pour
    // découvrir un bug, et sur la machine de quelqu'un d'autre.
    if (typeof auto.cle_annonce !== 'string') {
      erreurs.push(`${path} > auto.cle_annonce manquante (le texte de la descente vit dans les locales, jamais en code)`);
    }
    if (typeof auto.annonce_duree_ms !== 'number' || auto.annonce_duree_ms <= 0) {
      erreurs.push(`${path} > auto.annonce_duree_ms doit être un nombre strictement positif (durée de la bannière)`);
    }
    return erreurs;
  },
};

// Catalogues déclarés mais non figés (contenu réel figé phase après phase).
// `specs/10_alignement-follet.md` §5 : l'alignement caché. Son propre
// catalogue, et surtout PAS `stats.json` — l'écran Stats et le bandeau de
// buffs itèrent `stats.json` (`D-13`, `D-141`), y mettre l'alignement serait
// l'afficher. Une entrée de configuration, même patron que `graphismes`.
//
// Ce que le schéma fait tenir : des bornes qui encadrent 0 (0 est le neutre,
// §0), des paliers qui MONTENT (sinon « le plus haut palier atteint » de
// `alignement.js#regime` ne voudrait plus rien dire) et dont le dernier seuil
// est atteignable (au-delà des bornes, un palier serait déclaré et jamais vu).
// `poids_defaut` n'est lu par personne avant la spec 11, mais il est validé
// dès maintenant : une faute de frappe ne doit pas attendre qu'on s'en serve.
SCHEMAS.alignement = {
  requiredFields: ['id'],
  idField: 'id',
  refs: [],
  custom(entry, catalogs, path) {
    const erreurs = [];
    if (entry.id !== 'alignement_config') {
      erreurs.push(`${path} > seule l'entrée "alignement_config" est attendue dans ce catalogue`);
      return erreurs;
    }
    const b = entry.bornes;
    if (!b || typeof b.min !== 'number' || typeof b.max !== 'number' || !(b.min < 0 && b.max > 0)) {
      erreurs.push(`${path} > bornes doit être { min < 0, max > 0 } (0 est le neutre)`);
      return erreurs;
    }
    if (!Array.isArray(entry.paliers) || entry.paliers.length === 0) {
      erreurs.push(`${path} > paliers doit être un tableau non vide de { des, palier }`);
      return erreurs;
    }
    let precedent = null;
    entry.paliers.forEach((p, i) => {
      const chemin = `${path} > paliers[${i}]`;
      if (!p || typeof p.des !== 'number' || p.des <= 0) {
        erreurs.push(`${chemin} > des doit être un nombre > 0 (sous le premier seuil, c'est la bande morte)`);
        return;
      }
      if (!Number.isInteger(p.palier) || p.palier <= 0) {
        erreurs.push(`${chemin} > palier doit être un entier > 0 (0 est réservé au neutre)`);
        return;
      }
      if (precedent && (p.des <= precedent.des || p.palier <= precedent.palier)) {
        erreurs.push(`${chemin} > seuils et paliers doivent être strictement croissants`);
      }
      if (p.des > Math.min(-b.min, b.max)) {
        erreurs.push(`${chemin} > des (${p.des}) dépasse les bornes : ce palier ne serait jamais atteint`);
      }
      precedent = p;
    });
    if (!entry.orbite || typeof entry.orbite.duree_inversion_ms !== 'number' || entry.orbite.duree_inversion_ms <= 0) {
      erreurs.push(`${path} > orbite.duree_inversion_ms doit être un nombre > 0`);
    }
    const poids = entry.poids_defaut;
    if (!poids || typeof poids !== 'object') {
      erreurs.push(`${path} > poids_defaut manquant`);
    } else {
      for (const cle of ['spam_par_occurrence', 'spam_plafond_par_dialogue', 'lecture_complete', 'mort']) {
        if (typeof poids[cle] !== 'number') erreurs.push(`${path} > poids_defaut.${cle} doit être un nombre`);
      }
    }
    return erreurs;
  },
};

const CATALOGUES_MINIMAUX = ['armors', 'accessories', 'skills', 'crops', 'journal_entries'];

for (const nom of CATALOGUES_MINIMAUX) {
  SCHEMAS[nom] = schemaMinimal();
}

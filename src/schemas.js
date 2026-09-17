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
function erreursCondition(condition, chemin, declares) {
  if (condition === undefined || condition === null) return [];
  if (typeof condition === 'string') {
    return declares.has(condition) ? [] : [`${chemin} > condition "${condition}" introuvable dans flags.json`];
  }
  if (typeof condition === 'object') {
    if (condition.not !== undefined) return erreursCondition(condition.not, chemin, declares);
    if (Array.isArray(condition.all)) return condition.all.flatMap((c) => erreursCondition(c, chemin, declares));
    if (Array.isArray(condition.any)) return condition.any.flatMap((c) => erreursCondition(c, chemin, declares));
  }
  return [`${chemin} > condition mal formée : ${JSON.stringify(condition)}`];
}

const TYPES_LUMIERE = ['halo', 'faisceau'];

// Verbes de gameplay (§2.4 socle technique) : liste de référence partagée par
// hints.json/glyphes.json — jamais une 2ᵉ énumération qui pourrait diverger
// de src/input/input.js#VERBES_BOUTON (+ 'move', qui n'est pas un bouton).
const VERBES_GAMEPLAY = ['move', 'attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu'];

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
    const r = zone.rect;
    if (!r || ['x', 'y', 'w', 'h'].some((c) => typeof r[c] !== 'number')) {
      erreurs.push(`${chemin} > rect doit être { x, y, w, h } numériques`);
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
  });

  // cycle_jour_nuit (03_maison-exterieur §2.1/§3.5) : simple interrupteur,
  // les phases/durées vivent en constantes centralisées dans daynight.js
  // (pas un catalogue extensible — il n'y a qu'un seul cycle dans tout le
  // jeu, pas une famille d'entrées interchangeables).
  if (entry.cycle_jour_nuit !== undefined && typeof entry.cycle_jour_nuit !== 'boolean') {
    erreurs.push(`${path} > cycle_jour_nuit doit être un booléen`);
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
  const aStat = entry.stat !== undefined;
  const aParam = entry.param !== undefined;
  if (aStat === aParam) {
    erreurs.push(`${path} > exactement un de "stat" ou "param" doit être présent`);
  }
  if (aStat && !(catalogs.stats || []).some((s) => s.id === entry.stat)) {
    erreurs.push(`${path} > stat "${entry.stat}" introuvable dans stats.json`);
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
function erreursRenderVisuel(entry, catalogs, path) {
  const visuel = entry.render && entry.render.visuel;
  if (typeof visuel !== 'string' || !(catalogs.visuels || []).some((v) => v.id === visuel)) {
    return [`${path} > render.visuel "${visuel}" introuvable dans visuels.json`];
  }
  return [];
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
    // portée ouvre simplement `dialogue`. En Phase 3, ces instances changent
    // de `type` en données pour devenir des stations réelles, à la même
    // position — jamais redessinées.
    if (!entry.position || typeof entry.position.x !== 'number' || typeof entry.position.y !== 'number') {
      erreurs.push(`${path} > position doit être { x, y }`);
    }
    const dialoguesDeclares = new Set((catalogs.dialogues || []).map((d) => d.id));
    if (!dialoguesDeclares.has(entry.dialogue)) {
      erreurs.push(`${path} > dialogue "${entry.dialogue}" introuvable dans dialogues.json`);
    }
    erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
    erreurs.push(...erreursGeometrieInteractif(entry, catalogs, path));
  } else {
    erreurs.push(`${path} > type "${entry.type}" inconnu (levier | sequence | station_placeholder)`);
  }
  return erreurs;
}

const LOCUTEURS_DIALOGUE = ['narrateur', 'follet'];

function validerDialogue(entry, catalogs, path) {
  const erreurs = [];
  if (!Array.isArray(entry.lignes) || entry.lignes.length === 0) {
    erreurs.push(`${path} > lignes doit être un tableau non vide`);
    return erreurs;
  }
  entry.lignes.forEach((ligne, i) => {
    if (!LOCUTEURS_DIALOGUE.includes(ligne.locuteur)) {
      erreurs.push(`${path} > lignes[${i}] > locuteur doit être l'un de ${LOCUTEURS_DIALOGUE.join('/')}`);
    }
    if (typeof ligne.text_key !== 'string') {
      erreurs.push(`${path} > lignes[${i}] > text_key manquant`);
    }
  });
  return erreurs;
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

export const SCHEMAS = {
  elements: {
    requiredFields: ['id', 'label_key', 'icon', 'shape'],
    idField: 'id',
    refs: [],
    custom: null,
  },
  tiles: {
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
    requiredFields: ['id', 'label_key', 'base'],
    idField: 'id',
    refs: [],
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
  equipment_slots: {
    requiredFields: ['id', 'label_key'],
    idField: 'id',
    refs: [],
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
  synergies: {
    requiredFields: ['id', 'element', 'effet_joueur', 'effet_monstre'],
    idField: 'id',
    refs: [
      { field: 'element', catalog: 'elements' },
      { field: 'effet_joueur', catalog: 'status_effects' },
      { field: 'effet_monstre', catalog: 'status_effects' },
    ],
    custom: null,
  },
  visuels: {
    requiredFields: ['id', 'ancre', 'primitives'],
    idField: 'id',
    refs: [],
    custom: validerVisuel,
  },
  companions: {
    requiredFields: ['id', 'label_key', 'element', 'synergie', 'rayon_aura', 'rayon_lumiere', 'render'],
    idField: 'id',
    refs: [
      { field: 'element', catalog: 'elements' },
      { field: 'synergie', catalog: 'synergies' },
    ],
    custom: erreursRenderVisuel,
  },
  loot_tables: {
    requiredFields: ['id', 'entrees'],
    idField: 'id',
    refs: [],
    custom: validerLootTable,
  },
  weapons: {
    requiredFields: ['id', 'label_key', 'portee'],
    idField: 'id',
    refs: [],
    custom: validerWeapon,
  },
  enemies: {
    requiredFields: [
      'id', 'label_key', 'pv', 'force', 'vitesse', 'portee_attaque',
      'cadence_attaque_ms', 'comportement', 'loot_table', 'render',
    ],
    idField: 'id',
    refs: [{ field: 'loot_table', catalog: 'loot_tables' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      if (entry.element != null && !(catalogs.elements || []).some((e) => e.id === entry.element)) {
        erreurs.push(`${path} > element "${entry.element}" introuvable dans elements.json`);
      }
      erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
      return erreurs;
    },
  },
  puzzles: {
    requiredFields: ['id', 'type'],
    idField: 'id',
    refs: [],
    custom: validerPuzzle,
  },
  dialogues: {
    requiredFields: ['id', 'declencheur', 'lignes'],
    idField: 'id',
    refs: [],
    custom: validerDialogue,
  },
  // 03_maison-exterieur §2.1 : catalogue ouvert, on démarre à 2 (bois,
  // pierre) — une 3ᵉ ressource est une entrée JSON de plus (tile + entrée
  // resources.json + item + dialogue + clés de locale), zéro code.
  resources: {
    requiredFields: ['id', 'label_key', 'dialogue_bloque', 'outil_requis', 'item_produit'],
    idField: 'id',
    refs: [{ field: 'dialogue_bloque', catalog: 'dialogues' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      // outil_requis : null tant qu'aucun outil n'existe dans le jeu (Phase
      // 2) — une chaîne (réf. future tools.json, Phase 3) reste acceptée
      // sans validation croisée ici : le catalogue n'existe pas encore, la
      // référence ne peut donc pas être vérifiée avant que Phase 3 ajoute
      // tools.json (elle ajoutera alors sa propre entrée `refs`).
      if (entry.outil_requis !== null && typeof entry.outil_requis !== 'string') {
        erreurs.push(`${path} > outil_requis doit être null ou une chaîne (id d'outil)`);
      }
      if (!(catalogs.items || []).some((i) => i.id === entry.item_produit)) {
        erreurs.push(`${path} > item_produit "${entry.item_produit}" introuvable dans items.json`);
      }
      return erreurs;
    },
  },
  items: {
    requiredFields: ['id', 'label_key', 'categorie', 'stack_max', 'render'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      const CATEGORIES_ITEM = ['ressource', 'nourriture', 'valeur'];
      if (!CATEGORIES_ITEM.includes(entry.categorie)) {
        erreurs.push(`${path} > categorie doit être l'une de ${CATEGORIES_ITEM.join('/')}`);
      }
      if (typeof entry.stack_max !== 'number' || entry.stack_max <= 0) {
        erreurs.push(`${path} > stack_max doit être un nombre positif`);
      }
      erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
      // spawn optionnel (§2.1 : "spawn optionnel") : un item purement de
      // craft (Phase 3+) n'a pas besoin d'exister au sol.
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
};

// Catalogues déclarés mais non figés (contenu réel figé phase après phase).
const CATALOGUES_MINIMAUX = [
  'armors', 'accessories', 'skills', 'recipes', 'stations', 'crops', 'journal_entries',
];

for (const nom of CATALOGUES_MINIMAUX) {
  SCHEMAS[nom] = schemaMinimal();
}

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
  return erreurs;
}

// Une scène n'a pas un simple champ de référence : son layout est une grille
// de tuiles, et Phase 1 y ajoute portails/interactifs/spawns/lumieres/portes,
// tous optionnels et validés ici plutôt que par le mécanisme générique `refs`
// (chacun a une forme propre, pas un simple champ->id).
function validerScene(entry, catalogs, path) {
  const erreurs = [];
  const largeur = entry.width;
  const hauteur = entry.height;
  const layout = entry.layout;

  if (typeof entry.seed !== 'number' || !Number.isInteger(entry.seed)) {
    erreurs.push(`${path} > seed manquant ou invalide (entier requis, pas de valeur par défaut)`);
  }
  if (!Array.isArray(layout)) {
    erreurs.push(`${path} > layout doit être un tableau 2D`);
    return erreurs;
  }
  if (layout.length !== hauteur) {
    erreurs.push(`${path} > layout a ${layout.length} lignes, height=${hauteur} attendu`);
  }
  const tiles = catalogs.tiles || [];
  const tileIds = new Set(tiles.map((t) => t.id));
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
  } else {
    erreurs.push(`${path} > type "${entry.type}" inconnu (levier | sequence)`);
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
};

// Catalogues déclarés mais non figés (contenu réel figé phase après phase).
const CATALOGUES_MINIMAUX = [
  'armors', 'accessories', 'skills', 'recipes', 'stations', 'crops', 'journal_entries',
];

for (const nom of CATALOGUES_MINIMAUX) {
  SCHEMAS[nom] = schemaMinimal();
}

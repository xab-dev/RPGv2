// Schémas de validation par catalogue de données.
//
// Chaque schéma décrit : les champs obligatoires (requiredFields), le champ
// qui sert d'identifiant unique (idField), les références croisées simples
// vers un autre catalogue (refs), et une validation additionnelle propre au
// catalogue (custom) quand la forme dépasse un simple champ->id.
//
// Les catalogues encore vides en Phase 0 (armes, ennemis, recettes, etc.)
// n'ont qu'un id à respecter : leur schéma de contenu se fige phase après
// phase, jamais en Phase 0 (cf. 01_socle-technique.md §2.1).

function schemaMinimal() {
  return { requiredFields: ['id'], idField: 'id', refs: [], custom: null };
}

// Une scène n'a pas un simple champ de référence : son layout est une grille
// de tuiles. La validation générique (refs) ne couvre pas ce cas, d'où ce
// validateur dédié qui vérifie aussi les dimensions et le spawn.
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
    custom: null,
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
};

// Catalogues déclarés mais non figés (Phase 0 : présence + JSON valide + id unique).
const CATALOGUES_MINIMAUX = [
  'weapons', 'armors', 'accessories', 'enemies', 'skills', 'status_effects',
  'synergies', 'recipes', 'stations', 'crops', 'loot_tables', 'puzzles',
  'companions', 'dialogues', 'journal_entries',
];

for (const nom of CATALOGUES_MINIMAUX) {
  SCHEMAS[nom] = schemaMinimal();
}

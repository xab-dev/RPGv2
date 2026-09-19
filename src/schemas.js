import { PHASES_CYCLE } from './daynight.js';

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
  // `D-35` : une scène peut déclarer le profil de lumière du follet qui lui
  // est propre (les deux salles de la Grotte le font, avec les valeurs d'avant
  // le ticket). Même garde que le profil de base du compagnon.
  erreurs.push(...erreursProfilLumiere(entry.lumiere_follet, `${path} > lumiere_follet`));
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

// `D-35` : profil de lumière { rayon, fondu_px }, partagé par le follet
// (`companions.json#lumiere`, sa base) et par une scène qui veut le sien
// (`scenes.json#lumiere_follet`). Un fondu plus large que le rayon n'aurait
// pas de sens (le cœur net disparaîtrait) : refusé au boot plutôt que
// découvert de nuit, en jeu.
function erreursProfilLumiere(profil, path) {
  if (profil === undefined) return [];
  if (profil === null || typeof profil !== 'object') return [`${path} doit être un objet { rayon, fondu_px }`];
  const erreurs = [];
  if (typeof profil.rayon !== 'number' || profil.rayon <= 0) {
    erreurs.push(`${path} > rayon doit être un nombre strictement positif`);
  }
  if (typeof profil.fondu_px !== 'number' || profil.fondu_px < 0) {
    erreurs.push(`${path} > fondu_px doit être un nombre positif ou nul`);
  }
  if (erreurs.length === 0 && profil.fondu_px > profil.rayon) {
    erreurs.push(`${path} > fondu_px (${profil.fondu_px}) ne peut pas dépasser rayon (${profil.rayon})`);
  }
  return erreurs;
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
  erreurs.push(...erreursProfilLumiere(entry.lumiere, `${path} > lumiere`));
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
  // MT_heros-echelle_2026-09-19 : `echelle` propre de la silhouette (absente
  // = 1, un catalogue existant reste valide). Refusée au boot si elle n'est
  // pas un nombre strictement positif — une échelle nulle ou négative rendrait
  // le héros invisible ET lui donnerait une hitbox dégénérée, les deux
  // dérivant désormais du même champ.
  if (entry.echelle !== undefined && (typeof entry.echelle !== 'number' || entry.echelle <= 0)) {
    erreurs.push(`${path} > echelle doit être un nombre strictement positif si présent`);
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
  // MT_trainee-poussiere_2026-09-19 : catalogue des réglages d'effets
  // purement visuels du monde. Même patron que `survie_config` dans
  // survival.json (une entrée de configuration dans son catalogue) — un 2ᵉ
  // effet s'ajoute en ajoutant une entrée, sans toucher au schéma.
  effets: {
    // `visuel` n'est plus requis depuis MT_texte-flottant_2026-09-19 (`D-05`) :
    // un effet de type `texte` n'a pas de silhouette, il a un gabarit de
    // localisation. Il reste une RÉFÉRENCE quand il est présent (id inconnu =
    // échec dur au boot avec son chemin exact, cf. registry.js).
    requiredFields: ['id', 'type'],
    idField: 'id',
    refs: [{ field: 'visuel', catalog: 'visuels' }],
    custom(entry, catalogs, path) {
      const erreurs = [];
      // Tous les seuils sont PROVISOIRES (à régler au ressenti par Xav), mais
      // leur type et leur signe, eux, sont vérifiés au boot.
      //
      // Le jeu de champs attendu dépend du `type`, déclaré explicitement en
      // données plutôt que deviné à la présence d'un champ : sans ça, une
      // faute de frappe sur `intervalle_px` ferait passer la poussière pour un
      // effet d'un autre genre, et la validation ne dirait rien.
      const TYPES = ['particules', 'texte'];
      if (!TYPES.includes(entry.type)) {
        erreurs.push(`${path} > type doit valoir ${TYPES.map((t) => `"${t}"`).join(' ou ')}`);
        return erreurs;
      }

      // `duree_ms` est commun aux deux : une durée nulle donne un effet
      // invisible, quel que soit son genre.
      const positifs = ['duree_ms'];
      const positifsOuNuls = [];
      if (entry.type === 'particules') {
        // Un intervalle nul ferait une boucle d'émission sans fin dans
        // avancerPoussiere().
        positifs.push('intervalle_px');
        positifsOuNuls.push('alpha_depart', 'echelle_depart', 'echelle_fin');
        if (entry.visuel === undefined) erreurs.push(`${path} > visuel est requis pour un effet de particules`);
      } else {
        // `montee_px` à 0 donnerait un texte qui ne monte pas : accepté (le
        // réglage est à Xav), mais il doit rester un nombre.
        positifs.push('taille_px');
        positifsOuNuls.push('montee_px', 'fondu_depuis');
        if (!Number.isInteger(entry.capacite) || entry.capacite <= 0) {
          erreurs.push(`${path} > capacite doit être un entier strictement positif (taille de la réserve)`);
        }
        if (entry.fusion_ms !== undefined && (typeof entry.fusion_ms !== 'number' || entry.fusion_ms < 0)) {
          erreurs.push(`${path} > fusion_ms doit être un nombre >= 0 si présent`);
        }
        for (const champ of ['couleur', 'contour']) {
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
    requiredFields: ['id', 'label_key', 'element', 'synergie', 'rayon_aura', 'rayon_lumiere', 'render'],
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
      return erreurs;
    },
  },
  items: {
    requiredFields: ['id', 'label_key', 'categorie', 'stack_max', 'render'],
    idField: 'id',
    refs: [],
    custom(entry, catalogs, path) {
      const erreurs = [];
      // "outil" (Palier A) : hache/pioche — non consommé par le craft qui
      // les produit (ce sont des SORTIES), mais bien consommable comme
      // n'importe quel item par un futur système (perte, casse...) —
      // aucune règle spéciale ici, juste une catégorie de plus.
      const CATEGORIES_ITEM = ['ressource', 'nourriture', 'valeur', 'outil'];
      if (!CATEGORIES_ITEM.includes(entry.categorie)) {
        erreurs.push(`${path} > categorie doit être l'une de ${CATEGORIES_ITEM.join('/')}`);
      }
      if (typeof entry.stack_max !== 'number' || entry.stack_max <= 0) {
        erreurs.push(`${path} > stack_max doit être un nombre positif`);
      }
      erreurs.push(...erreursRenderVisuel(entry, catalogs, path));
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
    requiredFields: ['id', 'label_key', 'station', 'entrees', 'sortie', 'categorie', 'connue_au_depart'],
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
      const s = entry.sortie;
      if (!s || !itemsDeclares.has(s.item)) {
        erreurs.push(`${path} > sortie.item "${s && s.item}" introuvable dans items.json`);
      }
      if (!s || typeof s.qte !== 'number' || s.qte <= 0) {
        erreurs.push(`${path} > sortie.qte doit être un nombre positif`);
      }
      if (entry.xp !== undefined && (typeof entry.xp !== 'number' || entry.xp < 0)) {
        erreurs.push(`${path} > xp doit être un nombre >= 0 si présent`);
      }
      if (entry.cooldown_ms !== undefined && (typeof entry.cooldown_ms !== 'number' || entry.cooldown_ms <= 0)) {
        erreurs.push(`${path} > cooldown_ms doit être un nombre positif si présent`);
      }
      if (typeof entry.connue_au_depart !== 'boolean') {
        erreurs.push(`${path} > connue_au_depart doit être un booléen`);
      }
      erreurs.push(...erreursCondition(entry.deblocage, path, new Set((catalogs.flags || []).map((f) => f.id))));
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
      if (!ROLES_STATION.includes(entry.role)) {
        erreurs.push(`${path} > role doit être l'un de ${ROLES_STATION.join('/')}`);
      }
      if (entry.role === 'stockage' && (typeof entry.capacite !== 'number' || entry.capacite <= 0)) {
        erreurs.push(`${path} > role "stockage" exige capacite (nombre positif)`);
      }
      if (typeof entry.placable !== 'boolean') {
        erreurs.push(`${path} > placable doit être un booléen`);
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
    refs: [],
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
      if (typeof entry.decroissance_ms_plein_a_vide !== 'number' || entry.decroissance_ms_plein_a_vide <= 0) {
        erreurs.push(`${path} > decroissance_ms_plein_a_vide doit être un nombre positif`);
      }
      return erreurs;
    },
  },
  // Palier D §2.1 : table de niveaux, triée croissante par convention (non
  // imposée par le schéma, xp.js trie lui-même) — une entrée de plus
  // (niveau 11+) ne demande aucun code.
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

// Catalogues déclarés mais non figés (contenu réel figé phase après phase).
const CATALOGUES_MINIMAUX = ['armors', 'accessories', 'skills', 'crops', 'journal_entries'];

for (const nom of CATALOGUES_MINIMAUX) {
  SCHEMAS[nom] = schemaMinimal();
}

// Sauvegarde : double tampon versionné (§3.4), indépendant du support de
// stockage. Le module ne connaît que l'interface { lire(cle), ecrire(cle,
// valeur) } — IndexedDB en jeu (src/storage_indexeddb.js), un store en
// mémoire dans les tests (creerStoreMemoire ci-dessous).

export const VERSION_SCHEMA_COURANTE = 7;
const CLE_ACTUELLE = 'save_current';
const CLE_SUIVANTE = 'save_next';

// Plus d'arme de départ en dur ici (D-20, 2026-09-19) : une sauvegarde
// n'inscrit une arme que si le joueur en a réellement équipé une. `null` veut
// dire « aucun choix », et le défaut se résout au chargement depuis les
// données (`equipment_slots#equip_arme.defaut`, via
// combat.js#resoudreArmeEquipee) — changer l'arme de départ redevient ainsi
// un changement de JSON, et aucune sauvegarde ne fige un id de catalogue
// qu'elle n'a pas choisi. Les sauvegardes déjà écrites, elles, portent leur
// arme en dur et la gardent : seule une partie neuve a les mains nues.
const ARME_MIGRATION_1_2 = 'weapon_epee_bois';

// Silhouette du héros (03_grotte-polish §2.1 : « hero, données de départ, là
// où vit l'arme par défaut ») — un seul endroit plutôt qu'une constante
// recopiée dans main.js ; contrairement à l'arme, le héros n'a pas de
// catalogue de silhouettes jouables où déclarer ce défaut. La teinte
// selon le compagnon choisi (couleur_neutre avant choix) est palier 3, pas
// encore branchée ici : visuel_heros garde sa propre couleur par défaut tant
// qu'aucune teinte n'est passée à dessinerVisuel.
export const VISUEL_HEROS_ID = 'visuel_heros';

// Teinte du héros avant le choix du follet (03_grotte-polish §3.4/§9,
// `[OUVERT]`) : Xav a demandé "gris foncé", mais un gris foncé sur le voile
// bleuté à 0,72 (render.js) risque d'être quasi invisible — valeur
// provisoire retenue en attendant son verdict en jeu : gris moyen désaturé,
// complété par un contour clair sur visuel_heros (data/visuels.json) pour
// rester lisible même dans la pénombre. Une fois le follet choisi, cette
// teinte est remplacée par companions.render.couleur (jamais combinée).
export const COULEUR_HERO_NEUTRE = '#8f8f8f';

// Palier D (specs/04_maison-interieur.md §3.4) : niveau 1, aucune XP, aucun
// point libre — cohérent avec levels.json[0] (niveau_1, xp_cumulee 0).
const HERO_NIVEAU_DEPART = 1;

// Palier C (§3.3) : une SEULE source pour l'état de survie initial, reprise
// par saveNeuve() ET par la migration 3 -> 4 ci-dessous — deux littéraux
// dupliqués avaient dérivé silencieusement sans se contredire pour l'instant,
// mais c'est exactement la classe de bug que SD_phase3-stations-pv-jauges_
// 2026-09-17.md demandait d'éliminer avant qu'elle ne se reproduise. Une
// fonction (pas une constante partagée) : l'appelant en obtient un nouvel
// objet à chaque fois, jamais une référence mutée en place.
function etatInitialSurvie() {
  return { jauge_faim: 1, jauge_soif: 1 };
}

export function saveNeuve() {
  return {
    schema_version: VERSION_SCHEMA_COURANTE,
    saved_at: new Date().toISOString(),
    hero: {
      scene: 'scene_grotte_salle_1',
      x: 0,
      y: 0,
      pv: null, // renseigné au premier calcul des stats dérivées (pv_max inconnu ici)
      companion: null,
      equipement: { arme: null, consommable: null },
      // xp/niveau/points_stats_libres (Palier D §3.4) ; stats.points = points
      // alloués par le joueur, { statId: n }, distinct de status_effects
      // (buffs) — combiné aux autres modificateurs par
      // main.js#resoudreModificateursHeros, un seul chemin de calcul.
      xp: 0,
      niveau: HERO_NIVEAU_DEPART,
      points_stats_libres: 0,
      stats: { points: {} },
      // buffs_actifs (Palier C §3.3) : { statusEffectId: msRestant }, table
      // des effets temporaires en cours (ex. le fruit cuit) — status.js#
      // tickBuffsActifs/ajouterBuffActif.
      buffs_actifs: {},
    },
    // items : poche (03_maison-exterieur §3.3), { id: quantite }.
    inventaire: { eclats: 0, items: {} },
    // monde : état persistant indépendant du héros — items_sol (positions
    // courantes par scène, §3.3/§3.7), respawns_en_attente (délais de
    // réapparition en cours par scène, Palier B §3.2) et heure (cycle
    // jour/nuit ET horloge "temps actif" partagée par cooldowns/survie,
    // §3.5/§6).
    // `jour` (`D-59`) : numéro du jour de jeu, compté au moment où l'horloge
    // du cycle repasse par zéro. C'est la GRAINE du tirage des objets au sol,
    // et `jour_items_sol` retient le jour du dernier repos PAR SCÈNE.
    monde: { items_sol: {}, respawns_en_attente: {}, heure: 0, jour: 0, jour_items_sol: {} },
    puzzles: {},
    flags: {},
    settings: { lang: 'fr', musique: true },
    // Palier A/B/C (§2.2) : cooldowns { cle: horodatage_temps_actif } —
    // recettes (id de recette), ressources (`res:<scene>:<x>:<y>`), puits
    // (`eau:<id>`) partagent la même table, une clé par usage.
    cooldowns: {},
    // Palier C (§3.3) : jauges de survival.json, pleines à la création
    // (id de jauge -> valeur dans [0,1]) — jamais un objet figé
    // { faim, soif } en dur, une 3ᵉ jauge future n'a rien à changer ici.
    survie: etatInitialSurvie(),
    // `D-121` : le coffre n'a plus de champ à lui. Son contenu vit avec
    // l'INSTANCE de station qui le porte (`maison.stations[id].contenu`),
    // parce qu'il y en aura plusieurs — un pour le bois, un pour la pierre.
    // Une partie neuve n'a donc rien à déclarer ici : le coffre de base
    // reçoit son entrée au premier objet déposé.
    // Palier A (§3.1, D16②) : ids des recettes déjà découvertes — journal de
    // découvertes futur, données seulement pour l'instant.
    recettes_decouvertes: [],
    // specs/05_construction-stations.md §2 : poses des stations PLACABLES
    // déplacées par le joueur, { id_instance_puzzle: { x, y, rotation } } en
    // coordonnées tuile — vide = toutes les stations restent à leur position
    // par défaut de puzzles.json. `maison` reste un objet dédié (pas fourré
    // dans `monde`) : le patron vise "toute pièce future" (Poste avancé),
    // jamais une seule structure en dur.
    maison: { stations: {} },
  };
}

// Migration 1 -> 2 (Phase 1, §3.10) : ajoute compagnon/PV/équipement/
// inventaire/puzzles ; une sauvegarde v1 n'avait aucun de ces champs, donc
// aucune donnée à transporter au-delà de la position déjà présente — le
// héros rejoue le choix du follet (cf. entities.js et main.js, "follet non
// choisi -> la scène 1 rejoue le choix", §4).
function migrer_1_vers_2(payload) {
  return {
    ...payload,
    schema_version: 2,
    hero: {
      ...payload.hero,
      pv: null,
      companion: null,
      // Histoire figée, pas le défaut du jour (D-20, 2026-09-19) : cette
      // migration doit reproduire ce qu'elle produisait déjà, sinon une
      // sauvegarde v1 se mettrait à diverger des v2-v5, qui portent toutes
      // `weapon_epee_bois` en dur dans leur fichier et le garderont.
      equipement: { arme: ARME_MIGRATION_1_2 },
    },
    inventaire: { eclats: 0 },
    puzzles: {},
  };
}

// Position (px) du spawn de scene_maison_exterieur (data/scenes.json,
// 03_maison-exterieur §3.1) — dupliquée ici en dur car la migration tourne
// avant que le registre ne soit disponible (elle ne connaît que le payload
// de sauvegarde, jamais data/). Si ce spawn change un jour, ce seul endroit
// doit suivre — cf. §4 edge case : ce n'est pas la même classe de problème
// que le repli générique de main.js (registre.existe), qui ne fait que
// rattraper un id de scène disparu sans connaître sa bonne position.
const SPAWN_MAISON_EXTERIEUR_PX = { x: (6 + 0.5) * 32, y: (58 + 0.5) * 32 };

// Migration 2 -> 3 (03_maison-exterieur, §3.7) : ajoute la poche
// (inventaire.items), l'état du monde (monde.items_sol/heure) et le réglage
// musique — une sauvegarde v2 arrive avec une poche vide, aucun item au sol
// (regénéré au premier chargement de chaque scène, cf. main.js) et l'heure
// au matin (0 = début du cycle, cf. daynight.js#PHASES_CYCLE). §4 edge case
// explicite de la fiche : une sauvegarde qui pointait encore vers
// `scene_maison_exterieur_placeholder` (retiré, cf. journal Phase 1 —
// "renommage de contenu != migration de schéma") est redirigée ICI, pas
// laissée au repli générique de main.js (qui ramènerait à tort à la grotte).
function migrer_2_vers_3(payload) {
  const hero = { ...payload.hero };
  if (hero.scene === 'scene_maison_exterieur_placeholder') {
    hero.scene = 'scene_maison_exterieur';
    hero.x = SPAWN_MAISON_EXTERIEUR_PX.x;
    hero.y = SPAWN_MAISON_EXTERIEUR_PX.y;
  }
  return {
    ...payload,
    schema_version: 3,
    hero,
    inventaire: { ...payload.inventaire, items: {} },
    monde: { items_sol: {}, heure: 0 },
    settings: { ...payload.settings, musique: true },
  };
}

// Migration 3 -> 4 (Palier A-E, specs/04_maison-interieur.md §2.2) : ajoute
// XP/niveau/points de stats, buffs actifs, cooldowns, survie (jauges
// pleines — §4 edge case de la fiche : une migration démarre "propre",
// jamais affamée), coffre, recettes découvertes, respawns en attente et le
// slot consommable. §4 : un `type` de station disparu (l'ancien
// "station_placeholder") n'est PAS traité ici — c'est un renommage de
// contenu, jamais une migration de schéma (règle de méthode, CLAUDE.md) ;
// les positions de puzzles.json font foi telles quelles.
function migrer_3_vers_4(payload) {
  return {
    ...payload,
    schema_version: 4,
    hero: {
      ...payload.hero,
      equipement: { ...payload.hero.equipement, consommable: null },
      xp: 0,
      niveau: HERO_NIVEAU_DEPART,
      points_stats_libres: 0,
      stats: { points: {} },
      buffs_actifs: {},
    },
    monde: { ...payload.monde, respawns_en_attente: {} },
    cooldowns: {},
    survie: etatInitialSurvie(),
    coffre: { items: {} },
    recettes_decouvertes: [],
  };
}

// Migration 4 -> 5 (specs/05_construction-stations.md §2) : ajoute
// `maison.stations`, vide — une sauvegarde v4 n'a jamais posé de station
// ailleurs qu'à sa position par défaut de puzzles.json, donc rien à
// transporter (§4 edge case implicite : absence == positions par défaut,
// jamais une erreur).
function migrer_4_vers_5(payload) {
  return {
    ...payload,
    schema_version: 5,
    maison: { stations: {} },
  };
}

// Migration 5 -> 6 (`D-59`, file Nv.0 → Nv.10, T2) : ajoute le numéro du jour
// et le jour du dernier repos par scène, et **vide les objets au sol**.
//
// Vider est le point de la migration, pas un effet de bord. Les positions
// persistées d'une v5 viennent de l'ancien tirage LIBRE dans les zones : si
// on les gardait, elles resteraient à leur place d'origine jusqu'à la
// première aube jouée, et un joueur qui reprend sa partie en pleine nuit ne
// verrait rien du nouveau semis. Les respawns en attente partent avec elles,
// pour la même raison — un délai qui court pointe vers l'ancien monde.
//
// C'est la classe de bug que le projet connaît déjà (`CLAUDE.md` : « un
// renommage/retrait de contenu de catalogue n'est jamais couvert par la
// migration de schéma ») prise dans l'autre sens : ici la DONNÉE reste
// valide, c'est sa provenance qui est périmée.
function migrer_5_vers_6(payload) {
  return {
    ...payload,
    schema_version: 6,
    monde: {
      ...payload.monde,
      items_sol: {},
      respawns_en_attente: {},
      jour: 0,
      jour_items_sol: {},
    },
  };
}

// Id de l'instance de coffre livrée avec le jeu (data/puzzles.json), écrit en
// dur ICI pour la même raison que `SPAWN_MAISON_EXTERIEUR_PX` : la migration
// tourne avant que le registre n'existe, elle ne connaît que le payload. Si
// cette instance était un jour renommée, ce seul endroit devrait suivre.
const ID_COFFRE_DE_BASE = 'station_coffre';

// Migration 6 -> 7 (`D-121`, file « inventaire survivaliste », T5) : le
// contenu du coffre descend dans l'INSTANCE qui le porte.
//
// Pourquoi une migration de schéma cette fois, alors que `D-118` n'en
// demandait aucune : là, la donnée gardait sa forme et seule la règle
// changeait ; ici le champ `coffre` DISPARAÎT et son contenu change d'adresse.
// C'est exactement la frontière entre les deux classes.
//
// Le coffre de base devient l'instance 0 et hérite de ce qu'il contenait —
// jamais un coffre vidé par une mise à jour. Sa POSE, si le joueur l'avait
// déplacé, est conservée telle quelle : on ajoute un champ à son entrée, on
// ne la remplace pas.
function migrer_6_vers_7(payload) {
  const stations = { ...((payload.maison && payload.maison.stations) || {}) };
  const contenu = (payload.coffre && payload.coffre.items) || {};
  if (Object.keys(contenu).some((id) => contenu[id] > 0)) {
    stations[ID_COFFRE_DE_BASE] = { ...(stations[ID_COFFRE_DE_BASE] || {}), contenu };
  }
  const migre = { ...payload, schema_version: 7, maison: { ...payload.maison, stations } };
  delete migre.coffre;
  return migre;
}

// Chaîne de migrations, une fonction par palier. Un paramètre permet aux
// tests d'injecter une chaîne fictive sans toucher à la table de production.
const MIGRATIONS_PRODUCTION = {
  1: migrer_1_vers_2, 2: migrer_2_vers_3, 3: migrer_3_vers_4, 4: migrer_4_vers_5,
  5: migrer_5_vers_6, 6: migrer_6_vers_7,
};

export function migrer(payload, versionCible = VERSION_SCHEMA_COURANTE, migrations = MIGRATIONS_PRODUCTION) {
  let courant = payload;
  if (courant.schema_version > versionCible) {
    throw new Error(
      `sauvegarde en version ${courant.schema_version}, supérieure à la version du jeu (${versionCible}) — import refusé`
    );
  }
  while (courant.schema_version < versionCible) {
    const migration = migrations[courant.schema_version];
    if (!migration) {
      throw new Error(`aucune migration disponible depuis la version ${courant.schema_version}`);
    }
    courant = migration(courant);
  }
  return courant;
}

export function estValide(payload) {
  return !!(
    payload &&
    typeof payload.schema_version === 'number' &&
    payload.hero &&
    typeof payload.hero.x === 'number' &&
    typeof payload.hero.y === 'number'
  );
}

// Écrit en double tampon : save_next, relecture de vérification, puis
// promotion en save_current en une seule opération. Si le jeu est coupé
// entre les deux, save_current reste intact.
export async function sauvegarder(store, payload) {
  await store.ecrire(CLE_SUIVANTE, payload);
  const relu = await store.lire(CLE_SUIVANTE);
  if (!estValide(relu) || JSON.stringify(relu) !== JSON.stringify(payload)) {
    throw new Error('relecture de save_next invalide, promotion vers save_current annulée');
  }
  await store.ecrire(CLE_ACTUELLE, relu);
  return relu;
}

// Charge la sauvegarde courante ; si corrompue ou incompatible, tente
// save_next ; si les deux échouent, renvoie une partie neuve avec un motif
// explicite (jamais en silence).
export async function charger(store) {
  const actuelle = await store.lire(CLE_ACTUELLE);
  if (estValide(actuelle)) {
    try {
      return { payload: migrer(actuelle), origine: 'save_current' };
    } catch {
      // version incompatible ou migration manquante : on retente save_next.
    }
  }

  const suivante = await store.lire(CLE_SUIVANTE);
  if (estValide(suivante)) {
    try {
      return { payload: migrer(suivante), origine: 'save_next (repli)' };
    } catch {
      // idem : on retombe sur une partie neuve ci-dessous.
    }
  }

  return {
    payload: saveNeuve(),
    origine: 'partie neuve — sauvegarde illisible, absente ou incompatible',
  };
}

// `specs/09_reglages-graphiques.md` §5.3 : les réglages qui appartiennent à
// l'APPAREIL, pas à la partie. Une sauvegarde exportée d'un PC en « haut »
// puis importée sur un téléphone ne doit pas lui imposer « haut ».
//
// Pourquoi une liste et pas un `if` : le prochain réglage d'appareil (le son,
// une taille d'UI tactile) s'ajoute ici et nulle part ailleurs. Les réglages
// de PARTIE (langue, musique) ne sont pas dans cette liste et suivent la
// sauvegarde, comme avant.
export const REGLAGES_APPAREIL = ['graphismes'];

// Pure, donc testable sans store : rend le payload importé avec, pour chaque
// réglage d'appareil, la valeur de CET appareil — y compris son absence
// (« je n'ai jamais choisi » est une valeur, et elle doit survivre à un
// import qui, lui, portait un choix).
export function conserverReglagesAppareil(payloadImporte, payloadAppareil) {
  const settings = { ...(payloadImporte.settings || {}) };
  const ici = (payloadAppareil && payloadAppareil.settings) || {};
  for (const cle of REGLAGES_APPAREIL) {
    if (cle in ici) settings[cle] = ici[cle];
    else delete settings[cle];
  }
  return { ...payloadImporte, settings };
}

// Import manuel (menu) : valide puis migre le fichier fourni par
// l'utilisateur avant de l'écrire en double tampon. Une version supérieure à
// la version du jeu est refusée par migrer(), jamais migrée "à l'envers".
//
// La sauvegarde DÉJÀ présente est relue d'abord, pour la seule raison
// ci-dessus : on lui reprend ses réglages d'appareil. Si elle est absente ou
// illisible, l'import garde simplement les siens — un appareil sans historique
// n'a rien à défendre.
export async function importerSauvegarde(store, payloadBrut) {
  if (!estValide(payloadBrut)) {
    throw new Error('fichier de sauvegarde invalide');
  }
  const migre = migrer(payloadBrut);
  const ici = await store.lire(CLE_ACTUELLE);
  return sauvegarder(store, conserverReglagesAppareil(migre, estValide(ici) ? ici : null));
}

// Réinitialisation depuis le menu (diagnostic
// SD_grotte-blocage-choix-follet_2026-09-15.md, §B) : Xav a besoin de
// retrouver le cold open à volonté sans vider IndexedDB à la main. Réécrit
// une partie neuve via la même discipline double tampon que sauvegarder()
// plutôt que de supprimer les clés du store — après cet appel, charger()
// renvoie forcément une partie neuve valide à la version de schéma
// courante, jamais une clé absente ou à moitié écrite.
export async function reinitialiserSauvegarde(store) {
  return sauvegarder(store, saveNeuve());
}

export function creerStoreMemoire() {
  const donnees = new Map();
  return {
    async lire(cle) {
      return donnees.has(cle) ? donnees.get(cle) : undefined;
    },
    async ecrire(cle, valeur) {
      donnees.set(cle, valeur);
    },
  };
}

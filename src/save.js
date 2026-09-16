// Sauvegarde : double tampon versionné (§3.4), indépendant du support de
// stockage. Le module ne connaît que l'interface { lire(cle), ecrire(cle,
// valeur) } — IndexedDB en jeu (src/storage_indexeddb.js), un store en
// mémoire dans les tests (creerStoreMemoire ci-dessous).

export const VERSION_SCHEMA_COURANTE = 2;
const CLE_ACTUELLE = 'save_current';
const CLE_SUIVANTE = 'save_next';

// Arme de départ équipée d'office en données (§2.1 : weapon_epee_bois),
// sans UI d'équipement avant Phase 4 — une seule constante ici plutôt qu'une
// valeur recopiée à chaque site qui crée une sauvegarde neuve.
const ARME_DEPART = 'weapon_epee_bois';

// Silhouette du héros (03_grotte-polish §2.1 : « hero, données de départ, là
// où vit l'arme par défaut ») — même logique que ARME_DEPART ci-dessus, un
// seul endroit plutôt qu'une constante recopiée dans main.js. La teinte
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
      equipement: { arme: ARME_DEPART },
    },
    inventaire: { eclats: 0 },
    puzzles: {},
    flags: {},
    settings: { lang: 'fr' },
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
      equipement: { arme: ARME_DEPART },
    },
    inventaire: { eclats: 0 },
    puzzles: {},
  };
}

// Chaîne de migrations, une fonction par palier. Un paramètre permet aux
// tests d'injecter une chaîne fictive sans toucher à la table de production.
const MIGRATIONS_PRODUCTION = { 1: migrer_1_vers_2 };

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

// Import manuel (menu) : valide puis migre le fichier fourni par
// l'utilisateur avant de l'écrire en double tampon. Une version supérieure à
// la version du jeu est refusée par migrer(), jamais migrée "à l'envers".
export async function importerSauvegarde(store, payloadBrut) {
  if (!estValide(payloadBrut)) {
    throw new Error('fichier de sauvegarde invalide');
  }
  const migre = migrer(payloadBrut);
  return sauvegarder(store, migre);
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

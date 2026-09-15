// Sauvegarde : double tampon versionné (§3.4), indépendant du support de
// stockage. Le module ne connaît que l'interface { lire(cle), ecrire(cle,
// valeur) } — IndexedDB en jeu (src/storage_indexeddb.js), un store en
// mémoire dans les tests (creerStoreMemoire ci-dessous).

export const VERSION_SCHEMA_COURANTE = 1;
const CLE_ACTUELLE = 'save_current';
const CLE_SUIVANTE = 'save_next';

export function saveNeuve() {
  return {
    schema_version: VERSION_SCHEMA_COURANTE,
    saved_at: new Date().toISOString(),
    hero: { scene: 'scene_salle_test', x: 0, y: 0 },
    flags: {},
    settings: { lang: 'fr' },
  };
}

// Chaîne de migrations, une fonction par palier : { 1: migrate_1_to_2, ... }.
// Vide en Phase 0 (schema_version = 1 est la seule version qui existe
// réellement) — un paramètre permet aux tests d'injecter une chaîne fictive
// sans toucher à la table de production.
const MIGRATIONS_PRODUCTION = {};

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

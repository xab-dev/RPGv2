// Adaptateur IndexedDB pour save.js (jamais localStorage seul — contrainte
// WebView). `indexedDB` n'est référencé qu'à l'intérieur des fonctions,
// jamais au niveau module : ce fichier n'est jamais importé par les tests
// headless (IndexedDB n'existe pas dans Node) — ceux-ci utilisent
// save.creerStoreMemoire() à la place.

const NOM_BASE = 'rpg_v2';
const NOM_MAGASIN = 'sauvegardes';
const VERSION_BASE = 1;

function ouvrirBase() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(NOM_BASE, VERSION_BASE);
    requete.onupgradeneeded = () => {
      requete.result.createObjectStore(NOM_MAGASIN);
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

export function creerStoreIndexedDB() {
  let basePromise = null;
  function base() {
    if (!basePromise) basePromise = ouvrirBase();
    return basePromise;
  }

  return {
    async lire(cle) {
      const db = await base();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(NOM_MAGASIN, 'readonly');
        const requete = tx.objectStore(NOM_MAGASIN).get(cle);
        requete.onsuccess = () => resolve(requete.result);
        requete.onerror = () => reject(requete.error);
      });
    },
    async ecrire(cle, valeur) {
      const db = await base();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(NOM_MAGASIN, 'readwrite');
        tx.objectStore(NOM_MAGASIN).put(valeur, cle);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}

// Chargement des catalogues et locales depuis le disque (Node). Utilisé par
// les tests headless et les futurs outils — jamais par le jeu servi au
// navigateur, qui passe par src/io_navigateur.js (fetch).

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function chargerCataloguesDepuisDisque(racineData, noms) {
  const donnees = {};
  const erreurs = [];
  await Promise.all(
    noms.map(async (nom) => {
      const chemin = path.join(racineData, `${nom}.json`);
      let brut;
      try {
        brut = await readFile(chemin, 'utf-8');
      } catch {
        erreurs.push(`${nom}.json > fichier introuvable (${chemin})`);
        return;
      }
      try {
        donnees[nom] = JSON.parse(brut);
      } catch (e) {
        erreurs.push(`${nom}.json > JSON invalide : ${e.message}`);
      }
    })
  );
  return { donnees, erreurs };
}

export async function chargerLocalesDepuisDisque(racineLocales, langues = ['fr', 'en']) {
  const dictionnaires = {};
  for (const langue of langues) {
    const chemin = path.join(racineLocales, `${langue}.json`);
    const brut = await readFile(chemin, 'utf-8');
    dictionnaires[langue] = JSON.parse(brut);
  }
  return dictionnaires;
}

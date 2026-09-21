// Registre de données : validation des catalogues + résolution des id.
//
// Module pur, sans accès disque ni DOM : il reçoit les catalogues déjà
// parsés (un objet { nomCatalogue: tableauDEntrees }) et rend soit la liste
// des erreurs de validation, soit un registre interrogeable. Le chargement
// effectif (fetch en jeu, fs dans les tests) vit dans des modules d'I/O
// séparés — cf. src/io_navigateur.js et src/io_node.js.

import { SCHEMAS, erreursConditionVisibilite } from './schemas.js';

// Valide l'ensemble des catalogues : présence, JSON déjà valide (parsé en
// amont), champs obligatoires, unicité des id (au sein du catalogue et entre
// catalogues), références croisées, validations spécifiques (cf. schemas.js).
// Retourne un tableau d'erreurs lisibles ; vide si tout est valide.
export function validerCatalogues(donnees) {
  const erreurs = [];
  const idsGlobaux = new Map(); // id -> nom du catalogue où il a été vu en premier

  for (const [nomCatalogue, schema] of Object.entries(SCHEMAS)) {
    const entrees = donnees[nomCatalogue];

    if (entrees === undefined) {
      erreurs.push(`${nomCatalogue}.json > catalogue absent`);
      continue;
    }
    if (!Array.isArray(entrees)) {
      erreurs.push(`${nomCatalogue}.json > doit contenir un tableau JSON`);
      continue;
    }

    const idsLocaux = new Set();

    entrees.forEach((entree, index) => {
      const chemin = `${nomCatalogue}.json[${index}]`;

      if (entree === null || typeof entree !== 'object') {
        erreurs.push(`${chemin} > doit être un objet`);
        return;
      }

      for (const champ of schema.requiredFields) {
        if (entree[champ] === undefined) {
          erreurs.push(`${chemin} > champ "${champ}" manquant`);
        }
      }

      const id = entree[schema.idField];
      let cheminId = chemin;
      if (id !== undefined) {
        cheminId = `${nomCatalogue}.json > ${id}`;
        if (idsLocaux.has(id)) {
          erreurs.push(`${cheminId} > id dupliqué dans ${nomCatalogue}.json`);
        }
        idsLocaux.add(id);

        if (idsGlobaux.has(id) && idsGlobaux.get(id) !== nomCatalogue) {
          erreurs.push(`${cheminId} > id en collision avec le catalogue "${idsGlobaux.get(id)}"`);
        } else {
          idsGlobaux.set(id, nomCatalogue);
        }
      }

      for (const ref of schema.refs || []) {
        const valeur = entree[ref.field];
        if (valeur === undefined) continue;
        const cible = donnees[ref.catalog] || [];
        const existe = cible.some((e) => e && e.id === valeur);
        if (!existe) {
          erreurs.push(`${cheminId} > ${ref.field} > "${valeur}" introuvable dans ${ref.catalog}.json`);
        }
      }

      // `visible_si` (`D-62`, T4) : le filtre anti-spoil est GÉNÉRIQUE, donc
      // sa validation l'est aussi — n'importe quel catalogue peut porter le
      // champ, et une condition mal écrite doit tomber au boot dans tous.
      // Le contrôle vit ici, une fois, plutôt que d'être recopié dans chaque
      // `custom()` : c'est le même raisonnement que la fonction unique de
      // filtrage côté jeu.
      erreurs.push(...erreursConditionVisibilite(entree.visible_si, `${cheminId} > visible_si`, donnees));

      if (schema.custom) {
        erreurs.push(...schema.custom(entree, donnees, cheminId));
      }
    });
  }

  return erreurs;
}

// Construit un registre interrogeable par id. Ne doit être appelé qu'après
// une validation réussie (validerCatalogues renvoie []).
export function construireRegistre(donnees) {
  const index = new Map();
  for (const nomCatalogue of Object.keys(SCHEMAS)) {
    const entrees = donnees[nomCatalogue] || [];
    const parId = new Map(entrees.map((e) => [e.id, e]));
    index.set(nomCatalogue, parId);
  }

  return {
    obtenir(catalogue, id) {
      const parId = index.get(catalogue);
      return parId ? parId.get(id) : undefined;
    },
    existe(catalogue, id) {
      const parId = index.get(catalogue);
      return parId ? parId.has(id) : false;
    },
    tous(catalogue) {
      const parId = index.get(catalogue);
      return parId ? Array.from(parId.values()) : [];
    },
  };
}

// Chargement réseau des catalogues et locales, pour l'exécution en jeu
// (navigateur, servi en http://). Équivalent I/O de src/io_node.js. `fetch`
// n'est référencé qu'à l'intérieur des fonctions exportées, jamais au niveau
// module.

export async function chargerCataloguesDepuisReseau(racine, noms) {
  const donnees = {};
  const erreurs = [];
  await Promise.all(
    noms.map(async (nom) => {
      try {
        const reponse = await fetch(`${racine}/${nom}.json`, { cache: 'no-store' });
        if (!reponse.ok) {
          erreurs.push(`${nom}.json > HTTP ${reponse.status}`);
          return;
        }
        const texte = await reponse.text();
        try {
          donnees[nom] = JSON.parse(texte);
        } catch (e) {
          erreurs.push(`${nom}.json > JSON invalide : ${e.message}`);
        }
      } catch (e) {
        erreurs.push(`${nom}.json > requête réseau échouée (${e.message})`);
      }
    })
  );
  return { donnees, erreurs };
}

export async function chargerLocalesDepuisReseau(racine, langues = ['fr', 'en']) {
  const dictionnaires = {};
  for (const langue of langues) {
    const reponse = await fetch(`${racine}/${langue}.json`, { cache: 'no-store' });
    dictionnaires[langue] = await reponse.json();
  }
  return dictionnaires;
}

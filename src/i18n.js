// Localisation : dictionnaire plat clé -> texte, un fichier par langue.
// Aucune chaîne visible ne doit être écrite ailleurs qu'ici (contrainte
// "zéro chaîne en dur").

export function creerI18n(dictionnaires, langueInitiale = 'fr') {
  let langue = langueInitiale;

  function t(cle) {
    const dict = dictionnaires[langue] || {};
    if (Object.prototype.hasOwnProperty.call(dict, cle)) return dict[cle];
    return `[[${cle}]]`;
  }

  function definirLangue(l) {
    if (!dictionnaires[l]) throw new Error(`langue "${l}" non chargée`);
    langue = l;
  }

  return {
    t,
    definirLangue,
    langueCourante: () => langue,
    languesDisponibles: () => Object.keys(dictionnaires),
  };
}

// Vérifie que toutes les langues déclarent exactement le même jeu de clés.
export function verifierJeuxDeCles(dictionnaires) {
  const erreurs = [];
  const langues = Object.keys(dictionnaires);
  if (langues.length === 0) return erreurs;

  const [premiere, ...reste] = langues;
  const clesReference = new Set(Object.keys(dictionnaires[premiere]));

  for (const langue of reste) {
    const cles = new Set(Object.keys(dictionnaires[langue]));
    for (const cle of clesReference) {
      if (!cles.has(cle)) erreurs.push(`${langue}.json > clé manquante "${cle}" (présente en ${premiere})`);
    }
    for (const cle of cles) {
      if (!clesReference.has(cle)) erreurs.push(`${premiere}.json > clé manquante "${cle}" (présente en ${langue})`);
    }
  }

  return erreurs;
}

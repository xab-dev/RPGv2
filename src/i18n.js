// Localisation : dictionnaire plat clé -> texte, un fichier par langue.
// Aucune chaîne visible ne doit être écrite ailleurs qu'ici (contrainte
// "zéro chaîne en dur").

export function creerI18n(dictionnaires, langueInitiale = 'fr') {
  let langue = langueInitiale;

  // `params` (MT_texte-flottant_2026-09-19, `D-05`) : substitution des
  // marqueurs `{nom}` du gabarit par des valeurs déjà calculées par
  // l'appelant — « +{n} {item} » devient « +2 Bois ». Optionnel et purement
  // additif : tous les appels d'avant ce ticket restent inchangés.
  //
  // Pourquoi ici et pas chez l'appelant : c'est le gabarit lui-même qui est
  // traduisible (le « + », l'ordre des morceaux, l'espace). Le composer par
  // concaténation dans main.js remettrait du texte visible hors des
  // locales — exactement ce que la contrainte « zéro chaîne en dur »
  // interdit. Un marqueur sans valeur fournie est laissé tel quel : il se
  // voit à l'écran, comme le `[[cle]]` d'une clé manquante, au lieu de
  // disparaître silencieusement.
  function t(cle, params = null) {
    const dict = dictionnaires[langue] || {};
    if (!Object.prototype.hasOwnProperty.call(dict, cle)) return `[[${cle}]]`;
    const texte = dict[cle];
    if (!params) return texte;
    return texte.replace(/\{([a-z0-9_]+)\}/gi, (marqueur, nom) => (
      Object.prototype.hasOwnProperty.call(params, nom) ? String(params[nom]) : marqueur
    ));
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

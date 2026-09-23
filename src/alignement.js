// `specs/10_alignement-follet.md` §2.2 : l'alignement, stat CACHÉE du héros.
//
// Module pur : ni DOM, ni scène, ni sauvegarde importée. Il reçoit des nombres
// et la configuration de `data/alignement.json`, il rend des nombres.
//
// Ce qu'il ne fait volontairement pas : décider QUI modifie l'alignement. Le
// spam, la lecture, une option de dialogue sont des APPELANTS de
// `main.js#modifierAlignement` (spec 11), jamais des cas particuliers d'ici —
// sinon chaque nouvelle source demanderait de rouvrir ce fichier.
//
// Aucune chaîne de ce module n'est un texte de jeu : l'alignement n'est nommé
// par AUCUNE clé de localisation (§0, « le seul indice est l'effet en jeu »).
// Les messages ci-dessous sont des erreurs de développement, en français
// comme tout message de boot.

// L'id de l'entrée de configuration, dans son catalogue — même patron que
// `survie_config` (`survival.js`) et `graphismes_presets` (`qualite.js`).
export const ID_CONFIG_ALIGNEMENT = 'alignement_config';

// LE point de lecture de la configuration. Échec dur si l'entrée manque : le
// schéma valide la FORME d'une entrée présente, il ne peut pas voir un
// catalogue vide, et un alignement sans bornes ne doit pas se découvrir en
// pleine partie.
export function configAlignement(registre) {
  const config = registre.obtenir('alignement', ID_CONFIG_ALIGNEMENT);
  if (!config) {
    throw new Error(`alignement.json : entrée "${ID_CONFIG_ALIGNEMENT}" absente`);
  }
  return config;
}

export function borner(valeur, bornes) {
  return Math.min(bornes.max, Math.max(bornes.min, valeur));
}

// LA fonction que tout le reste appelle (orbite au palier B, synergies au
// palier C, tests) : personne ne recalcule un palier de son côté.
//
// Le SIGNE donne le régime, la VALEUR ABSOLUE l'intensité. Les paliers se
// lisent « dès » : le palier retenu est le plus haut dont le seuil est atteint.
// Au-dessous du premier seuil, c'est la bande morte — régime neutre, palier 0.
// Pourquoi « dès » plutôt que « jusqu'à » (la forme de la spec §5) : entre
// deux entiers, « jusqu'à 2 » ne dit pas où tombe 2,5, alors que « dès 3 » le
// dit sans ambiguïté, et c'est ce qui sépare 4,99 (palier 2) de 5 (palier 3)
// comme la spec l'exige à ses bords. Le premier seuil EST la bande morte :
// une seule valeur en données, jamais deux qui pourraient se contredire.
export function regime(valeur, config) {
  const intensite = Math.abs(valeur);
  let palier = 0;
  for (const p of config.paliers) {
    if (intensite >= p.des && p.palier > palier) palier = p.palier;
  }
  if (palier === 0) return { regime: 'neutre', palier: 0 };
  return { regime: valeur > 0 ? 'positif' : 'negatif', palier };
}

// `ecart` dit ce qui a RÉELLEMENT bougé — un +1 sur un alignement déjà à +5
// rend un écart nul, et c'est ce que le journal de `?debug=fps` doit montrer.
//
// Arrondi au millionième (spec 11, 23/09). Le palier A disait « aucun
// arrondi : les poids sont des multiples de 0,25 » — plus vrai depuis la
// lecture complète à +0,1 : dix lectures sommées en flottants font
// 0,9999999999999999, SOUS le seuil du palier 1 (`regime` compare `>= 1`).
// Un joueur qui a tout lu dix fois resterait neutre, sans que rien ne le
// dise. Le millionième est bien plus fin que tout poids écrit en données, et
// bien plus gros que la dérive des flottants.
const PRECISION_ALIGNEMENT = 1e6;

export function appliquerDelta(valeur, delta, bornes) {
  const nouvelle = borner(Math.round((valeur + delta) * PRECISION_ALIGNEMENT) / PRECISION_ALIGNEMENT, bornes);
  return { valeur: nouvelle, ecart: nouvelle - valeur };
}

// Lecture de `save.hero.alignement`. Après la migration 7 → 8, le champ existe
// TOUJOURS : son absence est un échec dur, jamais un repli sur 0 — un champ
// optionnel à valeur de repli masquerait un branchement oublié (`D-03`,
// `D-23`). Une valeur hors bornes aussi : elle ne peut venir que d'un fichier
// édité à la main ou d'un écrivain qui aurait contourné `appliquerDelta`.
export function lireAlignement(hero, bornes) {
  const valeur = hero && hero.alignement;
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    throw new Error(`sauvegarde : hero.alignement absent ou non numérique (${JSON.stringify(valeur)})`);
  }
  if (valeur < bornes.min || valeur > bornes.max) {
    throw new Error(`sauvegarde : hero.alignement vaut ${valeur}, hors des bornes [${bornes.min} ; ${bornes.max}]`);
  }
  return valeur;
}

// `?alignement=N` (§6) — patron exact de `debug_perf.js#lireEchelleForcee` :
// pur, lu une seule fois au boot par main.js, et une valeur invalide ou hors
// bornes rend `valeur: null` ET un avertissement, jamais un repli plausible
// qui ferait regarder autre chose que ce que Xav croit avoir demandé.
// Les bornes sont celles des données, passées par l'appelant : le paramètre
// d'URL n'a pas le droit d'en connaître d'autres.
export function lireAlignementForce(search, bornes) {
  if (!search) return { valeur: null, avertissement: null };
  const brut = new URLSearchParams(search).get('alignement');
  if (brut === null) return { valeur: null, avertissement: null };
  // `Number('')` vaut 0 : un `?alignement=` vide serait lu comme « neutre
  // forcé » sans un mot. Refusé explicitement.
  const valeur = brut.trim() === '' ? NaN : Number(brut);
  if (!Number.isFinite(valeur) || valeur < bornes.min || valeur > bornes.max) {
    return {
      valeur: null,
      avertissement: `?alignement=${brut} ignoré : attendu un nombre entre ${bornes.min} et ${bornes.max} (décimales admises). Valeur de la sauvegarde conservée.`,
    };
  }
  return { valeur, avertissement: null };
}

// Réglages graphiques (`specs/09_reglages-graphiques.md`) : LE point de
// résolution, et le seul. `render.js`, `decor.js` et les systèmes de
// particules REÇOIVENT une valeur de levier ; aucun ne lit `graphismes.json`,
// aucun ne connaît le mot « bas ». Ajouter un preset reste alors une entrée de
// catalogue et deux lignes de locales, sans une ligne de code.
//
// Module PUR : pas de DOM, pas d'horloge, pas de catalogue implicite. La
// configuration (l'entrée `graphismes_presets`) est passée en argument, comme
// les signaux d'appareil — qui sont lus une seule fois, au démarrage, par
// `main.js`.

// La valeur d'un levier qui ne change rien. Elle vit en DONNÉES
// (`valeur_neutre`) parce que c'est elle qui définit Moyen : « Moyen =
// l'état actuel » est le contrat de non-régression du palier B, pas un
// réglage d'auteur. Ce défaut ne sert qu'à un appelant qui n'aurait pas de
// configuration du tout (aucun en jeu).
const VALEUR_NEUTRE_DEFAUT = 1;

function palierParId(config, id) {
  return (config.paliers || []).find((p) => p.id === id) || null;
}

// Résout le choix du joueur en un preset RÉEL. Rend toujours la même forme
// — { preset, auto, avertissement } — sur le patron de
// `debug_perf.js#lireEchelleForcee` : une valeur inconnue n'est jamais
// remplacée en silence par une valeur plausible, elle est rendue avec son
// avertissement, et l'appelant décide quoi en faire.
//
// `choix` vient de `save.settings.graphismes` : **absent veut dire « je n'ai
// jamais choisi »**, donc `auto`, et le défaut vit dans le catalogue (patron
// du volume, `D-64`). Le preset résolu, lui, n'est jamais persisté.
//
// `signauxAppareil.pointeurGrossier` est le SEUL signal de départ (§5.1) :
// ni mémoire, ni nombre de cœurs, ni nom de navigateur. Motif mesuré : le
// portable Pentium sans GPU, 2 Go, joue à 58 fps en Moyen — une heuristique
// mémoire l'aurait classé Bas à tort.
export function resoudrePreset(choix, signauxAppareil, config) {
  const defaut = config.defaut;
  const connus = (config.paliers || []).map((p) => p.id);

  if (choix !== undefined && choix !== null && !connus.includes(choix)) {
    return {
      ...resoudrePreset(defaut, signauxAppareil, config),
      avertissement: `graphismes : réglage "${choix}" inconnu (attendu ${connus.join(', ')}) — résolu comme "${defaut}"`,
    };
  }

  const effectif = choix === undefined || choix === null ? defaut : choix;
  if (effectif !== defaut) return { preset: effectif, auto: false, avertissement: null };

  // Auto ne choisit JAMAIS Haut : c'est un choix du joueur, pas une
  // supposition sur sa machine.
  return {
    preset: signauxAppareil && signauxAppareil.pointeurGrossier ? 'bas' : 'moyen',
    auto: true,
    avertissement: null,
  };
}

// La valeur d'un levier pour un preset réel. Lève sur un levier ou un preset
// inconnu : ce n'est pas une donnée douteuse (le schéma garantit que chaque
// palier couvre chaque levier déclaré), c'est une faute de programmation au
// point de lecture — elle doit tomber, pas se replier sur « 1 » et faire
// croire que le réglage marche.
export function valeurLevier(config, presetId, levier) {
  const palier = palierParId(config, presetId);
  if (!palier || !palier.leviers) {
    throw new Error(`qualite.js : preset "${presetId}" inconnu ou non résolu (auto se résout d'abord)`);
  }
  if (!(config.leviers || []).includes(levier)) {
    throw new Error(`qualite.js : levier "${levier}" non déclaré dans graphismes.json (déclarés : ${(config.leviers || []).join(', ')})`);
  }
  return palier.leviers[levier];
}

// Le preset d'un cran en dessous, ou `null` au plancher. L'ordre est celui du
// catalogue, `auto` exclu (il n'est pas un cran, il se résout) — ajouter un
// preset intermédiaire, c'est donc l'insérer au bon endroit du tableau.
export function presetInferieur(config, presetId) {
  const reels = (config.paliers || []).filter((p) => p.leviers !== undefined).map((p) => p.id);
  const index = reels.indexOf(presetId);
  if (index <= 0) return null;
  return reels[index - 1];
}

// « Faut-il descendre d'un cran ? » — décision PURE (§5.2) : un tampon de
// deltas de frames et les seuils du catalogue, rien d'autre. Aucune horloge :
// la durée de la fenêtre est la SOMME des deltas, donc le test n'a rien à
// simuler. Ce qui ne compte pas (UI ouverte, onglet caché, intro, les
// premières secondes après une entrée en scène) n'arrive simplement jamais
// jusqu'ici : c'est l'appelant qui n'alimente pas le tampon.
//
// `deltasMs` est déjà filtré, dans l'ordre chronologique. Rend toujours la
// même forme, pour que l'appelant sache aussi POURQUOI ça ne descend pas.
export function doitDescendre(deltasMs, { fenetre_ms, part_frames_lentes, seuil_frame_lente_ms }) {
  const total = deltasMs.reduce((s, d) => s + d, 0);
  if (total < fenetre_ms) return { descendre: false, motif: 'fenêtre incomplète', part: 0 };
  const lentes = deltasMs.filter((d) => d > seuil_frame_lente_ms).length;
  const part = deltasMs.length === 0 ? 0 : lentes / deltasMs.length;
  return {
    descendre: part > part_frames_lentes,
    motif: part > part_frames_lentes ? 'trop de frames lentes' : 'assez fluide',
    part,
  };
}

// La clé de texte d'un palier — jamais un nom composé en code, jamais un id
// affiché tel quel. `auto` affiche le preset qu'il a résolu (§5 : la carte dit
// « Auto (Bas) », jamais « Auto » seul), d'où deux clés rendues et non une :
// l'appelant les assemble avec son gabarit de locale.
export function clesEtat(config, choix, presetResolu) {
  const duChoix = palierParId(config, choix === undefined || choix === null ? config.defaut : choix);
  const duResolu = palierParId(config, presetResolu);
  return {
    choix: duChoix ? duChoix.cle_etat : null,
    resolu: duResolu ? duResolu.cle_etat : null,
  };
}

// Le contrat de non-régression du palier B, énoncé une fois ici plutôt que
// répété dans chaque système : **le preset neutre ne change rien**. Rend la
// liste des leviers qui s'en écartent — vide = « l'état actuel », au sens
// strict. `main.js` n'a pas à l'appeler (le schéma ne peut pas le vérifier :
// il ne sait pas lequel des paliers est censé être neutre) ; c'est le test du
// palier B qui s'en sert, et il restera vrai le jour où un levier s'ajoutera.
export function leviersNonNeutres(config, presetId) {
  const neutre = typeof config.valeur_neutre === 'number' ? config.valeur_neutre : VALEUR_NEUTRE_DEFAUT;
  return (config.leviers || []).filter((levier) => valeurLevier(config, presetId, levier) !== neutre);
}

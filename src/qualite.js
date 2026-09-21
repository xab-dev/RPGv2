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

// La clé de texte que la carte de Paramètres affiche, et UNE seule — jamais
// deux clés qu'un gabarit assemblerait en code (§6 : « un lecteur d'état rend
// une CLÉ de texte, jamais un texte composé »).
//
// Le cas qui impose cette forme est Auto : la carte doit dire « Auto (Bas) »
// et jamais « Auto » seul (§5), or « Auto (…) » composé ici figerait l'ordre
// des mots et les parenthèses dans du code, pour toutes les langues. Chaque
// palier réel porte donc DEUX clés en données — `cle_etat` quand le joueur
// l'a choisi, `cle_etat_auto` quand Auto l'a résolu. Ajouter un preset reste
// une entrée de catalogue et deux lignes de locales par langue.
export function cleEtatCarte(config, choix, presetResolu) {
  const effectif = choix === undefined || choix === null ? config.defaut : choix;
  if (effectif === config.defaut) {
    const resolu = palierParId(config, presetResolu);
    return resolu ? resolu.cle_etat_auto : null;
  }
  const choisi = palierParId(config, effectif);
  return choisi ? choisi.cle_etat : null;
}

// Le choix suivant dans le cycle de la carte : `auto → bas → moyen → haut →
// auto`. L'ordre est celui du CATALOGUE, `auto` compris cette fois (il est un
// choix du joueur, même s'il n'est pas un palier) — insérer un preset au bon
// endroit du tableau suffit à l'ajouter au cycle, sans une ligne de code.
//
// Un choix inconnu (sauvegarde d'une version future, ou faute de frappe)
// renvoie au premier du cycle plutôt que de bloquer la carte : ici, à la
// différence de `resoudrePreset`, il n'y a rien à taire — le joueur appuie,
// et il obtient un réglage valide qu'il voit aussitôt.
export function presetSuivant(config, choix) {
  const cycle = (config.paliers || []).map((p) => p.id);
  if (cycle.length === 0) return null;
  const index = cycle.indexOf(choix === undefined || choix === null ? config.defaut : choix);
  return cycle[(index + 1) % cycle.length];
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

// Le levier `particules` appliqué à la configuration d'un effet, UNE fois, au
// démarrage. Rend une configuration neuve : le catalogue n'est jamais muté, et
// le système de particules reçoit un nombre — il ne saura jamais qu'un preset
// existe.
//
// Deux règles, pas une de plus :
//   — un effet `information` n'est JAMAIS touché (§4.2 : Bas retire du
//     cosmétique, jamais ce qui dit quelque chose au joueur) ;
//   — toute quantité de particules déclarée par un effet cosmétique est
//     multipliée. Les champs sont listés ici parce qu'un effet n'a pas
//     toujours le même mot pour « combien » (une traînée a une réserve, une
//     orbite a un nombre d'étincelles) ; un champ absent du catalogue ET des
//     défauts reste absent.
//
// À zéro, la quantité tombe à zéro, et c'est tout : une réserve vide n'émet
// rien et ne dessine rien, un compte d'étincelles nul n'en dessine aucune.
// « Le système n'émet pas et ne dessine pas » est donc une CONSÉQUENCE, pas
// une branche de plus à maintenir.
//
// `defauts` porte la valeur qu'un système utilise quand son effet ne déclare
// rien (la réserve de 8 de `poussiere.js`) : sans elle, un effet sans
// `capacite` resterait à son défaut et continuerait d'émettre en Bas. Le
// défaut reste la propriété du système — il est passé, jamais recopié ici.
const CHAMPS_QUANTITE_PARTICULES = ['capacite', 'nb_particules'];

export function appliquerParticules(effet, multiplicateur, defauts = {}) {
  if (!effet || effet.role !== 'cosmetique') return effet;
  const sortie = { ...effet };
  for (const champ of CHAMPS_QUANTITE_PARTICULES) {
    const base = effet[champ] !== undefined ? effet[champ] : defauts[champ];
    if (base === undefined) continue;
    sortie[champ] = Math.max(0, Math.round(base * multiplicateur));
  }
  return sortie;
}

// `?qualite=bas|moyen|haut` — outil de DEBUG, même contrat que `?echelle`
// (`debug_perf.js#lireEchelleForcee`) : une valeur invalide est rendue avec
// son avertissement et le réglage du joueur est conservé, JAMAIS un repli
// silencieux sur une valeur plausible. `auto` n'est pas acceptable ici : on
// force un palier réel, or `auto` n'en est pas un — il se résout.
export function lirePresetForce(search, config) {
  if (!search) return { preset: null, avertissement: null };
  const brut = new URLSearchParams(search).get('qualite');
  if (brut === null) return { preset: null, avertissement: null };
  const reels = (config.paliers || []).filter((p) => p.leviers !== undefined).map((p) => p.id);
  if (!reels.includes(brut)) {
    return {
      preset: null,
      avertissement: `?qualite=${brut} ignoré : attendu ${reels.join(', ')}. Réglage du joueur conservé.`,
    };
  }
  return { preset: brut, avertissement: null };
}

// Le levier `grain_sol` appliqué au visuel de grain d'une tuile. Rend un
// visuel neuf dont on ne garde que la PREMIÈRE fraction des primitives, ou
// `null` quand il n'en reste aucune — l'appelant n'inscrit alors pas la tuile
// dans sa table, et le rendu ne lui coûte plus rien du tout (§4.3 : « 0 = le
// système ne dessine pas »).
//
// Convention, écrite aussi dans le schéma des tuiles : **les primitives d'un
// visuel de grain sont rangées par importance décroissante**. Couper par la
// fin n'est donc pas arbitraire, c'est la règle — et c'est ce qui permet à
// `grain_sol: 0.2` de rendre « trois brins au lieu de quatorze » sans qu'un
// second catalogue de grain léger ait à exister.
//
// Deux choses que cette fonction ne fait pas, volontairement : elle ne touche
// pas la couleur de base de la tuile (le sol reste peint, il perd son grain —
// jamais sa surface), et elle ignore tout des tuiles solides. Une silhouette
// d'arbre ou de rocher EST le monde, elle ne s'allège pas (§4.3) ; c'est
// l'appelant qui ne l'appelle pas pour elles, parce que c'est lui qui sait ce
// qui est solide.
//
// Limite connue, à garder en tête si Xav retient un palier intermédiaire
// (`Q-55`) : un grain CONTINU d'une cellule à la suivante — le parquet, dont
// les lames doivent être régulières (`D-105`) — supporte 0 et 1, mais une
// fraction entre les deux y laisserait la moitié des lames. Rien ne l'interdit
// aujourd'hui parce qu'aucun preset ne le demande.
export function appliquerGrainSol(visuel, fraction) {
  if (!visuel || !Array.isArray(visuel.primitives)) return visuel;
  if (fraction >= 1) return visuel;
  const total = visuel.primitives.length;
  const gardees = Math.max(0, Math.min(total, Math.round(total * fraction)));
  if (gardees === 0) return null;
  return { ...visuel, primitives: visuel.primitives.slice(0, gardees) };
}

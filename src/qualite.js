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

// Le tampon circulaire pré-alloué et la définition d'une « frame lente »
// viennent de l'instrument de mesure (`debug_perf.js`), et ne sont pas
// redéfinis ici : Auto et le relevé `?debug=fps` doivent parler de la MÊME
// chose, sans quoi Xav lirait « 0/600 frames > 20 ms » sur un jeu qu'Auto
// vient de juger trop lent. Les deux modules restent purs.
import {
  creerTamponCirculaire, ajouterAuTampon, viderTampon, SEUIL_FRAME_LENTE_MS,
} from './debug_perf.js';

// La frame la plus courte qu'on accepte de compter, pour dimensionner le
// tampon de la fenêtre. 4 ms = 240 Hz, au-delà de tout écran qu'on vise.
// Pourquoi ce calcul plutôt que les 600 cases de `debug_perf.js` : 600 frames
// ne font 10 s qu'à 60 fps PILE. À 62 fps — un Chrome sans fenêtre, un écran
// à 120 Hz — le tampon plein ne totaliserait jamais les 10 s demandées, et
// Auto n'évaluerait plus rien. L'oubli serait sans conséquence (une machine
// fluide ne descend pas de toute façon), donc invisible, donc à écrire
// maintenant plutôt qu'à découvrir le jour où la fenêtre changera de durée.
const DUREE_FRAME_MIN_MS = 4;

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
export function doitDescendre(deltasMs, seuils) {
  return doitDescendreAgrege({
    totalMs: deltasMs.reduce((s, d) => s + d, 0),
    framesLentes: deltasMs.filter((d) => d > seuils.seuil_frame_lente_ms).length,
    framesTotales: deltasMs.length,
  }, seuils);
}

// LA décision, énoncée une seule fois — sur des agrégats, pas sur la liste.
// `doitDescendre` ci-dessus n'est que la même chose pour qui tient le tampon
// en main (les tests, un futur outil d'analyse) ; en jeu, c'est cette
// forme-ci qui sert, parce que relire 600 deltas à chaque frame pour en
// refaire la somme allouerait un tableau par frame — exactement ce que le
// tampon circulaire pré-alloué de `debug_perf.js` existe pour éviter.
// Deux appelants, une seule règle : c'est la leçon de `D-71`/`D-72`.
export function doitDescendreAgrege({ totalMs, framesLentes, framesTotales }, { fenetre_ms, part_frames_lentes }) {
  if (totalMs < fenetre_ms) return { descendre: false, motif: 'fenêtre incomplète', part: 0 };
  const part = framesTotales === 0 ? 0 : framesLentes / framesTotales;
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

//
// `D-116` — au-dessus de 1, multiplier la RÉSERVE ne suffit pas : une réserve
// qui n'était pas pleine ne dessine rien de plus quand on la double (Haut à
// `particules: 2` était pixel pour pixel Moyen, capture à l'appui). Ce qui se
// voit, c'est une traînée plus DENSE et plus LONGUE. Au-delà de 1, donc :
//   — l'intervalle d'émission est divisé par le multiplicateur (m fois plus de
//     bouffées au pixel parcouru) ;
//   — la durée de vie est multipliée par √m (la traînée s'étire sans devenir
//     une comète) ;
//   — la réserve suit les deux (× m × √m), sinon elle se viderait avant la fin
//     de la traînée et on retrouverait la grappe clignotante de `D-108`.
// À 1 ou en dessous, rien de cela : Moyen reste le catalogue au champ près, et
// Bas s'éteint par sa réserve nulle comme avant.
const CHAMPS_QUANTITE_PARTICULES = ['capacite', 'nb_particules'];

export function appliquerParticules(effet, multiplicateur, defauts = {}) {
  if (!effet || effet.role !== 'cosmetique') return effet;
  const sortie = { ...effet };
  const densifier = multiplicateur > 1 && typeof effet.intervalle_px === 'number';
  const facteurDuree = densifier ? Math.sqrt(multiplicateur) : 1;
  for (const champ of CHAMPS_QUANTITE_PARTICULES) {
    const base = effet[champ] !== undefined ? effet[champ] : defauts[champ];
    if (base === undefined) continue;
    const facteur = champ === 'capacite' ? multiplicateur * facteurDuree : multiplicateur;
    sortie[champ] = Math.max(0, Math.round(base * facteur));
  }
  if (densifier) {
    sortie.intervalle_px = effet.intervalle_px / multiplicateur;
    if (typeof effet.duree_ms === 'number') sortie.duree_ms = Math.round(effet.duree_ms * facteurDuree);
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

// L'état d'Auto pour UNE session de jeu (§5.2 de la spec) : la fenêtre
// glissante des frames qui comptent, et la mémoire de ce qui a déjà été fait.
// Aucune horloge, aucun DOM, aucun accès au catalogue au-delà de ce qu'on lui
// passe — la durée de la fenêtre est la SOMME des deltas, donc un test n'a
// rien à simuler.
//
// Ce que ce module ne décide PAS, et c'est volontaire : quelles frames
// comptent. « Ne comptent pas : UI ouverte, onglet caché, cinématique d'intro,
// les 5 s qui suivent une entrée en scène » sont des faits que seul
// l'orchestrateur connaît ; ici, une frame qui arrive est une frame qui
// compte. C'est aussi ce qui rend la règle testable sans monter un jeu entier.
//
// Les compteurs sont tenus À L'INSERTION (somme courante, nombre de frames
// lentes courant), en retirant ce que le tampon plein évince : zéro allocation
// par frame, et la décision reste `doitDescendreAgrege`, la même que celle des
// tests.
export function creerDescenteAuto(config, seuilFrameLenteMs = SEUIL_FRAME_LENTE_MS) {
  const seuils = { ...config.auto, seuil_frame_lente_ms: seuilFrameLenteMs };
  const tampon = creerTamponCirculaire(Math.ceil(seuils.fenetre_ms / DUREE_FRAME_MIN_MS));
  let sommeMs = 0;
  let framesLentes = 0;
  // « La descente est dite UNE fois » : le message est le même à chaque cran,
  // le répéter serait du bruit. Session seulement — rien n'est persisté, parce
  // qu'un réglage d'appareil n'a rien à faire dans la sauvegarde (`D-111`).
  // « Au plus une descente par niveau », lui, est tenu par construction :
  // chaque descente change de niveau et rien ne remonte jamais, donc aucun
  // niveau ne se présente deux fois.
  let annonceFaite = false;

  function vider() {
    viderTampon(tampon);
    sommeMs = 0;
    framesLentes = 0;
  }

  return {
    // Une frame qui compte. Rend `null` tant qu'il n'y a rien à faire, ou la
    // descente à appliquer : { preset, annoncer, part }. L'appelant n'a aucune
    // règle à réécrire, seulement à obéir.
    observer(deltaMs, presetActuel) {
      if (tampon.compte === tampon.capacite) {
        const sortant = tampon.valeurs[tampon.curseur];
        sommeMs -= sortant;
        if (sortant > seuils.seuil_frame_lente_ms) framesLentes -= 1;
      }
      ajouterAuTampon(tampon, deltaMs);
      sommeMs += deltaMs;
      if (deltaMs > seuils.seuil_frame_lente_ms) framesLentes += 1;

      const verdict = doitDescendreAgrege(
        { totalMs: sommeMs, framesLentes, framesTotales: tampon.compte }, seuils,
      );
      if (!verdict.descendre) return null;

      // La fenêtre repart de zéro DANS LES DEUX CAS — y compris au plancher,
      // où il n'y a plus rien à descendre. Sans ça, un Bas qui rame ferait
      // reverdir le verdict à chaque frame et brûlerait un calcul pour rien.
      vider();
      const inferieur = presetInferieur(config, presetActuel);
      if (inferieur === null) return null;
      const annoncer = !annonceFaite;
      annonceFaite = true;
      return { preset: inferieur, annoncer, part: verdict.part };
    },
    // Une frame qui ne compte pas n'a rien à faire ici : l'appelant n'appelle
    // simplement pas `observer`. Cette méthode-ci existe pour le seul cas où
    // la fenêtre doit être JETÉE — un changement de preset, quelle qu'en soit
    // la cause : les frames d'avant mesuraient un autre jeu.
    reinitialiserFenetre: vider,
  };
}

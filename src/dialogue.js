// File de lignes de dialogue + avancement (§3.7). Pur : aucun DOM ici, le
// rendu vit dans ui/dialogue_box.js. Un dialogue est un écran d'UI comme un
// autre — même principe de priorité que ui/menu.js (une UI ouverte reçoit
// les verbes, le gameplay reçoit etatNeutre() au point unique de main.js),
// mais sans navigation par liste : avancer/fermer suffisent, d'où un
// contrôleur dédié plutôt que creerControleurMenu() (§6).
//
// Anti-spam (03_grotte-polish §3.2) : ATTACK sert à la fois à frapper et à
// confirmer, donc spammer ATTACK en combat ferme des dialogues sans les avoir
// lus (ex. dlg_grotte_eclats à la mort du monstre). Deux mécanismes cumulés
// ICI (le 3ᵉ, la frame d'ouverture consommée, vit au point de décision unique
// de main.js#maj() — pas ici, cf. journal) : machine à écrire (un appui
// pendant l'affichage COMPLETE la ligne, ne l'avance jamais) puis verrou
// d'armement (une ligne complète ne devient avançable qu'après un délai).

// §2.2, provisoires, un seul endroit chacune.
export const DELAI_ARMEMENT_DIALOGUE_MS = 350;
export const MACHINE_ECRIRE_MS_PAR_CARACTERE = 25;

// `D-136` : une réplique trop longue pour la bulle se coupe en LIGNES au mot
// près, puis en FENÊTRES de `lignesParFenetre` lignes — une fenêtre de plus
// s'avance comme une réplique de plus (décision de Xav, 23/09 : « si les
// dialogues se prolongent, on ouvre une deuxième fenêtre »).
//
// La mesure est INJECTÉE, jamais calculée ici : `sans-serif` n'a pas la même
// largeur sous Windows, Android et iOS, donc seul le navigateur du joueur sait
// où couper — un découpage écrit d'avance dans `dialogues.json` serait juste
// sur un appareil et faux sur les autres. Ce module reste pur et testable avec
// une mesure factice.
//
// Rend des chaînes où les lignes d'une fenêtre sont jointes par `\n` : la
// machine à écrire tape la fenêtre ENTIÈRE, découpée une fois pour toutes, donc
// un mot ne change jamais de ligne en cours de frappe (le rendu coupe sur `\n`
// ce qui est déjà affiché).
//
// Une ponctuation détachée (« tu ? », « ça ! », guillemet fermant) reste collée
// au mot qui la précède : les textes français portent une espace ordinaire,
// pas insécable, avant `?`/`!`/`:`/`;`, et un point d'interrogation seul en
// début de ligne se lit comme une faute. Un mot plus large que la bulle à lui
// seul reste entier sur sa ligne (il déborde) : le couper au caractère
// rendrait le texte illisible pour un cas qu'aucune réplique n'a.
const PONCTUATION_ACCROCHEE = /^[?!:;»)\]…]+$/;

export function decouperEnFenetres(texte, mesurer, largeurMax, lignesParFenetre) {
  const lignes = [];
  for (const paragraphe of String(texte).split('\n')) {
    const jetons = [];
    for (const mot of paragraphe.split(' ').filter((m) => m.length > 0)) {
      if (jetons.length > 0 && PONCTUATION_ACCROCHEE.test(mot)) jetons[jetons.length - 1] += ` ${mot}`;
      else jetons.push(mot);
    }
    let courante = '';
    for (const jeton of jetons) {
      const essai = courante ? `${courante} ${jeton}` : jeton;
      if (courante && mesurer(essai) > largeurMax) {
        lignes.push(courante);
        courante = jeton;
      } else {
        courante = essai;
      }
    }
    lignes.push(courante);
  }
  const fenetres = [];
  for (let i = 0; i < lignes.length; i += lignesParFenetre) {
    fenetres.push(lignes.slice(i, i + lignesParFenetre).join('\n'));
  }
  return fenetres;
}

// --- `specs/11_dialogues-consequences.md` : la conversation ------------------
//
// Trois objets, un seul moteur (§2) : une RÉPLIQUE est un nœud sans option, un
// CHOIX un nœud à options, une CONVERSATION un graphe de nœuds. Le moteur ne
// connaît que des nœuds. Tout ce qui suit est PUR : un état entre, un état
// sort, rien n'est écrit ailleurs — `main.js` reçoit le résultat à la clôture
// et l'applique, seul appelant (§4.1).
//
// Au palier A, seules les entrées de `dialogues.json` qui portent `noeuds`
// passent par ici ; les autres gardent leurs `lignes` jusqu'à la migration du
// palier B.

// §3 : jamais plus de 4 options — la bulle ne défile pas (règle tactile : ce
// qui s'ouvre au doigt se ferme au doigt, sans défilement). Pas moins de 2 :
// une seule option n'est pas un choix, c'est une réplique.
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;

// Seuil de poussée du stick pour déplacer la sélection, *provisoire*. Même
// valeur que celui des menus, mais PAS le même seuil : la bulle n'est pas un
// menu et n'en réutilise aucun composant (spec §0, « on ne touche plus aux
// menus ») — si l'un bouge un jour, l'autre n'a pas à suivre.
export const SEUIL_POUSSEE_DIALOGUE = 0.5;

function noeudDe(dialogue, id) {
  return dialogue.noeuds[id];
}

function optionsDe(noeud) {
  return Array.isArray(noeud && noeud.options) ? noeud.options : [];
}

// L'option `defaut` est présélectionnée : « avancer » sans avoir bougé la
// sélection la prend — c'est l'option de qui spamme A (§3). Un nœud sans
// option n'a pas de sélection (`null`).
export function indexOptionDefaut(noeud) {
  const options = optionsDe(noeud);
  if (options.length === 0) return null;
  const i = options.findIndex((o) => o.defaut === true);
  return i >= 0 ? i : 0;
}

export function ouvrirConversation(dialogue) {
  const noeud = dialogue.entree;
  return {
    dialogueId: dialogue.id,
    noeud,
    selection: indexOptionDefaut(noeudDe(dialogue, noeud)),
    spamCompte: 0,
    // « Lecture complète » = zéro appui non armé sur TOUT le dialogue
    // (`[OUVERT]` 1, `Q-98`) : aucune estimation de temps de lecture.
    lectureIntacte: true,
    // Les options retenues, dans l'ordre : `resultat` en tire les conséquences.
    choix: [],
    termine: false,
  };
}

export function optionsDuNoeud(dialogue, etat) {
  return optionsDe(noeudDe(dialogue, etat.noeud));
}

// `direction` : -1 (haut) ou +1 (bas). Bornée, sans boucle : sur la première
// ou la dernière option, un cran de plus ne fait rien (même règle que les
// listes du jeu, pour que la main n'ait pas deux habitudes).
export function deplacerSelection(etat, dialogue, direction) {
  const options = optionsDuNoeud(dialogue, etat);
  if (options.length === 0 || etat.termine) return etat;
  const selection = Math.max(0, Math.min(options.length - 1, etat.selection + direction));
  return selection === etat.selection ? etat : { ...etat, selection };
}

// Le doigt désigne une option par son rang : même résultat qu'y amener la
// sélection au stick (parité verbe / tap, patron `SD_parite-clic-verbe`). Un
// rang hors des options ne change rien.
export function selectionnerOption(etat, dialogue, index) {
  const options = optionsDuNoeud(dialogue, etat);
  if (etat.termine || !Number.isInteger(index) || index < 0 || index >= options.length) return etat;
  return index === etat.selection ? etat : { ...etat, selection: index };
}

// `verbeAvancer` : le joueur a appuyé (ATTACK, INTERACT, ou le doigt sur la
// bulle). `arme` : la machine à écrire a fini ET le délai d'armement est écoulé
// (état existant de la bulle, jamais recalculé ici).
//
// Un appui non armé est COMPTÉ, pas exaucé (§4.1, §4.2) : il ne complète plus
// la ligne, il ne saute rien. C'est ce qui était jusqu'ici ignoré en silence,
// et c'est la moitié de la mesure.
export function avancerConversation(etat, dialogue, verbeAvancer, arme) {
  if (!verbeAvancer || etat.termine) return etat;
  if (!arme) return { ...etat, spamCompte: etat.spamCompte + 1, lectureIntacte: false };
  const noeud = noeudDe(dialogue, etat.noeud);
  const options = optionsDe(noeud);
  let suite;
  let choix = etat.choix;
  if (options.length > 0) {
    choix = [...choix, { noeud: etat.noeud, option: etat.selection }];
    suite = options[etat.selection].suite ?? null;
  } else {
    // Une réplique peut continuer vers un autre nœud sans rien demander : un
    // texte trop long pour un nœud, ou deux locuteurs qui se répondent.
    suite = noeud.suite ?? null;
  }
  if (suite === null) return { ...etat, choix, termine: true };
  return { ...etat, choix, noeud: suite, selection: indexOptionDefaut(noeudDe(dialogue, suite)) };
}

// Les conséquences d'une conversation close, DANS L'ORDRE (§4.1) : celles des
// options choisies (dans l'ordre des choix), puis le poids du spam, puis la
// lecture complète. Déterministe : les mêmes entrées rendent la même liste.
//
// `poids` : `alignement.json#poids_defaut`, lu par l'appelant — ce module ne
// charge rien. Une conséquence nulle n'est pas émise : `modifierAlignement(0)`
// ne dirait rien au journal qu'un silence ne dise mieux.
export function resultatConversation(etat, dialogue, poids) {
  const consequences = [];
  for (const { noeud, option } of etat.choix) {
    const o = optionsDe(noeudDe(dialogue, noeud))[option];
    if (typeof o.alignement === 'number' && o.alignement !== 0) {
      consequences.push({ type: 'alignement', delta: o.alignement, source: 'option' });
    }
    for (const flag of o.flags || []) consequences.push({ type: 'flag', id: flag });
  }
  if (etat.spamCompte > 0) {
    // Le plafond borne la VALEUR ABSOLUE, quel que soit le signe choisi en
    // données : un poids de spam positif un jour n'inverserait pas le plafond.
    const brut = poids.spam_par_occurrence * etat.spamCompte;
    const plafond = Math.abs(poids.spam_plafond_par_dialogue);
    const delta = Math.sign(brut) * Math.min(Math.abs(brut), plafond);
    if (delta !== 0) consequences.push({ type: 'alignement', delta, source: 'spam' });
  }
  if (etat.lectureIntacte && poids.lecture_complete !== 0) {
    consequences.push({ type: 'alignement', delta: poids.lecture_complete, source: 'lecture' });
  }
  return { dialogueId: etat.dialogueId, consequences, vu: true };
}

// La FORME d'un graphe, vérifiée au boot par `schemas.js` (§3) : `entree` et
// toute `suite` désignent un nœud existant, le graphe est ACYCLIQUE (un
// dialogue qui boucle ne se termine jamais : le jeu resterait gelé sous lui),
// et tout nœud est atteignable depuis `entree` (un nœud orphelin est un texte
// écrit pour personne — une faute de saisie, presque toujours).
export function erreursGrapheConversation(entry, path) {
  const erreurs = [];
  const noeuds = entry.noeuds;
  if (!noeuds || typeof noeuds !== 'object' || Array.isArray(noeuds) || Object.keys(noeuds).length === 0) {
    return [`${path} > noeuds doit être un objet non vide`];
  }
  if (!Object.prototype.hasOwnProperty.call(noeuds, entry.entree)) {
    return [`${path} > entree "${entry.entree}" n'est pas un nœud de ce dialogue`];
  }
  const suites = (id) => {
    const n = noeuds[id];
    const options = optionsDe(n);
    const brutes = options.length > 0 ? options.map((o) => o.suite) : [n.suite];
    return brutes.filter((s) => s !== undefined && s !== null);
  };
  for (const id of Object.keys(noeuds)) {
    for (const s of suites(id)) {
      if (!Object.prototype.hasOwnProperty.call(noeuds, s)) {
        erreurs.push(`${path} > noeuds.${id} > suite "${s}" n'est pas un nœud de ce dialogue`);
      }
    }
  }
  if (erreurs.length > 0) return erreurs;

  // Parcours en profondeur depuis l'entrée : trois couleurs, un nœud « en
  // cours » revu est un cycle.
  const etat = {};
  const cycle = [];
  function visiter(id) {
    if (etat[id] === 'fini') return;
    if (etat[id] === 'en_cours') {
      cycle.push(id);
      return;
    }
    etat[id] = 'en_cours';
    for (const s of suites(id)) visiter(s);
    etat[id] = 'fini';
  }
  visiter(entry.entree);
  if (cycle.length > 0) {
    erreurs.push(`${path} > le graphe boucle (retour sur "${cycle[0]}") : un dialogue doit toujours se terminer`);
  }
  for (const id of Object.keys(noeuds)) {
    if (!etat[id]) erreurs.push(`${path} > noeuds.${id} inatteignable depuis l'entrée "${entry.entree}"`);
  }
  return erreurs;
}

// Toutes les clés de texte d'un catalogue de dialogues, avec leur chemin :
// nœuds, options, et les `lignes` d'avant la migration. Le registre ne voit
// jamais les dictionnaires, donc le contrôle « présente en FR ET en EN » vit
// au démarrage (`main.js`), comme celui des menus.
export function erreursTextesDialogues(dialogues, dictionnaires) {
  const cles = [];
  for (const d of dialogues || []) {
    (d.lignes || []).forEach((l, i) => cles.push({ cle: l.text_key, chemin: `dialogues > ${d.id} > lignes[${i}]` }));
    for (const [id, n] of Object.entries(d.noeuds || {})) {
      cles.push({ cle: n.text_key, chemin: `dialogues > ${d.id} > noeuds.${id}` });
      optionsDe(n).forEach((o, i) => cles.push({ cle: o.text_key, chemin: `dialogues > ${d.id} > noeuds.${id} > options[${i}]` }));
    }
  }
  const erreurs = [];
  for (const { cle, chemin } of cles) {
    for (const [langue, dictionnaire] of Object.entries(dictionnaires || {})) {
      if (typeof cle !== 'string' || dictionnaire[cle] === undefined) {
        erreurs.push(`${chemin} > clé "${cle}" absente de ${langue}.json`);
      }
    }
  }
  return erreurs;
}

// `paginer(texte) -> string[]` : absent = une fenêtre par réplique, telle
// quelle (tests headless, et tout appelant qui n'a pas de quoi mesurer).
export function creerDialogue({ paginer = null } = {}) {
  let lignes = [];
  let index = 0;
  let ouvert = false;
  let onFermeture = null;
  let charsAffiches = 0;
  let msEcoulesLigne = 0;
  // Spec 11 : `null` hors conversation (les `lignes` d'avant gardent leur
  // chemin, intact, jusqu'au palier B). Sinon : les données du dialogue,
  // l'état PUR de la conversation, et de quoi résoudre un nœud en texte.
  let conversation = null;
  // Front montant du stick sur l'axe vertical : une poussée, un cran — pas de
  // répétition au maintien (§4.2).
  let pousseePrecedente = 0;
  // null = ligne pas encore complètement affichée ; sinon ms écoulées depuis
  // qu'elle l'est (compare à DELAI_ARMEMENT_DIALOGUE_MS pour savoir si elle
  // est "armée", i.e. avançable).
  let msDepuisAffichageComplet = null;

  function texteLigne(i) {
    return lignes[i] ? lignes[i].texte : '';
  }

  function ligneComplete() {
    return charsAffiches >= texteLigne(index).length;
  }

  function estArmee() {
    return msDepuisAffichageComplet !== null && msDepuisAffichageComplet >= DELAI_ARMEMENT_DIALOGUE_MS;
  }

  // Réinitialise la machine à écrire pour la ligne `index` courante.
  function reinitialiserLigne() {
    const texte = texteLigne(index);
    // Edge case §4 : ligne vide ou d'un seul caractère → rien de
    // significatif à animer, on saute directement à "affichée" ; l'armement
    // s'applique quand même (pas de fermeture immédiate pour autant).
    charsAffiches = texte.length <= 1 ? texte.length : 0;
    msEcoulesLigne = 0;
    msDepuisAffichageComplet = ligneComplete() ? 0 : null;
  }

  function fermer() {
    ouvert = false;
    lignes = [];
    index = 0;
    charsAffiches = 0;
    msEcoulesLigne = 0;
    msDepuisAffichageComplet = null;
    // Une conversation fermée de l'extérieur (`reinitialiserPartie`) ne rend
    // AUCUN résultat : seule une conversation menue à son terme a des
    // conséquences. Un dialogue coupé en plein milieu n'a rien jugé.
    conversation = null;
    pousseePrecedente = 0;
    const callback = onFermeture;
    onFermeture = null;
    if (callback) callback();
  }

  function avancer() {
    if (!ouvert || !estArmee()) return;
    index += 1;
    if (index >= lignes.length) fermer();
    else reinitialiserLigne();
  }

  // Le texte d'un nœud, découpé comme une réplique d'avant : même pagination,
  // même machine à écrire, même armement. Les options ne sont que la fin de
  // la dernière fenêtre.
  function chargerNoeud() {
    const resolu = conversation.resoudre(conversation.etat.noeud);
    conversation.options = resolu.options;
    const fenetres = paginer ? paginer(resolu.texte) : [resolu.texte];
    lignes = fenetres.map((texte) => ({ locuteur: resolu.locuteur, texte }));
    index = 0;
    reinitialiserLigne();
  }

  // §4.2 : « on ne peut pas choisir ce qu'on n'a pas lu » — les options
  // n'existent qu'une fois la DERNIÈRE fenêtre du nœud tapée et armée.
  function optionsVisibles() {
    return conversation !== null && index === lignes.length - 1 && estArmee()
      && conversation.options.length > 0;
  }

  // Un appui, d'où qu'il vienne (bouton, touche, doigt sur la bulle) : UN
  // chemin. Non armé : compté, rien d'autre — la ligne continue de s'écrire
  // à son rythme. Armé sur une fenêtre intermédiaire : la fenêtre suivante,
  // sans passer par le graphe (un nœud long reste UN nœud).
  function appuyerConversation() {
    const arme = estArmee();
    if (!arme) {
      conversation.etat = avancerConversation(conversation.etat, conversation.donnees, true, false);
      return;
    }
    if (index < lignes.length - 1) {
      index += 1;
      reinitialiserLigne();
      return;
    }
    conversation.etat = avancerConversation(conversation.etat, conversation.donnees, true, true);
    if (!conversation.etat.termine) {
      chargerNoeud();
      return;
    }
    // Le résultat part AVANT la fermeture : un `onFermer` (ouvrir un écran,
    // enchaîner un autre dialogue) doit trouver les conséquences déjà posées.
    const resultat = resultatConversation(conversation.etat, conversation.donnees, conversation.poids);
    const onResultat = conversation.onResultat;
    if (onResultat) onResultat(resultat);
    fermer();
  }

  // `toucher` : ce que le doigt a désigné cette frame sur la bulle, déjà
  // résolu par l'appelant contre la géométrie dessinée (`hud_layout.js`) —
  // `{ option: i }`, `{ texte: true }` ou `null`. Ce module ne sait pas ce
  // qu'est un écran.
  function traiterInputConversation(etat, toucher) {
    const y = etat.move ? etat.move.y : 0;
    const poussee = y > SEUIL_POUSSEE_DIALOGUE ? 1 : (y < -SEUIL_POUSSEE_DIALOGUE ? -1 : 0);
    const front = poussee !== 0 && pousseePrecedente === 0 ? poussee : 0;
    pousseePrecedente = poussee;

    // Un doigt posé dans la moitié gauche de l'écran prend AUSSI le joystick
    // virtuel (`touch.js`), qui pousse MOVE : la frame où le doigt désigne la
    // bulle, le stick est ignoré. Sans quoi taper la deuxième option la
    // sélectionnerait puis la quitterait d'un cran dans la même frame.
    if (toucher && toucher.option !== undefined) {
      // `[OUVERT]` 2 (`Q-99`) : un tap sélectionne, un second confirme.
      if (optionsVisibles() && conversation.etat.selection === toucher.option) appuyerConversation();
      else if (optionsVisibles()) conversation.etat = selectionnerOption(conversation.etat, conversation.donnees, toucher.option);
      return;
    }
    if (toucher && toucher.texte) {
      appuyerConversation();
      return;
    }
    if (front !== 0 && optionsVisibles()) {
      conversation.etat = deplacerSelection(conversation.etat, conversation.donnees, front);
    }
    if (etat.attack.pressed || etat.interact.pressed) appuyerConversation();
  }

  return {
    // Spec 11 : ouvrir un dialogue à NŒUDS. `resoudre(noeudId)` rend
    // `{ locuteur, texte, options: [texte] }` déjà traduits (l'appelant tient
    // i18n) ; `poids` est `alignement.json#poids_defaut` ; `onResultat` reçoit
    // les conséquences ordonnées, une fois, à la fin naturelle.
    demarrerConversation(donnees, { resoudre, poids, onResultat = null, onFermer = null }) {
      conversation = { donnees, etat: ouvrirConversation(donnees), resoudre, poids, onResultat, options: [] };
      ouvert = true;
      onFermeture = onFermer;
      pousseePrecedente = 0;
      chargerNoeud();
    },
    // L'état pur de la conversation en cours (tests, relevé) — `null` hors
    // conversation. Une copie : personne ne le modifie de l'extérieur.
    etatConversation: () => (conversation ? { ...conversation.etat } : null),
    ouvrir(nouvellesLignes, { onFermer } = {}) {
      // Une réplique devient autant d'entrées que de fenêtres, même locuteur :
      // tout le reste (machine à écrire, armement, avancer) ne voit que des
      // répliques, et n'a donc rien à apprendre.
      lignes = paginer
        ? nouvellesLignes.flatMap((l) => paginer(l.texte).map((texte) => ({ ...l, texte })))
        : nouvellesLignes;
      index = 0;
      ouvert = lignes.length > 0;
      onFermeture = onFermer || null;
      conversation = null;
      reinitialiserLigne();
    },
    estOuvert: () => ouvert,
    ligneCourante: () => {
      if (!ouvert) return null;
      const ligne = lignes[index];
      // `arme` : dialogue_box.js dessine le marqueur ▼ (chemin, jamais du
      // texte) uniquement quand c'est vrai — jamais avant.
      // `options` : `null` tant qu'elles ne sont pas visibles (et toujours
      // hors conversation) — la bulle et la géométrie tactile lisent la MÊME
      // réponse, donc une option qu'on ne voit pas ne se touche pas.
      const options = optionsVisibles() ? conversation.options : null;
      return {
        locuteur: ligne.locuteur,
        texte: ligne.texte.slice(0, charsAffiches),
        arme: estArmee(),
        options,
        selection: options ? conversation.etat.selection : null,
      };
    },
    // Avance le temps interne (machine à écrire, puis armement une fois la
    // ligne complète) — même delta plafonné que le jeu (§3.2), appelé une
    // fois par frame tant que le dialogue est ouvert, indépendamment des
    // appuis reçus cette frame-là.
    maj(deltaMs) {
      if (!ouvert) return;
      if (!ligneComplete()) {
        msEcoulesLigne += deltaMs;
        const texte = texteLigne(index);
        charsAffiches = Math.min(texte.length, Math.floor(msEcoulesLigne / MACHINE_ECRIRE_MS_PAR_CARACTERE));
        if (ligneComplete()) msDepuisAffichageComplet = 0;
      } else {
        msDepuisAffichageComplet += deltaMs;
      }
    },
    // ATTACK/INTERACT (front montant) : complète la ligne si elle est encore
    // en cours d'affichage, sinon avance (si armée) — jamais les deux à la
    // fois sur un seul appui.
    //
    // En conversation, le chemin est celui de la spec 11 (un appui non armé
    // est compté, jamais exaucé) ; `toucher` n'a de sens que là.
    traiterInput(etat, toucher = null) {
      if (!ouvert) return;
      if (conversation) {
        traiterInputConversation(etat, toucher);
        return;
      }
      if (!(etat.attack.pressed || etat.interact.pressed)) return;
      if (!ligneComplete()) {
        charsAffiches = texteLigne(index).length;
        msDepuisAffichageComplet = 0;
      } else {
        avancer();
      }
    },
    avancer,
    fermer,
  };
}

// Résout les { locuteur, text_key } d'une entrée dialogues.json vers des
// lignes affichables : "follet" est résolu vers le compagnon actif ici,
// jamais codé en dur dans dialogues.json (qui doit rester valable quel que
// soit le follet choisi).
export function resoudreLignes(dialogueId, registre, i18n, companionId) {
  const donnees = registre.obtenir('dialogues', dialogueId);
  if (!donnees) throw new Error(`dialogue "${dialogueId}" introuvable dans dialogues.json`);

  return donnees.lignes.map((ligne) => {
    let locuteur = ligne.locuteur;
    if (ligne.locuteur === 'follet' && companionId) {
      const companion = registre.obtenir('companions', companionId);
      locuteur = i18n.t(companion.label_key);
    }
    return { locuteur, texte: i18n.t(ligne.text_key) };
  });
}

// Spec 11 : le pendant de `resoudreLignes` pour un nœud — même résolution du
// locuteur (« follet » devient le compagnon actif, jamais écrit en dur dans
// les données), plus le texte de chaque option.
export function resoudreNoeud(donnees, noeudId, registre, i18n, companionId) {
  const noeud = donnees.noeuds[noeudId];
  let locuteur = noeud.locuteur;
  if (noeud.locuteur === 'follet' && companionId) {
    locuteur = i18n.t(registre.obtenir('companions', companionId).label_key);
  }
  return {
    locuteur,
    texte: i18n.t(noeud.text_key),
    options: optionsDe(noeud).map((o) => i18n.t(o.text_key)),
  };
}

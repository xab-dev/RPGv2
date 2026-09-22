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

// `paginer(texte) -> string[]` : absent = une fenêtre par réplique, telle
// quelle (tests headless, et tout appelant qui n'a pas de quoi mesurer).
export function creerDialogue({ paginer = null } = {}) {
  let lignes = [];
  let index = 0;
  let ouvert = false;
  let onFermeture = null;
  let charsAffiches = 0;
  let msEcoulesLigne = 0;
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

  return {
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
      reinitialiserLigne();
    },
    estOuvert: () => ouvert,
    ligneCourante: () => {
      if (!ouvert) return null;
      const ligne = lignes[index];
      // `arme` : dialogue_box.js dessine le marqueur ▼ (chemin, jamais du
      // texte) uniquement quand c'est vrai — jamais avant.
      return { locuteur: ligne.locuteur, texte: ligne.texte.slice(0, charsAffiches), arme: estArmee() };
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
    traiterInput(etat) {
      if (!ouvert) return;
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

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

export function creerDialogue() {
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
      lignes = nouvellesLignes;
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

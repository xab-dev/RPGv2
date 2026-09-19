// Instrument de mesure des saccades (MT_mesure-saccades_2026-09-19) : ZÉRO
// CORRECTION, seulement des chiffres qui départagent les hypothèses de la
// fiche. Fonctions pures ici (tampon circulaire pré-alloué, agrégats,
// détection de bascule, mise en forme du relevé) — testables sans DOM,
// jamais un accès navigateur. La surcouche visuelle (DOM, presse-papiers,
// branchement sur render.js/main.js) vit dans ui/hud_debug.js, jamais
// exercée en headless (même contrainte de méthode que le reste du rendu).
//
// Activation stricte par `?debug=fps` — `estDebugFpsActif` est la SEULE
// porte d'entrée : tant qu'elle rend faux, ui/hud_debug.js ne crée aucun
// élément DOM et n'appelle aucune des fonctions d'enregistrement ci-dessous
// (§ livrable : "aucun coût, aucun élément créé").

// Frame "lente" (piste 4 du ticket) : 20 ms ~ sous 50 fps, seuil donné par le
// ticket lui-même — un seul endroit, Xav l'ajustera au vu des premiers
// relevés si besoin.
export const SEUIL_FRAME_LENTE_MS = 20;

// ~10 s de relevé à 60 fps (piste 4 : "frames > 20 ms sur 10 s") ; sur un
// plancher mobile à 30 fps, le tampon reste simplement sous-utilisé (jamais
// plein), aucune conséquence sur les agrégats (ils ne lisent que les cases
// réellement écrites, cf. valeursTampon).
export const CAPACITE_TAMPON_10S = 600;

// Fenêtre de mise à jour de l'affichage (§ livrable : "≤ 4 fois/s").
export const INTERVALLE_MAJ_MS = 250;

export function estDebugFpsActif(search) {
  if (!search) return false;
  return new URLSearchParams(search).get('debug') === 'fps';
}

// Tampon circulaire PRÉ-ALLOUÉ (Float64Array de taille fixe) : ajouter une
// valeur n'alloue jamais rien — contrairement à un tableau qui grandirait ou
// serait recopié (`slice`) à chaque frame. Seule `valeursTampon` (lue au
// rythme de l'affichage, jamais par frame) alloue un tableau simple.
export function creerTamponCirculaire(capacite) {
  return { valeurs: new Float64Array(capacite), capacite, curseur: 0, compte: 0 };
}

export function ajouterAuTampon(tampon, valeur) {
  tampon.valeurs[tampon.curseur] = valeur;
  tampon.curseur = (tampon.curseur + 1) % tampon.capacite;
  tampon.compte = Math.min(tampon.compte + 1, tampon.capacite);
  return tampon;
}

// Valeurs dans l'ordre chronologique (plus ancien -> plus récent). Tant que
// le tampon n'a jamais bouclé (compte < capacite), tout part de l'indice 0 ;
// une fois plein, le plus ancien occupé est justement `curseur`.
export function valeursTampon(tampon) {
  const resultat = new Array(tampon.compte);
  const depart = tampon.compte < tampon.capacite ? 0 : tampon.curseur;
  for (let i = 0; i < tampon.compte; i++) {
    resultat[i] = tampon.valeurs[(depart + i) % tampon.capacite];
  }
  return resultat;
}

export function moyenne(valeurs) {
  if (valeurs.length === 0) return 0;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}

export function maximum(valeurs) {
  return valeurs.length === 0 ? 0 : valeurs.reduce((a, b) => Math.max(a, b), -Infinity);
}

// Percentile par rang le plus proche (p entre 0 et 1) — suffisant pour un
// instrument de diagnostic, pas une bibliothèque de statistiques.
export function percentile(valeurs, p) {
  if (valeurs.length === 0) return 0;
  const triees = [...valeurs].sort((a, b) => a - b);
  const indice = Math.min(triees.length - 1, Math.floor(p * triees.length));
  return triees[indice];
}

export function compterAuDessus(valeurs, seuil) {
  return valeurs.reduce((n, v) => n + (v > seuil ? 1 : 0), 0);
}

// Piste 3 (arrondi caméra/héros) : écarts entre valeurs consécutives d'une
// série (ex. position écran du héros d'une frame à l'autre). À vitesse
// constante, ces écarts doivent être constants — un instrument de lecture,
// pas un verdict : c'est à Xav/à un futur ticket de juger le relevé.
export function ecartsSuccessifs(valeurs) {
  const ecarts = new Array(Math.max(0, valeurs.length - 1));
  for (let i = 1; i < valeurs.length; i++) ecarts[i - 1] = valeurs[i] - valeurs[i - 1];
  return ecarts;
}

// Bascules/seconde d'une valeur discrète (piste "périphérique actif") :
// n'enregistre un horodatage QUE sur un changement réel de valeur (jamais à
// chaque frame) ; la fenêtre glissante est purgée à la lecture, jamais un
// tableau qui grandit sans borne.
export function creerCompteurBascules() {
  let derniereValeur;
  let horodatages = [];
  return {
    enregistrer(valeur, tMs) {
      if (derniereValeur !== undefined && valeur !== derniereValeur) horodatages.push(tMs);
      derniereValeur = valeur;
    },
    basculesParSeconde(tMs, fenetreMs = 1000) {
      horodatages = horodatages.filter((t) => tMs - t <= fenetreMs);
      return horodatages.length / (fenetreMs / 1000);
    },
  };
}

// Mise en forme du relevé copié par le bouton "copier" (protocole du ticket :
// "Xav colle les chiffres à Claude"). Pure, prend un objet déjà agrégé —
// aucune connaissance de render.js/main.js ici, ui/hud_debug.js construit cet
// objet à partir des tampons/compteurs ci-dessus.
export function formaterReleve(etat) {
  const lignes = [
    `fps ~ ${etat.fps.toFixed(1)} (delta moyen ${etat.deltaMoyenMs.toFixed(2)} ms, p95 ${etat.deltaP95Ms.toFixed(2)} ms, max ${etat.deltaMaxMs.toFixed(2)} ms)`,
    `frames plafonnées (delta brut > delta appliqué) sur le tampon : ${etat.framesPlafonnees}/${etat.framesTotales}`,
    `maj() moyen ${etat.dureeMajMoyenneMs.toFixed(2)} ms (p95 ${etat.dureeMajP95Ms.toFixed(2)} ms) | dessiner() moyen ${etat.dureeDessinerMoyenneMs.toFixed(2)} ms (p95 ${etat.dureeDessinerP95Ms.toFixed(2)} ms)`,
    `frames > ${SEUIL_FRAME_LENTE_MS}ms sur le tampon : ${etat.framesLentes}/${etat.framesTotales}`,
    etat.recalculsCoucheStatique.nombre > 0
      ? `recalculs calque statique : ${etat.recalculsCoucheStatique.nombre} (moyenne ${etat.recalculsCoucheStatique.dureeMoyenneMs.toFixed(2)} ms, max ${etat.recalculsCoucheStatique.dureeMaxMs.toFixed(2)} ms, dernier il y a ${etat.recalculsCoucheStatique.depuisDernierMs === null ? 'n/a' : etat.recalculsCoucheStatique.depuisDernierMs.toFixed(0) + ' ms'})`
      : 'recalculs calque statique : aucun sur ce tampon',
    `écart position héros (px logiques) X : moy ${etat.ecartHeroX.moyenne.toFixed(3)} min ${etat.ecartHeroX.min.toFixed(3)} max ${etat.ecartHeroX.max.toFixed(3)} | Y : moy ${etat.ecartHeroY.moyenne.toFixed(3)} min ${etat.ecartHeroY.min.toFixed(3)} max ${etat.ecartHeroY.max.toFixed(3)}`,
    `entités dessinées (dernière frame) : monstres ${etat.entites.monstres}, interactifs ${etat.entites.puzzles}, objets au sol ${etat.entites.objetsSol}`,
    `canvas visible : ${etat.ecranPhysique.largeurPhysique}x${etat.ecranPhysique.hauteurPhysique}px physiques (dpr ${etat.ecranPhysique.dpr})`,
    `calque statique : ${etat.coucheStatique ? `${etat.coucheStatique.largeur}x${etat.coucheStatique.hauteur}px` : 'pas encore construit'}`,
    `calque d'obscurité : ${etat.canvasVoile ? `${etat.canvasVoile.largeur}x${etat.canvasVoile.hauteur}px` : 'absent (scène sans obscurité)'}`,
    `périphérique actif : ${etat.peripheriqueActif} (${etat.basculesParSeconde.toFixed(2)} bascule(s)/s)`,
  ];
  return lignes.join('\n');
}

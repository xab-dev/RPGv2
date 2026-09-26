// `D-229` (`Q-51`) : OÙ REGARDE le héros. Jusqu'ici il ne regardait nulle
// part : il avançait de dos vers le nord exactement comme de face vers le sud.
// Depuis la première compétence qui vise (l'Onde, spec 14), le joueur doit
// voir vers qui il tire — Xav, 25/09 : « cette décision devient prioritaire ».
//
// Forme (`Q-167`, tranchée par Xav) : le « tricheur » de `Q-51`, une seule
// silhouette dont des PIÈCES bougent (la capuche se plie, l'œil glisse dans
// son ouverture, et disparaît de dos). Ce module ne sait rien du dessin : il
// dit une DIRECTION ; le visuel déclare en données ce que chaque direction
// fait à ses pièces, et `poses.js` le traduit. Un état d'AFFICHAGE, jamais
// sauvegardé : recharger une partie remet le héros de face, comme le geste
// d'un levier (`bascule.js`). Pur.

// Les huit directions (`D-249`, Xav : « 8 positions »), rangées par angle à
// l'écran, de 45° en 45°, en partant de l'est et en tournant vers le bas
// (l'axe y de l'écran descend). `sud` est la pose initiale.
export const ORIENTATIONS = ['est', 'sud_est', 'sud', 'sud_ouest', 'ouest', 'nord_ouest', 'nord', 'nord_est'];
export const ORIENTATION_INITIALE = 'sud';
const SECTEUR_DEG = 360 / ORIENTATIONS.length;

// Provisoire, non validé en jeu. Un stick tenu à la frontière de deux
// secteurs hésite : sans marge, la pose sauterait de l'un à l'autre à chaque
// frame où l'angle bouge d'un cheveu. On garde la direction courante tant que
// le geste reste à moins d'un demi-secteur (22,5°) PLUS cette marge de son axe.
export const MARGE_BASCULE_DEG = 8;

// L'angle d'un vecteur à l'écran, en degrés, et l'écart entre deux angles.
const angleDe = (dx, dy) => (Math.atan2(dy, dx) * 180) / Math.PI;
const ecartDeg = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// Provisoire, non validé en jeu. Après un tir, le héros regarde sa cible ce
// temps-là, même s'il marche : sans cela, le déplacement de la frame suivante
// le retournerait avant qu'on ait vu vers qui il tirait.
export const DUREE_REGARD_TIR_MS = 400;

// La direction d'un vecteur : le secteur de 45° où tombe son angle. `null`
// pour un vecteur nul : il n'y a rien à regarder.
export function directionDe(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  const secteur = Math.round(angleDe(dx, dy) / SECTEUR_DEG);
  return ORIENTATIONS[((secteur % ORIENTATIONS.length) + ORIENTATIONS.length) % ORIENTATIONS.length];
}

// La direction après un geste de déplacement `(dx, dy)` (le stick, pas le
// chemin après collision : pousser contre un mur tourne quand même le héros
// vers lui). Garde `precedente` si le geste est nul, ou s'il reste près de
// son axe (voir `MARGE_BASCULE_DEG`).
export function orienterDepuisMouvement(precedente, dx, dy) {
  const nouvelle = directionDe(dx, dy);
  if (nouvelle === null) return precedente;
  const iPrecedente = ORIENTATIONS.indexOf(precedente);
  if (iPrecedente >= 0 && ecartDeg(angleDe(dx, dy), iPrecedente * SECTEUR_DEG) <= SECTEUR_DEG / 2 + MARGE_BASCULE_DEG) {
    return precedente;
  }
  return nouvelle;
}

// L'état complet, avancé d'une frame : `{ direction, regardMs, angle, angleVise }`. Un tir
// (`vers`, le vecteur héros → cible) tourne le héros et arme le regard ; tant
// que le regard dure, la marche ne le retourne pas.
//
// Spec 16, palier B : à côté de la direction (le gameplay, les tests, huit
// secteurs), l'ANGLE AFFICHÉ du héros (`angle`, en degrés à l'écran, lu par le
// rendu) et l'angle qu'il VISE (`angleVise`) : l'angle exact du geste — le
// stick en donne 360, le clavier huit — ou de la cible d'un tir. L'angle
// affiché tourne vers l'angle visé par le plus court chemin, à vitesse
// bornée : un demi-tour se voit, il ne claque pas.
export function creerOrientation() {
  const angle = ORIENTATIONS.indexOf(ORIENTATION_INITIALE) * SECTEUR_DEG;
  return { direction: ORIENTATION_INITIALE, regardMs: 0, angle, angleVise: angle };
}

// Provisoire, non validé en jeu. Un demi-tour en un tiers de seconde à la
// marche ; au tir, quatre fois plus vif (le regard doit être sur la cible
// avant qu'on se demande vers qui il tire).
export const VITESSE_ROTATION_DEG_S = 540;
export const VITESSE_ROTATION_TIR_DEG_S = 2160;
// Provisoire, non validé en jeu. Un stick qui revient au centre passe par de
// petits vecteurs aux angles de hasard : sous cette amplitude, le geste ne
// change pas l'angle visé (la direction, elle, garde sa règle).
export const AMPLITUDE_MIN_GESTE = 0.25;

const normaliser = (deg) => ((deg % 360) + 360) % 360;
function tourner(angle, vise, pasMax) {
  const ecart = ((vise - angle + 540) % 360) - 180;
  if (Math.abs(ecart) <= pasMax) return normaliser(vise);
  return normaliser(angle + Math.sign(ecart) * pasMax);
}

export function avancerOrientation(etat, { deltaMs, dx = 0, dy = 0, vers = null }) {
  let { direction, angleVise = etat.angle ?? 0 } = etat;
  let regardMs;
  if (vers) {
    direction = directionDe(vers.dx, vers.dy) ?? etat.direction;
    regardMs = DUREE_REGARD_TIR_MS;
    if (vers.dx !== 0 || vers.dy !== 0) angleVise = normaliser(angleDe(vers.dx, vers.dy));
  } else {
    regardMs = Math.max(0, etat.regardMs - deltaMs);
    if (regardMs === 0) {
      direction = orienterDepuisMouvement(etat.direction, dx, dy);
      if (Math.hypot(dx, dy) >= AMPLITUDE_MIN_GESTE) angleVise = normaliser(angleDe(dx, dy));
    }
  }
  const vitesse = regardMs > 0 ? VITESSE_ROTATION_TIR_DEG_S : VITESSE_ROTATION_DEG_S;
  const angle = tourner(etat.angle ?? angleVise, angleVise, (vitesse * deltaMs) / 1000);
  return { direction, regardMs, angle, angleVise };
}

// Spec 16, palier C : l'état du SOUFFLE et du PAS — une horloge, et le poids
// de la marche (`marche`, de 0 à l'arrêt à 1 en marche), qui glisse vers son
// but plutôt que d'y sauter : partir ou s'arrêter fond le balancement dans le
// souffle, rien ne claque. Lu par `poses.js#matriceAnimation`. Affichage seul.
// Provisoire, non validé en jeu : le poids fait l'aller en un quart de seconde.
export const VITESSE_POIDS_MARCHE_S = 4;
// Spec 16, palier E : la capuche en retard sur le regard.
// `inertie` du visuel : chaque entrée donne à ses `pieces` un angle à elles,
// tiré vers l'angle affiché par un ressort amorti. Ses deux réglages d'auteur
// disent ce qu'on VOIT, le ressort s'en déduit :
//   - `retard_ms` : le retard en rotation régulière (l'écart d'équilibre d'un
//     ressort qui suit une cible à vitesse v vaut 2ζ/ω · v) ;
//   - `depassement` : la part d'un saut dont la pièce dépasse avant de se
//     poser (0 : amortissement critique, aucun dépassement).
// Rend aussi la fréquence de l'oscillation amortie : le schéma refuse au-delà
// de 3 Hz (règle de l'épilepsie, `D-220`).
export function ressortInertie({ retard_ms: retardMs, depassement }) {
  const ln = depassement > 0 ? Math.log(depassement) : -Infinity;
  const zeta = depassement > 0 ? -ln / Math.sqrt(Math.PI * Math.PI + ln * ln) : 1;
  const omega = (2 * zeta) / (retardMs / 1000);
  const frequenceHz = zeta < 1 ? (omega * Math.sqrt(1 - zeta * zeta)) / (2 * Math.PI) : 0;
  return { zeta, omega, frequenceHz };
}

// L'écart d'angle le plus court, dans ]-180 ; 180].
function ecartAngle(a, b) {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

// Un pas des ressorts : `etats` (un par entrée d'`inertie`, `{ angle, vitesse }`
// en degrés et degrés/s, ou absent au premier pas) suivent `angle`, l'angle
// affiché, dont `angleAvant` était la valeur au pas précédent. Au-delà de
// `ecart_max_deg`, la pièce est entraînée : son écart est borné et sa vitesse
// prend celle du regard. Pas internes de 4 ms au plus : un ressort raide reste
// stable quelle que soit la frame.
const PAS_RESSORT_MS = 4;
export function avancerInertie(inertie, etats, angle, angleAvant, deltaMs) {
  if (!inertie || angle === null || angle === undefined) return [];
  const n = Math.max(1, Math.ceil(deltaMs / PAS_RESSORT_MS));
  const h = deltaMs / 1000 / n;
  const avant = angleAvant ?? angle;
  const vitesseRegard = deltaMs > 0 ? ecartAngle(angle, avant) / (deltaMs / 1000) : 0;
  return inertie.map((entree, i) => {
    const etat = etats && etats[i];
    if (!etat) return { angle, vitesse: 0 };
    const { zeta, omega } = ressortInertie(entree);
    let { angle: a, vitesse: v } = etat;
    for (let k = 1; k <= n; k += 1) {
      // La force se lit au début du pas (la cible d'alors), la borne à sa fin :
      // lire la cible d'après décalerait le retard d'un pas interne.
      const cible = avant + (ecartAngle(angle, avant) * k) / n;
      const e = ecartAngle(a, avant + (ecartAngle(angle, avant) * (k - 1)) / n);
      v += (-omega * omega * e - 2 * zeta * omega * v) * h;
      a += v * h;
      const e2 = ecartAngle(a, cible);
      if (Math.abs(e2) > entree.ecart_max_deg) {
        a = cible + Math.sign(e2) * entree.ecart_max_deg;
        if ((v - vitesseRegard) * Math.sign(e2) > 0) v = vitesseRegard;
      }
    }
    return { angle: ((a % 360) + 360) % 360, vitesse: v };
  });
}

// Palier D (`D-273`) : l'horloge du PAS (`pasMs`) avance à la `cadence` que
// donne `poses.js#cadencePas` pour la vitesse demandée. Sans geste, elle
// garde sa dernière cadence le temps que le poids s'éteigne : le pas se
// finit au lieu de se figer à mi-hauteur.
//
// Palier E : `angle` (l'angle affiché, `avancerOrientation`) et `inertie` (celle
// du visuel) font avancer les ressorts de la capuche (`avancerInertie`).
export function creerAnimationHeros() {
  return { tempsMs: 0, marche: 0, pasMs: 0, cadence: 1, angle: null, inertie: [] };
}
export function avancerAnimationHeros(etat, { deltaMs, dx = 0, dy = 0, cadence = 1, angle = null, inertie = null }) {
  const enMarche = Math.hypot(dx, dy) >= AMPLITUDE_MIN_GESTE;
  const pas = (VITESSE_POIDS_MARCHE_S * deltaMs) / 1000;
  const marche = enMarche ? Math.min(1, etat.marche + pas) : Math.max(0, etat.marche - pas);
  const cadenceJouee = enMarche ? cadence : (etat.cadence ?? 1);
  return {
    tempsMs: etat.tempsMs + deltaMs, marche, pasMs: (etat.pasMs ?? 0) + deltaMs * cadenceJouee, cadence: cadenceJouee,
    angle, inertie: avancerInertie(inertie, etat.inertie, angle, etat.angle, deltaMs),
  };
}

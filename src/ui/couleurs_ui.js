// Contrôle des couleurs d'accent des menus (specs/08_menus-cartes.md §4.5).
//
// L'accent des menus est lu sur le compagnon choisi (`couleur_ui`, dans
// `companions.json`). Ajouter un 4ᵉ follet recolore donc tous les menus sans
// qu'une ligne de code bouge — et c'est exactement pour ça qu'il faut un
// garde-fou : une couleur choisie pour briller dans une grotte n'a aucune
// raison de se lire sur le fond d'une carte, et rien ne le dirait avant que
// quelqu'un ouvre le menu avec ce follet-là. Le contrôle tombe donc AU
// DÉMARRAGE, avec le chemin de l'entrée fautive.
//
// Module pur : il ne lit ni le DOM ni la feuille de style. Les jetons lui sont
// DONNÉS (`main.js` les relit sur `:root`, le test les relit dans
// `index.html`) — le bloc de variables CSS reste le seul endroit où ils sont
// écrits.

// WCAG 2.x, « composants d'interface et objets graphiques » : 3:1. C'est le
// seuil qui convient ici — l'accent dessine une bordure de focus et une
// icône, jamais un paragraphe (4,5:1 viserait du texte courant). Fixé par la
// spec, pas provisoire.
export const CONTRASTE_MIN_ACCENT = 3;

// *Provisoire.* La spec dit « n'est jamais le magenta du danger » ; une
// égalité stricte laisserait passer `#d6409e`, qu'aucun œil ne distingue du
// magenta. On refuse donc ce qui en est PROCHE : distance euclidienne dans le
// cube RGB (0 à ~441). 60 écarte les quasi-jumeaux sans interdire un rose ou
// un violet francs ; le feu, l'accent le plus proche aujourd'hui, est à ~114.
export const DISTANCE_MIN_DANGER = 60;

const MOTIF_HEX = /^#([0-9a-f]{6})$/i;

// `#rrggbb` seulement — ni `#rgb`, ni `rgb()`, ni nom de couleur. Un seul
// format accepté, c'est un seul format à savoir comparer ; un jeton écrit
// autrement est une erreur de démarrage lisible, pas un contraste faux.
export function analyserHex(hex) {
  const m = typeof hex === 'string' ? MOTIF_HEX.exec(hex.trim()) : null;
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function canalLineaire(v) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminanceRelative({ r, g, b }) {
  return 0.2126 * canalLineaire(r) + 0.7152 * canalLineaire(g) + 0.0722 * canalLineaire(b);
}

// Rapport de contraste WCAG entre deux couleurs `{ r, g, b }` : de 1 à 21,
// symétrique.
export function rapportContraste(a, b) {
  const la = luminanceRelative(a);
  const lb = luminanceRelative(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function distanceRgb(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

// `jetons` : { fondCarte, danger, accentNeutre } en `#rrggbb`, tels que
// déclarés dans le bloc de variables CSS. L'accent neutre (celui d'avant le
// choix du follet) passe le MÊME contrôle que les compagnons : c'est un
// accent comme un autre, et c'est le premier que le joueur voit.
export function erreursCouleursUi(compagnons, jetons) {
  const erreurs = [];
  const lus = {};
  for (const nom of ['fondCarte', 'danger', 'accentNeutre']) {
    lus[nom] = analyserHex(jetons && jetons[nom]);
    if (!lus[nom]) {
      erreurs.push(`jetons de style > ${nom} doit être une couleur #rrggbb (reçu : ${JSON.stringify(jetons && jetons[nom])})`);
    }
  }
  if (erreurs.length > 0) return erreurs;

  const candidats = [
    { chemin: 'jetons de style > accentNeutre', hex: jetons.accentNeutre },
    ...(compagnons || []).map((c) => ({ chemin: `companions.json > ${c.id} > couleur_ui`, hex: c.couleur_ui })),
  ];
  for (const { chemin, hex } of candidats) {
    const couleur = analyserHex(hex);
    if (!couleur) {
      erreurs.push(`${chemin} > doit être une couleur #rrggbb (reçu : ${JSON.stringify(hex)})`);
      continue;
    }
    const contraste = rapportContraste(couleur, lus.fondCarte);
    if (contraste < CONTRASTE_MIN_ACCENT) {
      erreurs.push(
        `${chemin} > ${hex} ne se lit pas sur le fond des cartes (${jetons.fondCarte}) : `
        + `contraste ${contraste.toFixed(2)}:1, minimum ${CONTRASTE_MIN_ACCENT}:1`,
      );
    }
    const distance = distanceRgb(couleur, lus.danger);
    if (distance < DISTANCE_MIN_DANGER) {
      erreurs.push(
        `${chemin} > ${hex} se confond avec le magenta du danger (${jetons.danger}) : `
        + `distance ${distance.toFixed(0)}, minimum ${DISTANCE_MIN_DANGER} — le danger doit rester reconnaissable quel que soit le follet`,
      );
    }
  }
  return erreurs;
}

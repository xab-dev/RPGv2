// Les polices embarquées du jeu (`fonts/`, licence SIL OFL 1.1 à côté de
// chaque fichier). Embarquées et jamais tirées d'un service en ligne : le jeu
// est 100 % hors-ligne. Nées du prologue (`specs/12_prologue.md`, retour de
// Xav sur `V-121` : « police style calligraphique, écriture elfique »).
//
// Déclarées ICI seulement : qui dessine avec l'une d'elles importe son nom de
// famille d'ici, jamais une chaîne recopiée.
//
// « Meilleur effort » (règle de CLAUDE.md) : une police absente ou lente ne
// coûte rien au joueur — le canvas retombe sur la famille de secours de la
// déclaration CSS (`serif`), et le texte reste lisible.

// Le texte : une calligraphie à la plume, inspirée des écritures elfiques,
// qui reste lisible à la taille de la bulle.
export const POLICE_CALLIGRAPHIE = 'Almendra';
// Les titres : une onciale, plus ornée — elle ne porte que quelques mots.
export const POLICE_ONCIALE = 'Uncial Antiqua';

// Les chiffres : ni la calligraphie ni l'onciale n'ont de chiffres alignés —
// leurs chiffres sont « elzéviriens », à hauteur de minuscule, et au menu
// « +1 » se lisait « +I », « 10 » « IO », « Nv.1 » « Nv.ı » (polish libre du
// 24/09). Cette famille ne porte QUE les dix chiffres (`unicodeRange`) et se
// place en tête de la pile : les lettres tombent sur la police suivante, les
// chiffres restent ici. Elle n'est pas embarquée, elle est EMPRUNTÉE à
// l'appareil (`local()`), dans l'ordre : Palatino d'abord (dessiné par Zapf,
// calligraphe, c'est celle qui se marie le mieux à la plume d'Almendra, banc
// du 24/09), puis les serifs courants de chaque système. Aucune trouvée : les
// chiffres d'Almendra reviennent, soit l'état d'avant — rien ne casse.
export const POLICE_CHIFFRES = 'Chiffres alignes';
const SOURCES_CHIFFRES = [
  'Palatino Linotype', 'PalatinoLinotype-Roman', 'Palatino', 'Book Antiqua',
  'Noto Serif', 'NotoSerif-Regular', 'Droid Serif', 'DejaVu Serif',
  'Liberation Serif', 'Times New Roman', 'Times',
].map((nom) => `local("${nom}")`).join(', ');

const FICHIERS = [
  { famille: POLICE_CHIFFRES, source: SOURCES_CHIFFRES, style: 'normal', unicodeRange: 'U+0030-0039' },
  { famille: POLICE_CALLIGRAPHIE, url: 'fonts/Almendra-Regular.ttf', style: 'normal' },
  { famille: POLICE_CALLIGRAPHIE, url: 'fonts/Almendra-Italic.ttf', style: 'italic' },
  { famille: POLICE_ONCIALE, url: 'fonts/UncialAntiqua-Regular.ttf', style: 'normal' },
];

// Au-delà, on n'attend plus : le jeu démarre, la police arrivera (ou non) et
// le canvas l'utilisera dès qu'elle est là. PROVISOIRE.
const ATTENTE_MAX_MS = 3000;

// Appelée par `demarrerJeu` seulement (DOM) — jamais au chargement du module,
// qui reste importable par Node. Ne rejette jamais.
export async function chargerPolices() {
  try {
    if (typeof FontFace === 'undefined' || !document.fonts) return;
    const chargements = FICHIERS.map(async ({ famille, url, source, style, unicodeRange }) => {
      try {
        const descripteurs = unicodeRange ? { style, unicodeRange } : { style };
        const face = await new FontFace(famille, source || `url(${url})`, descripteurs).load();
        document.fonts.add(face);
      } catch (e) {
        console.warn(`police ${famille} (${url || 'locale'}) non chargée : repli`, e);
      }
    });
    await Promise.race([
      Promise.all(chargements),
      new Promise((resoudre) => setTimeout(resoudre, ATTENTE_MAX_MS)),
    ]);
  } catch (e) {
    console.warn('polices non chargées : repli sur serif', e);
  }
}

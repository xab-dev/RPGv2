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

const FICHIERS = [
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
    const chargements = FICHIERS.map(async ({ famille, url, style }) => {
      try {
        const face = await new FontFace(famille, `url(${url})`, { style }).load();
        document.fonts.add(face);
      } catch (e) {
        console.warn(`police ${famille} (${url}) non chargée : repli sur serif`, e);
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

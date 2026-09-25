// Le PARCHEMIN (spec 14, §4.6) : la vue rapprochée qui s'ouvre avec le coffre
// du Gardien. Des lettres d'or s'y écrivent, une à la fois, dans l'ordre de
// lecture ; elles nomment la compétence apprise et le bouton qui la lance.
//
// Ce module tient ce qui est PROPRE au parchemin : l'écriture. Le reste de la
// vue (temps, fondu, armement, particules) est celui de la stèle
// (`stele.js`), réutilisé tel quel — c'est le même geste, un regard qu'on
// lève sur un objet. Pur : ni canvas, ni DOM, ni horloge.

// Le rythme de l'écriture, en ms par signe. PROVISOIRE, à juger en jeu par
// Xav. Un appui sur B pendant qu'elle court l'ACHÈVE, il ne ferme pas : une
// vue qu'on n'a pas encore lue ne se referme pas sur un texte à moitié écrit
// (même règle que le déchiffrement du carnet). Le second appui ferme.
export const MS_PAR_SIGNE = 32;

// Le texte à écrire est une liste de LIGNES. Rend les mêmes lignes, coupées au
// nombre de signes que `ecritureMs` a permis d'écrire : les premières lignes
// entières, la ligne courante en partie, les suivantes vides. Les espaces
// comptent comme des signes : la plume ne saute pas d'un mot à l'autre.
export function lignesEcrites(lignes, ecritureMs, msParSigne = MS_PAR_SIGNE) {
  let reste = Math.max(0, Math.floor(ecritureMs / msParSigne));
  return lignes.map((ligne) => {
    const signes = Array.from(ligne);
    const n = Math.min(signes.length, reste);
    reste -= n;
    return signes.slice(0, n).join('');
  });
}

// Combien de temps il faut pour tout écrire.
export function dureeEcriture(lignes, msParSigne = MS_PAR_SIGNE) {
  return lignes.reduce((total, ligne) => total + Array.from(ligne).length, 0) * msParSigne;
}

export function ecritureFinie(lignes, ecritureMs, msParSigne = MS_PAR_SIGNE) {
  return ecritureMs >= dureeEcriture(lignes, msParSigne);
}

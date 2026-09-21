// OUTIL DE DEV, jamais chargé par le jeu : remplace UNE entrée de
// data/visuels.json par le contenu d'un fichier JSON, sans reformater le
// reste du catalogue (une réécriture complète par JSON.stringify rendrait
// illisible le diff de tous les autres visuels, et un ticket de silhouette
// doit se relire d'un coup d'œil).
//   node tools/remplacer_visuel.mjs <id> <fichier.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [id, source] = process.argv.slice(2);
const chemin = 'data/visuels.json';
const texte = readFileSync(chemin, 'utf8');
const entree = JSON.parse(readFileSync(source, 'utf8'));

// Style du catalogue : une primitive par ligne, le reste indenté à 2/4.
function rendre(e) {
  const lignes = ['  {'];
  for (const [cle, valeur] of Object.entries(e)) {
    if (cle === 'primitives') continue;
    lignes.push(`    ${JSON.stringify(cle)}: ${JSON.stringify(valeur)},`);
  }
  lignes.push('    "primitives": [');
  e.primitives.forEach((p, i) => {
    lignes.push(`      ${JSON.stringify(p)}${i === e.primitives.length - 1 ? '' : ','}`);
  });
  lignes.push('    ]', '  }');
  return lignes.join('\n');
}

const ancre = texte.indexOf(`"id": "${id}"`);
// Id absent = entrée NEUVE, ajoutée en fin de catalogue. Un outil qui
// refuserait d'ajouter obligerait à éditer 600 lignes de JSON à la main pour
// une icône, ce qui est exactement la façon de casser le reste.
if (ancre < 0) {
  const fermeture = texte.lastIndexOf(']');
  const avant = texte.slice(0, fermeture).replace(/\s*$/, '');
  writeFileSync(chemin, `${avant},
${rendre(entree)}
]
`, 'utf8');
  console.log(`${id} AJOUTÉ (${entree.primitives.length} primitives)`);
  process.exit(0);
}
const debut = texte.lastIndexOf('\n  {', ancre) + 1;
// Fin = l'accolade fermante de MÊME indentation qui suit l'ancre.
const fin = texte.indexOf('\n  }', ancre) + '\n  }'.length;
writeFileSync(chemin, texte.slice(0, debut) + rendre(entree).slice(0) + texte.slice(fin), 'utf8');
console.log(`${id} remplacé (${entree.primitives.length} primitives)`);

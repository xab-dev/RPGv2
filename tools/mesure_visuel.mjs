// OUTIL DE DEV, jamais chargé par le jeu : l'instrument de pixels des
// silhouettes (spec 17, palier A), en ligne de commande.
//
//   node tools/mesure_visuel.mjs <commande> [--id a,b | --id tous] [--ref main] [--echelle 3] [--sortie fichier.png]
//
//   diff   le rendu de l'arbre de travail contre celui d'une référence Git
//          (défaut : HEAD) — les huit directions, le tour tous les 5°, une
//          marche rejouée, à l'échelle du jeu et à la loupe ×9. LE FILET d'un
//          allègement : 0 pixel attendu. Défaut : --id tous.
//   cles   aux angles clés, le rendu à tout angle = la pose déclarée.
//   saut   le tour au degré près : les pics d'écart entre angles voisins.
//   fuite  le contexte rendu comme trouvé (transform, alpha, styles, découpe).
//   cache  les dégradés gardés redessinent comme un contexte neuf.
//   cout   le temps d'un dessin (µs, médiane) : un ordre de grandeur pour
//          comparer deux versions sur la même machine, jamais un verdict.
//   proportions  la silhouette sur le tour (hauteur, largeur, capuche, place
//          de l'œil et de l'ouverture), l'écart aux angles de référence
//          (--refs 66-76,90,132), les variantes en surimpression
//          (--variantes x.js). Voir la page pour le détail.
//
// Pourquoi il existe : les sessions du héros (26/09) mesuraient tout ça avec
// des pages jetables (`tools/_ref/`) et une COPIE à la main de `src/` et du
// catalogue pour comparer. Ici la référence s'extrait de Git (`git show`),
// dans `tools/variantes/_ref/<sha>/` (non versionné, servi par le serveur
// local), et n'importe quel visuel se mesure. Le serveur local est lancé s'il
// ne répond pas. Code de sortie 1 si la mesure trouve un défaut.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINE = process.env.RPG_URL || 'http://localhost:8080';
const COMMANDES = ['diff', 'cles', 'saut', 'fuite', 'cache', 'cout', 'proportions'];

const [commande, ...reste] = process.argv.slice(2);
if (!COMMANDES.includes(commande)) {
  console.error(`usage : node tools/mesure_visuel.mjs <${COMMANDES.join('|')}> [--id a,b|tous] [--ref main] [--echelle 3] [--sortie f.png]`);
  process.exit(2);
}
const options = {};
for (let i = 0; i < reste.length; i += 2) options[reste[i].replace(/^--/, '')] = reste[i + 1];

const git = (...args) => execFileSync('git', args, { cwd: RACINE, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });

// La référence : `src/` entier (un module en importe d'autres) et le catalogue
// des visuels, tels qu'ils sont au commit demandé. Extraite une fois par
// commit : un dossier déjà là est réutilisé (un commit ne change pas).
function extraireReference(ref) {
  const sha = git('rev-parse', '--short', ref).toString().trim();
  const dossier = path.join('tools', 'variantes', '_ref', sha);
  const absolu = path.join(RACINE, dossier);
  if (!fs.existsSync(path.join(absolu, 'data', 'visuels.json'))) {
    const fichiers = git('ls-tree', '-r', '--name-only', sha, '--', 'src', 'data/visuels.json').toString().split('\n').filter(Boolean);
    for (const f of fichiers) {
      fs.mkdirSync(path.join(absolu, path.dirname(f)), { recursive: true });
      fs.writeFileSync(path.join(absolu, f), git('show', `${sha}:${f}`));
    }
  }
  return { sha, dossier: dossier.split(path.sep).join('/') };
}

async function serveurRepond() {
  try { return (await fetch(`${ORIGINE}/index.html`)).ok; } catch { return false; }
}

const requete = new URLSearchParams({ commande, id: options.id || (commande === 'diff' ? 'tous' : 'visuel_heros') });
if (options.echelle) requete.set('echelle', options.echelle);
for (const cle of ['refs', 'variantes', 'pieces']) if (options[cle]) requete.set(cle, options[cle]);
if (commande === 'diff') {
  const { sha, dossier } = extraireReference(options.ref || 'HEAD');
  requete.set('ref', dossier);
  console.log(`référence : ${options.ref || 'HEAD'} (${sha})`);
}

let serveur = null;
if (!(await serveurRepond())) {
  serveur = spawn(process.execPath, [path.join(RACINE, 'serveur_local.js')], { cwd: RACINE, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await serveurRepond()); i += 1) await new Promise((r) => setTimeout(r, 100));
}
try {
  const r = spawnSync(process.execPath, [path.join(RACINE, 'tools', 'capture_chrome.mjs'), path.join(RACINE, 'tools', 'scenarios', 'mesure_visuel.mjs')], {
    cwd: RACINE, stdio: 'inherit',
    env: { ...process.env, RPG_MESURE: requete.toString(), ...(options.sortie ? { RPG_SORTIE: options.sortie } : {}) },
  });
  process.exitCode = r.status ?? 1;
} finally {
  if (serveur) serveur.kill();
}

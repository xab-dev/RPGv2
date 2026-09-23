// Serveur statique minimal, sans dépendance, pour servir le jeu en http://
// (jamais file://). Réponses systématiquement no-store : en développement,
// le code et les données doivent toujours être relus, jamais mis en cache.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
// `D-181` : la boucle locale seulement. Sans hôte, `listen` écoute sur toutes
// les interfaces, et n'importe qui sur le même Wi-Fi lisait le dépôt entier —
// `.git/` et `prive/sauvegardes/` compris. Le jeu ne se teste plus que sur le
// PC (Xav, 23/09) ; le téléphone passe par l'URL publique.
const HOTE = '127.0.0.1';

const TYPES_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  // Ticket L2 : les calques du symbole. Servie en `octet-stream`, une image SVG
  // ne se décode pas — le logo serait absent sans erreur visible.
  '.svg': 'image/svg+xml',
  // `specs/12` : les polices du prologue (`fonts/`), chargées par `FontFace`.
  '.ttf': 'font/ttf',
};

// `D-181` : le chemin absolu à servir, ou `null` si la requête sort de la
// racine ou ne se décode pas. Pure, exportée pour le test. La garde compare à
// `racine + séparateur` : un simple `startsWith(racine)` laissait passer un
// dossier voisin au nom prolongé (`…/RPGv2x/`). Et `decodeURIComponent` lève
// sur un `%` mal formé : non rattrapé dans le gestionnaire `async`, ce rejet
// arrêtait le process Node entier.
export function resoudreChemin(racine, urlBrute) {
  let urlChemin;
  try {
    urlChemin = decodeURIComponent((urlBrute || '/').split('?')[0]);
  } catch {
    return null;
  }
  const chemin = urlChemin === '/' ? '/index.html' : urlChemin;
  const cheminAbsolu = path.normalize(path.join(racine, chemin));
  return cheminAbsolu.startsWith(racine + path.sep) ? cheminAbsolu : null;
}

function demarrer() {
  const serveur = http.createServer(async (req, res) => {
    const cheminAbsolu = resoudreChemin(__dirname, req.url);
    if (!cheminAbsolu) {
      res.writeHead(403);
      res.end('Interdit');
      return;
    }

    try {
      const contenu = await readFile(cheminAbsolu);
      const ext = path.extname(cheminAbsolu);
      res.writeHead(200, {
        'Content-Type': TYPES_MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(contenu);
    } catch {
      res.writeHead(404);
      res.end('Introuvable');
    }
  });

  serveur.listen(PORT, HOTE, () => {
    console.log(`RPG V2 servi sur http://localhost:${PORT}`);
  });
}

// Lancé directement (`node serveur_local.js`) : on sert. Importé par un test :
// on n'ouvre aucun port.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  demarrer();
}

// Serveur statique minimal, sans dépendance, pour servir le jeu en http://
// (jamais file://). Réponses systématiquement no-store : en développement,
// le code et les données doivent toujours être relus, jamais mis en cache.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

const TYPES_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const serveur = http.createServer(async (req, res) => {
  const urlChemin = decodeURIComponent((req.url || '/').split('?')[0]);
  const chemin = urlChemin === '/' ? '/index.html' : urlChemin;
  const cheminAbsolu = path.normalize(path.join(__dirname, chemin));

  if (!cheminAbsolu.startsWith(__dirname)) {
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

serveur.listen(PORT, () => {
  console.log(`RPG V2 servi sur http://localhost:${PORT}`);
});

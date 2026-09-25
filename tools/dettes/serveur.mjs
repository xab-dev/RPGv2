// L'outil des dettes — OUTIL DE DEV, jamais chargé par le jeu.
//   npm run dettes            (ouvre la page dans le navigateur)
//
// Une page locale qui montre à Xav UNE ligne du suivi à la fois, les plus
// anciennes d'abord, et écrit sa réponse DANS `docs/DOC_suivi-dettes.md`.
// Chaque réponse régénère `A_FAIRE.md` (la file, lisible sur GitHub).
// Rien n'est commité : Claude relit ce que Xav a changé (`git diff` du suivi)
// au ménage de la session suivante, et le commite avec lui.
//
// Séparé de `serveur_local.js` exprès : celui-là sert le jeu et ne fait que
// LIRE. Celui-ci écrit dans le dépôt ; il n'écoute que la boucle locale
// (`D-181`) et refuse toute écriture qui ne vient pas de sa propre page — sans
// ça, n'importe quel site ouvert dans le navigateur pourrait poster une
// « réponse » sur `localhost`.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  lireSuivi, fileDeXav, repondre, retablir, genererAFaire, aFaire, genre,
} from './suivi.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, '..', '..');
// `DETTES_SUIVI` / `DETTES_A_FAIRE` : une COPIE, pour essayer l'outil sans
// écrire dans le vrai suivi.
const SUIVI = process.env.DETTES_SUIVI || path.join(RACINE, 'docs', 'DOC_suivi-dettes.md');
const A_FAIRE = process.env.DETTES_A_FAIRE || path.join(RACINE, 'A_FAIRE.md');
const PAGE = path.join(ICI, 'page.html');
const PORT = Number(process.env.DETTES_PORT) || 8090;
const HOTE = '127.0.0.1';
const ORIGINES = new Set([`http://${HOTE}:${PORT}`, `http://localhost:${PORT}`]);
const TAILLE_MAX_CORPS = 20000; // une réponse, pas un roman

// Les gestes de la session, pour « annuler » : la ligne avant, la ligne après.
const annulations = [];

function aujourdhui() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function jjmm(date) {
  return date ? `${String(date % 100).padStart(2, '0')}/${String(Math.floor(date / 100)).padStart(2, '0')}` : '';
}

const lire = () => fs.readFileSync(SUIVI, 'utf8');

// Écrit le suivi puis la file lisible. Par un fichier temporaire renommé : un
// arrêt au milieu de l'écriture ne laisse jamais un suivi à moitié écrit.
function ecrire(texte) {
  const temporaire = `${SUIVI}.ecriture`;
  fs.writeFileSync(temporaire, texte);
  fs.renameSync(temporaire, SUIVI);
  fs.writeFileSync(A_FAIRE, genererAFaire(lireSuivi(texte)));
}

function carte(ligne) {
  const n = ligne.nomme;
  return {
    id: ligne.id,
    prefixe: ligne.prefixe,
    genre: genre(ligne),
    date: jjmm(ligne.date),
    titre: ligne.titre,
    aFaire: aFaire(ligne),
    dejaEcrit: n['Décision'] || n.Verdict || '',
    statut: ligne.statut,
    empreinte: ligne.empreinte,
    bienFormee: ligne.bienFormee,
  };
}

function etat() {
  const { file, plusTard } = fileDeXav(lireSuivi(lire()));
  return {
    file: file.map(carte),
    plusTard: plusTard.map(carte),
    derniere: annulations.length ? annulations[annulations.length - 1].id : null,
  };
}

function envoyer(res, code, corps, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof corps === 'string' || Buffer.isBuffer(corps) ? corps : JSON.stringify(corps));
}

function lireCorps(req) {
  return new Promise((resoudre, rejeter) => {
    let corps = '';
    req.on('data', (morceau) => {
      corps += morceau;
      if (corps.length > TAILLE_MAX_CORPS) { rejeter(new Error('réponse trop longue')); req.destroy(); }
    });
    req.on('end', () => {
      try { resoudre(JSON.parse(corps || '{}')); } catch { rejeter(new Error('JSON illisible')); }
    });
    req.on('error', rejeter);
  });
}

// Une écriture n'est acceptée que de la page de CET outil : l'en-tête maison
// oblige un navigateur à demander la permission (pré-vol CORS) à toute autre
// origine, et ce serveur ne l'accorde jamais ; l'origine, quand elle est
// envoyée, doit être la sienne.
function ecritureAutorisee(req) {
  if (req.headers['x-dettes'] !== '1') return false;
  const origine = req.headers.origin;
  return !origine || ORIGINES.has(origine);
}

const serveur = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOTE}:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/') return envoyer(res, 200, fs.readFileSync(PAGE), 'text/html; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/api/etat') return envoyer(res, 200, etat());
    // Les polices du jeu, pour que l'outil parle comme lui. Seulement elles.
    const police = /^\/fonts\/([A-Za-z-]+\.ttf)$/.exec(url.pathname);
    if (req.method === 'GET' && police) {
      const fichier = path.join(RACINE, 'fonts', police[1]);
      if (fs.existsSync(fichier)) return envoyer(res, 200, fs.readFileSync(fichier), 'font/ttf');
    }
    if (req.method === 'POST' && (url.pathname === '/api/repondre' || url.pathname === '/api/annuler')) {
      if (!ecritureAutorisee(req)) return envoyer(res, 403, { erreur: 'écriture refusée : elle ne vient pas de la page de l’outil' });
      const demande = await lireCorps(req);
      if (url.pathname === '/api/repondre') {
        const r = repondre(lire(), { ...demande, date: aujourdhui() });
        if (r.erreur) return envoyer(res, 409, { erreur: r.erreur, ...etat() });
        ecrire(r.texte);
        annulations.push({ id: demande.id, avant: r.avant, apres: r.apres });
        console.log(`${demande.id} : ${demande.geste}${demande.texte ? ` — ${demande.texte}` : ''}`);
        return envoyer(res, 200, etat());
      }
      const derniere = annulations.pop();
      if (!derniere) return envoyer(res, 409, { erreur: 'rien à annuler', ...etat() });
      const r = retablir(lire(), derniere);
      if (r.erreur) return envoyer(res, 409, { erreur: r.erreur, ...etat() });
      ecrire(r.texte);
      console.log(`${derniere.id} : réponse annulée`);
      return envoyer(res, 200, etat());
    }
    envoyer(res, 404, { erreur: 'introuvable' });
  } catch (e) {
    envoyer(res, 500, { erreur: e.message });
  }
});

serveur.listen(PORT, HOTE, () => {
  // La file lisible est à jour dès l'ouverture, même sans réponse.
  fs.writeFileSync(A_FAIRE, genererAFaire(lireSuivi(lire())));
  const adresse = `http://${HOTE}:${PORT}/`;
  const { file } = fileDeXav(lireSuivi(lire()));
  console.log(`Dettes : ${file.length} lignes attendent Xav — ${adresse}`);
  console.log(`Ctrl+C pour arrêter. Tes réponses sont écrites dans ${path.relative(RACINE, SUIVI)}.`);
  if (process.env.DETTES_SANS_NAVIGATEUR) return;
  // Ouvrir le navigateur : meilleur effort, l'adresse est affichée de toute façon.
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', adresse]]
    : process.platform === 'darwin' ? ['open', [adresse]] : ['xdg-open', [adresse]];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch { /* l'adresse suffit */ }
});

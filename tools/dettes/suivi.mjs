// La part PURE de l'outil des dettes — OUTIL DE DEV, jamais chargé par le jeu.
//
// Pourquoi il existe : `docs/DOC_suivi-dettes.md` est la seule liste de ce qui
// est dû (`Q-14`), mais il pèse ~400 Ko, et chaque ligne qui attend Xav lui
// coûtait une dizaine de minutes à retrouver, relire et remplir à la main.
// Ce module lit le suivi, en tire LA FILE de ce qui attend Xav (une ligne à
// la fois, les plus anciennes d'abord), et écrit sa réponse DANS le suivi —
// jamais dans une seconde liste, qui finirait par le contredire.
//
// Trois règles tenues ici, et nulle part ailleurs :
//   1. Une écriture s'ancre sur l'identifiant de la ligne (règle 8 du suivi :
//      jamais de remplacement global), et ne change QU'UNE ligne du fichier.
//   2. Une ligne qui n'a pas le nombre de colonnes de l'en-tête de sa section
//      n'est jamais écrite : on ne saurait pas dans quelle case tombe la
//      réponse. Elle est montrée, marquée « mal formée ».
//   3. Une réponse porte l'empreinte de la ligne telle qu'elle a été montrée :
//      si la ligne a changé depuis (Claude l'a éditée), l'écriture est refusée.
//
// Aucune I/O : le serveur (`serveur.mjs`) lit et écrit le fichier, ce module
// reçoit et rend du texte.

// Les sections du suivi dont les lignes peuvent attendre Xav, par préfixe
// d'identifiant, avec la colonne où va sa réponse. `null` : la section n'a pas
// de colonne de réponse, la réponse s'ajoute au statut.
const SECTIONS = {
  Q: { reponse: 'Décision' },
  V: { reponse: 'Verdict' },
  E: { reponse: null },
  A: { reponse: null }, // §1 « Actions immédiates » : des `A-` s'il en naît un jour
  D: { reponse: null },
};

// Ce que Claude a écrit dans le statut quand il attend un GESTE de Xav sur une
// dette technique (`D-56` « attend Xav », `D-138` « remède à choisir par
// Xav »). Les autres `D-` sont le travail de Claude : hors de la file.
const D_ATTEND_XAV = /xav/i;

// Le marqueur que l'outil pose sur une ligne à laquelle Xav a répondu sans la
// clore (une `D-`, une `E-`, un « pas bon ») : elle sort de la file de Xav et
// attend Claude, qui la lit au ménage suivant.
export const MARQUE_REPONDU = 'répondu par Xav';
// Le marqueur de « plus tard » : la ligne quitte la file et rejoint la pile.
export const MARQUE_PLUS_TARD = 'plus tard';

// Découpe une ligne de tableau Markdown en cellules. Un `\|` échappé reste
// dans sa cellule.
export function cellules(ligne) {
  const brut = ligne.trim();
  if (!brut.startsWith('|')) return null;
  const morceaux = [];
  let courant = '';
  for (let i = 1; i < brut.length; i += 1) {
    const c = brut[i];
    if (c === '\\' && brut[i + 1] === '|') { courant += '\\|'; i += 1; continue; }
    if (c === '|') { morceaux.push(courant.trim()); courant = ''; continue; }
    courant += c;
  }
  // Ce qui suit le dernier `|` n'est pas une cellule (fin de ligne).
  return morceaux;
}

function composerLigne(cases) {
  return `| ${cases.join(' | ')} |`;
}

// L'empreinte d'une ligne : un hachage court de son texte exact. Sert à
// refuser une réponse donnée sur une version périmée de la ligne.
export function empreinte(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// La première date « JJ/MM » d'un texte, en nombre triable (MM × 100 + JJ).
function premiereDate(texte) {
  const m = texte.match(/\b(\d{1,2})\/(\d{2})\b/);
  if (!m) return null;
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return null;
  return mois * 100 + jour;
}

const sansGras = (s) => s.replace(/\*\*/g, '').trim();

// Lit le suivi. Rend chaque ligne à identifiant, avec sa section, ses
// cellules nommées par l'en-tête, et son état pour la file.
export function lireSuivi(texte) {
  const eol = texte.includes('\r\n') ? '\r\n' : '\n';
  const lignesTexte = texte.split(eol);
  const lignes = [];
  let section = null;
  let entete = null;
  lignesTexte.forEach((brute, index) => {
    if (/^## /.test(brute)) {
      section = brute.slice(3).trim();
      entete = null;
      return;
    }
    const cases = cellules(brute);
    if (!cases) return;
    if (cases[0] === 'Id') { entete = cases; return; }
    const m = /^([A-Z]+)-(\d+)$/.exec(cases[0]);
    if (!m || !entete) return;
    const prefixe = m[1];
    const nomme = {};
    entete.forEach((nom, i) => { nomme[nom] = cases[i]; });
    lignes.push({
      id: cases[0],
      prefixe,
      numero: Number(m[2]),
      section,
      close: /^8\./.test(section || ''),
      index,
      brute,
      entete,
      cases,
      nomme,
      bienFormee: cases.length === entete.length,
      // Le statut est TOUJOURS la dernière cellule : même une ligne mal formée
      // (une colonne fusionnée) garde son statut au bout.
      statut: cases[cases.length - 1] || '',
      titre: sansGras(cases[1] || ''),
      empreinte: empreinte(brute),
    });
  });
  return { eol, lignesTexte, lignes };
}

// Où en est une ligne, pour Xav : `attend` (dans sa file), `plus_tard` (dans
// la pile qu'il a mise de côté, ou gelée), ou `hors` (close, tranchée, à
// Claude, ou dans une section qui ne se répond pas).
export function etatPourXav(ligne) {
  if (ligne.close || !(ligne.prefixe in SECTIONS)) return 'hors';
  const statut = sansGras(ligne.statut).toLowerCase();
  if (statut.includes(MARQUE_REPONDU.toLowerCase())) return 'hors';
  if (/gel|report|plus tard/.test(statut)) return 'plus_tard';
  if (ligne.prefixe === 'D') {
    return /^ouvert/.test(statut) && D_ATTEND_XAV.test(statut) ? 'attend' : 'hors';
  }
  // Une ligne sans statut n'a été ni close ni tranchée : elle est due.
  if (statut === '') return 'attend';
  if (/^(ouvert|à appliquer|appliqué, à confirmer|appliqué en partie|en cours)/.test(statut)) return 'attend';
  return 'hors';
}

// La date de NAISSANCE d'une ligne : « Depuis » pour une validation, sinon la
// date écrite dans son titre (« … (polish libre, 24/09) »). Jamais la première
// date du texte : c'est souvent celle d'une mise à jour (`Q-61` ne portait
// que la date d'une retouche). Une ligne sans date de naissance prend celle de
// sa plus proche voisine de série qui en a une — la précédente d'abord, les
// identifiants naissant dans l'ordre du temps. Les lignes closes servent de
// repères aussi : elles sont nées au milieu des autres.
function datesDesLignes(lignes) {
  const dates = new Map();
  const parSerie = {};
  for (const l of lignes) (parSerie[l.prefixe] ||= []).push(l);
  for (const serie of Object.values(parSerie)) {
    serie.sort((a, b) => a.numero - b.numero);
    const naissance = serie.map((l) => premiereDate(l.nomme.Depuis || '') ?? premiereDate(l.cases[1] || ''));
    serie.forEach((l, i) => {
      let d = naissance[i];
      for (let j = i - 1; d == null && j >= 0; j -= 1) d = naissance[j];
      for (let j = i + 1; d == null && j < serie.length; j += 1) d = naissance[j];
      dates.set(l.id, d ?? 0);
    });
  }
  return dates;
}

const ORDRE_SERIES = ['A', 'V', 'Q', 'E', 'D'];

// LA FILE de Xav : ce qui attend, les plus anciennes d'abord (décision de Xav,
// 25/09). Et la pile de « plus tard », dans le même ordre.
export function fileDeXav(suivi) {
  const dates = datesDesLignes(suivi.lignes);
  const ordre = (a, b) => (dates.get(a.id) - dates.get(b.id))
    || (ORDRE_SERIES.indexOf(a.prefixe) - ORDRE_SERIES.indexOf(b.prefixe))
    || (a.numero - b.numero);
  const avecDate = (l) => ({ ...l, date: dates.get(l.id) });
  return {
    file: suivi.lignes.filter((l) => etatPourXav(l) === 'attend').sort(ordre).map(avecDate),
    plusTard: suivi.lignes.filter((l) => etatPourXav(l) === 'plus_tard').sort(ordre).map(avecDate),
  };
}

// Les gestes de Xav, et ce que chacun écrit. `date` est « JJ/MM ».
//   ok        une validation vue et bonne ; une question : d'accord avec ce
//             que Claude a appliqué par défaut
//   deja_vu   une validation vue en cours de route (même effet que ok)
//   non       ça ne va pas : le texte dit quoi ; la ligne reste ouverte et
//             attend Claude
//   reponse   une réponse libre (question tranchée, note sur une D- ou E-)
//   plus_tard la ligne quitte la file, rejoint la pile
//   reprendre une ligne de la pile revient dans la file
export const GESTES = ['ok', 'deja_vu', 'non', 'reponse', 'plus_tard', 'reprendre'];

function citation(texte) {
  return `« ${texte.trim().replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ')} »`;
}

// Les cases nouvelles d'une ligne, après un geste. Rend `null` si le geste
// n'a pas de sens pour cette ligne.
function casesApres(ligne, geste, texte, date) {
  const cases = ligne.cases.slice();
  const iStatut = cases.length - 1;
  const colonneReponse = SECTIONS[ligne.prefixe] ? SECTIONS[ligne.prefixe].reponse : null;
  const iReponse = colonneReponse ? ligne.entete.indexOf(colonneReponse) : -1;
  const signe = `Xav, ${date}`;
  const note = texte && texte.trim() ? ` : ${citation(texte)}` : '';
  const ajouterAuStatut = (ajout) => {
    const actuel = cases[iStatut];
    cases[iStatut] = actuel ? `${actuel} · ${ajout}` : ajout;
  };
  const ecrireReponse = (valeur) => {
    const actuelle = cases[iReponse];
    // Une réponse n'efface jamais ce qui était déjà écrit dans la case.
    cases[iReponse] = actuelle && actuelle !== '—' ? `${actuelle} · ${valeur}` : valeur;
  };

  switch (geste) {
    case 'ok':
    case 'deja_vu': {
      const mot = geste === 'deja_vu' ? 'vu en cours de route' : 'ok';
      if (ligne.prefixe === 'V') {
        ecrireReponse(`${signe} : ${mot}${note}`);
        cases[iStatut] = 'validé';
      } else if (ligne.prefixe === 'Q') {
        ecrireReponse(`${signe} : d'accord avec ce qui est appliqué${note}`);
        cases[iStatut] = 'tranchée';
      } else {
        ajouterAuStatut(`${MARQUE_REPONDU} le ${date} : ok${note}`);
      }
      return cases;
    }
    case 'non':
      if (!note) return null;
      if (iReponse >= 0) {
        ecrireReponse(`${signe} : non${note}`);
        ajouterAuStatut(`${MARQUE_REPONDU} le ${date}`);
      } else {
        ajouterAuStatut(`${MARQUE_REPONDU} le ${date} : non${note}`);
      }
      return cases;
    case 'reponse':
      if (!note) return null;
      if (ligne.prefixe === 'Q') {
        ecrireReponse(`${signe}${note}`);
        cases[iStatut] = 'tranchée';
      } else if (iReponse >= 0) {
        ecrireReponse(`${signe}${note}`);
        ajouterAuStatut(`${MARQUE_REPONDU} le ${date}`);
      } else {
        ajouterAuStatut(`${MARQUE_REPONDU} le ${date}${note}`);
      }
      return cases;
    case 'plus_tard':
      ajouterAuStatut(`${MARQUE_PLUS_TARD} (${signe}${note})`);
      return cases;
    case 'reprendre': {
      // Seul le marqueur que l'outil a posé se retire ; un « gelé » écrit par
      // Claude ou par Xav reste, et la ligne reprend sa place avec une note.
      const sans = cases[iStatut].replace(/ · plus tard \([^)]*\)/g, '').replace(/^plus tard \([^)]*\)$/, 'ouvert');
      cases[iStatut] = sans === cases[iStatut] ? `ouvert · repris par ${signe}` : sans;
      return cases;
    }
    default:
      return null;
  }
}

// Applique un geste de Xav au texte du suivi. Rend `{ texte }` ou
// `{ erreur }`. Ne touche qu'UNE ligne : celle qui commence par `| <id> |`.
export function repondre(texteSuivi, { id, empreinte: vue, geste, texte = '', date }) {
  if (!GESTES.includes(geste)) return { erreur: `geste inconnu : ${geste}` };
  if (!/^\d{2}\/\d{2}$/.test(date || '')) return { erreur: 'date attendue au format JJ/MM' };
  const suivi = lireSuivi(texteSuivi);
  const trouvees = suivi.lignes.filter((l) => l.id === id);
  if (trouvees.length !== 1) return { erreur: `${id} : ${trouvees.length} lignes portent cet identifiant, il en faut une` };
  const ligne = trouvees[0];
  if (ligne.empreinte !== vue) return { erreur: `${id} a changé depuis qu'elle a été affichée : recharge la page` };
  if (!ligne.bienFormee) return { erreur: `${id} est mal formée (${ligne.cases.length} colonnes pour ${ligne.entete.length}) : Claude doit la réparer` };
  const etat = etatPourXav(ligne);
  if (geste === 'reprendre' ? etat !== 'plus_tard' : etat !== 'attend') {
    return { erreur: `${id} n'est pas dans la ${geste === 'reprendre' ? 'pile « plus tard »' : 'file'}` };
  }
  const cases = casesApres(ligne, geste, texte, date);
  if (!cases) return { erreur: 'ce geste demande un texte' };
  const nouvelle = composerLigne(cases);
  const lignesTexte = suivi.lignesTexte.slice();
  // Règle 8 du suivi : l'ancre contient l'identifiant.
  if (!lignesTexte[ligne.index].startsWith(`| ${id} |`)) return { erreur: `${id} : ancre introuvable` };
  lignesTexte[ligne.index] = nouvelle;
  return { texte: lignesTexte.join(suivi.eol), avant: ligne.brute, apres: nouvelle };
}

// Rétablit une ligne telle qu'elle était (l'annulation du dernier geste). Même
// garde : on ne rétablit que si la ligne est encore celle que l'outil a écrite.
export function retablir(texteSuivi, { id, avant, apres }) {
  const suivi = lireSuivi(texteSuivi);
  const ligne = suivi.lignes.find((l) => l.id === id);
  if (!ligne || ligne.brute !== apres) return { erreur: `${id} a changé depuis : rien n'est annulé` };
  const lignesTexte = suivi.lignesTexte.slice();
  lignesTexte[ligne.index] = avant;
  return { texte: lignesTexte.join(suivi.eol) };
}

// Le texte qui résume une ligne pour sa carte : ce que Xav doit faire.
export function aFaire(ligne) {
  const n = ligne.nomme;
  switch (ligne.prefixe) {
    case 'V': return n.Comment || '';
    case 'Q': return n['Contexte / ce qui est appliqué par défaut'] || '';
    case 'E': return n['Contraintes déjà connues'] || '';
    case 'D': return n['Cause connue / hypothèse'] || '';
    default: return ligne.cases.slice(2, -1).join(' · ');
  }
}

const GENRE = { V: 'à voir en jeu', Q: 'à trancher', E: 'à écrire', D: 'dette qui attend Xav', A: 'action' };
export const genre = (ligne) => GENRE[ligne.prefixe] || '';

function jjmm(date) {
  if (!date) return '';
  return `${String(date % 100).padStart(2, '0')}/${String(Math.floor(date / 100)).padStart(2, '0')}`;
}

// `A_FAIRE.md` : la file, lisible sur GitHub. GÉNÉRÉ : jamais édité à la main.
export function genererAFaire(suivi) {
  const { file, plusTard } = fileDeXav(suivi);
  // Une puce par ligne, sur UNE ligne : un titre qui fait un paragraphe
  // (`E-02`) est coupé, le texte entier reste dans le suivi et dans l'outil.
  const court = (t) => (t.length > 140 ? `${t.slice(0, 139).trimEnd()}…` : t);
  const puce = (l) => `- [ ] **${l.id}** · ${jjmm(l.date)} · ${genre(l)} — ${court(l.titre.replace(/\s+/g, ' '))}${l.bienFormee ? '' : ' ⚠ ligne mal formée'}`;
  return [
    '# À faire — ce qui attend Xav',
    '',
    '> **Généré** par `npm run dettes`, à chaque réponse. Ne pas éditer : la seule liste est',
    '> [`docs/DOC_suivi-dettes.md`](docs/DOC_suivi-dettes.md). Pour répondre : `npm run dettes`.',
    '',
    `**${file.length}** dans la file, les plus anciennes d'abord · **${plusTard.length}** mises de côté.`,
    '',
    ...file.map(puce),
    '',
    '<details>',
    `<summary>Mises de côté (plus tard, gelées) : ${plusTard.length}</summary>`,
    '',
    ...plusTard.map(puce),
    '',
    '</details>',
    '',
  ].join('\n');
}

// L'outil des dettes (`tools/dettes/suivi.mjs`) — la part pure.
//
// Demande de Xav (25/09) : chaque ligne du suivi lui coûtait une dizaine de
// minutes ; il veut une ligne à la fois, la réponse à écrire, et que tout se
// mette à jour. L'outil écrit DANS `docs/DOC_suivi-dettes.md` : ce fichier
// tient donc les trois promesses qui le rendent sûr.
//   1. Une réponse ne change qu'UNE ligne, celle de son identifiant (règle 8
//      du suivi), et la laisse bien formée — même un « | » tapé par Xav.
//   2. Une ligne mal formée, une ligne changée depuis son affichage, un geste
//      sans le texte qu'il exige : refusés, rien n'est écrit.
//   3. La file est celle du vrai suivi : bien formée, sans ligne close, les
//      plus anciennes d'abord (décision de Xav) ; et `A_FAIRE.md` la recopie.
// Le vrai suivi est lu, jamais écrit : tout se joue sur des copies en mémoire.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  lireSuivi, fileDeXav, repondre, retablir, genererAFaire, etatPourXav, cellules,
} from '../tools/dettes/suivi.mjs';

const REEL = fs.readFileSync(new URL('../docs/DOC_suivi-dettes.md', import.meta.url), 'utf8');
const DATE = '25/09';

const lignesChangees = (a, b) => {
  const la = a.split('\n');
  const lb = b.split('\n');
  assert.equal(la.length, lb.length, 'une réponse ne crée ni ne retire de ligne');
  return la.map((l, i) => (l === lb[i] ? null : i)).filter((i) => i !== null);
};

// --- 3. La file du vrai suivi ----------------------------------------------
{
  const suivi = lireSuivi(REEL);
  const { file, plusTard } = fileDeXav(suivi);
  assert.ok(file.length > 0, 'la file du vrai suivi n’est pas vide');
  const ids = new Set();
  for (const l of [...file, ...plusTard]) {
    assert.ok(!ids.has(l.id), `${l.id} apparaît deux fois`);
    ids.add(l.id);
    assert.ok(!l.close, `${l.id} est close, elle n'a rien à faire dans la file`);
  }
  for (const l of file) {
    assert.ok(l.bienFormee, `${l.id} attend Xav mais n'a pas le nombre de colonnes de son en-tête : l'outil ne pourrait pas y répondre`);
  }
  for (let i = 1; i < file.length; i += 1) {
    assert.ok(file[i - 1].date <= file[i].date, `les plus anciennes d'abord : ${file[i - 1].id} avant ${file[i].id}`);
  }
  const aFaire = genererAFaire(suivi);
  for (const l of [...file, ...plusTard]) {
    assert.equal(aFaire.split(`**${l.id}**`).length - 1, 1, `A_FAIRE.md cite ${l.id} une fois`);
  }
  console.log(`  la file du vrai suivi : ${file.length} lignes bien formées, triées ; ${plusTard.length} mises de côté`);
}

// --- 1. Une réponse change UNE ligne, et la laisse bien formée ---------------
{
  const { file } = fileDeXav(lireSuivi(REEL));
  const v = file.find((l) => l.prefixe === 'V');
  const q = file.find((l) => l.prefixe === 'Q');

  const rv = repondre(REEL, { id: v.id, empreinte: v.empreinte, geste: 'ok', date: DATE });
  assert.ok(!rv.erreur, rv.erreur);
  const changees = lignesChangees(REEL, rv.texte);
  assert.deepEqual(changees, [v.index], `seule la ligne de ${v.id} change`);
  const vApres = lireSuivi(rv.texte).lignes.find((l) => l.id === v.id);
  assert.ok(vApres.bienFormee);
  assert.equal(vApres.statut, 'validé');
  assert.match(vApres.nomme.Verdict, /Xav, 25\/09 : ok/);
  assert.equal(etatPourXav(vApres), 'hors', 'une validation OK sort de la file');

  // Un « | » tapé par Xav ne crée pas de colonne.
  const rq = repondre(REEL, { id: q.id, empreinte: q.empreinte, geste: 'reponse', texte: 'oui | mais plus tard', date: DATE });
  assert.ok(!rq.erreur, rq.erreur);
  const qApres = lireSuivi(rq.texte).lignes.find((l) => l.id === q.id);
  assert.ok(qApres.bienFormee, 'le « | » de la réponse est échappé');
  assert.match(qApres.nomme['Décision'], /Xav, 25\/09 : « oui \\\| mais plus tard »/);
  assert.equal(qApres.statut, 'tranchée');

  // Annuler rend le texte exact.
  const annule = retablir(rv.texte, { id: v.id, avant: rv.avant, apres: rv.apres });
  assert.equal(annule.texte, REEL, 'annuler rend le suivi octet pour octet');
  console.log('  une réponse ne change que sa ligne, la laisse bien formée, et s’annule exactement');
}

// --- 5. Plus tard, puis reprendre -------------------------------------------
{
  const { file } = fileDeXav(lireSuivi(REEL));
  const l = file[0];
  const r1 = repondre(REEL, { id: l.id, empreinte: l.empreinte, geste: 'plus_tard', date: DATE });
  assert.ok(!r1.erreur, r1.erreur);
  const apres1 = fileDeXav(lireSuivi(r1.texte));
  assert.ok(!apres1.file.some((x) => x.id === l.id) && apres1.plusTard.some((x) => x.id === l.id), '« plus tard » range la ligne dans la pile');
  const tard = apres1.plusTard.find((x) => x.id === l.id);
  const r2 = repondre(r1.texte, { id: l.id, empreinte: tard.empreinte, geste: 'reprendre', date: DATE });
  assert.ok(!r2.erreur, r2.erreur);
  assert.ok(fileDeXav(lireSuivi(r2.texte)).file.some((x) => x.id === l.id), '« reprendre » la remet dans la file');
  assert.equal(r2.texte, REEL, 'et rend la ligne telle qu’elle était');
  console.log('  « plus tard » range la ligne, « reprendre » la rend telle quelle');
}

// --- 2. Les refus -------------------------------------------------------------
{
  const MINI = [
    '## 2. Questions — Xav tranche',
    '| Id | Question | Contexte / ce qui est appliqué par défaut | Bloque | Décision | Statut |',
    '|---|---|---|---|---|---|',
    '| Q-1 | **Une** (20/09) | ctx | — |  | ouvert |',
    '| Q-2 | **Mal formée** (20/09) | ctx | ouvert |',
    '| Q-3 | **Close** | ctx | — | oui | tranchée |',
    '## 5. Dette technique',
    '| Id | Dette | Cause connue / hypothèse | P | Statut |',
    '| D-1 | À Claude | c | P2 | ouvert |',
    '| D-2 | Attend | c | P2 | ouvert (attend Xav) |',
  ].join('\n');
  const s = lireSuivi(MINI);
  const par = (id) => s.lignes.find((l) => l.id === id);
  assert.deepEqual(fileDeXav(s).file.map((l) => l.id).sort(), ['D-2', 'Q-1', 'Q-2'], 'une D- n’entre dans la file que si elle attend Xav ; une close jamais');

  const perimee = repondre(MINI, { id: 'Q-1', empreinte: 'deadbeef', geste: 'ok', date: DATE });
  assert.match(perimee.erreur, /a changé/, 'une ligne changée depuis son affichage est refusée');
  const mal = repondre(MINI, { id: 'Q-2', empreinte: par('Q-2').empreinte, geste: 'ok', date: DATE });
  assert.match(mal.erreur, /mal formée/, 'une ligne mal formée est refusée');
  const sansTexte = repondre(MINI, { id: 'Q-1', empreinte: par('Q-1').empreinte, geste: 'reponse', texte: '  ', date: DATE });
  assert.match(sansTexte.erreur, /texte/, 'répondre sans texte est refusé');
  const close = repondre(MINI, { id: 'Q-3', empreinte: par('Q-3').empreinte, geste: 'ok', date: DATE });
  assert.match(close.erreur, /pas dans la file/, 'une ligne hors de la file ne se répond pas');

  // Une D- qui attendait Xav, une fois répondue, attend Claude.
  const rd = repondre(MINI, { id: 'D-2', empreinte: par('D-2').empreinte, geste: 'reponse', texte: 'la solution B', date: DATE });
  assert.ok(!rd.erreur, rd.erreur);
  assert.equal(etatPourXav(lireSuivi(rd.texte).lignes.find((l) => l.id === 'D-2')), 'hors');

  assert.deepEqual(cellules('| a | b \\| c | d |'), ['a', 'b \\| c', 'd'], 'un pipe échappé reste dans sa cellule');
  console.log('  refusés : ligne périmée, mal formée, hors de la file, geste sans texte');
}

console.log('OK test_outil_dettes');

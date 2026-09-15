// Lance chaque fichier tests/*.js dans un process Node séparé (aucun
// framework de test — patron V1). Sert de confort pour `npm test` ; chaque
// fichier reste par ailleurs exécutable seul via `node tests/<fichier>.js`.
import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const dossierTests = 'tests';
const fichiers = readdirSync(dossierTests)
  .filter((f) => f.startsWith('test_') && f.endsWith('.js'))
  .sort();

let echecs = 0;

for (const fichier of fichiers) {
  const chemin = path.join(dossierTests, fichier);
  const resultat = await new Promise((resolve) => {
    const proc = spawn(process.execPath, [chemin], { stdio: 'inherit' });
    proc.on('close', (code) => resolve(code));
  });
  if (resultat !== 0) {
    echecs++;
    console.error(`ÉCHEC : ${fichier}`);
  }
}

if (echecs > 0) {
  console.error(`\n${echecs} fichier(s) de test en échec sur ${fichiers.length}.`);
  process.exit(1);
} else {
  console.log(`\nTous les tests sont verts (${fichiers.length} fichiers).`);
}

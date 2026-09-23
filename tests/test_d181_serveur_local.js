// `D-181` : le serveur de dev ne sert que ce qui est sous sa racine, et une
// URL mal formée est refusée au lieu d'arrêter le process. L'écoute sur la
// seule boucle locale ne se teste pas sans ouvrir un port : elle se lit dans
// `serveur_local.js` (constante `HOTE`).

import assert from 'node:assert/strict';
import path from 'node:path';
import { resoudreChemin } from '../serveur_local.js';

const racine = path.resolve('/jeu/RPGv2');

assert.equal(resoudreChemin(racine, '/'), path.join(racine, 'index.html'));
assert.equal(resoudreChemin(racine, '/src/main.js?v=2'), path.join(racine, 'src', 'main.js'));
console.log('OK un chemin sous la racine est servi, la requête ignorée');

assert.equal(resoudreChemin(racine, '/../secret.txt'), null);
assert.equal(resoudreChemin(racine, '/%2e%2e/secret.txt'), null);
console.log('OK remonter au-dessus de la racine est refusé');

assert.equal(resoudreChemin(racine, '/../RPGv2x/secret.txt'), null);
console.log('OK un dossier voisin au nom prolongé est refusé');

assert.equal(resoudreChemin(racine, '/%E0'), null);
console.log('OK un % mal formé est refusé, sans lever');

console.log('OK test_d181_serveur_local');

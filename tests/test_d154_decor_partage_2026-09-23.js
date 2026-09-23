// `D-154` — le décor partagé par la Grotte et la Maison (rochers, touffe,
// flaque), redessiné le 23/09.
//
// Contrat : un rocher de DÉCOR ne se lit jamais comme une pierre qu'on RAMASSE.
// Le défaut corrigé par ce ticket n'était pas celui-là (les anciens rochers,
// gris neutre `#6b6b6b`, ressortaient en CLAIR sur le sol sombre de la Grotte,
// mais restaient sous les pierres de la poche) : ce test est un garde-fou pour
// la retouche suivante. Au sol, le joueur ne distingue les deux qu'à la valeur
// (même forme facettée, même famille de gris), donc la facette opaque la plus
// claire d'un rocher de décor reste plus sombre que celle de chaque pierre
// ramassable. Le contrat compare des visuels entre eux ; il n'épingle aucune
// couleur (règle `D-52`) : on peut éclaircir un rocher tant qu'on éclaircit les
// pierres avec.
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['visuels', 'scenes', 'items']);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);

// Luminance relative (WCAG) : c'est la valeur que l'œil compare, pas la teinte.
function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const canal = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

// La pièce la plus claire qui COMPTE : une touche translucide (reflet à 0,6)
// ne donne pas sa valeur à l'objet, un aplat opaque si.
function plusClaire(v) {
  return Math.max(...v.primitives
    .filter((p) => p.couleur && (p.alpha ?? 1) >= 0.7)
    .map((p) => luminance(p.couleur)));
}

const rochersDecor = [...new Set(donnees.scenes
  .flatMap((s) => (s.decor ? s.decor.motifs : []))
  .map((m) => m.visuel)
  .filter((id) => id.startsWith('visuel_rocher_')))];
assert.ok(rochersDecor.length > 0, 'aucun rocher de décor trouvé dans les scènes');

const pierres = donnees.items
  .filter((i) => i.id === 'item_pierre' || i.id === 'item_caillou')
  .map((i) => i.render.visuel);
assert.equal(pierres.length, 2, 'les deux pierres ramassables ont changé d\'id');
const seuil = Math.min(...pierres.map((id) => plusClaire(visuel(id))));

for (const id of rochersDecor) {
  const l = plusClaire(visuel(id));
  assert.ok(l < seuil, `${id} (luminance ${l.toFixed(3)}) aussi clair qu'une pierre ramassable (${seuil.toFixed(3)})`);
}

console.log(`test_d154_decor_partage : ${rochersDecor.length} rochers de décor plus sombres que les pierres ramassables`);

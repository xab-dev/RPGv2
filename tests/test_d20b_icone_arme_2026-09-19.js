// Contrat `D-20` palier B : la case d'attaque dessine l'icône de l'ARME
// ÉQUIPÉE, jamais une main codée dans le HUD. Le dessin lui-même n'est pas
// exercé ici (canvas, contrainte de méthode) : ce test porte sur ce qui est
// vérifiable à froid — la donnée, sa validation au boot, la géométrie de la
// silhouette, la mise à l'échelle, et le fait que le HUD ignore quel visuel
// il dessine.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { boitePrimitive } from '../src/structures.js';
import { TAILLE_REFERENCE_ICONE_ARME_PX, echelleIconeArme } from '../src/ui/hud_layout.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', Object.keys(SCHEMAS));
assert.equal(validerCatalogues(donnees).length, 0, 'les catalogues du dépôt doivent rester valides');
const visuels = new Map(donnees.visuels.map((v) => [v.id, v]));
const armes = new Map(donnees.weapons.map((w) => [w.id, w]));

function boites(visuel) {
  return visuel.primitives.map((p) => boitePrimitive(p));
}
function chevauchement(a, b) {
  return {
    x: Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX),
    y: Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY),
  };
}

// 1. Les mains nues portent une icône, et c'est une entrée de visuels.json.
{
  const mainsNues = armes.get('weapon_mains_nues');
  assert.ok(mainsNues.icone, 'weapon_mains_nues doit déclarer une icône');
  assert.ok(visuels.has(mainsNues.icone), `${mainsNues.icone} doit exister dans visuels.json`);
}

// 2. Une arme SANS icône reste valide : la case se dessine vide, ce n'est pas
// une erreur (exigence du ticket). `weapon_epee_bois` en est le cas réel.
{
  assert.equal(armes.get('weapon_epee_bois').icone, undefined);
  assert.equal(validerCatalogues(donnees).length, 0);
}

// 3. Une icône inconnue est un échec DUR AU BOOT, avec le chemin exact —
// jamais un dessin silencieusement vide, même règle que tout le catalogue.
{
  const casse = {
    ...donnees,
    weapons: donnees.weapons.map((w) => (
      w.id === 'weapon_mains_nues' ? { ...w, icone: 'visuel_inexistant' } : w
    )),
  };
  const erreurs = validerCatalogues(casse).filter((e) => e.includes('visuel_inexistant'));
  assert.equal(erreurs.length, 1, `attendu 1 erreur d'icône, obtenu : ${JSON.stringify(erreurs)}`);
  assert.equal(erreurs[0], 'weapons.json > weapon_mains_nues > icone > "visuel_inexistant" introuvable dans visuels.json');
}

// 4. La silhouette de la main est un assemblage tenant : aucune pièce
// orpheline (même garde-fou data-driven que les 4 stations, cf.
// SD_puits-silhouette) — une pièce isolée à cette taille est illisible.
{
  const main = visuels.get(armes.get('weapon_mains_nues').icone);
  const bs = boites(main);
  assert.ok(bs.length >= 3, `assemblage de primitives attendu, pas une forme unique (${bs.length})`);
  bs.forEach((b, i) => {
    const touche = bs.some((autre, j) => {
      if (i === j) return false;
      const c = chevauchement(b, autre);
      return c.x > 0 && c.y > 0;
    });
    assert.ok(touche, `primitive ${i} (${main.primitives[i].forme}) orpheline`);
  });
}

// 5. L'icône est teintable : la case garde son repère de couleur en jaune
// SANS aplat de fond (défaut `[OUVERT]` du ticket). Une silhouette non
// teintable imposerait de recopier la couleur en données.
{
  const main = visuels.get(armes.get('weapon_mains_nues').icone);
  assert.equal(main.teintable, true);
  assert.ok(main.primitives.some((p) => p.teinte === true), 'au moins une primitive doit suivre la teinte');
}

// 6. La silhouette tient dans sa taille de référence : sans ça, l'échelle
// calculée par le HUD déborderait de la case.
{
  const main = visuels.get(armes.get('weapon_mains_nues').icone);
  const bs = boites(main);
  const largeur = Math.max(...bs.map((b) => b.maxX)) - Math.min(...bs.map((b) => b.minX));
  const hauteur = Math.max(...bs.map((b) => b.maxY)) - Math.min(...bs.map((b) => b.minY));
  assert.ok(largeur <= TAILLE_REFERENCE_ICONE_ARME_PX, `largeur ${largeur} > référence ${TAILLE_REFERENCE_ICONE_ARME_PX}`);
  assert.ok(hauteur <= TAILLE_REFERENCE_ICONE_ARME_PX, `hauteur ${hauteur} > référence ${TAILLE_REFERENCE_ICONE_ARME_PX}`);
}

// 7. `echelleIconeArme` ramène la référence à la taille demandée — c'est le
// seul calcul du palier B qui soit vérifiable à froid.
{
  assert.equal(echelleIconeArme(TAILLE_REFERENCE_ICONE_ARME_PX), 1);
  assert.equal(echelleIconeArme(TAILLE_REFERENCE_ICONE_ARME_PX / 2), 0.5);
}

// 8. Le HUD ne connaît pas le mot « main » : aucun id de visuel en dur dans
// ui/hud.js. Il dessine ce que l'arme équipée lui désigne, et rien d'autre —
// c'est ce qui rendra le palier « symbole de l'arme équipée » gratuit.
{
  // Commentaires retirés : ils ont le droit de NOMMER un visuel pour
  // expliquer d'où vient une échelle ; c'est le code qui ne doit pas le
  // connaître. Vérifier le fichier brut ferait échouer ce test sur une phrase.
  const code = fs.readFileSync('src/ui/hud.js', 'utf8').replace(/\/\/[^\n]*/g, '');
  assert.ok(!code.includes('visuel_'), 'ui/hud.js ne doit citer aucun id de visuels.json');
  assert.ok(!code.includes('weapon_'), 'ui/hud.js ne doit citer aucun id de weapons.json');
}

console.log('OK test_d20b_icone_arme');

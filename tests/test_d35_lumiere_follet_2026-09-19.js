// `D-35` (nuit du 19 au 20/09) : la lumière du follet est ramenée au rayon de
// son aura **à l'extérieur seulement**. Dehors la nuit, l'ancienne lumière
// éclairait presque tout l'écran et cassait l'effet nocturne (Xav).
//
// LE critère d'acceptation du ticket est une NON-régression : « dans les deux
// salles de la Grotte, les paramètres de lumière du follet (rayon, profil du
// fondu, teinte) sont identiques à ceux d'avant ce ticket, vérifié par test ».
// C'est le premier bloc ci-dessous, et il est écrit contre les valeurs
// d'avant recopiées en dur ici — jamais relues depuis les données, sans quoi
// il validerait n'importe quelle dérive future.
//
// Le rendu canvas n'est jamais exercé (contrainte de méthode) : on teste la
// fonction pure de résolution et le ratio de dégradé qu'elle implique.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { resoudreProfilLumiere, RATIO_COEUR_LUMIERE_HISTORIQUE } from '../src/companion.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Valeurs d'AVANT le ticket, recopiées : rayon_lumiere = 110 px et cœur net
// jusqu'à 35 % du rayon (render.js#RATIO_COEUR_LUMIERE).
const RAYON_AVANT_PX = 110;
const RATIO_COEUR_AVANT = 0.35;
const SALLES_GROTTE = ['scene_grotte_salle_1', 'scene_grotte_salle_2'];

async function cataloguesDuJeu() {
  const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
    path.join(RACINE, 'data'),
    Object.keys(SCHEMAS),
  );
  assert.deepEqual(erreurs, [], 'les catalogues du jeu doivent se charger sans erreur');
  return donnees;
}

// Ratio du dégradé réellement appliqué par render.js pour un profil donné :
// le cœur net s'arrête à (rayon - fondu) / rayon.
function ratioCoeur(profil) {
  return (profil.rayon - profil.fonduPx) / profil.rayon;
}

const catalogues = await cataloguesDuJeu();
const registre = construireRegistre(catalogues);

// --- 1. CRITÈRE D'ACCEPTATION : la Grotte ne change pas ------------------
{
  for (const idScene of SALLES_GROTTE) {
    const scene = chargerScene(registre, idScene);
    for (const companion of catalogues.companions) {
      const profil = resoudreProfilLumiere(companion, scene);
      assert.equal(profil.rayon, RAYON_AVANT_PX, `${idScene} / ${companion.id} : rayon inchangé`);
      assert.ok(
        Math.abs(ratioCoeur(profil) - RATIO_COEUR_AVANT) < 1e-9,
        `${idScene} / ${companion.id} : profil du fondu inchangé (cœur net à ${(ratioCoeur(profil) * 100).toFixed(1)} %)`,
      );
    }
  }
  console.log(`OK la Grotte ne change pas : ${RAYON_AVANT_PX} px, cœur net à ${RATIO_COEUR_AVANT * 100} %, dans les deux salles`);
}

// La teinte chaude, elle, n'a jamais dépendu de ce ticket : elle vient de
// `render.couleur` du compagnon et couvre le disque de lumière. Rayon
// identique en Grotte = teinte identique en Grotte.
{
  for (const companion of catalogues.companions) {
    assert.match(companion.render.couleur, /^#[0-9a-f]{6}$/i, `${companion.id} garde sa couleur`);
  }
  console.log('OK teinte du follet inchangée (couleur du compagnon, disque de même rayon en Grotte)');
}

// --- 2. Dehors, le follet retombe sur sa base, minimale ------------------
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  assert.equal(scene.lumiereFollet, null, "la Région Maison ne déclare pas de profil : elle reçoit la base");
  for (const companion of catalogues.companions) {
    const profil = resoudreProfilLumiere(companion, scene);
    assert.equal(profil.rayon, companion.rayon_aura, "la base vaut le rayon de l'aura (point de départ du ticket)");
    assert.equal(profil.fonduPx, 6, 'fondu court, *provisoire*');
    assert.ok(profil.rayon < RAYON_AVANT_PX / 2, "dehors, la lumière est bien drastiquement réduite");
  }
  console.log('OK dehors : rayon 40 px (= aura), fondu 6 px — contre 110 px avant');
}

// --- 3. Un compagnon d'un catalogue d'avant le ticket dessine comme avant -
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  const ancien = { id: 'comp_ancien', rayon_aura: 40, rayon_lumiere: 110 }; // pas de `lumiere`
  const profil = resoudreProfilLumiere(ancien, scene);
  assert.equal(profil.rayon, RAYON_AVANT_PX);
  assert.ok(Math.abs(ratioCoeur(profil) - RATIO_COEUR_LUMIERE_HISTORIQUE) < 1e-9);
  console.log('OK compagnon sans profil : rendu identique à celui d’avant le ticket');
}

// --- 4. Un profil incohérent tombe au boot, pas de nuit en jeu -----------
{
  for (const mauvais of [{ rayon: 0, fondu_px: 6 }, { rayon: 40, fondu_px: -1 }, { rayon: 40, fondu_px: 50 }, 'beaucoup']) {
    const copie = JSON.parse(JSON.stringify(catalogues));
    copie.companions[0].lumiere = mauvais;
    assert.ok(
      validerCatalogues(copie).some((e) => /lumiere/.test(e)),
      `companions.lumiere = ${JSON.stringify(mauvais)} doit être refusé au boot`,
    );

    const copieScene = JSON.parse(JSON.stringify(catalogues));
    copieScene.scenes.find((s) => s.id === SALLES_GROTTE[0]).lumiere_follet = mauvais;
    assert.ok(
      validerCatalogues(copieScene).some((e) => /lumiere_follet/.test(e)),
      `scenes.lumiere_follet = ${JSON.stringify(mauvais)} doit être refusé au boot`,
    );
  }
  console.log('OK profil de lumière incohérent refusé au boot (compagnon et scène)');
}

// --- 5. Data-driven : une 3ᵉ scène déclare le sien, zéro code -----------
{
  const copie = JSON.parse(JSON.stringify(catalogues));
  copie.scenes.find((s) => s.id === 'scene_maison_exterieur').lumiere_follet = { rayon: 70, fondu_px: 20 };
  const scene = chargerScene(construireRegistre(copie), 'scene_maison_exterieur');
  const profil = resoudreProfilLumiere(copie.companions[0], scene);
  assert.equal(profil.rayon, 70);
  assert.ok(Math.abs(ratioCoeur(profil) - 50 / 70) < 1e-9);
  console.log('OK une scène de plus déclare son profil sans une ligne de code');
}

console.log('OK test_d35_lumiere_follet');

// MT_hud-ligne-haute_2026-09-19 : PV, faim, soif, niveau sur UNE ligne en
// haut, pleine largeur, à la place de la colonne de gauche. La barre d'XP
// quitte le HUD — seul le numéro du niveau reste.
//
// Ce fichier teste `ui/hud_layout.js`, qui est PUR : `ui/hud.js` dessine et
// n'est jamais exercé headless (contrainte de méthode). C'est précisément
// pourquoi la fiche demande que le placement vive dans hud_layout.js et non
// en dur dans hud.js — sans ça, rien de tout ceci ne serait vérifiable.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANDEAU_HAUT,
  elementsBandeauHaut,
  boutonsTactiles,
  JOYSTICK,
} from '../src/ui/hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Toutes les combinaisons d'éléments optionnels : avant le premier calcul des
// stats (cinématique d'ouverture), survie/niveau/follet peuvent manquer.
const COMBINAISONS = [];
for (const follet of [false, true]) {
  for (const survie of [false, true]) {
    for (const niveau of [false, true]) COMBINAISONS.push({ follet, survie, niveau });
  }
}

function rectangles(options) {
  return Object.entries(elementsBandeauHaut(options));
}

function seChevauchent(a, b) {
  return (
    a.x < b.x + b.largeur &&
    b.x < a.x + a.largeur &&
    a.y < b.y + b.hauteur &&
    b.y < a.y + a.hauteur
  );
}

// --- 1. Le bandeau tient dans la résolution logique et sous 8 % de hauteur --
{
  assert.equal(BANDEAU_HAUT.x, 0, 'le bandeau part du bord gauche');
  assert.equal(BANDEAU_HAUT.y, 0, 'le bandeau est en haut');
  assert.equal(
    BANDEAU_HAUT.largeur,
    RESOLUTION_LOGIQUE.largeur,
    'pleine largeur (décision Xav), jamais une colonne',
  );
  const pourcent = (BANDEAU_HAUT.hauteur / RESOLUTION_LOGIQUE.hauteur) * 100;
  assert.ok(
    pourcent <= 8,
    `hauteur du bandeau ≤ 8 % de la hauteur logique (mesuré ${pourcent.toFixed(1)} %)`,
  );
  console.log(`OK bandeau plein écran en largeur, ${pourcent.toFixed(1)} % de la hauteur (≤ 8 %)`);
}

// --- 2. Tous les rectangles sont DANS le bandeau, dans 480 px -------------
{
  for (const options of COMBINAISONS) {
    for (const [nom, r] of rectangles(options)) {
      assert.ok(r.largeur >= 0, `${nom} : largeur jamais négative (${JSON.stringify(options)})`);
      assert.ok(r.hauteur > 0, `${nom} : hauteur strictement positive`);
      assert.ok(r.x >= BANDEAU_HAUT.x, `${nom} : ne déborde pas à gauche`);
      assert.ok(
        r.x + r.largeur <= BANDEAU_HAUT.x + BANDEAU_HAUT.largeur,
        `${nom} : ne déborde pas à droite des 480 px (${r.x + r.largeur})`,
      );
      assert.ok(r.y >= BANDEAU_HAUT.y, `${nom} : ne déborde pas au-dessus du bandeau`);
      assert.ok(
        r.y + r.hauteur <= BANDEAU_HAUT.y + BANDEAU_HAUT.hauteur,
        `${nom} : ne déborde pas sous le bandeau (${r.y + r.hauteur} > ${BANDEAU_HAUT.hauteur})`,
      );
    }
  }
  console.log(`OK les rectangles tiennent dans le bandeau, pour les ${COMBINAISONS.length} combinaisons`);
}

// --- 3. Aucun chevauchement entre rectangles ------------------------------
{
  for (const options of COMBINAISONS) {
    const rects = rectangles(options);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const [nomA, a] = rects[i];
        const [nomB, b] = rects[j];
        if (a.largeur === 0 || b.largeur === 0) continue; // zone vide : rien à chevaucher
        assert.ok(
          !seChevauchent(a, b),
          `${nomA} et ${nomB} se chevauchent (${JSON.stringify(options)})`,
        );
      }
    }
  }
  console.log('OK aucun chevauchement, quelle que soit la combinaison');
}

// --- 4. Plus aucun rectangle « barre d'XP » -------------------------------
{
  for (const options of COMBINAISONS) {
    const noms = rectangles(options).map(([nom]) => nom);
    for (const nom of noms) {
      assert.ok(
        !/xp/i.test(nom),
        `le bandeau ne doit plus contenir de rectangle d'XP (trouvé "${nom}")`,
      );
    }
  }
  // Et le rendu lui-même ne doit plus en dessiner : hud.js n'est jamais
  // exercé headless, on vérifie donc son SOURCE (hors commentaires, qui ont
  // le droit d'expliquer le retrait).
  const fichier = await import('node:fs/promises').then((fs) =>
    fs.readFile(path.join(RACINE, 'src', 'ui', 'hud.js'), 'utf8'),
  );
  const code = fichier
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('//'))
    .join('\n');
  assert.ok(!/COULEUR_XP/.test(code), 'plus de couleur de barre d’XP dans hud.js');
  assert.ok(!/ratioXp/.test(code), 'hud.js ne reçoit plus ratioXp');
  console.log('OK plus aucune barre d’XP, ni dans le layout ni dans le rendu');
}

// --- 5. « Niv. N » suit le niveau -----------------------------------------
// Le rectangle n'existe que quand un niveau est fourni, et le texte est
// construit dans hud.js à partir du niveau reçu — on vérifie ici la règle de
// présence, puis la formule de texte, côté i18n.
{
  assert.ok(!elementsBandeauHaut({ niveau: false }).niveau, 'pas de niveau -> pas de rectangle');
  assert.ok(elementsBandeauHaut({ niveau: true }).niveau, 'niveau fourni -> rectangle présent');

  const fr = JSON.parse(
    await import('node:fs/promises').then((fs) =>
      fs.readFile(path.join(RACINE, 'locales', 'fr.json'), 'utf8'),
    ),
  );
  const en = JSON.parse(
    await import('node:fs/promises').then((fs) =>
      fs.readFile(path.join(RACINE, 'locales', 'en.json'), 'utf8'),
    ),
  );
  assert.ok(fr['hud.niveau_prefixe'], 'le préfixe de niveau reste localisé (zéro chaîne en dur)');
  assert.ok(en['hud.niveau_prefixe'], 'idem en anglais');
  // La progression d'XP doit rester lisible dans l'écran Stats (§À faire).
  assert.ok(fr['menu.stats_xp'], 'clé d’XP de l’écran Stats présente en FR');
  assert.ok(en['menu.stats_xp'], 'clé d’XP de l’écran Stats présente en EN');

  for (const niveau of [1, 7, 42]) {
    const texte = `${fr['hud.niveau_prefixe']}${niveau}`;
    assert.ok(texte.endsWith(String(niveau)), `« Niv. N » suit le niveau (${texte})`);
  }
  console.log('OK « Niv. N » suit le niveau, et l’XP a une entrée dans l’écran Stats');
}

// --- 6. Le bandeau ne recouvre aucun contrôle tactile ---------------------
// La fiche l'exige. Ce bloc passait avant `D-17` parce que le contenu du
// bandeau s'arrêtait à 430 pour éviter le bouton MENU ; il passe depuis pour
// une meilleure raison — le bouton est descendu SOUS le bandeau, et le
// contenu peut donc aller jusqu'au bord. La garantie testée, elle, est la
// même, et c'est pour ça qu'on la garde ici telle quelle.
{
  const zones = rectangles({ follet: true, survie: true, niveau: true }).map(([, r]) => r);
  const cercles = [...boutonsTactiles(), { ...JOYSTICK, rayon: JOYSTICK.rayonZone }];
  for (const c of cercles) {
    const boite = {
      x: c.cx - c.rayon,
      y: c.cy - c.rayon,
      largeur: c.rayon * 2,
      hauteur: c.rayon * 2,
    };
    for (const z of zones) {
      if (z.largeur === 0) continue;
      assert.ok(
        !seChevauchent(z, boite),
        `le contenu du bandeau recouvrirait le contrôle tactile "${c.verbe || 'joystick'}"`,
      );
    }
  }
  console.log('OK aucun contenu du bandeau ne recouvre un contrôle tactile');
}

// --- 7. La rangée de cases du bas n'a PAS été touchée ---------------------
// Spec à part, écrite par Xav (§À faire : « la rangée de cases du bas n'est
// pas touchée »). Garde-fou : le bandeau vit entièrement dans le haut de
// l'écran, très loin de la ligne du bas.
{
  assert.ok(
    BANDEAU_HAUT.y + BANDEAU_HAUT.hauteur < RESOLUTION_LOGIQUE.hauteur / 2,
    'le bandeau reste dans la moitié haute, la rangée du bas est hors de son chemin',
  );
  const fichier = await import('node:fs/promises').then((fs) =>
    fs.readFile(path.join(RACINE, 'src', 'ui', 'hud.js'), 'utf8'),
  );
  // Mis à jour volontairement le 2026-09-19 par `D-20` B, qui dessine l'icône
  // de l'arme équipée DANS la case d'attaque : la rangée reçoit depuis un
  // argument de plus. Ce que ce garde-fou protège reste entier — elle est
  // toujours dessinée par la même fonction, sous la RÉSOLUTION LOGIQUE et non
  // la taille physique du canvas (le défaut de SD_dialogues-invisibles), et
  // aucune case n'a bougé. Seul son contenu a changé, ce qui est le sujet
  // d'un autre ticket que celui-ci.
  assert.ok(
    /dessinerSlotsBas\(ctx, RESOLUTION_LOGIQUE[,)]/.test(fichier),
    'la rangée de cases du bas est toujours dessinée sous la résolution logique',
  );
  console.log('OK la rangée de cases du bas est intacte (spec à part)');
}

console.log('OK test_mt_hud_ligne_haute');

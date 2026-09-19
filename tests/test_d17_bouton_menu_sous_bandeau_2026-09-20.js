// `D-17` — le bouton MENU tactile passe SOUS le bandeau.
//
// Verdict de `V-02` (Xav, 19/09) : le bouton était à moitié sur le bandeau
// d'une ligne. Décision verrouillée du 19/09 (`NS_decisions-revue-dettes`,
// § Bandeau HUD) : il descend sous le bandeau, qui redevient libre sur toute
// sa largeur — donc `Nv. N` se cale au bord droit, à **une seule** position,
// la même sur tous les périphériques.
//
// Ce fichier prouve :
//   1. le bouton ne recouvre plus le bandeau, d'un seul pixel ;
//   2. il ne recouvre pas non plus la bannière d'indice de commande, et ce
//      n'est pas une coïncidence de texte court : la preuve est faite avec
//      les VRAIES chaînes des deux locales, à une largeur de caractère
//      volontairement pessimiste ;
//   3. il reste dans l'écran logique, et gros assez pour un pouce ;
//   4. `Nv. N` est collé au bord droit, et la zone des buffs vit entre la
//      soif et lui — elle n'est jamais négative ;
//   5. sur les DEUX gabarits demandés (16:9 et téléphone large), un appui à
//      l'écran sur le bouton l'active, et un appui sur le bandeau ne
//      l'active pas. C'est le vrai chemin : écran -> logique -> hit-test.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  BANDEAU_HAUT, BOUTON_MENU, boutonsTactiles, elementsBandeauHaut,
} from '../src/ui/hud_layout.js';
import { calculerRectanglePresentation, RESOLUTION_LOGIQUE } from '../src/render.js';
import { creerSourceTactile } from '../src/input/touch.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const hautBouton = BOUTON_MENU.cy - BOUTON_MENU.rayon;
const basBouton = BOUTON_MENU.cy + BOUTON_MENU.rayon;
const gaucheBouton = BOUTON_MENU.cx - BOUTON_MENU.rayon;
const droiteBouton = BOUTON_MENU.cx + BOUTON_MENU.rayon;

// --- 1. Plus un pixel sur le bandeau ---------------------------------------
{
  const basBandeau = BANDEAU_HAUT.y + BANDEAU_HAUT.hauteur;
  assert.ok(hautBouton >= basBandeau,
    `le bouton MENU commence à y=${hautBouton}, le bandeau finit à y=${basBandeau}`);
  console.log(`  bouton MENU : y ${hautBouton}..${basBouton}, bandeau 0..${basBandeau} (écart ${hautBouton - basBandeau} px)`);
}

// --- 2. Ni sur la bannière d'indice de commande ----------------------------
// La bannière est centrée horizontalement et sa largeur dépend du texte
// traduit : elle occupe y = 26..44 (hud_hints.js). Le bouton est collé au
// bord droit — ils se croisent en y, jamais en x. Encore faut-il le PROUVER
// avec les vraies chaînes plutôt que de l'espérer.
{
  const Y_BANNIERE = 26;
  const HAUTEUR_BANNIERE = 18;
  const PADDING_X = 8;
  // `hud_hints.js` compose `${glyphe}  ${texte}` en `bold 10px monospace`.
  // Une monospace de 10 px fait environ 6 px de large ; on prend **9**, une
  // marge de 50 %, pour que ce test ne dépende pas de la police du poste.
  const LARGEUR_CAR_PESSIMISTE = 9;

  let contenuLePlusLong = 0;
  for (const langue of ['fr', 'en']) {
    const dict = JSON.parse(fs.readFileSync(path.join(RACINE, 'locales', `${langue}.json`), 'utf8'));
    const glyphes = Object.entries(dict).filter(([k]) => k.startsWith('glyphe.')).map(([, v]) => v.length);
    const textes = Object.entries(dict).filter(([k]) => k.startsWith('hint.') || k.startsWith('indice.')).map(([, v]) => v.length);
    const maxGlyphe = Math.max(0, ...glyphes);
    const maxTexte = Math.max(0, ...textes);
    contenuLePlusLong = Math.max(contenuLePlusLong, maxGlyphe + 2 + maxTexte);
  }
  const largeurBanniere = contenuLePlusLong * LARGEUR_CAR_PESSIMISTE + PADDING_X * 2;
  const droiteBanniere = (RESOLUTION_LOGIQUE.largeur + largeurBanniere) / 2;

  const seCroisentEnY = hautBouton < Y_BANNIERE + HAUTEUR_BANNIERE && basBouton > Y_BANNIERE;
  if (seCroisentEnY) {
    assert.ok(droiteBanniere < gaucheBouton,
      `la bannière d'indice va jusqu'à x=${droiteBanniere.toFixed(0)}, le bouton commence à x=${gaucheBouton}`);
    console.log(`  indice : bannière au pire jusqu'à x=${droiteBanniere.toFixed(0)}, bouton à partir de x=${gaucheBouton} (${(gaucheBouton - droiteBanniere).toFixed(0)} px de marge)`);
  } else {
    console.log('  indice : aucun recouvrement possible, les bandes en y sont disjointes');
  }
}

// --- 3. Dans l'écran, et assez gros pour un pouce --------------------------
{
  assert.ok(gaucheBouton >= 0 && droiteBouton <= RESOLUTION_LOGIQUE.largeur,
    `le bouton doit rester dans l'écran (x ${gaucheBouton}..${droiteBouton})`);
  assert.ok(basBouton <= RESOLUTION_LOGIQUE.hauteur, 'le bouton doit rester dans l’écran (y)');
  // P4① : >= 48 px écran. L'échelle entière est toujours >= 1, donc un rayon
  // logique de 16 donne au moins 32 px de diamètre... à l'échelle 1. Le jeu
  // tourne au minimum à l'échelle 3 sur l'A04 (cf. `D-30`), soit 96 px.
  assert.ok(BOUTON_MENU.rayon >= 16, 'le bouton MENU garde au moins son rayon d’avant');
}

// --- 4. `Nv. N` collé au bord droit, buffs entre la soif et lui ------------
// C'est l'autre moitié de `D-17` : le bandeau étant libre sur toute sa
// largeur, le niveau a une position unique, la même partout.
{
  const complet = elementsBandeauHaut({ follet: true, survie: true, niveau: true });
  const droiteNiveau = complet.niveau.x + complet.niveau.largeur;
  assert.ok(droiteNiveau <= BANDEAU_HAUT.largeur,
    `le niveau déborde de l'écran (finit à ${droiteNiveau})`);
  assert.ok(BANDEAU_HAUT.largeur - droiteNiveau <= 6,
    `le niveau doit être collé au bord droit (il finit à ${droiteNiveau} sur ${BANDEAU_HAUT.largeur})`);

  // La zone des buffs s'arrête avant le niveau et ne l'écrase jamais.
  assert.ok(complet.buffs.largeur >= 0, 'la zone des buffs n’est jamais négative');
  assert.ok(complet.buffs.x + complet.buffs.largeur <= complet.niveau.x,
    'la zone des buffs doit s’arrêter avant le niveau');
  assert.ok(complet.buffs.x >= complet.soif.x + complet.soif.largeur,
    'la zone des buffs doit commencer après la soif');
  console.log(`  bandeau : buffs x ${complet.buffs.x}..${complet.buffs.x + complet.buffs.largeur}, niveau x ${complet.niveau.x}..${droiteNiveau} (bord droit ${BANDEAU_HAUT.largeur})`);

  // Le niveau garde sa position quand les éléments optionnels manquent :
  // c'est tout l'intérêt de le coller au bord ("une seule position").
  const minimal = elementsBandeauHaut({ niveau: true });
  assert.equal(minimal.niveau.x, complet.niveau.x,
    'le niveau doit être à la MÊME position avec ou sans follet/survie');

  // Et sans niveau, la zone des buffs récupère la place, sans déborder.
  const sansNiveau = elementsBandeauHaut({ follet: true, survie: true });
  assert.ok(sansNiveau.buffs.x + sansNiveau.buffs.largeur <= BANDEAU_HAUT.largeur,
    'sans niveau, les buffs ne débordent pas de l’écran');
  assert.ok(sansNiveau.buffs.largeur > complet.buffs.largeur,
    'sans niveau, les buffs récupèrent la place');
}

// --- 5. Le vrai chemin : appui écran -> logique -> hit-test ----------------
// Sur les deux gabarits demandés. C'est ce qui prouve que la zone d'appui a
// suivi le dessin : `touch.js` lit `boutonsTactiles()`, donc il n'existe
// qu'UNE source de vérité — ce test le vérifie plutôt que de le supposer.
{
  const GABARITS = [
    { nom: '16:9 (1920x1080)', l: 1920, h: 1080 },
    { nom: 'téléphone large (2340x1080, ~19,5:9)', l: 2340, h: 1080 },
  ];

  for (const g of GABARITS) {
    const rect = calculerRectanglePresentation(g.l, g.h);
    const versLogique = (clientX, clientY) => ({
      x: (clientX - rect.x) / rect.echelle,
      y: (clientY - rect.y) / rect.echelle,
    });
    const versEcran = (lx, ly) => ({ x: lx * rect.echelle + rect.x, y: ly * rect.echelle + rect.y });

    const cible = { ecouteurs: {}, addEventListener(n, f) { this.ecouteurs[n] = f; } };
    const tactile = creerSourceTactile(cible, { versLogique });

    const toucher = (lx, ly) => {
      const p = versEcran(lx, ly);
      cible.ecouteurs.touchstart({ touches: [{ identifier: 1, clientX: p.x, clientY: p.y }] });
      const etat = tactile.instantane();
      cible.ecouteurs.touchend({ touches: [] });
      return etat;
    };

    // a) au centre du bouton : MENU s'active
    assert.equal(toucher(BOUTON_MENU.cx, BOUTON_MENU.cy).menu, true,
      `${g.nom} : un appui au centre du bouton doit activer MENU`);

    // b) sur le bandeau, juste au-dessus du bouton : MENU ne s'active PAS.
    //    C'est exactement le défaut que `V-02` a relevé.
    assert.equal(toucher(BOUTON_MENU.cx, BANDEAU_HAUT.hauteur / 2).menu, false,
      `${g.nom} : un appui sur le bandeau ne doit PAS activer MENU`);

    // c) au coin haut-droit (là où le bouton était avant) : plus rien.
    assert.equal(toucher(455, 10).menu, false,
      `${g.nom} : l'ancienne position du bouton ne doit plus rien déclencher`);

    console.log(`  ${g.nom} : échelle ${rect.echelle}, appui bouton OK, appui bandeau inerte`);
  }
}

console.log('OK test_d17_bouton_menu_sous_bandeau');

// Rendu HUD en résolution logique (§3.9, repris §4 du diagnostic
// SD_ui-lisibilite_2026-09-15.md — cartouche compact, patron V1). Jamais
// exercé par les tests headless (dessin canvas — contrainte de méthode).
// Sur tactile, les boutons d'action SONT les slots : un seul jeu de cercles
// dessiné ici, jamais un second HUD indépendant du layout tactile
// (hud_layout.js) — et jamais les deux affichages de slots à la fois (§4 :
// la ligne du bas ne se dessine que quand le tactile est inactif).

import { boutonsTactiles, JOYSTICK } from './hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../render.js';
import { dessinerVisuel, TAILLE_REFERENCE_FOLLET_PX } from '../visuels.js';

// Taille de l'icône follet dans le cartouche HUD (px logiques) — inchangée
// depuis avant 03_grotte-polish, désormais une échelle de visuel_follet_*
// plutôt qu'un dessin dédié (§3.3 : une seule fonction de rendu).
const TAILLE_ICONE_FOLLET = 6;

const COULEUR_PV_FOND = '#3a1414';
const COULEUR_PV = '#c23a3a';
const COULEUR_SLOT_ACTIF = '#c2a83e';
const COULEUR_SLOT_GRISE = 'rgba(255,255,255,0.15)';

// Jauges faim/soif (Palier C, specs/04_maison-interieur.md §3.3/hud_layout) :
// icônes distinctes PAR FORME (P4② — jamais la couleur seule), un triangle
// (faim, pain/blé stylisé) et une goutte (soif), jamais deux disques
// identiques repeints d'une autre couleur.
const COULEUR_JAUGE_FOND = '#1a1a1a';
const COULEUR_FAIM = '#c2a83e';
const COULEUR_SOIF = '#3a7dc2';
const JAUGE_LARGEUR = 40;
const JAUGE_HAUTEUR = 6;
const JAUGE_ICONE_TAILLE = 6;
const COULEUR_XP = '#4a9d5f';

// Cartouche haut-gauche (§4, valeurs V1) : un seul endroit pour ses
// dimensions, jamais dispersées ailleurs dans ce fichier.
const CARTOUCHE_X = 6;
const CARTOUCHE_Y = 6;
const CARTOUCHE_LARGEUR = 120; // <= 15% de 480 (résolution logique validée)
const CARTOUCHE_HAUTEUR = 46;
const CARTOUCHE_PADDING = 6;
const CARTOUCHE_RAYON = 4;
const BARRE_PV_HAUTEUR = 12;

// 5 slots d'action (1 attaque + 3 skills + 1 consommable, §0 verrouillé) en
// bas au centre, visibles seulement hors tactile (§3.9/§4 : sur tactile, les
// boutons de hud_layout.js sont déjà les slots).
const ORDRE_SLOTS_BAS = ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume'];
const SLOT_TAILLE = 16;
const SLOT_ECART = 4;

function dessinerRectangleArrondi(ctx, x, y, largeur, hauteur, rayon) {
  ctx.beginPath();
  ctx.moveTo(x + rayon, y);
  ctx.arcTo(x + largeur, y, x + largeur, y + hauteur, rayon);
  ctx.arcTo(x + largeur, y + hauteur, x, y + hauteur, rayon);
  ctx.arcTo(x, y + hauteur, x, y, rayon);
  ctx.arcTo(x, y, x + largeur, y, rayon);
  ctx.closePath();
}

function dessinerBoutonsTactiles(ctx) {
  for (const bouton of boutonsTactiles()) {
    ctx.beginPath();
    ctx.arc(bouton.cx, bouton.cy, bouton.rayon, 0, Math.PI * 2);
    ctx.fillStyle = bouton.verbe === 'attack' ? COULEUR_SLOT_ACTIF : COULEUR_SLOT_GRISE;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(JOYSTICK.cx, JOYSTICK.cy, JOYSTICK.rayonZone, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
}

// Ligne statique en bas au centre (§4), même liste de verbes que les boutons
// tactiles mais jamais leurs positions (celles-ci n'ont de sens qu'au doigt).
function dessinerSlotsBas(ctx, resolution) {
  const largeurTotale = ORDRE_SLOTS_BAS.length * SLOT_TAILLE + (ORDRE_SLOTS_BAS.length - 1) * SLOT_ECART;
  const xDepart = (resolution.largeur - largeurTotale) / 2;
  const y = resolution.hauteur - SLOT_TAILLE - 8;

  ORDRE_SLOTS_BAS.forEach((verbe, i) => {
    const x = xDepart + i * (SLOT_TAILLE + SLOT_ECART);
    ctx.fillStyle = verbe === 'attack' ? COULEUR_SLOT_ACTIF : COULEUR_SLOT_GRISE;
    ctx.fillRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
    ctx.strokeStyle = verbe === 'attack' ? '#ffffff' : 'rgba(255,255,255,0.4)';
    ctx.strokeRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
  });
}

// Triangle (faim, forme distincte du disque PV/de la goutte soif) — pointe
// vers le haut, centré sur (x, y).
function dessinerIconeFaim(ctx, x, y, taille) {
  ctx.beginPath();
  ctx.moveTo(x, y - taille / 2);
  ctx.lineTo(x + taille / 2, y + taille / 2);
  ctx.lineTo(x - taille / 2, y + taille / 2);
  ctx.closePath();
  ctx.fillStyle = COULEUR_FAIM;
  ctx.fill();
}

// Goutte (soif) — cercle + pointe, forme distincte du triangle ci-dessus.
function dessinerIconeSoif(ctx, x, y, taille) {
  const r = taille / 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.quadraticCurveTo(x + r, y, x, y + r);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.4);
  ctx.closePath();
  ctx.fillStyle = COULEUR_SOIF;
  ctx.fill();
}

// Une jauge = icône (forme) + barre de fond/remplissage — même patron que la
// barre de PV (fond sombre, remplissage proportionnel, contour), réutilisé
// pour faim ET soif plutôt que dupliqué.
function dessinerJauge(ctx, x, y, ratio, couleur, dessinerIcone) {
  dessinerIcone(ctx, x + JAUGE_ICONE_TAILLE / 2, y + JAUGE_HAUTEUR / 2, JAUGE_ICONE_TAILLE);
  const barreX = x + JAUGE_ICONE_TAILLE + 4;
  ctx.fillStyle = COULEUR_JAUGE_FOND;
  ctx.fillRect(barreX, y, JAUGE_LARGEUR, JAUGE_HAUTEUR);
  ctx.fillStyle = couleur;
  ctx.fillRect(barreX, y, JAUGE_LARGEUR * Math.max(0, Math.min(1, ratio)), JAUGE_HAUTEUR);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(barreX, y, JAUGE_LARGEUR, JAUGE_HAUTEUR);
}

export function dessinerHud(ctx, {
  i18n, pv, pvMax, eclats, companion, visuelFollet, tactileActif,
  survie = null, niveau = null, ratioXp = 0,
}) {
  ctx.save();

  dessinerRectangleArrondi(ctx, CARTOUCHE_X, CARTOUCHE_Y, CARTOUCHE_LARGEUR, CARTOUCHE_HAUTEUR, CARTOUCHE_RAYON);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();

  const contenuX = CARTOUCHE_X + CARTOUCHE_PADDING;
  let ligneY = CARTOUCHE_Y + CARTOUCHE_PADDING;

  // Forme du follet actif en tête de la ligne PV (§4 : remplace l'icône
  // isolée d'avant ce diagnostic, jamais un carré jaune flottant sous le
  // HUD) — même silhouette que l'écran de choix et la scène (§3.3 de
  // 03_grotte-polish : dessinerVisuel, une seule fonction de rendu, jamais
  // une 2ᵉ dessinée "à peu près" pareil ici), juste mise à l'échelle plus
  // petite. Accessibilité P4② (la forme porte l'élément, jamais la couleur
  // seule) inchangée.
  let barreX = contenuX;
  if (companion && visuelFollet) {
    dessinerVisuel(ctx, visuelFollet, contenuX + 6, ligneY + BARRE_PV_HAUTEUR / 2, {
      teinte: companion.render.couleur,
      echelle: TAILLE_ICONE_FOLLET / TAILLE_REFERENCE_FOLLET_PX,
    });
    barreX += 16;
  }

  const barreLargeur = CARTOUCHE_X + CARTOUCHE_LARGEUR - CARTOUCHE_PADDING - barreX;
  ctx.fillStyle = COULEUR_PV_FOND;
  ctx.fillRect(barreX, ligneY, barreLargeur, BARRE_PV_HAUTEUR);
  const ratio = pvMax > 0 ? Math.max(0, Math.min(1, pv / pvMax)) : 0;
  ctx.fillStyle = COULEUR_PV;
  ctx.fillRect(barreX, ligneY, barreLargeur * ratio, BARRE_PV_HAUTEUR);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(barreX, ligneY, barreLargeur, BARRE_PV_HAUTEUR);

  // Valeur PV centrée DANS la barre (§4, patron V1) — jamais à côté.
  ctx.font = '9px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(pv)}/${Math.ceil(pvMax)}`, barreX + barreLargeur / 2, ligneY + BARRE_PV_HAUTEUR / 2 + 1);

  ligneY += BARRE_PV_HAUTEUR + 6;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '10px monospace';
  ctx.fillText(`◆ ${eclats}`, contenuX, ligneY);

  ctx.restore();

  // Cartouche survie/niveau (Palier C/D, specs/04_maison-interieur.md
  // §3.9/hud_layout) : panneau SÉPARÉ sous le cartouche PV/éclats plutôt
  // qu'agrandi à l'intérieur (§4 : discret, jamais une injonction) — évite
  // de retoucher les dimensions déjà validées du premier cartouche.
  // `survie`/`niveau` restent optionnels : avant le premier calcul de
  // stats (cinématique d'ouverture), rien à afficher.
  if (survie || niveau != null) {
    const y2 = CARTOUCHE_Y + CARTOUCHE_HAUTEUR + 4;
    const hauteur2 = (survie ? JAUGE_HAUTEUR * 2 + 4 : 0) + (niveau != null ? 14 : 0) + CARTOUCHE_PADDING;
    ctx.save();
    dessinerRectangleArrondi(ctx, CARTOUCHE_X, y2, CARTOUCHE_LARGEUR, hauteur2, CARTOUCHE_RAYON);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    let ligne2Y = y2 + CARTOUCHE_PADDING / 2;
    if (survie) {
      // Cause racine (SD_phase3-stations-pv-jauges_2026-09-17.md, sujet 3) :
      // `save.survie` porte les clés de survival.json (`jauge_faim`/
      // `jauge_soif`, cf. save.js/survival.js), jamais `faim`/`soif` — ce
      // calque lisait les mauvaises clés (toujours `undefined`, jauge
      // toujours grise) alors que la décroissance elle-même tournait
      // correctement (prouvé par test_phase3_survival, déjà vert).
      dessinerJauge(ctx, contenuX, ligne2Y, survie.jauge_faim, COULEUR_FAIM, dessinerIconeFaim);
      ligne2Y += JAUGE_HAUTEUR + 2;
      dessinerJauge(ctx, contenuX, ligne2Y, survie.jauge_soif, COULEUR_SOIF, dessinerIconeSoif);
      ligne2Y += JAUGE_HAUTEUR + 4;
    }
    if (niveau != null) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '9px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${i18n.t('hud.niveau_prefixe')}${niveau}`, contenuX, ligne2Y);
      const barreXpX = contenuX + 26;
      const barreXpLargeur = CARTOUCHE_X + CARTOUCHE_LARGEUR - CARTOUCHE_PADDING - barreXpX;
      ctx.fillStyle = COULEUR_JAUGE_FOND;
      ctx.fillRect(barreXpX, ligne2Y + 2, barreXpLargeur, 4);
      ctx.fillStyle = COULEUR_XP;
      ctx.fillRect(barreXpX, ligne2Y + 2, barreXpLargeur * Math.max(0, Math.min(1, ratioXp)), 4);
    }
    ctx.restore();
  }

  // §4 : jamais les deux à la fois. Sur tactile, les boutons SONT les slots.
  if (tactileActif) {
    dessinerBoutonsTactiles(ctx);
  } else {
    // Diagnostic SD_dialogues-invisibles_2026-09-15 : même défaut que
    // dialogue_box.js — `ctx.canvas.width/height` est la taille PHYSIQUE
    // depuis le MT rendu-net, jamais la résolution logique sous laquelle ce
    // dessin est réellement placé (transform f encore active).
    dessinerSlotsBas(ctx, RESOLUTION_LOGIQUE);
  }
}

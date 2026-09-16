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

export function dessinerHud(ctx, { pv, pvMax, eclats, companion, visuelFollet, tactileActif }) {
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

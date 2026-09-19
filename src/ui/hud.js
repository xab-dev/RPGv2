// Rendu HUD en résolution logique (§3.9, repris §4 du diagnostic
// SD_ui-lisibilite_2026-09-15.md — cartouche compact, patron V1). Jamais
// exercé par les tests headless (dessin canvas — contrainte de méthode).
// Sur tactile, les boutons d'action SONT les slots : un seul jeu de cercles
// dessiné ici, jamais un second HUD indépendant du layout tactile
// (hud_layout.js) — et jamais les deux affichages de slots à la fois (§4 :
// la ligne du bas ne se dessine que quand le tactile est inactif).

import {
  boutonsTactiles, JOYSTICK, BANDEAU_HAUT, elementsBandeauHaut, echelleIconeArme,
} from './hud_layout.js';
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
// MT_hud-ligne-haute_2026-09-19 : COULEUR_XP et tout le cartouche
// haut-gauche (CARTOUCHE_X/Y/LARGEUR/HAUTEUR/PADDING/RAYON, BARRE_PV_HAUTEUR)
// ont disparu avec la colonne de gauche — la barre d'XP quitte le HUD
// (décision Xav : seul le numéro du niveau reste, la progression reste
// lisible dans l'écran Stats) et tout le placement vit désormais dans
// hud_layout.js#elementsBandeauHaut, pur et testable.

// Éclat bref sur « Niv. N » à la montée de niveau (§À faire : « la montée de
// niveau garde un retour, pas de nouveau son »). Le compte à rebours est
// tenu par main.js (même patron que `flashMs` sur un monstre touché) ; ici on
// ne reçoit qu'un ratio 0..1 déjà calculé.
const COULEUR_ECLAT_NIVEAU = '#ffe9a8';

// 5 slots d'action (1 attaque + 3 skills + 1 consommable, §0 verrouillé) en
// bas au centre, visibles seulement hors tactile (§3.9/§4 : sur tactile, les
// boutons de hud_layout.js sont déjà les slots).
const ORDRE_SLOTS_BAS = ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume'];
const SLOT_TAILLE = 16;
const SLOT_ECART = 4;

// Part de la case (ou du rayon du bouton tactile) occupée par l'icône —
// provisoires, à régler au ressenti : l'icône doit respirer dans sa case sans
// s'y perdre. Exprimées en FRACTION et non en px, pour que la case tactile
// (rayon 28) et la case du bas (16 px de côté) restent d'accord sans deux
// réglages à tenir.
const ICONE_PART_DE_LA_CASE = 0.72;
const ICONE_PART_DU_BOUTON = 1.15;

// D-20 B : la case d'attaque dessine l'icône de l'ARME ÉQUIPÉE, résolue par
// main.js (qui a le registre) et reçue ici comme une simple entrée de visuel
// — ce module ignore qu'il s'agit d'une main, et dessinera le symbole d'une
// épée ou d'un arc sans une ligne de plus. `null` (arme sans icône) = case
// vide, jamais une erreur : c'est un cas normal, pas une donnée manquante.
function dessinerIconeArme(ctx, visuelArme, cx, cy, taille) {
  if (!visuelArme) return;
  dessinerVisuel(ctx, visuelArme, cx, cy, {
    teinte: COULEUR_SLOT_ACTIF,
    echelle: echelleIconeArme(taille),
  });
}

function dessinerBoutonsTactiles(ctx, visuelArme) {
  for (const bouton of boutonsTactiles()) {
    ctx.beginPath();
    ctx.arc(bouton.cx, bouton.cy, bouton.rayon, 0, Math.PI * 2);
    // `[OUVERT]` D-20 B : plus d'aplat jaune sur l'attaque — fond identique
    // aux autres cases, c'est l'ICÔNE qui porte le jaune. On garde le repère
    // de couleur sans le pavé, qui écrasait la silhouette.
    ctx.fillStyle = COULEUR_SLOT_GRISE;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
    if (bouton.verbe === 'attack') {
      dessinerIconeArme(ctx, visuelArme, bouton.cx, bouton.cy, bouton.rayon * ICONE_PART_DU_BOUTON);
    }
  }

  ctx.beginPath();
  ctx.arc(JOYSTICK.cx, JOYSTICK.cy, JOYSTICK.rayonZone, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
}

// Ligne statique en bas au centre (§4), même liste de verbes que les boutons
// tactiles mais jamais leurs positions (celles-ci n'ont de sens qu'au doigt).
function dessinerSlotsBas(ctx, resolution, visuelArme) {
  const largeurTotale = ORDRE_SLOTS_BAS.length * SLOT_TAILLE + (ORDRE_SLOTS_BAS.length - 1) * SLOT_ECART;
  const xDepart = (resolution.largeur - largeurTotale) / 2;
  const y = resolution.hauteur - SLOT_TAILLE - 8;

  ORDRE_SLOTS_BAS.forEach((verbe, i) => {
    const x = xDepart + i * (SLOT_TAILLE + SLOT_ECART);
    // Même `[OUVERT]` que les boutons tactiles : fond commun, jaune porté par
    // l'icône. Le contour de l'attaque reste plus vif — c'est le seul slot
    // actif, et ça ne dépend pas de l'arme.
    ctx.fillStyle = COULEUR_SLOT_GRISE;
    ctx.fillRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
    ctx.strokeStyle = verbe === 'attack' ? '#ffffff' : 'rgba(255,255,255,0.4)';
    ctx.strokeRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
    if (verbe === 'attack') {
      dessinerIconeArme(ctx, visuelArme, x + SLOT_TAILLE / 2, y + SLOT_TAILLE / 2, SLOT_TAILLE * ICONE_PART_DE_LA_CASE);
    }
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
  visuelArme = null, survie = null, niveau = null, eclatNiveau = 0,
}) {
  ctx.save();

  // MT_hud-ligne-haute_2026-09-19 : UNE ligne en haut, pleine largeur, à la
  // place des deux cartouches de la colonne de gauche. Depuis `D-17` (le
  // bouton MENU tactile est descendu sous le bandeau), le CONTENU va lui
  // aussi jusqu'au bord : `Nv. N` y est ancré, à une seule position.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(BANDEAU_HAUT.x, BANDEAU_HAUT.y, BANDEAU_HAUT.largeur, BANDEAU_HAUT.hauteur);

  // `survie`/`niveau` restent optionnels : avant le premier calcul des stats
  // (cinématique d'ouverture), il n'y a rien à afficher — la ligne se
  // resserre alors, elle ne laisse pas de trou.
  const zones = elementsBandeauHaut({
    follet: Boolean(companion && visuelFollet),
    survie: Boolean(survie),
    niveau: niveau != null,
  });

  // Forme du follet actif en tête de ligne — même silhouette que l'écran de
  // choix et la scène (§3.3 de 03_grotte-polish : dessinerVisuel, une seule
  // fonction de rendu), juste mise à l'échelle plus petite. Accessibilité
  // P4② (la forme porte l'élément, jamais la couleur seule) inchangée.
  if (zones.follet) {
    dessinerVisuel(
      ctx,
      visuelFollet,
      zones.follet.x + zones.follet.largeur / 2,
      zones.follet.y + zones.follet.hauteur / 2,
      { teinte: companion.render.couleur, echelle: TAILLE_ICONE_FOLLET / TAILLE_REFERENCE_FOLLET_PX },
    );
  }

  // PV : barre + valeur centrée DEDANS (patron V1 conservé, jamais à côté).
  const b = zones.pv;
  ctx.fillStyle = COULEUR_PV_FOND;
  ctx.fillRect(b.x, b.y, b.largeur, b.hauteur);
  const ratio = pvMax > 0 ? Math.max(0, Math.min(1, pv / pvMax)) : 0;
  ctx.fillStyle = COULEUR_PV;
  ctx.fillRect(b.x, b.y, b.largeur * ratio, b.hauteur);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(b.x, b.y, b.largeur, b.hauteur);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(pv)}/${Math.ceil(pvMax)}`, b.x + b.largeur / 2, b.y + b.hauteur / 2 + 1);

  // Éclats : le losange porte le sens, pas la couleur (P4②).
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '9px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`◆ ${eclats}`, zones.eclats.x, zones.eclats.y + zones.eclats.hauteur / 2);

  if (survie) {
    // Cause racine (SD_phase3-stations-pv-jauges_2026-09-17.md, sujet 3) :
    // `save.survie` porte les clés de survival.json (`jauge_faim`/
    // `jauge_soif`, cf. save.js/survival.js), jamais `faim`/`soif`.
    dessinerJauge(ctx, zones.faim.x, zones.faim.y, survie.jauge_faim, COULEUR_FAIM, dessinerIconeFaim);
    dessinerJauge(ctx, zones.soif.x, zones.soif.y, survie.jauge_soif, COULEUR_SOIF, dessinerIconeSoif);
  }

  if (zones.niveau) {
    // Éclat bref à la montée de niveau : le texte vire vers l'or puis revient
    // au blanc. Aucun son (§À faire), aucun état tenu ici — `eclatNiveau` est
    // un ratio 0..1 fourni par main.js.
    const intensite = Math.max(0, Math.min(1, eclatNiveau));
    // `D-17` : aligné à DROITE, sur le bord droit de sa zone. La zone est
    // désormais ancrée au bord de l'écran (hud_layout.js), mais un texte
    // aligné à gauche dedans flotterait quand même : « Nv.7 » laisserait un
    // trou que « Nv.50 » n'a pas. Aligné à droite, le nombre grandit vers la
    // gauche et le bord droit ne bouge jamais — c'est ce que « collé au bord
    // droit » veut dire.
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '9px monospace';
    ctx.fillStyle = intensite > 0 ? COULEUR_ECLAT_NIVEAU : '#fff';
    ctx.fillText(
      `${i18n.t('hud.niveau_prefixe')}${niveau}`,
      zones.niveau.x + zones.niveau.largeur,
      zones.niveau.y + zones.niveau.hauteur / 2,
    );
  }

  ctx.restore();

  // §4 : jamais les deux à la fois. Sur tactile, les boutons SONT les slots.
  if (tactileActif) {
    dessinerBoutonsTactiles(ctx, visuelArme);
  } else {
    // Diagnostic SD_dialogues-invisibles_2026-09-15 : même défaut que
    // dialogue_box.js — `ctx.canvas.width/height` est la taille PHYSIQUE
    // depuis le MT rendu-net, jamais la résolution logique sous laquelle ce
    // dessin est réellement placé (transform f encore active).
    dessinerSlotsBas(ctx, RESOLUTION_LOGIQUE, visuelArme);
  }
}

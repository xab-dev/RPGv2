// Rendu HUD en résolution logique (§3.9, repris §4 du diagnostic
// SD_ui-lisibilite_2026-09-15.md — cartouche compact, patron V1). Jamais
// exercé par les tests headless (dessin canvas — contrainte de méthode).
// Sur tactile, les boutons d'action SONT les slots : un seul jeu de cercles
// dessiné ici, jamais un second HUD indépendant du layout tactile
// (hud_layout.js) — et jamais les deux affichages de slots à la fois (§4 :
// la ligne du bas ne se dessine que quand le tactile est inactif).

import {
  boutonsTactilesVisibles, JOYSTICK, BANDEAU_HAUT, elementsBandeauHaut, echelleIconeArme,
  placerIconesBuffs, alphaPulsationBuff, echelleIconeBuff, ICONE_BUFF, echelleIconeBandeau,
  ICONE_BOUTON_TACTILE, echelleIconeBoutonTactile, ICONE_CIBLE_TACTILE, BARRE_BOSS,
} from './hud_layout.js';
import { cadrer } from './icone_canvas.js';
import { RESOLUTION_LOGIQUE } from '../render.js';
import { dessinerVisuel, TAILLE_REFERENCE_FOLLET_PX } from '../visuels.js';
import { dessinerBarre, PALETTE_JAUGES } from './barre.js';
import { POLICE_CALLIGRAPHIE, POLICE_CHIFFRES } from '../polices.js';

// Taille de l'icône follet dans le cartouche HUD (px logiques) — inchangée
// depuis avant 03_grotte-polish, désormais une échelle de visuel_follet_*
// plutôt qu'un dessin dédié (§3.3 : une seule fonction de rendu).
const TAILLE_ICONE_FOLLET = 6;

// Polish libre du 24/09 : les nombres du bandeau quittent le `monospace`, qui
// donnait au jeu l'air d'une console de débogage. Deux essais avaient échoué
// (P3) : la calligraphie et l'onciale n'ont que des chiffres bas de casse.
// Les chiffres alignés empruntés à l'appareil (`POLICE_CHIFFRES`) règlent ce
// point ; les lettres (« Nv. ») restent à la plume du reste du jeu. Aucun
// texte du bandeau n'a besoin d'une chasse fixe : PV centrés, éclats alignés
// à gauche, niveau aligné à droite (`D-17`) — rien ne se cale sur la largeur
// d'un caractère.
const policeBandeau = (px) => `${px}px "${POLICE_CHIFFRES}", "${POLICE_CALLIGRAPHIE}", serif`;

// Contour de la case d'attaque tant qu'aucun follet n'est choisi. Dès qu'il
// l'est, la case prend SA couleur (`companion.render.couleur`, celle de son
// icône en tête de bandeau) : l'arme frappe avec le follet, la case le dit
// (demande de Xav, 23/09, `D-175` — la couleur seule, rien d'autre ne bouge).
const COULEUR_SLOT_ACTIF = '#c2a83e';

// `D-99` — la case d'action. Le blanc translucide d'avant prenait la couleur
// de ce qu'il y avait derrière : sur la terre de la Maison, les cases
// viraient au beige et l'icône s'y noyait. Un fond SOMBRE tient sur
// n'importe quel décor, de jour comme de nuit — c'est le même raisonnement
// que le bandeau du haut, qui est sombre depuis toujours.
const COULEUR_SLOT_FOND = 'rgba(10, 12, 17, 0.8)';
const COULEUR_SLOT_FOND_HAUT = 'rgba(40, 46, 58, 0.8)';
const COULEUR_SLOT_BORD = 'rgba(255, 255, 255, 0.28)';
// Le liseré clair court sur l'arête HAUTE de la case : la lumière vient d'en
// haut partout ailleurs (jauges, silhouettes), elle ne va pas changer d'avis
// ici.
const COULEUR_SLOT_LISERE = 'rgba(255, 255, 255, 0.14)';

// Jauges faim/soif (Palier C, specs/04_maison-interieur.md §3.3/hud_layout) :
// icônes distinctes PAR FORME (P4② — jamais la couleur seule), un triangle
// (faim, pain/blé stylisé) et une goutte (soif), jamais deux disques
// identiques repeints d'une autre couleur.
const JAUGE_LARGEUR = 40;
const JAUGE_HAUTEUR = 6;
const JAUGE_ICONE_TAILLE = 8;
// Le cristal des éclats, un peu plus petit que la hauteur du bandeau pour que
// le nombre reste la pièce principale de son groupe.
const TAILLE_ICONE_ECLAT = 9;
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

// Les slots d'action (1 attaque + 3 skills + 1 consommable, §0 verrouillé) en
// bas au centre, visibles seulement hors tactile (§3.9/§4 : sur tactile, les
// boutons de hud_layout.js sont déjà les slots).
//
// `D-63` (T9) : la liste n'est plus écrite ici. Elle arrive en paramètre,
// filtrée par l'orchestrateur avec le MÊME filtre que les écrans
// (`visibilite.js#entreesVisibles` sur `data/action_slots.json`). Sur une
// partie neuve, il n'y a donc **qu'une case** : l'attaque de base. Une case
// apparaît quand son premier contenu est débloqué — décision de Xav du
// 21/09, l'anti-spoil des touches.
//
// Ce module n'a aucun repli : s'il ne reçoit rien, il ne dessine rien. Un
// défaut « les cinq comme avant » aurait masqué un branchement oublié, et
// c'est précisément ce que ce ticket cherche à empêcher.
const SLOT_TAILLE = 16;
const SLOT_ECART = 4;

// Part de la case (ou du rayon du bouton tactile) occupée par l'icône —
// provisoires, à régler au ressenti : l'icône doit respirer dans sa case sans
// s'y perdre. Exprimées en FRACTION et non en px, pour que la case tactile
// (rayon 28) et la case du bas (16 px de côté) restent d'accord sans deux
// réglages à tenir.
const ICONE_PART_DE_LA_CASE = 0.72;
const ICONE_PART_DU_BOUTON = 1.15;

// D-20 B : une case dessine l'icône de ce qui l'occupe — l'ARME ÉQUIPÉE
// pour l'attaque, le CONSOMMABLE ÉQUIPÉ pour `consume`, et demain la
// compétence d'un `skill_N`. Les silhouettes sont résolues par main.js (qui
// a le registre) et reçues ici dans une table `verbe → visuel` : ce module
// ignore qu'il s'agit d'une main, d'un fruit ou d'un sort, et n'a donc plus
// aucun cas particulier par verbe. Absent ou `null` = case vide, jamais une
// erreur : c'est un cas normal (une arme peut n'avoir pas d'icône, un slot
// débloqué peut n'avoir rien d'équipé), pas une donnée manquante.
//
// La case n'impose plus sa couleur à ce qu'elle contient (*révise* le
// `[OUVERT]` de `D-20 B`, « l'icône est teintable, la case garde son repère
// jaune ») : l'épée de bois et le fruit équipé s'y dessinaient déjà à leurs
// propres couleurs, seule la main restait un aplat doré — c'est cette
// exception que Xav a vue (« ça dénote avec le standing de la pomme »), et
// une teinte unique interdisait par construction les trois valeurs de la
// charte. Le repère de couleur survit là où il ne peut rien écraser : le
// contour de la case (ci-dessous) et, dans la silhouette, un accent d'auteur.
function dessinerIconeSlot(ctx, visuel, cx, cy, taille) {
  if (!visuel) return;
  dessinerVisuel(ctx, visuel, cx, cy, { echelle: echelleIconeArme(taille) });
}

// Spec 14, §4.6 : la JAUGE d'un emplacement de compétence. Deux formes, pas
// deux couleurs (P4②, le vocabulaire des buffs au bandeau) :
//   - la CHARGE est un trait qui fait le tour de la case, depuis le haut, dans
//     le sens des aiguilles — il se ferme quand la compétence est chargée ;
//   - la RECHARGE est un voile sombre posé sur l'icône, un secteur qui se
//     retire dans le même sens, comme l'aiguille d'une horloge.
// Prête (les deux remplies), le tour est fermé et plus clair. `jauge` :
// `{ charge, recharge, prete }`, reçue de main.js ; absente = rien.
// PROVISOIRES, à juger en jeu.
const COULEUR_CHARGE = 'rgba(243, 226, 176, 0.75)';
const COULEUR_PRETE = '#ffe9a8';
const VOILE_RECHARGE = 'rgba(0, 0, 0, 0.6)';
const EPAISSEUR_CHARGE = 1.5;

// Le secteur de la recharge, du haut, dans le sens des aiguilles, sur `ratio`
// du tour. Rogné à la case par l'appelant quand elle est carrée.
function secteurRecharge(ctx, cx, cy, rayon, ratio) {
  const depart = -Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, rayon, depart, depart + ratio * Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = VOILE_RECHARGE;
  ctx.fill();
}

// Le trait de la charge autour d'une case CARRÉE : le périmètre parcouru
// depuis le milieu du bord haut, sur `ratio` de sa longueur.
function tracerPerimetre(ctx, x, y, w, h, ratio) {
  const coins = [[x + w / 2, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y], [x + w / 2, y]];
  let reste = ratio * 2 * (w + h);
  ctx.beginPath();
  ctx.moveTo(coins[0][0], coins[0][1]);
  for (let i = 1; i < coins.length && reste > 0; i += 1) {
    const [x0, y0] = coins[i - 1];
    const [x1, y1] = coins[i];
    const longueur = Math.hypot(x1 - x0, y1 - y0);
    const part = Math.min(1, reste / longueur);
    ctx.lineTo(x0 + (x1 - x0) * part, y0 + (y1 - y0) * part);
    reste -= longueur;
  }
}

function styleCharge(ctx, jauge) {
  ctx.strokeStyle = jauge.prete ? COULEUR_PRETE : COULEUR_CHARGE;
  ctx.lineWidth = EPAISSEUR_CHARGE;
}

function dessinerJaugeRonde(ctx, jauge, cx, cy, rayon) {
  if (!jauge) return;
  ctx.save();
  if (jauge.recharge > 0) secteurRecharge(ctx, cx, cy, rayon, jauge.recharge);
  if (jauge.charge > 0) {
    styleCharge(ctx, jauge);
    const depart = -Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rayon + 2, depart, depart + Math.min(1, jauge.charge) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function dessinerJaugeCarree(ctx, jauge, x, y, taille) {
  if (!jauge) return;
  ctx.save();
  if (jauge.recharge > 0) {
    ctx.beginPath();
    ctx.rect(x, y, taille, taille);
    ctx.clip();
    secteurRecharge(ctx, x + taille / 2, y + taille / 2, taille, jauge.recharge);
    ctx.restore();
    ctx.save();
  }
  if (jauge.charge > 0) {
    styleCharge(ctx, jauge);
    tracerPerimetre(ctx, x - 1.5, y - 1.5, taille + 3, taille + 3, Math.min(1, jauge.charge));
    ctx.stroke();
  }
  ctx.restore();
}

// Le fond d'une case, rond ou carré : un dégradé vertical très court, du
// clair en haut vers le sombre en bas. Une seule fonction pour les deux
// formes — sans quoi la case du doigt et la case du clavier finiraient par
// ne plus se ressembler, alors qu'elles disent la même chose.
function fondSlot(ctx, y, hauteur) {
  const degrade = ctx.createLinearGradient(0, y, 0, y + hauteur);
  degrade.addColorStop(0, COULEUR_SLOT_FOND_HAUT);
  degrade.addColorStop(1, COULEUR_SLOT_FOND);
  return degrade;
}

function dessinerBoutonsTactiles(ctx, iconesSlots, verbesActions, couleurActive, iconesBoutons, iconesCibles, jaugesSlots, joystick) {
  for (const bouton of boutonsTactilesVisibles(verbesActions)) {
    ctx.beginPath();
    ctx.arc(bouton.cx, bouton.cy, bouton.rayon, 0, Math.PI * 2);
    // `[OUVERT]` D-20 B : plus d'aplat jaune sur l'attaque — fond identique
    // aux autres cases, c'est l'ICÔNE qui porte le jaune. On garde le repère
    // de couleur sans le pavé, qui écrasait la silhouette.
    ctx.fillStyle = fondSlot(ctx, bouton.cy - bouton.rayon, bouton.rayon * 2);
    ctx.fill();
    ctx.strokeStyle = bouton.verbe === 'attack' ? couleurActive : COULEUR_SLOT_BORD;
    ctx.stroke();
    dessinerIconeSlot(ctx, iconesSlots[bouton.verbe], bouton.cx, bouton.cy, bouton.rayon * ICONE_PART_DU_BOUTON);
    dessinerJaugeRonde(ctx, jaugesSlots[bouton.verbe], bouton.cx, bouton.cy, bouton.rayon);
    // `D-176` : un bouton qui n'est pas une case d'action (MENU) n'a pas
    // d'icône de slot ; il porte la sienne, en filigrane.
    const iconeBouton = iconesBoutons[bouton.verbe];
    const cible = iconesCibles[bouton.verbe];
    if (cible) {
      // `D-177` : ce que l'appui va toucher. Une silhouette du MONDE (une
      // station large de 22 unités, ancrée par le bas) se recadre comme dans
      // une tuile de la Poche — une seule règle de « où tient ce visuel ».
      const { taille, alpha } = ICONE_CIBLE_TACTILE;
      const cadre = cadrer(cible.visuel, taille, cible.pieceMobile);
      const x = bouton.cx - taille / 2 + cadre.x;
      const y = bouton.cy - taille / 2 + cadre.y;
      dessinerVisuel(ctx, cible.visuel, x, y, { echelle: cadre.echelle, alpha });
      // Le manche d'un levier, pivoté comme dans le monde (render.js) : sans
      // lui, un levier n'est qu'un socle.
      if (cible.pieceMobile) {
        const { visuel, pivot, angle } = cible.pieceMobile;
        dessinerVisuel(ctx, visuel, x + pivot[0] * cadre.echelle, y + pivot[1] * cadre.echelle, {
          echelle: cadre.echelle, alpha, rotation: angle,
        });
      }
    } else if (iconeBouton && !iconesSlots[bouton.verbe]) {
      dessinerVisuel(ctx, iconeBouton, bouton.cx, bouton.cy, {
        echelle: echelleIconeBoutonTactile(ICONE_BOUTON_TACTILE.taille),
        alpha: ICONE_BOUTON_TACTILE.alpha,
      });
    }
  }

  dessinerJoystick(ctx, joystick);
}

// `D-138` : rayon du rond qui suit le pouce, en unités logiques. PROVISOIRE,
// jamais vu au doigt : assez gros pour dépasser d'un pouce qui le couvre
// (≈ 3 mm à l'A04), assez petit pour que sa position dans le cercle se lise.
const RAYON_ROND_POUCE = 12;

// Le cercle suit le joystick là où le pouce l'a posé, et un rond suit le
// doigt, retenu au bord du cercle : le joueur voit enfin où en est son pouce,
// ce qu'un doigt qui couvre un cercle fixe ne lui disait pas. Au repos, le
// cercle seul, à sa place d'origine (`JOYSTICK.cx/cy`) : il dit où poser le
// pouce la première fois.
function dessinerJoystick(ctx, joystick) {
  const cx = joystick ? joystick.cx : JOYSTICK.cx;
  const cy = joystick ? joystick.cy : JOYSTICK.cy;
  ctx.beginPath();
  ctx.arc(cx, cy, JOYSTICK.rayonZone, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
  if (!joystick) return;
  const dx = joystick.x - cx;
  const dy = joystick.y - cy;
  const distance = Math.hypot(dx, dy);
  const retenue = distance > JOYSTICK.rayonZone ? JOYSTICK.rayonZone / distance : 1;
  ctx.beginPath();
  ctx.arc(cx + dx * retenue, cy + dy * retenue, RAYON_ROND_POUCE, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
}

// Ligne statique en bas au centre (§4), même liste de verbes que les boutons
// tactiles mais jamais leurs positions (celles-ci n'ont de sens qu'au doigt).
function dessinerSlotsBas(ctx, resolution, iconesSlots, verbesActions, couleurActive, jaugesSlots) {
  if (verbesActions.length === 0) return;
  // La barre se RESSERRE sur ce qui existe, elle ne laisse pas de cases
  // vides : au tactile les boutons gardent leurs positions (le placement est
  // le chapitre de Xav, `D-57`), mais ici une case vide au centre de l'écran
  // annoncerait exactement ce que l'anti-spoil veut taire.
  const largeurTotale = verbesActions.length * SLOT_TAILLE + (verbesActions.length - 1) * SLOT_ECART;
  const xDepart = (resolution.largeur - largeurTotale) / 2;
  const y = resolution.hauteur - SLOT_TAILLE - 8;

  verbesActions.forEach((verbe, i) => {
    const x = xDepart + i * (SLOT_TAILLE + SLOT_ECART);
    // Même `[OUVERT]` que les boutons tactiles : fond commun, jaune porté par
    // l'icône. Le contour de l'attaque reste plus vif — c'est le seul slot
    // actif, et ça ne dépend pas de l'arme.
    ctx.fillStyle = fondSlot(ctx, y, SLOT_TAILLE);
    ctx.fillRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
    ctx.fillStyle = COULEUR_SLOT_LISERE;
    ctx.fillRect(x, y, SLOT_TAILLE, 1);
    // Le repère de couleur de la case d'attaque, passé du blanc à l'or : il
    // vit désormais dans le CONTOUR, le seul endroit où il ne peut pas écraser
    // la silhouette qu'il désigne (cf. `dessinerIconeSlot`).
    ctx.strokeStyle = verbe === 'attack' ? couleurActive : COULEUR_SLOT_BORD;
    ctx.strokeRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
    dessinerIconeSlot(ctx, iconesSlots[verbe], x + SLOT_TAILLE / 2, y + SLOT_TAILLE / 2, SLOT_TAILLE * ICONE_PART_DE_LA_CASE);
    dessinerJaugeCarree(ctx, jaugesSlots[verbe], x, y, SLOT_TAILLE);
  });
}

// `D-96` : les icônes du bandeau (faim, soif, éclats) ne sont plus tracées
// ici à coups de `moveTo`/`quadraticCurveTo`. Ce sont des entrées de
// `data/visuels.json` comme tout le reste du jeu, résolues par main.js (qui a
// le registre) et reçues déjà prêtes — même patron que `visuelFollet`,
// `iconesSlots` et les buffs. Deux gains, et le second est le vrai : un
// triangle plein et une goutte pleine ne pouvaient pas avoir trois valeurs
// sans que ce fichier devienne un second `visuels.js` ; et la prochaine
// retouche de ces trois icônes se fera **en données**, sans toucher au HUD.
function dessinerIconeBandeau(ctx, visuel, x, y, taille) {
  if (!visuel) return;
  dessinerVisuel(ctx, visuel, x, y, { echelle: echelleIconeBandeau(taille) });
}

// `D-95` : la barre elle-même vit dans `ui/barre.js` depuis `D-165` — la
// barre de PV des monstres la partage (une seule facture de jauge).

// Une jauge de survie = icône (forme) + la barre ci-dessus.
function dessinerJauge(ctx, x, y, ratio, palette, visuelIcone) {
  dessinerIconeBandeau(ctx, visuelIcone, x + JAUGE_ICONE_TAILLE / 2, y + JAUGE_HAUTEUR / 2, JAUGE_ICONE_TAILLE);
  dessinerBarre(
    ctx,
    { x: x + JAUGE_ICONE_TAILLE + 4, y, largeur: JAUGE_LARGEUR, hauteur: JAUGE_HAUTEUR },
    ratio,
    palette,
  );
}

// La barre du boss : la MÊME barre que les PV (`ui/barre.js`), en long, et
// son nom au-dessus, avec l'ombre d'un pixel du nombre des PV.
function dessinerBarreBoss(ctx, { nom, ratio }) {
  const b = BARRE_BOSS;
  dessinerBarre(ctx, b, ratio, PALETTE_JAUGES.pv);
  ctx.font = policeBandeau(8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const milieu = b.x + b.largeur / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(nom, milieu, b.nom_y + 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(nom, milieu, b.nom_y);
}

export function dessinerHud(ctx, {
  i18n, pv, pvMax, eclats, companion, visuelFollet, tactileActif,
  // `D-138` : `{ cx, cy, x, y }` du joystick tenu (`touch.js#joystickAffiche`),
  // ou `null` au repos.
  joystick = null,
  // `verbe → visuel` : ce qu'il faut dessiner dans chaque case (arme équipée,
  // consommable équipé, plus tard une compétence). Table résolue par main.js,
  // comme `visuelFollet` — un verbe absent = case vide. *Remplace* le
  // `visuelArme` unique, qui obligeait le HUD à savoir que seule l'attaque
  // porte une icône.
  iconesSlots = {}, survie = null, niveau = null, eclatNiveau = 0,
  // `D-96` : `{ eclats, faim, soif }` — les silhouettes du bandeau, résolues
  // par main.js depuis `survival.json#icone` pour les deux jauges. Absente =
  // rien de dessiné, jamais une erreur : c'est le même contrat que les autres
  // tables d'icônes de ce module.
  iconesBandeau = {},
  // `D-13` : buffs actifs, dans l'ordre d'activation. Chaque entrée est
  // { visuel, teinte, resteMs } — la silhouette est DÉJÀ résolue par main.js (qui a
  // le registre), exactement comme `visuelFollet` et `iconesSlots`. Ce module
  // ne sait pas ce qu'est un status_effect, et ne recalcule rien : la table
  // des buffs est tenue par status.js, il la LIT.
  buffs = [],
  // `D-63` : les verbes des slots d'action RÉELLEMENT débloqués, dans l'ordre
  // du catalogue. Résolus par main.js, qui a le registre et les flags — ce
  // module ne sait pas ce qu'est un slot, pas plus qu'il ne sait ce qu'est un
  // status_effect. Aucun défaut : voir le commentaire de `dessinerSlotsBas`.
  verbesActions = [],
  // La barre des cases du bas (clavier/manette) occupe la même bande que la
  // bulle de dialogue : même pied (`8` px du bord), et la bulle est un cadre
  // translucide. Dessinées toutes deux, les cases transparaissaient sous le
  // texte et leur liseré dépassait sous le cadre. Le jeu étant gelé sous la
  // bulle, la barre n'y dit rien : main.js la tait tant qu'une bulle est
  // ouverte — et pendant le placement de la Construction, dont le bandeau
  // d'aide se pose au même pied (`D-172`). Les boutons TACTILES ne sont pas concernés : ils montent
  // au-dessus de la bulle et le doigt doit toujours les voir où ils répondent.
  barreActions = true,
  // `D-176` : `verbe → visuel`, ce que chaque bouton TACTILE porte en
  // filigrane (l'engrenage de MENU), résolu par main.js depuis
  // `glyphes.json#tactile_icone`. Un verbe absent = bouton nu, jamais une
  // erreur, comme toutes les tables d'icônes de ce module.
  iconesBoutons = {},
  // `D-177` : `verbe → { visuel, pieceMobile }` de ce que le bouton vise
  // MAINTENANT (la cible d'INTERACT à portée), résolu par main.js au même
  // calcul que l'appui. Il remplace l'icône du bouton tant qu'il est là.
  iconesCibles = {},
  // Spec 14, §4.5 : `{ nom, ratio }` du boss vivant de la salle, résolu par
  // main.js (le nom déjà traduit) ; absent = pas de barre.
  boss = null,
  // Spec 14, §4.6 : `verbe → { charge, recharge, prete }`, la jauge de chaque
  // emplacement de compétence. Un verbe absent = une case sans jauge.
  jaugesSlots = {},
}) {
  ctx.save();

  // MT_hud-ligne-haute_2026-09-19 : UNE ligne en haut, pleine largeur, à la
  // place des deux cartouches de la colonne de gauche. Depuis `D-17` (le
  // bouton MENU tactile est descendu sous le bandeau), le CONTENU va lui
  // aussi jusqu'au bord : `Nv. N` y est ancré, à une seule position.
  // `D-95` : le bandeau lui-même n'est plus un aplat. Un dégradé vertical très
  // court (il s'éclaircit à peine vers le bas) et une arête claire d'un pixel
  // en pied : c'est ce qui le détache du monde au lieu de le poser dessus, et
  // c'est la même idée que le creux d'une jauge — l'ordre de dessin fait le
  // relief, jamais un flou.
  const fondBandeau = ctx.createLinearGradient(0, BANDEAU_HAUT.y, 0, BANDEAU_HAUT.y + BANDEAU_HAUT.hauteur);
  fondBandeau.addColorStop(0, 'rgba(6, 8, 12, 0.72)');
  fondBandeau.addColorStop(1, 'rgba(18, 22, 30, 0.58)');
  ctx.fillStyle = fondBandeau;
  ctx.fillRect(BANDEAU_HAUT.x, BANDEAU_HAUT.y, BANDEAU_HAUT.largeur, BANDEAU_HAUT.hauteur);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(BANDEAU_HAUT.x, BANDEAU_HAUT.y + BANDEAU_HAUT.hauteur - 1, BANDEAU_HAUT.largeur, 1);

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

  // PV : la MÊME barre que la faim et la soif, plus la valeur centrée DEDANS
  // (patron V1 conservé, jamais à côté).
  const b = zones.pv;
  const ratio = pvMax > 0 ? Math.max(0, Math.min(1, pv / pvMax)) : 0;
  dessinerBarre(ctx, b, ratio, PALETTE_JAUGES.pv);
  ctx.font = policeBandeau(8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Le nombre passe tantôt sur le rouge, tantôt sur le creux : une ombre
  // portée d'un pixel le tient lisible des deux côtés, là où le blanc seul
  // se perdait sur le liseré clair.
  const texte = `${Math.ceil(pv)}/${Math.ceil(pvMax)}`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(texte, b.x + b.largeur / 2, b.y + b.hauteur / 2 + 2);
  ctx.fillStyle = '#fff';
  ctx.fillText(texte, b.x + b.largeur / 2, b.y + b.hauteur / 2 + 1);

  // Éclats : la silhouette porte le sens, pas la couleur (P4②). Le losange
  // était un GLYPHE de la police (`◆`) : il dépendait de la fonte du système
  // et ne pouvait porter aucune valeur. C'est maintenant un cristal de
  // `visuels.json`, comme les deux jauges.
  const zoneEclats = zones.eclats;
  const milieuEclats = zoneEclats.y + zoneEclats.hauteur / 2;
  dessinerIconeBandeau(ctx, iconesBandeau.eclats, zoneEclats.x + TAILLE_ICONE_ECLAT / 2, milieuEclats, TAILLE_ICONE_ECLAT);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = policeBandeau(10);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${eclats}`, zoneEclats.x + TAILLE_ICONE_ECLAT + 4, milieuEclats);

  if (survie) {
    // Cause racine (SD_phase3-stations-pv-jauges_2026-09-17.md, sujet 3) :
    // `save.survie` porte les clés de survival.json (`jauge_faim`/
    // `jauge_soif`, cf. save.js/survival.js), jamais `faim`/`soif`.
    dessinerJauge(ctx, zones.faim.x, zones.faim.y, survie.jauge_faim, PALETTE_JAUGES.faim, iconesBandeau.faim);
    dessinerJauge(ctx, zones.soif.x, zones.soif.y, survie.jauge_soif, PALETTE_JAUGES.soif, iconesBandeau.soif);
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
    ctx.font = policeBandeau(10);
    ctx.fillStyle = intensite > 0 ? COULEUR_ECLAT_NIVEAU : '#fff';
    ctx.fillText(
      `${i18n.t('hud.niveau_prefixe')}${niveau}`,
      zones.niveau.x + zones.niveau.largeur,
      zones.niveau.y + zones.niveau.hauteur / 2,
    );
  }

  // `D-13` : les buffs actifs, entre la soif et le niveau. Une icône par
  // effet (la stat renforcée), forme ET couleur, **sans texte ni jauge de
  // durée** — la durée ne se lit que dans la pulsation des dernières
  // secondes. Le placement et l'alpha viennent tous deux de hud_layout.js
  // (pur, testé) : ce fichier n'a pas le droit de décider où ça va.
  if (buffs.length > 0 && zones.buffs) {
    const { rects } = placerIconesBuffs(zones.buffs, buffs.length);
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      const buff = buffs[i];
      if (!buff || !buff.visuel) continue;
      ctx.save();
      ctx.globalAlpha = alphaPulsationBuff(buff.resteMs);
      dessinerVisuel(
        ctx,
        buff.visuel,
        rect.x + rect.largeur / 2,
        rect.y + rect.hauteur / 2,
        // `teinte` : un soin emprunte l'icône d'une stat et la colore
        // (status.js#iconeBuffBandeau) ; `null` laisse ses couleurs d'auteur.
        { echelle: echelleIconeBuff(ICONE_BUFF.taille), teinte: buff.teinte || null },
      );
      ctx.restore();
    }
  }

  if (boss) dessinerBarreBoss(ctx, boss);

  ctx.restore();

  // §4 : jamais les deux à la fois. Sur tactile, les boutons SONT les slots.
  const couleurActive = (companion && companion.render.couleur) || COULEUR_SLOT_ACTIF;
  if (tactileActif) {
    dessinerBoutonsTactiles(ctx, iconesSlots, verbesActions, couleurActive, iconesBoutons, iconesCibles, jaugesSlots, joystick);
  } else if (barreActions) {
    // Diagnostic SD_dialogues-invisibles_2026-09-15 : même défaut que
    // dialogue_box.js — `ctx.canvas.width/height` est la taille PHYSIQUE
    // depuis le MT rendu-net, jamais la résolution logique sous laquelle ce
    // dessin est réellement placé (transform f encore active).
    dessinerSlotsBas(ctx, RESOLUTION_LOGIQUE, iconesSlots, verbesActions, couleurActive, jaugesSlots);
  }
}

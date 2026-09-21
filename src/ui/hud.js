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
} from './hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../render.js';
import { dessinerVisuel, TAILLE_REFERENCE_FOLLET_PX } from '../visuels.js';

// Taille de l'icône follet dans le cartouche HUD (px logiques) — inchangée
// depuis avant 03_grotte-polish, désormais une échelle de visuel_follet_*
// plutôt qu'un dessin dédié (§3.3 : une seule fonction de rendu).
const TAILLE_ICONE_FOLLET = 6;

const COULEUR_SLOT_ACTIF = '#c2a83e';

// `D-95` — LA jauge du bandeau, en quatre valeurs, et une seule fonction pour
// les trois (PV, faim, soif). Avant, les PV étaient dessinés inline et les
// deux jauges de survie par une autre fonction : deux factures pour le même
// objet, et la seule façon d'en changer une sans l'autre. Le reproche de Xav
// (« par rapport aux feux follets, la barre de vie peut être améliorée »)
// porte exactement là : un follet a un corps, un cœur clair et un halo, la
// barre n'avait qu'un aplat et un contour blanc.
//
// Les quatre valeurs, et ce que chacune dit — c'est la charte d'item du 21/09
// transposée à une barre :
//   `creux`  le fond, plus sombre que le corps : la barre est CREUSÉE, et une
//            jauge vide reste lisible sur le bandeau ;
//   `corps`  le remplissage ;
//   `haut`   la moitié haute du remplissage, éclairée — le volume vient d'une
//            seconde forme, jamais d'un flou (règle de visuels.js) ;
//   `lisere` un pixel vif au sommet, l'accent.
// Le CONTOUR passe du blanc pur à un trait sombre : c'est le blanc qui
// écrasait les trois valeurs qu'on vient de poser.
const PALETTE_JAUGES = {
  pv: { creux: '#2a0f10', corps: '#a8302f', haut: '#d8574c', lisere: '#ff9b8a' },
  faim: { creux: '#241d0a', corps: '#a8882a', haut: '#d9bb45', lisere: '#ffe79b' },
  soif: { creux: '#0e1b2a', corps: '#2a6aa8', haut: '#4a9ad9', lisere: '#a6dcff' },
};
const COULEUR_JAUGE_CONTOUR = 'rgba(8, 9, 12, 0.75)';
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

function dessinerBoutonsTactiles(ctx, iconesSlots, verbesActions) {
  for (const bouton of boutonsTactilesVisibles(verbesActions)) {
    ctx.beginPath();
    ctx.arc(bouton.cx, bouton.cy, bouton.rayon, 0, Math.PI * 2);
    // `[OUVERT]` D-20 B : plus d'aplat jaune sur l'attaque — fond identique
    // aux autres cases, c'est l'ICÔNE qui porte le jaune. On garde le repère
    // de couleur sans le pavé, qui écrasait la silhouette.
    ctx.fillStyle = fondSlot(ctx, bouton.cy - bouton.rayon, bouton.rayon * 2);
    ctx.fill();
    ctx.strokeStyle = bouton.verbe === 'attack' ? COULEUR_SLOT_ACTIF : COULEUR_SLOT_BORD;
    ctx.stroke();
    dessinerIconeSlot(ctx, iconesSlots[bouton.verbe], bouton.cx, bouton.cy, bouton.rayon * ICONE_PART_DU_BOUTON);
  }

  ctx.beginPath();
  ctx.arc(JOYSTICK.cx, JOYSTICK.cy, JOYSTICK.rayonZone, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
}

// Ligne statique en bas au centre (§4), même liste de verbes que les boutons
// tactiles mais jamais leurs positions (celles-ci n'ont de sens qu'au doigt).
function dessinerSlotsBas(ctx, resolution, iconesSlots, verbesActions) {
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
    ctx.strokeStyle = verbe === 'attack' ? COULEUR_SLOT_ACTIF : COULEUR_SLOT_BORD;
    ctx.strokeRect(x, y, SLOT_TAILLE, SLOT_TAILLE);
    dessinerIconeSlot(ctx, iconesSlots[verbe], x + SLOT_TAILLE / 2, y + SLOT_TAILLE / 2, SLOT_TAILLE * ICONE_PART_DE_LA_CASE);
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

// `D-95` — LA barre du bandeau. Les PV, la faim et la soif la traversent
// tous les trois : une seule facture, donc jamais deux jauges qui divergent
// au premier réglage. Elle ne connaît ni PV ni faim — elle reçoit un
// rectangle, un ratio et une palette.
//
// L'ordre de dessin EST le relief, exactement comme pour une silhouette de
// `visuels.json` : creux, corps, moitié haute éclairée, liseré d'un pixel,
// puis le contour sombre par-dessus tout. Le liseré ne dépasse jamais le
// remplissage (il s'arrête où le corps s'arrête), sinon la barre vide
// garderait un trait vif qui la ferait lire comme pleine.
function dessinerBarre(ctx, rect, ratio, palette) {
  const { x, y, largeur, hauteur } = rect;
  const rempli = largeur * Math.max(0, Math.min(1, ratio));

  ctx.fillStyle = palette.creux;
  ctx.fillRect(x, y, largeur, hauteur);
  // Le creux a sa propre ombre haute : un pixel plus sombre sous le bord
  // supérieur, qui donne l'épaisseur de la gouttière même quand la jauge est
  // à zéro.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x, y, largeur, 1);

  if (rempli > 0) {
    ctx.fillStyle = palette.corps;
    ctx.fillRect(x, y, rempli, hauteur);
    ctx.fillStyle = palette.haut;
    ctx.fillRect(x, y, rempli, Math.max(1, Math.round(hauteur * 0.42)));
    ctx.fillStyle = palette.lisere;
    ctx.globalAlpha *= 0.55;
    ctx.fillRect(x, y, rempli, 1);
    ctx.globalAlpha /= 0.55;
    // Le pied du remplissage retombe dans l'ombre : sans lui, la moitié haute
    // éclairée se lit comme deux bandes collées, pas comme un volume.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(x, y + hauteur - 1, rempli, 1);
  }

  ctx.strokeStyle = COULEUR_JAUGE_CONTOUR;
  ctx.strokeRect(x, y, largeur, hauteur);
}

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

export function dessinerHud(ctx, {
  i18n, pv, pvMax, eclats, companion, visuelFollet, tactileActif,
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
  // { visuel, resteMs } — la silhouette est DÉJÀ résolue par main.js (qui a
  // le registre), exactement comme `visuelFollet` et `iconesSlots`. Ce module
  // ne sait pas ce qu'est un status_effect, et ne recalcule rien : la table
  // des buffs est tenue par status.js, il la LIT.
  buffs = [],
  // `D-63` : les verbes des slots d'action RÉELLEMENT débloqués, dans l'ordre
  // du catalogue. Résolus par main.js, qui a le registre et les flags — ce
  // module ne sait pas ce qu'est un slot, pas plus qu'il ne sait ce qu'est un
  // status_effect. Aucun défaut : voir le commentaire de `dessinerSlotsBas`.
  verbesActions = [],
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
  ctx.font = '8px monospace';
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
  ctx.font = '9px monospace';
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
    ctx.font = '9px monospace';
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
        { echelle: echelleIconeBuff(ICONE_BUFF.taille) },
      );
      ctx.restore();
    }
  }

  ctx.restore();

  // §4 : jamais les deux à la fois. Sur tactile, les boutons SONT les slots.
  if (tactileActif) {
    dessinerBoutonsTactiles(ctx, iconesSlots, verbesActions);
  } else {
    // Diagnostic SD_dialogues-invisibles_2026-09-15 : même défaut que
    // dialogue_box.js — `ctx.canvas.width/height` est la taille PHYSIQUE
    // depuis le MT rendu-net, jamais la résolution logique sous laquelle ce
    // dessin est réellement placé (transform f encore active).
    dessinerSlotsBas(ctx, RESOLUTION_LOGIQUE, iconesSlots, verbesActions);
  }
}

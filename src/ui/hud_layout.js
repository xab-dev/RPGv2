// Layout HUD/tactile (§2.1/§3.9 de specs/02_grotte.md, repositionné par le
// diagnostic SD_ui-lisibilite §3 pour la résolution logique 480x270,
// désormais validée — cf. render.js) : positions et tailles en résolution
// logique, centralisées ici plutôt qu'en JSON — un seul endroit, commenté,
// provisoire, jamais validé au tactile réel par Xav. Le facteur d'échelle
// entier (toujours >= 1) ne peut qu'agrandir une cible logique à l'écran,
// jamais la réduire : un rayon logique de 20px garantit donc bien les
// >= 48px écran exigés (P4①) — 28px pour l'attaque, seul bouton actif en
// Phase 1, cible plus généreuse.
//
// Sur tactile, les boutons d'action SONT les slots (§3.9) : chaque bouton
// ci-dessous correspond à un verbe, donc à terme à un `action_slots.json`
// affiché au même endroit — pas un second HUD à maintenir en parallèle.

// `limiteX` : toute la moitié gauche de l'écran logique (480/2) capture le
// joystick dès le premier contact (§2.3 : "joystick virtuel à gauche"),
// comme un joystick mobile classique — `rayonZone` ne sert qu'à normaliser
// la magnitude du déplacement une fois le doigt attribué, pas à détecter le
// contact initial (un doigt qui commence loin du centre visuel doit quand
// même piloter le joystick, clampé à 1).
export const JOYSTICK = { cx: 70, cy: 200, rayonZone: 45, limiteX: 240 };

// Bas-droite (§3 : "attaque bas-droite ≈ 420, 210"), rayon 28 = seul bouton
// vraiment utile en Phase 1 (les 4 autres sont grisés, cf. ui/hud.js).
export const BOUTON_ATTAQUE = { cx: 420, cy: 210, rayon: 28, verbe: 'attack' };

// En éventail au-dessus/à gauche de l'attaque, chacun à distance > somme des
// deux rayons de son voisin (aucun chevauchement à l'écran) et toujours
// x >= 330 / y >= 120 (§3 : ne jamais recouvrir le centre de l'écran).
export const BOUTONS_SKILLS = [
  { cx: 445, cy: 155, rayon: 20, verbe: 'skill_1' },
  { cx: 400, cy: 140, rayon: 20, verbe: 'skill_2' },
  { cx: 350, cy: 150, rayon: 20, verbe: 'skill_3' },
];

export const BOUTON_CONSOMMABLE = { cx: 335, cy: 195, rayon: 20, verbe: 'consume' };
// Juste au-dessus du joystick (§3), assez loin de rayonZone pour ne pas se
// chevaucher visuellement (distance centre-centre 70px > 45+20).
export const BOUTON_INTERACT = { cx: 70, cy: 130, rayon: 20, verbe: 'interact' };
// `D-17` : descendu SOUS le bandeau (cy 20 -> 38, donc y 22..54, deux pixels
// sous le bandeau qui finit à 20). Il était à moitié dessus — verdict de
// `V-02` par Xav sur l'A04. Deux gains, tous deux dans la décision verrouillée
// du 19/09 : le pouce l'atteint mieux, et le bandeau redevient libre sur
// toute sa largeur, ce qui permet de coller `Nv. N` au bord droit.
//
// Il croise en y la bannière d'indice de commande (26..44), mais jamais en x :
// la bannière est centrée (hud_hints.js) et celle-ci est au bord droit — le
// test le prouve avec les vraies chaînes des deux locales plutôt que de
// l'espérer. Le relevé `?debug=fps`, lui, est un calque DOM en haut à
// GAUCHE de la fenêtre (ui/hud_debug.js) : il ne peut pas le rencontrer.
//
// PROVISOIRE : jamais validé au pouce par Xav (`V-23`).
export const BOUTON_MENU = { cx: 455, cy: 38, rayon: 16, verbe: 'menu' };

// D-20 B : `data/visuels.json#visuel_icone_main` (et toute icône d'arme
// future) est dessinée dans une boîte de ce côté-là ; chaque appelant calcule
// son échelle avec `echelleIconeArme(tailleVoulue)` plutôt que de recopier la
// silhouette à deux tailles — même patron que TAILLE_REFERENCE_FOLLET_PX.
// Elle vit ici, avec le reste du placement, parce que c'est le module pur et
// testable du HUD ; sa place naturelle serait à côté de sa jumelle dans
// visuels.js, le jour où un ticket y touchera pour une autre raison.
export const TAILLE_REFERENCE_ICONE_ARME_PX = 12;

export function echelleIconeArme(tailleVoulue) {
  return tailleVoulue / TAILLE_REFERENCE_ICONE_ARME_PX;
}

export function boutonsTactiles() {
  return [BOUTON_ATTAQUE, ...BOUTONS_SKILLS, BOUTON_CONSOMMABLE, BOUTON_INTERACT, BOUTON_MENU];
}

// --- Bandeau haut, pleine largeur (MT_hud-ligne-haute_2026-09-19) ---------
// Décision Xav : PV, faim, soif, niveau sur UNE ligne en haut, à la place de
// la colonne de gauche qui prenait trop de place. La barre d'XP quitte le
// HUD (seul le numéro du niveau reste) ; la progression d'XP reste lisible
// dans l'écran Stats.
//
// Tout le placement vit ICI, pas en dur dans hud.js : ce module est pur et
// testable headless, alors que hud.js dessine et n'est jamais exercé par les
// tests (contrainte de méthode).

// 20 px sur 270 = 7,4 % de la hauteur logique, sous le plafond de 8 % fixé
// par la fiche. PROVISOIRE : jamais validé en jeu par Xav.
export const BANDEAU_HAUT = { x: 0, y: 0, largeur: 480, hauteur: 20 };

const BANDEAU_PADDING = 6;
const BANDEAU_ECART = 8;
// `BANDEAU_CONTENU_FIN_X` (430) a disparu avec `D-17` : il existait pour que
// le contenu du bandeau ne passe jamais sous le bouton MENU tactile, qui
// mordait sur le bandeau. Le bouton étant descendu, le bandeau est libre sur
// toute sa largeur — c'était la moitié de la décision de Xav, et c'est ce qui
// permet à `Nv. N` d'avoir UNE seule position, la même partout.

const LARGEUR_FOLLET = 12;
const LARGEUR_PV = 86;
const LARGEUR_ECLATS = 30;
const LARGEUR_JAUGE_SURVIE = 50; // icône (6) + écart (4) + barre (40)
const LARGEUR_NIVEAU = 30;

// Rectangles du bandeau, dans l'ordre définitif de la décision verrouillée du
// 19/09 : follet · PV · éclats · faim · soif · **buffs** · `Nv. N` collé au
// bord droit.
//
// `D-17` corrige ici deux choses à la fois, et c'est la même : le niveau
// n'est plus posé à la suite des autres mais **ancré à droite**, et les buffs
// prennent tout ce qui reste entre la soif et lui. Avant, le niveau flottait
// (sa position dépendait de la présence du follet et des jauges de survie) et
// les buffs finissaient à 430 pour éviter le bouton MENU. Le bouton étant
// descendu, il n'y a plus de raison de s'arrêter avant le bord.
//
// (Aucun buff n'est encore dessiné : la zone est calculée et testée, `D-13`
// la remplira.)
//
// Les éléments optionnels (`follet`, `survie`, `niveau`) suivent la même
// règle qu'avant : avant le premier calcul des stats (cinématique
// d'ouverture), il n'y a rien à afficher — la ligne se resserre alors sans
// laisser de trou.
export function elementsBandeauHaut({ follet = false, survie = false, niveau = false } = {}) {
  const elements = {};
  let x = BANDEAU_HAUT.x + BANDEAU_PADDING;

  // Hauteur d'un élément, centré verticalement dans le bandeau.
  const poser = (largeur, hauteur) => {
    const rect = {
      x,
      y: BANDEAU_HAUT.y + (BANDEAU_HAUT.hauteur - hauteur) / 2,
      largeur,
      hauteur,
    };
    x += largeur + BANDEAU_ECART;
    return rect;
  };

  if (follet) elements.follet = poser(LARGEUR_FOLLET, 12);
  elements.pv = poser(LARGEUR_PV, 10);
  elements.eclats = poser(LARGEUR_ECLATS, 10);
  if (survie) {
    elements.faim = poser(LARGEUR_JAUGE_SURVIE, 8);
    elements.soif = poser(LARGEUR_JAUGE_SURVIE, 8);
  }

  // Bord droit du contenu : le bandeau entier, moins la marge. Le niveau s'y
  // ancre, donc il ne bouge plus jamais — c'est « une seule position » de la
  // décision de Xav, et c'est ce que le test vérifie en comparant un bandeau
  // complet à un bandeau réduit.
  const finContenu = BANDEAU_HAUT.x + BANDEAU_HAUT.largeur - BANDEAU_PADDING;
  let finBuffs = finContenu;
  if (niveau) {
    elements.niveau = {
      x: finContenu - LARGEUR_NIVEAU,
      y: BANDEAU_HAUT.y + (BANDEAU_HAUT.hauteur - 10) / 2,
      largeur: LARGEUR_NIVEAU,
      hauteur: 10,
    };
    finBuffs = elements.niveau.x - BANDEAU_ECART;
  }

  // Ce qui reste entre la soif et le niveau : les buffs actifs. Jamais
  // négatif, même si tous les éléments optionnels sont présents à la fois
  // (vérifié par test) — un bandeau plein doit se dégrader en « pas de place
  // pour les buffs », jamais en rectangle à l'envers.
  elements.buffs = {
    x,
    y: BANDEAU_HAUT.y + (BANDEAU_HAUT.hauteur - 12) / 2,
    largeur: Math.max(0, finBuffs - x),
    hauteur: 12,
  };
  return elements;
}

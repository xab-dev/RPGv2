import { COTE_REFERENCE_ICONE } from './icone_canvas.js';
import { RESOLUTION_LOGIQUE } from '../render.js';

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

// `limiteX` : la bande gauche de l'écran logique qui capture le joystick dès
// le premier contact (§2.3 : "joystick virtuel à gauche") — `rayonZone` ne
// sert qu'à normaliser la magnitude du déplacement une fois le doigt
// attribué, pas à détecter le contact initial (un doigt qui commence loin du
// centre visuel doit quand même piloter le joystick, clampé à 1).
//
// `D-137` (23/09, retour de Xav sur l'A04) : elle valait toute la moitié
// gauche (240), qui mordait sur la zone de jeu — un doigt posé au milieu de
// l'écran devenait un joystick. Ramenée à un TIERS (160), soit le centre plus
// deux rayons : le pouce garde un rayon entier de glissement au-delà du
// cercle dessiné avant de sortir de la bande. Seul le premier contact est
// concerné — un doigt déjà attribué continue de piloter hors de la bande.
// PROVISOIRE, jamais validé au pouce.
//
// `D-138` (25/09, Xav : « go C ») : le joystick FLOTTE, en laisse. `cx/cy`
// n'est plus que la position de REPOS (le cercle dessiné quand aucun pouce ne
// le tient) ; dès qu'un pouce le prend, le centre est l'endroit où il s'est
// posé, et le cercle se fait tirer derrière le doigt quand celui-ci s'en
// éloigne de plus de `rayonZone`. Avec un centre fixe, le pouce ne tombait
// jamais pile dessus et le héros allait moins vite d'un côté que de l'autre
// (pouce posé 25 px à droite du centre : 44 % de la vitesse vers la gauche).
// La laisse, c'est ce qui manque aux joysticks flottants qui déçoivent : sans
// elle, un pouce qui a dérivé de 2 cm doit tout retraverser pour faire
// demi-tour ; avec elle, un demi-tour ne coûte jamais plus que le rayon plus
// la course de pleine vitesse.
//
// Deux fractions de `rayonZone`, PROVISOIRES :
//   - `zoneMorte` (10 %) : un pouce posé qui tremble ne fait ni avancer le
//     héros d'un pixel, ni tourner sa capuche (huit directions, `D-249`) ;
//   - `pleineVitesse` (70 %) : la pleine vitesse arrive AVANT le bord du
//     cercle, qu'on ne voit pas sous son pouce. Entre les deux, la vitesse
//     monte en ligne droite : la marche lente reste, comme au stick de la
//     manette (Xav : « je préfère garder le choix »).
//
// `D-251` (25/09, Xav au téléphone : le cercle « peut être drag à travers tout
// l'écran ») : la laisse a une LIMITE, un cercle jamais dessiné qui touche le
// bord gauche, le bas et l'horizontale du milieu de l'écran (`LIMITE_JOYSTICK`).
// Le cercle du joystick y reste ENTIER, à `margeLimite` px de son bord : il ne
// déborde jamais du cadre. Au-delà, le centre reste au bord de la limite et le
// héros va à fond vers le pouce, comme un joystick fixe. La pose du pouce y est
// soumise aussi : un cercle né hors de la limite serait aussitôt rattrapé par
// elle. `margeLimite` (4 px, « quelques pixels ») est PROVISOIRE.
export const JOYSTICK = {
  cx: 70, cy: 200, rayonZone: 45, limiteX: 160, zoneMorte: 0.1, pleineVitesse: 0.7, margeLimite: 4,
};

// Le cercle limite, déduit de l'écran logique : tangent au bas et à
// l'horizontale du milieu, son rayon est le quart de la hauteur ; tangent au
// bord gauche, son centre est à un rayon de lui. `rayonCentre` : le disque où
// le CENTRE du joystick peut aller pour que tout son cercle y tienne — 18,5 px
// en 480x270 : la laisse devient un jeu de quelques pas de pouce, plus une
// traversée de l'écran.
const RAYON_LIMITE = RESOLUTION_LOGIQUE.hauteur / 4;
export const LIMITE_JOYSTICK = {
  cx: RAYON_LIMITE,
  cy: RESOLUTION_LOGIQUE.hauteur - RAYON_LIMITE,
  rayon: RAYON_LIMITE,
  rayonCentre: RAYON_LIMITE - JOYSTICK.margeLimite - JOYSTICK.rayonZone,
};

// Le centre du joystick pour un point donné, ramené dans la limite (le point
// le plus proche du disque `rayonCentre`). Un seul endroit : la pose du pouce
// et la laisse passent toutes deux par lui. La limite est à plus d'une course
// de pleine vitesse des bords de l'écran, ce qui rend inutile l'ancienne marge
// aux bords (`D-138`).
export function bornerCentreJoystick(x, y) {
  const dx = x - LIMITE_JOYSTICK.cx;
  const dy = y - LIMITE_JOYSTICK.cy;
  const distance = Math.hypot(dx, dy);
  if (distance <= LIMITE_JOYSTICK.rayonCentre) return { x, y };
  const recul = LIMITE_JOYSTICK.rayonCentre / distance;
  return { x: LIMITE_JOYSTICK.cx + dx * recul, y: LIMITE_JOYSTICK.cy + dy * recul };
}

// La magnitude du déplacement pour une distance pouce → centre : nulle dans la
// zone morte, 1 à partir de la pleine vitesse, en ligne droite entre les deux.
export function magnitudeJoystick(distance) {
  const r = distance / JOYSTICK.rayonZone;
  const m = (r - JOYSTICK.zoneMorte) / (JOYSTICK.pleineVitesse - JOYSTICK.zoneMorte);
  return Math.min(1, Math.max(0, m));
}

// Bas-droite (§3 : "attaque bas-droite ≈ 420, 210"), rayon 28 = seul bouton
// vraiment utile en Phase 1 (les 4 autres sont grisés, cf. ui/hud.js).
export const BOUTON_ATTAQUE = { cx: 420, cy: 210, rayon: 28, verbe: 'attack' };

// `D-57` (22/09), consigne de Xav : les QUATRE boutons d'action masques avant
// deblocage (3 competences + consommable) sont repartis **equitablement en
// eventail autour du bouton d'attaque**, du cote de la zone de jeu (vers le
// haut et la gauche), jamais contre la bordure.
//
// Deux ecarts, et non un seul — c'est la revision du 22/09, prise apres avoir
// vu l'eventail a l'ecran :
//   - 16 px de chaque bouton a l'ATTAQUE (l'ecart generique, inchange) ;
//   - 13 px entre deux VOISINS de l'eventail.
// Les nombres ci-dessous en decoulent entierement, un test les RECALCULE
// plutot que de les memoriser (regle `D-52`) :
//   - rayon de l'eventail = 28 (attaque) + 16 + 20 (bouton) = 64 px ;
//   - deux voisins distants de 20 + 13 + 20 = 53 px de centre a centre, d'ou
//     un ecartement angulaire de 2*asin(26,5/64) ~ 48,9 deg, et un eventail de
//     quatre qui balaie 146,8 deg au lieu de 156.
//
// Ces ~9 deg gagnes servent a **s'ecarter des bords**, pas a se resserrer : a
// 156 deg l'eventail occupait tout l'arc libre et deux de ses extremites
// frolaient la bordure (6 px en bas, 4 px a droite), la derniere passant a
// 13 px d'INTERACT. L'angle de depart (151,6 deg) est celui qui maximise la
// plus petite de ces marges — la plus serree remonte a ~9,6 px.
//
// L'ordre de l'eventail (skill_1 en bas-gauche, puis en remontant, le
// consommable en haut) est un choix par defaut, pas une decision.
export const BOUTONS_SKILLS = [
  { cx: 364, cy: 240, rayon: 20, verbe: 'skill_1' },
  { cx: 360, cy: 188, rayon: 20, verbe: 'skill_2' },
  { cx: 398, cy: 150, rayon: 20, verbe: 'skill_3' },
];

export const BOUTON_CONSOMMABLE = { cx: 450, cy: 154, rayon: 20, verbe: 'consume' };
// Replacé le 22/09 (70,130 -> 454,97) sur consigne de Xav, en trois temps :
// d'abord sous le bouton MENU, **même axe vertical** ; puis, une fois
// l'éventail des actions posé, **à équidistance de ses deux voisins**, qui
// sont le MENU au-dessus et le CONSOMMABLE en bas à gauche — seul y se
// cherchait alors, et il vaut 97, ce qui laisse 17,1 px de chaque côté
// (contre 16 au MENU et 10 au consommable avant).
//
// Enfin cx 455 -> 454, pour porter la marge au bord droit de 5 à 6 px : avec
// son rayon de 20 (celui du MENU n'est que de 16), l'axe commun le collait
// plus près du bord que son voisin. L'axe s'en trouve décalé d'un pixel, et
// l'équidistance tient toujours (17,0 / 17,1) — un pixel ne se voit pas sur
// un alignement, cinq se voyaient sur une bordure.
//
// Ce n'est pas l'écart générique de 16 px : c'est une équidistance, et elle
// se recalcule (un test la refait) — bouger le MENU ou le consommable doit
// redonner un nombre, pas casser un nombre.
//
// Gain de côté, qui n'était pas le but de la consigne mais qui en découle :
// il était à gauche, donc **dans la zone qui capte le joystick**
// (`JOYSTICK.limiteX` = toute la moitié gauche) — un doigt posé dessus
// pilotait aussi le déplacement. C'est la classe de défaut consignée en
// `D-57`. À droite, la question ne se pose plus.
export const BOUTON_INTERACT = { cx: 454, cy: 97, rayon: 20, verbe: 'interact' };
// `D-17` : descendu SOUS le bandeau (cy 20 -> 38). Il était à moitié dessus —
// verdict de `V-02` par Xav sur l'A04. Deux gains, tous deux dans la décision
// verrouillée du 19/09 : le pouce l'atteint mieux, et le bandeau redevient
// libre sur toute sa largeur, ce qui permet de coller `Nv. N` au bord droit.
//
// Redescendu puis remonté le 22/09, l'écart au bandeau réglé à l'œil par Xav :
// cy 38 -> 52 (écart = le rayon du bouton, 16 px), puis **cy 52 -> 44**, soit
// la moitié de cet écart (8 px sous un bandeau qui finit à 20). L'axe
// gauche/droite n'a jamais bougé. Ce bouton est le REPÈRE du placement
// tactile : les autres se règlent à partir de lui, donc tout écart se lit ici
// en une soustraction, jamais recopié en dur.
//
// Il croise en y la bannière d'indice de commande (26..44), mais jamais en x :
// la bannière est centrée (hud_hints.js) et celle-ci est au bord droit — le
// test le prouve avec les vraies chaînes des deux locales plutôt que de
// l'espérer. Le relevé `?debug=fps`, lui, est un calque DOM en haut à
// GAUCHE de la fenêtre (ui/hud_debug.js) : il ne peut pas le rencontrer.
//
// PROVISOIRE : jamais validé au pouce par Xav (`V-23`).
export const BOUTON_MENU = { cx: 455, cy: 44, rayon: 16, verbe: 'menu' };

// `D-176` (demande de Xav, 23/09) : l'icône d'un bouton tactile (l'engrenage
// de MENU), en FILIGRANE — le bouton se reconnaît sans que l'icône ne pèse sur
// la scène. Une taille pour tous : un bouton de rayon 20 garde la même icône
// qu'un de 16, c'est la famille qui compte.
// Statique et sans dépendance au preset : il est là en Bas comme en Haut, et
// ne coûte qu'un visuel de six primitives. `taille` en px logiques (le bouton
// fait 32 de diamètre), `alpha` = le filigrane. PROVISOIRES, jugés à la
// capture Chrome seulement. Ces icônes sont dessinées pour la boîte des icônes
// de menu (`icone_canvas.js#COTE_REFERENCE_ICONE`).
export const ICONE_BOUTON_TACTILE = { taille: 16, alpha: 0.4 };

// `D-177` : la silhouette de CE QUE vise le bouton (un levier, un coffre,
// une branche au sol), à la place de l'icône du bouton tant qu'une cible est
// à portée. Plus grande et plus franche que le filigrane : c'est une
// information, pas un ornement. `taille` = le côté de la boîte où la
// silhouette est recadrée (`icone_canvas.js#cadrer`, la règle des tuiles de
// la Poche), dans un bouton de 40 de diamètre. PROVISOIRES, jugés à la
// capture Chrome seulement.
export const ICONE_CIBLE_TACTILE = { taille: 26, alpha: 0.85 };

export function echelleIconeBoutonTactile(tailleVoulue) {
  return tailleVoulue / COTE_REFERENCE_ICONE;
}

// `Q-40`/`Q-41` (23/09, décision de Xav) : toucher le FOLLET émet
// `target_next` — le geste « cible suivante » du doigt, qui sert aussi de
// rappel quand il est parti trop loin (sa cible hors de portée, le cycle
// repart du monstre le plus proche du héros, cf. companion.js#cibleSuivante).
// Le follet se dessine en quelques pixels : la zone qui répond est celle d'un
// bouton ordinaire (rayon 20, le minimum P4① rappelé en tête de fichier),
// centrée sur lui et qui le suit. Elle déborde sur le héros quand le follet
// orbite près de lui, sans conséquence : rien d'autre ne se touche dans le
// monde. PROVISOIRE, jamais validé au pouce.
export const RAYON_TOUCHE_FOLLET = 20;

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

// --- Icônes de buff dans le bandeau (`D-13`) -------------------------------
// Même patron que l'icône d'arme au-dessus : les silhouettes de
// `data/visuels.json` sont dessinées dans une boîte de référence de ce
// côté-là, et chaque appelant calcule son échelle plutôt que de recopier la
// silhouette à deux tailles.
export const TAILLE_REFERENCE_ICONE_BUFF_PX = 10;

export function echelleIconeBuff(tailleVoulue) {
  return tailleVoulue / TAILLE_REFERENCE_ICONE_BUFF_PX;
}

// --- Icônes du bandeau : faim, soif, éclats (`D-96`) -----------------------
// Même patron encore : les silhouettes de `data/visuels.json` sont dessinées
// dans une boîte de 10 unités, et l'appelant demande la taille qu'il veut.
// Une constante distincte de celle des buffs parce que ce sont deux réglages
// distincts (une icône de jauge n'a pas à rapetisser si un buff rapetisse),
// même si les deux valent 10 aujourd'hui.
export const TAILLE_REFERENCE_ICONE_BANDEAU_PX = 10;

export function echelleIconeBandeau(tailleVoulue) {
  return tailleVoulue / TAILLE_REFERENCE_ICONE_BANDEAU_PX;
}

// `taille` tient dans la hauteur de la zone des buffs (12 px) en laissant un
// pixel de part et d'autre. PROVISOIRE, jamais validé en jeu (`V-24`).
export const ICONE_BUFF = { taille: 10, ecart: 3 };

// Rectangles des icônes de buff, rangés **dans l'ordre d'activation**, de la
// soif vers la droite (décision verrouillée du 19/09).
//
// Débordement : la décision dit « au-delà de la place disponible, **les plus
// anciens restent** ». On garde donc les PREMIERS de la liste et on masque la
// queue, sans indicateur — un « +2 » serait du texte, et la décision dit
// « sans texte ni jauge ». `masques` est rendu pour que l'appelant sache que
// quelque chose manque, jamais pour qu'il l'écrive à l'écran.
//
// (Le brief de la nuit du 20/09 disait l'inverse, « les plus récentes
// d'abord », en le marquant `[OUVERT]` — c'est le suivi, qui porte la
// décision de Xav, qui l'emporte ici. Question posée en `Q-35`.)
//
// `nombre` plutôt qu'une liste de buffs : ce module ne connaît ni les effets,
// ni le registre, ni i18n — il place des carrés.
export function placerIconesBuffs(zone, nombre) {
  const { taille, ecart } = ICONE_BUFF;
  if (!zone || nombre <= 0) return { rects: [], masques: Math.max(0, nombre) };

  // Combien tiennent : n icônes occupent n*taille + (n-1)*ecart.
  const capacite = Math.max(0, Math.floor((zone.largeur + ecart) / (taille + ecart)));
  const visibles = Math.min(nombre, capacite);

  const rects = [];
  for (let i = 0; i < visibles; i += 1) {
    rects.push({
      x: zone.x + i * (taille + ecart),
      y: zone.y + (zone.hauteur - taille) / 2,
      largeur: taille,
      hauteur: taille,
    });
  }
  return { rects, masques: nombre - visibles };
}

// Fin de buff : « pulsation douce en fondu pendant les ~2 dernières secondes
// (2 à 3 battements par seconde au plus, **jamais de flash sec**), puis
// disparition » (décision verrouillée du 19/09).
//
// Deux choix qui servent ce « jamais de flash sec », et qui sont la raison
// d'être de cette fonction plutôt que d'un `Math.sin` posé dans hud.js :
//   - le cosinus vaut 1 à l'entrée de la fenêtre, donc l'alpha y est
//     exactement celui d'avant : aucune marche au moment où la pulsation
//     commence (vérifié par test des deux côtés de la frontière) ;
//   - l'alpha ne descend jamais à 0 (`alpha_min`) : l'icône respire, elle ne
//     clignote pas.
export const PULSATION_BUFF = { fenetre_ms: 2000, frequence_hz: 2.5, alpha_min: 0.35 };

export function alphaPulsationBuff(resteMs) {
  const { fenetre_ms: fenetre, frequence_hz: frequence, alpha_min: alphaMin } = PULSATION_BUFF;
  if (resteMs >= fenetre) return 1;
  const ecoule = Math.max(0, fenetre - resteMs) / 1000;
  const phase = ecoule * frequence * Math.PI * 2;
  return alphaMin + (1 - alphaMin) * (0.5 + 0.5 * Math.cos(phase));
}

export function boutonsTactiles() {
  return [BOUTON_ATTAQUE, ...BOUTONS_SKILLS, BOUTON_CONSOMMABLE, BOUTON_INTERACT, BOUTON_MENU];
}

// `INTERACT` et `MENU` ne sont pas des actions : ce sont des commandes, et
// elles sont là dès la Grotte. Les leviers en dépendent au tactile, donc les
// cacher fermerait le jeu. C'est pour cela qu'elles ne figurent pas dans
// `data/action_slots.json` — elles ne peuvent pas être masquées par erreur.
const VERBES_HORS_BARRE_ACTION = ['interact', 'menu'];

// `D-63` (T9) : les boutons RÉELLEMENT présents, une fois l'anti-spoil des
// touches appliqué. `verbesVisibles` vient de l'orchestrateur, qui l'a
// obtenu du MÊME filtre que les écrans (`visibilite.js#entreesVisibles` sur
// `action_slots.json`) — jamais une seconde règle écrite ici.
//
// Les POSITIONS ne bougent pas d'un pixel : une case masquée laisse sa place
// vide, elle ne décale pas ses voisines. C'est la règle des « cases stables »
// déjà retenue pour les menus en cartes (`D-43`), et c'est aussi ce qui garde
// ce ticket hors du chapitre tactile de Xav (`D-57`), qui traitera le
// placement des boutons d'un bloc.
export function boutonsTactilesVisibles(verbesVisibles) {
  const visibles = new Set(verbesVisibles);
  return boutonsTactiles().filter(
    (b) => VERBES_HORS_BARRE_ACTION.includes(b.verbe) || visibles.has(b.verbe),
  );
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

// La BARRE DU BOSS (spec 14, §4.5) : sous le bandeau, centrée, son nom juste
// au-dessus. Assez large pour qu'un coup se lise dans sa longueur, assez
// étroite pour laisser libre le bouton MENU tactile (x ≥ 439). *Provisoire*.
export const BARRE_BOSS = { x: 130, y: 33, largeur: 220, hauteur: 5, nom_y: 27 };

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
const LARGEUR_JAUGE_SURVIE = 52; // icône (8) + écart (4) + barre (40) — `D-96` : l'icône est passée de 6 à 8 avec sa mise en volume
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

// `specs/11_dialogues-consequences.md` §4.2 : la GÉOMÉTRIE de la bulle de
// dialogue, en un seul endroit — le dessin (`ui/dialogue_box.js`) et le doigt
// (`main.js`, qui résout un contact en option) la lisent tous les deux. Deux
// jeux de nombres finiraient par ne plus désigner la même ligne : on verrait
// une option et on en toucherait une autre.
//
// Sans option, c'est exactement la bulle d'avant (70 de haut, 8 de marge).
// Avec options, elle GRANDIT PAR LE HAUT d'une rangée par option, sous le
// texte : le bas de l'écran ne bouge pas, et le texte déjà lu reste à sa place
// relative.
//
// Une rangée fait 18 de haut : 13 px de police et de quoi ne pas faire
// toucher deux options d'un même doigt — PROVISOIRE, jamais validé au pouce
// (`V-104`). Elle s'arrête à `finOptionsX`, avant le cercle du bouton
// d'attaque (`BOUTON_ATTAQUE`, de 392 à 448 en x) qu'elle croiserait en y :
// un doigt posé à cet endroit confirmerait par le bouton au lieu de
// sélectionner. Le bouton, lui, reste un « appui » ordinaire — c'est la
// parité voulue.
export const BOITE_DIALOGUE = {
  marge: 8,
  hauteurTexte: 70,
  debutOptions: 64,
  hauteurOption: 18,
  finOptionsX: BOUTON_ATTAQUE.cx - BOUTON_ATTAQUE.rayon - 4,
};

export function geometrieBoiteDialogue(nbOptions, { largeur, hauteur }) {
  const { marge, hauteurTexte, debutOptions, hauteurOption, finOptionsX } = BOITE_DIALOGUE;
  const n = nbOptions > 0 ? nbOptions : 0;
  const hauteurBoite = hauteurTexte + n * hauteurOption;
  const boite = { x: marge, y: hauteur - hauteurBoite - marge, largeur: largeur - 2 * marge, hauteur: hauteurBoite };
  const options = [];
  for (let i = 0; i < n; i += 1) {
    options.push({ x: boite.x, y: boite.y + debutOptions + i * hauteurOption, largeur: finOptionsX - boite.x, hauteur: hauteurOption });
  }
  return { boite, options };
}

function dansRect(p, r) {
  return p.x >= r.x && p.x < r.x + r.largeur && p.y >= r.y && p.y < r.y + r.hauteur;
}

// Ce qu'un contact désigne sur la bulle : `{ option: i }`, `{ texte: true }`
// (partout ailleurs dans la bulle — « un tap sur le texte confirme ») ou
// `null` hors de la bulle. Le premier contact qui désigne quelque chose
// l'emporte : deux doigts posés la même frame ne font qu'un geste.
export function toucherBoiteDialogue(geometrie, contacts) {
  for (const p of contacts || []) {
    const i = geometrie.options.findIndex((r) => dansRect(p, r));
    if (i >= 0) return { option: i };
    if (dansRect(p, geometrie.boite)) return { texte: true };
  }
  return null;
}

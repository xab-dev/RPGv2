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
export const BOUTON_MENU = { cx: 455, cy: 20, rayon: 16, verbe: 'menu' };

export function boutonsTactiles() {
  return [BOUTON_ATTAQUE, ...BOUTONS_SKILLS, BOUTON_CONSOMMABLE, BOUTON_INTERACT, BOUTON_MENU];
}

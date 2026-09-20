// Contrat : navigation du menu pilotable par les verbes d'input (MOVE,
// ATTACK, MENU), sans dépendre du DOM ni d'un périphérique concret — cf.
// MT_menu-manette_2026-09-15.md.
import assert from 'node:assert/strict';
import { creerNavigationMenu, creerControleurMenu } from '../src/ui/menu.js';
import { etatNeutre } from '../src/input/input.js';

// Faux état d'input minimal, même forme que creerCoucheInput().maj().
function etat({ y = 0, attack = false, menu = false, skill3 = false } = {}) {
  return {
    move: { x: 0, y },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: skill3, held: skill3 },
    consume: { pressed: false, held: false },
    interact: { pressed: false, held: false },
    menu: { pressed: menu, held: menu }, target_next: { pressed: false, held: false },
  };
}

// 1. Navigation par front montant, bornée, sans boucle circulaire.
{
  const nav = creerNavigationMenu(3);
  assert.equal(nav.index(), 0);

  // "pressed" = un cran (front montant) : on repasse par 0 entre deux
  // poussées, comme le ferait un stick/une flèche réellement relâchés
  // puis pressés à nouveau.
  assert.equal(nav.traiterMove(1), 1);
  assert.equal(nav.traiterMove(0), 1);
  assert.equal(nav.traiterMove(1), 2);
  assert.equal(nav.traiterMove(0), 2);
  assert.equal(nav.traiterMove(1), 2, 'reste au dernier élément, pas de boucle');

  assert.equal(nav.traiterMove(0), 2);
  assert.equal(nav.traiterMove(-1), 1);
  assert.equal(nav.traiterMove(0), 1);
  assert.equal(nav.traiterMove(-1), 0);
  assert.equal(nav.traiterMove(0), 0);
  assert.equal(nav.traiterMove(-1), 0, 'reste au premier élément, pas de boucle');
}

// 2. MOVE en `held` seul (sans repasser par 0) → l'index n'avance qu'une fois.
{
  const nav = creerNavigationMenu(3);
  assert.equal(nav.traiterMove(1), 1, 'le front montant fait avancer');
  assert.equal(nav.traiterMove(1), 1, 'le maintien seul ne fait pas avancer davantage');
  assert.equal(nav.traiterMove(1), 1, 'toujours maintenu, toujours immobile');
}

// 3. ATTACK pressed → l'action de l'élément focalisé est appelée exactement une fois.
{
  let appelsIndex0 = 0;
  let appelsIndex1 = 0;
  const controleur = creerControleurMenu([() => appelsIndex0++, () => appelsIndex1++]);
  controleur.ouvrir();

  controleur.traiterInput(etat({ attack: true }));
  assert.equal(appelsIndex0, 1, 'élément focalisé par défaut (index 0) appelé une fois');
  assert.equal(appelsIndex1, 0);

  // Un cran vers le bas (avec relâchement entre les deux), puis ATTACK.
  controleur.traiterInput(etat({ y: 1 }));
  controleur.traiterInput(etat({ y: 0 }));
  controleur.traiterInput(etat({ attack: true }));
  assert.equal(appelsIndex1, 1, 'élément focalisé après navigation (index 1) appelé une fois');
  assert.equal(appelsIndex0, 1, 'l’élément précédent n’est pas re-déclenché');
}

// 4. MENU pressed → le menu se ferme, l'index est remis à 0 à la réouverture.
{
  let appels = 0;
  const controleur = creerControleurMenu([() => appels++, () => {}, () => {}]);
  controleur.ouvrir();
  controleur.traiterInput(etat({ y: 1 }));
  controleur.traiterInput(etat({ y: 0 }));
  assert.equal(controleur.index(), 1);

  controleur.fermer();
  assert.equal(controleur.estOuvert(), false);
  // Menu fermé : plus aucun verbe n'est consommé, même ATTACK.
  controleur.traiterInput(etat({ attack: true }));
  assert.equal(appels, 0, 'menu fermé, ATTACK ne doit déclencher aucune action');

  controleur.ouvrir();
  assert.equal(controleur.index(), 0, 'réouverture : index remis à 0');
}

// 5. Menu ouvert + MOVE held → l'état transmis au gameplay est neutre
//    (move = {0,0}, tous les booléens à faux) ; menu fermé, le même état
//    passe tel quel. Reproduit exactement la décision de src/main.js#maj.
{
  const e = etat({ y: 1, attack: true });

  const controleur = creerControleurMenu([() => {}]);
  controleur.ouvrir();
  const menuOuvert = controleur.estOuvert();
  const gameplayMenuOuvert = menuOuvert ? etatNeutre(e) : e;
  assert.deepEqual(gameplayMenuOuvert.move, { x: 0, y: 0 });
  assert.equal(gameplayMenuOuvert.attack.pressed, false);
  assert.equal(gameplayMenuOuvert.attack.held, false);

  controleur.fermer();
  const menuFerme = controleur.estOuvert();
  const gameplayMenuFerme = menuFerme ? etatNeutre(e) : e;
  assert.deepEqual(gameplayMenuFerme.move, { x: 0, y: 1 }, 'menu fermé : l’état passe tel quel');
  assert.equal(gameplayMenuFerme.attack.pressed, true);
}

// 6. Micro-fix 2026-09-15 : fermer en focalisant l'élément "Fermer" puis
//    ATTACK (dernier élément de la liste, index 3 ici).
{
  let fermetureAppelee = false;
  const controleur = creerControleurMenu([() => {}, () => {}, () => {}, () => (fermetureAppelee = true)]);
  controleur.ouvrir();
  for (let i = 0; i < 3; i++) {
    controleur.traiterInput(etat({ y: 1 }));
    controleur.traiterInput(etat({ y: 0 }));
  }
  assert.equal(controleur.index(), 3, 'focus arrivé sur "Fermer"');
  controleur.traiterInput(etat({ attack: true }));
  assert.equal(fermetureAppelee, true, 'action "Fermer" déclenchée par ATTACK sur l’élément focalisé');
}

// 7. Micro-fix 2026-09-15 : B (verbeAnnuler = 'skill_3') ferme immédiatement,
//    quel que soit l'élément focalisé, sans déclencher son action.
{
  let appels = 0;
  const controleur = creerControleurMenu([() => appels++, () => appels++], { verbeAnnuler: 'skill_3' });
  controleur.ouvrir();
  controleur.traiterInput(etat({ skill3: true }));
  assert.equal(controleur.estOuvert(), false, 'B ferme le menu');
  assert.equal(appels, 0, 'B ne déclenche aucune action de la liste');
}

// 8. Sans `verbeAnnuler`, le verbe correspondant n'a aucun effet sur le
//    contrôleur (comportement par défaut inchangé pour les futurs écrans
//    qui n'opteraient pas pour ce raccourci).
{
  const controleur = creerControleurMenu([() => {}]);
  controleur.ouvrir();
  controleur.traiterInput(etat({ skill3: true }));
  assert.equal(controleur.estOuvert(), true, 'sans verbeAnnuler, skill_3 ne ferme rien');
}

console.log('OK test_menu_navigation');

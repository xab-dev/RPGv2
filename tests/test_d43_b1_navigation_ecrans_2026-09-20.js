// specs/08_menus-cartes.md, palier B1 — LA pile du menu entier, dans sa part
// pure (`menu_cartes.js#creerNavigationEcrans`). Aucune vue réelle ici : des
// vues factices qui tiennent un journal, pour prouver les deux garanties que la
// pile donne PAR CONSTRUCTION — une seule vue visible à la fois, un seul chemin
// de fermeture — et le contrat « ouvert = pile non vide ET sommet visible ».
import assert from 'node:assert/strict';
import { creerNavigationEcrans } from '../src/menu_cartes.js';

const journal = [];
function creerVue(nom) {
  const vue = {
    nom,
    visible: false,
    montrer(niveau) { vue.visible = true; journal.push(`${nom}:montrer:${niveau.id}`); },
    masquer() { vue.visible = false; },
    estVisible: () => vue.visible,
    traiterInput(etat, niveau) { journal.push(`${nom}:input:${niveau.id}:${etat.verbe}`); },
  };
  return vue;
}
const grille = creerVue('grille');
const liste = creerVue('liste');
const craft = creerVue('craft');
const vues = [grille, liste, craft];
const visibles = () => vues.filter((v) => v.visible).map((v) => v.nom);

let fermetures = 0;
const nav = creerNavigationEcrans({ onFermer: () => { fermetures += 1; } });

// L'invariant du palier B, vérifié après CHAQUE opération de ce fichier.
function verifier(contexte) {
  assert.ok(visibles().length <= 1, `${contexte} : jamais deux écrans visibles (${visibles()})`);
  assert.equal(nav.estOuvert(), visibles().length === 1, `${contexte} : estOuvert() === un écran réellement visible`);
  if (nav.estOuvert()) assert.equal(nav.sommet().vue.visible, true, `${contexte} : l'écran visible est celui du sommet`);
}

// --- 1. Fermée au départ ; les opérations sur une pile vide sont inertes -------
{
  verifier('au départ');
  assert.equal(nav.profondeur(), 0);
  assert.equal(nav.sommet(), null);
  nav.retour();
  nav.masquerSommet();
  nav.remontrerSommet();
  nav.traiterInput({ verbe: 'attack' });
  nav.fermerTout();
  assert.equal(fermetures, 0, 'fermer une pile déjà vide ne prévient personne');
  assert.deepEqual(journal, []);
  verifier('pile vide malmenée');
  console.log('OK pile vide : tout est inerte, rien ne lève');
}

// --- 2. Ouvrir, empiler, retour : le focus est une propriété du NIVEAU -------
{
  const racine = { vue: grille, id: 'racine', focus: 0 };
  nav.ouvrir(racine);
  verifier('ouvrir');
  assert.deepEqual(visibles(), ['grille']);

  racine.focus = 1; // la vue range ce qu'elle veut dans SON niveau
  nav.empiler({ vue: grille, id: 'enfant', focus: 0 });
  verifier('empiler un écran de la même vue');
  assert.equal(journal.at(-1), 'grille:montrer:enfant', 'la même vue est re-montrée sur le nouveau niveau');

  nav.empiler({ vue: liste, id: 'poche' });
  verifier('empiler un écran d\'une autre vue');
  assert.deepEqual(visibles(), ['liste'], 'la grille est masquée AVANT que la liste ne se montre');
  assert.equal(nav.profondeur(), 3);

  nav.traiterInput({ verbe: 'attack' });
  assert.equal(journal.at(-1), 'liste:input:poche:attack', 'les verbes vont au sommet, et à lui seul');

  nav.retour();
  verifier('retour depuis la liste');
  assert.equal(journal.at(-1), 'grille:montrer:enfant');
  nav.retour();
  verifier('retour à la racine');
  assert.equal(nav.sommet(), racine);
  assert.equal(nav.sommet().focus, 1, 'le niveau retrouvé a gardé SON focus : la carte qui avait ouvert l\'enfant');
  assert.equal(fermetures, 0);
  console.log('OK empiler / retour : une seule vue visible, focus restitué');
}

// --- 3. Un seul chemin de fermeture ------------------------------------------
{
  nav.retour(); // à la racine, retour = fermer
  verifier('retour à la racine = fermer');
  assert.equal(nav.profondeur(), 0);
  assert.equal(fermetures, 1, 'onFermer rappelé une fois');
  assert.deepEqual(visibles(), []);

  nav.ouvrir({ vue: grille, id: 'racine' });
  nav.empiler({ vue: grille, id: 'enfant' });
  nav.empiler({ vue: liste, id: 'stats' });
  nav.fermerTout(); // le verbe MENU, ou une carte action : depuis n'importe quelle profondeur
  verifier('fermerTout depuis la profondeur 3');
  assert.equal(nav.profondeur(), 0);
  assert.equal(fermetures, 2);

  nav.ouvrir({ vue: grille, id: 'racine' });
  nav.fermerTout({ prevenir: false }); // fermeture programmatique : c'est l'appelant qui ferme
  verifier('fermeture programmatique');
  assert.equal(fermetures, 2, '`prevenir: false` ne rappelle pas onFermer');
  console.log('OK fermeture : retour à la racine, fermerTout et fermeture programmatique passent par le même point');
}

// --- 4. Sommet masqué : la pile est intacte, mais le menu n'est PAS ouvert ----
{
  nav.ouvrir({ vue: grille, id: 'racine' });
  nav.empiler({ vue: liste, id: 'construction' });
  nav.masquerSommet(); // le placement d'une station prend la main
  verifier('sommet masqué');
  assert.equal(nav.estOuvert(), false, 'pile non vide, sommet invisible : PAS ouvert');
  assert.equal(nav.profondeur(), 2, 'rien n\'a été dépilé');
  const avant = journal.length;
  nav.traiterInput({ verbe: 'attack' });
  assert.equal(journal.length, avant, 'un menu qui n\'est pas ouvert ne reçoit aucun verbe');

  nav.remontrerSommet();
  verifier('sommet remontré');
  assert.equal(journal.at(-1), 'liste:montrer:construction', 'il réapparaît, contenu relu à neuf');

  // Masquer puis empiler : le nouveau sommet se montre (le masque ne colle
  // qu'au sommet du moment).
  nav.masquerSommet();
  nav.empiler({ vue: craft, id: 'craft' });
  verifier('empiler par-dessus un sommet masqué');
  assert.deepEqual(visibles(), ['craft']);

  // Ouvrir depuis le monde (Craft, Coffre) ne se pose jamais sur un reste.
  nav.ouvrir({ vue: craft, id: 'craft' });
  verifier('ouvrir sur une pile non vide');
  assert.equal(nav.profondeur(), 1);
  nav.retour();
  verifier('retour depuis Craft : plus rien dessous, donc fermé');
  assert.equal(nav.profondeur(), 0);
  console.log('OK sommet masqué : pile intacte, menu fermé aux yeux du jeu');
}

// --- 5. Le DOM fait foi : un écran masqué dans le dos de la pile ---------------
{
  nav.ouvrir({ vue: grille, id: 'racine' });
  grille.visible = false; // quelqu'un a caché l'élément sans passer par la pile
  assert.equal(nav.estOuvert(), false, 'intention sans affichage réel = pas ouvert : le jeu ne gèle pas derrière un menu invisible');
  nav.fermerTout({ prevenir: false });
  verifier('fin');
  console.log('OK contrat unique : intention ET affichage réel');
}

console.log('OK test_d43_b1_navigation_ecrans');

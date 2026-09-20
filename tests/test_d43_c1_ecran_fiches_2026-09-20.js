// specs/08_menus-cartes.md, palier C1 — le composant « maître-détail »
// (`ui/ecran_fiches.js`) et sa part pure (`menu_cartes.js#disposerTuiles`,
// `replierFocus`), plus le recadrage des silhouettes (`icone_canvas.js#cadrer`).
//
// Ce que Node peut prouver : la disposition des tuiles et des groupes, que
// toute tuile reste atteignable au stick, la structure du DOM (la sortie dans
// l'en-tête figé, jamais une tuile dedans ; une case de remplissage est
// inerte), LE GESTE (une tuile se sélectionne, c'est la fiche qui agit — et A
// passe par la même fonction que son bouton), le focus qui survit à une
// relecture. Ce qu'il ne peut pas prouver : que ça tient dans l'écran — voir
// les captures (`tools/capture_chrome.mjs`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { disposerTuiles, replierFocus, voisin, creerNavigationEcrans, COLONNES_TUILES } from '../src/menu_cartes.js';
import { creerEcranFiches } from '../src/ui/ecran_fiches.js';
import { cadrer } from '../src/ui/icone_canvas.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lireJson = (...morceaux) => JSON.parse(fs.readFileSync(path.join(RACINE, ...morceaux), 'utf8'));

// --- 1. disposerTuiles : groupes sur rangée neuve, cases de remplissage ---------
{
  assert.deepEqual(disposerTuiles([], 4), { cases: [], sections: [] }, 'aucune entrée : aucune case, aucune section');
  const sansGroupe = disposerTuiles([{}, {}, {}, {}, {}], 4);
  assert.deepEqual(sansGroupe.cases, [0, 1, 2, 3, 4], 'sans groupe : les entrées dans l’ordre, aucune case vide');
  assert.deepEqual(sansGroupe.sections, [{ groupe: null, debut: 0 }]);

  const g = (groupe) => ({ groupe });
  const coffre = disposerTuiles([g('Poche'), g('Poche'), g('Poche'), g('Coffre'), g('Coffre')], 4);
  assert.deepEqual(coffre.cases, [0, 1, 2, null, 3, 4], 'un groupe commence sur une rangée NEUVE : la fin de la précédente est comblée');
  assert.deepEqual(coffre.sections, [{ groupe: 'Poche', debut: 0 }, { groupe: 'Coffre', debut: 4 }]);
  const plein = disposerTuiles([g('A'), g('A'), g('A'), g('A'), g('B')], 4);
  assert.deepEqual(plein.cases, [0, 1, 2, 3, 4], 'rangée déjà pleine : rien à combler');
  console.log('OK disposerTuiles : ordre conservé, un groupe = une rangée neuve, remplissage en fin de rangée');
}

// --- 2. Toute tuile est atteignable au stick, quelle que soit la disposition ----
{
  // Deux groupes de 0 à 9 entrées chacun : 99 dispositions. Depuis la première
  // tuile, un parcours en largeur par les quatre directions doit tout atteindre.
  let dispositions = 0;
  for (let n1 = 0; n1 <= 9; n1++) {
    for (let n2 = 0; n2 <= 9; n2++) {
      if (n1 + n2 === 0) continue;
      const entrees = [...Array(n1).fill({ groupe: 'un' }), ...Array(n2).fill({ groupe: 'deux' })];
      const { cases } = disposerTuiles(entrees, COLONNES_TUILES);
      const presente = (i) => cases[i] !== null;
      const depart = cases.findIndex((c) => c !== null);
      const vus = new Set([depart]);
      const file = [depart];
      while (file.length) {
        const i = file.shift();
        for (const d of ['haut', 'bas', 'gauche', 'droite']) {
          const j = voisin(i, d, COLONNES_TUILES, cases.length, presente);
          assert.ok(presente(j), 'le focus ne se pose jamais sur une case de remplissage');
          if (!vus.has(j)) { vus.add(j); file.push(j); }
        }
      }
      assert.equal(vus.size, n1 + n2, `${n1} + ${n2} entrées : toutes atteignables`);
      dispositions += 1;
    }
  }
  console.log(`OK navigation : toute tuile atteignable, sur ${dispositions} dispositions à deux groupes`);
}

// --- 3. replierFocus -------------------------------------------------------------
{
  assert.equal(replierFocus([], null), -1, 'aucune tuile : aucun focus');
  assert.equal(replierFocus([0, 1, 2], undefined), 0, 'premier affichage : la première tuile');
  assert.equal(replierFocus([0, 1, 2], 1), 1, 'sa case porte toujours une tuile : on n’y touche pas');
  assert.equal(replierFocus([0, 1], 2), 1, 'la dernière tuile a disparu : on recule d’un cran, on ne saute pas en tête');
  assert.equal(replierFocus([0, 1, 2, null, 3], 3), 2, 'jamais sur une case de remplissage : la tuile présente juste avant');
  assert.equal(replierFocus([null, 0], 0), 1, 'rien avant : la première présente');
  console.log('OK replierFocus : sur sa case, sinon un cran en arrière, sinon la première');
}

// --- 4. cadrer : les icônes ne bougent pas, les silhouettes du monde tiennent ------
{
  const visuels = lireJson('data', 'visuels.json');
  const parId = new Map(visuels.map((v) => [v.id, v]));
  for (const v of visuels.filter((x) => x.id.startsWith('visuel_icone_'))) {
    assert.deepEqual(cadrer(v, 140), { x: 70, y: 70, echelle: 10 }, `${v.id} : une icône garde exactement son cadrage d’avant`);
  }
  for (const id of ['visuel_table', 'visuel_coffre', 'visuel_atelier', 'visuel_hache']) {
    const c = cadrer(parId.get(id), 140);
    assert.ok(c.echelle < 10, `${id} : trop grand pour la boîte de référence, donc réduit`);
  }
  console.log('OK cadrer : aucune icône de menu ou de stat ne bouge ; les silhouettes du monde sont recadrées');
}

// --- Faux DOM minimal — même gabarit que test_d43_a3 (copié, pas partagé :
// convention du dépôt). Sans `setProperty`, `setAttribute`, `classList` ni
// `scrollIntoView` : le composant doit vivre sans.
class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this._classes = [];
    this._listeners = {};
    this._texte = '';
    this.hidden = false;
  }
  get className() { return this._classes.join(' '); }
  set className(v) { this._classes = String(v || '').split(/\s+/).filter(Boolean); }
  appendChild(enfant) { enfant.parentNode = this; this.children.push(enfant); return enfant; }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  declencher(type) { for (const fn of this._listeners[type] || []) fn({}); }
  get textContent() { return this._texte; }
  set textContent(v) { this._texte = v; this.children = []; }
  set innerHTML(html) { assert.equal(html, '', 'le composant ne compose jamais de HTML : il ne fait que vider'); this.children = []; }
  querySelectorAll(selecteur) {
    const classe = selecteur.slice(1);
    const trouves = [];
    const visiter = (el) => { for (const e of el.children) { if (e._classes.includes(classe)) trouves.push(e); visiter(e); } };
    visiter(this);
    return trouves;
  }
}
const creerFauxDocument = () => ({ createElement: (tag) => new ElementFactice(tag), body: new ElementFactice('body') });
function etatInput({ x = 0, y = 0, attack = false, skill3 = false } = {}) {
  const b = (v) => ({ pressed: v, held: v });
  return { move: { x, y }, attack: b(attack), skill_1: b(false), skill_2: b(false), skill_3: b(skill3), consume: b(false), interact: b(false), menu: b(false) };
}

function monter({ entrees, profondeurSous = 1 }) {
  const document = creerFauxDocument();
  const journal = [];
  const nav = creerNavigationEcrans({ onFermer: () => journal.push('FERME') });
  const ecran = creerEcranFiches({
    document, i18n: { t: (cle) => cle },
    afficherEcran: (el, visible) => { el.hidden = !visible; el.style.display = visible ? 'flex' : 'none'; },
    seuilPoussee: 0.5,
    dessinerIcone: (canvas, id) => journal.push(`icone:${id}`),
    onRetour: () => nav.retour(),
    aLaRacine: () => nav.profondeur() === 1,
    icones: { fermer: 'icone_x', retour: 'icone_fleche' },
  });
  // Un écran quelconque SOUS celui-ci, pour que « retour » ait où revenir.
  const dessous = { montrer() {}, masquer() {}, estVisible: () => true, traiterInput() {} };
  for (let i = 0; i < profondeurSous; i++) nav.empiler({ vue: dessous, id: `dessous_${i}` });
  const niveau = { vue: ecran, id: 'ecran_test', titre: 'Titre', obtenirEntrees: () => entrees(), sousTitre: () => 'sous-titre', texteVide: 'rien ici' };
  nav.empiler(niveau);
  const jouer = (e) => { nav.traiterInput(e); nav.traiterInput(etatInput()); };
  return { document, journal, nav, ecran, niveau, jouer, el: ecran.element };
}

// --- 5. Structure DOM -----------------------------------------------------------
{
  const faits = [];
  const liste = [
    { titre: 'Branche', icone: 'visuel_branche', quantite: 6, lignes: ['ressource'], groupe: 'Poche', libelleAction: 'Déposer', action: () => faits.push('branche') },
    { titre: 'Fruit', icone: 'visuel_fruit', quantite: 3, marque: true, groupe: 'Poche', libelleAction: 'Déposer', action: () => faits.push('fruit') },
    { titre: 'Bois', icone: 'visuel_bois', quantite: 12, grisee: true, groupe: 'Coffre', libelleAction: 'Retirer', action: () => faits.push('bois') },
  ];
  const banc = monter({ entrees: () => liste });
  const { el, document } = banc;

  assert.equal(document.body.children.includes(el), true);
  assert.deepEqual(el._classes, ['ecran-ui', 'ecran-cartes', 'ecran-fiches'], 'la boîte, l’unité et les jetons des cartes, plus sa propre classe');
  const [corps, entete] = el.children;
  assert.ok(corps._classes.includes('ecran-ui-corps') && entete._classes.includes('ecran-ui-entete'), 'le corps d’abord, l’en-tête (la sortie) en DERNIER enfant');
  assert.ok(entete._classes.includes('cartes-entete'), 'le MÊME en-tête que le menu : la sortie au même endroit');
  const sortie = entete.children.at(-1);
  assert.equal(sortie.dataset.sortie, 'ecran');
  assert.equal(entete.querySelectorAll('.tuile').length, 0, 'l’en-tête ne contient jamais une tuile');
  assert.equal(entete.querySelectorAll('.cartes-titre')[0].textContent, 'Titre');
  assert.equal(entete.querySelectorAll('.cartes-message')[0].textContent, 'sous-titre', 'le sous-titre de l’écran prend la place du message d’en-tête');
  assert.equal(sortie.querySelectorAll('.carte-icone')[0].dataset.icone, 'icone_fleche', 'un écran dessous : la sortie est un RETOUR');

  const grille = corps.children[0];
  const tuiles = grille.querySelectorAll('.tuile');
  assert.equal(tuiles.length, 3);
  assert.deepEqual(grille.querySelectorAll('.fiches-groupe').map((g) => g.textContent), ['Poche', 'Coffre']);
  const vides = grille.querySelectorAll('.tuile-vide');
  assert.equal(vides.length, 2, 'la rangée de « Poche » est comblée : le groupe suivant commence sur une rangée neuve');
  assert.deepEqual(vides.map((v) => Object.keys(v._listeners).length), [0, 0], 'une case de remplissage n’écoute rien');
  assert.equal(tuiles[0].querySelectorAll('.tuile-quantite')[0].textContent, '6');
  assert.equal(tuiles[1].querySelectorAll('.tuile-marque').length, 1, '« équipé » : une forme posée sur la tuile');
  assert.ok(tuiles[2]._classes.includes('tuile-grisee'));
  assert.ok(tuiles.every((t) => t.tagName === 'DIV'), 'une tuile est un <div>, jamais un <button> (Espace = ATTACK)');

  const fiche = corps.children[1];
  assert.equal(fiche.querySelectorAll('.fiche-titre')[0].textContent, 'Branche', 'la fiche est celle de la tuile focalisée : la première');
  assert.deepEqual(fiche.querySelectorAll('.fiche-ligne').map((l) => l.textContent), ['ressource']);
  const bouton = fiche.querySelectorAll('.fiche-action')[0];
  assert.deepEqual([bouton.tagName, bouton.textContent], ['DIV', 'Déposer']);
  assert.ok(banc.journal.includes('icone:visuel_branche') && banc.journal.includes('icone:icone_fleche'), 'tuiles, fiche et en-tête : les icônes sont dessinées');
  console.log('OK structure DOM : sortie dans l’en-tête figé, groupes, cases de remplissage inertes, fiche de la tuile focalisée');

  // --- 6. LE GESTE : une tuile se sélectionne, la fiche agit -------------------
  tuiles[1].declencher('click');
  assert.deepEqual(faits, [], 'cliquer une tuile la SÉLECTIONNE : rien ne s’est passé');
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Fruit');
  assert.equal(fiche.querySelectorAll('.fiche-titre')[0].textContent, 'Fruit', 'et la fiche suit');
  fiche.querySelectorAll('.fiche-action')[0].declencher('click');
  assert.deepEqual(faits, ['fruit'], 'le bouton de la fiche AGIT');
  banc.jouer(etatInput({ attack: true }));
  assert.deepEqual(faits, ['fruit', 'fruit'], 'A fait exactement ce que fait le bouton');

  // Survol = sélection ; le stick aussi, en sautant la case de remplissage.
  corps.children[0].querySelectorAll('.tuile')[0].declencher('mouseenter');
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Branche');
  banc.jouer(etatInput({ y: 1 }));
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Bois', 'bas : du groupe Poche au groupe Coffre');
  // Rien à droite sur SA rangée : `voisin()` prend la tuile la plus proche dans
  // cette direction (sa seconde passe, celle qui garantit que tout reste
  // atteignable) — jamais vers l'arrière, jamais en bouclant.
  banc.jouer(etatInput({ x: 1 }));
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Fruit');
  banc.jouer(etatInput({ x: 1 }));
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Fruit', 'au bord : le focus ne bouge plus, et ne boucle pas');
  banc.jouer(etatInput({ y: 1 }));
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Bois');
  // Grisée : un indice, jamais un verrou.
  assert.ok(corps.children[1].querySelectorAll('.fiche-action')[0]._classes.includes('fiche-action-grisee'));
  banc.jouer(etatInput({ attack: true }));
  assert.deepEqual(faits, ['fruit', 'fruit', 'bois'], 'une entrée grisée retente quand même l’action réelle : le résultat fait foi');
  console.log('OK geste : tuile = sélection (clic, survol, stick) ; fiche = action ; A et le bouton : une seule fonction');

  // --- 7. Après une action l'écran se relit, et le focus reste sur sa case ------
  liste.pop(); // la pile « Bois » vient de partir du coffre
  banc.ecran.rafraichir();
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Fruit', 'sa tuile a disparu : le focus recule d’un cran');
  // Sortie : B et le bouton d'en-tête, la même fonction (celle de la pile).
  banc.jouer(etatInput({ skill3: true }));
  assert.deepEqual([banc.nav.profondeur(), el.hidden], [1, true], 'B : un niveau dépilé, l’écran est masqué PAR LA PILE');
  banc.nav.empiler(banc.niveau);
  assert.equal(banc.ecran.obtenirEtat().entreeFocalisee, 'Fruit', 'le focus est dans le NIVEAU : on le retrouve en revenant');
  sortie.declencher('click');
  assert.deepEqual([banc.nav.profondeur(), el.hidden], [1, true], 'le bouton d’en-tête : pareil');
  console.log('OK relecture : focus conservé ; sortie : B et le bouton d’en-tête passent par la pile');
}

// --- 8. Seul dans la pile (Craft, Coffre) : la sortie FERME ; liste vide -------------
{
  const banc = monter({ entrees: () => [], profondeurSous: 0 });
  const [corps, entete] = banc.el.children;
  assert.equal(entete.children.at(-1).querySelectorAll('.carte-icone')[0].dataset.icone, 'icone_x', 'rien dessous : la sortie est une FERMETURE');
  assert.equal(corps.children[0].querySelectorAll('.tuile').length, 0);
  assert.equal(corps.children[1].querySelectorAll('.fiche-vide')[0].textContent, 'rien ici', 'aucune entrée : la fiche le dit');
  assert.equal(corps.children[1].querySelectorAll('.fiche-action').length, 0);
  banc.jouer(etatInput({ attack: true })); // A sur rien : rien, et surtout aucune exception
  banc.jouer(etatInput({ x: 1 }));
  banc.jouer(etatInput({ skill3: true }));
  assert.deepEqual([banc.nav.profondeur(), banc.journal.includes('FERME')], [0, true], 'B, seul dans la pile : tout est fermé');
  console.log('OK seul dans la pile : la sortie ferme ; liste vide : la fiche le dit, aucun verbe ne lève');
}


// --- 9. La feuille de style : ce qui se prouve sans moteur de mise en page ------------
{
  const css = /<style>([\s\S]*?)<\/style>/.exec(fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'))[1];
  // Le corps de la première règle dont le sélecteur est exactement `selecteur`.
  const regle = (selecteur) => {
    const debut = css.indexOf(`\n    ${selecteur} {`);
    assert.ok(debut >= 0, `règle ${selecteur} présente`);
    return css.slice(debut, css.indexOf('}', debut));
  };
  // Toute interface ouvrable au tactile est fermable au tactile, sans
  // défilement : seule la GRILLE DE TUILES défile, à l'intérieur d'elle-même —
  // jamais le corps (donc jamais la fiche ni son bouton), jamais l'en-tête.
  assert.match(regle('.fiches-corps'), /overflow:\s*hidden/, 'le corps ne défile pas');
  assert.match(regle('.fiches-tuiles'), /overflow-y:\s*auto/, 'la grille de tuiles défile en elle-même');
  assert.match(regle('.fiches-tuiles'), /scroll-padding/, 'et laisse au halo du focus la place de se voir');
  assert.match(regle('.fiche-action'), /min-height:\s*max\([^;]*40px\)/, 'le bouton de la fiche : une cible d’au moins 40 px de page');
  // Aucune couleur écrite dans les règles du palier C : tout vient des jetons.
  const blocFiches = css.slice(css.indexOf('Écrans « maître-détail »')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(blocFiches), false, 'aucune couleur en dur : les jetons, et eux seuls');
  console.log('OK feuille de style : seule la grille de tuiles défile ; cible de 40 px ; aucune couleur en dur');
}

console.log('OK test_d43_c1_ecran_fiches');

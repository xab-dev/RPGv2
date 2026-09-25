// `D-43`, palier A3 (specs/08_menus-cartes.md §4, §7) — le composant grille :
// trois types de cartes, navigation en deux dimensions, cases stables.
//
// CE QUE CE FICHIER NE PROUVE PAS, et ne peut pas prouver : qu'un écran TIENT
// dans 703 × 280, que le focus se voit assez, qu'une icône ressemble à ce
// qu'elle veut dire. Node n'a pas de moteur de mise en page : c'est le rôle des
// captures de `docs/captures/menus-cartes-2026-09-20/` et de `V-27`.
//
// Ce qui est prouvé ici, d'abord sur la part pure (`menu_cartes.js`), puis sur
// la structure DOM du composant (`ui/grille_cartes.js`) :
//   1. `voisin()` — ligne droite, saut des cases vides, pas de bouclage, et la
//      garantie qu'aucune carte n'est jamais inatteignable au stick ;
//   2. les cases stables et la case contextuelle (`resoudreCases`) ;
//   3. le front montant sur deux axes ;
//   4. la pile, et le focus rendu à la carte qui avait ouvert l'écran ;
//   5. la confirmation d'un danger : « Non » d'abord ;
//   6. la structure DOM : l'en-tête ne contient jamais une carte, une case
//      vide n'est pas focalisable ;
//   7. les trois types : un dossier empile, une bascule reste, une action ferme ;
//   8. le refus d'une bascule s'annonce dans l'en-tête, la carte ne bouge pas ;
//   9. clic et verbe passent par la même fonction ;
//  10. un écran existant (Poche…) masque la grille sans la dépiler.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  voisin, resoudreCases, premiereCasePresente, creerLecteurDirection,
  construireConfirmation, choisirGrille, CLES_TEXTE_COMPOSANT, erreursTextesMenus,
} from '../src/menu_cartes.js';
import { creerMenuCartes } from '../src/ui/grille_cartes.js';
import { afficherEcran, SEUIL_POUSSEE_MENU } from '../src/ui/menu.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MENUS = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'menus.json'), 'utf8'));
const lireLocale = (l) => JSON.parse(fs.readFileSync(path.join(RACINE, 'locales', `${l}.json`), 'utf8'));

// --- 1. voisin() ---------------------------------------------------------------
{
  // Grille pleine 2 × 2 :  0 1
  //                        2 3
  assert.equal(voisin(0, 'droite', 2, 4), 1);
  assert.equal(voisin(0, 'bas', 2, 4), 2);
  assert.equal(voisin(3, 'haut', 2, 4), 1);
  assert.equal(voisin(3, 'gauche', 2, 4), 2);
  // Pas de bouclage d'un bord à l'autre (*provisoire*).
  assert.equal(voisin(0, 'gauche', 2, 4), 0);
  assert.equal(voisin(0, 'haut', 2, 4), 0);
  assert.equal(voisin(1, 'droite', 2, 4), 1);
  assert.equal(voisin(3, 'bas', 2, 4), 3);
  // Grille 3 × 2 :  0 1 2
  //                 3 4 5
  assert.equal(voisin(1, 'bas', 3, 6), 4);
  assert.equal(voisin(5, 'gauche', 3, 6), 4);
  // Une case vide se SAUTE, en ligne droite.
  const sans = (...vides) => (i) => !vides.includes(i);
  assert.equal(voisin(0, 'droite', 3, 6, sans(1)), 2, '0 → (1 vide) → 2');
  assert.equal(voisin(5, 'gauche', 3, 6, sans(4)), 3);
  // Rien en ligne droite : la carte la plus proche DANS CETTE DIRECTION.
  // Ce n'est pas un cas d'école, c'est l'écran Sauvegarde :  0 1 / 2 ·
  // — depuis Importer (1), « bas » ne rencontre aucune carte en ligne droite.
  assert.equal(voisin(1, 'bas', 2, 4, sans(3)), 2, 'pas de carte sous Importer : on descend quand même, vers Réinitialiser');
  assert.equal(voisin(2, 'droite', 2, 4, sans(3)), 1);
  // Seules 0 et 3 présentes : ni « droite » ni « bas » n'y mènent en ligne droite.
  assert.equal(voisin(0, 'bas', 2, 4, sans(1, 2)), 3);
  assert.equal(voisin(0, 'droite', 2, 4, sans(1, 2)), 3);
  assert.equal(voisin(3, 'haut', 2, 4, sans(1, 2)), 0);
  // Jamais vers l'arrière : « gauche » depuis la colonne 0 ne va nulle part.
  assert.equal(voisin(0, 'gauche', 2, 4, sans(1, 2)), 0);
  // Entrées hors domaine : l'index revient tel quel, jamais une exception.
  assert.equal(voisin(0, 'nord', 2, 4), 0);
  assert.equal(voisin(9, 'bas', 2, 4), 9);

  // La garantie, vérifiée EXHAUSTIVEMENT : pour chaque grille et chaque
  // sous-ensemble de cases présentes, toute carte est atteignable depuis
  // toute autre. 2 × 2 : 16 sous-ensembles ; 3 × 2 : 64.
  let combinaisons = 0;
  for (const [colonnes, total] of [[2, 4], [3, 6]]) {
    for (let masque = 1; masque < 2 ** total; masque++) {
      const presentes = [...Array(total).keys()].filter((i) => masque & (1 << i));
      const estPresente = (i) => presentes.includes(i);
      for (const depart of presentes) {
        const atteints = new Set([depart]);
        const file = [depart];
        while (file.length > 0) {
          const courant = file.shift();
          for (const direction of ['haut', 'bas', 'gauche', 'droite']) {
            const suivant = voisin(courant, direction, colonnes, total, estPresente);
            assert.ok(estPresente(suivant), `voisin() ne rend jamais une case vide (${colonnes} col., masque ${masque})`);
            if (!atteints.has(suivant)) { atteints.add(suivant); file.push(suivant); }
          }
        }
        assert.equal(atteints.size, presentes.length, `${colonnes} col., cases ${presentes} : tout doit être atteignable depuis ${depart}`);
      }
      combinaisons += 1;
    }
  }
  console.log(`OK voisin() : ligne droite, saut des cases vides, sans bouclage — et aucune carte inatteignable (${combinaisons} combinaisons)`);
}

// --- 2. Cases stables et case contextuelle ----------------------------------------
{
  const racine = MENUS.find((e) => e.racine);
  const dehors = resoudreCases(racine, () => false);
  // Indices (Xav, 23/09) : hors de la Maison, la case contextuelle n'est plus
  // vide — la candidate sans condition la prend.
  assert.deepEqual(dehors.map((c) => c && c.id), ['carte_heros', 'carte_parametres', null, 'carte_indices'], 'hors de la Maison : les Indices prennent la case contextuelle, les autres ne glissent pas');
  const dedans = resoudreCases(racine, () => true);
  assert.deepEqual(dedans.map((c) => c && c.id), ['carte_heros', 'carte_parametres', null, 'carte_construction'], 'la case 2 est réservée : rien n\'y est jamais dessiné');
  assert.equal(dehors.length, 4, 'la taille de la grille ne dépend pas des conditions');

  // Plein écran sans API : sa case reste vide, Sauvegarde ne remonte pas.
  const parametres = MENUS.find((e) => e.id === 'menu_parametres');
  // `D-64` (T7) : la carte Volume s'intercale en case 3, Sauvegarde passe en
  // case 4 — donc la grille passe de 2 × 2 à 3 × 2, et la 6ᵉ case reste vide.
  // Ce qui est éprouvé ici ne change pas : une carte absente laisse sa case
  // VIDE, elle ne fait glisser personne.
  assert.deepEqual(resoudreCases(parametres, () => false).map((c) => c && c.id), ['carte_langue', 'carte_musique', null, 'carte_volume', 'carte_sauvegarde', 'carte_graphismes']);

  // Case contextuelle : des candidates ORDONNÉES, la première vraie gagne.
  const ecran = { cartes: [
    { id: 'a', case: 0 },
    { id: 'jardin', case: 1, condition: 'c_jardin' },
    { id: 'construction', case: 1, condition: 'c_maison' },
    { id: 'indices', case: 1, condition: 'c_indices' },
  ] };
  const avec = (...vraies) => (c) => vraies.includes(c);
  assert.equal(resoudreCases(ecran, avec('c_maison', 'c_indices'))[1].id, 'construction', 'la première candidate vraie, dans l\'ordre du fichier');
  assert.equal(resoudreCases(ecran, avec('c_jardin', 'c_maison'))[1].id, 'jardin');
  assert.equal(resoudreCases(ecran, avec())[1], null, 'aucune candidate : rien n\'est dessiné');
  assert.equal(premiereCasePresente(resoudreCases(ecran, avec())), 0);
  assert.equal(premiereCasePresente([null, null, { id: 'x' }, null]), 2);
  assert.equal(premiereCasePresente([null, null]), -1);
  console.log('OK cases : positions stables, case réservée, case contextuelle à candidates ordonnées');
}

// --- 3. Front montant sur deux axes -------------------------------------------------
{
  const lecteur = creerLecteurDirection(SEUIL_POUSSEE_MENU);
  assert.equal(lecteur.lire({ x: 0, y: 0 }), null);
  assert.equal(lecteur.lire({ x: 1, y: 0 }), 'droite');
  assert.equal(lecteur.lire({ x: 1, y: 0 }), null, 'stick maintenu : un seul cran');
  assert.equal(lecteur.lire({ x: 0.3, y: 0 }), null, 'sous le seuil = neutre');
  assert.equal(lecteur.lire({ x: -1, y: 0 }), 'gauche');
  assert.equal(lecteur.lire({ x: -1, y: 1 }), 'bas', 'un axe maintenu n\'empêche pas l\'autre de partir');
  lecteur.reinitialiser();
  assert.equal(lecteur.lire({ x: 1, y: -1 }), 'haut', 'diagonale : UN cran, le vertical d\'abord');
  assert.equal(lecteur.lire({ x: 1, y: -1 }), null);
  console.log('OK lecteur de direction : front montant par axe, un seul cran en diagonale');
}

// --- 4. Pile : la pile LOCALE du palier A a été remplacée au palier B par LA
// pile du menu entier — `test_d43_b1_navigation_ecrans` en porte le contrat
// (dont « le niveau retrouvé a gardé SON focus »). 5. Confirmation -------------
{
  const reset = MENUS.flatMap((e) => e.cartes).find((c) => c.danger);
  const confirmation = construireConfirmation(reset, 'visuel_icone_menu_retour');
  assert.equal(confirmation.cle_titre, reset.cle_confirmation);
  assert.deepEqual(confirmation.cartes.map((c) => [c.case, c.interne, !!c.danger]), [[0, 'retour', false], [1, 'confirmer', true]], '« Non » en case 0, donc focus par défaut ; « Oui » en magenta');
  assert.equal(confirmation.cartes[1].action, reset.action);
  assert.equal(confirmation.cartes[0].action, undefined, '« Non » ne porte aucune action : il dépile');
  assert.deepEqual(choisirGrille(2), { colonnes: 2, rangees: 2 });
  assert.deepEqual(erreursTextesMenus([confirmation], { fr: lireLocale('fr'), en: lireLocale('en') }, CLES_TEXTE_COMPOSANT), [], 'les textes du composant existent en FR et en EN');
  console.log('OK confirmation : « Non » d\'abord, toujours');
}

// --- Faux DOM minimal — même gabarit que les autres tests d'UI (copié, pas
// partagé : convention du dépôt). Volontairement SANS `setProperty`,
// `setAttribute` ni `classList` : le composant doit vivre sans.
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
  return { move: { x, y }, attack: b(attack), skill_1: b(false), skill_2: b(false), skill_3: b(skill3), consume: b(false), interact: b(false), menu: b(false), target_next: b(false) };
}

function monter({ vraies = ['stations_placables', 'plein_ecran_disponible'] } = {}) {
  const document = creerFauxDocument();
  const journal = [];
  const monde = { musique: true, pleinEcran: false, refuser: false, volume: 50 };
  const conditions = { vraies };
  const menu = creerMenuCartes({
    document, i18n: { t: (cle) => `«${cle}»` }, menus: MENUS, afficherEcran, seuilPoussee: SEUIL_POUSSEE_MENU,
    actions: {
      action_basculer_langue: () => journal.push('langue'),
      action_basculer_musique: () => { monde.musique = !monde.musique; journal.push('musique'); },
      action_basculer_plein_ecran: () => {
        journal.push('plein_ecran');
        if (monde.refuser) return { cleMessage: 'menu.plein_ecran_refuse' };
        monde.pleinEcran = !monde.pleinEcran;
        return null;
      },
      action_exporter_sauvegarde: () => journal.push('exporter'),
      action_importer_sauvegarde: () => journal.push('importer'),
      action_reinitialiser_sauvegarde: () => journal.push('REINITIALISER'),
      // `D-64` (T7) : la carte Volume, qui cycle des paliers.
      action_cycler_volume: () => { monde.volume = (monde.volume + 25) % 125; },
    },
    etats: {
      etat_langue: () => 'menu.etat.langue_fr',
      etat_musique: () => (monde.musique ? 'menu.etat.musique_oui' : 'menu.etat.musique_non'),
      etat_plein_ecran: () => (monde.pleinEcran ? 'menu.etat.plein_ecran_oui' : 'menu.etat.plein_ecran_non'),
      etat_volume: () => `menu.etat.volume_${monde.volume}`,
      etat_graphismes: () => 'menu.etat.graphismes_auto_moyen',
    },
    ecrans: {
      ecran_poche: () => journal.push('ouvre:poche'),
      ecran_stats: () => journal.push('ouvre:stats'),
      ecran_construction: () => journal.push('ouvre:construction'),
    },
    evaluerCondition: (c) => conditions.vraies.includes(c.valeur),
    onFermer: () => journal.push('FERME'),
  });
  const el = menu.element;
  const parCarte = (id) => el.querySelectorAll('.carte').find((c) => c.dataset.carte === id);
  const appuyer = (options) => menu.traiterInput(etatInput(options));
  // Un cran de stick = une poussée puis un retour au neutre.
  const cran = (x, y) => { appuyer({ x, y }); appuyer(); };
  return { menu, el, journal, monde, conditions, parCarte, appuyer, cran };
}

// --- 6. Structure DOM --------------------------------------------------------------
{
  const { menu, el, parCarte } = monter({ vraies: [] });
  assert.equal(menu.estOuvert(), false, 'fermé tant qu\'on ne l\'ouvre pas');
  assert.equal(el.hidden, true);
  menu.ouvrir();
  assert.equal(menu.estOuvert(), true);
  assert.equal(el.hidden, false);
  assert.deepEqual(el._classes, ['ecran-ui', 'ecran-cartes'], 'l\'habillage partagé de `D-42`, plus le sien');

  const [entete] = el.querySelectorAll('.ecran-ui-entete');
  const [corps] = el.querySelectorAll('.ecran-ui-corps');
  assert.equal(entete.querySelectorAll('.carte').length, 0, 'l\'en-tête ne contient JAMAIS une carte');
  assert.equal(entete.querySelectorAll('.carte-vide').length, 0);
  assert.equal(entete.querySelectorAll('.cartes-bouton-entete').length, 1, 'la sortie vit dans l\'en-tête figé…');
  assert.equal(corps.querySelectorAll('.cartes-bouton-entete').length, 0, '…et nulle part dans la grille');
  assert.equal(el.children[el.children.length - 1], entete, 'l\'en-tête reste le DERNIER enfant du document (il remonte à l\'écran par `order: -1`)');

  // Cases stables : quatre éléments, toujours, dans l'ordre des cases.
  const [grille] = el.querySelectorAll('.cartes-grille');
  assert.equal(grille.children.length, 4);
  assert.deepEqual(grille.children.map((c) => c.dataset.case), ['0', '1', '2', '3']);
  // Hors de la Maison, les Indices tiennent la case 3 (Xav, 23/09) : la
  // case 2, réservée, reste la case vide que la suite éprouve.
  assert.deepEqual(grille.children.map((c) => c._classes[0]), ['carte', 'carte', 'carte-vide', 'carte']);
  assert.equal(grille.dataset.colonnes, '2');

  // Une case vide n'est pas focalisable : aucun écouteur, aucune classe de
  // carte, et ni le survol ni le clic n'y déplacent le focus.
  const vide = grille.children[2];
  assert.deepEqual(vide._listeners, {}, 'une case vide n\'écoute rien');
  assert.equal(vide.children.length, 0, 'et ne dessine rien');
  vide.declencher('mouseenter');
  vide.declencher('click');
  assert.equal(menu.obtenirEtat().focus, 0);
  assert.ok(parCarte('carte_heros')._classes.includes('carte-focus'), 'focus sur la première carte présente, à l\'ouverture');
  assert.equal(el.querySelectorAll('.carte-focus').length, 1, 'un seul focus à la fois');
  // Les cartes sont des <div> : un <button> garderait le focus natif après un
  // clic, et Espace (= ATTACK) l'activerait une seconde fois.
  assert.ok(grille.children.every((c) => c.tagName === 'DIV'));
  console.log('OK structure DOM : sortie dans l\'en-tête figé, jamais une carte dedans ; cases stables ; case vide inerte');
}

// --- 7. Les trois types, et le focus rendu au retour ----------------------------------
{
  const { menu, journal, monde, parCarte, appuyer, cran } = monter();
  menu.ouvrir();
  // Racine : Héros(0) Paramètres(1) / ·(2) Construction(3).
  cran(1, 0);
  assert.equal(menu.obtenirEtat().focus, 1);
  appuyer({ attack: true }); // DOSSIER : empile
  assert.deepEqual([menu.obtenirEtat().ecran, menu.obtenirEtat().profondeur, menu.obtenirEtat().focus], ['menu_parametres', 2, 0]);

  cran(1, 0); // → Musique
  appuyer({ attack: true }); // BASCULE : change sur place, l'écran reste
  assert.equal(monde.musique, false);
  assert.equal(menu.obtenirEtat().ecran, 'menu_parametres', 'une bascule ne ferme rien');
  assert.equal(menu.obtenirEtat().focus, 1, 'et le focus ne bouge pas');
  assert.equal(parCarte('carte_musique').querySelectorAll('.carte-etat')[0].textContent, '«menu.etat.musique_non»', 'l\'état affiché est relu à la source après la bascule');
  assert.equal(parCarte('carte_musique').querySelectorAll('.carte-phrase').length, 1, 'l\'état tient la place de la phrase');

  cran(0, 1); // → Sauvegarde (case 3)
  appuyer({ attack: true });
  assert.equal(menu.obtenirEtat().ecran, 'menu_sauvegarde');
  cran(0, 1); // → Réinitialiser (case 2)
  assert.equal(menu.obtenirEtat().focus, 2);
  appuyer({ attack: true }); // ACTION + danger : confirmation, RIEN n'est exécuté
  assert.equal(menu.obtenirEtat().ecran, 'carte_reinitialiser#confirmation');
  assert.equal(menu.obtenirEtat().focus, 0, 'focus par défaut sur « Non »');
  assert.ok(!journal.includes('REINITIALISER'));
  assert.ok(parCarte('carte_reinitialiser#oui')._classes.includes('carte-danger'));

  appuyer({ attack: true }); // « Non, revenir » : dépile UN écran
  assert.deepEqual([menu.obtenirEtat().ecran, menu.obtenirEtat().focus], ['menu_sauvegarde', 2], 'retour sur Sauvegarde, focus rendu à Réinitialiser');
  appuyer({ skill3: true }); // B : dépile UN écran
  // `D-64` (T7) : Sauvegarde est passée en case 4, la carte Volume occupant
  // la 3. Le focus rendu suit la carte, pas un numéro de case appris par cœur.
  assert.deepEqual([menu.obtenirEtat().ecran, menu.obtenirEtat().focus], ['menu_parametres', 4], 'focus rendu à la carte Sauvegarde');
  appuyer({ skill3: true });
  assert.deepEqual([menu.obtenirEtat().ecran, menu.obtenirEtat().focus], ['menu_racine', 1], 'focus rendu à la carte Paramètres');
  assert.ok(!journal.includes('FERME'));
  appuyer({ skill3: true }); // B à la racine : ferme
  assert.equal(menu.estOuvert(), false);
  assert.deepEqual(journal.filter((j) => j === 'FERME'), ['FERME'], 'fermé une fois, et une seule');

  // « Oui » : la pop-up (`D-244`), puis son « Oui » agit, PUIS ferme.
  menu.ouvrir();
  assert.equal(menu.obtenirEtat().focus, 0, 'une réouverture repart de la racine, focus en tête');
  parCarte('carte_parametres').declencher('click');
  parCarte('carte_sauvegarde').declencher('click');
  parCarte('carte_reinitialiser').declencher('click');
  cran(1, 0);
  appuyer({ attack: true });
  assert.equal(menu.obtenirEtat().ecran, 'carte_reinitialiser#oui#popup', '« Oui » ouvre la pop-up');
  assert.equal(menu.obtenirEtat().focus, 0, 'focus par défaut sur son « Non »');
  assert.ok(!journal.includes('REINITIALISER'), 'rien n’est effacé avant le second oui');
  appuyer({ skill3: true }); // B : la pop-up se referme, la confirmation revient
  assert.deepEqual([menu.obtenirEtat().ecran, menu.obtenirEtat().focus], ['carte_reinitialiser#confirmation', 1], 'focus rendu au « Oui » qui l’avait ouverte');
  appuyer({ attack: true });
  cran(1, 0);
  appuyer({ attack: true });
  assert.deepEqual(journal.slice(-2), ['REINITIALISER', 'FERME']);
  assert.equal(menu.estOuvert(), false);

  // Une action ordinaire : agit, puis ferme, sans confirmation.
  menu.ouvrir();
  parCarte('carte_parametres').declencher('click');
  parCarte('carte_sauvegarde').declencher('click');
  parCarte('carte_exporter').declencher('click');
  assert.deepEqual(journal.slice(-2), ['exporter', 'FERME']);
  console.log('OK types : dossier empile · bascule reste · action ferme · danger confirme d\'abord · focus rendu à chaque retour');
}

// --- 8. Un refus s'annonce dans l'en-tête, la carte ne bouge pas -----------------------
{
  const { menu, el, monde, parCarte } = monter();
  menu.ouvrir();
  parCarte('carte_parametres').declencher('click');
  monde.refuser = true;
  parCarte('carte_plein_ecran').declencher('click');
  const [message] = el.querySelectorAll('.cartes-message');
  assert.equal(message.textContent, '«menu.plein_ecran_refuse»', 'le refus est DIT, par une clé de texte');
  assert.equal(parCarte('carte_plein_ecran').querySelectorAll('.carte-etat')[0].textContent, '«menu.etat.plein_ecran_non»', 'la carte est inchangée');
  assert.equal(menu.obtenirEtat().ecran, 'menu_parametres');
  // Le message s'efface à l'action suivante.
  parCarte('carte_musique').declencher('click');
  assert.equal(message.textContent, '');
  console.log('OK refus d\'une bascule : message dans l\'en-tête, carte inchangée, effacé à l\'action suivante');
}

// --- 9. Clic, survol et verbe : un seul chemin ------------------------------------------
{
  const { menu, el, journal, parCarte } = monter();
  menu.ouvrir();
  parCarte('carte_construction').declencher('mouseenter');
  assert.equal(menu.obtenirEtat().focus, 3, 'le survol pose le focus');
  assert.equal(el.querySelectorAll('.carte-focus').length, 1, 'souris et manette ne montrent jamais deux focus');
  // Tactile : un appui active DIRECTEMENT, sans focus préalable.
  parCarte('carte_heros').declencher('click');
  assert.equal(menu.obtenirEtat().ecran, 'menu_heros');
  // `[←]` de l'en-tête = B : la même fonction.
  el.querySelectorAll('.cartes-bouton-entete')[0].declencher('click');
  assert.deepEqual([menu.obtenirEtat().ecran, menu.obtenirEtat().focus], ['menu_racine', 0]);
  // `[X]` à la racine : ferme.
  el.querySelectorAll('.cartes-bouton-entete')[0].declencher('click');
  assert.equal(menu.estOuvert(), false);
  assert.deepEqual(journal, ['FERME']);
  // Fermé, il ne route plus rien.
  menu.traiterInput(etatInput({ attack: true }));
  assert.deepEqual(journal, ['FERME']);
  console.log('OK parité : survol, clic, verbe et bouton d\'en-tête passent par les mêmes fonctions');
}

// --- 10. Un écran existant masque la grille sans la dépiler ------------------------------
{
  const { menu, el, journal, conditions, parCarte } = monter();
  menu.ouvrir();
  parCarte('carte_heros').declencher('click');
  parCarte('carte_stats').declencher('click');
  assert.deepEqual(journal, ['ouvre:stats']);
  assert.equal(el.hidden, true, 'la grille se masque : l\'écran existant est plein écran lui aussi');
  assert.equal(menu.estOuvert(), false, 'masquée = pas « ouverte » : même contrat que `creerControleurMenu#element`');
  assert.equal(menu.obtenirEtat().profondeur, 2, 'mais rien n\'est dépilé');
  menu.traiterInput(etatInput({ skill3: true }));
  assert.equal(menu.obtenirEtat().profondeur, 2, 'masquée, elle ne consomme aucun verbe');
  menu.reafficher();
  assert.deepEqual([menu.estOuvert(), menu.obtenirEtat().ecran, menu.obtenirEtat().focus], [true, 'menu_heros', 1], 'elle réapparaît où on l\'avait laissée, focus sur Stats');

  // La carte contextuelle change pendant qu'un sous-écran est ouvert : depuis
  // les Indices (Xav, 23/09), la case 3 ne devient plus vide — la candidate
  // suivante la reprend, et le focus reste sur sa case.
  menu.ouvrir();
  parCarte('carte_construction').declencher('click');
  conditions.vraies = [];
  menu.reafficher();
  assert.deepEqual([menu.obtenirEtat().focus, menu.obtenirEtat().cases[3]], [3, 'carte_indices'], 'la case contextuelle passe à la candidate suivante, le focus reste sur elle');

  // Une fermeture programmatique ne rappelle pas `onFermer`, et `reafficher`
  // sur un menu fermé est sans effet.
  menu.fermer();
  menu.reafficher();
  assert.equal(menu.estOuvert(), false);
  assert.ok(!journal.includes('FERME'));
  console.log('OK écran existant : la grille se masque sans se dépiler, et réapparaît au même endroit');
}

console.log('OK test_d43_a3_grille_cartes');

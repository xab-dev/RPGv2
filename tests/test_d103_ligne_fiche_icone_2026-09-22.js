// `D-103` (T10) — une ligne de fiche peut MONTRER ce dont elle parle.
//
// Jusqu'ici une ligne de fiche était une chaîne : aucune ligne, nulle part, ne
// pouvait porter d'image — ni l'ingrédient d'une recette, ni son coût en
// éclats. Le remède est en deux temps, et ce fichier les éprouve dans cet
// ordre : (1) une ligne devient `{ texte, icone? }`, la chaîne restant la
// forme courte ; (2) la MONNAIE a enfin où déclarer sa silhouette
// (`monnaies.json`, réponse minimale à `Q-49` — `D-68` tient : une monnaie
// n'est toujours pas un item de poche).
//
// Ce que Node ne peut pas dire : si une vignette de 12 unités posée devant une
// phrase se lit bien. C'est une validation en jeu (`V-72`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte, clesTexteFiches } from '../src/main.js';
import { creerEcranFiches, normaliserLigneFiche } from '../src/ui/ecran_fiches.js';
import { creerNavigationEcrans } from '../src/menu_cartes.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

// --- 1. La forme d'une ligne, et pourquoi il y en a deux -----------------------
{
  assert.deepEqual(normaliserLigneFiche('Outil'), { texte: 'Outil', icone: null },
    'une chaîne reste une ligne valable : c’est le cas de loin le plus courant');
  assert.deepEqual(
    normaliserLigneFiche({ texte: '2 Bois', icone: 'visuel_bois' }),
    { texte: '2 Bois', icone: 'visuel_bois' },
    'la forme longue porte la silhouette',
  );
  assert.deepEqual(normaliserLigneFiche({ texte: 'sans image' }), { texte: 'sans image', icone: null },
    'l’icône est OPTIONNELLE dans la forme longue — sinon on forcerait à en inventer une');
  // Une ligne dégénérée ne doit pas faire tomber une fiche : le détail d'un
  // objet est de l'information, pas une règle de jeu.
  for (const degenere of [null, undefined, {}]) {
    assert.deepEqual(normaliserLigneFiche(degenere), { texte: '', icone: null });
  }
  console.log('OK une ligne de fiche : chaîne ou { texte, icone? }, ramenées à une seule forme');
}

// --- Faux DOM minimal — même gabarit que test_d43_c1 (copié, pas partagé :
// convention du dépôt).
class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this._classes = [];
    this._listeners = {};
    this._texte = '';
    this.hidden = false;
  }
  get className() { return this._classes.join(' '); }
  set className(v) { this._classes = String(v || '').split(/\s+/).filter(Boolean); }
  appendChild(enfant) { this.children.push(enfant); return enfant; }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  get textContent() { return this._texte; }
  set textContent(v) { this._texte = v; this.children = []; }
  set innerHTML(html) { assert.equal(html, ''); this.children = []; }
  querySelectorAll(selecteur) {
    const classe = selecteur.slice(1);
    const trouves = [];
    const visiter = (el) => { for (const e of el.children) { if (e._classes.includes(classe)) trouves.push(e); visiter(e); } };
    visiter(this);
    return trouves;
  }
}

// --- 2. La vue dessine l'icône, par le MÊME chemin que les tuiles ---------------
{
  const document = { createElement: (tag) => new ElementFactice(tag), body: new ElementFactice('body') };
  const dessinees = [];
  const nav = creerNavigationEcrans({ onFermer: () => {} });
  const ecran = creerEcranFiches({
    document,
    i18n: { t: (cle) => cle },
    afficherEcran: (el, visible) => { el.hidden = !visible; },
    seuilPoussee: 0.5,
    dessinerIcone: (canvas, id) => dessinees.push(id),
    onRetour: () => nav.retour(),
    aLaRacine: () => true,
    icones: { fermer: 'icone_x', retour: 'icone_fleche' },
    glypheAction: () => null,
  });
  nav.empiler({
    vue: ecran,
    id: 'banc',
    titre: 'Titre',
    obtenirEntrees: () => [{
      titre: 'Hache',
      icone: 'visuel_hache',
      lignes: [
        { texte: 'Branche : 6 / 2', icone: 'visuel_branche' },
        'Outil',
        { texte: '10 éclats', icone: 'visuel_icone_eclat' },
      ],
      action: () => {},
    }],
  });

  const fiche = ecran.element.children[0].children[1];
  const lignes = fiche.querySelectorAll('.fiche-ligne');
  assert.equal(lignes.length, 3, 'trois lignes, quelle que soit leur forme');
  assert.deepEqual(
    lignes.map((l) => l._classes.includes('fiche-ligne-icone')),
    [true, false, true],
    'seule une ligne qui porte une icône prend la classe qui la met en ligne : une phrase reste une phrase',
  );
  assert.equal(lignes[1].textContent, 'Outil', 'la forme courte ne change pas d’un pixel');
  const vignettes = lignes[0].querySelectorAll('.carte-icone');
  assert.equal(vignettes.length, 1);
  assert.equal(vignettes[0].tagName, 'CANVAS', 'une silhouette est un canvas, jamais un glyphe de police (`D-96`)');
  assert.equal(vignettes[0].dataset.icone, 'visuel_branche');
  assert.equal(lignes[0].children.at(-1).textContent, 'Branche : 6 / 2', 'le texte reste, entier — l’icône s’ajoute, elle ne remplace pas');
  // La classe commune `carte-icone` n'est pas un détail : c'est elle que
  // balaie `dessinerIcones`. Une classe propre aurait donné une vignette
  // vide, et personne n'aurait su pourquoi.
  assert.ok(dessinees.includes('visuel_branche') && dessinees.includes('visuel_icone_eclat'),
    'les deux vignettes sont dessinées par le même chemin que les tuiles');
  console.log('OK la vue : une ligne à icône porte un canvas et son texte, une ligne-chaîne ne bouge pas');
}

// --- 3. La monnaie déclare sa silhouette en DONNÉES ------------------------------
{
  const monnaies = registre.tous('monnaies');
  assert.equal(monnaies.length, 1, 'une seule monnaie — le jour où il y en a deux, c’est le ticket de la seconde qui décide du reste (`Q-49`)');
  const eclats = registre.obtenir('monnaies', 'monnaie_eclats');
  assert.ok(registre.obtenir('visuels', eclats.icone), 'sa silhouette existe au catalogue des visuels');

  // L'id de la silhouette a QUITTÉ le code : c'est tout l'objet du ticket.
  const source = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');
  assert.equal(source.includes(eclats.icone), false,
    `main.js ne cite plus "${eclats.icone}" : le bandeau comme les fiches lisent monnaies.json`);

  // Une monnaie sans silhouette se réduirait à son nombre — refusée AU BOOT,
  // là où une faute de catalogue se voit avant d'être jouée.
  const sansIcone = { ...donnees, monnaies: [{ id: 'monnaie_test' }] };
  assert.ok(validerCatalogues(sansIcone).some((e) => e.includes('icone')), 'une monnaie sans icône tombe au démarrage');
  const iconeInconnue = { ...donnees, monnaies: [{ id: 'monnaie_test', icone: 'visuel_inexistant' }] };
  assert.ok(validerCatalogues(iconeInconnue).some((e) => e.includes('visuel_inexistant')), 'une silhouette inconnue tombe avec son chemin exact');
  console.log('OK monnaies.json : la monnaie déclare son icône, et son absence tombe au boot');
}

// --- 4. En jeu : la fiche d'une recette montre ses ingrédients et son coût -------
{
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_maison_decouverte: true, ...Object.fromEntries(registre.tous('stations').filter((s) => s.premiere_interaction).map((s) => [s.premiere_interaction.flag, true])) };
  save.inventaire.items = { item_branche: 6, item_caillou: 2 };
  // `D-120` : hache et pioche sont gâtées au Nv.10 et coûtent des éclats — il
  // faut donc un héros qui y a droit, et l'XP qui va avec (le niveau est
  // recalculé depuis l'XP totale).
  save.hero.niveau = 10;
  save.hero.xp = registre.obtenir('levels', 'niveau_10').xp_cumulee;
  save.inventaire.eclats = 50;
  const ouvert = {};
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, fermer: () => {},
    ouvrirCoffre: () => {}, rafraichirCraft: () => {}, rafraichirCoffre: () => {},
    ouvrirCraft: (obtenirEntrees) => Object.assign(ouvert, { obtenirEntrees }),
  };
  const frames = [];
  let i = 0;
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(), menu,
    input: { maj: () => frames[Math.min(i++, frames.length - 1)] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const empreinte = orch.obtenirScene().empreintesSolides.find((e) => e.id === 'station_atelier');
  orch.obtenirHero().x = empreinte.x - 20;
  orch.obtenirHero().y = empreinte.y + empreinte.h / 2;
  const b = (v) => ({ pressed: v, held: v });
  frames.push({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(true), menu: b(false), target_next: b(false),
  });
  orch.maj(16);
  assert.ok(ouvert.obtenirEntrees, 'INTERACT à côté de l’atelier ouvre l’écran Craft');

  const recette = registre.obtenir('recipes', 'rec_hache');
  const fiche = ouvert.obtenirEntrees()
    .find((e) => e.titre === i18n.t(recette.label_key))
    .lignes.map(normaliserLigneFiche);
  // Chaque ingrédient montre SA silhouette, et c'est celle de sa tuile dans
  // la Poche : lue sur l'item, jamais choisie par l'écran de Craft.
  recette.entrees.forEach((e, n) => {
    assert.equal(fiche[n].icone, registre.obtenir('items', e.item).render.visuel, `l’ingrédient ${e.item} montre sa silhouette`);
    assert.ok(fiche[n].texte.includes(i18n.t(registre.obtenir('items', e.item).label_key)), 'et son NOM reste écrit : l’icône ne remplace pas le mot');
  });
  const ligneCout = fiche.find((l) => l.icone === registre.obtenir('monnaies', 'monnaie_eclats').icone);
  assert.ok(recette.cout_eclats > 0 && ligneCout, 'la ligne de coût porte la silhouette de la monnaie');
  assert.ok(ligneCout.texte.includes(String(recette.cout_eclats)) && ligneCout.texte.includes(String(save.inventaire.eclats)),
    'ce qu’elle coûte et ce qu’on a, comme avant');
  // Ce qui n'a PAS d'image n'en gagne pas : « Donne : … » et la fiche de
  // l'objet produit restent des phrases (la vignette de la fiche montre déjà
  // l'objet produit — une seconde fois serait du bruit).
  assert.deepEqual(fiche.slice(recette.entrees.length + 1).map((l) => l.icone), [null, null],
    'seules les lignes qui parlent d’autre chose que de l’objet produit montrent une image');
  console.log('OK en jeu : les ingrédients et le coût d’une recette montrent ce dont ils parlent');
}

// --- 5. La ligne de coût passe enfin par le contrôle de démarrage ----------------
{
  // Elle était composée depuis `D-66` sans que le contrôle FR/EN la voie : la
  // retirer des locales aurait affiché sa clé en toutes lettres, en jeu, sans
  // un mot au démarrage.
  assert.ok(clesTexteFiches().includes('menu.fiche.cout_eclats'));
  for (const langue of Object.keys(dictionnaires)) {
    for (const cle of clesTexteFiches()) {
      assert.ok(dictionnaires[langue][cle], `${langue} : "${cle}" manquante`);
    }
  }
  console.log('OK toute clé composée par une fiche est déclarée en FR et en EN');
}

console.log('OK test_d103_ligne_fiche_icone');

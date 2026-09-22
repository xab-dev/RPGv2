// `D-63` (file Nv.0 → Nv.10, T9) — la barre d'actions : des actions
// seulement, et rien d'annoncé.
//
// DEUX DÉCISIONS DE XAV (21/09) :
//   1. **Pas d'inventaire dans la barre du bas.** Elle ne porte que les
//      actions de D5⑤ — arme, compétences, consommable équipé. Le principe
//      « poches façon Minecraft » du 19/09 est abandonné (`E-01` sans objet).
//   2. **Anti-spoil des touches** : sur une partie neuve, **seule la case
//      d'attaque de base est là**. Une case apparaît quand son premier
//      contenu est débloqué.
//
// Contrats vérifiés ici :
//   - une partie neuve n'a QU'UNE case, l'attaque ;
//   - la case du consommable apparaît au premier consommable obtenu, et elle
//     RESTE quand on l'a mangé ;
//   - les cases de compétences n'existent pas tant qu'aucune compétence
//     n'est débloquée, et elles apparaissent une à une avec leur flag ;
//   - `INTERACT` et `MENU` sont là dès la Grotte, et ne peuvent pas être
//     masqués — les leviers en dépendent au tactile ;
//   - au doigt, un bouton masqué n'est **pas cliquable** ;
//   - aucune poche nulle part.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { boutonsTactiles, boutonsTactilesVisibles } from '../src/ui/hud_layout.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

function monterPartie({ flagsSupplementaires = {}, poche = {} } = {}) {
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.inventaire.items = { ...poche };
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    flag_ambiance_vent_cendre: true,
    ...flagsSupplementaires,
  };
  const menu = {
    estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, ouvrirCraft: () => {},
    rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {},
  };
  const dialogue = creerDialogue();
  const frames = [];
  const input = { maj: () => frames[frames.length - 1] };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const etat = () => ({
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: false, held: false }, menu: { pressed: false, held: false },
    target_next: { pressed: false, held: false },
  });
  const tick = () => { frames.push(etat()); orch.maj(16); };
  tick(); // une frame, pour que les loquets de déblocage aient tourné
  return { orch, save, tick };
}

// --- 1. Une partie neuve n'a qu'une case -------------------------------
{
  const { orch } = monterPartie();
  assert.deepEqual(
    orch.obtenirVerbesActions(), ['attack'],
    'sur une partie neuve, seule la case d\'attaque de base existe',
  );
  console.log('OK partie neuve : une seule case, l\'attaque');
}

// --- 2. Le consommable apparaît, et il PART avec le dernier fruit -------
// *Révisé par `D-93` (22/09, décision de Xav)* : le loquet
// `flag_premier_consommable` est retiré, la case suit l'état RÉEL de la
// poche. Voir une touche qui ne fait rien est pire que de la voir partir
// avec ce qu'elle servait à manger.
{
  const partie = monterPartie({ poche: { item_fruit: 1 } });
  assert.deepEqual(
    partie.orch.obtenirVerbesActions(), ['attack', 'consume'],
    'un consommable en poche fait apparaître sa case',
  );
  assert.equal(partie.save.flags.flag_premier_consommable, undefined, 'plus aucun loquet posé');

  // On le mange : la poche se vide, la case disparaît.
  partie.save.inventaire.items = {};
  partie.tick();
  assert.deepEqual(
    partie.orch.obtenirVerbesActions(), ['attack'],
    'plus de consommable en poche : la case retourne à son état de base',
  );

  // Et un objet qui n'est PAS un consommable ne la fait pas apparaître.
  const sansConsommable = monterPartie({ poche: { item_branche: 5, item_hache: 1 } });
  assert.deepEqual(
    sansConsommable.orch.obtenirVerbesActions(), ['attack'],
    'une branche et une hache ne sont pas des consommables',
  );
  console.log('OK la case du consommable suit la poche : elle apparaît, et elle repart');
}

// --- 3. Les compétences, une à une, avec leur flag ---------------------
// Aucune compétence n'existe dans le jeu aujourd'hui : leurs flags sont
// déclarés et jamais posés. C'est exactement ce qu'il faut — le jour où une
// compétence arrive, elle pose son flag et sa case apparaît, sans code.
{
  assert.deepEqual(
    monterPartie({ flagsSupplementaires: { flag_competence_2: true } }).orch.obtenirVerbesActions(),
    ['attack', 'skill_2'],
    'une seule compétence débloquée = une seule case de plus, la sienne',
  );
  assert.deepEqual(
    monterPartie({
      flagsSupplementaires: { flag_competence_1: true, flag_competence_2: true, flag_competence_3: true },
      poche: { item_fruit: 1 },
    }).orch.obtenirVerbesActions(),
    ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume'],
    'tout débloqué = les cinq cases, dans l\'ordre du catalogue',
  );
  console.log('OK les cases de compétences n\'existent qu\'avec leur flag');
}

// --- 4. INTERACT et MENU ne sont pas des actions -----------------------
// Ils sont là dès la Grotte, quoi qu'il arrive : les leviers en dépendent au
// tactile. Ils ne figurent pas dans `action_slots.json`, donc ils ne peuvent
// pas être masqués par erreur.
{
  const verbesDesSlots = registre.tous('action_slots').map((s) => s.verb);
  for (const commande of ['interact', 'menu']) {
    assert.ok(
      !verbesDesSlots.includes(commande),
      `"${commande}" est une commande, pas une action : il n'a rien à faire dans action_slots.json`,
    );
  }
  // Barre d'actions vide (cas extrême, impossible en jeu) : les deux restent.
  const visibles = boutonsTactilesVisibles([]).map((b) => b.verbe);
  assert.deepEqual(visibles.sort(), ['interact', 'menu'], 'INTERACT et MENU survivent à tout');
  console.log('OK INTERACT et MENU sont là dès la Grotte, et ne peuvent pas être masqués');
}

// --- 5. Au doigt, un bouton masqué n'est pas cliquable -----------------
// Les POSITIONS ne changent pas (le placement tactile est le chapitre de
// Xav, `D-57`) : c'est la réponse qui change.
{
  const positions = new Map(boutonsTactiles().map((b) => [b.verbe, `${b.cx},${b.cy},${b.rayon}`]));
  for (const bouton of boutonsTactilesVisibles(['attack'])) {
    assert.equal(
      `${bouton.cx},${bouton.cy},${bouton.rayon}`, positions.get(bouton.verbe),
      `${bouton.verbe} : un masquage ne doit JAMAIS déplacer un bouton`,
    );
  }
  const visibles = boutonsTactilesVisibles(['attack']).map((b) => b.verbe);
  assert.ok(visibles.includes('attack'));
  for (const masque of ['skill_1', 'skill_2', 'skill_3', 'consume']) {
    assert.ok(!visibles.includes(masque), `${masque} masqué ne doit pas être testé au contact`);
  }
  console.log('OK un bouton masqué ne répond plus, et aucun bouton n\'a bougé');
}

// --- 6. Aucune poche nulle part ---------------------------------------
// `E-01` est sans objet : la barre du bas ne portera jamais d'inventaire.
// Ce contrôle de source est là pour que la décision survive à la mémoire de
// celui qui la relira.
{
  const hud = await fs.readFile(path.join(RACINE, 'src', 'ui', 'hud.js'), 'utf8');
  const code = hud.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const interdit of ['inventaire', 'poche', 'item_']) {
    assert.ok(
      !code.includes(interdit),
      `ui/hud.js ne doit rien savoir de la poche ("${interdit}") : la barre du bas ne porte que des actions`,
    );
  }
  // Et la liste des cases n'est plus écrite dans le rendu.
  assert.ok(
    !code.includes("'skill_1'"),
    'ui/hud.js ne doit plus contenir la liste des slots : elle vient de action_slots.json',
  );
  console.log('OK aucune poche dans la barre du bas, et plus de liste en dur dans le rendu');
}

console.log('OK test_d63_barre_actions');

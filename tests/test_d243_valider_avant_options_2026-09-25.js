// `D-243` (Xav, 25/09 : « le dialogue continue automatiquement vers les
// questions et je me fais avoir à chaque fois ») : un nœud qui déclare
// `valider_avant_options` s'arrête d'abord comme une réplique, et c'est un
// appui armé de plus qui fait paraître ses options, armées à neuf.
//
// Ce que ce fichier tient :
//   1. le schéma : un booléen, et seulement sur un nœud à options ;
//   2. l'appui de l'habitude (celui qui avançait la réplique d'avant) ne
//      choisit plus : il fait paraître les options, et rien n'est retenu ;
//   3. l'appui qui les fait paraître n'en choisit aucune, même répété aussitôt ;
//   4. au doigt, taper la bulle fait paraître les options, et une option
//      invisible ne se touche pas ;
//   5. un nœud sans le champ garde l'ancien chemin (les options paraissent
//      seules) ;
//   6. le vrai catalogue : chaque nœud à options déclare la validation
//      (`[OUVERT]` `Q-172` : tous, en attendant que Xav les revoie au cas par cas).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import {
  creerDialogue, resoudreNoeud, DELAI_ARMEMENT_DIALOGUE_MS, MACHINE_ECRIRE_MS_PAR_CARACTERE,
} from '../src/dialogue.js';
import { configAlignement } from '../src/alignement.js';
import { geometrieBoiteDialogue, toucherBoiteDialogue } from '../src/ui/hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const POIDS = configAlignement(registre).poids_defaut;

// Une réplique, puis la question : le cas où Xav « se fait avoir ».
function essai(valider) {
  const question = {
    locuteur: 'follet',
    text_key: 'dlg.maison.premiere_visite',
    options: [
      { text_key: 'dlg.maison.o_y_aller', defaut: true, suite: null },
      { text_key: 'dlg.maison.o_quelquun', alignement: 1, suite: null },
    ],
  };
  if (valider !== undefined) question.valider_avant_options = valider;
  return {
    id: 'dlg_essai_d243',
    declencheur: 'essai',
    entree: 'avant',
    noeuds: {
      avant: { locuteur: 'follet', text_key: 'dlg.maison.invites', suite: 'question' },
      question,
    },
  };
}
const copie = (o) => JSON.parse(JSON.stringify(o));
const erreursAvec = (d) => validerCatalogues({ ...donnees, dialogues: [...donnees.dialogues, d] });

// --- 1. Le schéma ---------------------------------------------------------
{
  assert.deepEqual(erreursAvec(essai(true)), [], 'la validation sur un nœud à options passe');
  assert.ok(erreursAvec(essai('oui')).some((e) => e.includes('valider_avant_options doit être un booléen')));
  const surReplique = copie(essai(true));
  surReplique.noeuds.avant.valider_avant_options = true;
  assert.ok(erreursAvec(surReplique).some((e) => e.includes('nœud sans option')),
    'sur une réplique, le champ ne validerait rien : refusé');
  console.log('OK le schéma : un booléen, seulement sur un nœud à options');
}

const b = (v) => ({ pressed: v, held: v });
const verbes = ({ attack = false, y = 0 } = {}) => ({
  move: { x: 0, y }, attack: b(attack), interact: b(false),
});
function armer(dialogue) {
  const texte = dialogue.ligneCourante().texte;
  dialogue.maj(1000 * MACHINE_ECRIRE_MS_PAR_CARACTERE);
  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS + 1);
  return texte;
}
function ouvrir(donneesDialogue) {
  const dialogue = creerDialogue();
  let resultat = null;
  dialogue.demarrerConversation(donneesDialogue, {
    resoudre: (id) => resoudreNoeud(donneesDialogue, id, registre, i18n, 'comp_follet_feu'),
    poids: POIDS,
    onResultat: (r) => { resultat = r; },
  });
  return { dialogue, resultat: () => resultat };
}

// --- 2 et 3. L'appui de l'habitude fait paraître, il ne choisit pas -------
{
  const { dialogue, resultat } = ouvrir(essai(true));
  armer(dialogue);
  dialogue.traiterInput(verbes({ attack: true })); // la réplique d'avant
  armer(dialogue);
  assert.equal(dialogue.ligneCourante().options, null, 'la question s’arrête comme une réplique');
  assert.equal(dialogue.ligneCourante().arme, true, 'avec son ▼');

  dialogue.traiterInput(verbes({ attack: true })); // l'appui de l'habitude
  assert.equal(dialogue.estOuvert(), true, 'l’appui de l’habitude ne ferme rien');
  assert.deepEqual(dialogue.etatConversation().choix, [], 'et ne retient aucune option');
  assert.equal(dialogue.ligneCourante().options, null, 'les options ne paraissent qu’une fois armées à neuf');

  // Re-appuyer aussitôt : compté comme un appui non armé, rien de choisi.
  dialogue.traiterInput(verbes({ attack: true }));
  assert.equal(dialogue.estOuvert(), true);
  assert.deepEqual(dialogue.etatConversation().choix, []);
  assert.equal(dialogue.etatConversation().spamCompte, 1, 'le double appui se paie comme tout appui non armé');

  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS + 1);
  assert.equal(dialogue.ligneCourante().options.length, 2, 'armées, les options paraissent');
  dialogue.traiterInput(verbes({ y: 1 }));
  dialogue.traiterInput(verbes());
  dialogue.traiterInput(verbes({ attack: true }));
  assert.equal(dialogue.estOuvert(), false);
  assert.deepEqual(resultat().consequences.find((c) => c.source === 'option'),
    { type: 'alignement', delta: 1, source: 'option' }, 'le choix délibéré est bien retenu');
  console.log('OK l’appui de l’habitude fait paraître les options, il n’en choisit aucune');
}

// --- 4. Au doigt ----------------------------------------------------------
{
  const { dialogue } = ouvrir(essai(true));
  armer(dialogue);
  dialogue.traiterInput(verbes({ attack: true }));
  armer(dialogue);
  const geo = geometrieBoiteDialogue(2, RESOLUTION_LOGIQUE);
  const surOption2 = { x: geo.options[1].x + 30, y: geo.options[1].y + 9 };
  dialogue.traiterInput(verbes(), toucherBoiteDialogue(geo, [surOption2]));
  assert.equal(dialogue.ligneCourante().options, null, 'une option invisible ne se touche pas');
  const geoTexte = geometrieBoiteDialogue(0, RESOLUTION_LOGIQUE);
  dialogue.traiterInput(verbes(), toucherBoiteDialogue(geoTexte, [{ x: geoTexte.boite.x + 50, y: geoTexte.boite.y + 30 }]));
  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS + 1);
  assert.equal(dialogue.ligneCourante().options.length, 2, 'taper la bulle fait paraître les options');
  assert.deepEqual(dialogue.etatConversation().choix, []);
  console.log('OK au doigt : taper la bulle fait paraître, une option cachée ne se touche pas');
}

// --- 5. Sans le champ, l'ancien chemin ------------------------------------
{
  for (const valider of [undefined, false]) {
    const { dialogue } = ouvrir(essai(valider));
    armer(dialogue);
    dialogue.traiterInput(verbes({ attack: true }));
    armer(dialogue);
    assert.equal(dialogue.ligneCourante().options.length, 2, `valider_avant_options = ${valider} : les options paraissent seules`);
  }
  console.log('OK sans validation déclarée, les options paraissent comme avant');
}

// --- 6. Le vrai catalogue -------------------------------------------------
{
  const aOptions = donnees.dialogues.flatMap((d) => Object.entries(d.noeuds)
    .filter(([, n]) => Array.isArray(n.options) && n.options.length > 0)
    .map(([id, n]) => ({ chemin: `${d.id} > ${id}`, n })));
  assert.ok(aOptions.length > 0);
  for (const { chemin, n } of aOptions) {
    assert.equal(n.valider_avant_options, true, `${chemin} : la question attend un appui avant ses options (Q-172)`);
  }
  console.log(`OK les ${aOptions.length} nœuds à options du catalogue attendent un appui`);
}
console.log('OK test_d243_valider_avant_options');

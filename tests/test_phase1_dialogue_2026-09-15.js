// Contrat (§3.7/§7, étendu par 03_grotte-polish §3.2) : avancement ligne par
// ligne, fermeture en fin de file, locuteur "follet" résolu vers le
// compagnon actif — désormais sous réserve de la machine à écrire et de
// l'armement (anti-spam, testés en détail dans
// test_phase1b_dialogue_antispam) : ici, `armer()` fait toujours s'écouler
// assez de temps pour que ces deux mécanismes ne soient jamais l'objet du
// test.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, resoudreNoeud, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';

function etat({ attack = false, interact = false } = {}) {
  return {
    move: { x: 0, y: 0 },
    attack: { pressed: attack, held: attack },
    interact: { pressed: interact, held: interact },
  };
}

// Fait s'écouler largement plus que le délai d'armement (texte très court
// dans ce fichier : la machine à écrire n'entre jamais en jeu) — un seul
// tick de `maj()` suffit puisqu'il n'est jamais borné par un delta plafonné
// ici (contrairement au jeu réel).
function armer(dialogue) {
  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS + 50);
}

// 1. Ouverture, avancement ligne par ligne, fermeture en fin de file.
{
  const dialogue = creerDialogue();
  dialogue.ouvrir([{ locuteur: 'a', texte: '1' }, { locuteur: 'a', texte: '2' }]);
  assert.equal(dialogue.estOuvert(), true);
  assert.equal(dialogue.ligneCourante().texte, '1');

  armer(dialogue);
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.estOuvert(), true);
  assert.equal(dialogue.ligneCourante().texte, '2');

  armer(dialogue);
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.estOuvert(), false, 'la dernière ligne ferme le dialogue');
}

// 2. INTERACT fait aussi avancer (§3.7 : ATTACK, INTERACT ou tap).
{
  const dialogue = creerDialogue();
  dialogue.ouvrir([{ locuteur: 'a', texte: '1' }, { locuteur: 'a', texte: '2' }]);
  armer(dialogue);
  dialogue.traiterInput(etat({ interact: true }));
  assert.equal(dialogue.ligneCourante().texte, '2');
}

// 3. onFermer est appelé exactement à la fermeture.
{
  let appels = 0;
  const dialogue = creerDialogue();
  dialogue.ouvrir([{ locuteur: 'a', texte: '1' }], { onFermer: () => appels++ });
  armer(dialogue);
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(appels, 1);
}

// 4. Dialogue fermé : traiterInput n'a aucun effet.
{
  const dialogue = creerDialogue();
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.estOuvert(), false);
  assert.equal(dialogue.ligneCourante(), null);
}

// 5. resoudreNoeud (ex-resoudreLignes, spec 11 palier B) : "follet" se résout vers le compagnon actif, "narrateur" reste tel quel.
{
  const registre = construireRegistre({
    dialogues: [
      {
        id: 'dlg_test',
        declencheur: 'x',
        entree: 'l1',
        noeuds: {
          l1: { locuteur: 'narrateur', text_key: 'k1', suite: 'l2' },
          l2: { locuteur: 'follet', text_key: 'k2' },
        },
      },
    ],
    companions: [{ id: 'comp_feu', label_key: 'nom.follet_feu', element: 'x', synergie: 'x', rayon_aura: 1, rayon_lumiere: 1, render: {} }],
  });
  const i18n = creerI18n({ fr: { k1: 'Bonjour', k2: 'Salut', 'nom.follet_feu': 'Follet de Feu' } }, 'fr');

  const donnees = registre.obtenir('dialogues', 'dlg_test');
  const lignes = ['l1', 'l2'].map((n) => resoudreNoeud(donnees, n, registre, i18n, 'comp_feu'));
  assert.equal(lignes[0].locuteur, 'narrateur');
  assert.equal(lignes[0].texte, 'Bonjour');
  assert.equal(lignes[1].locuteur, 'Follet de Feu');
  assert.equal(lignes[1].texte, 'Salut');
}

console.log('OK test_phase1_dialogue');

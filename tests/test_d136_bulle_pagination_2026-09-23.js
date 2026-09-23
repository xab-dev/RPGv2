// `D-136` : les répliques longues sortaient de la bulle — un seul `fillText`,
// sans retour à la ligne. Remède : couper au mot près, puis en fenêtres de deux
// lignes, une fenêtre de plus s'avançant comme une réplique de plus (décision
// de Xav, 23/09).
//
// Ce qui est éprouvé ici est STRUCTUREL. Node ne mesure pas le texte, donc
// aucun test ne prouve qu'une réplique donnée tient dans la bulle sur un
// appareil donné — c'est une validation en jeu (`V-78`). Ce qui se prouve :
// que le découpage respecte la largeur qu'on lui donne quelle que soit la
// mesure, qu'il ne perd ni ne réordonne aucun mot, que la machine à écrire
// tape la fenêtre découpée (un mot ne change pas de ligne en cours de frappe),
// et que le dessin et la pagination lisent la même largeur.
import assert from 'node:assert/strict';
import { decouperEnFenetres, creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { creerPaginateurDialogue, dessinerDialogue } from '../src/ui/dialogue_box.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';

// Mesure factice : un caractère = une unité. Assez pour éprouver la règle.
const parCaractere = (t) => t.length;
const mots = (s) => s.split(/[\s]+/).filter(Boolean);

// --- 1. Le découpage pur ----------------------------------------------------
{
  // Une réplique courte ne bouge pas.
  assert.deepEqual(decouperEnFenetres('Bonjour.', parCaractere, 20, 2), ['Bonjour.']);

  const texte = 'un deux trois quatre cinq six sept huit neuf dix onze douze';
  const fenetres = decouperEnFenetres(texte, parCaractere, 14, 2);
  const lignes = fenetres.flatMap((f) => f.split('\n'));
  for (const l of lignes) assert.ok(l.length <= 14, `« ${l} » dépasse la largeur`);
  for (const f of fenetres) assert.ok(f.split('\n').length <= 2, 'jamais plus de deux lignes par fenêtre');
  assert.deepEqual(mots(fenetres.join(' ')), mots(texte), 'aucun mot perdu ni réordonné');
  assert.ok(fenetres.length > 1, 'une réplique trop longue ouvre une seconde fenêtre');

  // La ponctuation détachée reste avec son mot (espace ordinaire en français).
  const q = decouperEnFenetres('Lequel choisis-tu ?', parCaractere, 17, 2);
  assert.ok(!q.join('\n').split('\n').some((l) => l.startsWith('?')), 'un « ? » ne commence jamais une ligne');

  // Un mot plus large que la bulle reste entier, seul sur sa ligne.
  assert.deepEqual(decouperEnFenetres('a anticonstitutionnellement b', parCaractere, 5, 5),
    ['a\nanticonstitutionnellement\nb']);
  // Un texte vide reste une fenêtre (vide) : la réplique existe toujours.
  assert.deepEqual(decouperEnFenetres('', parCaractere, 10, 2), ['']);
  console.log('OK découpage : largeur respectée, deux lignes par fenêtre, aucun mot perdu, ponctuation accrochée');
}

// --- 2. Le dialogue : une fenêtre = une réplique ---------------------------
{
  const paginer = (t) => decouperEnFenetres(t, parCaractere, 10, 2);
  const dialogue = creerDialogue({ paginer });
  dialogue.ouvrir([{ locuteur: 'Follet', texte: 'aaaa bbbb cccc dddd eeee ffff' }]);
  const vues = [];
  const appui = { attack: { pressed: true }, interact: { pressed: false } };
  for (let n = 0; n < 10 && dialogue.estOuvert(); n += 1) {
    dialogue.maj(10_000); // machine à écrire au bout
    const ligne = dialogue.ligneCourante();
    vues.push(ligne.texte);
    assert.equal(ligne.locuteur, 'Follet', 'chaque fenêtre garde le locuteur');
    dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS);
    dialogue.traiterInput(appui);
  }
  assert.deepEqual(vues, ['aaaa bbbb\ncccc dddd', 'eeee ffff'], 'deux fenêtres, avancées à A');
  assert.equal(dialogue.estOuvert(), false);

  // En cours de frappe, ce qui est déjà affiché est un PRÉFIXE de la fenêtre
  // découpée : les mots sont déjà à leur place définitive.
  dialogue.ouvrir([{ locuteur: 'Follet', texte: 'aaaa bbbb cccc dddd' }]);
  dialogue.maj(300);
  const partiel = dialogue.ligneCourante().texte;
  assert.ok('aaaa bbbb\ncccc dddd'.startsWith(partiel) && partiel.length > 0);

  // Sans paginateur (tests headless, appelants sans mesure) : rien ne change.
  const brut = creerDialogue();
  brut.ouvrir([{ locuteur: 'x', texte: 'une réplique très longue qui ne serait jamais coupée' }]);
  brut.maj(10_000);
  assert.equal(brut.ligneCourante().texte, 'une réplique très longue qui ne serait jamais coupée');
  console.log('OK dialogue : une fenêtre de plus s’avance comme une réplique, et la frappe ne déplace aucun mot');
}

// --- 3. Le paginateur et le dessin lisent la MÊME largeur -------------------
{
  // Faux contexte qui mesure un caractère = `parCar` unités (6 ≈ 13px sans-serif) et
  // enregistre ce que le dessin écrit.
  const ecrits = [];
  let pile = 0;
  let parCar = 6;
  const ctx = {
    font: '', fillStyle: '', strokeStyle: '', textBaseline: '',
    save() { pile += 1; }, restore() { pile -= 1; },
    measureText: (t) => ({ width: t.length * parCar }),
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
    // `D-163` : le cadre (ui/cadre.js) trace des coins arrondis et un dégradé.
    lineWidth: 1, arcTo() {}, stroke() {}, createLinearGradient: () => ({ addColorStop() {} }),
    fillText(t, x, y) { ecrits.push({ t, x, y }); },
  };
  const paginer = creerPaginateurDialogue(ctx);
  const longue = 'De l’herbe sèche. Ça lie, ça rembourre, et ça prend feu en un souffle. Ceux d’avant en gardaient toujours une brassée.';
  // Police étroite (≈ la mesure réelle sous Chrome/Windows, 682 px) : deux
  // lignes, UNE fenêtre. Police plus large (un autre appareil) : la même
  // réplique ouvre une seconde fenêtre, sans que rien d'autre change.
  const etroite = paginer(longue);
  assert.equal(pile, 0, 'mesurer ne laisse rien sur le contexte partagé (save/restore)');
  assert.equal(etroite.length, 1);
  assert.equal(etroite[0].split('\n').length, 2);
  parCar = 9;
  const fenetres = paginer(longue);
  assert.ok(fenetres.length >= 2, 'une police plus large ouvre une seconde fenêtre');

  // La largeur réellement accordée par le paginateur : le texte de chaque
  // ligne, dessiné à sa place, s'arrête avant le marqueur d'armement.
  for (const f of fenetres) {
    ecrits.length = 0;
    dessinerDialogue(ctx, { locuteur: 'Follet', texte: f, arme: true });
    const texteDessine = ecrits.slice(1); // le premier est le locuteur
    assert.equal(texteDessine.length, f.split('\n').length, 'une ligne dessinée par ligne de fenêtre');
    for (const { t, x } of texteDessine) {
      const fin = x + t.length * parCar;
      const bordMarqueur = RESOLUTION_LOGIQUE.largeur - 8 - 10 - 5;
      assert.ok(fin < bordMarqueur, `« ${t} » finit à ${fin}, au-delà du marqueur (${bordMarqueur})`);
    }
    const ys = texteDessine.map((e) => e.y);
    assert.equal(new Set(ys).size, ys.length, 'les lignes ne se superposent pas');
  }
  assert.equal(pile, 0, 'le dessin rend le contexte comme il l’a trouvé');
  console.log(`OK la pagination et le dessin partagent la largeur : ${fenetres.length} fenêtre(s), aucune ligne sous le marqueur`);
}

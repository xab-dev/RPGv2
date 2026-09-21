// MT_texte-flottant_2026-09-19 (`D-05`) : un petit texte monte depuis la
// source d'un gain et s'efface (« +1 Bois »). UN SEUL mécanisme de retour
// dans le monde, qui resservira au butin, à l'XP et aux dégâts sans code
// nouveau — ces usages ne sont pas livrés ici, mais rien dans le module ne
// doit supposer « ressource ».
//
// Contrats vérifiés ici, tels que listés par la fiche §Tests :
//   - émission, vieillissement et extinction ;
//   - réserve pleine sans allocation (recyclage du plus ancien) ;
//   - fusion de deux gains du même item dans la même frame (« +2 ») ;
//   - texte résolu dans les deux langues, sans chaîne en dur ;
//   - une récolte et un ramassage simulés émettent chacun le gain ET son XP
//     (`D-58`, 21/09 : « +1 » sans le nom, « +1xp », distingués par la taille).
//
// Le dessin lui-même n'est jamais exercé (canvas, contrainte de méthode) :
// l'orchestrateur expose l'état des textes, comme il expose déjà l'indice de
// commande affiché.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  creerTextesFlottants,
  emettreTexte,
  avancerTextesFlottants,
  textesVisibles,
  viderTextesFlottants,
} from '../src/texte_flottant.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

const CONFIG = donnees.effets.find((e) => e.id === 'effet_texte_gain');
assert.ok(CONFIG, 'effet_texte_gain doit exister dans data/effets.json');

// Clés i18n manipulées par les tests : déclarées ici une fois, jamais
// recopiées plus bas (le contrat « aucune chaîne en dur » vaut aussi pour un
// fichier de test, qui sinon fige un texte au lieu de figer un contrat).
const CLE_FORMAT = 'monde.gain_item';
const CLE_FORMAT_XP = 'monde.gain_xp';

// --- 1. Émission, vieillissement, extinction ------------------------------
{
  const etat = creerTextesFlottants(CONFIG);
  assert.equal(textesVisibles(etat).length, 0, 'une réserve neuve est vide');

  emettreTexte(etat, { x: 100, y: 50, cle: 'item_bois', quantite: 1, format: CLE_FORMAT, libelle: 'item.bois' });
  const naissance = textesVisibles(etat)[0];
  assert.ok(naissance, 'une émission donne un texte visible');
  assert.equal(naissance.quantite, 1);
  assert.equal(naissance.libelle, 'item.bois', 'le module transporte une CLÉ, jamais un texte');
  assert.equal(naissance.format, CLE_FORMAT);
  assert.equal(naissance.x, 100, 'le texte part de la source');
  assert.ok(Math.abs(naissance.alpha - 1) < 1e-9, 'pleinement opaque à la naissance');

  // Il monte et s'efface, sans jamais redescendre ni se rallumer.
  let precedent = naissance;
  for (let t = 0; t < CONFIG.duree_ms; t += 25) {
    avancerTextesFlottants(etat, 25);
    const courant = textesVisibles(etat)[0];
    if (!courant) break;
    assert.ok(courant.y <= precedent.y + 1e-9, 'le texte ne redescend jamais');
    assert.ok(courant.alpha <= precedent.alpha + 1e-9, 'l\'alpha ne remonte jamais');
    precedent = courant;
  }
  assert.ok(precedent.y < naissance.y, 'le texte a bien monté');
  assert.ok(
    Math.abs((naissance.y - precedent.y) - CONFIG.montee_px) <= CONFIG.montee_px,
    'la montée reste bornée par montee_px',
  );

  // Extinction : passé duree_ms, plus rien — et la place est recyclée.
  avancerTextesFlottants(etat, CONFIG.duree_ms);
  assert.equal(textesVisibles(etat).length, 0, 'le texte meurt au bout de duree_ms');
  assert.equal(etat.textes.length, CONFIG.capacite, 'sa place est recyclée, pas retirée');
  console.log('OK émission -> montée -> fondu -> extinction');
}

// --- 2. Réserve pleine : aucune allocation, on recycle le plus ancien -----
{
  const etat = creerTextesFlottants(CONFIG);
  assert.equal(etat.textes.length, CONFIG.capacite, 'réserve pré-allouée à sa capacité (données)');

  // Un gain distinct par émission (cles différentes : jamais de fusion), et
  // un peu d'âge entre chacun pour que « le plus ancien » soit identifiable.
  for (let i = 0; i < CONFIG.capacite; i += 1) {
    emettreTexte(etat, { x: i, y: 0, cle: `cle_${i}`, quantite: 1, format: CLE_FORMAT, libelle: null });
    avancerTextesFlottants(etat, 1);
  }
  assert.equal(textesVisibles(etat).length, CONFIG.capacite, 'la réserve est pleine');

  emettreTexte(etat, { x: 999, y: 0, cle: 'cle_de_trop', quantite: 1, format: CLE_FORMAT, libelle: null });
  assert.equal(etat.textes.length, CONFIG.capacite, 'la réserve ne grandit JAMAIS');
  const cles = textesVisibles(etat).map((t) => t.cle);
  assert.ok(cles.includes('cle_de_trop'), 'le nouveau texte entre bien');
  assert.ok(!cles.includes('cle_0'), 'c\'est LE PLUS ANCIEN qui cède sa place');

  // Abus franc : 100 émissions d'affilée ne font pas bouger la taille.
  for (let i = 0; i < 100; i += 1) {
    emettreTexte(etat, { x: i, y: 0, cle: `abus_${i}`, quantite: 1, format: CLE_FORMAT, libelle: null });
    avancerTextesFlottants(etat, 1);
  }
  assert.equal(etat.textes.length, CONFIG.capacite, 'la réserve garde sa taille sous abus');
  console.log(`OK réserve fixe (${CONFIG.capacite}), recyclage du plus ancien, zéro allocation`);
}

// --- 3. Fusion : deux gains du même item dans la même frame = « +2 » ------
{
  const etat = creerTextesFlottants(CONFIG);
  const gain = { x: 10, y: 20, cle: 'item_bois', quantite: 1, format: CLE_FORMAT, libelle: 'item.bois' };
  emettreTexte(etat, gain);
  emettreTexte(etat, gain);
  const visibles = textesVisibles(etat);
  assert.equal(visibles.length, 1, 'deux gains du même item dans la même frame = UN seul texte');
  assert.equal(visibles[0].quantite, 2, 'les quantités s\'additionnent (« +2 »)');

  // Deux items DIFFÉRENTS ne fusionnent jamais, même frame comprise.
  emettreTexte(etat, { ...gain, cle: 'item_pierre', libelle: 'item.pierre' });
  assert.equal(textesVisibles(etat).length, 2, 'deux items différents = deux textes');

  // Passé la fenêtre de fusion, un nouveau gain du même item repart à neuf :
  // sinon un texte déjà en train de s'effacer se rallumerait sans raison.
  const plusTard = creerTextesFlottants(CONFIG);
  emettreTexte(plusTard, gain);
  avancerTextesFlottants(plusTard, CONFIG.fusion_ms + 1);
  emettreTexte(plusTard, gain);
  assert.equal(textesVisibles(plusTard).length, 2, 'hors fenêtre de fusion, un 2ᵉ texte naît');
  console.log('OK fusion dans la frame, jamais entre items différents ni hors fenêtre');
}

// --- 4. viderTextesFlottants : changement de scène ------------------------
{
  const etat = creerTextesFlottants(CONFIG);
  emettreTexte(etat, { x: 1, y: 1, cle: 'item_bois', quantite: 1, format: CLE_FORMAT, libelle: 'item.bois' });
  assert.equal(textesVisibles(etat).length, 1);
  viderTextesFlottants(etat);
  assert.equal(textesVisibles(etat).length, 0, 'un gain de la scène quittée ne suit pas le héros');
  assert.equal(etat.textes.length, CONFIG.capacite, 'sans réallouer la réserve');
  console.log('OK viderTextesFlottants() vide sans réallouer');
}

// --- 5. Texte résolu dans les deux langues, sans chaîne en dur ------------
{
  const i18n = creerI18n(dictionnaires, 'fr');
  // Le gabarit vit en données de localisation, pas dans le code : le « + »,
  // l'ordre des morceaux et l'espace sont traduisibles comme le reste.
  for (const langue of i18n.languesDisponibles()) {
    i18n.definirLangue(langue);
    const gabarit = i18n.t(CLE_FORMAT);
    assert.ok(!gabarit.startsWith('[['), `${CLE_FORMAT} doit exister en ${langue}`);
    assert.ok(gabarit.includes('{n}'), `${CLE_FORMAT} (${langue}) doit porter {n}`);
    // `D-58` (Xav, 21/09 : « trop de texte ») : le gabarit de gain ne porte
    // PLUS le nom de l'item. Le témoin négatif compte autant que le positif —
    // sans lui, remettre « {item} » demain passerait inaperçu.
    assert.ok(
      !gabarit.includes('{item}'),
      `${CLE_FORMAT} (${langue}) ne doit plus porter {item} : « +1 », sans le nom`
    );
    const rendu = i18n.t(CLE_FORMAT, { n: 2 });
    assert.ok(!/\{[a-z_]+\}/.test(rendu), `aucun marqueur ne doit rester après résolution (${langue}) : ${rendu}`);
    assert.ok(rendu.includes('2'), `la quantité doit apparaître (${langue}) : ${rendu}`);
    assert.ok(!rendu.includes(i18n.t('item.bois')), `le nom de l'item ne doit plus apparaître (${langue}) : ${rendu}`);

    // Le gabarit de l'XP, et son SUFFIXE, vivent dans les locales aussi : le
    // « xp » de « +1xp » est du texte traduisible, jamais une chaîne du code.
    const gabaritXp = i18n.t(CLE_FORMAT_XP);
    assert.ok(!gabaritXp.startsWith('[['), `${CLE_FORMAT_XP} doit exister en ${langue}`);
    assert.ok(gabaritXp.includes('{n}'), `${CLE_FORMAT_XP} (${langue}) doit porter {n}`);
    const renduXp = i18n.t(CLE_FORMAT_XP, { n: 2 });
    assert.ok(!/\{[a-z_]+\}/.test(renduXp), `aucun marqueur ne doit rester (${langue}) : ${renduXp}`);
    // Les deux textes doivent se LIRE différemment, sinon « +1 » et « +1xp »
    // seraient le même retour à l'écran, taille mise à part.
    assert.notEqual(renduXp, rendu, `« +2 » et « +2xp » doivent différer (${langue})`);
    assert.ok(
      renduXp.replace(/[0-9+\s]/g, '').length > 0,
      `${CLE_FORMAT_XP} (${langue}) doit porter un suffixe lisible, pas seulement un nombre : ${renduXp}`
    );
  }

  // Tous les items ramassables/produits ont déjà un nom traduit : le texte
  // flottant n'introduit aucune clé par item.
  i18n.definirLangue('fr');
  for (const item of donnees.items) {
    assert.ok(!i18n.t(item.label_key).startsWith('[['), `${item.id} doit avoir un nom traduit`);
  }
  console.log('OK gabarit et noms d\'items résolus dans les deux langues');
}

// --- 6. Le module ne suppose jamais « ressource » -------------------------
// Garde-fou de l'intention de la fiche : le mécanisme resservira au butin, à
// l'XP et aux dégâts sans code nouveau. Si un jour un id d'item, un nom de
// catalogue ou un morceau de texte visible entre ici, ce test le signalera.
{
  const fichier = await fs.readFile(path.join(RACINE, 'src', 'texte_flottant.js'), 'utf8');
  // Les commentaires ONT le droit de parler de bois et de récolte (ils
  // expliquent justement l'usage d'aujourd'hui) : on n'inspecte que le code.
  const source = fichier
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('//'))
    .join('\n');
  for (const interdit of ['item_', 'res_', 'inventaire', 'ressource', 'i18n', 'ctx']) {
    assert.ok(
      !source.includes(interdit),
      `texte_flottant.js ne doit jamais connaître "${interdit}" : c'est un mécanisme de retour générique`,
    );
  }
  assert.ok(!/['"`]\+/.test(source), 'aucun « + » écrit en dur : le gabarit vient de la localisation');
  console.log('OK le module reste générique (ni item, ni i18n, ni canvas)');
}

// --- 7. Intégration : une récolte et un ramassage = une émission chacun ---
{
  const i18n = creerI18n(dictionnaires, 'fr');
  const store = creerStoreMemoire();
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  save.inventaire.items.item_hache = 1; // outil requis par res_bois

  const menuFactice = { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} };
  const dialogue = creerDialogue();
  const frames = [];
  const input = { maj: () => frames[frames.length - 1] };
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu: menuFactice, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const scene = orch.obtenirScene();
  const hero = orch.obtenirHero();

  const etatInteract = {
    move: { x: 0, y: 0 }, attack: { pressed: false, held: false },
    skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false },
    interact: { pressed: true, held: true }, menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
  };
  const etatNeutre = { ...etatInteract, interact: { pressed: false, held: false } };

  // a) Récolte : premier arbre venu de la scène réelle.
  let cible = null;
  for (let ty = 0; ty < scene.height && !cible; ty += 1) {
    for (let tx = 0; tx < scene.width; tx += 1) {
      const tuile = scene.tuileA(tx, ty);
      if (tuile && tuile.ressource === 'res_bois') { cible = { tx, ty }; break; }
    }
  }
  assert.ok(cible, 'au moins une tuile res_bois doit exister dans scene_maison_exterieur');
  hero.x = (cible.tx + 0.5) * scene.tileSize;
  hero.y = (cible.ty + 0.5) * scene.tileSize + 20;

  assert.equal(orch.obtenirTextesFlottants().length, 0, 'rien de flottant avant le premier gain');
  frames.push(etatInteract);
  orch.maj(16);
  assert.equal(save.inventaire.items.item_bois, 1, 'la récolte doit bien créditer du bois');
  const apresRecolte = orch.obtenirTextesFlottants();
  // `D-58` : une récolte émet désormais DEUX textes au même endroit, le gain
  // et son XP — c'est le couple qui apprend la boucle au joueur. Ils se
  // distinguent par leur `style`, jamais par leur ordre dans la réserve.
  assert.equal(apresRecolte.length, 2, 'une récolte = le gain ET son XP');
  const gainRecolte = apresRecolte.find((t) => t.style === 'gain');
  const xpRecolte = apresRecolte.find((t) => t.style === 'xp');
  assert.ok(gainRecolte && xpRecolte, 'les deux textes doivent porter des styles distincts');
  assert.equal(gainRecolte.cle, 'item_bois', "le texte porte l'item réellement gagné");
  assert.equal(gainRecolte.quantite, 1);
  assert.equal(gainRecolte.libelle, null, "`D-58` : plus de nom d'item dans le texte de gain");
  // L'XP affichée est celle du CATALOGUE, jamais un nombre écrit ici.
  assert.equal(xpRecolte.quantite, registre.obtenir('resources', 'res_bois').xp);
  assert.ok(
    Math.abs(xpRecolte.x - gainRecolte.x) < 1e-9 && Math.abs(xpRecolte.y - gainRecolte.y) < 1e-9,
    'les deux textes partent du même point : la source du gain',
  );
  // Il part de la tuile récoltée, pas du héros : c'est la SOURCE du gain.
  assert.ok(
    Math.abs(gainRecolte.x - (cible.tx + 0.5) * scene.tileSize) < 1e-9,
    'le texte monte depuis la ressource',
  );

  // b) Ramassage au sol : même mécanisme, le même couple de textes.
  viderTextesFlottants(orch.obtenirEtatTextesFlottants());
  const itemsSol = save.monde.items_sol[scene.id] || {};
  let auSol = null;
  for (const [itemId, positions] of Object.entries(itemsSol)) {
    if (positions.length > 0) { auSol = { itemId, position: positions[0] }; break; }
  }
  assert.ok(auSol, 'la scène réelle doit poser au moins un objet au sol');
  hero.x = auSol.position.x;
  hero.y = auSol.position.y;
  const avant = save.inventaire.items[auSol.itemId] || 0;

  frames.push(etatNeutre);
  orch.maj(16);
  frames.push(etatInteract);
  orch.maj(16);
  assert.equal(save.inventaire.items[auSol.itemId], avant + 1, 'le ramassage doit créditer l\'item');
  const apresRamassage = orch.obtenirTextesFlottants();
  const gainRamassage = apresRamassage.find((t) => t.style === 'gain');
  const xpRamassage = apresRamassage.find((t) => t.style === 'xp');
  assert.equal(apresRamassage.length, 2, 'un ramassage = le gain ET son XP');
  assert.equal(gainRamassage.cle, auSol.itemId);
  assert.equal(xpRamassage.quantite, registre.obtenir('items', auSol.itemId).xp);
  console.log('OK une récolte et un ramassage émettent chacun le gain et son XP');
}

console.log('OK test_d05_texte_flottant');

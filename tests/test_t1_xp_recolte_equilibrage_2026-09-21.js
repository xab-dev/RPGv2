// `D-58` (file Nv.0 → Nv.10, T1) — décision de Xav du 21/09 : « toute récolte
// rapporte un peu d'XP ». Ce test ne vérifie pas que le code marche (les
// autres le font) : il vérifie que les NOMBRES POSÉS EN DONNÉES tiennent la
// cible d'équilibrage que Xav a fixée, et il tombe le jour où quelqu'un les
// change sans y penser.
//
// Les trois cibles, telles que le brief les écrit :
//   1. un joueur qui ramasse ce qui se trouve entre la sortie de la Grotte,
//      le chemin et le Jardin atteint **Nv.2 à 3 avant la première nuit** ;
//   2. la récolte seule ne dépasse pas **~30 %** de l'XP de Nv.0 → 5 ;
//   3. à partir de Nv.10 elle devient négligeable **par le seul effet de la
//      courbe** — aucune règle spéciale, donc rien à vérifier côté code : ce
//      qu'on vérifie, c'est que la part d'un circuit dans le niveau suivant
//      DÉCROÎT à chaque niveau.
//
// LE MODÈLE DE JOUEUR EST ÉCRIT ICI, EN CLAIR, ET C'EST VOULU. Aucun bot ne
// sait ce qu'est « une première journée de débutant » ; ce test le déclare,
// le commente, et devient donc discutable — Xav peut contester le modèle
// plutôt que de découvrir en jouant que le réglage était faux.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { niveauPourXp, xpDeCatalogue } from '../src/xp.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'), Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, [], 'les catalogues doivent charger');
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), [], 'les catalogues doivent valider');
const registre = construireRegistre(donnees);

const niveaux = registre.tous('levels');
const xpDeNiveau = (n) => niveaux.find((l) => l.niveau === n).xp_cumulee;
const xpItem = (id) => xpDeCatalogue(registre.obtenir('items', id));
const xpRessource = (id) => xpDeCatalogue(registre.obtenir('resources', id));
const xpStation = (id) => xpDeCatalogue(registre.obtenir('stations', id));

// --- 0. Toute source de récolte rapporte quelque chose ---------------------
// Le contraire serait un oubli silencieux : un item ramassable à 0 XP ne
// casse rien, il rend juste une partie du monde stérile sans le dire.
{
  for (const item of registre.tous('items')) {
    if (!item.spawn) continue; // un item purement de craft ne se ramasse pas au sol
    assert.ok(xpItem(item.id) > 0, `${item.id} se ramasse au sol : il doit porter une XP`);
  }
  for (const res of registre.tous('resources')) {
    assert.ok(xpRessource(res.id) > 0, `${res.id} se récolte : elle doit porter une XP`);
  }
  assert.ok(xpStation('station_type_puits') > 0, 'le puits doit porter une XP');
  console.log('OK toute source de récolte porte une XP, et elle vit en données');
}

// --- 1. Le circuit de la première journée ---------------------------------
// MODÈLE. Le joueur sort de la Grotte, suit le chemin, atteint le Jardin, et
// y traîne jusqu'à la tombée de la nuit — soit les 10 minutes de jour de
// `daynight.js`. Il n'a **aucun outil** (la hache et la pioche se craftent),
// donc `res_bois`/`res_pierre` ne comptent pas : avant la première nuit, la
// récolte, c'est le RAMASSAGE et le puits.
//
//   - un passage complet ramasse tout ce qui est au sol, c'est-à-dire le
//     TIRAGE DU JOUR (`spawn.nb_au_sol`) — et il n'y en a pas d'autre :
//     depuis `D-59`, un objet ramassé ne repousse pas dans la journée, sauf
//     s'il déclare un `respawn_ms`. C'est ce qui rend le modèle simple et
//     honnête : le joueur ramasse ce que le matin a posé, une fois ;
//   - le fruit, lui, déclare sa repousse (l'arbre fruitier). On compte
//     `PASSAGES_AU_FRUIT` cueillettes sur la journée — il repousse en 60 s,
//     le joueur ne campe pas dessous ;
//   - il boit `GORGEES_AU_PUITS` fois au puits (le cooldown en permettrait
//     bien plus ; on compte ce qu'un joueur fait, pas ce qu'il pourrait).
//
// Ce modèle a CHANGÉ avec T2, et c'est la bonne raison de le dire ici : la
// version de T1 comptait des « repasses » pour ramasser ce qui avait
// repoussé. Le tirage à l'aube a supprimé cette repousse ; le modèle la
// perd donc aussi, plutôt que de continuer à compter une XP qui n'existe
// plus. Ce qui compense, c'est le nombre d'objets posés le matin.
//
// La Plume (T6) n'est pas comptée : une cible d'équilibrage ne doit pas
// dépendre d'un objet unique, ramassable une seule fois dans toute la partie.
const PASSAGES_AU_FRUIT = 4;
const GORGEES_AU_PUITS = 2;

function xpDuCircuit() {
  let total = 0;
  for (const item of registre.tous('items')) {
    if (!item.spawn) continue;
    // Un item qui déclare `respawn_ms` se cueille plusieurs fois par jour ;
    // les autres, une seule. C'est la DONNÉE qui décide, pas ce test.
    const cueillettes = item.spawn.respawn_ms ? PASSAGES_AU_FRUIT : 1;
    total += xpItem(item.id) * item.spawn.nb_au_sol * cueillettes;
  }
  return total + xpStation('station_type_puits') * GORGEES_AU_PUITS;
}

{
  const gagne = xpDuCircuit();
  const niveau = niveauPourXp(niveaux, gagne).niveau;
  assert.ok(
    niveau >= 2 && niveau <= 3,
    `le circuit de la première journée doit mener au Nv.2 ou 3 (obtenu : Nv.${niveau} pour ${gagne} XP)`,
  );
  console.log(`OK circuit de la première journée : ${gagne} XP → Nv.${niveau}`);
}

// --- 2. La récolte ne porte pas la montée Nv.0 → 5 ------------------------
// La récolte doit être un COUP DE POUCE, pas la boucle du jeu : le combat et
// le craft restent les sources principales. Le plafond de Xav est ~30 %.
{
  const budget = xpDeNiveau(5);
  const part = xpDuCircuit() / budget;
  assert.ok(
    part <= 0.30,
    `la récolte ne doit pas dépasser 30 % de l'XP de Nv.0 → 5 (obtenu : ${(part * 100).toFixed(1)} %)`,
  );
  // Témoin dans l'autre sens : sous 15 %, elle ne se sentirait plus, et le
  // ticket aurait manqué son but (« c'est ce texte qui apprend la boucle »).
  assert.ok(part >= 0.15, `la récolte doit rester sensible (obtenu : ${(part * 100).toFixed(1)} %)`);
  console.log(`OK la récolte pèse ${(part * 100).toFixed(1)} % de Nv.0 → 5 (plafond 30 %)`);
}

// --- 3. Elle s'efface toute seule, par la courbe --------------------------
// Aucune règle spéciale n'est livrée, et c'est le point : la part d'un même
// circuit dans le niveau suivant doit DÉCROÎTRE strictement à chaque palier.
// Si un jour la courbe s'aplatit, ce test le dira avant le joueur.
{
  const gagne = xpDuCircuit();
  const parts = [];
  for (let n = 1; n < niveaux.length; n += 1) {
    const cout = xpDeNiveau(n + 1) - xpDeNiveau(n);
    parts.push({ n, part: gagne / cout });
  }
  // La part ne REMONTE jamais. On ne demande pas mieux que « non
  // croissante » : la courbe actuelle a deux paliers de coût égal au début
  // (20 puis 20 XP), et c'est volontaire — les deux premiers niveaux doivent
  // tomber vite. Exiger une décroissance stricte dès le Nv.1 interdirait ce
  // choix de design pour une raison purement arithmétique.
  for (let i = 1; i < parts.length; i += 1) {
    assert.ok(
      parts[i].part <= parts[i - 1].part,
      `la part du circuit ne doit jamais remonter : Nv.${parts[i - 1].n} ${parts[i - 1].part.toFixed(2)} `
      + `→ Nv.${parts[i].n} ${parts[i].part.toFixed(2)}`,
    );
  }
  const dernier = parts[parts.length - 1];
  // Et elle s'efface pour de bon : au dernier palier connu, le même circuit
  // vaut moins de la MOITIÉ de ce qu'il valait au premier. C'est ce que veut
  // dire « négligeable par le seul effet de la courbe ».
  assert.ok(
    dernier.part < parts[0].part / 2,
    `au dernier palier, le circuit doit valoir moins de la moitié de sa part initiale `
    + `(${parts[0].part.toFixed(2)} → ${dernier.part.toFixed(2)})`,
  );
  // `Q-44` : la table s'arrête au Nv.10, alors que la clôture de la Région
  // Maison se joue au Nv.30. Ce test ne peut donc rien dire au-delà — il le
  // DIT plutôt que de laisser croire qu'il l'a vérifié.
  assert.equal(niveaux.length, 10, "levels.json s'arrête au Nv.10 (`Q-44`) : au-delà, rien n'est prouvé ici");
  console.log(
    `OK la part du circuit décroît seule : Nv.1 ${parts[0].part.toFixed(2)} niveau `
    + `→ Nv.${dernier.n} ${dernier.part.toFixed(2)} niveau`,
  );
}

console.log('OK test_t1_xp_recolte_equilibrage');

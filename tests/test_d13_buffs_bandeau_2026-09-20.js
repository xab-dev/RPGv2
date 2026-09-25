// `D-13` — les buffs actifs entrent dans le bandeau HUD.
//
// Décision verrouillée du 19/09 (`NS_decisions-revue-dettes`, § Bandeau HUD),
// qui fait foi : compagnon · PV · éclats · faim · soif · **buffs** · `Nv. N`
// collé au bord droit. Un buff = **une icône par effet (la stat renforcée)**,
// forme ET couleur, **sans texte ni jauge de durée** ; pulsation douce en
// fondu sur les ~2 dernières secondes, jamais un flash sec.
//
// Le point le plus important du ticket, et celui qu'on peut rater sans s'en
// apercevoir : l'icône représente **la stat**, pas le plat. `buff_repas`
// renforce `stat_vitalite` : il doit donc montrer l'icône de VITALITÉ, la
// même que n'importe quel autre buff de vitalité. Ajouter une recette ne
// doit jamais ajouter une icône.
//
// Prouvé ici :
//   1. chaque stat déclare son icône, en données, et elle existe vraiment ;
//   2. tout buff temporaire du catalogue sait donc trouver son icône, et
//      deux buffs de la même stat trouvent LA MÊME ;
//   3. les icônes se distinguent par la FORME autant que par la couleur ;
//   4. le placement tient dans la zone, dans l'ordre d'activation, et le
//      débordement suit la règle du suivi (les plus anciens restent) ;
//   5. la pulsation est douce : bornée, continue, jamais un flash sec ;
//   6. le HUD LIT les buffs, il ne les recalcule pas.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import {
  elementsBandeauHaut, placerIconesBuffs, alphaPulsationBuff, PULSATION_BUFF, ICONE_BUFF,
} from '../src/ui/hud_layout.js';
import { ajouterBuffActif, tickBuffsActifs, iconeBuffBandeau } from '../src/status.js';
import { empreinteParDefaut } from '../src/structures.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), [], 'les catalogues du jeu doivent être valides au boot');
const registre = construireRegistre(catalogues);

// --- 1. Chaque stat déclare son icône, et elle existe ----------------------
{
  for (const stat of catalogues.stats) {
    assert.ok(stat.icone, `${stat.id} doit déclarer une icône de buff`);
    const visuel = registre.obtenir('visuels', stat.icone); // lève si l'id est inconnu
    assert.ok(Array.isArray(visuel.primitives) && visuel.primitives.length > 0,
      `${stat.icone} doit être un assemblage de primitives`);
  }
  // Et c'est une vraie RÉFÉRENCE : un id inconnu tombe au boot, avec son
  // chemin. Le champ est optionnel au schéma (pour qu'un catalogue existant
  // reste valide, comme `weapons.icone`), donc c'est CE bloc qui tient la
  // règle « chaque stat du jeu a son icône » — pas le schéma.
  const copie = JSON.parse(JSON.stringify(catalogues));
  copie.stats[0].icone = 'visuel_qui_nexiste_pas';
  const erreursRef = validerCatalogues(copie);
  assert.ok(erreursRef.some((e) => /visuel_qui_nexiste_pas/.test(e)),
    `un id d'icône inconnu doit tomber au boot : ${erreursRef.join(' | ')}`);

  console.log(`  ${catalogues.stats.length} stats, ${catalogues.stats.length} icônes déclarées en données (référence vérifiée au boot)`);
}

// --- 2. Deux buffs de la même stat montrent LA MÊME icône -----------------
// C'est « une icône par stat, pas une par recette », vérifié sur le catalogue
// réel plutôt qu'affirmé en commentaire.
{
  // LA fonction du jeu (status.js#iconeBuffBandeau), jamais une recopie :
  // depuis le soin de la pomme cuite (23/09), un effet sans stat peut
  // emprunter l'icône d'une stat, et c'est elle qui le sait.
  const iconeDeBuff = (effetId) => {
    const icone = iconeBuffBandeau(registre, registre.obtenir('status_effects', effetId));
    return icone ? icone.visuel : null;
  };

  // `buff_vitalite` (permanent) et `buff_repas` (temporaire, une recette)
  // renforcent tous deux la vitalité : même icône, obligatoirement.
  assert.equal(iconeDeBuff('buff_repas'), iconeDeBuff('buff_vitalite'),
    'un buff de recette doit montrer l’icône de sa STAT, pas la sienne');
  assert.notEqual(iconeDeBuff('buff_force'), iconeDeBuff('buff_vitalite'),
    'deux stats différentes ont deux icônes différentes');

  // Et tout buff temporaire du catalogue (le seul chemin vers le bandeau)
  // sait trouver son icône : pas de trou possible.
  const temporaires = catalogues.status_effects.filter(
    (e) => e.cible === 'joueur' && typeof e.duree === 'number',
  );
  assert.ok(temporaires.length > 0, 'il doit exister au moins un buff temporaire');
  for (const effet of temporaires) {
    assert.ok(iconeDeBuff(effet.id), `${effet.id} doit résoudre une icône`);
  }
  console.log(`  ${temporaires.length} buff(s) temporaire(s) : ${temporaires.map((e) => e.id).join(', ')} -> icône de leur stat`);
}

// --- 3. Forme ET couleur : jamais la couleur seule ------------------------
// P4② de la carte mentale. Un joueur qui ne distingue pas les couleurs doit
// pouvoir lire le bandeau : les silhouettes doivent donc différer entre
// elles, pas seulement leurs teintes.
{
  const signatures = new Map();
  const couleurs = new Set();
  for (const stat of catalogues.stats) {
    const visuel = registre.obtenir('visuels', stat.icone);
    // Signature de FORME : la suite des formes et leurs boîtes, arrondies.
    const signature = visuel.primitives.map((p) => {
      const b = empreinteParDefaut({ primitives: [p] }, 1);
      return `${p.forme}:${b.w.toFixed(1)}x${b.h.toFixed(1)}`;
    }).join('|');
    assert.ok(!signatures.has(signature),
      `${stat.id} a la même forme que ${signatures.get(signature)} : la couleur seule ne suffit pas (P4②)`);
    signatures.set(signature, stat.id);
    for (const p of visuel.primitives) if (p.couleur) couleurs.add(p.couleur.toLowerCase());
  }
  assert.ok(couleurs.size >= catalogues.stats.length,
    'les icônes doivent aussi se distinguer par la couleur');
  console.log(`  ${signatures.size} formes distinctes, ${couleurs.size} couleurs distinctes`);
}

// --- 4. Le placement : dans la zone, dans l'ordre, débordement réglé -------
{
  const zone = elementsBandeauHaut({ follet: true, survie: true, niveau: true }).buffs;
  assert.ok(zone.largeur > 0, 'la zone des buffs doit exister (libérée par `D-17`)');

  // a) rien à afficher -> rien de placé, et surtout pas un rectangle vide.
  assert.deepEqual(placerIconesBuffs(zone, 0), { rects: [], masques: 0 });

  // b) un cas normal : tout tient, de gauche à droite, dans la zone.
  const trois = placerIconesBuffs(zone, 3);
  assert.equal(trois.rects.length, 3);
  assert.equal(trois.masques, 0);
  for (const r of trois.rects) {
    assert.ok(r.x >= zone.x, 'une icône ne déborde jamais à gauche de sa zone');
    assert.ok(r.x + r.largeur <= zone.x + zone.largeur, 'ni à droite');
    assert.ok(r.y >= zone.y && r.y + r.hauteur <= zone.y + zone.hauteur, 'ni en hauteur');
  }
  // L'ordre est celui d'activation, de la soif vers la droite.
  for (let i = 1; i < trois.rects.length; i += 1) {
    assert.ok(trois.rects[i].x > trois.rects[i - 1].x, 'les icônes se rangent vers la droite');
    assert.ok(trois.rects[i].x >= trois.rects[i - 1].x + trois.rects[i - 1].largeur,
      'deux icônes ne se chevauchent jamais');
  }

  // c) débordement : la règle du suivi est « les plus ANCIENS restent ».
  //    On demande beaucoup plus que la place disponible.
  const capacite = trois.rects.length && placerIconesBuffs(zone, 99).rects.length;
  assert.ok(capacite > 0 && capacite < 99, `la zone doit avoir une capacité finie (${capacite})`);
  const trop = placerIconesBuffs(zone, capacite + 5);
  assert.equal(trop.rects.length, capacite, 'on n’affiche jamais plus que la capacité');
  assert.equal(trop.masques, 5, 'le reste est compté comme masqué');
  // Les rectangles rendus sont bien les PREMIERS (donc les plus anciens) :
  // ils sont identiques à ceux d'un appel qui tiendrait tout juste.
  assert.deepEqual(trop.rects, placerIconesBuffs(zone, capacite).rects,
    'le débordement retire les plus récents, jamais les plus anciens');

  // d) une zone trop étroite ne produit rien plutôt qu'un rectangle négatif.
  const etroite = { ...zone, largeur: 2 };
  assert.deepEqual(placerIconesBuffs(etroite, 3), { rects: [], masques: 3 });
  console.log(`  zone de ${zone.largeur} px : capacité ${capacite} icônes de ${ICONE_BUFF.taille} px`);
}

// --- 5. La pulsation : douce, bornée, continue ----------------------------
{
  // Hors de la fenêtre, pleine opacité — aucune pulsation en vie normale.
  assert.equal(alphaPulsationBuff(PULSATION_BUFF.fenetre_ms + 1), 1);
  assert.equal(alphaPulsationBuff(60000), 1);

  // À l'entrée dans la fenêtre, pas de marche : c'est ça, « jamais un flash
  // sec ». On compare les deux côtés de la frontière.
  const avant = alphaPulsationBuff(PULSATION_BUFF.fenetre_ms + 1);
  const apres = alphaPulsationBuff(PULSATION_BUFF.fenetre_ms - 1);
  assert.ok(Math.abs(avant - apres) < 0.01, `marche à l'entrée de la pulsation : ${avant} -> ${apres}`);

  // Bornée, et jamais éteinte (sinon l'icône clignoterait "dur").
  let min = Infinity;
  let max = -Infinity;
  let sautMax = 0;
  let precedent = alphaPulsationBuff(PULSATION_BUFF.fenetre_ms);
  for (let reste = PULSATION_BUFF.fenetre_ms; reste >= 0; reste -= 16) {
    const a = alphaPulsationBuff(reste);
    min = Math.min(min, a);
    max = Math.max(max, a);
    sautMax = Math.max(sautMax, Math.abs(a - precedent));
    precedent = a;
  }
  assert.ok(min >= PULSATION_BUFF.alpha_min - 1e-9, `alpha minimal ${min} sous le plancher`);
  assert.ok(min > 0.2, 'l’icône ne doit jamais disparaître complètement pendant la pulsation');
  assert.ok(max <= 1 + 1e-9, 'alpha jamais au-dessus de 1');
  assert.ok(sautMax < 0.2, `pulsation trop brusque d'une frame à l'autre (${sautMax.toFixed(3)})`);

  // 2 à 3 battements par seconde AU PLUS (spec de Xav).
  assert.ok(PULSATION_BUFF.frequence_hz <= 3, 'jamais plus de 3 battements par seconde');
  assert.ok(PULSATION_BUFF.frequence_hz >= 2, 'ni moins de 2 : ce serait une respiration, pas une alerte');
  console.log(`  pulsation : ${PULSATION_BUFF.frequence_hz} Hz sur les ${PULSATION_BUFF.fenetre_ms} dernières ms, alpha ${min.toFixed(2)}..${max.toFixed(2)}, saut max ${sautMax.toFixed(3)}`);
}

// --- 6. Le HUD lit les buffs, il ne les recalcule pas ---------------------
// Exigence explicite du brief. La table des buffs actifs est tenue par
// status.js ; l'ordre des clés EST l'ordre d'activation, et c'est lui que le
// bandeau suit. Si le HUD recalculait quoi que ce soit, cet ordre pourrait
// diverger de celui des modificateurs réellement appliqués aux stats.
{
  let buffs = {};
  buffs = ajouterBuffActif(registre, buffs, 'buff_repas');
  assert.deepEqual(Object.keys(buffs), ['buff_repas']);
  assert.equal(buffs.buff_repas, registre.obtenir('status_effects', 'buff_repas').duree);

  // Un effet permanent n'entre pas dans la table (donc jamais au bandeau) :
  // le bandeau montre ce qui va s'éteindre, pas ce qui est acquis.
  const avecPermanent = ajouterBuffActif(registre, buffs, 'buff_force');
  assert.deepEqual(Object.keys(avecPermanent), ['buff_repas'],
    'un buff permanent ne doit pas entrer dans la table des buffs actifs');

  // Le temps qui passe retire le buff, et l'ordre des survivants ne bouge pas.
  const presqueFini = tickBuffsActifs(buffs, buffs.buff_repas - 500);
  assert.deepEqual(Object.keys(presqueFini), ['buff_repas']);
  assert.ok(presqueFini.buff_repas <= PULSATION_BUFF.fenetre_ms,
    'à 500 ms de la fin, le buff est dans la fenêtre de pulsation');
  assert.deepEqual(tickBuffsActifs(presqueFini, 600), {}, 'puis il disparaît');

  // Et le HUD ne connaît ni status.js ni le registre : il reçoit des
  // silhouettes déjà résolues, comme pour le follet et l'arme. On lit le
  // CODE, commentaires retirés — `hud.js` a le droit d'expliquer en prose que
  // c'est main.js qui tient le registre, pas d'aller le chercher.
  const hud = fs.readFileSync(path.join(RACINE, 'src', 'ui', 'hud.js'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const interdit of ['status.js', 'status_effects', 'buffs_actifs', 'registre', 'obtenir(']) {
    assert.ok(!hud.includes(interdit), `ui/hud.js ne doit jamais connaître "${interdit}"`);
  }
}

// --- `D-41` : un effet n'a pas d'icône à lui --------------------------------
// Le champ `status_effects.icone` était requis et lu par personne : une icône
// par EFFET, la granularité que cette règle refuse. Il est retiré, et refusé
// au boot avec le bon chemin, pour que personne ne le recâble.
{
  assert.ok(catalogues.status_effects.every((e) => !('icone' in e)),
    'aucun effet du catalogue ne porte d’icône à lui');
  const copie = JSON.parse(JSON.stringify(catalogues));
  copie.status_effects[0].icone = 'visuel_buff_force';
  const erreursIcone = validerCatalogues(copie);
  assert.ok(erreursIcone.some((e) => /status_effects.*icone n'existe pas sur un effet/.test(e)),
    `une icône posée sur un effet doit tomber au boot : ${erreursIcone.join(' | ')}`);
  console.log('  un effet n’a pas d’icône à lui : refusé au boot');
}

console.log('OK test_d13_buffs_bandeau');

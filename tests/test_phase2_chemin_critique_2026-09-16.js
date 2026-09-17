// Audit du chemin critique de 03_maison-exterieur.md §7 (première marche) sur
// le VRAI orchestrateur (creerOrchestrateurGrotte, réutilisé — pas un
// système séparé pour cette scène), à base d'inputs abstraits sur les
// données réelles de /data. Même patron que
// test_phase1_sd_audit_chemin_critique : rejoue le parcours, rapporte l'état
// réel, ne mocke aucune donnée.
//
// Les arbres/rochers interactifs sont entourés de forêt procédurale
// (densité à graine fixe, §3.1) : un beeline direct depuis le chemin peut
// traverser un arbre de fond sur la diagonale (un vrai joueur contournerait
// à l'oeil ; ce bot de test ne le fait pas). `colonneApprochable`/
// `trouverColonneApproche` cherchent une colonne dégagée entre le chemin et
// la cible — outillage de TEST, aucun pathfinding ajouté au jeu.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');
const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

function etat({ moveX = 0, moveY = 0, attack = false, interact = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: false, held: false },
  };
}

function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}

// Avance vers `cible` (point logique) jusqu'à passer sous `seuil` px, ou
// qu'un dialogue s'ouvre entre-temps.
function avancerVers(orchestrateur, frames, cible, { seuil = 4, maxFrames = 1500, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    const hero = orchestrateur.obtenirHero();
    const dx = cible.x - hero.x;
    const dy = cible.y - hero.y;
    const distance = Math.hypot(dx, dy);
    if (distance < seuil) return true;
    frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
    orchestrateur.maj(deltaMs);
  }
  return false;
}

function fermerDialogue(orchestrateur, frames) {
  let garde = 0;
  while (orchestrateur.dialogueOuvert() && garde++ < 30) {
    frames.push(etat({ attack: true }));
    orchestrateur.maj(16);
    for (let i = 0; i < Math.ceil(DELAI_ARMEMENT_DIALOGUE_MS / 16) + 2; i++) {
      frames.push(etat());
      orchestrateur.maj(16);
    }
  }
}

// Colonne `tx` dégagée entre les lignes `tyDepart` et `tyCible` (bornes
// incluses, sauf tyCible lui-même — une ressource EST solide par
// construction, ce n'est pas ce qu'on vérifie ici).
function colonneApprochable(scene, tx, tyDepart, tyCible) {
  const debut = Math.min(tyDepart, tyCible);
  const fin = Math.max(tyDepart, tyCible);
  for (let y = debut; y <= fin; y++) {
    if (y === tyCible) continue;
    const t = scene.tuileA(tx, y);
    if (!t || t.solid) return false;
  }
  return true;
}

// Cherche, près de `txCible`, une colonne dégagée depuis le chemin — décalage
// croissant, alterné gauche/droite, borné (le chemin lui-même est toujours à
// portée en dernier recours).
function trouverColonneApproche(scene, txCible, tyDepart, tyCible) {
  for (let dx = 0; dx <= 6; dx++) {
    for (const signe of dx === 0 ? [1] : [1, -1]) {
      const tx = txCible + dx * signe;
      if (colonneApprochable(scene, tx, tyDepart, tyCible)) return tx;
    }
  }
  return txCible;
}

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreursChargement, []);
assert.deepEqual(validerCatalogues(donnees), []);

const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');
const store = creerStoreMemoire();
const save = saveNeuve();
// Part directement de la sortie de la grotte (§7 : "premières marches" —
// choix du follet et parcours de la grotte déjà couverts par
// test_phase1_sd_audit_chemin_critique, pas rejoués ici).
save.hero.scene = 'scene_maison_exterieur';
save.hero.x = px(6, 58).x;
save.hero.y = px(6, 58).y;
save.hero.companion = 'comp_follet_eau';
save.hero.pv = 40;
save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true, flag_grotte_monstre_tue: true, flag_levier_salle1: true };

const menuFactice = { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} };
const dialogue = creerDialogue();
const frames = [];
const input = creerInputScripte(frames);
const orchestrateur = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu: menuFactice, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });
const scene = orchestrateur.obtenirScene();

const resultats = [];
function etape(nom, ok, detail) {
  resultats.push({ nom, ok, detail });
}

const DISTANCE_INTERACT_PX = 28; // même seuil que main.js — dupliqué ici, non exporté

// --- Premier arbre interactif : DOIT être croisé par la marche NATURELLE
// spawn -> porte ouest, SANS outillage d'approche dédié (contrairement au
// rocher ci-dessous) — cf. SD_hitbox-angle-arbre_2026-09-16 sujet B : l'unique
// tile_arbre interactif était placé 2 rangées au-dessus de la bande de
// chemin, jamais rencontré par Xav sans détour. On ne cible plus une
// coordonnée en dur : on scanne la scène pour trouver la/les tuile(s)
// res_bois, ce qui protège ce test contre toute réédition future du layout
// (§3.2 : "sans instruction").
{
  const tuilesRessource = [];
  for (let ty = 0; ty < scene.height; ty++) {
    for (let tx = 0; tx < scene.width; tx++) {
      const tuile = scene.tuileA(tx, ty);
      if (tuile && tuile.ressource) tuilesRessource.push({ tx, ty, ressourceId: tuile.ressource });
    }
  }
  etape('Au moins une tuile-ressource interactive existe dans la scène', tuilesRessource.length > 0, JSON.stringify(tuilesRessource));

  // Beeline directe vers la porte ouest (aucune tooling d'approche) : si une
  // ressource est vraiment sur le chemin naturel, le bot la croise sans aide.
  const porteOuest = px(78, 57);
  let croisee = null;
  for (let i = 0; i < 2000 && !croisee; i++) {
    const hero = orchestrateur.obtenirHero();
    for (const t of tuilesRessource) {
      const cx = (t.tx + 0.5) * TILE;
      const cy = (t.ty + 0.5) * TILE;
      if (Math.hypot(hero.x - cx, hero.y - cy) <= DISTANCE_INTERACT_PX) { croisee = t; break; }
    }
    if (croisee) break;
    const dx = porteOuest.x - hero.x;
    const dy = porteOuest.y - hero.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) break;
    frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
    orchestrateur.maj(16);
  }
  etape('La marche directe spawn -> porte ouest croise une ressource, sans détour', !!croisee, JSON.stringify(croisee));

  frames.push(etat({ interact: true })); orchestrateur.maj(16);
  etape('INTERACT sur l\'arbre ouvre le dialogue bloqué', orchestrateur.dialogueOuvert());
  const ligne = orchestrateur.dialogueLigneCourante();
  etape('Locuteur = follet', ligne && ligne.locuteur === i18n.t('companion.follet_eau'), JSON.stringify(ligne));
  fermerDialogue(orchestrateur, frames);
}

// --- Rocher (tile_rocher en (34,61)) : dialogue bloqué ---
{
  const txApproche = trouverColonneApproche(scene, 34, 58, 61);
  const arrivePath = avancerVers(orchestrateur, frames, px(txApproche, 58));
  etape('Marche jusqu\'au chemin, aligné avec le premier rocher', arrivePath);
  avancerVers(orchestrateur, frames, px(34, 61), { seuil: DISTANCE_INTERACT_PX - 4, maxFrames: 900 });
  frames.push(etat({ interact: true })); orchestrateur.maj(16);
  etape('INTERACT sur le rocher ouvre le dialogue bloqué', orchestrateur.dialogueOuvert());
  fermerDialogue(orchestrateur, frames);
}

// --- Ramassage d'une branche (§3.3) : cible la plus proche du chemin parmi
// les 2 exemplaires, pour rester dans le corridor testable ci-dessus. ---
{
  const itemsSolAvant = save.monde.items_sol['scene_maison_exterieur'];
  const branches = itemsSolAvant.item_branche;
  const branche = branches.reduce((a, b) => (Math.abs(a.y - px(0, 57).y) < Math.abs(b.y - px(0, 57).y) ? a : b));
  const txCible = Math.floor(branche.x / TILE);
  const tyCible = Math.floor(branche.y / TILE);
  const tyPath = tyCible <= 57 ? 56 : 58; // rejoint le chemin par le côté le plus proche
  const txApproche = trouverColonneApproche(scene, txCible, tyPath, tyCible);
  // Repasse d'abord par la ligne 57 (coeur du chemin, garanti dégagé sur
  // toute la largeur x=4..168) avant de filer horizontalement vers la
  // colonne d'approche — évite de couper en diagonale à travers la forêt
  // encore proche (arbre/rocher) sur le trajet vers la branche, lointaine.
  const heroCourant = orchestrateur.obtenirHero();
  avancerVers(orchestrateur, frames, px(Math.floor(heroCourant.x / TILE), 57), { maxFrames: 300 });
  avancerVers(orchestrateur, frames, px(txApproche, 57), { maxFrames: 4000 });
  avancerVers(orchestrateur, frames, branche, { seuil: 20, maxFrames: 900 });
  frames.push(etat({ interact: true })); orchestrateur.maj(16);
  etape('Branche ramassée (poche)', save.inventaire.items.item_branche === 1, JSON.stringify(save.inventaire.items));
  etape('flag_premier_ramassage posé', save.flags.flag_premier_ramassage === true);
  etape('Dialogue de premier ramassage ouvert', orchestrateur.dialogueOuvert());
  fermerDialogue(orchestrateur, frames);
  // Palier B (§3.2) : le compte baisse immédiatement, la régénération est
  // désormais différée de respawn_ms (jamais plus un tirage immédiat).
  const itemsSolApres = save.monde.items_sol['scene_maison_exterieur'];
  etape('Le compte au sol baisse immédiatement (régénération différée)', itemsSolApres.item_branche.length === branches.length - 1);
}

// --- Entrée dans la maison (via le chemin, qui traverse la porte ouest) ---
{
  const arrivePorte = avancerVers(orchestrateur, frames, px(80, 57), { maxFrames: 3000 });
  etape('Marche jusqu\'à l\'intérieur de la maison', arrivePorte);
  etape('flag_maison_decouverte posé en entrant', save.flags.flag_maison_decouverte === true);
}

// --- Sortie côté jardin (porte est) puis zone "jardin" ---
{
  const arriveJardin = avancerVers(orchestrateur, frames, px(100, 57), { maxFrames: 3000 });
  etape('Marche jusqu\'au jardin', arriveJardin);
  etape('flag_jardin_decouvert posé en entrant', save.flags.flag_jardin_decouvert === true);
}

// --- Puits (station réelle depuis Palier A/C, specs/04_maison-interieur.md
// §3.3) — SOLIDE et agrandi (specs/04_stations-proportions-collision.md,
// 2026-09-17) : viser sa position exacte ne fonctionne plus (le héros bute
// sur son empreinte avant d'atteindre le centre) — `seuil` généreux pour
// tolérer l'arrêt sur le bord (rayon du héros + demi-largeur de l'empreinte,
// approché de l'ouest ici, cf. journal 2026-09-17), le seuil d'interaction
// réel (mesuré au bord, DISTANCE_INTERACT_PX) reste, lui, largement atteint
// à cette distance. Boire remplit la soif silencieusement (aucun dialogue) ;
// un second INTERACT immédiat, en cooldown, ouvre dlg_puits_cooldown.
{
  const arrivePuits = avancerVers(orchestrateur, frames, px(106, 57), { seuil: 36, maxFrames: 900 });
  etape('Marche vers le puits (jusqu\'à son empreinte solide)', arrivePuits);
  frames.push(etat({ interact: true })); orchestrateur.maj(16);
  // Tolérance : la même frame fait aussi avancer la décroissance de survie
  // (§3.3, même point de décision unique) après avoir bu — l'écart est de
  // l'ordre d'une frame (~16 ms / decroissance_ms_plein_a_vide), pas une
  // vraie divergence.
  etape('INTERACT sur le puits remplit la soif à 1', save.survie.jauge_soif > 0.999, JSON.stringify(save.survie));
  etape('Aucun dialogue à la première utilisation du puits', !orchestrateur.dialogueOuvert());
  frames.push(etat({ interact: true })); orchestrateur.maj(16);
  etape('INTERACT immédiat suivant (cooldown) ouvre un dialogue', orchestrateur.dialogueOuvert());
  fermerDialogue(orchestrateur, frames);
}

// --- Ramassage du fruit du jardin (zone sans forêt procédurale, toujours
// directement accessible) ---
{
  const itemsSolAvant = save.monde.items_sol['scene_maison_exterieur'];
  const fruitAvant = itemsSolAvant.item_fruit[0];
  const arriveFruit = avancerVers(orchestrateur, frames, fruitAvant, { maxFrames: 1500 });
  etape('Marche vers le fruit', arriveFruit);
  frames.push(etat({ interact: true })); orchestrateur.maj(16);
  etape('Fruit ramassé (poche)', save.inventaire.items.item_fruit === 1, JSON.stringify(save.inventaire.items));
}

let echecs = 0;
for (const { nom, ok, detail } of resultats) {
  console.log(`[${ok ? 'OK' : 'ÉCHEC'}] ${nom}${detail ? ` (${detail})` : ''}`);
  if (!ok) echecs++;
}
assert.equal(echecs, 0, `${echecs} étape(s) en échec sur ${resultats.length}`);

console.log('OK test_phase2_chemin_critique');

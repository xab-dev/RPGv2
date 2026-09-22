// `D-123` (T7, `Q-43` tranchée par Xav le 22/09) : le puits ne rapporte de
// l'XP que si la soif était SOUS son seuil avant de boire.
//
// *Révise* la règle d'avant (« l'XP tombe si la jauge a bougé ») : à 99,5 %,
// boire faisait bouger la jauge d'un demi-point et rapportait autant qu'à
// 10 %. Le puits était payant au tapotement.
//
// Ce qui est éprouvé est un CONTRAT, jamais le chiffre (`D-52`) : le seuil
// appartient à Xav et vit dans `data/survival.json`. On vérifie qu'il EXISTE,
// qu'il est lu là et nulle part ailleurs, et que la règle le respecte de part
// et d'autre.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

const noms = Object.keys(SCHEMAS);
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const i18n = creerI18n(dictionnaires, 'fr');

const SOIF = registre.obtenir('survival', 'jauge_soif');
const PUITS = registre.obtenir('stations', 'station_type_puits');

// --- 1. Le seuil vit en données, et la faim n'en a pas -------------------
{
  assert.ok(typeof SOIF.seuil_xp === 'number', 'la soif déclare un seuil d’XP');
  assert.ok(SOIF.seuil_xp > 0 && SOIF.seuil_xp < 1, 'un seuil est une fraction de jauge, jamais 0 ni 1');
  const faim = registre.obtenir('survival', 'jauge_faim');
  assert.equal(faim.seuil_xp, undefined, 'la faim n’en déclare pas : on ne mange pas au puits');
  assert.ok(PUITS.xp > 0, 'le puits rapporte quelque chose quand il rapporte');

  // Le schéma refuse un seuil hors de [0,1] — sans quoi la faute ne se
  // verrait qu'en jouant, et seulement si on a soif.
  const cassé = donnees.survival.map((e) => (e.id === 'jauge_soif' ? { ...e, seuil_xp: 1.5 } : e));
  assert.ok(
    validerCatalogues({ ...donnees, survival: cassé }).some((m) => m.includes('seuil_xp')),
    'un seuil hors bornes tombe au boot',
  );
  console.log('OK le seuil vit en données, borné par le schéma, et la faim n’en a pas');
}

// --- 2. Sur le vrai jeu : au-dessus rien, en dessous « +1xp » ------------
function boireAvecSoif(soif) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_eau';
  save.hero.pv = 40;
  save.survie.jauge_soif = soif;
  save.flags = {
    flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
    flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true, flag_ambiance_maison_premiere_visite: true,
  };
  const frames = [];
  const orch = creerOrchestrateurGrotte({
    registre, i18n, save, store: creerStoreMemoire(), dialogue: creerDialogue(),
    menu: {
      estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {},
      ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {},
      rafraichirCoffre: () => {}, rafraichirStats: () => {},
    },
    input: { maj: () => frames[frames.length - 1] },
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });
  const scene = orch.obtenirScene();
  const empreinte = scene.empreintesSolides.find((e) => e.id === 'station_puits');
  assert.ok(empreinte, 'le puits doit exister dans la scène');
  const hero = orch.obtenirHero();
  hero.x = empreinte.x - 20;
  hero.y = empreinte.y + empreinte.h / 2;
  const b = (v) => ({ pressed: v, held: v });
  const etat = (interact) => ({
    move: { x: 0, y: 0 }, attack: b(false), skill_1: b(false), skill_2: b(false),
    skill_3: b(false), consume: b(false), interact: b(interact), menu: b(false), target_next: b(false),
  });
  const xpAvant = save.hero.xp;
  frames.push(etat(true));
  orch.maj(16);
  frames.push(etat(false));
  orch.maj(16);
  return { gagne: save.hero.xp - xpAvant, soifApres: save.survie.jauge_soif };
}

{
  // Juste AU-DESSUS du seuil : la jauge bouge encore (c'est ce qui trompait
  // l'ancienne règle), et pourtant rien ne doit tomber.
  const auDessus = boireAvecSoif(Math.min(0.999, SOIF.seuil_xp + 0.05));
  assert.ok(auDessus.soifApres > SOIF.seuil_xp, 'la jauge a bien bougé — c’est le piège de l’ancienne règle');
  assert.equal(auDessus.gagne, 0, 'au-dessus du seuil, boire ne rapporte rien');

  // Juste EN DESSOUS : l'XP tombe.
  const enDessous = boireAvecSoif(Math.max(0, SOIF.seuil_xp - 0.05));
  assert.equal(enDessous.gagne, PUITS.xp, 'sous le seuil, le puits rapporte son XP de catalogue');

  // Et la gourde pleine ne rapporte rien non plus, évidemment.
  assert.equal(boireAvecSoif(1).gagne, 0, 'gourde pleine : rien');
  console.log(
    `OK au-dessus du seuil (${Math.round(SOIF.seuil_xp * 100)} %) : rien ; en dessous : +${PUITS.xp}xp`,
  );
}

console.log('OK test_d123_puits_seuil');

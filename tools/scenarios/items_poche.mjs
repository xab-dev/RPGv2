// Les dix items refondus (`D-82` à `D-91`) DANS LE JEU, pas au banc. Le banc
// visuel les juge isolés sur un fond neutre ; seule la scène dit s'ils se
// détachent de la terre de la Maison, et seul le HUD dit ce que devient une
// silhouette réduite à une case de 12 unités (leçon de la refonte des
// stations : l'établi avait passé trois itérations au banc avant de se
// révéler noyé dans le sol).
//   node tools/capture_chrome.mjs tools/scenarios/items_poche.mjs
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict reste une
// validation de Xav, en jeu (`V-52`).
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/items-2026-09-21';
const TILE = 32;

// Les dix items, posés en deux rangées SOUS LES YEUX du héros plutôt que
// tirés au hasard : une capture doit montrer la même chose d'une fois sur
// l'autre, sinon on ne compare rien. `remplirItemsSol` recopie l'existant
// avant de compléter, donc ces positions-là survivent à l'entrée en scène —
// y compris pour les items qui n'ont aucun bloc `spawn` (outils, bois,
// pierre), qu'on ne verrait jamais au sol autrement.
// `D-119` : l'herbe rejoint l'étalage, posée À CÔTÉ de la branche — c'est
// avec elle qu'elle doit se distinguer au premier coup d'œil (`V-64`), et une
// capture qui les sépare ne répondrait pas à la question.
const ETALAGE = [
  'item_plume', 'item_branche', 'item_herbe', 'item_caillou', 'item_fruit',
  'item_fruit_cuit', 'item_bois', 'item_pierre', 'item_hache', 'item_pioche',
  'item_epee_bois',
];

export default async function (chrome) {
  // --- 1. Au sol, sur la terre de la Maison -------------------------------
  const save = saveDansLaMaison();
  save.monde.heure = 0.25; // plein jour : la nuit cacherait ce qu'on vient voir
  const auSol = {};
  ETALAGE.forEach((item, i) => {
    const colonne = i % 5;
    const rangee = Math.floor(i / 5);
    auSol[item] = [{ x: (81 + colonne * 2 + 0.5) * TILE, y: (46 + rangee * 2 + 0.5) * TILE }];
  });
  save.monde.items_sol = { scene_maison_exterieur: auSol };
  // Sans ceci, le « repos du jour » relance le tirage à l'entrée en scène et
  // redistribue au hasard les items qui ont un bloc `spawn` : quatre des dix
  // partaient ailleurs sur la carte, et l'étalage n'en montrait que six.
  save.monde.jour_items_sol = { scene_maison_exterieur: save.monde.jour };
  // Au nord de la Maison : de la terre nue et rien dessus. Posés entre les
  // stations, la moitié des items passaient derrière une table ou un coffre.
  save.hero.x = (85 + 0.5) * TILE;
  save.hero.y = (49 + 0.5) * TILE;
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
  await chrome.capture(`${DOSSIER}/au_sol_1920x1080.png`);
  console.log('au sol', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

  // --- 2. Dans la Poche, et dans la barre du bas --------------------------
  const poche = saveDansLaMaison();
  poche.monde.heure = 0.25;
  // `D-118` : la poche ne tient plus que quatre slots, et un contenu qui
  // déborde est normalisé au chargement (le surplus descend au coffre). On ne
  // peut donc plus y étaler les onze items — on y met les quatre qui se
  // jugent ENSEMBLE (branche et herbe voisines, `V-64`), et le reste au
  // coffre, qui a la place.
  // Trois slots de ressources + celui de l'épée : la poche est PLEINE, ce
  // qui est aussi ce qu'on veut voir (le sous-titre doit dire 4 / 4).
  const EN_POCHE = ['item_branche', 'item_herbe', 'item_fruit'];
  poche.inventaire.items = Object.fromEntries(EN_POCHE.map((id) => [id, 3]));
  poche.coffre.items = Object.fromEntries(ETALAGE.filter((id) => !EN_POCHE.includes(id)).map((id) => [id, 3]));
  poche.hero.equipement.consommable = 'item_fruit';
  // `equipement.arme` porte un id d'ARME (`weapons`), pas un id d'objet de
  // poche : les deux existent et ne se ressemblent que de nom. Avec l'id
  // d'objet, la case d'attaque se vidait en silence — voir `D-92`.
  // `D-92`/`D-93` : l'arme équipée est revalidée à chaque frame — si l'objet
  // n'est pas en POCHE, la case retombe sur les mains nues. L'épée doit donc
  // y être pour que la case d'attaque la montre.
  poche.inventaire.items.item_epee_bois = 1;
  delete poche.coffre.items.item_epee_bois;
  poche.hero.equipement.arme = 'weapon_epee_bois';
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: poche });
  // La barre du bas AVANT d'ouvrir quoi que ce soit : c'est là que l'arme et
  // le consommable équipés sont réduits à une case de 12 unités.
  await chrome.capture(`${DOSSIER}/barre_du_bas_1920x1080.png`);
  await chrome.touche('Escape');
  await chrome.touche('Space');
  await chrome.touche('Space');
  await chrome.capture(`${DOSSIER}/poche_1920x1080.png`);
  console.log('poche', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

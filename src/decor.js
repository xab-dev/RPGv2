// Décor procédural non-collisionnant (D15①) + variantes de tuiles
// (03_grotte-polish §3.4) : détermine, de façon déterministe à partir de
// scene.seed, quels motifs poser sur le sol et quelle variante/teinte
// choisir pour chaque tuile. Un même seed doit toujours produire le même
// résultat, quel que soit l'ordre d'appel — c'est ce qui permet à render.js
// de reconstruire le calque statique à l'identique d'une scène à l'autre.

// PRNG déterministe (mulberry32) — indépendant de Math.random, qui n'est pas
// reproductible d'un appel à l'autre. Exporté : réutilisé par loot.js (§6 de
// specs/02_grotte.md) pour rendre le tirage de loot testable à graine fixe,
// plutôt que de dupliquer l'algorithme.
export function mulberry32(graine) {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Décor (03_grotte-polish §3.4) : scene.decor = { densite, motifs: [{ visuel,
// poids }] } — un motif de plus dans motifs[] ne demande aucun code (règle
// d'architecture directrice, §7 carte mentale). Scène sans `decor` -> aucun
// motif, jamais une erreur (§4 edge case) : contrairement à `layout`/`spawn`,
// ce champ reste optionnel. `visuel` reste un id (string) ici : c'est
// l'appelant (main.js, qui a le registre) qui le résout en entrée de
// visuels.json, jamais decor.js — même séparation que pour les monstres/
// leviers.
const ROTATION_MAX_DEG = 10; // provisoire : "légère" variation (§3.4), pas une rotation aléatoire visible

// `multiplicateurDensite` (palier C de `specs/09_reglages-graphiques.md`) :
// un NOMBRE, rien d'autre. Ce module ne lit aucun catalogue de presets et ne
// connaît pas le mot « bas » — il reçoit de combien la densité déclarée par
// la scène doit être multipliée, comme il recevait déjà sa graine.
//
// CONTRAT À NE PAS CASSER, c'est lui qui rend le décor réduit inclus dans le
// décor complet : **chaque itération consomme un nombre CONSTANT de tirages**
// (position, motif, décalage x, décalage y, inclinaison). Le décor à densité
// réduite est alors exactement le PRÉFIXE de celui à densité pleine — un
// caillou présent en Bas est au même endroit en Moyen et en Haut, sans qu'il
// ait fallu changer une seule position. Ajouter ici un tirage conditionnel
// (« si tel motif, alors un tirage de plus ») décalerait toute la suite et
// ferait se réarranger le décor à chaque changement de preset ; c'est
// `tests/test_d114_levier_densite_decor_2026-09-22.js` qui refuse cela.
export function genererDecor(scene, multiplicateurDensite = 1) {
  const config = scene.decor;
  if (!config || !Array.isArray(config.motifs) || config.motifs.length === 0) return [];

  const poidsTotal = config.motifs.reduce((somme, m) => somme + m.poids, 0);
  const alea = mulberry32(scene.seed);
  const positionsSol = [];
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const tuile = scene.tuileA(x, y);
      if (tuile && !tuile.solid) positionsSol.push({ x, y, tuileId: tuile.id });
    }
  }
  // `sur` (`D-106`) : les tuiles qui portent chaque motif, en Set une fois
  // pour toutes. Absent = partout (la Grotte, et tout catalogue d'avant).
  const porteurs = config.motifs.map((m) => (Array.isArray(m.sur) ? new Set(m.sur) : null));

  const nombreMotifs = Math.floor(positionsSol.length * config.densite * multiplicateurDensite);
  const decor = [];
  for (let i = 0; i < nombreMotifs; i++) {
    const position = positionsSol[Math.floor(alea() * positionsSol.length)];

    // Tirage pondéré (poids/poidsTotal) : le dernier motif sert de repli en
    // cas d'arrondi flottant en bout de tirage, jamais un motif indéfini.
    let tirage = alea() * poidsTotal;
    let indice = config.motifs.length - 1;
    for (let m = 0; m < config.motifs.length; m++) {
      if (tirage < config.motifs[m].poids) {
        indice = m;
        break;
      }
      tirage -= config.motifs[m].poids;
    }
    const visuel = config.motifs[indice].visuel;

    // Les trois tirages restants sont faits AVANT de savoir si le motif est
    // gardé : c'est ce qui garde constant le nombre de tirages par itération
    // (contrat ci-dessus). Un motif qui tombe sur une surface qui ne le porte
    // pas (`D-106` : une touffe d'herbe sur le parquet) est donc REJETÉ, pas
    // re-tiré ailleurs — re-tirer consommerait des nombres de plus et
    // redistribuerait tout le décor qui suit, à chaque preset.
    const x = (position.x + alea()) * scene.tileSize;
    const y = (position.y + alea()) * scene.tileSize;
    // Légère variation d'inclinaison par graine (§3.4, visuel_herbe) —
    // appliquée à tout motif via dessinerVisuel#options.rotation plutôt que
    // conditionnée à un id précis : un rocher/une flaque, symétriques ou
    // quasi, n'en paraissent pas moins statiques ; un brin d'herbe, si.
    const rotation = (alea() * 2 - 1) * ROTATION_MAX_DEG;
    const sur = porteurs[indice];
    if (sur && !sur.has(position.tuileId)) continue;
    decor.push({ x, y, visuel, rotation });
  }
  return decor;
}

function hexVersRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function assombrirOuEclaircir(hex, facteur) {
  const { r, g, b } = hexVersRgb(hex);
  const ajuster = (canal) => Math.max(0, Math.min(255, Math.round(canal * facteur)));
  const versHex = (canal) => canal.toString(16).padStart(2, '0');
  return `#${versHex(ajuster(r))}${versHex(ajuster(g))}${versHex(ajuster(b))}`;
}

// Polish ambiance (23/09) — QUEL dessin une case de tuile reçoit, parmi ceux
// que sa tuile déclare (`render.visuel` puis `render.visuel_variantes`), et
// s'il est retourné en miroir horizontal (`render.miroir`). Né du constat de
// `D-105` : un grain identique sur chaque case se lit comme un papier peint ;
// deux ou trois dessins et leur miroir suffisent à ce que l'œil ne trouve plus
// la période. Même hash spatial que `couleurTuile` (jamais une avance
// séquentielle : le calque peut reconstruire dans un autre ordre), avec un
// SEL propre pour que la variante ne suive pas la couleur — sinon toutes les
// cases claires porteraient le même dessin.
const SEL_VARIANTE = 0x5bd1e995;
export function varianteTuile(scene, x, y, nbVisuels, miroir) {
  const alea = mulberry32((scene.seed ^ SEL_VARIANTE ^ (x * 83492791) ^ (y * 50331653)) >>> 0);
  const index = Math.min(nbVisuels - 1, Math.floor(alea() * nbVisuels));
  const tirageMiroir = alea();
  return { index: Math.max(0, index), miroir: !!miroir && tirageMiroir < 0.5 };
}

// `Q-70` — la tuile dont on peint la SURFACE : le sol déclaré par une
// tuile-objet (`render.sol`, validé au boot : une tuile non solide, qui ne
// déclare pas elle-même de sol), sinon la tuile elle-même. Un seul niveau
// d'indirection, pour qu'un arbre posé sur l'herbe suive l'herbe quand
// l'herbe change, sans jamais en porter une copie.
export function tuileDeSol(scene, tuile) {
  const idSol = tuile.render && tuile.render.sol;
  return (idSol && scene.tuile && scene.tuile(idSol)) || tuile;
}

// Variante + teinte déterministe d'une tuile (§3.4, tiles.json > render.
// variantes[]/variation_teinte) : casse la répétition visuelle sans nouvel
// asset. Hash spatial (seed ^ position) plutôt qu'une avance séquentielle du
// PRNG comme genererDecor ci-dessus — le calque statique de render.js peut
// avoir besoin de reconstruire dans un ordre différent d'une reconstruction
// à l'autre (changement d'échelle), et doit malgré tout retomber sur
// exactement la même couleur à la même position.
export function couleurTuile(scene, x, y, estFlagActif) {
  const tuile = scene.tuileA(x, y, estFlagActif);
  if (!tuile) return null;
  // `Q-70` : une tuile-objet (arbre, rocher…) posée sur un sol prend la
  // couleur que CE sol aurait à cette position — même hash, même palette —,
  // donc l'objet ne découpe plus de carré dans la surface qui l'entoure.
  const render = tuileDeSol(scene, tuile).render;
  const alea = mulberry32((scene.seed ^ (x * 73856093) ^ (y * 19349663)) >>> 0);
  const palette = [render.valeur, ...(render.variantes || [])];
  const base = palette[Math.floor(alea() * palette.length)];
  const variation = render.variation_teinte;
  if (!variation) return base;
  // Facteur de luminosité dans [1-variation, 1+variation] : ±4% provisoire
  // (§2.2 03_grotte-polish) suffit à casser la répétition sans créer de
  // tuiles visiblement plus claires/sombres que leurs voisines.
  const facteur = 1 + (alea() * 2 - 1) * variation;
  return assombrirOuEclaircir(base, facteur);
}

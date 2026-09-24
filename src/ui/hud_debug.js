// Surcouche de debug perf (MT_mesure-saccades_2026-09-19) — DOM, jamais
// exercée en headless (même contrainte de méthode que le reste du rendu :
// ce module touche `document`/`performance`/`navigator`, mais SEULEMENT à
// l'intérieur de creerMoniteurPerf(), jamais au niveau module — importable
// depuis Node sans effet). N'existe QUE sous `?debug=fps` : hors de ce cas,
// creerMoniteurPerf() renvoie des callbacks no-op sans jamais créer
// d'élément DOM ni prendre la moindre mesure (§ livrable de la fiche).
//
// Les 5 pistes de MT_mesure-saccades_2026-09-19 §Livrable sont couvertes par
// ces points de mesure :
// - `surFrame` (branché sur render.js#creerBoucle) : piste 2 (irrégularité
//   du delta-time, frames plafonnées) et piste 4 (frames lentes, part
//   maj()/dessiner()).
// - `surRecalculCoucheStatique` (branché sur render.js#dessinerScene) :
//   piste 1 (re-rendu du calque statique fenêtré).
// - `enregistrerPositionHero` (appelé par main.js#dessiner()) : piste 3
//   (écart de position écran du héros d'une frame à l'autre).
// - lecture directe de statsCoucheStatique()/statsCanvasVoile()/
//   dimensionsEcranPhysiquesActuelles() (render.js) : piste 5 (coût par
//   pixel).
// - `enregistrerPeripherique` (appelé par main.js#maj()) : périphérique actif
//   + ses bascules par seconde (hors des 5 pistes, demandé séparément).

import {
  estDebugFpsActif, creerTamponCirculaire, ajouterAuTampon, valeursTampon,
  moyenne, maximum, percentile, compterAuDessus, ecartsSuccessifs, creerCompteurBascules,
  formaterReleve, SEUIL_FRAME_LENTE_MS, CAPACITE_TAMPON_10S, INTERVALLE_MAJ_MS,
} from '../debug_perf.js';
// SD_saccades-calque-statique_2026-09-19 §2 : la fiche partait d'un relevé où
// "recalculs calque statique : 250" semblait énorme à côté de "600" frames —
// mais ce nombre n'était PAS fenêtré comme tout le reste (deltas, durées,
// écarts, tous des `creerTamponCirculaire(CAPACITE_TAMPON_10S)`) : c'était un
// COMPTEUR CUMULATIF depuis le chargement de `?debug=fps` (jamais remis à
// zéro), comparé côte à côte à `framesTotales` qui, lui, ne couvre que les
// ~10 dernières secondes. Palier A de la fiche (test rouge d'abord) a
// confirmé que le fenêtrage lui-même (render.js#selectionnerTuilesVisibles,
// déjà pur et testé) recalcule bien à la fréquence attendue (cf.
// tests/test_sd_saccades_calque_statique_2026-09-19.js, vert sur HEAD) — la
// "sur-fréquence" observée était un artefact de CET instrument, pas du
// rendu. Correctif : les 3 champs (nombre/durée moyenne/durée max) suivent
// désormais le même tampon circulaire que tout le reste, un flag 0/1 pour le
// compte, une durée par recalcul réel pour les durées — fenêtrés aux mêmes
// ~10 s, directement comparables à `framesTotales`.
import {
  statsCoucheStatique, statsCanvasVoile, dimensionsEcranPhysiquesActuelles,
  // `D-23` : échelle forcée + échelle naturelle, lues au même endroit unique
  // que le rendu les applique — l'instrument ne recalcule rien de son côté.
  etatEchelleRendu,
} from '../render.js';

// Exporté pour servir de valeur par défaut à creerOrchestrateurGrotte()
// (main.js) : les tests headless qui construisent l'orchestrateur sans
// fournir `moniteurPerf` (tous, avant ce ticket) continuent de fonctionner
// sans rien connaître de ce module — même patron que `onPremierGeste`.
export function creerMoniteurInactif() {
  const rien = () => {};
  return {
    actif: false,
    surFrame: rien,
    surRecalculCoucheStatique: rien,
    enregistrerPositionHero: rien,
    enregistrerPeripherique: rien,
    enregistrerEntites: rien,
    surEntreeScene: rien,
    definirSourceAlignement: rien,
  };
}

// `document`/`search` injectés (jamais lus au niveau module, cf. en-tête) —
// même patron que ui/menu.js#initialiserMenu.
export function creerMoniteurPerf({ document, search, peripheriqueActifInitial = 'manette' }) {
  if (!estDebugFpsActif(search)) return creerMoniteurInactif();

  const deltasBruts = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const plafonnages = creerTamponCirculaire(CAPACITE_TAMPON_10S); // 0/1, cf. compterAuDessus(..., 0.5)
  const dureesMaj = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const dureesDessiner = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const dureesFrame = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const positionsHeroX = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const positionsHeroY = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const compteurPeripherique = creerCompteurBascules();

  // Recalculs du calque statique (piste 1) : `recalculs` = 0/1 PAR FRAME
  // (même patron que `plafonnages` ci-dessus), fenêtré aux ~10 s comme tout
  // le reste ; `dureesRecalcul` ne stocke une valeur que pour les frames où
  // un recalcul a réellement eu lieu (donc lui-même borné aux N derniers
  // recalculs, jamais un max depuis le chargement de la page).
  const recalculs = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  const dureesRecalcul = creerTamponCirculaire(CAPACITE_TAMPON_10S);
  // Recalcul en attente : posé par surRecalculCoucheStatique (appelé DANS
  // dessinerScene, avant surFrame de la même frame), consommé par surFrame —
  // au plus un recalcul par frame (dessinerCoucheStatique n'est appelé
  // qu'une fois par dessiner()).
  let recalculEnAttenteMs = null;
  let dernierRecalculHorodatageMs = null;
  let dernierEntites = { monstres: 0, puzzles: 0, objetsSol: 0 };
  // `specs/13` palier A : la dernière entrée en scène, gardée telle quelle
  // (une entrée est un événement rare, pas une série à fenêtrer).
  let derniereEntreeScene = null;
  let peripheriqueCourant = peripheriqueActifInitial;
  // `specs/10` §6 : une SOURCE, interrogée au rythme de l'affichage (≤ 4 fois
  // par seconde), plutôt qu'une valeur poussée à chaque frame — l'alignement
  // bouge rarement, et le moniteur n'a pas à savoir qui l'écrit.
  let sourceAlignement = null;

  // --- DOM : créé UNE fois ici, jamais si la branche ci-dessus est prise ---
  const el = document.createElement('div');
  el.id = 'debug-perf';
  el.style.position = 'fixed';
  el.style.top = '4px';
  el.style.left = '4px';
  el.style.zIndex = '9999';
  el.style.background = 'rgba(0, 0, 0, 0.75)';
  el.style.color = '#7CFC7C';
  el.style.fontFamily = 'monospace';
  el.style.fontSize = '11px';
  el.style.lineHeight = '1.4';
  el.style.whiteSpace = 'pre';
  el.style.padding = '6px 8px';
  el.style.borderRadius = '4px';
  // Ce calque n'est jamais un écran de jeu (§ contrat "ouvert" de
  // ui/menu.js, sans objet ici) : il ne capte jamais le tactile/la souris.
  el.style.pointerEvents = 'none';

  const zoneTexte = document.createElement('div');
  el.appendChild(zoneTexte);

  const bouton = document.createElement('button');
  bouton.textContent = 'copier';
  bouton.style.pointerEvents = 'auto';
  bouton.style.marginTop = '4px';
  bouton.style.fontFamily = 'monospace';
  bouton.style.fontSize = '11px';
  el.appendChild(bouton);

  document.body.appendChild(el);

  // Protocole du ticket : "un bouton copier met le relevé dans le
  // presse-papiers" — le texte déjà affiché, jamais recalculé à part.
  let dernierReleve = '';
  bouton.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(dernierReleve).catch(() => {});
    }
  });

  let dernierAffichageMs = 0;

  function construireEtat(tMs) {
    const deltas = valeursTampon(deltasBruts);
    const dureesMajValeurs = valeursTampon(dureesMaj);
    const dureesDessinerValeurs = valeursTampon(dureesDessiner);
    const dureesFrameValeurs = valeursTampon(dureesFrame);
    const ecartsX = ecartsSuccessifs(valeursTampon(positionsHeroX));
    const ecartsY = ecartsSuccessifs(valeursTampon(positionsHeroY));
    const deltaMoyenMs = moyenne(deltas);

    return {
      fps: deltaMoyenMs > 0 ? 1000 / deltaMoyenMs : 0,
      deltaMoyenMs,
      deltaP95Ms: percentile(deltas, 0.95),
      deltaMaxMs: maximum(deltas),
      framesPlafonnees: compterAuDessus(valeursTampon(plafonnages), 0.5),
      framesTotales: deltas.length,
      dureeMajMoyenneMs: moyenne(dureesMajValeurs),
      dureeMajP95Ms: percentile(dureesMajValeurs, 0.95),
      dureeDessinerMoyenneMs: moyenne(dureesDessinerValeurs),
      dureeDessinerP95Ms: percentile(dureesDessinerValeurs, 0.95),
      framesLentes: compterAuDessus(dureesFrameValeurs, SEUIL_FRAME_LENTE_MS),
      recalculsCoucheStatique: {
        nombre: compterAuDessus(valeursTampon(recalculs), 0.5),
        dureeMoyenneMs: moyenne(valeursTampon(dureesRecalcul)),
        dureeMaxMs: maximum(valeursTampon(dureesRecalcul)),
        depuisDernierMs: dernierRecalculHorodatageMs === null ? null : tMs - dernierRecalculHorodatageMs,
      },
      ecartHeroX: { moyenne: moyenne(ecartsX), min: ecartsX.length ? Math.min(...ecartsX) : 0, max: maximum(ecartsX) },
      ecartHeroY: { moyenne: moyenne(ecartsY), min: ecartsY.length ? Math.min(...ecartsY) : 0, max: maximum(ecartsY) },
      entites: dernierEntites,
      entreeScene: derniereEntreeScene,
      ecranPhysique: dimensionsEcranPhysiquesActuelles(),
      echelleRendu: etatEchelleRendu(),
      coucheStatique: statsCoucheStatique(),
      canvasVoile: statsCanvasVoile(),
      peripheriqueActif: peripheriqueCourant,
      basculesParSeconde: compteurPeripherique.basculesParSeconde(tMs),
      alignement: sourceAlignement ? sourceAlignement() : null,
    };
  }

  // Mise à jour ≤ 4 fois/s (§ livrable) — le tampon, lui, reste alimenté à
  // chaque frame par surFrame() ; seule la LECTURE/mise en forme est throttlée.
  function rafraichirAffichage(tMs) {
    if (tMs - dernierAffichageMs < INTERVALLE_MAJ_MS) return;
    dernierAffichageMs = tMs;
    dernierReleve = formaterReleve(construireEtat(tMs));
    zoneTexte.textContent = dernierReleve;
  }

  return {
    actif: true,
    surFrame(info) {
      ajouterAuTampon(deltasBruts, info.deltaBrut);
      ajouterAuTampon(plafonnages, info.plafonne ? 1 : 0);
      ajouterAuTampon(dureesMaj, info.dureeMajMs);
      ajouterAuTampon(dureesDessiner, info.dureeDessinerMs);
      ajouterAuTampon(dureesFrame, info.dureeMajMs + info.dureeDessinerMs);
      // Consomme le recalcul (s'il y en a eu un) posé par
      // surRecalculCoucheStatique PENDANT cette même frame (dessinerScene
      // s'exécute avant surFrame dans creerBoucle#frame) — un flag 0/1 par
      // frame, jamais un compteur qui grandit sans fin.
      ajouterAuTampon(recalculs, recalculEnAttenteMs !== null ? 1 : 0);
      if (recalculEnAttenteMs !== null) ajouterAuTampon(dureesRecalcul, recalculEnAttenteMs);
      recalculEnAttenteMs = null;
      rafraichirAffichage(info.tMs);
    },
    surRecalculCoucheStatique(info) {
      recalculEnAttenteMs = info.dureeMs;
      dernierRecalculHorodatageMs = performance.now();
    },
    enregistrerPositionHero(x, y) {
      ajouterAuTampon(positionsHeroX, x);
      ajouterAuTampon(positionsHeroY, y);
    },
    enregistrerPeripherique(valeur) {
      peripheriqueCourant = valeur;
      compteurPeripherique.enregistrer(valeur, performance.now());
    },
    enregistrerEntites(entites) {
      dernierEntites = entites;
    },
    surEntreeScene(info) {
      derniereEntreeScene = info;
    },
    definirSourceAlignement(source) {
      sourceAlignement = source;
    },
  };
}
